---
title: Concepts Index
type: index
category: concepts
status: active
canonical: true
---

# [[Concepts Index]]

> TSDoc Edge 핵심 개념 - 설계 철학과 이론적 기반

## Overview

TSDoc Edge의 설계 원칙, 이론적 기반, 핵심 개념을 설명하는 문서 모음입니다. 기능 구현 이전에 "왜 이렇게 설계했는지"를 이해하는 데 필요한 개념적 배경을 제공합니다.

---

## Foundational Concepts (핵심 개념)

### [[SSOT]]
**Path**: `ssot.md`
**Priority**: ⭐⭐⭐ Critical

Single Source of Truth - 모든 정보는 정확히 하나의 출처를 가진다.

**Key Principle**:
- 각 심볼은 정확히 **1개의 H1 primary definition**을 가짐
- 여러 H2/H3 auxiliary definitions 허용 (컨텍스트별 설명)
- 중복 없는 단일 진실 공급원

**Why SSOT?**:
- 정보 불일치 방지
- 유지보수 부담 감소
- 신뢰할 수 있는 단일 참조점

**Application**:
- 문서 시스템: `# [[Symbol]]` = 단일 H1
- 코드 주석: TSDoc → 단일 canonical 주석
- 데이터베이스: Symbol ID = primary key

---

### [[Symbol Reference System]]
**Path**: `symbol-reference-system.md`
**Priority**: ⭐⭐⭐ Critical

`[[Symbol]]` 참조 시스템의 세 가지 형태.

**Three Reference Types**:
1. **H1 Primary Definition**: `# [[Symbol]]` - SSOT, 정확히 1번만
2. **H2 Auxiliary Definition**: `## [[Symbol]]` - 컨텍스트별 설명, 여러 번 가능
3. **Inline Reference**: `[[Symbol]]` - 단순 링크, 무제한

**Validation Rules**:
- 모든 참조는 primary definition 필요
- Primary는 정확히 1개만 존재
- Auxiliary는 primary를 보완

**Examples**:
```markdown
# [[BuildCommand]]         ← Primary (SSOT)
## [[BuildCommand]]        ← Auxiliary (workflow context)
See [[BuildCommand]]...    ← Inline (simple link)
```

---

### [[Document Symbol System]]
**Path**: `document-symbol-system.md`
**Priority**: ⭐⭐ High

Wiki 스타일 `[[Symbol]]` 문법으로 문서와 코드를 양방향 연결.

**Key Features**:
- H1/H2/H3 계층적 심볼 정의
- 문서 간 양방향 링크
- Backlinks 자동 생성
- 코드 ↔ 문서 트레이서빌리티

**Commands**:
- `index-docs` - 문서 심볼 인덱스 생성
- `update-backlinks` - Backlinks 자동 생성
- `validate-symbol-refs` - 참조 무결성 검증

**Benefits**:
- 빠른 문서 탐색
- 고아 문서 자동 탐지
- 관련 정보 즉시 발견

---

## Architecture Concepts (아키텍처 개념)

### [[Module Specification Framework]]
**Path**: `module-specification-framework.md`
**Priority**: ⭐⭐ High

모든 모듈을 7가지 관점으로 정의하는 프레임워크.

**7 Perspectives**:
1. **Purpose**: 왜 존재하는가?
2. **Input**: 무엇을 받는가?
3. **Output**: 무엇을 반환하는가?
4. **Context**: 무엇에 의존하는가?
5. **Logic**: 어떻게 동작하는가?
6. **Effect**: 어떤 부수 효과가 있는가?
7. **Scope**: 공개 인터페이스는 무엇인가?

**Why 7 Perspectives?**:
- 완전한 이해를 위한 최소 필수 관점
- 누락 방지 (모든 측면 체크리스트)
- 일관된 문서화 구조

**Application**:
- TSDoc 주석: `@responsibility`, `@contract`
- 문서: 7 sections per module
- 리뷰: Completeness checklist

---

### [[Unified Relationship Taxonomy]]
**Path**: `unified-relationship-taxonomy.md`
**Priority**: ⭐⭐ High

17가지 심볼 관계 타입의 완전한 분류 체계.

**7 Categories**:
1. **Structural** (3): Code Dependency, Inheritance, Composition
2. **Data-Flow** (2): IO Dependency, Pipeline
3. **Behavioral** (3): Call Relationships, Callback, Event Flow
4. **Temporal** (1): Lifecycle
5. **Semantic** (5): Doc Reference, Enhancement, Layer Dependency, Module Boundary, Interface Implementation
6. **Quality** (2): Test Coverage, Dead Code
7. **Organizational** (1): Feature Module

**Why Taxonomy?**:
- 체계적 관계 추적
- 분석 도구 설계 기준
- 명확한 의미 정의

---

### [[Enhanced Database Schema]]
**Path**: `enhanced-database-schema.md`
**Priority**: ⭐ Design

심볼, 관계, 타입 정보 추적을 위한 향상된 데이터베이스 설계.

**Key Tables**:
- `symbols` - Symbol metadata
- `relationships` - Symbol relationships
- `type_info` - TypeScript type information
- `documentation` - TSDoc content

**Design Goals**:
- 빠른 쿼리 성능
- 관계 그래프 효율적 탐색
- 타입 정보 추적

---

## Quality Concepts (품질 개념)

### [[Work Context Reliability]]
**Path**: `work-context-reliability.md`
**Priority**: ⭐⭐ High

Work Context 명령어의 신뢰성을 보장하는 원칙.

**Reliability Principles**:
- 모든 관련 정보 누락 없이 제공
- False positive 최소화
- 빠른 응답 시간 (< 1초)

**Quality Metrics**:
- Context completeness: 95%+
- Precision: 90%+
- Response time: < 1s

**Validation**:
- 자동 테스트: Context coverage
- 수동 검증: Spot checking

---

### [[Integration Test Traceability]]
**Path**: `integration-test-traceability.md`
**Priority**: ⭐ Design

통합 테스트와 코드의 추적성 유지.

**Key Features**:
- 테스트 ↔ 코드 양방향 링크
- 커버리지 추적
- 영향 분석 (어떤 테스트가 영향받는가?)

**Commands**:
- `analyze-tests` - 테스트 관계 분석
- `test-coverage` - 커버리지 리포트
- `test-impact` - 변경 영향 테스트 식별

---

## Theory Concepts (이론 개념)

### [[Parallel Work Theory]]
**Path**: `parallel-work-theory.md`
**Priority**: ⭐ Theory

병렬 작업 가능성 탐지 이론.

**Core Idea**:
- 의존성 없는 작업 → 병렬 실행 가능
- 의존성 그래프 분석 → 병렬성 식별
- 작업 분할 최적화

**Applications**:
- 리팩토링 계획 (독립 모듈 동시 작업)
- 빌드 파이프라인 최적화
- 팀 작업 분배

**Detection**:
```bash
tsdoc-edge analyze-parallel --task-list tasks.json
```

---

## Concept Matrix

| Concept | Type | Priority | Status |
|---------|------|----------|--------|
| [[SSOT]] | Foundational | Critical | ✅ Active |
| [[Symbol Reference System]] | Foundational | Critical | ✅ Active |
| [[Document Symbol System]] | Foundational | High | ✅ Active |
| [[Module Specification Framework]] | Architecture | High | ✅ Active |
| [[Unified Relationship Taxonomy]] | Architecture | High | ✅ Active |
| [[Enhanced Database Schema]] | Architecture | Design | 📋 Design |
| [[Work Context Reliability]] | Quality | High | ✅ Active |
| [[Integration Test Traceability]] | Quality | Design | 📋 Design |
| [[Parallel Work Theory]] | Theory | Theory | 📋 Theory |

---

## Learning Path

### For Beginners
1. [[SSOT]] (5 min) - 가장 중요한 원칙
2. [[Symbol Reference System]] (10 min) - 참조 시스템 이해
3. [[Document Symbol System]] (10 min) - 실전 적용

### For Architects
1. [[Module Specification Framework]] (15 min)
2. [[Unified Relationship Taxonomy]] (20 min)
3. [[Enhanced Database Schema]] (15 min)

### For Contributors
1. [[Work Context Reliability]] (10 min)
2. [[Integration Test Traceability]] (10 min)
3. [[Parallel Work Theory]] (10 min)

---

## Related Documentation

- **[[Features Index]]** (`/managed/features/index.md`) - Feature implementations
- **[[Workflows Index]]** (`/managed/workflows/index.md`) - Practical workflows
- **[[Guides & Tutorials]]** (`/managed/guides/index.md`) - Learning resources
- **[[Relationship Types]]** (`/managed/relationships/index.md`) - Relationship system

---

## Backlinks

### Referenced By

- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:191
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:192
- [[Enhanced Database Schema]] → /home/user/tsdoc-edge/managed/concepts/enhanced-database-schema.md:203
- [[Enhanced Database Schema]] → /home/user/tsdoc-edge/managed/concepts/enhanced-database-schema.md:204
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:181
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:182
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:269
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:270
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:270
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:271
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:188
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:189
- [[Symbol Reference System]] → /home/user/tsdoc-edge/managed/concepts/symbol-reference-system.md:184
- [[Symbol Reference System]] → /home/user/tsdoc-edge/managed/concepts/symbol-reference-system.md:185
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:474
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:475
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:200
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:201
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:235
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:354
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:260
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:207

