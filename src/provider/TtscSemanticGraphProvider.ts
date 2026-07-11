/** SemanticGraphProvider facade for the current ttsc graph-router source. */

import { createHash } from 'node:crypto';
import type {
  ProjectGraphEvidence,
  ProjectGraphInput,
  ProjectGraphSource,
  ProjectGraphSourceEdge,
  ProjectGraphSourceNode,
} from '../indexer/contracts';
import type { CanonicalDiagnostic } from '../indexer/diagnostics-contract';
import {
  type GraphCapabilities,
  type ProviderDiagnostic,
  type ProviderFactOccurrence,
  type ProviderIdentity,
  type ProviderNode,
  type ProviderProjectInput,
  type ProviderProvenance,
  type ProviderSnapshot,
  SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID,
  SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION,
  type SemanticGraphProvider,
  type TypeScriptProviderConfig,
} from './contracts';

export interface TtscSemanticGraphProviderOptions {
  readonly source: ProjectGraphSource;
  readonly providerVersion: string;
  readonly providerInstanceId: string;
  readonly graphNamespace: string;
  readonly typescript: TypeScriptProviderConfig;
}

/**
 * Adapts the saved-file ttsc router lane to the public raw provider contract.
 *
 * The current router artifact may already collapse repeated facts. Therefore
 * this facade declares fact-occurrence completeness as `partial` and never
 * claims incremental-delta support.
 */
export class TtscSemanticGraphProvider implements SemanticGraphProvider {
  private readonly providerIdentity: ProviderIdentity;
  private readonly providerCapabilities: GraphCapabilities;
  private lastProvenance: ProviderProvenance;

  constructor(private readonly options: TtscSemanticGraphProviderOptions) {
    requireNonEmpty(options.providerVersion, 'providerVersion');
    requireNonEmpty(options.providerInstanceId, 'providerInstanceId');
    requireNonEmpty(options.graphNamespace, 'graphNamespace');
    requireNonEmpty(options.typescript.tsconfigPath, 'typescript.tsconfigPath');
    this.providerIdentity = Object.freeze({
      providerId: 'tsdoc-edge/ttsc-graph-router',
      providerVersion: options.providerVersion,
      providerInstanceId: options.providerInstanceId,
      contractId: SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID,
      contractVersion: SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION,
    });
    this.providerCapabilities = deepFreeze({
      nodes: { status: 'complete', version: '1' },
      'fact-occurrences': {
        status: 'partial',
        version: '1',
        details: { reason: 'router-artifact-may-contain-collapsed-edges' },
      },
      'owned-outgoing-relationships': { status: 'unsupported', version: '1' },
      'incremental-delta': { status: 'unsupported', version: '1' },
      'compiler-version': { status: 'partial', version: '1' },
      'unknown-fields': { status: 'complete', version: '1' },
    });
    this.lastProvenance = this.defaultProvenance();
  }

  identity(): ProviderIdentity {
    return this.providerIdentity;
  }

  capabilities(): GraphCapabilities {
    return this.providerCapabilities;
  }

  provenance(): ProviderProvenance {
    return this.lastProvenance;
  }

  async snapshot(input: ProviderProjectInput): Promise<ProviderSnapshot> {
    const loaded = await this.options.source.load({
      rootDir: input.rootDir,
      tsconfigPath: this.options.typescript.tsconfigPath,
      refresh: input.refresh,
    });
    const nodes = loaded.nodes
      .map(toProviderNode)
      .sort((left, right) => compareText(left.providerNodeId, right.providerNodeId));
    const nodesById = new Map(nodes.map((node) => [node.providerNodeId, node]));
    const facts = loaded.edges
      .map((edge) => toProviderFact(edge, nodesById))
      .sort((left, right) => compareText(left.providerFactId, right.providerFactId));
    const diagnostics = (loaded.diagnostics ?? [])
      .map(toProviderDiagnostic)
      .sort((left, right) =>
        compareText(
          left.providerDiagnosticId ?? stableDigest(left),
          right.providerDiagnosticId ?? stableDigest(right)
        )
      );
    const provenance = provenanceFromInput(loaded, this.options.typescript);
    this.lastProvenance = provenance;
    const snapshotId = `provider-snapshot:${stableDigest({
      workspaceId: input.workspaceId,
      graphNamespace: this.options.graphNamespace,
      identity: this.providerIdentity,
      capabilities: this.providerCapabilities,
      nodes,
      facts,
      diagnostics,
      provenance,
    })}`;
    return deepFreeze({
      contractId: SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID,
      contractVersion: SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION,
      snapshotId,
      workspaceId: input.workspaceId,
      graphNamespace: this.options.graphNamespace,
      identity: this.providerIdentity,
      capabilities: this.providerCapabilities,
      nodes,
      facts,
      diagnostics,
      provenance,
    });
  }

  private defaultProvenance(): ProviderProvenance {
    return deepFreeze({
      producer: this.options.source.id,
      compilerVersion: null,
      compilerVersionReported: false,
      typescriptCompatibilityTarget: '7.0',
      providerConfigDigest: providerConfigDigest(this.options.typescript),
    });
  }
}

function toProviderNode(node: ProjectGraphSourceNode): ProviderNode {
  return deepFreeze({
    providerNodeId: node.id,
    kind: node.kind,
    ...(node.name ? { name: node.name } : {}),
    ...(node.qualifiedName ? { qualifiedName: node.qualifiedName } : {}),
    ...(node.file ? { file: node.file } : {}),
    ...(node.exported !== undefined ? { exported: node.exported } : {}),
    ...(node.external !== undefined ? { external: node.external } : {}),
    ...(node.evidence ? { evidence: clone(node.evidence) } : {}),
    ...(unknownFields(node, [
      'id',
      'kind',
      'name',
      'qualifiedName',
      'file',
      'exported',
      'external',
      'evidence',
    ])
      ? {
          producerFields: unknownFields(node, [
            'id',
            'kind',
            'name',
            'qualifiedName',
            'file',
            'exported',
            'external',
            'evidence',
          ]),
        }
      : {}),
  });
}

function toProviderFact(
  edge: ProjectGraphSourceEdge,
  nodesById: ReadonlyMap<string, ProviderNode>
): ProviderFactOccurrence {
  const owner = nodesById.get(edge.from);
  const edgeIdentity = stableDigest({
    kind: edge.kind,
    from: edge.from,
    to: edge.to,
    semanticQualifier: typeof edge.semanticQualifier === 'string' ? edge.semanticQualifier : null,
    evidence: edge.evidence ?? null,
  });
  const evidence = normalizeEdgeEvidence(edge.evidence, owner, edgeIdentity);
  return deepFreeze({
    providerFactId: `router-edge:${edgeIdentity}`,
    kind: edge.kind,
    fromProviderNodeId: edge.from,
    toProviderNodeId: edge.to,
    ...(typeof edge.semanticQualifier === 'string' && edge.semanticQualifier.trim()
      ? { semanticQualifier: edge.semanticQualifier }
      : {}),
    evidence,
    confidence: 1,
    ...(unknownFields(edge, ['kind', 'from', 'to', 'semanticQualifier', 'evidence'])
      ? {
          producerFields: unknownFields(edge, [
            'kind',
            'from',
            'to',
            'semanticQualifier',
            'evidence',
          ]),
        }
      : {}),
  });
}

function normalizeEdgeEvidence(
  evidence: ProjectGraphEvidence | undefined,
  owner: ProviderNode | undefined,
  edgeIdentity: string
): ProjectGraphEvidence {
  const file = evidence?.file ?? owner?.file;
  if (!file) {
    return Object.freeze({
      file: `_provider/unknown-edge-${edgeIdentity.slice(0, 16)}`,
      startLine: 1,
      completeness: 'synthetic-location',
    });
  }
  return deepFreeze({
    ...(evidence ? clone(evidence) : {}),
    file,
    startLine: evidence?.startLine ?? owner?.evidence?.startLine ?? 1,
  });
}

function toProviderDiagnostic(diagnostic: CanonicalDiagnostic): ProviderDiagnostic {
  return deepFreeze({
    providerDiagnosticId: diagnostic.id,
    ...(diagnostic.code !== undefined ? { code: diagnostic.code } : {}),
    category: diagnostic.category,
    severity: diagnostic.severity,
    message: diagnostic.message,
    evidence: {
      ...(diagnostic.file ? { file: diagnostic.file } : {}),
      startLine: diagnostic.startLine,
      ...(diagnostic.startCol !== undefined ? { startCol: diagnostic.startCol } : {}),
      ...(diagnostic.endLine !== undefined ? { endLine: diagnostic.endLine } : {}),
      ...(diagnostic.endCol !== undefined ? { endCol: diagnostic.endCol } : {}),
    },
    ...(diagnostic.relatedNodeIds
      ? { relatedProviderNodeIds: [...diagnostic.relatedNodeIds] }
      : {}),
    ...(diagnostic.producerFields ? { producerFields: clone(diagnostic.producerFields) } : {}),
  });
}

function provenanceFromInput(
  input: ProjectGraphInput,
  config: TypeScriptProviderConfig
): ProviderProvenance {
  const compilerVersion =
    typeof input.provenance.compilerVersion === 'string' && input.provenance.compilerVersion.trim()
      ? input.provenance.compilerVersion
      : null;
  const reported = input.provenance.compilerVersionReported;
  if (reported !== undefined && reported !== (compilerVersion !== null)) {
    throw new Error(
      'ttsc provider compilerVersionReported does not match compilerVersion provenance'
    );
  }
  return deepFreeze({
    producer: input.provenance.producer,
    ...(input.provenance.producerVersion
      ? { producerVersion: input.provenance.producerVersion }
      : {}),
    compilerVersion,
    compilerVersionReported: reported ?? compilerVersion !== null,
    ...(typeof input.provenance.typescriptCompatibilityTarget === 'string'
      ? { typescriptCompatibilityTarget: input.provenance.typescriptCompatibilityTarget }
      : {}),
    ...(typeof input.provenance.artifactContractId === 'string'
      ? { artifactContractId: input.provenance.artifactContractId }
      : {}),
    ...(typeof input.provenance.artifactContractVersion === 'string'
      ? { artifactContractVersion: input.provenance.artifactContractVersion }
      : {}),
    ...(typeof input.provenance.routerFingerprint === 'string'
      ? { artifactFingerprint: input.provenance.routerFingerprint }
      : {}),
    providerConfigDigest: providerConfigDigest(config),
    producerFields: clone(input.provenance),
  });
}

function providerConfigDigest(config: TypeScriptProviderConfig): string {
  return stableDigest({
    tsconfigPath: config.tsconfigPath,
    routerConfigPath: config.routerConfigPath ?? null,
    routerRepoId: config.routerRepoId ?? null,
  });
}

function unknownFields(
  record: Readonly<Record<string, unknown>>,
  known: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const knownSet = new Set(known);
  const entries = Object.entries(record)
    .filter(([key, value]) => !knownSet.has(key) && value !== undefined)
    .sort(([left], [right]) => compareText(left, right));
  return entries.length
    ? deepFreeze(Object.fromEntries(entries.map(([key, value]) => [key, clone(value)])))
    : undefined;
}

function stableDigest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
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
  return JSON.parse(JSON.stringify(value)) as T;
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
