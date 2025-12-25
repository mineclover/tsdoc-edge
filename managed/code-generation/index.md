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

### [[Code Generation]]

**Source**: `src/generator/MarkdownGenerator.ts`

Base markdown generation from structured data.

- Paragraphs, code spans, plain text
- Consistent formatting
- Extensible base class

### [[Code Generation]]

**Source**: `src/generator/EnhancedMarkdownGenerator.ts`

Enhanced markdown with additional features.

- Rich formatting options
- Symbol linking support
- Cross-reference generation

### [[Code Generation]]

**Source**: `src/generator/InsightDocGenerator.ts`

Generates insight documentation from code analysis.

- Pattern insights
- Usage analytics
- Best practice recommendations

### [[Code Generation]]

**Source**: `src/generator/RelatedDocsGenerator.ts`

Generates related documentation suggestions.

- Similarity-based recommendations
- Symbol relationship links
- Context-aware suggestions

## Module Specification

### [[Code Generation]]

**Source**: `src/generator/ModuleSpecGenerator.ts`

Generates module specifications from code analysis.

- Purpose, input, output documentation
- Dependency extraction
- Effect documentation

### [[Code Generation]]

**Source**: `src/generator/ModuleSpecMarkdownFormatter.ts`

Formats module specifications as markdown.

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
