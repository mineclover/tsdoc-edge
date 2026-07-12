/**
 * Deterministic, revision-aware resolution of authored specification bindings.
 *
 * The resolver never chooses a candidate heuristically. A participant resolves
 * only when its selector has exactly one match in the current effective view.
 */

import { createHash } from 'node:crypto';
import type { EvidenceRevision } from '../semantic-graph/analysis-input-revisions';
import type {
  EffectiveAnalysisSnapshot,
  EffectiveBindingResolver,
} from '../semantic-graph/contracts';
import type {
  ApiSurfaceSelector,
  BindingEndpointSelector,
  BindingResolverIdentity,
  CodeEdgeSelector,
  CodeNodeSelector,
  EndpointRef,
  ResolvedBindingParticipant,
  ResolvedSpecBinding,
  SourceRange,
  SpecBindingDeclaration,
  SpecNodeSelector,
  TestEvidenceSelector,
} from './contracts';
import { bindingDeclarationDigest, bindingResolutionId } from './identity';

export const EXACT_BINDING_RESOLVER_ID = 'tsdoc-edge/exact-binding-resolver';
export const EXACT_BINDING_RESOLVER_VERSION = '2.0.0';

type CodeNodeRef = Extract<EndpointRef, { type: 'code-node' }>;
type CodeEdgeRef = Extract<EndpointRef, { type: 'code-edge' }>;
type SpecNodeRef = Extract<EndpointRef, { type: 'spec-node' }>;
type TestEvidenceRef = Extract<EndpointRef, { type: 'test-evidence' }>;
type ApiSurfaceRef = Extract<EndpointRef, { type: 'api-surface' }>;
type ParticipantRole = ResolvedBindingParticipant['role'];
type ResolutionStatus = ResolvedBindingParticipant['status'];

export interface IndexedCodeNode {
  readonly ref: CodeNodeRef;
  readonly providerId?: string;
  readonly packageName?: string;
  readonly packageVersion?: string;
  readonly file?: string;
  readonly qualifiedName?: string;
  readonly kind?: string;
  readonly sourceAnchor?: SourceRange;
}

export interface IndexedCodeEdge {
  readonly ref: CodeEdgeRef;
  readonly providerId?: string;
}

export interface IndexedSpecNode {
  readonly ref: SpecNodeRef;
}

export interface IndexedTestEvidence {
  readonly ref: TestEvidenceRef;
  readonly providerId?: string;
  readonly evidenceId?: string;
  readonly file?: string;
  readonly testName?: string;
  readonly runner?: string;
  readonly status?: 'passed' | 'failed' | 'skipped' | 'unknown';
}

export interface IndexedApiSurface {
  readonly ref: ApiSurfaceRef;
  readonly providerId?: string;
  readonly packageName: string;
  readonly packageVersion?: string;
  readonly module?: string;
  readonly exportName?: string;
}

/** Additional revision-tagged candidates not derivable from the code/spec graphs. */
export interface BindingResolverInputIndex {
  readonly codeNodes?: readonly IndexedCodeNode[];
  readonly codeEdges?: readonly IndexedCodeEdge[];
  readonly specNodes?: readonly IndexedSpecNode[];
  readonly testEvidence?: readonly IndexedTestEvidence[];
  readonly apiSurfaces?: readonly IndexedApiSurface[];
}

export interface MaterializedBindingResolverIndex {
  readonly codeNodes: readonly IndexedCodeNode[];
  readonly codeEdges: readonly IndexedCodeEdge[];
  readonly specNodes: readonly IndexedSpecNode[];
  readonly testEvidence: readonly IndexedTestEvidence[];
  readonly apiSurfaces: readonly IndexedApiSurface[];
}

export type BindingResolverIndexProvider = (
  snapshot: EffectiveAnalysisSnapshot
) => BindingResolverInputIndex;

/** Materialize test-evidence and API-surface candidates from one pinned revision. */
export function createAnalysisInputBindingResolverIndex(
  snapshot: EffectiveAnalysisSnapshot,
  evidence: EvidenceRevision,
  options: { readonly graphNamespace?: string } = {}
): BindingResolverInputIndex {
  if (evidence.workspaceId !== snapshot.spec.revision.workspaceId) {
    throw new Error(
      `Evidence workspace mismatch: expected ${snapshot.spec.revision.workspaceId}, received ${evidence.workspaceId}`
    );
  }
  if (
    evidence.revisionId !== snapshot.evidence.revisionId ||
    evidence.contentFingerprint !== snapshot.evidence.contentFingerprint
  ) {
    throw new Error('Evidence revision does not match the effective analysis snapshot');
  }
  const graphNamespace =
    normalizedOptional(options.graphNamespace) ??
    stringValue(snapshot.code.graph.provenance.graphNamespace) ??
    snapshot.provider.graphNamespace ??
    snapshot.provider.contractId;
  const testEvidence: IndexedTestEvidence[] = [];
  const apiSurfaces: IndexedApiSurface[] = [];
  for (const item of evidence.items) {
    if (item.kind === 'test-evidence') {
      testEvidence.push({
        ref: Object.freeze({
          type: 'test-evidence',
          workspaceId: evidence.workspaceId,
          evidenceRevisionId: evidence.revisionId,
          id: item.id,
        }),
        providerId: item.provenance.producerId,
        evidenceId: item.id,
        file: item.source.file,
        testName: item.testName,
        runner: item.runner,
        status: item.status,
      });
    } else {
      apiSurfaces.push({
        ref: Object.freeze({
          type: 'api-surface',
          workspaceId: evidence.workspaceId,
          graphNamespace,
          effectiveCodeViewId: snapshot.stamp.code.effectiveCodeViewId,
          codeRevisionId: snapshot.stamp.code.codeRevisionId,
          surfaceId: item.id,
        }),
        providerId: item.provenance.producerId,
        packageName: item.packageName,
        ...(item.packageVersion ? { packageVersion: item.packageVersion } : {}),
        ...(item.module ? { module: item.module } : {}),
        exportName: item.exportName,
      });
    }
  }
  return Object.freeze({
    testEvidence: Object.freeze(testEvidence.sort(compareIndexedEntries)),
    apiSurfaces: Object.freeze(apiSurfaces.sort(compareIndexedEntries)),
  });
}

export interface ExactBindingResolverOptions {
  readonly identity?: BindingResolverIdentity;
  readonly graphNamespace?: string;
  readonly index?: BindingResolverInputIndex | BindingResolverIndexProvider;
}

export type BindingResolutionDiagnosticCode =
  | 'binding-participant-ambiguous'
  | 'binding-participant-missing'
  | 'binding-participant-stale';

/** A deterministic explanation for every participant that did not resolve. */
export interface BindingResolutionDiagnostic {
  readonly diagnosticId: string;
  readonly code: BindingResolutionDiagnosticCode;
  readonly declarationId: string;
  readonly resolutionId: string;
  readonly role: ParticipantRole;
  readonly selectorType: BindingEndpointSelector['type'];
  readonly status: Exclude<ResolutionStatus, 'resolved'>;
  readonly message: string;
  readonly candidateRefs: readonly EndpointRef[];
}

export interface BindingResolutionReport {
  readonly snapshotId: string;
  readonly resolver: BindingResolverIdentity;
  readonly resolutions: readonly ResolvedSpecBinding[];
  readonly diagnostics: readonly BindingResolutionDiagnostic[];
}

interface ParticipantPlan {
  readonly role: ParticipantRole;
  readonly selector: BindingEndpointSelector;
}

/**
 * Exact resolver shared by CLI, CI, and LSP effective-analysis consumers.
 *
 * Code and spec candidates are derived from the snapshot. Test evidence and API
 * surfaces, plus any historical candidates needed for stale diagnostics, enter
 * through the explicit revision-tagged input index.
 */
export class ExactBindingResolver implements EffectiveBindingResolver {
  readonly identity: BindingResolverIdentity;

  private readonly graphNamespace?: string;
  private readonly inputIndex?: BindingResolverInputIndex | BindingResolverIndexProvider;

  constructor(options: ExactBindingResolverOptions = {}) {
    this.graphNamespace = normalizedOptional(options.graphNamespace);
    const configDigest = digest({
      graphNamespace: this.graphNamespace ?? null,
      inputIndexMode:
        typeof options.index === 'function'
          ? 'snapshot-provider'
          : options.index
            ? 'static'
            : 'none',
    });
    if (options.identity?.configDigest && options.identity.configDigest !== configDigest) {
      throw new Error('resolver.configDigest does not match the configured resolver options');
    }
    this.identity = Object.freeze({
      id: options.identity?.id ?? EXACT_BINDING_RESOLVER_ID,
      version: options.identity?.version ?? EXACT_BINDING_RESOLVER_VERSION,
      configDigest,
    });
    requireNonEmpty(this.identity.id, 'resolver.id');
    requireNonEmpty(this.identity.version, 'resolver.version');
    this.inputIndex = options.index;
  }

  resolve(snapshot: EffectiveAnalysisSnapshot): readonly ResolvedSpecBinding[] {
    return this.resolveWithDiagnostics(snapshot).resolutions;
  }

  resolveWithDiagnostics(snapshot: EffectiveAnalysisSnapshot): BindingResolutionReport {
    const extension =
      typeof this.inputIndex === 'function' ? this.inputIndex(snapshot) : this.inputIndex;
    const index = createSnapshotBindingResolverIndex(snapshot, {
      graphNamespace: this.graphNamespace,
      extension,
    });
    const diagnostics: BindingResolutionDiagnostic[] = [];
    const resolutions = [...snapshot.spec.revision.bindings]
      .sort((left, right) => compareText(left.id, right.id))
      .map((declaration) => {
        const matches = participantPlans(declaration, snapshot).map(({ role, selector }) => ({
          selector,
          participant: resolveParticipant(role, selector, index, snapshot),
        }));
        const status = aggregateStatus(matches.map((match) => match.participant.status));
        const declarationDigest = bindingDeclarationDigest(declaration);
        const participants = Object.freeze(matches.map((match) => match.participant));
        const identityFields = {
          declarationId: declaration.id,
          declarationDigest,
          specRevisionId: snapshot.spec.revision.revisionId,
          effectiveViewId: snapshot.snapshotId,
          codeRevisionId: snapshot.stamp.code.codeRevisionId,
          ...(declaration.kind === 'verification'
            ? { evidenceRevisionId: snapshot.evidence.revisionId }
            : {}),
          resolver: this.identity,
          status,
          participants,
        } as const;
        const resolutionId = bindingResolutionId(identityFields);
        const resolution: ResolvedSpecBinding = Object.freeze({
          resolutionId,
          ...identityFields,
          confidence: status === 'resolved' ? 1 : 0,
          evidence: Object.freeze([{ source: declaration.source }]),
        });
        for (const match of matches) {
          if (match.participant.status !== 'resolved') {
            diagnostics.push(
              createDiagnostic(declaration, resolutionId, match.selector, match.participant)
            );
          }
        }
        return resolution;
      });

    diagnostics.sort(compareDiagnostics);
    return Object.freeze({
      snapshotId: snapshot.snapshotId,
      resolver: this.identity,
      resolutions: Object.freeze(resolutions),
      diagnostics: Object.freeze(diagnostics),
    });
  }
}

/** Build the current index, retaining supplied historical entries for stale detection. */
export function createSnapshotBindingResolverIndex(
  snapshot: EffectiveAnalysisSnapshot,
  options: {
    readonly graphNamespace?: string;
    readonly extension?: BindingResolverInputIndex;
  } = {}
): MaterializedBindingResolverIndex {
  const workspaceId = snapshot.spec.revision.workspaceId;
  const graphNamespace =
    normalizedOptional(options.graphNamespace) ??
    stringValue(snapshot.code.graph.provenance.graphNamespace) ??
    snapshot.provider.graphNamespace ??
    snapshot.provider.contractId;
  const effectiveCodeViewId = snapshot.stamp.code.effectiveCodeViewId;
  const codeRevisionId = snapshot.stamp.code.codeRevisionId;
  const providerId =
    stringValue(snapshot.code.graph.provenance.providerId) ??
    snapshot.provider.providerId ??
    stringValue(snapshot.code.graph.provenance.producer) ??
    snapshot.provider.contractId;

  const codeNodes: IndexedCodeNode[] = snapshot.code.graph.nodes.map((node) => ({
    ref: Object.freeze({
      type: 'code-node',
      workspaceId,
      graphNamespace,
      effectiveCodeViewId,
      codeRevisionId,
      id: node.id,
      providerNodeId: stringValue(node.providerNodeId) ?? node.sourceId,
    }),
    providerId: stringValue(node.providerId) ?? providerId,
    ...optionalString(node, 'packageName'),
    ...optionalString(node, 'packageVersion'),
    ...optionalString(node, 'file'),
    ...optionalString(node, 'qualifiedName'),
    kind: node.kind,
    ...optionalSourceRange(node.evidence),
  }));
  const codeEdges: IndexedCodeEdge[] = snapshot.code.graph.edges.flatMap((edge) => {
    const plane = codeRelationPlane(edge.plane);
    const occurrenceIds = codeEdgeOccurrenceIds(edge);
    const createEntry = (occurrenceId?: string): IndexedCodeEdge => ({
      ref: Object.freeze({
        type: 'code-edge',
        workspaceId,
        graphNamespace,
        effectiveCodeViewId,
        codeRevisionId,
        edgeId: `code-edge:${digest({
          graphNamespace,
          plane,
          kind: edge.kind,
          from: edge.from,
          to: edge.to,
          occurrenceId,
        })}`,
        plane,
        kind: edge.kind,
        from: edge.from,
        to: edge.to,
        ...(occurrenceId ? { occurrenceId } : {}),
      }),
      providerId: stringValue(edge.providerId) ?? providerId,
    });
    return [createEntry(), ...occurrenceIds.map((occurrenceId) => createEntry(occurrenceId))];
  });
  const specNodes: IndexedSpecNode[] = snapshot.spec.revision.nodes.map((node) => ({
    ref: Object.freeze({
      type: 'spec-node',
      workspaceId,
      specRevisionId: snapshot.spec.revision.revisionId,
      id: node.id,
    }),
  }));
  const extension = options.extension ?? {};
  const evidenceIndex = createAnalysisInputBindingResolverIndex(snapshot, snapshot.evidence, {
    graphNamespace,
  });

  return Object.freeze({
    codeNodes: mergeIndexEntries(codeNodes, extension.codeNodes ?? [], 'code node'),
    codeEdges: mergeIndexEntries(codeEdges, extension.codeEdges ?? [], 'code edge'),
    specNodes: mergeIndexEntries(specNodes, extension.specNodes ?? [], 'spec node'),
    testEvidence: mergeIndexEntries(
      evidenceIndex.testEvidence ?? [],
      extension.testEvidence ?? [],
      'test evidence'
    ),
    apiSurfaces: mergeIndexEntries(
      evidenceIndex.apiSurfaces ?? [],
      extension.apiSurfaces ?? [],
      'API surface'
    ),
  });
}

function participantPlans(
  declaration: SpecBindingDeclaration,
  snapshot: EffectiveAnalysisSnapshot
): readonly ParticipantPlan[] {
  const obligation: SpecNodeSelector = {
    type: 'spec-node',
    workspaceId: snapshot.spec.revision.workspaceId,
    specNodeId: declaration.specNodeId,
  };
  switch (declaration.kind) {
    case 'implementation':
      return [
        { role: 'obligation', selector: obligation },
        { role: 'implementer', selector: declaration.target },
      ];
    case 'verification':
      return [
        { role: 'obligation', selector: obligation },
        { role: 'verifier', selector: declaration.verifier },
        { role: 'subject', selector: declaration.subject },
      ];
    case 'constraint':
      return [
        { role: 'constraint', selector: obligation },
        { role: 'subject', selector: declaration.target },
      ];
    case 'governance':
      return [
        { role: 'contract', selector: obligation },
        { role: 'api', selector: declaration.target },
      ];
  }
}

function resolveParticipant(
  role: ParticipantRole,
  selector: BindingEndpointSelector,
  index: MaterializedBindingResolverIndex,
  snapshot: EffectiveAnalysisSnapshot
): ResolvedBindingParticipant {
  if (selector.workspaceId !== snapshot.spec.revision.workspaceId) {
    return Object.freeze({ role, status: 'stale', refs: Object.freeze([]) });
  }

  const matchingEntries = entriesMatchingSelector(selector, index);
  const currentRefs = uniqueRefs(
    matchingEntries.filter((entry) => isCurrentRef(entry.ref, snapshot)).map(materializeIndexedRef)
  );
  if (currentRefs.length === 1) {
    return Object.freeze({ role, status: 'resolved', refs: Object.freeze(currentRefs) });
  }
  if (currentRefs.length > 1) {
    return Object.freeze({ role, status: 'ambiguous', refs: Object.freeze(currentRefs) });
  }
  const staleRefs = uniqueRefs(matchingEntries.map(materializeIndexedRef));
  return Object.freeze({
    role,
    status: staleRefs.length > 0 ? 'stale' : 'missing',
    refs: Object.freeze(staleRefs),
  });
}

function materializeIndexedRef(entry: IndexedEntry): EndpointRef {
  if (entry.ref.type === 'test-evidence') {
    const evidence = entry as IndexedTestEvidence;
    return Object.freeze({
      ...entry.ref,
      ...(evidence.providerId ? { providerId: evidence.providerId } : {}),
      ...(evidence.file ? { file: evidence.file } : {}),
      ...(evidence.testName ? { testName: evidence.testName } : {}),
      ...(evidence.runner ? { runner: evidence.runner } : {}),
      ...(evidence.status ? { status: evidence.status } : {}),
    });
  }
  if (entry.ref.type === 'api-surface') {
    const surface = entry as IndexedApiSurface;
    return Object.freeze({
      ...entry.ref,
      ...(surface.providerId ? { providerId: surface.providerId } : {}),
      packageName: surface.packageName,
      ...(surface.packageVersion ? { packageVersion: surface.packageVersion } : {}),
      ...(surface.module ? { module: surface.module } : {}),
      ...(surface.exportName ? { exportName: surface.exportName } : {}),
    });
  }
  return entry.ref;
}

type IndexedEntry =
  | IndexedCodeNode
  | IndexedCodeEdge
  | IndexedSpecNode
  | IndexedTestEvidence
  | IndexedApiSurface;

function entriesMatchingSelector(
  selector: BindingEndpointSelector,
  index: MaterializedBindingResolverIndex
): readonly IndexedEntry[] {
  switch (selector.type) {
    case 'code-node':
      return index.codeNodes.filter((entry) => codeNodeMatches(selector, entry));
    case 'code-edge':
      return index.codeEdges.filter(
        (entry) =>
          (selector.occurrenceId !== undefined || entry.ref.occurrenceId === undefined) &&
          codeEdgeMatches(selector, entry, index.codeNodes)
      );
    case 'spec-node':
      return index.specNodes.filter(
        (entry) =>
          entry.ref.workspaceId === selector.workspaceId && entry.ref.id === selector.specNodeId
      );
    case 'test-evidence':
      return index.testEvidence.filter((entry) => testEvidenceMatches(selector, entry));
    case 'api-surface':
      return index.apiSurfaces.filter((entry) => apiSurfaceMatches(selector, entry));
  }
}

function codeNodeMatches(selector: CodeNodeSelector, entry: IndexedCodeNode): boolean {
  return (
    entry.ref.workspaceId === selector.workspaceId &&
    matchesOptional(selector.providerId, entry.providerId) &&
    matchesOptional(selector.graphNamespace, entry.ref.graphNamespace) &&
    matchesOptional(selector.canonicalNodeId, entry.ref.id) &&
    matchesOptional(selector.providerNodeId, entry.ref.providerNodeId) &&
    matchesOptional(selector.packageName, entry.packageName) &&
    matchesOptional(selector.packageVersion, entry.packageVersion) &&
    matchesOptional(selector.file, entry.file) &&
    matchesOptional(selector.qualifiedName, entry.qualifiedName) &&
    matchesOptional(selector.kind, entry.kind) &&
    matchesRange(selector.sourceAnchor, entry.sourceAnchor)
  );
}

function codeEdgeMatches(
  selector: CodeEdgeSelector,
  entry: IndexedCodeEdge,
  codeNodes: readonly IndexedCodeNode[]
): boolean {
  return (
    entry.ref.workspaceId === selector.workspaceId &&
    matchesOptional(selector.providerId, entry.providerId) &&
    matchesOptional(selector.graphNamespace, entry.ref.graphNamespace) &&
    matchesOptional(selector.plane, entry.ref.plane) &&
    matchesOptional(selector.kind, entry.ref.kind) &&
    matchesOptional(selector.occurrenceId, entry.ref.occurrenceId) &&
    edgeEndpointMatches(selector.from, entry.ref.from, entry.ref, codeNodes) &&
    edgeEndpointMatches(selector.to, entry.ref.to, entry.ref, codeNodes)
  );
}

function edgeEndpointMatches(
  selector: CodeNodeSelector,
  endpointId: string,
  edgeRef: CodeEdgeRef,
  codeNodes: readonly IndexedCodeNode[]
): boolean {
  if (selector.workspaceId !== edgeRef.workspaceId) return false;
  if (!matchesOptional(selector.graphNamespace, edgeRef.graphNamespace)) return false;
  if (!matchesOptional(selector.canonicalNodeId, endpointId)) return false;
  const needsMetadata =
    selector.providerId !== undefined ||
    selector.providerNodeId !== undefined ||
    selector.packageName !== undefined ||
    selector.packageVersion !== undefined ||
    selector.file !== undefined ||
    selector.qualifiedName !== undefined ||
    selector.kind !== undefined ||
    selector.sourceAnchor !== undefined;
  if (!needsMetadata) return true;
  return codeNodes.some(
    (entry) =>
      entry.ref.id === endpointId &&
      entry.ref.workspaceId === edgeRef.workspaceId &&
      entry.ref.graphNamespace === edgeRef.graphNamespace &&
      entry.ref.effectiveCodeViewId === edgeRef.effectiveCodeViewId &&
      entry.ref.codeRevisionId === edgeRef.codeRevisionId &&
      codeNodeMatches(selector, entry)
  );
}

function testEvidenceMatches(selector: TestEvidenceSelector, entry: IndexedTestEvidence): boolean {
  return (
    entry.ref.workspaceId === selector.workspaceId &&
    matchesOptional(selector.providerId, entry.providerId) &&
    matchesOptional(selector.evidenceId, entry.evidenceId ?? entry.ref.id) &&
    matchesOptional(selector.file, entry.file) &&
    matchesOptional(selector.testName, entry.testName) &&
    matchesOptional(selector.runner, entry.runner)
  );
}

function apiSurfaceMatches(selector: ApiSurfaceSelector, entry: IndexedApiSurface): boolean {
  return (
    entry.ref.workspaceId === selector.workspaceId &&
    matchesOptional(selector.providerId, entry.providerId) &&
    entry.packageName === selector.packageName &&
    matchesOptional(selector.packageVersion, entry.packageVersion) &&
    matchesOptional(selector.module, entry.module) &&
    matchesOptional(selector.exportName, entry.exportName)
  );
}

function isCurrentRef(ref: EndpointRef, snapshot: EffectiveAnalysisSnapshot): boolean {
  if (ref.workspaceId !== snapshot.spec.revision.workspaceId) return false;
  switch (ref.type) {
    case 'code-node':
    case 'code-edge':
    case 'api-surface':
      return (
        ref.graphNamespace === effectiveGraphNamespace(snapshot) &&
        ref.effectiveCodeViewId === snapshot.stamp.code.effectiveCodeViewId &&
        ref.codeRevisionId === snapshot.stamp.code.codeRevisionId
      );
    case 'spec-node':
      return ref.specRevisionId === snapshot.spec.revision.revisionId;
    case 'test-evidence':
      return ref.evidenceRevisionId === snapshot.evidence.revisionId;
  }
}

function aggregateStatus(statuses: readonly ResolutionStatus[]): ResolutionStatus {
  if (statuses.every((status) => status === 'resolved')) return 'resolved';
  if (statuses.includes('ambiguous')) return 'ambiguous';
  if (statuses.includes('stale')) return 'stale';
  return 'missing';
}

function createDiagnostic(
  declaration: SpecBindingDeclaration,
  resolutionId: string,
  selector: BindingEndpointSelector,
  participant: ResolvedBindingParticipant
): BindingResolutionDiagnostic {
  if (participant.status === 'resolved') {
    throw new Error('Resolved participants do not produce diagnostics');
  }
  const count = participant.refs.length;
  const code: BindingResolutionDiagnosticCode = `binding-participant-${participant.status}`;
  const detail =
    participant.status === 'ambiguous'
      ? `${count} current candidates match exactly`
      : participant.status === 'stale'
        ? count > 0
          ? `${count} matching candidates belong to older or different revisions`
          : 'the selector belongs to a different workspace'
        : 'no candidate matches exactly';
  const payload = {
    code,
    declarationId: declaration.id,
    resolutionId,
    role: participant.role,
    selectorType: selector.type,
    status: participant.status,
    candidateRefs: participant.refs,
  };
  return Object.freeze({
    diagnosticId: `binding-diagnostic:${digest(payload)}`,
    ...payload,
    message: `Binding ${declaration.id} participant ${participant.role}: ${detail}`,
    candidateRefs: participant.refs,
  });
}

function compareDiagnostics(
  left: BindingResolutionDiagnostic,
  right: BindingResolutionDiagnostic
): number {
  return (
    compareText(left.declarationId, right.declarationId) ||
    compareText(left.role, right.role) ||
    compareText(left.code, right.code) ||
    compareText(left.diagnosticId, right.diagnosticId)
  );
}

function mergeIndexEntries<T extends IndexedEntry>(
  base: readonly T[],
  extension: readonly T[],
  label: string
): readonly T[] {
  const byRef = new Map<string, T>();
  const entries = [...base, ...extension].sort((left, right) =>
    compareText(stableJson(left), stableJson(right))
  );
  for (const entry of entries) {
    const key = endpointKey(entry.ref);
    const existing = byRef.get(key);
    if (!existing) {
      byRef.set(key, entry);
      continue;
    }
    byRef.set(key, mergeCompatible(existing, entry, `${label} ${key}`));
  }
  return Object.freeze([...byRef.values()].sort(compareIndexedEntries));
}

function mergeCompatible<T extends IndexedEntry>(left: T, right: T, label: string): T {
  const merged: Record<string, unknown> = { ...left };
  for (const [key, value] of Object.entries(right)) {
    const previous = merged[key];
    if (
      previous !== undefined &&
      value !== undefined &&
      stableJson(previous) !== stableJson(value)
    ) {
      throw new Error(`Conflicting binding index metadata for ${label}: ${key}`);
    }
    if (previous === undefined) merged[key] = value;
  }
  return Object.freeze(merged) as T;
}

function compareIndexedEntries(left: IndexedEntry, right: IndexedEntry): number {
  return compareText(endpointKey(left.ref), endpointKey(right.ref));
}

function uniqueRefs(refs: readonly EndpointRef[]): EndpointRef[] {
  const byKey = new Map<string, EndpointRef>();
  for (const ref of refs) byKey.set(endpointKey(ref), ref);
  return [...byKey.values()].sort((left, right) =>
    compareText(endpointKey(left), endpointKey(right))
  );
}

function endpointKey(ref: EndpointRef): string {
  return `${ref.type}:${stableJson(ref)}`;
}

function matchesOptional<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || expected === actual;
}

function matchesRange(expected: SourceRange | undefined, actual: SourceRange | undefined): boolean {
  if (expected === undefined) return true;
  return actual !== undefined && stableJson(expected) === stableJson(actual);
}

function optionalString(
  source: Readonly<Record<string, unknown>>,
  key: string
): Readonly<Record<string, string>> {
  const value = stringValue(source[key]);
  return value ? { [key]: value } : {};
}

function optionalSourceRange(evidence: Readonly<Record<string, unknown>> | undefined): {
  readonly sourceAnchor?: SourceRange;
} {
  if (!evidence || typeof evidence.startLine !== 'number') return {};
  return {
    sourceAnchor: Object.freeze({
      startLine: evidence.startLine,
      ...(typeof evidence.startCol === 'number' ? { startColumn: evidence.startCol } : {}),
      ...(typeof evidence.endLine === 'number' ? { endLine: evidence.endLine } : {}),
      ...(typeof evidence.endCol === 'number' ? { endColumn: evidence.endCol } : {}),
    }),
  };
}

function codeRelationPlane(value: unknown): CodeEdgeRef['plane'] {
  return value === 'producer-derived' || value === 'router-derived' ? value : 'compiler-fact';
}

function codeEdgeOccurrenceIds(edge: Readonly<Record<string, unknown>>): readonly string[] {
  const ids = new Set<string>();
  const direct = stringValue(edge.occurrenceId);
  if (direct) ids.add(direct);
  if (Array.isArray(edge.occurrenceIds)) {
    for (const value of edge.occurrenceIds) {
      const id = stringValue(value);
      if (id) ids.add(id);
    }
  }
  if (Array.isArray(edge.providerOccurrences)) {
    for (const value of edge.providerOccurrences) {
      if (!value || typeof value !== 'object') continue;
      const id = stringValue((value as Record<string, unknown>).occurrenceId);
      if (id) ids.add(id);
    }
  }
  return Object.freeze([...ids].sort(compareText));
}

function effectiveGraphNamespace(snapshot: EffectiveAnalysisSnapshot): string {
  return (
    stringValue(snapshot.code.graph.provenance.graphNamespace) ??
    snapshot.provider.graphNamespace ??
    snapshot.provider.contractId
  );
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function normalizedOptional(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function requireNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} must be a non-empty string`);
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
