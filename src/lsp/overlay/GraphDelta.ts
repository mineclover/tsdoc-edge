/**
 * In-memory canonical graph delta for one dirty file.
 * @packageDocumentation
 */

import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { graphEdgeSemantic } from '../../graph-analysis/edge-semantics';
import { formatCanonicalId, parseCanonicalId } from '../../indexer/canonical-id';
import type {
  CanonicalGraphEdge,
  CanonicalGraphNode,
  CanonicalProjectGraph,
} from '../../indexer/contracts';
import type { CanonicalDiagnostic } from '../../indexer/diagnostics-contract';
import { normalizeLegacyKind } from '../../indexer/legacy-id';
import type { ExtractedSymbol, IncrementalExtractResult } from '../incremental-builder';

export interface GraphDeltaEdgeKey {
  readonly kind: string;
  readonly from: string;
  readonly to: string;
}

export const GRAPH_DELTA_CONTRACT_VERSION = '1.0' as const;

export type GraphDeltaRelationshipCoverage = 'none' | 'owned-outgoing-complete';

/** Extractor identity included in every content-addressed delta. */
export interface GraphDeltaExtractorIdentity {
  readonly id: string;
  readonly version: string;
  /**
   * `owned-outgoing-complete` authorizes replacement of execution/type
   * dependency edges owned by declarations in the dirty file.
   */
  readonly relationshipCoverage: GraphDeltaRelationshipCoverage;
}

/** Default syntax-only extractor used for unsaved TypeScript buffers. */
export const LSP_SYNTAX_GRAPH_DELTA_EXTRACTOR: GraphDeltaExtractorIdentity = Object.freeze({
  id: 'tsdoc-edge/lsp-incremental-builder',
  version: '1.0',
  relationshipCoverage: 'none',
});

/** Explicit provider assertion that a removed node and an upserted node share identity. */
export interface GraphDeltaIdentityRemap {
  readonly fromNodeId: string;
  readonly toNodeId: string;
}

/** Provider proof retained when canonical changes originate from a semantic delta. */
export interface GraphDeltaProviderSourceContext {
  readonly kind: 'semantic-provider-delta';
  readonly baseProviderSnapshotId: string;
  readonly nextProviderSnapshotId: string;
  readonly providerDeltaId: string;
  readonly baseProviderIdentityDigest: string;
  readonly baseCapabilityDigest: string;
  readonly providerIdentityDigest: string;
  readonly capabilityDigest: string;
}

/** File-scoped overlay delta applied on top of one saved canonical revision. */
export interface GraphDelta {
  readonly contractVersion: typeof GRAPH_DELTA_CONTRACT_VERSION;
  readonly deltaId: string;
  readonly deltaDigest: string;
  readonly contentDigest: string;
  readonly extractor: GraphDeltaExtractorIdentity;
  readonly sourceContext?: GraphDeltaProviderSourceContext;
  readonly filePath: string;
  readonly relativeFilePath: string;
  readonly baseRevisionId: string;
  readonly baseGraphFingerprint: string;
  readonly identityRemap: readonly GraphDeltaIdentityRemap[];
  readonly nodes: {
    readonly upsert: readonly CanonicalGraphNode[];
    readonly remove: readonly string[];
  };
  readonly edges: {
    readonly upsert: readonly CanonicalGraphEdge[];
    readonly remove: readonly GraphDeltaEdgeKey[];
  };
  readonly diagnostics?: readonly CanonicalDiagnostic[];
}

/** Build a canonical-id GraphDelta from a TS5 syntax overlay extract. */
// biome-ignore lint/complexity/noStaticOnlyClass: Preserve the established GraphDeltaBuilder API.
export class GraphDeltaBuilder {
  static fromExtract(options: {
    readonly baseGraph: CanonicalProjectGraph;
    readonly baseRevisionId: string;
    readonly filePath: string;
    /** Exact unsaved buffer content represented by the extract. */
    readonly content: string;
    readonly extractor?: GraphDeltaExtractorIdentity;
    /** Never inferred: callers/providers must explicitly prove safe rename identity. */
    readonly identityRemap?: readonly GraphDeltaIdentityRemap[];
    readonly extract: IncrementalExtractResult;
  }): GraphDelta {
    requireNonEmpty(options.baseRevisionId, 'baseRevisionId');
    requireNonEmpty(options.baseGraph.fingerprint, 'baseGraph.fingerprint');
    const absoluteFile = path.resolve(options.filePath);
    const relativeFile = path.relative(options.baseGraph.rootDir, absoluteFile).replace(/\\/g, '/');
    if (relativeFile === '..' || relativeFile.startsWith('../')) {
      throw new Error(`GraphDelta file is outside the canonical graph root: ${absoluteFile}`);
    }
    const extractor = freezeExtractor(options.extractor ?? LSP_SYNTAX_GRAPH_DELTA_EXTRACTOR);
    const contentDigest = digestText(options.content);
    const savedInFile = options.baseGraph.nodes.filter((node) =>
      nodeMatchesFile(node, absoluteFile, relativeFile, options.baseGraph.rootDir)
    );

    const projections = projectOverlaySymbols(options.extract.symbols);
    const matchedSavedIds = new Set<string>();
    const upsertNodes: CanonicalGraphNode[] = [];
    const nodeIdsByExtractedId = new Map<string, string[]>();
    const nodeIdsByName = new Map<string, string[]>();
    const allocatedProvisionalIds = new Set<string>();

    for (const projection of projections) {
      const { symbol } = projection;
      const savedPeer = findSavedMatch(savedInFile, projection, matchedSavedIds);
      let node: CanonicalGraphNode;
      if (savedPeer) {
        matchedSavedIds.add(savedPeer.id);
        node = overlayNodeFromSaved(savedPeer, projection, relativeFile);
      } else {
        node = overlayNodeFromSymbol(projection, relativeFile, allocatedProvisionalIds);
      }
      upsertNodes.push(node);
      const extractedIds = nodeIdsByExtractedId.get(symbol.id) ?? [];
      extractedIds.push(node.id);
      nodeIdsByExtractedId.set(symbol.id, extractedIds);
      const namedIds = nodeIdsByName.get(symbol.name) ?? [];
      namedIds.push(node.id);
      nodeIdsByName.set(symbol.name, namedIds);
    }

    const canInferRemovals = options.extract.errors.length === 0;
    const remove = savedInFile
      .filter(
        (node) =>
          canInferRemovals &&
          !matchedSavedIds.has(node.id) &&
          isReliablyObservableSavedNode(node, savedInFile)
      )
      .map((node) => node.id);
    const removedIds = new Set(remove);
    const identityRemap = validateIdentityRemap(
      options.identityRemap ?? [],
      savedInFile,
      removedIds,
      upsertNodes
    );
    const remappedIds = new Set(identityRemap.map((remap) => remap.fromNodeId));
    const dirtyOwnerIds = new Set([...matchedSavedIds, ...remappedIds]);
    const canReplaceOwnedOutgoing =
      extractor.relationshipCoverage === 'owned-outgoing-complete' &&
      options.extract.errors.length === 0;
    const removeEdges = options.baseGraph.edges
      .filter(
        (edge) =>
          (removedIds.has(edge.from) && !remappedIds.has(edge.from)) ||
          (removedIds.has(edge.to) && !remappedIds.has(edge.to)) ||
          (canReplaceOwnedOutgoing &&
            dirtyOwnerIds.has(edge.from) &&
            isReplaceableOwnedDependency(edge.kind))
      )
      .map(edgeKey);
    const upsertEdges = materializeExtractedEdges(
      options.extract,
      nodeIdsByExtractedId,
      nodeIdsByName,
      options.baseGraph,
      new Set(savedInFile.map((node) => node.id))
    );

    const nodes = Object.freeze({
      upsert: Object.freeze(upsertNodes),
      remove: Object.freeze(remove),
    });
    const edges = Object.freeze({
      upsert: Object.freeze(upsertEdges),
      remove: Object.freeze(removeEdges),
    });
    const diagnostics = options.extract.errors.length
      ? Object.freeze(
          options.extract.errors.map((message, index) =>
            Object.freeze({
              id: `overlay-syntax:${relativeFile}:${index}`,
              category: 'graph-integrity' as const,
              severity: 'warning' as const,
              message,
              file: relativeFile,
              startLine: 1,
            })
          )
        )
      : undefined;
    const deltaDigest = digestStableJson({
      contractVersion: GRAPH_DELTA_CONTRACT_VERSION,
      baseRevisionId: options.baseRevisionId,
      baseGraphFingerprint: options.baseGraph.fingerprint,
      relativeFilePath: relativeFile,
      contentDigest,
      extractor,
      identityRemap,
      nodes,
      edges,
      diagnostics: diagnostics ?? [],
    });

    return Object.freeze({
      contractVersion: GRAPH_DELTA_CONTRACT_VERSION,
      deltaId: `graph-delta:${deltaDigest}`,
      deltaDigest,
      contentDigest,
      extractor,
      filePath: absoluteFile,
      relativeFilePath: relativeFile,
      baseRevisionId: options.baseRevisionId,
      baseGraphFingerprint: options.baseGraph.fingerprint,
      identityRemap,
      nodes,
      edges,
      diagnostics,
    });
  }

  /**
   * Build a GraphDelta from already-normalized canonical changes.
   *
   * Provider adapters must call a canonical DeltaNormalizer before this API;
   * raw provider ids are intentionally not accepted here.
   */
  static fromCanonicalChanges(options: {
    readonly baseGraph: CanonicalProjectGraph;
    readonly baseRevisionId: string;
    readonly filePath: string;
    readonly contentDigest: string;
    readonly extractor: GraphDeltaExtractorIdentity;
    readonly sourceContext: GraphDeltaProviderSourceContext;
    readonly identityRemap?: readonly GraphDeltaIdentityRemap[];
    readonly nodes: {
      readonly upsert: readonly CanonicalGraphNode[];
      readonly remove: readonly string[];
    };
    readonly edges: {
      readonly upsert: readonly CanonicalGraphEdge[];
      readonly remove: readonly GraphDeltaEdgeKey[];
    };
    readonly diagnostics?: readonly CanonicalDiagnostic[];
  }): GraphDelta {
    requireNonEmpty(options.baseRevisionId, 'baseRevisionId');
    requireNonEmpty(options.baseGraph.fingerprint, 'baseGraph.fingerprint');
    requireNonEmpty(options.contentDigest, 'contentDigest');
    const absoluteFile = path.resolve(options.filePath);
    const relativeFile = path.relative(options.baseGraph.rootDir, absoluteFile).replace(/\\/g, '/');
    if (relativeFile === '..' || relativeFile.startsWith('../')) {
      throw new Error(`GraphDelta file is outside the canonical graph root: ${absoluteFile}`);
    }
    const extractor = freezeExtractor(options.extractor);
    const sourceContext = freezeProviderSourceContext(options.sourceContext);
    assertUnique(options.nodes.upsert, (node) => node.id, 'canonical node upsert');
    assertUnique(options.nodes.remove, (nodeId) => nodeId, 'canonical node removal');
    const nodes = Object.freeze({
      upsert: Object.freeze(
        [...options.nodes.upsert].sort((left, right) => compareText(left.id, right.id))
      ),
      remove: Object.freeze([...options.nodes.remove].sort(compareText)),
    });
    const identityRemap = validateIdentityRemap(
      options.identityRemap ?? [],
      options.baseGraph.nodes.filter((node) =>
        nodeMatchesFile(node, absoluteFile, relativeFile, options.baseGraph.rootDir)
      ),
      new Set(nodes.remove),
      nodes.upsert
    );
    assertUnique(options.edges.upsert, graphEdgeKey, 'canonical edge upsert');
    assertUnique(options.edges.remove, graphEdgeKey, 'canonical edge removal');
    const edges = Object.freeze({
      upsert: Object.freeze([...options.edges.upsert].sort(compareCanonicalEdges)),
      remove: Object.freeze(
        [...options.edges.remove].sort(
          (left, right) =>
            compareText(left.kind, right.kind) ||
            compareText(left.from, right.from) ||
            compareText(left.to, right.to)
        )
      ),
    });
    validateCanonicalChangeSet(
      options.baseGraph,
      absoluteFile,
      relativeFile,
      nodes,
      edges,
      identityRemap
    );
    const diagnostics = options.diagnostics
      ? Object.freeze(
          [...options.diagnostics].sort(
            (left, right) =>
              compareText(left.file ?? '', right.file ?? '') ||
              left.startLine - right.startLine ||
              compareText(left.id, right.id)
          )
        )
      : undefined;
    const deltaDigest = digestStableJson({
      contractVersion: GRAPH_DELTA_CONTRACT_VERSION,
      baseRevisionId: options.baseRevisionId,
      baseGraphFingerprint: options.baseGraph.fingerprint,
      relativeFilePath: relativeFile,
      contentDigest: options.contentDigest,
      extractor,
      sourceContext,
      identityRemap,
      nodes,
      edges,
      diagnostics: diagnostics ?? [],
    });

    return Object.freeze({
      contractVersion: GRAPH_DELTA_CONTRACT_VERSION,
      deltaId: `graph-delta:${deltaDigest}`,
      deltaDigest,
      contentDigest: options.contentDigest,
      extractor,
      sourceContext,
      filePath: absoluteFile,
      relativeFilePath: relativeFile,
      baseRevisionId: options.baseRevisionId,
      baseGraphFingerprint: options.baseGraph.fingerprint,
      identityRemap,
      nodes,
      edges,
      diagnostics,
    });
  }
}

/** Identifies the persisted graph revision on which deltas were built. */
export interface CodeGraphRevision {
  readonly revisionId: string;
  readonly graph: CanonicalProjectGraph;
}

/** A transient code graph that must never be confused with a persisted revision. */
export interface EffectiveCodeGraph {
  readonly viewKind: 'effective-code-graph';
  readonly baseRevisionId: string;
  readonly baseGraphFingerprint: string;
  readonly effectiveViewId: string;
  readonly deltaIds: readonly string[];
  readonly graph: CanonicalProjectGraph;
}

/** Apply one validated file-scoped delta to its persisted base revision. */
export function applyGraphDelta(base: CodeGraphRevision, delta: GraphDelta): EffectiveCodeGraph {
  return composeGraphDeltas(base, [delta]);
}

/**
 * Compose dirty-file deltas in normalized file order against one saved revision.
 * Every delta must name the same revision and base graph fingerprint.
 */
export function composeGraphDeltas(
  base: CodeGraphRevision,
  deltas: readonly GraphDelta[]
): EffectiveCodeGraph {
  validateRevision(base);
  const ordered = [...deltas].sort(compareDeltas);
  const seenFiles = new Set<string>();
  for (const delta of ordered) {
    validateDeltaBase(base, delta);
    if (seenFiles.has(delta.relativeFilePath)) {
      throw new Error(`Duplicate GraphDelta for file: ${delta.relativeFilePath}`);
    }
    seenFiles.add(delta.relativeFilePath);
  }

  const graph = applyGraphDeltaContent(base.graph, ordered);

  const effectiveGraphDigest = digestStableJson({ nodes: graph.nodes, edges: graph.edges });
  const effectiveGraphFingerprint = `effective:${effectiveGraphDigest}`;
  const deltaIds = Object.freeze(ordered.map((delta) => delta.deltaId));
  const effectiveViewDigest = digestStableJson({
    baseRevisionId: base.revisionId,
    baseGraphFingerprint: base.graph.fingerprint,
    deltaIds,
    effectiveGraphFingerprint,
  });
  const effectiveViewId = `effective-code-view:${effectiveViewDigest}`;
  const effectiveGraph = Object.freeze({
    ...graph,
    fingerprint: effectiveGraphFingerprint,
  });

  return Object.freeze({
    viewKind: 'effective-code-graph' as const,
    baseRevisionId: base.revisionId,
    baseGraphFingerprint: base.graph.fingerprint,
    effectiveViewId,
    deltaIds,
    graph: effectiveGraph,
  });
}

function applyGraphDeltaContent(
  base: CanonicalProjectGraph,
  deltas: readonly GraphDelta[]
): CanonicalProjectGraph {
  let effectiveNodes: readonly CanonicalGraphNode[] = base.nodes;
  for (const delta of deltas) {
    const removeNodeIds = new Set(delta.nodes.remove);
    const upsertNodeIds = new Set(delta.nodes.upsert.map((node) => node.id));
    effectiveNodes = [
      ...effectiveNodes.filter(
        (node) => !removeNodeIds.has(node.id) && !upsertNodeIds.has(node.id)
      ),
      ...delta.nodes.upsert,
    ];
  }
  const nodes = Object.freeze(
    [...effectiveNodes].sort((left, right) => compareText(left.id, right.id))
  );
  const nodeIds = new Set(nodes.map((node) => node.id));

  const removeEdgeKeys = new Set(
    deltas.flatMap((delta) => delta.edges.remove.map((edge) => graphEdgeKey(edge)))
  );
  const identityRemap = collectIdentityRemap(deltas);
  const retainedEdges = base.edges.flatMap((edge): readonly CanonicalGraphEdge[] => {
    const key = graphEdgeKey(edge);
    if (removeEdgeKeys.has(key)) return [];
    const remapped = remapEdge(edge, identityRemap);
    return nodeIds.has(remapped.from) && nodeIds.has(remapped.to) ? [remapped] : [];
  });

  const edgeByKey = new Map<string, CanonicalGraphEdge>();
  for (const edge of retainedEdges) edgeByKey.set(graphEdgeKey(edge), edge);
  for (const delta of deltas) {
    for (const edge of delta.edges.upsert) {
      const remapped = remapEdge(edge, identityRemap);
      if (!nodeIds.has(remapped.from) || !nodeIds.has(remapped.to)) continue;
      edgeByKey.set(graphEdgeKey(remapped), remapped);
    }
  }
  const edges = Object.freeze(
    [...edgeByKey.values()].sort(
      (left, right) =>
        compareText(left.kind, right.kind) ||
        compareText(left.from, right.from) ||
        compareText(left.to, right.to)
    )
  );

  return Object.freeze({
    ...base,
    nodes,
    edges,
  });
}

function collectIdentityRemap(deltas: readonly GraphDelta[]): ReadonlyMap<string, string> {
  const remaps = new Map<string, string>();
  const targets = new Set<string>();
  for (const delta of deltas) {
    for (const remap of delta.identityRemap) {
      if (remaps.has(remap.fromNodeId)) {
        throw new Error(`Duplicate composed identityRemap source: ${remap.fromNodeId}`);
      }
      if (targets.has(remap.toNodeId)) {
        throw new Error(`Duplicate composed identityRemap target: ${remap.toNodeId}`);
      }
      remaps.set(remap.fromNodeId, remap.toNodeId);
      targets.add(remap.toNodeId);
    }
  }
  for (const sourceId of remaps.keys()) {
    if (targets.has(sourceId)) {
      throw new Error(`Composed identityRemap cannot form a chain or cycle through: ${sourceId}`);
    }
  }
  return remaps;
}

function remapEdge(
  edge: CanonicalGraphEdge,
  identityRemap: ReadonlyMap<string, string>
): CanonicalGraphEdge {
  const from = identityRemap.get(edge.from) ?? edge.from;
  const to = identityRemap.get(edge.to) ?? edge.to;
  return from === edge.from && to === edge.to ? edge : Object.freeze({ ...edge, from, to });
}

function overlayNodeFromSaved(
  saved: CanonicalGraphNode,
  projection: OverlaySymbolProjection,
  relativeFile: string
): CanonicalGraphNode {
  const { symbol } = projection;
  return Object.freeze({
    ...saved,
    name: symbol.name,
    // A fallback position match may have less owner context than the producer
    // (for example a declaration inside a namespace). Retaining the saved id
    // requires retaining the producer-qualified lookup key as well.
    qualifiedName: qualifiedNameFor(saved),
    file: relativeFile,
    evidence: Object.freeze({
      file: relativeFile,
      startLine: symbol.line,
      startCol: symbol.column,
      endLine: symbol.endLine,
      endCol: symbol.endColumn,
    }),
  });
}

function overlayNodeFromSymbol(
  projection: OverlaySymbolProjection,
  relativeFile: string,
  allocatedIds: Set<string>
): CanonicalGraphNode {
  const { symbol, kind, qualifiedName } = projection;
  const id = allocateProvisionalId(relativeFile, qualifiedName, kind, allocatedIds);
  return Object.freeze({
    id,
    sourceId: id,
    kind,
    name: symbol.name,
    qualifiedName,
    file: relativeFile,
    evidence: Object.freeze({
      file: relativeFile,
      startLine: symbol.line,
      startCol: symbol.column,
      endLine: symbol.endLine,
      endCol: symbol.endColumn,
    }),
  });
}

interface OverlaySymbolProjection {
  readonly symbol: ExtractedSymbol;
  readonly kind: string;
  readonly qualifiedName: string;
}

function findSavedMatch(
  savedNodes: readonly CanonicalGraphNode[],
  projection: OverlaySymbolProjection,
  claimedIds: ReadonlySet<string>
): CanonicalGraphNode | null {
  const identityMatches = savedNodes.filter(
    (node) =>
      !claimedIds.has(node.id) &&
      normalizeLegacyKind(node.kind) === projection.kind &&
      qualifiedNameFor(node) === projection.qualifiedName
  );
  if (identityMatches.length === 1) return identityMatches[0];

  const candidates = savedNodes.filter(
    (node) => !claimedIds.has(node.id) && containsOverlaySymbol(node, projection.symbol)
  );
  candidates.sort(
    (left, right) =>
      rangeSize(left) - rangeSize(right) ||
      (right.evidence?.startLine ?? 0) - (left.evidence?.startLine ?? 0) ||
      compareText(left.id, right.id)
  );
  return candidates[0] ?? null;
}

function projectOverlaySymbols(
  symbols: readonly ExtractedSymbol[]
): readonly OverlaySymbolProjection[] {
  const qualifiedNames = new Map<ExtractedSymbol, string>();

  const qualifiedNameForSymbol = (
    symbol: ExtractedSymbol,
    visiting = new Set<ExtractedSymbol>()
  ): string => {
    const cached = qualifiedNames.get(symbol);
    if (cached) return cached;
    if (visiting.has(symbol)) return symbol.name;
    visiting.add(symbol);
    const owner = findEnclosingOwner(symbols, symbol);
    const qualifiedName = owner
      ? `${qualifiedNameForSymbol(owner, visiting)}.${symbol.name}`
      : symbol.name;
    visiting.delete(symbol);
    qualifiedNames.set(symbol, qualifiedName);
    return qualifiedName;
  };

  return symbols.map((symbol) => ({
    symbol,
    kind: canonicalOverlayKind(symbol.type),
    qualifiedName: qualifiedNameForSymbol(symbol),
  }));
}

function canonicalOverlayKind(kind: string): string {
  const normalized = normalizeLegacyKind(kind);
  return normalized === 'property' || normalized === 'constant' ? 'variable' : normalized;
}

function findEnclosingOwner(
  symbols: readonly ExtractedSymbol[],
  child: ExtractedSymbol
): ExtractedSymbol | null {
  const owners = symbols.filter(
    (candidate) =>
      candidate !== child && isOwnerKind(candidate.type) && containsRange(candidate, child)
  );
  owners.sort(
    (left, right) =>
      extractedRangeSize(left) - extractedRangeSize(right) ||
      right.line - left.line ||
      right.column - left.column
  );
  return owners[0] ?? null;
}

function isOwnerKind(kind: string): boolean {
  return ['class', 'interface', 'namespace', 'module', 'enum'].includes(normalizeLegacyKind(kind));
}

function containsRange(owner: ExtractedSymbol, child: ExtractedSymbol): boolean {
  return (
    comparePosition(owner.line, owner.column, child.line, child.column) <= 0 &&
    comparePosition(owner.endLine, owner.endColumn, child.endLine, child.endColumn) >= 0
  );
}

function comparePosition(
  leftLine: number,
  leftColumn: number,
  rightLine: number,
  rightColumn: number
): number {
  return leftLine - rightLine || leftColumn - rightColumn;
}

function extractedRangeSize(symbol: ExtractedSymbol): number {
  return (symbol.endLine - symbol.line) * 1_000_000 + symbol.endColumn - symbol.column;
}

function qualifiedNameFor(node: CanonicalGraphNode): string {
  return node.qualifiedName ?? parseCanonicalId(node.id)?.qualifiedName ?? node.name ?? node.id;
}

/** Whether absence from the TS5 syntax extract is strong enough to mean deletion. */
function isReliablyObservableSavedNode(
  node: CanonicalGraphNode,
  savedInFile: readonly CanonicalGraphNode[]
): boolean {
  const kind = normalizeLegacyKind(node.kind);
  if (['class', 'interface', 'function', 'type', 'enum'].includes(kind)) return true;
  if (kind !== 'method') return false;

  const qualifiedName = qualifiedNameFor(node);
  const separator = qualifiedName.lastIndexOf('.');
  if (separator <= 0) return false;
  const ownerName = qualifiedName.slice(0, separator);
  return savedInFile.some((candidate) => {
    const ownerKind = normalizeLegacyKind(candidate.kind);
    return (
      (ownerKind === 'class' || ownerKind === 'interface') &&
      qualifiedNameFor(candidate) === ownerName
    );
  });
}

function allocateProvisionalId(
  relativeFile: string,
  qualifiedName: string,
  kind: string,
  allocatedIds: Set<string>
): string {
  let occurrence = 1;
  let id = formatCanonicalId(relativeFile, qualifiedName, kind, true);
  while (allocatedIds.has(id)) {
    occurrence++;
    id = formatCanonicalId(relativeFile, `${qualifiedName}~${occurrence}`, kind, true);
  }
  allocatedIds.add(id);
  return id;
}

function materializeExtractedEdges(
  extract: IncrementalExtractResult,
  nodeIdsByExtractedId: ReadonlyMap<string, readonly string[]>,
  nodeIdsByName: ReadonlyMap<string, readonly string[]>,
  baseGraph: CanonicalProjectGraph,
  dirtyFileNodeIds: ReadonlySet<string>
): CanonicalGraphEdge[] {
  const workspaceEndpoints = new WorkspaceCanonicalEndpointIndex(
    baseGraph.nodes.filter((node) => !dirtyFileNodeIds.has(node.id))
  );
  const edges = new Map<string, CanonicalGraphEdge>();
  for (const relationship of extract.relationships) {
    const from = resolveLocalExtractedEndpoint(
      relationship.fromSymbol,
      nodeIdsByExtractedId,
      nodeIdsByName
    );
    const to = resolveExtractedTarget(
      relationship.toSymbol,
      nodeIdsByExtractedId,
      nodeIdsByName,
      workspaceEndpoints
    );
    if (!from || !to) continue;
    const edge = Object.freeze({
      kind: relationship.type,
      from,
      to,
      overlayCategory: relationship.category,
      overlayStrength: relationship.strength,
    });
    edges.set(graphEdgeKey(edge), edge);
  }
  return [...edges.values()];
}

function resolveLocalExtractedEndpoint(
  endpoint: string,
  nodeIdsByExtractedId: ReadonlyMap<string, readonly string[]>,
  nodeIdsByName: ReadonlyMap<string, readonly string[]>
): string | null {
  const exact = nodeIdsByExtractedId.get(endpoint);
  if (exact) return exact.length === 1 ? exact[0] : null;
  const byName = nodeIdsByName.get(endpoint);
  return byName?.length === 1 ? byName[0] : null;
}

function resolveExtractedTarget(
  endpoint: string,
  nodeIdsByExtractedId: ReadonlyMap<string, readonly string[]>,
  nodeIdsByName: ReadonlyMap<string, readonly string[]>,
  workspaceEndpoints: WorkspaceCanonicalEndpointIndex
): string | null {
  const exact = nodeIdsByExtractedId.get(endpoint);
  if (exact) return exact.length === 1 ? exact[0] : null;
  const byName = nodeIdsByName.get(endpoint);
  if (byName) return byName.length === 1 ? byName[0] : null;
  return workspaceEndpoints.resolve(endpoint);
}

class WorkspaceCanonicalEndpointIndex {
  private readonly byId = new Map<string, Set<string>>();
  private readonly byQualifiedName = new Map<string, Set<string>>();
  private readonly byName = new Map<string, Set<string>>();

  constructor(nodes: readonly CanonicalGraphNode[]) {
    for (const node of nodes) {
      this.add(this.byId, node.id, node.id);
      this.add(this.byId, node.sourceId, node.id);
      if (node.qualifiedName) this.add(this.byQualifiedName, node.qualifiedName, node.id);
      if (node.name) this.add(this.byName, node.name, node.id);
    }
  }

  resolve(endpoint: string): string | null {
    for (const index of [this.byId, this.byQualifiedName, this.byName]) {
      const ids = index.get(endpoint);
      if (ids) return this.unique(ids);
    }
    return null;
  }

  private add(index: Map<string, Set<string>>, key: string, nodeId: string): void {
    const ids = index.get(key) ?? new Set<string>();
    ids.add(nodeId);
    index.set(key, ids);
  }

  private unique(ids: ReadonlySet<string> | undefined): string | null {
    return ids?.size === 1 ? [...ids][0] : null;
  }
}

function edgeKey(edge: CanonicalGraphEdge): GraphDeltaEdgeKey {
  return Object.freeze({ kind: edge.kind, from: edge.from, to: edge.to });
}

function graphEdgeKey(edge: GraphDeltaEdgeKey): string {
  return `${edge.kind}\u0000${edge.from}\u0000${edge.to}`;
}

function compareDeltas(left: GraphDelta, right: GraphDelta): number {
  return (
    compareText(left.relativeFilePath, right.relativeFilePath) ||
    compareText(left.deltaId, right.deltaId)
  );
}

function compareCanonicalEdges(left: CanonicalGraphEdge, right: CanonicalGraphEdge): number {
  return (
    compareText(left.kind, right.kind) ||
    compareText(left.from, right.from) ||
    compareText(left.to, right.to)
  );
}

function validateCanonicalChangeSet(
  base: CanonicalProjectGraph,
  absoluteFile: string,
  relativeFile: string,
  nodes: GraphDelta['nodes'],
  edges: GraphDelta['edges'],
  identityRemap: readonly GraphDeltaIdentityRemap[]
): void {
  const baseNodes = new Map(base.nodes.map((node) => [node.id, node]));
  const dirtyBaseNodes = base.nodes.filter((node) =>
    nodeMatchesFile(node, absoluteFile, relativeFile, base.rootDir)
  );
  const dirtyBaseIds = new Set(dirtyBaseNodes.map((node) => node.id));
  const removedIds = new Set(nodes.remove);
  const upsertIds = new Set(nodes.upsert.map((node) => node.id));
  for (const nodeId of nodes.remove) {
    const node = baseNodes.get(nodeId);
    if (!node) throw new Error(`GraphDelta removes an unknown canonical node: ${nodeId}`);
    if (!dirtyBaseIds.has(nodeId)) {
      throw new Error(`GraphDelta removes a node outside its file scope: ${nodeId}`);
    }
    if (upsertIds.has(nodeId)) {
      throw new Error(`GraphDelta cannot remove and upsert the same node id: ${nodeId}`);
    }
  }
  for (const node of nodes.upsert) {
    const parsed = parseCanonicalId(node.id);
    if (!parsed || parsed.kind !== node.kind) {
      throw new Error(`GraphDelta upsert has an invalid canonical node id: ${node.id}`);
    }
    if (!nodeMatchesFile(node, absoluteFile, relativeFile, base.rootDir)) {
      throw new Error(`GraphDelta upserts a node outside its file scope: ${node.id}`);
    }
  }

  const nodeIdsAfter = new Set(
    base.nodes.filter((node) => !removedIds.has(node.id)).map((node) => node.id)
  );
  for (const nodeId of upsertIds) nodeIdsAfter.add(nodeId);
  const baseEdges = new Map(base.edges.map((edge) => [graphEdgeKey(edge), edge]));
  const remap = new Map(identityRemap.map((entry) => [entry.fromNodeId, entry.toNodeId]));
  for (const edge of edges.remove) {
    const existing = baseEdges.get(graphEdgeKey(edge));
    if (!existing) {
      throw new Error(
        `GraphDelta removes an unknown canonical edge: ${edge.kind} ${edge.from} -> ${edge.to}`
      );
    }
    if (
      !dirtyBaseIds.has(existing.from) &&
      !removedIds.has(existing.from) &&
      !removedIds.has(existing.to)
    ) {
      throw new Error(
        `GraphDelta removes an edge outside its file scope: ${edge.kind} ${edge.from} -> ${edge.to}`
      );
    }
  }
  for (const edge of edges.upsert) {
    if (!nodeIdsAfter.has(edge.from) || !nodeIdsAfter.has(edge.to)) {
      throw new Error(
        `GraphDelta upsert has an unknown endpoint: ${edge.kind} ${edge.from} -> ${edge.to}`
      );
    }
    if (dirtyBaseIds.has(edge.from) || upsertIds.has(edge.from)) continue;
    const remappedBase = base.edges.some((baseEdge) => {
      const remappedKey = graphEdgeKey({
        kind: baseEdge.kind,
        from: remap.get(baseEdge.from) ?? baseEdge.from,
        to: remap.get(baseEdge.to) ?? baseEdge.to,
      });
      return remappedKey === graphEdgeKey(edge);
    });
    if (!remappedBase) {
      throw new Error(
        `GraphDelta upserts an edge outside its file ownership: ${edge.kind} ${edge.from} -> ${edge.to}`
      );
    }
  }
}

function assertUnique<T>(values: readonly T[], keyOf: (value: T) => string, label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const key = keyOf(value);
    if (seen.has(key)) throw new Error(`Duplicate ${label}: ${key}`);
    seen.add(key);
  }
}

function validateRevision(base: CodeGraphRevision): void {
  requireNonEmpty(base.revisionId, 'revisionId');
  requireNonEmpty(base.graph.fingerprint, 'graph.fingerprint');
}

function validateDeltaBase(base: CodeGraphRevision, delta: GraphDelta): void {
  validateDeltaIdentity(delta);
  if (delta.baseRevisionId !== base.revisionId) {
    throw new Error(
      `GraphDelta base revision mismatch: expected ${base.revisionId}, received ${delta.baseRevisionId}`
    );
  }
  if (delta.baseGraphFingerprint !== base.graph.fingerprint) {
    throw new Error(
      `GraphDelta base fingerprint mismatch: expected ${base.graph.fingerprint}, received ${delta.baseGraphFingerprint}`
    );
  }
  if (delta.sourceContext) {
    const expectedPins: Readonly<Record<string, string>> = {
      providerSnapshotId: delta.sourceContext.baseProviderSnapshotId,
      providerIdentityDigest: delta.sourceContext.baseProviderIdentityDigest,
      providerCapabilityDigest: delta.sourceContext.baseCapabilityDigest,
    };
    for (const [field, expected] of Object.entries(expectedPins)) {
      if (base.graph.provenance[field] !== expected) {
        throw new Error(
          `GraphDelta provider base pin mismatch for ${field}: expected ${expected}, received ${String(base.graph.provenance[field] ?? '<missing>')}`
        );
      }
    }
  }
  validateIdentityRemap(
    delta.identityRemap,
    base.graph.nodes.filter((node) =>
      nodeMatchesFile(node, delta.filePath, delta.relativeFilePath, base.graph.rootDir)
    ),
    new Set(delta.nodes.remove),
    delta.nodes.upsert
  );
  const absoluteFile = path.resolve(delta.filePath);
  const relativeFile = path.relative(base.graph.rootDir, absoluteFile).replace(/\\/g, '/');
  if (
    relativeFile === '..' ||
    relativeFile.startsWith('../') ||
    absoluteFile !== delta.filePath ||
    relativeFile !== delta.relativeFilePath
  ) {
    throw new Error(
      'GraphDelta filePath and relativeFilePath do not match the canonical graph root'
    );
  }
  validateCanonicalChangeSet(
    base.graph,
    absoluteFile,
    relativeFile,
    delta.nodes,
    delta.edges,
    delta.identityRemap
  );
}

function validateDeltaIdentity(delta: GraphDelta): void {
  if (delta.contractVersion !== GRAPH_DELTA_CONTRACT_VERSION) {
    throw new Error(`Unsupported GraphDelta contract version: ${delta.contractVersion}`);
  }
  freezeExtractor(delta.extractor);
  if (delta.sourceContext) freezeProviderSourceContext(delta.sourceContext);
  const expectedDigest = digestStableJson({
    contractVersion: delta.contractVersion,
    baseRevisionId: delta.baseRevisionId,
    baseGraphFingerprint: delta.baseGraphFingerprint,
    relativeFilePath: delta.relativeFilePath,
    contentDigest: delta.contentDigest,
    extractor: delta.extractor,
    ...(delta.sourceContext ? { sourceContext: delta.sourceContext } : {}),
    identityRemap: delta.identityRemap,
    nodes: delta.nodes,
    edges: delta.edges,
    diagnostics: delta.diagnostics ?? [],
  });
  if (delta.deltaDigest !== expectedDigest || delta.deltaId !== `graph-delta:${expectedDigest}`) {
    throw new Error(`GraphDelta identity mismatch for file: ${delta.relativeFilePath}`);
  }
}

function freezeExtractor(extractor: GraphDeltaExtractorIdentity): GraphDeltaExtractorIdentity {
  requireNonEmpty(extractor.id, 'extractor.id');
  requireNonEmpty(extractor.version, 'extractor.version');
  if (
    extractor.relationshipCoverage !== 'none' &&
    extractor.relationshipCoverage !== 'owned-outgoing-complete'
  ) {
    throw new Error(
      `Unsupported GraphDelta relationship coverage: ${extractor.relationshipCoverage}`
    );
  }
  return Object.freeze({
    id: extractor.id,
    version: extractor.version,
    relationshipCoverage: extractor.relationshipCoverage,
  });
}

function freezeProviderSourceContext(
  context: GraphDeltaProviderSourceContext
): GraphDeltaProviderSourceContext {
  if (context.kind !== 'semantic-provider-delta') {
    throw new Error(`Unsupported GraphDelta source context: ${String(context.kind)}`);
  }
  for (const field of [
    'baseProviderSnapshotId',
    'nextProviderSnapshotId',
    'providerDeltaId',
    'baseProviderIdentityDigest',
    'baseCapabilityDigest',
    'providerIdentityDigest',
    'capabilityDigest',
  ] as const) {
    requireNonEmpty(context[field], `sourceContext.${field}`);
  }
  return Object.freeze({ ...context });
}

function validateIdentityRemap(
  remaps: readonly GraphDeltaIdentityRemap[],
  savedInFile: readonly CanonicalGraphNode[],
  removedIds: ReadonlySet<string>,
  upsertNodes: readonly CanonicalGraphNode[]
): readonly GraphDeltaIdentityRemap[] {
  const savedById = new Map(savedInFile.map((node) => [node.id, node]));
  const upsertById = new Map(upsertNodes.map((node) => [node.id, node]));
  const seenFrom = new Set<string>();
  const seenTo = new Set<string>();
  const validated = remaps.map((remap, index) => {
    requireNonEmpty(remap.fromNodeId, `identityRemap[${index}].fromNodeId`);
    requireNonEmpty(remap.toNodeId, `identityRemap[${index}].toNodeId`);
    const source = savedById.get(remap.fromNodeId);
    if (!source) {
      throw new Error(`identityRemap source is not in the dirty file: ${remap.fromNodeId}`);
    }
    if (!removedIds.has(remap.fromNodeId)) {
      throw new Error(`identityRemap source is not removed by this delta: ${remap.fromNodeId}`);
    }
    const target = upsertById.get(remap.toNodeId);
    if (!target) {
      throw new Error(`identityRemap target is not upserted by this delta: ${remap.toNodeId}`);
    }
    if (remap.fromNodeId === remap.toNodeId) {
      throw new Error(`identityRemap must change the node id: ${remap.fromNodeId}`);
    }
    if (normalizeLegacyKind(source.kind) !== normalizeLegacyKind(target.kind)) {
      throw new Error(
        `identityRemap kind mismatch: ${source.kind} ${remap.fromNodeId} -> ${target.kind} ${remap.toNodeId}`
      );
    }
    if (seenFrom.has(remap.fromNodeId)) {
      throw new Error(`Duplicate identityRemap source: ${remap.fromNodeId}`);
    }
    if (seenTo.has(remap.toNodeId)) {
      throw new Error(`Duplicate identityRemap target: ${remap.toNodeId}`);
    }
    seenFrom.add(remap.fromNodeId);
    seenTo.add(remap.toNodeId);
    return Object.freeze({
      fromNodeId: remap.fromNodeId,
      toNodeId: remap.toNodeId,
    });
  });
  for (const sourceId of seenFrom) {
    if (seenTo.has(sourceId)) {
      throw new Error(`identityRemap cannot form a chain or cycle through: ${sourceId}`);
    }
  }
  return Object.freeze(
    validated.sort(
      (left, right) =>
        compareText(left.fromNodeId, right.fromNodeId) || compareText(left.toNodeId, right.toNodeId)
    )
  );
}

function isReplaceableOwnedDependency(kind: string): boolean {
  const semantic = graphEdgeSemantic(kind);
  return (
    semantic.queryPolicies.dependency &&
    (semantic.family === 'execution' || semantic.family === 'type')
  );
}

function requireNonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function digestText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function digestStableJson(value: unknown): string {
  return digestText(JSON.stringify(canonicalJsonValue(value)));
}

function canonicalJsonValue(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new Error('GraphDelta identity contains a non-finite number');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => compareText(left, right)
    )) {
      if (child !== undefined) result[key] = canonicalJsonValue(child);
    }
    return result;
  }
  throw new Error(`GraphDelta identity contains a non-JSON ${typeof value} value`);
}

function containsOverlaySymbol(node: CanonicalGraphNode, symbol: ExtractedSymbol): boolean {
  const evidence = node.evidence;
  if (!evidence?.startLine) return false;
  const startLine = evidence.startLine;
  const endLine = evidence.endLine ?? startLine;
  if (symbol.line < startLine || symbol.line > endLine) return false;
  if (
    symbol.line === startLine &&
    evidence.startCol !== undefined &&
    symbol.column < evidence.startCol
  ) {
    return false;
  }
  if (
    symbol.line === endLine &&
    evidence.endCol !== undefined &&
    symbol.endColumn > evidence.endCol
  ) {
    return false;
  }
  const nodeKind = node.kind.toLocaleLowerCase();
  const symbolKind = canonicalOverlayKind(symbol.type);
  if (nodeKind !== symbolKind) return false;
  const nodeName = node.name ?? node.qualifiedName;
  return nodeName === symbol.name;
}

function rangeSize(node: CanonicalGraphNode): number {
  const start = node.evidence?.startLine;
  const end = node.evidence?.endLine;
  return start === undefined || end === undefined ? Number.MAX_SAFE_INTEGER : end - start;
}

function nodeMatchesFile(
  node: CanonicalGraphNode,
  absoluteFile: string,
  relativeFile: string,
  rootDir: string
): boolean {
  const source = node.file ?? node.evidence?.file;
  if (!source) return false;
  const normalized = source.replace(/\\/g, '/');
  if (normalized === relativeFile) return true;
  const absoluteNodeFile = path.isAbsolute(source)
    ? path.resolve(source)
    : path.resolve(rootDir, source);
  return absoluteNodeFile === absoluteFile;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
