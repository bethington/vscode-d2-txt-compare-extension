import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class D2FormatConverter {
    private legacyToD2RMappings: FormatMapping = {};
    private d2rToLegacyMappings: FormatMapping = {};

    constructor() {
        this.initializeMappings();
    }

    async convertFile(uri: vscode.Uri): Promise<void> {
        const fileName = path.basename(uri.fsPath, '.txt').toLowerCase();
        
        const conversionType = await vscode.window.showQuickPick([
            { label: 'Legacy D2 → D2R', value: 'legacy-to-d2r' },
            { label: 'D2R → Legacy D2', value: 'd2r-to-legacy' },
            { label: 'Auto-detect and convert', value: 'auto' }
        ], {
            placeHolder: 'Select conversion type'
        });

        if (!conversionType) { return; }

        try {
            const content = await fs.promises.readFile(uri.fsPath, 'utf8');
            let convertedContent: string;
            let targetFormat: string;

            switch (conversionType.value) {
                case 'legacy-to-d2r':
                    convertedContent = this.convertLegacyToD2R(content, fileName);
                    targetFormat = 'D2R';
                    break;
                case 'd2r-to-legacy':
                    convertedContent = this.convertD2RToLegacy(content, fileName);
                    targetFormat = 'Legacy';
                    break;
                case 'auto':
                    const detectedFormat = this.detectFormat(content, fileName);
                    if (detectedFormat === 'D2R') {
                        convertedContent = this.convertD2RToLegacy(content, fileName);
                        targetFormat = 'Legacy';
                    } else {
                        convertedContent = this.convertLegacyToD2R(content, fileName);
                        targetFormat = 'D2R';
                    }
                    break;
                default:
                    return;
            }

            await this.saveConvertedFile(uri, convertedContent, targetFormat);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error converting file: ${error}`);
        }
    }

    private convertLegacyToD2R(content: string, fileName: string): string {
        const lines = content.split('\\n');
        if (lines.length === 0) { return content; }

        const header = lines[0].split('\\t');
        const mapping = this.legacyToD2RMappings[fileName];

        if (!mapping) {
            vscode.window.showWarningMessage(`No conversion mapping found for ${fileName}.txt`);
            return content;
        }

        // Create new header with D2R columns
        const newHeader = [...header];
        mapping.addedColumns?.forEach(column => {
            if (!newHeader.includes(column.name)) {
                newHeader.push(column.name);
            }
        });

        // Rename columns
        mapping.renamedColumns?.forEach(rename => {
            const index = newHeader.indexOf(rename.from);
            if (index !== -1) {
                newHeader[index] = rename.to;
            }
        });

        const convertedLines = [newHeader.join('\\t')];

        // Convert data rows
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split('\\t');
            const newRow = [...row];

            // Add default values for new columns
            const originalLength = row.length;
            mapping.addedColumns?.forEach(column => {
                if (newRow.length < newHeader.length) {
                    newRow.push(column.defaultValue || '');
                }
            });

            // Pad row to match header length
            while (newRow.length < newHeader.length) {
                newRow.push('');
            }

            convertedLines.push(newRow.join('\\t'));
        }

        return convertedLines.join('\\n');
    }

    private convertD2RToLegacy(content: string, fileName: string): string {
        const lines = content.split('\\n');
        if (lines.length === 0) { return content; }

        const header = lines[0].split('\\t');
        const mapping = this.d2rToLegacyMappings[fileName];

        if (!mapping) {
            vscode.window.showWarningMessage(`No conversion mapping found for ${fileName}.txt`);
            return content;
        }

        // Create legacy header
        let newHeader = [...header];

        // Remove D2R-specific columns
        mapping.removedColumns?.forEach(columnName => {
            const index = newHeader.indexOf(columnName);
            if (index !== -1) {
                newHeader.splice(index, 1);
            }
        });

        // Rename columns back to legacy names
        mapping.renamedColumns?.forEach(rename => {
            const index = newHeader.indexOf(rename.from);
            if (index !== -1) {
                newHeader[index] = rename.to;
            }
        });

        const convertedLines = [newHeader.join('\\t')];

        // Convert data rows
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split('\\t');
            const newRow: string[] = [];

            newHeader.forEach(columnName => {
                const originalIndex = header.indexOf(columnName);
                if (originalIndex !== -1 && originalIndex < row.length) {
                    newRow.push(row[originalIndex]);
                } else {
                    newRow.push('');
                }
            });

            convertedLines.push(newRow.join('\\t'));
        }

        return convertedLines.join('\\n');
    }

    private detectFormat(content: string, fileName: string): 'Legacy' | 'D2R' {
        const header = content.split('\\n')[0]?.split('\\t') || [];
        
        // Check for D2R-specific columns
        const d2rColumns = [
            'enhanceddamage', 'json', 'classspecific', 'invgfx', 'setinvgfx',
            'hasinv', 'gemsockets', 'gemapplytype', 'lightradius'
        ];

        const hasD2RColumns = d2rColumns.some(col => header.includes(col));
        return hasD2RColumns ? 'D2R' : 'Legacy';
    }

    private async saveConvertedFile(originalUri: vscode.Uri, convertedContent: string, targetFormat: string): Promise<void> {
        const originalPath = originalUri.fsPath;
        const directory = path.dirname(originalPath);
        const baseName = path.basename(originalPath, '.txt');
        const newFileName = `${baseName}_${targetFormat.toLowerCase()}.txt`;
        const newPath = path.join(directory, newFileName);

        const saveOptions = await vscode.window.showQuickPick([
            { label: `Save as ${newFileName}`, value: 'new-file' },
            { label: 'Replace original file', value: 'replace' },
            { label: 'Open in new editor', value: 'editor' }
        ], {
            placeHolder: 'Choose how to save the converted file'
        });

        if (!saveOptions) { return; }

        switch (saveOptions.value) {
            case 'new-file':
                await fs.promises.writeFile(newPath, convertedContent, 'utf8');
                vscode.window.showInformationMessage(`Converted file saved as ${newFileName}`);
                break;

            case 'replace':
                const confirm = await vscode.window.showWarningMessage(
                    'This will replace the original file. Are you sure?',
                    'Yes', 'No'
                );
                if (confirm === 'Yes') {
                    await fs.promises.writeFile(originalPath, convertedContent, 'utf8');
                    vscode.window.showInformationMessage('Original file has been updated');
                }
                break;

            case 'editor':
                const doc = await vscode.workspace.openTextDocument({
                    content: convertedContent,
                    language: 'd2txt'
                });
                await vscode.window.showTextDocument(doc);
                break;
        }
    }

    private initializeMappings(): void {
        // Example mappings for Armor.txt
        this.legacyToD2RMappings['armor'] = {
            addedColumns: [
                { name: 'enhanceddamage', defaultValue: '0' },
                { name: 'lightradius', defaultValue: '0' },
                { name: 'gemsockets', defaultValue: '0' },
                { name: 'gemapplytype', defaultValue: '0' }
            ],
            renamedColumns: [
                { from: 'invfile', to: 'invgfx' }
            ]
        };

        this.d2rToLegacyMappings['armor'] = {
            removedColumns: ['enhanceddamage', 'lightradius', 'gemsockets', 'gemapplytype'],
            renamedColumns: [
                { from: 'invgfx', to: 'invfile' }
            ]
        };

        // Example mappings for Weapons.txt
        this.legacyToD2RMappings['weapons'] = {
            addedColumns: [
                { name: 'enhanceddamage', defaultValue: '0' },
                { name: 'lightradius', defaultValue: '0' },
                { name: 'gemsockets', defaultValue: '0' },
                { name: 'gemapplytype', defaultValue: '0' },
                { name: 'hasinv', defaultValue: '0' }
            ]
        };

        this.d2rToLegacyMappings['weapons'] = {
            removedColumns: ['enhanceddamage', 'lightradius', 'gemsockets', 'gemapplytype', 'hasinv']
        };

        // Add more mappings for other files as needed
        this.initializeSkillsMappings();
        this.initializeMissilesMappings();
    }

    private initializeSkillsMappings(): void {
        this.legacyToD2RMappings['skills'] = {
            addedColumns: [
                { name: 'classspecific', defaultValue: '0' },
                { name: 'json', defaultValue: '' }
            ]
        };

        this.d2rToLegacyMappings['skills'] = {
            removedColumns: ['classspecific', 'json']
        };
    }

    private initializeMissilesMappings(): void {
        this.legacyToD2RMappings['missiles'] = {
            addedColumns: [
                { name: 'lightradius', defaultValue: '0' }
            ]
        };

        this.d2rToLegacyMappings['missiles'] = {
            removedColumns: ['lightradius']
        };
    }
}

interface FormatMapping {
    [fileName: string]: {
        addedColumns?: { name: string; defaultValue?: string }[];
        removedColumns?: string[];
        renamedColumns?: { from: string; to: string }[];
    };
}
