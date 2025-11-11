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

```typescript
type RelationshipDirection =
  | 'unidirectional'  // A → B
  | 'bidirectional'   // A ↔ B
  | 'undirected';     // A — B
```

### Strength

```typescript
type RelationshipStrength =
  | 'strong'   // Direct, explicit
  | 'medium'   // Indirect, inferred
  | 'weak';    // Loose, potential
```

## Discovery Method

How relationship was found:
```typescript
type DiscoveryMethod =
  | 'static-analysis'   // AST parsing
  | 'ast-parsing'       // TypeScript compiler
  | 'test-analysis'     // Test files
  | 'documentation'     // TSDoc/markdown
  | 'runtime-trace'     // Execution traces
  | 'type-inference';   // Type system
```

## Relationship Evidence

Proof of relationship:
```typescript
interface RelationshipEvidence {
  type: 'code' | 'documentation' | 'test' | 'trace' | 'type-signature';
  source: string;        // File path
  lineNumber?: number;
  snippet?: string;      // Code snippet
  confidence: number;    // 0-1
}
```

## Unified Relationship

Complete relationship definition:
```typescript
interface UnifiedRelationship {
  id: string;
  type: RelationshipType;
  category: RelationshipCategory;
  sourceId: string;      // Source symbol
  targetId: string;      // Target symbol
  direction: RelationshipDirection;
  strength: RelationshipStrength;
  discoveryMethod: DiscoveryMethod;
  evidence: RelationshipEvidence[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  verifiedAt?: string;
}
```

## Relationship Query

Search relationships:
```typescript
interface RelationshipQuery {
  sourceId?: string;
  targetId?: string;
  type?: RelationshipType[];
  category?: RelationshipCategory[];
  minStrength?: RelationshipStrength;
  discoveredBy?: DiscoveryMethod[];
}
```

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

- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:371
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:402
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:40
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:39
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:38
- [[Enhanced Database Schema]] → /home/user/tsdoc-edge/managed/concepts/enhanced-database-schema.md:184
- [[Enhanced Database Schema]] → /home/user/tsdoc-edge/managed/concepts/enhanced-database-schema.md:205
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:128
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:285

