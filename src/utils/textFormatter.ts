import * as vscode from 'vscode';
import * as fs from 'fs';

export interface ColumnInfo {
    maxWidth: number;
    align: 'left' | 'right' | 'center';
    type: 'text' | 'number' | 'mixed';
}

export class D2TextFormatter {
    
    /**
     * Convert TSV file to space-aligned format
     */
    public static async formatTSVToSpaces(uri: vscode.Uri): Promise<void> {
        try {
            const content = await fs.promises.readFile(uri.fsPath, 'utf8');
            const lines = content.split('\n');
            
            if (lines.length === 0) {
                vscode.window.showErrorMessage('File is empty');
                return;
            }

            // Analyze all rows to determine column widths
            const allRows = lines.map(line => line.split('\t'));
            const maxColumns = Math.max(...allRows.map(row => row.length));
            
            // Calculate column info
            const columnInfo: ColumnInfo[] = [];
            for (let col = 0; col < maxColumns; col++) {
                const columnData = allRows.map(row => row[col] || '').filter(cell => cell.trim() !== '');
                const maxWidth = Math.max(...columnData.map(cell => cell.length), 3); // Min width 3
                
                // Determine if column is numeric
                const isNumeric = columnData.every(cell => 
                    cell.trim() === '' || !isNaN(Number(cell.trim()))
                );
                
                columnInfo.push({
                    maxWidth: maxWidth + 2, // Add padding
                    align: isNumeric ? 'right' : 'left',
                    type: isNumeric ? 'number' : 'text'
                });
            }

            // Format each line
            const formattedLines = allRows.map((row, lineIndex) => {
                const formattedCells = row.map((cell, colIndex) => {
                    if (colIndex >= columnInfo.length) {
                        return cell;
                    }
                    
                    const info = columnInfo[colIndex];
                    const trimmedCell = cell.trim();
                    
                    // Don't pad the last column
                    if (colIndex === row.length - 1) {
                        return trimmedCell;
                    }
                    
                    // Apply alignment and padding
                    if (info.align === 'right') {
                        return trimmedCell.padStart(info.maxWidth);
                    } else if (info.align === 'center') {
                        const totalPadding = info.maxWidth - trimmedCell.length;
                        const leftPadding = Math.floor(totalPadding / 2);
                        return trimmedCell.padStart(trimmedCell.length + leftPadding).padEnd(info.maxWidth);
                    } else {
                        return trimmedCell.padEnd(info.maxWidth);
                    }
                });
                
                return formattedCells.join('');
            });

            // Apply the formatted content
            const document = await vscode.workspace.openTextDocument(uri);
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(content.length)
            );
            
            edit.replace(uri, fullRange, formattedLines.join('\n'));
            
            const success = await vscode.workspace.applyEdit(edit);
            
            if (success) {
                vscode.window.showInformationMessage(
                    `✅ Converted TSV to space-aligned format (${maxColumns} columns, ${lines.length} rows)`
                );
            } else {
                vscode.window.showErrorMessage('Failed to apply formatting');
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error formatting file: ${error}`);
        }
    }

    /**
     * Convert space-aligned format back to TSV
     */
    public static async formatSpacesToTSV(uri: vscode.Uri): Promise<void> {
        try {
            const content = await fs.promises.readFile(uri.fsPath, 'utf8');
            const lines = content.split('\n');
            
            // Convert space-aligned back to TSV by detecting column boundaries
            const tsvLines = lines.map(line => {
                if (line.trim() === '') {
                    return line;
                }
                
                // Split on multiple spaces (column boundaries)
                const columns = line.split(/\s{2,}/).map(col => col.trim());
                return columns.join('\t');
            });

            // Apply the TSV content
            const document = await vscode.workspace.openTextDocument(uri);
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(content.length)
            );
            
            edit.replace(uri, fullRange, tsvLines.join('\n'));
            
            const success = await vscode.workspace.applyEdit(edit);
            
            if (success) {
                vscode.window.showInformationMessage('✅ Converted space-aligned format back to TSV');
            } else {
                vscode.window.showErrorMessage('Failed to apply TSV conversion');
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error converting file: ${error}`);
        }
    }

    /**
     * Create a preview of how the file would look with space alignment
     */
    public static async previewSpaceAlignment(uri: vscode.Uri): Promise<void> {
        try {
            const content = await fs.promises.readFile(uri.fsPath, 'utf8');
            const lines = content.split('\n').slice(0, 15); // Preview first 15 lines
            
            // Process same as formatTSVToSpaces but only show preview
            const allRows = lines.map(line => line.split('\t'));
            const maxColumns = Math.max(...allRows.map(row => row.length));
            
            const columnInfo: ColumnInfo[] = [];
            for (let col = 0; col < maxColumns; col++) {
                const columnData = allRows.map(row => row[col] || '').filter(cell => cell.trim() !== '');
                const maxWidth = Math.max(...columnData.map(cell => cell.length), 3);
                
                const isNumeric = columnData.every(cell => 
                    cell.trim() === '' || !isNaN(Number(cell.trim()))
                );
                
                columnInfo.push({
                    maxWidth: maxWidth + 2,
                    align: isNumeric ? 'right' : 'left',
                    type: isNumeric ? 'number' : 'text'
                });
            }

            const formattedLines = allRows.map(row => {
                const formattedCells = row.map((cell, colIndex) => {
                    if (colIndex >= columnInfo.length) {
                        return cell;
                    }
                    
                    const info = columnInfo[colIndex];
                    const trimmedCell = cell.trim();
                    
                    if (colIndex === row.length - 1) {
                        return trimmedCell;
                    }
                    
                    if (info.align === 'right') {
                        return trimmedCell.padStart(info.maxWidth);
                    } else {
                        return trimmedCell.padEnd(info.maxWidth);
                    }
                });
                
                return formattedCells.join('');
            });

            // Show preview in output channel
            const fileName = uri.fsPath.split(/[\\/]/).pop() || 'file';
            const output = vscode.window.createOutputChannel(`Space Alignment Preview: ${fileName}`);
            output.clear();
            output.appendLine('Space-Aligned Format Preview');
            output.appendLine('='.repeat(50));
            output.appendLine(`Columns: ${maxColumns}`);
            output.appendLine(`Column Info: ${columnInfo.map((info, i) => 
                `Col${i+1}(${info.type}, ${info.align}, w:${info.maxWidth})`
            ).join(', ')}`);
            output.appendLine('');
            output.appendLine('Preview (first 15 lines):');
            output.appendLine('-'.repeat(30));
            formattedLines.forEach(line => output.appendLine(line));
            output.appendLine('-'.repeat(30));
            output.appendLine('');
            output.appendLine('💡 Use "Convert TSV to Spaces" to apply this formatting to the entire file.');
            output.show();

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating preview: ${error}`);
        }
    }
}
