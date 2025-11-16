---
title: Primary Types Index
type: index
category: primary-types
status: active
canonical: true
---

# [[Primary Types Index]]

> 주요 타입 정의 - 설정, 분석, 문서화의 핵심 타입

## Overview

TSDoc Edge 시스템의 주요 타입 정의를 카테고리별로 정리한 인덱스입니다. 이 타입들은 CLI 명령어, 분석 결과, 문서 구조 등을 정의합니다.

**총 19개 primary 타입**

---

## Configuration Types (설정 타입)

### [[TsdocEdgeConfig]]
**Path**: `TsdocEdgeConfig.md`
**Priority**: ⭐⭐⭐ Critical

TSDoc Edge의 전체 설정을 정의하는 타입.

**Key Properties**:
- `sourceDir`: 소스 디렉토리
- `outputDir`: 출력 디렉토리
- `excludePatterns`: 제외 패턴
- `validationRules`: 검증 규칙
- `customTags`: 커스텀 태그 정의

**Configuration File**: `.tsdoc.config.json`

**Used By**: ConfigLoader, ConfigManager, All commands

---

## Analysis Types (분석 타입)

### [[AnalysisReport]]
**Path**: `AnalysisReport.md`
**Priority**: ⭐⭐⭐ Critical

코드 분석 결과 리포트 타입.

**Key Properties**:
- `summary`: 분석 요약
- `metrics`: 메트릭 데이터
- `issues`: 발견된 이슈
- `recommendations`: 개선 제안

**Commands**: `analyze`, `health`

**Used By**: CodeHealthChecker, AnalyzeCommand

---

### [[TrackableStatistics]]
**Path**: `TrackableStatistics.md`
**Priority**: ⭐⭐ High

중요도별 통계 추적 타입.

**Key Properties**:
- `total`: 전체 통계
- `byCriticality`: Critical/Important/Normal 별 통계
- `trends`: 트렌드 데이터
- `snapshots`: 스냅샷 히스토리

**Commands**: `stats`, `stats --compare`

**Used By**: TrackableStatsCollector, StatsComparator

---

## Documentation Types (문서 타입)

### [[EnhancedSymbolDoc]]
**Path**: `EnhancedSymbolDoc.md`
**Priority**: ⭐⭐⭐ Critical

6-category enhanced documentation type.

**6 Categories**:
1. **What**: 무엇인가
2. **Why**: 왜 필요한가
3. **How**: 어떻게 사용하는가
4. **When**: 언제 사용하는가
5. **Where**: 어디서 사용되는가
6. **Who**: 누가 사용하는가

**Used By**: Documentation generators, Spec validators

---

### [[BaseSymbolDoc]]
**Path**: `BaseSymbolDoc.md`
**Priority**: ⭐⭐ High

기본 심볼 문서 타입.

**Key Properties**:
- `id`: 심볼 ID
- `name`: 심볼 이름
- `description`: 설명
- `tags`: TSDoc 태그
- `relationships`: 관계 정보

**Used By**: Document generators, Symbol parsers

---

### [[ParsedDocSymbols]]
**Path**: `ParsedDocSymbols.md`
**Priority**: ⭐⭐ High

파싱된 문서 심볼 컬렉션 타입.

**Key Properties**:
- `symbols`: 파싱된 심볼 목록
- `references`: 참조 정보
- `metadata`: 파일 메타데이터

**Used By**: Document Symbol Parser

---

### [[SymbolFootnoteRef]]
**Path**: `SymbolFootnoteRef.md`
**Priority**: ⭐ Medium

심볼 주석 참조 타입.

**Used By**: Backlinks generator, Cross-reference system

---

## Mermaid Types (다이어그램 타입)

### [[MermaidExtractionResult]]
**Path**: `MermaidExtractionResult.md`
**Priority**: ⭐⭐ High

Mermaid 다이어그램 파싱 결과 타입.

**Key Properties**:
- `symbols`: 다이어그램 노드 → 심볼
- `relationships`: 다이어그램 엣지 → 관계
- `metadata`: 다이어그램 메타데이터

**Commands**: `parse-mermaid`, `explore-entrypoint`

**Used By**: MermaidSymbolExtractor, ParseMermaidCommand

---

### [[MermaidSymbol]]
**Path**: `MermaidSymbol.md`
**Priority**: ⭐⭐ High

Mermaid 다이어그램 노드 → 심볼 변환 타입.

**Key Properties**:
- `nodeId`: 노드 ID
- `label`: 노드 라벨
- `symbolName`: 심볼 이름
- `type`: 심볼 타입

**Used By**: MermaidSymbolExtractor

---

### [[MermaidRelationship]]
**Path**: `MermaidRelationship.md`
**Priority**: ⭐⭐ High

Mermaid 다이어그램 엣지 → 관계 변환 타입.

**Key Properties**:
- `from`: 시작 노드
- `to`: 종료 노드
- `type`: 관계 타입
- `label`: 엣지 라벨

**Used By**: MermaidSymbolExtractor

---

## Extraction Types (추출 타입)

### [[ExtractionResult]]
**Path**: `ExtractionResult.md`
**Priority**: ⭐⭐⭐ Critical

AST 파싱 및 심볼 추출 결과 타입.

**Key Properties**:
- `symbols`: 추출된 심볼
- `relationships`: 추출된 관계
- `imports`: Import 정보
- `exports`: Export 정보
- `errors`: 추출 에러

**Commands**: `build`, `parse`

**Used By**: ASTSymbolExtractor, TSDocParser

---

## Code Connection Types (코드 연결 타입)

### [[CodeConnection]]
**Path**: `CodeConnection.md`
**Priority**: ⭐⭐ High

문서 ↔ 코드 연결 타입.

**Key Properties**:
- `docSymbol`: 문서 심볼
- `codeSymbol`: 코드 심볼
- `connection`: 연결 타입 (strong/weak)
- `confidence`: 연결 신뢰도

**Used By**: DocCodeLinker, ConnectivityValidator

---

### [[CodeReference]]
**Path**: `CodeReference.md`
**Priority**: ⭐⭐ High

코드 참조 타입.

**Key Properties**:
- `file`: 참조 파일
- `line`: 참조 위치
- `symbol`: 참조된 심볼
- `context`: 참조 컨텍스트

**Used By**: Reference resolvers, Link validators

---

## Specification Types (명세 타입)

### [[DependencySpec]]
**Path**: `DependencySpec.md`
**Priority**: ⭐⭐ High

의존성 명세 타입.

**Key Properties**:
- `dependencies`: 의존성 목록
- `dependents`: 사용처 목록
- `version`: 버전 제약
- `optional`: 선택적 의존성

**Used By**: DependencyResolver, SpecValidator

---

### [[Functionality]]
**Path**: `Functionality.md`
**Priority**: ⭐ Medium

기능 명세 타입.

**Key Properties**:
- `name`: 기능 이름
- `description`: 기능 설명
- `inputs`: 입력
- `outputs`: 출력
- `behavior`: 동작 방식

**Used By**: Feature documentation system

---

### [[FuturePlan]]
**Path**: `FuturePlan.md`
**Priority**: ⭐ Medium

미래 계획 명세 타입.

**Key Properties**:
- `goal`: 목표
- `timeline`: 일정
- `dependencies`: 선행 작업
- `risks`: 리스크

**Used By**: Roadmap documentation

---

### [[ProblemSolving]]
**Path**: `ProblemSolving.md`
**Priority**: ⭐ Medium

문제 해결 기록 타입.

**Key Properties**:
- `problem`: 문제 정의
- `analysis`: 원인 분석
- `solution`: 해결 방법
- `alternatives`: 대안

**Used By**: Problem tracking system

---

### [[DecisionRecord]]
**Path**: `DecisionRecord.md`
**Priority**: ⭐ Medium

아키텍처 결정 기록 타입 (ADR).

**Key Properties**:
- `decision`: 결정 내용
- `context`: 결정 배경
- `consequences`: 결과/영향
- `status`: 결정 상태

**Used By**: ADR documentation system

---

### [[ErrorExperience]]
**Path**: `ErrorExperience.md`
**Priority**: ⭐ Medium

에러 경험 기록 타입.

**Key Properties**:
- `error`: 에러 내용
- `context`: 발생 상황
- `resolution`: 해결 방법
- `learnings`: 학습 내용

**Used By**: Error tracking, Knowledge base

---

## Type Categories Matrix

| Category | Types | Usage | Priority |
|----------|-------|-------|----------|
| **Configuration** | 1 | System setup | Critical |
| **Analysis** | 2 | Quality metrics | Critical |
| **Documentation** | 4 | Symbol docs | High |
| **Mermaid** | 3 | Diagram parsing | High |
| **Extraction** | 1 | AST parsing | Critical |
| **Code Connection** | 2 | Doc-Code link | High |
| **Specification** | 6 | Specs & Plans | Medium |

---

## Common Patterns

### Documentation Hierarchy
```
BaseSymbolDoc (basic)
└─ EnhancedSymbolDoc (6-category)
   └─ ParsedDocSymbols (collection)
```

### Extraction Pipeline
```
Source Code
  ↓ ASTSymbolExtractor
ExtractionResult
  ↓ SymbolGraphBuilder
Symbol Graph
```

### Mermaid Workflow
```
.mmd Diagram
  ↓ MermaidSymbolExtractor
MermaidExtractionResult
  ├─ MermaidSymbol[]
  └─ MermaidRelationship[]
```

### Specification Types
```
Specs
├─ DependencySpec (current)
├─ Functionality (current)
├─ FuturePlan (future)
├─ ProblemSolving (past)
├─ DecisionRecord (decisions)
└─ ErrorExperience (learnings)
```

---

## Usage by Feature

### Build System
Uses: ExtractionResult, TsdocEdgeConfig

### Analysis System
Uses: AnalysisReport, TrackableStatistics

### Documentation System
Uses: BaseSymbolDoc, EnhancedSymbolDoc, ParsedDocSymbols, SymbolFootnoteRef

### Mermaid System
Uses: MermaidExtractionResult, MermaidSymbol, MermaidRelationship

### Connection System
Uses: CodeConnection, CodeReference

### Specification System
Uses: DependencySpec, Functionality, FuturePlan, ProblemSolving, DecisionRecord, ErrorExperience

---

## Configuration Example

### TsdocEdgeConfig
```json
{
  "sourceDir": "src",
  "outputDir": "managed",
  "excludePatterns": ["*.test.ts", "node_modules"],
  "validationRules": {
    "requirePublicDoc": true,
    "requireContracts": false
  },
  "customTags": ["@responsibility", "@contract"]
}
```

---

## Related Documentation

- **[[Types Index]]** (`/managed/types/index.md`) - System types
- **[[Utilities Index]]** (`/managed/utilities/index.md`) - Type utilities
- **[[Features Index]]** (`/managed/features/index.md`) - Features using these types
- **[[Commands Index]]** (`/managed/COMMANDS.md`) - Commands using these types

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:313
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:247
- [[Types Index]] → /home/user/tsdoc-edge/managed/types/index.md:346
- [[Types Index]] → /home/user/tsdoc-edge/managed/types/index.md:359
- [[Types Index]] → /home/user/tsdoc-edge/managed/types/index.md:360
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:416
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:428
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:429

