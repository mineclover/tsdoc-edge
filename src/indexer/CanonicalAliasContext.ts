/**
 * Read-only alias hop context for legacy query consumers.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @context Read-only bridge enabling legacy CLI and analyzer surfaces to hop from legacy symbol IDs to active canonical `@ttsc/graph` revisions.
 * @functionality Opens the persisted canonical graph repository in read-only mode, resolves legacy or canonical symbol queries, computes internal structural dependency counts, and lists canonical nodes per file.
 * @sideEffect filesystem: Checks whether the canonical graph SQLite database file exists on disk.
 * @sideEffect database: Opens the canonical graph SQLite repository in read-only mode to read the active revision and alias table.
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GraphAnalysisService } from '../graph-analysis';
import { GraphRepository } from '../storage/GraphRepository';
import { DEFAULT_CANONICAL_GRAPH_DATABASE } from './CanonicalGraphCoordinator';
import type { CanonicalGraphNode, CanonicalProjectGraph } from './contracts';
import { InMemoryAliasResolver } from './symbol-alias';

/**
 * Active canonical revision plus alias resolver for legacy-to-canonical hops.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export class CanonicalAliasContext {
  readonly resolver: InMemoryAliasResolver;
  readonly analysis: GraphAnalysisService;
  readonly graph: CanonicalProjectGraph;
  readonly revisionId: string;

  private constructor(
    private readonly repository: GraphRepository,
    active: NonNullable<ReturnType<GraphRepository['readActiveRevision']>>
  ) {
    this.graph = active.graph;
    this.revisionId = active.metadata.revisionId;
    this.resolver = new InMemoryAliasResolver(active.aliases);
    this.analysis = new GraphAnalysisService(active.graph);
  }

  /** Open the active canonical revision when a persisted database exists. */
  static tryOpen(
    rootDir: string,
    databasePath = DEFAULT_CANONICAL_GRAPH_DATABASE
  ): CanonicalAliasContext | null {
    const resolvedPath = path.resolve(rootDir, databasePath);
    if (!fs.existsSync(resolvedPath)) return null;

    try {
      const repository = new GraphRepository(resolvedPath, { readOnly: true });
      const active = repository.readActiveRevision();
      if (!active) {
        repository.close();
        return null;
      }
      return new CanonicalAliasContext(repository, active);
    } catch {
      return null;
    }
  }

  /** Resolve a legacy id, canonical id, or unambiguous canonical name. */
  resolveCanonicalId(query: string): string | null {
    const aliased = this.resolver.legacyToCanonical(query);
    if (aliased) return aliased;

    const resolved = this.analysis.resolveSymbol(query);
    return resolved.status === 'found' ? resolved.node.id : null;
  }

  /** Structural dependency and dependent counts for one canonical node. */
  structuralCounts(canonicalId: string): { dependencies: number; dependents: number } | null {
    if (!this.analysis.index.getNode(canonicalId)) return null;
    return {
      dependencies: this.analysis.dependencies(canonicalId, { external: 'exclude' }).length,
      dependents: this.analysis.dependents(canonicalId, { external: 'exclude' }).length,
    };
  }

  /** Return canonical nodes owned by one source file, independent of legacy aliases. */
  nodesInFile(filePath: string): readonly CanonicalGraphNode[] {
    const absolute = path.resolve(filePath);
    return Object.freeze(
      this.graph.nodes
        .filter((node) => {
          const source = node.file ?? node.evidence?.file;
          if (!source) return false;
          const nodePath = path.isAbsolute(source)
            ? path.normalize(source)
            : path.resolve(this.graph.rootDir, source);
          return nodePath === absolute;
        })
        .sort((left, right) => left.id.localeCompare(right.id))
    );
  }

  close(): void {
    this.repository.close();
  }
}
