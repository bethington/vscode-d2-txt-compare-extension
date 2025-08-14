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
exports.D2MergeProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class D2MergeProvider {
    context;
    _view;
    constructor(context) {
        this.context = context;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'mergeTwoWay':
                    this.handleTwoWayMerge(message.file1, message.file2, message.outputPath);
                    return;
                case 'mergeThreeWay':
                    this.handleThreeWayMerge(message.base, message.file1, message.file2, message.outputPath);
                    return;
                case 'resolveConflict':
                    this.resolveConflict(message.conflictId, message.resolution);
                    return;
                case 'autoMerge':
                    this.performAutoMerge(message.conflicts);
                    return;
            }
        }, undefined, this.context.subscriptions);
    }
    async mergeTxtFiles(baseFile, file1, file2) {
        if (!file1 || !file2) {
            const selectedFiles = await vscode.window.showOpenDialog({
                canSelectMany: true,
                canSelectFiles: true,
                canSelectFolders: false,
                filters: {
                    'TXT Files': ['txt']
                },
                openLabel: 'Select files to merge'
            });
            if (!selectedFiles || selectedFiles.length < 2) {
                vscode.window.showErrorMessage('Please select at least 2 files to merge');
                return;
            }
            file1 = selectedFiles[0];
            file2 = selectedFiles[1];
            baseFile = selectedFiles.length > 2 ? selectedFiles[2] : undefined;
        }
        try {
            if (baseFile) {
                await this.performThreeWayMerge(baseFile, file1, file2);
            }
            else {
                await this.performTwoWayMerge(file1, file2);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Merge failed: ${error}`);
        }
    }
    async performTwoWayMerge(file1, file2) {
        const content1 = await fs.promises.readFile(file1.fsPath, 'utf8');
        const content2 = await fs.promises.readFile(file2.fsPath, 'utf8');
        const mergeResult = this.mergeTwoWayContent(content1, content2, file1.fsPath, file2.fsPath);
        await this.showMergeResults(mergeResult);
    }
    async performThreeWayMerge(base, file1, file2) {
        const baseContent = await fs.promises.readFile(base.fsPath, 'utf8');
        const content1 = await fs.promises.readFile(file1.fsPath, 'utf8');
        const content2 = await fs.promises.readFile(file2.fsPath, 'utf8');
        const mergeResult = this.mergeThreeWayContent(baseContent, content1, content2, base.fsPath, file1.fsPath, file2.fsPath);
        await this.showMergeResults(mergeResult);
    }
    mergeTwoWayContent(content1, content2, path1, path2) {
        const lines1 = content1.split('\\n');
        const lines2 = content2.split('\\n');
        const result = {
            conflicts: [],
            autoMerged: [],
            resultContent: '',
            summary: {
                totalConflicts: 0,
                autoResolved: 0,
                manualRequired: 0
            }
        };
        // Simple two-way merge: combine unique rows
        const header1 = lines1[0]?.split('\\t') || [];
        const header2 = lines2[0]?.split('\\t') || [];
        // Merge headers
        const mergedHeader = this.mergeHeaders(header1, header2);
        const resultLines = [mergedHeader.join('\\t')];
        // Track seen rows by first column (assumed to be unique identifier)
        const seenRows = new Map();
        // Process file 1
        for (let i = 1; i < lines1.length; i++) {
            const line = lines1[i].trim();
            if (!line) {
                continue;
            }
            const cells = line.split('\\t');
            const key = cells[0] || `line_${i}`;
            seenRows.set(key, { line, source: path.basename(path1) });
        }
        // Process file 2 and detect conflicts
        for (let i = 1; i < lines2.length; i++) {
            const line = lines2[i].trim();
            if (!line) {
                continue;
            }
            const cells = line.split('\\t');
            const key = cells[0] || `line_${i}`;
            if (seenRows.has(key)) {
                const existing = seenRows.get(key);
                if (existing.line !== line) {
                    // Conflict detected
                    result.conflicts.push({
                        id: `conflict_${result.conflicts.length}`,
                        rowKey: key,
                        baseValue: existing.line,
                        value1: existing.line,
                        value2: line,
                        source1: existing.source,
                        source2: path.basename(path2),
                        resolution: 'unresolved'
                    });
                    result.summary.totalConflicts++;
                }
            }
            else {
                seenRows.set(key, { line, source: path.basename(path2) });
                result.autoMerged.push({
                    rowKey: key,
                    value: line,
                    source: path.basename(path2)
                });
                result.summary.autoResolved++;
            }
        }
        // Build result content (conflicts will be marked)
        for (const [key, entry] of seenRows) {
            const conflict = result.conflicts.find(c => c.rowKey === key);
            if (conflict) {
                resultLines.push(`# CONFLICT: ${key}`);
                resultLines.push(`# <<< ${conflict.source1}`);
                resultLines.push(conflict.value1);
                resultLines.push(`# === SEPARATOR ===`);
                resultLines.push(`# >>> ${conflict.source2}`);
                resultLines.push(conflict.value2);
                resultLines.push(`# END CONFLICT`);
            }
            else {
                resultLines.push(entry.line);
            }
        }
        result.resultContent = resultLines.join('\\n');
        result.summary.manualRequired = result.summary.totalConflicts;
        return result;
    }
    mergeThreeWayContent(baseContent, content1, content2, basePath, path1, path2) {
        // Three-way merge implementation (simplified)
        const baseLines = baseContent.split('\\n');
        const lines1 = content1.split('\\n');
        const lines2 = content2.split('\\n');
        const result = {
            conflicts: [],
            autoMerged: [],
            resultContent: '',
            summary: {
                totalConflicts: 0,
                autoResolved: 0,
                manualRequired: 0
            }
        };
        // Use base as reference for three-way merge
        const baseRows = new Map();
        const rows1 = new Map();
        const rows2 = new Map();
        // Parse all files
        this.parseFileToMap(baseLines, baseRows);
        this.parseFileToMap(lines1, rows1);
        this.parseFileToMap(lines2, rows2);
        const allKeys = new Set([...baseRows.keys(), ...rows1.keys(), ...rows2.keys()]);
        const resultLines = [baseLines[0] || '']; // Keep header
        for (const key of allKeys) {
            if (key === baseLines[0]?.split('\\t')[0]) {
                continue;
            } // Skip header key
            const baseValue = baseRows.get(key);
            const value1 = rows1.get(key);
            const value2 = rows2.get(key);
            if (baseValue === value1 && baseValue === value2) {
                // No changes
                if (baseValue) {
                    resultLines.push(baseValue);
                }
            }
            else if (baseValue === value1 && value2) {
                // Only file2 changed
                resultLines.push(value2);
                result.autoMerged.push({
                    rowKey: key,
                    value: value2,
                    source: path.basename(path2)
                });
                result.summary.autoResolved++;
            }
            else if (baseValue === value2 && value1) {
                // Only file1 changed
                resultLines.push(value1);
                result.autoMerged.push({
                    rowKey: key,
                    value: value1,
                    source: path.basename(path1)
                });
                result.summary.autoResolved++;
            }
            else if (value1 === value2) {
                // Both files changed to same value
                if (value1) {
                    resultLines.push(value1);
                    result.autoMerged.push({
                        rowKey: key,
                        value: value1,
                        source: 'both'
                    });
                    result.summary.autoResolved++;
                }
            }
            else {
                // Conflict: both files changed to different values
                result.conflicts.push({
                    id: `conflict_${result.conflicts.length}`,
                    rowKey: key,
                    baseValue: baseValue || '',
                    value1: value1 || '',
                    value2: value2 || '',
                    source1: path.basename(path1),
                    source2: path.basename(path2),
                    resolution: 'unresolved'
                });
                result.summary.totalConflicts++;
            }
        }
        result.resultContent = resultLines.join('\\n');
        result.summary.manualRequired = result.summary.totalConflicts;
        return result;
    }
    parseFileToMap(lines, map) {
        for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i].trim();
            if (!line) {
                continue;
            }
            const cells = line.split('\\t');
            const key = cells[0] || `line_${i}`;
            map.set(key, line);
        }
    }
    mergeHeaders(header1, header2) {
        const merged = [...header1];
        for (const col of header2) {
            if (!merged.includes(col)) {
                merged.push(col);
            }
        }
        return merged;
    }
    async showMergeResults(result) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'showMergeResult',
                result: result
            });
            this._view.show?.(true);
        }
        if (result.summary.totalConflicts === 0) {
            const save = await vscode.window.showInformationMessage(`Merge completed successfully! ${result.summary.autoResolved} items auto-merged.`, 'Save Result', 'View Result');
            if (save === 'Save Result') {
                await this.saveMergeResult(result);
            }
            else if (save === 'View Result') {
                await this.showMergeInEditor(result);
            }
        }
        else {
            vscode.window.showWarningMessage(`Merge completed with ${result.summary.totalConflicts} conflicts requiring manual resolution.`);
        }
    }
    async saveMergeResult(result) {
        const saveUri = await vscode.window.showSaveDialog({
            filters: {
                'TXT Files': ['txt']
            },
            defaultUri: vscode.Uri.file('merged.txt')
        });
        if (saveUri) {
            await fs.promises.writeFile(saveUri.fsPath, result.resultContent, 'utf8');
            vscode.window.showInformationMessage(`Merge result saved to ${saveUri.fsPath}`);
        }
    }
    async showMergeInEditor(result) {
        const doc = await vscode.workspace.openTextDocument({
            content: result.resultContent,
            language: 'd2txt'
        });
        await vscode.window.showTextDocument(doc);
    }
    handleTwoWayMerge(file1, file2, outputPath) {
        // Implementation for webview integration
        vscode.window.showInformationMessage(`Two-way merge: ${file1} + ${file2} → ${outputPath}`);
    }
    handleThreeWayMerge(base, file1, file2, outputPath) {
        // Implementation for webview integration
        vscode.window.showInformationMessage(`Three-way merge: ${base} | ${file1} + ${file2} → ${outputPath}`);
    }
    resolveConflict(conflictId, resolution) {
        // Implementation for conflict resolution
        vscode.window.showInformationMessage(`Conflict ${conflictId} resolved with: ${resolution}`);
    }
    performAutoMerge(conflicts) {
        // Implementation for auto-merge
        vscode.window.showInformationMessage(`Auto-merging ${conflicts.length} conflicts`);
    }
    getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>D2 Merge Tool</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 10px;
        }
        .merge-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .file-section {
            border: 1px solid var(--vscode-input-border);
            padding: 10px;
            border-radius: 4px;
        }
        .conflict-item {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            padding: 8px;
            margin: 5px 0;
            border-radius: 4px;
        }
        .conflict-options {
            display: flex;
            gap: 10px;
            margin-top: 5px;
        }
        .conflict-option {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            cursor: pointer;
            border-radius: 3px;
        }
        .conflict-option:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .merge-summary {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="merge-container">
        <h3>D2 Merge Tool</h3>
        
        <div class="file-section">
            <h4>Merge Configuration</h4>
            <select id="mergeType">
                <option value="two-way">Two-way merge</option>
                <option value="three-way">Three-way merge (with base)</option>
            </select>
            <button onclick="startMerge()">Start Merge</button>
        </div>

        <div id="mergeResults" style="display: none;">
            <div class="merge-summary">
                <h4>Merge Summary</h4>
                <div id="summaryContent"></div>
            </div>
            
            <div id="conflictsList">
                <h4>Conflicts Requiring Resolution</h4>
                <div id="conflictsContent"></div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'showMergeResult':
                    showMergeResults(message.result);
                    break;
            }
        });

        function startMerge() {
            const mergeType = document.getElementById('mergeType').value;
            // This would typically open file dialogs
            vscode.postMessage({
                command: mergeType === 'two-way' ? 'mergeTwoWay' : 'mergeThreeWay'
            });
        }

        function showMergeResults(result) {
            document.getElementById('mergeResults').style.display = 'block';
            
            document.getElementById('summaryContent').innerHTML = \`
                <p>Total conflicts: \${result.summary.totalConflicts}</p>
                <p>Auto-resolved: \${result.summary.autoResolved}</p>
                <p>Manual resolution required: \${result.summary.manualRequired}</p>
            \`;

            const conflictsHtml = result.conflicts.map(conflict => \`
                <div class="conflict-item">
                    <strong>Row: \${conflict.rowKey}</strong>
                    <div>File 1 (\${conflict.source1}): \${conflict.value1}</div>
                    <div>File 2 (\${conflict.source2}): \${conflict.value2}</div>
                    <div class="conflict-options">
                        <button class="conflict-option" onclick="resolveConflict('\${conflict.id}', 'file1')">Use File 1</button>
                        <button class="conflict-option" onclick="resolveConflict('\${conflict.id}', 'file2')">Use File 2</button>
                        <button class="conflict-option" onclick="resolveConflict('\${conflict.id}', 'manual')">Edit Manually</button>
                    </div>
                </div>
            \`).join('');

            document.getElementById('conflictsContent').innerHTML = conflictsHtml;
        }

        function resolveConflict(conflictId, resolution) {
            vscode.postMessage({
                command: 'resolveConflict',
                conflictId: conflictId,
                resolution: resolution
            });
        }
    </script>
</body>
</html>`;
    }
}
exports.D2MergeProvider = D2MergeProvider;
//# sourceMappingURL=mergeProvider.js.map