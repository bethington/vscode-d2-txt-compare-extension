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
exports.D2ProjectTemplateManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class D2ProjectTemplateManager {
    templates = new Map();
    outputChannel;
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('D2 Project Templates');
        this.initializeTemplates();
    }
    async createProjectFromTemplate(templateId, targetDirectory) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        this.outputChannel.show();
        this.outputChannel.appendLine(`🎯 Creating project from template: ${template.name}`);
        try {
            // Collect variable values from user
            const variables = await this.collectVariables(template.variables);
            if (!variables) {
                this.outputChannel.appendLine('❌ Project creation cancelled by user');
                return false;
            }
            // Create folder structure
            await this.createFolders(template.folders, targetDirectory, variables);
            // Create files from templates
            await this.createFiles(template.files, targetDirectory, variables);
            this.outputChannel.appendLine(`✅ Project created successfully in: ${targetDirectory}`);
            // Open the new project
            const openFolder = await vscode.window.showInformationMessage('Project created successfully! Would you like to open it?', 'Open Project', 'Stay Here');
            if (openFolder === 'Open Project') {
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetDirectory));
            }
            return true;
        }
        catch (error) {
            this.outputChannel.appendLine(`💥 Failed to create project: ${error}`);
            vscode.window.showErrorMessage(`Failed to create project: ${error}`);
            return false;
        }
    }
    async collectVariables(variables) {
        const values = {};
        for (const variable of variables) {
            let value;
            switch (variable.type) {
                case 'string':
                    value = await vscode.window.showInputBox({
                        prompt: variable.description,
                        value: variable.default?.toString() || '',
                        validateInput: (input) => {
                            if (variable.required && !input.trim()) {
                                return `${variable.displayName} is required`;
                            }
                            return null;
                        }
                    });
                    break;
                case 'number':
                    const numInput = await vscode.window.showInputBox({
                        prompt: variable.description,
                        value: variable.default?.toString() || '0',
                        validateInput: (input) => {
                            if (variable.required && !input.trim()) {
                                return `${variable.displayName} is required`;
                            }
                            if (input.trim() && isNaN(Number(input))) {
                                return `${variable.displayName} must be a number`;
                            }
                            return null;
                        }
                    });
                    value = numInput ? Number(numInput) : variable.default;
                    break;
                case 'boolean':
                    const boolChoice = await vscode.window.showQuickPick([
                        { label: 'Yes', value: true },
                        { label: 'No', value: false }
                    ], { placeHolder: variable.description });
                    value = boolChoice?.value ?? variable.default;
                    break;
                case 'select':
                    const selectChoice = await vscode.window.showQuickPick(variable.options?.map(opt => ({ label: opt, value: opt })) || [], { placeHolder: variable.description });
                    value = selectChoice?.value ?? variable.default;
                    break;
            }
            if (value === undefined && variable.required) {
                return null; // User cancelled
            }
            values[variable.name] = value;
        }
        return values;
    }
    async createFolders(folders, targetDirectory, variables) {
        for (const folder of folders) {
            const resolvedPath = this.resolveVariables(folder, variables);
            const fullPath = path.join(targetDirectory, resolvedPath);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                this.outputChannel.appendLine(`📁 Created folder: ${resolvedPath}`);
            }
        }
    }
    async createFiles(files, targetDirectory, variables) {
        for (const file of files) {
            const resolvedPath = this.resolveVariables(file.path, variables);
            const resolvedContent = this.resolveVariables(file.content, variables);
            const fullPath = path.join(targetDirectory, resolvedPath);
            // Ensure directory exists
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            if (file.binary) {
                // Handle binary files (if needed in the future)
                fs.writeFileSync(fullPath, Buffer.from(resolvedContent, 'base64'));
            }
            else {
                fs.writeFileSync(fullPath, resolvedContent, 'utf-8');
            }
            this.outputChannel.appendLine(`📄 Created file: ${resolvedPath}`);
        }
    }
    resolveVariables(template, variables) {
        let resolved = template;
        for (const [name, value] of Object.entries(variables)) {
            const placeholder = `{{${name}}}`;
            resolved = resolved.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), value?.toString() || '');
        }
        return resolved;
    }
    getTemplates() {
        return Array.from(this.templates.values());
    }
    getTemplatesByCategory(category) {
        return Array.from(this.templates.values()).filter(t => t.category === category);
    }
    initializeTemplates() {
        // Basic D2 Mod Template
        this.templates.set('basic-d2-mod', {
            id: 'basic-d2-mod',
            name: 'Basic D2 Mod',
            description: 'Creates a basic Diablo 2 mod structure with essential files',
            category: 'mod',
            variables: [
                {
                    name: 'modName',
                    displayName: 'Mod Name',
                    description: 'Enter the name of your mod',
                    type: 'string',
                    required: true
                },
                {
                    name: 'modVersion',
                    displayName: 'Mod Version',
                    description: 'Enter the version of your mod',
                    type: 'string',
                    default: '1.0.0'
                },
                {
                    name: 'authorName',
                    displayName: 'Author Name',
                    description: 'Enter your name',
                    type: 'string',
                    required: true
                },
                {
                    name: 'gameVersion',
                    displayName: 'Target Game Version',
                    description: 'Select the target game version',
                    type: 'select',
                    options: ['D2 Legacy (1.14d)', 'D2R (Latest)'],
                    default: 'D2R (Latest)'
                }
            ],
            folders: [
                'data/global/excel',
                'data/global/monsters',
                'data/global/objects',
                'data/global/ui',
                'docs',
                'tools'
            ],
            files: [
                {
                    path: 'ModInfo.md',
                    content: `# {{modName}}

**Version:** {{modVersion}}
**Author:** {{authorName}}
**Target Game:** {{gameVersion}}

## Description

{{modName}} is a Diablo 2 modification that enhances the gameplay experience.

## Installation

1. Copy the mod files to your Diablo 2 directory
2. Run the game with the mod enabled
3. Enjoy the enhanced experience!

## Features

- [ ] New items and equipment
- [ ] Balanced gameplay mechanics
- [ ] Enhanced monster AI
- [ ] Quality of life improvements

## Changelog

### v{{modVersion}}
- Initial release
- Basic mod structure created

## Credits

Created by {{authorName}}
`
                },
                {
                    path: 'data/global/excel/Armor.txt',
                    content: `name	type	minac	maxac	durability	levelreq	strreq	dexreq
Leather Armor	larm	2	3	12	1	0	0
Studded Leather	sarm	3	4	18	1	20	0
Ring Mail	rarm	4	5	26	1	36	0
Scale Mail	scal	6	8	36	1	44	0
Chain Mail	chn	8	11	45	1	48	0
Splint Mail	spl	10	14	30	1	51	0
Plate Mail	plt	13	18	60	1	65	0
Field Plate	fld	15	21	48	1	55	0
Gothic Plate	gth	17	24	50	1	70	0
Full Plate Mail	ful	19	26	70	1	80	0
Ancient Armor	aar	21	28	60	1	100	0`
                },
                {
                    path: 'data/global/excel/Weapons.txt',
                    content: `name	type	mindam	maxdam	speed	levelreq	strreq	dexreq
Hand Axe	hax	3	6	10	1	32	0
Axe	axe	4	11	10	1	43	0
Double Axe	2ax	5	13	5	1	43	0
Military Pick	mpi	7	11	0	1	49	0
War Axe	wax	10	18	0	1	67	0
Large Axe	lax	6	13	10	1	35	0
Broad Axe	bax	10	18	5	1	48	0
Battle Axe	btx	12	32	0	1	54	0
Great Axe	gax	9	30	10	1	63	0
Giant Axe	gix	22	45	10	1	70	0`
                },
                {
                    path: 'tools/validate.bat',
                    content: `@echo off
echo Validating {{modName}} files...
echo.
echo Checking Armor.txt...
if exist "data\\global\\excel\\Armor.txt" (
    echo ✓ Armor.txt found
) else (
    echo ✗ Armor.txt missing
)

echo Checking Weapons.txt...
if exist "data\\global\\excel\\Weapons.txt" (
    echo ✓ Weapons.txt found
) else (
    echo ✗ Weapons.txt missing
)

echo.
echo Validation complete!
pause`
                },
                {
                    path: '.vscode/settings.json',
                    content: `{
    "files.associations": {
        "*.txt": "d2txt"
    },
    "editor.detectIndentation": false,
    "editor.insertSpaces": false,
    "editor.tabSize": 4,
    "files.encoding": "utf8",
    "files.eol": "\\n"
}`
                }
            ]
        });
        // Advanced Class Mod Template
        this.templates.set('class-mod', {
            id: 'class-mod',
            name: 'Class Modification',
            description: 'Template for modifying character classes and skills',
            category: 'mod',
            variables: [
                {
                    name: 'modName',
                    displayName: 'Mod Name',
                    description: 'Enter the name of your class mod',
                    type: 'string',
                    required: true
                },
                {
                    name: 'targetClass',
                    displayName: 'Target Class',
                    description: 'Which class are you modifying?',
                    type: 'select',
                    options: ['Amazon', 'Barbarian', 'Necromancer', 'Paladin', 'Sorceress', 'All Classes'],
                    required: true
                },
                {
                    name: 'authorName',
                    displayName: 'Author Name',
                    description: 'Enter your name',
                    type: 'string',
                    required: true
                }
            ],
            folders: [
                'data/global/excel',
                'data/global/monsters',
                'data/local/lng/eng',
                'docs/skills'
            ],
            files: [
                {
                    path: 'docs/{{targetClass}}_Changes.md',
                    content: `# {{targetClass}} Modifications - {{modName}}

## Overview
This document outlines the changes made to the {{targetClass}} in {{modName}}.

## Skill Changes

### Tier 1 Skills
- Skill 1: Description of changes
- Skill 2: Description of changes

### Tier 2 Skills
- Skill 3: Description of changes
- Skill 4: Description of changes

### Tier 3 Skills
- Skill 5: Description of changes
- Skill 6: Description of changes

## Balance Notes
- Explanation of balance decisions
- Comparison with vanilla gameplay

Created by {{authorName}}
`
                },
                {
                    path: 'data/global/excel/Skills.txt',
                    content: `skill	charclass	skilldesc	srvmissile	cltmissile	mana	lvlmana
Attack	All	Basic melee attack		STD	0	0
Throw	All	Throw equipped weapon		STD	0	0
Unsummon	All	Unsummon minions		STD	0	0
Left Hand Throw	All	Left hand throwing		STD	0	0
Left Hand Swing	All	Left hand swinging		STD	0	0`
                }
            ]
        });
        // Item Pack Template
        this.templates.set('item-pack', {
            id: 'item-pack',
            name: 'Item Pack',
            description: 'Template for creating new items and equipment',
            category: 'mod',
            variables: [
                {
                    name: 'packName',
                    displayName: 'Item Pack Name',
                    description: 'Enter the name of your item pack',
                    type: 'string',
                    required: true
                },
                {
                    name: 'itemType',
                    displayName: 'Primary Item Type',
                    description: 'What type of items are you adding?',
                    type: 'select',
                    options: ['Weapons', 'Armor', 'Accessories', 'Consumables', 'Mixed'],
                    required: true
                },
                {
                    name: 'authorName',
                    displayName: 'Author Name',
                    description: 'Enter your name',
                    type: 'string',
                    required: true
                }
            ],
            folders: [
                'data/global/excel',
                'data/global/items',
                'data/local/lng/eng',
                'docs/items'
            ],
            files: [
                {
                    path: 'docs/items/{{packName}}_Items.md',
                    content: `# {{packName}} - Item Documentation

## Overview
{{packName}} adds new {{itemType}} items to Diablo 2.

## Item List

### New Items Added
1. **Item Name 1**
   - Type: {{itemType}}
   - Level Requirement: X
   - Special Properties: Description

2. **Item Name 2**
   - Type: {{itemType}}
   - Level Requirement: X
   - Special Properties: Description

## Balance Philosophy
Explanation of how these items fit into the game balance.

Created by {{authorName}}
`
                }
            ]
        });
    }
}
exports.D2ProjectTemplateManager = D2ProjectTemplateManager;
//# sourceMappingURL=projectTemplateManager.js.map