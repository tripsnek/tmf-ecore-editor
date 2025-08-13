import { EPackage, EcoreStringParser, EcoreStringWriter} from '@tripsnek/tmf';
import { ModelTreeView } from './modelTreeView';
import { PropertiesPanel } from './propertiesPanel';
import { ModelController } from './modelController';

declare const vscode: any;

/**
 * Main application class for the Ecore Editor
 */
export class EcoreEditorApp {
    private rootPackage: EPackage | null = null;
    private parser: EcoreStringParser;
    private writer: EcoreStringWriter;
    private treeView: ModelTreeView;
    private propertiesPanel: PropertiesPanel;
    private modelController: ModelController;
    private isDirty: boolean = false;
    private fileName: string = 'untitled.ecore';

    constructor() {
        this.parser = new EcoreStringParser();
        this.writer = new EcoreStringWriter();
        
        // Initialize components
        this.modelController = new ModelController();
        this.treeView = new ModelTreeView(this.onTreeSelectionChanged.bind(this));
        this.propertiesPanel = new PropertiesPanel(this.onPropertyChanged.bind(this));
        
        // Connect tree view to properties panel so it can access getAllClasses
        this.propertiesPanel.setTreeView(this.treeView);
        
        // Set up message handling
        this.setupMessageHandling();
        
        // Initialize UI
        this.initializeUI();
        
        // Notify extension that we're ready
        vscode.postMessage({ command: 'ready' });
    }

    private initializeUI(): void {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="ecore-editor">
                <div class="header">
                    <div class="title">
                        <i class="codicon codicon-file"></i>
                        <span id="file-name">${this.fileName}</span>
                        <span id="dirty-indicator" class="dirty-indicator" style="display: none;">●</span>
                    </div>
                    <div class="toolbar">
                        <button id="save-btn" class="toolbar-btn" title="Save">
                            <i class="codicon codicon-save"></i>
                        </button>
                        <button id="undo-btn" class="toolbar-btn" title="Undo">
                            <i class="codicon codicon-discard"></i>
                        </button>
                        <button id="redo-btn" class="toolbar-btn" title="Redo">
                            <i class="codicon codicon-redo"></i>
                        </button>
                        <div class="toolbar-separator"></div>
                        <button id="expand-all-btn" class="toolbar-btn" title="Expand All">
                            <i class="codicon codicon-expand-all"></i>
                        </button>
                        <button id="collapse-all-btn" class="toolbar-btn" title="Collapse All">
                            <i class="codicon codicon-collapse-all"></i>
                        </button>
                    </div>
                </div>
                
                <div class="main-content">
                    <div class="split-panel">
                        <div class="tree-panel">
                            <div class="panel-header">
                                <i class="codicon codicon-list-tree"></i>
                                Model Structure
                            </div>
                            <div id="model-tree" class="tree-container"></div>
                        </div>
                        
                        <div class="splitter" id="splitter"></div>
                        
                        <div class="properties-panel">
                            <div class="panel-header">
                                <i class="codicon codicon-settings"></i>
                                Properties
                            </div>
                            <div id="properties-container" class="properties-container">
                                <div class="empty-state">
                                    <i class="codicon codicon-info"></i>
                                    <p>Select an element to view its properties</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="status-bar">
                    <span id="status-message">Ready</span>
                    <span id="selection-info" class="selection-info"></span>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.setupSplitter();
    }

    private setupEventListeners(): void {
        // Toolbar buttons
        document.getElementById('save-btn')?.addEventListener('click', () => this.save());
        document.getElementById('undo-btn')?.addEventListener('click', () => this.undo());
        document.getElementById('redo-btn')?.addEventListener('click', () => this.redo());
        document.getElementById('expand-all-btn')?.addEventListener('click', () => this.treeView.expandAll());
        document.getElementById('collapse-all-btn')?.addEventListener('click', () => this.treeView.collapseAll());
    }

    private setupSplitter(): void {
        const splitter = document.getElementById('splitter');
        const treePanel = document.querySelector('.tree-panel') as HTMLElement;
        const propertiesPanel = document.querySelector('.properties-panel') as HTMLElement;
        
        if (!splitter || !treePanel || !propertiesPanel) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        splitter.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = treePanel.offsetWidth;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const width = startWidth + e.clientX - startX;
            const minWidth = 200;
            const maxWidth = window.innerWidth - 300;
            
            if (width >= minWidth && width <= maxWidth) {
                treePanel.style.width = width + 'px';
                propertiesPanel.style.width = `calc(100% - ${width}px - 4px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = '';
        });
    }

    private setupMessageHandling(): void {
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'loadModel':
                    this.loadModel(message.content, message.fileName);
                    break;
                case 'externalUpdate':
                    this.handleExternalUpdate(message.content);
                    break;
                case 'error':
                    this.showError(message.message);
                    break;
            }
        });
    }

    private loadModel(jsonContent: string, fileName?: string): void {
        try {
            this.rootPackage = this.parser.parseFromJs(JSON.parse(jsonContent));            
            if (fileName) {
                this.fileName = fileName;
                document.getElementById('file-name')!.textContent = fileName;
            }
            
            // Initialize model controller with the package
            this.modelController.setRootPackage(this.rootPackage);
            
            // Render the tree
            this.treeView.render(this.rootPackage, this.fileName);
            
            // Clear properties panel
            this.propertiesPanel.clear();
            
            this.setStatus('Model loaded successfully');
            this.isDirty = false;
            this.updateDirtyIndicator();
        } catch (error) {
            this.showError(`Failed to load model: ${error}`);
        }
    }

    private handleExternalUpdate(xmlContent: string): void {
        // Reload the model if it was changed externally
        this.loadModel(xmlContent, this.fileName);
    }

    private onTreeSelectionChanged(element: any): void {
        this.propertiesPanel.showProperties(element);
        
        // Update selection info in status bar
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo && element) {
            const type = this.getElementType(element);
            const name = element.getName ? element.getName() : 'unnamed';
            selectionInfo.textContent = `${type}: ${name}`;
        }
    }

    private onPropertyChanged(element: any, property: string, value: any): void {
        try {
            // Handle special cases for type properties
            if (property === 'eType' && value) {
                // For primitive types, we need to handle them specially
                const typeName = value.getName ? value.getName() : '';
                if (['EString', 'EInt', 'EBoolean', 'EDouble', 'EFloat', 'EDate'].includes(typeName)) {
                    // For primitive types, we might need to create a proper reference
                    // This depends on your TMF implementation
                    // For now, we'll just set it directly
                    if (element.setEType) {
                        // You might need to get the actual type from Ecore package
                        // This is a simplified version
                        element.setEType(value);
                    }
                } else {
                    // For class references, set directly
                    if (element.setEType) {
                        element.setEType(value);
                    }
                }
            } else {
                // Update the model using the controller
                this.modelController.updateProperty(element, property, value);
            }
            
            // Mark as dirty
            this.setDirty(true);
            
            // Refresh the tree if name changed
            if (property === 'name' || property === 'eType') {
                this.treeView.updateNodeLabel(element);
            }
            
            // If it's a structural change, refresh the whole tree
            if (property === 'eSuperType' || property === 'eSuperTypes' || property === 'eType' || property === 'eOpposite') {
                this.treeView.refresh();
            }
            
            this.setStatus(`Updated ${property}`);
        } catch (error) {
            this.showError(`Failed to update property: ${error}`);
        }
    }

    private save(): void {
        if (!this.rootPackage) return;
        
        try {
            const xmlContent = this.writer.writeToString(this.rootPackage);
            vscode.postMessage({
                command: 'updateModel',
                content: xmlContent
            });
            
            this.setDirty(false);
            this.setStatus('Model saved');
        } catch (error) {
            this.showError(`Failed to save model: ${error}`);
        }
    }

    private undo(): void {
        // TODO: Implement undo functionality
        this.setStatus('Undo not yet implemented');
    }

    private redo(): void {
        // TODO: Implement redo functionality
        this.setStatus('Redo not yet implemented');
    }

    private setDirty(dirty: boolean): void {
        this.isDirty = dirty;
        this.updateDirtyIndicator();
    }

    private updateDirtyIndicator(): void {
        const indicator = document.getElementById('dirty-indicator');
        if (indicator) {
            indicator.style.display = this.isDirty ? 'inline' : 'none';
        }
    }

    private setStatus(message: string): void {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    private showError(message: string): void {
        this.setStatus(`Error: ${message}`);
        vscode.postMessage({
            command: 'showError',
            text: message
        });
    }

    private getElementType(element: any): string {
        if (!element) return 'Unknown';
        
        const className = element.constructor.name;
        // Remove 'Impl' suffix if present
        return className.replace(/Impl$/, '');
    }
}

// Initialize the app when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new EcoreEditorApp();
    });
} else {
    new EcoreEditorApp();
}