---
title: # InterfaceAnalyzer
type: analyzer
category: core-components
status: active
canonical: true
---

# InterfaceAnalyzer

**Source**: `src/analyzer/InterfaceAnalyzer.ts`

## Purpose

Interface와 구현 클래스 간 관계 분석.

## Analysis

**Detects**:
1. Interface implementations (`class X implements Y`)
2. Interface extensions (`interface A extends B`)
3. Type compatibility
4. Missing implementations

## Related

- [[Interface Implementation]]: 구현 관계 타입
- [[Type Dependency]]: 타입 의존성

---

## Backlinks

### Referenced By

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:222
- InterfaceDependencyMapper → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/InterfaceDependencyMapper.md:22
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:133
- Phase4Commands → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/Phase4Commands.md:22
- ValidationFeatures → /Users/junwoobang/workflow/tsdoc-edge/managed/features/validation-features.md:157
