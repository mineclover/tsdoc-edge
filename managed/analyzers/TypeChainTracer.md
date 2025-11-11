# [[TypeChainTracer]]

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

- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:19
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:27
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:21
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:30
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:199
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:207
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:266
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:267
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:158
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:236
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:25
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:26
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:27
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:28

