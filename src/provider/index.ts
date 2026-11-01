/**
 * Public barrel exports for raw semantic graph provider contracts, adapters, and normalizers.
 *
 * @doc [[CrossSpecIntegrationContract]]
 * @doc [[TtscPlatformSpecification]]
 * @context Entry surface for `src/provider` consumed by canonical project indexing, LSP overlay synchronization, and `ttsc` router integration.
 * @functionality Re-exports `SemanticGraphProvider` contracts, `ProviderSnapshotNormalizer`, `DeltaNormalizer`, `ProviderProjectIndexer`, and `TtscSemanticGraphProvider`.
 * @packageDocumentation
 */

export * from './contracts';
export * from './DeltaNormalizer';
export * from './ProviderProjectIndexer';
export * from './ProviderSnapshotNormalizer';
export * from './TtscSemanticGraphProvider';
