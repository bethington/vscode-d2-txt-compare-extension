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
exports.D2ConfigurationManager = void 0;
const vscode = __importStar(require("vscode"));
class D2ConfigurationManager {
    static instance;
    config;
    configChangeHandlers = [];
    constructor() {
        this.config = this.loadConfiguration();
        this.setupConfigurationWatcher();
    }
    static getInstance() {
        if (!D2ConfigurationManager.instance) {
            D2ConfigurationManager.instance = new D2ConfigurationManager();
        }
        return D2ConfigurationManager.instance;
    }
    getConfiguration() {
        return { ...this.config };
    }
    updateConfiguration(updates) {
        const newConfig = { ...this.config, ...updates };
        this.saveConfiguration(newConfig);
        this.config = newConfig;
        this.notifyConfigurationChange();
    }
    onConfigurationChanged(handler) {
        this.configChangeHandlers.push(handler);
        return new vscode.Disposable(() => {
            const index = this.configChangeHandlers.indexOf(handler);
            if (index > -1) {
                this.configChangeHandlers.splice(index, 1);
            }
        });
    }
    loadConfiguration() {
        const vscodeConfig = vscode.workspace.getConfiguration('d2Modding');
        return {
            autoValidateOnSave: vscodeConfig.get('autoValidateOnSave', true),
            autoBackupBeforeModification: vscodeConfig.get('autoBackupBeforeModification', true),
            maxBackupAge: vscodeConfig.get('maxBackupAge', 30),
            defaultComparisonMode: vscodeConfig.get('defaultComparisonMode', 'enhanced'),
            enableDataVisualization: vscodeConfig.get('enableDataVisualization', true),
            batchOperationTimeout: vscodeConfig.get('batchOperationTimeout', 300000),
            templateDirectory: vscodeConfig.get('templateDirectory', ''),
            showStatusBarInfo: vscodeConfig.get('showStatusBarInfo', true),
            enableAdvancedDiagnostics: vscodeConfig.get('enableAdvancedDiagnostics', true),
            colorTheme: vscodeConfig.get('colorTheme', 'auto')
        };
    }
    saveConfiguration(config) {
        const vscodeConfig = vscode.workspace.getConfiguration('d2Modding');
        Object.entries(config).forEach(([key, value]) => {
            vscodeConfig.update(key, value, vscode.ConfigurationTarget.Global);
        });
    }
    setupConfigurationWatcher() {
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('d2Modding')) {
                this.config = this.loadConfiguration();
                this.notifyConfigurationChange();
            }
        });
    }
    notifyConfigurationChange() {
        this.configChangeHandlers.forEach(handler => {
            try {
                handler(this.config);
            }
            catch (error) {
                console.error('Error in configuration change handler:', error);
            }
        });
    }
    async openConfigurationUI() {
        const items = [
            {
                label: 'Auto-validate on save',
                description: `Currently: ${this.config.autoValidateOnSave ? 'Enabled' : 'Disabled'}`,
                key: 'autoValidateOnSave'
            },
            {
                label: 'Auto-backup before modification',
                description: `Currently: ${this.config.autoBackupBeforeModification ? 'Enabled' : 'Disabled'}`,
                key: 'autoBackupBeforeModification'
            },
            {
                label: 'Maximum backup age (days)',
                description: `Currently: ${this.config.maxBackupAge} days`,
                key: 'maxBackupAge'
            },
            {
                label: 'Default comparison mode',
                description: `Currently: ${this.config.defaultComparisonMode}`,
                key: 'defaultComparisonMode'
            },
            {
                label: 'Enable data visualization',
                description: `Currently: ${this.config.enableDataVisualization ? 'Enabled' : 'Disabled'}`,
                key: 'enableDataVisualization'
            },
            {
                label: 'Show status bar info',
                description: `Currently: ${this.config.showStatusBarInfo ? 'Enabled' : 'Disabled'}`,
                key: 'showStatusBarInfo'
            },
            {
                label: 'Enable advanced diagnostics',
                description: `Currently: ${this.config.enableAdvancedDiagnostics ? 'Enabled' : 'Disabled'}`,
                key: 'enableAdvancedDiagnostics'
            }
        ];
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a setting to configure'
        });
        if (!selected) {
            return;
        }
        await this.configureSpecificSetting(selected.key);
    }
    async configureSpecificSetting(key) {
        const currentValue = this.config[key];
        switch (key) {
            case 'autoValidateOnSave':
            case 'autoBackupBeforeModification':
            case 'enableDataVisualization':
            case 'showStatusBarInfo':
            case 'enableAdvancedDiagnostics':
                const boolChoice = await vscode.window.showQuickPick([
                    { label: 'Enable', value: true },
                    { label: 'Disable', value: false }
                ], {
                    placeHolder: `Current value: ${currentValue ? 'Enabled' : 'Disabled'}`
                });
                if (boolChoice !== undefined) {
                    this.updateConfiguration({ [key]: boolChoice.value });
                }
                break;
            case 'maxBackupAge':
            case 'batchOperationTimeout':
                const numInput = await vscode.window.showInputBox({
                    prompt: `Enter new value for ${key}`,
                    value: currentValue.toString(),
                    validateInput: (value) => {
                        const num = parseInt(value);
                        return isNaN(num) || num <= 0 ? 'Please enter a positive number' : null;
                    }
                });
                if (numInput) {
                    this.updateConfiguration({ [key]: parseInt(numInput) });
                }
                break;
            case 'defaultComparisonMode':
                const modeChoice = await vscode.window.showQuickPick([
                    { label: 'Enhanced (with statistics)', value: 'enhanced' },
                    { label: 'Basic (simple diff)', value: 'basic' }
                ], {
                    placeHolder: `Current mode: ${currentValue}`
                });
                if (modeChoice) {
                    this.updateConfiguration({ [key]: modeChoice.value });
                }
                break;
            case 'colorTheme':
                const themeChoice = await vscode.window.showQuickPick([
                    { label: 'Auto (follow VS Code theme)', value: 'auto' },
                    { label: 'Dark', value: 'dark' },
                    { label: 'Light', value: 'light' }
                ], {
                    placeHolder: `Current theme: ${currentValue}`
                });
                if (themeChoice) {
                    this.updateConfiguration({ [key]: themeChoice.value });
                }
                break;
            case 'templateDirectory':
                const folderUri = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: 'Select Template Directory'
                });
                if (folderUri && folderUri.length > 0) {
                    this.updateConfiguration({ [key]: folderUri[0].fsPath });
                }
                break;
        }
        vscode.window.showInformationMessage(`Configuration updated: ${key}`);
    }
    exportConfiguration() {
        return JSON.stringify(this.config, null, 2);
    }
    async importConfiguration(configJson) {
        try {
            const importedConfig = JSON.parse(configJson);
            // Validate imported configuration
            const validKeys = Object.keys(this.config);
            const invalidKeys = Object.keys(importedConfig).filter(key => !validKeys.includes(key));
            if (invalidKeys.length > 0) {
                vscode.window.showWarningMessage(`Invalid configuration keys found: ${invalidKeys.join(', ')}`);
                return false;
            }
            this.updateConfiguration(importedConfig);
            vscode.window.showInformationMessage('Configuration imported successfully');
            return true;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to import configuration: ${error}`);
            return false;
        }
    }
    resetToDefaults() {
        const defaults = {
            autoValidateOnSave: true,
            autoBackupBeforeModification: true,
            maxBackupAge: 30,
            defaultComparisonMode: 'enhanced',
            enableDataVisualization: true,
            batchOperationTimeout: 300000,
            templateDirectory: '',
            showStatusBarInfo: true,
            enableAdvancedDiagnostics: true,
            colorTheme: 'auto'
        };
        this.updateConfiguration(defaults);
        vscode.window.showInformationMessage('Configuration reset to defaults');
    }
}
exports.D2ConfigurationManager = D2ConfigurationManager;
//# sourceMappingURL=configurationManager.js.map