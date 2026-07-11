/**
 * Presentation semantics for raw `@ttsc/graph` edge kinds.
 *
 * Raw kinds are never rewritten in the canonical graph. This table only tells
 * consumers which existing TSDoc Edge relationship type can represent a fact.
 * @packageDocumentation
 */

import type {
  RelationshipCategory,
  RelationshipStrength,
  RelationshipType,
} from '../types/relationships';
import type { GraphEdgeCategory } from './contracts';

/** Version of the traversal/presentation semantics used in analysis identity. */
export const RELATION_SEMANTIC_REGISTRY_VERSION = '1.0.0' as const;

export interface GraphEdgeSemantic {
  readonly category: GraphEdgeCategory;
  /** Semantic family used by traversal and presentation policies. */
  readonly family: RelationSemanticFamily;
  /** Role played by the `from` endpoint. */
  readonly sourceRole: string;
  /** Role played by the `to` endpoint. */
  readonly targetRole: string;
  /** Query behavior is independent from legacy presentation support. */
  readonly queryPolicies: RelationQueryPolicies;
  readonly relationshipType?: RelationshipType;
  readonly relationshipCategory?: RelationshipCategory;
  readonly strength?: RelationshipStrength;
}

export type RelationSemanticFamily =
  | 'execution'
  | 'type'
  | 'ownership'
  | 'module'
  | 'verification'
  | 'metadata';

export interface RelationQueryPolicies {
  /** Whether `from` depends on `to` for dependency/degree queries. */
  readonly dependency: boolean;
  /** Direction followed when the target relation participates in change impact. */
  readonly impact: 'reverse' | 'forward' | 'none';
  /** Whether this relation participates in containment queries. */
  readonly containment: boolean;
}

const UNKNOWN_SEMANTIC: GraphEdgeSemantic = Object.freeze({
  category: 'raw',
  family: 'metadata',
  sourceRole: 'source',
  targetRole: 'target',
  queryPolicies: Object.freeze({ dependency: false, impact: 'none', containment: false }),
});

function dependencySemantic(semantic: Omit<GraphEdgeSemantic, 'queryPolicies'>): GraphEdgeSemantic {
  return Object.freeze({
    ...semantic,
    queryPolicies: Object.freeze({
      dependency: true,
      impact: 'reverse' as const,
      containment: false,
    }),
  });
}

function nonDependencySemantic(
  semantic: Omit<GraphEdgeSemantic, 'queryPolicies'>,
  options: Pick<RelationQueryPolicies, 'impact' | 'containment'> = {
    impact: 'none',
    containment: false,
  }
): GraphEdgeSemantic {
  return Object.freeze({
    ...semantic,
    queryPolicies: Object.freeze({ dependency: false, ...options }),
  });
}

const EDGE_SEMANTICS = new Map<string, GraphEdgeSemantic>([
  [
    'accesses',
    dependencySemantic({
      category: 'structural',
      family: 'execution',
      sourceRole: 'accessor',
      targetRole: 'accessed-symbol',
      relationshipType: 'code-dependency',
      relationshipCategory: 'structural',
      strength: 'strong',
    }),
  ],
  [
    'calls',
    dependencySemantic({
      category: 'behavioral',
      family: 'execution',
      sourceRole: 'caller',
      targetRole: 'callee',
      relationshipType: 'calls',
      relationshipCategory: 'behavioral',
      strength: 'strong',
    }),
  ],
  [
    'extends',
    dependencySemantic({
      category: 'structural',
      family: 'type',
      sourceRole: 'subtype',
      targetRole: 'base-type',
      relationshipType: 'inheritance',
      relationshipCategory: 'structural',
      strength: 'strong',
    }),
  ],
  [
    'implements',
    dependencySemantic({
      category: 'structural',
      family: 'type',
      sourceRole: 'implementation',
      targetRole: 'interface',
      relationshipType: 'implementation',
      relationshipCategory: 'structural',
      strength: 'strong',
    }),
  ],
  [
    'instantiates',
    dependencySemantic({
      category: 'structural',
      family: 'execution',
      sourceRole: 'creator',
      targetRole: 'constructed-target',
      relationshipType: 'code-dependency',
      relationshipCategory: 'structural',
      strength: 'strong',
    }),
  ],
  [
    'type_ref',
    dependencySemantic({
      category: 'type-system',
      family: 'type',
      sourceRole: 'referring-symbol',
      targetRole: 'referenced-type',
      relationshipType: 'type-dependency',
      relationshipCategory: 'type-system',
      strength: 'strong',
    }),
  ],
  [
    'overrides',
    dependencySemantic({
      category: 'type-system',
      family: 'type',
      sourceRole: 'overriding-member',
      targetRole: 'base-member',
    }),
  ],
  [
    'renders',
    dependencySemantic({
      category: 'behavioral',
      family: 'execution',
      sourceRole: 'renderer',
      targetRole: 'rendered-component',
    }),
  ],
  [
    'imports',
    dependencySemantic({
      category: 'structural',
      family: 'module',
      sourceRole: 'importer',
      targetRole: 'imported-target',
    }),
  ],
  [
    'tests',
    dependencySemantic({
      category: 'raw',
      family: 'verification',
      sourceRole: 'test',
      targetRole: 'tested-subject',
    }),
  ],
  [
    'contains',
    nonDependencySemantic(
      {
        category: 'raw',
        family: 'ownership',
        sourceRole: 'container',
        targetRole: 'member',
      },
      { impact: 'none', containment: true }
    ),
  ],
  [
    'exports',
    nonDependencySemantic({
      category: 'raw',
      family: 'module',
      sourceRole: 'exporter',
      targetRole: 'exported-symbol',
    }),
  ],
  [
    'decorates',
    nonDependencySemantic({
      category: 'raw',
      family: 'metadata',
      sourceRole: 'decorator-source',
      targetRole: 'decorator-target',
    }),
  ],
]);

/** Return presentation semantics without changing the raw producer edge. */
export function graphEdgeSemantic(kind: string): GraphEdgeSemantic {
  return EDGE_SEMANTICS.get(kind) ?? UNKNOWN_SEMANTIC;
}

/** Raw edge kinds that can be projected into the current relationship ontology. */
export const PROJECTABLE_GRAPH_EDGE_KINDS = Object.freeze(
  [...EDGE_SEMANTICS.entries()]
    .filter(([, semantic]) => semantic.relationshipType !== undefined)
    .map(([kind]) => kind)
    .sort()
);

/** Raw kinds whose direction has the dependency meaning `from depends on to`. */
export const DEPENDENCY_GRAPH_EDGE_KINDS = Object.freeze(
  [...EDGE_SEMANTICS.entries()]
    .filter(([, semantic]) => semantic.queryPolicies.dependency)
    .map(([kind]) => kind)
    .sort()
);

/** Known relation kinds that participate in containment rather than dependency traversal. */
export const CONTAINMENT_GRAPH_EDGE_KINDS = Object.freeze(
  [...EDGE_SEMANTICS.entries()]
    .filter(([, semantic]) => semantic.queryPolicies.containment)
    .map(([kind]) => kind)
    .sort()
);
