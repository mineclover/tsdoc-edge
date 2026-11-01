/**
 * Public barrel exports for the authored specification graph and conformance subsystem.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @context Entry-point barrel exposing SpecGraph contracts, deterministic identity builders, managed Markdown extraction, exact binding resolution, and conformance evaluation.
 * @functionality Re-exports all public contracts, extractors, resolvers, and engines for the `src/spec-graph` module boundary.
 * @packageDocumentation
 */

export * from './BindingResolver';
export * from './ConformanceEngine';
export * from './contracts';
export * from './identity';
export * from './ManagedSpecExtractor';
