# vscode# D2 Modder's Comparator

A comprehensive Visual Studio Code extension for Diablo 2 modders to compare, edit, and manage TXT data files. This extension is inspired by the D2Compare tool and reimagined as a native VSCode plugin to empower Diablo 2 modders with powerful tools for editing and comparing tab-delimited .TXT data files.

## Features

### 🗂️ Dataset Management
- **Sidebar Tree View**: Organize and manage multiple D2 datasets (Legacy D2, D2R, custom mods)
- **Auto-Detection**: Automatically detects D2 game installations and data files
- **Quick Setup**: Easy import of vanilla D2 datasets for comparison with mod files

### 🔍 File Comparison
- **Side-by-Side Diff**: Leverage VSCode's built-in diff editor for file comparisons
- **Multi-File Diffs**: Compare entire directories with summary reports
- **Intelligent Highlighting**: Color-coded differences at row, column, and cell level
- **Filter Options**: Ignore whitespace, comments, or specific columns

### ✏️ Advanced Editing
- **Syntax Highlighting**: Custom syntax highlighting for D2 TXT files
- **Auto-Completion**: Smart suggestions based on D2 Data Guide
- **Validation**: Real-time validation with error highlighting and tooltips
- **Cross-File Consistency**: Detect references to non-existent entries

### 🔧 Modding Tools

#### Search and Query
- **Global Search**: Search across all datasets with regex support
- **Smart Filters**: Filter by file type, column, or value ranges
- **Context-Aware Results**: See surrounding context for each match

#### Format Conversion
- **Legacy ↔ D2R**: Convert between Legacy D2 and D2R formats
- **Auto-Detection**: Automatically detect source format
- **Safe Conversion**: Preview changes before applying
- **Column Mapping**: Smart handling of added/removed columns

#### Validation Engine
- **Schema-Based**: Validate against known D2 file structures
- **Type Checking**: Ensure numeric fields contain valid numbers
- **Range Validation**: Check for reasonable value ranges
- **Cross-Reference**: Validate skill/item/monster references

## Getting Started

### Installation
1. Install the extension from the VS Code Marketplace
2. Open a folder containing D2 TXT files
3. The extension will automatically enable D2 Modding features (configurable)

### Quick Start
1. **D2 Modding Features**: Enabled by default - use `Ctrl+Shift+P` → "Toggle D2 Modding" to disable/enable
2. **Add Dataset**: Click the "+" button in the D2 Datasets panel
3. **Compare Files**: Right-click any .txt file → "Compare TXT Files"
4. **Validate Files**: Right-click any .txt file → "Validate TXT File"

## Commands

- `D2 Modding: Toggle D2 Modding` - Toggle D2 modding features on/off
- `D2 Modding: Add Dataset` - Add a new dataset folder
- `D2 Modding: Compare TXT Files` - Compare selected file with another
- `D2 Modding: Open Comparator` - Open the comparison webview
- `D2 Modding: Search Across Datasets` - Global search functionality
- `D2 Modding: Validate TXT File` - Validate current or selected file
- `D2 Modding: Convert Format` - Convert between Legacy and D2R formats

## Configuration

```json
{
    "d2Modding.autoEnable": true,
    "d2Modding.defaultDatasetPath": "C:\Games\Diablo II\data",
    "d2Modding.autoDetectGameInstalls": true,
    "d2Modding.diffSensitivity": "moderate",
    "d2Modding.validateOnSave": true,
    "d2Modding.tableViewer.maxColumnWidth": 200,
    "d2Modding.tableViewer.wrapText": false
}
```

### Configuration Options

- **`d2Modding.autoEnable`** (default: `true`): Automatically enable D2 modding features when the extension loads. Set to `false` to require manual activation via the "Toggle D2 Modding" command.
- **`d2Modding.defaultDatasetPath`**: Default path to D2 game data files
- **`d2Modding.autoDetectGameInstalls`**: Automatically detect D2 and D2R game installations  
- **`d2Modding.diffSensitivity`**: Sensitivity level for file comparisons (strict/moderate/relaxed)
- **`d2Modding.validateOnSave`**: Validate TXT files when saved
- **`d2Modding.tableViewer.maxColumnWidth`** (default: `200`): Maximum width in pixels for table columns (50-500px range)
- **`d2Modding.tableViewer.wrapText`** (default: `false`): Wrap text in table columns when content exceeds maximum column width

## Supported Files

The extension recognizes and provides enhanced support for common D2 data files:

- **Core Files**: Armor.txt, Weapons.txt, Misc.txt
- **Character**: Skills.txt, CharStats.txt, Experience.txt
- **Monsters**: MonStats.txt, MonStats2.txt, MonType.txt
- **Levels**: Levels.txt, LvlMaze.txt, LvlSub.txt
- **Magic**: MagicPrefix.txt, MagicSuffix.txt, Gems.txt
- **And many more...**

## Extension Architecture

```
src/
├── extension.ts              # Main extension entry point
├── providers/
│   └── datasetTreeProvider.ts # Dataset tree view management
├── webviews/
│   └── comparatorWebview.ts   # File comparison interface
└── utils/
    ├── fileValidator.ts       # TXT file validation
    ├── formatConverter.ts     # Legacy/D2R conversion
    └── searchProvider.ts      # Global search functionality
```

## Development

### Prerequisites

- Node.js 18+
- VS Code 1.90.0+
- TypeScript 5.0+

### Building

```bash
npm install
npm run compile     # Compile TypeScript
npm run watch      # Watch for changes
npm run package    # Create VSIX package
```

### Testing
```bash
npm run test       # Run unit tests
npm run test-watch # Watch mode testing
```

### Debugging
1. Open the project in VS Code
2. Press `F5` to launch the Extension Development Host
3. Test the extension in the new VS Code window

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas for Contribution
- Additional file schemas and validation rules
- Support for more D2 file types
- Enhanced format conversion mappings
- Performance optimizations
- UI/UX improvements

## Roadmap

### Near Term (v1.0)
- [x] Basic dataset management
- [x] File comparison and validation
- [x] Format conversion (Legacy ↔ D2R)
- [x] Global search functionality
- [ ] Enhanced schema validation
- [ ] Export functionality

### Future Versions
- [ ] Integration with CascView/MPQ Editor
- [ ] Community schema sharing
- [ ] Advanced merge tools
- [ ] Mod dependency tracking
- [ ] Visual diff enhancements

## Known Issues

- Large datasets (1000+ files) may impact performance
- Some D2R exclusive columns may not have complete validation schemas
- Format conversion is currently basic and may need manual review

## Support

- **Documentation**: [D2R Data Guide](https://d2mods.info/home/viewtopic.php?f=8&t=65492)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Community**: [D2 Modding Discord](https://discord.gg/d2modding)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the original D2Compare tool
- Thanks to the D2 modding community for feedback and testing
- Built on the excellent VS Code extension API-txt-compare-extension README

This is the README for your extension "vscode-d2-txt-compare-extension". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
