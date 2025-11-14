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
- [[WorkContextCommand]]: 파일 접근 정보

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:26
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:29
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:80
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:143
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:195
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:351
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:352
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:353
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:354
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:355
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:170
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:207
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:208
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:219
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:305
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:306
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:80
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:394
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:395
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:79
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:80
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:81
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:141
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:271
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:272
- [[Analyzer Development Guide]] → /home/user/tsdoc-edge/managed/guides/analyzer-development-guide.md:21
- [[Analyzer Development Guide]] → /home/user/tsdoc-edge/managed/guides/analyzer-development-guide.md:65
- [[Analyzer Development Guide]] → /home/user/tsdoc-edge/managed/guides/analyzer-development-guide.md:245
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:80
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:126
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:245
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:286
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:287
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:288
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:289
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:290
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:291
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:135
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:215
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:368
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:419
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:420
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:421
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:422
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:74
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:268
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:328
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:369
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:370
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:371
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:372
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:373
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:374
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:48
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:211
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:212
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:47
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:50
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:55
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:221
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:222
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:223
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:224
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:225
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:226
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:10
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:70
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:71
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:72
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:73
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:74

