/**
 * Public barrel exports for the revision-pinned convention governance subsystem.
 *
 * @doc [[ConventionCheck]]
 * @doc [[Convention Pack Check]]
 * @context Entry-point barrel aggregating convention-pack compilation, check execution, gate decisions, evidence/enrichment loaders, and naming, TSDoc, graph-lint, and coverage evaluators.
 * @functionality Re-exports all public contracts, compilers, loaders, evaluators, and services for the `src/convention` module boundary.
 * @packageDocumentation
 */

export * from './ConventionCheckService';
export * from './ConventionGate';
export * from './ConventionPackCompiler';
export * from './CoverageMetricPolicy';
export * from './contracts';
export * from './JestJsonEvidenceLoader';
export * from './NamingConventionEvaluator';
export * from './TsdocConventionEvaluator';
export * from './TsdocEnrichmentLoader';
export * from './TtscGraphLintAdapter';
