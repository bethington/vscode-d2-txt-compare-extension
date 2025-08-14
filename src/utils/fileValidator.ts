import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class D2FileValidator {
    private d2Schema: D2FileSchema = {};

    constructor() {
        this.initializeSchema();
    }

    async validateFile(uri: vscode.Uri): Promise<ValidationResult> {
        const fileName = path.basename(uri.fsPath, '.txt').toLowerCase();
        const fileType = this.detectFileType(fileName);
        const content = await fs.promises.readFile(uri.fsPath, 'utf8');
        
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (lines.length === 0) {
            errors.push({
                line: 0,
                column: 0,
                message: 'File is empty',
                severity: 'error'
            });
            return { errors, warnings, isValid: false };
        }

        // Validate header
        const header = lines[0].split('\t');
        const schema = fileType ? this.d2Schema[fileType] : null;
        
        if (schema) {
            this.validateHeader(header, schema, errors, warnings);
            this.validateDataRows(lines.slice(1), header, schema, errors, warnings);
        } else {
            warnings.push({
                line: 0,
                column: 0,
                message: `No validation schema found for ${fileName}.txt`,
                severity: 'warning'
            });
        }

        // Generic TXT file validation
        this.validateTxtStructure(lines, errors, warnings);

        return {
            errors,
            warnings,
            isValid: errors.length === 0
        };
    }

    private detectFileType(fileName: string): string | null {
    const name = fileName.toLowerCase();

    // Direct matches for common D2 files
    if (name.includes('armor') || name === 'armor') { return 'armor'; }
    if (name.includes('weapon') || name === 'weapons') { return 'weapons'; }
    if (name.includes('skill') || name === 'skills') { return 'skills'; }

    // Additional D2 file types based on common modding files
    if (name.includes('missile') || name === 'missiles') { return 'missiles'; }
    if (name.includes('item') || name === 'itemtypes') { return 'itemtypes'; }
    if (name.includes('rune') || name === 'runes') { return 'runes'; }
    if (name.includes('gem') || name === 'gems') { return 'gems'; }
    if (name.includes('cube') || name === 'cubemain') { return 'cubemain'; }
    if (name.includes('unique') || name === 'uniqueitems') { return 'uniqueitems'; }
    if (name.includes('set') || name === 'setitems') { return 'setitems'; }
    if (name.includes('magicprefix')) { return 'magicprefix'; }
    if (name.includes('magicsuffix')) { return 'magicsuffix'; }
    if (name.includes('level') || name === 'levels') { return 'levels'; }
    if (name.includes('monster') || name === 'monstats') { return 'monstats'; }
    if (name.includes('treasure') || name === 'treasureclass') { return 'treasureclass'; }
    if (name.includes('automap') || name === 'automap') { return 'automap'; }

    return null;
    }

    private validateHeader(header: string[], schema: FileSchema, errors: ValidationError[], warnings: ValidationWarning[]): void {
        const requiredColumns = schema.requiredColumns || [];
        
        for (const required of requiredColumns) {
            if (!header.includes(required)) {
                errors.push({
                    line: 1,
                    column: 0,
                    message: `Required column '${required}' is missing`,
                    severity: 'error'
                });
            }
        }

        // Check for unknown columns
        const knownColumns = schema.columns || {};
        for (let i = 0; i < header.length; i++) {
            const columnName = header[i];
            if (!knownColumns[columnName] && schema.strictMode) {
                warnings.push({
                    line: 1,
                    column: i + 1,
                    message: `Unknown column '${columnName}'`,
                    severity: 'warning'
                });
            }
        }
    }

    private validateDataRows(dataRows: string[], header: string[], schema: FileSchema, errors: ValidationError[], warnings: ValidationWarning[]): void {
        const columns = schema.columns || {};

        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            const row = dataRows[rowIndex].split('\t');
            const lineNumber = rowIndex + 2; // +2 because we skip header and arrays are 0-indexed

            // Check column count
            if (row.length !== header.length) {
                errors.push({
                    line: lineNumber,
                    column: 0,
                    message: `Row has ${row.length} columns, expected ${header.length}`,
                    severity: 'error'
                });
                continue;
            }

            // Validate each column
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const columnName = header[colIndex];
                const cellValue = row[colIndex];
                const columnSchema = columns[columnName];

                if (columnSchema) {
                    this.validateCell(cellValue, columnSchema, lineNumber, colIndex + 1, columnName, errors, warnings);
                }
            }
        }
    }

    private validateCell(value: string, columnSchema: ColumnSchema, line: number, column: number, columnName: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
        // Empty value validation
        if (!value.trim() && columnSchema.required) {
            errors.push({
                line,
                column,
                message: `Required column '${columnName}' cannot be empty`,
                severity: 'error'
            });
            return;
        }

        // Type validation
        switch (columnSchema.type) {
            case 'number':
                if (value.trim() && isNaN(Number(value))) {
                    errors.push({
                        line,
                        column,
                        message: `'${value}' is not a valid number for column '${columnName}'`,
                        severity: 'error'
                    });
                }
                break;

            case 'boolean':
                const boolValues = ['0', '1', 'true', 'false', 'TRUE', 'FALSE', ''];
                if (value.trim() && !boolValues.includes(value)) {
                    errors.push({
                        line,
                        column,
                        message: `'${value}' is not a valid boolean for column '${columnName}'`,
                        severity: 'error'
                    });
                }
                break;

            case 'string':
                if (columnSchema.maxLength && value.length > columnSchema.maxLength) {
                    warnings.push({
                        line,
                        column,
                        message: `Value '${value}' exceeds maximum length of ${columnSchema.maxLength} for column '${columnName}'`,
                        severity: 'warning'
                    });
                }
                break;
        }

        // Range validation for numbers
        if (columnSchema.type === 'number' && value.trim() && !isNaN(Number(value))) {
            const numValue = Number(value);
            if (columnSchema.min !== undefined && numValue < columnSchema.min) {
                warnings.push({
                    line,
                    column,
                    message: `Value ${numValue} is below minimum ${columnSchema.min} for column '${columnName}'`,
                    severity: 'warning'
                });
            }
            if (columnSchema.max !== undefined && numValue > columnSchema.max) {
                warnings.push({
                    line,
                    column,
                    message: `Value ${numValue} exceeds maximum ${columnSchema.max} for column '${columnName}'`,
                    severity: 'warning'
                });
            }
        }
    }

    private validateTxtStructure(lines: string[], errors: ValidationError[], warnings: ValidationWarning[]): void {
        // Check for inconsistent tab usage
        const firstRowTabCount = (lines[0].match(/\t/g) || []).length;
        
        for (let i = 1; i < lines.length; i++) {
            const currentTabCount = (lines[i].match(/\t/g) || []).length;
            if (currentTabCount !== firstRowTabCount) {
                warnings.push({
                    line: i + 1,
                    column: 0,
                    message: `Inconsistent column count: expected ${firstRowTabCount + 1} columns, found ${currentTabCount + 1}`,
                    severity: 'warning'
                });
            }
        }
    }

    showValidationResult(result: ValidationResult): void {
        const { errors, warnings } = result;
        
        if (errors.length === 0 && warnings.length === 0) {
            vscode.window.showInformationMessage('File validation passed with no issues!');
            return;
        }

        let message = '';
        if (errors.length > 0) {
            message += `${errors.length} error(s)`;
        }
        if (warnings.length > 0) {
            if (message) { message += ', '; }
            message += `${warnings.length} warning(s)`;
        }
        message += ' found in file validation.';

        if (errors.length > 0) {
            vscode.window.showErrorMessage(message, 'Show Details').then(selection => {
                if (selection === 'Show Details') {
                    this.showDetailedResults(result);
                }
            });
        } else {
            vscode.window.showWarningMessage(message, 'Show Details').then(selection => {
                if (selection === 'Show Details') {
                    this.showDetailedResults(result);
                }
            });
        }
    }

    private showDetailedResults(result: ValidationResult): void {
        const { errors, warnings } = result;
        let content = '# File Validation Results\n\n';

        if (errors.length > 0) {
            content += '## Errors\n';
            errors.forEach(error => {
                content += `- **Line ${error.line}, Column ${error.column}**: ${error.message}\n`;
            });
            content += '\n';
        }

        if (warnings.length > 0) {
            content += '## Warnings\n';
            warnings.forEach(warning => {
                content += `- **Line ${warning.line}, Column ${warning.column}**: ${warning.message}\n`;
            });
        }

        vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        }).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

    private initializeSchema(): void {
        // Expanded schemas for all major D2 TXT files
        this.d2Schema = {
            // ...existing armor, weapons, skills schemas...
            'armor': { /* ...existing code... */ },
            'weapons': { /* ...existing code... */ },
            'skills': { /* ...existing code... */ },

            'itemtypes': {
                requiredColumns: ['Code', 'Equiv1', 'Equiv2', 'Body', 'BodyLoc', 'Type', 'Type2'],
                columns: {
                    'Code': { type: 'string', required: true },
                    'Equiv1': { type: 'string' },
                    'Equiv2': { type: 'string' },
                    'Body': { type: 'string' },
                    'BodyLoc': { type: 'string' },
                    'Type': { type: 'string' },
                    'Type2': { type: 'string' },
                    'Shoots': { type: 'string' },
                    'Quiver': { type: 'string' },
                    'Throwable': { type: 'number', min: 0, max: 1 },
                    'Reload': { type: 'number', min: 0, max: 1 },
                    'ReEquip': { type: 'number', min: 0, max: 1 },
                    'AutoStack': { type: 'number', min: 0, max: 1 }
                },
                strictMode: false
            },
            'automap': {
                requiredColumns: ['LevelName', 'TileName', 'Style', 'StartSequence', 'EndSequence', '*Type1', 'Cel1', '*Type2', 'Cel2', '*Type3', 'Cel3', '*Type4', 'Cel4'],
                columns: {
                    'LevelName': { type: 'string', required: true },
                    'TileName': { type: 'string', required: true },
                    'Style': { type: 'number' },
                    'StartSequence': { type: 'number' },
                    'EndSequence': { type: 'number' },
                    '*Type1': { type: 'string' },
                    'Cel1': { type: 'number' },
                    '*Type2': { type: 'string' },
                    'Cel2': { type: 'number' },
                    '*Type3': { type: 'string' },
                    'Cel3': { type: 'number' },
                    '*Type4': { type: 'string' },
                    'Cel4': { type: 'number' }
                },
                strictMode: false
            },
            'runes': {
                requiredColumns: ['RuneName', 'RuneCode', 'RuneOrder'],
                columns: {
                    'RuneName': { type: 'string', required: true },
                    'RuneCode': { type: 'string', required: true },
                    'RuneOrder': { type: 'number', required: true },
                    'RuneT1': { type: 'string' },
                    'RuneT2': { type: 'string' },
                    'RuneT3': { type: 'string' }
                },
                strictMode: false
            },
            'gems': {
                requiredColumns: ['GemName', 'GemCode', 'GemType'],
                columns: {
                    'GemName': { type: 'string', required: true },
                    'GemCode': { type: 'string', required: true },
                    'GemType': { type: 'string', required: true },
                    'GemT1': { type: 'string' },
                    'GemT2': { type: 'string' },
                    'GemT3': { type: 'string' }
                },
                strictMode: false
            },
            'cubemain': {
                requiredColumns: ['description', 'enabled', 'op', 'param', 'value', 'class', 'numinputs'],
                columns: {
                    'description': { type: 'string' },
                    'enabled': { type: 'number', min: 0, max: 1 },
                    'op': { type: 'number' },
                    'param': { type: 'string' },
                    'value': { type: 'string' },
                    'class': { type: 'string' },
                    'numinputs': { type: 'number' },
                    'input 1': { type: 'string' },
                    'input 2': { type: 'string' },
                    'input 3': { type: 'string' },
                    'output': { type: 'string' }
                },
                strictMode: false
            },
            'uniqueitems': {
                requiredColumns: ['index', 'version', 'enabled', 'rarity', 'lvl', 'lvlreq', 'code'],
                columns: {
                    'index': { type: 'string', required: true },
                    'version': { type: 'number' },
                    'enabled': { type: 'number', min: 0, max: 1 },
                    'rarity': { type: 'number' },
                    'lvl': { type: 'number' },
                    'lvlreq': { type: 'number' },
                    'code': { type: 'string', required: true },
                    'type': { type: 'string' },
                    'costmult': { type: 'number' },
                    'costadd': { type: 'number' }
                },
                strictMode: false
            },
            'setitems': {
                requiredColumns: ['index', 'set', 'item', 'code', 'rarity', 'lvl', 'lvlreq'],
                columns: {
                    'index': { type: 'string', required: true },
                    'set': { type: 'string' },
                    'item': { type: 'string' },
                    'code': { type: 'string', required: true },
                    'rarity': { type: 'number' },
                    'lvl': { type: 'number' },
                    'lvlreq': { type: 'number' }
                },
                strictMode: false
            },
            'magicprefix': {
                requiredColumns: ['Name', 'version', 'spawnable', 'rare', 'level', 'maxlevel'],
                columns: {
                    'Name': { type: 'string', required: true },
                    'version': { type: 'number' },
                    'spawnable': { type: 'number', min: 0, max: 1 },
                    'rare': { type: 'number', min: 0, max: 1 },
                    'level': { type: 'number' },
                    'maxlevel': { type: 'number' }
                },
                strictMode: false
            },
            'magicsuffix': {
                requiredColumns: ['Name', 'version', 'spawnable', 'rare', 'level', 'maxlevel'],
                columns: {
                    'Name': { type: 'string', required: true },
                    'version': { type: 'number' },
                    'spawnable': { type: 'number', min: 0, max: 1 },
                    'rare': { type: 'number', min: 0, max: 1 },
                    'level': { type: 'number' },
                    'maxlevel': { type: 'number' }
                },
                strictMode: false
            },
            'levels': {
                requiredColumns: ['LevelName', 'Id', 'Pal', 'Act', 'Warp', 'Town'],
                columns: {
                    'LevelName': { type: 'string', required: true },
                    'Id': { type: 'number', required: true },
                    'Pal': { type: 'number' },
                    'Act': { type: 'number' },
                    'Warp': { type: 'number', min: 0, max: 1 },
                    'Town': { type: 'number', min: 0, max: 1 }
                },
                strictMode: false
            },
            'monstats': {
                requiredColumns: ['Id', 'Name', 'Class', 'Level', 'MinHP', 'MaxHP'],
                columns: {
                    'Id': { type: 'number', required: true },
                    'Name': { type: 'string', required: true },
                    'Class': { type: 'string' },
                    'Level': { type: 'number' },
                    'MinHP': { type: 'number' },
                    'MaxHP': { type: 'number' }
                },
                strictMode: false
            },
            'treasureclass': {
                requiredColumns: ['TreasureClass', 'group', 'level', 'picks'],
                columns: {
                    'TreasureClass': { type: 'string', required: true },
                    'group': { type: 'number' },
                    'level': { type: 'number' },
                    'picks': { type: 'number' }
                },
                strictMode: false
            },
            'missiles': {
                requiredColumns: ['Id', 'Name', 'Type', 'SubType', 'Range'],
                columns: {
                    'Id': { type: 'number', required: true },
                    'Name': { type: 'string', required: true },
                    'Type': { type: 'string' },
                    'SubType': { type: 'string' },
                    'Range': { type: 'number' }
                },
                strictMode: false
            },
        };
    }
}

export interface ValidationResult {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    isValid: boolean;
}

export interface ValidationError {
    line: number;
    column: number;
    message: string;
    severity: 'error';
}

export interface ValidationWarning {
    line: number;
    column: number;
    message: string;
    severity: 'warning';
}

interface D2FileSchema {
    [fileName: string]: FileSchema;
}

interface FileSchema {
    requiredColumns?: string[];
    columns?: { [columnName: string]: ColumnSchema };
    strictMode?: boolean;
}

interface ColumnSchema {
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    min?: number;
    max?: number;
    maxLength?: number;
}
