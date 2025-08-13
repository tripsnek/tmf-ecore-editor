# TMF Ecore Editor for VSCode

A visual editor for Eclipse Ecore metamodels built with TypeScript for Visual Studio Code.

## Features

- **Visual Tree Editor**: Hierarchical view of your Ecore model structure
- **Properties Panel**: Edit properties of selected model elements
- **Context Menus**: Right-click to add new elements (classes, attributes, references, etc.)
- **Real-time Synchronization**: Changes are immediately reflected in the underlying .ecore XML
- **Type-safe**: Built with TypeScript using the TMF metamodel implementation

## Project Structure

```
tmf-ecore-editor/
├── src/
│   ├── extension.ts                 # VSCode extension entry point
│   ├── ecoreEditorProvider.ts       # Custom editor provider
│   └── webview/
│       ├── ecoreEditorApp.ts        # Main webview application
│       ├── modelTreeView.ts         # Tree view component
│       ├── propertiesPanel.ts       # Properties editor component
│       └── modelController.ts       # Model manipulation logic
├── media/
│   └── editor.css                   # Editor styles
├── dist/                            # Compiled webview bundle
├── out/                             # Compiled extension
├── package.json                     # Extension manifest
├── tsconfig.json                    # TypeScript configuration
├── webpack.config.js                # Webpack configuration
└── README.md                        # This file
```

## Prerequisites

1. **Node.js** (v14 or higher)
2. **npm** or **yarn**
3. **Visual Studio Code** (v1.74.0 or higher)
4. **@tripsnek/tmf package** installed

## Building the Extension

### 1. Install Dependencies

```bash
npm install
```

### 2. Install the TMF Package

Make sure the `@tripsnek/tmf` package is available. If it's a local package:

```bash
# If you have the TMF package locally
npm install /path/to/tmf-package

# Or link it
npm link /path/to/tmf-package
```

### 3. Compile the Extension

```bash
# Compile once
npm run compile

# Or watch for changes
npm run watch
```

### 4. Copy the TMF Metamodel Implementation

Since the TMF metamodel implementation file (`tmf-metamodel.ts`) contains the actual implementation classes, you need to ensure it's properly integrated with the `@tripsnek/tmf` package or adjust the imports accordingly.

## Running the Extension

### Development Mode

1. Open the project in Visual Studio Code
2. Press `F5` to launch a new Extension Development Host window
3. In the new window, open a folder containing `.ecore` files
4. Open any `.ecore` file to activate the editor

### Installing the Extension

1. Package the extension:
```bash
npm install -g vsce
vsce package
```

2. Install the generated `.vsix` file:
   - In VSCode, go to Extensions view
   - Click on the `...` menu
   - Select "Install from VSIX..."
   - Choose the generated `.vsix` file

## Usage

### Opening Ecore Files

1. Open any `.ecore` file in VSCode
2. The editor will automatically activate and display:
   - **Tree Panel** (left): Shows the model structure
   - **Properties Panel** (right): Shows properties of selected element

### Tree Editor Operations

- **Expand/Collapse**: Click the arrow icons to expand or collapse nodes
- **Select**: Click on any node to select it and view its properties
- **Context Menu**: Right-click on nodes to:
  - Add new elements (Classes, Enums, Packages, Attributes, References, Operations, Parameters)
  - Delete elements

### Properties Editor

- **Edit Properties**: Modify values directly in the input fields
- **References**: Use dropdowns to set references to other model elements
- **Multi-References**: Add/remove multiple references (e.g., super types)
- **Booleans**: Toggle checkboxes for boolean properties

### Toolbar Actions

- **Save**: Save changes to the file
- **Undo/Redo**: (To be implemented) Undo or redo changes
- **Expand All**: Expand all tree nodes
- **Collapse All**: Collapse all tree nodes

## Customization

### Adding New Element Types

To support additional Ecore elements:

1. Update `modelTreeView.ts`:
   - Add new node creation methods
   - Update context menu items

2. Update `propertiesPanel.ts`:
   - Add property descriptors for new element types

3. Update `modelController.ts`:
   - Add factory methods for creating new elements
   - Add update methods for new properties

### Styling

Modify `media/editor.css` to customize the appearance of the editor.

## Known Limitations

1. **Undo/Redo**: Not yet implemented
2. **Cross-References**: Full support for complex cross-references between packages may need additional work
3. **Validation**: No built-in validation of Ecore constraints yet

## Troubleshooting

### Extension Not Activating

- Ensure the file has a `.ecore` extension
- Check the VSCode Developer Console for errors (`Help > Toggle Developer Tools`)

### TMF Package Not Found

- Verify `@tripsnek/tmf` is properly installed
- Check that the package exports the expected classes
- Update import statements if the package structure differs

### Webview Not Loading

- Ensure webpack compilation succeeded: `npm run compile`
- Check that `dist/webview.js` exists
- Verify the CSP settings in the HTML template

## Future Enhancements

- [ ] Full undo/redo support
- [ ] Drag-and-drop in tree view
- [ ] Model validation with error highlighting
- [ ] Code generation from models
- [ ] Search and filter capabilities

## Contributing

Contributions are welcome! Please ensure:
1. Code follows TypeScript best practices
2. New features include appropriate documentation
3. Changes maintain compatibility with the TMF metamodel

## License

[Your License Here]

## Credits

Built using:
- [@tripsnek/tmf](https://github.com/tripsnek/tmf)
- [Visual Studio Code Extension API](https://code.visualstudio.com/api)
- [VSCode Codicons](https://github.com/microsoft/vscode-codicons)