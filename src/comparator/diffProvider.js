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
exports.D2DiffProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class D2DiffProvider {
    outputChannel;
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('D2 Diff Analysis');
    }
    async showAdvancedDiff(file1, file2) {
        try {
            const content1 = await fs.promises.readFile(file1.fsPath, 'utf8');
            const content2 = await fs.promises.readFile(file2.fsPath, 'utf8');
            const analysis = this.analyzeFiles(content1, content2, file1.fsPath, file2.fsPath);
            // Show built-in VSCode diff
            await vscode.commands.executeCommand('vscode.diff', file1, file2, `${path.basename(file1.fsPath)} ↔ ${path.basename(file2.fsPath)}`);
            // Show detailed analysis
            this.showDetailedAnalysis(analysis);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error comparing files: ${error}`);
        }
    }
    analyzeFiles(content1, content2, path1, path2) {
        const lines1 = content1.split('\n').map(line => line.trim());
        const lines2 = content2.split('\n').map(line => line.trim());
        const analysis = {
            file1: path.basename(path1),
            file2: path.basename(path2),
            summary: {
                totalLines1: lines1.length,
                totalLines2: lines2.length,
                addedRows: 0,
                removedRows: 0,
                modifiedRows: 0,
                addedColumns: [],
                removedColumns: [],
                renamedColumns: []
            },
            rowChanges: [],
            columnChanges: [],
            cellChanges: [],
            statistics: {
                similarityPercentage: 0,
                significantChanges: 0,
                minorChanges: 0
            }
        };
        // Header analysis
        if (lines1.length > 0 && lines2.length > 0) {
            const header1 = lines1[0].split('\t');
            const header2 = lines2[0].split('\t');
            this.analyzeHeaders(header1, header2, analysis);
        }
        // Row-by-row analysis
        this.analyzeRows(lines1, lines2, analysis);
        // Calculate statistics
        this.calculateStatistics(analysis);
        return analysis;
    }
    analyzeHeaders(header1, header2, analysis) {
        const set1 = new Set(header1);
        const set2 = new Set(header2);
        // Find added columns
        for (const col of header2) {
            if (!set1.has(col)) {
                analysis.summary.addedColumns.push(col);
            }
        }
        // Find removed columns
        for (const col of header1) {
            if (!set2.has(col)) {
                analysis.summary.removedColumns.push(col);
            }
        }
        // Detect potential renames (similar column names)
        for (const removed of analysis.summary.removedColumns) {
            for (const added of analysis.summary.addedColumns) {
                if (this.calculateStringSimilarity(removed, added) > 0.7) {
                    analysis.summary.renamedColumns.push({
                        from: removed,
                        to: added,
                        confidence: this.calculateStringSimilarity(removed, added)
                    });
                }
            }
        }
    }
    analyzeRows(lines1, lines2, analysis) {
        const maxLines = Math.max(lines1.length, lines2.length);
        for (let i = 1; i < maxLines; i++) { // Skip header
            const line1 = lines1[i] || '';
            const line2 = lines2[i] || '';
            if (!line1 && line2) {
                analysis.summary.addedRows++;
                analysis.rowChanges.push({
                    lineNumber: i + 1,
                    type: 'added',
                    content: line2
                });
            }
            else if (line1 && !line2) {
                analysis.summary.removedRows++;
                analysis.rowChanges.push({
                    lineNumber: i + 1,
                    type: 'removed',
                    content: line1
                });
            }
            else if (line1 !== line2) {
                analysis.summary.modifiedRows++;
                this.analyzeCellChanges(line1, line2, i + 1, analysis);
            }
        }
    }
    analyzeCellChanges(line1, line2, lineNumber, analysis) {
        const cells1 = line1.split('\t');
        const cells2 = line2.split('\t');
        const maxCells = Math.max(cells1.length, cells2.length);
        const header = analysis.file1; // Simplified for now
        for (let j = 0; j < maxCells; j++) {
            const cell1 = cells1[j] || '';
            const cell2 = cells2[j] || '';
            if (cell1 !== cell2) {
                const changeType = this.categorizeChange(cell1, cell2);
                analysis.cellChanges.push({
                    row: lineNumber,
                    column: j + 1,
                    columnName: `Column ${j + 1}`,
                    oldValue: cell1,
                    newValue: cell2,
                    changeType: changeType,
                    significance: this.calculateChangeSignificance(cell1, cell2, changeType)
                });
            }
        }
    }
    categorizeChange(oldValue, newValue) {
        if (!oldValue && newValue) {
            return 'added';
        }
        if (oldValue && !newValue) {
            return 'removed';
        }
        const oldNum = Number(oldValue);
        const newNum = Number(newValue);
        if (!isNaN(oldNum) && !isNaN(newNum)) {
            return 'numeric';
        }
        return 'text';
    }
    calculateChangeSignificance(oldValue, newValue, type) {
        if (type === 'numeric') {
            const oldNum = Number(oldValue);
            const newNum = Number(newValue);
            const percentChange = Math.abs((newNum - oldNum) / oldNum) * 100;
            return percentChange > 20 ? 'major' : 'minor';
        }
        const similarity = this.calculateStringSimilarity(oldValue, newValue);
        return similarity < 0.5 ? 'major' : 'minor';
    }
    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) {
            return 1.0;
        }
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    calculateStatistics(analysis) {
        const totalChanges = analysis.cellChanges.length;
        const majorChanges = analysis.cellChanges.filter(c => c.significance === 'major').length;
        analysis.statistics.significantChanges = majorChanges;
        analysis.statistics.minorChanges = totalChanges - majorChanges;
        // Simple similarity calculation
        const totalCells = Math.max(analysis.summary.totalLines1 * 10, // Estimate
        analysis.summary.totalLines2 * 10);
        analysis.statistics.similarityPercentage =
            Math.max(0, (totalCells - totalChanges) / totalCells * 100);
    }
    showDetailedAnalysis(analysis) {
        this.outputChannel.clear();
        this.outputChannel.appendLine(`=== D2 File Comparison Analysis ===`);
        this.outputChannel.appendLine(`Files: ${analysis.file1} ↔ ${analysis.file2}`);
        this.outputChannel.appendLine(``);
        // Summary
        this.outputChannel.appendLine(`📊 SUMMARY:`);
        this.outputChannel.appendLine(`  Lines: ${analysis.summary.totalLines1} → ${analysis.summary.totalLines2}`);
        this.outputChannel.appendLine(`  Added rows: ${analysis.summary.addedRows}`);
        this.outputChannel.appendLine(`  Removed rows: ${analysis.summary.removedRows}`);
        this.outputChannel.appendLine(`  Modified rows: ${analysis.summary.modifiedRows}`);
        this.outputChannel.appendLine(`  Similarity: ${analysis.statistics.similarityPercentage.toFixed(1)}%`);
        this.outputChannel.appendLine(``);
        // Column changes
        if (analysis.summary.addedColumns.length > 0) {
            this.outputChannel.appendLine(`➕ ADDED COLUMNS:`);
            analysis.summary.addedColumns.forEach(col => {
                this.outputChannel.appendLine(`  + ${col}`);
            });
            this.outputChannel.appendLine(``);
        }
        if (analysis.summary.removedColumns.length > 0) {
            this.outputChannel.appendLine(`➖ REMOVED COLUMNS:`);
            analysis.summary.removedColumns.forEach(col => {
                this.outputChannel.appendLine(`  - ${col}`);
            });
            this.outputChannel.appendLine(``);
        }
        // Significant changes
        const significantChanges = analysis.cellChanges.filter(c => c.significance === 'major');
        if (significantChanges.length > 0) {
            this.outputChannel.appendLine(`🔥 SIGNIFICANT CHANGES:`);
            significantChanges.slice(0, 20).forEach(change => {
                this.outputChannel.appendLine(`  Row ${change.row}, Col ${change.column}: "${change.oldValue}" → "${change.newValue}"`);
            });
            if (significantChanges.length > 20) {
                this.outputChannel.appendLine(`  ... and ${significantChanges.length - 20} more`);
            }
        }
        this.outputChannel.show();
    }
}
exports.D2DiffProvider = D2DiffProvider;
//# sourceMappingURL=diffProvider.js.map