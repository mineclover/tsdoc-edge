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

- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:90
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:99
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:100
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:21
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:30
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:31
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:199
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:207
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:272
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:273
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:274
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:275
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:158
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:239
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:240
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:25
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:26
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:27
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:28

