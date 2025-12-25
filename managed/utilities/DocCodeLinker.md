# [[DocCodeLinker]]

**Source**: `src/linking/DocCodeLinker.ts`

## Purpose

Build and maintain bidirectional links between documentation and code.

## Link Types

### Doc → Code
- Markdown links to source files
- `[[Symbol]]` references to code symbols
- @doc tag references

### Code → Doc
- TSDoc @doc tags pointing to markdown
- Symbol name to documentation mapping
- File-level documentation links

## Index Structure

Maintains four bidirectional maps:
- `codeToDoc`: Code files → Documentation files
- `docToCode`: Documentation files → Code files
- `symbolToDoc`: Symbol IDs → Documentation files
- `docToSymbol`: Documentation files → Symbol IDs

## Usage

```typescript
const linker = new DocCodeLinker();
const index = linker.buildIndex(codeFiles, docFiles);

// Query bidirectional links
const docs = index.symbolToDoc.get('user-service');
const symbols = index.docToSymbol.get('managed/services.md');
```

## Link Parsing

### Markdown Links
- Detects relative paths to source files
- Extracts `[[Symbol]]` references
- Resolves file paths

### Code Links
- Parses TSDoc @doc tags
- Extracts symbol declarations
- Maps symbols to documentation

## Symbol Count

2 classes, 1 interface

## Related

- [[LinkValidator]]: Validates link integrity
- [[DocumentSymbolParser]]: Parses document symbols
- [[IndexDocsCommand]]: Creates link index

---

## Backlinks

### Referenced By

- LinkingTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/LinkingTypes.md:113
- [[LinkValidator]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/LinkValidator.md:62
- [[Utilities Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/index.md:401

