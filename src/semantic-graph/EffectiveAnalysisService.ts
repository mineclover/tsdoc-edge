/** Cross-plane assembly and binding-resolution orchestration. */

import { createHash } from 'node:crypto';
import {
  graphEdgeSemantic,
  RELATION_SEMANTIC_REGISTRY_VERSION,
} from '../graph-analysis/edge-semantics';
import { parseCanonicalId } from '../indexer/canonical-id';
import type { CanonicalProjectGraph, ProjectGraphProvenance } from '../indexer/contracts';
import { canonicalProjectGraphFingerprint } from '../indexer/ProjectIndexer';
import type {
  BindingEndpointSelector,
  EndpointRef,
  ResolvedSpecBinding,
  SpecBindingDeclaration,
} from '../spec-graph/contracts';
import {
  bindingDeclarationDigest,
  bindingResolutionId,
  createPolicyRevision,
  createSpecGraphRevision,
} from '../spec-graph/identity';
import { createEnrichmentRevision, createEvidenceRevision } from './analysis-input-revisions';
import type {
  BindingResolutionSet,
  CodeAnalysisView,
  CodeViewStamp,
  EffectiveAnalysisInputStamp,
  EffectiveAnalysisInputs,
  EffectiveAnalysisSnapshot,
  EffectiveBindingResolver,
  ProviderAnalysisIdentity,
  RuleSetRevision,
} from './contracts';

const validatedBindingResolutionSets = new WeakSet<object>();
const validatedEffectiveAnalysisSnapshots = new WeakSet<object>();

/**
 * Fail closed unless a set was validated against a concrete effective snapshot
 * by {@link EffectiveAnalysisService.resolveBindings} in this process.
 *
 * Binding resolution sets are transient derived values and are intentionally
 * not deserialized as trusted conformance inputs.
 */
export function assertValidatedBindingResolutionSet(set: BindingResolutionSet): void {
  if (!validatedBindingResolutionSets.has(set)) {
    throw new Error(
      'Binding resolution set was not validated by EffectiveAnalysisService.resolveBindings'
    );
  }
}

/**
 * Creates one immutable effective snapshot before any cross-plane resolution.
 *
 * Callers may build the code overlay in their own adapter, but binding,
 * conformance, coverage, and impact must all consume the snapshot produced here.
 */
export class EffectiveAnalysisService {
  /** Build a code-only stamp for topology and fact queries. */
  createCodeViewStamp(options: {
    readonly code: CodeAnalysisView;
    readonly provider: ProviderAnalysisIdentity;
    readonly relationSemanticRegistryVersion?: string;
  }): CodeViewStamp {
    const graph = options.code.graph;
    const providerIdentityDigest = digest({
      contractId: options.provider.contractId,
      contractVersion: options.provider.contractVersion,
      providerId: options.provider.providerId ?? null,
      providerVersion: options.provider.providerVersion ?? null,
      providerInstanceId: options.provider.providerInstanceId ?? null,
      producer: options.provider.producer ?? null,
      producerVersion: options.provider.producerVersion ?? null,
      compilerVersion: options.provider.compilerVersion ?? null,
      compilerVersionReported: options.provider.compilerVersionReported ?? false,
      workspaceId: options.provider.workspaceId ?? null,
      graphNamespace: options.provider.graphNamespace ?? null,
      providerConfigDigest: options.provider.providerConfigDigest ?? null,
    });
    const capabilityDigest = digest(options.provider.capabilities);
    const observedKindsDigest = digest({
      nodeKinds: normalizedStrings(options.provider.observedNodeKinds),
      edgeKinds: normalizedStrings(options.provider.observedEdgeKinds),
    });
    const codeRevisionId =
      options.code.viewKind === 'persisted-code-revision'
        ? options.code.revisionId
        : options.code.baseRevisionId;

    const codeOverlayDigest =
      options.code.viewKind === 'effective-code-graph' ? digest(options.code.deltaIds) : digest([]);
    const effectiveCodeViewId =
      options.code.viewKind === 'effective-code-graph'
        ? options.code.effectiveViewId
        : options.code.revisionId;
    return Object.freeze({
      codeRevisionId,
      codeGraphFingerprint: graph.fingerprint,
      providerIdentityDigest,
      capabilityDigest,
      observedKindsDigest,
      relationSemanticRegistryVersion:
        options.relationSemanticRegistryVersion ?? RELATION_SEMANTIC_REGISTRY_VERSION,
      producerDerivedDigest: digest(options.provider.producerDerivedRevisionId ?? null),
      routerDerivedDigest: digest(options.provider.routerDerivedRevisionId ?? null),
      codeOverlayDigest,
      effectiveCodeViewId,
    });
  }

  /** Assemble all revisioned inputs into the single cross-plane analysis boundary. */
  createSnapshot(input: EffectiveAnalysisInputs): EffectiveAnalysisSnapshot {
    input = immutableJson(input);
    requireNonEmpty(input.spec.revision.revisionId, 'spec.revisionId');
    requireNonEmpty(input.policy.revisionId, 'policy.revisionId');
    requireNonEmpty(input.evidence.revisionId, 'evidence.revisionId');
    requireNonEmpty(input.enrichment.revisionId, 'enrichment.revisionId');
    requireNonEmpty(input.ruleSet.revisionId, 'ruleSet.revisionId');
    requireNonEmpty(input.relationSemanticRegistryVersion, 'relationSemanticRegistryVersion');
    validateAnalysisInputRevisions(input);
    validateContentAddressedAnalysisInputs(input);
    validateWorkspaceAndNamespaceBoundary(input);

    const codeStamp = this.createCodeViewStamp({
      code: input.code,
      provider: input.provider,
      relationSemanticRegistryVersion: input.relationSemanticRegistryVersion,
    });
    const stampPayload = {
      code: codeStamp,
      specRevisionId: input.spec.revision.revisionId,
      specOverlayDigest: digest(input.spec.effectiveViewId ?? null),
      policyRevisionId: input.policy.revisionId,
      policyDigest: input.policy.contentDigest,
      evidenceRevisionId: input.evidence.revisionId,
      evidenceDigest: input.evidence.contentFingerprint,
      enrichmentRevisionId: input.enrichment.revisionId,
      enrichmentDigest: input.enrichment.contentFingerprint,
      ruleSetRevisionId: input.ruleSet.revisionId,
      ruleSetDigest: input.ruleSet.contentFingerprint,
      derivedModelDigest: digest({
        relationSemanticRegistryVersion: input.relationSemanticRegistryVersion,
        analyzerVersions: input.ruleSet.analyzerVersions,
      }),
      ...(input.legacyBaselineId ? { legacyBaselineId: input.legacyBaselineId } : {}),
      ...(input.comparatorVersion ? { comparatorVersion: input.comparatorVersion } : {}),
    };
    const snapshotId = `effective-analysis:${digest(stampPayload)}`;
    const stamp: EffectiveAnalysisInputStamp = Object.freeze({
      ...stampPayload,
      effectiveViewId: snapshotId,
    });

    const snapshot = Object.freeze({
      snapshotId,
      stamp,
      code: input.code,
      spec: input.spec,
      policy: input.policy,
      evidence: input.evidence,
      enrichment: input.enrichment,
      ruleSet: input.ruleSet,
      provider: input.provider,
    });
    validatedEffectiveAnalysisSnapshots.add(snapshot);
    return snapshot;
  }

  /** Resolve authored bindings only after the effective snapshot is complete. */
  resolveBindings(
    snapshot: EffectiveAnalysisSnapshot,
    resolver: EffectiveBindingResolver
  ): BindingResolutionSet {
    if (!validatedEffectiveAnalysisSnapshots.has(snapshot)) {
      throw new Error('Effective analysis snapshot was not created by this analysis boundary');
    }
    const resolutions = [...resolver.resolve(snapshot)].sort((left, right) =>
      compareText(left.resolutionId, right.resolutionId)
    );
    const declarations = new Map(
      snapshot.spec.revision.bindings.map((declaration) => [declaration.id, declaration])
    );
    const resolvedDeclarations = new Set<string>();
    for (const resolution of resolutions) {
      const declaration = declarations.get(resolution.declarationId);
      if (!declaration) {
        throw new Error(
          `Binding resolution ${resolution.resolutionId} references unknown declaration ${resolution.declarationId}`
        );
      }
      if (resolvedDeclarations.has(resolution.declarationId)) {
        throw new Error(`Duplicate binding resolution for declaration ${resolution.declarationId}`);
      }
      resolvedDeclarations.add(resolution.declarationId);
      const declarationDigest = bindingDeclarationDigest(declaration);
      if (resolution.declarationDigest !== declarationDigest) {
        throw new Error(
          `Binding resolution ${resolution.resolutionId} has a stale declaration digest`
        );
      }
      if (resolution.specRevisionId !== snapshot.stamp.specRevisionId) {
        throw new Error(
          `Binding resolution ${resolution.resolutionId} uses spec revision ${resolution.specRevisionId}, expected ${snapshot.stamp.specRevisionId}`
        );
      }
      if (resolution.effectiveViewId !== snapshot.snapshotId) {
        throw new Error(
          `Binding resolution ${resolution.resolutionId} uses effective view ${resolution.effectiveViewId}, expected ${snapshot.snapshotId}`
        );
      }
      if (resolution.codeRevisionId !== snapshot.stamp.code.codeRevisionId) {
        throw new Error(
          `Binding resolution ${resolution.resolutionId} uses code revision ${String(resolution.codeRevisionId ?? '<missing>')}, expected ${snapshot.stamp.code.codeRevisionId}`
        );
      }
      const expectedEvidenceRevisionId =
        declaration.kind === 'verification' ? snapshot.evidence.revisionId : undefined;
      if (resolution.evidenceRevisionId !== expectedEvidenceRevisionId) {
        throw new Error(
          `Binding resolution ${resolution.resolutionId} uses evidence revision ${String(resolution.evidenceRevisionId ?? '<none>')}, expected ${String(expectedEvidenceRevisionId ?? '<none>')}`
        );
      }
      if (stableJson(resolution.resolver) !== stableJson(resolver.identity)) {
        throw new Error(
          `Binding resolution ${resolution.resolutionId} uses a different resolver identity`
        );
      }
      validateResolutionParticipants(snapshot, declaration, resolution);
      const expectedResolutionId = bindingResolutionId({
        declarationId: resolution.declarationId,
        declarationDigest: resolution.declarationDigest,
        specRevisionId: resolution.specRevisionId,
        effectiveViewId: resolution.effectiveViewId,
        codeRevisionId: resolution.codeRevisionId,
        evidenceRevisionId: resolution.evidenceRevisionId,
        resolver: resolution.resolver,
        status: resolution.status,
        participants: resolution.participants,
      });
      if (resolution.resolutionId !== expectedResolutionId) {
        throw new Error(
          `Binding resolution identity mismatch: expected ${expectedResolutionId}, received ${resolution.resolutionId}`
        );
      }
    }
    if (resolvedDeclarations.size !== declarations.size) {
      const missing = [...declarations.keys()]
        .filter((declarationId) => !resolvedDeclarations.has(declarationId))
        .sort(compareText);
      throw new Error(`Binding resolver omitted declaration(s): ${missing.join(', ')}`);
    }

    const resolutionSetId = `binding-resolution-set:${digest({
      snapshotId: snapshot.snapshotId,
      resolver: resolver.identity,
      resolutionIds: resolutions.map((resolution) => resolution.resolutionId),
    })}`;
    const set = immutableJson({
      resolutionSetId,
      snapshotId: snapshot.snapshotId,
      inputStamp: snapshot.stamp,
      stamp: Object.freeze({
        ...snapshot.stamp,
        bindingResolutionSetId: resolutionSetId,
      }),
      resolver: resolver.identity,
      resolutions,
    });
    validatedBindingResolutionSets.add(set);
    return set;
  }
}

/** Create a deterministic analyzer/rule implementation revision. */
export function createRuleSetRevision(input: {
  readonly analyzerVersions: Readonly<Record<string, string>>;
}): RuleSetRevision {
  const analyzerVersions: Record<string, string> = {};
  for (const [id, version] of Object.entries(input.analyzerVersions).sort(([left], [right]) =>
    compareText(left, right)
  )) {
    requireNonEmpty(id, 'ruleSet analyzer id');
    requireNonEmpty(version, `ruleSet analyzer ${id} version`);
    analyzerVersions[id] = version;
  }
  const normalized = immutableJson({ analyzerVersions });
  const contentFingerprint = digest(normalized);
  return immutableJson({
    revisionId: `rule-set-revision:${contentFingerprint}`,
    contentFingerprint,
    analyzerVersions: normalized.analyzerVersions,
  });
}

interface ExpectedBindingParticipant {
  readonly role: ResolvedSpecBinding['participants'][number]['role'];
  readonly selector: BindingEndpointSelector;
}

function validateResolutionParticipants(
  snapshot: EffectiveAnalysisSnapshot,
  declaration: SpecBindingDeclaration,
  resolution: ResolvedSpecBinding
): void {
  const expected = expectedParticipants(snapshot, declaration);
  const expectedRoles = expected.map((plan) => plan.role);
  const actualRoles = resolution.participants.map((participant) => participant.role);
  if (JSON.stringify(actualRoles) !== JSON.stringify(expectedRoles)) {
    throw new Error(
      `Binding resolution ${resolution.resolutionId} participant roles are not in canonical declaration order`
    );
  }
  const byRole = new Map<string, ResolvedSpecBinding['participants'][number]>();
  for (const participant of resolution.participants) {
    if (byRole.has(participant.role)) {
      throw new Error(
        `Binding resolution ${resolution.resolutionId} repeats participant role ${participant.role}`
      );
    }
    byRole.set(participant.role, participant);
  }
  if (byRole.size !== expected.length) {
    throw new Error(
      `Binding resolution ${resolution.resolutionId} participant shape does not match declaration ${declaration.id}`
    );
  }
  for (const plan of expected) {
    const participant = byRole.get(plan.role);
    if (!participant) {
      throw new Error(
        `Binding resolution ${resolution.resolutionId} omits participant role ${plan.role}`
      );
    }
    const count = participant.refs.length;
    if (participant.status === 'resolved' && count !== 1) {
      throw new Error(`Resolved participant ${plan.role} must contain exactly one endpoint`);
    }
    if (participant.status === 'ambiguous' && count < 2) {
      throw new Error(`Ambiguous participant ${plan.role} must retain every candidate`);
    }
    if (participant.status === 'missing' && count !== 0) {
      throw new Error(`Missing participant ${plan.role} cannot retain endpoints`);
    }
    const canonicalRefs = [...participant.refs].sort((left, right) =>
      compareText(stableJson(left), stableJson(right))
    );
    if (stableJson(participant.refs) !== stableJson(canonicalRefs)) {
      throw new Error(`Binding participant ${plan.role} endpoint refs are not canonically ordered`);
    }
    for (const ref of participant.refs) {
      const current = endpointRefIsCurrent(ref, snapshot);
      if (participant.status === 'stale') {
        if (current) throw new Error(`Stale participant ${plan.role} contains a current endpoint`);
        continue;
      }
      if (!current) {
        throw new Error(`Binding participant ${plan.role} references a stale or foreign endpoint`);
      }
      if (!currentEndpointMatchesSelector(ref, plan.selector, snapshot)) {
        throw new Error(
          `Binding participant ${plan.role} endpoint does not match its authored selector`
        );
      }
    }
  }
  const statuses = resolution.participants.map((participant) => participant.status);
  const aggregate = statuses.every((status) => status === 'resolved')
    ? 'resolved'
    : statuses.includes('ambiguous')
      ? 'ambiguous'
      : statuses.includes('stale')
        ? 'stale'
        : 'missing';
  if (resolution.status !== aggregate) {
    throw new Error(
      `Binding resolution ${resolution.resolutionId} status does not match participant statuses`
    );
  }
  if (
    !Number.isFinite(resolution.confidence) ||
    resolution.confidence < 0 ||
    resolution.confidence > 1
  ) {
    throw new Error(
      `Binding resolution ${resolution.resolutionId} confidence must be between 0 and 1`
    );
  }
}

function expectedParticipants(
  snapshot: EffectiveAnalysisSnapshot,
  declaration: SpecBindingDeclaration
): readonly ExpectedBindingParticipant[] {
  const obligation = {
    type: 'spec-node' as const,
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

function endpointRefIsCurrent(ref: EndpointRef, snapshot: EffectiveAnalysisSnapshot): boolean {
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

function currentEndpointMatchesSelector(
  ref: EndpointRef,
  selector: BindingEndpointSelector,
  snapshot: EffectiveAnalysisSnapshot
): boolean {
  if (ref.type !== selector.type || ref.workspaceId !== selector.workspaceId) return false;
  switch (selector.type) {
    case 'code-node': {
      if (ref.type !== 'code-node') return false;
      if (ref.graphNamespace !== effectiveGraphNamespace(snapshot)) return false;
      if (selector.graphNamespace && selector.graphNamespace !== ref.graphNamespace) return false;
      if (selector.canonicalNodeId && selector.canonicalNodeId !== ref.id) return false;
      const node = snapshot.code.graph.nodes.find((candidate) => candidate.id === ref.id);
      if (!node) return false;
      const providerNodeId = stringValue(node.providerNodeId) ?? node.sourceId;
      if (ref.providerNodeId !== providerNodeId) return false;
      if (selector.providerNodeId && selector.providerNodeId !== providerNodeId) return false;
      return (
        matchesOptionalText(
          selector.providerId,
          stringValue(node.providerId) ??
            stringValue(snapshot.code.graph.provenance.providerId) ??
            snapshot.provider.providerId ??
            stringValue(snapshot.code.graph.provenance.producer)
        ) &&
        matchesOptionalText(selector.packageName, stringValue(node.packageName)) &&
        matchesOptionalText(selector.packageVersion, stringValue(node.packageVersion)) &&
        matchesOptionalText(selector.file, stringValue(node.file)) &&
        matchesOptionalText(selector.qualifiedName, stringValue(node.qualifiedName)) &&
        matchesOptionalText(selector.kind, node.kind) &&
        matchesSourceRange(selector.sourceAnchor, node.evidence)
      );
    }
    case 'code-edge': {
      if (ref.type !== 'code-edge') return false;
      if (ref.graphNamespace !== effectiveGraphNamespace(snapshot)) return false;
      if (selector.graphNamespace && selector.graphNamespace !== ref.graphNamespace) return false;
      if (selector.plane && selector.plane !== ref.plane) return false;
      if (selector.kind && selector.kind !== ref.kind) return false;
      if (selector.occurrenceId && selector.occurrenceId !== ref.occurrenceId) return false;
      const edge = snapshot.code.graph.edges.find(
        (candidate) =>
          candidate.kind === ref.kind &&
          candidate.from === ref.from &&
          candidate.to === ref.to &&
          codeRelationPlane(candidate.plane) === ref.plane &&
          (ref.occurrenceId === undefined ||
            codeEdgeOccurrenceIds(candidate).includes(ref.occurrenceId))
      );
      const expectedEdgeId = `code-edge:${digest({
        graphNamespace: ref.graphNamespace,
        plane: ref.plane,
        kind: ref.kind,
        from: ref.from,
        to: ref.to,
        occurrenceId: ref.occurrenceId,
      })}`;
      return (
        edge !== undefined &&
        ref.edgeId === expectedEdgeId &&
        matchesOptionalText(
          selector.providerId,
          stringValue(edge.providerId) ??
            stringValue(snapshot.code.graph.provenance.providerId) ??
            snapshot.provider.providerId ??
            stringValue(snapshot.code.graph.provenance.producer)
        ) &&
        codeEndpointSelectorMatchesId(selector.from, ref.from, snapshot) &&
        codeEndpointSelectorMatchesId(selector.to, ref.to, snapshot)
      );
    }
    case 'spec-node':
      return (
        ref.type === 'spec-node' &&
        ref.id === selector.specNodeId &&
        snapshot.spec.revision.nodes.some((node) => node.id === ref.id)
      );
    case 'test-evidence':
      if (ref.type !== 'test-evidence') return false;
      return testEvidenceRefMatches(ref, selector, snapshot);
    case 'api-surface':
      if (ref.type !== 'api-surface') return false;
      return apiSurfaceRefMatches(ref, selector, snapshot);
  }
}

function codeEndpointSelectorMatchesId(
  selector: Extract<BindingEndpointSelector, { type: 'code-node' }>,
  id: string,
  snapshot: EffectiveAnalysisSnapshot
): boolean {
  const ref: EndpointRef = {
    type: 'code-node',
    workspaceId: selector.workspaceId,
    graphNamespace:
      selector.graphNamespace ??
      snapshot.provider.graphNamespace ??
      stringField(snapshot.code.graph.provenance, 'graphNamespace', snapshot.provider.contractId),
    effectiveCodeViewId: snapshot.stamp.code.effectiveCodeViewId,
    codeRevisionId: snapshot.stamp.code.codeRevisionId,
    id,
    providerNodeId: (() => {
      const node = snapshot.code.graph.nodes.find((candidate) => candidate.id === id);
      return node ? (stringValue(node.providerNodeId) ?? node.sourceId) : undefined;
    })(),
  };
  return currentEndpointMatchesSelector(ref, selector, snapshot);
}

function testEvidenceRefMatches(
  ref: Extract<EndpointRef, { type: 'test-evidence' }>,
  selector: Extract<BindingEndpointSelector, { type: 'test-evidence' }>,
  snapshot: EffectiveAnalysisSnapshot
): boolean {
  const item = snapshot.evidence.items.find(
    (candidate) => candidate.kind === 'test-evidence' && candidate.id === ref.id
  );
  if (!item || item.kind !== 'test-evidence') return false;
  return (
    ref.evidenceRevisionId === snapshot.evidence.revisionId &&
    ref.providerId === item.provenance.producerId &&
    ref.file === item.source.file &&
    ref.testName === item.testName &&
    ref.runner === item.runner &&
    matchesOptionalText(selector.providerId, ref.providerId) &&
    matchesOptionalText(selector.evidenceId, ref.id) &&
    matchesOptionalText(selector.file, ref.file) &&
    matchesOptionalText(selector.testName, ref.testName) &&
    matchesOptionalText(selector.runner, ref.runner)
  );
}

function apiSurfaceRefMatches(
  ref: Extract<EndpointRef, { type: 'api-surface' }>,
  selector: Extract<BindingEndpointSelector, { type: 'api-surface' }>,
  snapshot: EffectiveAnalysisSnapshot
): boolean {
  const item = snapshot.evidence.items.find(
    (candidate) => candidate.kind === 'api-surface' && candidate.id === ref.surfaceId
  );
  if (!item || item.kind !== 'api-surface') return false;
  return (
    ref.graphNamespace === effectiveGraphNamespace(snapshot) &&
    ref.providerId === item.provenance.producerId &&
    ref.packageName === item.packageName &&
    ref.packageVersion === item.packageVersion &&
    ref.module === item.module &&
    ref.exportName === item.exportName &&
    matchesOptionalText(selector.providerId, ref.providerId) &&
    selector.packageName === ref.packageName &&
    matchesOptionalText(selector.packageVersion, ref.packageVersion) &&
    matchesOptionalText(selector.module, ref.module) &&
    matchesOptionalText(selector.exportName, ref.exportName)
  );
}

function codeRelationPlane(value: unknown): Extract<EndpointRef, { type: 'code-edge' }>['plane'] {
  return value === 'producer-derived' || value === 'router-derived' ? value : 'compiler-fact';
}

function codeEdgeOccurrenceIds(edge: Readonly<Record<string, unknown>>): readonly string[] {
  const ids = new Set<string>();
  const add = (value: unknown): void => {
    const id = stringValue(value);
    if (id) ids.add(id);
  };
  add(edge.occurrenceId);
  if (Array.isArray(edge.occurrenceIds)) edge.occurrenceIds.forEach(add);
  if (Array.isArray(edge.providerOccurrences)) {
    for (const value of edge.providerOccurrences) {
      if (value && typeof value === 'object') {
        add((value as Record<string, unknown>).occurrenceId);
      }
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

function matchesOptionalText(expected: string | undefined, actual: string | undefined): boolean {
  return expected === undefined || expected === actual;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function matchesSourceRange(
  expected: Extract<BindingEndpointSelector, { type: 'code-node' }>['sourceAnchor'],
  evidence: Readonly<Record<string, unknown>> | undefined
): boolean {
  if (!expected) return true;
  return (
    evidence !== undefined &&
    expected.startLine === evidence.startLine &&
    (expected.startColumn === undefined || expected.startColumn === evidence.startCol) &&
    (expected.endLine === undefined || expected.endLine === evidence.endLine) &&
    (expected.endColumn === undefined || expected.endColumn === evidence.endCol)
  );
}

function validateAnalysisInputRevisions(input: EffectiveAnalysisInputs): void {
  const evidence = createEvidenceRevision({
    workspaceId: input.evidence.workspaceId,
    items: input.evidence.items,
    provenance: input.evidence.provenance,
  });
  if (
    input.evidence.contractVersion !== evidence.contractVersion ||
    input.evidence.plane !== evidence.plane ||
    input.evidence.revisionId !== evidence.revisionId ||
    input.evidence.contentFingerprint !== evidence.contentFingerprint
  ) {
    throw new Error('Evidence revision identity does not match its canonical content');
  }
  const enrichment = createEnrichmentRevision({
    workspaceId: input.enrichment.workspaceId,
    items: input.enrichment.items,
    provenance: input.enrichment.provenance,
  });
  if (
    input.enrichment.contractVersion !== enrichment.contractVersion ||
    input.enrichment.plane !== enrichment.plane ||
    input.enrichment.revisionId !== enrichment.revisionId ||
    input.enrichment.contentFingerprint !== enrichment.contentFingerprint
  ) {
    throw new Error('Enrichment revision identity does not match its canonical content');
  }
}

function validateContentAddressedAnalysisInputs(input: EffectiveAnalysisInputs): void {
  validateCanonicalAnalysisGraph(input.code.graph);
  const contentFingerprint = canonicalProjectGraphFingerprint(
    input.code.graph.nodes,
    input.code.graph.edges
  );
  const graphFingerprint =
    input.code.viewKind === 'effective-code-graph'
      ? `effective:${contentFingerprint}`
      : contentFingerprint;
  if (input.code.graph.fingerprint !== graphFingerprint) {
    throw new Error(
      `Code graph fingerprint mismatch: expected ${graphFingerprint}, received ${input.code.graph.fingerprint}`
    );
  }

  const spec = createSpecGraphRevision({
    workspaceId: input.spec.revision.workspaceId,
    nodes: input.spec.revision.nodes,
    edges: input.spec.revision.edges,
    bindings: input.spec.revision.bindings,
    provenance: input.spec.revision.provenance,
  });
  if (stableJson(input.spec.revision) !== stableJson(spec)) {
    throw new Error('Spec revision identity does not match its canonical content');
  }

  const policy = createPolicyRevision({
    relationSemanticRegistryVersion: input.policy.relationSemanticRegistryVersion,
    lifecycleGateVersion: input.policy.lifecycleGateVersion,
    rules: input.policy.rules,
    suppressions: input.policy.suppressions,
    provenance: input.policy.provenance,
  });
  if (stableJson(input.policy) !== stableJson(policy)) {
    throw new Error('Policy revision identity does not match its canonical content');
  }

  const ruleSet = createRuleSetRevision({ analyzerVersions: input.ruleSet.analyzerVersions });
  if (stableJson(input.ruleSet) !== stableJson(ruleSet)) {
    throw new Error('Rule-set revision identity does not match its canonical content');
  }
}

function validateCanonicalAnalysisGraph(graph: CanonicalProjectGraph): void {
  if (graph.contractVersion !== '1.0') {
    throw new Error(`Unsupported canonical code graph contract: ${graph.contractVersion}`);
  }
  requireNonEmpty(graph.rootDir, 'code graph rootDir');
  requireNonEmpty(graph.tsconfigPath, 'code graph tsconfigPath');
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    const parsed = parseCanonicalId(node.id);
    if (!parsed || parsed.kind !== node.kind) {
      throw new Error(`Code graph node has an invalid canonical identity: ${node.id}`);
    }
    if (node.sourceId !== node.id) {
      throw new Error(`Code graph node sourceId does not match its canonical id: ${node.id}`);
    }
    if (nodeIds.has(node.id)) throw new Error(`Duplicate code graph node id: ${node.id}`);
    nodeIds.add(node.id);
  }
  const canonicalNodeOrder = graph.nodes.map((node) => node.id).sort(compareText);
  if (stableJson(graph.nodes.map((node) => node.id)) !== stableJson(canonicalNodeOrder)) {
    throw new Error('Code graph nodes are not in canonical order');
  }

  const edgeKeys = new Set<string>();
  for (const edge of graph.edges) {
    requireNonEmpty(edge.kind, 'code graph edge kind');
    requireNonEmpty(edge.from, 'code graph edge from');
    requireNonEmpty(edge.to, 'code graph edge to');
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new Error(
        `Code graph edge has an unknown endpoint: ${edge.kind} ${edge.from} -> ${edge.to}`
      );
    }
    const key = `${edge.kind}\u0000${edge.from}\u0000${edge.to}`;
    if (edgeKeys.has(key)) {
      throw new Error(`Duplicate code graph edge: ${edge.kind} ${edge.from} -> ${edge.to}`);
    }
    edgeKeys.add(key);
  }
  const canonicalEdgeOrder = [...graph.edges].sort(
    (left, right) =>
      compareText(left.kind, right.kind) ||
      compareText(left.from, right.from) ||
      compareText(left.to, right.to)
  );
  if (stableJson(graph.edges) !== stableJson(canonicalEdgeOrder)) {
    throw new Error('Code graph edges are not in canonical order');
  }
}

function validateWorkspaceAndNamespaceBoundary(input: EffectiveAnalysisInputs): void {
  const workspaceId = input.spec.revision.workspaceId;
  for (const [label, value] of [
    ['provider', input.provider.workspaceId],
    ['code graph provenance', stringValue(input.code.graph.provenance.workspaceId)],
    ['evidence', input.evidence.workspaceId],
    ['enrichment', input.enrichment.workspaceId],
  ] as const) {
    if (value !== undefined && value !== workspaceId) {
      throw new Error(`${label} workspace mismatch: expected ${workspaceId}, received ${value}`);
    }
  }
  const providerNamespace = input.provider.graphNamespace;
  const graphNamespace = stringValue(input.code.graph.provenance.graphNamespace);
  if (providerNamespace && graphNamespace && providerNamespace !== graphNamespace) {
    throw new Error(
      `Graph namespace mismatch: provider uses ${providerNamespace}, code graph uses ${graphNamespace}`
    );
  }
  if (input.policy.relationSemanticRegistryVersion !== input.relationSemanticRegistryVersion) {
    throw new Error(
      `Relation semantic registry mismatch: policy uses ${input.policy.relationSemanticRegistryVersion}, analysis uses ${input.relationSemanticRegistryVersion}`
    );
  }
}

/** Verify that a provider's observed kinds are inert or registry-classified. */
export function observedEdgeSemanticDigest(kinds: readonly string[]): string {
  return digest(
    normalizedStrings(kinds).map((kind) => ({ kind, semantic: graphEdgeSemantic(kind) }))
  );
}

/** Derive the provider identity currently available on a canonical graph envelope. */
export function providerAnalysisIdentityFromGraph(
  graph: CanonicalProjectGraph
): ProviderAnalysisIdentity {
  const provenance = graph.provenance;
  return Object.freeze({
    contractId: stringField(provenance, 'artifactContractId', 'tsdoc-edge/project-graph-source'),
    contractVersion: stringField(provenance, 'artifactContractVersion', graph.contractVersion),
    providerId: stringField(
      provenance,
      'providerId',
      stringField(provenance, 'adapter', 'legacy-project-graph-source')
    ),
    providerVersion: stringField(
      provenance,
      'providerVersion',
      stringField(provenance, 'producerVersion', 'unreported')
    ),
    providerInstanceId: stringField(
      provenance,
      'providerInstanceId',
      `legacy:${stringField(provenance, 'adapter', 'project-graph-source')}`
    ),
    producer: provenance.producer,
    ...optionalStringField(provenance, 'producerVersion'),
    compilerVersion: nullableStringField(provenance, 'compilerVersion'),
    compilerVersionReported: booleanField(
      provenance,
      'compilerVersionReported',
      nullableStringField(provenance, 'compilerVersion') !== null
    ),
    ...optionalStringField(provenance, 'workspaceId'),
    ...optionalStringField(provenance, 'graphNamespace'),
    ...optionalStringField(provenance, 'providerConfigDigest'),
    capabilities: recordField(provenance, 'artifactCapabilities'),
    observedNodeKinds: normalizedStrings(graph.nodes.map((node) => node.kind)),
    observedEdgeKinds: normalizedStrings(graph.edges.map((edge) => edge.kind)),
    ...optionalRevision(provenance, 'producerDerivedRevisionId'),
    ...optionalRevision(provenance, 'routerDerivedRevisionId'),
  });
}

function optionalStringField(
  provenance: ProjectGraphProvenance,
  key: string
): Readonly<Record<string, string>> {
  const value = provenance[key];
  return typeof value === 'string' && value.trim() ? { [key]: value } : {};
}

function nullableStringField(provenance: ProjectGraphProvenance, key: string): string | null {
  const value = provenance[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function booleanField(provenance: ProjectGraphProvenance, key: string, fallback: boolean): boolean {
  const value = provenance[key];
  return typeof value === 'boolean' ? value : fallback;
}

function normalizedStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareText));
}

function stringField(provenance: ProjectGraphProvenance, key: string, fallback: string): string {
  const value = provenance[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function recordField(
  provenance: ProjectGraphProvenance,
  key: string
): Readonly<Record<string, unknown>> {
  const value = provenance[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.freeze({ ...(value as Record<string, unknown>) })
    : Object.freeze({});
}

function optionalRevision(
  provenance: ProjectGraphProvenance,
  key: 'producerDerivedRevisionId' | 'routerDerivedRevisionId'
): Partial<Pick<ProviderAnalysisIdentity, typeof key>> {
  const value = provenance[key];
  return typeof value === 'string' && value.trim() ? { [key]: value } : {};
}

function requireNonEmpty(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} must be a non-empty string`);
}

function digest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
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

function immutableJson<T>(value: T): T {
  return deepFreeze(JSON.parse(JSON.stringify(strictCanonicalize(value))) as T);
}

function strictCanonicalize(value: unknown, seen = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new Error('Effective analysis inputs require finite numbers');
    return value;
  }
  if (typeof value !== 'object') {
    throw new Error(`Effective analysis inputs cannot contain ${typeof value}`);
  }
  if (seen.has(value)) throw new Error('Effective analysis inputs cannot contain cycles');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry) => strictCanonicalize(entry, seen));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Effective analysis inputs require plain JSON objects');
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [key, strictCanonicalize(entry, seen)])
    );
  } finally {
    seen.delete(value);
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
