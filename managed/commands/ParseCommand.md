---
title: Parse Command
type: command
category: commands
status: active
canonical: true
---

# [[ParseCommand]]

**Source**: `src/commands/ParseCommand.ts`

## Purpose

Parse TypeScript files and extract TSDoc comments.

## Features

- TSDoc parsing
- Symbol extraction
- Comment validation

## Symbol Count

6 symbols

## Related

- [[TSDocParser]]: Core parsing

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:81
- [[ASTSymbolExtractor]] → managed/analyzers/ASTSymbolExtractor.md:173
- [[Analyzers & Extractors]] → managed/analyzers/index.md:30
- [[CoreWorkflow]] → managed/features/core-workflow.md:110
- [[CLI Command Development Guide]] → managed/guides/command-development-guide.md:710
- [[ExtractionResult]] → managed/primary-types/ExtractionResult.md:114

### Implemented By

- ParseCommand → src/commands/ParseCommand.ts:35

