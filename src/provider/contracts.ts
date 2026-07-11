/**
 * Provider-owned raw semantic graph contracts.
 *
 * Providers expose producer identities and JSON-shaped facts. They never
 * allocate canonical graph ids or return persisted graph revisions.
 * @packageDocumentation
 */

import type { ProjectGraphEvidence } from '../indexer/contracts';
import type {
  CanonicalDiagnosticCategory,
  CanonicalDiagnosticSeverity,
} from '../indexer/diagnostics-contract';

export const SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID = 'tsdoc-edge/semantic-graph-provider' as const;
export const SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION = '1.0' as const;

/** Stable provider implementation and configured-instance identity. */
export interface ProviderIdentity {
  readonly providerId: string;
  readonly providerVersion: string;
  readonly providerInstanceId: string;
  readonly contractId: typeof SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID;
  readonly contractVersion: typeof SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION;
}

export type ProviderCapabilityStatus = 'unsupported' | 'partial' | 'complete';

/** One negotiated provider capability. */
export interface ProviderCapability {
  readonly status: ProviderCapabilityStatus;
  readonly version?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Extensible capability map whose values have explicit completeness. */
export type GraphCapabilities = Readonly<Record<string, ProviderCapability>>;

/** Raw provider node. `providerNodeId` is unique only within the provider instance. */
export interface ProviderNode {
  readonly providerNodeId: string;
  readonly kind: string;
  readonly name?: string;
  readonly qualifiedName?: string;
  readonly file?: string;
  readonly exported?: boolean;
  readonly external?: boolean;
  readonly evidence?: ProjectGraphEvidence;
  readonly producerFields?: Readonly<Record<string, unknown>>;
}

/** One observed provider fact; repeated call sites remain separate occurrences. */
export interface ProviderFactOccurrence {
  /** Stable provider-local identity required for incremental removal/replacement. */
  readonly providerFactId: string;
  /** Snapshot or delta identity that first observed this occurrence. */
  readonly observedInSnapshotId?: string;
  readonly kind: string;
  readonly fromProviderNodeId: string;
  readonly toProviderNodeId: string;
  readonly semanticQualifier?: string;
  readonly evidence: ProjectGraphEvidence;
  readonly confidence?: number;
  readonly producerFields?: Readonly<Record<string, unknown>>;
}

/** Raw diagnostic before canonical node ids are assigned. */
export interface ProviderDiagnostic {
  readonly providerDiagnosticId?: string;
  readonly code?: string | number;
  readonly category?: CanonicalDiagnosticCategory;
  readonly severity: CanonicalDiagnosticSeverity;
  readonly message: string;
  readonly evidence?: ProjectGraphEvidence;
  readonly relatedProviderNodeIds?: readonly string[];
  readonly producerFields?: Readonly<Record<string, unknown>>;
}

/** Provenance reported by the provider without compatibility inference. */
export interface ProviderProvenance {
  readonly producer: string;
  readonly producerVersion?: string;
  readonly compilerVersion: string | null;
  readonly compilerVersionReported: boolean;
  readonly typescriptCompatibilityTarget?: string;
  readonly artifactContractId?: string;
  readonly artifactContractVersion?: string;
  readonly artifactFingerprint?: string;
  readonly providerConfigDigest: string;
  readonly producerFields?: Readonly<Record<string, unknown>>;
}

/** Whole-project raw fact snapshot returned by a provider. */
export interface ProviderSnapshot {
  readonly contractId: typeof SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID;
  readonly contractVersion: typeof SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION;
  readonly snapshotId: string;
  readonly workspaceId: string;
  readonly graphNamespace: string;
  readonly identity: ProviderIdentity;
  readonly capabilities: GraphCapabilities;
  readonly nodes: readonly ProviderNode[];
  readonly facts: readonly ProviderFactOccurrence[];
  readonly diagnostics: readonly ProviderDiagnostic[];
  readonly provenance: ProviderProvenance;
}

export type ProviderIdentityRemapReason = 'rename' | 'move' | 'delete';

/** Raw change set; every identifier remains in the provider namespace. */
export type ProviderChange =
  | { readonly type: 'node-upsert'; readonly node: ProviderNode }
  | { readonly type: 'node-remove'; readonly providerNodeId: string }
  | { readonly type: 'fact-upsert'; readonly fact: ProviderFactOccurrence }
  | {
      readonly type: 'fact-remove';
      readonly providerFactId: string;
    }
  | {
      readonly type: 'identity-remap';
      readonly previousProviderNodeId: string;
      readonly nextProviderNodeId?: string;
      readonly reason: ProviderIdentityRemapReason;
    };

/** One unsaved-document raw delta based on an exact provider snapshot. */
export interface ProviderDelta {
  readonly contractId: typeof SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID;
  readonly contractVersion: typeof SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION;
  readonly deltaId: string;
  readonly baseSnapshotId: string;
  readonly workspaceId: string;
  readonly graphNamespace: string;
  readonly identity: ProviderIdentity;
  readonly documentPath: string;
  readonly contentDigest: string;
  readonly changes: readonly ProviderChange[];
  readonly diagnostics: readonly ProviderDiagnostic[];
  readonly capabilities: GraphCapabilities;
}

/** Provider-neutral whole-project request. */
export interface ProviderProjectInput {
  readonly workspaceId: string;
  readonly rootDir: string;
  readonly refresh?: boolean;
}

/** Provider-neutral dirty-document request. */
export interface ProviderDocumentInput extends ProviderProjectInput {
  readonly baseSnapshotId: string;
  readonly filePath: string;
  readonly content: string;
}

/** TypeScript-only configuration kept outside the canonical graph contract. */
export interface TypeScriptProviderConfig {
  readonly tsconfigPath: string;
  readonly routerConfigPath?: string;
  readonly routerRepoId?: string;
}

/** Public provider extension boundary. */
export interface SemanticGraphProvider {
  identity(): ProviderIdentity;
  capabilities(): GraphCapabilities;
  snapshot(input: ProviderProjectInput): Promise<ProviderSnapshot>;
  delta?(input: ProviderDocumentInput): Promise<ProviderDelta>;
  provenance(): ProviderProvenance;
}
