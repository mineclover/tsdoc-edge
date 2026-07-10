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

export interface GraphEdgeSemantic {
  readonly category: GraphEdgeCategory;
  readonly relationshipType?: RelationshipType;
  readonly relationshipCategory?: RelationshipCategory;
  readonly strength?: RelationshipStrength;
}

const RAW_SEMANTIC: GraphEdgeSemantic = Object.freeze({ category: 'raw' });

const EDGE_SEMANTICS = new Map<string, GraphEdgeSemantic>([
  [
    'accesses',
    Object.freeze({
      category: 'structural',
      relationshipType: 'code-dependency',
      relationshipCategory: 'structural',
      strength: 'strong',
    }),
  ],
  [
    'calls',
    Object.freeze({
      category: 'behavioral',
      relationshipType: 'calls',
      relationshipCategory: 'behavioral',
      strength: 'strong',
    }),
  ],
  [
    'extends',
    Object.freeze({
      category: 'structural',
      relationshipType: 'inheritance',
      relationshipCategory: 'structural',
      strength: 'strong',
    }),
  ],
  [
    'implements',
    Object.freeze({
      category: 'structural',
      relationshipType: 'implementation',
      relationshipCategory: 'structural',
      strength: 'strong',
    }),
  ],
  [
    'instantiates',
    Object.freeze({
      category: 'structural',
      relationshipType: 'code-dependency',
      relationshipCategory: 'structural',
      strength: 'strong',
    }),
  ],
  [
    'type_ref',
    Object.freeze({
      category: 'type-system',
      relationshipType: 'type-dependency',
      relationshipCategory: 'type-system',
      strength: 'strong',
    }),
  ],
]);

/** Return presentation semantics without changing the raw producer edge. */
export function graphEdgeSemantic(kind: string): GraphEdgeSemantic {
  return EDGE_SEMANTICS.get(kind) ?? RAW_SEMANTIC;
}

/** Raw edge kinds that can be projected into the current relationship ontology. */
export const PROJECTABLE_GRAPH_EDGE_KINDS = Object.freeze([...EDGE_SEMANTICS.keys()].sort());

/** Raw kinds whose direction has the dependency meaning `from depends on to`. */
export const DEPENDENCY_GRAPH_EDGE_KINDS = PROJECTABLE_GRAPH_EDGE_KINDS;
