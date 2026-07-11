/**
 * Cross-plane effective analysis contracts shared by CLI, LSP, and CI.
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

/** Code-only queries do not require a synthetic spec or policy revision. */
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

/** Full pre-binding input identity for spec-aware analysis. */
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

/** Final analysis identity adds binding results without hashing them into their own input. */
export interface EffectiveAnalysisStamp extends EffectiveAnalysisInputStamp {
  readonly bindingResolutionSetId: string;
}

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

export interface SpecAnalysisView {
  readonly revision: SpecGraphRevision;
  readonly effectiveViewId?: string;
}

export interface RevisionInput {
  readonly revisionId: string;
  readonly contentFingerprint: string;
}

export interface RuleSetRevision extends RevisionInput {
  readonly analyzerVersions: Readonly<Record<string, string>>;
}

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

/** Immutable cross-plane input assembled before binding resolution. */
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

export interface BindingResolutionSet {
  readonly resolutionSetId: string;
  readonly snapshotId: string;
  readonly inputStamp: EffectiveAnalysisInputStamp;
  readonly stamp: EffectiveAnalysisStamp;
  readonly resolver: BindingResolverIdentity;
  readonly resolutions: readonly ResolvedSpecBinding[];
}

/** Resolver consumes the fully assembled view; it never receives saved planes separately. */
export interface EffectiveBindingResolver {
  readonly identity: BindingResolverIdentity;
  resolve(snapshot: EffectiveAnalysisSnapshot): readonly ResolvedSpecBinding[];
}
