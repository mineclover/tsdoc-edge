/**
 * Versioned contracts for the authored specification graph and its bindings.
 *
 * Managed documents are the authored source of truth. A SpecGraphRevision is a
 * deterministic compiled projection and must not be edited as an independent
 * source.
 * @packageDocumentation
 */

import type { SpecStatus } from '../types/spec';

export const SPEC_GRAPH_CONTRACT_VERSION = '1.0' as const;

export type SpecNodeKind = 'spec' | 'requirement' | 'invariant' | 'decision' | 'api-contract';
export type ObligationNodeKind = Exclude<SpecNodeKind, 'spec' | 'decision'>;
export type SpecEdgeKind = 'contains' | 'refines' | 'requires' | 'establishes' | 'supersedes';
export type SpecBindingKind = 'implementation' | 'verification' | 'constraint' | 'governance';

export interface SourceRange {
  readonly startLine: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

/** Stable location in one authored managed document. */
export interface SpecSourceAnchor {
  readonly documentId: string;
  readonly file: string;
  readonly symbol?: string;
  readonly section?: string;
  readonly range?: SourceRange;
  readonly contentDigest: string;
}

/** Child lifecycle either inherits from its aggregate or is independently governed. */
export type SpecLifecycle =
  | {
      readonly mode: 'inherited';
      readonly aggregateSpecId: string;
    }
  | {
      readonly mode: 'independent';
      readonly status: SpecStatus;
      readonly version?: string;
    };

export interface SpecNode {
  readonly id: string;
  readonly kind: SpecNodeKind;
  readonly title: string;
  readonly lifecycle: SpecLifecycle;
  readonly source: SpecSourceAnchor;
  readonly tags: readonly string[];
}

export interface SpecProvenance {
  readonly source: 'managed-document' | 'imported-baseline';
  readonly extractorId: string;
  readonly extractorVersion: string;
  readonly sourceRevision?: string;
}

export interface SpecEvidence {
  readonly source: SpecSourceAnchor;
  readonly description?: string;
}

/** Durable authored relation between specification nodes. */
export interface SpecEdge {
  readonly id: string;
  readonly kind: SpecEdgeKind;
  readonly from: string;
  readonly to: string;
  /** Distinguishes multiple authored semantics with the same endpoints. */
  readonly semanticQualifier?: string;
  readonly evidence: readonly SpecEvidence[];
  readonly provenance: SpecProvenance;
}

interface WorkspaceSelector {
  readonly workspaceId: string;
  readonly providerId?: string;
}

/** Authored selector for one code entity; it is not a revision-specific resolution. */
export interface CodeNodeSelector extends WorkspaceSelector {
  readonly type: 'code-node';
  readonly graphNamespace?: string;
  readonly canonicalNodeId?: string;
  readonly providerNodeId?: string;
  readonly packageName?: string;
  readonly packageVersion?: string;
  readonly file?: string;
  readonly qualifiedName?: string;
  readonly kind?: string;
  readonly sourceAnchor?: SourceRange;
}

/** Authored selector for a code interaction or type relation. */
export interface CodeEdgeSelector extends WorkspaceSelector {
  readonly type: 'code-edge';
  readonly graphNamespace?: string;
  readonly plane?: 'compiler-fact' | 'producer-derived' | 'router-derived';
  readonly kind?: string;
  readonly from: CodeNodeSelector;
  readonly to: CodeNodeSelector;
  readonly occurrenceId?: string;
}

export interface SpecNodeSelector {
  readonly type: 'spec-node';
  readonly workspaceId: string;
  readonly specNodeId: string;
}

export interface TestEvidenceSelector extends WorkspaceSelector {
  readonly type: 'test-evidence';
  readonly evidenceId?: string;
  readonly file?: string;
  readonly testName?: string;
  readonly runner?: string;
}

export interface ApiSurfaceSelector extends WorkspaceSelector {
  readonly type: 'api-surface';
  readonly packageName: string;
  readonly packageVersion?: string;
  readonly module?: string;
  readonly exportName?: string;
}

export type CodeSubjectSelector = CodeNodeSelector | CodeEdgeSelector | ApiSurfaceSelector;
export type BindingEndpointSelector = CodeSubjectSelector | SpecNodeSelector | TestEvidenceSelector;

interface SpecBindingDeclarationBase {
  readonly id: string;
  readonly kind: SpecBindingKind;
  readonly specNodeId: string;
  readonly source: SpecSourceAnchor;
  readonly provenance: SpecProvenance;
}

export interface ImplementationBindingDeclaration extends SpecBindingDeclarationBase {
  readonly kind: 'implementation';
  readonly target: CodeNodeSelector | ApiSurfaceSelector;
}

/** Verification is intentionally role-based because it is commonly ternary. */
export interface VerificationBindingDeclaration extends SpecBindingDeclarationBase {
  readonly kind: 'verification';
  readonly verifier: TestEvidenceSelector;
  readonly subject: SpecNodeSelector | CodeNodeSelector | CodeEdgeSelector | ApiSurfaceSelector;
}

export interface ConstraintBindingDeclaration extends SpecBindingDeclarationBase {
  readonly kind: 'constraint';
  readonly target: CodeSubjectSelector | SpecNodeSelector;
}

export interface GovernanceBindingDeclaration extends SpecBindingDeclarationBase {
  readonly kind: 'governance';
  readonly target: ApiSurfaceSelector | CodeNodeSelector;
}

export type SpecBindingDeclaration =
  | ImplementationBindingDeclaration
  | VerificationBindingDeclaration
  | ConstraintBindingDeclaration
  | GovernanceBindingDeclaration;

export type RelationPlane =
  | 'compiler-fact'
  | 'producer-derived'
  | 'router-derived'
  | 'spec'
  | 'binding'
  | 'evidence'
  | 'derived';

export type EndpointRef =
  | {
      readonly type: 'code-node';
      readonly workspaceId: string;
      readonly graphNamespace: string;
      readonly effectiveCodeViewId: string;
      readonly codeRevisionId?: string;
      readonly id: string;
      readonly providerNodeId?: string;
    }
  | {
      readonly type: 'code-edge';
      readonly workspaceId: string;
      readonly graphNamespace: string;
      readonly effectiveCodeViewId: string;
      readonly codeRevisionId?: string;
      readonly edgeId: string;
      readonly plane: Extract<
        RelationPlane,
        'compiler-fact' | 'producer-derived' | 'router-derived'
      >;
      readonly kind: string;
      readonly from: string;
      readonly to: string;
      readonly occurrenceId?: string;
    }
  | {
      readonly type: 'spec-node';
      readonly workspaceId: string;
      readonly specRevisionId: string;
      readonly id: string;
    }
  | {
      readonly type: 'test-evidence';
      readonly workspaceId: string;
      readonly evidenceRevisionId: string;
      readonly id: string;
      readonly providerId?: string;
      readonly file?: string;
      readonly testName?: string;
      readonly runner?: string;
    }
  | {
      readonly type: 'api-surface';
      readonly workspaceId: string;
      readonly graphNamespace: string;
      readonly effectiveCodeViewId: string;
      readonly codeRevisionId?: string;
      readonly surfaceId: string;
      readonly providerId?: string;
      readonly packageName?: string;
      readonly packageVersion?: string;
      readonly module?: string;
      readonly exportName?: string;
    };

export interface ResolvedBindingParticipant {
  readonly role:
    | 'implementer'
    | 'obligation'
    | 'verifier'
    | 'subject'
    | 'constraint'
    | 'contract'
    | 'api';
  readonly status: 'resolved' | 'ambiguous' | 'missing' | 'stale';
  readonly refs: readonly EndpointRef[];
}

export interface BindingResolverIdentity {
  readonly id: string;
  readonly version: string;
  /** Hash of resolver options that can affect candidate construction. */
  readonly configDigest?: string;
}

export interface ResolvedSpecBinding {
  readonly resolutionId: string;
  readonly declarationId: string;
  readonly declarationDigest: string;
  readonly specRevisionId: string;
  readonly effectiveViewId: string;
  readonly codeRevisionId?: string;
  readonly evidenceRevisionId?: string;
  readonly resolver: BindingResolverIdentity;
  readonly status: 'resolved' | 'ambiguous' | 'missing' | 'stale';
  readonly participants: readonly ResolvedBindingParticipant[];
  readonly confidence: number;
  readonly evidence: readonly SpecEvidence[];
}

export interface SpecGraphProvenance extends SpecProvenance {
  readonly authoredSourceFingerprint: string;
}

/** Deterministic compiled projection of authored managed documents. */
export interface SpecGraphRevision {
  readonly contractVersion: typeof SPEC_GRAPH_CONTRACT_VERSION;
  readonly revisionId: string;
  readonly contentFingerprint: string;
  readonly workspaceId: string;
  readonly nodes: readonly SpecNode[];
  readonly edges: readonly SpecEdge[];
  readonly bindings: readonly SpecBindingDeclaration[];
  readonly provenance: SpecGraphProvenance;
}

export interface PolicyRule {
  readonly id: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly severity?: 'error' | 'warning' | 'info';
  readonly parameters?: Readonly<Record<string, unknown>>;
}

export interface PolicySuppression {
  readonly id: string;
  readonly ruleId: string;
  readonly target: BindingEndpointSelector;
  readonly reason: string;
  readonly expiresAt?: string;
}

export interface PolicyProvenance {
  readonly source: 'managed-policy' | 'workspace-config' | 'default';
  readonly compilerId: string;
  readonly compilerVersion: string;
  readonly sourceFingerprint: string;
}

/** Versioned policy input shared by CLI, LSP, and CI. */
export interface PolicyRevision {
  readonly contractVersion: '1.0';
  readonly revisionId: string;
  readonly contentDigest: string;
  readonly ruleSetDigest: string;
  readonly relationSemanticRegistryVersion: string;
  readonly lifecycleGateVersion: string;
  readonly rules: readonly PolicyRule[];
  readonly suppressions: readonly PolicySuppression[];
  readonly provenance: PolicyProvenance;
}
