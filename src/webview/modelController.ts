import {
  EPackage,
  EClass,
  EEnum,
  EAttribute,
  EReference,
  EOperation,
  EParameter,
} from "@tripsnek/tmf";
import { EUtils } from "./eUtils";

/**
 * Controller for managing Ecore model operations
 */
export class ModelController {
  private rootPackage: EPackage | null = null;
  private undoStack: any[] = [];
  private redoStack: any[] = [];

  public setRootPackage(pkg: EPackage): void {
    this.rootPackage = pkg;
    this.undoStack = [];
    this.redoStack = [];
  }

  public getRootPackage(): EPackage | null {
    return this.rootPackage;
  }

  /**
   * Update a property on an element
   */
public updateProperty(element: any, property: string, value: any): void {
    // Save state for undo
    this.saveState();

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
          element.setInterface(value);
        }
        break;

      case "containment":
        if (element.setContainment) {
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
          element.setEType(value);
        }
        break;

      case "eOpposite":
        if (element.setEOpposite) {
          element.setEOpposite(value);
          // Also set the reverse reference
          if (value && value.setEOpposite) {
            value.setEOpposite(element);
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

      case "resolveProxies":
        if (element.setResolveProxies) {
          element.setResolveProxies(value);
        }
        break;

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

  /**
   * Add a new EClass to a package
   */
  public addClass(pkg: EPackage, name: string = "NewClass"): EClass {
    this.saveState();

    // Create new EClass instance
    // Note: The actual creation depends on the TMF implementation
    // This is a simplified version
    const eClass = this.createEClass(name);
    pkg.getEClassifiers().add(eClass);
    eClass.setEPackage(pkg);

    return eClass;
  }

  /**
   * Add a new EEnum to a package
   */
  public addEnum(pkg: EPackage, name: string = "NewEnum"): EEnum {
    this.saveState();

    const eEnum = this.createEEnum(name);
    pkg.getEClassifiers().add(eEnum);
    eEnum.setEPackage(pkg);

    return eEnum;
  }

  /**
   * Add a new sub-package
   */
  public addSubPackage(
    parentPkg: EPackage,
    name: string = "NewPackage"
  ): EPackage {
    this.saveState();

    const subPkg = this.createEPackage(name);
    parentPkg.getESubPackages().add(subPkg);
    subPkg.setESuperPackage(parentPkg);

    return subPkg;
  }

  /**
   * Add an attribute to a class
   */
  public addAttribute(
    eClass: EClass,
    name: string = "newAttribute"
  ): EAttribute {
    this.saveState();

    const attr = this.createEAttribute(name);
    eClass.getEStructuralFeatures().add(attr);
    attr.setEContainingClass(eClass);

    return attr;
  }

  /**
   * Add a reference to a class
   */
  public addReference(
    eClass: EClass,
    name: string = "newReference"
  ): EReference {
    this.saveState();

    const ref = this.createEReference(name);
    eClass.getEStructuralFeatures().add(ref);
    ref.setEContainingClass(eClass);

    return ref;
  }

  /**
   * Add an operation to a class
   */
  public addOperation(
    eClass: EClass,
    name: string = "newOperation"
  ): EOperation {
    this.saveState();

    const op = this.createEOperation(name);
    eClass.getEOperations().add(op);
    op.setEContainingClass(eClass);

    return op;
  }

  /**
   * Add a parameter to an operation
   */
  public addParameter(
    operation: EOperation,
    name: string = "param"
  ): EParameter {
    this.saveState();

    const param = this.createEParameter(name);
    operation.getEParameters().add(param);

    return param;
  }

  /**
   * Delete an element from the model
   */
  public deleteElement(element: any): void {
    this.saveState();

    const parent = element.eContainer();

    if (!parent) return;

    // Remove from parent based on type
    if (EUtils.isEPackage(element)) {
      if (parent.getESubPackages) {
        this.removeFromList(parent.getESubPackages(), element);
      }
    } else if (EUtils.isEClass(element) || EUtils.isEEnum(element)) {
      if (parent.getEClassifiers) {
        this.removeFromList(parent.getEClassifiers(), element);
      }
    } else if (EUtils.isEAttribute(element) || EUtils.isEReference(element)) {
      if (parent.getEStructuralFeatures) {
        this.removeFromList(parent.getEStructuralFeatures(), element);
      }
    } else if (EUtils.isEOperation(element)) {
      if (parent.getEOperations) {
        this.removeFromList(parent.getEOperations(), element);
      }
    } else if (EUtils.isEParameter(element)) {
      if (parent.getEParameters) {
        this.removeFromList(parent.getEParameters(), element);
      }
    }
  }

  /**
   * Find all EClasses in the model
   */
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

  /**
   * Find all EEnums in the model
   */
  public getAllEnums(): EEnum[] {
    const enums: EEnum[] = [];
    if (!this.rootPackage) return enums;

    this.collectEnumsFromPackage(this.rootPackage, enums);
    return enums;
  }

  private collectEnumsFromPackage(pkg: EPackage, enums: EEnum[]): void {
    const classifiers = pkg.getEClassifiers();
    for (let i = 0; i < classifiers.size(); i++) {
      const classifier = classifiers.get(i);
      if (EUtils.isEEnum(classifier)) {
        enums.push(classifier as EEnum);
      }
    }

    const subPackages = pkg.getESubPackages();
    for (let i = 0; i < subPackages.size(); i++) {
      this.collectEnumsFromPackage(subPackages.get(i), enums);
    }
  }

  private removeFromList(list: any, element: any): void {
    list.remove(element);
  }

  private saveState(): void {
    // TODO: Implement state saving for undo/redo
    // This would involve serializing the current model state
  }

  public undo(): void {
    // TODO: Implement undo
    if (this.undoStack.length > 0) {
      const state = this.undoStack.pop();
      // Restore state
    }
  }

  public redo(): void {
    // TODO: Implement redo
    if (this.redoStack.length > 0) {
      const state = this.redoStack.pop();
      // Restore state
    }
  }

  // Factory methods for creating model elements
  // These would need to be implemented based on the actual TMF API

  private createEPackage(name: string): EPackage {
    // This is a placeholder - actual implementation depends on TMF
    const pkg = {} as EPackage;
    if (pkg.setName) pkg.setName(name);
    return pkg;
  }

  private createEClass(name: string): EClass {
    // This is a placeholder - actual implementation depends on TMF
    const eClass = {} as EClass;
    if (eClass.setName) eClass.setName(name);
    return eClass;
  }

  private createEEnum(name: string): EEnum {
    // This is a placeholder - actual implementation depends on TMF
    const eEnum = {} as EEnum;
    if (eEnum.setName) eEnum.setName(name);
    return eEnum;
  }

  private createEAttribute(name: string): EAttribute {
    // This is a placeholder - actual implementation depends on TMF
    const attr = {} as EAttribute;
    if (attr.setName) attr.setName(name);
    return attr;
  }

  private createEReference(name: string): EReference {
    // This is a placeholder - actual implementation depends on TMF
    const ref = {} as EReference;
    if (ref.setName) ref.setName(name);
    return ref;
  }

  private createEOperation(name: string): EOperation {
    // This is a placeholder - actual implementation depends on TMF
    const op = {} as EOperation;
    if (op.setName) op.setName(name);
    return op;
  }

  private createEParameter(name: string): EParameter {
    // This is a placeholder - actual implementation depends on TMF
    const param = {} as EParameter;
    if (param.setName) param.setName(name);
    return param;
  }


}
