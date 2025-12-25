---
title: Parser Components
type: index
category: parser
status: active
canonical: true
---

# [[Parser Components]]

> Source code and documentation parsing utilities

## Overview

Components responsible for parsing TypeScript source code, TSDoc comments, and documentation files.

## Components

### Source Parsing

- [[TSDocParser]] - Parse TSDoc comments from TypeScript files
- [[ModuleSpecTagParser]] - Parse module specification tags

### Document Parsing

- [[DocumentSymbolParser]] - Parse `[[Symbol]]` references from markdown
- [[FrontmatterParser]] - Parse YAML frontmatter from documents
- [[MermaidSymbolExtractor]] - Extract symbols from Mermaid diagrams

### Enhanced Extraction

- [[EnhancedDocExtractor]] - Enhanced documentation extraction with additional metadata

## Related

- [[Parser System]] - Parser system architecture
- [[Analyzers & Extractors]] - Analysis components
- [[Document Symbol System]] - Symbol reference system
