import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Dataset } from '../providers/datasetTreeProvider';

export class D2SearchProvider {
    async searchAcrossDatasets(searchTerm: string, datasets: Dataset[]): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const isRegex = this.isRegexPattern(searchTerm);
        
        let searchPattern: RegExp;
        try {
            searchPattern = new RegExp(searchTerm, 'gi');
        } catch (error) {
            // If regex is invalid, treat as literal string
            searchPattern = new RegExp(this.escapeRegExp(searchTerm), 'gi');
        }

        for (const dataset of datasets) {
            const datasetResults = await this.searchInDataset(dataset, searchPattern);
            results.push(...datasetResults);
        }

        return results.sort((a, b) => b.matches.length - a.matches.length);
    }

    private async searchInDataset(dataset: Dataset, searchPattern: RegExp): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        
        try {
            const files = await fs.promises.readdir(dataset.path);
            const txtFiles = files.filter(f => f.endsWith('.txt'));

            for (const fileName of txtFiles) {
                const filePath = path.join(dataset.path, fileName);
                const fileResults = await this.searchInFile(filePath, fileName, dataset.name, searchPattern);
                if (fileResults.matches.length > 0) {
                    results.push(fileResults);
                }
            }
        } catch (error) {
            console.error(`Error searching in dataset ${dataset.name}:`, error);
        }

        return results;
    }

    private async searchInFile(filePath: string, fileName: string, datasetName: string, searchPattern: RegExp): Promise<SearchResult> {
        const result: SearchResult = {
            dataset: datasetName,
            file: fileName,
            filePath: filePath,
            matches: []
        };

        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const lines = content.split('\\n');

            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];
                const columns = line.split('\\t');
                
                for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
                    const cellValue = columns[columnIndex];
                    const matches = [...cellValue.matchAll(searchPattern)];
                    
                    if (matches.length > 0) {
                        result.matches.push({
                            line: lineIndex + 1,
                            column: columnIndex + 1,
                            columnName: lineIndex === 0 ? cellValue : (lines[0]?.split('\\t')[columnIndex] || `Column ${columnIndex + 1}`),
                            value: cellValue,
                            context: this.getContext(lines, lineIndex),
                            matchedText: matches.map(m => m[0])
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
        }

        return result;
    }

    private getContext(lines: string[], lineIndex: number): string {
        const contextRadius = 2;
        const start = Math.max(0, lineIndex - contextRadius);
        const end = Math.min(lines.length, lineIndex + contextRadius + 1);
        
        return lines.slice(start, end).map((line, index) => {
            const actualLineNumber = start + index + 1;
            const marker = (start + index === lineIndex) ? '→ ' : '  ';
            return `${marker}${actualLineNumber}: ${line}`;
        }).join('\\n');
    }

    showResults(results: SearchResult[]): void {
        if (results.length === 0) {
            vscode.window.showInformationMessage('No matches found');
            return;
        }

        const totalMatches = results.reduce((sum, result) => sum + result.matches.length, 0);
        
        vscode.window.showInformationMessage(
            `Found ${totalMatches} matches in ${results.length} files`,
            'Show Details'
        ).then(selection => {
            if (selection === 'Show Details') {
                this.openSearchResultsDocument(results);
            }
        });
    }

    private async openSearchResultsDocument(results: SearchResult[]): Promise<void> {
        let content = '# D2 Search Results\\n\\n';
        
        const totalMatches = results.reduce((sum, result) => sum + result.matches.length, 0);
        content += `**Total Matches:** ${totalMatches} in ${results.length} files\\n\\n`;

        for (const result of results) {
            content += `## ${result.dataset} / ${result.file}\\n`;
            content += `**Path:** \`${result.filePath}\`\\n`;
            content += `**Matches:** ${result.matches.length}\\n\\n`;

            for (const match of result.matches) {
                content += `### Line ${match.line}, Column ${match.column} (${match.columnName})\\n`;
                content += `**Value:** \`${match.value}\`\\n`;
                content += `**Matched:** ${match.matchedText.map(t => `\`${t}\``).join(', ')}\\n`;
                content += '```\\n';
                content += match.context;
                content += '\\n```\\n\\n';
            }

            content += '---\\n\\n';
        }

        // Add search tips
        content += '## Search Tips\\n\\n';
        content += '- Use regex patterns for advanced searching (e.g., `mindam|maxdam`)\\n';
        content += '- Search for numeric ranges: `\\\\b([5-9]\\\\d|[1-9]\\\\d{2,})\\\\b` for values >= 50\\n';
        content += '- Find empty cells: `^$`\\n';
        content += '- Case-insensitive by default\\n';

        const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    }

    async quickSearch(): Promise<void> {
        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Enter search term (supports regex)',
            placeHolder: 'e.g., mindam|maxdam, strength, \\\\d{3,}',
            ignoreFocusOut: true
        });

        if (!searchTerm) { return; }

        // Get datasets from context or ask user to add some
        vscode.window.showInformationMessage('Quick search feature needs dataset management integration');
    }

    async searchInCurrentFile(): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        if (!activeEditor.document.fileName.endsWith('.txt')) {
            vscode.window.showErrorMessage('Current file is not a TXT file');
            return;
        }

        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Search in current file',
            placeHolder: 'Enter search term'
        });

        if (!searchTerm) { return; }

        const searchPattern = new RegExp(this.escapeRegExp(searchTerm), 'gi');
        const fileName = path.basename(activeEditor.document.fileName);
        const result = await this.searchInFile(
            activeEditor.document.fileName, 
            fileName, 
            'Current File', 
            searchPattern
        );

        if (result.matches.length === 0) {
            vscode.window.showInformationMessage('No matches found in current file');
        } else {
            this.showResults([result]);
        }
    }

    private isRegexPattern(pattern: string): boolean {
        // Simple heuristic to detect if user intended regex
        const regexChars = /[.*+?^${}()|[\]\\]/;
        return regexChars.test(pattern);
    }

    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    }
}

export interface SearchResult {
    dataset: string;
    file: string;
    filePath: string;
    matches: SearchMatch[];
}

export interface SearchMatch {
    line: number;
    column: number;
    columnName: string;
    value: string;
    context: string;
    matchedText: string[];
}
