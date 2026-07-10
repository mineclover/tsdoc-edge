/**
 * TypeScript-version-neutral graph analysis contracts.
 * @packageDocumentation
 */

import type { CanonicalGraphEdge, CanonicalGraphNode } from '../indexer/contracts';

/** How external nodes participate in a graph query. */
export type ExternalNodePolicy = 'include' | 'exclude' | 'boundary';

/** Filters shared by direct-neighbor and impact queries. */
export interface GraphFilterOptions {
  /** Raw producer edge kinds to include. Unknown kinds remain queryable. */
  edgeKinds?: readonly string[];
  /** Whether external nodes are included and traversed. */
  external?: ExternalNodePolicy;
}

/** Options for recursive impact traversal. */
export interface GraphTraversalOptions extends GraphFilterOptions {
  /** Maximum number of edges from the seed. Defaults to three. */
  maxDepth?: number;
}

/** A node reached through one canonical graph edge. */
export interface GraphNeighbor {
  readonly node: CanonicalGraphNode;
  readonly edge: CanonicalGraphEdge;
}

/** Exact, ambiguous, or missing symbol lookup result. */
export type SymbolResolution =
  | {
      readonly status: 'found';
      readonly query: string;
      readonly node: CanonicalGraphNode;
    }
  | {
      readonly status: 'ambiguous';
      readonly query: string;
      readonly candidates: readonly CanonicalGraphNode[];
    }
  | {
      readonly status: 'missing';
      readonly query: string;
    };

/** One affected node in an incoming-edge impact traversal. */
export interface GraphImpactNode extends GraphNeighbor {
  readonly depth: number;
}

/** Change-impact result. The root is not repeated in `affected`. */
export interface GraphImpactResult {
  readonly root: CanonicalGraphNode;
  readonly affected: readonly GraphImpactNode[];
}

/** Deterministic per-node degree metrics. */
export interface GraphDegreeMetric {
  readonly node: CanonicalGraphNode;
  readonly dependencyCount: number;
  readonly internalDependencyCount: number;
  readonly externalDependencyCount: number;
  readonly dependentCount: number;
  readonly internalDependentCount: number;
  readonly externalDependentCount: number;
  readonly outgoingEdgeCount: number;
  readonly incomingEdgeCount: number;
  readonly totalNeighborCount: number;
}

/** Options for deterministic node ranking. External nodes are excluded by default. */
export interface GraphMetricsOptions {
  readonly includeExternalNodes?: boolean;
}

/** Structural summary of one canonical graph revision. */
export interface GraphAnalysisSummary {
  readonly fingerprint: string;
  readonly nodeCount: number;
  readonly internalNodeCount: number;
  readonly externalNodeCount: number;
  readonly edgeCount: number;
  readonly isolatedNodeCount: number;
  readonly nodeKinds: Readonly<Record<string, number>>;
  readonly edgeKinds: Readonly<Record<string, number>>;
}

/** Stable semantic bucket used only for presentation and projection. */
export type GraphEdgeCategory = 'structural' | 'behavioral' | 'type-system' | 'raw';
