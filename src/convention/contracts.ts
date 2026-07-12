/**
 * Authored and compiled contracts for the first convention-management loop.
 *
 * A convention pack is a composition descriptor over existing spec, policy,
 * and rule-set revisions. It is not another graph or an alternate source of
 * code facts.
 * @packageDocumentation
 */

import type { RuleSetRevision } from '../semantic-graph/contracts';
import type {
  PolicyRevision,
  PolicyRule,
  PolicySuppression,
  SpecBindingDeclaration,
  SpecEdgeKind,
  SpecGraphProvenance,
  SpecGraphRevision,
  SpecNode,
} from '../spec-graph/contracts';

export const CONVENTION_PACK_SOURCE_CONTRACT_ID = 'tsdoc-edge/convention-pack-source' as const;
export const CONVENTION_PACK_MANIFEST_CONTRACT_ID = 'tsdoc-edge/convention-pack-manifest' as const;
export const CONVENTION_PACK_CONTRACT_VERSION = '1.0' as const;
export const CONVENTION_PACK_COMPILER_ID = 'tsdoc-edge/convention-pack-compiler' as const;
export const CONVENTION_PACK_COMPILER_VERSION = '2.0.0' as const;

export interface ConventionPackWorkspaceScope {
  readonly kind: 'workspace';
  readonly workspaceId: string;
}

export interface ConventionCapabilityRequirement {
  readonly minimumStatus: 'partial' | 'complete';
  /** Exact provider capability contract version when the convention depends on one. */
  readonly version?: string;
}

/** Node source location is derived from the authored pack file. */
export type ConventionSpecNodeSource = Omit<SpecNode, 'source'>;

/** Edge identity, evidence, and provenance are derived by the compiler. */
export interface ConventionSpecEdgeSource {
  readonly kind: SpecEdgeKind;
  readonly from: string;
  readonly to: string;
  readonly semanticQualifier?: string;
}

type DistributedOmit<T, Keys extends PropertyKey> = T extends unknown ? Omit<T, Keys> : never;

/** Binding source location and provenance are derived by the compiler. */
export type ConventionBindingSource = DistributedOmit<
  SpecBindingDeclaration,
  'source' | 'provenance'
>;

export interface ConventionSpecSource {
  readonly nodes: readonly ConventionSpecNodeSource[];
  readonly edges?: readonly ConventionSpecEdgeSource[];
  readonly bindings: readonly ConventionBindingSource[];
}

export interface ConventionPolicySource {
  readonly relationSemanticRegistryVersion?: string;
  readonly lifecycleGateVersion: string;
  readonly rules: readonly PolicyRule[];
  readonly suppressions?: readonly PolicySuppression[];
}

/**
 * Workspace-installed authored pack source.
 *
 * Selectors remain the existing exact SpecGraph selectors, including their
 * workspace IDs. That makes v1 explicit and prevents a source file from being
 * silently rebound when copied to another workspace.
 */
export interface ConventionPackSource {
  readonly contractId: typeof CONVENTION_PACK_SOURCE_CONTRACT_ID;
  readonly contractVersion: typeof CONVENTION_PACK_CONTRACT_VERSION;
  readonly packId: string;
  readonly packVersion: string;
  readonly scope: ConventionPackWorkspaceScope;
  readonly graphNamespace?: string;
  readonly capabilities?: Readonly<Record<string, ConventionCapabilityRequirement>>;
  readonly spec: ConventionSpecSource;
  readonly policy: ConventionPolicySource;
}

export interface ConventionRevisionPin {
  readonly revisionId: string;
  readonly contentFingerprint: string;
}

export interface ConventionPolicyRevisionPin {
  readonly revisionId: string;
  readonly contentDigest: string;
}

/** Content-addressed composition descriptor emitted from one authored pack. */
export interface ConventionPackManifest {
  readonly contractId: typeof CONVENTION_PACK_MANIFEST_CONTRACT_ID;
  readonly contractVersion: typeof CONVENTION_PACK_CONTRACT_VERSION;
  readonly manifestId: string;
  readonly contentDigest: string;
  readonly packId: string;
  readonly packVersion: string;
  readonly scope: ConventionPackWorkspaceScope;
  readonly graphNamespace?: string;
  readonly capabilities: Readonly<Record<string, ConventionCapabilityRequirement>>;
  readonly spec: ConventionRevisionPin;
  readonly policy: ConventionPolicyRevisionPin;
  readonly ruleSet: ConventionRevisionPin;
  readonly provenance: SpecGraphProvenance;
}

/** Fully validated runtime inputs selected by a compiled pack manifest. */
export interface CompiledConventionPack {
  readonly manifest: ConventionPackManifest;
  readonly spec: SpecGraphRevision;
  readonly policy: PolicyRevision;
  readonly ruleSet: RuleSetRevision;
}
