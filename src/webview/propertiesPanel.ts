import { EUtils } from "./eUtils";
import { ModelActions } from "./modelActions";

interface PropertyDescriptor {
  name: string;
  label: string;
  type:
    | 'string'
    | 'boolean'
    | 'number'
    | 'enum'
    | 'reference'
    | 'multiReference'
    | 'classType'
    | 'multiplicity';
  value: any;
  options?: any[];
  readOnly?: boolean;
}

export class PropertiesPanel {
  private currentElement: any = null;
  private onPropertyChanged: (
    element: any,
    property: string,
    value: any,
  ) => void;
  private treeView: any; // Reference to tree view for getting all classes
  private onAddChild: (element: any, childType: string) => void; // Callback for adding children
  private onDeleteElement: (element: any) => void; // Callback for deleting element
  private isUpdatingHeader: boolean = false; // Flag to prevent rebuilding during header updates

  constructor(
    onPropertyChanged: (element: any, property: string, value: any) => void,
    onAddChild?: (element: any, childType: string) => void,
    onDeleteElement?: (element: any) => void,
  ) {
    this.onPropertyChanged = onPropertyChanged;
    this.onAddChild = onAddChild;
    this.onDeleteElement = onDeleteElement;
  }

  public setTreeView(treeView: any): void {
    this.treeView = treeView;
  }

  public showProperties(element: any, focusNameField: boolean = false): void {
    this.currentElement = element;
    const container = document.getElementById('properties-container');
    if (!container) return;

    // Clear container
    container.innerHTML = '';

    if (!element) {
      this.showEmptyState(container);
      return;
    }

    // Get properties for the element
    const properties = this.getPropertiesForElement(element);

    if (properties.length === 0) {
      this.showEmptyState(container);
      return;
    }

    // Create property form
    const form = document.createElement('div');
    form.className = 'properties-form';

    // Add element type header with name
    const header = document.createElement('div');
    header.className = 'properties-header';
    header.id = 'properties-header'; // Add ID for easy updates
    this.updateHeader(header, element);
    form.appendChild(header);

    // Get actions from shared module
    const actions = ModelActions.getActionsForElement(element);
    
    // Filter out separator and delete action for the button bar
    const addActions = actions.filter(a => a.type !== 'separator' && a.type !== 'delete');
    const hasDelete = actions.some(a => a.type === 'delete');
    
    if (addActions.length > 0 || hasDelete) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'properties-actions';
      actionsContainer.style.cssText = `
        display: flex;
        gap: 4px;
        padding: 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
        flex-wrap: wrap;
        justify-content: space-between;
      `;

      // Container for add buttons
      const addButtonsContainer = document.createElement('div');
      addButtonsContainer.style.cssText = `
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      `;

      // Add buttons for add actions
      addActions.forEach((action) => {
        const button = document.createElement('button');
        button.className = 'toolbar-btn';
        button.title = action.label;
        button.innerHTML = `<i class="codicon ${action.icon}"></i> ${action.label}`;
        button.style.cssText = `
          padding: 4px 8px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 4px;
        `;
        button.addEventListener('click', () => {
          if (this.onAddChild) {
            this.onAddChild(element, action.type);
          }
        });
        addButtonsContainer.appendChild(button);
      });

      actionsContainer.appendChild(addButtonsContainer);

      // Add delete button if applicable (aligned to the right)
      //TODO: This requires updating the tree editor somehow
      // if (hasDelete) {
      //   const deleteButton = document.createElement('button');
      //   deleteButton.className = 'toolbar-btn';
      //   deleteButton.title = 'Delete';
      //   deleteButton.innerHTML = `<i class="codicon codicon-trash"></i> Delete`;
      //   deleteButton.style.cssText = `
      //     padding: 4px 8px;
      //     font-size: 11px;
      //     display: flex;
      //     align-items: center;
      //     gap: 4px;
      //     background-color: var(--vscode-button-background);
      //     color: var(--vscode-button-foreground);
      //   `;
      //   deleteButton.addEventListener('click', () => {
      //     if (this.onDeleteElement) {
      //       this.onDeleteElement(element);
      //     }
      //   });
      //   deleteButton.addEventListener('mouseenter', () => {
      //     deleteButton.style.backgroundColor = 'var(--vscode-statusBarItem-errorBackground)';
      //   });
      //   deleteButton.addEventListener('mouseleave', () => {
      //     deleteButton.style.backgroundColor = 'var(--vscode-button-background)';
      //   });
      //   actionsContainer.appendChild(deleteButton);
      // }

      form.appendChild(actionsContainer);
    }

    // Add properties
    properties.forEach((prop) => {
      const field = this.createPropertyField(prop);
      form.appendChild(field);
    });

    container.appendChild(form);

    // Focus on name field if requested
    if (focusNameField) {
      setTimeout(() => {
        const nameInput = container.querySelector(
          'input[data-property="name"]',
        ) as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
      }, 50);
    }
  }

  // New method to update just the header without rebuilding everything
  public updateHeaderOnly(): void {
    if (!this.currentElement || this.isUpdatingHeader) return;

    const header = document.getElementById('properties-header');
    if (header) {
      this.updateHeader(header, this.currentElement);
    }
  }

  private updateHeader(header: HTMLElement, element: any): void {
    const elementName = element.getName ? element.getName() : 'unnamed';
    const elementType = this.getElementTypeName(element);
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="codicon ${EUtils.getIconForType(elementType)}"></i>
        <span>${elementType}</span>
        <span style="color: var(--vscode-descriptionForeground);">: ${elementName}</span>
      </div>
    `;
  }

  public clear(): void {
    const container = document.getElementById('properties-container');
    if (container) {
      this.showEmptyState(container);
    }
    this.currentElement = null;
  }

  private showEmptyState(container: HTMLElement): void {
    container.innerHTML = `
            <div class="empty-state">
                <i class="codicon codicon-info"></i>
                <p>Select an element to view its properties</p>
            </div>
        `;
  }

  private createPropertyField(prop: PropertyDescriptor): HTMLElement {
    const field = document.createElement('div');
    field.className = 'property-field';

    const label = document.createElement('label');
    label.className = 'property-label';
    label.textContent = prop.label;
    field.appendChild(label);

    let input: HTMLElement;

    switch (prop.type) {
      case 'boolean':
        input = this.createBooleanInput(prop);
        break;
      case 'enum':
        input = this.createEnumInput(prop);
        break;
      case 'reference':
        input = this.createReferenceInput(prop);
        break;
      case 'multiReference':
        input = this.createMultiReferenceInput(prop);
        break;
      case 'number':
        input = this.createNumberInput(prop);
        break;
      case 'classType':
        input = this.createClassTypeInput(prop);
        break;
      case 'multiplicity':
        input = this.createMultiplicityInput(prop);
        break;
      default:
        input = this.createTextInput(prop);
    }

    field.appendChild(input);
    return field;
  }

  private createTextInput(prop: PropertyDescriptor): HTMLElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'property-input';
    input.value = prop.value || '';
    input.disabled = prop.readOnly || false;
    input.setAttribute('data-property', prop.name);

    // Use input event for real-time updates
    input.addEventListener('input', () => {
      // Update property without rebuilding the properties panel
      this.isUpdatingHeader = true;
      this.onPropertyChanged(this.currentElement, prop.name, input.value);

      // Update the header if it's a name change
      if (prop.name === 'name') {
        this.updateHeaderOnly();
      }

      this.isUpdatingHeader = false;
    });

    return input;
  }

  private createNumberInput(prop: PropertyDescriptor): HTMLElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'property-input';
    input.value = prop.value !== undefined ? prop.value.toString() : '';
    input.disabled = prop.readOnly || false;
    input.setAttribute('data-property', prop.name);

    // Use input event for real-time updates
    input.addEventListener('input', () => {
      const value = input.value ? parseInt(input.value) : undefined;
      this.isUpdatingHeader = true;
      this.onPropertyChanged(this.currentElement, prop.name, value);
      this.isUpdatingHeader = false;
    });

    return input;
  }

  private createBooleanInput(prop: PropertyDescriptor): HTMLElement {
    const container = document.createElement('div');
    container.className = 'checkbox-container';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'property-checkbox';
    input.checked = prop.value === true || prop.value === 'true';
    input.disabled = prop.readOnly || false;
    input.setAttribute('data-property', prop.name);

    // Use change event for immediate updates
    input.addEventListener('change', () => {
      this.isUpdatingHeader = true;
      
      // Special validation for containment property (Rule #6)
      if (prop.name === 'containment' && input.checked && EUtils.isEReference(this.currentElement)) {
        const ref = this.currentElement;
        const opposite = ref.getEOpposite ? ref.getEOpposite() : null;
        
        if (opposite && opposite.isContainment && opposite.isContainment()) {
          alert("Cannot set containment: opposite reference is already a containment");
          input.checked = false;
          this.isUpdatingHeader = false;
          return;
        }
      }
      
      this.onPropertyChanged(this.currentElement, prop.name, input.checked);
      this.isUpdatingHeader = false;
    });

    container.appendChild(input);
    return container;
  }

  private createEnumInput(prop: PropertyDescriptor): HTMLElement {
    const select = document.createElement('select');
    select.className = 'property-select';
    select.disabled = prop.readOnly || false;
    select.setAttribute('data-property', prop.name);

    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '(none)';
    select.appendChild(emptyOption);

    // Add options
    if (prop.options) {
      prop.options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value || option;
        optionElement.textContent = option.label || option;
        if (prop.value === option.value || prop.value === option) {
          optionElement.selected = true;
        }
        select.appendChild(optionElement);
      });
    }

    // Use change event for immediate updates
    select.addEventListener('change', () => {
      this.isUpdatingHeader = true;
      this.onPropertyChanged(
        this.currentElement,
        prop.name,
        select.value || null,
      );
      this.isUpdatingHeader = false;
    });

    return select;
  }

  private createClassTypeInput(prop: PropertyDescriptor): HTMLElement {
    const select = document.createElement('select');
    select.className = 'property-select';
    select.disabled = prop.readOnly || false;
    select.setAttribute('data-property', prop.name);

    // Check if the class has structural features
    const hasStructuralFeatures = this.currentElement && EUtils.isEClass(this.currentElement) &&
      ((this.currentElement.getEAttributes && this.currentElement.getEAttributes().size() > 0) ||
       (this.currentElement.getEReferences && this.currentElement.getEReferences().size() > 0));

    // Add options for class type (Concrete/Abstract/Interface)
    const options = [
      { value: 'concrete', label: 'Concrete' },
      { value: 'abstract', label: 'Abstract' },
      { value: 'interface', label: 'Interface', disabled: hasStructuralFeatures },
    ];

    options.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      if (option.disabled) {
        optionElement.disabled = true;
        optionElement.textContent += ' (unavailable - class has structural features)';
      }
      if (prop.value === option.value) {
        optionElement.selected = true;
      }
      select.appendChild(optionElement);
    });

    select.addEventListener('change', () => {
      const selectedValue = select.value;

      this.isUpdatingHeader = true;

      // Update both abstract and interface properties based on selection
      switch (selectedValue) {
        case 'concrete':
          this.onPropertyChanged(this.currentElement, 'abstract', false);
          this.onPropertyChanged(this.currentElement, 'interface', false);
          break;
        case 'abstract':
          this.onPropertyChanged(this.currentElement, 'abstract', true);
          this.onPropertyChanged(this.currentElement, 'interface', false);
          break;
        case 'interface':
          // This should only be reachable if the class has no structural features
          this.onPropertyChanged(this.currentElement, 'abstract', false);
          this.onPropertyChanged(this.currentElement, 'interface', true);
          break;
      }

      this.isUpdatingHeader = false;
    });

    return select;
  }

  private createMultiplicityInput(prop: PropertyDescriptor): HTMLElement {
    const container = document.createElement('div');
    container.className = 'checkbox-container';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'property-checkbox';
    input.checked = prop.value === true; // true = many-valued, false = single-valued
    input.disabled = prop.readOnly || false;
    input.setAttribute('data-property', prop.name);

    input.addEventListener('change', () => {
      // Special validation for many-to-many relationships (Rule #7)
      if (input.checked && EUtils.isEReference(this.currentElement)) {
        const ref = this.currentElement;
        const opposite = ref.getEOpposite ? ref.getEOpposite() : null;
        
        if (opposite) {
          const oppUpperBound = opposite.getUpperBound ? opposite.getUpperBound() : 1;
          if (oppUpperBound === -1) {
            alert("Cannot create many-to-many opposite relationships");
            input.checked = false;
            return;
          }
        }
      }
      
      // Update the upper bound based on checkbox state
      // Many-valued = -1, Single-valued = 1
      const upperBound = input.checked ? -1 : 1;
      this.isUpdatingHeader = true;
      this.onPropertyChanged(this.currentElement, 'upperBound', upperBound);
      this.isUpdatingHeader = false;
    });

    container.appendChild(input);
    return container;
  }

  private createReferenceInput(prop: PropertyDescriptor): HTMLElement {
    const container = document.createElement('div');
    container.className = 'reference-container';

    const select = document.createElement('select');
    select.className = 'property-select';
    select.disabled = prop.readOnly || false;
    select.setAttribute('data-property', prop.name);

    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '(none)';
    select.appendChild(emptyOption);

    // Add available references
    if (prop.options) {
      prop.options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.id;
        optionElement.textContent = option.label;
        // Fix: Check if current value matches the option
        if (
          prop.value &&
          (prop.value === option.element ||
            (prop.value.id && prop.value.id === option.id) ||
            (prop.value.getName &&
              option.element &&
              prop.value.getName() === option.element.getName()))
        ) {
          optionElement.selected = true;
        }
        select.appendChild(optionElement);
      });
    }

    select.addEventListener('change', () => {
      const selectedOption = prop.options?.find((o) => o.id === select.value);
      this.isUpdatingHeader = true;
      
      // Special validation for eOpposite property
      if (prop.name === 'eOpposite' && selectedOption && EUtils.isEReference(this.currentElement)) {
        const ref = this.currentElement;
        const newOpposite = selectedOption.element;
        
        if (newOpposite) {
          // Check for many-to-many (Rule #7)
          const refUpperBound = ref.getUpperBound ? ref.getUpperBound() : 1;
          const oppUpperBound = newOpposite.getUpperBound ? newOpposite.getUpperBound() : 1;
          
          if (refUpperBound === -1 && oppUpperBound === -1) {
            alert("Cannot create many-to-many opposite relationships");
            select.value = '';
            this.isUpdatingHeader = false;
            return;
          }
          
          // Check for double containment (Rule #6)
          const refContainment = ref.isContainment ? ref.isContainment() : false;
          const oppContainment = newOpposite.isContainment ? newOpposite.isContainment() : false;
          
          if (refContainment && oppContainment) {
            alert("Both sides of an opposite relationship cannot be containment");
            select.value = '';
            this.isUpdatingHeader = false;
            return;
          }
        }
      }
      
      this.onPropertyChanged(
        this.currentElement,
        prop.name,
        selectedOption ? selectedOption.element : null,
      );
      this.isUpdatingHeader = false;
      
      // If this is an eOpposite or eType change on a reference, refresh properties
      // to update available opposites for other references
      if (prop.name === 'eOpposite' || (prop.name === 'eType' && EUtils.isEReference(this.currentElement))) {
        setTimeout(() => {
          if (!this.isUpdatingHeader) {
            this.showProperties(this.currentElement);
          }
        }, 100);
      }
    });

    container.appendChild(select);
    return container;
  }

  private createMultiReferenceInput(prop: PropertyDescriptor): HTMLElement {
    const container = document.createElement('div');
    container.className = 'multi-reference-container';

    // Current values list
    const currentList = document.createElement('div');
    currentList.className = 'reference-list';

    if (prop.value && Array.isArray(prop.value)) {
      prop.value.forEach((item: any) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'reference-item';
        itemElement.innerHTML = `
                    <span>${item.label || item.getName() || 'unnamed'}</span>
                    <button class="remove-btn" title="Remove">
                        <i class="codicon codicon-close"></i>
                    </button>
                `;

        const removeBtn = itemElement.querySelector(
          '.remove-btn',
        ) as HTMLElement;
        removeBtn.addEventListener('click', () => {
          const newValue = prop.value.filter((v: any) => v !== item);
          this.onPropertyChanged(this.currentElement, prop.name, newValue);
          this.showProperties(this.currentElement); // Refresh
        });

        currentList.appendChild(itemElement);
      });
    }

    container.appendChild(currentList);

    // Add button
    const addContainer = document.createElement('div');
    addContainer.className = 'add-reference-container';

    const select = document.createElement('select');
    select.className = 'property-select';

    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Select to add...';
    select.appendChild(emptyOption);

    if (prop.options) {
      prop.options.forEach((option) => {
        // Only show options not already selected
        if (!prop.value || !prop.value.some((v: any) => v === option.element)) {
          const optionElement = document.createElement('option');
          optionElement.value = option.id;
          optionElement.textContent = option.label;
          select.appendChild(optionElement);
        }
      });
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.innerHTML = '<i class="codicon codicon-add"></i> Add';
    addBtn.addEventListener('click', () => {
      if (select.value) {
        const selectedOption = prop.options?.find((o) => o.id === select.value);
        if (selectedOption) {
          const newValue = [...(prop.value || []), selectedOption.element];
          this.onPropertyChanged(this.currentElement, prop.name, newValue);
          this.showProperties(this.currentElement); // Refresh
        }
      }
    });

    addContainer.appendChild(select);
    addContainer.appendChild(addBtn);
    container.appendChild(addContainer);

    return container;
  }

  // Getter to check if we're updating the header
  public get isUpdating(): boolean {
    return this.isUpdatingHeader;
  }

  private getPropertiesForElement(element: any): PropertyDescriptor[] {
    const properties: PropertyDescriptor[] = [];

    // Common properties for named elements
    if (element.getName) {
      properties.push({
        name: 'name',
        label: 'Name',
        type: 'string',
        value: element.getName(),
      });
    }

    // Type-specific properties
    if (EUtils.isEPackage(element)) {
      properties.push(
        {
          name: 'nsURI',
          label: 'Namespace URI',
          type: 'string',
          value: element.getNsURI ? element.getNsURI() : '',
        },
        {
          name: 'nsPrefix',
          label: 'Namespace Prefix',
          type: 'string',
          value: element.getNsPrefix ? element.getNsPrefix() : '',
        },
      );
    } else if (EUtils.isEClass(element)) {
      // Determine current class type based on abstract and interface values
      const isAbstract = element.isAbstract ? element.isAbstract() : false;
      const isInterface = element.isInterface ? element.isInterface() : false;

      let classType = 'concrete';
      if (isAbstract && !isInterface) {
        classType = 'abstract';
      } else if (!isAbstract && isInterface) {
        classType = 'interface';
      }

      properties.push(
        {
          name: 'classType',
          label: 'Class Type',
          type: 'classType',
          value: classType,
        },
        {
          name: 'eSuperTypes',
          label: 'Super Type',
          type: 'reference',
          value: this.getSuperType(element),
          options: this.getAvailableClasses(element),
        },
      );
    } else if (EUtils.isEAttribute(element)) {
      // Get current type for EAttribute
      const currentType = element.getEType ? element.getEType() : null;
      const upperBound = element.getUpperBound ? element.getUpperBound() : 1;
      const lowerBound = element.getLowerBound ? element.getLowerBound() : 0;

      properties.push(
        {
          name: 'eType',
          label: 'Type',
          type: 'reference',
          value: currentType,
          options: this.getAvailableDataTypes(currentType),
        },
        {
          name: 'multiplicity',
          label: 'Many-valued',
          type: 'multiplicity',
          value: upperBound === -1, // true if many-valued, false if single-valued
        },
        {
          name: 'id',
          label: 'Is ID',
          type: 'boolean',
          value: element.isId ? element.isId() : false,
        },
        {
          name: 'volatile',
          label: 'Volatile',
          type: 'boolean',
          value: element.isVolatile ? element.isVolatile() : false,
        },
        {
          name: 'transient',
          label: 'Transient',
          type: 'boolean',
          value: element.isTransient ? element.isTransient() : false,
        },
      );
    } else if (EUtils.isEReference(element)) {
      // Get current type for EReference
      const currentType = element.getEType ? element.getEType() : null;
      const upperBound = element.getUpperBound ? element.getUpperBound() : 1;
      const lowerBound = element.getLowerBound ? element.getLowerBound() : 0;

      properties.push(
        {
          name: 'eType',
          label: 'Type',
          type: 'reference',
          value: currentType,
          options: this.getAvailableClasses(null, currentType),
        },
        {
          name: 'multiplicity',
          label: 'Many-valued',
          type: 'multiplicity',
          value: upperBound === -1, // true if many-valued, false if single-valued
        },
        {
          name: 'containment',
          label: 'Containment',
          type: 'boolean',
          value: element.isContainment ? element.isContainment() : false,
        },
        {
          name: 'eOpposite',
          label: 'Opposite',
          type: 'reference',
          value: element.getEOpposite ? element.getEOpposite() : null,
          options: this.getAvailableReferences(element),
        },
        {
          name: 'volatile',
          label: 'Volatile',
          type: 'boolean',
          value: element.isVolatile ? element.isVolatile() : false,
        },
        {
          name: 'transient',
          label: 'Transient',
          type: 'boolean',
          value: element.isTransient ? element.isTransient() : false,
        },
      );
    } else if (EUtils.isEOperation(element)) {
      const upperBound = element.getUpperBound ? element.getUpperBound() : 1;
      properties.push(
        {
          name: 'eType',
          label: 'Return Type',
          type: 'reference',
          value: element.getEType ? element.getEType() : null,
          options: [
            ...this.getAvailableDataTypes(),
            ...this.getAvailableClasses(),
          ],
        },
        {
          name: 'multiplicity',
          label: 'Many-valued (Return Type)',
          type: 'multiplicity',
          value: upperBound === -1, // true if many-valued, false if single-valued
        },
      );
    } else if (EUtils.isEParameter(element)) {
      const upperBound = element.getUpperBound ? element.getUpperBound() : 1;
      const lowerBound = element.getLowerBound ? element.getLowerBound() : 0;

      properties.push(
        {
          name: 'eType',
          label: 'Type',
          type: 'reference',
          value: element.getEType ? element.getEType() : null,
          options: [
            ...this.getAvailableDataTypes(),
            ...this.getAvailableClasses(),
          ],
        },
        {
          name: 'multiplicity',
          label: 'Many-valued',
          type: 'multiplicity',
          value: upperBound === -1, // true if many-valued, false if single-valued
        },
      );
    } else if (EUtils.isEEnumLiteral(element)) {
      properties.push(
        // {
        //   name: 'literal',
        //   label: 'Literal',
        //   type: 'string',
        //   value: element.getLiteral ? element.getLiteral() : '',
        // },
        // {
        //   name: 'value',
        //   label: 'Value',
        //   type: 'number',
        //   value: element.getValue ? element.getValue() : 0,
        // },
      );
    }

    return properties;
  }

  private getAvailableClasses(excludeClass?: any, currentType?: any): any[] {
    // Get all EClasses from the tree view
    if (!this.treeView || !this.treeView.getAllClasses) {
      return [];
    }

    const allClasses = this.treeView.getAllClasses();
    const options = [];

    for (const eClass of allClasses) {
      // Skip the exclude class (to avoid self-reference in super types)
      if (excludeClass && eClass === excludeClass) {
        continue;
      }
      
      // For super type selection, check for inheritance cycles (Rule #5)
      if (excludeClass && ModelActions.wouldCreateInheritanceCycle(excludeClass, eClass)) {
        continue;
      }

      const id = `class_${Math.random().toString(36).substr(2, 9)}`;
      options.push({
        id: id,
        label: eClass.getName() || 'unnamed',
        element: eClass,
      });
    }

    return options;
  }

  private getAvailableDataTypes(currentType?: any): any[] {
    // Create Ecore primitive data types
    const primitiveTypes = [
      {
        name: 'EString',
        uri: 'http://www.eclipse.org/emf/2002/Ecore#//EString',
      },
      { name: 'EInt', uri: 'http://www.eclipse.org/emf/2002/Ecore#//EInt' },
      {
        name: 'EBoolean',
        uri: 'http://www.eclipse.org/emf/2002/Ecore#//EBoolean',
      },
      {
        name: 'EDouble',
        uri: 'http://www.eclipse.org/emf/2002/Ecore#//EDouble',
      },
      { name: 'EFloat', uri: 'http://www.eclipse.org/emf/2002/Ecore#//EFloat' },
      { name: 'EDate', uri: 'http://www.eclipse.org/emf/2002/Ecore#//EDate' },
    ];

    return primitiveTypes.map((type) => {
      // Create a pseudo-type object that has getName method
      const typeElement = {
        getName: () => type.name,
        eResource: () => null,
        eURI: () => type.uri,
      };

      return {
        id: type.name,
        label: type.name,
        element: typeElement,
      };
    });
  }

  private getAvailableReferences(currentRef: any): any[] {
    // Get the type of the current reference
    const refType = currentRef.getEType ? currentRef.getEType() : null;
    if (!refType) return [];

    // Get all classes from the model
    if (!this.treeView || !this.treeView.getAllClasses) {
      return [];
    }

    const allClasses = this.treeView.getAllClasses();
    const options = [];

    // Find all references that could be opposites
    for (const eClass of allClasses) {
      const references = eClass.getEReferences();
      for (let i = 0; i < references.size(); i++) {
        const ref = references.get(i);
        // Skip self
        if (ref === currentRef) continue;

        // Check if this reference's type matches our containing class
        const otherRefType = ref.getEType ? ref.getEType() : null;
        const ourContainingClass = currentRef.getEContainingClass
          ? currentRef.getEContainingClass()
          : null;

        if (otherRefType === ourContainingClass && eClass === refType) {
          const id = `ref_${Math.random().toString(36).substr(2, 9)}`;
          options.push({
            id: id,
            label: `${eClass.getName()}.${ref.getName()}`,
            element: ref,
          });
        }
      }
    }

    return options;
  }

  private getSuperType(eClass: any): any {
    if (!eClass.getESuperTypes) return null;
    const superTypes = eClass.getESuperTypes();
    // Return the first super type or null if none
    return superTypes.size() > 0 ? superTypes.get(0) : null;
  }

  private getElementTypeName(element: any): string {
    const className = element.constructor.name;
    return className.replace(/Impl$/, '');
  }
}