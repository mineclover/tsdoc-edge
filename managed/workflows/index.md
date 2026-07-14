---
title: Workflows Index
type: index
category: workflows
status: active
canonical: true
---

# [[Workflows Index]]

> 실전 워크플로우 - 단계별 작업 가이드

## Overview

TSDoc Edge를 실제 개발 워크플로우에 적용하는 단계별 가이드 모음입니다. 각 워크플로우는 특정 시나리오에 맞춘 명령어 시퀀스와 체크포인트를 제공합니다.

---

## Core Workflows (핵심 워크플로우)

### [[Work Context Workflow]]
**Path**: `work-context-workflow.md`
**Priority**: ⭐⭐⭐ Critical

파일 수정 전 필요한 모든 컨텍스트를 즉시 제공.

**Use Case**: 모든 파일 작업 전 필수 확인

**Key Command**:
```bash
tsdoc-edge work-context <file-path>
```

**Provides**:
- 📚 관련 문서 (명세서, 설계서)
- 🔗 의존 타입 (이 파일이 사용하는 타입)
- 🧪 테스트 파일 (이 파일을 테스트하는 파일)
- ⚠️ 영향 범위 (이 파일을 사용하는 곳)

**Typical Flow**:
1. Check context → 2. Review dependencies → 3. Edit safely → 4. Validate

---

### [[Mermaid Entrypoint Workflow]]
**Path**: `mermaid-entrypoint-workflow.md`
**Priority**: ⭐⭐ High

`.mmd` 다이어그램을 진입점으로 사용한 문서 탐색 및 고아 코드 탐지.

**Use Case**:
- 복잡한 시스템 전체 구조 파악
- 다이어그램 기반 문서 자동 생성
- 진입점 기반 고아 코드 탐지

**Key Commands**:
```bash
# 1. Parse Mermaid diagram
tsdoc-edge parse-mermaid <file.mmd> --generate-docs

# 2. Explore from diagram
tsdoc-edge explore-entrypoint <generated-doc.md> --detect-orphans
```

**Workflow Steps**:
1. **Create/Update Diagram** → `.mmd` 다이어그램 작성
2. **Generate Docs** → H2 참조 문서 자동 생성
3. **Explore** → 진입점 기반 전체 탐색
4. **Detect Orphans** → 도달 불가능 코드 식별

---

### Safe Dead Code Deletion
**Path**: `dead-code-deletion-workflow.md`
**Priority**: ⭐⭐ High

**Note**: ⚠️ This file needs H1 symbol update

안전하게 미사용 코드를 식별하고 제거하는 워크플로우.

**Use Case**:
- 레거시 코드 정리
- 리팩토링 후 불필요 코드 제거
- 코드베이스 크기 축소

**Key Commands**:
```bash
# 1. Detect dead code
tsdoc-edge detect-dead-code --high

# 2. Verify with orphans
tsdoc-edge orphans

# 3. Check tests
tsdoc-edge analyze-tests
```

**Workflow Steps**:
1. **Detect** → High-confidence candidates
2. **Verify** → Check entry points, dynamic usage
3. **Review** → Manual code review
4. **Delete** → Safe removal
5. **Test** → Verify no regressions

---

## Documentation Workflows

### [[Example - Mermaid Workflow]]
**Path**: `EXAMPLE-MERMAID-WORKFLOW.md`
**Priority**: ⭐ Example

실제 프로젝트 예시: `dependency-meta-structure.mmd`를 SSOT로 사용.

**Use Case**: Mermaid 워크플로우 학습

**Demonstrates**:
- 관계 타입 시스템 문서화
- 진입점 기반 전체 코드베이스 검증
- 다이어그램 노드 → 문서 자동 생성

**Real Example**:
```bash
# Parse relationship diagram
tsdoc-edge parse-mermaid managed/architecture/diagrams/dependency-meta-structure.mmd

# Explore from generated docs
tsdoc-edge explore-entrypoint managed/relationships/index.md --detect-orphans
```

---

## System Workflows

### [[Coverage Metrics Contract]]
**Path**: `../features/coverage-metrics-contract.md`
**Priority**: ⭐⭐ Governance

커버리지 메트릭의 의미, 데이터 소스, evidence 수준, canonical graph 연계 상태를 확인하는
기준 문서. 커버리지 수치를 추가하거나 baseline으로 고정하기 전에 먼저 이 계약을 확인한다.

### [[Document Validation Warning Policy]]
**Path**: `document-validation-warning-policy.md`
**Priority**: ⭐⭐ Governance

`validate-docs managed` warning의 baseline, 허용 범위, 다음 정리 기준을 관리한다.
상세 처리 규칙은 [[Document Validation Warning Policy]]를 따른다.

### [[Relationship System Roadmap]]
**Path**: `relationship-system-roadmap.md`
**Priority**: 📚 Historical reference

기존 legacy 관계 타입 시스템의 historical 구현 맥락을 보존하는 문서다. 현재 ttsc 중심
canonical graph, spec governance와 release qualification은
[[Semantic Graph Spec Governance Roadmap]]이 소유한다.

**Status**: Historical; not an active backlog

**Historical scope**:
- 당시 relationship type 구현률과 legacy analyzer 계획
- 현재 미완료 표시는 active backlog가 아니라 당시 기록의 일부

---

### [[Semantic Graph Spec Governance Roadmap]]

**Path**: `semantic-graph-spec-governance-roadmap.md`
**Priority**: ⭐⭐⭐ Architecture

복원된 legacy 설계를 비교 기준선으로 사용하고, `ttsc` canonical graph와
compiler-evidence 기반 spec governance를 운영하는 현재 구현·release 계획. LSP 동등 사양
확장은 별도 재개 gate로 보류한다.

**Execution lanes**:

- Product: P4.1 one-command Jest evidence → naming → TSDoc → managed spec → history
  (LSP 동등 사양 확장은 deferred)
- Comparison: canonical safety + legacy baseline → capability와 analyzer 소유권 판정
- Provider: packed early canary → 외부 TypeScript library full pilot
- Release: Node/package clean-install qualification

---

### [[TS7 Test Compilation Lane]]

**Path**: `ts7-test-compilation-lane.md`
**Priority**: Repository wiring implemented; runtime qualification pending

TypeScript 7로 source와 test를 선컴파일하고 Jest가 JavaScript만 실행하도록 전환하는
P4.0 구현과 검증 기록. `ts-jest` 제거, parity/coverage gate, safe serial watch와 다음
단일 Jest JSON evidence loader handoff를 정의합니다.

**Target Flow**:

1. TS7 no-emit typecheck
2. TS7 AOT compile to `.test-dist`
3. Jest JavaScript-only execution
4. Optional Jest JSON artifact handoff

---

### SELF-IMPROVEMENT-PROCESS
**Path**: `self-improvement-process.md`
**Priority**: ⭐ Meta

TSDoc Edge 자체 개선 프로세스.

**Use Case**: 문서 시스템 자체 품질 관리

**Key Activities**:
- 문서 정합성 검증
- Orphaned 문서 탐지
- Symbol 참조 무결성 검증
- Backlinks 동기화

**Commands**:
```bash
# Validate documentation
tsdoc-edge validate-symbol-refs managed

# Update backlinks
tsdoc-edge update-backlinks managed

# Check for issues
tsdoc-edge health managed
```

---

## Workflow Categories

### By Use Case

| Workflow | Use Case | Frequency | Priority |
|----------|----------|-----------|----------|
| [[Work Context Workflow]] | Pre-edit context | Every edit | Critical |
| [[Mermaid Entrypoint Workflow]] | System exploration | Weekly | High |
| Safe Dead Code Deletion | Code cleanup | Monthly | High |
| [[Example - Mermaid Workflow]] | Learning | Once | Example |
| [[Relationship System Roadmap]] | Historical reference | No active work | Reference only |
| [[Semantic Graph Spec Governance Roadmap]] | Architecture and implementation planning | Ongoing | Critical |
| [[TS7 Test Compilation Lane]] | TS7 test toolchain cutover | Current prerequisite | Critical |
| SELF-IMPROVEMENT-PROCESS | Meta | Weekly | Meta |

### By Role

**Developer**:
- [[Work Context Workflow]] ← Start here!
- Safe Dead Code Deletion

**Architect**:
- [[Mermaid Entrypoint Workflow]]
- [[Relationship System Roadmap]]
- [[Semantic Graph Spec Governance Roadmap]]
- [[TS7 Test Compilation Lane]]

**Maintainer**:
- SELF-IMPROVEMENT-PROCESS
- [[Example - Mermaid Workflow]]

---

## Quick Start

### New to TSDoc Edge?
1. Read [[Work Context Workflow]] (5 min)
2. Try `tsdoc-edge work-context <your-file>`
3. Read [[Example - Mermaid Workflow]] (10 min)

### Want to Explore Your Codebase?
1. Read [[Mermaid Entrypoint Workflow]] (15 min)
2. Create a diagram of your key components
3. Use `explore-entrypoint` to traverse

### Need to Clean Up Code?
1. Read Safe Dead Code Deletion (10 min)
2. Run `tsdoc-edge orphans`
3. Follow the safe deletion checklist

---

## Related Documentation

- **[[Features Index]]** (`/managed/features/index.md`) - All features
- **[[Commands Index]]** (`/managed/COMMANDS.md`) - All commands
- **[[Guides & Tutorials]]** (`/managed/guides/index.md`) - Learning resources
- **[[Relationship Types]]** (`/managed/relationships/index.md`) - Relationship system

---

## Backlinks

### Referenced By

- [[Concepts Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/index.md:255
