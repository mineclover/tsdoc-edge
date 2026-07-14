---
title: DocumentSymbolRegistry
type: feature
category: feature
status: active
canonical: true
---

# [[DocumentSymbolRegistry]]

**Source**: `src/doc-symbol/DocumentSymbolRegistry.ts`

## Purpose

Central registry for document symbols that enforces SSOT (Single Source of Truth) principles by managing primary definitions, auxiliary definitions, and references.

## Responsibility

Store and validate all document symbols across the documentation system, ensuring no duplicate primary definitions and all references point to valid symbols.

## SSOT Enforcement

### Three Symbol Registries

```typescript
class DocumentSymbolRegistry {
  private definitions: Map<string, DocumentSymbol>;      // Primary (H1)
  private auxiliaries: Map<string, DocumentSymbol[]>;    // Auxiliary (H2+)
  private references: Map<string, DocumentSymbol[]>;     // Inline
  private codeConnections: Map<string, CodeConnection[]>;
}
```

### Registration Rules

**Primary Definitions (H1)**:
- Exactly **one** per symbol
- Throws error on duplicate
- Canonical SSOT definition

**Auxiliary Definitions (H2+)**:
- **Multiple allowed** per symbol
- Context-specific explanations
- Must reference existing primary

**Inline References**:
- **Unlimited** per symbol
- Simple links to primary
- No additional content

## Core Operations

### Register Document

```typescript
registerDocument(symbols: ParsedDocSymbols): void {
  // Register primary definition (throws on duplicate)
  if (symbols.primary) {
    this.registerPrimary(symbols.primary);
  }

  // Register auxiliaries (multiple OK)
  for (const aux of symbols.auxiliaries) {
    this.registerAuxiliary(aux);
  }

  // Register references (unlimited)
  for (const ref of symbols.references) {
    this.registerReference(ref);
  }
}
```

### Validation

```typescript
validate(): DocSymbolValidation {
  // Check for orphaned auxiliaries
  // Check for references to undefined symbols
  // Check for unused definitions
  // Check for symbols with many references
  // Check for definitions without code implementation
}
```

## Validation Rules

### Rule 1: Orphaned Auxiliary

```markdown
## [[EventFlow]]  ← Auxiliary without primary
Custom explanation...
```

**Error**: `orphaned_auxiliary`
**Fix**: Create primary H1 definition or convert to inline reference

### Rule 2: Missing Primary

```markdown
Some text [[NonExistentSymbol]] here
```

**Error**: `missing_primary`
**Fix**: Create primary definition or fix typo

### Rule 3: Unused Definition

```markdown
# [[UnusedSymbol]]
(Never referenced anywhere)
```

**Warning**: `unused_definition`
**Fix**: Add references or remove if truly unused

### Rule 4: Many References

```markdown
# [[PopularSymbol]]
(Referenced 100+ times)
```

**Warning**: `many_references`
**Fix**: Consider splitting into sub-concepts

### Rule 5: No Code Implementation

```markdown
# [[FeatureName]]
(No `source:` or **Source**: path)
```

**Warning**: `no_code_impl`
**Fix**: Add `source:` for an implementation document, or explicitly set
`codeImplementation: not-applicable` for a document with no single implementation owner.

## API Methods

### Query Methods

```typescript
// Get primary definition
getDefinition(name: string): DocumentSymbol | undefined

// Get auxiliary definitions
getAuxiliaries(name: string): DocumentSymbol[]

// Get all references
getReferences(name: string): DocumentSymbol[]

// Get code connections
getCodeConnections(name: string): CodeConnection[]

// Get all symbol names
getAllSymbolNames(): string[]
```

### Management Methods

```typescript
// Clear all data
clear(): void

// Unregister file
unregisterFile(filePath: string): void

// Export state
export(): RegistryState

// Import state
import(data: RegistryState): void
```

### Statistics

```typescript
getStatistics(): {
  totalDefinitions: number;
  totalAuxiliaries: number;
  totalReferences: number;
  totalCodeConnections: number;
  avgReferencesPerSymbol: number;
}
```

## Validation Output

```typescript
interface DocSymbolValidation {
  valid: boolean;
  errors: DocSymbolError[];
  warnings: DocSymbolWarning[];
}

interface DocSymbolError {
  type: 'orphaned_auxiliary' | 'missing_primary';
  symbolName: string;
  filePath: string;
  line: number;
  message: string;
  conflictWith?: { filePath: string; line: number };
}

interface DocSymbolWarning {
  type: 'unused_definition' | 'many_references' | 'no_code_impl';
  symbolName: string;
  filePath: string;
  message: string;
  count?: number;
}
```

The primary document symbol preserves the optional `codeImplementation` disposition from
frontmatter. `required` is the default; `not-applicable` is an explicit document-level decision,
not a global validator bypass.

## Usage

```typescript
import { DocumentSymbolRegistry } from './doc-symbol/DocumentSymbolRegistry';
import { DocumentSymbolParser } from './doc-symbol/DocumentSymbolParser';

const registry = new DocumentSymbolRegistry();
const parser = new DocumentSymbolParser();

// Register documents
const files = ['managed/commands/BuildCommand.md', ...];
for (const file of files) {
  const parsed = parser.parse(file);
  if (parsed) {
    registry.registerDocument(parsed);
  }
}

// Validate
const validation = registry.validate();

if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}

// Query symbols
const symbol = registry.getDefinition('BuildCommand');
const refs = registry.getReferences('BuildCommand');
console.log(`BuildCommand has ${refs.length} references`);
```

## Error Prevention

### Duplicate Primary Detection

```typescript
registerPrimary(symbol: DocumentSymbol): void {
  const existing = this.definitions.get(symbol.name);
  if (existing) {
    throw new Error(
      `Duplicate primary definition for [[${symbol.name}]]:\n` +
      `  1. ${existing.filePath}:${existing.line}\n` +
      `  2. ${symbol.filePath}:${symbol.line}`
    );
  }
  this.definitions.set(symbol.name, symbol);
}
```

### Safe Unregistration

```typescript
unregisterFile(filePath: string): void {
  // Remove primary definitions from this file
  for (const [name, symbol] of this.definitions.entries()) {
    if (symbol.filePath === filePath) {
      this.definitions.delete(name);
    }
  }

  // Remove auxiliaries from this file
  // Remove references from this file
  // Remove code connections from this file
}
```

## Integration

### Used By

- [[ValidateDocsCommand]]: Validates documentation
- [[IndexDocsCommand]]: Builds symbol index
- [[SymbolQueryCommand]]: Queries symbols
- [[UpdateBacklinksCommand]]: Updates backlinks

### Depends On

- [[DocumentSymbolParser]]: Provides parsed symbols
- DocumentSymbol: Symbol type definitions
- ParsedDocSymbols: Parser output type

## State Management

### Export/Import

```typescript
// Save state
const state = registry.export();
fs.writeFileSync('registry.json', JSON.stringify(state));

// Restore state
const data = JSON.parse(fs.readFileSync('registry.json'));
registry.import(data);
```

### Incremental Updates

```typescript
// Unregister changed file
registry.unregisterFile('managed/commands/BuildCommand.md');

// Re-parse and register
const parsed = parser.parse('managed/commands/BuildCommand.md');
if (parsed) {
  registry.registerDocument(parsed);
}
```

## Testing

```typescript
describe('DocumentSymbolRegistry', () => {
  it('prevents duplicate primary definitions', () => {
    const registry = new DocumentSymbolRegistry();

    registry.registerDocument({
      primary: { name: 'Test', filePath: 'a.md', line: 1 }
    });

    expect(() => {
      registry.registerDocument({
        primary: { name: 'Test', filePath: 'b.md', line: 1 }
      });
    }).toThrow('Duplicate primary definition');
  });

  it('detects orphaned auxiliaries', () => {
    const registry = new DocumentSymbolRegistry();

    registry.registerDocument({
      auxiliaries: [{ name: 'Orphan', filePath: 'a.md', line: 2 }]
    });

    const validation = registry.validate();
    expect(validation.errors[0].type).toBe('orphaned_auxiliary');
  });

  it('detects missing primary', () => {
    const registry = new DocumentSymbolRegistry();

    registry.registerDocument({
      references: [{ name: 'Missing', filePath: 'a.md', line: 10 }]
    });

    const validation = registry.validate();
    expect(validation.errors[0].type).toBe('missing_primary');
  });
});
```

## Related

- [[DocumentSymbolParser]]: Parses symbols for registration
- DocumentSymbolSystem: Overall symbol system
- [[Symbol Reference System]]: Symbol conventions
- [[ValidateDocsCommand]]: Uses registry for validation

## See Also

- SSOT (Single Source of Truth) principles
- Document symbol validation rules
- Symbol registry state management

---

## Backlinks

### Referenced By

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:244
- [[IndexDocsCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/IndexDocsCommand.md:58
- Document Symbol System → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/document-symbol-system.md:32
- [[ValidationFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/validation-features.md:118
- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:278
- DocumentSymbol → /Users/junwoobang/workflow/tsdoc-edge/managed/types/DocumentSymbol.md:100
