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
    private fileName: string = 'untitled.ecore';
    private isUpdatingFromExternal: boolean = false;

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
                    </div>
                    <div class="toolbar">
                        <button id="generate-btn" class="toolbar-btn toolbar-btn-primary" title="Generate Source Code">
                            <i class="codicon codicon-play"></i>
                            Generate Code
                        </button>
                        <div class="toolbar-separator"></div>
                    </div>
                </div>
                
                <div class="main-content">
                    <div class="split-panel">
                        <div class="tree-panel">
                            <div class="panel-header" style="justify-content: space-between">
                                <div>
                                    <i class="codicon codicon-list-tree"></i>
                                    Model Structure
                                </div>
                                <div class="toolbar">
                                    <button id="expand-all-btn" class="toolbar-btn" title="Expand All">
                                        <i class="codicon codicon-expand-all"></i>
                                    </button>
                                    <button id="collapse-all-btn" class="toolbar-btn" title="Collapse All">
                                        <i class="codicon codicon-collapse-all"></i>
                                    </button>                                
                                </div>
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
                
                <!-- Generation Modal -->
                <div id="generate-modal" class="modal" style="display: none;">
                    <div class="modal-overlay"></div>
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Generate Source Code</h3>
                            <button class="modal-close" id="modal-close-btn">
                                <i class="codicon codicon-close"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="modal-info">
                                <i class="codicon codicon-info"></i>
                                <span>Generate source code from the current Ecore model</span>
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="overwrite-checkbox" />
                                    <span>Overwrite existing implementation files</span>
                                </label>
                                <div class="form-help">
                                    If unchecked, existing implementation files will be preserved
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="output-path">Output Directory (optional)</label>
                                <input 
                                    type="text" 
                                    id="output-path" 
                                    class="form-input" 
                                    placeholder="Leave empty to use same directory as .ecore file"
                                />
                                <div class="form-help">
                                    Specify a custom output directory for generated files
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="cancel-generate-btn">Cancel</button>
                            <button class="btn btn-primary" id="confirm-generate-btn">
                                <i class="codicon codicon-play"></i>
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.setupSplitter();
    }

    private setupEventListeners(): void {
        // Toolbar buttons
        document.getElementById('expand-all-btn')?.addEventListener('click', () => this.treeView.expandAll());
        document.getElementById('collapse-all-btn')?.addEventListener('click', () => this.treeView.collapseAll());
        
        // Setup generation modal
        this.setupGenerationModal();
    }

    private setupGenerationModal(): void {
        const generateBtn = document.getElementById('generate-btn');
        const modal = document.getElementById('generate-modal');
        const closeBtn = document.getElementById('modal-close-btn');
        const cancelBtn = document.getElementById('cancel-generate-btn');
        const confirmBtn = document.getElementById('confirm-generate-btn');
        const modalOverlay = modal?.querySelector('.modal-overlay') as HTMLElement;
        
        if (!generateBtn || !modal) return;
        
        // Show modal
        generateBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            // Reset form
            const overwriteCheckbox = document.getElementById('overwrite-checkbox') as HTMLInputElement;
            const outputPath = document.getElementById('output-path') as HTMLInputElement;
            if (overwriteCheckbox) overwriteCheckbox.checked = false;
            if (outputPath) outputPath.value = '';
        });
        
        // Hide modal
        const hideModal = () => {
            modal.style.display = 'none';
        };
        
        closeBtn?.addEventListener('click', hideModal);
        cancelBtn?.addEventListener('click', hideModal);
        modalOverlay?.addEventListener('click', hideModal);
        
        // Generate code
        confirmBtn?.addEventListener('click', () => {
            const overwriteCheckbox = document.getElementById('overwrite-checkbox') as HTMLInputElement;
            const outputPathInput = document.getElementById('output-path') as HTMLInputElement;
            
            const overwriteImplFiles = overwriteCheckbox?.checked || false;
            const outputPath = outputPathInput?.value.trim() || '';
            
            // Send message to extension
            vscode.postMessage({
                command: 'generateCode',
                overwriteImplFiles,
                outputPath
            });
            
            hideModal();
            this.setStatus('Generating source code...');
        });
        
        // Handle escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                hideModal();
            }
        });
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
                case 'generationComplete':
                    // Handle generation completion
                    if (message.success) {
                        this.setStatus(message.message);
                    } else {
                        this.setStatus(`Error: ${message.message}`);
                    }
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
        } catch (error) {
            this.showError(`Failed to load model: ${error}`);
        }
    }

    private handleExternalUpdate(jsonContent: string): void {
        // Set flag to prevent update loops
        this.isUpdatingFromExternal = true;
        
        // Reload the model if it was changed externally
        this.loadModel(jsonContent, this.fileName);
        
        // Reset flag
        this.isUpdatingFromExternal = false;
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
        // Don't update if we're processing an external update
        if (this.isUpdatingFromExternal) return;
        
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
            
            // Immediately update the document in VSCode
            this.updateDocument();
            
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

    private updateDocument(): void {
        if (!this.rootPackage || this.isUpdatingFromExternal) return;
        
        try {
            const xmlContent = this.writer.writeToString(this.rootPackage);
            vscode.postMessage({
                command: 'updateDocument',
                content: xmlContent
            });
        } catch (error) {
            this.showError(`Failed to update document: ${error}`);
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

    private setStatus(message: string): void {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
            // Clear status message after 5 seconds for success messages
            if (!message.startsWith('Error:')) {
                setTimeout(() => {
                    if (statusElement.textContent === message) {
                        statusElement.textContent = 'Ready';
                    }
                }, 5000);
            }
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