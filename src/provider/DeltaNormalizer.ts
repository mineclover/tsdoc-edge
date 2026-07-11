/** Raw provider delta to canonical GraphDelta normalization. */

import { createHash } from 'node:crypto';
import * as path from 'node:path';
import type {
  CanonicalGraphEdge,
  CanonicalGraphNode,
  CanonicalProjectGraph,
  ProjectGraphInput,
  ProjectGraphSource,
  ProjectIndexRequest,
} from '../indexer/contracts';
import type { CanonicalDiagnostic } from '../indexer/diagnostics-contract';
import { ProjectIndexer } from '../indexer/ProjectIndexer';
import {
  type CodeGraphRevision,
  type GraphDelta,
  GraphDeltaBuilder,
  type GraphDeltaEdgeKey,
  type GraphDeltaExtractorIdentity,
  type GraphDeltaIdentityRemap,
} from '../lsp/overlay/GraphDelta';
import type { CompilerFactTopologyEdge, FactOccurrence } from '../semantic-graph/fact-topology';
import type {
  GraphCapabilities,
  ProviderChange,
  ProviderDelta,
  ProviderFactOccurrence,
  ProviderSnapshot,
} from './contracts';
import type {
  NormalizedProviderSnapshot,
  ProviderSnapshotNormalizer,
} from './ProviderSnapshotNormalizer';

export const PROVIDER_DELTA_NORMALIZER_VERSION = '1.0' as const;
export const OWNED_OUTGOING_RELATIONSHIPS_CAPABILITY = 'owned-outgoing-relationships' as const;

export type ProviderDeltaNormalizationState = 'dirty' | 'rebase-required' | 'fallback-required';

/** Provider identity and state retained outside GraphDelta v1. */
export interface NormalizedProviderDelta {
  readonly state: ProviderDeltaNormalizationState;
  readonly providerDeltaId: string;
  readonly baseProviderSnapshotId: string;
  readonly nextProviderSnapshotId?: string;
  readonly providerIdentityDigest: string;
  readonly capabilityDigest: string;
  readonly graphDelta?: GraphDelta;
  readonly facts?: {
    readonly upsert: readonly FactOccurrence[];
    readonly remove: readonly string[];
  };
  readonly topology?: {
    readonly upsert: readonly CompilerFactTopologyEdge[];
    readonly remove: readonly string[];
  };
  readonly diagnostics: readonly CanonicalDiagnostic[];
  readonly reason?: string;
}

/** Input needed to validate a raw delta against its exact persisted base. */
export interface NormalizeProviderDeltaInput {
  readonly baseSnapshot: ProviderSnapshot;
  readonly baseRevision: CodeGraphRevision;
  readonly delta: ProviderDelta;
}

/**
 * Replays a raw one-document delta, then diffs canonical projections.
 *
 * A stale provider snapshot is a typed outcome rather than an exception. The
 * caller must ask the provider for a fresh delta; this class never rebases
 * canonical ids mechanically.
 */
export class DeltaNormalizer {
  constructor(private readonly snapshotNormalizer: ProviderSnapshotNormalizer) {}

  /** Normalize one provider delta or return a non-applicable state. */
  async normalize(input: NormalizeProviderDeltaInput): Promise<NormalizedProviderDelta> {
    const { baseSnapshot, baseRevision, delta } = input;
    validateDeltaEnvelope(baseSnapshot, delta);
    const providerIdentityDigest = stableDigest(delta.identity);
    const capabilityDigest = stableDigest(delta.capabilities);
    if (delta.baseSnapshotId !== baseSnapshot.snapshotId) {
      return freezeOutcome({
        state: 'rebase-required',
        providerDeltaId: delta.deltaId,
        baseProviderSnapshotId: delta.baseSnapshotId,
        providerIdentityDigest,
        capabilityDigest,
        diagnostics: [],
        reason: `Provider delta base mismatch: expected ${baseSnapshot.snapshotId}, received ${delta.baseSnapshotId}`,
      });
    }

    const scopeError = deltaScopeError(baseSnapshot, delta, baseRevision.graph.rootDir);
    if (scopeError) {
      return freezeOutcome({
        state: 'fallback-required',
        providerDeltaId: delta.deltaId,
        baseProviderSnapshotId: delta.baseSnapshotId,
        providerIdentityDigest,
        capabilityDigest,
        diagnostics: [],
        reason: scopeError,
      });
    }

    const baseNormalized = this.snapshotNormalizer.normalize(baseSnapshot);
    const envelopeMismatch = baseRevisionEnvelopeMismatch(baseRevision.graph, baseNormalized);
    if (envelopeMismatch) {
      return freezeOutcome({
        state: 'rebase-required',
        providerDeltaId: delta.deltaId,
        baseProviderSnapshotId: delta.baseSnapshotId,
        providerIdentityDigest,
        capabilityDigest,
        diagnostics: [],
        reason: envelopeMismatch,
      });
    }
    const assembledBase = await assemble(baseNormalized);
    if (assembledBase.fingerprint !== baseRevision.graph.fingerprint) {
      return freezeOutcome({
        state: 'rebase-required',
        providerDeltaId: delta.deltaId,
        baseProviderSnapshotId: delta.baseSnapshotId,
        providerIdentityDigest,
        capabilityDigest,
        diagnostics: [],
        reason: `Provider snapshot canonical fingerprint mismatch: expected ${baseRevision.graph.fingerprint}, received ${assembledBase.fingerprint}`,
      });
    }
    const pinMismatch = baseRevisionProviderPinMismatch(baseRevision.graph, baseNormalized);
    if (pinMismatch) {
      return freezeOutcome({
        state: 'rebase-required',
        providerDeltaId: delta.deltaId,
        baseProviderSnapshotId: delta.baseSnapshotId,
        providerIdentityDigest,
        capabilityDigest,
        diagnostics: [],
        reason: pinMismatch,
      });
    }
    const nextSnapshot = replayDelta(baseSnapshot, delta, baseRevision.graph.rootDir);
    const nextNormalized = this.snapshotNormalizer.normalize(nextSnapshot);
    const nextGraph = await assemble(nextNormalized);
    const changes = diffCanonicalGraphs(baseRevision.graph, nextGraph);
    const facts = diffByIdentity(baseNormalized.factOccurrences, nextNormalized.factOccurrences);
    const topology = diffByIdentity(baseNormalized.topologyEdges, nextNormalized.topologyEdges);
    const identityRemap = normalizeIdentityRemap(delta.changes, baseNormalized, nextNormalized);
    const extractor: GraphDeltaExtractorIdentity = Object.freeze({
      id: `${delta.identity.providerId}/provider-delta`,
      version: delta.identity.providerVersion,
      relationshipCoverage:
        delta.capabilities[OWNED_OUTGOING_RELATIONSHIPS_CAPABILITY]?.status === 'complete'
          ? 'owned-outgoing-complete'
          : 'none',
    });
    const deltaDocumentPath = resolveDocumentPath(baseRevision.graph.rootDir, delta.documentPath);
    const overlayDiagnostics = (nextNormalized.projectInput.diagnostics ?? []).filter(
      (diagnostic) =>
        !diagnostic.file ||
        normalizedComparablePath(
          resolveDocumentPath(baseRevision.graph.rootDir, diagnostic.file)
        ) === normalizedComparablePath(deltaDocumentPath)
    );
    const graphDelta = GraphDeltaBuilder.fromCanonicalChanges({
      baseGraph: baseRevision.graph,
      baseRevisionId: baseRevision.revisionId,
      filePath: deltaDocumentPath,
      contentDigest: delta.contentDigest,
      extractor,
      sourceContext: {
        kind: 'semantic-provider-delta',
        baseProviderSnapshotId: baseNormalized.snapshotId,
        nextProviderSnapshotId: nextNormalized.snapshotId,
        providerDeltaId: delta.deltaId,
        baseProviderIdentityDigest: baseNormalized.providerIdentityDigest,
        baseCapabilityDigest: baseNormalized.capabilityDigest,
        providerIdentityDigest: nextNormalized.providerIdentityDigest,
        capabilityDigest: nextNormalized.capabilityDigest,
      },
      identityRemap,
      nodes: changes.nodes,
      edges: changes.edges,
      diagnostics: overlayDiagnostics,
    });

    return freezeOutcome({
      state: 'dirty',
      providerDeltaId: delta.deltaId,
      baseProviderSnapshotId: delta.baseSnapshotId,
      nextProviderSnapshotId: nextSnapshot.snapshotId,
      providerIdentityDigest,
      capabilityDigest,
      graphDelta,
      facts,
      topology,
      diagnostics: nextNormalized.projectInput.diagnostics ?? [],
    });
  }
}

function validateDeltaEnvelope(base: ProviderSnapshot, delta: ProviderDelta): void {
  strictJsonClone(delta);
  requireNonEmpty(delta.deltaId, 'deltaId');
  requireNonEmpty(delta.baseSnapshotId, 'baseSnapshotId');
  requireNonEmpty(delta.documentPath, 'documentPath');
  requireNonEmpty(delta.contentDigest, 'contentDigest');
  if (delta.capabilities['incremental-delta']?.status === 'unsupported') {
    throw new Error('Provider emitted a delta while incremental-delta capability is unsupported');
  }
  if (
    delta.contractId !== base.contractId ||
    delta.contractVersion !== base.contractVersion ||
    delta.identity.contractId !== base.identity.contractId ||
    delta.identity.contractVersion !== base.identity.contractVersion
  ) {
    throw new Error('Provider delta contract does not match the base snapshot');
  }
  if (
    delta.workspaceId !== base.workspaceId ||
    delta.graphNamespace !== base.graphNamespace ||
    delta.identity.providerId !== base.identity.providerId ||
    delta.identity.providerVersion !== base.identity.providerVersion ||
    delta.identity.providerInstanceId !== base.identity.providerInstanceId
  ) {
    throw new Error('Provider delta identity does not match the base snapshot');
  }
}

function deltaScopeError(
  base: ProviderSnapshot,
  delta: ProviderDelta,
  rootDir: string
): string | null {
  const document = normalizedComparablePath(resolveDocumentPath(rootDir, delta.documentPath));
  const nodes = new Map(base.nodes.map((node) => [node.providerNodeId, node]));
  const facts = providerFactsById(base.facts);
  for (const change of delta.changes) {
    if (change.type === 'node-upsert') {
      const previous = nodes.get(change.node.providerNodeId);
      if (
        previous?.file &&
        normalizedComparablePath(resolveDocumentPath(rootDir, previous.file)) !== document
      ) {
        return `Provider delta node-upsert changes an owner from another document: ${change.node.providerNodeId}`;
      }
      if (
        !change.node.file ||
        normalizedComparablePath(resolveDocumentPath(rootDir, change.node.file)) !== document
      ) {
        return `Provider delta node-upsert escapes document scope: ${change.node.providerNodeId}`;
      }
      nodes.set(change.node.providerNodeId, change.node);
    } else if (change.type === 'node-remove') {
      const node = nodes.get(change.providerNodeId);
      if (
        !node?.file ||
        normalizedComparablePath(resolveDocumentPath(rootDir, node.file)) !== document
      ) {
        return `Provider delta node-remove escapes document scope: ${change.providerNodeId}`;
      }
    } else if (change.type === 'fact-upsert') {
      const owner = nodes.get(change.fact.fromProviderNodeId);
      if (
        !owner?.file ||
        normalizedComparablePath(resolveDocumentPath(rootDir, owner.file)) !== document
      ) {
        return `Provider delta fact-upsert has a non-document owner: ${change.fact.fromProviderNodeId}`;
      }
    } else if (change.type === 'fact-remove') {
      const fact = facts.get(change.providerFactId);
      const owner = fact ? nodes.get(fact.fromProviderNodeId) : undefined;
      if (
        !fact ||
        !owner?.file ||
        normalizedComparablePath(resolveDocumentPath(rootDir, owner.file)) !== document
      ) {
        return `Provider delta fact-remove has a non-document owner: ${change.providerFactId}`;
      }
    }
  }
  return null;
}

function replayDelta(
  base: ProviderSnapshot,
  delta: ProviderDelta,
  rootDir: string
): ProviderSnapshot {
  const nodes = new Map(base.nodes.map((node) => [node.providerNodeId, clone(node)]));
  const facts = providerFactsByKey(
    base.facts.map((fact) => ({
      ...fact,
      observedInSnapshotId: fact.observedInSnapshotId ?? base.snapshotId,
    }))
  );
  const upsertedFactKeys = new Set<string>();
  const removedNodeIds = new Set<string>();
  for (const change of delta.changes) {
    if (change.type === 'node-upsert') {
      nodes.set(change.node.providerNodeId, clone(change.node));
    } else if (change.type === 'node-remove') {
      if (!nodes.delete(change.providerNodeId)) {
        throw new Error(`Provider delta removes an unknown node: ${change.providerNodeId}`);
      }
      removedNodeIds.add(change.providerNodeId);
    } else if (change.type === 'fact-upsert') {
      const observed = {
        ...change.fact,
        observedInSnapshotId: change.fact.observedInSnapshotId ?? delta.deltaId,
      };
      const key = providerFactKey(observed);
      upsertedFactKeys.add(key);
      facts.set(key, clone(observed));
    } else if (change.type === 'fact-remove') {
      const key = `id:${change.providerFactId}`;
      if (!facts.delete(key)) {
        throw new Error(`Provider delta removes an unknown fact: ${change.providerFactId}`);
      }
    }
  }
  for (const [key, fact] of facts) {
    const missing = [fact.fromProviderNodeId, fact.toProviderNodeId].filter(
      (providerNodeId) => !nodes.has(providerNodeId)
    );
    if (missing.length === 0) continue;
    if (
      upsertedFactKeys.has(key) ||
      missing.some((providerNodeId) => !removedNodeIds.has(providerNodeId))
    ) {
      throw new Error(
        `Provider delta fact has an unknown endpoint: ${fact.kind} ${fact.fromProviderNodeId} -> ${fact.toProviderNodeId}`
      );
    }
    facts.delete(key);
  }
  const nodeValues = [...nodes.values()].sort((left, right) =>
    compareText(left.providerNodeId, right.providerNodeId)
  );
  const factValues = [...facts.values()].sort((left, right) =>
    compareText(providerFactKey(left), providerFactKey(right))
  );
  const effectiveSnapshotId = `provider-effective:${stableDigest({
    baseSnapshotId: base.snapshotId,
    deltaId: delta.deltaId,
    contentDigest: delta.contentDigest,
    identity: delta.identity,
    capabilities: delta.capabilities,
    diagnostics: delta.diagnostics,
    changes: delta.changes,
    provenance: base.provenance,
    nodes: nodeValues,
    facts: factValues,
  })}`;
  const documentPath = normalizedComparablePath(resolveDocumentPath(rootDir, delta.documentPath));
  const retainedDiagnostics = base.diagnostics.filter((diagnostic) => {
    const file = diagnostic.evidence?.file;
    return !file || normalizedComparablePath(resolveDocumentPath(rootDir, file)) !== documentPath;
  });
  const diagnosticsById = new Map<string, ProviderSnapshot['diagnostics'][number]>();
  for (const diagnostic of [...retainedDiagnostics, ...delta.diagnostics]) {
    const identity =
      diagnostic.providerDiagnosticId ??
      `digest:${stableDigest({
        code: diagnostic.code ?? null,
        category: diagnostic.category ?? null,
        severity: diagnostic.severity,
        message: diagnostic.message,
        evidence: diagnostic.evidence ?? null,
      })}`;
    diagnosticsById.set(identity, clone(diagnostic));
  }
  return clone({
    ...base,
    snapshotId: effectiveSnapshotId,
    capabilities: mergeCapabilities(base.capabilities, delta.capabilities),
    nodes: nodeValues,
    facts: factValues,
    diagnostics: [...diagnosticsById.entries()]
      .sort(([left], [right]) => compareText(left, right))
      .map(([, diagnostic]) => diagnostic),
  });
}

function baseRevisionProviderPinMismatch(
  graph: CanonicalProjectGraph,
  normalized: NormalizedProviderSnapshot
): string | null {
  const expected: Readonly<Record<string, string>> = {
    providerSnapshotId: normalized.snapshotId,
    providerSnapshotDigest: normalized.snapshotDigest,
    providerIdentityDigest: normalized.providerIdentityDigest,
    providerCapabilityDigest: normalized.capabilityDigest,
    workspaceId: normalized.workspaceId,
    graphNamespace: normalized.graphNamespace,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (graph.provenance[field] !== value) {
      return `Provider snapshot base revision pin mismatch for ${field}: expected ${value}, received ${String(graph.provenance[field] ?? '<missing>')}`;
    }
  }
  return null;
}

function baseRevisionEnvelopeMismatch(
  graph: CanonicalProjectGraph,
  normalized: NormalizedProviderSnapshot
): string | null {
  const expectedRootDir = normalized.projectInput.rootDir;
  if (graph.rootDir !== expectedRootDir) {
    return `Provider snapshot base revision root mismatch: expected ${expectedRootDir}, received ${graph.rootDir}`;
  }
  const expectedTsconfigPath = normalized.projectInput.tsconfigPath;
  if (graph.tsconfigPath !== expectedTsconfigPath) {
    return `Provider snapshot base revision tsconfig mismatch: expected ${expectedTsconfigPath}, received ${graph.tsconfigPath}`;
  }
  return null;
}

function normalizeIdentityRemap(
  changes: readonly ProviderChange[],
  base: NormalizedProviderSnapshot,
  next: NormalizedProviderSnapshot
): readonly GraphDeltaIdentityRemap[] {
  const remaps: GraphDeltaIdentityRemap[] = [];
  for (const change of changes) {
    if (change.type !== 'identity-remap' || !change.nextProviderNodeId) continue;
    const fromNodeId = base.providerNodeIdToCanonicalId[change.previousProviderNodeId];
    const toNodeId = next.providerNodeIdToCanonicalId[change.nextProviderNodeId];
    if (!fromNodeId) {
      throw new Error(
        `Provider identity remap has an unknown source: ${change.previousProviderNodeId}`
      );
    }
    if (!toNodeId) {
      throw new Error(
        `Provider identity remap has an unknown target: ${change.nextProviderNodeId}`
      );
    }
    remaps.push(Object.freeze({ fromNodeId, toNodeId }));
  }
  return Object.freeze(
    remaps.sort(
      (left, right) =>
        compareText(left.fromNodeId, right.fromNodeId) || compareText(left.toNodeId, right.toNodeId)
    )
  );
}

async function assemble(normalized: NormalizedProviderSnapshot): Promise<CanonicalProjectGraph> {
  const source = new StaticProjectGraphSource(normalized.projectInput);
  const result = await new ProjectIndexer(source).index({
    rootDir: normalized.projectInput.rootDir,
    tsconfigPath: normalized.projectInput.tsconfigPath,
  });
  return result.graph;
}

class StaticProjectGraphSource implements ProjectGraphSource {
  readonly id = 'normalized-provider-snapshot';

  constructor(private readonly input: ProjectGraphInput) {}

  async load(_request: ProjectIndexRequest): Promise<ProjectGraphInput> {
    return this.input;
  }
}

function diffCanonicalGraphs(
  base: CanonicalProjectGraph,
  next: CanonicalProjectGraph
): {
  readonly nodes: {
    readonly upsert: readonly CanonicalGraphNode[];
    readonly remove: readonly string[];
  };
  readonly edges: {
    readonly upsert: readonly CanonicalGraphEdge[];
    readonly remove: readonly GraphDeltaEdgeKey[];
  };
} {
  const baseNodes = new Map(base.nodes.map((node) => [node.id, node]));
  const nextNodes = new Map(next.nodes.map((node) => [node.id, node]));
  const nodeUpsert = next.nodes.filter(
    (node) => stableJson(baseNodes.get(node.id)) !== stableJson(node)
  );
  const nodeRemove = base.nodes.filter((node) => !nextNodes.has(node.id)).map((node) => node.id);

  const baseEdges = new Map(base.edges.map((edge) => [edgeKey(edge), edge]));
  const nextEdges = new Map(next.edges.map((edge) => [edgeKey(edge), edge]));
  const edgeUpsert = next.edges.filter(
    (edge) => stableJson(baseEdges.get(edgeKey(edge))) !== stableJson(edge)
  );
  const edgeRemove = base.edges
    .filter((edge) => !nextEdges.has(edgeKey(edge)))
    .map((edge) => Object.freeze({ kind: edge.kind, from: edge.from, to: edge.to }));
  return {
    nodes: { upsert: nodeUpsert, remove: nodeRemove },
    edges: { upsert: edgeUpsert, remove: edgeRemove },
  };
}

function diffByIdentity<T extends { readonly id: string }>(
  base: readonly T[],
  next: readonly T[]
): { readonly upsert: readonly T[]; readonly remove: readonly string[] } {
  const baseById = new Map(base.map((value) => [value.id, value]));
  const nextById = new Map(next.map((value) => [value.id, value]));
  return Object.freeze({
    upsert: Object.freeze(
      next.filter((value) => stableJson(baseById.get(value.id)) !== stableJson(value))
    ),
    remove: Object.freeze(
      base
        .filter((value) => !nextById.has(value.id))
        .map((value) => value.id)
        .sort(compareText)
    ),
  });
}

function providerFactsById(
  facts: readonly ProviderFactOccurrence[]
): ReadonlyMap<string, ProviderFactOccurrence> {
  const result = new Map<string, ProviderFactOccurrence>();
  for (const fact of facts) {
    if (result.has(fact.providerFactId)) {
      throw new Error(`Duplicate provider fact id: ${fact.providerFactId}`);
    }
    result.set(fact.providerFactId, fact);
  }
  return result;
}

function providerFactsByKey(
  facts: readonly ProviderFactOccurrence[]
): Map<string, ProviderFactOccurrence> {
  const result = new Map<string, ProviderFactOccurrence>();
  for (const fact of facts) {
    const key = providerFactKey(fact);
    if (result.has(key)) throw new Error(`Duplicate provider fact identity: ${key}`);
    result.set(key, fact);
  }
  return result;
}

function providerFactKey(fact: ProviderFactOccurrence): string {
  return `id:${fact.providerFactId}`;
}

function mergeCapabilities(base: GraphCapabilities, delta: GraphCapabilities): GraphCapabilities {
  return clone({ ...base, ...delta });
}

function resolveDocumentPath(rootDir: string, documentPath: string): string {
  return path.isAbsolute(documentPath) ? documentPath : path.resolve(rootDir, documentPath);
}

function normalizedComparablePath(value: string): string {
  return path.normalize(value).replace(/\\/g, '/');
}

function edgeKey(edge: Pick<CanonicalGraphEdge, 'kind' | 'from' | 'to'>): string {
  return `${edge.kind}\u0000${edge.from}\u0000${edge.to}`;
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function stableDigest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

function clone<T>(value: T): T {
  return strictJsonClone(value);
}

function strictJsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(strictCanonicalize(value))) as T;
}

function strictCanonicalize(value: unknown, seen = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Provider delta requires finite numbers');
    return value;
  }
  if (typeof value !== 'object') {
    throw new Error(`Provider delta cannot contain ${typeof value}`);
  }
  if (seen.has(value)) throw new Error('Provider delta cannot contain cycles');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry) => strictCanonicalize(entry, seen));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Provider delta requires plain JSON objects');
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, child]) => [key, strictCanonicalize(child, seen)])
    );
  } finally {
    seen.delete(value);
  }
}

function freezeOutcome(value: NormalizedProviderDelta): NormalizedProviderDelta {
  return deepFreeze(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function requireNonEmpty(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} must be a non-empty string`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
