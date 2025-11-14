# [[DocumentSymbolParser]]

**Source**: `src/doc-symbol/DocumentSymbolParser.ts`

## Purpose

Parse `[[Symbol]]` references from markdown documentation files to extract primary definitions, auxiliary definitions, and inline references.

## Responsibility

Extract and categorize all `[[Symbol]]` notation from markdown files for the document symbol system.

## Three Symbol Types

### 1. Primary Definition (H1)

```markdown
# [[SymbolName]]
```

- **Canonical SSOT** definition
- Exactly **one** per symbol across all documentation
- Main documentation page for the symbol

### 2. Auxiliary Definition (H2+)

```markdown
## [[SymbolName]]
```

- **Context-specific** explanation
- **Multiple allowed** across different documents
- References primary but adds local context

### 3. Inline Reference

```markdown
Some text [[SymbolName]] here
```

- **Simple reference** to primary definition
- **Unlimited** occurrences
- Creates links to primary documentation

## Parsing Algorithm

```typescript
1. Read markdown file
2. Parse frontmatter metadata
3. Check if document is managed (based on config)
4. Remove code blocks (if ignoreCodeBlocks enabled)
5. For each line:
   a. Check for H1: # [[Symbol]]
   b. Check for H2+: ## [[Symbol]], ### [[Symbol]]
   c. Check for inline: [[Symbol]]
   d. Extract symbol names
6. Extract source file path from **Source**: pattern
7. Extract code references [text](path#Symbol)
8. Extract footnote references [^sym-XXX]
9. Return ParsedDocSymbols
```

## Output Structure

```typescript
interface ParsedDocSymbols {
  filePath: string;
  primary?: DocumentSymbol;           // H1 definition
  auxiliaries: DocumentSymbol[];      // H2+ definitions
  references: DocumentSymbol[];       // Inline references
  codeReferences: CodeReference[];    // Links to code
  symbolFootnoteRefs: SymbolFootnoteRef[];
  sourceFilePath?: string;            // From **Source**: pattern
}
```

## Configuration

### Document Management

```json
{
  "documentManagement": {
    "enabled": true,
    "managedDirs": ["managed"],
    "excludeDirs": ["archive", "examples"],
    "requireFrontmatter": false,
    "strictMode": false,
    "ignoreCodeBlocks": true
  }
}
```

### Managed Documents

Documents are considered "managed" if:
1. `documentManagement.enabled` is false (all docs processed), OR
2. File is NOT in `excludeDirs`, AND
3. If `requireFrontmatter` is true: has `tsdoc: managed` in frontmatter, OR
4. If `requireFrontmatter` is false: file is in `managedDirs`

### Code Block Handling

When `ignoreCodeBlocks` is true:
- Fenced code blocks (```) are skipped
- Inline code (`text`) is removed
- Prevents example code from being treated as real symbols

## Usage

```typescript
import { DocumentSymbolParser } from './doc-symbol/DocumentSymbolParser';

const parser = new DocumentSymbolParser();

// Parse single document
const result = parser.parse('managed/commands/BuildCommand.md');

if (result) {
  console.log(`Primary: ${result.primary?.name}`);
  console.log(`Auxiliaries: ${result.auxiliaries.length}`);
  console.log(`References: ${result.references.length}`);
}

// Parse multiple documents
const results = parser.parseMultiple([
  'managed/commands/BuildCommand.md',
  'managed/features/core-workflow.md'
]);
```

## Pattern Detection

### Primary Definition Pattern

```typescript
// Matches: # [[SymbolName]]
const h1Match = line.match(/^#\s+\[\[([^\]]+)\]\]/);
```

### Auxiliary Definition Pattern

```typescript
// Matches: ## [[SymbolName]], ### [[SymbolName]], etc.
if (line.trim().startsWith('#') && line.includes('[[')) {
  const level = line.match(/^#+/)[0].length;
  // level > 1 → auxiliary
}
```

### Inline Reference Pattern

```typescript
// Matches: [[Symbol]] or [[Symbol#Section]]
const regex = /\[\[([^\]#]+)(?:#([^\]]+))?\]\]/g;
```

### Source File Pattern

```typescript
// Matches: **Source**: `path/to/file.ts`
const sourceMatch = body.match(/\*\*Source\*\*:\s*`([^`]+)`/);
```

### Code Reference Pattern

```typescript
// Matches: [text](path#Symbol.member)
const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
```

## Integration

### Used By

- [[IndexDocsCommand]]: Indexes all documentation symbols
- [[ValidateDocsCommand]]: Validates symbol consistency
- [[SymbolQueryCommand]]: Queries symbol information
- [[DocumentSymbolRegistry]]: Registers parsed symbols

### Depends On

- [[FrontmatterParser]]: Parses YAML frontmatter
- [[ConfigManager]]: Loads configuration
- Document management configuration

## Example Output

```typescript
{
  filePath: "managed/commands/BuildCommand.md",
  primary: {
    name: "BuildCommand",
    type: "primary",
    filePath: "managed/commands/BuildCommand.md",
    line: 1,
    level: 1
  },
  auxiliaries: [],
  references: [
    {
      name: "ASTSymbolExtractor",
      type: "reference",
      filePath: "managed/commands/BuildCommand.md",
      line: 45,
      level: 0
    }
  ],
  codeReferences: [],
  symbolFootnoteRefs: [],
  sourceFilePath: "src/commands/BuildCommand.ts"
}
```

## Error Handling

### File Not Found

```typescript
if (!fs.existsSync(filePath)) {
  throw new Error(`File not found: ${filePath}`);
}
```

### Non-Managed Documents

```typescript
// Returns null for non-managed documents
if (!this.isManagedDocument(filePath, metadata)) {
  return null;
}
```

### Malformed Patterns

- Invalid `[[Symbol` (missing closing) → ignored
- Nested `[[Outer [[Inner]]]]` → extracts "Outer [[Inner"
- Empty `[[]]` → ignored

## Testing

```typescript
describe('DocumentSymbolParser', () => {
  it('parses primary definition', () => {
    const content = '# [[BuildCommand]]';
    const result = parser.parse('test.md', content);
    expect(result.primary?.name).toBe('BuildCommand');
  });

  it('parses auxiliaries', () => {
    const content = '## [[BuildCommand]]';
    const result = parser.parse('test.md', content);
    expect(result.auxiliaries.length).toBe(1);
  });

  it('ignores code blocks', () => {
    const content = '```\n# [[ExampleCode]]\n```';
    const result = parser.parse('test.md', content);
    expect(result.primary).toBeUndefined();
  });

  it('extracts source file path', () => {
    const content = '**Source**: `src/cli.ts`';
    const result = parser.parse('test.md', content);
    expect(result.sourceFilePath).toBe('src/cli.ts');
  });
});
```

## Related

- [[DocumentSymbolRegistry]]: Stores parsed symbols
- [[DocumentSymbolSystem]]: Overall symbol reference system
- [[Symbol Reference System]]: Symbol conventions
- [[IndexDocsCommand]]: Uses parser to index documentation

## See Also

- Symbol notation conventions (`# [[Symbol]]`, `## [[Symbol]]`, `[[Symbol]]`)
- SSOT principles for documentation
- Document management configuration

---

## Backlinks

### Referenced By

- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:57
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:79
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:80
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:179
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:238
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:239
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:129
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:155
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:184
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:185
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:186
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:187
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:52
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:94
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:95
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:31
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:201
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:202
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:126
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:146
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:188
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:189
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:190
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:191
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:84
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:93
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:205
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:206
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:207
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:208
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:117
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:261
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:262
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:65
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:89
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:90
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:73
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:85
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:86
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:99
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:100
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:101
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:102
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:103
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:104
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:105
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:106
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:107
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:108
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:52
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:65
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:66
- [[SpecCompletenessValidator]] → /home/user/tsdoc-edge/managed/utilities/SpecCompletenessValidator.md:63
- [[SpecCompletenessValidator]] → /home/user/tsdoc-edge/managed/utilities/SpecCompletenessValidator.md:81
- [[SpecCompletenessValidator]] → /home/user/tsdoc-edge/managed/utilities/SpecCompletenessValidator.md:82
- [[SpecContentSimilarityChecker]] → /home/user/tsdoc-edge/managed/utilities/SpecContentSimilarityChecker.md:76
- [[SpecContentSimilarityChecker]] → /home/user/tsdoc-edge/managed/utilities/SpecContentSimilarityChecker.md:84
- [[SpecContentSimilarityChecker]] → /home/user/tsdoc-edge/managed/utilities/SpecContentSimilarityChecker.md:85
- [[UnusedDocumentDetector]] → /home/user/tsdoc-edge/managed/utilities/UnusedDocumentDetector.md:80
- [[UnusedDocumentDetector]] → /home/user/tsdoc-edge/managed/utilities/UnusedDocumentDetector.md:88
- [[UnusedDocumentDetector]] → /home/user/tsdoc-edge/managed/utilities/UnusedDocumentDetector.md:89

