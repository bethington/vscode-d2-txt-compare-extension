import * as vscode from 'vscode';
import * as path from 'path';
import { DatasetTreeProvider } from './providers/datasetTreeProvider';
import { D2ComparatorWebviewProvider } from './webviews/comparatorWebview';
import { D2FileValidator } from './utils/fileValidator';
import { D2FormatConverter } from './utils/formatConverter';
import { D2SearchProvider } from './utils/searchProvider';
import { D2TextEditorProvider } from './editors/d2TextEditor';
import { D2TableViewerProvider, getDefaultHeaderMappings } from './viewers/tableViewer';
import { D2TextFormatter } from './utils/textFormatter';

export function activate(context: vscode.ExtensionContext) {
	console.log('D2 Modder\'s Comparator extension is now active!');

	// Check if D2 modding should be auto-enabled
	const config = vscode.workspace.getConfiguration('d2Modding');
	const autoEnable = config.get<boolean>('autoEnable', true);
	
	// Set initial context based on configuration
	vscode.commands.executeCommand('setContext', 'd2ModdingEnabled', autoEnable);

	// Listen for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('d2Modding.autoEnable')) {
				const newAutoEnable = vscode.workspace.getConfiguration('d2Modding').get<boolean>('autoEnable', true);
				vscode.commands.executeCommand('setContext', 'd2ModdingEnabled', newAutoEnable);
				datasetProvider.refresh();
			}
		})
	);

	// Helper function to get URI from different calling contexts
	function getFileUri(item?: any): vscode.Uri | null {
		if (item && item.resourceUri) {
			// Called from tree view context menu - item is DatasetItem
			return item.resourceUri;
		} else if (item && typeof item === 'object' && item.fsPath) {
			// Called with direct URI
			return item;
		} else {
			// Called from command palette - use active editor
			const activeEditor = vscode.window.activeTextEditor;
			if (activeEditor && activeEditor.document.fileName.endsWith('.txt')) {
				return activeEditor.document.uri;
			}
		}
		return null;
	}

	// Initialize providers
	const datasetProvider = new DatasetTreeProvider(context);
	const comparatorProvider = new D2ComparatorWebviewProvider(context);
	const fileValidator = new D2FileValidator();
	const formatConverter = new D2FormatConverter();
	const searchProvider = new D2SearchProvider();

	// Register tree view
	const datasetTreeView = vscode.window.createTreeView('d2DatasetExplorer', {
		treeDataProvider: datasetProvider,
		showCollapseAll: true
	});

	// Register webview provider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('d2Comparator', comparatorProvider)
	);

	// Register custom text editor for .txt files
	context.subscriptions.push(
		D2TextEditorProvider.register(context)
	);

	// Removed D2TabStopManager import
	context.subscriptions.push(
		D2TableViewerProvider.register(context)
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.enableModding', async () => {
			// Get current state
			const currentState = vscode.workspace.getConfiguration('d2Modding').get<boolean>('autoEnable', true);
			const newState = !currentState;
			
			// Update configuration
			await vscode.workspace.getConfiguration('d2Modding').update('autoEnable', newState, vscode.ConfigurationTarget.Global);
			
			// Update context
			await vscode.commands.executeCommand('setContext', 'd2ModdingEnabled', newState);
			
			// Show appropriate message
			if (newState) {
				vscode.window.showInformationMessage('D2 Modding mode enabled!');
			} else {
				vscode.window.showInformationMessage('D2 Modding mode disabled!');
			}
			
			datasetProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.addDataset', async () => {
			const options: vscode.OpenDialogOptions = {
				canSelectMany: false,
				openLabel: 'Select Dataset Folder',
				canSelectFiles: false,
				canSelectFolders: true
			};

			const folderUri = await vscode.window.showOpenDialog(options);
			if (folderUri && folderUri[0]) {
				await datasetProvider.addDataset(folderUri[0]);
				vscode.window.showInformationMessage(`Dataset added: ${folderUri[0].fsPath}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.selectComparisonDataset', async () => {
			await datasetProvider.selectComparisonDataset();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.removeDataset', async (item: any) => {
			if (item && item.type === 'dataset') {
				const dataset = datasetProvider.getDatasets().find(d => d.path === item.resourcePath);
				if (dataset) {
					const confirm = await vscode.window.showWarningMessage(
						`Remove dataset "${dataset.name}"?`,
						{ modal: true },
						'Remove'
					);
					if (confirm === 'Remove') {
						await datasetProvider.removeDataset(dataset);
						vscode.window.showInformationMessage(`Dataset "${dataset.name}" removed`);
					}
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.compareFiles', async (uriOrItem: vscode.Uri | any) => {
			let sourceFile: vscode.Uri;
			
			if (uriOrItem) {
				// Handle both URI (from explorer) and tree item (from tree view)
				if (uriOrItem.resourceUri) {
					// Tree view item
					sourceFile = uriOrItem.resourceUri;
				} else if (uriOrItem.fsPath) {
					// Direct URI
					sourceFile = uriOrItem;
				} else {
					// Unknown format, try to extract URI
					sourceFile = uriOrItem;
				}
			} else {
				// Try to use the currently active file first
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor && activeEditor.document.fileName.endsWith('.txt')) {
					sourceFile = activeEditor.document.uri;
				} else {
					// No file provided, show file picker
					const options: vscode.OpenDialogOptions = {
						canSelectMany: false,
						openLabel: 'Select File to Compare',
						canSelectFiles: true,
						canSelectFolders: false,
						filters: {
							'Text Files': ['txt'],
							'All Files': ['*']
						}
					};

					const fileUri = await vscode.window.showOpenDialog(options);
					if (fileUri && fileUri[0]) {
						sourceFile = fileUri[0];
					} else {
						vscode.window.showInformationMessage('No file selected for comparison');
						return;
					}
				}
			}

			// Check if there's a comparison dataset and try to find matching file
			const comparisonDataset = datasetProvider.getComparisonDataset();
			if (comparisonDataset) {
				const fileName = path.basename(sourceFile.fsPath);
				const matchingFile = await datasetProvider.findMatchingFileInComparisonDataset(fileName);
				
				if (matchingFile) {
					// Open side-by-side comparison
					await vscode.commands.executeCommand('vscode.diff', sourceFile, matchingFile, `${fileName}: Original ↔ ${comparisonDataset.name}`);
					return;
				} else {
					vscode.window.showWarningMessage(`No matching file '${fileName}' found in comparison dataset '${comparisonDataset.name}'`);
				}
			}

			// Fallback to normal comparison flow
			await comparatorProvider.compareFile(sourceFile);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.openComparator', async () => {
			comparatorProvider.openComparator();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.searchAcrossDatasets', async () => {
			const searchTerm = await vscode.window.showInputBox({
				prompt: 'Enter search term (supports regex)',
				placeHolder: 'e.g., mindam|maxdam or strength'
			});

			if (searchTerm) {
				const results = await searchProvider.searchAcrossDatasets(searchTerm, datasetProvider.getDatasets());
				searchProvider.showResults(results);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.validateTxtFile', async (uriOrItem: vscode.Uri | any) => {
			let fileUri: vscode.Uri | null = null;
			
			if (uriOrItem) {
				// Handle both URI (from explorer) and tree item (from tree view)
				if (uriOrItem.resourceUri) {
					// Tree view item
					fileUri = uriOrItem.resourceUri;
				} else if (uriOrItem.fsPath) {
					// Direct URI
					fileUri = uriOrItem;
				}
			}
			
			if (fileUri) {
				const validationResult = await fileValidator.validateFile(fileUri);
				fileValidator.showValidationResult(validationResult);
			} else {
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor && activeEditor.document.languageId === 'd2txt') {
					const validationResult = await fileValidator.validateFile(activeEditor.document.uri);
					fileValidator.showValidationResult(validationResult);
				} else {
					vscode.window.showErrorMessage('Please select a TXT file to validate');
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.convertFormat', async (uriOrItem: vscode.Uri | any) => {
			let fileUri: vscode.Uri | null = null;
			
			if (uriOrItem) {
				// Handle both URI (from explorer) and tree item (from tree view)
				if (uriOrItem.resourceUri) {
					// Tree view item
					fileUri = uriOrItem.resourceUri;
				} else if (uriOrItem.fsPath) {
					// Direct URI
					fileUri = uriOrItem;
				}
			}
			
			if (fileUri) {
				await formatConverter.convertFile(fileUri);
			} else {
				vscode.window.showErrorMessage('Please select a file to convert');
			}
		})
	);

	// New text formatting commands
	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.convertTSVToSpaces', async (item?: any) => {
			const uri = getFileUri(item);
			if (uri) {
				await D2TextFormatter.formatTSVToSpaces(uri);
			} else {
				vscode.window.showErrorMessage('Please open a TXT file to convert TSV to spaces');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.convertSpacesToTSV', async (item?: any) => {
			const uri = getFileUri(item);
			if (uri) {
				await D2TextFormatter.formatSpacesToTSV(uri);
			} else {
				vscode.window.showErrorMessage('Please open a TXT file to convert spaces to TSV');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.previewSpaceAlignment', async (item?: any) => {
			const uri = getFileUri(item);
			if (uri) {
				await D2TextFormatter.previewSpaceAlignment(uri);
			} else {
				vscode.window.showErrorMessage('Please open a TXT file to preview space alignment');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.openInTextEditor', async (item?: any) => {
			const uri = getFileUri(item);
			if (uri) {
				await vscode.commands.executeCommand('vscode.open', uri);
			} else {
				vscode.window.showErrorMessage('Please select a TXT file to open in text editor');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.configureHeaders', async () => {
			// Show options for header configuration
			const options = [
				{
					label: '🔧 Open Header Settings',
					description: 'Open VS Code settings to configure custom headers',
					action: 'openSettings'
				},
				{
					label: '📋 Load Default Mappings',
					description: 'Pre-populate settings with comprehensive D2 header mappings',
					action: 'loadDefaults'
				},
				{
					label: '� Load from Data File',
					description: 'Load mappings directly from extension data file with merge options',
					action: 'loadFromFile'
				},
				{
					label: '�🗑️ Clear Custom Headers',
					description: 'Reset to empty custom headers (use defaults only)',
					action: 'clear'
				}
			];

			const selected = await vscode.window.showQuickPick(options, {
				placeHolder: 'Choose header configuration action',
				matchOnDescription: true
			});

			if (selected) {
				switch (selected.action) {
					case 'openSettings':
						await vscode.commands.executeCommand('workbench.action.openSettings', 'd2Modding.tableViewer.customHeaders');
						break;
					
					case 'loadDefaults':
						const confirmed = await vscode.window.showWarningMessage(
							'This will replace any existing custom headers with the comprehensive D2 default mappings. Continue?',
							{ modal: true },
							'Load Defaults', 'Cancel'
						);
						
						if (confirmed === 'Load Defaults') {
							// Get the default mappings
							const defaultMappings = getDefaultHeaderMappings();
							
							await vscode.workspace.getConfiguration('d2Modding').update(
								'tableViewer.customHeaders', 
								defaultMappings, 
								vscode.ConfigurationTarget.Global
							);
							
							vscode.window.showInformationMessage(
								`Loaded ${Object.keys(defaultMappings).length} default header mappings! Refresh table viewers to see changes.`
							);
						}
						break;
					
					case 'loadFromFile':
						// Call the dedicated command
						await vscode.commands.executeCommand('d2Modding.loadDefaultHeaders');
						break;
					
					case 'loadFromCustomFile':
						// Call the file picker command
						await vscode.commands.executeCommand('d2Modding.loadHeadersFromFile');
						break;
					
					case 'clear':
						const confirmClear = await vscode.window.showWarningMessage(
							'This will clear all custom headers. Continue?',
							{ modal: true },
							'Clear', 'Cancel'
						);
						
						if (confirmClear === 'Clear') {
							await vscode.workspace.getConfiguration('d2Modding').update(
								'tableViewer.customHeaders', 
								{}, 
								vscode.ConfigurationTarget.Global
							);
							
							vscode.window.showInformationMessage('Custom headers cleared!');
						}
						break;
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.loadDefaultHeaders', async () => {
			const choice = await vscode.window.showQuickPick([
				{
					label: '$(file-code) Load from Extension\'s Default File',
					description: 'Load comprehensive D2 header mappings from built-in data file',
					detail: 'Uses the extension\'s included defaultHeaderMappings.json file'
				},
				{
					label: '$(file-directory) Choose Custom File',
					description: 'Pick your own JSON file with header mappings',
					detail: 'Browse and select a custom JSON file to load mappings from'
				}
			], {
				placeHolder: 'How would you like to load header mappings?',
				matchOnDescription: true
			});

			if (!choice) {
				return; // User cancelled
			}

			if (choice.label.includes('Default File')) {
				// Load from extension's default file
				try {
					const defaultMappings = getDefaultHeaderMappings();
					
					if (Object.keys(defaultMappings).length === 0) {
						vscode.window.showWarningMessage('No default mappings found in data file. The file may be missing or empty. File path checked: dist/defaultHeaderMappings.json');
						return;
					}
					
					await loadHeaderMappings(defaultMappings, 'extension\'s default file');
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to load default headers: ${error}`);
					console.error('Error loading default headers:', error);
				}
			} else {
				// Let user choose a file
				await vscode.commands.executeCommand('d2Modding.loadHeadersFromFile');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('d2Modding.loadHeadersFromFile', async () => {
			const fileUri = await vscode.window.showOpenDialog({
				canSelectMany: false,
				openLabel: 'Load Header Mappings',
				filters: {
					'JSON files': ['json'],
					'All files': ['*']
				},
				title: 'Select Header Mappings File'
			});

			if (!fileUri || fileUri.length === 0) {
				return; // User cancelled
			}

			try {
				const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
				const jsonContent = new TextDecoder().decode(fileContent);
				const mappings = JSON.parse(jsonContent);

				if (typeof mappings !== 'object' || mappings === null) {
					vscode.window.showErrorMessage('Selected file does not contain a valid JSON object.');
					return;
				}

				const mappingCount = Object.keys(mappings).length;
				if (mappingCount === 0) {
					vscode.window.showWarningMessage('Selected file contains no header mappings.');
					return;
				}

				await loadHeaderMappings(mappings, path.basename(fileUri[0].fsPath));
			} catch (error) {
				if (error instanceof SyntaxError) {
					vscode.window.showErrorMessage('Selected file contains invalid JSON.');
				} else {
					vscode.window.showErrorMessage(`Failed to load header mappings from file: ${error}`);
				}
				console.error('Error loading header mappings from file:', error);
			}
		})
	);

	// Helper function to handle the actual loading of header mappings
	async function loadHeaderMappings(mappings: { [key: string]: string }, source: string) {
		// Check if user already has custom headers
		const currentHeaders = vscode.workspace.getConfiguration('d2Modding').get<{ [key: string]: string }>('tableViewer.customHeaders', {});
		const hasExistingHeaders = Object.keys(currentHeaders).length > 0;
		
		let shouldProceed = true;
		if (hasExistingHeaders) {
			const overwriteConfirm = await vscode.window.showWarningMessage(
				`You already have ${Object.keys(currentHeaders).length} custom headers. This will replace them with ${Object.keys(mappings).length} mappings from ${source}. Continue?`,
				{ modal: true },
				'Replace', 'Merge', 'Cancel'
			);
			
			if (overwriteConfirm === 'Cancel') {
				shouldProceed = false;
			} else if (overwriteConfirm === 'Merge') {
				// Merge existing with new mappings (existing takes precedence)
				const mergedMappings = { ...mappings, ...currentHeaders };
				await vscode.workspace.getConfiguration('d2Modding').update(
					'tableViewer.customHeaders', 
					mergedMappings, 
					vscode.ConfigurationTarget.Global
				);
				
				vscode.window.showInformationMessage(
					`Merged ${Object.keys(mappings).length} mappings from ${source} with ${Object.keys(currentHeaders).length} existing headers. Total: ${Object.keys(mergedMappings).length} mappings loaded!`
				);
				return;
			}
		}
		
		if (shouldProceed) {
			// Replace with new mappings
			await vscode.workspace.getConfiguration('d2Modding').update(
				'tableViewer.customHeaders', 
				mappings, 
				vscode.ConfigurationTarget.Global
			);
			
			vscode.window.showInformationMessage(
				`Successfully loaded ${Object.keys(mappings).length} header mappings from ${source}! Refresh table viewers to see changes.`
			);
		}
	}

	// Auto-enable modding if D2 files are detected
	checkForD2Files();

	// Register file watcher for TXT files
	const watcher = vscode.workspace.createFileSystemWatcher('**/*.txt');
	watcher.onDidChange(async (uri) => {
		if (vscode.workspace.getConfiguration('d2Modding').get('validateOnSave')) {
			const validationResult = await fileValidator.validateFile(uri);
			if (validationResult.errors.length > 0) {
				vscode.window.showWarningMessage(`Validation errors found in ${uri.fsPath}`);
			}
		}
	});
}

async function checkForD2Files() {
	const d2Files = await vscode.workspace.findFiles('**/{Armor,Weapons,Skills,Levels,Missiles}.txt', null, 5);
	if (d2Files.length > 0) {
		const enable = await vscode.window.showInformationMessage(
			'Diablo 2 data files detected. Enable D2 Modding mode?',
			'Yes', 'No'
		);
		if (enable === 'Yes') {
			await vscode.commands.executeCommand('d2Modding.enableModding');
		}
	}
}

export function deactivate() {
	console.log('D2 Modder\'s Comparator extension deactivated');
}
