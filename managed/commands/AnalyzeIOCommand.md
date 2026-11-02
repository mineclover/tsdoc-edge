---
title: Analyze I O Command
type: command
category: commands
status: active
canonical: true
---

# [[AnalyzeIOCommand]]

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`

## Purpose

Analyze file and DTO I/O dependencies via the unified relationship analyzer.

## Usage

```bash
tsdoc-edge relationship analyze --type=io [options]
```

## Features

- I/O operation detection
- File access patterns
- Dependency mapping

## Symbol Count

5 symbols

## Related

- [[IODependencyAnalyzer]]: Core analysis
- [[IO Dependency]]: Relationship type

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:55
- [[SymbolGraphFeatures]] → managed/features/symbol-graph.md:215
- [[Analyzer Development Guide]] → managed/guides/analyzer-development-guide.md:997
- [[Build Pipeline Guide]] → managed/guides/build-pipeline-guide.md:532
- [[CLI Command Development Guide]] → managed/guides/command-development-guide.md:697
- [[DataFlowTypes]] → managed/types/DataFlowTypes.md:172

### Implemented By

- AnalyzeIOCommand → src/commands/AnalyzeRelationshipsCommand.ts:1

