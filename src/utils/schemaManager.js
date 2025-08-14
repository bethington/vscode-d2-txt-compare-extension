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
exports.D2KnowledgeBase = exports.D2SchemaManager = void 0;
const vscode = __importStar(require("vscode"));
class D2SchemaManager {
    schemas = new Map();
    knowledgeBase;
    constructor() {
        this.knowledgeBase = new D2KnowledgeBase();
        this.initializeSchemas();
    }
    getSchema(fileName) {
        const baseName = fileName.toLowerCase().replace('.txt', '');
        return this.schemas.get(baseName);
    }
    validateField(fileName, columnName, value, row) {
        const schema = this.getSchema(fileName);
        if (!schema) {
            return { valid: true, warnings: [], errors: [] };
        }
        const column = schema.columns[columnName];
        if (!column) {
            return { valid: true, warnings: [`Unknown column: ${columnName}`], errors: [] };
        }
        const errors = [];
        const warnings = [];
        // Basic type validation
        if (!this.validateType(value, column.type)) {
            errors.push(`Invalid ${column.type} value: "${value}"`);
        }
        // Range validation
        if (column.type === 'number' && value.trim() && !isNaN(Number(value))) {
            const numValue = Number(value);
            if (column.min !== undefined && numValue < column.min) {
                warnings.push(`Value ${numValue} is below recommended minimum ${column.min}`);
            }
            if (column.max !== undefined && numValue > column.max) {
                warnings.push(`Value ${numValue} exceeds recommended maximum ${column.max}`);
            }
        }
        // Business logic validation
        if (column.validator) {
            const customResult = column.validator(value, row, this.knowledgeBase);
            errors.push(...customResult.errors);
            warnings.push(...customResult.warnings);
        }
        // Cross-reference validation
        if (column.references) {
            const refResult = this.validateReference(value, column.references);
            if (!refResult.valid) {
                warnings.push(`Reference "${value}" may not exist in ${column.references.file}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    validateType(value, type) {
        if (!value.trim()) {
            return true;
        } // Empty values handled separately
        switch (type) {
            case 'number':
                return !isNaN(Number(value));
            case 'boolean':
                return ['0', '1', 'true', 'false', 'TRUE', 'FALSE'].includes(value);
            case 'string':
                return true;
            case 'color':
                return /^\\d+$/.test(value) || /^[a-fA-F0-9]{6}$/.test(value);
            default:
                return true;
        }
    }
    validateReference(value, reference) {
        // This would check against loaded datasets
        // For now, we'll implement basic validation
        return { valid: value.trim().length > 0 };
    }
    getColumnDescription(fileName, columnName) {
        const schema = this.getSchema(fileName);
        return schema?.columns[columnName]?.description;
    }
    getColumnSuggestions(fileName, columnName, currentValue) {
        const schema = this.getSchema(fileName);
        const column = schema?.columns[columnName];
        if (!column || !column.suggestions) {
            return [];
        }
        if (typeof column.suggestions === 'function') {
            return column.suggestions(currentValue, this.knowledgeBase);
        }
        return column.suggestions.filter(s => s.toLowerCase().includes(currentValue.toLowerCase()));
    }
    initializeSchemas() {
        // Armor.txt schema
        this.schemas.set('armor', {
            description: 'Defines armor items in Diablo 2',
            columns: {
                'name': {
                    type: 'string',
                    required: true,
                    description: 'Internal name of the armor item',
                    maxLength: 32
                },
                'type': {
                    type: 'string',
                    required: true,
                    description: 'Armor type code',
                    suggestions: ['helm', 'tors', 'boot', 'glov', 'belt', 'shld']
                },
                'minac': {
                    type: 'number',
                    description: 'Minimum armor class',
                    min: 0,
                    max: 1000
                },
                'maxac': {
                    type: 'number',
                    description: 'Maximum armor class',
                    min: 0,
                    max: 1000,
                    validator: (value, row) => {
                        const errors = [];
                        const warnings = [];
                        if (row && row.minac && Number(value) < Number(row.minac)) {
                            errors.push('Maximum AC cannot be less than minimum AC');
                        }
                        return { errors, warnings };
                    }
                },
                'durability': {
                    type: 'number',
                    description: 'Item durability',
                    min: 1,
                    max: 255
                },
                'levelreq': {
                    type: 'number',
                    description: 'Required character level',
                    min: 1,
                    max: 99
                },
                'strreq': {
                    type: 'number',
                    description: 'Required strength',
                    min: 0,
                    max: 500
                },
                'dexreq': {
                    type: 'number',
                    description: 'Required dexterity',
                    min: 0,
                    max: 500
                }
            }
        });
        // Weapons.txt schema
        this.schemas.set('weapons', {
            description: 'Defines weapon items in Diablo 2',
            columns: {
                'name': {
                    type: 'string',
                    required: true,
                    description: 'Internal name of the weapon',
                    maxLength: 32
                },
                'type': {
                    type: 'string',
                    required: true,
                    description: 'Weapon type code',
                    suggestions: ['swor', 'axe', 'mace', 'bow', 'xbow', 'spea', 'pole', 'thro', 'jave', 'orb', 'wand', 'staf']
                },
                'mindam': {
                    type: 'number',
                    description: 'Minimum damage',
                    min: 0,
                    max: 9999
                },
                'maxdam': {
                    type: 'number',
                    description: 'Maximum damage',
                    min: 0,
                    max: 9999,
                    validator: (value, row) => {
                        const errors = [];
                        const warnings = [];
                        if (row && row.mindam && Number(value) < Number(row.mindam)) {
                            errors.push('Maximum damage cannot be less than minimum damage');
                        }
                        return { errors, warnings };
                    }
                },
                'speed': {
                    type: 'number',
                    description: 'Attack speed modifier',
                    min: -60,
                    max: 20
                },
                'levelreq': {
                    type: 'number',
                    description: 'Required character level',
                    min: 1,
                    max: 99
                },
                'strreq': {
                    type: 'number',
                    description: 'Required strength',
                    min: 0,
                    max: 500
                },
                'dexreq': {
                    type: 'number',
                    description: 'Required dexterity',
                    min: 0,
                    max: 500
                }
            }
        });
        // Skills.txt schema
        this.schemas.set('skills', {
            description: 'Defines character skills in Diablo 2',
            columns: {
                'skill': {
                    type: 'string',
                    required: true,
                    description: 'Internal skill name'
                },
                'charclass': {
                    type: 'string',
                    required: true,
                    description: 'Character class',
                    suggestions: ['ama', 'sor', 'nec', 'pal', 'bar', 'dru', 'ass']
                },
                'skilldesc': {
                    type: 'string',
                    description: 'Skill description string reference'
                },
                'srvmissile': {
                    type: 'string',
                    description: 'Server-side missile reference',
                    references: {
                        file: 'missiles.txt',
                        column: 'missile'
                    }
                },
                'cltmissile': {
                    type: 'string',
                    description: 'Client-side missile reference',
                    references: {
                        file: 'missiles.txt',
                        column: 'missile'
                    }
                },
                'mana': {
                    type: 'number',
                    description: 'Base mana cost',
                    min: 0,
                    max: 255
                },
                'lvlmana': {
                    type: 'number',
                    description: 'Mana cost per level',
                    min: 0,
                    max: 50
                }
            }
        });
        // Monsters.txt schema
        this.schemas.set('monstats', {
            description: 'Defines monster statistics in Diablo 2',
            columns: {
                'id': {
                    type: 'string',
                    required: true,
                    description: 'Internal monster ID'
                },
                'hcidx': {
                    type: 'number',
                    description: 'Monster class index',
                    min: 0
                },
                'baseid': {
                    type: 'string',
                    description: 'Base monster type'
                },
                'nextinclass': {
                    type: 'string',
                    description: 'Next monster in class progression'
                },
                'level': {
                    type: 'number',
                    description: 'Monster level',
                    min: 1,
                    max: 99
                },
                'minlevel': {
                    type: 'number',
                    description: 'Minimum spawn level',
                    min: 1,
                    max: 99
                },
                'maxlevel': {
                    type: 'number',
                    description: 'Maximum spawn level',
                    min: 1,
                    max: 99
                },
                'hp': {
                    type: 'number',
                    description: 'Hit points',
                    min: 1,
                    max: 999999
                }
            }
        });
        // Add more schemas as needed
        this.initializeAdvancedSchemas();
    }
    initializeAdvancedSchemas() {
        // ItemTypes.txt schema
        this.schemas.set('itemtypes', {
            description: 'Defines item type categories and properties',
            columns: {
                'itemtype': {
                    type: 'string',
                    required: true,
                    description: 'Item type code'
                },
                'code': {
                    type: 'string',
                    required: true,
                    description: 'Four-character item code',
                    maxLength: 4
                },
                'equiv1': {
                    type: 'string',
                    description: 'First equivalent item type'
                },
                'equiv2': {
                    type: 'string',
                    description: 'Second equivalent item type'
                },
                'repair': {
                    type: 'boolean',
                    description: 'Can item be repaired'
                },
                'body': {
                    type: 'boolean',
                    description: 'Can item be worn on body'
                },
                'throwable': {
                    type: 'boolean',
                    description: 'Is item throwable'
                },
                'reload': {
                    type: 'boolean',
                    description: 'Does item require ammo reload'
                },
                'typeamazon': {
                    type: 'boolean',
                    description: 'Can Amazon class use this item type'
                },
                'typesorceress': {
                    type: 'boolean',
                    description: 'Can Sorceress class use this item type'
                }
            }
        });
        // Levels.txt schema
        this.schemas.set('levels', {
            description: 'Defines area and level properties',
            columns: {
                'name': {
                    type: 'string',
                    required: true,
                    description: 'Internal level name'
                },
                'id': {
                    type: 'number',
                    required: true,
                    description: 'Unique level ID',
                    min: 0
                },
                'pal': {
                    type: 'number',
                    description: 'Palette index',
                    min: 0,
                    max: 255
                },
                'act': {
                    type: 'number',
                    description: 'Act number',
                    min: 1,
                    max: 5
                },
                'layer': {
                    type: 'number',
                    description: 'Layer index',
                    min: 0
                },
                'sizelx': {
                    type: 'number',
                    description: 'Level size X coordinate',
                    min: 1,
                    max: 2048
                },
                'sizely': {
                    type: 'number',
                    description: 'Level size Y coordinate',
                    min: 1,
                    max: 2048
                },
                'offsetx': {
                    type: 'number',
                    description: 'Level offset X',
                    min: 0
                },
                'offsety': {
                    type: 'number',
                    description: 'Level offset Y',
                    min: 0
                },
                'depend': {
                    type: 'number',
                    description: 'Dependency level ID',
                    min: 0
                },
                'teleport': {
                    type: 'boolean',
                    description: 'Can teleport in this area'
                },
                'rain': {
                    type: 'boolean',
                    description: 'Does area have rain effect'
                },
                'mud': {
                    type: 'boolean',
                    description: 'Does area have mud effect'
                },
                'noper': {
                    type: 'boolean',
                    description: 'No persistent corpses'
                },
                'lospentalty': {
                    type: 'boolean',
                    description: 'Line of sight penalty active'
                },
                'floorfilter': {
                    type: 'boolean',
                    description: 'Floor filter active'
                },
                'blankscreen': {
                    type: 'boolean',
                    description: 'Blank screen on entry'
                },
                'dropshadow': {
                    type: 'boolean',
                    description: 'Drop shadow enabled'
                }
            }
        });
    }
    generateCompletionItems(fileName, position, lineText) {
        const schema = this.getSchema(fileName);
        if (!schema) {
            return [];
        }
        const items = [];
        // If we're on the header line, suggest column names
        if (position.line === 0) {
            for (const [columnName, column] of Object.entries(schema.columns)) {
                const item = new vscode.CompletionItem(columnName, vscode.CompletionItemKind.Field);
                item.detail = column.description;
                item.documentation = this.generateColumnDocumentation(column);
                items.push(item);
            }
        }
        else {
            // For data lines, provide context-aware suggestions
            const columns = lineText.split('\\t');
            const currentColumn = columns.length - 1;
            const headerColumns = Object.keys(schema.columns);
            if (currentColumn < headerColumns.length) {
                const columnName = headerColumns[currentColumn];
                const suggestions = this.getColumnSuggestions(fileName, columnName, columns[currentColumn] || '');
                for (const suggestion of suggestions) {
                    const item = new vscode.CompletionItem(suggestion, vscode.CompletionItemKind.Value);
                    item.detail = `Suggested value for ${columnName}`;
                    items.push(item);
                }
            }
        }
        return items;
    }
    generateColumnDocumentation(column) {
        const doc = new vscode.MarkdownString();
        doc.appendMarkdown(`**Type:** ${column.type}\\n\\n`);
        if (column.description) {
            doc.appendMarkdown(`${column.description}\\n\\n`);
        }
        if (column.min !== undefined || column.max !== undefined) {
            doc.appendMarkdown(`**Range:** ${column.min || 'any'} - ${column.max || 'any'}\\n\\n`);
        }
        if (column.required) {
            doc.appendMarkdown(`⚠️ **Required field**\\n\\n`);
        }
        if (column.references) {
            doc.appendMarkdown(`🔗 **References:** ${column.references.file}:${column.references.column}\\n\\n`);
        }
        return doc;
    }
}
exports.D2SchemaManager = D2SchemaManager;
class D2KnowledgeBase {
    // This class would contain D2-specific game knowledge
    getSkillNames() {
        return ['attack', 'kick', 'throw', 'unsummon', 'left hand throw', 'left hand swing'];
    }
    getCharacterClasses() {
        return ['ama', 'sor', 'nec', 'pal', 'bar', 'dru', 'ass'];
    }
    getItemTypeCodes() {
        return ['helm', 'tors', 'boot', 'glov', 'belt', 'shld', 'swor', 'axe', 'mace'];
    }
    validateSkillReference(skillName) {
        return this.getSkillNames().includes(skillName.toLowerCase());
    }
    getBalanceRecommendations(itemType, level) {
        const recommendations = [];
        if (itemType === 'weapon' && level < 10) {
            recommendations.push({
                field: 'maxdam',
                suggestion: 'Consider damage range 3-15 for early game weapons',
                severity: 'info'
            });
        }
        return recommendations;
    }
}
exports.D2KnowledgeBase = D2KnowledgeBase;
//# sourceMappingURL=schemaManager.js.map