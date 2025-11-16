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

### [[Relationship System Roadmap]]
**Path**: `relationship-system-roadmap.md`
**Priority**: ⭐ Planning

17가지 관계 타입 시스템의 개발 로드맵.

**Status**: Planning/Design document

**Tracks**:
- ✅ Implemented relationships (10/17)
- 🚧 In progress relationships
- 📋 Planned relationships
- 🎯 Implementation priorities

**Phases**:
- Phase 1: Code relationships (Done)
- Phase 2: Behavioral relationships (In progress)
- Phase 3: Semantic relationships (Planned)

---

### [[SELF-IMPROVEMENT-PROCESS]]
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
| [[Relationship System Roadmap]] | Planning | Ongoing | Planning |
| [[SELF-IMPROVEMENT-PROCESS]] | Meta | Weekly | Meta |

### By Role

**Developer**:
- [[Work Context Workflow]] ← Start here!
- Safe Dead Code Deletion

**Architect**:
- [[Mermaid Entrypoint Workflow]]
- [[Relationship System Roadmap]]

**Maintainer**:
- [[SELF-IMPROVEMENT-PROCESS]]
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

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:347
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:348
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:255
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:286
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:251
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:252
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:563
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:564
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:332
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:333
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:212
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:213
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:214
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:215
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:216
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:217
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:323
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:324
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:325
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:326
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:327
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:328
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:450
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:451
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:452
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:453
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:114
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:115
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:116
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:117
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:293
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:294
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:295
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:296
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:297
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:298

