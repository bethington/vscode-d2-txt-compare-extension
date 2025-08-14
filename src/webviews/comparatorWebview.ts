import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class D2ComparatorWebviewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri
            ]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'compareFiles':
                        this.handleCompareFiles(message.file1, message.file2);
                        return;
                    case 'showDifferences':
                        this.showDifferences(message.differences);
                        return;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    public async compareFile(uri: vscode.Uri): Promise<void> {
        if (this._view) {
            const fileName = path.basename(uri.fsPath);
            this._view.webview.postMessage({
                command: 'setFile',
                fileName: fileName,
                filePath: uri.fsPath
            });
        }
    }

    public openComparator(): void {
        if (this._view) {
            this._view.show?.(true);
        } else {
            vscode.commands.executeCommand('workbench.view.extension.d2-modding');
        }
    }

    private async handleCompareFiles(file1Path: string, file2Path: string): Promise<void> {
        try {
            const content1 = await fs.promises.readFile(file1Path, 'utf8');
            const content2 = await fs.promises.readFile(file2Path, 'utf8');

            const differences = this.compareTextContent(content1, content2);

            if (this._view) {
                this._view.webview.postMessage({
                    command: 'showComparison',
                    differences: differences,
                    file1: path.basename(file1Path),
                    file2: path.basename(file2Path)
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error comparing files: ${error}`);
        }
    }

    private compareTextContent(content1: string, content2: string): ComparisonResult {
        const lines1 = content1.split('\\n');
        const lines2 = content2.split('\\n');

        const differences: LineDifference[] = [];
        const maxLines = Math.max(lines1.length, lines2.length);

        for (let i = 0; i < maxLines; i++) {
            const line1 = lines1[i] || '';
            const line2 = lines2[i] || '';

            if (line1 !== line2) {
                const type: DiffType = 
                    !line1 ? 'added' :
                    !line2 ? 'removed' :
                    'modified';

                differences.push({
                    lineNumber: i + 1,
                    type: type,
                    original: line1,
                    modified: line2,
                    columnDifferences: this.getColumnDifferences(line1, line2)
                });
            }
        }

        return {
            totalLines1: lines1.length,
            totalLines2: lines2.length,
            differences: differences,
            summary: {
                added: differences.filter(d => d.type === 'added').length,
                removed: differences.filter(d => d.type === 'removed').length,
                modified: differences.filter(d => d.type === 'modified').length
            }
        };
    }

    private getColumnDifferences(line1: string, line2: string): ColumnDifference[] {
        const cols1 = line1.split('\\t');
        const cols2 = line2.split('\\t');
        const differences: ColumnDifference[] = [];

        const maxCols = Math.max(cols1.length, cols2.length);

        for (let i = 0; i < maxCols; i++) {
            const col1 = cols1[i] || '';
            const col2 = cols2[i] || '';

            if (col1 !== col2) {
                differences.push({
                    columnIndex: i,
                    original: col1,
                    modified: col2
                });
            }
        }

        return differences;
    }

    private showDifferences(differences: ComparisonResult): void {
        // Open VSCode's built-in diff editor
        vscode.commands.executeCommand('vscode.diff',
            vscode.Uri.parse('untitled:Original'),
            vscode.Uri.parse('untitled:Modified'),
            'File Comparison'
        );
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>D2 File Comparator</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 10px;
        }
        .file-selector {
            margin-bottom: 20px;
        }
        .file-input {
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
        }
        .compare-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            width: 100%;
            margin: 10px 0;
        }
        .compare-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .differences {
            margin-top: 20px;
        }
        .diff-line {
            padding: 4px;
            margin: 2px 0;
            font-family: monospace;
        }
        .diff-added {
            background-color: var(--vscode-diffEditor-insertedTextBackground);
        }
        .diff-removed {
            background-color: var(--vscode-diffEditor-removedTextBackground);
        }
        .diff-modified {
            background-color: var(--vscode-diffEditor-modifiedTextBackground);
        }
        .summary {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="file-selector">
        <h3>D2 File Comparator</h3>
        <input type="text" id="file1" class="file-input" placeholder="First file path" readonly>
        <input type="text" id="file2" class="file-input" placeholder="Second file path (click to select)">
        <button class="compare-button" onclick="selectSecondFile()">Select File to Compare</button>
        <button class="compare-button" onclick="compareFiles()">Compare Files</button>
    </div>

    <div id="results" class="differences" style="display: none;">
        <div id="summary" class="summary"></div>
        <div id="diff-content"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentFile1 = '';
        let currentFile2 = '';

        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'setFile':
                    document.getElementById('file1').value = message.fileName;
                    currentFile1 = message.filePath;
                    break;
                    
                case 'showComparison':
                    showComparisonResults(message);
                    break;
            }
        });

        function selectSecondFile() {
            // This would typically open a file picker, but for now we'll use input
            const file2Input = document.getElementById('file2');
            file2Input.style.backgroundColor = 'var(--vscode-inputOption-activeBorder)';
            file2Input.readOnly = false;
            file2Input.focus();
        }

        function compareFiles() {
            const file2 = document.getElementById('file2').value;
            if (currentFile1 && file2) {
                currentFile2 = file2;
                vscode.postMessage({
                    command: 'compareFiles',
                    file1: currentFile1,
                    file2: file2
                });
            } else {
                alert('Please select both files to compare');
            }
        }

        function showComparisonResults(data) {
            const results = document.getElementById('results');
            const summary = document.getElementById('summary');
            const diffContent = document.getElementById('diff-content');

            summary.innerHTML = \`
                <h4>Comparison Summary</h4>
                <p><strong>\${data.file1}</strong> vs <strong>\${data.file2}</strong></p>
                <p>Added: \${data.differences.summary.added} | 
                   Removed: \${data.differences.summary.removed} | 
                   Modified: \${data.differences.summary.modified}</p>
            \`;

            let diffHtml = '';
            data.differences.differences.forEach(diff => {
                const cssClass = \`diff-\${diff.type}\`;
                diffHtml += \`
                    <div class="diff-line \${cssClass}">
                        <strong>Line \${diff.lineNumber}:</strong>
                        \${diff.type === 'removed' ? '- ' + diff.original : ''}
                        \${diff.type === 'added' ? '+ ' + diff.modified : ''}
                        \${diff.type === 'modified' ? '~ ' + diff.modified : ''}
                    </div>
                \`;
            });

            diffContent.innerHTML = diffHtml;
            results.style.display = 'block';
        }
    </script>
</body>
</html>`;
    }
}

export interface ComparisonResult {
    totalLines1: number;
    totalLines2: number;
    differences: LineDifference[];
    summary: {
        added: number;
        removed: number;
        modified: number;
    };
}

export interface LineDifference {
    lineNumber: number;
    type: DiffType;
    original: string;
    modified: string;
    columnDifferences: ColumnDifference[];
}

export interface ColumnDifference {
    columnIndex: number;
    original: string;
    modified: string;
}

export type DiffType = 'added' | 'removed' | 'modified';
