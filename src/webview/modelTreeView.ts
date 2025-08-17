import {
  EPackage,
  EClass,
  EEnum,
  EAttribute,
  EReference,
  EOperation,
  EParameter,
} from '@tripsnek/tmf';
import { EUtils } from './eUtils';
import { ModelActions } from './modelActions';

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
  private onSelectionChanged: (element: any, focusNameField?: boolean) => void;
  private contextMenu: HTMLElement | null = null;
  private rootPackage: EPackage | null = null;
  private visibleNodes: TreeNode[] = [];
  private onUpdateDocument: () => void; // Callback to mark document as dirty

  // Update the constructor to handle the new signature
  constructor(
    onSelectionChanged: (element: any, focusNameField?: boolean) => void,
    onUpdateDocument?: () => void,
  ) {
    this.onSelectionChanged = onSelectionChanged;
    this.onUpdateDocument = onUpdateDocument || (() => {});
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
        const isInputFocused =
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.tagName === 'TEXTAREA');

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
        case 'Delete':
          e.preventDefault();
          if (this.selectedNode && this.selectedNode.parent) {
            this.executeAction(this.selectedNode.element, 'delete');
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
      node.children.forEach((child) => this.collectVisibleNodes(child));
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
    // Reset counters when loading a new model
    ModelActions.resetCounters();

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
      expanded: true,
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
      expanded: true,
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

      if (EUtils.isEClass(classifier)) {
        classifierNode = this.createClassNode(classifier as any);
      } else if (EUtils.isEEnum(classifier)) {
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
      if (EUtils.isEClass(classifier)) {
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
      expanded: false,
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

  private createOperationNode(op: EOperation): TreeNode {
    const node: TreeNode = {
      element: op,
      type: 'EOperation',
      id: this.generateId(op),
      label: this.getOperationLabel(op),
      children: [],
      expanded: false,
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

  private createAttributeNode(attr: EAttribute): TreeNode {
    const type = attr.getEType() ? attr.getEType().getName() : "void";
    const multiplicity = this.getMultiplicity(attr);
    const label = `${attr.getName() || "unnamed"} : ${type}${multiplicity}`;

    const node: TreeNode = {
      element: attr,
      type: "EAttribute",
      id: this.generateId(attr),
      label: label,
      children: [],
      expanded: false,
    };

    // IMPORTANT: Add to nodeMap so updates can find this node
    this.nodeMap.set(node.id, node);

    return node;
  }

  private createReferenceNode(ref: EReference): TreeNode {
    const type = ref.getEType() ? ref.getEType().getName() : "void";
    const multiplicity = this.getMultiplicity(ref);
    const containment = ref.isContainment() ? " [containment]" : "";
    const label = `${ref.getName() || "unnamed"} : ${type}${multiplicity}${containment}`;

    const node: TreeNode = {
      element: ref,
      type: "EReference",
      id: this.generateId(ref),
      label: label,
      children: [],
      expanded: false,
    };

    // IMPORTANT: Add to nodeMap so updates can find this node
    this.nodeMap.set(node.id, node);

    return node;
  }

  private createParameterNode(param: EParameter): TreeNode {
    const type = param.getEType() ? param.getEType().getName() : "void";
    const multiplicity = this.getMultiplicity(param);
    const label = `${param.getName() || "unnamed"} : ${type}${multiplicity}`;

    const node: TreeNode = {
      element: param,
      type: "EParameter",
      id: this.generateId(param),
      label: label,
      children: [],
      expanded: false,
    };

    // IMPORTANT: Add to nodeMap so updates can find this node
    this.nodeMap.set(node.id, node);

    return node;
  }

  // Also update createEnumNode to ensure enum literals are added to nodeMap:
  private createEnumNode(eEnum: EEnum): TreeNode {
    const node: TreeNode = {
      element: eEnum,
      type: "EEnum",
      id: this.generateId(eEnum),
      label: eEnum.getName() || "unnamed",
      children: [],
      expanded: false,
    };

    this.nodeMap.set(node.id, node);

    // Add enum literals
    const literals = eEnum.getELiterals();
    for (let i = 0; i < literals.size(); i++) {
      const literal = literals.get(i);
      const literalNode: TreeNode = {
        element: literal,
        type: "EEnumLiteral",
        id: this.generateId(literal),
        label: `${literal.getName() || literal.getLiteral() || "unnamed"}`,
        children: [],
        expanded: false,
        parent: node,
      };
      
      // IMPORTANT: Add literal nodes to nodeMap too
      this.nodeMap.set(literalNode.id, literalNode);
      
      node.children.push(literalNode);
    }

    return node;
  }

  private renderNode(
    node: TreeNode,
    container: HTMLElement,
    level: number,
  ): void {
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
    icon.className = `codicon ${EUtils.getIconForType(node.type)}`;
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
      node.children.forEach((child) => {
        this.renderNode(child, childContainer, level + 1);
      });
      container.appendChild(childContainer);
    }
  }

  private renderClassLabelWithSuperType(
    labelElement: HTMLElement,
    eClass: EClass,
  ): void {
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

  public updateNodeLabel(element: any): void {
    let nodeFound = false;
    
    // Find the node for this element
    for (const [id, node] of this.nodeMap) {
      if (node.element === element) {
        nodeFound = true;
        
        // Update the label based on type
        if (node.type === "EClass") {
          node.label = this.getClassLabelWithSuperType(element);
        } else if (node.type === "EOperation") {
          node.label = this.getOperationLabel(element);
        } else if (node.type === "EAttribute") {
          const type = element.getEType() ? element.getEType().getName() : "void";
          const multiplicity = this.getMultiplicity(element);
          node.label = `${element.getName() || "unnamed"} : ${type}${multiplicity}`;
        } else if (node.type === "EReference") {
          const type = element.getEType() ? element.getEType().getName() : "void";
          const multiplicity = this.getMultiplicity(element);
          const containment = element.isContainment ? element.isContainment() : false;
          const containmentText = containment ? " [containment]" : "";
          node.label = `${element.getName() || "unnamed"} : ${type}${multiplicity}${containmentText}`;
        } else if (node.type === "EParameter") {
          const type = element.getEType() ? element.getEType().getName() : "void";
          const multiplicity = this.getMultiplicity(element);
          node.label = `${element.getName() || "unnamed"} : ${type}${multiplicity}`;
        } else if (node.type === "EEnumLiteral") {
          const name = element.getName ? element.getName() : 
                       element.getLiteral ? element.getLiteral() : "unnamed";
          const value = element.getValue ? element.getValue() : 0;
          node.label = `${name}`;
        } else if (element.getName) {
          // For all other named elements (EPackage, EEnum, etc.)
          node.label = element.getName() || "unnamed";
        }
      }
    }
    
    // Special case: if a class name was changed, update all reference nodes that use this class as type
    if (EUtils.isEClass(element)) {
      this.updateReferenceLabelsForClass(element);
    }
    
    if (!nodeFound) {
      // Fallback: try searching through tree structure
      this.updateNodeLabelByTreeSearch(this.rootNode, element);
    }
    
    // Refresh the tree display without changing selection or focus
    this.refreshWithoutFocusChange();
  }

  // New method to update reference labels when a class name changes
  private updateReferenceLabelsForClass(eClass: EClass): void {
    const className = eClass.getName() || "unnamed";
    
    // Update all reference nodes that have this class as their type
    for (const [id, node] of this.nodeMap) {
      if (node.type === "EReference" || node.type === "EAttribute" || node.type === "EParameter") {
        const element = node.element;
        if (element && element.getEType && element.getEType() === eClass) {
          // Recreate the label with the updated class name
          if (node.type === "EReference") {
            const multiplicity = this.getMultiplicity(element);
            const containment = element.isContainment ? element.isContainment() : false;
            const containmentText = containment ? " [containment]" : "";
            node.label = `${element.getName() || "unnamed"} : ${className}${multiplicity}${containmentText}`;
          } else if (node.type === "EAttribute") {
            const multiplicity = this.getMultiplicity(element);
            node.label = `${element.getName() || "unnamed"} : ${className}${multiplicity}`;
          } else if (node.type === "EParameter") {
            const multiplicity = this.getMultiplicity(element);
            node.label = `${element.getName() || "unnamed"} : ${className}${multiplicity}`;
          }
        }
      } else if (node.type === "EOperation") {
        // Update operation return type if it matches
        const element = node.element;
        if (element && element.getEType && element.getEType() === eClass) {
          node.label = this.getOperationLabel(element);
        }
      }
    }
  }

  private updateNodeLabelByTreeSearch(node: TreeNode | null, targetElement: any): boolean {
    if (!node) return false;
    
    if (node.element === targetElement) {
      console.log('Found node via tree search:', node);
      
      // Update the label based on the element type
      const element = targetElement;
      
      if (EUtils.isEClass(element)) {
        node.label = this.getClassLabelWithSuperType(element);
      } else if (EUtils.isEOperation(element)) {
        node.label = this.getOperationLabel(element);
      } else if (EUtils.isEAttribute(element)) {
        const type = element.getEType() ? element.getEType().getName() : "void";
        const multiplicity = this.getMultiplicity(element);
        node.label = `${element.getName() || "unnamed"} : ${type}${multiplicity}`;
      } else if (EUtils.isEReference(element)) {
        const type = element.getEType() ? element.getEType().getName() : "void";
        const multiplicity = this.getMultiplicity(element);
        const containment = element.isContainment ? element.isContainment() : false;
        const containmentText = containment ? " [containment]" : "";
        node.label = `${element.getName() || "unnamed"} : ${type}${multiplicity}${containmentText}`;
      } else if (EUtils.isEParameter(element)) {
        const type = element.getEType() ? element.getEType().getName() : "void";
        const multiplicity = this.getMultiplicity(element);
        node.label = `${element.getName() || "unnamed"} : ${type}${multiplicity}`;
      } else if (EUtils.isEEnumLiteral(element)) {
        const name = element.getName ? element.getName() : 
                     element.getLiteral ? element.getLiteral() : "unnamed";
        const value = element.getValue ? element.getValue() : 0;
        node.label = `${name} = ${value}`;
      } else if (element.getName) {
        node.label = element.getName() || "unnamed";
      }
      
      console.log('Updated label via tree search to:', node.label);
      return true;
    }
    
    // Search children
    for (const child of node.children) {
      if (this.updateNodeLabelByTreeSearch(child, targetElement)) {
        return true;
      }
    }
    
    return false;
  }

  // Add this new method to refresh without changing focus
  private refreshWithoutFocusChange(): void {
    const container = document.getElementById('model-tree');
    if (!container || !this.rootNode) return;

    // Save the current active element
    const activeElement = document.activeElement;

    container.innerHTML = '';
    container.setAttribute('tabindex', '0');
    this.renderNode(this.rootNode, container, 0);

    // Restore focus if it was on an input in the properties panel
    if (activeElement && activeElement instanceof HTMLInputElement) {
      const propertyName = activeElement.getAttribute('data-property');
      if (propertyName) {
        // Find and restore focus to the same input
        setTimeout(() => {
          const newInput = document.querySelector(
            `input[data-property="${propertyName}"]`,
          ) as HTMLInputElement;
          if (newInput) {
            newInput.focus();
            // Restore cursor position for text inputs
            if (newInput.type === 'text' || newInput.type === 'number') {
              const cursorPos =
                activeElement.selectionStart || activeElement.value.length;
              newInput.setSelectionRange(cursorPos, cursorPos);
            }
          }
        }, 0);
      }
    }
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
    node.children.forEach((child) =>
      this.setExpandedRecursive(child, expanded),
    );
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

    // Get menu items from shared module
    const menuItems = ModelActions.getActionsForElement(node.element);
    
    menuItems.forEach((item) => {
      if (item.type === 'separator') {
        // Separator
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        this.contextMenu!.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        if (item.danger) {
          menuItem.classList.add('danger');
        }
        menuItem.innerHTML = `<i class="codicon ${item.icon}"></i> ${item.label}`;
        menuItem.addEventListener('click', () => {
          this.executeAction(node.element, item.type);
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

  // Unified execution method using shared module
  private executeAction(element: any, actionType: string): void {
    
    const result = ModelActions.executeAction(element, actionType);
    
    if (result.newElement) {
      // Handle the new element by adding it to the tree
      this.handleNewElement(element, result.newElement, actionType);
      
      // Select and possibly focus the new element
      const newNode = this.findNodeForElement(result.newElement);
      if (newNode) {
        // Ensure parent is expanded
        if (newNode.parent) {
          newNode.parent.expanded = true;
        }
        this.refresh();
        this.selectNode(newNode, result.shouldFocusName);
      }
    } else if (actionType === 'delete') {
      // Handle deletion
      const node = this.findNodeForElement(element);
      if (node && node.parent) {
        // Remove from tree
        const index = node.parent.children.indexOf(node);
        if (index >= 0) {
          node.parent.children.splice(index, 1);
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
    }
    
    // Mark document as dirty
    if (this.onUpdateDocument) {
      this.onUpdateDocument();
    }
    
    // Show status message
    this.showStatus(result.message);
  }

  // Add this new public method to expose add functionality from properties panel
  public addChildElement(parentElement: any, childType: string): void {
    this.executeAction(parentElement, childType);
  }

  // Helper to handle new elements and add them to tree
  private handleNewElement(parent: any, newElement: any, actionType: string): void {
    const parentNode = this.findNodeForElement(parent);
    if (!parentNode) return;
    
    let newNode: TreeNode;
    
    // Create appropriate node based on action type
    switch (actionType) {
      case 'addClass':
        newNode = this.createClassNode(newElement as EClass);
        break;
      case 'addEnum':
        newNode = this.createEnumNode(newElement as EEnum);
        break;
      case 'addSubPackage':
        newNode = this.createPackageNode(newElement as EPackage);
        break;
      case 'addAttribute':
        newNode = this.createAttributeNode(newElement as EAttribute);
        // Insert before references and operations
        const firstRefIndex = parentNode.children.findIndex(n => n.type === 'EReference');
        const firstOpIndex = parentNode.children.findIndex(n => n.type === 'EOperation');
        const insertIndex = firstRefIndex >= 0 ? firstRefIndex : 
                          firstOpIndex >= 0 ? firstOpIndex : parentNode.children.length;
        parentNode.children.splice(insertIndex, 0, newNode);
        newNode.parent = parentNode;
        return;
      case 'addReference':
        newNode = this.createReferenceNode(newElement as EReference);
        // Insert before operations
        const opIndex = parentNode.children.findIndex(n => n.type === 'EOperation');
        const refInsertIndex = opIndex >= 0 ? opIndex : parentNode.children.length;
        parentNode.children.splice(refInsertIndex, 0, newNode);
        newNode.parent = parentNode;
        return;
      case 'addOperation':
        newNode = this.createOperationNode(newElement as EOperation);
        break;
      case 'addParameter':
        newNode = this.createParameterNode(newElement as EParameter);
        // Update parent operation label
        parentNode.label = this.getOperationLabel(parent as EOperation);
        break;
      case 'addLiteral':
        newNode = {
          element: newElement,
          type: 'EEnumLiteral',
          id: this.generateId(newElement),
          label: `${newElement.getName() || newElement.getLiteral() || "unnamed"} = ${newElement.getValue() || 0}`,
          children: [],
          expanded: false,
        };
        this.nodeMap.set(newNode.id, newNode);
        break;
      default:
        return;
    }
    
    newNode.parent = parentNode;
    parentNode.children.push(newNode);
  }

  // Helper to find node for an element
  private findNodeForElement(element: any): TreeNode | null {
    for (const [id, node] of this.nodeMap) {
      if (node.element === element) {
        return node;
      }
    }
    return null;
  }

  // Update selectNode to accept focusNameField parameter
  private selectNode(node: TreeNode, focusNameField: boolean = false): void {
    this.selectedNode = node;
    this.refresh();

    if (node.element) {
      this.onSelectionChanged(node.element, focusNameField);
    }

    // Ensure the tree container maintains focus for keyboard navigation
    const treeContainer = document.getElementById('model-tree');
    if (treeContainer && !focusNameField) {
      treeContainer.focus();
    }
  }

  private showStatus(message: string): void {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
      statusElement.textContent = message;
      // Clear status after 3 seconds
      setTimeout(() => {
        if (statusElement.textContent === message) {
          statusElement.textContent = 'Ready';
        }
      }, 3000);
    }
  }

  // Helper methods
  private generateId(element: any): string {
    return `node_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMultiplicity(feature: any): string {
    const lower = feature.getLowerBound ? feature.getLowerBound() : 0;
    const upper = feature.getUpperBound ? feature.getUpperBound() : 1;

    //simple multiplicity: one or many
    if(upper == -1) return `[*]`;
    return '';
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
}