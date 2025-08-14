import * as vscode from 'vscode';
export class D2TextEditorProvider implements vscode.CustomTextEditorProvider {
    private static readonly viewType = 'd2Modding.txtEditor';

    constructor(private context: vscode.ExtensionContext) {}

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new D2TextEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            D2TextEditorProvider.viewType, 
            provider,
            {
                // Make this editor the default for .txt files
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        );
        return providerRegistration;
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Set up the webview
        webviewPanel.webview.options = {
            enableScripts: true,
        };

        // Create the HTML content for the custom editor
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'openInTextEditor':
                    // Open in default text editor
                    await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
                    break;
                case 'updateContent':
                    await this.updateTextDocument(document, message.content);
                    break;
            }
        });

        // Update webview when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this.updateWebview(webviewPanel.webview, document);
            }
        });

        // Clean up subscription when webview is disposed
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Initial load
        this.updateWebview(webviewPanel.webview, document);
    }

    private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
        const fileName = document.uri.fsPath.split(/[\\/]/).pop() || 'file.txt';
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>D2 Text Editor - ${fileName}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .toolbar {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    padding: 10px;
                    background-color: var(--vscode-titleBar-activeBackground);
                    border-radius: 4px;
                }
                .toolbar button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .toolbar button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .editor-container {
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    overflow: hidden;
                    background-color: var(--vscode-editor-background);
                }
                .editor {
                    width: 100%;
                    height: 500px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    padding: 10px;
                    border: none;
                    outline: none;
                    resize: vertical;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    tab-size: 4;
                    white-space: pre;
                    overflow-wrap: normal;
                    overflow-x: auto;
                }
                .status-bar {
                    padding: 5px 10px;
                    font-size: 12px;
                    background-color: var(--vscode-statusBar-background);
                    color: var(--vscode-statusBar-foreground);
                    border-top: 1px solid var(--vscode-widget-border);
                }
                .file-info {
                    margin-bottom: 10px;
                    padding: 10px;
                    background-color: var(--vscode-textBlockQuote-background);
                    border-left: 4px solid var(--vscode-textBlockQuote-border);
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div class="file-info">
                <h3>📄 ${fileName}</h3>
                <p>D2 Text File Editor with enhanced formatting and analysis tools</p>
            </div>
            
            <div class="toolbar">
                <button onclick="openInTextEditor()">📝 Open in Text Editor</button>
                <button onclick="refreshContent()">🔄 Refresh</button>
            </div>
            
            <div class="editor-container">
                <textarea id="editor" class="editor" spellcheck="false"></textarea>
                <div class="status-bar">
                    <span id="status">Ready - D2 Text Editor</span>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const editor = document.getElementById('editor');
                const status = document.getElementById('status');



                function openInTextEditor() {
                    vscode.postMessage({ type: 'openInTextEditor' });
                }

                function refreshContent() {
                    status.textContent = 'Refreshing...';
                    location.reload();
                }

                // Handle content changes
                editor.addEventListener('input', () => {
                    vscode.postMessage({ 
                        type: 'updateContent',
                        content: editor.value 
                    });
                    status.textContent = 'Modified - Use Ctrl+S to save';
                });

                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'updateContent':
                            editor.value = message.content;
                            updateStats();
                            break;
                    }
                });

                function updateStats() {
                    const content = editor.value;
                    const lines = content.split('\\n').length;
                    const columns = content.split('\\n')[0]?.split('\\t').length || 0;
                    status.textContent = \`Lines: \${lines}, Columns: \${columns}\`;
                }

                // Initial stats update
                updateStats();

                // Auto-adjust editor height based on content
                function adjustHeight() {
                    editor.style.height = 'auto';
                    editor.style.height = Math.max(500, editor.scrollHeight + 20) + 'px';
                }

                editor.addEventListener('input', adjustHeight);
            </script>
        </body>
        </html>`;
    }

    private updateWebview(webview: vscode.Webview, document: vscode.TextDocument) {
        webview.postMessage({
            type: 'updateContent',
            content: document.getText()
        });
    }

    private async updateTextDocument(document: vscode.TextDocument, content: string) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            content
        );
        return vscode.workspace.applyEdit(edit);
    }
}
