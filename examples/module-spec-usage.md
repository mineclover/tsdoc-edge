# Module Specification Generator - Usage Guide

## Overview

The Module Specification Generator automatically creates comprehensive 7-part documentation for TypeScript modules by analyzing source code and TSDoc comments.

## 7-Part Framework

1. **Purpose** - Why this module exists
2. **Input** - What parameters it accepts
3. **Output** - What it returns
4. **Context** - What dependencies it needs
5. **Logic** - How it works internally
6. **Effect** - What side effects it produces
7. **Scope** - What it exposes publicly

## Auto-Completion Capabilities

| Section | Confidence | Data Sources |
|---------|-----------|--------------|
| Purpose | 95% | `@problem`, `@responsibility`, `@solves`, summary |
| Input | 90% | AST parameters, `@param`, `@precondition` |
| Output | 90% | AST return type, `@returns`, `@postcondition` |
| Context | 85% | imports, `@depends`, `@context` |
| Logic | 60% | `@functionality`, complexity metrics |
| Effect | 50% | Side effect pattern detection |
| Scope | 95% | export modifiers, `@public` tag |

## Usage

### Basic Command

```bash
tsdoc-edge generate-spec <file> <symbol> [output-dir]
```

### Examples

```bash
# Generate spec for a class
tsdoc-edge generate-spec src/analyzer/CodeHealthChecker.ts CodeHealthChecker

# Generate spec for a function/method
tsdoc-edge generate-spec src/parser/TSDocParser.ts parseComment

# Custom output directory
tsdoc-edge generate-spec src/graph/SymbolGraphBuilder.ts SymbolGraphBuilder ./managed/specs
```

## Improving Auto-Completion Quality

Add these TSDoc tags to improve extraction quality:

```typescript
/**
 * Your module description
 *
 * @public
 * @responsibility Main responsibility description
 * @problem Problem this module solves
 * @solves Solution approach
 * @context Execution context requirements
 *
 * @functionality Feature 1, Feature 2, Feature 3
 *
 * @depends DependencyName
 * @precondition Input must be validated
 * @postcondition Output is guaranteed to be non-null
 *
 * @param paramName Parameter description
 * @returns Return value description
 */
export function myFunction(paramName: string): ResultType {
  // ...
}
```

## Output Format

The generator produces:

1. **Markdown document** - Formatted 7-part specification
2. **Metadata** - Completion confidence score
3. **Manual review markers** - Sections needing review
4. **Warnings** - Missing tags or incomplete documentation

Example output structure:

```markdown
# Module Specification: YourModule

**Kind:** class
**File:** `path/to/file.ts`
**Symbol ID:** `your-module`

---
**Generated:** 2025-11-05
**Completion Confidence:** 85%
**Manual Review Needed:** Logic (algorithm description)
---

## Table of Contents

1. [Purpose](#1-purpose)
...
```

## Integration with Existing Workflow

### Step 1: Generate Initial Spec

```bash
tsdoc-edge generate-spec src/myModule.ts MyModule
```

### Step 2: Review Generated Spec

Check `docs/specs/my-module.md` for:
- Completion confidence score
- Manual review needed sections
- Warnings

### Step 3: Improve Source Documentation

Add missing TSDoc tags based on warnings:

```typescript
/**
 * @functionality Parse input, Validate schema, Transform data
 * @precondition Input must be valid JSON
 * @postcondition Returns normalized object
 */
```

### Step 4: Regenerate

```bash
tsdoc-edge generate-spec src/myModule.ts MyModule
```

### Step 5: Manual Refinement

Edit the generated markdown to:
- Fill TODO markers
- Describe algorithms in Logic section
- Add domain-specific context

## API Usage

```typescript
import { ModuleSpecGenerator, ModuleSpecMarkdownFormatter } from 'tsdoc-edge';

const generator = new ModuleSpecGenerator({
  analyzeLogic: true,
  analyzeSideEffects: true,
  includeTodos: true,
});

const result = generator.generateSpec('src/myFile.ts', 'MySymbol');

console.log(`Confidence: ${result.confidence}%`);
console.log('Auto-completed:', result.autoCompleted);
console.log('Manual needed:', result.manualRequired);

const formatter = new ModuleSpecMarkdownFormatter();
const markdown = formatter.format(result.spec);
```

## Best Practices

1. **Start with well-documented modules** - Higher completion confidence
2. **Use consistent TSDoc tags** - Better extraction results
3. **Regenerate after improvements** - Track documentation quality
4. **Review TODO markers** - Fill in algorithm descriptions
5. **Validate side effects** - Automatic detection may miss edge cases

## Side Effect Detection

The generator automatically detects:

- File system operations (`fs.readFile`, `fs.writeFile`)
- Database operations (`db.prepare`, `db.run`)
- Network calls (`fetch`, `http.request`)
- State mutations (`this.property = value`)
- Console logging (`console.log`)

## Limitations

- **Logic section** requires manual algorithm description (60% automated)
- **Effect section** may miss complex transitive effects (50% automated)
- **Custom patterns** not covered by heuristics need manual review
- **NLP understanding** of "why" code does what it does is limited

## Future Enhancements

- [ ] Interactive completion mode with prompts
- [ ] Pattern learning from existing specs
- [ ] Integration with `improve` command workflow
- [ ] Batch generation for entire directories
- [ ] Diff comparison between versions
