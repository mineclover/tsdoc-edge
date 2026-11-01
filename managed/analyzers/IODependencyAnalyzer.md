---
title: IODependencyAnalyzer
type: analyzer
category: core-components
status: active
canonical: true
---

# [[IODependencyAnalyzer]]

**Source**: `src/analyzer/IODependencyAnalyzer.ts`

## Purpose

파일 I/O 의존성 분석.

## Detects

- fs.readFile / fs.writeFile
- fs.existsSync
- path.join operations
- File path patterns

## Related

- [[IO Dependency]]: I/O 의존성 관계
- WorkContextCommand: 파일 접근 정보

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:54
- [[ASTSymbolExtractor]] → managed/analyzers/ASTSymbolExtractor.md:297
- [[Analyzers & Extractors]] → managed/analyzers/index.md:367
- [[AnalyzeIOCommand]] → managed/commands/AnalyzeIOCommand.md:29
- [[SymbolGraphFeatures]] → managed/features/symbol-graph.md:220
- [[Analyzer Development Guide]] → managed/guides/analyzer-development-guide.md:28
- [[Build Pipeline Guide]] → managed/guides/build-pipeline-guide.md:272
- [[Guides & Tutorials]] → managed/guides/index.md:170
- [[Relationship Analysis Guide]] → managed/guides/relationship-analysis-guide.md:109
- [[Quick Start Guide]] → managed/quick-start.md:81
- [[Relationship Types]] → managed/relationships/index.md:71
- [[IO Dependency]] → managed/relationships/io-dependency.md:18

### Implemented By

- IODependencyAnalyzer → src/analyzer/IODependencyAnalyzer.ts:1

