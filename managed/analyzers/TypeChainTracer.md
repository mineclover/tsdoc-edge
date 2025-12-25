---
title: # [[TypeChainTracer]]
type: analyzer
category: core-components
status: active
canonical: true
---

# TypeChainTracer

**Source**: `src/analyzer/TypeChainTracer.ts`

## Purpose

타입 체인 추적 (A → B → C).

## Tracing

**Follows**:
- Type aliases
- Generic constraints
- Interface extends
- Class implements

## Output

```typescript
interface TypeChain {
  from: string;
  to: string;
  chain: string[];    // 중간 단계
}
```

## Related

- [[Type Dependency]]: 타입 의존성 관계
- [[Type Dependency]]: 관계 타입

---

## Backlinks

### Referenced By

- [[TypeDependencyAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:90
- TypeChainCommand → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/TypeChainCommand.md:21
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:199
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:207
- ValidationFeatures → /Users/junwoobang/workflow/tsdoc-edge/managed/features/validation-features.md:158
