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
exports.D2BackupManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class D2BackupManager {
    backupsDir;
    backupHistory = new Map();
    outputChannel;
    constructor(workspaceRoot) {
        this.backupsDir = path.join(workspaceRoot, '.d2backups');
        this.outputChannel = vscode.window.createOutputChannel('D2 Backup Manager');
        this.ensureBackupDirectory();
        this.loadBackupHistory();
    }
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupsDir)) {
            fs.mkdirSync(this.backupsDir, { recursive: true });
        }
    }
    generateChecksum(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }
    async createBackup(filePath, description) {
        try {
            const timestamp = new Date();
            const fileName = path.basename(filePath);
            const fileNameWithoutExt = path.parse(fileName).name;
            const fileExt = path.parse(fileName).ext;
            const backupFileName = `${fileNameWithoutExt}_${timestamp.toISOString().replace(/[:.]/g, '-')}${fileExt}`;
            const backupPath = path.join(this.backupsDir, backupFileName);
            // Copy file to backup location
            fs.copyFileSync(filePath, backupPath);
            const stats = fs.statSync(filePath);
            const checksum = this.generateChecksum(filePath);
            const backupInfo = {
                originalPath: filePath,
                backupPath,
                timestamp,
                description: description || `Auto-backup before modification`,
                fileSize: stats.size,
                checksum
            };
            // Add to history
            const fileBackups = this.backupHistory.get(filePath) || [];
            fileBackups.push(backupInfo);
            this.backupHistory.set(filePath, fileBackups);
            this.saveBackupHistory();
            this.outputChannel.appendLine(`✅ Backup created: ${backupFileName}`);
            return backupInfo;
        }
        catch (error) {
            const errorMsg = `Failed to create backup for ${filePath}: ${error}`;
            this.outputChannel.appendLine(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
    }
    async restoreBackup(backupInfo) {
        try {
            if (!fs.existsSync(backupInfo.backupPath)) {
                throw new Error(`Backup file not found: ${backupInfo.backupPath}`);
            }
            // Create backup of current file before restoring
            await this.createBackup(backupInfo.originalPath, 'Auto-backup before restore');
            // Restore the backup
            fs.copyFileSync(backupInfo.backupPath, backupInfo.originalPath);
            this.outputChannel.appendLine(`✅ Restored backup: ${path.basename(backupInfo.backupPath)} → ${path.basename(backupInfo.originalPath)}`);
            // Refresh the file in VS Code
            const document = await vscode.workspace.openTextDocument(backupInfo.originalPath);
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            const errorMsg = `Failed to restore backup: ${error}`;
            this.outputChannel.appendLine(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
    }
    getBackupHistory(filePath) {
        return this.backupHistory.get(filePath) || [];
    }
    getAllBackups() {
        return new Map(this.backupHistory);
    }
    async cleanupOldBackups(daysToKeep = 30) {
        let cleanedCount = 0;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        for (const [filePath, backups] of this.backupHistory.entries()) {
            const validBackups = [];
            for (const backup of backups) {
                if (backup.timestamp > cutoffDate) {
                    validBackups.push(backup);
                }
                else {
                    // Delete old backup file
                    try {
                        if (fs.existsSync(backup.backupPath)) {
                            fs.unlinkSync(backup.backupPath);
                            cleanedCount++;
                        }
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`⚠️ Failed to delete old backup: ${backup.backupPath}`);
                    }
                }
            }
            this.backupHistory.set(filePath, validBackups);
        }
        this.saveBackupHistory();
        this.outputChannel.appendLine(`🧹 Cleaned up ${cleanedCount} old backup files`);
        return cleanedCount;
    }
    async compareWithBackup(filePath, backupInfo) {
        if (!fs.existsSync(backupInfo.backupPath)) {
            throw new Error(`Backup file not found: ${backupInfo.backupPath}`);
        }
        // Open both files for comparison
        const currentDoc = await vscode.workspace.openTextDocument(filePath);
        const backupDoc = await vscode.workspace.openTextDocument(backupInfo.backupPath);
        // Use VS Code's built-in diff viewer
        await vscode.commands.executeCommand('vscode.diff', backupDoc.uri, currentDoc.uri, `${path.basename(filePath)} ← Backup (${backupInfo.timestamp.toLocaleString()})`);
    }
    loadBackupHistory() {
        const historyFile = path.join(this.backupsDir, 'backup-history.json');
        if (fs.existsSync(historyFile)) {
            try {
                const data = fs.readFileSync(historyFile, 'utf-8');
                const parsed = JSON.parse(data);
                for (const [filePath, backups] of Object.entries(parsed)) {
                    const backupInfos = backups.map(b => ({
                        ...b,
                        timestamp: new Date(b.timestamp)
                    }));
                    this.backupHistory.set(filePath, backupInfos);
                }
            }
            catch (error) {
                this.outputChannel.appendLine(`⚠️ Failed to load backup history: ${error}`);
            }
        }
    }
    saveBackupHistory() {
        const historyFile = path.join(this.backupsDir, 'backup-history.json');
        try {
            const data = Object.fromEntries(this.backupHistory);
            fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
        }
        catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to save backup history: ${error}`);
        }
    }
    getBackupStats() {
        let totalBackups = 0;
        let totalSize = 0;
        let oldestBackup;
        let newestBackup;
        for (const backups of this.backupHistory.values()) {
            totalBackups += backups.length;
            for (const backup of backups) {
                totalSize += backup.fileSize;
                if (!oldestBackup || backup.timestamp < oldestBackup) {
                    oldestBackup = backup.timestamp;
                }
                if (!newestBackup || backup.timestamp > newestBackup) {
                    newestBackup = backup.timestamp;
                }
            }
        }
        return {
            totalBackups,
            totalSize,
            oldestBackup,
            newestBackup
        };
    }
}
exports.D2BackupManager = D2BackupManager;
//# sourceMappingURL=backupManager.js.map