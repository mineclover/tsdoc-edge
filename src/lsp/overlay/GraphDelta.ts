/**
 * In-memory canonical graph delta for one dirty file.
 * @packageDocumentation
 */

import * as path from 'node:path';
import type { CanonicalDiagnostic } from '../../indexer/diagnostics-contract';
import type {
  CanonicalGraphEdge,
  CanonicalGraphNode,
  CanonicalProjectGraph,
} from '../../indexer/contracts';
import { formatCanonicalId } from '../../indexer/canonical-id';
import { normalizeLegacyKind } from '../../indexer/legacy-id';
import type { ExtractedSymbol, IncrementalExtractResult } from '../incremental-builder';

export interface GraphDeltaEdgeKey {
  readonly kind: string;
  readonly from: string;
  readonly to: string;
}

/** File-scoped overlay delta applied on top of one saved canonical revision. */
export interface GraphDelta {
  readonly filePath: string;
  readonly baseRevisionId: string;
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
export class GraphDeltaBuilder {
  static fromExtract(options: {
    readonly baseGraph: CanonicalProjectGraph;
    readonly baseRevisionId: string;
    readonly filePath: string;
    readonly extract: IncrementalExtractResult;
  }): GraphDelta {
    const absoluteFile = path.resolve(options.filePath);
    const relativeFile = path
      .relative(options.baseGraph.rootDir, absoluteFile)
      .replace(/\\/g, '/');
    const savedInFile = options.baseGraph.nodes.filter((node) =>
      nodeMatchesFile(node, absoluteFile, relativeFile, options.baseGraph.rootDir)
    );

    const matchedSavedIds = new Set<string>();
    const upsertNodes: CanonicalGraphNode[] = [];

    for (const symbol of options.extract.symbols) {
      const savedPeer = findPositionMatch(savedInFile, symbol);
      if (savedPeer) {
        matchedSavedIds.add(savedPeer.id);
        upsertNodes.push(overlayNodeFromSaved(savedPeer, symbol, relativeFile));
      } else {
        upsertNodes.push(overlayNodeFromSymbol(symbol, relativeFile));
      }
    }

    const remove = savedInFile
      .filter((node) => !matchedSavedIds.has(node.id))
      .map((node) => node.id);

    return Object.freeze({
      filePath: absoluteFile,
      baseRevisionId: options.baseRevisionId,
      nodes: Object.freeze({
        upsert: Object.freeze(upsertNodes),
        remove: Object.freeze(remove),
      }),
      edges: Object.freeze({
        upsert: Object.freeze([]),
        remove: Object.freeze([]),
      }),
      diagnostics: options.extract.errors.length
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
        : undefined,
    });
  }
}

/** Apply one file-scoped delta to a saved canonical graph. */
export function applyGraphDelta(
  base: CanonicalProjectGraph,
  delta: GraphDelta
): CanonicalProjectGraph {
  const absoluteFile = path.resolve(delta.filePath);
  const relativeFile = path.relative(base.rootDir, absoluteFile).replace(/\\/g, '/');
  const removeNodeIds = new Set(delta.nodes.remove);
  const upsertById = new Map(delta.nodes.upsert.map((node) => [node.id, node]));

  const retainedNodes = base.nodes.filter((node) => {
    if (removeNodeIds.has(node.id)) return false;
    return !nodeMatchesFile(node, absoluteFile, relativeFile, base.rootDir);
  });

  const nodes = Object.freeze(
    [...retainedNodes, ...delta.nodes.upsert].sort((left, right) => compareText(left.id, right.id))
  );
  const nodeIds = new Set(nodes.map((node) => node.id));

  const removeEdgeKeys = new Set(
    delta.edges.remove.map((edge) => `${edge.kind}\u0000${edge.from}\u0000${edge.to}`)
  );
  const replacedFileNodeIds = new Set(
    base.nodes
      .filter((node) => nodeMatchesFile(node, absoluteFile, relativeFile, base.rootDir))
      .map((node) => node.id)
  );

  const retainedEdges = base.edges.filter((edge) => {
    const key = `${edge.kind}\u0000${edge.from}\u0000${edge.to}`;
    if (removeEdgeKeys.has(key)) return false;
    if (replacedFileNodeIds.has(edge.from) || replacedFileNodeIds.has(edge.to)) return false;
    if (removeNodeIds.has(edge.from) || removeNodeIds.has(edge.to)) return false;
    return nodeIds.has(edge.from) && nodeIds.has(edge.to);
  });

  const edges = Object.freeze(
    [...retainedEdges, ...delta.edges.upsert]
      .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .sort(
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

function overlayNodeFromSaved(
  saved: CanonicalGraphNode,
  symbol: ExtractedSymbol,
  relativeFile: string
): CanonicalGraphNode {
  return Object.freeze({
    ...saved,
    name: symbol.name,
    qualifiedName: symbol.name,
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

function overlayNodeFromSymbol(symbol: ExtractedSymbol, relativeFile: string): CanonicalGraphNode {
  const kind = normalizeLegacyKind(symbol.type);
  const id = formatCanonicalId(relativeFile, symbol.name, kind, true);
  return Object.freeze({
    id,
    sourceId: id,
    kind,
    name: symbol.name,
    qualifiedName: symbol.name,
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

function findPositionMatch(
  savedNodes: readonly CanonicalGraphNode[],
  symbol: ExtractedSymbol
): CanonicalGraphNode | null {
  const candidates = savedNodes.filter((node) => containsOverlaySymbol(node, symbol));
  candidates.sort(
    (left, right) =>
      rangeSize(left) - rangeSize(right) ||
      (right.evidence?.startLine ?? 0) - (left.evidence?.startLine ?? 0) ||
      compareText(left.id, right.id)
  );
  return candidates[0] ?? null;
}

function containsOverlaySymbol(node: CanonicalGraphNode, symbol: ExtractedSymbol): boolean {
  const evidence = node.evidence;
  if (!evidence?.startLine) return false;
  const startLine = evidence.startLine;
  const endLine = evidence.endLine ?? startLine;
  if (symbol.line < startLine || symbol.line > endLine) return false;
  if (symbol.line === startLine && evidence.startCol !== undefined && symbol.column < evidence.startCol) {
    return false;
  }
  if (symbol.line === endLine && evidence.endCol !== undefined && symbol.endColumn > evidence.endCol) {
    return false;
  }
  const nodeKind = node.kind.toLocaleLowerCase();
  const symbolKind = symbol.type.toLocaleLowerCase();
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
  const absoluteNodeFile = path.isAbsolute(source) ? path.resolve(source) : path.resolve(rootDir, source);
  return absoluteNodeFile === absoluteFile;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
