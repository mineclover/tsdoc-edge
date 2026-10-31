---
title: Parsed Doc Symbols
type: type
category: primary-types
status: active
canonical: true
---

# [[ParsedDocSymbols]]

**Source**: `src/types/feature/doc-symbol.ts`

## Purpose

Type definition for parsed document symbols from a single markdown file.

## Type Definition

See ParsedDocSymbols implementation in source code.

## Fields

### filePath
- **Type**: `string`
- **Required**: Yes
- **Purpose**: Path to the markdown file

### primary
- **Type**: `DocumentSymbol`
- **Required**: No
- **Purpose**: Primary definition (H1 `# [[Symbol]]`)
- **Note**: Should exist for managed docs (SSOT)
- **Disposition**: Its optional `codeImplementation` field is `required` by default and may be
  `not-applicable` when the document has no single implementation owner.

### auxiliaries
- **Type**: `DocumentSymbol[]`
- **Required**: Yes
- **Purpose**: Auxiliary definitions (H2+ `## [[Symbol]]`)

### references
- **Type**: `DocumentSymbol[]`
- **Required**: Yes
- **Purpose**: Inline `[[Symbol]]` references

### codeReferences
- **Type**: `CodeReference[]`
- **Required**: Yes
- **Purpose**: Code references (e.g., `[ClassName](file.ts)`)

### symbolFootnoteRefs
- **Type**: `SymbolFootnoteRef[]`
- **Required**: Yes
- **Purpose**: Footnote references (`[^sym-XXX]`)

### sourceFilePath
- **Type**: `string`
- **Required**: No
- **Purpose**: Source file path from frontmatter `source` or `**Source**: \`path\`` pattern

## Usage

Returned by [[Document Symbol Parser]]:

```typescript
const parser = new DocumentSymbolParser();
const result: ParsedDocSymbols | null = parser.parse('managed/doc.md');
```

## Example

**Input** (`managed/auth/user-auth.md`):
```markdown
# [[UserAuthentication]]

**Source**: `src/auth/AuthService.ts`

## [[LoginFlow]]
Uses [[DatabaseManager]] for sessions.
```

**Output**:
```typescript
{
  filePath: "managed/auth/user-auth.md",
  primary: {
    symbolName: "UserAuthentication",
    headerLevel: 1,
    lineNumber: 1
  },
  auxiliaries: [
    { symbolName: "LoginFlow", headerLevel: 2, lineNumber: 5 }
  ],
  references: [
    { symbolName: "DatabaseManager", headerLevel: 0, lineNumber: 6 }
  ],
  codeReferences: [],
  symbolFootnoteRefs: [],
  sourceFilePath: "src/auth/AuthService.ts"
}
```

## Related

- DocumentSymbol - Symbol definition type
- [[Document Symbol Parser]] - Parser that returns this
- [[CodeReference]] - Code reference type
- SymbolFootnoteRef - Footnote reference type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[Primary Types Index]] → managed/primary-types/index.md:20

### Implemented By

- ParsedDocSymbols → src/types/feature/doc-symbol.ts:1

