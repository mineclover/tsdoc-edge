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

Returned by [[TSDoc Symbol Parser]]:

```typescript
const parser = new TSDocSymbolParser();
const connections: CodeConnection[] = parser.parseCodeFile('src/file.ts');
```

## Related

- [[TSDoc Symbol Parser]] - Creates this type
- [[CodeReference]] - Document-to-code references

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:68
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:102
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:103
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:104
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:105
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:106
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:107
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:108
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:109
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:30
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:43
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:44
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:45
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:46
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:47

