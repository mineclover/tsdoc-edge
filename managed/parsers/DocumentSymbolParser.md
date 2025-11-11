# [[Document Symbol Parser]]

**Source**: `src/doc-symbol/DocumentSymbolParser.ts`

## Purpose

Parse `[[Symbol]]` notation from markdown documents to extract symbol definitions and references.

## Responsibility

Extract three types of symbols from markdown:
1. **Primary** (`# [[Symbol]]`) - Main definition
2. **Auxiliary** (`## [[Symbol]]`) - Sub-definitions
3. **References** (`[[Symbol]]`) - Inline references

## Core Functionality

### parse
```typescript
parse(filePath: string): ParsedDocSymbols | null
```

Parses a markdown file and extracts all symbol information.

**Process**:
1. Read markdown file
2. Parse frontmatter (YAML metadata)
3. Check if document is managed
4. Extract Source: path
5. Parse primary symbol from H1
6. Parse auxiliary symbols from H2
7. Extract all inline references
8. Parse code references and footnotes
9. Return complete symbol data

## Symbol Types

### Primary Symbol
```markdown
# [[UserAuthentication]]
```
- One per document (SSOT)
- H1 heading
- Required for managed docs

### Auxiliary Symbols
```markdown
## [[LoginFlow]]
## [[LogoutFlow]]
```
- Multiple allowed
- H2 headings
- Sub-components or aspects

### References
```markdown
See [[AuthService]] for implementation.
Depends on [[DatabaseManager]].
```
- Inline `[[Symbol]]` notation
- Links to other documents
- Creates connection graph

## Output Type

Returns `ParsedDocSymbols`:
```typescript
interface ParsedDocSymbols {
  filePath: string;
  primary?: DocumentSymbol;
  auxiliary: DocumentSymbol[];
  references: string[];
  codeReferences: CodeReference[];
  sourceFilePath?: string;
}
```

## Integration

Used by:
- [[BuildCommand]] - Build symbol registry
- [[ValidateSymbolRefsCommand]] - Validate references
- [[IndexDocsCommand]] - Create documentation index
- [[UpdateBacklinksCommand]] - Update backlinks

## Example

**Input** (`managed/auth/user-authentication.md`):
```markdown
---
canonical: true
---

# [[UserAuthentication]]

**Source**: `src/auth/AuthService.ts`

## [[LoginFlow]]
Uses [[DatabaseManager]] for session storage.

## [[LogoutFlow]]
Calls [[SessionCleaner]] to invalidate tokens.
```

**Output**:
```typescript
{
  filePath: "managed/auth/user-authentication.md",
  primary: {
    symbolName: "UserAuthentication",
    headerLevel: 1,
    lineNumber: 5
  },
  auxiliary: [
    { symbolName: "LoginFlow", headerLevel: 2, lineNumber: 9 },
    { symbolName: "LogoutFlow", headerLevel: 2, lineNumber: 12 }
  ],
  references: ["DatabaseManager", "SessionCleaner"],
  codeReferences: [],
  sourceFilePath: "src/auth/AuthService.ts"
}
```

## Related

- [[TSDoc Symbol Parser]] - Parses code @doc tags
- [[Mermaid Symbol Extractor]] - Parses Mermaid diagrams
- [[DocumentSymbol]] - Output type
- [[ParsedDocSymbols]] - Return type

---

**Category**: Parser
**Status**: Active

---

## Backlinks

### Referenced By

- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:104
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:105
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:84
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:85
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:38
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:39
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:65
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:66
- [[FrontmatterParser]] → /home/user/tsdoc-edge/managed/parser/FrontmatterParser.md:22
- [[FrontmatterParser]] → /home/user/tsdoc-edge/managed/parser/FrontmatterParser.md:30
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:80
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:101
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:102
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:103
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:89
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:90
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:58
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:75
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:76
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:77
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:88
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:89

