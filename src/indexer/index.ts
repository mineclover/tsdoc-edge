export { CanonicalAliasContext } from './CanonicalAliasContext';
export {
  CanonicalGraphCoordinator,
  type CanonicalGraphCoordinatorDependencies,
  type CanonicalGraphCoordinatorOptions,
  type CanonicalGraphRefreshResult,
  canonicalGraphOptionsFromEnvironment,
  DEFAULT_CANONICAL_GRAPH_DATABASE,
  DEFAULT_GRAPH_ROUTER_CONFIG,
  DEFAULT_GRAPH_TSCONFIG,
} from './CanonicalGraphCoordinator';
export {
  CANONICAL_ID_SCHEME,
  formatCanonicalId,
  isProvisionalOverlayId,
  OVERLAY_ID_SUFFIX,
  parseCanonicalId,
} from './canonical-id';
export * from './contracts';
export {
  CANONICAL_DIAGNOSTICS_CONTRACT_VERSION,
  type CanonicalDiagnostic,
  type CanonicalDiagnosticCategory,
  type CanonicalDiagnosticSeverity,
  normalizeRouterDiagnostics,
} from './diagnostics-contract';
export {
  type LegacyParityMismatch,
  type LegacyParityResult,
  verifyLegacyAstParity,
} from './LegacyAstParityAdapter';
export { generateLegacyId, normalizeLegacyKind } from './legacy-id';
export { canonicalProjectGraphFingerprint, ProjectIndexer } from './ProjectIndexer';
export {
  type AliasMatchStrategy,
  InMemoryAliasResolver,
  materializeAliases,
  type SymbolAliasRecord,
} from './symbol-alias';
export {
  TtscGraphRouterArtifactAdapter,
  type TtscGraphRouterArtifactAdapterOptions,
} from './TtscGraphRouterArtifactAdapter';
