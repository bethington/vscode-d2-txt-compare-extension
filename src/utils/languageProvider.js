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
exports.D2LanguageProvider = void 0;
const vscode = __importStar(require("vscode"));
const schemaManager_1 = require("./schemaManager");
class D2LanguageProvider {
    schemaManager;
    constructor() {
        this.schemaManager = new schemaManager_1.D2SchemaManager();
    }
    registerProviders(context) {
        // Register completion provider
        const completionProvider = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'd2txt' }, new D2CompletionProvider(this.schemaManager), '\\t', // Trigger on tab
        '\\n' // Trigger on new line
        );
        // Register hover provider
        const hoverProvider = vscode.languages.registerHoverProvider({ scheme: 'file', language: 'd2txt' }, new D2HoverProvider(this.schemaManager));
        // Register diagnostic provider
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('d2txt');
        const diagnosticProvider = new D2DiagnosticProvider(this.schemaManager, diagnosticCollection);
        // Register document symbol provider
        const symbolProvider = vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: 'd2txt' }, new D2SymbolProvider());
        // Register definition provider
        const definitionProvider = vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'd2txt' }, new D2DefinitionProvider());
        // Register code action provider
        const codeActionProvider = vscode.languages.registerCodeActionsProvider({ scheme: 'file', language: 'd2txt' }, new D2CodeActionProvider(this.schemaManager), {
            providedCodeActionKinds: [
                vscode.CodeActionKind.QuickFix,
                vscode.CodeActionKind.Refactor
            ]
        });
        // Watch for document changes to update diagnostics
        const documentWatcher = vscode.workspace.onDidChangeTextDocument(async (event) => {
            if (event.document.languageId === 'd2txt') {
                await diagnosticProvider.updateDiagnostics(event.document);
            }
        });
        // Watch for document open to update diagnostics
        const documentOpenWatcher = vscode.workspace.onDidOpenTextDocument(async (document) => {
            if (document.languageId === 'd2txt') {
                await diagnosticProvider.updateDiagnostics(document);
            }
        });
        context.subscriptions.push(completionProvider, hoverProvider, diagnosticCollection, symbolProvider, definitionProvider, codeActionProvider, documentWatcher, documentOpenWatcher);
    }
}
exports.D2LanguageProvider = D2LanguageProvider;
class D2CompletionProvider {
    schemaManager;
    constructor(schemaManager) {
        this.schemaManager = schemaManager;
    }
    provideCompletionItems(document, position, token, context) {
        const fileName = this.getFileName(document.uri);
        const lineText = document.lineAt(position).text;
        return this.schemaManager.generateCompletionItems(fileName, position, lineText);
    }
    getFileName(uri) {
        const path = uri.path;
        const lastSlash = path.lastIndexOf('/');
        return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
    }
}
class D2HoverProvider {
    schemaManager;
    constructor(schemaManager) {
        this.schemaManager = schemaManager;
    }
    provideHover(document, position, token) {
        const fileName = this.getFileName(document.uri);
        const line = document.lineAt(position);
        const columnIndex = this.getColumnIndex(line.text, position.character);
        if (position.line === 0) {
            // Header line - show column information
            const columns = line.text.split('\\t');
            if (columnIndex < columns.length) {
                const columnName = columns[columnIndex];
                const description = this.schemaManager.getColumnDescription(fileName, columnName);
                if (description) {
                    const markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`**${columnName}**\\n\\n${description}`);
                    return new vscode.Hover(markdown);
                }
            }
        }
        else {
            // Data line - show value information and validation
            const columns = line.text.split('\\t');
            const headerLine = document.lineAt(0);
            const headerColumns = headerLine.text.split('\\t');
            if (columnIndex < columns.length && columnIndex < headerColumns.length) {
                const columnName = headerColumns[columnIndex];
                const value = columns[columnIndex];
                const validation = this.schemaManager.validateField(fileName, columnName, value);
                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`**${columnName}:** \`${value}\`\\n\\n`);
                const description = this.schemaManager.getColumnDescription(fileName, columnName);
                if (description) {
                    markdown.appendMarkdown(`${description}\\n\\n`);
                }
                if (validation.errors.length > 0) {
                    markdown.appendMarkdown(`❌ **Errors:**\\n`);
                    validation.errors.forEach(error => {
                        markdown.appendMarkdown(`- ${error}\\n`);
                    });
                    markdown.appendMarkdown(`\\n`);
                }
                if (validation.warnings.length > 0) {
                    markdown.appendMarkdown(`⚠️ **Warnings:**\\n`);
                    validation.warnings.forEach(warning => {
                        markdown.appendMarkdown(`- ${warning}\\n`);
                    });
                }
                return new vscode.Hover(markdown);
            }
        }
        return undefined;
    }
    getFileName(uri) {
        const path = uri.path;
        const lastSlash = path.lastIndexOf('/');
        return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
    }
    getColumnIndex(lineText, characterPosition) {
        let currentPos = 0;
        let columnIndex = 0;
        for (let i = 0; i < lineText.length && currentPos < characterPosition; i++) {
            if (lineText[i] === '\\t') {
                columnIndex++;
            }
            currentPos++;
        }
        return columnIndex;
    }
}
class D2DiagnosticProvider {
    schemaManager;
    diagnosticCollection;
    constructor(schemaManager, diagnosticCollection) {
        this.schemaManager = schemaManager;
        this.diagnosticCollection = diagnosticCollection;
    }
    async updateDiagnostics(document) {
        const fileName = this.getFileName(document.uri);
        const diagnostics = [];
        // Validate each line
        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            const lineText = line.text.trim();
            if (!lineText || lineIndex === 0) {
                continue;
            } // Skip empty lines and header
            const columns = lineText.split('\\t');
            const headerLine = document.lineAt(0);
            const headerColumns = headerLine.text.split('\\t');
            // Check column count
            if (columns.length !== headerColumns.length) {
                const diagnostic = new vscode.Diagnostic(line.range, `Expected ${headerColumns.length} columns, found ${columns.length}`, vscode.DiagnosticSeverity.Error);
                diagnostic.source = 'D2 Validator';
                diagnostics.push(diagnostic);
                continue;
            }
            // Validate each cell
            for (let colIndex = 0; colIndex < columns.length; colIndex++) {
                const columnName = headerColumns[colIndex];
                const value = columns[colIndex];
                const validation = this.schemaManager.validateField(fileName, columnName, value);
                if (!validation.valid) {
                    validation.errors.forEach(error => {
                        const startChar = this.getColumnStartPosition(lineText, colIndex);
                        const endChar = startChar + value.length;
                        const diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, startChar, lineIndex, endChar), error, vscode.DiagnosticSeverity.Error);
                        diagnostic.source = 'D2 Validator';
                        diagnostics.push(diagnostic);
                    });
                }
                validation.warnings.forEach(warning => {
                    const startChar = this.getColumnStartPosition(lineText, colIndex);
                    const endChar = startChar + value.length;
                    const diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, startChar, lineIndex, endChar), warning, vscode.DiagnosticSeverity.Warning);
                    diagnostic.source = 'D2 Validator';
                    diagnostics.push(diagnostic);
                });
            }
        }
        this.diagnosticCollection.set(document.uri, diagnostics);
    }
    getFileName(uri) {
        const path = uri.path;
        const lastSlash = path.lastIndexOf('/');
        return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
    }
    getColumnStartPosition(lineText, columnIndex) {
        let position = 0;
        for (let i = 0; i < columnIndex; i++) {
            const tabIndex = lineText.indexOf('\\t', position);
            if (tabIndex === -1) {
                break;
            }
            position = tabIndex + 1;
        }
        return position;
    }
}
class D2SymbolProvider {
    provideDocumentSymbols(document, token) {
        const symbols = [];
        if (document.lineCount === 0) {
            return symbols;
        }
        // Create symbol for header
        const headerLine = document.lineAt(0);
        const headerSymbol = new vscode.DocumentSymbol('Header', 'Column definitions', vscode.SymbolKind.Namespace, headerLine.range, headerLine.range);
        // Add column symbols as children
        const columns = headerLine.text.split('\\t');
        columns.forEach((column, index) => {
            const startChar = this.getColumnStartPosition(headerLine.text, index);
            const endChar = startChar + column.length;
            const range = new vscode.Range(0, startChar, 0, endChar);
            const columnSymbol = new vscode.DocumentSymbol(column, 'Column', vscode.SymbolKind.Field, range, range);
            headerSymbol.children.push(columnSymbol);
        });
        symbols.push(headerSymbol);
        // Create symbols for data rows (first column as identifier)
        for (let i = 1; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const lineText = line.text.trim();
            if (!lineText) {
                continue;
            }
            const columns = lineText.split('\\t');
            if (columns.length > 0 && columns[0]) {
                const rowSymbol = new vscode.DocumentSymbol(columns[0], `Row ${i}`, vscode.SymbolKind.Object, line.range, new vscode.Range(i, 0, i, columns[0].length));
                symbols.push(rowSymbol);
            }
        }
        return symbols;
    }
    getColumnStartPosition(lineText, columnIndex) {
        let position = 0;
        for (let i = 0; i < columnIndex; i++) {
            const tabIndex = lineText.indexOf('\\t', position);
            if (tabIndex === -1) {
                break;
            }
            position = tabIndex + 1;
        }
        return position;
    }
}
class D2DefinitionProvider {
    provideDefinition(document, position, token) {
        // This would provide "Go to Definition" for references
        // For now, return undefined (not implemented)
        return undefined;
    }
}
class D2CodeActionProvider {
    schemaManager;
    constructor(schemaManager) {
        this.schemaManager = schemaManager;
    }
    provideCodeActions(document, range, context, token) {
        const actions = [];
        // Provide quick fixes for diagnostics
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === 'D2 Validator') {
                const quickFix = this.createQuickFix(document, diagnostic, range);
                if (quickFix) {
                    actions.push(quickFix);
                }
            }
        }
        // Provide refactoring actions
        const refactorActions = this.createRefactorActions(document, range);
        actions.push(...refactorActions);
        return actions;
    }
    createQuickFix(document, diagnostic, range) {
        // Create quick fixes based on diagnostic message
        if (diagnostic.message.includes('Expected') && diagnostic.message.includes('columns')) {
            const action = new vscode.CodeAction('Fix column count', vscode.CodeActionKind.QuickFix);
            action.diagnostics = [diagnostic];
            action.edit = new vscode.WorkspaceEdit();
            // This would implement the actual fix
            // For now, just return the action structure
            return action;
        }
        return undefined;
    }
    createRefactorActions(document, range) {
        const actions = [];
        // Add "Sort by column" action
        const sortAction = new vscode.CodeAction('Sort by first column', vscode.CodeActionKind.Refactor);
        sortAction.command = {
            command: 'd2Modding.sortByColumn',
            title: 'Sort by first column',
            arguments: [document.uri, 0]
        };
        actions.push(sortAction);
        // Add "Format as table" action
        const formatAction = new vscode.CodeAction('Format as table', vscode.CodeActionKind.Refactor);
        formatAction.command = {
            command: 'd2Modding.formatAsTable',
            title: 'Format as table',
            arguments: [document.uri]
        };
        actions.push(formatAction);
        return actions;
    }
}
//# sourceMappingURL=languageProvider.js.map