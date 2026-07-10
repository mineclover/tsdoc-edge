export {
  CanonicalAliasContext,
} from './CanonicalAliasContext';
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
export * from './contracts';
export {
  formatCanonicalId,
  isProvisionalOverlayId,
  parseCanonicalId,
  CANONICAL_ID_SCHEME,
  OVERLAY_ID_SUFFIX,
} from './canonical-id';
export {
  CANONICAL_DIAGNOSTICS_CONTRACT_VERSION,
  normalizeRouterDiagnostics,
  type CanonicalDiagnostic,
  type CanonicalDiagnosticCategory,
  type CanonicalDiagnosticSeverity,
} from './diagnostics-contract';
export { generateLegacyId, normalizeLegacyKind } from './legacy-id';
export {
  verifyLegacyAstParity,
  type LegacyParityMismatch,
  type LegacyParityResult,
} from './LegacyAstParityAdapter';
export {
  InMemoryAliasResolver,
  materializeAliases,
  type AliasMatchStrategy,
  type SymbolAliasRecord,
} from './symbol-alias';
export { ProjectIndexer } from './ProjectIndexer';
export {
  TtscGraphRouterArtifactAdapter,
  type TtscGraphRouterArtifactAdapterOptions,
} from './TtscGraphRouterArtifactAdapter';
