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
exports.D2FileValidator = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class D2FileValidator {
    d2Schema = {};
    constructor() {
        this.initializeSchema();
    }
    async validateFile(uri) {
        const fileName = path.basename(uri.fsPath, '.txt').toLowerCase();
        const content = await fs.promises.readFile(uri.fsPath, 'utf8');
        const lines = content.split('\\n').map(line => line.trim()).filter(line => line.length > 0);
        const errors = [];
        const warnings = [];
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
        const header = lines[0].split('\\t');
        const schema = this.d2Schema[fileName];
        if (schema) {
            this.validateHeader(header, schema, errors, warnings);
            this.validateDataRows(lines.slice(1), header, schema, errors, warnings);
        }
        else {
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
    validateHeader(header, schema, errors, warnings) {
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
    validateDataRows(dataRows, header, schema, errors, warnings) {
        const columns = schema.columns || {};
        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            const row = dataRows[rowIndex].split('\\t');
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
    validateCell(value, columnSchema, line, column, columnName, errors, warnings) {
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
    validateTxtStructure(lines, errors, warnings) {
        // Check for inconsistent tab usage
        const firstRowTabCount = (lines[0].match(/\\t/g) || []).length;
        for (let i = 1; i < lines.length; i++) {
            const currentTabCount = (lines[i].match(/\\t/g) || []).length;
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
    showValidationResult(result) {
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
            if (message) {
                message += ', ';
            }
            message += `${warnings.length} warning(s)`;
        }
        message += ' found in file validation.';
        if (errors.length > 0) {
            vscode.window.showErrorMessage(message, 'Show Details').then(selection => {
                if (selection === 'Show Details') {
                    this.showDetailedResults(result);
                }
            });
        }
        else {
            vscode.window.showWarningMessage(message, 'Show Details').then(selection => {
                if (selection === 'Show Details') {
                    this.showDetailedResults(result);
                }
            });
        }
    }
    showDetailedResults(result) {
        const { errors, warnings } = result;
        let content = '# File Validation Results\\n\\n';
        if (errors.length > 0) {
            content += '## Errors\\n';
            errors.forEach(error => {
                content += `- **Line ${error.line}, Column ${error.column}**: ${error.message}\\n`;
            });
            content += '\\n';
        }
        if (warnings.length > 0) {
            content += '## Warnings\\n';
            warnings.forEach(warning => {
                content += `- **Line ${warning.line}, Column ${warning.column}**: ${warning.message}\\n`;
            });
        }
        vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        }).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }
    initializeSchema() {
        // Initialize basic schemas for common D2 files
        this.d2Schema = {
            'armor': {
                requiredColumns: ['name', 'type'],
                columns: {
                    'name': { type: 'string', required: true, maxLength: 32 },
                    'type': { type: 'string', required: true },
                    'minac': { type: 'number', min: 0 },
                    'maxac': { type: 'number', min: 0 },
                    'durability': { type: 'number', min: 0 },
                    'levelreq': { type: 'number', min: 1, max: 99 },
                    'strreq': { type: 'number', min: 0, max: 500 },
                    'dexreq': { type: 'number', min: 0, max: 500 }
                },
                strictMode: false
            },
            'weapons': {
                requiredColumns: ['name', 'type'],
                columns: {
                    'name': { type: 'string', required: true, maxLength: 32 },
                    'type': { type: 'string', required: true },
                    'mindam': { type: 'number', min: 0 },
                    'maxdam': { type: 'number', min: 0 },
                    'speed': { type: 'number', min: -60, max: 20 },
                    'levelreq': { type: 'number', min: 1, max: 99 },
                    'strreq': { type: 'number', min: 0, max: 500 },
                    'dexreq': { type: 'number', min: 0, max: 500 }
                },
                strictMode: false
            },
            'skills': {
                requiredColumns: ['skill', 'charclass'],
                columns: {
                    'skill': { type: 'string', required: true },
                    'charclass': { type: 'string', required: true },
                    'skilldesc': { type: 'string' },
                    'srvmissile': { type: 'string' },
                    'cltmissile': { type: 'string' },
                    'mana': { type: 'number', min: 0 },
                    'lvlmana': { type: 'number' }
                },
                strictMode: false
            }
        };
    }
}
exports.D2FileValidator = D2FileValidator;
//# sourceMappingURL=fileValidator.js.map