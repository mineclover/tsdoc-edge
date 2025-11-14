---
title: EnhancedDocExtractor
type: parser
category: documentation
status: active
canonical: true
aliases: [Enhanced Doc Extractor]
---

# [[EnhancedDocExtractor]]

> **Extracts enhanced documentation** from TypeScript source files using AST + TSDoc custom tags

Also known as: **Enhanced Doc Extractor**

## Purpose

Automatically extract `EnhancedSymbolDoc` from TypeScript source code, eliminating manual documentation creation.

**Problem**: Manual creation of structured documentation (6-category system) is tedious and error-prone.

**Solution**: Parse custom TSDoc tags from source code and automatically generate `EnhancedSymbolDoc` objects.

**Responsibility**: Extract EnhancedSymbolDoc from TypeScript files using AST traversal + TSDoc parsing.

## Input

### Constructor Parameters

```typescript
interface ExtractionOptions {
  autoGenerateIds?: boolean;      // Default: true
  includePartial?: boolean;       // Default: true
  defaultVersion?: string;        // Default: "1.0.0"
}
```

- `autoGenerateIds: boolean` - Generate IDs automatically if not specified in tags
- `includePartial: boolean` - Include incomplete documentation (missing categories)
- `defaultVersion: string` - Default version for new documentation

### extractFromFile() Parameters

- `filePath: string` - Source file path (e.g., `src/commands/BuildCommand.ts`)
- `sourceCode: string` - TypeScript source code content

### Constraints

- **Input must be valid TypeScript** - Syntax errors will cause extraction to fail
- **TSDoc comments must follow spec** - Malformed comments skipped
- **Custom tags required** - Standard TSDoc comments not enough

## Output

### Return Value

`ExtractedEnhancedDoc[]`:
```typescript
interface ExtractedEnhancedDoc {
  symbol: Symbol;              // Base symbol information
  doc: EnhancedSymbolDoc;      // Enhanced documentation (may be partial)
  completeness: number;        // 0-100 score
  missing: string[];           // Missing required fields
}
```

### Success Case

```typescript
[
  {
    symbol: {
      id: "BuildCommand",
      name: "BuildCommand",
      kind: "class",
      filePath: "src/commands/BuildCommand.ts"
    },
    doc: {
      symbolId: "BuildCommand",
      problemSolving: {
        description: "Extract all symbols from TypeScript source",
        context: "Need automated symbol extraction"
      },
      functionality: {
        mainFeatures: ["AST traversal", "Symbol extraction"],
        components: ["ASTSymbolExtractor", "DatabaseManager"]
      },
      // ... other categories
    },
    completeness: 85,
    missing: ["errorExperiences", "futurePlans"]
  }
]
```

### Partial Documentation

```typescript
{
  completeness: 45,
  missing: [
    "problemSolving.context",
    "functionality.components",
    "decisions",
    "futurePlans"
  ]
}
```

## Context

### Dependencies

- **TypeScript Compiler API** (`typescript`) - AST parsing
- **TSDoc** (`@microsoft/tsdoc`) - Comment parsing
- `Symbol` type (`src/types/graph.ts`)
- `EnhancedSymbolDoc` type (`src/types/tags.ts`)

### Environment

- Node.js ≥ 16.x
- TypeScript ≥ 4.5
- Valid TypeScript source code

### Custom Tags Supported

**6-Category System**:
1. **Problem Solving**: `@problem`, `@solves`, `@context`, `@useCase`
2. **Functionality**: `@functionality`, `@mainFeature`, `@component`
3. **Error Experiences**: `@errorExp`, `@errorType`, `@errorMessage`, `@errorSolution`
4. **Decisions**: `@decision`, `@rationale`, `@consequences`, `@alternatives`
5. **Dependencies**: `@depends`, `@depType`, `@depReason`
6. **Future Plans**: `@todo`, `@priority`, `@enhancement`

## Logic

### Algorithm

**Extraction Flow**:

1. **Parse Source File**
   ```typescript
   const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
   ```

2. **Traverse AST**
   - Visit all nodes recursively
   - Identify exportable symbols (classes, functions, interfaces)
   - Skip class members (handled separately)

3. **Extract TSDoc Comments**
   - Get JSDoc comment for each symbol
   - Parse with `@microsoft/tsdoc` parser
   - Extract custom tags

4. **Build EnhancedSymbolDoc**
   - Map custom tags to 6 categories
   - Generate IDs if `autoGenerateIds: true`
   - Validate required fields

5. **Calculate Completeness**
   - Check all 6 categories
   - Score: `100 - (missing categories / 6) * 100`
   - Track missing fields

6. **Return Results**
   - Array of `ExtractedEnhancedDoc`
   - Sorted by completeness (highest first)

### Node Types Extracted

**Exportable Symbols**:
- `FunctionDeclaration` - Top-level functions
- `ClassDeclaration` - Classes
- `InterfaceDeclaration` - Interfaces
- `TypeAliasDeclaration` - Type aliases
- `VariableStatement` - Constants/exports
- `EnumDeclaration` - Enums

**Skipped**:
- Class methods (extracted separately)
- Class properties
- Local variables
- Anonymous functions

### Completeness Scoring

```typescript
completeness = (
  hasProblemSolving ? 20 : 0 +
  hasFunctionality ? 20 : 0 +
  hasErrorExperiences ? 15 : 0 +
  hasDecisions ? 15 : 0 +
  hasDependencies ? 15 : 0 +
  hasFuturePlans ? 15 : 0
);
```

**Grades**:
- **90-100%**: Excellent (all 6 categories complete)
- **70-89%**: Good (5 categories complete)
- **50-69%**: Adequate (3-4 categories)
- **<50%**: Incomplete (≤2 categories)

### Performance

- **Time**: O(n×m) where n=nodes, m=avg comment size
- **Space**: O(k) where k=exported symbols
- **Typical**: ~100ms for 50 symbols

## Effect

### Side Effects

**None** - Pure extraction, no mutations.

### I/O Operations

- **Read**: Source code (passed as parameter)
- **Write**: None
- **Console**: None

### Observable Changes

None - stateless extraction.

## Scope

### Public API

```typescript
class EnhancedDocExtractor {
  // Constructor
  constructor(options?: ExtractionOptions);

  // Main extraction method
  extractFromFile(filePath: string, sourceCode: string): ExtractedEnhancedDoc[];

  // Extract from single node (advanced)
  extractFromNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): ExtractedEnhancedDoc | null;
}
```

### Private Methods

```typescript
private isExportableSymbol(node: ts.Node): boolean;
private extractTSDoc(node: ts.Node): string | undefined;
private parseCustomTags(tsdoc: string): Partial<EnhancedSymbolDoc>;
private calculateCompleteness(doc: EnhancedSymbolDoc): number;
private getMissingFields(doc: EnhancedSymbolDoc): string[];
```

### API Stability

- **Stable**: `extractFromFile()`, constructor
- **Unstable**: `extractFromNode()` (may change signature)
- **Planned**: Batch extraction from multiple files

## Use Cases

### 1. Documentation Generation Pipeline

```typescript
const extractor = new EnhancedDocExtractor();
const files = glob.sync('src/**/*.ts');

for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  const docs = extractor.extractFromFile(file, code);

  docs.forEach(({ doc, completeness }) => {
    if (completeness >= 70) {
      database.insert('enhanced_docs', doc);
    } else {
      console.warn(`Incomplete doc: ${doc.symbolId} (${completeness}%)`);
    }
  });
}
```

### 2. Pre-commit Documentation Validation

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Extract docs from staged files
FILES=$(git diff --cached --name-only --diff-filter=M | grep '\.ts$')

for FILE in $FILES; do
  COMPLETENESS=$(tsdoc-edge extract-docs "$FILE" --min-completeness=80)
  if [ $? -ne 0 ]; then
    echo "❌ $FILE has incomplete documentation (<80%)"
    exit 1
  fi
done
```

### 3. Documentation Quality Dashboard

```typescript
// Generate project-wide documentation quality report
const extractor = new EnhancedDocExtractor();
const allDocs = extractAllDocs(extractor);

const stats = {
  total: allDocs.length,
  excellent: allDocs.filter(d => d.completeness >= 90).length,
  good: allDocs.filter(d => d.completeness >= 70 && d.completeness < 90).length,
  poor: allDocs.filter(d => d.completeness < 50).length,
  avgCompleteness: avg(allDocs.map(d => d.completeness))
};

console.log(`Documentation Quality: ${stats.avgCompleteness.toFixed(2)}%`);
```

### 4. Migration from Standard JSDoc

```typescript
// Convert existing JSDoc comments to enhanced format
const extractor = new EnhancedDocExtractor({ includePartial: true });
const docs = extractor.extractFromFile('legacy.ts', code);

docs.forEach(({ doc, missing }) => {
  if (missing.length > 0) {
    console.log(`TODO: Add missing fields for ${doc.symbolId}:`);
    missing.forEach(field => console.log(`  - ${field}`));
  }
});
```

## Example: Annotated Source Code

**Input**:
```typescript
/**
 * Build command implementation
 *
 * @problem Manual symbol extraction is tedious
 * @solves Automate extraction from TypeScript source
 * @context Large codebases need automated tooling
 * @useCase Extract symbols during CI/CD pipeline
 *
 * @functionality AST traversal, Symbol extraction, Database storage
 * @mainFeature Extract all symbols from source directory
 * @component ASTSymbolExtractor
 * @component DatabaseManager
 *
 * @decision Use TypeScript Compiler API for AST
 * @rationale More reliable than regex parsing
 * @consequences Requires TypeScript as dependency
 *
 * @depends typescript
 * @depType external
 * @depReason AST parsing
 *
 * @todo Add incremental extraction
 * @priority high
 */
export class BuildCommand extends BaseCommand {
  // ...
}
```

**Output**:
```typescript
{
  symbol: { id: "BuildCommand", name: "BuildCommand", kind: "class" },
  doc: {
    symbolId: "BuildCommand",
    problemSolving: {
      description: "Manual symbol extraction is tedious",
      context: "Large codebases need automated tooling"
    },
    functionality: {
      mainFeatures: ["AST traversal", "Symbol extraction", "Database storage"],
      components: ["ASTSymbolExtractor", "DatabaseManager"]
    },
    decisions: [{
      id: "001",
      title: "Use TypeScript Compiler API for AST",
      decision: "Use TypeScript Compiler API for AST",
      rationale: "More reliable than regex parsing",
      consequences: ["Requires TypeScript as dependency"]
    }],
    dependencies: [{
      target: "typescript",
      type: "external",
      reason: "AST parsing"
    }],
    futurePlans: [{
      id: "001",
      title: "Add incremental extraction",
      priority: "high"
    }]
  },
  completeness: 85,
  missing: ["errorExperiences"]
}
```

## Related

- [[StrictModeValidator]] (`../analyzers/StrictModeValidator.md`) - Validates extracted docs
- [[TSDocParser]] (`TSDocParser.md`) - Core TSDoc parsing
- [[ModuleSpecTagParser]] (`ModuleSpecTagParser.md`) - Tag parsing
- [[EnhancedSymbolDoc]] - Enhanced documentation type
- [[Module Specification Framework]] (`../concepts/module-specification-framework.md`) - Alternative framework

## Comparison: EnhancedDocExtractor vs Manual Creation

| Aspect | EnhancedDocExtractor | Manual Creation |
|--------|---------------------|-----------------|
| **Speed** | ~100ms for 50 symbols | Hours |
| **Consistency** | 100% (automated) | Varies |
| **Accuracy** | High (from source) | Medium (typos, drift) |
| **Maintenance** | Low (auto-sync) | High (manual updates) |
| **Learning Curve** | Medium (custom tags) | Low (just write) |
| **Validation** | Built-in completeness | Manual checks |

## Source

**Location**: `src/parser/EnhancedDocExtractor.ts`

**Tests**:
- `src/__tests__/EnhancedDocExtractor.test.ts`
- `src/__tests__/parser/EnhancedDocExtractor.test.ts`

## Symbol Count

19 symbols

## Status

**Current**: Active, production-ready
**Coverage**: All 6 categories of enhanced documentation
**Version**: v1.0

---

**Last Updated**: 2025-11-09
**Primary Use Case**: Automated documentation generation from annotated source code

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:241
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:277
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:278
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:279
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:280
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:281
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:183
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:415
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:416
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:281
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:282
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:283
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:103
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:268
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:269
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:24
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:34
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:35
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:36
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:37
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:38
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:23
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:54
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:55
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:56
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:57
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:58
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:154
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:219
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:220
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:221
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:222
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:223
- [[EnhancedTagTypes]] → /home/user/tsdoc-edge/managed/types/EnhancedTagTypes.md:79
- [[EnhancedTagTypes]] → /home/user/tsdoc-edge/managed/types/EnhancedTagTypes.md:90
- [[EnhancedTagTypes]] → /home/user/tsdoc-edge/managed/types/EnhancedTagTypes.md:91

