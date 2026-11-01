/**
 * Cross-plane effective analysis contracts shared by CLI, LSP, and CI.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @context Cross-plane semantic analysis stamps, views, snapshots, and binding-resolution contracts shared across CLI commands, LSP services, and CI conformance gates.
 * @functionality Defines content-addressed code view stamps, effective analysis input and output stamps, persisted vs overlay code views, rule-set revisions, provider identities, and binding resolver interfaces.
 * @packageDocumentation
 */

import type { CanonicalProjectGraph } from '../indexer/contracts';
import type {
  BindingResolverIdentity,
  PolicyRevision,
  ResolvedSpecBinding,
  SpecGraphRevision,
} from '../spec-graph';
import type { EnrichmentRevision, EvidenceRevision } from './analysis-input-revisions';

/**
 * Code-only queries do not require a synthetic spec or policy revision.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @public
 */
export interface CodeViewStamp {
  readonly codeRevisionId: string;
  readonly codeGraphFingerprint: string;
  readonly providerIdentityDigest: string;
  readonly capabilityDigest: string;
  readonly observedKindsDigest: string;
  readonly relationSemanticRegistryVersion: string;
  readonly producerDerivedDigest: string;
  readonly routerDerivedDigest: string;
  readonly codeOverlayDigest: string;
  readonly effectiveCodeViewId: string;
}

/**
 * Full pre-binding input identity for spec-aware analysis.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @public
 */
export interface EffectiveAnalysisInputStamp {
  readonly code: CodeViewStamp;
  readonly specRevisionId: string;
  readonly specOverlayDigest: string;
  readonly policyRevisionId: string;
  readonly policyDigest: string;
  readonly evidenceRevisionId: string;
  readonly evidenceDigest: string;
  readonly enrichmentRevisionId: string;
  readonly enrichmentDigest: string;
  readonly ruleSetRevisionId: string;
  readonly ruleSetDigest: string;
  readonly derivedModelDigest: string;
  readonly legacyBaselineId?: string;
  readonly comparatorVersion?: string;
  readonly effectiveViewId: string;
}

/**
 * Final analysis identity adds binding results without hashing them into their own input.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @public
 */
export interface EffectiveAnalysisStamp extends EffectiveAnalysisInputStamp {
  readonly bindingResolutionSetId: string;
}

/**
 * Discriminated code graph view representing either a persisted revision or an effective delta overlay.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @public
 */
export type CodeAnalysisView =
  | {
      readonly viewKind: 'persisted-code-revision';
      readonly revisionId: string;
      readonly graph: CanonicalProjectGraph;
    }
  | {
      readonly viewKind: 'effective-code-graph';
      readonly baseRevisionId: string;
      readonly effectiveViewId: string;
      readonly deltaIds: readonly string[];
      readonly graph: CanonicalProjectGraph;
    };

/**
 * SpecGraph revision and optional effective overlay view selected for cross-plane analysis.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @public
 */
export interface SpecAnalysisView {
  readonly revision: SpecGraphRevision;
  readonly effectiveViewId?: string;
}

/**
 * Minimal content-addressed revision identity pair (`revisionId` and `contentFingerprint`).
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @public
 */
export interface RevisionInput {
  readonly revisionId: string;
  readonly contentFingerprint: string;
}

/**
 * Content-addressed revision pinning analyzer and rule implementation versions.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @public
 */
export interface RuleSetRevision extends RevisionInput {
  readonly analyzerVersions: Readonly<Record<string, string>>;
}

/**
 * Normalized provider provenance, capability map, and observed kind inventory for a code graph.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @public
 */
export interface ProviderAnalysisIdentity {
  readonly contractId: string;
  readonly contractVersion: string;
  readonly providerId?: string;
  readonly providerVersion?: string;
  readonly providerInstanceId?: string;
  readonly producer?: string;
  readonly producerVersion?: string;
  readonly compilerVersion?: string | null;
  readonly compilerVersionReported?: boolean;
  readonly workspaceId?: string;
  readonly graphNamespace?: string;
  readonly providerConfigDigest?: string;
  readonly capabilities: Readonly<Record<string, unknown>>;
  readonly observedNodeKinds: readonly string[];
  readonly observedEdgeKinds: readonly string[];
  readonly producerDerivedRevisionId?: string;
  readonly routerDerivedRevisionId?: string;
}

/**
 * Complete revision-pinned inputs required to assemble an `EffectiveAnalysisSnapshot`.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @public
 */
export interface EffectiveAnalysisInputs {
  readonly code: CodeAnalysisView;
  readonly spec: SpecAnalysisView;
  readonly policy: PolicyRevision;
  readonly evidence: EvidenceRevision;
  readonly enrichment: EnrichmentRevision;
  readonly ruleSet: RuleSetRevision;
  readonly provider: ProviderAnalysisIdentity;
  readonly relationSemanticRegistryVersion: string;
  readonly legacyBaselineId?: string;
  readonly comparatorVersion?: string;
}

/**
 * Immutable cross-plane input assembled before binding resolution.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @public
 */
export interface EffectiveAnalysisSnapshot {
  readonly snapshotId: string;
  readonly stamp: EffectiveAnalysisInputStamp;
  readonly code: CodeAnalysisView;
  readonly spec: SpecAnalysisView;
  readonly policy: PolicyRevision;
  readonly evidence: EvidenceRevision;
  readonly enrichment: EnrichmentRevision;
  readonly ruleSet: RuleSetRevision;
  readonly provider: ProviderAnalysisIdentity;
}

/**
 * Validated set of resolved SpecGraph bindings bound to an `EffectiveAnalysisSnapshot`.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @public
 */
export interface BindingResolutionSet {
  readonly resolutionSetId: string;
  readonly snapshotId: string;
  readonly inputStamp: EffectiveAnalysisInputStamp;
  readonly stamp: EffectiveAnalysisStamp;
  readonly resolver: BindingResolverIdentity;
  readonly resolutions: readonly ResolvedSpecBinding[];
}

/**
 * Resolver consumes the fully assembled view; it never receives saved planes separately.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[Semantic Graph Analysis and Relationship Model]]
 * @public
 */
export interface EffectiveBindingResolver {
  readonly identity: BindingResolverIdentity;
  resolve(snapshot: EffectiveAnalysisSnapshot): readonly ResolvedSpecBinding[];
}
