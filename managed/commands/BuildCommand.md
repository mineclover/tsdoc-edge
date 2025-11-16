# [[BuildCommand]]

**Source**: `src/commands/BuildCommand.ts`

## Purpose

TypeScript 소스를 분석하여 심볼 그래프 데이터베이스 구축. TSDoc Edge의 핵심 인덱싱 명령어.

## Workflow

```bash
tsdoc-edge build src
```

**Process**:
1. **File Discovery**: TypeScript 파일 탐색 (`*.ts`, `*.tsx`)
2. **AST Parsing**: TypeScript 컴파일러로 파싱
3. **Symbol Extraction**: 모든 심볼 추출 (class, interface, method, property, etc.)
4. **Relationship Analysis**: 심볼 간 관계 분석 (dependency, call graph, type flow)
5. **Database Storage**: SQLite + JSONL 저장

## Extracted Symbols

**Types**:
- `class`: 133개
- `interface`: 211개
- `method`: 954개
- `property`: 153개
- `type`: 22개
- `function`: 7개

**Total**: 1,511 symbols (현재 프로젝트 기준)

## Relationship Analysis

**Types Analyzed**:
- [[Code Dependency]]: Import/export 관계
- [[Call Relationships]]: 함수/메서드 호출
- [[Type Dependency]]: 타입 참조 관계
- [[IO Dependency]]: 파일 I/O 관계
- [[Pipeline]]: 데이터 흐름

**Total**: 36,050 relationships

## Storage

**Dual Storage**:
1. **SQLite** (`.tsdoc/symbols.db`): 빠른 쿼리
2. **JSONL** (`.tsdoc/registry.jsonl`): Git 버전 관리

## Related

- [[ASTSymbolExtractor]]: AST 파싱 및 심볼 추출
- [[SymbolGraphBuilder]]: 관계 그래프 구축
- [[DatabaseManager]]: 저장소 관리
- [[CoreWorkflow]]: 전체 워크플로우

---

## Backlinks

### Referenced By

- [[CLI Commands]] → /home/user/tsdoc-edge/managed/CLI-COMMANDS.md:42
- [[CLI Commands]] → /home/user/tsdoc-edge/managed/CLI-COMMANDS.md:288
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:24
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:47
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:135
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:169
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:220
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:237
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:271
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:376
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:377
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:378
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:379
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:380
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:381
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:382
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:80
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:165
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:215
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:216
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:217
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:218
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:219
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:220
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:221
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:22
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:217
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:246
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:341
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:342
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:343
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:344
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:345
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:346
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:30
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:405
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:406
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:110
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:128
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:129
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:134
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:169
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:170
- [[Phase Commands]] → /home/user/tsdoc-edge/managed/commands/PhaseCommands.md:56
- [[Phase Commands]] → /home/user/tsdoc-edge/managed/commands/PhaseCommands.md:66
- [[Phase Commands]] → /home/user/tsdoc-edge/managed/commands/PhaseCommands.md:67
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:226
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:255
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:256
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:44
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:141
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:142
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:113
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:193
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:243
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:244
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:245
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:246
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:247
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:248
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:249
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:68
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:169
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:170
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:171
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:172
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:173
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:118
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:287
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:288
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:16
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:238
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:296
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:297
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:298
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:299
- [[CLI Command Development Guide]] → /home/user/tsdoc-edge/managed/guides/command-development-guide.md:262
- [[CLI Command Development Guide]] → /home/user/tsdoc-edge/managed/guides/command-development-guide.md:339
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:62
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:93
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:94
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:46
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:67
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:81
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:82
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:83
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:84
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:74
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:78
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:90
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:116
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:117
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:118
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:119
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:120
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:121
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:94
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:116
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:117
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:71
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:72
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:73
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:9
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:32
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:33
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:9
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:33
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:34
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:34
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:35
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:36
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:46
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:47
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:48
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:15
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:75
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:76
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:77
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:78
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:79
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:22
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:30
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:38
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:182
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:248
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:249
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:250
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:251
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:252
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:253
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:254
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:255
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:83
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:84
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:85
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:223
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:280
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:281
- [[FileScanner]] → /home/user/tsdoc-edge/managed/utilities/FileScanner.md:68
- [[FileScanner]] → /home/user/tsdoc-edge/managed/utilities/FileScanner.md:78
- [[FileScanner]] → /home/user/tsdoc-edge/managed/utilities/FileScanner.md:79
- [[String Utilities]] → /home/user/tsdoc-edge/managed/utilities/StringUtilities.md:57
- [[String Utilities]] → /home/user/tsdoc-edge/managed/utilities/StringUtilities.md:77
- [[String Utilities]] → /home/user/tsdoc-edge/managed/utilities/StringUtilities.md:78
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:123
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:124
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:125

### Implemented By

- BuildCommand → /home/user/tsdoc-edge/src/commands/BuildCommand.ts:47

