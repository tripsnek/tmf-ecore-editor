export class EUtils{
  // Type checking helpers
  public static isEPackage(element: any): boolean {
    return element && element.constructor.name.includes("Package");
  }

  public static isEClass(element: any): boolean {
    return element && element.constructor.name.includes("EClass");
  }

  public static isEEnum(element: any): boolean {
    return element && element.constructor.name.includes("EEnum");
  }

  public static isEAttribute(element: any): boolean {
    return element && element.constructor.name.includes("EAttribute");
  }

  public static isEReference(element: any): boolean {
    return element && element.constructor.name.includes("EReference");
  }

  public static isEOperation(element: any): boolean {
    return element && element.constructor.name.includes("EOperation");
  }

  public static isEParameter(element: any): boolean {
    return element && element.constructor.name.includes("EParameter");
  }

  public static isEEnumLiteral(element: any): boolean {
    return element && element.constructor.name.includes("EEnumLiteral");
  }
}