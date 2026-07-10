/**
 * Canonical project graph assembler.
 * @packageDocumentation
 */

import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { canonicalFsPath } from './canonical-path';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  PROJECT_GRAPH_CONTRACT_VERSION,
  type ProjectGraphInput,
  type ProjectGraphSource,
  type ProjectIndexRequest,
  type ProjectIndexResult,
} from './contracts';

/**
 * Builds one deterministic graph contract regardless of the calling surface.
 *
 * Batch and LSP persistence must call this class instead of maintaining their
 * own symbol ids or relationship extraction paths.
 *
 * @public
 */
export class ProjectIndexer {
  constructor(private readonly source: ProjectGraphSource) {}

  /** Load, validate, and deterministically assemble a project graph. */
  async index(request: ProjectIndexRequest): Promise<ProjectIndexResult> {
    const expectedRoot = canonicalFsPath(request.rootDir);
    const input = await this.source.load({ ...request, rootDir: expectedRoot });
    const actualRoot = canonicalFsPath(input.rootDir);
    if (actualRoot !== expectedRoot) {
      throw new Error(
        `Project graph root mismatch: requested ${expectedRoot}, received ${actualRoot}`
      );
    }
    const actualTsconfig = canonicalFsPath(input.tsconfigPath);
    if (request.tsconfigPath) {
      const expectedTsconfig = canonicalFsPath(path.resolve(expectedRoot, request.tsconfigPath));
      if (actualTsconfig !== expectedTsconfig) {
        throw new Error(
          `Project graph tsconfig mismatch: requested ${expectedTsconfig}, received ${actualTsconfig}`
        );
      }
    }

    const nodes = this.assembleNodes(input);
    const edges = this.assembleEdges(input, new Set(nodes.map((node) => node.id)));
    const fingerprint = createHash('sha256').update(stableJson({ nodes, edges })).digest('hex');

    return deepFreeze({
      graph: deepFreeze({
        contractVersion: PROJECT_GRAPH_CONTRACT_VERSION,
        rootDir: expectedRoot,
        tsconfigPath: actualTsconfig,
        nodes,
        edges,
        provenance: canonicalJsonClone(input.provenance, 'provenance'),
        fingerprint,
      }),
      diagnostics: Object.freeze(input.diagnostics ? [...input.diagnostics] : []),
    });
  }

  private assembleNodes(input: ProjectGraphInput): readonly CanonicalGraphNode[] {
    const seen = new Set<string>();
    const nodes = input.nodes.map((node, index) => {
      const copy = canonicalJsonClone(node, `nodes[${index}]`);
      requireNonEmpty(copy.id, `nodes[${index}].id`);
      requireNonEmpty(copy.kind, `nodes[${index}].kind`);
      requireCanonicalNodeId(copy.id, copy.kind, index);
      if (Object.getOwnPropertyDescriptor(copy, 'sourceId') !== undefined) {
        throw new Error(`nodes[${index}].sourceId is reserved for canonical provenance`);
      }
      if (seen.has(copy.id)) {
        throw new Error(`Duplicate graph node id: ${copy.id}`);
      }
      seen.add(copy.id);
      return deepFreeze({
        ...copy,
        // @ttsc/graph ids are the canonical equality key for the TS7 compatibility target.
        sourceId: copy.id,
      });
    });

    return Object.freeze(nodes.sort((left, right) => compareText(left.id, right.id)));
  }

  private assembleEdges(
    input: ProjectGraphInput,
    nodeIds: ReadonlySet<string>
  ): readonly CanonicalGraphEdge[] {
    const seen = new Set<string>();
    const edges = input.edges.map((edge, index) => {
      const copy = canonicalJsonClone(edge, `edges[${index}]`);
      requireNonEmpty(copy.kind, `edges[${index}].kind`);
      requireNonEmpty(copy.from, `edges[${index}].from`);
      requireNonEmpty(copy.to, `edges[${index}].to`);
      if (!nodeIds.has(copy.from) || !nodeIds.has(copy.to)) {
        throw new Error(
          `Graph edge has an unknown endpoint: ${copy.kind} ${copy.from} -> ${copy.to}`
        );
      }
      const key = `${copy.kind}\u0000${copy.from}\u0000${copy.to}`;
      if (seen.has(key)) {
        throw new Error(`Duplicate graph edge: ${copy.kind} ${copy.from} -> ${copy.to}`);
      }
      seen.add(key);
      return deepFreeze(copy);
    });

    return Object.freeze(edges.sort(compareEdges));
  }
}

function requireNonEmpty(value: string, field: string): void {
  if (value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function compareEdges(left: CanonicalGraphEdge, right: CanonicalGraphEdge): number {
  return (
    compareText(left.kind, right.kind) ||
    compareText(left.from, right.from) ||
    compareText(left.to, right.to)
  );
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalJsonClone(value, 'fingerprint'));
}

function requireCanonicalNodeId(id: string, kind: string, index: number): void {
  const hash = id.lastIndexOf('#');
  const kindSeparator = id.lastIndexOf(':');
  if (hash <= 0 || kindSeparator <= hash + 1 || id.slice(kindSeparator + 1) !== kind) {
    throw new Error(`nodes[${index}].id must use path#qualifiedName:${kind}, got ${id}`);
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJsonClone<T>(value: T, field: string, ancestors = new WeakSet<object>()): T {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${field} contains a non-finite number`);
    return value;
  }
  if (typeof value !== 'object') {
    throw new Error(`${field} contains a non-JSON ${typeof value} value`);
  }
  if (ancestors.has(value)) throw new Error(`${field} contains a circular value`);
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return Object.freeze(
        value.map((child, index) => canonicalJsonClone(child, `${field}[${index}]`, ancestors))
      ) as T;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${field} contains a non-JSON object`);
    }
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => compareText(left, right)
    )) {
      result[key] = canonicalJsonClone(child, `${field}.${key}`, ancestors);
    }
    return Object.freeze(result) as T;
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
