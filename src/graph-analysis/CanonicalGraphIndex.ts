/**
 * Read-only indexes over a canonical project graph.
 * @packageDocumentation
 */

import type {
  CanonicalGraphEdge,
  CanonicalGraphNode,
  CanonicalProjectGraph,
} from '../indexer/contracts';

const EMPTY_NODES: readonly CanonicalGraphNode[] = Object.freeze([]);
const EMPTY_EDGES: readonly CanonicalGraphEdge[] = Object.freeze([]);

/**
 * Builds deterministic lookup and adjacency indexes without importing a
 * compiler runtime, graph-router, or persistence layer.
 * @public
 */
export class CanonicalGraphIndex {
  private readonly nodesById = new Map<string, CanonicalGraphNode>();
  private readonly outgoingById = new Map<string, readonly CanonicalGraphEdge[]>();
  private readonly incomingById = new Map<string, readonly CanonicalGraphEdge[]>();
  private readonly idsByName = new Map<string, readonly string[]>();
  private readonly idsByQualifiedName = new Map<string, readonly string[]>();
  private readonly idsByFile = new Map<string, readonly string[]>();
  private readonly edgesByKind = new Map<string, readonly CanonicalGraphEdge[]>();

  constructor(readonly graph: CanonicalProjectGraph) {
    const outgoing = new Map<string, CanonicalGraphEdge[]>();
    const incoming = new Map<string, CanonicalGraphEdge[]>();
    const byName = new Map<string, string[]>();
    const byQualifiedName = new Map<string, string[]>();
    const byFile = new Map<string, string[]>();
    const byKind = new Map<string, CanonicalGraphEdge[]>();

    for (const node of graph.nodes) {
      this.nodesById.set(node.id, node);
      append(byName, node.name, node.id);
      append(byQualifiedName, node.qualifiedName, node.id);
      append(byFile, node.file, node.id);
    }

    for (const edge of graph.edges) {
      append(outgoing, edge.from, edge);
      append(incoming, edge.to, edge);
      append(byKind, edge.kind, edge);
    }

    freezeMapArrays(outgoing, this.outgoingById, compareEdges);
    freezeMapArrays(incoming, this.incomingById, compareEdges);
    freezeMapArrays(byName, this.idsByName, compareText);
    freezeMapArrays(byQualifiedName, this.idsByQualifiedName, compareText);
    freezeMapArrays(byFile, this.idsByFile, compareText);
    freezeMapArrays(byKind, this.edgesByKind, compareEdges);
  }

  /** Find one node by its canonical id. */
  getNode(id: string): CanonicalGraphNode | undefined {
    return this.nodesById.get(id);
  }

  /** Find all nodes with the same unqualified name. */
  getNodesByName(name: string): readonly CanonicalGraphNode[] {
    return this.nodesForIds(this.idsByName.get(name));
  }

  /** Find all nodes with the same producer-qualified name. */
  getNodesByQualifiedName(name: string): readonly CanonicalGraphNode[] {
    return this.nodesForIds(this.idsByQualifiedName.get(name));
  }

  /** Find all nodes declared in the producer's file key. */
  getNodesByFile(file: string): readonly CanonicalGraphNode[] {
    return this.nodesForIds(this.idsByFile.get(file));
  }

  /** Raw outgoing edges: the source symbol depends on each target symbol. */
  getOutgoingEdges(id: string): readonly CanonicalGraphEdge[] {
    return this.outgoingById.get(id) ?? EMPTY_EDGES;
  }

  /** Raw incoming edges: each source symbol depends on the target symbol. */
  getIncomingEdges(id: string): readonly CanonicalGraphEdge[] {
    return this.incomingById.get(id) ?? EMPTY_EDGES;
  }

  /** Find all edges with an exact raw producer kind. */
  getEdgesByKind(kind: string): readonly CanonicalGraphEdge[] {
    return this.edgesByKind.get(kind) ?? EMPTY_EDGES;
  }

  private nodesForIds(ids: readonly string[] | undefined): readonly CanonicalGraphNode[] {
    if (!ids) return EMPTY_NODES;
    return Object.freeze(
      ids.map((id) => {
        const node = this.nodesById.get(id);
        if (!node) throw new Error(`Canonical graph index lost node: ${id}`);
        return node;
      })
    );
  }
}

function append<T>(map: Map<string, T[]>, key: string | undefined, value: T): void {
  if (!key) return;
  const values = map.get(key);
  if (values) values.push(value);
  else map.set(key, [value]);
}

function freezeMapArrays<T>(
  source: Map<string, T[]>,
  target: Map<string, readonly T[]>,
  compare: (left: T, right: T) => number
): void {
  for (const [key, values] of source) {
    target.set(key, Object.freeze(values.sort(compare)));
  }
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
