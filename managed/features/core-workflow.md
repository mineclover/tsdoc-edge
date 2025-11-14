---
tsdoc: managed
version: 1.0.0
status: active
primary: CoreWorkflow
category: feature
tags:
  - core
  - pipeline
  - workflow
lastUpdated: 2025-01-15
---
# [[CoreWorkflow]]

> 소스 파일 처리부터 문서 생성까지의 핵심 파이프라인
## 개요

TSDoc Edge의 메인 워크플로우는 TypeScript 소스 코드를 스캔하여 TSDoc 주석을 파싱하고, 컨벤션 규칙을 검증한 후 마크다운 문서를 생성하는 파이프라인입니다.
**해결하는 문제:**
- TypeScript 프로젝트의 자동 문서화
- TSDoc 표준 기반 일관된 문서 생성
- 커스텀 태그 지원으로 확장 가능한 문서화
## 워크플로우 단계

1. 파일 스캔 → TypeScript 파일 수집
2. TSDoc 파싱 → 주석 추출 및 구조화
3. 컨벤션 검증 → 프로젝트 규칙 적용
4. 문서 생성 → 마크다운 출력

## 핵심 산출물
### 1. 진입점
- [TSDocEdge](../../../src/index.ts#TSDocEdge) - 메인 클래스, 전체 파이프라인 통합
**주요 메서드:**
- `processFile(filePath, sourceCode)` - 파일 하나 처리
- `getParser()`, `getValidator()`, `getGenerator()` - 내부 컴포넌트 접근

### 2. 파일 스캔
- [FileScanner](../../../src/scanner/FileScanner.ts#FileScanner) - 프로젝트 디렉토리 스캔

**기능:**
- Glob 패턴 기반 파일 탐색
- `node_modules`, `dist` 등 제외 패턴 지원
- 재귀적 디렉토리 스캔

### 3. TSDoc 파싱
- [TSDocParser](../../../src/parser/TSDocParser.ts#TSDocParser) - TSDoc 주석 파싱

**기능:**
- TSDoc 표준 태그 지원 (35개)
- 커스텀 태그 지원 (`@responsibility`, `@contract`, `@testScenario` 등)
- TypeScript Compiler API 기반 정확한 파싱

### 4. 컨벤션 검증
- [ConventionValidator](../../../src/validator/ConventionValidator.ts#ConventionValidator) - 프로젝트 규칙 검증

**검증 항목:**
- 필수 태그 확인
- 포맷 규칙 검증
- Public API 문서화 강제

### 5. 문서 생성
- [MarkdownGenerator](../../../src/generator/MarkdownGenerator.ts#MarkdownGenerator) - 기본 마크다운 생성
- [EnhancedMarkdownGenerator](../../../src/generator/EnhancedMarkdownGenerator.ts#EnhancedMarkdownGenerator) - 확장 메타데이터 포함
**출력 형식:**
- 구조화된 마크다운
- 계약, 책임, 테스트 시나리오 포함
- 설계 결정 및 미래 계획
## CLI 명령어

### Core Workflow Commands

**[[InitCommand]]** - `tsdoc-edge init`
- 프로젝트 초기화
- `.tsdoc.config.json` 생성
- **Implementation Chain**:
  - Command: `src/commands/Phase4Commands.ts:153`
  - Manager: [[ConfigManager]] (`src/config/ConfigManager.ts`)
  - Creates: `.tsdoc.config.json` with default settings

**[[BuildCommand]]** - `tsdoc-edge build <path>`
- 소스 코드 파싱 및 심볼 추출
- 관계 분석 및 DB 저장
- **Implementation Chain**:
  - Command: `src/commands/BuildCommand.ts:40`
  - Extractor: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts`)
  - Parser: [[TSDocParser]] (`src/parser/TSDocParser.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
  - Output: SQLite DB + JSONL registry

**[[WorkContextCommand]]** - `tsdoc-edge work-context <file-path>`
- 파일 수정 전 완전한 컨텍스트 제공
- 의존성, 역의존성, 테스트 매핑 표시
- **Implementation Chain**:
  - Command: `src/commands/WorkContextCommand.ts:60`
  - Parser: [[TSDocParser]] (`src/parser/TSDocParser.ts`)
  - Doc Parser: [[DocumentSymbolParser]] (`src/doc-symbol/DocumentSymbolParser.ts`)
  - Graph: [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**[[ExploreEntrypointCommand]]** - `tsdoc-edge explore-entrypoint <doc-path> [--detect-orphans]`
- 문서 진입점부터 코드 탐색
- 심볼 커버리지 및 고아 코드 탐지
- **Implementation Chain**:
  - Command: `src/commands/ExploreEntrypointCommand.ts:45`
  - Doc Parser: [[DocumentSymbolParser]] (`src/doc-symbol/DocumentSymbolParser.ts`)
  - Mermaid Parser: [[MermaidSymbolExtractor]] (`src/doc-symbol/MermaidSymbolExtractor.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
  - Algorithm: BFS traversal through [[Symbol]] references

**[[ParseCommand]]** - `tsdoc-edge parse <file-path>`
- 단일 파일 파싱 및 결과 출력
- 디버깅 및 검증 용도
- **Implementation Chain**:
  - Command: `src/commands/ParseCommand.ts:37`
  - Extractor: [[EnhancedDocExtractor]] (`src/parser/EnhancedDocExtractor.ts`)
  - Parser: [[TSDocParser]] (`src/parser/TSDocParser.ts`)
  - Output: Console display with completeness metrics

### Supporting Commands

**[[AnalyzeCommand]]** - `tsdoc-edge analyze <path>`
- 코드 품질 분석
- **Implementation Chain**:
  - Command: `src/commands/AnalyzeCommand.ts:36`
  - Analyzer: [[CodeHealthChecker]] (`src/analyzer/CodeHealthChecker.ts`)
  - Output: [[AnalysisReport]] with metrics and issues

**[[HealthCommand]]** - `tsdoc-edge health <path>`
- 코드 건강도 점수 계산
- **Implementation Chain**:
  - Command: `src/commands/HealthCommand.ts:36`
  - Analyzer: [[CodeHealthChecker]] (`src/analyzer/CodeHealthChecker.ts`)
  - Metrics: [[CodeHealthMetrics]] (`src/types/analysis.ts`)
  - Output: Health grade (A+ to F) with recommendations

**[[ValidateCommand]]** - `tsdoc-edge validate [path]`
- 전체 검증 (컨벤션, 연결성)
- **Implementation Chain**:
  - Command: `src/commands/ValidateCommand.ts:67`
  - Graph: [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`)
  - Validator: [[ConnectivityValidator]] (`src/validator/ConnectivityValidator.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**[[UndocumentedCommand]]** - `tsdoc-edge undocumented`
- 미문서화 심볼 탐지
- **Implementation Chain**:
  - Command: `src/commands/Phase5Commands.ts:573`
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
  - Query: Filters symbols with missing documentation
## 관련 기능

- [[AnalysisFeatures]] - 코드 건강도 및 문서 품질 분석
- [[ValidationFeatures]] - 엄격 모드 및 연결성 검증
- [[SymbolGraphFeatures]] - 심볼 의존성 그래프 구축
- [[DocumentSymbolSystem]] - 문서 심볼 시스템

---
---

---
---

---

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:168
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:446
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:220
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:221
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:259
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:260
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:261
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:262
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:45
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:46
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:54
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:99
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:100
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:101
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:102
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:22
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:39
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:40
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:41
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:42
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:64
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:65
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:178
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:179
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:40
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:41
- [[Phase Commands]] → /home/user/tsdoc-edge/managed/commands/PhaseCommands.md:57
- [[Phase Commands]] → /home/user/tsdoc-edge/managed/commands/PhaseCommands.md:68
- [[Phase Commands]] → /home/user/tsdoc-edge/managed/commands/PhaseCommands.md:69
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:159
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:160
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:43
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:44
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:56
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:100
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:101
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:102
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:103
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:237
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:274
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:275
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:45
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:46
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:278
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:279
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:280
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:281
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:282
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:283
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:284
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:285
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:286
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:287
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:123
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:124
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:125
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:126
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:36
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:37
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:256
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:343
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:344
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:345
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:346
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:347
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:348
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:165
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:195
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:196
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:197
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:32
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:280
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:338
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:339
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:340
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:341
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:342
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:343
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:103
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:140
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:141
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:142
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:143
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:144
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:145
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:194
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:241
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:248
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:323
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:324
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:325
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:326
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:327
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:328
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:208
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:282
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:283
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:284
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:285
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:286
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:287
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:257
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:290
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:222
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:262
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:373
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:374
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:375
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:376
- [[EnhancedDocExtractor]] → /home/user/tsdoc-edge/managed/parser/EnhancedDocExtractor.md:258
- [[EnhancedDocExtractor]] → /home/user/tsdoc-edge/managed/parser/EnhancedDocExtractor.md:259
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:40
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:41
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:42
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:43
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:44
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:45
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:129
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:130
- [[CodeHealthMetrics]] → /home/user/tsdoc-edge/managed/types/CodeHealthMetrics.md:91
- [[CodeHealthMetrics]] → /home/user/tsdoc-edge/managed/types/CodeHealthMetrics.md:92
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:113
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:114
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:118
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:119
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:145
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:146
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:147
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:148
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:227
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:266
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:267

### Implemented By

- TSDocEdge → /home/user/tsdoc-edge/src/index.ts:147

