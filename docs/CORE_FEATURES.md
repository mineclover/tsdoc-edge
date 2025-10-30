# TSDoc Edge - Core Features

> 핵심 기능 정의 문서 (Core API 기반)

## 1. 핵심 워크플로우 (Core Workflow)

### TSDocEdge
메인 진입점 클래스로 전체 문서화 파이프라인을 통합합니다.
- 소스 파일 처리: 파싱 → 검증 → 문서 생성
- 참조: `src/index.ts:78`

### TSDocParser
TypeScript 소스 코드에서 TSDoc 주석을 파싱합니다.
- TSDoc 표준 준수 파싱
- 커스텀 태그 지원 (@responsibility, @contract, @testScenario 등)
- 참조: `src/parser/TSDocParser.ts`

### ConventionValidator
파싱된 주석이 프로젝트 컨벤션을 준수하는지 검증합니다.
- 필수 태그 확인
- 포맷 규칙 검증
- 참조: `src/validator/ConventionValidator.ts`

### MarkdownGenerator
검증된 주석에서 마크다운 문서를 생성합니다.
- 구조화된 문서 출력
- 참조: `src/generator/MarkdownGenerator.ts`

---

## 2. 분석 기능 (Analysis)

### CodeHealthChecker
코드베이스의 전반적인 건강도를 측정합니다.
- 문서화율, 테스트 커버리지, 연결성 점수 종합
- 참조: `src/analyzer/CodeHealthChecker.ts`

### DocumentationAnalyzer
문서화 품질을 분석하고 개선 제안을 생성합니다.
- 미문서화 심볼 탐지
- 문서 품질 스코어 계산
- 참조: `src/analyzer/DocumentationAnalyzer.ts`

### TrackableStatsCollector
문서화 통계를 수집하고 중요도별로 분류합니다.
- Critical/Important/Normal 레벨 분류
- 시계열 추적을 위한 스냅샷 생성
- 참조: `src/analyzer/TrackableStatsCollector.ts`

### StatsComparator
두 통계 스냅샷을 비교하고 회귀를 탐지합니다.
- 문서화율 하락 경고
- Critical 심볼 삭제 감지
- 참조: `src/analyzer/StatsComparator.ts`

### StatsHistoryManager
통계 이력을 저장하고 트렌드를 분석합니다.
- 최근 50개 스냅샷 유지
- 시간대별 트렌드 분석 (improving/declining/stable)
- 참조: `src/analyzer/StatsHistoryManager.ts`

### ImportanceClassifier
심볼의 중요도를 자동으로 분류합니다.
- Critical: Public API, exported, 계약 있음
- Important: 구조적 타입, 높은 연결성 (≥5)
- Normal: Private 헬퍼
- 참조: `src/analyzer/ImportanceClassifier.ts`

### DomainStructureAnalyzer
도메인 구조와 레이어를 분석합니다.
- 레이어 분리 검증
- 도메인 경계 탐지
- 참조: `src/analyzer/DomainStructureAnalyzer.ts`

### InterfaceAnalyzer
인터페이스 정의와 구현 관계를 분석합니다.
- 참조: `src/analyzer/InterfaceAnalyzer.ts`

### InterfaceDependencyMapper
인터페이스 간 의존성을 매핑합니다.
- 참조: `src/analyzer/InterfaceDependencyMapper.ts`

### TestCoverageAnalyzer
테스트 커버리지를 분석합니다.
- @testScenario 태그 기반 매핑
- 미테스트 심볼 탐지
- 참조: `src/analyzer/TestCoverageAnalyzer.ts`

---

## 3. 심볼 그래프 (Symbol Graph)

### SymbolGraphBuilder
코드베이스의 심볼 의존성 그래프를 구축합니다.
- 심볼 간 관계 추적 (depends-on, used-by, implements 등)
- 그래프 기반 분석의 기반
- 참조: `src/graph/SymbolGraphBuilder.ts`

### SymbolSearchEngine
다양한 조건으로 심볼을 검색합니다.
- 이름, 타입, 경로 패턴 검색
- 관계 기반 필터링
- Public API, 문서화 여부, 테스트 여부 필터
- 참조: `src/graph/SymbolSearchEngine.ts`

---

## 4. 검증 (Validation)

### ConnectivityValidator
심볼 연결성을 검증하고 문제를 탐지합니다.
- 고아 심볼 (orphans) 탐지
- 깨진 링크 탐지
- 순환 의존성 탐지
- 참조: `src/validator/ConnectivityValidator.ts`

### StrictModeValidator
엄격 모드 규칙을 검증합니다.
- Public API 필수 문서화
- Critical 심볼 계약 필수
- 참조: `src/validator/StrictModeValidator.ts`

---

## 5. 자동 수정 (Fixers)

### DocumentationFixer
문서화 문제를 자동으로 수정합니다.
- 누락된 태그 추가
- 포맷 정규화
- 참조: `src/fixer/DocumentationFixer.ts`

### RecursiveImprover
문서 품질을 목표 점수까지 재귀적으로 개선합니다.
- 반복적 개선 루프
- 목표 점수 달성까지 자동 수정
- 참조: `src/fixer/RecursiveImprover.ts`

---

## 6. 문서 생성 (Generators)

### EnhancedMarkdownGenerator
풍부한 메타데이터를 포함한 마크다운을 생성합니다.
- 계약, 책임, 테스트 시나리오 포함
- Future Plans, Design Decisions 포함
- 참조: `src/generator/EnhancedMarkdownGenerator.ts`

### RelatedDocsGenerator
관련 문서를 자동으로 연결합니다.
- 심볼 간 관계 기반 링크 생성
- 참조: `src/generator/RelatedDocsGenerator.ts`

---

## 7. 주석 Fold/Unfold

### CommentExporter
소스 코드의 주석을 외부 파일로 추출합니다.
- 대용량 주석 관리
- 버전 관리 용이성
- 참조: `src/fold/CommentExporter.ts`

### CommentImporter
외부 파일의 주석을 소스 코드로 재삽입합니다.
- 참조: `src/fold/CommentImporter.ts`

### CommentStateManager
주석 상태를 추적하고 관리합니다.
- Fold/Unfold 상태 저장
- 참조: `src/fold/CommentStateManager.ts`

---

## 8. 저장소 (Storage)

### DatabaseManager
SQLite 기반 심볼 데이터베이스를 관리합니다.
- 심볼 정보 영속화
- 빠른 쿼리 지원
- JSONL export/import
- 참조: `src/storage/DatabaseManager.ts`

---

## 9. 설정 (Configuration)

### ConfigManager
프로젝트 설정을 관리합니다.
- 컨벤션 규칙 정의
- 엄격 모드 설정
- 커스텀 태그 설정
- 참조: `src/config/ConfigManager.ts`

---

## 타입 시스템

모든 핵심 타입이 export됩니다:
- **Analysis types**: `AnalysisReport`, `CodeHealthMetrics`, `ImprovementSuggestion`
- **Graph types**: `Symbol`, `SymbolRelationship`, `SymbolGraph`, `SymbolQuery`
- **Statistics types**: `TrackableStatistics`, `ImportanceCriteria`, `DetectableStats`
- **Tag types**: `ContractSpec`, `ResponsibilitySpec`, `TestMapping`, `FuturePlan`
- **Config types**: `TSDocEdgeConfig`, `ValidationResult`

참조: `src/types/`

---

## CLI 명령어

핵심 API를 활용하는 CLI 도구:
- `tsdoc-edge core-api`: 핵심 API 표면 조회
- `tsdoc-edge stats`: 문서화 통계 추적
- `tsdoc-edge analyze`: 코드 품질 분석
- `tsdoc-edge validate`: 연결성 검증
- `tsdoc-edge improve`: 자동 개선

참조: `src/cli.ts`
