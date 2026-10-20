/**
 * Build command for creating symbol database
 * @doc [[BuildCommand]]
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import {
  CanonicalGraphCoordinator,
  type CanonicalGraphCoordinatorOptions,
  DEFAULT_GRAPH_TSCONFIG,
} from '../indexer';
import { BuildResultSchema } from '../output/schemas';
import { XmlBuilder } from '../output/XmlBuilder';
import { type BuildProgressLevel, BuildService } from '../service/BuildService';
import { BaseCommand, type CommandResult } from './BaseCommand';

export interface BuildCommandDependencies {
  readonly canonicalCoordinatorFactory?: (
    options: CanonicalGraphCoordinatorOptions
  ) => CanonicalGraphCoordinator;
}

/**
 * Command for building symbol database from source files
 *
 * @public
 * @responsibility Build and populate symbol database from TypeScript files
 * @contract Scan source files, extract symbols, and store in database
 *
 * @problem Need to extract all symbols from TypeScript codebase and make them searchable
 * @solves Scans TypeScript files, parses TSDoc, builds symbol graph, stores in SQLite + JSONL
 * @context Foundation for all other CLI commands that query symbol data
 *
 * @functionality
 * - Path validation: Check target directory exists
 * - File scanning: Find all TypeScript files (exclude tests, node_modules)
 * - Symbol extraction: Parse TSDoc and extract metadata
 * - Database storage: Insert into SQLite with indexes
 * - JSONL export: Git-friendly version control
 * - Statistics reporting: Files scanned, symbols found, duration
 *
 * @decision Use async scan with promise-based result
 * @rationale Large codebases require non-blocking I/O, better UX with progress
 * @consequences Slightly more complex error handling, but better performance
 *
 * @depends DatabaseManager, ConfigManager, ASTSymbolExtractor
 * @depType internal
 * @depReason Core infrastructure for symbol extraction and storage
 * @requires DatabaseManager
 * @requires ConfigManager
 * @requires ASTSymbolExtractor
 *
 * @doc [[BuildCommand]]
 */
export class BuildCommand extends BaseCommand {
  private configManager: ConfigManager;

  constructor(
    configManager?: ConfigManager,
    private readonly dependencies: BuildCommandDependencies = {}
  ) {
    super();
    this.configManager = configManager || ConfigManager.getInstance();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'build';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['b'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Build symbol database from source files';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge build [source-directory] [options]

  Default: src
  Options:
    --force          Force full rebuild (ignore file hashes)
    --incremental    Incremental build (only changed files, default)
    --exclude-tests  Exclude test files (.test.ts, .spec.ts) from indexing
    --canonical-graph  Explicitly refresh and persist the canonical ttsc graph revision
    --canonical-only   Skip the legacy symbol DB pass after the canonical refresh
    --router-module=<path>  Built graph-router artifact-source entrypoint
    --router-config=<path>  Router config (default: ttsc-graph-router.config.json)
    --router-repo=<id>      Router repo id (default: project directory name)
    --graph-workspace=<id>  Convention/spec workspace id (default: router repo id)
    --graph-namespace=<id>  Graph namespace (default: ttsc:<router repo id>)
    --graph-tsconfig=<path> Project graph tsconfig (default: tsconfig.ttsc.json)
    --canonical-graph-db=<path> Canonical revision database`;
  }

  // Override print methods to suppress console output (use XML output instead)
  protected printHeader(_title: string): void {}
  protected printSection(_title: string): void {}
  protected printSuccess(_message: string): void {}
  protected printError(_message: string): void {}
  protected printWarning(_message: string): void {}
  protected printInfo(_message: string): void {}

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      // Parse arguments
      const forceRebuild = args.includes('--force');
      const excludeTests = args.includes('--exclude-tests');
      const canonicalOnly = args.includes('--canonical-only');
      const targetPath = this.firstPositionalArgument(args) || 'src';

      if (
        canonicalOnly &&
        !args.includes('--canonical-graph') &&
        process.env.TSDOC_EDGE_CANONICAL_GRAPH !== '1'
      ) {
        return this.failure('--canonical-only requires --canonical-graph', 1);
      }

      this.printHeader('TSDoc Edge - Build Database');

      if (forceRebuild) {
        this.printWarning('Force rebuild enabled - all files will be reprocessed');
      } else {
        this.printInfo('Incremental build enabled - only changed files will be processed');
      }

      if (excludeTests) {
        this.printInfo('Excluding test files from indexing');
      }

      // Canonical-only refresh does not consume the legacy source-directory argument.
      if (!canonicalOnly && !fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        return this.failure(`Path not found: ${targetPath}`);
      }

      const canonicalGraph = await this.refreshCanonicalGraph(args);

      if (canonicalOnly) {
        if (!canonicalGraph) {
          throw new Error('--canonical-only did not produce a canonical graph revision');
        }
        new XmlBuilder(BuildResultSchema)
          .section('statistics', {
            canonicalGraphNodes: canonicalGraph.nodeCount,
            canonicalGraphEdges: canonicalGraph.edgeCount,
          })
          .section('paths', { canonicalGraphDatabase: canonicalGraph.databasePath })
          .section('errors', [])
          .print();
        return this.success(
          `Canonical graph ${canonicalGraph.fingerprint.slice(0, 12)} persisted without legacy enrichment`
        );
      }

      this.printInfo(`Building database from: ${targetPath}`);
      console.log();

      // Setup paths
      const config = this.configManager.get();
      const dbPathConfig = config.paths.databasePath || '.tsdoc.db';
      const jsonlPathConfig = config.paths.jsonlDir || 'docs/data';

      // Use path as-is if absolute, otherwise join with cwd
      const dbPath = path.isAbsolute(dbPathConfig)
        ? dbPathConfig
        : path.join(process.cwd(), dbPathConfig);
      const jsonlPath = path.isAbsolute(jsonlPathConfig)
        ? jsonlPathConfig
        : path.join(process.cwd(), jsonlPathConfig);

      const result = await new BuildService().build({
        targetPath,
        databasePath: dbPath,
        jsonlPath,
        forceRebuild,
        excludeTests,
        onProgress: (message, level) => this.reportProgress(message, level),
      });

      if (result.status === 'up-to-date') {
        return this.success(
          canonicalGraph
            ? `Canonical graph ${canonicalGraph.fingerprint.slice(0, 12)} persisted; no legacy changes detected`
            : 'No changes detected'
        );
      }

      // Output build result as XML
      new XmlBuilder(BuildResultSchema)
        .section('statistics', {
          filesScanned: result.filesScanned,
          symbolsFound: result.symbolsFound,
          symbolsInserted: result.symbolsInserted,
          symbolsCollisions: result.symbolsCollisions,
          relationshipsFound: result.relationshipsFound,
          relationshipsInserted: result.relationshipsInserted,
          relationshipsSkipped: result.relationshipsSkipped,
          docRelationships: result.docRelationships,
          semanticRelationships: result.semanticRelationships,
          inferredRelationships: result.inferredRelationships,
          inheritanceRelationships: result.inheritanceRelationships,
          endpointHandlerRelationships: result.endpointHandlerRelationships,
          endpointsFound: result.endpointsFound,
          endpointsInserted: result.endpointsInserted,
          blocksFound: result.blocksFound,
          blocksInserted: result.blocksInserted,
          blockDependenciesFound: result.blockDependenciesFound,
          entryPointsFound: result.entryPointsFound,
          entryPointsInserted: result.entryPointsInserted,
          exposureAnalyzed: result.exposureAnalyzed,
          durationMs: result.durationMs,
          ...(canonicalGraph
            ? {
                canonicalGraphNodes: canonicalGraph.nodeCount,
                canonicalGraphEdges: canonicalGraph.edgeCount,
              }
            : {}),
        })
        .section('paths', {
          database: dbPath,
          registry: result.registryPath,
          ...(canonicalGraph ? { canonicalGraphDatabase: canonicalGraph.databasePath } : {}),
        })
        .section(
          'errors',
          result.errors.map((err) => ({ message: err }))
        )
        .print();

      return this.success(
        `Built database with ${result.symbolsInserted} symbols${canonicalGraph ? ` and canonical graph ${canonicalGraph.fingerprint.slice(0, 12)}` : ''}`
      );
    });
  }

  /** Route build progress to the print helpers (silenced above in favour of XML output). */
  private reportProgress(message: string, level: BuildProgressLevel): void {
    if (level === 'success') this.printSuccess(message);
    else if (level === 'warning') this.printWarning(message);
    else this.printInfo(message);
  }

  /** Refresh the canonical graph before legacy per-file hash short-circuiting. */
  private async refreshCanonicalGraph(args: string[]): Promise<{
    fingerprint: string;
    nodeCount: number;
    edgeCount: number;
    databasePath: string;
  } | null> {
    const enabled =
      args.includes('--canonical-graph') || process.env.TSDOC_EDGE_CANONICAL_GRAPH === '1';
    if (!enabled) return null;

    const moduleSpecifier =
      this.getOption(args, '--router-module') ?? process.env.TSDOC_EDGE_GRAPH_ROUTER_MODULE;
    if (!moduleSpecifier) {
      throw new Error(
        '--canonical-graph requires --router-module or TSDOC_EDGE_GRAPH_ROUTER_MODULE'
      );
    }

    const rootDir = this.configManager.getProjectRoot();
    const coordinatorOptions: CanonicalGraphCoordinatorOptions = {
      rootDir,
      moduleSpecifier,
      workspaceId:
        this.getOption(args, '--graph-workspace') ?? process.env.TSDOC_EDGE_GRAPH_WORKSPACE,
      graphNamespace:
        this.getOption(args, '--graph-namespace') ?? process.env.TSDOC_EDGE_GRAPH_NAMESPACE,
      typescript: {
        tsconfigPath:
          this.getOption(args, '--graph-tsconfig') ??
          process.env.TSDOC_EDGE_GRAPH_TSCONFIG ??
          DEFAULT_GRAPH_TSCONFIG,
        ...((this.getOption(args, '--router-config') ?? process.env.TSDOC_EDGE_GRAPH_ROUTER_CONFIG)
          ? {
              routerConfigPath:
                this.getOption(args, '--router-config') ??
                process.env.TSDOC_EDGE_GRAPH_ROUTER_CONFIG,
            }
          : {}),
        ...((this.getOption(args, '--router-repo') ?? process.env.TSDOC_EDGE_GRAPH_ROUTER_REPO)
          ? {
              routerRepoId:
                this.getOption(args, '--router-repo') ?? process.env.TSDOC_EDGE_GRAPH_ROUTER_REPO,
            }
          : {}),
      },
      repositoryPath:
        this.getOption(args, '--canonical-graph-db') ?? process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB,
    };
    const coordinator = this.dependencies.canonicalCoordinatorFactory
      ? this.dependencies.canonicalCoordinatorFactory(coordinatorOptions)
      : new CanonicalGraphCoordinator(coordinatorOptions);

    try {
      const refreshed = await coordinator.refresh();
      if (refreshed.status !== 'committed') {
        throw new Error('Canonical graph refresh was superseded unexpectedly');
      }
      return {
        fingerprint: refreshed.graph.fingerprint,
        nodeCount: refreshed.graph.nodes.length,
        edgeCount: refreshed.graph.edges.length,
        databasePath: coordinator.repositoryPath,
      };
    } finally {
      coordinator.close();
    }
  }

  /** Find the source-directory positional argument without consuming option values. */
  private firstPositionalArgument(args: readonly string[]): string | undefined {
    const valuedOptions = new Set([
      '--router-module',
      '--router-config',
      '--router-repo',
      '--graph-workspace',
      '--graph-namespace',
      '--graph-tsconfig',
      '--canonical-graph-db',
    ]);
    for (let index = 0; index < args.length; index++) {
      const argument = args[index];
      if (valuedOptions.has(argument)) {
        index++;
        continue;
      }
      if (!argument.startsWith('-')) return argument;
    }
    return undefined;
  }
}
