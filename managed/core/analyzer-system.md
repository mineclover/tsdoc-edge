# [[Analyzer System]]

> 50개 이상의 분석기로 30가지 관계 유형을 자동 탐지하는 분석 엔진

---

## 개요

Analyzer System은 코드 구조, 행위, 데이터 흐름, 테스트 커버리지 등을 분석하여 심볼 간 관계를 자동으로 탐지합니다. 11개 카테고리의 30가지 관계 유형을 지원합니다.

**핵심 가치**: 명시적 선언 없이 관계 자동 추론, 다양한 분석 관점, 신뢰도 기반 결과

---

## Module Specification

### Purpose
정적 분석을 통해 심볼 간 다양한 관계 자동 탐지

### Input
- TypeScript 소스 파일 (AST)
- `SymbolGraph`: 심볼 정보
- 테스트 파일
- 커버리지 데이터

### Output
- `UnifiedRelationship[]`: 통합 관계 목록
- 관계 유형별 분류
- 신뢰도 점수

### Context
- TypeScript Compiler API 사용
- [[Symbol Graph System]]에서 심볼 조회
- [[Storage System]]에 결과 저장

### Logic
```
1. AST 파싱 → 코드 구조 추출
2. 패턴 매칭 → 관계 후보 식별
3. 증거 수집 → 코드 스니펫, 라인 번호
4. 신뢰도 계산 → 증거 기반 점수
5. 통합 → UnifiedRelationship으로 정규화
```

### Effect
- CPU 집약적 분석
- 메모리 내 AST 생성

### Scope
- 구조 분석기 (코드 의존성, 상속, 구현)
- 행위 분석기 (호출, 콜백, 협력)
- 데이터 흐름 분석기 (I/O, 파이프라인)
- 의미 분석기 (네이밍, 그루핑)
- 테스트 분석기 (커버리지, 시나리오)

---

## 분석기 카테고리

### 1. 코드 구조 분석

```typescript
/**
 * @doc [[Analyzer System]]
 * @functionality AST 기반 심볼 추출, 의존성 분석
 */

// ASTSymbolExtractor - 모든 심볼 추출
// ImportAnalyzer - import 문 분석
// CallGraphAnalyzer - 함수 호출 관계
// TypeDependencyAnalyzer - 타입 의존성
// TypeChainTracer - 타입 상속 체인
// InterfaceAnalyzer - 인터페이스 구현
// InterfaceDependencyMapper - 인터페이스 사용
```

**Source**: `src/analyzer/` (AST*, Import*, Type*, Interface*)

### 2. 행위 분석

```typescript
/**
 * @doc [[Analyzer System]]
 * @problem 코드 간 행위적 관계 파악 어려움
 * @solves 호출 패턴, 콜백, 협력 관계 자동 탐지
 */

// BehavioralAnalyzer - 행위 관계 탐지
// CallbackAnalyzer - 콜백 패턴
// EventFlowAnalyzer - 이벤트 흐름
// CollaborationAnalyzer - 협력 관계
// CompositionAnalyzer - 합성 관계
// TemporalOrderAnalyzer - 실행 순서
```

**Source**: `src/analyzer/` (Behavioral*, Callback*, Event*, Collaboration*, Composition*, Temporal*)

### 3. 데이터 흐름 분석

```typescript
/**
 * @doc [[Analyzer System]]
 * @functionality I/O 의존성, 파이프라인 탐지
 */

// IODependencyAnalyzer - I/O 관계
// DependencyResolver - 전이적 의존성
// DependencyChainAnalyzer - 의존성 체인
// LayerDependencyAnalyzer - 계층 위반
```

**Source**: `src/analyzer/` (IO*, Dependency*, Layer*)

### 4. 의미/관계 분석

```typescript
/**
 * @doc [[Analyzer System]]
 * @depends SymbolGraph
 * @depType runtime
 * @depReason 심볼 정보 조회
 */

// NamingPatternRelationAnalyzer - 네이밍 패턴 (UserService~UserRepository)
// ExplicitSemanticRelationAnalyzer - @relatedTo 추출
// FeatureGroupingAnalyzer - 기능별 그루핑
// DomainStructureAnalyzer - 도메인 구조
// RelationshipInferenceEngine - 관계 추론 (전이적 폐쇄)
```

**Source**: `src/analyzer/` (Naming*, Explicit*, Feature*, Domain*, Relationship*)

### 5. 대안/제약 분석

```typescript
/**
 * @doc [[Analyzer System]]
 * @functionality 대체, 폴백, 상호 배제 관계
 */

// AlternativesAnalyzer - 대체 관계
// FallbackAnalyzer - 폴백 패턴
// SubstitutionAnalyzer - 치환 가능성
// ConstraintAnalyzer - 상호 배제
// CoRequirementAnalyzer - 공동 요구사항
// EnhancementAnalyzer - 개선 관계
```

**Source**: `src/analyzer/` (Alternative*, Fallback*, Substitution*, Constraint*, CoRequirement*, Enhancement*)

### 6. 테스트 분석

```typescript
/**
 * @doc [[Analyzer System]]
 * @functionality 테스트 커버리지, 시나리오 매핑
 * @decision 테스트도 심볼로 취급
 * @rationale 테스트-구현 관계 추적 가능
 */

// TestCoverageAnalyzer - 테스트-구현 매핑
// TestRelationshipExtractor - 테스트 관계 추출
// TestRelationshipAnalyzer - 테스트 분석
// TestCoverageUnifier - 커버리지 통합
// TestExampleExtractor - 테스트를 예제로
// IntegrationCoverageCalculator - 통합 테스트 커버리지
```

**Source**: `src/analyzer/` (Test*, Integration*)

### 7. 문서/품질 분석

```typescript
/**
 * @doc [[Analyzer System]]
 * @functionality 문서 품질, 코드 건강도
 */

// DocumentationAnalyzer - 문서 품질
// CodeHealthChecker - 코드 건강도
// BidirectionalDocReferenceGenerator - 양방향 참조
// DocReferenceAnalyzer - 문서-코드 참조
// MissingLinkDetector - 끊어진 링크
// EnhancedWorkContextAnalyzer - 작업 컨텍스트
```

**Source**: `src/analyzer/` (Documentation*, CodeHealth*, Doc*, Missing*, WorkContext*)

### 8. 커버리지/통계

```typescript
/**
 * @doc [[Analyzer System]]
 * @functionality 커버리지 파싱, 통계 수집
 */

// CoverageParser - LCOV, Istanbul 파싱
// IstanbulCoverageAdapter - Istanbul 연동
// CoverageSyncAdapter - 커버리지 동기화
// TrackableStatsCollector - 추적 가능 통계
// StatsHistoryManager - 통계 이력
// StatsComparator - 통계 비교
// ImportanceClassifier - 중요도 분류
```

**Source**: `src/analyzer/` (Coverage*, Stats*, Importance*)

---

## 관계 유형 (30가지)

### 구조적 (Structural)

| 유형 | 설명 | 예시 |
|------|------|------|
| `code-dependency` | 코드 의존성 | import, require |
| `inheritance` | 상속 | extends |
| `implementation` | 인터페이스 구현 | implements |

### 데이터 흐름 (Data-flow)

| 유형 | 설명 | 예시 |
|------|------|------|
| `io-dependency` | I/O 의존성 | 파일 읽기 → 처리 |
| `pipeline` | 파이프라인 | A | B | C |
| `event-flow` | 이벤트 흐름 | emit → on |

### 행위적 (Behavioral)

| 유형 | 설명 | 예시 |
|------|------|------|
| `calls` | 함수 호출 | service.method() |
| `callback` | 콜백 | fn(callback) |
| `collaboration` | 협력 | 함께 사용 |
| `composition` | 합성 | 포함 관계 |
| `temporal-order` | 실행 순서 | A 후 B |

### 대안 (Alternative)

| 유형 | 설명 | 예시 |
|------|------|------|
| `substitution` | 대체 가능 | 같은 인터페이스 |
| `fallback` | 폴백 | 실패 시 대안 |

### 제약 (Constraint)

| 유형 | 설명 | 예시 |
|------|------|------|
| `mutual-exclusion` | 상호 배제 | A xor B |
| `co-requirement` | 공동 필요 | A and B |
| `circular-dependency` | 순환 의존성 | A → B → A |

### 의미적 (Semantic)

| 유형 | 설명 | 예시 |
|------|------|------|
| `naming-pattern-relation` | 네이밍 패턴 | UserService~UserRepo |
| `explicit-semantic-relation` | 명시적 관계 | @relatedTo |
| `feature-grouping` | 기능 그룹 | 같은 도메인 |
| `doc-reference` | 문서 참조 | [[Symbol]] |
| `enhancement` | 개선 관계 | 기능 확장 |

### 검증 (Verification)

| 유형 | 설명 | 예시 |
|------|------|------|
| `test-coverage` | 테스트 커버리지 | test → impl |
| `integration-verification` | 통합 검증 | e2e test |

### 테스팅 (Testing)

| 유형 | 설명 | 예시 |
|------|------|------|
| `contains` | 포함 | suite → case |
| `covers-scenario` | 시나리오 커버 | test → scenario |
| `test-as-example` | 예제로 사용 | 테스트가 문서 |

### 타입 시스템 (Type-system)

| 유형 | 설명 | 예시 |
|------|------|------|
| `type-dependency` | 타입 의존 | 제네릭 사용 |
| `generic-constraint` | 제네릭 제약 | T extends X |

### 아키텍처 (Architectural)

| 유형 | 설명 | 예시 |
|------|------|------|
| `layer-dependency` | 계층 의존 | UI → Service |
| `module-boundary` | 모듈 경계 | 패키지 간 |

---

## 데이터 구조

### UnifiedRelationship

```typescript
interface UnifiedRelationship {
  id: string                    // 관계 ID
  type: RelationshipType        // 30가지 유형 중 하나
  category: RelationshipCategory // 11개 카테고리
  from: string                  // 출발 심볼 ID
  to: string                    // 도착 심볼 ID
  direction: RelationshipDirection  // 'forward' | 'backward' | 'bidirectional'
  strength: RelationshipStrength    // 'strong' | 'medium' | 'weak'
  evidence: RelationshipEvidence[]  // 증거 목록
  discoveredBy: DiscoveryMethod     // 발견 방법
  confidence: number            // 신뢰도 (0-1)
  properties?: Record<string, any>  // 추가 속성
}
```

### RelationshipEvidence

```typescript
interface RelationshipEvidence {
  type: 'code' | 'comment' | 'test' | 'doc'
  location: {
    file: string
    line: number
    column?: number
  }
  snippet?: string              // 코드 스니펫
  description?: string          // 설명
}
```

### DiscoveryMethod

```typescript
type DiscoveryMethod =
  | 'static-analysis'   // 정적 분석
  | 'ast-parsing'       // AST 파싱
  | 'test-analysis'     // 테스트 분석
  | 'documentation'     // 문서 분석
  | 'runtime-trace'     // 런타임 추적
  | 'type-inference'    // 타입 추론
```

---

## 신뢰도 계산

```typescript
function calculateConfidence(evidence: RelationshipEvidence[]): number {
  const weights = {
    code: 0.4,      // 코드 증거 가중치
    test: 0.3,      // 테스트 증거 가중치
    comment: 0.2,   // 주석 증거 가중치
    doc: 0.1        // 문서 증거 가중치
  };

  let score = 0;
  evidence.forEach(e => {
    score += weights[e.type] || 0.1;
  });

  return Math.min(1, score);
}
```

---

## 사용 시나리오

### 시나리오 1: 호출 관계 분석

```typescript
import { CallGraphAnalyzer } from './analyzer/CallGraphAnalyzer';

const analyzer = new CallGraphAnalyzer(sourceFiles, symbolGraph);
const relationships = analyzer.analyze();

relationships.forEach(rel => {
  console.log(`${rel.from} → ${rel.to} (${rel.confidence})`);
});
```

### 시나리오 2: 테스트 커버리지 분석

```typescript
import { TestCoverageAnalyzer } from './analyzer/TestCoverageAnalyzer';

const analyzer = new TestCoverageAnalyzer(testFiles, symbolGraph);
const coverage = analyzer.analyze();

coverage.forEach(rel => {
  if (rel.type === 'test-coverage') {
    console.log(`${rel.from} tests ${rel.to}`);
  }
});
```

### 시나리오 3: 네이밍 패턴 관계

```typescript
import { NamingPatternRelationAnalyzer } from './analyzer/NamingPatternRelationAnalyzer';

const analyzer = new NamingPatternRelationAnalyzer(symbols);
const patterns = analyzer.analyze();

// UserService ~ UserRepository 같은 관계 탐지
patterns.forEach(rel => {
  console.log(`${rel.from} 관련 ${rel.to} (패턴: ${rel.properties?.pattern})`);
});
```

### 시나리오 4: 계층 위반 탐지

```typescript
import { LayerDependencyAnalyzer } from './analyzer/LayerDependencyAnalyzer';

const layers = {
  'controller': 0,
  'service': 1,
  'repository': 2
};

const analyzer = new LayerDependencyAnalyzer(symbols, layers);
const violations = analyzer.analyze().filter(r => r.type === 'layer-dependency');

violations.forEach(v => {
  console.log(`계층 위반: ${v.from} → ${v.to}`);
});
```

---

## 관련 시스템

- [[Symbol Graph System]] - 심볼 정보 제공
- [[Parser System]] - AST 파싱 결과
- [[Storage System]] - 분석 결과 저장
- [[Validator System]] - 분석 결과 검증

---

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `tsdoc-edge analyze-all` | 전체 분석 실행 |
| `tsdoc-edge relationship-metrics` | 관계 메트릭 |
| `tsdoc-edge relationship-clusters` | 클러스터 분석 |
| `tsdoc-edge relationship-impact <symbol>` | 영향 분석 |
| `tsdoc-edge health` | 코드 건강도 |

---

## Backlinks
<!-- 이 섹션은 자동 생성됩니다 -->
