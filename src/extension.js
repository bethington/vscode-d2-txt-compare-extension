"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const datasetTreeProvider_1 = require("./providers/datasetTreeProvider");
const comparatorWebview_1 = require("./webviews/comparatorWebview");
const fileValidator_1 = require("./utils/fileValidator");
const formatConverter_1 = require("./utils/formatConverter");
const searchProvider_1 = require("./utils/searchProvider");
const diffProvider_1 = require("./comparator/diffProvider");
const mergeProvider_1 = require("./comparator/mergeProvider");
const languageProvider_1 = require("./utils/languageProvider");
const backupManager_1 = require("./utils/backupManager");
const batchOperationManager_1 = require("./utils/batchOperationManager");
const projectTemplateManager_1 = require("./utils/projectTemplateManager");
const dataVisualizationProvider_1 = require("./utils/dataVisualizationProvider");
const configurationManager_1 = require("./utils/configurationManager");
const statusBarManager_1 = require("./utils/statusBarManager");
function activate(context) {
    console.log('D2 Modder\'s Comparator extension is now active!');
    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showWarningMessage('D2 Modding: No workspace folder found. Some features may be limited.');
    }
    // Initialize providers
    const datasetProvider = new datasetTreeProvider_1.DatasetTreeProvider(context);
    const comparatorProvider = new comparatorWebview_1.D2ComparatorWebviewProvider(context);
    const fileValidator = new fileValidator_1.D2FileValidator();
    const formatConverter = new formatConverter_1.D2FormatConverter();
    const searchProvider = new searchProvider_1.D2SearchProvider();
    const diffProvider = new diffProvider_1.D2DiffProvider();
    const mergeProvider = new mergeProvider_1.D2MergeProvider(context);
    const languageProvider = new languageProvider_1.D2LanguageProvider();
    const backupManager = workspaceRoot ? new backupManager_1.D2BackupManager(workspaceRoot) : null;
    const batchOperationManager = workspaceRoot ? new batchOperationManager_1.D2BatchOperationManager(workspaceRoot) : null;
    const templateManager = new projectTemplateManager_1.D2ProjectTemplateManager();
    const visualizationProvider = new dataVisualizationProvider_1.D2DataVisualizationProvider();
    const configManager = configurationManager_1.D2ConfigurationManager.getInstance();
    const statusBarManager = new statusBarManager_1.D2StatusBarManager();
    // Register language features
    languageProvider.registerProviders(context);
    // Register tree view
    const datasetTreeView = vscode.window.createTreeView('d2DatasetExplorer', {
        treeDataProvider: datasetProvider,
        showCollapseAll: true
    });
    // Register webview providers
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('d2Comparator', comparatorProvider), vscode.window.registerWebviewViewProvider('d2MergeTool', mergeProvider));
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.enableModding', async () => {
        await vscode.commands.executeCommand('setContext', 'd2ModdingEnabled', true);
        vscode.window.showInformationMessage('D2 Modding mode enabled!');
        datasetProvider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.addDataset', async () => {
        const options = {
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
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.compareFiles', async (uri) => {
        if (uri) {
            await comparatorProvider.compareFile(uri);
        }
        else {
            vscode.window.showErrorMessage('Please select a file to compare');
        }
    }));
    // New enhanced diff command
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.advancedDiff', async (uri1, uri2) => {
        if (!uri1 || !uri2) {
            const files = await vscode.window.showOpenDialog({
                canSelectMany: true,
                canSelectFiles: true,
                canSelectFolders: false,
                filters: { 'TXT Files': ['txt'] },
                openLabel: 'Select 2 files to compare'
            });
            if (!files || files.length < 2) {
                vscode.window.showErrorMessage('Please select 2 files to compare');
                return;
            }
            uri1 = files[0];
            uri2 = files[1];
        }
        await diffProvider.showAdvancedDiff(uri1, uri2);
    }));
    // Merge command
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.mergeFiles', async () => {
        await mergeProvider.mergeTxtFiles();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.openComparator', async () => {
        comparatorProvider.openComparator();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.searchAcrossDatasets', async () => {
        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Enter search term (supports regex)',
            placeHolder: 'e.g., mindam|maxdam or strength'
        });
        if (searchTerm) {
            const results = await searchProvider.searchAcrossDatasets(searchTerm, datasetProvider.getDatasets());
            searchProvider.showResults(results);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.validateTxtFile', async (uri) => {
        if (uri) {
            const validationResult = await fileValidator.validateFile(uri);
            fileValidator.showValidationResult(validationResult);
        }
        else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'd2txt') {
                const validationResult = await fileValidator.validateFile(activeEditor.document.uri);
                fileValidator.showValidationResult(validationResult);
            }
            else {
                vscode.window.showErrorMessage('Please select a TXT file to validate');
            }
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.convertFormat', async (uri) => {
        if (uri) {
            await formatConverter.convertFile(uri);
        }
        else {
            vscode.window.showErrorMessage('Please select a file to convert');
        }
    }));
    // New formatting commands
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.sortByColumn', async (uri, columnIndex) => {
        const document = await vscode.workspace.openTextDocument(uri);
        const lines = document.getText().split('\\n');
        if (lines.length < 2) {
            return;
        }
        const header = lines[0];
        const dataLines = lines.slice(1).filter(line => line.trim());
        // Sort by specified column
        dataLines.sort((a, b) => {
            const aCols = a.split('\\t');
            const bCols = b.split('\\t');
            const aVal = aCols[columnIndex] || '';
            const bVal = bCols[columnIndex] || '';
            // Try numeric sort first
            const aNum = Number(aVal);
            const bNum = Number(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }
            // Fallback to string sort
            return aVal.localeCompare(bVal);
        });
        const sortedContent = [header, ...dataLines].join('\\n');
        const edit = new vscode.WorkspaceEdit();
        edit.replace(uri, new vscode.Range(0, 0, document.lineCount, 0), sortedContent);
        await vscode.workspace.applyEdit(edit);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.formatAsTable', async (uri) => {
        const document = await vscode.workspace.openTextDocument(uri);
        const lines = document.getText().split('\\n');
        if (lines.length === 0) {
            return;
        }
        // Calculate column widths
        const columnWidths = [];
        lines.forEach(line => {
            const columns = line.split('\\t');
            columns.forEach((col, index) => {
                columnWidths[index] = Math.max(columnWidths[index] || 0, col.length);
            });
        });
        // Format lines with proper spacing
        const formattedLines = lines.map(line => {
            const columns = line.split('\\t');
            return columns.map((col, index) => {
                return col.padEnd(columnWidths[index] || 0);
            }).join(' | ');
        });
        const formattedContent = formattedLines.join('\\n');
        // Open in new document to avoid overwriting original
        const newDoc = await vscode.workspace.openTextDocument({
            content: formattedContent,
            language: 'plaintext'
        });
        await vscode.window.showTextDocument(newDoc);
    }));
    // Bulk operations
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.validateAllFiles', async () => {
        const files = await vscode.workspace.findFiles('**/*.txt');
        const results = [];
        for (const file of files) {
            const result = await fileValidator.validateFile(file);
            if (!result.isValid) {
                results.push({
                    file: file.fsPath,
                    errors: result.errors.length,
                    warnings: result.warnings.length
                });
            }
        }
        if (results.length === 0) {
            vscode.window.showInformationMessage('All TXT files passed validation!');
        }
        else {
            const message = `Validation issues found in ${results.length} files`;
            vscode.window.showWarningMessage(message, 'Show Details').then(selection => {
                if (selection === 'Show Details') {
                    // Show detailed results
                    let content = '# Bulk Validation Results\\n\\n';
                    results.forEach(result => {
                        content += `## ${result.file}\\n`;
                        content += `- Errors: ${result.errors}\\n`;
                        content += `- Warnings: ${result.warnings}\\n\\n`;
                    });
                    vscode.workspace.openTextDocument({
                        content,
                        language: 'markdown'
                    }).then(doc => vscode.window.showTextDocument(doc));
                }
            });
        }
    }));
    // Register advanced feature commands
    if (backupManager) {
        context.subscriptions.push(vscode.commands.registerCommand('d2Modding.createBackup', async (uri) => {
            if (!uri && vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            }
            if (!uri) {
                vscode.window.showErrorMessage('No file selected for backup');
                return;
            }
            try {
                const description = await vscode.window.showInputBox({
                    prompt: 'Enter backup description (optional)',
                    value: 'Manual backup'
                });
                const backupInfo = await backupManager.createBackup(uri.fsPath, description);
                vscode.window.showInformationMessage(`Backup created: ${backupInfo.backupPath}`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to create backup: ${error}`);
            }
        }), vscode.commands.registerCommand('d2Modding.showBackupHistory', async (uri) => {
            if (!uri && vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            }
            if (!uri) {
                vscode.window.showErrorMessage('No file selected');
                return;
            }
            const backups = backupManager.getBackupHistory(uri.fsPath);
            if (backups.length === 0) {
                vscode.window.showInformationMessage('No backups found for this file');
                return;
            }
            const selected = await vscode.window.showQuickPick(backups.map(backup => ({
                label: `${backup.timestamp.toLocaleString()}`,
                description: backup.description,
                detail: `Size: ${(backup.fileSize / 1024).toFixed(1)} KB`,
                backup
            })), { placeHolder: 'Select backup to restore or compare' });
            if (selected) {
                const action = await vscode.window.showQuickPick([
                    { label: 'Restore', value: 'restore' },
                    { label: 'Compare with current', value: 'compare' }
                ], { placeHolder: 'What would you like to do?' });
                if (action?.value === 'restore') {
                    await backupManager.restoreBackup(selected.backup);
                }
                else if (action?.value === 'compare') {
                    await backupManager.compareWithBackup(uri.fsPath, selected.backup);
                }
            }
        }), vscode.commands.registerCommand('d2Modding.cleanupBackups', async () => {
            const days = await vscode.window.showInputBox({
                prompt: 'Keep backups newer than how many days?',
                value: '30',
                validateInput: (value) => {
                    const num = parseInt(value);
                    return isNaN(num) || num < 1 ? 'Please enter a valid number of days' : null;
                }
            });
            if (days) {
                const cleaned = await backupManager.cleanupOldBackups(parseInt(days));
                vscode.window.showInformationMessage(`Cleaned up ${cleaned} old backup files`);
            }
        }));
    }
    if (batchOperationManager) {
        context.subscriptions.push(vscode.commands.registerCommand('d2Modding.batchValidation', async () => {
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectMany: true,
                filters: { 'D2 TXT Files': ['txt'] }
            });
            if (!files || files.length === 0) {
                return;
            }
            const filePaths = files.map(f => f.fsPath);
            const operationId = batchOperationManager.createBatchValidation(filePaths, {
                createBackups: true,
                includeWarnings: true
            });
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Batch Validation',
                cancellable: false
            }, async (progress) => {
                await batchOperationManager.executeBatchOperation(operationId, (percent, currentFile) => {
                    progress.report({
                        increment: percent / filePaths.length,
                        message: `Validating ${currentFile}...`
                    });
                });
            });
        }), vscode.commands.registerCommand('d2Modding.batchFormat', async () => {
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectMany: true,
                filters: { 'D2 TXT Files': ['txt'] }
            });
            if (!files || files.length === 0) {
                return;
            }
            const filePaths = files.map(f => f.fsPath);
            const operationId = batchOperationManager.createBatchFormatting(filePaths, {
                createBackups: true,
                sortColumns: true,
                standardizeSpacing: true,
                removeEmptyLines: true
            });
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Batch Formatting',
                cancellable: false
            }, async (progress) => {
                await batchOperationManager.executeBatchOperation(operationId, (percent, currentFile) => {
                    progress.report({
                        increment: percent / filePaths.length,
                        message: `Formatting ${currentFile}...`
                    });
                });
            });
        }));
    }
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.createProjectFromTemplate', async () => {
        const templates = templateManager.getTemplates();
        const selected = await vscode.window.showQuickPick(templates.map(t => ({
            label: t.name,
            description: t.description,
            detail: `Category: ${t.category}`,
            template: t
        })), { placeHolder: 'Select a project template' });
        if (!selected) {
            return;
        }
        const targetFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Target Directory'
        });
        if (!targetFolder || targetFolder.length === 0) {
            return;
        }
        await templateManager.createProjectFromTemplate(selected.template.id, targetFolder[0].fsPath);
    }), vscode.commands.registerCommand('d2Modding.visualizeData', async (uri) => {
        if (!uri && vscode.window.activeTextEditor) {
            uri = vscode.window.activeTextEditor.document.uri;
        }
        if (!uri) {
            vscode.window.showErrorMessage('No file selected for visualization');
            return;
        }
        try {
            await visualizationProvider.visualizeFile(uri.fsPath);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to visualize data: ${error}`);
        }
    }), vscode.commands.registerCommand('d2Modding.compareDatasets', async () => {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: true,
            filters: { 'D2 TXT Files': ['txt'] }
        });
        if (!files || files.length < 2) {
            vscode.window.showWarningMessage('Please select at least 2 files to compare');
            return;
        }
        try {
            await visualizationProvider.compareFiles(files.map(f => f.fsPath));
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to compare datasets: ${error}`);
        }
    }));
    // Configuration management commands
    context.subscriptions.push(vscode.commands.registerCommand('d2Modding.openConfiguration', async () => {
        await configManager.openConfigurationUI();
    }), vscode.commands.registerCommand('d2Modding.resetConfiguration', async () => {
        const confirm = await vscode.window.showWarningMessage('Are you sure you want to reset all D2 Modding settings to defaults?', 'Reset', 'Cancel');
        if (confirm === 'Reset') {
            configManager.resetToDefaults();
        }
    }), vscode.commands.registerCommand('d2Modding.exportConfiguration', async () => {
        const config = configManager.exportConfiguration();
        const document = await vscode.workspace.openTextDocument({
            content: config,
            language: 'json'
        });
        await vscode.window.showTextDocument(document);
    }), vscode.commands.registerCommand('d2Modding.importConfiguration', async () => {
        const file = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: { 'JSON': ['json'] },
            openLabel: 'Import Configuration'
        });
        if (file && file.length > 0) {
            try {
                const content = await vscode.workspace.fs.readFile(file[0]);
                const configJson = Buffer.from(content).toString('utf8');
                await configManager.importConfiguration(configJson);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to import configuration: ${error}`);
            }
        }
    }), vscode.commands.registerCommand('d2Modding.showStatusSummary', () => {
        const summary = statusBarManager.getStatusSummary();
        vscode.window.showInformationMessage(summary, { modal: false });
    }), vscode.commands.registerCommand('d2Modding.toggleStatusBar', () => {
        const currentConfig = configManager.getConfiguration();
        configManager.updateConfiguration({
            showStatusBarInfo: !currentConfig.showStatusBarInfo
        });
        const status = currentConfig.showStatusBarInfo ? 'hidden' : 'shown';
        vscode.window.showInformationMessage(`Status bar items ${status}`);
    }));
    // Listen for active editor changes to update status bar
    vscode.window.onDidChangeActiveTextEditor(() => {
        statusBarManager.updateForActiveEditor();
    });
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
    context.subscriptions.push(watcher, datasetTreeView, statusBarManager);
}
async function checkForD2Files() {
    const d2Files = await vscode.workspace.findFiles('**/{Armor,Weapons,Skills,Levels,Missiles}.txt', null, 5);
    if (d2Files.length > 0) {
        const enable = await vscode.window.showInformationMessage('Diablo 2 data files detected. Enable D2 Modding mode?', 'Yes', 'No');
        if (enable === 'Yes') {
            await vscode.commands.executeCommand('d2Modding.enableModding');
        }
    }
}
function deactivate() {
    console.log('D2 Modder\'s Comparator extension deactivated');
}
//# sourceMappingURL=extension.js.map