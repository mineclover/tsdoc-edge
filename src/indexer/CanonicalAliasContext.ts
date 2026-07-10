/**
 * Read-only alias hop context for legacy query consumers.
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GraphAnalysisService } from '../graph-analysis';
import { GraphRepository } from '../storage/GraphRepository';
import { DEFAULT_CANONICAL_GRAPH_DATABASE } from './CanonicalGraphCoordinator';
import type { CanonicalProjectGraph } from './contracts';
import { InMemoryAliasResolver } from './symbol-alias';

/** Active canonical revision plus alias resolver for legacy-to-canonical hops. */
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

  /** Resolve a legacy symbol id to its canonical graph node id. */
  resolveCanonicalId(legacyId: string): string | null {
    return this.resolver.legacyToCanonical(legacyId);
  }

  /** Structural dependency and dependent counts for one canonical node. */
  structuralCounts(canonicalId: string): { dependencies: number; dependents: number } | null {
    if (!this.analysis.index.getNode(canonicalId)) return null;
    return {
      dependencies: this.analysis.dependencies(canonicalId, { external: 'exclude' }).length,
      dependents: this.analysis.dependents(canonicalId, { external: 'exclude' }).length,
    };
  }

  close(): void {
    this.repository.close();
  }
}
