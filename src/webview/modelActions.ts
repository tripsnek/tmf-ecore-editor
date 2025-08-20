import {
  EPackage,
  EClass,
  EEnum,
  EAttribute,
  EReference,
  EOperation,
  EParameter,
  EClassImpl,
  EPackageImpl,
  EEnumImpl,
  EAttributeImpl,
  EReferenceImpl,
  EOperationImpl,
  EParameterImpl,
  EEnumLiteralImpl,
  EObject,
} from '@tripsnek/tmf';
import { EUtils } from './eUtils';

export interface ModelAction {
  label: string;
  icon: string;
  type: string;
  danger?: boolean;
}

export class ModelActions {
  // Counters for generating unique default names
  private static classCounter = 0;
  private static enumCounter = 0;
  private static packageCounter = 0;
  private static attributeCounter = 0;
  private static referenceCounter = 0;
  private static operationCounter = 0;
  private static parameterCounter = 0;
  private static literalCounter = 0;

  /**
   * Reset all counters (should be called when loading a new model)
   */
  public static resetCounters(): void {
    this.classCounter = 0;
    this.enumCounter = 0;
    this.packageCounter = 0;
    this.attributeCounter = 0;
    this.referenceCounter = 0;
    this.operationCounter = 0;
    this.parameterCounter = 0;
    this.literalCounter = 0;
  }

  /**
   * Get available actions for an element
   */
  public static getActionsForElement(element: any): ModelAction[] {
    const actions: ModelAction[] = [];
    const elementType = this.getElementTypeName(element);

    switch (elementType) {
      case 'EPackage':
        actions.push(
          {
            label: 'Add Class',
            icon: EUtils.getIconForType('EClass'),
            type: 'addClass',
          },
          {
            label: 'Add Enum',
            icon: EUtils.getIconForType('EEnum'),
            type: 'addEnum',
          },
          {
            label: 'Add Sub-Package',
            icon: EUtils.getIconForType('EPackage'),
            type: 'addSubPackage',
          },
        );
        break;
      case 'EClass':
        // Check if it's an interface - interfaces can only have operations
        const isInterface = element.isInterface ? element.isInterface() : false;
        
        if (!isInterface) {
          actions.push(
            {
              label: 'Add Attribute',
              icon: EUtils.getIconForType('EAttribute'),
              type: 'addAttribute',
            },
            {
              label: 'Add Reference',
              icon: EUtils.getIconForType('EReference'),
              type: 'addReference',
            },
          );
        }
        
        // Operations can be added to both interfaces and regular classes
        actions.push({
          label: 'Add Operation',
          icon: EUtils.getIconForType('EOperation'),
          type: 'addOperation',
        });
        break;
      case 'EOperation':
        actions.push({
          label: 'Add Parameter',
          icon: EUtils.getIconForType('EParameter'),
          type: 'addParameter',
        });
        break;
      case 'EEnum':
        actions.push({
          label: 'Add Literal',
          icon: EUtils.getIconForType('EEnumLiteral'),
          type: 'addLiteral',
        });
        break;
    }

    // Add delete action for non-root elements
    if (elementType !== 'root' && elementType !=='Unknown' ) {

      //no delete option for root package
      if (!(element instanceof EPackageImpl && !element.eContainer())) {
        if (actions.length > 0) {
          actions.push({ label: '-', icon: '', type: 'separator' });
        }
        actions.push({
          label: 'Delete',
          icon: 'codicon-trash',
          type: 'delete',
          danger: true,
        });
      }
    }

    return actions;
  }

  /**
   * Execute an action on an element
   * Returns the newly created element (if any) and a status message
   */
  public static executeAction(
    element: any,
    actionType: string
  ): { newElement?: any; message: string; shouldFocusName?: boolean } {
    switch (actionType) {
      case 'addClass':
        return this.addEClass(element);
      case 'addEnum':
        return this.addEEnum(element);
      case 'addSubPackage':
        return this.addSubPackage(element);
      case 'addAttribute':
        return this.addAttribute(element);
      case 'addReference':
        return this.addReference(element);
      case 'addOperation':
        return this.addOperation(element);
      case 'addParameter':
        return this.addParameter(element);
      case 'addLiteral':
        return this.addEnumLiteral(element);
      case 'delete':
        return this.deleteElement(element);
      default:
        return { message: `Unknown action: ${actionType}` };
    }
  }

  private static addEClass(pkg: EPackage): {
    newElement: EClass;
    message: string;
    shouldFocusName: boolean;
  } {
    const name = `Class${++this.classCounter}`;
    const eClass = new EClassImpl();
    eClass.setName(name);

    //TODO: Would not have to do both if model was source generated
    pkg.getEClassifiers().add(eClass);
    eClass.setEPackage(pkg);

    return {
      newElement: eClass,
      message: `Created new class: ${name} (rename in properties panel)`,
      shouldFocusName: true,
    };
  }

  private static addEEnum(pkg: EPackage): {
    newElement: EEnum;
    message: string;
    shouldFocusName: boolean;
  } {
    const name = `Enum${++this.enumCounter}`;
    const eEnum = new EEnumImpl();
    eEnum.setName(name);

    //TODO: Would not have to do both if model was source generated
    pkg.getEClassifiers().add(eEnum);
    eEnum.setEPackage(pkg);

    return {
      newElement: eEnum,
      message: `Created new enum: ${name} (rename in properties panel)`,
      shouldFocusName: true,
    };
  }

  private static addSubPackage(parentPkg: EPackage): {
    newElement: EPackage;
    message: string;
    shouldFocusName: boolean;
  } {
    const name = `package${++this.packageCounter}`;
    const subPkg = new EPackageImpl(name, `http://www.example.org/${name}`);
    subPkg.setNsPrefix(name);

    //TODO: Would not have to do both if model was source generated
    parentPkg.getESubPackages().add(subPkg);
    subPkg.setESuperPackage(parentPkg);

    return {
      newElement: subPkg,
      message: `Created new package: ${name} (rename in properties panel)`,
      shouldFocusName: true,
    };
  }

  private static addAttribute(eClass: EClass): {
    newElement: EAttribute;
    message: string;
    shouldFocusName: boolean;
  } {
    const name = `attribute${++this.attributeCounter}`;
    const attr = new EAttributeImpl();
    attr.setName(name);

    // Set common defaults
    if (attr.setLowerBound) attr.setLowerBound(1);
    if (attr.setUpperBound) attr.setUpperBound(1);

    //TODO: Would not have to do both if model was source generated
    eClass.getEStructuralFeatures().add(attr);
    attr.setEContainingClass(eClass);

    (eClass as EClassImpl).recomputeAllLists();

    return {
      newElement: attr,
      message: `Created new attribute: ${name} (configure in properties panel)`,
      shouldFocusName: true,
    };
  }

  private static addReference(eClass: EClass): {
    newElement: EReference;
    message: string;
    shouldFocusName: boolean;
  } {
    const name = `reference${++this.referenceCounter}`;
    const ref = new EReferenceImpl();
    ref.setName(name);

    // Set common defaults
    if (ref.setLowerBound) ref.setLowerBound(1);
    if (ref.setUpperBound) ref.setUpperBound(1);

    // For containment references, set resolveProxies to false by default
    // if (ref.setResolveProxies) {
    //   ref.setResolveProxies(false);
    // }

    //TODO: Would not have to do both if model was source generated
    eClass.getEStructuralFeatures().add(ref);
    ref.setEContainingClass(eClass);

    (eClass as EClassImpl).recomputeAllLists();

    return {
      newElement: ref,
      message: `Created new reference: ${name} (configure in properties panel)`,
      shouldFocusName: true,
    };
  }

  private static addOperation(eClass: EClass): {
    newElement: EOperation;
    message: string;
    shouldFocusName: boolean;
  } {
    const name = `operation${++this.operationCounter}`;
    const op = new EOperationImpl();
    op.setName(name);

    //TODO: Would not have to do both if model was source generated
    eClass.getEOperations().add(op);
    op.setEContainingClass(eClass);

    (eClass as EClassImpl).recomputeAllLists();

    return {
      newElement: op,
      message: `Created new operation: ${name} (configure in properties panel)`,
      shouldFocusName: true,
    };
  }

  private static addParameter(operation: EOperation): {
    newElement: EParameter;
    message: string;
    shouldFocusName: boolean;
  } {
    const name = `param${++this.parameterCounter}`;
    const param = new EParameterImpl();
    param.setName(name);

    //TODO: Would not have to do both if model was source generated
    operation.getEParameters().add(param);
    param.setEOperation(operation);

    return {
      newElement: param,
      message: `Created new parameter: ${name} (configure in properties panel)`,
      shouldFocusName: true,
    };
  }

  private static addEnumLiteral(eEnum: EEnum): {
    newElement: any;
    message: string;
    shouldFocusName: boolean;
  } {
    const name = `LITERAL_${++this.literalCounter}`;
    const literal = new EEnumLiteralImpl();
    literal.setName(name);
    literal.setLiteral(name);
    literal.setValue(eEnum.getELiterals().size());

    //TODO: Would not have to do both if model was source generated
    eEnum.getELiterals().add(literal);
    literal.setEEnum(eEnum);

    return {
      newElement: literal,
      message: `Created new literal: ${name} (rename in properties panel)`,
      shouldFocusName: true,
    };
  }

  private static deleteElement(
    element: any
  ): {
    message: string;
  } {

    const parent = element.eContainer();
    if (!parent) {
      return { message: 'Cannot delete: parent not found' };
    }

    const elementName = element.getName ? element.getName() : 'unnamed';
    const elementType = this.getElementTypeName(element);

    // Remove from model based on type
    if (EUtils.isEPackage(element)) {
      if (parent.getESubPackages) {
        parent.getESubPackages().remove(element);
      }
    } 
    else if (EUtils.isEEnumLiteral(element)) {
      if (parent.getELiterals) {
        parent.getELiterals().remove(element);
      }
    }
    else if (EUtils.isEClass(element) || EUtils.isEEnum(element)) {
      if (parent.getEClassifiers) {
        parent.getEClassifiers().remove(element);
      }
    } else if (EUtils.isEAttribute(element) || EUtils.isEReference(element)) {
      if (parent.getEStructuralFeatures) {
        parent.getEStructuralFeatures().remove(element);
      }
    } else if (EUtils.isEOperation(element)) {
      if (parent.getEOperations) {
        parent.getEOperations().remove(element);
      }
    } else if (EUtils.isEParameter(element)) {
      if (parent.getEParameters) {
        parent.getEParameters().remove(element);
      }
    } 

    return { message: `Deleted ${elementType}: ${elementName}` };
  }

  /**
   * Find the parent of an element
   */
  public static findParent(element: any, rootPackage?: EPackage): any {
    // Use eContainer if available
    if (element.eContainer) {
      return element.eContainer();
    }

    // If rootPackage provided, search the model
    if (rootPackage) {
      return this.searchForParent(rootPackage, element);
    }

    return null;
  }

  private static searchForParent(current: any, target: any): any {
    // Check packages
    if (current.getESubPackages) {
      const subPackages = current.getESubPackages();
      for (let i = 0; i < subPackages.size(); i++) {
        if (subPackages.get(i) === target) return current;
        const found = this.searchForParent(subPackages.get(i), target);
        if (found) return found;
      }
    }

    // Check classifiers
    if (current.getEClassifiers) {
      const classifiers = current.getEClassifiers();
      for (let i = 0; i < classifiers.size(); i++) {
        const classifier = classifiers.get(i);
        if (classifier === target) return current;

        // Check class contents
        if (EUtils.isEClass(classifier)) {
          const eClass = classifier as EClass;

          // Check structural features
          const features = eClass.getEStructuralFeatures();
          for (let j = 0; j < features.size(); j++) {
            if (features.get(j) === target) return eClass;
          }

          // Check operations
          const operations = eClass.getEOperations();
          for (let j = 0; j < operations.size(); j++) {
            const op = operations.get(j);
            if (op === target) return eClass;

            // Check parameters
            const params = op.getEParameters();
            for (let k = 0; k < params.size(); k++) {
              if (params.get(k) === target) return op;
            }
          }
        } else if (EUtils.isEEnum(classifier)) {
          const eEnum = classifier as EEnum;
          const literals = eEnum.getELiterals();
          for (let j = 0; j < literals.size(); j++) {
            if (literals.get(j) === target) return eEnum;
          }
        }
      }
    }

    return null;
  }

  private static getElementTypeName(element: any): string {
    if (!element) return 'Unknown';
    const className = element.constructor.name;
    return className.replace(/Impl$/, '');
  }

  /**
   * Validate if setting an opposite would create an invalid state
   */
  public static validateOppositeSettings(
    reference: EReference,
    oppositeReference: EReference | null,
    checkContainment: boolean = false
  ): { valid: boolean; message?: string } {
    if (!oppositeReference) {
      return { valid: true };
    }

    // Check for many-to-many relationships (Rule #7)
    const refUpperBound = reference.getUpperBound ? reference.getUpperBound() : 1;
    const oppUpperBound = oppositeReference.getUpperBound ? oppositeReference.getUpperBound() : 1;
    
    if (refUpperBound === -1 && oppUpperBound === -1) {
      return { 
        valid: false, 
        message: "Cannot create many-to-many opposite relationships" 
      };
    }

    // Check for double containment (Rule #6)
    if (checkContainment) {
      const refContainment = reference.isContainment ? reference.isContainment() : false;
      const oppContainment = oppositeReference.isContainment ? oppositeReference.isContainment() : false;
      
      if (refContainment && oppContainment) {
        return { 
          valid: false, 
          message: "Both sides of an opposite relationship cannot be containment" 
        };
      }
    }

    return { valid: true };
  }

  /**
   * Update a property on an element
   */
  public static updateProperty(element: any, property: string, value: any): void {

    // Update the property based on its name
    switch (property) {
      case "name":
        if (element.setName) {
          element.setName(value);
        }
        break;

      case "nsURI":
        if (element.setNsURI) {
          element.setNsURI(value);
        }
        break;

      case "nsPrefix":
        if (element.setNsPrefix) {
          element.setNsPrefix(value);
        }
        break;

      case "abstract":
        if (element.setAbstract) {
          element.setAbstract(value);
        }
        break;

      case "interface":
        if (element.setInterface) {
          // Validate: cannot change to interface if it has structural features (Rule #8)
          if (value === true && EUtils.isEClass(element)) {
            const eClass = element as EClass;
            const attributes = eClass.getEAttributes();
            const references = eClass.getEReferences();
            
            if ((attributes && attributes.size() > 0) || (references && references.size() > 0)) {
              throw new Error("Cannot change class with structural features to an interface");
            }
          }
          element.setInterface(value);
        }
        break;

      case "containment":
        if (element.setContainment) {
          // Validate containment rules when setting to true
          if (value === true && EUtils.isEReference(element)) {
            const ref = element as EReference;
            const opposite = ref.getEOpposite ? ref.getEOpposite() : null;
            
            if (opposite && opposite.isContainment && opposite.isContainment()) {
              throw new Error("Cannot set containment: opposite reference is already a containment");
            }
          }
          element.setContainment(value);
        }
        break;

      case "id":
        if (element.setId) {
          element.setId(value);
        }
        break;

      case "derived":
        if (element.setDerived) {
          element.setDerived(value);
        }
        break;

      case "transient":
        if (element.setTransient) {
          element.setTransient(value);
        }
        break;

      case "lowerBound":
        if (element.setLowerBound) {
          element.setLowerBound(value);
        }
        break;

      case "upperBound":
        if (element.setUpperBound) {
          element.setUpperBound(value);
        }
        break;

      case "eType":
        if (element.setEType) {
          // If this is a reference and we're changing the type, clear any opposite relationship (Rule #4)
          ModelActions.maybeClearEOppositesWhenETypeChanged(element);
          
          element.setEType(value);
        }
        break;

      case "eOpposite":
        if (element.setEOpposite) {
          const ref = element as EReference;
          const oldOpposite = ref.getEOpposite ? ref.getEOpposite() : null;
          
          // Clear old opposite if it exists (Rule #3)
          if (oldOpposite && oldOpposite.setEOpposite) {
            oldOpposite.setEOpposite(null);
          }
          
          // Validate new opposite if not null
          if (value) {
            const validation = this.validateOppositeSettings(ref, value, true);
            if (!validation.valid) {
              throw new Error(validation.message);
            }
            
            // Set the new opposite on both sides
            element.setEOpposite(value);
            if (value.setEOpposite) {
              value.setEOpposite(element);
            }
          } else {
            // Setting to null (Rule #3)
            element.setEOpposite(null);
          }
        }
        break;

      case "eSuperTypes":
        // Handle super types - can be either a single value or an array
        if (element.getESuperTypes) {
          const superTypes = element.getESuperTypes();
          superTypes.clear();
          
          // Handle both single value and array
          if (value) {
            if (Array.isArray(value)) {
              // If it's an array, add all elements
              value.forEach((superType: any) => {
                superTypes.add(superType);
              });
            } else {
              // If it's a single element, add just that one
              superTypes.add(value);
            }
          }
          // If value is null or undefined, the list remains cleared
        }
        break;

      case "literal":
        if (element.setLiteral) {
          element.setLiteral(value);
        }
        break;

      case "value":
        if (element.setValue) {
          element.setValue(value);
        }
        break;
        
      case "unsettable":
        if (element.setUnsettable) {
          element.setUnsettable(value);
        }
        break;

      // case "resolveProxies":
      //   if (element.setResolveProxies) {
      //     element.setResolveProxies(value);
      //   }
      //   break;

      case "changeable":
        if (element.setChangeable) {
          element.setChangeable(value);
        }
        break;

      case "volatile":
        if (element.setVolatile) {
          element.setVolatile(value);
        }
        break;

      case "defaultValue":
        if (element.setDefaultValue) {
          element.setDefaultValue(value);
        }
        break;
    }
  }

  private static maybeClearEOppositesWhenETypeChanged(element: any) {
    if (EUtils.isEReference(element)) {
      const ref = element as EReference;
      const oldOpposite = ref.getEOpposite ? ref.getEOpposite() : null;

      if (oldOpposite) {
        // Clear both sides of the opposite relationship
        if (oldOpposite.setEOpposite) {
          oldOpposite.setEOpposite(null);
        }
        if (ref.setEOpposite) {
          ref.setEOpposite(null);
        }
      }
    }
  }

  /**
   * Check if setting a super type would create an inheritance cycle (Rule #5)
   */
  public static wouldCreateInheritanceCycle(
    eClass: EClass,
    potentialSuperType: EClass
  ): boolean {
    if (!potentialSuperType) return false;
    if (eClass === potentialSuperType) return true;
    
    // Check if potentialSuperType is already a subtype of eClass
    return this.isSubtypeOf(potentialSuperType, eClass);
  }

  private static isSubtypeOf(potentialSubtype: EClass, potentialSupertype: EClass): boolean {
    if (!potentialSubtype || !potentialSupertype) return false;
    if (potentialSubtype === potentialSupertype) return true;
    
    const superTypes = potentialSubtype.getESuperTypes();
    if (!superTypes) return false;
    
    for (let i = 0; i < superTypes.size(); i++) {
      const superType = superTypes.get(i);
      if (this.isSubtypeOf(superType, potentialSupertype)) {
        return true;
      }
    }
    
    return false;
  }
}