import { EPackage, EClass, EEnum, EAttribute, EReference, EOperation, EParameter, EClassImpl, EPackageImpl, EEnumImpl, EAttributeImpl, EReferenceImpl, EOperationImpl, EParameterImpl, EEnumLiteralImpl } from '@tripsnek/tmf';

interface TreeNode {
    element: any;
    type: string;
    id: string;
    label: string;
    children: TreeNode[];
    expanded: boolean;
    parent?: TreeNode;
}

export class ModelTreeView {
    private rootNode: TreeNode | null = null;
    private selectedNode: TreeNode | null = null;
    private nodeMap: Map<string, TreeNode> = new Map();
    private onSelectionChanged: (element: any) => void;
    private contextMenu: HTMLElement | null = null;
    private rootPackage: EPackage | null = null;
    private visibleNodes: TreeNode[] = [];

    constructor(onSelectionChanged: (element: any) => void) {
        this.onSelectionChanged = onSelectionChanged;
        this.createContextMenu();
        this.setupKeyboardNavigation();
    }

    private setupKeyboardNavigation(): void {
        document.addEventListener('keydown', (e) => {
            // Only handle if focus is on the tree or a tree element
            const activeElement = document.activeElement;
            const treeContainer = document.getElementById('model-tree');
            
            if (!treeContainer || !treeContainer.contains(activeElement)) {
                // Check if the tree panel is visible and no input is focused
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'SELECT' || 
                    activeElement.tagName === 'TEXTAREA'
                );
                
                if (isInputFocused) {
                    return;
                }
            }

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectPreviousNode();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectNextNode();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.handleLeftArrow();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.handleRightArrow();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.selectedNode && this.selectedNode.children.length > 0) {
                        this.toggleNode(this.selectedNode);
                    }
                    break;
            }
        });
    }

    private buildVisibleNodesList(): void {
        this.visibleNodes = [];
        if (this.rootNode) {
            this.collectVisibleNodes(this.rootNode);
        }
    }

    private collectVisibleNodes(node: TreeNode): void {
        this.visibleNodes.push(node);
        if (node.expanded) {
            node.children.forEach(child => this.collectVisibleNodes(child));
        }
    }

    private selectPreviousNode(): void {
        this.buildVisibleNodesList();
        if (this.visibleNodes.length === 0) return;

        if (!this.selectedNode) {
            this.selectNode(this.visibleNodes[0]);
            return;
        }

        const currentIndex = this.visibleNodes.indexOf(this.selectedNode);
        if (currentIndex > 0) {
            this.selectNode(this.visibleNodes[currentIndex - 1]);
        }
    }

    private selectNextNode(): void {
        this.buildVisibleNodesList();
        if (this.visibleNodes.length === 0) return;

        if (!this.selectedNode) {
            this.selectNode(this.visibleNodes[0]);
            return;
        }

        const currentIndex = this.visibleNodes.indexOf(this.selectedNode);
        if (currentIndex < this.visibleNodes.length - 1) {
            this.selectNode(this.visibleNodes[currentIndex + 1]);
        }
    }

    private handleLeftArrow(): void {
        if (!this.selectedNode) return;

        if (this.selectedNode.expanded && this.selectedNode.children.length > 0) {
            // Collapse if expanded
            this.toggleNode(this.selectedNode);
        } else if (this.selectedNode.parent) {
            // Select parent if not expanded or no children
            this.selectNode(this.selectedNode.parent);
        }
    }

    private handleRightArrow(): void {
        if (!this.selectedNode) return;

        if (this.selectedNode.children.length > 0) {
            if (!this.selectedNode.expanded) {
                // Expand if collapsed
                this.toggleNode(this.selectedNode);
            } else {
                // Select first child if already expanded
                this.selectNode(this.selectedNode.children[0]);
            }
        }
    }

    public render(rootPackage: EPackage, fileName: string): void {
        this.rootPackage = rootPackage;
        const container = document.getElementById('model-tree');
        if (!container) return;

        // Create root node
        this.rootNode = this.createRootNode(rootPackage, fileName);
        
        // Clear and render
        container.innerHTML = '';
        container.setAttribute('tabindex', '0'); // Make container focusable for keyboard events
        this.renderNode(this.rootNode, container, 0);
        
        // Focus the container to enable keyboard navigation
        container.focus();
    }

    private createRootNode(rootPackage: EPackage, fileName: string): TreeNode {
        const rootNode: TreeNode = {
            element: null,
            type: 'root',
            id: 'root',
            label: `file:/${fileName}`,
            children: [],
            expanded: true
        };

        // Add the root package
        if (rootPackage) {
            const packageNode = this.createPackageNode(rootPackage);
            packageNode.parent = rootNode;
            rootNode.children.push(packageNode);
        }

        return rootNode;
    }

    private createPackageNode(ePackage: EPackage): TreeNode {
        const node: TreeNode = {
            element: ePackage,
            type: 'EPackage',
            id: this.generateId(ePackage),
            label: ePackage.getName() || 'unnamed',
            children: [],
            expanded: true
        };

        this.nodeMap.set(node.id, node);

        // Add sub-packages
        const subPackages = ePackage.getESubPackages();
        for (let i = 0; i < subPackages.size(); i++) {
            const subPkg = subPackages.get(i);
            const subNode = this.createPackageNode(subPkg);
            subNode.parent = node;
            node.children.push(subNode);
        }

        // Add classifiers (EClass and EEnum)
        const classifiers = ePackage.getEClassifiers();
        for (let i = 0; i < classifiers.size(); i++) {
            const classifier = classifiers.get(i);
            let classifierNode: TreeNode;
            
            if (this.isEClass(classifier)) {
                classifierNode = this.createClassNode(classifier as any);
            } else if (this.isEEnum(classifier)) {
                classifierNode = this.createEnumNode(classifier as any);
            } else {
                continue;
            }
            
            classifierNode.parent = node;
            node.children.push(classifierNode);
        }

        return node;
    }

    // Method to get all EClasses in the model
    public getAllClasses(): EClass[] {
        const classes: EClass[] = [];
        if (!this.rootPackage) return classes;
        
        this.collectClassesFromPackage(this.rootPackage, classes);
        return classes;
    }

    private collectClassesFromPackage(pkg: EPackage, classes: EClass[]): void {
        const classifiers = pkg.getEClassifiers();
        for (let i = 0; i < classifiers.size(); i++) {
            const classifier = classifiers.get(i);
            if (this.isEClass(classifier)) {
                classes.push(classifier as EClass);
            }
        }
        
        const subPackages = pkg.getESubPackages();
        for (let i = 0; i < subPackages.size(); i++) {
            this.collectClassesFromPackage(subPackages.get(i), classes);
        }
    }

    private createClassNode(eClass: EClass): TreeNode {
        const node: TreeNode = {
            element: eClass,
            type: 'EClass',
            id: this.generateId(eClass),
            label: this.getClassLabelWithSuperType(eClass),
            children: [],
            expanded: false
        };

        this.nodeMap.set(node.id, node);

        // Add attributes
        const attributes = eClass.getEAttributes();
        for (let i = 0; i < attributes.size(); i++) {
            const attr = attributes.get(i);
            const attrNode = this.createAttributeNode(attr);
            attrNode.parent = node;
            node.children.push(attrNode);
        }

        // Add references
        const references = eClass.getEReferences();
        for (let i = 0; i < references.size(); i++) {
            const ref = references.get(i);
            const refNode = this.createReferenceNode(ref);
            refNode.parent = node;
            node.children.push(refNode);
        }

        // Add operations
        const operations = eClass.getEOperations();
        for (let i = 0; i < operations.size(); i++) {
            const op = operations.get(i);
            const opNode = this.createOperationNode(op);
            opNode.parent = node;
            node.children.push(opNode);
        }

        return node;
    }

    private getClassLabelWithSuperType(eClass: EClass): string {
        const className = eClass.getName() || 'unnamed';
        
        // Get super types
        const superTypes = eClass.getESuperTypes();
        if (superTypes && superTypes.size() > 0) {
            // Just get the first super type (single inheritance)
            const superType = superTypes.get(0);
            const superTypeName = superType.getName() || 'unnamed';
            return `${className} → ${superTypeName}`;
        }
        
        return className;
    }

    private createEnumNode(eEnum: EEnum): TreeNode {
        const node: TreeNode = {
            element: eEnum,
            type: 'EEnum',
            id: this.generateId(eEnum),
            label: eEnum.getName() || 'unnamed',
            children: [],
            expanded: false
        };

        this.nodeMap.set(node.id, node);

        // Add enum literals
        const literals = eEnum.getELiterals();
        for (let i = 0; i < literals.size(); i++) {
            const literal = literals.get(i);
            const literalNode: TreeNode = {
                element: literal,
                type: 'EEnumLiteral',
                id: this.generateId(literal),
                label: literal.getName() || 'unnamed',
                children: [],
                expanded: false,
                parent: node
            };
            node.children.push(literalNode);
        }

        return node;
    }

    private createAttributeNode(attr: EAttribute): TreeNode {
        const type = attr.getEType() ? attr.getEType().getName() : 'void';
        const multiplicity = this.getMultiplicity(attr);
        const label = `${attr.getName() || 'unnamed'} : ${type}${multiplicity}`;
        
        return {
            element: attr,
            type: 'EAttribute',
            id: this.generateId(attr),
            label: label,
            children: [],
            expanded: false
        };
    }

    private createReferenceNode(ref: EReference): TreeNode {
        const type = ref.getEType() ? ref.getEType().getName() : 'void';
        const multiplicity = this.getMultiplicity(ref);
        const containment = ref.isContainment() ? ' [containment]' : '';
        const label = `${ref.getName() || 'unnamed'} : ${type}${multiplicity}${containment}`;
        
        return {
            element: ref,
            type: 'EReference',
            id: this.generateId(ref),
            label: label,
            children: [],
            expanded: false
        };
    }

    private createOperationNode(op: EOperation): TreeNode {
        const node: TreeNode = {
            element: op,
            type: 'EOperation',
            id: this.generateId(op),
            label: this.getOperationLabel(op),
            children: [],
            expanded: false
        };

        this.nodeMap.set(node.id, node);

        // Add parameters
        const params = op.getEParameters();
        for (let i = 0; i < params.size(); i++) {
            const param = params.get(i);
            const paramNode = this.createParameterNode(param);
            paramNode.parent = node;
            node.children.push(paramNode);
        }

        return node;
    }

    private createParameterNode(param: EParameter): TreeNode {
        const type = param.getEType() ? param.getEType().getName() : 'void';
        const multiplicity = this.getMultiplicity(param);
        const label = `${param.getName() || 'unnamed'} : ${type}${multiplicity}`;
        
        return {
            element: param,
            type: 'EParameter',
            id: this.generateId(param),
            label: label,
            children: [],
            expanded: false
        };
    }

private renderNode(node: TreeNode, container: HTMLElement, level: number): void {
    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';
    nodeElement.setAttribute('data-type', node.type);
    nodeElement.style.paddingLeft = `${level * 20}px`;
    
    // Create node content
    const nodeContent = document.createElement('div');
    nodeContent.className = 'tree-node-content';
    if (this.selectedNode === node) {
        nodeContent.classList.add('selected');
    }
    
    // Expand/collapse icon
    if (node.children.length > 0) {
        const expandIcon = document.createElement('i');
        expandIcon.className = `codicon codicon-chevron-${node.expanded ? 'down' : 'right'}`;
        expandIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNode(node);
        });
        nodeContent.appendChild(expandIcon);
    } else {
        const spacer = document.createElement('span');
        spacer.className = 'tree-spacer';
        nodeContent.appendChild(spacer);
    }
    
    // Type icon
    const icon = document.createElement('i');
    icon.className = `codicon ${this.getIconForType(node.type)}`;
    nodeContent.appendChild(icon);
    
    // Label with enhanced styling for EClass super type
    const label = document.createElement('span');
    label.className = 'tree-label';
    
    if (node.type === 'EClass' && node.element) {
        // Special handling for EClass with super type
        this.renderClassLabelWithSuperType(label, node.element);
    } else {
        label.textContent = node.label;
    }
    
    nodeContent.appendChild(label);
    
    // Click handler
    nodeContent.addEventListener('click', () => {
        this.selectNode(node);
    });
    
    // Context menu
    nodeContent.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, node);
    });
    
    nodeElement.appendChild(nodeContent);
    container.appendChild(nodeElement);
    
    // Render children if expanded
    if (node.expanded) {
        const childContainer = document.createElement('div');
        childContainer.className = 'tree-children';
        node.children.forEach(child => {
            this.renderNode(child, childContainer, level + 1);
        });
        container.appendChild(childContainer);
    }
}

private renderClassLabelWithSuperType(labelElement: HTMLElement, eClass: EClass): void {
    const className = eClass.getName() || 'unnamed';
    
    // Clear the label
    labelElement.innerHTML = '';
    
    // Add class name
    const classNameSpan = document.createElement('span');
    classNameSpan.className = 'class-name';
    classNameSpan.textContent = className;
    labelElement.appendChild(classNameSpan);
    
    // Get super types
    const superTypes = eClass.getESuperTypes();
    if (superTypes && superTypes.size() > 0) {
        // Add arrow
        const arrow = document.createElement('span');
        arrow.className = 'super-type-arrow';
        arrow.textContent = ' → ';
        labelElement.appendChild(arrow);
        
        // Add super type (just the first one)
        const superTypesSpan = document.createElement('span');
        superTypesSpan.className = 'super-types';
        
        const superType = superTypes.get(0);
        const superTypeName = superType.getName() || 'unnamed';
        superTypesSpan.textContent = superTypeName;
        labelElement.appendChild(superTypesSpan);
    }
}

    private toggleNode(node: TreeNode): void {
        node.expanded = !node.expanded;
        this.refresh();
    }

    private selectNode(node: TreeNode): void {
        this.selectedNode = node;
        this.refresh();
        
        if (node.element) {
            this.onSelectionChanged(node.element);
        }
        
        // Ensure the tree container maintains focus for keyboard navigation
        const treeContainer = document.getElementById('model-tree');
        if (treeContainer) {
            treeContainer.focus();
        }
    }

    public updateNodeLabel(element: any): void {
        // Find the node for this element
        for (const [id, node] of this.nodeMap) {
            if (node.element === element) {
                // Update the label based on type
                if (node.type === 'EClass') {
                    // For EClass, regenerate label with super type
                    node.label = this.getClassLabelWithSuperType(element);
                } else if (node.type === 'EOperation') {
                    node.label = this.getOperationLabel(element);
                } else if (node.type === 'EAttribute') {
                    const type = element.getEType() ? element.getEType().getName() : 'void';
                    const multiplicity = this.getMultiplicity(element);
                    node.label = `${element.getName() || 'unnamed'} : ${type}${multiplicity}`;
                } else if (node.type === 'EReference') {
                    const type = element.getEType() ? element.getEType().getName() : 'void';
                    const multiplicity = this.getMultiplicity(element);
                    const containment = element.isContainment() ? ' [containment]' : '';
                    node.label = `${element.getName() || 'unnamed'} : ${type}${multiplicity}${containment}`;
                } else if (element.getName) {
                    node.label = element.getName() || 'unnamed';
                }
                break;
            }
        }
        this.refresh();
    }

    public refresh(): void {
        const container = document.getElementById('model-tree');
        if (!container || !this.rootNode) return;
        
        container.innerHTML = '';
        container.setAttribute('tabindex', '0'); // Ensure it remains focusable
        this.renderNode(this.rootNode, container, 0);
    }

    public expandAll(): void {
        this.setExpandedRecursive(this.rootNode, true);
        this.refresh();
    }

    public collapseAll(): void {
        this.setExpandedRecursive(this.rootNode, false);
        this.refresh();
    }

    private setExpandedRecursive(node: TreeNode | null, expanded: boolean): void {
        if (!node) return;
        node.expanded = expanded;
        node.children.forEach(child => this.setExpandedRecursive(child, expanded));
    }

    private createContextMenu(): void {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu';
        this.contextMenu.style.display = 'none';
        document.body.appendChild(this.contextMenu);
        
        // Hide context menu on click outside
        document.addEventListener('click', () => {
            if (this.contextMenu) {
                this.contextMenu.style.display = 'none';
            }
        });
    }

    private showContextMenu(event: MouseEvent, node: TreeNode): void {
        if (!this.contextMenu) return;
        
        // Clear existing menu items
        this.contextMenu.innerHTML = '';
        
        // Add menu items based on node type
        const menuItems = this.getContextMenuItems(node);
        menuItems.forEach(item => {
            if (item.label === '-') {
                // Separator
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                this.contextMenu!.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.innerHTML = `<i class="codicon ${item.icon}"></i> ${item.label}`;
                menuItem.addEventListener('click', () => {
                    item.action();
                    this.contextMenu!.style.display = 'none';
                });
                this.contextMenu!.appendChild(menuItem);
            }
        });
        
        // Position and show menu
        this.contextMenu.style.left = `${event.pageX}px`;
        this.contextMenu.style.top = `${event.pageY}px`;
        this.contextMenu.style.display = 'block';
    }

    private getContextMenuItems(node: TreeNode): Array<{label: string, icon: string, action: () => void}> {
        const items = [];
        
        switch (node.type) {
            case 'EPackage':
                items.push(
                    { label: 'Add Class', icon: 'codicon-symbol-class', action: () => this.addEClass(node) },
                    { label: 'Add Enum', icon: 'codicon-symbol-enum', action: () => this.addEEnum(node) },
                    { label: 'Add Sub-Package', icon: 'codicon-folder', action: () => this.addSubPackage(node) }
                );
                break;
            case 'EClass':
                items.push(
                    { label: 'Add Attribute', icon: 'codicon-symbol-field', action: () => this.addAttribute(node) },
                    { label: 'Add Reference', icon: 'codicon-references', action: () => this.addReference(node) },
                    { label: 'Add Operation', icon: 'codicon-symbol-method', action: () => this.addOperation(node) }
                );
                break;
            case 'EOperation':
                items.push(
                    { label: 'Add Parameter', icon: 'codicon-symbol-parameter', action: () => this.addParameter(node) }
                );
                break;
            case 'EEnum':
                items.push(
                    { label: 'Add Literal', icon: 'codicon-symbol-constant', action: () => this.addEnumLiteral(node) }
                );
                break;
        }
        
        // Add delete option for non-root items
        if (node.type !== 'root' && node.parent) {
            if (items.length > 0) {
                items.push({ label: '-', icon: '', action: () => {} }); // Separator
            }
            items.push(
                { label: 'Delete', icon: 'codicon-trash', action: () => this.deleteNode(node) }
            );
        }
        
        return items;
    }

    // Context menu actions with actual implementations
    private addEClass(packageNode: TreeNode): void {
        const pkg = packageNode.element as EPackage;
        const name = prompt('Enter class name:', 'NewClass');
        if (!name) return;

        // Create new EClass
        const eClass = new EClassImpl();
        eClass.setName(name);
        pkg.getEClassifiers().add(eClass);
        eClass.setEPackage(pkg);

        // Add to tree
        const classNode = this.createClassNode(eClass);
        classNode.parent = packageNode;
        packageNode.children.push(classNode);
        
        // Expand parent and refresh
        packageNode.expanded = true;
        this.refresh();
        this.selectNode(classNode);
    }

    private addEEnum(packageNode: TreeNode): void {
        const pkg = packageNode.element as EPackage;
        const name = prompt('Enter enum name:', 'NewEnum');
        if (!name) return;

        // Create new EEnum
        const eEnum = new EEnumImpl();
        eEnum.setName(name);
        pkg.getEClassifiers().add(eEnum);
        eEnum.setEPackage(pkg);

        // Add to tree
        const enumNode = this.createEnumNode(eEnum);
        enumNode.parent = packageNode;
        packageNode.children.push(enumNode);
        
        // Expand parent and refresh
        packageNode.expanded = true;
        this.refresh();
        this.selectNode(enumNode);
    }

    private addSubPackage(packageNode: TreeNode): void {
        const parentPkg = packageNode.element as EPackage;
        const name = prompt('Enter package name:', 'newpackage');
        if (!name) return;

        // Create new sub-package
        const subPkg = new EPackageImpl(name, `http://www.example.org/${name}`);
        subPkg.setNsPrefix(name);
        parentPkg.getESubPackages().add(subPkg);
        subPkg.setESuperPackage(parentPkg);

        // Add to tree
        const subPkgNode = this.createPackageNode(subPkg);
        subPkgNode.parent = packageNode;
        packageNode.children.push(subPkgNode);
        
        // Expand parent and refresh
        packageNode.expanded = true;
        this.refresh();
        this.selectNode(subPkgNode);
    }

    private addAttribute(classNode: TreeNode): void {
        const eClass = classNode.element as EClass;
        const name = prompt('Enter attribute name:', 'newAttribute');
        if (!name) return;

        // Create new attribute
        const attr = new EAttributeImpl();
        attr.setName(name);
        eClass.getEStructuralFeatures().add(attr);
        attr.setEContainingClass(eClass);

        // Add to tree
        const attrNode = this.createAttributeNode(attr);
        attrNode.parent = classNode;
        // Insert before references and operations
        const firstRefIndex = classNode.children.findIndex(n => n.type === 'EReference');
        const firstOpIndex = classNode.children.findIndex(n => n.type === 'EOperation');
        const insertIndex = firstRefIndex >= 0 ? firstRefIndex : (firstOpIndex >= 0 ? firstOpIndex : classNode.children.length);
        classNode.children.splice(insertIndex, 0, attrNode);
        
        // Expand parent and refresh
        classNode.expanded = true;
        this.refresh();
        this.selectNode(attrNode);
    }

    private addReference(classNode: TreeNode): void {
        const eClass = classNode.element as EClass;
        const name = prompt('Enter reference name:', 'newReference');
        if (!name) return;

        // Create new reference
        const ref = new EReferenceImpl();
        ref.setName(name);
        eClass.getEStructuralFeatures().add(ref);
        ref.setEContainingClass(eClass);

        // Add to tree
        const refNode = this.createReferenceNode(ref);
        refNode.parent = classNode;
        // Insert before operations
        const firstOpIndex = classNode.children.findIndex(n => n.type === 'EOperation');
        const insertIndex = firstOpIndex >= 0 ? firstOpIndex : classNode.children.length;
        classNode.children.splice(insertIndex, 0, refNode);
        
        // Expand parent and refresh
        classNode.expanded = true;
        this.refresh();
        this.selectNode(refNode);
    }

    private addOperation(classNode: TreeNode): void {
        const eClass = classNode.element as EClass;
        const name = prompt('Enter operation name:', 'newOperation');
        if (!name) return;

        // Create new operation
        const op = new EOperationImpl();
        op.setName(name);
        eClass.getEOperations().add(op);
        op.setEContainingClass(eClass);

        // Add to tree
        const opNode = this.createOperationNode(op);
        opNode.parent = classNode;
        classNode.children.push(opNode);
        
        // Expand parent and refresh
        classNode.expanded = true;
        this.refresh();
        this.selectNode(opNode);
    }

    private addParameter(opNode: TreeNode): void {
        const operation = opNode.element as EOperation;
        const name = prompt('Enter parameter name:', 'param');
        if (!name) return;

        // Create new parameter
        const param = new EParameterImpl();
        param.setName(name);
        operation.getEParameters().add(param);

        // Add to tree
        const paramNode = this.createParameterNode(param);
        paramNode.parent = opNode;
        opNode.children.push(paramNode);
        
        // Update operation label
        opNode.label = this.getOperationLabel(operation);
        
        // Expand parent and refresh
        opNode.expanded = true;
        this.refresh();
        this.selectNode(paramNode);
    }

    private addEnumLiteral(enumNode: TreeNode): void {
        const eEnum = enumNode.element as EEnum;
        const name = prompt('Enter literal name:', 'LITERAL');
        if (!name) return;

        // Create new enum literal
        const literal = new EEnumLiteralImpl();
        literal.setName(name);
        literal.setLiteral(name);
        literal.setValue(eEnum.getELiterals().size()); // Auto-increment value
        eEnum.getELiterals().add(literal);
        literal.setEEnum(eEnum);

        // Add to tree
        const literalNode: TreeNode = {
            element: literal,
            type: 'EEnumLiteral',
            id: this.generateId(literal),
            label: literal.getName() || 'unnamed',
            children: [],
            expanded: false,
            parent: enumNode
        };
        enumNode.children.push(literalNode);
        
        // Expand parent and refresh
        enumNode.expanded = true;
        this.refresh();
        this.selectNode(literalNode);
    }

    private deleteNode(node: TreeNode): void {
        if (!node.parent || !confirm(`Delete ${node.label}?`)) return;

        const parent = node.parent.element;
        const element = node.element;

        // Remove from model
        if (node.type === 'EClass' || node.type === 'EEnum') {
            const pkg = parent as EPackage;
            const classifiers = pkg.getEClassifiers();
            classifiers.remove(element);
        } else if (node.type === 'EAttribute' || node.type === 'EReference') {
            const eClass = parent as EClass;
            const features = eClass.getEStructuralFeatures();
            features.remove(element);
        } else if (node.type === 'EOperation') {
            const eClass = parent as EClass;
            const operations = eClass.getEOperations();
            operations.remove(element);
        } else if (node.type === 'EParameter') {
            const operation = parent as EOperation;
            const params = operation.getEParameters();
            params.remove(element);
            // Update operation label
            if (node.parent) {
                node.parent.label = this.getOperationLabel(operation);
            }
        } else if (node.type === 'EEnumLiteral') {
            const eEnum = parent as EEnum;
            const literals = eEnum.getELiterals();
            literals.remove(element);
        } else if (node.type === 'EPackage') {
            const parentPkg = parent as EPackage;
            const subPackages = parentPkg.getESubPackages();
            subPackages.remove(element);
        }

        // Remove from tree
        const parentNode = node.parent;
        const index = parentNode.children.indexOf(node);
        if (index >= 0) {
            parentNode.children.splice(index, 1);
        }

        // Remove from node map
        this.nodeMap.delete(node.id);

        // Clear selection if deleted node was selected
        if (this.selectedNode === node) {
            this.selectedNode = null;
            this.onSelectionChanged(null);
        }

        this.refresh();
    }

    // Helper methods
    private generateId(element: any): string {
        return `node_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getIconForType(type: string): string {
        const icons: {[key: string]: string} = {
            'root': 'codicon-file',
            'EPackage': 'codicon-folder',
            'EClass': 'codicon-symbol-class',
            'EEnum': 'codicon-symbol-enum',
            'EAttribute': 'codicon-symbol-field',
            'EReference': 'codicon-references',
            'EOperation': 'codicon-symbol-method',
            'EParameter': 'codicon-symbol-parameter',
            'EEnumLiteral': 'codicon-symbol-constant'
        };
        return icons[type] || 'codicon-circle-outline';
    }

    private getMultiplicity(feature: any): string {
        const lower = feature.getLowerBound ? feature.getLowerBound() : 0;
        const upper = feature.getUpperBound ? feature.getUpperBound() : 1;
        
        if (lower === 0 && upper === 1) return '';
        if (lower === 1 && upper === 1) return '';
        if (lower === 0 && upper === -1) return '[*]';
        if (lower === 1 && upper === -1) return '[1..*]';
        if (upper === -1) return `[${lower}..*]`;
        if (lower === upper) return `[${lower}]`;
        return `[${lower}..${upper}]`;
    }

    private getOperationLabel(op: EOperation): string {
        const params = op.getEParameters();
        const paramStrings = [];
        for (let i = 0; i < params.size(); i++) {
            const param = params.get(i);
            const type = param.getEType() ? param.getEType().getName() : 'void';
            paramStrings.push(`${param.getName()}: ${type}`);
        }
        const returnType = op.getEType() ? op.getEType().getName() : 'void';
        return `${op.getName() || 'unnamed'}(${paramStrings.join(', ')}): ${returnType}`;
    }

    private isEClass(element: any): boolean {
        return element && element.constructor.name.includes('EClass');
    }

    private isEEnum(element: any): boolean {
        return element && element.constructor.name.includes('EEnum');
    }
}