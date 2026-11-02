---
title: Types Index
type: index
category: types
status: active
canonical: true
codeImplementation: not-applicable
---

# [[Types Index]]

> TypeScript 타입 정의 - TSDoc Edge 시스템의 타입 계층

## Overview

TSDoc Edge의 모든 타입 정의를 카테고리별로 정리한 인덱스입니다. 각 타입은 시스템의 특정 영역(그래프, 파싱, 검증, 분석)을 담당합니다.

**총 18개 타입 정의**

Canonical type links: [[DocumentSymbol]], [[TestRelationships]], [[TypeChain]], [[ParseTypes]],
[[CustomTagTypes]], [[EnhancedTagTypes]], [[ModuleSpecTypes]],
[[ModuleSpecTagTypes]], [[SpecTypes]], [[FeatureTypes]], [[LinkingTypes]], [[CodeHealthMetrics]],
[[DataFlowTypes]], [[InterfaceTypes]], [[RegistryTypes]]

---

## Core Types (핵심 타입)

### [[Symbol]]
**Path**: `Symbol.md`
**Priority**: ⭐⭐⭐ Critical

TSDoc Edge의 가장 기본이 되는 타입. 모든 심볼(함수, 클래스, 인터페이스 등)을 표현.

**Key Properties**:
- `id`: 고유 식별자
- `name`: 심볼 이름
- `type`: 심볼 타입 (function, class, interface 등)
- `location`: 파일 경로 및 위치
- `relationships`: 다른 심볼과의 관계

**Used By**: SymbolGraphBuilder, DatabaseManager, 모든 분석기

---

### [[DocumentSymbol]]
**Path**: `DocumentSymbol.md`
**Priority**: ⭐⭐⭐ Critical

문서 내 `[[Symbol]]` 참조를 표현하는 타입.

**Key Properties**:
- `symbol`: 참조된 심볼 이름
- `file`: 참조가 있는 파일 경로
- `level`: H1/H2/H3 레벨 (primary/auxiliary)
- `context`: 참조 컨텍스트

**Used By**: Document Symbol System, Backlinks Generator

---

## Relationship Types (관계 타입)

### [[UnifiedRelationships]]
**Path**: `UnifiedRelationships.md`
**Priority**: ⭐⭐⭐ Critical

17가지 관계 타입을 통합한 타입 시스템.

**Categories**:
- Structural: Code Dependency, Inheritance, Composition
- Data-Flow: IO Dependency, Pipeline
- Behavioral: Call Relationships, Callback, Event Flow
- Temporal: Lifecycle
- Semantic: 5 types
- Quality: Test Coverage, Dead Code
- Organizational: Feature Module

**Used By**: Relationship analyzers, Graph builders

---

### [[TestRelationships]]
**Path**: `TestRelationships.md`
**Priority**: ⭐⭐ High

테스트와 코드 간 관계를 표현하는 타입.

**Key Properties**:
- `testFile`: 테스트 파일 경로
- `sourceFile`: 소스 파일 경로
- `coverage`: 커버리지 정보
- `scenarios`: 테스트 시나리오

**Used By**: TestCoverageAnalyzer, TestRelationshipExtractor

---

### [[TypeChain]]
**Path**: `TypeChain.md`
**Priority**: ⭐⭐ High

타입 의존성 체인을 표현하는 타입.

**Key Properties**:
- `root`: 루트 타입
- `chain`: 의존성 체인
- `depth`: 체인 깊이
- `circular`: 순환 여부

**Used By**: TypeChainTracer, TypeDependencyAnalyzer

---

## Parsing Types (파싱 관련 타입)

### [[ParseTypes]]
**Path**: `ParseTypes.md`
**Priority**: ⭐⭐ High

TSDoc 파싱 결과를 표현하는 타입.

**Key Types**:
- `ParsedComment`: 파싱된 주석
- `TagInfo`: 태그 정보
- `ParameterInfo`: 매개변수 정보

**Used By**: TSDocParser, TSDocSymbolParser

---

### [[CustomTagTypes]]
**Path**: `CustomTagTypes.md`
**Priority**: ⭐⭐ High

커스텀 TSDoc 태그 정의.

**Custom Tags**:
- `@responsibility`: 책임 정의
- `@contract`: 계약 명세
- `@testScenario`: 테스트 시나리오

**Used By**: TSDocParser, ConventionValidator

---

### [[EnhancedTagTypes]]
**Path**: `EnhancedTagTypes.md`
**Priority**: ⭐ Medium

향상된 태그 정보 (메타데이터 포함).

**Used By**: DocumentationAnalyzer

---

## Specification Types (명세 관련 타입)

### [[ModuleSpecTypes]]
**Path**: `ModuleSpecTypes.md`
**Priority**: ⭐⭐ High

모듈 명세서 타입 (7 Perspectives).

**Key Properties**:
- `purpose`: 목적
- `input`: 입력
- `output`: 출력
- `context`: 컨텍스트
- `logic`: 로직
- `effect`: 부수 효과
- `scope`: 범위

**Used By**: [[SpecCompletenessValidator]]

---

### [[ModuleSpecTagTypes]]
**Path**: `ModuleSpecTagTypes.md`
**Priority**: ⭐⭐ High

모듈 명세서 태그 타입.

**Tags**: `@responsibility`, `@contract`, `@param`, `@returns`, `@precondition`, `@postcondition`, `@algorithm`, `@complexity`, `@sideEffect`

**Used By**: [[ModuleSpecTagParser]] / [[SpecCompletenessValidator]]

---

### [[SpecTypes]]
**Path**: `SpecTypes.md`
**Priority**: ⭐⭐ High

명세서 메타데이터 타입.

**Key Properties**:
- `id`: 명세서 ID
- `status`: Draft/Active/Deprecated
- `completeness`: 완성도 점수
- `version`: 버전

**Used By**: SpecStatusManager, SpecVersionManager

---

### [[FeatureTypes]]
**Path**: `FeatureTypes.md`
**Priority**: ⭐ Medium

기능 정의 타입.

**Used By**: Feature catalog system

---

### [[LinkingTypes]]
**Path**: `LinkingTypes.md`
**Priority**: ⭐ Medium

문서 링크 타입.

**Types**: Internal links, External links, Cross-references

**Used By**: LinkValidator, DocCodeLinker

---

## Analysis Types (분석 관련 타입)

### [[AnalyticsTypes]]
**Path**: `AnalyticsTypes.md`
**Priority**: ⭐⭐ High

분석 결과 타입.

**Key Types**:
- `AnalysisReport`: 분석 리포트
- `MetricData`: 메트릭 데이터
- `TrendInfo`: 트렌드 정보

**Used By**: CodeHealthChecker, StatsComparator

---

### [[CodeHealthMetrics]]
**Path**: `CodeHealthMetrics.md`
**Priority**: ⭐⭐ High

코드 건강도 메트릭 타입.

**Metrics**:
- Documentation coverage
- Test coverage
- Complexity scores
- Quality indicators

**Used By**: CodeHealthChecker, DocumentationAnalyzer

---

### [[DataFlowTypes]]
**Path**: `DataFlowTypes.md`
**Priority**: ⭐ Medium

데이터 흐름 분석 타입.

**Types**: DTO, Data pipeline, Transform chain

**Used By**: DataFlowAnalyzer

---

### [[InterfaceTypes]]
**Path**: `InterfaceTypes.md`
**Priority**: ⭐ Medium

인터페이스 관계 분석 타입.

**Used By**: InterfaceAnalyzer, InterfaceDependencyMapper

---

## Storage Types (저장소 관련 타입)

### [[RegistryTypes]]
**Path**: `RegistryTypes.md`
**Priority**: ⭐⭐ High

심볼 레지스트리 타입 (JSONL 저장).

**Key Types**:
- `RegistryEntry`: 레지스트리 항목
- `RegistryIndex`: 인덱스 구조
- `RegistryMetadata`: 메타데이터

**Used By**: SymbolRegistryManager

---

## Type Categories Matrix

| Category | Types | Usage | Priority |
|----------|-------|-------|----------|
| **Core** | 2 | Everywhere | Critical |
| **Relationship** | 3 | Graph & Analysis | Critical |
| **Parsing** | 4 | TSDoc Processing | High |
| **Specification** | 5 | Module Specs | High |
| **Analysis** | 4 | Code Quality | High |
| **Storage** | 1 | Persistence | High |

---

## Common Patterns

### Type Hierarchy
```
Symbol (base)
├─ DocumentSymbol (documentation)
├─ RegistryEntry (storage)
└─ AnalysisResult (analysis)
```

### Relationship Pattern
```
UnifiedRelationships
├─ StructuralRelationship
├─ DataFlowRelationship
└─ BehavioralRelationship
```

### Specification Pattern
```
ModuleSpec
├─ Purpose
├─ Input/Output
├─ Context
├─ Logic
├─ Effect
└─ Scope
```

---

## Usage by Component

### Graph System
Uses: Symbol, UnifiedRelationships, TypeChain, RegistryTypes

### Parsing System
Uses: ParseTypes, CustomTagTypes, EnhancedTagTypes

### Validation System
Uses: ModuleSpecTypes, ModuleSpecTagTypes, SpecTypes, LinkingTypes

### Analysis System
Uses: AnalyticsTypes, CodeHealthMetrics, DataFlowTypes, InterfaceTypes, TestRelationships

### Documentation System
Uses: DocumentSymbol, FeatureTypes, LinkingTypes

---

## Related Documentation

- **[[Primary Types Index]]** (`/managed/primary-types/index.md`) - Configuration and command types
- **[[Utilities Index]]** (`/managed/utilities/index.md`) - Type utilities
- **[[Features Index]]** (`/managed/features/index.md`) - Features using these types
- **[[Analyzers & Extractors]]** (`/managed/analyzers/index.md`) - Analyzers using these types

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:180
- [[Primary Types Index]] → managed/primary-types/index.md:448
- [[Utilities Index]] → managed/utilities/index.md:425

### Implemented By

- BlockType → src/types/blocks/index.ts:15
- SideEffectType → src/types/blocks/index.ts:49
- SideEffect → src/types/blocks/index.ts:64
- BlockScope → src/types/blocks/index.ts:83
- CodeBlock → src/types/blocks/index.ts:90
- BlockAnalysisResult → src/types/blocks/index.ts:127
- BlockDependency → src/types/blocks/index.ts:149
- ChunkingStrategy → src/types/blocks/index.ts:168
- BlockDetectionRule → src/types/blocks/index.ts:190
- SqliteTransactionFunction → src/types/database.ts:18
- SqliteDatabase → src/types/database.ts:25
- SqliteStatement → src/types/database.ts:68
- SqliteRunResult → src/types/database.ts:112
- SymbolRow → src/types/database.ts:124
- RelationshipRow → src/types/database.ts:142
- CountRow → src/types/database.ts:157
- RelTypeCountRow → src/types/database.ts:166
- UnifiedRelRow → src/types/database.ts:176
- HighImpactRow → src/types/database.ts:191
- HTTPMethod → src/types/endpoints/index.ts:15
- EndpointScope → src/types/endpoints/index.ts:22
- HTTPEndpoint → src/types/endpoints/index.ts:38
- DetectedEndpoint → src/types/endpoints/index.ts:87
- RoutePattern → src/types/endpoints/index.ts:103
- ScopeLevel → src/types/exposure/index.ts:15
- Accessibility → src/types/exposure/index.ts:33
- ExposureScope → src/types/exposure/index.ts:49
- VisibilityBoundary → src/types/exposure/index.ts:65
- SymbolExposure → src/types/exposure/index.ts:81
- ExportAnalysis → src/types/exposure/index.ts:103
- PackageExportConfig → src/types/exposure/index.ts:131
- PackageExportMap → src/types/exposure/index.ts:156
- BarrelFile → src/types/exposure/index.ts:175
- BarrelExport → src/types/exposure/index.ts:191
- isTestSymbol → src/types/guards/test-symbol-guards.ts:20
- isTestSuite → src/types/guards/test-symbol-guards.ts:33
- isTestCase → src/types/guards/test-symbol-guards.ts:44
- isTestScenario → src/types/guards/test-symbol-guards.ts:55
- isImplementationSymbol → src/types/guards/test-symbol-guards.ts:66
- filterTestSymbols → src/types/guards/test-symbol-guards.ts:77
- filterImplementationSymbols → src/types/guards/test-symbol-guards.ts:88
- groupSymbolsByCategory → src/types/guards/test-symbol-guards.ts:99
- BaseTestSymbol → src/types/test-symbols.ts:19
- TestSuite → src/types/test-symbols.ts:50
- TestCase → src/types/test-symbols.ts:85
- TestScenario → src/types/test-symbols.ts:121
- TestSymbol → src/types/test-symbols.ts:143
- TestCoverageMetadata → src/types/test-symbols.ts:150
- TestExtractionResult → src/types/test-symbols.ts:178
- TestExtractionOptions → src/types/test-symbols.ts:219

