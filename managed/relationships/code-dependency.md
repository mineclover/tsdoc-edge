---
title: Code Dependency
type: relationship
category: structural
status: implemented
implementation-progress: 100%
relationships-count: 1968
---

# [[Code Dependency]]

> **Type**: `code-dependency`
> **Category**: Structural (Code Space)
> **Status**: ✅ Fully Implemented
> **Detection Method**: Static AST Analysis

## Purpose

Track explicit import/export dependencies between modules to understand the structural foundation of the codebase.

## Pattern

```typescript
// File A imports from File B
import { Foo } from './B';
import Bar from './B';
import * as Baz from './B';

// Creates relationship:
// type: 'code-dependency'
// from: Symbol in File A
// to: Foo | Bar | namespace Baz
```

## Implementation

### Extractor

**File**: `src/analyzer/ASTSymbolExtractor.ts`
**Lines**: 216-246 (extractImport), 251-276 (extractReExport)

```typescript
private extractImport(node: ts.ImportDeclaration): void {
  const moduleSpecifier = node.moduleSpecifier;
  if (!ts.isStringLiteral(moduleSpecifier)) return;

  const modulePath = moduleSpecifier.text;
  const imported: string[] = [];

  if (node.importClause) {
    // Default import
    if (node.importClause.name) {
      imported.push(node.importClause.name.text);
    }

    // Named imports
    if (node.importClause.namedBindings) {
      if (ts.isNamedImports(node.importClause.namedBindings)) {
        for (const element of node.importClause.namedBindings.elements) {
          imported.push(element.name.text);
        }
      }
    }
  }

  this.imports.push({ from: this.currentFilePath, imported, modulePath });
}
```

### Storage

**File**: `src/commands/BuildCommand.ts`
**Lines**: 185-249

Relationships are stored in both:
1. **Legacy table**: `dependencies` (for backward compatibility)
2. **Unified table**: `unified_relationships` (new system)

```typescript
// Map to unified type
let unifiedType = 'code-dependency';
let category = 'structural';

if (relationship.type === 'dependsOn') {
  unifiedType = 'code-dependency';
  category = 'structural';
}

// Insert into unified_relationships
dbManager.insertUnifiedRelationship({
  id: `${unifiedType}-${fromId}-${toId}`,
  type: unifiedType,
  category: category,
  fromSymbols: [fromId],
  toSymbols: [toId],
  direction: 'unidirectional',
  strength: 'strong',
  evidence: [{ type: 'code', source: relationship.filePath, confidence: 1.0 }],
  discoveredBy: 'static-analysis',
  confidence: 1.0,
  // ...
});
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'code-dependency'` | Fixed value |
| `category` | `'structural'` | Fixed value |
| `direction` | `'unidirectional'` | A imports B (one-way) |
| `strength` | `'strong'` | Explicit dependency |
| `confidence` | `1.0` | 100% certain (direct AST evidence) |
| `discoveredBy` | `'static-analysis'` | AST parsing |
| `evidence.type` | `'code'` | Source code evidence |

## Commands

### Build

```bash
# Initial extraction during build
tsdoc-edge build src

# Extracts all import statements and creates code-dependency relationships
```

### Query

```bash
# Find what a symbol depends on
tsdoc-edge deps <symbol-id>

# Find what depends on a symbol
tsdoc-edge who-uses <symbol-id>
```

## Relationship to Other Types

### Enables

- **[[IO Dependency]]**: Code structure helps infer data flow
  - If `A` imports `B`, and `A` has function returning `TypeX`, and `B` has function accepting `TypeX`, an IO dependency is inferred.

### Used By

- **[[Circular Dependency]]**: Detection algorithm
  - Circular detection traverses code-dependency graph to find cycles

## Statistics

**Current Count**: 1,968 relationships (as of 2025-11-07)

```bash
# Verify count
sqlite3 .tsdoc/symbols.db \
  "SELECT COUNT(*) FROM unified_relationships WHERE type='code-dependency'"
```

**Most Common Patterns**:
1. Utility imports: `import { ... } from '../utils/...'`
2. Type imports: `import type { ... } from '../types/...'`
3. Cross-module imports: `import { ... } from '../module/...'`

## Example

### Source Code

```typescript
// src/commands/BuildCommand.ts
import { ASTSymbolExtractor } from '../analyzer/ASTSymbolExtractor';
import { DatabaseManager } from '../storage/DatabaseManager';
```

### Generated Relationships

```json
[
  {
    "id": "code-dependency-class-buildcommand-class-astsymbolextractor",
    "type": "code-dependency",
    "category": "structural",
    "from": "class-buildcommand",
    "to": "class-astsymbolextractor",
    "direction": "unidirectional",
    "strength": "strong",
    "confidence": 1.0,
    "discoveredBy": "static-analysis",
    "filePath": "src/commands/BuildCommand.ts",
    "description": "BuildCommand imports ASTSymbolExtractor"
  },
  {
    "id": "code-dependency-class-buildcommand-class-databasemanager",
    "type": "code-dependency",
    "from": "class-buildcommand",
    "to": "class-databasemanager",
    // ...
  }
]
```

## Limitations

1. **Dynamic imports not tracked**: `import()` expressions are not detected
2. **External modules skipped**: Only local file imports are tracked
3. **Symbol-level granularity**: Tracks file-level imports, not which specific function uses what

## Future Enhancements

- [ ] Track dynamic `import()` statements
- [ ] Detect unused imports
- [ ] Calculate import coupling metrics
- [ ] Suggest import refactoring

## Related Checkpoints

- [[Relationship Types]]: Parent index
- [[Inheritance]]: Related structural relationship
- [[Interface Implementation]]: Related structural relationship
- [[IO Dependency]]: Derived from code dependencies

---

**Implementation File**: `src/analyzer/ASTSymbolExtractor.ts:216-246`
**Command**: `build`
**Database Column**: `unified_relationships.type = 'code-dependency'`
