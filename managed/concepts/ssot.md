---
title: SSOT (Single Source of Truth)
type: concept
category: foundational
status: active
canonical: true
priority: critical
---

# [[SSOT]]

> **Single Source of Truth** - 모든 정보는 정확히 하나의 출처를 가진다.

## Core Principle

SSOT는 TSDoc Edge의 가장 중요한 설계 원칙입니다. 모든 심볼, 문서, 관계 정보는 정확히 하나의 정의(source)를 가져야 합니다.

## Application in TSDoc Edge

### 1. Document Symbols

각 문서 심볼(`[[Symbol]]`)은 정확히 **하나의 H1 primary definition**을 가집니다:

```markdown
# [[UserService]]        ← Primary definition (SSOT)
## [[UserService]]       ← Auxiliary definition (OK, 여러 개 가능)
See [[UserService]]...   ← Inline reference (OK, 무제한)
```

**Rules:**
- Primary (H1): 정확히 1개만 존재
- Auxiliary (H2/H3): Primary를 보완, 여러 개 가능
- Inline: 단순 참조, 무제한

### 2. Code Symbols

코드베이스에서 각 심볼(클래스, 함수, 타입)은 정확히 하나의 정의를 가집니다:

- Symbol ID: Unique identifier (`user-service`)
- File path: 단일 위치
- TSDoc: 단일 canonical 주석

### 3. Database

데이터베이스에서 SSOT 보장:

- `symbols` 테이블: `id` = Primary Key
- `unified_relationships` 테이블: 관계의 단일 정의
- `doc_symbols` 테이블: 문서 심볼의 단일 정의

## Benefits

1. **정보 불일치 방지**: 중복 정의가 없으므로 불일치 불가능
2. **유지보수 부담 감소**: 하나만 수정하면 됨
3. **신뢰할 수 있는 참조점**: 항상 정확한 정보 제공

## Validation

```bash
# SSOT 위반 검사
tsdoc-edge validate-docs managed

# 중복 primary 탐지
tsdoc-edge validate-symbol-refs managed --check-duplicates
```

## Related Concepts

- [[Symbol Reference System]] - 심볼 참조 시스템
- [[Document Symbol System]] - 문서 심볼 시스템

---

## Backlinks

### Referenced By

