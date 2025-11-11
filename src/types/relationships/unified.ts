/**
 * Unified Relationship Type System
 * @packageDocumentation
 *
 * @responsibility Define comprehensive relationship taxonomy
 * @contract Support all 27 relationship types across 10 categories
 *
 * @problem Current system only tracks code dependencies
 * @solves Unified type system for all relationship categories
 * @context SSOT completeness requires tracking all connection types
 *
 * @version 2.0
 * @updated 2025-11-11
 * @changelog Added 9 missing types: circular-dependency, doc-reference, enhancement,
 *            type-dependency, generic-constraint, layer-dependency, module-boundary,
 *            and expanded categories from 7 to 10
 */

/**
 * Relationship type classification
 * @public
 *
 * Total: 27 relationship types across 10 categories
 */
export type RelationshipType =
  // 1. Structural (Code Space)
  | 'code-dependency'     // A imports B
  | 'inheritance'         // A extends B
  | 'implementation'      // A implements I (interface-impl in docs)
  // 2. Data Flow
  | 'io-dependency'       // A's output feeds B's input
  | 'pipeline'            // A → B → C sequential processing
  | 'event-flow'          // A emits events consumed by B
  // 3. Behavioral
  | 'calls'               // A calls function/method B
  | 'callback'            // A registers B as callback (callback-pattern in docs)
  | 'collaboration'       // A collaborates with B to achieve goal
  | 'composition'         // Feature = A + B + C (composition-relationship in docs)
  | 'temporal-order'      // A must execute before B
  // 4. Alternative
  | 'substitution'        // A OR B can be used (same interface)
  | 'fallback'            // Try A, if fails use B
  // 5. Constraint
  | 'mutual-exclusion'    // A and B cannot coexist
  | 'co-requirement'      // A requires B to be present
  | 'circular-dependency' // A → B → A (quality/constraint)
  // 6. Semantic (Meta Space)
  | 'conceptual-relation' // A and B are related concepts
  | 'feature-grouping'    // A, B, C belong to same feature
  | 'doc-reference'       // Documentation references symbol
  | 'enhancement'         // A enhances B
  // 7. Verification
  | 'test-coverage'       // A is tested by TestA
  | 'integration-verification' // A↔B connection verified by test
  // 8. Type System
  | 'type-dependency'     // Parameter/return type dependencies
  | 'generic-constraint'  // T extends U
  // 9. Architectural
  | 'layer-dependency'    // Controller → Service layer violation
  | 'module-boundary'     // Cross-package dependencies;

/**
 * Relationship category
 * @public
 *
 * Total: 10 categories covering all relationship dimensions
 */
export type RelationshipCategory =
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

/**
 * Relationship direction
 * @public
 */
export type RelationshipDirection =
  | 'unidirectional'  // A → B
  | 'bidirectional'   // A ↔ B
  | 'undirected';     // A — B (no direction)

/**
 * Relationship strength
 * @public
 */
export type RelationshipStrength =
  | 'strong'   // Direct, explicit connection
  | 'medium'   // Indirect or inferred connection
  | 'weak';    // Loose or potential connection

/**
 * How relationship was discovered
 * @public
 */
export type DiscoveryMethod =
  | 'static-analysis'   // AST parsing
  | 'ast-parsing'       // TypeScript compiler API
  | 'test-analysis'     // Test file analysis
  | 'documentation'     // TSDoc tags, markdown
  | 'runtime-trace'     // Execution traces
  | 'type-inference';   // Type system analysis

/**
 * Evidence supporting a relationship
 * @public
 */
export interface RelationshipEvidence {
  /** Evidence type */
  type: 'code' | 'documentation' | 'test' | 'trace' | 'type-signature';

  /** Source file */
  source: string;

  /** Line number in source */
  lineNumber?: number;

  /** Code snippet */
  snippet?: string;

  /** Confidence level (0-1) */
  confidence: number;

  /** Additional context */
  context?: string;
}

/**
 * Unified Relationship
 * Represents any type of connection between symbols
 *
 * @public
 */
export interface UnifiedRelationship {
  // ===== Identity =====
  /** Unique relationship ID */
  id: string;

  /** Relationship type */
  type: RelationshipType;

  // ===== Participants =====
  /**
   * Source symbol(s)
   * Array for multi-party relationships (e.g., composition)
   */
  from: string | string[];

  /**
   * Target symbol(s)
   * Array for multi-party relationships
   */
  to: string | string[];

  // ===== Properties =====
  /** Relationship direction */
  direction: RelationshipDirection;

  /** Relationship strength */
  strength: RelationshipStrength;

  /** Relationship category */
  category: RelationshipCategory;

  // ===== Evidence =====
  /** Evidence supporting this relationship */
  evidence: RelationshipEvidence[];

  /** How this relationship was discovered */
  discoveredBy: DiscoveryMethod;

  /** Overall confidence (0-1) */
  confidence: number;

  // ===== Location =====
  /** File path where relationship is defined */
  filePath?: string;

  /** Line number in file */
  line?: number;

  // ===== Additional Properties =====
  /**
   * Type-specific properties
   * Examples:
   * - io-dependency: { dataType: 'UserData' }
   * - pipeline: { order: 2 }
   * - event-flow: { eventName: 'data-ready' }
   * - collaboration: { role: 'payment-processor' }
   * - feature-grouping: { featureName: 'Authentication' }
   */
  properties: Record<string, any>;

  // ===== Metadata =====
  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Optional description */
  description?: string;
}

/**
 * Relationship query interface
 * @public
 */
export interface RelationshipQuery {
  /** Filter by type */
  type?: RelationshipType | RelationshipType[];

  /** Filter by category */
  category?: RelationshipCategory | RelationshipCategory[];

  /** Filter by source symbol */
  from?: string;

  /** Filter by target symbol */
  to?: string;

  /** Filter by strength */
  strength?: RelationshipStrength;

  /** Minimum confidence */
  minConfidence?: number;

  /** Filter by discovery method */
  discoveredBy?: DiscoveryMethod;
}

/**
 * Relationship collection result
 * @public
 */
export interface RelationshipCollectionResult {
  /** All collected relationships */
  relationships: UnifiedRelationship[];

  /** Statistics by category */
  byCategory: Record<RelationshipCategory, number>;

  /** Statistics by type */
  byType: Record<RelationshipType, number>;

  /** Statistics by strength */
  byStrength: Record<RelationshipStrength, number>;

  /** Total count */
  total: number;

  /** Collection timestamp */
  collectedAt: string;
}

/**
 * Missing relationship
 * @public
 */
export interface MissingRelationship {
  /** Expected relationship type */
  type: RelationshipType;

  /** Source symbol */
  from: string;

  /** Target symbol */
  to: string;

  /** Reason why it's missing */
  reason: string;

  /** Suggestion for adding it */
  suggestion: string;

  /** Priority (1-5, 5 = highest) */
  priority: number;
}

/**
 * SSOT Completeness Score
 * @public
 */
export interface SSOTCompleteness {
  // ===== Category Breakdown =====
  /** Structural relationships coverage */
  structural: {
    total: number;
    discovered: number;
    coverage: number;
  };

  /** Data flow relationships coverage */
  dataFlow: {
    total: number;
    discovered: number;
    coverage: number;
  };

  /** Behavioral relationships coverage */
  behavioral: {
    total: number;
    discovered: number;
    coverage: number;
  };

  /** Alternative relationships coverage */
  alternative: {
    total: number;
    discovered: number;
    coverage: number;
  };

  /** Constraint relationships coverage */
  constraint: {
    total: number;
    discovered: number;
    coverage: number;
  };

  /** Semantic relationships coverage */
  semantic: {
    total: number;
    discovered: number;
    coverage: number;
  };

  /** Verification relationships coverage */
  verification: {
    total: number;
    discovered: number;
    coverage: number;
  };

  // ===== Overall =====
  /** Overall completeness score (0-100) */
  overallScore: number;

  // ===== Gaps =====
  /** Missing relationships */
  missingRelationships: MissingRelationship[];

  /** Number of missing relationships */
  totalMissing: number;

  // ===== Recommendations =====
  /** Actionable recommendations */
  recommendations: string[];

  // ===== Metadata =====
  /** Measurement timestamp */
  measuredAt: string;

  /** Total symbols analyzed */
  totalSymbols: number;
}

/**
 * Relationship graph node
 * @public
 */
export interface RelationshipNode {
  /** Symbol ID */
  symbolId: string;

  /** Symbol name */
  symbolName: string;

  /** Outgoing relationships */
  outgoing: UnifiedRelationship[];

  /** Incoming relationships */
  incoming: UnifiedRelationship[];

  /** Total relationship count */
  totalRelationships: number;
}

/**
 * Relationship graph
 * @public
 */
export interface RelationshipGraph {
  /** All nodes indexed by symbol ID */
  nodes: Map<string, RelationshipNode>;

  /** All relationships */
  relationships: UnifiedRelationship[];

  /** Relationships by type */
  byType: Map<RelationshipType, UnifiedRelationship[]>;

  /** Relationships by category */
  byCategory: Map<RelationshipCategory, UnifiedRelationship[]>;

  /** Graph metadata */
  metadata: {
    nodeCount: number;
    relationshipCount: number;
    averageConnections: number;
    mostConnected: { symbolId: string; count: number }[];
  };
}
