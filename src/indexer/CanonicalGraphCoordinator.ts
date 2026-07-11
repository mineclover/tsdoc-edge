/**
 * Shared ProjectIndexer-to-GraphRepository refresh boundary.
 * @packageDocumentation
 */

import * as path from 'node:path';
import {
  type ActiveCanonicalGraphRevision,
  GraphRepository,
  GraphRepositoryConflictError,
} from '../storage/GraphRepository';
import type { CanonicalProjectGraph, ProjectGraphSource } from './contracts';
import { ProjectIndexer } from './ProjectIndexer';
import { materializeAliases } from './symbol-alias';
import { TtscGraphRouterArtifactAdapter } from './TtscGraphRouterArtifactAdapter';

export const DEFAULT_CANONICAL_GRAPH_DATABASE = '.tsdoc/canonical-graph.db' as const;
export const DEFAULT_GRAPH_ROUTER_CONFIG = 'ttsc-graph-router.config.json' as const;
export const DEFAULT_GRAPH_TSCONFIG = 'tsconfig.ttsc.json' as const;

/** Configuration shared by Build, structural analysis, and LSP saved-file refresh. */
export interface CanonicalGraphCoordinatorOptions {
  readonly rootDir: string;
  readonly moduleSpecifier?: string;
  readonly configPath?: string;
  readonly repoId?: string;
  readonly workspaceId?: string;
  readonly graphNamespace?: string;
  readonly tsconfigPath?: string;
  readonly repositoryPath?: string;
  readonly expectedGraphVersion?: string;
  readonly typescriptCompatibilityTarget?: string;
}

/** Injection points for tests and alternate graph producers. */
export interface CanonicalGraphCoordinatorDependencies {
  readonly source?: ProjectGraphSource;
  readonly repository?: GraphRepository;
}

/** Result of a refresh that was either committed or superseded by a newer request. */
export type CanonicalGraphRefreshResult =
  | {
      readonly status: 'committed';
      readonly graph: CanonicalProjectGraph;
      readonly revision: ActiveCanonicalGraphRevision['metadata'];
    }
  | {
      readonly status: 'superseded';
      /** `null` when a queued refresh was coalesced before graph production. */
      readonly requestedFingerprint: string | null;
    };

/**
 * Serializes whole-project graph refreshes at the canonical persistence edge.
 *
 * A generation check prevents an older in-process request from committing after
 * a newer request. A repository compare-and-swap also prevents another process
 * from being overwritten by a stale dump; one fresh retry is allowed.
 *
 * @public
 */
export class CanonicalGraphCoordinator {
  readonly rootDir: string;
  readonly tsconfigPath: string;
  readonly repositoryPath: string;

  private readonly indexer: ProjectIndexer;
  private readonly repository: GraphRepository;
  private readonly ownsRepository: boolean;
  private requestedGeneration = 0;
  private refreshQueue: Promise<void> = Promise.resolve();

  constructor(
    options: CanonicalGraphCoordinatorOptions,
    dependencies: CanonicalGraphCoordinatorDependencies = {}
  ) {
    this.rootDir = path.resolve(options.rootDir);
    this.tsconfigPath = options.tsconfigPath ?? DEFAULT_GRAPH_TSCONFIG;
    this.repositoryPath = path.resolve(
      this.rootDir,
      options.repositoryPath ?? DEFAULT_CANONICAL_GRAPH_DATABASE
    );

    const repoId = options.repoId ?? path.basename(this.rootDir);
    const source =
      dependencies.source ??
      new TtscGraphRouterArtifactAdapter({
        configPath: path.resolve(this.rootDir, options.configPath ?? DEFAULT_GRAPH_ROUTER_CONFIG),
        repoId,
        workspaceId: options.workspaceId ?? repoId,
        graphNamespace: options.graphNamespace ?? `ttsc:${repoId}`,
        moduleSpecifier: options.moduleSpecifier,
        expectedGraphVersion: options.expectedGraphVersion,
        typescriptCompatibilityTarget: options.typescriptCompatibilityTarget,
      });
    this.indexer = new ProjectIndexer(source);
    this.repository = dependencies.repository ?? new GraphRepository(this.repositoryPath);
    this.ownsRepository = dependencies.repository === undefined;
  }

  /** Produce a fresh whole-project graph and atomically make it active. */
  refresh(): Promise<CanonicalGraphRefreshResult> {
    const generation = ++this.requestedGeneration;
    const queued = this.refreshQueue.then(() => this.refreshGeneration(generation));
    this.refreshQueue = queued.then(
      () => undefined,
      () => undefined
    );
    return queued;
  }

  private async refreshGeneration(generation: number): Promise<CanonicalGraphRefreshResult> {
    if (generation !== this.requestedGeneration) {
      return { status: 'superseded', requestedFingerprint: null };
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      if (generation !== this.requestedGeneration) {
        return { status: 'superseded', requestedFingerprint: null };
      }
      const expectedRevisionId = this.repository.readActiveRevision()?.metadata.revisionId ?? null;
      const indexed = await this.indexer.index({
        rootDir: this.rootDir,
        tsconfigPath: this.tsconfigPath,
        refresh: true,
      });
      const graph = indexed.graph;

      if (generation !== this.requestedGeneration) {
        return {
          status: 'superseded',
          requestedFingerprint: graph.fingerprint,
        };
      }

      try {
        const revision = this.repository.replaceActiveRevision(graph, {
          expectedActiveRevisionId: expectedRevisionId,
          aliases: materializeAliases(graph),
          diagnostics: indexed.diagnostics,
        });
        return { status: 'committed', graph, revision };
      } catch (error) {
        if (!(error instanceof GraphRepositoryConflictError) || attempt === 1) throw error;
      }
    }

    throw new Error('Canonical graph refresh exhausted its retry budget');
  }

  /** Read the transactionally complete active revision. */
  readActiveRevision(): ActiveCanonicalGraphRevision | null {
    return this.repository.readActiveRevision();
  }

  /** Cancel pending generations and close the owned repository connection. */
  close(): void {
    this.requestedGeneration++;
    if (this.ownsRepository) this.repository.close();
  }
}

/** Resolve opt-in graph-router settings used by the LSP and CLI. */
export function canonicalGraphOptionsFromEnvironment(
  rootDir: string,
  environment: NodeJS.ProcessEnv = process.env
): CanonicalGraphCoordinatorOptions | null {
  const moduleSpecifier = environment.TSDOC_EDGE_GRAPH_ROUTER_MODULE;
  if (!moduleSpecifier) return null;

  return {
    rootDir,
    moduleSpecifier,
    configPath: environment.TSDOC_EDGE_GRAPH_ROUTER_CONFIG,
    repoId: environment.TSDOC_EDGE_GRAPH_ROUTER_REPO,
    workspaceId: environment.TSDOC_EDGE_GRAPH_WORKSPACE,
    graphNamespace: environment.TSDOC_EDGE_GRAPH_NAMESPACE,
    tsconfigPath: environment.TSDOC_EDGE_GRAPH_TSCONFIG,
    repositoryPath: environment.TSDOC_EDGE_CANONICAL_GRAPH_DB,
  };
}
