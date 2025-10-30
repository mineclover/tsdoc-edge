# TSDoc-Edge 인터페이스 구조 개선 계획

## 분석 결과 요약

### 현재 상태
- **총 인터페이스**: 60개
- **도메인 수**: 1개 (types)
- **응집도**: 2.5% (매우 낮음)
- **결합도**: 0.0% (좋음)
- **순환 의존성**: 1개 (DocQualityScore - 자기 참조, 정상)

### 주요 문제점

1. **낮은 응집도 (2.5%)**
   - 60개의 인터페이스가 모두 `types` 디렉토리에 몰려있음
   - 서로 다른 관심사가 혼재되어 있음
   - 논리적 그룹화 부족

2. **대규모 단일 도메인**
   - 하나의 도메인에 60개 인터페이스
   - 관련 없는 타입들이 함께 위치
   - 유지보수와 탐색이 어려움

3. **불안정한 인터페이스**
   - `EnhancedSymbolDoc`: 6개의 의존성, 100% 불안정도
   - 많은 의존성을 가진 복합 타입

## 개선 제안

### 1. 도메인별 디렉토리 재구조화

현재 구조:
```
src/types/
├── analysis.ts          (6 interfaces)
├── comment-state.ts     (9 interfaces)
├── config.ts            (6 interfaces)
├── enhanced-tags.ts     (8 interfaces)
├── feature.ts           (3 interfaces)
├── graph.ts             (7 interfaces)
├── interface-analysis.ts (8 interfaces)
├── registry.ts          (4 interfaces)
├── tags.ts              (5 interfaces)
└── index.ts             (4 interfaces)
```

제안하는 구조:
```
src/types/
├── core/                # 핵심 타입 (4 interfaces)
│   ├── index.ts
│   └── parse.ts         # ParsedDocComment, ValidationResult, ParseResult
│
├── analysis/            # 분석 관련 (6 interfaces)
│   ├── index.ts
│   ├── quality.ts       # DocQualityScore
│   ├── coverage.ts      # TestCoverageInfo
│   └── health.ts        # CodeHealthMetrics, ImprovementSuggestion, AnalysisReport
│
├── graph/               # 그래프 및 심볼 (11 interfaces)
│   ├── index.ts
│   ├── symbol.ts        # Symbol, SymbolGraph
│   ├── connectivity.ts  # ConnectivityAnalysis
│   ├── query.ts         # SymbolQuery, SymbolQueryResult
│   └── validation.ts    # DetailedValidationIssue, DetailedValidationReport
│
├── config/              # 설정 관련 (7 interfaces)
│   ├── index.ts
│   ├── project.ts       # TsdocEdgeConfig, ProjectConfig, PathsConfig
│   └── features.ts      # FoldConfig, ValidationConfig, GeneratorConfig
│
├── tags/                # TSDoc 태그 (13 interfaces)
│   ├── index.ts
│   ├── base.ts          # SymbolRelationship, ContractSpec, ResponsibilitySpec
│   ├── enhanced.ts      # ProblemSolving, Functionality, ErrorExperience
│   ├── metadata.ts      # TestMapping, DesignDecision, DependencySpec
│   └── strict.ts        # StrictModeValidation
│
├── domain/              # 도메인 분석 (8 interfaces)
│   ├── index.ts
│   ├── interface.ts     # InterfaceInfo, InterfaceProperty, InterfaceMethod
│   ├── dependency.ts    # InterfaceDependency, InterfaceDependencyGraph
│   └── structure.ts     # DomainStructure, InterfaceAnalysisOptions
│
├── state/               # 상태 관리 (9 interfaces)
│   ├── index.ts
│   ├── comment.ts       # CommentLocation, CommentState, FileCommentState
│   └── storage.ts       # StateStorage, CollapseOptions, ExpandOptions
│
├── registry/            # 심볼 레지스트리 (4 interfaces)
│   ├── index.ts
│   └── registry.ts      # SourceRef, DependencyRelation, SymbolRegistryEntry
│
└── feature/             # 기능 문서 (3 interfaces)
    ├── index.ts
    └── feature.ts       # FeatureDocument, SymbolReference, FeatureIndex
```

### 2. 인터페이스 개선

#### 2.1 EnhancedSymbolDoc 의존성 감소

현재:
```typescript
export interface EnhancedSymbolDoc {
  symbol: Symbol;
  responsibility?: ResponsibilitySpec;
  contract?: ContractSpec;
  problemSolving?: ProblemSolving;
  functionality?: Functionality;
  errorExperiences?: ErrorExperience[];
  // ... 6개의 의존성
}
```

개선안: 선택적 확장 패턴 사용
```typescript
// 기본 심볼 문서
export interface BaseSymbolDoc {
  symbol: Symbol;
  summary?: string;
  tags?: string[];
}

// 필요한 경우에만 확장
export interface EnhancedSymbolDoc extends BaseSymbolDoc {
  extensions?: {
    responsibility?: ResponsibilitySpec;
    contract?: ContractSpec;
    problemSolving?: ProblemSolving;
    functionality?: Functionality;
    errorExperiences?: ErrorExperience[];
  };
}
```

### 3. 예상 효과

재구조화 후 예상되는 개선:

| 메트릭 | 현재 | 예상 |
|--------|------|------|
| 도메인 수 | 1 | 8 |
| 평균 인터페이스/도메인 | 60 | 7.5 |
| 응집도 | 2.5% | 40-60% |
| 탐색 용이성 | 낮음 | 높음 |
| 유지보수성 | 보통 | 높음 |

### 4. 마이그레이션 계획

#### Phase 1: 준비 (영향도 낮음)
1. 새 디렉토리 구조 생성
2. 각 도메인별 index.ts 생성
3. 타입 파일 복사 및 재배치

#### Phase 2: 리팩토링 (영향도 중간)
1. import 경로 업데이트
2. 기존 types/index.ts를 통한 재export 유지 (하위 호환성)
3. 점진적 마이그레이션

#### Phase 3: 최적화 (영향도 낮음)
1. EnhancedSymbolDoc 의존성 감소
2. 중복 타입 제거
3. 문서화 개선

### 5. 구현 우선순위

#### 우선순위 1 (즉시 수행)
- [ ] 새 디렉토리 구조 생성
- [ ] 파일 재배치
- [ ] 재export 설정

#### 우선순위 2 (단기)
- [ ] import 경로 업데이트
- [ ] 테스트 실행 및 검증
- [ ] 문서 업데이트

#### 우선순위 3 (중장기)
- [ ] EnhancedSymbolDoc 리팩토링
- [ ] 추가 최적화
- [ ] 성능 측정

## 참고사항

### 순환 의존성에 대한 노트
`DocQualityScore`의 자기 참조는 트리 구조를 표현하기 위한 정당한 패턴입니다.
```typescript
export interface DocQualityScore {
  // ...
  children: DocQualityScore[];  // 정상적인 재귀 구조
}
```
이는 문제가 아니며, 순환 의존성 감지기의 false positive입니다.

### 하위 호환성 유지
기존 코드가 깨지지 않도록 `src/types/index.ts`에서 모든 타입을 재export:
```typescript
// 하위 호환성을 위한 재export
export * from './core';
export * from './analysis';
export * from './graph';
// ...
```

## 다음 단계

1. 이 개선 계획 검토 및 승인
2. Phase 1 구현 시작
3. 점진적 마이그레이션
4. 성과 측정 및 추가 개선

---

**작성일**: 2025-10-30
**분석 도구**: InterfaceAnalyzer, InterfaceDependencyMapper, DomainStructureAnalyzer
