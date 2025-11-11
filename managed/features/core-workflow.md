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
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:202
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:234
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:235
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:35
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:54
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:77
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:78
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:22
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:34
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:35
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:43
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:173
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:33
- [[Phase Commands]] → /home/user/tsdoc-edge/managed/commands/PhaseCommands.md:57
- [[Phase Commands]] → /home/user/tsdoc-edge/managed/commands/PhaseCommands.md:67
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:148
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:35
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:56
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:81
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:82
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:237
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:265
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:37
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:241
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:242
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:243
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:244
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:245
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:115
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:116
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:33
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:256
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:301
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:302
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:303
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:304
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:165
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:188
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:189
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:32
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:280
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:334
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:335
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:336
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:337
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:103
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:132
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:133
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:134
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:135
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:194
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:248
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:291
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:292
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:293
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:294
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:208
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:254
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:255
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:256
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:257
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:257
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:222
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:262
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:336
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:337
- [[EnhancedDocExtractor]] → /home/user/tsdoc-edge/managed/parser/EnhancedDocExtractor.md:254
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:35
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:36
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:37
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:117
- [[CodeHealthMetrics]] → /home/user/tsdoc-edge/managed/types/CodeHealthMetrics.md:88
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:93
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:115
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:119
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:120
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:227
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:258

### Implemented By

- TSDocEdge → /home/user/tsdoc-edge/src/index.ts:145

