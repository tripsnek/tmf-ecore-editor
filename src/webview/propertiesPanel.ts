interface PropertyDescriptor {
    name: string;
    label: string;
    type: 'string' | 'boolean' | 'number' | 'enum' | 'reference' | 'multiReference';
    value: any;
    options?: any[];
    readOnly?: boolean;
}

export class PropertiesPanel {
    private currentElement: any = null;
    private onPropertyChanged: (element: any, property: string, value: any) => void;
    private treeView: any; // Reference to tree view for getting all classes

    constructor(onPropertyChanged: (element: any, property: string, value: any) => void) {
        this.onPropertyChanged = onPropertyChanged;
    }

    public setTreeView(treeView: any): void {
        this.treeView = treeView;
    }

    public showProperties(element: any): void {
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

        // Add element type header
        const header = document.createElement('div');
        header.className = 'properties-header';
        header.innerHTML = `
            <i class="codicon ${this.getIconForElement(element)}"></i>
            <span>${this.getElementTypeName(element)}</span>
        `;
        form.appendChild(header);

        // Add properties
        properties.forEach(prop => {
            const field = this.createPropertyField(prop);
            form.appendChild(field);
        });

        container.appendChild(form);
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
        
        input.addEventListener('change', () => {
            this.onPropertyChanged(this.currentElement, prop.name, input.value);
        });
        
        return input;
    }

    private createNumberInput(prop: PropertyDescriptor): HTMLElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'property-input';
        input.value = prop.value !== undefined ? prop.value.toString() : '';
        input.disabled = prop.readOnly || false;
        
        input.addEventListener('change', () => {
            const value = input.value ? parseInt(input.value) : undefined;
            this.onPropertyChanged(this.currentElement, prop.name, value);
        });
        
        return input;
    }

    private createBooleanInput(prop: PropertyDescriptor): HTMLElement {
        const container = document.createElement('div');
        container.className = 'checkbox-container';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'property-checkbox';
        // Fix: Ensure boolean value is properly checked
        input.checked = prop.value === true || prop.value === 'true';
        input.disabled = prop.readOnly || false;
        
        input.addEventListener('change', () => {
            this.onPropertyChanged(this.currentElement, prop.name, input.checked);
        });
        
        container.appendChild(input);
        return container;
    }

    private createEnumInput(prop: PropertyDescriptor): HTMLElement {
        const select = document.createElement('select');
        select.className = 'property-select';
        select.disabled = prop.readOnly || false;
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '(none)';
        select.appendChild(emptyOption);
        
        // Add options
        if (prop.options) {
            prop.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value || option;
                optionElement.textContent = option.label || option;
                if (prop.value === option.value || prop.value === option) {
                    optionElement.selected = true;
                }
                select.appendChild(optionElement);
            });
        }
        
        select.addEventListener('change', () => {
            this.onPropertyChanged(this.currentElement, prop.name, select.value || null);
        });
        
        return select;
    }

    private createReferenceInput(prop: PropertyDescriptor): HTMLElement {
        const container = document.createElement('div');
        container.className = 'reference-container';
        
        const select = document.createElement('select');
        select.className = 'property-select';
        select.disabled = prop.readOnly || false;
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '(none)';
        select.appendChild(emptyOption);
        
        // Add available references
        if (prop.options) {
            prop.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.id;
                optionElement.textContent = option.label;
                // Fix: Check if current value matches the option
                if (prop.value && (
                    (prop.value === option.element) ||
                    (prop.value.id && prop.value.id === option.id) ||
                    (prop.value.getName && option.element && prop.value.getName() === option.element.getName())
                )) {
                    optionElement.selected = true;
                }
                select.appendChild(optionElement);
            });
        }
        
        select.addEventListener('change', () => {
            const selectedOption = prop.options?.find(o => o.id === select.value);
            this.onPropertyChanged(this.currentElement, prop.name, selectedOption ? selectedOption.element : null);
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
                
                const removeBtn = itemElement.querySelector('.remove-btn') as HTMLElement;
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
            prop.options.forEach(option => {
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
                const selectedOption = prop.options?.find(o => o.id === select.value);
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

    private getPropertiesForElement(element: any): PropertyDescriptor[] {
        const properties: PropertyDescriptor[] = [];
        
        // Common properties for named elements
        if (element.getName) {
            properties.push({
                name: 'name',
                label: 'Name',
                type: 'string',
                value: element.getName()
            });
        }

        // Type-specific properties
        if (this.isEPackage(element)) {
            properties.push(
                {
                    name: 'nsURI',
                    label: 'Namespace URI',
                    type: 'string',
                    value: element.getNsURI ? element.getNsURI() : ''
                },
                {
                    name: 'nsPrefix',
                    label: 'Namespace Prefix',
                    type: 'string',
                    value: element.getNsPrefix ? element.getNsPrefix() : ''
                }
            );
        } else if (this.isEClass(element)) {
            properties.push(
                {
                    name: 'abstract',
                    label: 'Abstract',
                    type: 'boolean',
                    value: element.isAbstract ? element.isAbstract() : false
                },
                {
                    name: 'interface',
                    label: 'Interface',
                    type: 'boolean',
                    value: element.isInterface ? element.isInterface() : false
                },
                {
                    name: 'eSuperTypes',
                    label: 'Super Type',
                    type: 'reference',
                    value: this.getSuperType(element),
                    options: this.getAvailableClasses(element)
                }
            );
        } else if (this.isEAttribute(element)) {
    // Get current type for EAttribute
    const currentType = element.getEType ? element.getEType() : null;
    
    properties.push(
        {
            name: 'eType',
            label: 'Type',
            type: 'reference',
            value: currentType,
            options: this.getAvailableDataTypes(currentType)
        },
        {
            name: 'lowerBound',
            label: 'Lower Bound',
            type: 'number',
            value: element.getLowerBound ? element.getLowerBound() : 0
        },
        {
            name: 'upperBound',
            label: 'Upper Bound',
            type: 'number',
            value: element.getUpperBound ? element.getUpperBound() : 1
        },
        // {
        //     name: 'defaultValue',
        //     label: 'Default Value',
        //     type: 'string',
        //     value: element.getDefaultValue ? element.getDefaultValue() : ''
        // },
        {
            name: 'id',
            label: 'Is ID',
            type: 'boolean',
            value: element.isId ? element.isId() : false
        },
        // {
        //     name: 'changeable',
        //     label: 'Changeable',
        //     type: 'boolean',
        //     value: element.isChangeable ? element.isChangeable() : true
        // },
        {
            name: 'volatile',
            label: 'Volatile',
            type: 'boolean',
            value: element.isVolatile ? element.isVolatile() : false
        },
        {
            name: 'transient',
            label: 'Transient',
            type: 'boolean',
            value: element.isTransient ? element.isTransient() : false
        },
        // {
        //     name: 'unsettable',
        //     label: 'Unsettable',
        //     type: 'boolean',
        //     value: element.isUnsettable ? element.isUnsettable() : false
        // },
        // {
        //     name: 'derived',
        //     label: 'Derived',
        //     type: 'boolean',
        //     value: element.isDerived ? element.isDerived() : false
        // }
    );
} else if (this.isEReference(element)) {
    // Get current type for EReference
    const currentType = element.getEType ? element.getEType() : null;
    
    properties.push(
        {
            name: 'eType',
            label: 'Type',
            type: 'reference',
            value: currentType,
            options: this.getAvailableClasses(null, currentType)
        },
        {
            name: 'lowerBound',
            label: 'Lower Bound',
            type: 'number',
            value: element.getLowerBound ? element.getLowerBound() : 0
        },
        {
            name: 'upperBound',
            label: 'Upper Bound',
            type: 'number',
            value: element.getUpperBound ? element.getUpperBound() : 1
        },
        {
            name: 'containment',
            label: 'Containment',
            type: 'boolean',
            value: element.isContainment ? element.isContainment() : false
        },
        // {
        //     name: 'resolveProxies',
        //     label: 'Resolve Proxies',
        //     type: 'boolean',
        //     value: element.isResolveProxies ? element.isResolveProxies() : true
        // },
        {
            name: 'eOpposite',
            label: 'Opposite',
            type: 'reference',
            value: element.getEOpposite ? element.getEOpposite() : null,
            options: this.getAvailableReferences(element)
        },
        // {
        //     name: 'changeable',
        //     label: 'Changeable',
        //     type: 'boolean',
        //     value: element.isChangeable ? element.isChangeable() : true
        // },
        {
            name: 'volatile',
            label: 'Volatile',
            type: 'boolean',
            value: element.isVolatile ? element.isVolatile() : false
        },
        {
            name: 'transient',
            label: 'Transient',
            type: 'boolean',
            value: element.isTransient ? element.isTransient() : false
        },
        // {
        //     name: 'unsettable',
        //     label: 'Unsettable',
        //     type: 'boolean',
        //     value: element.isUnsettable ? element.isUnsettable() : false
        // },
        // {
        //     name: 'derived',
        //     label: 'Derived',
        //     type: 'boolean',
        //     value: element.isDerived ? element.isDerived() : false
        // }
    );
} else if (this.isEOperation(element)) {
            properties.push(
                {
                    name: 'eType',
                    label: 'Return Type',
                    type: 'reference',
                    value: element.getEType ? element.getEType() : null,
                    options: [...this.getAvailableDataTypes(), ...this.getAvailableClasses()]
                }
            );
        } else if (this.isEParameter(element)) {
            properties.push(
                {
                    name: 'eType',
                    label: 'Type',
                    type: 'reference',
                    value: element.getEType ? element.getEType() : null,
                    options: [...this.getAvailableDataTypes(), ...this.getAvailableClasses()]
                },
                {
                    name: 'lowerBound',
                    label: 'Lower Bound',
                    type: 'number',
                    value: element.getLowerBound ? element.getLowerBound() : 0
                },
                {
                    name: 'upperBound',
                    label: 'Upper Bound',
                    type: 'number',
                    value: element.getUpperBound ? element.getUpperBound() : 1
                }
            );
        } else if (this.isEEnumLiteral(element)) {
            properties.push(
                {
                    name: 'literal',
                    label: 'Literal',
                    type: 'string',
                    value: element.getLiteral ? element.getLiteral() : ''
                },
                {
                    name: 'value',
                    label: 'Value',
                    type: 'number',
                    value: element.getValue ? element.getValue() : 0
                }
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
            
            const id = `class_${Math.random().toString(36).substr(2, 9)}`;
            options.push({
                id: id,
                label: eClass.getName() || 'unnamed',
                element: eClass
            });
        }
        
        return options;
    }

    private getAvailableDataTypes(currentType?: any): any[] {
        // Create Ecore primitive data types
        const primitiveTypes = [
            { name: 'EString', uri: 'http://www.eclipse.org/emf/2002/Ecore#//EString' },
            { name: 'EInt', uri: 'http://www.eclipse.org/emf/2002/Ecore#//EInt' },
            { name: 'EBoolean', uri: 'http://www.eclipse.org/emf/2002/Ecore#//EBoolean' },
            { name: 'EDouble', uri: 'http://www.eclipse.org/emf/2002/Ecore#//EDouble' },
            { name: 'EFloat', uri: 'http://www.eclipse.org/emf/2002/Ecore#//EFloat' },
            { name: 'EDate', uri: 'http://www.eclipse.org/emf/2002/Ecore#//EDate' }
        ];
        
        return primitiveTypes.map(type => {
            // Create a pseudo-type object that has getName method
            const typeElement = {
                getName: () => type.name,
                eResource: () => null,
                eURI: () => type.uri
            };
            
            return {
                id: type.name,
                label: type.name,
                element: typeElement
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
                const ourContainingClass = currentRef.getEContainingClass ? currentRef.getEContainingClass() : null;
                
                if (otherRefType === ourContainingClass && eClass === refType) {
                    const id = `ref_${Math.random().toString(36).substr(2, 9)}`;
                    options.push({
                        id: id,
                        label: `${eClass.getName()}.${ref.getName()}`,
                        element: ref
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

    private getIconForElement(element: any): string {
        const typeName = this.getElementTypeName(element);
        const icons: {[key: string]: string} = {
            'EPackage': 'codicon-folder',
            'EClass': 'codicon-symbol-class',
            'EEnum': 'codicon-symbol-enum',
            'EAttribute': 'codicon-symbol-field',
            'EReference': 'codicon-references',
            'EOperation': 'codicon-symbol-method',
            'EParameter': 'codicon-symbol-parameter',
            'EEnumLiteral': 'codicon-symbol-constant'
        };
        return icons[typeName] || 'codicon-circle-outline';
    }

    // Type checking helpers
    private isEPackage(element: any): boolean {
        return element && element.constructor.name.includes('Package');
    }

    private isEClass(element: any): boolean {
        return element && element.constructor.name.includes('EClass');
    }

    private isEAttribute(element: any): boolean {
        return element && element.constructor.name.includes('EAttribute');
    }

    private isEReference(element: any): boolean {
        return element && element.constructor.name.includes('EReference');
    }

    private isEOperation(element: any): boolean {
        return element && element.constructor.name.includes('EOperation');
    }

    private isEParameter(element: any): boolean {
        return element && element.constructor.name.includes('EParameter');
    }

    private isEEnumLiteral(element: any): boolean {
        return element && element.constructor.name.includes('EEnumLiteral');
    }
}