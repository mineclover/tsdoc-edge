/**
 * Versioned contracts for the authored specification graph and its bindings.
 *
 * Managed documents are the authored source of truth. A SpecGraphRevision is a
 * deterministic compiled projection and must not be edited as an independent
 * source.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @context Core data model for authored specification nodes, edges, cross-plane endpoint selectors, role-based binding declarations, resolved bindings, and policy revisions.
 * @functionality Defines versioned TypeScript interfaces and discriminated unions for compiled `SpecGraphRevision` and `PolicyRevision` projections consumed by CLI, LSP, and CI.
 * @packageDocumentation
 */

import type { SpecStatus } from '../types/spec';

/**
 * Schema contract version for compiled `SpecGraphRevision` payloads.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export const SPEC_GRAPH_CONTRACT_VERSION = '1.0' as const;

/**
 * Authored node category within a compiled specification graph.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export type SpecNodeKind = 'spec' | 'requirement' | 'invariant' | 'decision' | 'api-contract';

/**
 * Subset of `SpecNodeKind` values that may carry executable binding obligations.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export type ObligationNodeKind = Exclude<SpecNodeKind, 'spec' | 'decision'>;

/**
 * Directed structural or lineage relationship kind between specification nodes.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export type SpecEdgeKind = 'contains' | 'refines' | 'requires' | 'establishes' | 'supersedes';

/**
 * Role-based cross-plane binding obligation category linking specs to code or evidence.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export type SpecBindingKind = 'implementation' | 'verification' | 'constraint' | 'governance';

/**
 * One-based line and optional column span within a source document or file.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export interface SourceRange {
  readonly startLine: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

/**
 * Stable location in one authored managed document.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export interface SpecSourceAnchor {
  readonly documentId: string;
  readonly file: string;
  readonly symbol?: string;
  readonly section?: string;
  readonly range?: SourceRange;
  readonly contentDigest: string;
}

/**
 * Child lifecycle either inherits from its aggregate or is independently governed.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
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

/**
 * Compiled specification node projected from an authored managed document.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export interface SpecNode {
  readonly id: string;
  readonly kind: SpecNodeKind;
  readonly title: string;
  readonly lifecycle: SpecLifecycle;
  readonly source: SpecSourceAnchor;
  readonly tags: readonly string[];
}

/**
 * Extractor provenance attached to an authored specification edge or binding.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export interface SpecProvenance {
  readonly source: 'managed-document' | 'imported-baseline';
  readonly extractorId: string;
  readonly extractorVersion: string;
  readonly sourceRevision?: string;
}

/**
 * Source anchor and optional description supporting a specification edge or resolution.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export interface SpecEvidence {
  readonly source: SpecSourceAnchor;
  readonly description?: string;
}

/**
 * Durable authored relation between specification nodes.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
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

/**
 * Authored selector for one code entity; it is not a revision-specific resolution.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
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

/**
 * Authored selector for a code interaction or type relation.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface CodeEdgeSelector extends WorkspaceSelector {
  readonly type: 'code-edge';
  readonly graphNamespace?: string;
  readonly plane?: 'compiler-fact' | 'producer-derived' | 'router-derived';
  readonly kind?: string;
  readonly from: CodeNodeSelector;
  readonly to: CodeNodeSelector;
  readonly occurrenceId?: string;
}

/**
 * Authored selector targeting a specification node within a workspace.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export interface SpecNodeSelector {
  readonly type: 'spec-node';
  readonly workspaceId: string;
  readonly specNodeId: string;
}

/**
 * Authored selector targeting a test-runner evidence item within a workspace.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface TestEvidenceSelector extends WorkspaceSelector {
  readonly type: 'test-evidence';
  readonly evidenceId?: string;
  readonly file?: string;
  readonly testName?: string;
  readonly runner?: string;
}

/**
 * Authored selector targeting an exported package API surface observation.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface ApiSurfaceSelector extends WorkspaceSelector {
  readonly type: 'api-surface';
  readonly packageName: string;
  readonly packageVersion?: string;
  readonly module?: string;
  readonly exportName?: string;
}

/**
 * Union of code-plane subject selectors (`CodeNodeSelector`, `CodeEdgeSelector`, `ApiSurfaceSelector`).
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export type CodeSubjectSelector = CodeNodeSelector | CodeEdgeSelector | ApiSurfaceSelector;

/**
 * Union of all cross-plane endpoint selectors usable in bindings and suppressions.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export type BindingEndpointSelector = CodeSubjectSelector | SpecNodeSelector | TestEvidenceSelector;

interface SpecBindingDeclarationBase {
  readonly id: string;
  readonly kind: SpecBindingKind;
  readonly specNodeId: string;
  readonly source: SpecSourceAnchor;
  readonly provenance: SpecProvenance;
}

/**
 * Authored binding declaring that a code node or API surface implements a spec obligation.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface ImplementationBindingDeclaration extends SpecBindingDeclarationBase {
  readonly kind: 'implementation';
  readonly target: CodeNodeSelector | ApiSurfaceSelector;
}

/**
 * Verification is intentionally role-based because it is commonly ternary.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface VerificationBindingDeclaration extends SpecBindingDeclarationBase {
  readonly kind: 'verification';
  readonly verifier: TestEvidenceSelector;
  readonly subject: SpecNodeSelector | CodeNodeSelector | CodeEdgeSelector | ApiSurfaceSelector;
}

/**
 * Authored binding declaring that an invariant constrains a code or spec target.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface ConstraintBindingDeclaration extends SpecBindingDeclarationBase {
  readonly kind: 'constraint';
  readonly target: CodeSubjectSelector | SpecNodeSelector;
}

/**
 * Authored binding declaring that an API contract governs a public API surface or code node.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface GovernanceBindingDeclaration extends SpecBindingDeclarationBase {
  readonly kind: 'governance';
  readonly target: ApiSurfaceSelector | CodeNodeSelector;
}

/**
 * Discriminated union of all authored SpecGraph binding declarations.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export type SpecBindingDeclaration =
  | ImplementationBindingDeclaration
  | VerificationBindingDeclaration
  | ConstraintBindingDeclaration
  | GovernanceBindingDeclaration;

/**
 * Semantic plane identifier classifying code, specification, binding, evidence, and derived relations.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export type RelationPlane =
  | 'compiler-fact'
  | 'producer-derived'
  | 'router-derived'
  | 'spec'
  | 'binding'
  | 'evidence'
  | 'derived';

/**
 * Revision-pinned endpoint reference produced when resolving a `BindingEndpointSelector`.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
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
      readonly status?: 'passed' | 'failed' | 'skipped' | 'unknown';
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

/**
 * Resolution status and matched endpoint references for one role within a binding.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
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

/**
 * Identifier, version, and configuration digest of a binding resolver implementation.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export interface BindingResolverIdentity {
  readonly id: string;
  readonly version: string;
  /** Hash of resolver options that can affect candidate construction. */
  readonly configDigest?: string;
}

/**
 * Revision-specific resolution record produced for an authored `SpecBindingDeclaration`.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
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

/**
 * Revision-level provenance extending `SpecProvenance` with an authored source fingerprint.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @public
 */
export interface SpecGraphProvenance extends SpecProvenance {
  readonly authoredSourceFingerprint: string;
}

/**
 * Deterministic compiled projection of authored managed documents.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
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

/**
 * Executable conformance policy rule configuration and severity override.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface PolicyRule {
  readonly id: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly severity?: 'error' | 'warning' | 'info';
  readonly parameters?: Readonly<Record<string, unknown>>;
}

/**
 * Exact-endpoint conformance rule suppression with mandatory rationale and optional RFC3339 expiry.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface PolicySuppression {
  readonly id: string;
  readonly ruleId: string;
  readonly target: BindingEndpointSelector;
  readonly reason: string;
  readonly expiresAt?: string;
}

/**
 * Compiler provenance recorded on a content-addressed `PolicyRevision`.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
export interface PolicyProvenance {
  readonly source: 'managed-policy' | 'workspace-config' | 'default';
  readonly compilerId: string;
  readonly compilerVersion: string;
  readonly sourceFingerprint: string;
}

/**
 * Versioned policy input shared by CLI, LSP, and CI.
 *
 * @doc [[AuthoredProjectSpecifications]]
 * @doc [[ConventionCheck]]
 * @public
 */
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
