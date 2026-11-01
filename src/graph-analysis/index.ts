/**
 * Public barrel exports for canonical graph indexing, traversal, and semantic edge projection.
 *
 * @doc [[GraphAndPersistencePlaneSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @context Entry-point barrel aggregating compiler-neutral canonical graph indexes, analysis services, query contracts, and relation-semantic registries.
 * @functionality Re-exports `CanonicalGraphIndex`, `GraphAnalysisService`, analysis query contracts, and `@ttsc/graph` edge-semantic policies.
 * @packageDocumentation
 */

export { CanonicalGraphIndex } from './CanonicalGraphIndex';
export * from './contracts';
export {
  CONTAINMENT_GRAPH_EDGE_KINDS,
  DEPENDENCY_GRAPH_EDGE_KINDS,
  type GraphEdgeSemantic,
  graphEdgeSemantic,
  PROJECTABLE_GRAPH_EDGE_KINDS,
  RELATION_SEMANTIC_REGISTRY_VERSION,
  type RelationQueryPolicies,
  type RelationSemanticFamily,
} from './edge-semantics';
export {
  GraphAnalysisService,
  type RelationshipProjectionOptions,
} from './GraphAnalysisService';
