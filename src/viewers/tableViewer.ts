import * as vscode from 'vscode';
import * as fs from 'fs';

export interface TableColumn {
    header: string;
    width: number;
    align: 'left' | 'center' | 'right';
    type: 'text' | 'number' | 'boolean';
}

export interface TableData {
    columns: TableColumn[];
    rows: string[][];
    fileName: string;
    filePath: string;
}

export class D2TableViewerProvider {
    private static readonly viewType = 'd2TableViewer';
    private panels: Map<string, vscode.WebviewPanel> = new Map();

    constructor(private context: vscode.ExtensionContext) {}

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new D2TableViewerProvider(context);
        
        const command = vscode.commands.registerCommand('d2Modding.openTableViewer', async (item?: any) => {
            try {
                let uri: vscode.Uri | undefined;

                // Handle different calling contexts
                if (item && item.resourceUri) {
                    // Called from tree view context menu - item is DatasetItem
                    uri = item.resourceUri;
                } else if (item && typeof item === 'object' && item.fsPath) {
                    // Called with direct URI
                    uri = item;
                } else {
                    // Called from command palette - use active editor
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor && activeEditor.document.fileName.endsWith('.txt')) {
                        uri = activeEditor.document.uri;
                    } else {
                        vscode.window.showErrorMessage('Please open a TXT file to view as table');
                        return;
                    }
                }

                if (!uri) {
                    vscode.window.showErrorMessage('No valid file URI found');
                    return;
                }

                await provider.openTableViewer(uri);
            } catch (error) {
                vscode.window.showErrorMessage(`Error opening table viewer: ${error}`);
                console.error('Table viewer error:', error);
            }
        });

        return command;
    }

    private async openTableViewer(uri: vscode.Uri): Promise<void> {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('Invalid file URI provided');
            return;
        }

        const filePath = uri.fsPath;
        const fileName = filePath.split(/[\\/]/).pop() || 'table';
        
        // Enhanced title with D2 branding
        const panelTitle = `📊 D2 Table: ${fileName}`;

        // Check if panel already exists for this file
        let panel = this.panels.get(filePath);
        
        if (panel) {
            panel.reveal();
            return;
        }

        // Create new panel with enhanced title
        panel = vscode.window.createWebviewPanel(
            D2TableViewerProvider.viewType,
            panelTitle,
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        this.panels.set(filePath, panel);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'adjustColumnWidth':
                    await this.handleAdjustColumnWidth();
                    break;
                case 'toggleTextWrap':
                    await this.handleToggleTextWrap(panel, uri);
                    break;
                case 'openInEditor':
                    await vscode.commands.executeCommand('vscode.open', uri);
                    break;
                case 'toggleEditable':
                    // No server-side action needed, just acknowledge
                    break;
                case 'saveTableData':
                    await this.handleSaveTableData(message.data, uri);
                    break;
            }
        });

        // Clean up when panel is disposed
        panel.onDidDispose(() => {
            this.panels.delete(filePath);
        });

        // Load and display the table data
        await this.updateTableContent(panel, uri);

        // Watch for file changes
        const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath);
        watcher.onDidChange(() => {
            this.updateTableContent(panel!, uri);
        });

        panel.onDidDispose(() => {
            watcher.dispose();
        });
    }

    private async handleAdjustColumnWidth(): Promise<void> {
        const config = vscode.workspace.getConfiguration('d2Modding');
        const currentMaxWidth = config.get<number>('tableViewer.maxColumnWidth', 200);
        
        const newWidth = await vscode.window.showInputBox({
            prompt: 'Enter maximum column width (pixels)',
            value: currentMaxWidth.toString(),
            validateInput: (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 50 || num > 500) {
                    return 'Width must be between 50 and 500 pixels';
                }
                return null;
            }
        });

        if (newWidth) {
            const numericWidth = parseInt(newWidth);
            await config.update('tableViewer.maxColumnWidth', numericWidth, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`Table Viewer max column width set to ${numericWidth}px. Refresh table to see changes.`);
        }
    }

    private async handleToggleTextWrap(panel: vscode.WebviewPanel, uri: vscode.Uri): Promise<void> {
        const config = vscode.workspace.getConfiguration('d2Modding');
        const currentWrapText = config.get<boolean>('tableViewer.wrapText', false);
        const newWrapText = !currentWrapText;
        
        await config.update('tableViewer.wrapText', newWrapText, vscode.ConfigurationTarget.Global);
        
        // Refresh the table to apply the new text wrap setting
        await this.updateTableContent(panel, uri);
        
        vscode.window.showInformationMessage(`Text wrapping ${newWrapText ? 'enabled' : 'disabled'} for table columns.`);
    }

    private async handleSaveTableData(tableData: any, uri: vscode.Uri): Promise<void> {
        try {
            if (!uri || !uri.fsPath) {
                throw new Error('Invalid file URI for saving');
            }

            // Convert the table data back to TSV format
            const lines: string[] = [];
            
            // Add header row
            lines.push(tableData.headers.join('\t'));
            
            // Add data rows
            tableData.rows.forEach((row: string[]) => {
                lines.push(row.join('\t'));
            });
            
            // Write to file
            const content = lines.join('\n');
            await fs.promises.writeFile(uri.fsPath, content, 'utf8');
            
            vscode.window.showInformationMessage(`Table data saved to ${uri.fsPath}`);
        } catch (error) {
            console.error('Error saving table data:', error);
            vscode.window.showErrorMessage(`Failed to save table data: ${error}`);
        }
    }

    private async updateTableContent(panel: vscode.WebviewPanel, uri: vscode.Uri): Promise<void> {
        try {
            if (!uri || !uri.fsPath) {
                throw new Error('Invalid URI provided to updateTableContent');
            }
            
            const tableData = await this.parseTableData(uri);
            panel.webview.html = this.generateTableHTML(tableData);
        } catch (error) {
            console.error('Error updating table content:', error);
            panel.webview.html = this.generateErrorHTML(`Error loading table: ${error}`);
        }
    }

    private async parseTableData(uri: vscode.Uri): Promise<TableData> {
        if (!uri || !uri.fsPath) {
            throw new Error('Invalid file URI');
        }

        const content = await fs.promises.readFile(uri.fsPath, 'utf8');
        if (!content) {
            throw new Error('File content is empty or could not be read');
        }

        const lines = content.split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length === 0) {
            throw new Error('File is empty');
        }

        // Parse header row
        const headerRow = lines[0].split('\t');
        const dataRows = lines.slice(1).map(line => line.split('\t'));

        // Get max column width from configuration
        const config = vscode.workspace.getConfiguration('d2Modding');
        const maxColumnWidth = config.get<number>('tableViewer.maxColumnWidth', 200);

        // Analyze columns to determine types and optimal widths
        const columns: TableColumn[] = headerRow.map((header, index) => {
            const columnData = dataRows.map(row => row[index] || '');
            const contentWidth = Math.max(
                (header || '').length, 
                ...columnData.map(cell => (cell || '').length)
            );
            
            // Determine data type
            let type: 'text' | 'number' | 'boolean' = 'text';
            const validCells = columnData.filter(cell => cell && cell.trim() !== '');
            if (validCells.length > 0 && validCells.every(cell => !isNaN(Number(cell)))) {
                type = 'number';
            } else if (validCells.every(cell => ['true', 'false', 'yes', 'no', '1', '0'].includes(cell.toLowerCase()))) {
                type = 'boolean';
            }

            // Determine alignment
            let align: 'left' | 'center' | 'right' = 'left';
            if (type === 'number') {
                align = 'right';
            } else if (type === 'boolean') {
                align = 'center';
            }

            // Apply maximum width constraint while maintaining minimum
            const constrainedWidth = Math.min(
                Math.max(contentWidth * 8, 64), // Minimum width of 64px (8 chars * 8px)
                maxColumnWidth
            );

            return {
                header: (header || '').trim(),
                width: constrainedWidth, // Use constrained width instead of character count
                align,
                type
            };
        });

        return {
            columns,
            rows: dataRows,
            fileName: uri.fsPath ? (uri.fsPath.split(/[\\/]/).pop() || 'table') : 'table',
            filePath: uri.fsPath
        };
    }

    private generateTableHTML(data: TableData): string {
        const columnWidths = data.columns.map(col => col.width);
        const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0) + (data.columns.length * 2); // 2px padding per column
        
        // Get configuration settings
        const config = vscode.workspace.getConfiguration('d2Modding');
        const maxColumnWidth = config.get<number>('tableViewer.maxColumnWidth', 200);
        const wrapText = config.get<boolean>('tableViewer.wrapText', false);
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>D2 Table Viewer - ${data.fileName}</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        overflow-x: auto;
                    }
                
                    .table-header {
                        margin-bottom: 10px;
                        padding: 10px;
                        background-color: var(--vscode-titleBar-activeBackground);
                        border-radius: 4px;
                    }
                
                    .table-stats {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 5px;
                    }
                
                    .table-container {
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 4px;
                        overflow-x: auto;
                        overflow-y: auto;
                        background-color: var(--vscode-editor-background);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        max-height: 80vh;
                    }
                
                    table {
                        min-width: max-content;
                        border-collapse: collapse;
                        font-size: 14px;
                        line-height: 1.4;
                    }
                
                    th {
                        background-color: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                        font-weight: bold;
                        padding: 0px 6px;
                        border: 1px solid var(--vscode-widget-border);
                        border-bottom: 2px solid var(--vscode-widget-border);
                        position: sticky;
                        text-align: center;
                        top: 0;
                        z-index: 10;
                    }
                    
                    th.sticky-col {
                        position: sticky;
                        left: 0;
                        z-index: 12;
                        background-color: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                        font-weight: bold;
                        border-right: 2px solid var(--vscode-widget-border);
                        border-bottom: 2px solid var(--vscode-widget-border);
                    }
                    
                    td.sticky-col {
                        background-color: var(--vscode-list-activeSelectionBackground);
                        border-right: 2px solid var(--vscode-widget-border);
                        padding: 0px 6px;
                        color: var(--vscode-list-activeSelectionForeground);
                        font-weight: bold;
                        position: sticky;
                        left: 0;
                        z-index: 11;
                    }
                
                    td {
                        border: 1px solid var(--vscode-widget-border);
                        border-bottom: 1px solid var(--vscode-widget-border);
                        padding: 0px 6px;
                        ${wrapText ? 'white-space: normal; word-wrap: break-word;' : 'white-space: nowrap;'}
                        overflow: hidden;
                        ${!wrapText ? 'text-overflow: ellipsis;' : ''}
                        text-align: right;
                        vertical-align: top;
                    }
                
                    tr:nth-child(even) {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                
                    tr:hover {
                        background-color: var(--vscode-list-focusBackground);
                    }
                
                    .toolbar {
                        margin-bottom: 10px;
                        display: flex;
                        gap: 10px;
                        align-items: center;
                    }
                
                    .toolbar button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 12px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                
                    .toolbar button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                
                    .search-box {
                        padding: 4px 8px;
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 3px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="table-header">
                    <h3>📊 ${data.fileName}</h3>
                    <div class="table-stats">
                        ${data.rows.length} rows × ${data.columns.length} columns | 
                        Max column width: ${maxColumnWidth}px | 
                        File: ${data.filePath}
                    </div>
                </div>
            
                <div class="toolbar">
                    <input type="text" class="search-box" placeholder="Search table..." id="searchBox">
                    <button onclick="adjustColumnWidth()">📏 Adjust Max Width</button>
                    <button onclick="toggleTextWrap()" id="wrapButton">${wrapText ? '📖 Disable Wrap' : '📑 Enable Wrap'}</button>
                    <button onclick="toggleEditable()" id="editButton">✏️ Make Editable</button>
                    <button onclick="saveTable()" id="saveButton" style="display: none;">💾 Save Changes</button>
                    <button onclick="exportToCSV()">📄 Export CSV</button>
                    <button onclick="copyTable()">📋 Copy Table</button>
                    <button onclick="openInEditor()">📝 Edit Source</button>
                </div>
            
                <div class="table-container">
                    <table id="dataTable">
                        <thead>
                            <tr>
                                
                                ${data.columns.map((col, index) => `
                                    <th class="col-${col.type}${index === 0 ? ' sticky-col' : ''}" style="width: ${col.width}px; max-width: ${col.width}px;">
                                        ${col.header}
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.rows.map((row, rowIdx) => `
                                <tr>
                                    
                                    ${row.map((cell, index) => {
                                        const column = data.columns[index];
                                        return `<td class="col-${column.type}${index === 0 ? ' sticky-col' : ''}" style="width: ${column.width}px; max-width: ${column.width}px;" title="${cell}">${cell}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // Search functionality
                document.getElementById('searchBox').addEventListener('input', function(e) {
                    const searchTerm = e.target.value.toLowerCase();
                    const rows = document.querySelectorAll('#dataTable tbody tr');
                    
                    rows.forEach(row => {
                        const text = row.textContent.toLowerCase();
                        row.style.display = text.includes(searchTerm) ? '' : 'none';
                    });
                });
                
                function exportToCSV() {
                    vscode.postMessage({ command: 'exportCSV' });
                }
                
                function copyTable() {
                    const table = document.getElementById('dataTable');
                    const range = document.createRange();
                    range.selectNode(table);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                    document.execCommand('copy');
                    window.getSelection().removeAllRanges();
                }
                
                function adjustColumnWidth() {
                    vscode.postMessage({ command: 'adjustColumnWidth' });
                }
                
                function toggleTextWrap() {
                    vscode.postMessage({ command: 'toggleTextWrap' });
                }
                
                function toggleEditable() {
                    const button = document.getElementById('editButton');
                    const saveButton = document.getElementById('saveButton');
                    const cells = document.querySelectorAll('#dataTable tbody td');
                    const isCurrentlyEditable = button.textContent.includes('Lock');
                    
                    if (isCurrentlyEditable) {
                        // Make non-editable
                        cells.forEach(cell => {
                            cell.contentEditable = 'false';
                            cell.classList.remove('editable');
                        });
                        button.textContent = '✏️ Make Editable';
                        button.title = 'Make table cells editable';
                        saveButton.style.display = 'none';
                    } else {
                        // Make editable
                        cells.forEach(cell => {
                            cell.contentEditable = 'true';
                            cell.classList.add('editable');
                            
                            // Add click event to select all content when cell is clicked
                            cell.addEventListener('click', function() {
                                if (this.contentEditable === 'true') {
                                    const range = document.createRange();
                                    range.selectNodeContents(this);
                                    const selection = window.getSelection();
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                }
                            });
                            
                            // Add input event to track changes
                            cell.addEventListener('input', function() {
                                markAsChanged();
                            });
                            
                            // Add keydown event to handle Enter key and prevent newlines
                            cell.addEventListener('keydown', function(e) {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    // Move to next cell (same column, next row)
                                    const currentRow = this.parentNode;
                                    const currentCellIndex = Array.from(currentRow.children).indexOf(this);
                                    const nextRow = currentRow.nextElementSibling;
                                    
                                    if (nextRow && nextRow.children[currentCellIndex]) {
                                        const nextCell = nextRow.children[currentCellIndex];
                                        nextCell.focus();
                                        // Select all content in the next cell
                                        const range = document.createRange();
                                        range.selectNodeContents(nextCell);
                                        const selection = window.getSelection();
                                        selection.removeAllRanges();
                                        selection.addRange(range);
                                    }
                                }
                            });
                            
                            // Prevent pasting content with newlines
                            cell.addEventListener('paste', function(e) {
                                e.preventDefault();
                                const paste = (e.clipboardData || window.clipboardData).getData('text');
                                const cleanPaste = paste.replace(/\\r?\\n/g, ' ').trim();
                                document.execCommand('insertText', false, cleanPaste);
                                markAsChanged();
                            });
                        });
                        button.textContent = '🔒 Lock Editing';
                        button.title = 'Lock table cells from editing';
                        saveButton.style.display = 'inline-block';
                    }
                    
                    vscode.postMessage({ command: 'toggleEditable' });
                }
                
                function markAsChanged() {
                    const saveButton = document.getElementById('saveButton');
                    saveButton.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
                    saveButton.style.color = 'var(--vscode-button-secondaryForeground)';
                    saveButton.textContent = '💾 Save Changes *';
                }
                
                function saveTable() {
                    const headers = [];
                    const rows = [];
                    
                    // Get headers
                    const headerCells = document.querySelectorAll('#dataTable thead th');
                    headerCells.forEach(cell => {
                        headers.push(cell.textContent.trim());
                    });
                    
                    // Get data rows
                    const dataRows = document.querySelectorAll('#dataTable tbody tr');
                    dataRows.forEach(row => {
                        const rowData = [];
                        const cells = row.querySelectorAll('td');
                        cells.forEach(cell => {
                            rowData.push(cell.textContent.trim());
                        });
                        rows.push(rowData);
                    });
                    
                    // Send data to extension
                    vscode.postMessage({ 
                        command: 'saveTableData',
                        data: { headers, rows }
                    });
                    
                    // Reset save button state
                    const saveButton = document.getElementById('saveButton');
                    saveButton.style.backgroundColor = 'var(--vscode-button-background)';
                    saveButton.style.color = 'var(--vscode-button-foreground)';
                    saveButton.textContent = '💾 Save Changes';
                }
                
                function openInEditor() {
                    vscode.postMessage({ command: 'openInEditor' });
                }
            </script>
        </body>
        </html>`;
    }

    private generateErrorHTML(error: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>D2 Table Viewer - Error</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    padding: 20px;
                }
                .error {
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 15px;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div class="error">
                <h3>❌ Error Loading Table</h3>
                <p>${error}</p>
            </div>
        </body>
        </html>`;
    }
}
