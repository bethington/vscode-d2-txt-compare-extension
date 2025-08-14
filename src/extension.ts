import * as vscode from 'vscode';
import * as path from 'path';
import { DatasetTreeProvider } from './providers/datasetTreeProvider';
import { D2ComparatorWebviewProvider } from './webviews/comparatorWebview';
import { D2FileValidator } from './utils/fileValidator';
import { D2FormatConverter } from './utils/formatConverter';
import { D2SearchProvider } from './utils/searchProvider';
import { D2TextEditorProvider } from './editors/d2TextEditor';
import { D2TableViewerProvider } from './viewers/tableViewer';
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
