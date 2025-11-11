---
tsdoc: managed
version: 1.0.0
status: active
primary: AnalysisFeatures
category: feature
canonical: true
aliases: [Analysis Features]
tags:
  - analysis
  - quality
lastUpdated: 2025-01-15
---

# [[AnalysisFeatures]]
> 코드 건강도, 문서 품질, 중요도 분석

## 개요
코드베이스의 문서화 품질, 테스트 커버리지, 심볼 중요도를 자동으로 분석하고 개선 방향을 제시합니다. 시간에 따른 품질 트렌드를 추적하고 회귀(regression)를 탐지합니다.

**해결하는 문제:**
- 문서화 품질 측정 및 개선 필요성 파악
- 중요한 코드의 우선순위 식별
- 문서화 회귀 방지 (품질 하락 경고)
- 테스트 커버리지 가시성
- 도메인 구조 및 레이어 분리 검증

## 핵심 개념
### 1. 코드 건강도 (Code Health)

종합 점수 = (문서화율 × 0.4) + (테스트 커버리지 × 0.3) + (연결성 × 0.3)
**측정 항목:**
- 문서화율: TSDoc 주석이 있는 심볼 비율
- 테스트 커버리지: @testScenario로 연결된 심볼 비율
- 연결성: 고아 심볼, 순환 의존성 등
### 2. 중요도 분류 (Importance Level)

**Critical (치명적):**
- Public API (exported)
- @contract 태그 있음
- 다른 코드가 의존하는 핵심 인터페이스

**Important (중요):**
- 구조적 타입 (interface, type alias)
- 높은 연결성 (≥5개 심볼이 의존)
**Normal (일반):**
- Private 헬퍼 함수
- 내부 유틸리티

### 3. 트렌드 분석
**Improving (개선 중):**
- 최근 3개 스냅샷에서 품질 상승
**Declining (하락 중):**
- 최근 3개 스냅샷에서 품질 하락 → 경고
**Stable (안정):**
- 변화 없음
## 핵심 산출물

### Health & Quality
- [CodeHealthChecker](../../src/analyzer/CodeHealthChecker.ts#CodeHealthChecker) - 전체 건강도 종합
  - 문서화, 테스트, 연결성 통합 점수
  - 0-100 점수로 정량화

- [DocumentationAnalyzer](../../src/analyzer/DocumentationAnalyzer.ts#DocumentationAnalyzer) - 문서 품질 분석
  - 미문서화 심볼 탐지
  - 문서 품질 스코어 계산
  - 개선 제안 생성

### Statistics & Tracking
- [TrackableStatsCollector](../../src/analyzer/TrackableStatsCollector.ts#TrackableStatsCollector) - 중요도별 통계
  - Critical/Important/Normal 분류
  - 시계열 추적용 스냅샷

- [StatsComparator](../../src/analyzer/StatsComparator.ts#StatsComparator) - 회귀 탐지
  - 이전 스냅샷과 비교
  - 문서화율 하락 경고
  - Critical 심볼 삭제 감지

- [StatsHistoryManager](../../src/analyzer/StatsHistoryManager.ts#StatsHistoryManager) - 트렌드 분석
  - 최근 50개 스냅샷 유지
  - Improving/Declining/Stable 판단
### Importance Classification
- [ImportanceClassifier](../../src/analyzer/ImportanceClassifier.ts#ImportanceClassifier) - 자동 중요도 분류
  - Public API, 계약, 연결성 기반
  - 3단계 우선순위 자동 할당
### Domain Analysis
- [DomainStructureAnalyzer](../../src/analyzer/DomainStructureAnalyzer.ts#DomainStructureAnalyzer) - 도메인 구조 분석
  - 레이어 분리 검증 (UI, Domain, Infrastructure)
  - 도메인 경계 탐지
- [InterfaceAnalyzer](../../src/analyzer/InterfaceAnalyzer.ts#InterfaceAnalyzer) - 인터페이스 관계
  - 정의와 구현 관계 분석
- [InterfaceDependencyMapper](../../src/analyzer/InterfaceDependencyMapper.ts#InterfaceDependencyMapper) - 의존성 매핑
  - 인터페이스 간 의존성 그래프
- [DataFlowAnalyzer](../../src/analyzer/DataFlowAnalyzer.ts#DataFlowAnalyzer) - 데이터 흐름 분석
  - DTO 패턴 분류 (Request, Response, Domain, Internal)
  - 데이터 변환 경로 추적
  - 변환 체인 탐지 및 검증
### Test Coverage
- [TestCoverageAnalyzer](../../src/analyzer/TestCoverageAnalyzer.ts#TestCoverageAnalyzer) - 테스트 커버리지
  - @testScenario 태그 기반 매핑
  - 미테스트 심볼 탐지
### AST Analysis
- [ASTSymbolExtractor](../../src/analyzer/ASTSymbolExtractor.ts#ASTSymbolExtractor) - AST 심볼 추출
  - 클래스, 인터페이스, 함수, 타입 추출
  - Export 정보 및 접근 제어자
  - Import 문 분석

- [DependencyResolver](../../src/analyzer/DependencyResolver.ts#DependencyResolver) - Import 경로 해석
  - 모듈 경로 해석 (.ts, .tsx, index)
  - Import 문과 심볼 매핑
## 사용 시나리오

### 시나리오 1: 프로젝트 품질 측정
```bash
# 전체 건강도 확인
tsdoc-edge health src
```
**출력 예시:**
```
📊 Code Health Score: 78/100

Breakdown:
  Documentation:  85% ✅
  Test Coverage:  70% ⚠️
  Connectivity:   80% ✅

Recommendations:
  - Add tests for 15 untested symbols
  - Document 3 public APIs
```

### 시나리오 2: 문서화 통계 추적
```bash
# 현재 통계 수집 및 저장
tsdoc-edge stats src --save
```
**저장된 스냅샷:**
```json
{
  "timestamp": "2025-10-31T10:00:00Z",
  "critical": {
    "total": 25,
    "documented": 24,
    "tested": 23,
    "rate": 96%
  },
  "important": {
    "total": 50,
    "documented": 40,
    "tested": 35,
    "rate": 80%
  }
}
```
### 시나리오 3: 회귀 탐지 (CI/CD)

```bash
# PR 전후 비교
tsdoc-edge stats src --compare
```

**출력 예시:**
```
⚠️  Regression Detected!
Documentation Rate:
  Before: 85%
  After:  82% (-3%) ❌

Changes:
  - UserService.createUser: documentation removed
  - AuthController.login: documentation removed
Critical Symbols:
  - No critical symbols deleted ✅
```

→ PR 블로킹 가능
### 시나리오 4: 트렌드 분석

```bash
# 장기 트렌드 확인
tsdoc-edge stats src
```

**출력 예시:**
```
📈 Documentation Trend: Improving ✅
Last 7 days:
  Day 1: 75%
  Day 2: 78%
  Day 3: 80%
  Day 4: 82%
  Day 5: 85% ← Current
Average improvement: +2.5% per day
```
### 시나리오 5: 중요한 코드 식별

```bash
# Critical 심볼만 필터링
tsdoc-edge analyze src --min-importance=critical
```

**출력 예시:**
```
🔴 Critical Symbols (25)
Undocumented:
  - UserService.authenticate
  - PaymentProcessor.charge

Untested:
  - OrderManager.createOrder
```
→ 우선순위 높은 것부터 문서화/테스트

### 시나리오 6: 도메인 레이어 검증
```bash
# 레이어 분리 확인
tsdoc-edge analyze src --check-layers
```
**출력 예시:**
```
⚠️  Layer Violation Detected!

UI Layer → Domain Layer: ✅
Domain Layer → Infrastructure: ✅
UI Layer → Infrastructure: ❌
Violations:
  - UserComponent imports DatabaseManager directly
  - OrderPage imports RepositoryImpl directly
```
## CLI 명령어

### Query & Analysis Commands

**[[HealthCommand]]** - `tsdoc-edge health [path]`
- 코드 건강도 종합 점수 (문서화, 테스트, 연결성)
- **Implementation Chain**:
  - Command: `src/commands/HealthCommand.ts`
  - Analyzer: [[CodeHealthChecker]] (`src/analyzer/CodeHealthChecker.ts`)
  - Uses: [[DocumentationAnalyzer]] (`src/analyzer/DocumentationAnalyzer.ts`), [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`)
  - Storage: [[SymbolGraphBuilder]] (`src/graph/SymbolGraph.ts`)

**[[AnalyzeCommand]]** - `tsdoc-edge analyze [path]`
- 코드 품질 분석 (중요도별, 레이어별)
- **Implementation Chain**:
  - Command: `src/commands/AnalyzeCommand.ts`
  - Uses: [[ImportanceClassifier]] (`src/analyzer/ImportanceClassifier.ts`), [[DomainStructureAnalyzer]] (`src/analyzer/DomainStructureAnalyzer.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**[[StatsCommand]]** - `tsdoc-edge stats [path] [--save] [--compare]`
- 통계 수집 및 스냅샷 저장/비교
- **Implementation Chain**:
  - Command: `src/commands/StatsCommand.ts`
  - Collector: [[TrackableStatsCollector]] (`src/analyzer/TrackableStatsCollector.ts`)
  - Comparator: [[StatsComparator]] (`src/analyzer/StatsComparator.ts`)
  - History: [[StatsHistoryManager]] (`src/analyzer/StatsHistoryManager.ts`)

**[[SuggestCommand]]** - `tsdoc-edge suggest [path] [--limit=30]`
- 개선 제안 생성 (우선순위별)
- **Implementation Chain**:
  - Command: `src/commands/SuggestCommand.ts`
  - Uses: [[ImportanceClassifier]] (`src/analyzer/ImportanceClassifier.ts`), [[DocumentationAnalyzer]] (`src/analyzer/DocumentationAnalyzer.ts`)
  - Storage: [[SymbolGraphBuilder]] (`src/graph/SymbolGraph.ts`)

**[[DepsCommand]]** - `tsdoc-edge deps <symbol-id>`
- 심볼의 의존성 조회
- **Implementation Chain**:
  - Command: `src/commands/DepsCommand.ts`
  - Resolver: [[DependencyResolver]] (`src/analyzer/DependencyResolver.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**[[WhoUsesCommand]]** - `tsdoc-edge who-uses <symbol-id>`
- 심볼을 사용하는 곳 조회 (역의존성)
- **Implementation Chain**:
  - Command: `src/commands/WhoUsesCommand.ts`
  - Graph: [[SymbolGraphBuilder]] (`src/graph/SymbolGraph.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**[[OrphansCommand]]** - `tsdoc-edge orphans`
- 고아 심볼 탐지 (연결되지 않은 코드)
- **Implementation Chain**:
  - Command: `src/commands/OrphansCommand.ts`
  - Graph: [[SymbolGraphBuilder]] (`src/graph/SymbolGraph.ts`)
  - Algorithm: DFS traversal from entry points

**[[UndocumentedCommand]]** - `tsdoc-edge undocumented`
- 미문서화 심볼 탐지
- **Implementation Chain**:
  - Command: `src/commands/UndocumentedCommand.ts`
  - Analyzer: [[DocumentationAnalyzer]] (`src/analyzer/DocumentationAnalyzer.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**[[UntestedCommand]]** - `tsdoc-edge untested`
- 미테스트 심볼 탐지
- **Implementation Chain**:
  - Command: `src/commands/UntestedCommand.ts`
  - Analyzer: [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**[[WithoutResponsibilityCommand]]** - `tsdoc-edge without-responsibility`
- 책임 미정의 심볼 (@responsibility 태그 누락)
- **Implementation Chain**:
  - Command: `src/commands/WithoutResponsibilityCommand.ts`
  - Validator: TSDoc parser for @responsibility tag
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**[[WithoutContractCommand]]** - `tsdoc-edge without-contract`
- 계약 미정의 심볼 (@contract 태그 누락)
- **Implementation Chain**:
  - Command: `src/commands/WithoutContractCommand.ts`
  - Validator: TSDoc parser for @contract tag
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**[[TreeCommand]]** - `tsdoc-edge tree <symbol-id>`
- 의존성 트리 시각화
- **Implementation Chain**:
  - Command: `src/commands/TreeCommand.ts`
  - Graph: [[SymbolGraphBuilder]] (`src/graph/SymbolGraph.ts`)
  - Resolver: [[DependencyResolver]] (`src/analyzer/DependencyResolver.ts`)
  - Visualization: ASCII tree builder

## 통계 스냅샷 구조
`.tsdoc/stats-history.json`:
```json
{
  "snapshots": [
    {
      "timestamp": "2025-10-31T10:00:00Z",
      "overall": {
        "totalSymbols": 150,
        "documentedSymbols": 120,
        "testedSymbols": 100,
        "documentationRate": 80.0,
        "testCoverageRate": 66.7
      },
      "byImportance": {
        "critical": {
          "total": 25,
          "documented": 24,
          "tested": 23,
          "rate": 96.0
        },
        "important": {
          "total": 50,
          "documented": 40,
          "tested": 35,
          "rate": 80.0
        },
        "normal": {
          "total": 75,
          "documented": 56,
          "tested": 42,
          "rate": 74.7
        }
      }
    }
  ]
}
```

## 중요도 분류 규칙
### Critical 조건 (OR)
1. `exported: true` AND `@contract` 태그 있음
2. Public API (exported function/class)
3. `@public` 태그 있음
### Important 조건 (OR)
1. Type alias 또는 Interface
2. 연결성 ≥ 5 (5개 이상 심볼이 의존)

### Normal
- 위 조건에 해당하지 않는 모든 것

## 품질 점수 계산
### 문서화 점수
```
score = (documented / total) × 100
```
### 가중 평균 (중요도별)
```
weighted_score =
  (critical_rate × 0.5) +
  (important_rate × 0.3) +
  (normal_rate × 0.2)
```

### 종합 건강도
```
health_score =
  (documentation × 0.4) +
  (test_coverage × 0.3) +
  (connectivity × 0.3)
```
## CI/CD 통합

### GitHub Actions 예시
```yaml
name: Documentation Quality Check
on: [pull_request]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install
        run: npm ci

      - name: Check regression
        run: |
          npx tsdoc-edge stats src --compare
          if [ $? -ne 0 ]; then
            echo "❌ Documentation quality regression detected!"
            exit 1
          fi
      - name: Check critical symbols
        run: |
          npx tsdoc-edge analyze src --min-importance=critical
          if [ $? -ne 0 ]; then
            echo "❌ Critical symbols have documentation issues!"
            exit 1
          fi
```
## 관련 기능

- [[CoreWorkflow]] - 메인 문서화 파이프라인
- [[SymbolGraphFeatures]] - 심볼 의존성 그래프
- [[ValidationFeatures]] - 연결성 및 규칙 검증

---

## Backlinks

### Referenced By

- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:94
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:197
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:219
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:33
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:34
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:124
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:146
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:147
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:148
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:31
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:32
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:33
- [[StatsComparator]] → /home/user/tsdoc-edge/managed/analyzers/StatsComparator.md:31
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:32
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:37
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:38
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:31
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:260
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:32
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:38
- [[Phase6Commands]] → /home/user/tsdoc-edge/managed/commands/Phase6Commands.md:22
- [[SuggestCommand]] → /home/user/tsdoc-edge/managed/commands/SuggestCommand.md:192
- [[SuggestCommand]] → /home/user/tsdoc-edge/managed/commands/SuggestCommand.md:262
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:203
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:222
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:223
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:224
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:225
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:226
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:227
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:228
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:50
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:285
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:326
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:327
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:140
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:164
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:165
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:166
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:246
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:260
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:261
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:262
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:206
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:231
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:232
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:233
- [[InsightDocGenerator]] → /home/user/tsdoc-edge/managed/generator/InsightDocGenerator.md:22
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:258
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:176
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:233
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:263
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:331
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:71
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:85
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:84
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:134
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:171
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:108
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:109
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:110
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:111
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:112

### Implemented By

- CodeHealthChecker (Health) → /home/user/tsdoc-edge/src/analyzer/CodeHealthChecker.ts:41
- DocumentationAnalyzer (Quality) → /home/user/tsdoc-edge/src/analyzer/DocumentationAnalyzer.ts:18

