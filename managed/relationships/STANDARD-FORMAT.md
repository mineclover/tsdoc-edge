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

See implementation: [[UnifiedRelationships]]

**Identity**:
- `id`: Unique relationship identifier
- `type`: Relationship type (27 types across 10 categories)

**Participants**:
- `from`: Source symbol(s) ID
- `to`: Target symbol(s) ID

**Properties**:
- `direction`: unidirectional, bidirectional, or undirected
- `strength`: strong, medium, or weak
- `category`: One of 10 relationship categories

**Evidence**:
- `evidence`: Supporting evidence array (code, doc, test)
- `discoveredBy`: Discovery method (ast-parsing, doc-analysis, etc.)
- `confidence`: Confidence score (0-1)

**Location**:
- `filePath`: Where relationship is defined (optional)
- `line`: Line number (optional)

**Additional**:
- `properties`: Type-specific properties
- `description`: Optional description
- `createdAt`, `updatedAt`: Timestamps

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

See implementation: RelationshipType

**27 Relationship Types**:

1. **Structural** (3): code-dependency, inheritance, implementation
2. **Data Flow** (3): io-dependency, pipeline, event-flow
3. **Behavioral** (5): calls, callback, collaboration, composition, temporal-order
4. **Alternative** (2): substitution, fallback
5. **Constraint** (3): mutual-exclusion, co-requirement, circular-dependency
6. **Semantic** (4): conceptual-relation, feature-grouping, doc-reference, enhancement
7. **Verification** (2): test-coverage, integration-verification
8. **Type System** (2): type-dependency, generic-constraint
9. **Architectural** (2): layer-dependency, module-boundary
10. **Configuration** (1): See categories below

### RelationshipCategory

See implementation: RelationshipCategory

**10 Categories**:
- `structural`: Code structure (imports, inheritance)
- `data-flow`: Data movement (I/O, pipelines)
- `behavioral`: Runtime behavior (calls, callbacks)
- `alternative`: Substitutability (fallback, substitution)
- `constraint`: Restrictions (mutual-exclusion, co-requirement, circular)
- `semantic`: Conceptual (doc-reference, feature-grouping, enhancement)
- `verification`: Testing (test-coverage, integration-verification)
- `type-system`: Type relationships (type-dependency, generic-constraint)
- `architectural`: Architecture (layer-dependency, module-boundary)
- `quality`: Code quality (circular-dependency)

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

- [[Unified Relationship Taxonomy]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:387
- [[Analyzer Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/analyzer-development-guide.md:95
- [[UnifiedRelationships]] → /Users/junwoobang/workflow/tsdoc-edge/managed/types/UnifiedRelationships.md:109

