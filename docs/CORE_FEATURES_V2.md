# [[CoreFeatures]]

> TSDoc Edge 핵심 기능 카탈로그 - 기능별 정의와 산출물 인덱스

## 개요

이 문서는 TSDoc Edge의 모든 핵심 기능을 **기능 단위**로 정리한 인덱스입니다. 각 기능은 독립된 문서로 관리되며, 코드 구현체와 연결됩니다.

**문서 철학:**
- 📄 **문서**: WHAT (무엇), WHY (왜), WHEN (언제)
- 💻 **코드**: HOW (어떻게), 구현 디테일
- 🔗 **연결**: [[Symbol]]과 @doc 태그로 양방향 연결

---

## 1. [[CoreWorkflow]]

> 소스 파일 처리부터 문서 생성까지의 핵심 파이프라인

**주요 산출물:**
- [TSDocEdge](../src/index.ts#TSDocEdge) - 메인 진입점
- [FileScanner](../src/scanner/FileScanner.ts#FileScanner) - 파일 스캔
- [TSDocParser](../src/parser/TSDocParser.ts#TSDocParser) - TSDoc 파싱
- [ConventionValidator](../src/validator/ConventionValidator.ts#ConventionValidator) - 컨벤션 검증
- [MarkdownGenerator](../src/generator/MarkdownGenerator.ts#MarkdownGenerator) - 문서 생성

**사용 시나리오:**
- TypeScript 프로젝트 자동 문서화
- TSDoc 주석 검증 및 표준화
- 마크다운 API 문서 생성

[📖 상세 문서](./features/CORE_WORKFLOW.md)

---

## 2. [[AnalysisFeatures]]

> 코드 건강도, 문서 품질, 중요도 분석

**주요 산출물:**

### 건강도 측정
- [CodeHealthChecker](../src/analyzer/CodeHealthChecker.ts#CodeHealthChecker) - 전체 건강도 종합
- [DocumentationAnalyzer](../src/analyzer/DocumentationAnalyzer.ts#DocumentationAnalyzer) - 문서 품질 분석

### 통계 추적
- [TrackableStatsCollector](../src/analyzer/TrackableStatsCollector.ts#TrackableStatsCollector) - 중요도별 통계
- [StatsComparator](../src/analyzer/StatsComparator.ts#StatsComparator) - 회귀 탐지
- [StatsHistoryManager](../src/analyzer/StatsHistoryManager.ts#StatsHistoryManager) - 트렌드 분석

### 중요도 분류
- [ImportanceClassifier](../src/analyzer/ImportanceClassifier.ts#ImportanceClassifier)
  - **Critical**: Public API, exported, 계약 있음
  - **Important**: 구조적 타입, 높은 연결성 (≥5)
  - **Normal**: Private 헬퍼

### 도메인 분석
- [DomainStructureAnalyzer](../src/analyzer/DomainStructureAnalyzer.ts#DomainStructureAnalyzer) - 레이어 분리 검증
- [InterfaceAnalyzer](../src/analyzer/InterfaceAnalyzer.ts#InterfaceAnalyzer) - 인터페이스 관계 분석
- [InterfaceDependencyMapper](../src/analyzer/InterfaceDependencyMapper.ts#InterfaceDependencyMapper) - 의존성 매핑
- [DataFlowAnalyzer](../src/analyzer/DataFlowAnalyzer.ts#DataFlowAnalyzer) - DTO 패턴 및 데이터 흐름 분석

### 테스트 분석
- [TestCoverageAnalyzer](../src/analyzer/TestCoverageAnalyzer.ts#TestCoverageAnalyzer) - @testScenario 기반 커버리지

**CLI 명령어:**
```bash
tsdoc-edge analyze src          # 품질 분석
tsdoc-edge health src           # 건강도 측정
tsdoc-edge stats src            # 통계 추적
tsdoc-edge undocumented         # 미문서화 심볼
tsdoc-edge untested             # 미테스트 심볼
```

---

## 3. [[SymbolGraphFeatures]]

> 심볼 간 의존성 그래프 구축 및 깊이별 탐색

**주요 산출물:**
- [SymbolGraphBuilder](../src/graph/SymbolGraphBuilder.ts#SymbolGraphBuilder) - 그래프 구축
- [SymbolSearchEngine](../src/graph/SymbolSearchEngine.ts#SymbolSearchEngine) - 다양한 조건 검색
- [DepthTraverser](../src/graph/DepthTraverser.ts#DepthTraverser) - 깊이별 탐색
- [ASTSymbolExtractor](../src/analyzer/ASTSymbolExtractor.ts#ASTSymbolExtractor) - AST 심볼 추출
- [DependencyResolver](../src/analyzer/DependencyResolver.ts#DependencyResolver) - Import 해석

**탐색 방향:**
- `dependencies`: 하위 의존성 (이 코드가 사용하는 것)
- `dependents`: 상위 의존성 (이 코드를 사용하는 것)
- `both`: 양방향

**사용 시나리오:**
- 리팩토링 영향 범위 파악
- 버그 수정 전 영향 분석
- 순환 의존성 탐지
- PR 리뷰용 문서 생성

**CLI 명령어:**
```bash
tsdoc-edge scan --entry=<symbol> --direction=<dir> --depth=<N>
tsdoc-edge deps <id>            # 1단계 의존성
tsdoc-edge used-by <id>         # 1단계 사용처
tsdoc-edge who-uses <name>      # AST 기반 검색
```

[📖 상세 문서](./features/SYMBOL_GRAPH.md)
[📘 베스트 프랙티스](./DEPENDENCY_ANALYSIS_GUIDE.md)

---

## 4. [[ValidationFeatures]]

> 컨벤션, 연결성, 엄격 모드 검증

**주요 산출물:**
- [ConventionValidator](../src/validator/ConventionValidator.ts#ConventionValidator) - 프로젝트 컨벤션
- [ConnectivityValidator](../src/validator/ConnectivityValidator.ts#ConnectivityValidator) - 연결성 검증
- [StrictModeValidator](../src/validator/StrictModeValidator.ts#StrictModeValidator) - 엄격 모드

**검증 항목:**
- 필수 태그 확인
- 고아 심볼 탐지
- 깨진 링크 탐지
- 순환 의존성 탐지
- Public API 문서화 강제

**CLI 명령어:**
```bash
tsdoc-edge validate             # 전체 검증
tsdoc-edge orphans              # 고아 심볼
```

---

## 5. [[DocumentSymbolSystem]]

> Wiki 스타일 [[]] 문법으로 문서와 코드를 양방향 연결

**주요 산출물:**
- [DocumentSymbolParser](../src/doc-symbol/DocumentSymbolParser.ts#DocumentSymbolParser) - 마크다운 [[]] 파싱
- [TSDocSymbolParser](../src/doc-symbol/TSDocSymbolParser.ts#TSDocSymbolParser) - 코드 @doc 태그 파싱
- [DocumentSymbolRegistry](../src/doc-symbol/DocumentSymbolRegistry.ts#DocumentSymbolRegistry) - SSOT 검증 및 저장
- [BacklinkGenerator](../src/doc-symbol/BacklinkGenerator.ts#BacklinkGenerator) - 자동 백링크 생성

**핵심 개념:**
- `# [[Symbol]]` - Primary 정의 (SSOT, 파일당 1개)
- `## [[Symbol]]` - Auxiliary 정의
- `[[Symbol]]` - 인라인 참조
- `@doc [[Symbol]]` - 코드에서 문서 연결

**사용 시나리오:**
- 용어 정의 중앙 관리
- 중복 정의 방지
- 문서 간 참조 추적
- 코드-문서 동기화

**CLI 명령어:**
```bash
tsdoc-edge index-docs [dir]              # 전체 인덱싱
tsdoc-edge index-docs --file=<path>      # 증분 업데이트
tsdoc-edge validate-docs                 # SSOT 검증
tsdoc-edge update-backlinks [path]       # 백링크 생성
tsdoc-edge find-doc <symbol>             # 심볼 찾기
```

[📖 상세 문서](./features/DOCUMENT_SYMBOL_SYSTEM.md)
[📘 설계 문서](./DOCUMENT_SYMBOL_DESIGN.md)

---

## 6. [[AutoIndexing]]

> 파일 저장 시 자동으로 문서 심볼 인덱스 업데이트

**지원 방식:**
- **Git Hook**: Pre-commit 시 자동 업데이트
- **VSCode Task**: 파일 저장 시 자동 실행
- **File Watcher**: fswatch 기반 실시간 감시
- **GitHub Actions**: CI/CD 통합

**증분 업데이트:**
```bash
# 특정 파일만 업데이트 (빠름, ~0.1s)
tsdoc-edge index-docs --file=docs/API.md

# 전체 재스캔 (느림, ~2-5s)
tsdoc-edge index-docs docs
```

**설치:**
```bash
# Git hook
cp examples/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# VSCode
# .vscode/settings.json에 Run on Save 설정 추가
```

[📖 상세 가이드](./AUTO_INDEXING_GUIDE.md)

---

## 7. [[GeneratorFeatures]]

> 다양한 형식의 문서 생성

**주요 산출물:**
- [MarkdownGenerator](../src/generator/MarkdownGenerator.ts#MarkdownGenerator) - 기본 마크다운
- [EnhancedMarkdownGenerator](../src/generator/EnhancedMarkdownGenerator.ts#EnhancedMarkdownGenerator) - 확장 메타데이터
- [RelatedDocsGenerator](../src/generator/RelatedDocsGenerator.ts#RelatedDocsGenerator) - 관련 문서 연결
- [InsightDocGenerator](../src/generator/InsightDocGenerator.ts#InsightDocGenerator) - 깊이별 탐색 결과 문서화

**생성 형식:**
- API 문서 (마크다운)
- 계약 명세 (@contract, @precondition 등)
- 테스트 시나리오 (@testScenario)
- 설계 결정 (ADR)
- 미래 계획 (@futurePlan)

---

## 8. [[FixerFeatures]]

> 문서화 문제 자동 수정

**주요 산출물:**
- [DocumentationFixer](../src/fixer/DocumentationFixer.ts#DocumentationFixer) - 자동 수정
- [RecursiveImprover](../src/fixer/RecursiveImprover.ts#RecursiveImprover) - 재귀적 개선

**기능:**
- 누락된 태그 추가
- 포맷 정규화
- 목표 점수까지 반복 개선

**CLI 명령어:**
```bash
tsdoc-edge fix src --dry-run          # 미리보기
tsdoc-edge improve --target=90        # 목표 점수까지 개선
```

---

## 9. [[FoldUnfoldSystem]]

> 주석 접기/펼치기로 대용량 주석 관리

**주요 산출물:**
- [CommentExporter](../src/fold/CommentExporter.ts#CommentExporter) - 주석 추출
- [CommentImporter](../src/fold/CommentImporter.ts#CommentImporter) - 주석 재삽입
- [CommentStateManager](../src/fold/CommentStateManager.ts#CommentStateManager) - 상태 추적

**사용 시나리오:**
- 대용량 TSDoc 주석 외부 관리
- 버전 관리 용이성
- 팀 협업 워크플로우

[📖 가이드](./FOLD_UNFOLD_GUIDE.md)

---

## 10. [[StorageFeatures]]

> 심볼 정보 영속화 및 관리

**주요 산출물:**
- [DatabaseManager](../src/storage/DatabaseManager.ts#DatabaseManager) - SQLite 기반 DB
- [SymbolRegistryManager](../src/storage/SymbolRegistryManager.ts#SymbolRegistryManager) - JSONL 레지스트리

**저장 형식:**
- **SQLite**: 빠른 쿼리, 복잡한 분석
- **JSONL**: Git 친화적, 수동 편집 가능

**CLI 명령어:**
```bash
tsdoc-edge id new <file> <symbol>       # ID 생성
tsdoc-edge id list                      # 전체 심볼
tsdoc-edge tree                         # 계층 구조
```

---

## 11. [[ConfigurationSystem]]

> 프로젝트 설정 관리

**주요 산출물:**
- [ConfigManager](../src/config/ConfigManager.ts#ConfigManager) - 설정 관리

**설정 항목:**
- 컨벤션 규칙
- 엄격 모드
- 커스텀 태그
- 경로 커스터마이징

**CLI 명령어:**
```bash
tsdoc-edge init                         # 초기 설정
tsdoc-edge init --name=<name> --version=<ver>
```

[📖 가이드](./CONFIG_GUIDE.md)

---

## 12. [[UtilityFeatures]]

> 보조 유틸리티

**주요 산출물:**
- [IdGenerator](../src/utils/IdGenerator.ts#IdGenerator) - 고유 ID 생성
  - Sequential 모드: 001, 002, 003...
  - Random 모드: a3f, b2k, c1m...
  - 충돌 방지

---

## 타입 시스템

모든 핵심 타입이 export됩니다:

```typescript
// Analysis types
import type { AnalysisReport, CodeHealthMetrics, ImprovementSuggestion } from 'tsdoc-edge';

// Graph types
import type { Symbol, SymbolRelationship, SymbolGraph, SymbolQuery } from 'tsdoc-edge';

// Doc Symbol types
import type { DocumentSymbol, ParsedDocSymbols, CodeConnection, Backlink } from 'tsdoc-edge';

// Statistics types
import type { TrackableStatistics, ImportanceCriteria, DetectableStats } from 'tsdoc-edge';

// Tag types
import type { ContractSpec, ResponsibilitySpec, TestMapping, FuturePlan } from 'tsdoc-edge';

// Config types
import type { TSDocEdgeConfig, ValidationResult } from 'tsdoc-edge';
```

참조: [src/types/](../src/types/)

---

## CLI 명령어 전체 목록

### 초기 설정
```bash
tsdoc-edge init [options]
```

### 심볼 ID 관리
```bash
tsdoc-edge id new <file> <symbol>       # ID 생성
tsdoc-edge id list                      # 전체 목록
tsdoc-edge deps <id>                    # 의존성
tsdoc-edge used-by <id>                 # 사용처
tsdoc-edge tree                         # 계층 구조
tsdoc-edge find-method <Class#method>   # 메서드 찾기
```

### 그래프 탐색
```bash
tsdoc-edge scan [options]               # N단계 깊이 탐색
tsdoc-edge who-uses <name>              # AST 기반 검색
```

### 문서 품질
```bash
tsdoc-edge analyze [path]               # 품질 분석
tsdoc-edge health [path]                # 건강도 측정
tsdoc-edge stats [path]                 # 통계 추적
tsdoc-edge core-api                     # 핵심 API 표면
```

### 검증
```bash
tsdoc-edge validate                     # 전체 검증
tsdoc-edge orphans                      # 고아 심볼
tsdoc-edge undocumented                 # 미문서화
tsdoc-edge untested                     # 미테스트
tsdoc-edge without-responsibility       # 책임 미정의
tsdoc-edge without-contract             # 계약 미정의
```

### 자동 수정
```bash
tsdoc-edge fix [path]                   # 문제 수정
tsdoc-edge improve                      # 재귀적 개선
```

### 문서 심볼
```bash
tsdoc-edge index-docs [dir]             # 인덱싱
tsdoc-edge validate-docs [dir]          # SSOT 검증
tsdoc-edge update-backlinks [path]      # 백링크 생성
tsdoc-edge find-doc <symbol>            # 심볼 찾기
```

### 미래 계획
```bash
tsdoc-edge plans [--status=<status>]    # 계획 목록
tsdoc-edge todos                        # TODO 목록
```

---

## 학습 경로

### 1. 기본 사용법
1. [[CoreWorkflow]] - 메인 파이프라인 이해
2. CLI로 첫 문서 생성
3. 검증 규칙 적용

### 2. 심화 분석
4. [[AnalysisFeatures]] - 코드 품질 분석
5. [[SymbolGraphFeatures]] - 의존성 탐색
6. 리팩토링 시나리오 실습

### 3. 문서 시스템
7. [[DocumentSymbolSystem]] - [[]] 문법 학습
8. [[AutoIndexing]] - 자동화 설정
9. 프로젝트에 적용

### 4. 고급 활용
10. [[ValidationFeatures]] - Strict Mode
11. [[FoldUnfoldSystem]] - 대용량 주석 관리
12. CI/CD 통합

---

## 관련 문서

### 가이드
- [기본 사용법](../USAGE_GUIDE.md)
- [Strict Mode](../STRICT_MODE_GUIDE.md)
- [의존성 분석](./DEPENDENCY_ANALYSIS_GUIDE.md)
- [자동 인덱싱](./AUTO_INDEXING_GUIDE.md)
- [Fold/Unfold](./FOLD_UNFOLD_GUIDE.md)
- [설정 파일](./CONFIG_GUIDE.md)

### 설계 문서
- [문서 심볼 설계](./DOCUMENT_SYMBOL_DESIGN.md)
- [TSDoc 스펙 지원](./TSDOC_SPEC_SUPPORT.md)

### 컨벤션
- [TSDoc 컨벤션](./tsdoc-conventions/)

---

## Backlinks

### Referenced By

- [[DocumentSymbolSystem]] → /Users/junwoobang/project/tsdoc-edge/docs/DOCUMENTATION_REVIEW_SUMMARY.md:71

