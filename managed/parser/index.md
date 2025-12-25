---
title: Parser Components
type: index
category: parser
status: active
canonical: true
---

# [[Parser Components]]

> Source code and documentation parsing utilities for TSDoc Edge

## Overview

The parser system extracts structured information from TypeScript source code, TSDoc comments, and markdown documentation files.

## Source Code Parsing

### [[TSDocParser]]

**Source**: `src/parser/TSDocParser.ts`

Parses TSDoc comments from TypeScript source files using the official TSDoc parser.

- Extracts @tags and their content
- Handles multiline comments
- Preserves source locations
- Supports all standard TSDoc tags

### [[Parser Components]]

**Source**: `src/parser/ModuleSpecTagParser.ts`

Parses module specification tags from TSDoc comments.

- @purpose, @responsibility, @context
- @input, @output, @effect
- @decision, @rationale, @consequences
- Custom TSDoc Edge tags

### [[EnhancedDocExtractor]]

**Source**: `src/parser/EnhancedDocExtractor.ts`

Enhanced documentation extraction with additional metadata.

- Extended tag support
- Relationship extraction
- Cross-reference detection
- Semantic analysis

## Document Parsing

### [[DocumentSymbolParser]]

**Source**: `src/doc-symbol/DocumentSymbolParser.ts`

Parses `[[Symbol]]` references from markdown documentation.

- Primary definitions (H1 headers)
- Auxiliary definitions (H2+ headers)
- References (inline links)
- Code connection detection

### [[Parser Components]]

**Source**: `src/parser/FrontmatterParser.ts`

Parses YAML frontmatter from markdown documents.

- Title, type, category extraction
- Status and priority metadata
- Custom frontmatter fields
- Validation support

### [[Parser Components]]

**Source**: `src/doc-symbol/MermaidSymbolExtractor.ts`

Extracts symbols and relationships from Mermaid diagrams.

- Class diagram parsing
- Flowchart analysis
- Relationship detection
- Symbol linking

## Test Parsing

### TestSymbolParser

**Source**: `src/parser/TestSymbolParser.ts`

Parses test files to extract test-to-code relationships.

- Test file detection
- Import analysis
- Mock detection
- Coverage mapping

## Usage

```typescript
import { TSDocParser } from './parser/TSDocParser';
import { DocumentSymbolParser } from './doc-symbol/DocumentSymbolParser';

// Parse TSDoc from source
const tsdocParser = new TSDocParser();
const comments = tsdocParser.parse(sourceFile);

// Parse document symbols
const docParser = new DocumentSymbolParser();
const symbols = docParser.parse(markdownFile);
```

## Related

- [[Parser System]] - Parser system architecture
- [[Analyzers & Extractors]] - Analysis that uses parsed data
- [[Document Symbol System]] - Symbol reference system
