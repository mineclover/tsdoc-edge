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

**ExtractedSymbol**:
```typescript
interface ExtractedSymbol extends Omit<Symbol, 'id' | 'tests' | 'designDecisions'> {
  parentSymbol?: string;
  summary?: string;
  declaredType?: string;
  inferredType?: string;
  genericParams?: string[];
  parameterTypes?: Array<{ name: string; type?: string }>;
  isConstant?: boolean;
  literalValue?: string;
  valueType?: string;
}
```

**ExtractionResult**:
```typescript
interface ExtractionResult {
  symbols: ExtractedSymbol[];
  relationships: SymbolRelationship[];
  imports: Array<{
    from: string;
    imported: string[];
    modulePath: string;
  }>;
}
```

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

- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:256
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:27
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:217
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:29
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:51
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:62
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:63
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:29
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:30
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:212
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:213
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:73
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:38
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:123
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:27
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:116
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:243
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:25
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:139
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:278
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:25
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:260
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:326
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:31
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:72
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:89
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:104
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:105
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:31
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:8
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:18
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:19
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:8
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:18
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:19
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:10
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:47
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:48
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:17
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:25
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:33
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:159
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:69
- [[FileScanner]] → /home/user/tsdoc-edge/managed/utilities/FileScanner.md:67
- [[String Utilities]] → /home/user/tsdoc-edge/managed/utilities/StringUtilities.md:56
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:97
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:98

