# [[CodeConnection]]

**Source**: `src/types/feature/doc-symbol.ts`

## Purpose

Type for code-to-document connections extracted from `@doc` tags.

## Type Definition

See [[CodeConnection]] implementation in source code.

## Fields

- **codeSymbol**: Symbol in code
- **docSymbol**: Symbol in documentation
- **filePath**: Source file path
- **lineNumber**: Line number

## Usage

Returned by TSDoc Symbol Parser:

```typescript
const parser = new TSDocSymbolParser();
const connections: CodeConnection[] = parser.parseCodeFile('src/file.ts');
```

## Related

- TSDoc Symbol Parser - Creates this type
- [[CodeReference]] - Document-to-code references

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[CodeConnection]] → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/CodeConnection.md:11
- [[CodeReference]] → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/CodeReference.md:28

