---
title: Relationship Standard Format
type: specification
category: relationships
status: active
canonical: true
---

# [[Relationship Standard Format]]

> **Unified schema** for representing all types of symbol relationships

**Type**: Interface (TypeScript)
**Location**: `src/types/relationships/unified.ts`

## Purpose

Defines a standard format for storing and querying all types of relationships between symbols, enabling unified tracking across 10 relationship categories.

**Problem**: Different relationship types (imports, calls, inheritance) stored in incompatible formats.

**Solution**: Unified `UnifiedRelationship` interface that supports all relationship types with consistent schema.

**Benefits**:
- Single query interface for all relationships
- Consistent evidence tracking
- Standardized confidence scoring
- Type-safe relationship handling

## Standard Format

```typescript
interface UnifiedRelationship {
  // ===== Identity =====
  id: string;                          // Unique relationship ID
  type: RelationshipType;              // Relationship type

  // ===== Participants =====
  from: string | string[];             // Source symbol(s)
  to: string | string[];               // Target symbol(s)

  // ===== Properties =====
  direction: RelationshipDirection;    // uni/bi/undirected
  strength: RelationshipStrength;      // strong/medium/weak
  category: RelationshipCategory;      // Category (1 of 10)

  // ===== Evidence =====
  evidence: RelationshipEvidence[];    // Supporting evidence
  discoveredBy: DiscoveryMethod;       // How discovered
  confidence: number;                  // Confidence (0-1)

  // ===== Location =====
  filePath?: string;                   // Where defined
  line?: number;                       // Line number

  // ===== Additional =====
  properties: Record<string, any>;     // Type-specific props

  // ===== Metadata =====
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
  description?: string;                // Optional description
}
```

## Relationship Types (27 total across 10 categories)

### 1. Structural (3 types)

**Type**: `code-dependency | inheritance | implementation`

```typescript
{
  type: 'code-dependency',
  from: 'BuildCommand',
  to: 'DatabaseManager',
  direction: 'unidirectional',
  strength: 'strong',
  category: 'structural',
  evidence: [{
    type: 'code',
    source: 'src/commands/BuildCommand.ts',
    lineNumber: 15,
    snippet: "import { DatabaseManager } from '../storage/DatabaseManager';",
    confidence: 1.0
  }],
  discoveredBy: 'ast-parsing',
  confidence: 1.0,
  properties: {
    importType: 'named',
    importedSymbols: ['DatabaseManager']
  }
}
```

### 2. Data Flow (3 types)

**Type**: `io-dependency | pipeline | event-flow`

```typescript
{
  type: 'io-dependency',
  from: 'ASTSymbolExtractor',
  to: 'DatabaseManager',
  direction: 'unidirectional',
  strength: 'strong',
  category: 'data-flow',
  evidence: [{
    type: 'code',
    source: 'src/commands/BuildCommand.ts',
    lineNumber: 45,
    snippet: "const symbols = extractor.extract(); await db.saveSymbols(symbols);",
    confidence: 0.9
  }],
  discoveredBy: 'static-analysis',
  confidence: 0.9,
  properties: {
    dataType: 'Symbol[]',
    transformations: ['extract', 'save']
  }
}
```

### 3. Behavioral (5 types)

**Type**: `calls | callback | collaboration | composition | temporal-order`

```typescript
{
  type: 'calls',
  from: 'BuildCommand#execute',
  to: 'DatabaseManager#saveSymbols',
  direction: 'unidirectional',
  strength: 'strong',
  category: 'behavioral',
  evidence: [{
    type: 'code',
    source: 'src/commands/BuildCommand.ts',
    lineNumber: 50,
    snippet: "await this.db.saveSymbols(allSymbols);",
    confidence: 1.0
  }],
  discoveredBy: 'ast-parsing',
  confidence: 1.0,
  properties: {
    callType: 'async',
    arguments: ['allSymbols']
  }
}
```

### 4. Alternative (2 types)

**Type**: `substitution | fallback`

```typescript
{
  type: 'substitution',
  from: ['SymbolRegistryManager', 'DatabaseManager'],
  to: 'ISymbolStorage',
  direction: 'undirected',
  strength: 'medium',
  category: 'alternative',
  evidence: [{
    type: 'type-signature',
    source: 'src/types/storage.ts',
    lineNumber: 10,
    snippet: "export interface ISymbolStorage { ... }",
    confidence: 0.8
  }],
  discoveredBy: 'type-inference',
  confidence: 0.8,
  properties: {
    interface: 'ISymbolStorage',
    equivalentFeatures: ['save', 'load', 'query']
  }
}
```

### 5. Constraint (2 types)

**Type**: `mutual-exclusion | co-requirement`

```typescript
{
  type: 'co-requirement',
  from: 'BuildCommand',
  to: 'ConfigManager',
  direction: 'unidirectional',
  strength: 'strong',
  category: 'constraint',
  evidence: [{
    type: 'documentation',
    source: 'README.md',
    lineNumber: 45,
    snippet: "BuildCommand requires initialized config",
    confidence: 0.9
  }],
  discoveredBy: 'documentation',
  confidence: 0.9,
  properties: {
    constraintType: 'initialization-dependency',
    enforcedAt: 'runtime'
  }
}
```

### 6. Semantic (2 types)

**Type**: `conceptual-relation | feature-grouping`

```typescript
{
  type: 'feature-grouping',
  from: ['BuildCommand', 'WorkContextCommand', 'DepsCommand'],
  to: 'Analysis Features',
  direction: 'undirected',
  strength: 'weak',
  category: 'semantic',
  evidence: [{
    type: 'documentation',
    source: 'managed/features/analysis-features.md',
    lineNumber: 1,
    confidence: 0.7
  }],
  discoveredBy: 'documentation',
  confidence: 0.7,
  properties: {
    featureName: 'Analysis Features',
    cohesion: 'functional'
  }
}
```

### 7. Verification (2 types)

**Type**: `test-coverage | integration-verification`

```typescript
{
  type: 'test-coverage',
  from: 'BuildCommand.test.ts',
  to: 'BuildCommand',
  direction: 'unidirectional',
  strength: 'medium',
  category: 'verification',
  evidence: [{
    type: 'test',
    source: 'src/__tests__/BuildCommand.test.ts',
    lineNumber: 10,
    snippet: "describe('BuildCommand', () => { ... })",
    confidence: 1.0
  }],
  discoveredBy: 'test-analysis',
  confidence: 1.0,
  properties: {
    coverage: 0.85,
    testCount: 12,
    assertions: 45
  }
}
```

## Type Definitions

### RelationshipType

```typescript
type RelationshipType =
  // 1. Structural (Code Space)
  | 'code-dependency'     // A imports B
  | 'inheritance'         // A extends B
  | 'implementation'      // A implements I
  // 2. Data Flow
  | 'io-dependency'       // A's output feeds B's input
  | 'pipeline'            // A → B → C sequential processing
  | 'event-flow'          // A emits events consumed by B
  // 3. Behavioral
  | 'calls'               // A calls function/method B
  | 'callback'            // A registers B as callback
  | 'collaboration'       // A collaborates with B
  | 'composition'         // Feature = A + B + C
  | 'temporal-order'      // A must execute before B
  // 4. Alternative
  | 'substitution'        // A OR B (same interface)
  | 'fallback'            // Try A, if fails use B
  // 5. Constraint
  | 'mutual-exclusion'    // A and B cannot coexist
  | 'co-requirement'      // A requires B to be present
  | 'circular-dependency' // A → B → A
  // 6. Semantic (Meta Space)
  | 'conceptual-relation' // A and B are related concepts
  | 'feature-grouping'    // A, B, C belong to same feature
  | 'doc-reference'       // Documentation references symbol
  | 'enhancement'         // A enhances B
  // 7. Verification
  | 'test-coverage'       // A is tested by TestA
  | 'integration-verification' // A↔B verified by test
  // 8. Type System
  | 'type-dependency'     // Parameter/return type dependencies
  | 'generic-constraint'  // T extends U
  // 9. Architectural
  | 'layer-dependency'    // Controller → Service
  | 'module-boundary';    // Cross-package dependencies
```

### RelationshipCategory

```typescript
type RelationshipCategory =
  | 'structural'      // Code structure (imports, inheritance)
  | 'data-flow'       // Data movement (I/O, pipelines)
  | 'behavioral'      // Runtime behavior (calls, callbacks)
  | 'alternative'     // Substitutability (fallback, substitution)
  | 'constraint'      // Restrictions (mutual-exclusion, co-requirement, circular)
  | 'semantic'        // Conceptual (doc-reference, feature-grouping, enhancement)
  | 'verification'    // Testing (test-coverage, integration-verification)
  | 'type-system'     // Type relationships (type-dependency, generic-constraint)
  | 'architectural'   // Architecture (layer-dependency, module-boundary)
  | 'quality';        // Code quality (circular-dependency)
```

### RelationshipDirection

```typescript
type RelationshipDirection =
  | 'unidirectional'  // A � B
  | 'bidirectional'   // A � B
  | 'undirected';     // A  B (no direction)
```

### RelationshipStrength

```typescript
type RelationshipStrength =
  | 'strong'   // Direct, explicit connection
  | 'medium'   // Indirect or inferred connection
  | 'weak';    // Loose or potential connection
```

### DiscoveryMethod

```typescript
type DiscoveryMethod =
  | 'static-analysis'   // AST parsing
  | 'ast-parsing'       // TypeScript compiler API
  | 'test-analysis'     // Test file analysis
  | 'documentation'     // TSDoc tags, markdown
  | 'runtime-trace'     // Execution traces
  | 'type-inference';   // Type system analysis
```

### RelationshipEvidence

```typescript
interface RelationshipEvidence {
  type: 'code' | 'documentation' | 'test' | 'trace' | 'type-signature';
  source: string;           // Source file
  lineNumber?: number;      // Line number
  snippet?: string;         // Code snippet
  confidence: number;       // 0-1
  context?: string;         // Additional context
}
```

## Database Schema

**Table**: `unified_relationships`

```sql
CREATE TABLE unified_relationships (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,              -- RelationshipType
  from_symbol TEXT NOT NULL,       -- JSON array for multi-party
  to_symbol TEXT NOT NULL,         -- JSON array for multi-party
  direction TEXT NOT NULL,         -- unidirectional/bidirectional/undirected
  strength TEXT NOT NULL,          -- strong/medium/weak
  category TEXT NOT NULL,          -- structural/data-flow/behavioral/etc.
  evidence TEXT NOT NULL,          -- JSON array of RelationshipEvidence
  discovered_by TEXT NOT NULL,     -- DiscoveryMethod
  confidence REAL NOT NULL,        -- 0-1
  file_path TEXT,
  line INTEGER,
  properties TEXT NOT NULL,        -- JSON object
  created_at TEXT NOT NULL,        -- ISO 8601
  updated_at TEXT NOT NULL,        -- ISO 8601
  description TEXT
);

-- Indexes for efficient queries
CREATE INDEX idx_rel_type ON unified_relationships(type);
CREATE INDEX idx_rel_from ON unified_relationships(from_symbol);
CREATE INDEX idx_rel_to ON unified_relationships(to_symbol);
CREATE INDEX idx_rel_category ON unified_relationships(category);
CREATE INDEX idx_rel_confidence ON unified_relationships(confidence);
```

## Querying Relationships

### Query Interface

```typescript
interface RelationshipQuery {
  type?: RelationshipType | RelationshipType[];
  category?: RelationshipCategory | RelationshipCategory[];
  from?: string | string[];
  to?: string | string[];
  direction?: RelationshipDirection;
  minStrength?: RelationshipStrength;
  minConfidence?: number;
  filePath?: string;
  properties?: Record<string, any>;
}
```

### Query Examples

**1. Find all imports of DatabaseManager**:
```typescript
const imports = await db.queryRelationships({
  type: 'code-dependency',
  to: 'DatabaseManager'
});
```

**2. Find all behavioral relationships**:
```typescript
const behavioral = await db.queryRelationships({
  category: 'behavioral',
  minConfidence: 0.8
});
```

**3. Find test coverage**:
```typescript
const tests = await db.queryRelationships({
  type: 'test-coverage',
  to: 'BuildCommand'
});
```

**4. Find high-confidence structural relationships**:
```typescript
const structural = await db.queryRelationships({
  category: 'structural',
  minStrength: 'strong',
  minConfidence: 0.9
});
```

## Multi-Party Relationships

Some relationships involve multiple participants:

**Composition**:
```typescript
{
  type: 'composition',
  from: ['BuildCommand', 'ASTSymbolExtractor', 'DatabaseManager'],
  to: 'Symbol Extraction Feature',
  direction: 'undirected',
  strength: 'strong',
  category: 'behavioral',
  properties: {
    compositionType: 'feature',
    components: ['BuildCommand', 'ASTSymbolExtractor', 'DatabaseManager']
  }
}
```

**Feature Grouping**:
```typescript
{
  type: 'feature-grouping',
  from: ['BuildCommand', 'WorkContextCommand', 'TreeCommand'],
  to: 'Analysis Features',
  direction: 'undirected',
  strength: 'weak',
  category: 'semantic',
  properties: {
    groupName: 'Analysis Features',
    groupType: 'functional'
  }
}
```

## Confidence Scoring

**Confidence Levels**:
- **1.0**: Explicit, verifiable in code (imports, calls)
- **0.9**: Strong inference from AST (data flow)
- **0.8**: Type-based inference (substitution)
- **0.7**: Documentation-based (feature grouping)
- **0.6**: Weak inference (conceptual relations)
- **<0.5**: Speculative (should not store)

**Evidence Aggregation**:
```typescript
const confidence = evidence.reduce((sum, ev) => sum + ev.confidence, 0) / evidence.length;
```

## Validation Rules

**Required Fields**:
- `id`, `type`, `from`, `to`
- `direction`, `strength`, `category`
- `evidence` (non-empty array)
- `discoveredBy`, `confidence`
- `createdAt`, `updatedAt`

**Constraints**:
- `confidence` must be 0-1
- `from` and `to` must be valid symbol IDs
- `evidence` must have at least 1 item
- `properties` must be valid JSON

**Integrity Checks**:
- Circular reference detection
- Orphaned relationship cleanup
- Evidence source verification

## Related

- [[Unified Relationship Taxonomy]] - Relationship classification
- [[DatabaseManager]] (`../core-components/DatabaseManager.md`) - Storage
- [[SymbolGraphBuilder]] - Graph construction
- [[Call Relationships]] (`CALLS.md`) - Specific type example
- [[IO Dependency]] (`IO-DEPENDENCY.md`) - Data flow example

## Usage Example

**Complete Relationship Record**:
```typescript
{
  id: "rel-abc123",
  type: "calls",
  from: "BuildCommand#execute",
  to: "DatabaseManager#saveSymbols",
  direction: "unidirectional",
  strength: "strong",
  category: "behavioral",
  evidence: [
    {
      type: "code",
      source: "src/commands/BuildCommand.ts",
      lineNumber: 50,
      snippet: "await this.db.saveSymbols(allSymbols);",
      confidence: 1.0,
      context: "Main execution flow"
    }
  ],
  discoveredBy: "ast-parsing",
  confidence: 1.0,
  filePath: "src/commands/BuildCommand.ts",
  line: 50,
  properties: {
    callType: "async",
    arguments: ["allSymbols"],
    returnType: "Promise<void>"
  },
  createdAt: "2025-11-09T00:00:00Z",
  updatedAt: "2025-11-09T12:00:00Z",
  description: "BuildCommand persists extracted symbols to database"
}
```

## Source

**Location**: `src/types/relationships/unified.ts`

**Related Files**:
- `src/types/relationships/index.ts` - Type exports
- `src/storage/DatabaseManager.ts` - Persistence
- `src/graph/SymbolGraphBuilder.ts` - Graph construction

## Status

**Current**: Active, production-ready
**Version**: v2.0
**Coverage**: All 10 categories, 27 relationship types

---

**Last Updated**: 2025-11-11
**Schema Version**: 2.0
**Total Relationship Types**: 27 across 10 categories

---

## Backlinks

### Referenced By

- [[Enhanced Database Schema]] → /home/user/tsdoc-edge/managed/concepts/enhanced-database-schema.md:185
- [[Enhanced Database Schema]] → /home/user/tsdoc-edge/managed/concepts/enhanced-database-schema.md:207
- [[Enhanced Database Schema]] → /home/user/tsdoc-edge/managed/concepts/enhanced-database-schema.md:208
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:387
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:488
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:489
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:490
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:491
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:328
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:329
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:97
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:98
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:110
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:111
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:187
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:188

