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
exports.D2BatchOperationManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fileValidator_1 = require("./fileValidator");
const formatConverter_1 = require("./formatConverter");
const backupManager_1 = require("./backupManager");
class D2BatchOperationManager {
    operations = new Map();
    outputChannel;
    validator;
    converter;
    backupManager;
    constructor(workspaceRoot) {
        this.outputChannel = vscode.window.createOutputChannel('D2 Batch Operations');
        this.validator = new fileValidator_1.D2FileValidator();
        this.converter = new formatConverter_1.D2FormatConverter();
        this.backupManager = new backupManager_1.D2BackupManager(workspaceRoot);
    }
    createBatchValidation(files, options = {}) {
        const operation = {
            id: this.generateId(),
            name: 'Batch Validation',
            description: `Validate ${files.length} D2 files`,
            files,
            operation: 'validate',
            options,
            progress: 0,
            status: 'pending',
            results: []
        };
        this.operations.set(operation.id, operation);
        return operation.id;
    }
    createBatchConversion(files, targetFormat, options = {}) {
        const operation = {
            id: this.generateId(),
            name: 'Batch Format Conversion',
            description: `Convert ${files.length} files to ${targetFormat.toUpperCase()}`,
            files,
            operation: 'convert',
            options: { ...options, targetFormat },
            progress: 0,
            status: 'pending',
            results: []
        };
        this.operations.set(operation.id, operation);
        return operation.id;
    }
    createBatchFormatting(files, options = {}) {
        const operation = {
            id: this.generateId(),
            name: 'Batch File Formatting',
            description: `Format and standardize ${files.length} D2 files`,
            files,
            operation: 'format',
            options,
            progress: 0,
            status: 'pending',
            results: []
        };
        this.operations.set(operation.id, operation);
        return operation.id;
    }
    createBatchBackup(files, description) {
        const operation = {
            id: this.generateId(),
            name: 'Batch Backup',
            description: `Create backups for ${files.length} files`,
            files,
            operation: 'backup',
            options: { description },
            progress: 0,
            status: 'pending',
            results: []
        };
        this.operations.set(operation.id, operation);
        return operation.id;
    }
    async executeBatchOperation(operationId, progressCallback) {
        const operation = this.operations.get(operationId);
        if (!operation) {
            throw new Error(`Operation not found: ${operationId}`);
        }
        operation.status = 'running';
        operation.startTime = new Date();
        operation.results = [];
        this.outputChannel.show();
        this.outputChannel.appendLine(`🚀 Starting ${operation.name}: ${operation.description}`);
        try {
            for (let i = 0; i < operation.files.length; i++) {
                const filePath = operation.files[i];
                const fileName = path.basename(filePath);
                operation.progress = Math.round((i / operation.files.length) * 100);
                progressCallback?.(operation.progress, fileName);
                this.outputChannel.appendLine(`📄 Processing: ${fileName} (${i + 1}/${operation.files.length})`);
                try {
                    const result = await this.processFile(operation, filePath);
                    operation.results.push(result);
                    if (result.status === 'success') {
                        this.outputChannel.appendLine(`  ✅ ${result.message}`);
                    }
                    else {
                        this.outputChannel.appendLine(`  ❌ ${result.message}`);
                    }
                }
                catch (error) {
                    const result = {
                        filePath,
                        status: 'error',
                        message: `Failed to process: ${error}`
                    };
                    operation.results.push(result);
                    this.outputChannel.appendLine(`  💥 ${result.message}`);
                }
            }
            operation.progress = 100;
            operation.status = 'completed';
            operation.endTime = new Date();
            const summary = this.generateOperationSummary(operation);
            this.outputChannel.appendLine(`\n${summary}`);
        }
        catch (error) {
            operation.status = 'failed';
            operation.endTime = new Date();
            this.outputChannel.appendLine(`💥 Batch operation failed: ${error}`);
        }
        return operation;
    }
    async processFile(operation, filePath) {
        switch (operation.operation) {
            case 'validate':
                return await this.validateFile(filePath, operation.options);
            case 'convert':
                return await this.convertFile(filePath, operation.options);
            case 'format':
                return await this.formatFile(filePath, operation.options);
            case 'backup':
                return await this.backupFile(filePath, operation.options);
            default:
                throw new Error(`Unsupported operation: ${operation.operation}`);
        }
    }
    async validateFile(filePath, options) {
        try {
            if (options.createBackups) {
                await this.backupManager.createBackup(filePath, 'Pre-validation backup');
            }
            const uri = vscode.Uri.file(filePath);
            const validationResult = await this.validator.validateFile(uri);
            const errorCount = validationResult.errors.length;
            const warningCount = validationResult.warnings.length;
            if (errorCount === 0 && (warningCount === 0 || !options.includeWarnings)) {
                return {
                    filePath,
                    status: 'success',
                    message: `Validation passed`,
                    details: { errors: validationResult.errors, warnings: validationResult.warnings }
                };
            }
            else {
                return {
                    filePath,
                    status: 'error',
                    message: `Validation failed: ${errorCount} errors, ${warningCount} warnings`,
                    details: { errors: validationResult.errors, warnings: validationResult.warnings, errorCount, warningCount }
                };
            }
        }
        catch (error) {
            return {
                filePath,
                status: 'error',
                message: `Validation error: ${error}`
            };
        }
    }
    async convertFile(filePath, options) {
        try {
            if (options.createBackups) {
                await this.backupManager.createBackup(filePath, 'Pre-conversion backup');
            }
            const outputPath = options.outputDirectory
                ? path.join(options.outputDirectory, path.basename(filePath))
                : filePath;
            // Simple conversion logic - read file and apply basic transformations
            const content = fs.readFileSync(filePath, 'utf-8');
            let convertedContent = content;
            const changes = [];
            if (options.targetFormat === 'd2r') {
                // Legacy to D2R conversion
                if (content.includes('Amazon') || content.includes('Barbarian')) {
                    convertedContent = content.replace(/Amazon/g, 'ama');
                    convertedContent = convertedContent.replace(/Barbarian/g, 'bar');
                    changes.push('Converted class names to D2R format');
                }
            }
            else if (options.targetFormat === 'legacy') {
                // D2R to Legacy conversion
                convertedContent = content.replace(/\bama\b/g, 'Amazon');
                convertedContent = convertedContent.replace(/\bbar\b/g, 'Barbarian');
                changes.push('Converted class names to Legacy format');
            }
            if (options.preserveOriginal && outputPath === filePath) {
                const dir = path.dirname(filePath);
                const name = path.parse(filePath).name;
                const ext = path.parse(filePath).ext;
                const preservedPath = path.join(dir, `${name}_original${ext}`);
                fs.copyFileSync(filePath, preservedPath);
            }
            fs.writeFileSync(outputPath, convertedContent);
            return {
                filePath,
                status: 'success',
                message: `Converted to ${options.targetFormat.toUpperCase()}`,
                details: { outputPath, changes }
            };
        }
        catch (error) {
            return {
                filePath,
                status: 'error',
                message: `Conversion error: ${error}`
            };
        }
    }
    async formatFile(filePath, options) {
        try {
            if (options.createBackups) {
                await this.backupManager.createBackup(filePath, 'Pre-formatting backup');
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            let formattedLines = [...lines];
            if (options.removeEmptyLines) {
                formattedLines = formattedLines.filter(line => line.trim() !== '');
            }
            if (options.standardizeSpacing) {
                formattedLines = formattedLines.map(line => line.split('\t').map(cell => cell.trim()).join('\t'));
            }
            if (options.sortColumns && formattedLines.length > 1) {
                const header = formattedLines[0];
                const dataLines = formattedLines.slice(1);
                const headerCells = header.split('\t');
                // Sort data rows by first column
                dataLines.sort((a, b) => {
                    const aFirst = a.split('\t')[0] || '';
                    const bFirst = b.split('\t')[0] || '';
                    return aFirst.localeCompare(bFirst);
                });
                formattedLines = [header, ...dataLines];
            }
            const formattedContent = formattedLines.join('\n');
            fs.writeFileSync(filePath, formattedContent);
            return {
                filePath,
                status: 'success',
                message: `File formatted successfully`,
                details: {
                    originalLines: lines.length,
                    formattedLines: formattedLines.length
                }
            };
        }
        catch (error) {
            return {
                filePath,
                status: 'error',
                message: `Formatting error: ${error}`
            };
        }
    }
    async backupFile(filePath, options) {
        try {
            const backupInfo = await this.backupManager.createBackup(filePath, options.description);
            return {
                filePath,
                status: 'success',
                message: `Backup created: ${path.basename(backupInfo.backupPath)}`,
                details: { backupInfo }
            };
        }
        catch (error) {
            return {
                filePath,
                status: 'error',
                message: `Backup error: ${error}`
            };
        }
    }
    generateOperationSummary(operation) {
        const duration = operation.endTime && operation.startTime
            ? ((operation.endTime.getTime() - operation.startTime.getTime()) / 1000).toFixed(2)
            : 'unknown';
        const successCount = operation.results.filter(r => r.status === 'success').length;
        const errorCount = operation.results.filter(r => r.status === 'error').length;
        const skippedCount = operation.results.filter(r => r.status === 'skipped').length;
        return `
📊 ${operation.name} Summary:
   Duration: ${duration}s
   Total files: ${operation.files.length}
   ✅ Successful: ${successCount}
   ❌ Failed: ${errorCount}
   ⏭️ Skipped: ${skippedCount}
   Status: ${operation.status}`;
    }
    getOperation(operationId) {
        return this.operations.get(operationId);
    }
    getAllOperations() {
        return Array.from(this.operations.values());
    }
    cancelOperation(operationId) {
        const operation = this.operations.get(operationId);
        if (operation && operation.status === 'running') {
            operation.status = 'cancelled';
            operation.endTime = new Date();
            return true;
        }
        return false;
    }
    clearCompletedOperations() {
        const toRemove = [];
        for (const [id, operation] of this.operations.entries()) {
            if (operation.status === 'completed' || operation.status === 'failed' || operation.status === 'cancelled') {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.operations.delete(id));
        return toRemove.length;
    }
    generateId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.D2BatchOperationManager = D2BatchOperationManager;
//# sourceMappingURL=batchOperationManager.js.map