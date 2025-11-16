---
title: AST Symbol Extractor
type: analyzer
category: extraction
status: active
canonical: true
source: src/analyzer/ASTSymbolExtractor.ts
---

# [[ASTSymbolExtractor]]

> **Component**: Extractor | **Category**: Symbol Extraction | **Type**: Primary Analyzer

Extract all symbols from TypeScript source code using AST, independent of JSDoc presence.

## Purpose

**Problem**: Need to extract all TypeScript symbols (classes, functions, interfaces, etc.) from source code
**Solution**: AST-based extraction using TypeScript Compiler API
**Context**: Foundation for all relationship analysis and documentation tracking

## Implementation

**Source**: `src/analyzer/ASTSymbolExtractor.ts`

**Class**: `ASTSymbolExtractor`
- Visitor Pattern: Traverses TypeScript AST
- No external dependencies (standalone extractor)

**Key Methods**:
```typescript
extract(filePath: string, sourceCode: string): ExtractionResult
visitNode(node: ts.Node, parent?: ts.Node): void
buildRelationshipsFromImports(): void
```

## Functionality

### 1. Symbol Extraction

**Supported Symbol Types**:
- Classes (`class Foo`)
- Interfaces (`interface Bar`)
- Functions (`function baz()`)
- Methods (`class.method()`)
- Properties (`class.property`)
- Type Aliases (`type Foo = ...`)
- Enums (`enum Status`)
- Constants (`const FOO = ...`)
- Variables (`let foo`, `var bar`)

### 2. Metadata Collection

**Per Symbol**:
```typescript
{
  name: string;              // Symbol name
  kind: SymbolKind;          // class | function | etc.
  filePath: string;          // Source file path
  lineNumber: number;        // Start line
  endLine: number;           // End line
  parentSymbol?: string;     // For methods/properties
  summary?: string;          // JSDoc summary (if present)
  declaredType?: string;     // Explicit type
  inferredType?: string;     // Inferred type
  genericParams?: string[];  // <T, U>
  parameterTypes?: Array<{   // Function parameters
    name: string;
    type?: string;
  }>;
  isConstant?: boolean;      // const declaration
  literalValue?: string;     // Constant value
  valueType?: string;        // Primitive type
}
```

### 3. Relationship Extraction

**Import Dependencies**:
```typescript
// Detects: import A from B
{
  from: string;          // Importing file
  imported: string[];    // Imported symbols
  modulePath: string;    // Source module
}
```

**Builds Relationships**:
- Code dependencies (import/export)
- Inheritance (extends)
- Interface implementation (implements)
- Type dependencies (parameters, returns)

### 4. AST Traversal

**Visitor Pattern**:
```typescript
visitNode(node: ts.Node, parent?: ts.Node) {
  // Dispatch based on node type
  switch (node.kind) {
    case ts.SyntaxKind.ClassDeclaration:
      this.extractClass(node);
      break;
    case ts.SyntaxKind.FunctionDeclaration:
      this.extractFunction(node);
      break;
    // ... etc
  }

  // Recurse to children
  ts.forEachChild(node, child =>
    this.visitNode(child, node)
  );
}
```

## Data Structures

### ExtractedSymbol

See implementation: [[ExtractedSymbol]]

**Extends**: [[Symbol]] (omits: id, tests, designDecisions)

**Additional Properties**:
- `parentSymbol`: Parent symbol reference (optional)
- `summary`: Symbol summary from TSDoc
- `declaredType`: Explicitly declared type
- `inferredType`: TypeScript inferred type
- `genericParams`: Generic type parameters
- `parameterTypes`: Parameter type information
- `isConstant`: Whether variable is constant
- `literalValue`: Literal value for constants
- `valueType`: Value type classification

### ExtractionResult

See implementation: [[ExtractionResult]]

**Structure**:
- `symbols`: Array of [[ExtractedSymbol]]
- `relationships`: Array of [[SymbolRelationship]]
- `imports`: Import statements information

## Usage

**Direct Usage**:
```typescript
import { ASTSymbolExtractor } from './analyzer/ASTSymbolExtractor';

const extractor = new ASTSymbolExtractor();
const result = extractor.extract(filePath, sourceCode);

console.log(result.symbols.length);        // e.g., 42 symbols
console.log(result.relationships.length);  // e.g., 18 relationships
console.log(result.imports.length);        // e.g., 5 import statements
```

**Via Command**:
```bash
# Extract symbols from directory
tsdoc-edge build src

# Parse single file
tsdoc-edge parse src/commands/BuildCommand.ts
```

## Integration

**Used By**:
- [[BuildCommand]] (`src/commands/BuildCommand.ts`) - Primary user
- [[ParseCommand]] (`src/commands/ParseCommand.ts`) - Single file parsing
- [[Code Dependency]] (`managed/relationships/CODE-DEPENDENCY.md`) - Import extraction
- [[Inheritance]] (`managed/relationships/INHERITANCE.md`) - Extends detection
- [[Interface Implementation]] (`managed/relationships/INTERFACE-IMPL.md`) - Implements detection

**Uses**:
- TypeScript Compiler API (`ts.createSourceFile`, `ts.forEachChild`)
- [[TSDocParser]] (`src/parser/TSDocParser.ts`) - JSDoc parsing (optional)

**Produces**:
- [[ExtractionResult]] (`managed/primary-types/ExtractionResult.md`)
- Symbols for [[SymbolGraphBuilder]] (`src/graph/SymbolGraph.ts`)
- Relationships for [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

## Example Output

**Extracted Symbol** (Class):
```json
{
  "name": "BuildCommand",
  "kind": "class",
  "filePath": "src/commands/BuildCommand.ts",
  "lineNumber": 15,
  "endLine": 120,
  "summary": "Extract all symbols and relationships from source code",
  "declaredType": "Command",
  "genericParams": [],
  "parameterTypes": []
}
```

**Extracted Symbol** (Method):
```json
{
  "name": "execute",
  "kind": "function",
  "filePath": "src/commands/BuildCommand.ts",
  "lineNumber": 42,
  "endLine": 80,
  "parentSymbol": "BuildCommand",
  "declaredType": "Promise<void>",
  "parameterTypes": [
    { "name": "directory", "type": "string" }
  ]
}
```

**Relationship** (Import):
```json
{
  "source": "BuildCommand",
  "target": "ASTSymbolExtractor",
  "type": "code-dependency",
  "metadata": {
    "importType": "named",
    "modulePath": "../analyzer/ASTSymbolExtractor"
  }
}
```

## Statistics

**Current System** (as of 2025-11-08):
- **Total Symbols**: 1,511 symbols
- **Files Analyzed**: 126 files
- **Code Dependencies**: 1,968 relationships
- **Inheritance**: 57 relationships

**Performance**:
- Single file: ~10-20ms
- Full build (126 files): ~2-3 seconds
- Memory: ~50MB for full codebase

## Extraction Capabilities

### 1. Complete Coverage
- All symbols extracted (not just documented ones)
- No JSDoc requirement
- Includes private/internal symbols

### 2. Type Information
- Declared types from annotations
- Inferred types from TypeScript
- Generic type parameters
- Parameter and return types

### 3. Structural Relationships
- Import/export dependencies
- Class hierarchy (extends)
- Interface implementation
- Type usage

### 4. Location Tracking
- File path
- Line numbers (start, end)
- Parent symbols (for nested declarations)

## Limitations

**Current**:
- No runtime information (static analysis only)
- Cannot detect dynamic imports (`import()`)
- Limited to TypeScript syntax
- No value-level analysis (beyond constants)

**Future Enhancements**:
- Dynamic import detection
- Runtime type tracking
- Cross-file type inference
- Semantic analysis (beyond syntax)

## Related

**Relationships**:
- [[Code Dependency]] (`managed/relationships/CODE-DEPENDENCY.md`) - Import extraction
- [[Inheritance]] (`managed/relationships/INHERITANCE.md`) - Class hierarchy
- [[Interface Implementation]] (`managed/relationships/INTERFACE-IMPL.md`)

**Commands**:
- [[BuildCommand]] (`src/commands/BuildCommand.ts`) - Primary user
- [[ParseCommand]] (`src/commands/ParseCommand.ts`) - Single file

**Analyzers**:
- [[CallGraphAnalyzer]] (`managed/analyzers/CallGraphAnalyzer.md`) - Uses extracted symbols
- [[IODependencyAnalyzer]] (`managed/analyzers/IODependencyAnalyzer.md`) - Uses type info

**Types**:
- [[ExtractionResult]] (`managed/primary-types/ExtractionResult.md`)

**Core**:
- [[SymbolGraphBuilder]] (`src/graph/SymbolGraph.ts`) - Storage target
- [[DatabaseManager]] (`src/storage/DatabaseManager.ts`) - Persistence

---

**Last Updated**: 2025-11-08
**Responsibility**: Extract all symbols from TypeScript AST
**Status**: ✅ Active - 1,511 symbols extracted from 126 files

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:23
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:35
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:79
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:131
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:170
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:194
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:221
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:332
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:333
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:334
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:335
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:336
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:337
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:338
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:264
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:265
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:266
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:37
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:38
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:39
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:217
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:281
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:282
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:29
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:386
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:387
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:51
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:78
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:79
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:80
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:81
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:82
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:83
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:84
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:85
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:36
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:37
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:38
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:39
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:40
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:41
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:222
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:223
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:224
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:225
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:226
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:227
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:73
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:161
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:162
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:38
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:123
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:261
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:262
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:263
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:264
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:27
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:116
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:243
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:274
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:275
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:276
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:277
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:278
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:279
- [[CLI Command Development Guide]] → /home/user/tsdoc-edge/managed/guides/command-development-guide.md:265
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:32
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:213
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:366
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:405
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:406
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:407
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:408
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:409
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:410
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:25
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:260
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:326
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:351
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:352
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:353
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:354
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:355
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:356
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:33
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:34
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:35
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:72
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:89
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:106
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:107
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:108
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:109
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:110
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:111
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:112
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:113
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:114
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:115
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:31
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:207
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:208
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:8
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:24
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:25
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:26
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:27
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:28
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:29
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:30
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:31
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:8
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:22
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:23
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:24
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:25
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:26
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:27
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:28
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:29
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:10
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:55
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:56
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:57
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:58
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:59
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:60
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:61
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:62
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:21
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:29
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:37
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:178
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:211
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:212
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:213
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:214
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:215
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:216
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:217
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:218
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:69
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:91
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:92
- [[FileScanner]] → /home/user/tsdoc-edge/managed/utilities/FileScanner.md:67
- [[FileScanner]] → /home/user/tsdoc-edge/managed/utilities/FileScanner.md:76
- [[FileScanner]] → /home/user/tsdoc-edge/managed/utilities/FileScanner.md:77
- [[String Utilities]] → /home/user/tsdoc-edge/managed/utilities/StringUtilities.md:56
- [[String Utilities]] → /home/user/tsdoc-edge/managed/utilities/StringUtilities.md:75
- [[String Utilities]] → /home/user/tsdoc-edge/managed/utilities/StringUtilities.md:76
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:105
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:106
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:107
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:108
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:109
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:110

