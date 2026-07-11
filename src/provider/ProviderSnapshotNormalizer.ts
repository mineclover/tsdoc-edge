/** Canonical normalization for provider-owned raw snapshots. */

import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { formatCanonicalId } from '../indexer/canonical-id';
import { canonicalFsPath } from '../indexer/canonical-path';
import type {
  ProjectGraphEvidence,
  ProjectGraphInput,
  ProjectGraphSourceEdge,
  ProjectGraphSourceNode,
} from '../indexer/contracts';
import type { CanonicalDiagnostic } from '../indexer/diagnostics-contract';
import {
  buildFactTopologyProjection,
  type CompilerFactTopologyEdge,
  createFactOccurrence,
  type FactOccurrence,
} from '../semantic-graph/fact-topology';
import {
  type GraphCapabilities,
  type ProviderDiagnostic,
  type ProviderFactOccurrence,
  type ProviderIdentity,
  type ProviderNode,
  type ProviderSnapshot,
  SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID,
  SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION,
} from './contracts';

export const PROVIDER_SNAPSHOT_NORMALIZER_ID = 'tsdoc-edge/provider-snapshot-normalizer' as const;
export const PROVIDER_SNAPSHOT_NORMALIZER_VERSION = '1.0' as const;

/** Transitional context required by the current CanonicalProjectGraph v1 envelope. */
export interface ProviderSnapshotNormalizerOptions {
  readonly rootDir: string;
  /**
   * CanonicalProjectGraph v1 still requires this field. It is deliberately
   * supplied by the TypeScript adapter and is not part of ProviderSnapshot.
   */
  readonly compatibilityTsconfigPath: string;
  readonly expectedWorkspaceId?: string;
}

/** Deterministic bridge from one provider snapshot into ProjectIndexer input. */
export interface NormalizedProviderSnapshot {
  readonly snapshotId: string;
  readonly snapshotDigest: string;
  readonly workspaceId: string;
  readonly graphNamespace: string;
  readonly providerIdentity: ProviderIdentity;
  readonly providerIdentityDigest: string;
  readonly capabilityDigest: string;
  readonly providerNodeIdToCanonicalId: Readonly<Record<string, string>>;
  readonly factTopologyProjectionId: string;
  readonly factOccurrences: readonly FactOccurrence[];
  readonly topologyEdges: readonly CompilerFactTopologyEdge[];
  readonly projectInput: ProjectGraphInput;
}

interface NormalizedProviderOccurrence {
  readonly occurrenceId: string;
  readonly providerFactId: string;
  readonly semanticQualifier?: string;
  readonly evidence: ProjectGraphEvidence;
  readonly confidence: number | null;
  readonly producerFields?: Readonly<Record<string, unknown>>;
}

interface EdgeAccumulator {
  readonly kind: string;
  readonly from: string;
  readonly to: string;
  readonly occurrences: NormalizedProviderOccurrence[];
}

/**
 * Validates a provider snapshot and allocates namespaced canonical ids.
 *
 * The provider's local ids remain provenance only. ProjectIndexer remains the
 * final canonical graph assembler through the returned `projectInput`.
 */
export class ProviderSnapshotNormalizer {
  readonly rootDir: string;
  readonly compatibilityTsconfigPath: string;

  constructor(private readonly options: ProviderSnapshotNormalizerOptions) {
    this.rootDir = canonicalFsPath(options.rootDir);
    this.compatibilityTsconfigPath = canonicalFsPath(
      path.resolve(this.rootDir, options.compatibilityTsconfigPath)
    );
  }

  /** Normalize one complete saved provider snapshot. */
  normalize(snapshot: ProviderSnapshot): NormalizedProviderSnapshot {
    validateSnapshotEnvelope(snapshot, this.options.expectedWorkspaceId);
    const providerIdentityDigest = stableDigest(snapshot.identity);
    const capabilities = normalizeCapabilities(snapshot.capabilities);
    const capabilityDigest = stableDigest(capabilities);
    if (snapshot.facts.length > 0 && capabilities['fact-occurrences']?.status === 'unsupported') {
      throw new Error('Provider reported facts while fact-occurrences capability is unsupported');
    }

    const nodeMap = new Map<string, string>();
    const canonicalNodeOwners = new Map<string, string>();
    const nodes = snapshot.nodes.map((node, index) => {
      validateProviderNode(node, index);
      if (nodeMap.has(node.providerNodeId)) {
        throw new Error(`Duplicate provider node id: ${node.providerNodeId}`);
      }
      const canonicalId = canonicalProviderNodeId(snapshot, node, this.rootDir);
      const existingOwner = canonicalNodeOwners.get(canonicalId);
      if (existingOwner) {
        throw new Error(
          `Canonical provider node identity collision: ${canonicalId} is emitted by ${existingOwner} and ${node.providerNodeId}; providers must collapse declarations that represent the same semantic symbol, while repeated observations belong in the fact-occurrence plane`
        );
      }
      canonicalNodeOwners.set(canonicalId, node.providerNodeId);
      nodeMap.set(node.providerNodeId, canonicalId);
      return normalizeNode(snapshot, node, canonicalId, this.rootDir);
    });
    nodes.sort((left, right) => compareText(left.id, right.id));

    const edgeAccumulators = new Map<string, EdgeAccumulator>();
    const factOccurrences: FactOccurrence[] = [];
    snapshot.facts.forEach((fact, index) => {
      validateProviderFact(fact, index);
      const from = nodeMap.get(fact.fromProviderNodeId);
      const to = nodeMap.get(fact.toProviderNodeId);
      if (!from || !to) {
        throw new Error(
          `Provider fact has an unknown endpoint: ${fact.kind} ${fact.fromProviderNodeId} -> ${fact.toProviderNodeId}`
        );
      }
      const factOccurrence = normalizeFactOccurrence(snapshot, fact, from, to, this.rootDir);
      factOccurrences.push(factOccurrence);
      const occurrence = normalizeOccurrence(fact, factOccurrence.id, this.rootDir);
      const topologyKey = `${fact.kind}\u0000${from}\u0000${to}`;
      const accumulator = edgeAccumulators.get(topologyKey) ?? {
        kind: fact.kind,
        from,
        to,
        occurrences: [],
      };
      accumulator.occurrences.push(occurrence);
      edgeAccumulators.set(topologyKey, accumulator);
    });
    const edges = [...edgeAccumulators.values()].map(projectCompatibilityEdge);
    edges.sort(compareEdges);

    const compatibilityGraph = compatibilityProjectionGraph({
      rootDir: this.rootDir,
      tsconfigPath: this.compatibilityTsconfigPath,
      nodes,
      edges,
    });
    const factTopology = buildFactTopologyProjection({
      graph: compatibilityGraph,
      occurrences: factOccurrences,
      policies: {
        unknownEndpoint: 'reject',
        duplicateFact: 'deduplicate-identical',
      },
    });

    const nodeRecord = Object.freeze(
      Object.fromEntries([...nodeMap.entries()].sort(([left], [right]) => compareText(left, right)))
    );
    const diagnostics = normalizeDiagnostics(snapshot, nodeMap, this.rootDir);
    const snapshotDigest = stableDigest({
      contractId: snapshot.contractId,
      contractVersion: snapshot.contractVersion,
      snapshotId: snapshot.snapshotId,
      workspaceId: snapshot.workspaceId,
      graphNamespace: snapshot.graphNamespace,
      identity: snapshot.identity,
      capabilities,
      nodes,
      edges,
      factOccurrences: factTopology.occurrences,
      topologyEdges: factTopology.topologyEdges,
      diagnostics,
      provenance: snapshot.provenance,
    });
    const projectInput: ProjectGraphInput = {
      rootDir: this.rootDir,
      tsconfigPath: this.compatibilityTsconfigPath,
      nodes,
      edges,
      diagnostics,
      provenance: {
        adapter: PROVIDER_SNAPSHOT_NORMALIZER_ID,
        producer: snapshot.provenance.producer,
        ...(snapshot.provenance.producerVersion
          ? { producerVersion: snapshot.provenance.producerVersion }
          : {}),
        artifactContractId: snapshot.provenance.artifactContractId ?? snapshot.contractId,
        artifactContractVersion:
          snapshot.provenance.artifactContractVersion ?? snapshot.contractVersion,
        artifactCapabilities: capabilities,
        compilerVersion: snapshot.provenance.compilerVersion,
        ...(snapshot.provenance.typescriptCompatibilityTarget
          ? {
              typescriptCompatibilityTarget: snapshot.provenance.typescriptCompatibilityTarget,
            }
          : {}),
        providerId: snapshot.identity.providerId,
        providerVersion: snapshot.identity.providerVersion,
        providerInstanceId: snapshot.identity.providerInstanceId,
        providerContractId: snapshot.identity.contractId,
        providerContractVersion: snapshot.identity.contractVersion,
        providerIdentityDigest,
        providerSnapshotId: snapshot.snapshotId,
        providerSnapshotDigest: snapshotDigest,
        providerCapabilityDigest: capabilityDigest,
        providerConfigDigest: snapshot.provenance.providerConfigDigest,
        workspaceId: snapshot.workspaceId,
        graphNamespace: snapshot.graphNamespace,
        compilerVersionReported: snapshot.provenance.compilerVersionReported,
        canonicalNormalizerId: PROVIDER_SNAPSHOT_NORMALIZER_ID,
        canonicalNormalizerVersion: PROVIDER_SNAPSHOT_NORMALIZER_VERSION,
        compatibilityTsconfigBridge: true,
        ...(snapshot.provenance.producerFields
          ? { providerProvenanceFields: canonicalJsonClone(snapshot.provenance.producerFields) }
          : {}),
      },
    };

    return deepFreeze({
      snapshotId: snapshot.snapshotId,
      snapshotDigest,
      workspaceId: snapshot.workspaceId,
      graphNamespace: snapshot.graphNamespace,
      providerIdentity: canonicalJsonClone(snapshot.identity),
      providerIdentityDigest,
      capabilityDigest,
      providerNodeIdToCanonicalId: nodeRecord,
      factTopologyProjectionId: factTopology.projectionId,
      factOccurrences: factTopology.occurrences,
      topologyEdges: factTopology.topologyEdges,
      projectInput,
    });
  }
}

/** Allocate a canonical id without exposing the syntax to provider implementations. */
export function canonicalProviderNodeId(
  snapshot: Pick<ProviderSnapshot, 'workspaceId' | 'graphNamespace'>,
  node: ProviderNode,
  rootDir: string
): string {
  const file = canonicalProviderFile(node, rootDir);
  const identityPath = [
    '@workspace',
    encodeIdentitySegment(snapshot.workspaceId),
    'graph',
    encodeIdentitySegment(snapshot.graphNamespace),
    file,
  ].join('/');
  const qualifiedName = node.qualifiedName ?? node.name ?? node.providerNodeId;
  return formatCanonicalId(identityPath, encodeQualifiedName(qualifiedName), node.kind);
}

function validateSnapshotEnvelope(snapshot: ProviderSnapshot, expectedWorkspaceId?: string): void {
  if (snapshot.contractId !== SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID) {
    throw new Error(`Unsupported provider contract id: ${snapshot.contractId}`);
  }
  if (snapshot.contractVersion !== SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION) {
    throw new Error(`Unsupported provider contract version: ${snapshot.contractVersion}`);
  }
  requireNonEmpty(snapshot.snapshotId, 'snapshotId');
  requireNonEmpty(snapshot.workspaceId, 'workspaceId');
  requireNonEmpty(snapshot.graphNamespace, 'graphNamespace');
  if (expectedWorkspaceId && snapshot.workspaceId !== expectedWorkspaceId) {
    throw new Error(
      `Provider workspace mismatch: expected ${expectedWorkspaceId}, received ${snapshot.workspaceId}`
    );
  }
  validateProviderIdentity(snapshot.identity);
  if (
    snapshot.identity.contractId !== snapshot.contractId ||
    snapshot.identity.contractVersion !== snapshot.contractVersion
  ) {
    throw new Error('Provider identity contract does not match snapshot envelope');
  }
  const reported = snapshot.provenance.compilerVersionReported;
  const compilerVersion = snapshot.provenance.compilerVersion;
  if (reported !== (typeof compilerVersion === 'string' && compilerVersion.trim() !== '')) {
    throw new Error('Provider compilerVersionReported does not match compilerVersion provenance');
  }
  requireNonEmpty(snapshot.provenance.producer, 'provenance.producer');
  requireNonEmpty(snapshot.provenance.providerConfigDigest, 'provenance.providerConfigDigest');
}

function validateProviderIdentity(identity: ProviderIdentity): void {
  requireNonEmpty(identity.providerId, 'identity.providerId');
  requireNonEmpty(identity.providerVersion, 'identity.providerVersion');
  requireNonEmpty(identity.providerInstanceId, 'identity.providerInstanceId');
  if (identity.contractId !== SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID) {
    throw new Error(`Unsupported provider identity contract id: ${identity.contractId}`);
  }
  if (identity.contractVersion !== SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION) {
    throw new Error(`Unsupported provider identity contract version: ${identity.contractVersion}`);
  }
}

function normalizeCapabilities(capabilities: GraphCapabilities): GraphCapabilities {
  const normalized: Record<string, GraphCapabilities[string]> = {};
  for (const [name, capability] of Object.entries(capabilities).sort(([left], [right]) =>
    compareText(left, right)
  )) {
    requireNonEmpty(name, 'capability name');
    if (
      capability.status !== 'unsupported' &&
      capability.status !== 'partial' &&
      capability.status !== 'complete'
    ) {
      throw new Error(`Unsupported provider capability status for ${name}: ${capability.status}`);
    }
    normalized[name] = canonicalJsonClone(capability);
  }
  return deepFreeze(normalized);
}

function validateProviderNode(node: ProviderNode, index: number): void {
  requireNonEmpty(node.providerNodeId, `nodes[${index}].providerNodeId`);
  requireNonEmpty(node.kind, `nodes[${index}].kind`);
  const qualifiedName = node.qualifiedName ?? node.name ?? node.providerNodeId;
  requireNonEmpty(qualifiedName, `nodes[${index}].qualifiedName`);
}

function validateProviderFact(fact: ProviderFactOccurrence, index: number): void {
  requireNonEmpty(fact.providerFactId, `facts[${index}].providerFactId`);
  requireNonEmpty(fact.kind, `facts[${index}].kind`);
  requireNonEmpty(fact.fromProviderNodeId, `facts[${index}].fromProviderNodeId`);
  requireNonEmpty(fact.toProviderNodeId, `facts[${index}].toProviderNodeId`);
  if (!fact.evidence.file) {
    throw new Error(`facts[${index}].evidence.file must be a non-empty string`);
  }
  if (
    fact.confidence !== undefined &&
    (!Number.isFinite(fact.confidence) || fact.confidence < 0 || fact.confidence > 1)
  ) {
    throw new Error(`facts[${index}].confidence must be between 0 and 1`);
  }
}

function normalizeNode(
  snapshot: ProviderSnapshot,
  node: ProviderNode,
  canonicalId: string,
  rootDir: string
): ProjectGraphSourceNode {
  const file = node.file
    ? normalizeProviderPath(node.file, rootDir, node.external === true)
    : undefined;
  const evidence = node.evidence
    ? normalizeEvidence(node.evidence, rootDir, node.external === true)
    : undefined;
  return deepFreeze({
    id: canonicalId,
    kind: node.kind,
    ...(node.name ? { name: node.name } : {}),
    ...(node.qualifiedName ? { qualifiedName: node.qualifiedName } : {}),
    ...(file ? { file } : {}),
    ...(node.exported !== undefined ? { exported: node.exported } : {}),
    ...(node.external !== undefined ? { external: node.external } : {}),
    ...(evidence ? { evidence } : {}),
    workspaceId: snapshot.workspaceId,
    graphNamespace: snapshot.graphNamespace,
    providerId: snapshot.identity.providerId,
    providerVersion: snapshot.identity.providerVersion,
    providerInstanceId: snapshot.identity.providerInstanceId,
    providerNodeId: node.providerNodeId,
    ...(node.producerFields ? { providerFields: canonicalJsonClone(node.producerFields) } : {}),
  });
}

function normalizeOccurrence(
  fact: ProviderFactOccurrence,
  occurrenceId: string,
  rootDir: string
): NormalizedProviderOccurrence {
  const evidence = normalizeEvidence(fact.evidence, rootDir, false);
  return deepFreeze({
    occurrenceId,
    providerFactId: fact.providerFactId,
    ...(fact.semanticQualifier ? { semanticQualifier: fact.semanticQualifier } : {}),
    evidence,
    confidence: fact.confidence ?? null,
    ...(fact.producerFields ? { producerFields: canonicalJsonClone(fact.producerFields) } : {}),
  });
}

function normalizeFactOccurrence(
  snapshot: ProviderSnapshot,
  fact: ProviderFactOccurrence,
  from: string,
  to: string,
  rootDir: string
): FactOccurrence {
  const evidence = normalizeEvidence(fact.evidence, rootDir, false);
  if (!evidence.file) throw new Error('Provider fact evidence.file is required');
  return createFactOccurrence({
    kind: fact.kind,
    from,
    to,
    semanticQualifier: fact.semanticQualifier,
    provider: {
      instanceId: snapshot.identity.providerInstanceId,
      contractId: snapshot.identity.contractId,
      contractVersion: snapshot.identity.contractVersion,
    },
    providerLocalFactId: fact.providerFactId,
    sourceAnchor: { ...evidence, file: evidence.file },
    confidence: fact.confidence ?? null,
    capabilities: snapshot.capabilities,
    provenance: {
      snapshotId: fact.observedInSnapshotId ?? snapshot.snapshotId,
      workspaceId: snapshot.workspaceId,
      graphNamespace: snapshot.graphNamespace,
      producer: snapshot.provenance.producer,
      producerVersion: snapshot.provenance.producerVersion ?? null,
      compilerVersion: snapshot.provenance.compilerVersion,
      compilerVersionReported: snapshot.provenance.compilerVersionReported,
    },
    producerFields: fact.producerFields,
  });
}

function compatibilityProjectionGraph(input: {
  readonly rootDir: string;
  readonly tsconfigPath: string;
  readonly nodes: readonly ProjectGraphSourceNode[];
  readonly edges: readonly ProjectGraphSourceEdge[];
}) {
  const nodes = Object.freeze(
    input.nodes.map((node) => deepFreeze({ ...node, sourceId: node.id }))
  );
  const edges = Object.freeze([...input.edges]);
  const fingerprint = stableDigest({ nodes, edges });
  return deepFreeze({
    contractVersion: '1.0' as const,
    rootDir: input.rootDir,
    tsconfigPath: input.tsconfigPath,
    nodes,
    edges,
    provenance: {
      adapter: PROVIDER_SNAPSHOT_NORMALIZER_ID,
      producer: PROVIDER_SNAPSHOT_NORMALIZER_ID,
    },
    fingerprint,
  });
}

function projectCompatibilityEdge(accumulator: EdgeAccumulator): ProjectGraphSourceEdge {
  const occurrences = [...accumulator.occurrences].sort((left, right) =>
    compareText(left.occurrenceId, right.occurrenceId)
  );
  const qualifiers = [...new Set(occurrences.flatMap((item) => item.semanticQualifier ?? []))].sort(
    compareText
  );
  return deepFreeze({
    kind: accumulator.kind,
    from: accumulator.from,
    to: accumulator.to,
    ...(occurrences[0]?.evidence ? { evidence: occurrences[0].evidence } : {}),
    occurrenceCount: occurrences.length,
    providerOccurrences: occurrences,
    ...(qualifiers.length === 1 ? { semanticQualifier: qualifiers[0] } : {}),
    ...(qualifiers.length > 1 ? { semanticQualifiers: qualifiers } : {}),
    compatibilityProjection: true,
  });
}

function normalizeDiagnostics(
  snapshot: ProviderSnapshot,
  nodeMap: ReadonlyMap<string, string>,
  rootDir: string
): CanonicalDiagnostic[] {
  return snapshot.diagnostics
    .map((diagnostic, index) => normalizeDiagnostic(diagnostic, index, nodeMap, rootDir))
    .sort(
      (left, right) =>
        compareText(left.file ?? '', right.file ?? '') ||
        left.startLine - right.startLine ||
        compareText(left.id, right.id)
    );
}

function normalizeDiagnostic(
  diagnostic: ProviderDiagnostic,
  index: number,
  nodeMap: ReadonlyMap<string, string>,
  rootDir: string
): CanonicalDiagnostic {
  requireNonEmpty(diagnostic.message, `diagnostics[${index}].message`);
  const evidence = diagnostic.evidence
    ? normalizeEvidence(diagnostic.evidence, rootDir, false)
    : undefined;
  const unknownRelatedProviderNodeIds: string[] = [];
  const relatedNodeIds = (diagnostic.relatedProviderNodeIds ?? []).flatMap((providerNodeId) => {
    const canonicalId = nodeMap.get(providerNodeId);
    if (!canonicalId) {
      unknownRelatedProviderNodeIds.push(providerNodeId);
      return [];
    }
    return [canonicalId];
  });
  relatedNodeIds.sort(compareText);
  unknownRelatedProviderNodeIds.sort(compareText);
  const id =
    diagnostic.providerDiagnosticId ??
    `provider-diagnostic:${stableDigest({ index, diagnostic, relatedNodeIds })}`;
  return deepFreeze({
    id,
    ...(diagnostic.code !== undefined ? { code: diagnostic.code } : {}),
    category: diagnostic.category ?? 'compiler',
    severity: diagnostic.severity,
    message: diagnostic.message,
    ...(evidence?.file ? { file: evidence.file } : {}),
    startLine: evidence?.startLine ?? 1,
    ...(evidence?.startCol !== undefined ? { startCol: evidence.startCol } : {}),
    ...(evidence?.endLine !== undefined ? { endLine: evidence.endLine } : {}),
    ...(evidence?.endCol !== undefined ? { endCol: evidence.endCol } : {}),
    ...(relatedNodeIds.length ? { relatedNodeIds } : {}),
    ...(diagnostic.producerFields || unknownRelatedProviderNodeIds.length
      ? {
          producerFields: canonicalJsonClone({
            ...(diagnostic.producerFields ?? {}),
            ...(diagnostic.providerDiagnosticId
              ? { providerDiagnosticId: diagnostic.providerDiagnosticId }
              : {}),
            ...(unknownRelatedProviderNodeIds.length ? { unknownRelatedProviderNodeIds } : {}),
          }),
        }
      : {}),
  });
}

function canonicalProviderFile(node: ProviderNode, rootDir: string): string {
  if (!node.file) return `_provider/${encodeIdentitySegment(node.providerNodeId)}`;
  return normalizeProviderPath(node.file, rootDir, node.external === true);
}

function normalizeEvidence(
  evidence: ProjectGraphEvidence,
  rootDir: string,
  external: boolean
): ProjectGraphEvidence {
  const clone = canonicalJsonClone(evidence);
  if (!clone.file) return clone;
  return deepFreeze({
    ...clone,
    file: normalizeProviderPath(clone.file, rootDir, external),
  });
}

function normalizeProviderPath(value: string, rootDir: string, external: boolean): string {
  requireNonEmpty(value, 'provider file');
  const resolved = path.isAbsolute(value) ? canonicalFsPath(value) : path.resolve(rootDir, value);
  const relative = path.relative(rootDir, resolved).replace(/\\/g, '/');
  if (relative === '..' || relative.startsWith('../')) {
    if (!external) throw new Error(`Provider file escapes workspace root: ${value}`);
    return `_external/${stableDigest(resolved).slice(0, 16)}/${path.basename(resolved)}`;
  }
  return relative || '.';
}

function encodeIdentitySegment(value: string): string {
  requireNonEmpty(value, 'identity segment');
  return encodeURIComponent(value);
}

function encodeQualifiedName(value: string): string {
  requireNonEmpty(value, 'qualified name');
  return value.replace(/%/g, '%25').replace(/#/g, '%23').replace(/:/g, '%3A');
}

function compareEdges(left: ProjectGraphSourceEdge, right: ProjectGraphSourceEdge): number {
  return (
    compareText(left.kind, right.kind) ||
    compareText(left.from, right.from) ||
    compareText(left.to, right.to)
  );
}

function requireNonEmpty(value: string, field: string): void {
  if (value.trim() === '') throw new Error(`${field} must be a non-empty string`);
}

function stableDigest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalJsonClone(value)))
    .digest('hex');
}

function canonicalJsonClone<T>(value: T, ancestors = new WeakSet<object>()): T {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Provider payload contains a non-finite number');
    return value;
  }
  if (typeof value !== 'object') {
    throw new Error(`Provider payload contains a non-JSON ${typeof value} value`);
  }
  if (ancestors.has(value)) throw new Error('Provider payload contains a circular value');
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((child) => canonicalJsonClone(child, ancestors)) as T;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Provider payload contains a non-JSON object');
    }
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => compareText(left, right))) {
      result[key] = canonicalJsonClone(child, ancestors);
    }
    return result as T;
  } finally {
    ancestors.delete(value);
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
