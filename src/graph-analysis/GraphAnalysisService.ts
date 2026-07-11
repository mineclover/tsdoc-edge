/**
 * Canonical graph queries and relationship projections.
 * @packageDocumentation
 */

import type {
  CanonicalGraphEdge,
  CanonicalGraphNode,
  CanonicalProjectGraph,
} from '../indexer/contracts';
import type { UnifiedRelationship } from '../types/relationships';
import { CanonicalGraphIndex } from './CanonicalGraphIndex';
import type {
  ExternalNodePolicy,
  GraphAnalysisSummary,
  GraphDegreeMetric,
  GraphEdgeCategory,
  GraphFilterOptions,
  GraphImpactNode,
  GraphImpactResult,
  GraphMetricsOptions,
  GraphNeighbor,
  GraphTraversalOptions,
  SymbolResolution,
} from './contracts';
import { DEPENDENCY_GRAPH_EDGE_KINDS, graphEdgeSemantic } from './edge-semantics';

export interface RelationshipProjectionOptions {
  /** Include only these raw producer kinds. */
  readonly edgeKinds?: readonly string[];
  /** Include only these presentation categories. */
  readonly categories?: readonly GraphEdgeCategory[];
}

/**
 * Queries one immutable canonical graph revision.
 *
 * Edge direction is explicit. Dependency-family relations use `from -> to` to
 * mean that `from` depends on `to`; ownership/module relations may use another
 * query policy and are excluded from dependency traversal by default.
 * @public
 */
export class GraphAnalysisService {
  readonly index: CanonicalGraphIndex;

  constructor(
    readonly graph: CanonicalProjectGraph,
    private readonly clock: () => Date = () => new Date()
  ) {
    this.index = new CanonicalGraphIndex(graph);
  }

  /** Resolve a canonical id first, then qualified and unqualified names. */
  resolveSymbol(query: string): SymbolResolution {
    const exact = this.index.getNode(query);
    if (exact) return { status: 'found', query, node: exact };

    const candidates = uniqueNodes([
      ...this.index.getNodesByQualifiedName(query),
      ...this.index.getNodesByName(query),
    ]);
    if (candidates.length === 1) return { status: 'found', query, node: candidates[0] };
    if (candidates.length > 1) return { status: 'ambiguous', query, candidates };
    return { status: 'missing', query };
  }

  /** Direct symbols that the seed depends on (outgoing edges). */
  dependencies(symbolId: string, options: GraphFilterOptions = {}): readonly GraphNeighbor[] {
    return this.neighbors(symbolId, 'outgoing', options);
  }

  /** Direct symbols that depend on the seed (incoming edges). */
  dependents(symbolId: string, options: GraphFilterOptions = {}): readonly GraphNeighbor[] {
    return this.neighbors(symbolId, 'incoming', options);
  }

  /**
   * Follow incoming edges to find symbols affected by changing `symbolId`.
   * Traversal is cycle-safe and deterministic.
   */
  impact(symbolId: string, options: GraphTraversalOptions = {}): GraphImpactResult {
    const root = this.requireNode(symbolId);
    const maxDepth = validDepth(options.maxDepth, 3);
    const external = options.external ?? 'boundary';
    const edgeKinds = new Set(options.edgeKinds ?? DEPENDENCY_GRAPH_EDGE_KINDS);
    const visited = new Set([symbolId]);
    const queue: Array<{ id: string; depth: number }> = [{ id: symbolId, depth: 0 }];
    const affected: GraphImpactNode[] = [];

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      if (current.depth >= maxDepth) continue;

      for (const edge of this.index.getIncomingEdges(current.id)) {
        if (!edgeKinds.has(edge.kind)) continue;
        if (visited.has(edge.from)) continue;
        const node = this.requireNode(edge.from);
        if (!allowsExternal(node, external)) continue;

        visited.add(node.id);
        const depth = current.depth + 1;
        affected.push({ node, edge, depth });
        if (!(external === 'boundary' && node.external === true)) {
          queue.push({ id: node.id, depth });
        }
      }
    }

    affected.sort(
      (left, right) =>
        left.depth - right.depth ||
        compareText(left.node.id, right.node.id) ||
        compareEdges(left.edge, right.edge)
    );
    return { root, affected: Object.freeze(affected) };
  }

  /** Degree metrics use unique neighbors as well as raw edge counts. */
  degreeMetrics(options: GraphMetricsOptions = {}): readonly GraphDegreeMetric[] {
    const nodes = options.includeExternalNodes
      ? this.graph.nodes
      : this.graph.nodes.filter((node) => node.external !== true);
    const metrics = nodes.map((node) => {
      const outgoing = this.index.getOutgoingEdges(node.id);
      const incoming = this.index.getIncomingEdges(node.id);
      const dependencyOutgoing = outgoing.filter(
        (edge) => graphEdgeSemantic(edge.kind).queryPolicies.dependency
      );
      const dependencyIncoming = incoming.filter(
        (edge) => graphEdgeSemantic(edge.kind).queryPolicies.dependency
      );
      const dependencies = new Set(dependencyOutgoing.map((edge) => edge.to));
      const dependents = new Set(dependencyIncoming.map((edge) => edge.from));
      const internalDependencies = countNodesByExternal(dependencies, this.index, false);
      const externalDependencies = countNodesByExternal(dependencies, this.index, true);
      const internalDependents = countNodesByExternal(dependents, this.index, false);
      const externalDependents = countNodesByExternal(dependents, this.index, true);
      return {
        node,
        dependencyCount: dependencies.size,
        internalDependencyCount: internalDependencies,
        externalDependencyCount: externalDependencies,
        dependentCount: dependents.size,
        internalDependentCount: internalDependents,
        externalDependentCount: externalDependents,
        outgoingEdgeCount: outgoing.length,
        incomingEdgeCount: incoming.length,
        totalNeighborCount: new Set([...dependencies, ...dependents]).size,
      };
    });

    return Object.freeze(
      metrics.sort(
        (left, right) =>
          right.totalNeighborCount - left.totalNeighborCount ||
          right.dependentCount - left.dependentCount ||
          compareText(left.node.id, right.node.id)
      )
    );
  }

  /** Count raw node/edge kinds without inventing compiler facts. */
  summary(): GraphAnalysisSummary {
    const nodeKinds = countBy(this.graph.nodes, (node) => node.kind);
    const edgeKinds = countBy(this.graph.edges, (edge) => edge.kind);
    const externalNodeCount = this.graph.nodes.filter((node) => node.external === true).length;
    const isolatedNodeCount = this.graph.nodes.filter(
      (node) =>
        this.index.getOutgoingEdges(node.id).length === 0 &&
        this.index.getIncomingEdges(node.id).length === 0
    ).length;

    return Object.freeze({
      fingerprint: this.graph.fingerprint,
      nodeCount: this.graph.nodes.length,
      internalNodeCount: this.graph.nodes.length - externalNodeCount,
      externalNodeCount,
      edgeCount: this.graph.edges.length,
      isolatedNodeCount,
      nodeKinds,
      edgeKinds,
    });
  }

  /**
   * Project supported compiler facts into the existing relationship ontology.
   * Unknown raw kinds stay available through graph queries and are not guessed.
   */
  projectUnifiedRelationships(
    options: RelationshipProjectionOptions = {}
  ): readonly UnifiedRelationship[] {
    const kinds = options.edgeKinds ? new Set(options.edgeKinds) : undefined;
    const categories = options.categories ? new Set(options.categories) : undefined;
    const timestamp = this.clock().toISOString();
    const relationships: UnifiedRelationship[] = [];

    for (const edge of this.graph.edges) {
      if (kinds && !kinds.has(edge.kind)) continue;
      const semantic = graphEdgeSemantic(edge.kind);
      if (categories && !categories.has(semantic.category)) continue;
      if (!semantic.relationshipType || !semantic.relationshipCategory || !semantic.strength) {
        continue;
      }

      const from = this.requireNode(edge.from);
      const to = this.requireNode(edge.to);
      const source = edge.evidence?.file ?? '';
      const line = edge.evidence?.startLine;
      const evidence: UnifiedRelationship['evidence'] = edge.evidence
        ? [
            {
              type: 'code',
              source,
              lineNumber: line,
              confidence: 1,
              context: `@ttsc/graph ${edge.kind}`,
            },
          ]
        : [];
      relationships.push({
        id: `ttsc:${edge.kind}:${encodeURIComponent(edge.from)}:${encodeURIComponent(edge.to)}`,
        type: semantic.relationshipType,
        category: semantic.relationshipCategory,
        from: edge.from,
        to: edge.to,
        direction: 'unidirectional',
        strength: semantic.strength,
        evidence,
        discoveredBy: 'static-analysis',
        confidence: 1,
        filePath: source || undefined,
        line,
        properties: {
          producer: this.graph.provenance.producer,
          rawEdgeKind: edge.kind,
          graphContentFingerprint: this.graph.fingerprint,
          graphContractVersion: this.graph.contractVersion,
          graphRootDir: this.graph.rootDir,
          graphTsconfigPath: this.graph.tsconfigPath,
          graphProvenance: { ...this.graph.provenance },
          fromName: from.qualifiedName ?? from.name ?? from.id,
          toName: to.qualifiedName ?? to.name ?? to.id,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        description: `${displayName(from)} ${edge.kind} ${displayName(to)}`,
      });
    }

    return Object.freeze(relationships);
  }

  private neighbors(
    symbolId: string,
    direction: 'outgoing' | 'incoming',
    options: GraphFilterOptions
  ): readonly GraphNeighbor[] {
    this.requireNode(symbolId);
    const external = options.external ?? 'include';
    const edgeKinds = new Set(options.edgeKinds ?? DEPENDENCY_GRAPH_EDGE_KINDS);
    const edges =
      direction === 'outgoing'
        ? this.index.getOutgoingEdges(symbolId)
        : this.index.getIncomingEdges(symbolId);
    const neighbors = edges.flatMap((edge) => {
      if (!edgeKinds.has(edge.kind)) return [];
      const id = direction === 'outgoing' ? edge.to : edge.from;
      const node = this.requireNode(id);
      return allowsExternal(node, external) ? [{ node, edge }] : [];
    });
    return Object.freeze(neighbors);
  }

  private requireNode(id: string): CanonicalGraphNode {
    const node = this.index.getNode(id);
    if (!node) throw new Error(`Unknown canonical graph node: ${id}`);
    return node;
  }
}

function allowsExternal(node: CanonicalGraphNode, policy: ExternalNodePolicy): boolean {
  return policy !== 'exclude' || node.external !== true;
}

function validDepth(value: number | undefined, fallback: number): number {
  const depth = value ?? fallback;
  if (!Number.isInteger(depth) || depth < 0) {
    throw new Error(`maxDepth must be a non-negative integer, got ${depth}`);
  }
  return depth;
}

function uniqueNodes(nodes: readonly CanonicalGraphNode[]): readonly CanonicalGraphNode[] {
  return Object.freeze(
    [...new Map(nodes.map((node) => [node.id, node])).values()].sort((left, right) =>
      compareText(left.id, right.id)
    )
  );
}

function countBy<T>(
  values: readonly T[],
  keyOf: (value: T) => string
): Readonly<Record<string, number>> {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = keyOf(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.freeze(
    Object.fromEntries([...counts.entries()].sort(([left], [right]) => compareText(left, right)))
  );
}

function countNodesByExternal(
  ids: ReadonlySet<string>,
  index: CanonicalGraphIndex,
  external: boolean
): number {
  let count = 0;
  for (const id of ids) {
    if ((index.getNode(id)?.external === true) === external) count++;
  }
  return count;
}

function displayName(node: CanonicalGraphNode): string {
  return node.qualifiedName ?? node.name ?? node.id;
}

function compareEdges(left: CanonicalGraphEdge, right: CanonicalGraphEdge): number {
  return (
    compareText(left.kind, right.kind) ||
    compareText(left.from, right.from) ||
    compareText(left.to, right.to)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
