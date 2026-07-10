/**
 * LSP-oriented read projection over one canonical graph revision.
 * @packageDocumentation
 */

import * as path from 'node:path';
import { GraphAnalysisService } from '../graph-analysis';
import type { CanonicalGraphNode, CanonicalProjectGraph } from '../indexer';

export interface CanonicalLspSymbolLocation {
  readonly node: CanonicalGraphNode;
  readonly filePath: string;
  readonly line: number;
}

export interface CanonicalLspRelatedSymbol extends CanonicalLspSymbolLocation {
  readonly relationshipType: string;
}

/** Read-only canonical graph queries needed by the LSP surface. */
export class CanonicalGraphLspView {
  readonly analysis: GraphAnalysisService;

  constructor(readonly graph: CanonicalProjectGraph) {
    this.analysis = new GraphAnalysisService(graph);
  }

  /** Resolve the innermost declaration containing a one-based line and zero-based column. */
  symbolAtPosition(
    filePath: string,
    line: number,
    character = 0
  ): CanonicalLspSymbolLocation | null {
    const candidates = this.symbolsInFile(filePath).filter((symbol) =>
      containsPosition(symbol.node, line, character)
    );
    candidates.sort(
      (left, right) =>
        rangeSize(left.node) - rangeSize(right.node) ||
        right.line - left.line ||
        (right.node.evidence?.startCol ?? 0) - (left.node.evidence?.startCol ?? 0) ||
        compareText(left.node.id, right.node.id)
    );
    return candidates[0] ?? null;
  }

  /** All declarations in a source file, ordered by location and canonical id. */
  symbolsInFile(filePath: string): CanonicalLspSymbolLocation[] {
    const absolute = path.resolve(filePath);
    const relative = normalizePath(path.relative(this.graph.rootDir, absolute));
    return this.graph.nodes
      .filter((node) => {
        const sourceFile = node.file ?? node.evidence?.file;
        return sourceFile ? matchesFile(sourceFile, absolute, relative, this.graph.rootDir) : false;
      })
      .map((node) => locationFor(node, this.graph.rootDir))
      .sort((left, right) => left.line - right.line || compareText(left.node.id, right.node.id));
  }

  /** Direct dependent/dependency counts with explicit edge direction. */
  impactCounts(symbolId: string): { dependents: number; dependencies: number } {
    return {
      dependents: this.analysis.dependents(symbolId, { external: 'exclude' }).length,
      dependencies: this.analysis.dependencies(symbolId, { external: 'exclude' }).length,
    };
  }

  /** Recursive incoming-edge change impact. */
  impact(symbolId: string, maxDepth: number): readonly string[] {
    return this.analysis
      .impact(symbolId, { maxDepth, external: 'boundary' })
      .affected.map((value) => value.node.id);
  }

  /** Deterministic union of incoming and outgoing neighbors. */
  related(symbolId: string, limit: number): CanonicalLspRelatedSymbol[] {
    const byId = new Map<string, CanonicalLspRelatedSymbol>();
    for (const neighbor of [
      ...this.analysis.dependencies(symbolId, { external: 'exclude' }),
      ...this.analysis.dependents(symbolId, { external: 'exclude' }),
    ]) {
      if (!sourceFileFor(neighbor.node) || byId.has(neighbor.node.id)) continue;
      byId.set(neighbor.node.id, {
        ...locationFor(neighbor.node, this.graph.rootDir),
        relationshipType: neighbor.edge.kind,
      });
    }
    return [...byId.values()]
      .sort((left, right) => compareText(left.node.id, right.node.id))
      .slice(0, Math.max(0, limit));
  }

  /** Search named source declarations for workspace/symbol. */
  search(query: string, limit = 50): CanonicalLspSymbolLocation[] {
    const normalizedQuery = query.toLocaleLowerCase();
    return this.graph.nodes
      .filter(
        (node) =>
          node.external !== true &&
          sourceFileFor(node) !== undefined &&
          displayName(node).toLocaleLowerCase().includes(normalizedQuery)
      )
      .map((node) => locationFor(node, this.graph.rootDir))
      .sort(
        (left, right) =>
          compareText(displayName(left.node), displayName(right.node)) ||
          compareText(left.node.id, right.node.id)
      )
      .slice(0, Math.max(0, limit));
  }

  /** Resolve one name using canonical id/qualified/name lookup. */
  findByName(name: string): CanonicalLspSymbolLocation | null {
    const resolution = this.analysis.resolveSymbol(name);
    if (resolution.status === 'found' && sourceFileFor(resolution.node)) {
      return locationFor(resolution.node, this.graph.rootDir);
    }
    // Definitions must not guess. Ambiguous or partial names remain unresolved
    // so the client never jumps to an arbitrary declaration.
    return null;
  }
}

export function canonicalNodeDisplayName(node: CanonicalGraphNode): string {
  return displayName(node);
}

function locationFor(node: CanonicalGraphNode, rootDir: string): CanonicalLspSymbolLocation {
  const file = sourceFileFor(node);
  if (!file) throw new Error(`Canonical graph node has no source file: ${node.id}`);
  return {
    node,
    filePath: path.isAbsolute(file) ? path.normalize(file) : path.resolve(rootDir, file),
    line: node.evidence?.startLine ?? 1,
  };
}

function sourceFileFor(node: CanonicalGraphNode): string | undefined {
  return node.file ?? node.evidence?.file;
}

function matchesFile(
  nodeFile: string,
  absoluteFile: string,
  relativeFile: string,
  rootDir: string
): boolean {
  const normalizedNodeFile = normalizePath(nodeFile);
  if (normalizedNodeFile === relativeFile) return true;
  const absoluteNodeFile = path.isAbsolute(nodeFile)
    ? path.resolve(nodeFile)
    : path.resolve(rootDir, nodeFile);
  return absoluteNodeFile === absoluteFile;
}

function rangeSize(node: CanonicalGraphNode): number {
  const start = node.evidence?.startLine;
  const end = node.evidence?.endLine;
  return start === undefined || end === undefined ? Number.MAX_SAFE_INTEGER : end - start;
}

function containsPosition(node: CanonicalGraphNode, line: number, character: number): boolean {
  const evidence = node.evidence;
  if (!evidence || evidence.startLine === undefined) return false;
  const startLine = evidence.startLine;

  const endLine = evidence.endLine ?? startLine;
  if (line < startLine || line > endLine) return false;

  // Graph-router evidence is one-based; LSP characters are zero-based.
  const column = character + 1;
  if (line === startLine && evidence.startCol !== undefined && column < evidence.startCol) {
    return false;
  }
  if (line === endLine && evidence.endCol !== undefined && column > evidence.endCol) {
    return false;
  }
  return true;
}

function displayName(node: CanonicalGraphNode): string {
  return node.name ?? node.qualifiedName ?? node.id;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
