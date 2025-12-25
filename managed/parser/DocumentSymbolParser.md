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

Returns ParsedDocSymbols:

**Structure**:
- `filePath`: Documentation file path
- `primary`: Primary document symbol (optional, H1 symbol)
- `auxiliary`: Additional symbols (H2, H3, etc.)
- `references`: Array of [[Symbol]] reference strings
- `codeReferences`: Array of [[CodeReference]] objects
- `sourceFilePath`: Linked source file path (optional)

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

- TSDoc Symbol Parser - Parses code @doc tags
- [[Mermaid Symbol Extractor]] - Parses Mermaid diagrams
- DocumentSymbol - Output type
- ParsedDocSymbols - Return type

---

**Category**: Parser
**Status**: Active

---

## Backlinks

### Referenced By

- FrontmatterParser → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/FrontmatterParser.md:22
- [[Mermaid Symbol Extractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/MermaidSymbolExtractor.md:85
- ParsedDocSymbols → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:58

