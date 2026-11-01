---
title: Inheritance
type: relationship
category: structural
status: implemented
canonical: true
relationships-count: 57
---

# [[Inheritance]]

> **Type**: `inheritance` | **Status**: ✅ 57 relationships

Track class inheritance hierarchies (`extends`, `implements`).

**Implementation**: ASTSymbolExtractor (`src/analyzer/ASTSymbolExtractor.ts`)
**Command**: BuildCommand

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:62
- [[ASTSymbolExtractor]] → managed/analyzers/ASTSymbolExtractor.md:175
- [[Guides & Tutorials]] → managed/guides/index.md:89
- [[Relationship Analysis Guide]] → managed/guides/relationship-analysis-guide.md:444
- [[Code Dependency]] → managed/relationships/code-dependency.md:56
- [[Composition Relationship]] → managed/relationships/composition.md:212
- [[Substitution]] → managed/relationships/substitution.md:274

### Implemented By

- InheritanceAnalyzer → src/analyzer/InheritanceAnalyzer.ts:42
- InheritanceDirection → src/types/inheritance/index.ts:15
- AbstractionLevel → src/types/inheritance/index.ts:27
- InheritanceType → src/types/inheritance/index.ts:43
- InheritanceRelationship → src/types/inheritance/index.ts:50
- OverriddenMember → src/types/inheritance/index.ts:95
- SignatureChange → src/types/inheritance/index.ts:120
- InheritanceChain → src/types/inheritance/index.ts:139
- ChainNode → src/types/inheritance/index.ts:161
- ChainIssue → src/types/inheritance/index.ts:183
- InheritanceHierarchy → src/types/inheritance/index.ts:202
- HierarchyNode → src/types/inheritance/index.ts:227
- AbstractionDetection → src/types/inheritance/index.ts:252

