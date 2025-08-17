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
          {
            label: 'Add Operation',
            icon: EUtils.getIconForType('EOperation'),
            type: 'addOperation',
          },
        );
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
    if (elementType !== 'root') {
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

    return actions;
  }

  /**
   * Execute an action on an element
   * Returns the newly created element (if any) and a status message
   */
  public static executeAction(
    element: any,
    actionType: string,
    parent?: any
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
        return this.deleteElement(element, parent);
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
    
    eClass.getEStructuralFeatures().add(attr);
    attr.setEContainingClass(eClass);

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
    
    // For containment references, set resolveProxies to false by default
    if (ref.setResolveProxies) {
      ref.setResolveProxies(false);
    }
    
    eClass.getEStructuralFeatures().add(ref);
    ref.setEContainingClass(eClass);

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
    eClass.getEOperations().add(op);
    op.setEContainingClass(eClass);

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
    operation.getEParameters().add(param);

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
    eEnum.getELiterals().add(literal);
    literal.setEEnum(eEnum);

    return {
      newElement: literal,
      message: `Created new literal: ${name} (rename in properties panel)`,
      shouldFocusName: true,
    };
  }

  private static deleteElement(element: any, parent?: any): {
    message: string;
  } {
    if (!parent) {
      parent = this.findParent(element);
    }

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
    } else if (EUtils.isEClass(element) || EUtils.isEEnum(element)) {
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
    } else if (EUtils.isEEnumLiteral(element)) {
      if (parent.getELiterals) {
        parent.getELiterals().remove(element);
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
}