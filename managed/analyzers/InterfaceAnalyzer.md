# [[InterfaceAnalyzer]]

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

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:159
- [[InterfaceDependencyMapper]] → /home/user/tsdoc-edge/managed/analyzers/InterfaceDependencyMapper.md:22
- [[InterfaceDependencyMapper]] → /home/user/tsdoc-edge/managed/analyzers/InterfaceDependencyMapper.md:31
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:133
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:291
- [[Phase4Commands]] → /home/user/tsdoc-edge/managed/commands/Phase4Commands.md:22
- [[Phase4Commands]] → /home/user/tsdoc-edge/managed/commands/Phase4Commands.md:30
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:157
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:227
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:21
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:18

