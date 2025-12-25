---
title: Unified Relationships
type: type
category: types
status: active
canonical: true
---

# [[UnifiedRelationships]]

**Source**: `src/types/relationships/unified.ts`

## Purpose

Comprehensive relationship taxonomy supporting all 7 categories of symbol relationships.

## Relationship Type System

### 1. Structural Relationships

Code structure and dependencies:
- **code-dependency**: A imports B
- **inheritance**: A extends B
- **implementation**: A implements Interface

### 2. Data Flow Relationships

Data movement and transformation:
- **io-dependency**: A's output → B's input
- **pipeline**: A → B → C sequential processing
- **event-flow**: A emits events → B consumes

### 3. Behavioral Relationships

Runtime behavior and interaction:
- **calls**: A calls function/method B
- **callback**: A registers B as callback
- **collaboration**: A collaborates with B
- **composition**: Feature = A + B + C
- **temporal-order**: A must execute before B

### 4. Alternative Relationships

Choice and fallback patterns:
- **substitution**: A OR B (same interface)
- **fallback**: Try A, if fails use B

### 5. Constraint Relationships

Rules and requirements:
- **mutual-exclusion**: A and B cannot coexist
- **co-requirement**: A requires B to be present

### 6. Semantic Relationships

Conceptual connections:
- **conceptual-relation**: A and B are related concepts
- **feature-grouping**: A, B, C belong to same feature

### 7. Verification Relationships

Testing and validation:
- **test-coverage**: A is tested by TestA
- **integration-verification**: A↔B verified by test

## Relationship Metadata

### Category

```typescript
type RelationshipCategory =
  | 'structural'
  | 'data-flow'
  | 'behavioral'
  | 'alternative'
  | 'constraint'
  | 'semantic'
  | 'verification';
```

### Direction

See implementation: RelationshipDirection

**3 types**: unidirectional (A → B), bidirectional (A ↔ B), undirected (A — B)

### Strength

See implementation: RelationshipStrength

**3 levels**: strong (direct, explicit), medium (indirect, inferred), weak (loose, potential)

## Discovery Method

See implementation: DiscoveryMethod

**Methods**: static-analysis, ast-parsing, test-analysis, documentation, runtime-trace, type-inference

## Relationship Evidence

See implementation: RelationshipEvidence

**Properties**:
- `type`: Evidence type (code, documentation, test, trace, type-signature)
- `source`: File path
- `lineNumber`: Line number (optional)
- `snippet`: Code snippet (optional)
- `confidence`: Confidence score (0-1)

## Unified Relationship

See implementation: [[UnifiedRelationships]]

**Core Properties**:
- `id`: Unique identifier
- `type`: RelationshipType
- `category`: RelationshipCategory
- `sourceId`, `targetId`: Source and target symbols
- `direction`: RelationshipDirection
- `strength`: RelationshipStrength
- `discoveryMethod`: DiscoveryMethod
- `evidence`: Array of RelationshipEvidence
- `metadata`: Additional properties (optional)
- `createdAt`, `verifiedAt`: Timestamps

For complete specification, see [[Relationship Standard Format]]

## Relationship Query

See implementation: RelationshipQuery

**Query Parameters**:
- `sourceId`, `targetId`: Filter by source/target symbols
- `type`: Filter by relationship types
- `category`: Filter by categories
- `minStrength`: Minimum relationship strength
- `discoveredBy`: Filter by discovery methods

## SSOT Completeness

Measure relationship coverage:
```typescript
interface SSOTCompleteness {
  totalSymbols: number;
  symbolsWithRelationships: number;
  relationshipsByCategory: Record<RelationshipCategory, number>;
  missingRelationships: MissingRelationship[];
  completenessScore: number;  // 0-100
}
```

## Relationship Graph

Full relationship network:
```typescript
interface RelationshipGraph {
  nodes: RelationshipNode[];
  relationships: UnifiedRelationship[];
  adjacencyList: Map<string, string[]>;
  categoryIndex: Map<RelationshipCategory, UnifiedRelationship[]>;
}
```

## Example Relationships

### Code Dependency
```typescript
{
  type: 'code-dependency',
  category: 'structural',
  sourceId: 'user-service',
  targetId: 'user-repository',
  direction: 'unidirectional',
  strength: 'strong',
  discoveryMethod: 'ast-parsing',
  evidence: [{
    type: 'code',
    source: 'src/services/UserService.ts',
    lineNumber: 5,
    snippet: "import { UserRepository } from './UserRepository'"
  }]
}
```

### Test Coverage
```typescript
{
  type: 'test-coverage',
  category: 'verification',
  sourceId: 'user-service',
  targetId: 'user-service-test',
  direction: 'bidirectional',
  strength: 'strong',
  discoveryMethod: 'test-analysis'
}
```

## Symbol Count

5 types, 8 interfaces

## Related

- [[AnalyzeCallsCommand]]: Analyze call relationships
- [[TestRelationshipsCommand]]: Test coverage relationships
- [[AnalyzeChainsCommand]]: Relationship chains

---

## Backlinks

### Referenced By

- [[DatabaseManager]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DatabaseManager.md:128
- [[Analyzer Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/analyzer-development-guide.md:261

