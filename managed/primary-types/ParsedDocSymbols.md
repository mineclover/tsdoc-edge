# [[ParsedDocSymbols]]

**Source**: `src/types/feature/doc-symbol.ts`

## Purpose

Type definition for parsed document symbols from a single markdown file.

## Type Definition

```typescript
export interface ParsedDocSymbols {
  filePath: string;
  primary?: DocumentSymbol;
  auxiliaries: DocumentSymbol[];
  references: DocumentSymbol[];
  codeReferences: CodeReference[];
  symbolFootnoteRefs: SymbolFootnoteRef[];
  sourceFilePath?: string;
}
```

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
- **Purpose**: Source file path from `**Source**: \`path\`` pattern

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

- [[DocumentSymbol]] - Symbol definition type
- [[Document Symbol Parser]] - Parser that returns this
- [[CodeReference]] - Code reference type
- [[SymbolFootnoteRef]] - Footnote reference type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:128
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:187
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:80
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:103
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:104
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:105
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:23
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:29
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:46
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:47
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:48
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:49
- [[SymbolFootnoteRef]] → /home/user/tsdoc-edge/managed/primary-types/SymbolFootnoteRef.md:20
- [[SymbolFootnoteRef]] → /home/user/tsdoc-edge/managed/primary-types/SymbolFootnoteRef.md:26
- [[SymbolFootnoteRef]] → /home/user/tsdoc-edge/managed/primary-types/SymbolFootnoteRef.md:39
- [[SymbolFootnoteRef]] → /home/user/tsdoc-edge/managed/primary-types/SymbolFootnoteRef.md:40
- [[SymbolFootnoteRef]] → /home/user/tsdoc-edge/managed/primary-types/SymbolFootnoteRef.md:41
- [[SymbolFootnoteRef]] → /home/user/tsdoc-edge/managed/primary-types/SymbolFootnoteRef.md:42
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:90
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:91

