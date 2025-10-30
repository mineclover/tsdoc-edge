# TSDoc Edge Statistics Design

## CLI 통계 명령어 설계

### 명령어 형식
```bash
tsdoc-edge stats [options]
tsdoc-edge stats --format=json
tsdoc-edge stats --output=stats.json
```

---

## 통계 카테고리 정의

### 1. 기본 통계 (Basic Statistics)
프로젝트의 기본적인 규모와 구성 정보

```typescript
interface BasicStatistics {
  // 파일 통계
  totalFiles: number;
  sourceFiles: number;
  testFiles: number;

  // 심볼 통계
  totalSymbols: number;
  publicSymbols: number;
  privateSymbols: number;
  exportedSymbols: number;

  // 타입별 분포
  symbolsByType: {
    function: number;
    class: number;
    interface: number;
    type: number;
    enum: number;
    variable: number;
    method: number;
    property: number;
  };
}
```

**출력 예시:**
```
📊 Basic Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files:           42 total (35 source, 7 test)
Symbols:         156 total (89 public, 67 private)
  Functions:     45
  Classes:       23
  Interfaces:    34
  Types:         28
  Enums:         8
  Others:        18
```

---

### 2. 문서화 통계 (Documentation Statistics)
문서화 완성도 및 품질 측정

```typescript
interface DocumentationStatistics {
  // 전체 문서화 현황
  documentedSymbols: number;
  undocumentedSymbols: number;
  documentationRate: number; // percentage

  // 문서화 품질
  averageQualityScore: number; // 0-100
  fullyDocumentedSymbols: number; // params + returns + examples + summary

  // 문서 요소별 통계
  symbolsWithSummary: number;
  symbolsWithParams: number;
  symbolsWithReturns: number;
  symbolsWithExamples: number;

  // 커스텀 태그 사용
  symbolsWithResponsibility: number;
  symbolsWithContract: number;
  symbolsWithTestMapping: number;

  // Public API 문서화 (중요!)
  publicApiDocumentationRate: number;
  publicApiFullyDocumented: number;

  // 품질 등급 분포
  qualityDistribution: {
    excellent: number;  // 90-100
    good: number;       // 70-89
    fair: number;       // 50-69
    poor: number;       // 30-49
    critical: number;   // 0-29
  };
}
```

**출력 예시:**
```
📝 Documentation Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Coverage:        89/156 symbols (57.1%)
Quality Score:   64.2/100 (Fair)
Fully Documented: 34 symbols

Public API:      85/89 symbols (95.5%) ⭐
  Fully Docs:    67 symbols

Documentation Elements:
  Summary:       89 symbols (57.1%)
  Params:        45 symbols (28.8%)
  Returns:       38 symbols (24.4%)
  Examples:      12 symbols (7.7%)

Custom Tags:
  @responsibility: 78 symbols (50.0%)
  @contract:       45 symbols (28.8%)
  @testedBy:       56 symbols (35.9%)

Quality Distribution:
  ⭐⭐⭐⭐⭐ Excellent (90-100): 12 symbols
  ⭐⭐⭐⭐   Good (70-89):      23 symbols
  ⭐⭐⭐     Fair (50-69):      34 symbols
  ⭐⭐       Poor (30-49):      45 symbols
  ⭐         Critical (0-29):   42 symbols
```

---

### 3. 관계 통계 (Relationship Statistics)
심볼 간 관계와 의존성 분석

```typescript
interface RelationshipStatistics {
  // 전체 관계
  totalRelationships: number;

  // 관계 타입별
  relationshipsByType: {
    dependsOn: number;
    usedBy: number;
    implements: number;
    extends: number;
    relatedTo: number;
  };

  // 연결성 이슈
  orphanedSymbols: number;      // 관계가 전혀 없는 심볼
  brokenLinks: number;          // 존재하지 않는 심볼 참조
  circularDependencies: number; // 순환 의존성 그룹 수

  // 네트워크 메트릭
  averageDependencies: number;  // 심볼당 평균 의존성 수
  maxDependencies: number;      // 최대 의존성 수 (허브 심볼)
  stronglyConnectedComponents: number; // 강하게 연결된 컴포넌트 수
}
```

**출력 예시:**
```
🔗 Relationship Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Relationships: 234

By Type:
  depends-on:    89
  used-by:       67
  implements:    34
  extends:       28
  related-to:    16

Issues:
  ⚠️  Orphaned symbols:        12
  ⚠️  Broken links:            5
  ⚠️  Circular dependencies:   3 groups

Network Metrics:
  Avg dependencies:  1.5 per symbol
  Max dependencies:  12 (SymbolGraphBuilder)
  Connected groups:  8
```

---

### 4. 연결성 통계 (Connectivity Statistics)
TSDoc Edge 고유의 연결성 메트릭

```typescript
interface ConnectivityStatistics {
  // 전체 연결성 점수
  connectivityScore: number; // 0-100

  // Contract 정의
  symbolsWithContract: number;
  contractRate: number;
  symbolsWithPrecondition: number;
  symbolsWithPostcondition: number;

  // Responsibility 정의
  symbolsWithResponsibility: number;
  responsibilityRate: number;

  // Test 매핑
  symbolsWithTests: number;
  testMappingRate: number;
  filesWithTests: number;
  estimatedTestCoverage: number;

  // 추적성 (Traceability)
  symbolsWithDesignDecisions: number;
  symbolsWithRequirements: number;
  symbolsWithIssueLinks: number;
}
```

**출력 예시:**
```
🔌 Connectivity Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Connectivity Score: 72/100 (Good)

Contracts:
  Defined:       45/156 symbols (28.8%)
  Preconditions: 38 symbols
  Postconditions: 42 symbols

Responsibilities:
  Defined:       78/156 symbols (50.0%)

Testing:
  Test mapping:  56/156 symbols (35.9%)
  Test files:    35/42 files (83.3%)
  Est. coverage: 67.5%

Traceability:
  Design decisions: 23 symbols
  Requirements:     12 symbols
  Issue links:      8 symbols
```

---

### 5. 코드 건강도 (Code Health)
전체적인 코드베이스 건강도 평가

```typescript
interface CodeHealthStatistics {
  // 전체 건강도 점수
  healthScore: number; // 0-100
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';

  // 구성 요소별 점수
  scores: {
    documentation: number;
    testing: number;
    connectivity: number;
    relationships: number;
  };

  // 이슈 요약
  issues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  // 개선 필요 파일
  filesNeedingAttention: number;
  topIssueFiles: Array<{
    path: string;
    issueCount: number;
    healthScore: number;
  }>;

  // 추세 (이전 실행과 비교 - optional)
  trend?: {
    healthScoreDelta: number;
    documentationDelta: number;
    issuesDelta: number;
  };
}
```

**출력 예시:**
```
💚 Code Health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Health: 64/100 (C)

Component Scores:
  Documentation: 57/100 ⭐⭐⭐
  Testing:       67/100 ⭐⭐⭐
  Connectivity:  72/100 ⭐⭐⭐⭐
  Relationships: 61/100 ⭐⭐⭐

Issues:
  🔴 Critical: 5
  🟡 High:     12
  🟢 Medium:   23
  ⚪ Low:      34

Top 5 Files Needing Attention:
  1. src/parser/TSDocParser.ts       (23 issues, score: 34)
  2. src/graph/SymbolGraphBuilder.ts (18 issues, score: 42)
  3. src/validator/Validator.ts      (15 issues, score: 45)
  ...
```

---

### 6. 심볼 분석 (Symbol Analysis)
심볼별 상세 분석

```typescript
interface SymbolAnalysisStatistics {
  // 상위 심볼들
  mostConnected: Array<{
    name: string;
    connectionCount: number;
  }>;

  bestDocumented: Array<{
    name: string;
    qualityScore: number;
  }>;

  mostTested: Array<{
    name: string;
    testCount: number;
  }>;

  // 주의 필요 심볼
  worstDocumented: Array<{
    name: string;
    qualityScore: number;
    missing: string[];
  }>;

  untested: Array<{
    name: string;
    type: string;
    isPublic: boolean;
  }>;
}
```

**출력 예시:**
```
🎯 Symbol Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Most Connected Symbols:
  1. SymbolGraphBuilder (45 connections)
  2. TSDocParser (34 connections)
  3. Symbol (28 connections)

Best Documented Symbols:
  1. ConfigManager (98/100)
  2. DatabaseManager (95/100)
  3. MarkdownGenerator (92/100)

⚠️  Symbols Needing Documentation:
  1. helper() (12/100) - missing: summary, params, returns
  2. util() (15/100) - missing: summary, returns
  3. process() (18/100) - missing: params, examples

⚠️  Untested Public Symbols:
  - validateConfig() (function)
  - DataProcessor (class)
  - parseOptions() (function)
```

---

## 통합 타입 정의

```typescript
/**
 * Complete statistics for a codebase
 * @public
 */
export interface CodebaseStatistics {
  /** When was this analysis performed */
  timestamp: string;

  /** Project path */
  projectPath: string;

  /** Basic metrics */
  basic: BasicStatistics;

  /** Documentation quality and coverage */
  documentation: DocumentationStatistics;

  /** Symbol relationships */
  relationships: RelationshipStatistics;

  /** Connectivity metrics */
  connectivity: ConnectivityStatistics;

  /** Overall code health */
  health: CodeHealthStatistics;

  /** Symbol analysis */
  symbols: SymbolAnalysisStatistics;
}
```

---

## CLI 옵션

```bash
# 기본 출력 (모든 통계)
tsdoc-edge stats

# 특정 카테고리만 출력
tsdoc-edge stats --category=documentation
tsdoc-edge stats --category=health
tsdoc-edge stats -c basic,documentation,health

# 출력 형식
tsdoc-edge stats --format=json
tsdoc-edge stats --format=markdown
tsdoc-edge stats --format=html

# 파일로 저장
tsdoc-edge stats --output=stats.json
tsdoc-edge stats -o stats.md --format=markdown

# 비교 모드 (이전 실행과 비교)
tsdoc-edge stats --compare=.tsdoc-stats-history.json

# 필터링
tsdoc-edge stats --min-score=50  # 점수 50 이하만
tsdoc-edge stats --public-only   # Public API만
```

---

## 구현 우선순위

### Phase 1: 기본 통계
- [ ] BasicStatistics
- [ ] DocumentationStatistics (기본)
- [ ] CodeHealthStatistics (기본)

### Phase 2: 심화 분석
- [ ] RelationshipStatistics
- [ ] ConnectivityStatistics
- [ ] SymbolAnalysisStatistics

### Phase 3: 고급 기능
- [ ] JSON/Markdown 출력
- [ ] 비교 모드
- [ ] HTML 리포트 생성
