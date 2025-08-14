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
exports.DatasetItem = exports.DatasetTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DatasetTreeProvider {
    context;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    datasets = [];
    constructor(context) {
        this.context = context;
        this.loadDatasets();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show datasets
            return Promise.resolve(this.datasets.map(dataset => new DatasetItem(dataset.name, dataset.path, vscode.TreeItemCollapsibleState.Collapsed, 'dataset')));
        }
        else if (element.type === 'dataset') {
            // Dataset level - show TXT files
            return this.getTxtFiles(element.resourceUri.fsPath);
        }
        return Promise.resolve([]);
    }
    async getTxtFiles(datasetPath) {
        const files = [];
        try {
            const entries = await fs.promises.readdir(datasetPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.txt')) {
                    const filePath = path.join(datasetPath, entry.name);
                    files.push(new DatasetItem(entry.name, filePath, vscode.TreeItemCollapsibleState.None, 'file'));
                }
            }
        }
        catch (error) {
            console.error(`Error reading directory ${datasetPath}:`, error);
        }
        return files.sort((a, b) => a.label.toString().localeCompare(b.label.toString()));
    }
    async addDataset(folderUri) {
        const folderName = path.basename(folderUri.fsPath);
        const dataset = {
            name: folderName,
            path: folderUri.fsPath,
            type: this.detectDatasetType(folderUri.fsPath)
        };
        this.datasets.push(dataset);
        await this.saveDatasets();
        this.refresh();
    }
    detectDatasetType(datasetPath) {
        // Try to detect if this is a legacy D2 or D2R dataset
        const files = fs.readdirSync(datasetPath).filter(f => f.endsWith('.txt'));
        // Check for D2R specific files or columns
        if (files.some(f => f.toLowerCase().includes('d2r') || f.toLowerCase().includes('resurrected'))) {
            return 'D2R';
        }
        // Default to legacy for now
        return 'Legacy';
    }
    getDatasets() {
        return this.datasets;
    }
    async loadDatasets() {
        const savedDatasets = this.context.globalState.get('d2Datasets', []);
        this.datasets = savedDatasets;
    }
    async saveDatasets() {
        await this.context.globalState.update('d2Datasets', this.datasets);
    }
}
exports.DatasetTreeProvider = DatasetTreeProvider;
class DatasetItem extends vscode.TreeItem {
    label;
    resourcePath;
    collapsibleState;
    type;
    constructor(label, resourcePath, collapsibleState, type) {
        super(label, collapsibleState);
        this.label = label;
        this.resourcePath = resourcePath;
        this.collapsibleState = collapsibleState;
        this.type = type;
        this.resourceUri = vscode.Uri.file(resourcePath);
        if (type === 'file') {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [this.resourceUri]
            };
            this.contextValue = 'd2txtFile';
        }
        else {
            this.contextValue = 'd2Dataset';
        }
        this.iconPath = this.getIcon();
    }
    getIcon() {
        if (this.type === 'dataset') {
            return new vscode.ThemeIcon('database');
        }
        else {
            return new vscode.ThemeIcon('file-text');
        }
    }
}
exports.DatasetItem = DatasetItem;
//# sourceMappingURL=datasetTreeProvider.js.map