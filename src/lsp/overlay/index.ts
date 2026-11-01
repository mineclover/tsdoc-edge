/**
 * Unsaved-buffer overlay graph delta and effective code graph view exports.
 *
 * @packageDocumentation
 * @doc [[LspAndCoverageSurfaceSpecification]]
 * @doc [[LSP Integration]]
 * @context Transient in-memory overlay plane isolating unsaved editor edits from persisted canonical graph revisions
 * @functionality Re-exports `GraphDelta`, `GraphDeltaBuilder`, `EffectiveCodeGraphView`, `OverlayGraphView`, and delta composition helpers
 */

export { EffectiveCodeGraphView } from './EffectiveCodeGraphView';
export {
  applyGraphDelta,
  type CodeGraphRevision,
  composeGraphDeltas,
  type EffectiveCodeGraph,
  GRAPH_DELTA_CONTRACT_VERSION,
  type GraphDelta,
  GraphDeltaBuilder,
  type GraphDeltaEdgeKey,
  type GraphDeltaExtractorIdentity,
  type GraphDeltaIdentityRemap,
  type GraphDeltaRelationshipCoverage,
  LSP_SYNTAX_GRAPH_DELTA_EXTRACTOR,
} from './GraphDelta';
export { OverlayGraphView } from './OverlayGraphView';
