# [[CodeConnection]]

**Source**: `src/types/feature/doc-symbol.ts`

## Purpose

Type for code-to-document connections extracted from `@doc` tags.

## Type Definition

```typescript
export interface CodeConnection {
  codeSymbol: string;
  docSymbol: string;
  filePath: string;
  lineNumber: number;
}
```

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
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:99
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:100
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:101
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:102
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:103
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:104
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:30
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:43
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:44
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:45
- [[CodeReference]] → /home/user/tsdoc-edge/managed/primary-types/CodeReference.md:46

