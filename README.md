# TMF Ecore Editor for VSCode

<!-- [![VSCode Marketplace](https://img.shields.io/visual-studio-marketplace/v/tripsnek.tmf-ecore-editor)](https://marketplace.visualstudio.com/items?itemName=tripsnek.tmf-ecore-editor) -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A visual editor for creating and editing Ecore metamodels in VSCode, designed for the TypeScript Modeling Framework (TMF) [[github](https://github.com/tripsnek/tmf) • [npm](https://www.npmjs.com/package/@tripsnek/tmf)]. TMF is a lightweight port of the Eclipse Modeling Framework, bringing its code generation and model introspection capabilities to TypeScript.

## Features

- **Visual Model Editing** - Create and edit .ecore files through an intuitive tree-based + properties sheet interface 
- **TypeScript Code Generation** - Generate type-safe code with one click
- **Core EMF Support** - Packages, classes, enums, attributes, operations, enums, and (most notably) references with notions of containment and bi-directionality that are enforced by generated code at runtime. 

## A Quick Demo video

[https://github.com/user-attachments/assets/ee35ca1a-24d5-4a43-8926-96dffecd8d0e](https://github.com/user-attachments/assets/208731e7-e674-45d6-af5b-6426763feed9)

Quick demonstration of adding types/features to an ecore model and generating code in a full stack reflective application, which can be downloaded from the [tmf-examples](https://github.com/tripsnek/tmf-examples) repository (specifically the [NX Angular/Node example](https://github.com/tripsnek/tmf-examples/tree/main/angular-node-nx)).

## Quick Start

1. **Install TMF**
     - `npm install @tripsnek/tmf`

2. **Install the Extension**
   - Search for "TMF Ecore Editor" in VSCode Extensions
   - Install and reload VSCode

3. **Create Your Model**
   - Create a new `.ecore` file (an empty file will do, editor will initialize it)
   - Use the tree view to add model elements
   - Configure properties in the right panel

4. **Generate TypeScript Code**
   - Click the "Generate Code" button
   - [optional] Choose output directory and generation options
   - Import and use the generated classes in your frontend, backend or (best of all) both ([example TMF-based full stack workspaces here](https://github.com/tripsnek/tmf-examples)).

## Understanding EMF Concepts

### Core Elements

**EPackage** - The root container for your model, defines namespace and contains classifiers

**EClass** - Represents a class in your model. Can be:
- *Concrete* - Standard instantiable class
- *Abstract* - Cannot be instantiated directly
- *Interface* - Defines contract without implementation

**EAttribute** - Simple typed properties (String, Int, Boolean, etc.)

**EReference** - Relationships between classes, with two key concepts:
- *Containment* - Parent-child relationship where child lifecycle is managed by parent
- *Opposite* - Bidirectional relationship that TMF keeps synchronized automatically. Use these only when you know both ends will be serialized as part of the same containment hierarchy or ["aggregate"](https://en.wikipedia.org/wiki/Domain-driven_design#aggregate_root) - the bundle of data that goes between your server and client all at once.

**EOperation** - Methods on your classes with parameters and return types

**EEnum** - Enumeration types with literal values

### EMF Data Types

When defining attributes and operation parameters, you can use these built-in Ecore data types:

**Primitive Types**
- `EString` - Text values (TypeScript: `string`)
- `EInt|EDouble|EFloat` - Numeric values with no distinction in TS (TypeScript: `number`)
- `EBoolean` - True/false values (TypeScript: `boolean`)
- `EDate` - Date/time values (TypeScript: `Date`)

**Classifier Types**
- `EClass` - References to other classes in your model
- `EEnum` - Your custom enumerations become TypeScript enums

**Type Modifiers**
- **Multiplicity**: Single-valued or Many-valued
- **ID**: Marks an attribute as the unique identifier
- **Transient**: Not persisted when serializing

### Key Modeling Patterns

**Containment Hierarchies**  
When a reference has `containment=true`, the referenced objects become children:
```typescript
// Blog contains Posts - deleting the Blog deletes all Posts, they serialize as one unit, etc.
blog.getPosts().add(post); // Post is now contained by Blog
```

**Inverse References**  
When references have opposites, TMF maintains both sides automatically:
```typescript
// Setting one side...
blog.getPosts().add(post);
// ...automatically sets the other
console.log(post.getBlog() === blog); // true!
```

**Multiplicity**  
- Single-valued: One-to-one relationship
- Many-valued: One-to-many relationship (uses TMF's EList collections)

## Generated Code Structure

The extension generates three layers of TypeScript code:

### 1. API Layer
Pure interfaces defining your model's contract:
```typescript
export interface Blog extends EObject {
  getTitle(): string;
  getPosts(): EList<Post>;
  // ...
}
```

This layer also includes:
 - A `*-package.ts` file for each package, which defines every element in the model.
 - A `*-factory.ts` file for each package, which allows reflective instantiation of any type.

### 2. Generated Layer (`gen/`)
Abstract base classes with EMF infrastructure - **DO NOT EDIT THESE**:
- Getters/setters
- Reflection support
- Containment/Inverse reference maintenance

### 3. Implementation Layer (`impl/`)
Concrete classes you can customize - **safe to edit**:
```typescript
export class BlogImpl extends BlogImplGen implements Blog {

  // Implement any operations you defined for your eclass in Ecore
  myBlogOperation(): void {
   //do something interesting
  }

  // Or add any other custom business logic that isn't exposed at the interface level
  validate(): boolean {
    return this.getTitle() !== null;
  }
    
}
```

## Editor Interface

### Tree View (Left Panel)
- **Right-click** any element for context menu (Add/Delete actions)
- **Icons** indicate element types
- **Arrow notation** shows inheritance (Class → SuperClass)
- **Brackets** show multiplicity and types (e.g., `posts : Post[*]`)

### Properties Panel (Right)
- **Name** - Element identifier
- **Type** - Data type or class reference
- **Multiplicity** - Single or many-valued
- **Containment** - Parent-child relationship
- **Opposite** - Bidirectional reference
- **Modifiers** - ID, Volatile, Transient, Derived

## Keyboard Shortcuts

- `Arrow Keys` - Navigate tree
- `Enter` - Expand/collapse node
- `Delete` - Remove selected element
- `Ctrl+S` - Save model

## Example Model

You don't have to know anything about EMF's ECore XMI format. Just create an empty .ecore file and the editor will initialize it. But here is an example anyway:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage name="blog" nsURI="http://example.com/blog">
  <eClassifiers xsi:type="ecore:EClass" name="Blog">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="title" 
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="publishDate" 
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EDate"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="posts" 
        upperBound="-1" eType="#//Post" containment="true" eOpposite="#//Post/blog"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Post">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="id" 
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EInt" iD="true"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="blog" 
        eType="#//Blog" eOpposite="#//Blog/posts"/>
  </eClassifiers>
</ecore:EPackage>
```

## Resources

- [TMF npm package](https://www.npmjs.com/package/@tripsnek/tmf) - The installable TMF npm library
- [TMF Github](https://github.com/tripsnek/tmf) - The TMF source code
- [TMF Examples](https://github.com/tripsnek/tmf-examples) - Sample full stack applications with NPM/NX workspaces, Node backends and Angular/React front ends.
- [Eclipse EMF](https://eclipse.dev/emf/docs.html) - Original EMF documentation
- [TripSnek](https://tripsnek.com/) - Real world application built on TMF, a travel itinerary optimizer.

## Support

- **Issues**: [GitHub Issues](https://github.com/tripsnek/tmf-ecore-editor/issues)

## License

MIT - See [LICENSE](LICENSE) for details.
