---
title: T S Doc Parser
type: component
category: parser
status: active
canonical: true
---

# [[TSDocParser]]

**Source**: `src/parser/TSDocParser.ts`

## Purpose

Parse TSDoc comments from TypeScript files.

## Parsing

Extracts:
- TSDoc comments
- Custom tags
- Symbol associations

## Symbol Count

8 symbols

## Related

- TSDoc Symbol Parser: Symbol extraction
- EnhancedDocExtractor: Enhanced parsing

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:282
- [[ASTSymbolExtractor]] → managed/analyzers/ASTSymbolExtractor.md:180
- [[DocumentationAnalyzer]] → managed/analyzers/DocumentationAnalyzer.md:298
- [[ParseCommand]] → managed/commands/ParseCommand.md:29
- [[EnhancedDocExtractor]] → managed/parser/EnhancedDocExtractor.md:410
- [[CustomTagTypes]] → managed/types/CustomTagTypes.md:259
- [[ParseTypes]] → managed/types/ParseTypes.md:138

### Implemented By

- TSDocParser → src/parser/TSDocParser.ts:1
- NodeWithJSDoc → src/parser/TSDocParser.ts:22

