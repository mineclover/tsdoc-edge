/**
 * TSDoc Edge LSP Module
 *
 * Provides Language Server Protocol integration for real-time code analysis
 * in IDEs like VS Code, Vim, and Emacs.
 *
 * @packageDocumentation
 * @module lsp
 * @doc [[LSP Integration]]
 *
 * @responsibility Export LSP server components
 *
 * ## Components
 *
 * - **server.ts**: LSP server (stdio transport)
 * - **service.ts**: Database access with caching
 *
 * ## Features
 *
 * | Protocol | Description |
 * |----------|-------------|
 * | hover | Symbol info + impact |
 * | codeLens | Impact counts |
 * | codeAction | Analysis actions |
 * | documentLink | [[Symbol]] links |
 * | definition | Go to definition |
 * | workspaceSymbol | Search |
 * | diagnostics | Warnings |
 *
 * @see managed/features/lsp-integration.md
 */

export { CacheEntry, CacheManager, CacheManagerOptions } from './cache-manager';
export type {
  SavedConventionDiagnosticData,
  SavedConventionFindingAnchor,
} from './convention-diagnostics';
export {
  conventionDiagnosticsForFile,
  findSavedConventionFindingAnchor,
} from './convention-diagnostics';
export { mapCanonicalDiagnostic, toLanguageServerDiagnostic } from './diagnostics';
export type {
  ConventionFixFileTarget,
  ConventionFixPlanBundle,
  ConventionFixPlanBundleParseResult,
  ConventionFixPosition,
  ConventionFixRange,
  ConventionFixTextEdit,
  MutatingCodeActionData,
  MutatingCodeActionRejectionReason,
  MutatingFixPlanRejection,
  MutatingFixPlanValidationResult,
  OpenLspDocumentSnapshot,
  ResolvedSavedConventionMutatingActions,
  ResolveSavedConventionMutatingActionsOptions,
  RetainedConventionFixPlan,
  ValidatedMutatingCodeAction,
  ValidateRetainedConventionFixPlanOptions,
} from './mutating-code-action';
export {
  CONVENTION_FIX_PLAN_BUNDLE_CONTRACT_VERSION,
  CONVENTION_FIX_PLAN_CONTRACT_VERSION,
  computeSourceContentDigest,
  loadConventionFixPlanBundleFile,
  parseConventionFixPlanBundle,
  resolveSavedConventionMutatingActions,
  validateRetainedConventionFixPlan,
} from './mutating-code-action';
export type {
  CodeGraphRevision,
  EffectiveCodeGraph,
  GraphDelta,
  GraphDeltaEdgeKey,
  GraphDeltaExtractorIdentity,
  GraphDeltaIdentityRemap,
  GraphDeltaRelationshipCoverage,
} from './overlay';
export {
  applyGraphDelta,
  composeGraphDeltas,
  EffectiveCodeGraphView,
  GRAPH_DELTA_CONTRACT_VERSION,
  GraphDeltaBuilder,
  LSP_SYNTAX_GRAPH_DELTA_EXTRACTOR,
  OverlayGraphView,
} from './overlay';
export {
  CodeLensInfo,
  DiagnosticInfo,
  SymbolSearchResult,
  TsdocEdgeService,
} from './service';
export { StatementManager, StatementManagerOptions } from './statement-manager';
