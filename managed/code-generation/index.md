---
title: Code Generation
type: index
category: code-generation
status: active
canonical: true
---

# [[Code Generation]]

> Documentation and code generation utilities for TSDoc Edge

## Overview

The code generation system transforms analyzed code and metadata into various output formats including markdown documentation, module specifications, and related documentation links.

## Comment Management

### [[Code Generation]]

**Source**: `src/generator/CommentExporter.ts`

Exports TSDoc comments to external format for version control and editing.

- Extracts comments from TypeScript files
- Preserves structure and formatting
- Supports incremental export

### [[Code Generation]]

**Source**: `src/generator/CommentImporter.ts`

Imports comments from external sources back into code.

- Merges external edits into source
- Handles conflict resolution
- Validates comment syntax

### [[Code Generation]]

**Source**: `src/generator/CommentStateManager.ts`

Manages comment state during fold/unfold operations.

- Tracks comment modifications
- Maintains sync between code and docs
- Detects stale comments

## Documentation Generators

### [[MarkdownGenerator]]

**Source**: `src/generator/MarkdownGenerator.ts`

Converts parsed `@microsoft/tsdoc` `DocComment` AST nodes into clean, standard Markdown API documentation.

- Paragraphs, code spans, plain text
- Consistent formatting
- Extensible base class

### [[EnhancedMarkdownGenerator]]

**Source**: `src/generator/EnhancedMarkdownGenerator.ts`

Renders 6-category `EnhancedSymbolDoc` metadata, contracts, and cross-references into rich Markdown pages.

- Rich formatting options
- Symbol linking support
- Cross-reference generation

### [[InsightDocGenerator]]

**Source**: `src/generator/InsightDocGenerator.ts`

Generates hierarchical architectural insight documents organized by dependency depth and symbol importance.

- Pattern insights
- Usage analytics
- Best practice recommendations

### [[LLMsTextGenerator]]

**Source**: `src/generator/LLMsTextGenerator.ts`

Formats unified file, symbol, contract, and impact context into compact `llms.txt`-compatible prompts for AI agents.

### [[RelatedDocsGenerator]]

**Source**: `src/generator/RelatedDocsGenerator.ts`

Generates context-aware related documentation and implementation links from symbol relationship neighborhoods.

- Similarity-based recommendations
- Symbol relationship links
- Context-aware suggestions

## Module Specification

### [[ModuleSpecGenerator]]

**Source**: `src/generator/ModuleSpecGenerator.ts`

Synthesizes 7-aspect `ModuleSpecTemplate` specifications from TypeScript AST signatures, imports, and TSDoc tags.

- Purpose, input, output documentation
- Dependency extraction
- Effect documentation

### [[ModuleSpecMarkdownFormatter]]

**Source**: `src/generator/ModuleSpecMarkdownFormatter.ts`

Formats `ModuleSpecTemplate` data structures into standardized 7-aspect Markdown specification documents.

- Structured section output
- Consistent formatting
- Template-based generation

## Usage

```typescript
import { EnhancedMarkdownGenerator } from './generator/EnhancedMarkdownGenerator';
import { ModuleSpecGenerator } from './generator/ModuleSpecGenerator';

// Generate markdown documentation
const mdGenerator = new EnhancedMarkdownGenerator();
const markdown = mdGenerator.generate(symbolData);

// Generate module spec
const specGenerator = new ModuleSpecGenerator();
const spec = specGenerator.generate(moduleAnalysis);
```

## Related

- [[Analyzers & Extractors]] - Analysis that feeds generation
- [[Parser System]] - Parsing that provides input data
- [[Document Symbol System]] - Symbol linking in generated docs

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:196
- [[EnhancedSymbolDoc]] → managed/primary-types/EnhancedSymbolDoc.md:331

### Implemented By

- Code Generation → src/generator/CommentExporter.ts:1
- XMLContextGenerator → src/generator/XMLContextGenerator.ts:23
- JsonBuilder → src/output/JsonBuilder.ts:36
- XmlBuilder → src/output/XmlBuilder.ts:81
- XmlParseError → src/output/XmlParser.ts:25
- SchemaValidationError → src/output/XmlParser.ts:43
- ParsedData → src/output/XmlParser.ts:61
- XmlParser → src/output/XmlParser.ts:209
- createBuilder → src/output/index.ts:32
- getOutputFormat → src/output/index.ts:49
- isHumanFormat → src/output/index.ts:62
- DepsSchema → src/output/schemas.ts:19
- WhoUsesSchema → src/output/schemas.ts:50
- EndpointsSchema → src/output/schemas.ts:75
- HubsSchema → src/output/schemas.ts:94
- LayersSchema → src/output/schemas.ts:112
- CommonSchema → src/output/schemas.ts:129
- RoutesSchema → src/output/schemas.ts:150
- BuildResultSchema → src/output/schemas.ts:168
- FieldType → src/output/types.ts:16
- FieldDef → src/output/types.ts:24
- ObjectSchema → src/output/types.ts:35
- ArraySchema → src/output/types.ts:45
- GroupedArraySchema → src/output/types.ts:58
- OutputSchema → src/output/types.ts:72
- arrayOf → src/output/types.ts:85
- groupedArrayOf → src/output/types.ts:105
- SectionData → src/output/types.ts:126
- GroupedSectionData → src/output/types.ts:135
- OutputData → src/output/types.ts:143
- OutputFormat → src/output/types.ts:153
- OutputBuilder → src/output/types.ts:161

