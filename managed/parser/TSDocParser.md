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
- [[EnhancedDocExtractor]] → managed/parser/EnhancedDocExtractor.md:403
- [[TSDocStandardSpecification]] → managed/specs/domains/tsdoc-standard-spec.md:201
- [[CustomTagTypes]] → managed/types/CustomTagTypes.md:256
- [[ParseTypes]] → managed/types/ParseTypes.md:138

### Implemented By

- TSDocParser → src/parser/TSDocParser.ts:148
- CustomTagSpec → src/parser/TSDocParser.ts:31
- TSDOC_EDGE_CUSTOM_TAGS → src/parser/TSDocParser.ts:49
- generateTsdocJson → src/parser/TSDocParser.ts:90
- TsdocRenderOptions → src/parser/TsdocCommentReader.ts:41
- TsdocParameterEntry → src/parser/TsdocCommentReader.ts:53
- TsdocTypeParameterEntry → src/parser/TsdocCommentReader.ts:67
- TsdocDocCheckpointEntry → src/parser/TsdocCommentReader.ts:81
- TsdocReleaseVisibility → src/parser/TsdocCommentReader.ts:97
- StructuredTsdocComment → src/parser/TsdocCommentReader.ts:106
- SourceDocCheckpointReference → src/parser/TsdocCommentReader.ts:159
- ExtractDocCheckpointsOptions → src/parser/TsdocCommentReader.ts:187
- getDirectJsDocs → src/parser/TsdocCommentReader.ts:209
- renderDocNodesText → src/parser/TsdocCommentReader.ts:351
- renderDocNodeText → src/parser/TsdocCommentReader.ts:382
- extractDocCheckpointsFromText → src/parser/TsdocCommentReader.ts:450
- readTsdocComment → src/parser/TsdocCommentReader.ts:503
- extractLeadingJsDocText → src/parser/TsdocCommentReader.ts:652
- extractDocCheckpointsFromSource → src/parser/TsdocCommentReader.ts:754

