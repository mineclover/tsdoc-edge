/**
 * Read-only helpers for inspecting active Canonical `@ttsc/graph` and `SpecGraph`
 * revisions from CLI query and status commands.
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { graphEdgeSemantic } from '../graph-analysis/edge-semantics';
import { DEFAULT_CANONICAL_GRAPH_DATABASE } from '../indexer/CanonicalGraphCoordinator';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../indexer/contracts';
import type { SymbolAliasRecord } from '../indexer/symbol-alias';
import { GraphRepository } from '../storage/GraphRepository';
import { SpecGraphRepository } from '../storage/SpecGraphRepository';

/** Default relative path for persisted SpecGraph projections. @public */
export const DEFAULT_SPEC_GRAPH_DATABASE = '.tsdoc/spec-graph.db' as const;

const EXTERNAL_SOURCE_PATTERN = /(?:bundled:|(?:^|[\\/])libs[\\/]|(?:^|[\\/])node_modules[\\/])/;

/**
 * Read-only snapshot of the active Canonical `@ttsc/graph` plane.
 * @public
 */
export interface CanonicalGraphPlaneSnapshot {
  readonly databasePath: string;
  readonly displayPath: string;
  readonly sizeBytes: number;
  readonly activeRevisionId: string;
  readonly retainedRevisions: number;
  readonly storedAt: string;
  readonly rootDir: string;
  readonly totalNodes: number;
  readonly totalEdges: number;
  readonly internalNodes: number;
  readonly internalEdges: number;
  readonly filteredNodes: readonly CanonicalGraphNode[];
  readonly filteredEdges: readonly CanonicalGraphEdge[];
  readonly aliases: readonly SymbolAliasRecord[];
}

/**
 * Read-only snapshot of the active `SpecGraph` plane.
 * @public
 */
export interface SpecGraphPlaneSnapshot {
  readonly databasePath: string;
  readonly displayPath: string;
  readonly sizeBytes: number;
  readonly activeRevisionId: string;
  readonly retainedRevisions: number;
  readonly storedAt: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly bindingCount: number;
}

/**
 * Ontology-projected metadata for a canonical `@ttsc/graph` edge.
 * @public
 */
export interface ProjectedCanonicalOntologyEdge {
  readonly rawKind: string;
  readonly relationshipType: string;
  readonly category: string;
  readonly strength: 'strong' | 'medium' | 'weak';
  readonly direction: 'unidirectional';
}

/**
 * Resolve the configured or default Canonical `@ttsc/graph` SQLite path.
 *
 * @param cwd - Working directory base path
 * @returns Absolute path to the canonical graph SQLite file
 * @public
 */
export function resolveCanonicalGraphDbPath(cwd = process.cwd()): string {
  const envPath = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB?.trim();
  if (envPath) {
    return path.resolve(cwd, envPath);
  }
  try {
    const configPath = ConfigManager.getInstance().get().canonicalGraph?.databasePath;
    if (configPath) {
      return path.resolve(cwd, configPath);
    }
  } catch {
    // Fall back to default canonical graph path when ConfigManager is unavailable.
  }
  return path.resolve(cwd, DEFAULT_CANONICAL_GRAPH_DATABASE);
}

/**
 * Resolve the configured or default `SpecGraph` SQLite path.
 *
 * @param cwd - Working directory base path
 * @returns Absolute path to the SpecGraph SQLite file
 * @public
 */
export function resolveSpecGraphDbPath(cwd = process.cwd()): string {
  const envPath = process.env.TSDOC_EDGE_SPEC_GRAPH_DB?.trim();
  if (envPath) {
    return path.resolve(cwd, envPath);
  }
  return path.resolve(cwd, DEFAULT_SPEC_GRAPH_DATABASE);
}

/**
 * Determine whether a canonical node originates from external/bundled declarations.
 *
 * @param node - Canonical graph node to classify
 * @returns True when the node belongs to external/bundled libraries
 * @public
 */
export function isExternalCanonicalNode(node: CanonicalGraphNode): boolean {
  if (node.external === true) {
    return true;
  }
  const sourceFile = node.file ?? node.evidence?.file ?? '';
  return EXTERNAL_SOURCE_PATTERN.test(sourceFile);
}

/**
 * Read a read-only snapshot of the active Canonical `@ttsc/graph` revision.
 *
 * @param options - Snapshot options (`cwd`, `includeExternal`)
 * @returns Active canonical graph snapshot, or `null` when unavailable
 * @public
 */
export function readCanonicalGraphSnapshot(options?: {
  cwd?: string;
  includeExternal?: boolean;
}): CanonicalGraphPlaneSnapshot | null {
  const cwd = options?.cwd ?? process.cwd();
  const includeExternal = options?.includeExternal ?? false;
  const databasePath = resolveCanonicalGraphDbPath(cwd);
  if (!fs.existsSync(databasePath)) {
    return null;
  }

  let repository: GraphRepository | null = null;
  try {
    const sizeBytes = fs.statSync(databasePath).size;
    repository = new GraphRepository(databasePath, { readOnly: true });
    const active = repository.readActiveRevision();
    if (!active) {
      return null;
    }
    const summaries = repository.listRevisionSummaries();

    const internalNodeSet = new Set<string>();
    const internalNodeList: CanonicalGraphNode[] = [];
    for (const node of active.graph.nodes) {
      if (!isExternalCanonicalNode(node)) {
        internalNodeSet.add(node.id);
        internalNodeList.push(node);
      }
    }

    const internalEdgeList: CanonicalGraphEdge[] = [];
    for (const edge of active.graph.edges) {
      if (internalNodeSet.has(edge.from) && internalNodeSet.has(edge.to)) {
        internalEdgeList.push(edge);
      }
    }

    const filteredNodes = includeExternal ? active.graph.nodes : internalNodeList;
    const filteredEdges = includeExternal ? active.graph.edges : internalEdgeList;
    const relativeDisplay = path.relative(cwd, databasePath) || path.basename(databasePath);

    return {
      databasePath,
      displayPath: relativeDisplay,
      sizeBytes,
      activeRevisionId: active.metadata.revisionId,
      retainedRevisions: summaries.length,
      storedAt: active.metadata.storedAt,
      rootDir: active.graph.rootDir,
      totalNodes: active.graph.nodes.length,
      totalEdges: active.graph.edges.length,
      internalNodes: internalNodeList.length,
      internalEdges: internalEdgeList.length,
      filteredNodes,
      filteredEdges,
      aliases: active.aliases,
    };
  } catch {
    return null;
  } finally {
    repository?.close();
  }
}

/**
 * Read a read-only snapshot of the active `SpecGraph` revision.
 *
 * @param options - Snapshot options (`cwd`)
 * @returns Active SpecGraph snapshot, or `null` when unavailable
 * @public
 */
export function readSpecGraphSnapshot(options?: { cwd?: string }): SpecGraphPlaneSnapshot | null {
  const cwd = options?.cwd ?? process.cwd();
  const databasePath = resolveSpecGraphDbPath(cwd);
  if (!fs.existsSync(databasePath)) {
    return null;
  }

  let repository: SpecGraphRepository | null = null;
  try {
    const sizeBytes = fs.statSync(databasePath).size;
    repository = new SpecGraphRepository(databasePath, { readOnly: true });
    const active = repository.readActiveRevision();
    if (!active) {
      return null;
    }
    const summaries = repository.listRevisionSummaries();
    const activeSummary = summaries.find((summary) => summary.active);
    const relativeDisplay = path.relative(cwd, databasePath) || path.basename(databasePath);

    return {
      databasePath,
      displayPath: relativeDisplay,
      sizeBytes,
      activeRevisionId: active.revisionId,
      retainedRevisions: summaries.length,
      storedAt: activeSummary?.storedAt ?? '',
      nodeCount: active.nodes.length,
      edgeCount: active.edges.length,
      bindingCount: active.bindings.length,
    };
  } catch {
    return null;
  } finally {
    repository?.close();
  }
}

/**
 * Project a canonical `@ttsc/graph` edge into ontology relationship type & category.
 *
 * @param edge - Canonical graph edge
 * @returns Ontology relationship metadata
 * @public
 */
export function projectCanonicalEdgeToOntology(
  edge: CanonicalGraphEdge
): ProjectedCanonicalOntologyEdge {
  const semantic = graphEdgeSemantic(edge.kind);
  const category =
    semantic.relationshipCategory ??
    (semantic.category === 'raw' ? 'structural' : semantic.category);
  return {
    rawKind: edge.kind,
    relationshipType: semantic.relationshipType ?? edge.kind,
    category,
    strength: semantic.strength ?? 'strong',
    direction: 'unidirectional',
  };
}
