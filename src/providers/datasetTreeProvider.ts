import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class DatasetTreeProvider implements vscode.TreeDataProvider<DatasetItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DatasetItem | undefined | null | void> = new vscode.EventEmitter<DatasetItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DatasetItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private datasets: Dataset[] = [];
    private comparisonDataset: Dataset | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadDatasets();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DatasetItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DatasetItem): Thenable<DatasetItem[]> {
        if (!element) {
            // Root level - show datasets
            return Promise.resolve(this.datasets.map(dataset => 
                new DatasetItem(
                    dataset.name,
                    dataset.path,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'dataset'
                )
            ));
        } else if (element.type === 'dataset' || element.type === 'folder') {
            // Dataset or folder level - show folders and TXT files
            return this.getDirectoryContents(element.resourceUri!.fsPath);
        }
        return Promise.resolve([]);
    }

    private async getDirectoryContents(directoryPath: string): Promise<DatasetItem[]> {
        const items: DatasetItem[] = [];
        
        try {
            const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(directoryPath, entry.name);
                
                if (entry.isDirectory()) {
                    // Add folders
                    items.push(new DatasetItem(
                        entry.name,
                        fullPath,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'folder'
                    ));
                } else if (entry.isFile() && entry.name.endsWith('.txt')) {
                    // Add TXT files
                    items.push(new DatasetItem(
                        entry.name,
                        fullPath,
                        vscode.TreeItemCollapsibleState.None,
                        'file'
                    ));
                }
            }
        } catch (error) {
            console.error('Error reading directory:', error);
        }
        
        // Sort: folders first, then files, both alphabetically
        return items.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') { return -1; }
            if (a.type !== 'folder' && b.type === 'folder') { return 1; }
            return a.label.localeCompare(b.label);
        });
    }    async addDataset(uri: vscode.Uri): Promise<void> {
        const datasetName = path.basename(uri.fsPath);
        const dataset: Dataset = {
            name: datasetName,
            path: uri.fsPath,
            type: this.detectDatasetType(uri.fsPath)
        };

        // Check if dataset already exists
        const exists = this.datasets.some(d => d.path === dataset.path);
        if (!exists) {
            this.datasets.push(dataset);
            await this.saveDatasets();
            this.refresh();
        }
    }

    async removeDataset(dataset: Dataset): Promise<void> {
        this.datasets = this.datasets.filter(d => d.path !== dataset.path);
        
        // Clear comparison dataset if it was the one being removed
        if (this.comparisonDataset && this.comparisonDataset.path === dataset.path) {
            this.comparisonDataset = null;
            await this.context.globalState.update('d2ComparisonDataset', null);
        }
        
        await this.saveDatasets();
        this.refresh();
    }

    private detectDatasetType(datasetPath: string): DatasetType {
        // Simple heuristic - can be improved
        if (datasetPath.toLowerCase().includes('d2r') || datasetPath.toLowerCase().includes('resurrected')) {
            return 'D2R';
        } else if (datasetPath.toLowerCase().includes('diablo') || datasetPath.toLowerCase().includes('d2')) {
            return 'Legacy';
        }
        return 'Custom';
    }

    getDatasets(): Dataset[] {
        return this.datasets;
    }

    getComparisonDataset(): Dataset | null {
        return this.comparisonDataset;
    }

    async setComparisonDataset(dataset: Dataset | null): Promise<void> {
        this.comparisonDataset = dataset;
        await this.context.globalState.update('d2ComparisonDataset', dataset);
        this.refresh();
    }

    async selectComparisonDataset(): Promise<void> {
        if (this.datasets.length === 0) {
            vscode.window.showWarningMessage('No datasets available. Please add a dataset first.');
            return;
        }

        const items = [
            { label: '$(close) None', description: 'No comparison dataset', dataset: null },
            ...this.datasets.map(dataset => ({
                label: `$(database) ${dataset.name}`,
                description: dataset.path,
                dataset: dataset
            }))
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a dataset for comparison purposes',
            title: 'CompareTxts Dataset Selection'
        });

        if (selected !== undefined) {
            await this.setComparisonDataset(selected.dataset);
            if (selected.dataset) {
                vscode.window.showInformationMessage(`Comparison dataset set to: ${selected.dataset.name}`);
            } else {
                vscode.window.showInformationMessage('Comparison dataset cleared');
            }
        }
    }

    async findMatchingFileInComparisonDataset(fileName: string): Promise<vscode.Uri | null> {
        if (!this.comparisonDataset) {
            return null;
        }

        const comparisonFilePath = path.join(this.comparisonDataset.path, fileName);
        
        try {
            await fs.promises.access(comparisonFilePath);
            return vscode.Uri.file(comparisonFilePath);
        } catch {
            return null;
        }
    }

    private async loadDatasets(): Promise<void> {
        const saved = this.context.globalState.get<Dataset[]>('d2Datasets', []);
        this.datasets = saved;
        
        // Load comparison dataset
        const savedComparison = this.context.globalState.get<Dataset | null>('d2ComparisonDataset', null);
        this.comparisonDataset = savedComparison;
    }

    private async saveDatasets(): Promise<void> {
        await this.context.globalState.update('d2Datasets', this.datasets);
    }
}

export class DatasetItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly resourcePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'dataset' | 'file' | 'folder'
    ) {
        super(label, collapsibleState);

        this.resourceUri = vscode.Uri.file(resourcePath);
        
        if (type === 'file') {
            this.command = {
                command: 'd2Modding.openTableViewer',
                title: 'Open in Table Viewer',
                arguments: [this]
            };
            this.contextValue = 'd2txtFile';
            this.tooltip = `${label} - Click to open in Table Viewer`;
        } else if (type === 'folder') {
            this.contextValue = 'd2Folder';
            this.tooltip = `Folder: ${label}`;
        } else {
            this.contextValue = 'd2Dataset';
            this.tooltip = `Dataset: ${label}`;
        }

        this.iconPath = this.getIcon();
    }

    private getIcon(): vscode.ThemeIcon {
        if (this.type === 'dataset') {
            return new vscode.ThemeIcon('database');
        } else if (this.type === 'folder') {
            return new vscode.ThemeIcon('folder');
        } else {
            return new vscode.ThemeIcon('table'); // Changed from 'file-text' to 'table' to indicate table viewer
        }
    }
}

export interface Dataset {
    name: string;
    path: string;
    type: DatasetType;
}

export type DatasetType = 'Legacy' | 'D2R' | 'Custom';
