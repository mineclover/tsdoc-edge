# [[TSDoc Symbol Parser]]

**Source**: `src/doc-symbol/TSDocSymbolParser.ts`

## Purpose

Parse `@doc [[Symbol]]` tags from TSDoc comments to create code-to-document connections.

## Responsibility

Extract `@doc` tags from TypeScript source code and create bidirectional links between code symbols and documentation symbols.

## Core Functionality

### parseCodeFile
```typescript
parseCodeFile(filePath: string): CodeConnection[]
```

Parses a TypeScript file and extracts all `@doc` tag connections.

**Process**:
1. Read source file with TypeScript compiler API
2. Traverse AST to find nodes with JSDoc comments
3. Extract `@doc` tags from comments
4. Parse `[[Symbol]]` references from tag content
5. Return array of code connections

## Tag Format

```typescript
/**
 * @doc [[DocumentSymbol]] - Links this code to documentation
 */
```

## Output

Returns `CodeConnection[]`:
```typescript
interface CodeConnection {
  codeSymbol: string;    // Symbol in code
  docSymbol: string;     // Symbol in documentation
  filePath: string;      // Source file path
  lineNumber: number;    // Line number
}
```

## Use Cases

1. **Code-to-Doc Linking**: Connect implementation to specification
2. **Impact Analysis**: Find docs affected by code changes
3. **Completeness Check**: Verify all public APIs are documented
4. **Navigation**: Jump from code to relevant documentation

## Integration

Used by:
- [[BuildCommand]] - Extract connections during build
- [[ValidateSymbolRefsCommand]] - Validate doc references
- [[WorkContextCommand]] - Show related documentation

## Example

```typescript
/**
 * User authentication service
 * @doc [[UserAuthentication]] - Main authentication documentation
 * @public
 */
export class AuthService {
  // ...
}
```

Parser extracts:
```typescript
{
  codeSymbol: "AuthService",
  docSymbol: "UserAuthentication",
  filePath: "src/auth/AuthService.ts",
  lineNumber: 5
}
```

## Limitations

- Only parses `@doc` tags (not other TSDoc tags)
- Requires valid `[[Symbol]]` syntax
- Depends on TypeScript AST structure

## Related

- [[DocumentSymbolParser]] - Parses markdown documentation
- [[MermaidSymbolExtractor]] - Parses Mermaid diagrams
- [[BuildCommand]] - Main consumer
- [[CodeConnection]] - Output type

---

**Category**: Parser
**Status**: Active

---

## Backlinks

### Referenced By

- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:111
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:112
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:113
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:114
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:74
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:75
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:104
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:105
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:129
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:130
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:40
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:41
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:22
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:50
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:51
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:77
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:107
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:108
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:79
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:109
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:110
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:22
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:28
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:42
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:43
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:44
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:45
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:46
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:47

