/**
 * TSDoc Edge Service
 *
 * @packageDocumentation
 * @module lsp/service
 * @doc [[LSP Integration]]
 *
 * @responsibility Provide TSDoc Edge data to LSP server
 *
 * @problem LSP server needs access to TSDoc Edge analysis
 * @solves Bridge between LSP protocol and TSDoc Edge database
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { DiagnosticSeverity, SymbolKind } from 'vscode-languageserver/node';
import type { ConventionCheckResult } from '../convention/ConventionCheckService';
import {
  type CanonicalDiagnostic,
  CanonicalGraphCoordinator,
  type CanonicalGraphCoordinatorDependencies,
  type CanonicalGraphCoordinatorOptions,
  type CanonicalGraphRefreshResult,
  type CanonicalProjectGraph,
  canonicalGraphOptionsFromEnvironment,
  DEFAULT_CANONICAL_GRAPH_DATABASE,
  parseCanonicalId,
} from '../indexer';
import { ConventionCheckHistoryRepository } from '../storage/ConventionCheckHistoryRepository';
import { GraphRepository } from '../storage/GraphRepository';
import type {
  CountRow,
  HighImpactRow,
  RelTypeCountRow,
  SqliteDatabase,
  SymbolRow,
  UnifiedRelRow,
} from '../types/database';
import { ConfigLoader } from '../utils/ConfigLoader';
import { CacheManager } from './cache-manager';
import { CanonicalGraphLspView, canonicalNodeDisplayName } from './canonical-graph-view';
import { conventionDiagnosticsForFile } from './convention-diagnostics';
import { type DiagnosticInfo, mapCanonicalDiagnostic } from './diagnostics';
import { IncrementalBuilder, type IncrementalExtractResult } from './incremental-builder';
import {
  type CodeGraphRevision,
  EffectiveCodeGraphView,
  GraphDeltaBuilder,
  OverlayGraphView,
} from './overlay';
import { StatementManager } from './statement-manager';
import { isTypeScriptSourcePath } from './uri';

interface UnsavedFileOverlay {
  readonly delta: ReturnType<typeof GraphDeltaBuilder.fromExtract>;
  readonly extract: IncrementalExtractResult;
  readonly content: string;
  readonly generation: number;
}

/**
 * Code Lens information for displaying impact counts on symbols
 *
 * @public
 * @see TsdocEdgeService.getCodeLenses
 */
export interface CodeLensInfo {
  /** Line number (1-based) where the code lens should appear */
  line: number;
  /** Display title showing impact counts (e.g., "↓5 ↑3") */
  title: string;
  /** Unique identifier of the symbol */
  symbolId: string;
}

/**
 * Symbol search result from workspace symbol query
 *
 * @public
 * @see TsdocEdgeService.searchSymbols
 */
export interface SymbolSearchResult {
  /** Symbol name */
  name: string;
  /** LSP SymbolKind (class, function, interface, etc.) */
  kind: SymbolKind;
  /** Absolute file path containing the symbol */
  filePath: string;
  /** Line number (1-based) of the symbol definition */
  line: number;
}

export type { DiagnosticInfo } from './diagnostics';

/** Optional canonical graph wiring for hosts and focused tests. */
export interface TsdocEdgeServiceOptions {
  /** Legacy symbol database override. Relative paths resolve from the workspace root. */
  readonly legacyDatabasePath?: string;
  /** `false` disables canonical reads and refresh even when environment variables exist. */
  readonly canonicalGraph?: CanonicalGraphCoordinatorOptions | false;
  readonly canonicalGraphDependencies?: CanonicalGraphCoordinatorDependencies;
  /** Explicit saved check injection for hosts and focused tests. */
  readonly savedConventionCheck?: ConventionCheckResult;
}

/** Cache names used by the service */
const CACHE_NAMES = {
  SYMBOL: 'symbol',
  CODE_LENS: 'codeLens',
  DIAGNOSTICS: 'diagnostics',
  IMPACT: 'impact',
} as const;

/**
 * TSDoc Edge Service - Bridge between LSP protocol and TSDoc Edge database
 *
 * Provides real-time access to symbol analysis, impact assessment, and
 * architectural diagnostics for LSP clients (VS Code, Vim, Emacs, etc.)
 *
 * @public
 * @example
 * ```typescript
 * const service = new TsdocEdgeService('/path/to/workspace');
 * const lenses = service.getCodeLenses('/path/to/file.ts');
 * const hover = service.getHoverInfo('/path/to/file.ts', 10, 5);
 * service.close();
 * ```
 */
export class TsdocEdgeService {
  /** Root directory of the workspace */
  private workspaceRoot: string;
  /** Path to the configured legacy SQLite database (`.tsdoc.db` by default). */
  private dbPath: string;
  /** SQLite database connection (better-sqlite3, dynamically loaded via require) */
  private db: SqliteDatabase | null = null;

  /** Cache manager for all caches */
  private cacheManager: CacheManager;

  /** Statement manager for prepared SQL statements */
  private statementManager: StatementManager | null = null;

  /** Incremental builder for file updates */
  private incrementalBuilder: IncrementalBuilder | null = null;

  /** Whether incremental mode is enabled */
  private incrementalMode: boolean = false;

  /** Whole-project canonical refresh path used for saved files. */
  private canonicalCoordinator: CanonicalGraphCoordinator | null = null;

  /** Read-only fallback when a Build-created canonical DB exists without router runtime config. */
  private canonicalRepository: GraphRepository | null = null;

  /** Immutable view of the active canonical revision. */
  private canonicalView: CanonicalGraphLspView | null = null;

  /** Active revision observed by the current canonical view. */
  private canonicalRevisionId: string | null = null;

  /** Compiler/router diagnostics for the active canonical revision. */
  private canonicalDiagnostics: readonly CanonicalDiagnostic[] = [];

  /** One exact retained convention result selected for saved-file diagnostics. */
  private savedConventionCheck: ConventionCheckResult | null = null;

  /** Exact retained history record supplying saved convention diagnostics. */
  private savedConventionHistoryId: string | undefined;

  /** TS5 syntax-only results for unsaved buffers; never persisted. */
  private readonly unsavedOverlays = new Map<string, UnsavedFileOverlay>();

  /** Effective canonical graph views for dirty files. */
  private readonly overlayViews = new Map<string, OverlayGraphView>();

  /** Effective workspace graph with every dirty-file delta applied. */
  private workspaceOverlayView: EffectiveCodeGraphView | null = null;

  /** Monotonic token used to avoid clearing an overlay created after a save began. */
  private nextOverlayGeneration = 0;

  /** Saved overlay generations awaiting any successful whole-project refresh. */
  private readonly pendingSavedOverlayGenerations = new Map<string, number>();

  /** Maximum symbols to return in impact analysis */
  private static readonly MAX_IMPACT_SYMBOLS = 100;

  /**
   * Creates a new TsdocEdgeService instance
   *
   * @param workspaceRoot - Root directory of the workspace
   */
  constructor(workspaceRoot: string, options: TsdocEdgeServiceOptions = {}) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.dbPath = this.resolveLegacyDatabasePath(options.legacyDatabasePath);

    // Initialize cache manager with defaults
    this.cacheManager = new CacheManager({
      ttl: 5000,
      maxSize: 500,
      cleanupInterval: 30000,
    });

    // Create named caches
    this.cacheManager.createCache(CACHE_NAMES.SYMBOL);
    this.cacheManager.createCache(CACHE_NAMES.CODE_LENS);
    this.cacheManager.createCache(CACHE_NAMES.DIAGNOSTICS);
    this.cacheManager.createCache(CACHE_NAMES.IMPACT);

    this.initCanonicalGraph(options);
    this.initSavedConventionCheck(options);
    this.initDatabase();
  }

  /**
   * Enable incremental mode for real-time file updates
   *
   * In incremental mode, file changes are immediately reflected in the database
   * rather than requiring a full rebuild.
   *
   * @returns True if incremental mode was enabled successfully
   * @public
   */
  enableIncrementalMode(): boolean {
    if (this.incrementalMode) return true;

    if (this.isCanonicalGraphEnabled()) {
      // Canonical saved-file updates are whole-project refreshes. TS5 remains
      // only as a non-persistent syntax extractor for unsaved buffers.
      this.incrementalBuilder = new IncrementalBuilder(this.workspaceRoot, null);
      this.incrementalMode = true;
      return true;
    }

    // Re-open database in write mode
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    if (!fs.existsSync(this.dbPath)) {
      console.warn(`Cannot enable incremental mode: database not found at ${this.dbPath}`);
      return false;
    }

    let newDb: SqliteDatabase | null = null;
    let newStatementManager: StatementManager | null = null;

    try {
      newDb = new Database(this.dbPath); // Open in write mode

      // Dispose old statement manager before creating new one
      if (this.statementManager) {
        this.statementManager.dispose();
        this.statementManager = null;
      }

      newStatementManager = new StatementManager(newDb, { maxStatements: 50 });

      // Initialize incremental builder
      this.incrementalBuilder = new IncrementalBuilder(this.workspaceRoot, newDb);

      // All succeeded, assign to instance variables
      this.db = newDb;
      this.statementManager = newStatementManager;
      this.incrementalMode = true;

      console.log('Incremental mode enabled');
      return true;
    } catch (error) {
      console.error(`Failed to enable incremental mode: ${error}`);

      // Cleanup on error: dispose newly created resources
      if (newStatementManager) {
        newStatementManager.dispose();
      }
      if (newDb) {
        newDb.close();
      }

      return false;
    }
  }

  /**
   * Check if incremental mode is active
   * @returns True if incremental mode is enabled
   */
  isIncrementalModeEnabled(): boolean {
    return this.incrementalMode;
  }

  /** Whether canonical graph reads or refreshes are active. */
  isCanonicalGraphEnabled(): boolean {
    return (
      this.canonicalCoordinator !== null ||
      this.canonicalRepository !== null ||
      this.canonicalView !== null
    );
  }

  /** Refresh or reload the canonical graph after a file save/watch event. */
  async refreshCanonicalGraph(filePath?: string): Promise<CanonicalGraphRefreshResult | null> {
    if (filePath) this.recordSavedOverlayGeneration(filePath);
    if (this.canonicalCoordinator) {
      const refreshed = await this.canonicalCoordinator.refresh();
      if (refreshed.status === 'committed') {
        const diagnostics = this.canonicalCoordinator.readActiveRevision()?.diagnostics ?? [];
        this.installCanonicalRevision(refreshed.graph, refreshed.revision.revisionId, diagnostics);
        this.clearCommittedSaveOverlays();
      }
      return refreshed;
    }

    if (this.canonicalRepository) {
      const active = this.canonicalRepository.readActiveRevision();
      if (!active) return null;

      const revisionChanged = active.metadata.revisionId !== this.canonicalRevisionId;
      if (revisionChanged || !this.canonicalView) {
        this.installCanonicalRevision(active.graph, active.metadata.revisionId, active.diagnostics);
      } else {
        // Diagnostics are an independently replaceable plane and may change
        // while the content-addressed graph revision remains stable.
        this.canonicalDiagnostics = active.diagnostics;
        this.invalidateCache();
      }
      this.clearCommittedSaveOverlays();
      return {
        status: 'committed',
        graph: active.graph,
        revision: active.metadata,
      };
    }

    return null;
  }

  /** Inspect a transient unsaved overlay without exposing mutable internal state. */
  getUnsavedOverlay(filePath: string): IncrementalExtractResult | null {
    return this.unsavedOverlays.get(path.resolve(filePath))?.extract ?? null;
  }

  /** Drop a transient overlay when its document is closed or deleted. */
  clearUnsavedOverlay(filePath: string): void {
    const resolved = path.resolve(filePath);
    this.unsavedOverlays.delete(resolved);
    this.overlayViews.delete(resolved);
    this.pendingSavedOverlayGenerations.delete(resolved);
    this.rebuildWorkspaceOverlayView();
    this.invalidateFileCache(filePath);
  }

  /** Remember which exact overlay is represented by the file currently on disk. */
  private recordSavedOverlayGeneration(filePath: string): void {
    const resolved = path.resolve(filePath);
    const generation = this.unsavedOverlays.get(resolved)?.generation;
    if (generation !== undefined) {
      this.pendingSavedOverlayGenerations.set(resolved, generation);
    }
  }

  /** Reconcile all saves covered by a successful whole-project graph refresh. */
  private clearCommittedSaveOverlays(): void {
    for (const [filePath, savedGeneration] of [...this.pendingSavedOverlayGenerations.entries()]) {
      const currentGeneration = this.unsavedOverlays.get(filePath)?.generation;
      if (currentGeneration === savedGeneration) {
        this.clearUnsavedOverlay(filePath);
      } else {
        // A newer dirty edit is not represented by the committed disk graph.
        this.pendingSavedOverlayGenerations.delete(filePath);
      }
    }
  }

  /**
   * Process a file change (for incremental updates)
   *
   * @param filePath - Absolute path to the changed file
   * @param content - Optional file content (if not provided, reads from disk)
   * @returns Extraction result or null if incremental mode is not enabled
   */
  processFileChange(filePath: string, content?: string): IncrementalExtractResult | null {
    if (!this.incrementalMode || !this.incrementalBuilder) {
      return null;
    }

    // Only process TypeScript files
    if (!isTypeScriptSourcePath(filePath)) {
      return null;
    }

    try {
      let result: IncrementalExtractResult;

      if (content !== undefined) {
        // Process from provided content (unsaved buffer)
        result = this.incrementalBuilder.processContent(filePath, content);
        this.installUnsavedOverlay(filePath, content, result);
      } else if (this.isCanonicalGraphEnabled()) {
        // Saved content must use async whole-project refreshCanonicalGraph().
        return null;
      } else {
        // Process from disk
        result = this.incrementalBuilder.processFileChange(filePath);
        this.clearUnsavedOverlay(filePath);
      }

      // Invalidate caches for this file
      this.invalidateFileCache(filePath);

      return result;
    } catch (error) {
      console.error(`Failed to process file change: ${error}`);
      return null;
    }
  }

  /**
   * Handle file deletion
   *
   * @param filePath - Absolute path to the deleted file
   * @returns Number of symbols removed
   */
  handleFileDelete(filePath: string): number {
    this.clearUnsavedOverlay(filePath);
    if (this.isCanonicalGraphEnabled()) return 0;
    if (!this.incrementalMode || !this.incrementalBuilder) {
      return 0;
    }

    try {
      const removed = this.incrementalBuilder.removeFile(filePath);
      this.invalidateFileCache(filePath);
      return removed;
    } catch (error) {
      console.error(`Failed to handle file deletion: ${error}`);
      return 0;
    }
  }

  /**
   * Invalidate all caches
   *
   * Call this when the database is updated (e.g., after `tsdoc-edge build`)
   *
   * @returns void - No return value
   * @public
   */
  invalidateCache(): void {
    this.cacheManager.clearAll();
  }

  /**
   * Invalidate cache for a specific file
   *
   * Call this when a file is modified to refresh its analysis
   *
   * @param filePath - Absolute path to the file
   * @returns void - No return value
   * @public
   */
  invalidateFileCache(filePath: string): void {
    const fileName = path.basename(filePath);
    this.cacheManager.deleteMatching(CACHE_NAMES.CODE_LENS, (key) => key.includes(fileName));
    this.cacheManager.deleteMatching(CACHE_NAMES.DIAGNOSTICS, (key) => key.includes(fileName));
  }

  /** Initialize canonical refresh or a Build-created read-only snapshot. */
  private initCanonicalGraph(options: TsdocEdgeServiceOptions): void {
    if (options.canonicalGraph === false) return;

    const configured =
      options.canonicalGraph ?? canonicalGraphOptionsFromEnvironment(this.workspaceRoot);
    if (configured) {
      this.canonicalCoordinator = new CanonicalGraphCoordinator(
        { ...configured, rootDir: this.workspaceRoot },
        options.canonicalGraphDependencies
      );
      const active = this.canonicalCoordinator.readActiveRevision();
      if (active)
        this.installCanonicalRevision(active.graph, active.metadata.revisionId, active.diagnostics);
      return;
    }

    const databasePath = path.resolve(
      this.workspaceRoot,
      process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB ?? DEFAULT_CANONICAL_GRAPH_DATABASE
    );
    if (!fs.existsSync(databasePath)) return;

    try {
      this.canonicalRepository = new GraphRepository(databasePath, { readOnly: true });
      const active = this.canonicalRepository.readActiveRevision();
      if (active)
        this.installCanonicalRevision(active.graph, active.metadata.revisionId, active.diagnostics);
    } catch (error) {
      console.error(`Failed to open canonical graph database: ${error}`);
      this.canonicalRepository?.close();
      this.canonicalRepository = null;
    }
  }

  /** Load one explicitly configured retained result; this never selects a latest history row. */
  private initSavedConventionCheck(options: TsdocEdgeServiceOptions): void {
    if (options.savedConventionCheck) {
      this.savedConventionCheck = options.savedConventionCheck;
      return;
    }
    const loader = new ConfigLoader(this.workspaceRoot);
    const savedHistory = loader.getConfig().specGovernance?.lspSavedHistory;
    if (!savedHistory) return;
    try {
      const repository = new ConventionCheckHistoryRepository(
        loader.resolvePath(savedHistory.databasePath),
        { readOnly: true }
      );
      try {
        const retained = repository.read(savedHistory.historyId);
        if (!retained) {
          console.warn(`Saved convention history not found: ${savedHistory.historyId}`);
          return;
        }
        this.savedConventionCheck = retained.check;
        this.savedConventionHistoryId = retained.historyId;
      } finally {
        repository.close();
      }
    } catch (error) {
      console.warn(
        `Failed to load saved convention history ${savedHistory.historyId}: ${String(error)}`
      );
    }
  }

  /** Resolve the legacy database from an explicit option or project config. */
  private resolveLegacyDatabasePath(explicitPath?: string): string {
    if (explicitPath) return path.resolve(this.workspaceRoot, explicitPath);

    const loader = new ConfigLoader(this.workspaceRoot);
    const configuredPath = loader.getConfig().paths.databasePath || '.tsdoc.db';
    const configPath = loader.getConfigPath();
    const baseDir = configPath ? path.dirname(configPath) : this.workspaceRoot;
    return path.resolve(baseDir, configuredPath);
  }

  /** Install one immutable revision and invalidate all derived query caches. */
  private installCanonicalRevision(
    graph: ConstructorParameters<typeof CanonicalGraphLspView>[0],
    revisionId: string,
    diagnostics: readonly CanonicalDiagnostic[] = []
  ): void {
    this.canonicalView = new CanonicalGraphLspView(graph);
    this.canonicalRevisionId = revisionId;
    this.canonicalDiagnostics = diagnostics;
    this.rebuildOverlayViews(graph, revisionId);
    this.invalidateCache();
  }

  /** Build or refresh canonical-id GraphDelta overlays for dirty files. */
  private installUnsavedOverlay(
    filePath: string,
    content: string,
    extract: IncrementalExtractResult
  ): void {
    const resolved = path.resolve(filePath);
    const baseGraph = this.canonicalView?.graph ?? this.emptyCanonicalGraph();
    const baseRevisionId = this.canonicalRevisionId ?? 'uninitialized';
    const baseRevision = this.codeGraphRevision(baseGraph, baseRevisionId);
    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph,
      baseRevisionId,
      filePath: resolved,
      content,
      extract,
    });
    const overlay = { delta, extract, content, generation: ++this.nextOverlayGeneration };
    this.unsavedOverlays.set(resolved, overlay);
    this.overlayViews.set(resolved, new OverlayGraphView(baseRevision, delta));
    this.rebuildWorkspaceOverlayView(baseGraph);
  }

  private emptyCanonicalGraph(): CanonicalProjectGraph {
    return {
      contractVersion: '1.0',
      rootDir: this.workspaceRoot,
      tsconfigPath: path.join(this.workspaceRoot, 'tsconfig.ttsc.json'),
      nodes: [],
      edges: [],
      provenance: { adapter: 'overlay', producer: 'tsdoc-edge/lsp-overlay' },
      fingerprint: 'empty',
    };
  }

  private rebuildOverlayViews(
    graph: ConstructorParameters<typeof CanonicalGraphLspView>[0],
    revisionId: string
  ): void {
    this.overlayViews.clear();
    const baseRevision = this.codeGraphRevision(graph, revisionId);
    for (const [filePath, overlay] of this.unsavedOverlays) {
      const delta = GraphDeltaBuilder.fromExtract({
        baseGraph: graph,
        baseRevisionId: revisionId,
        filePath,
        content: overlay.content,
        extract: overlay.extract,
      });
      this.unsavedOverlays.set(filePath, {
        delta,
        extract: overlay.extract,
        content: overlay.content,
        generation: overlay.generation,
      });
      this.overlayViews.set(filePath, new OverlayGraphView(baseRevision, delta));
    }
    this.rebuildWorkspaceOverlayView(graph);
  }

  /** Compose all dirty-file deltas for global name and id based queries. */
  private rebuildWorkspaceOverlayView(baseGraph?: CanonicalProjectGraph): void {
    if (this.unsavedOverlays.size === 0) {
      this.workspaceOverlayView = null;
      return;
    }

    const graph = baseGraph ?? this.canonicalView?.graph ?? this.emptyCanonicalGraph();
    const baseRevision = this.codeGraphRevision(graph, this.canonicalRevisionId ?? 'uninitialized');
    const overlays = [...this.unsavedOverlays.entries()].sort(([left], [right]) =>
      compareText(left, right)
    );
    this.workspaceOverlayView = new EffectiveCodeGraphView(
      baseRevision,
      overlays.map(([, overlay]) => overlay.delta)
    );
  }

  private codeGraphRevision(graph: CanonicalProjectGraph, revisionId: string): CodeGraphRevision {
    return Object.freeze({ revisionId, graph });
  }

  /** Select the dirty workspace graph when the id belongs to canonical space. */
  private canonicalQueryView(symbolId?: string): CanonicalGraphLspView | null {
    if (!this.workspaceOverlayView) return this.canonicalView;
    const workspaceView = this.workspaceOverlayView.view;
    if (!symbolId) return workspaceView;
    if (workspaceView.analysis.index.getNode(symbolId)) {
      return workspaceView;
    }
    return parseCanonicalId(symbolId) ? workspaceView : this.canonicalView;
  }

  private getOverlayView(filePath: string): OverlayGraphView | null {
    return this.overlayViews.get(path.resolve(filePath)) ?? null;
  }

  /** Query a dirty file against the graph containing every active file delta. */
  private getDirtyQueryView(filePath: string): CanonicalGraphLspView | null {
    const overlayView = this.getOverlayView(filePath);
    if (!overlayView) return null;
    return this.workspaceOverlayView?.view ?? overlayView.view;
  }

  /**
   * Initialize SQLite database connection in readonly mode
   * @internal
   */
  private initDatabase(): void {
    if (!fs.existsSync(this.dbPath)) {
      if (!this.canonicalView && !this.canonicalCoordinator) {
        console.warn(`TSDoc Edge database not found at: ${this.dbPath}`);
      }
      return;
    }

    try {
      this.db = new Database(this.dbPath, { readonly: true });

      // Initialize statement manager with database
      this.statementManager = new StatementManager(this.db, { maxStatements: 50 });
    } catch (error) {
      console.error(`Failed to open database: ${error}`);
    }
  }

  /** Search dirty-document declarations before considering saved graph rows. */
  private searchUnsavedOverlays(query: string): SymbolSearchResult[] {
    const folded = query.toLocaleLowerCase();
    const results: SymbolSearchResult[] = [];
    for (const [filePath, overlayView] of this.overlayViews) {
      for (const { node, line } of overlayView.view.symbolsInFile(filePath)) {
        const name = canonicalNodeDisplayName(node);
        if (!name.toLocaleLowerCase().includes(folded)) continue;
        results.push({
          name,
          kind: this.mapTypeToKind(node.kind),
          filePath,
          line,
        });
      }
    }
    return results.sort(
      (left, right) =>
        compareText(left.name, right.name) ||
        compareText(left.filePath, right.filePath) ||
        left.line - right.line
    );
  }

  /** Remove saved results for files currently owned by a dirty overlay. */
  private mergeOverlaySearchResults(
    overlays: SymbolSearchResult[],
    saved: SymbolSearchResult[]
  ): SymbolSearchResult[] {
    const dirtyFiles = new Set(this.unsavedOverlays.keys());
    return [
      ...overlays,
      ...saved.filter((result) => {
        const absolute = path.isAbsolute(result.filePath)
          ? path.resolve(result.filePath)
          : path.resolve(this.workspaceRoot, result.filePath);
        return !dirtyFiles.has(absolute);
      }),
    ].slice(0, 50);
  }

  /**
   * Get hover information for a symbol at position
   *
   * @param filePath - File path
   * @param line - Line number (1-based)
   * @param character - Character position
   * @returns Markdown hover content or null
   */
  getHoverInfo(filePath: string, line: number, character: number): string | null {
    const dirtyQueryView = this.getDirtyQueryView(filePath);
    if (dirtyQueryView) {
      const symbol = dirtyQueryView.symbolAtPosition(filePath, line, character);
      if (!symbol) return null;

      const counts = dirtyQueryView.impactCounts(symbol.node.id);
      let content = `## ${canonicalNodeDisplayName(symbol.node)}\n\n`;
      content += `**Type:** ${symbol.node.kind}\n\n`;
      content += `*Unsaved buffer overlay*\n\n`;
      content += `---\n\n### Impact Analysis\n\n`;
      content += `- **Dependents:** ${counts.dependents}\n`;
      content += `- **Dependencies:** ${counts.dependencies}\n`;
      return content;
    }

    const canonicalView = this.canonicalQueryView();
    const canonical = canonicalView?.symbolAtPosition(filePath, line, character);
    if (canonical && canonicalView) {
      const counts = canonicalView.impactCounts(canonical.node.id);
      const edgeKinds = new Set([
        ...canonicalView.analysis.index
          .getIncomingEdges(canonical.node.id)
          .map((edge) => edge.kind),
        ...canonicalView.analysis.index
          .getOutgoingEdges(canonical.node.id)
          .map((edge) => edge.kind),
      ]);
      let content = `## ${canonicalNodeDisplayName(canonical.node)}\n\n`;
      content += `**Type:** ${canonical.node.kind}\n\n`;
      content += `---\n\n### Impact Analysis\n\n`;
      content += `- **Dependents:** ${counts.dependents}\n`;
      content += `- **Dependencies:** ${counts.dependencies}\n`;
      if (edgeKinds.size > 0) {
        content += `\n**Raw graph edge kinds:** ${[...edgeKinds].sort().join(', ')}\n`;
      }
      return content;
    }
    if (!this.db) return null;

    try {
      // Find symbol at this position
      const normalizedPath = filePath.replace(/\\/g, '/');

      // Use cached prepared statements to prevent memory leaks
      const symbolStmt = this.statementManager?.prepare(
        'hoverSymbol',
        `
        SELECT id, name, type, summary, file_path, line
        FROM symbols
        WHERE file_path LIKE ?
          AND line <= ?
        ORDER BY line DESC
        LIMIT 1
      `
      );

      const symbol = symbolStmt?.get(`%${path.basename(normalizedPath)}`, line) as
        | SymbolRow
        | undefined;

      if (!symbol) return null;

      // Get impact analysis using indexed JOIN (O(1) instead of O(n) LIKE scan)
      const downstreamStmt = this.statementManager?.prepare(
        'hoverDownstreamJoin',
        `
        SELECT COUNT(DISTINCT rs.relationship_id) as count
        FROM relationship_symbols rs
        WHERE rs.symbol_id = ? AND rs.role = 'from'
      `
      );
      const downstreamCount = (downstreamStmt?.get(symbol.id) as CountRow | undefined)?.count || 0;

      const upstreamStmt = this.statementManager?.prepare(
        'hoverUpstreamJoin',
        `
        SELECT COUNT(DISTINCT rs.relationship_id) as count
        FROM relationship_symbols rs
        WHERE rs.symbol_id = ? AND rs.role = 'to'
      `
      );
      const upstreamCount = (upstreamStmt?.get(symbol.id) as CountRow | undefined)?.count || 0;

      // Build markdown content
      let content = `## ${symbol.name}\n\n`;
      content += `**Type:** ${symbol.type}\n\n`;

      if (symbol.summary) {
        content += `${symbol.summary}\n\n`;
      }

      content += `---\n\n`;
      content += `### Impact Analysis\n\n`;
      content += `- **Downstream:** ${downstreamCount} dependents\n`;
      content += `- **Upstream:** ${upstreamCount} dependencies\n`;

      // Get relationship types using indexed JOIN
      const relTypesStmt = this.statementManager?.prepare(
        'hoverRelTypesJoin',
        `
        SELECT ur.type, COUNT(DISTINCT ur.id) as count
        FROM unified_relationships ur
        INNER JOIN relationship_symbols rs ON ur.id = rs.relationship_id
        WHERE rs.symbol_id = ?
        GROUP BY ur.type
        ORDER BY count DESC
        LIMIT 5
      `
      );
      const relTypes = (relTypesStmt?.all(symbol.id) || []) as RelTypeCountRow[];

      if (relTypes.length > 0) {
        content += `\n**Relationship Types:**\n`;
        for (const rt of relTypes) {
          content += `- ${rt.type}: ${rt.count}\n`;
        }
      }

      return content;
    } catch (error) {
      console.error(`getHoverInfo error: ${error}`);
      return null;
    }
  }

  /**
   * Get code lenses for a file
   * Optimized with batch impact count query
   *
   * @param filePath - File path
   * @returns Array of code lens info
   */
  getCodeLenses(filePath: string): CodeLensInfo[] {
    const dirtyQueryView = this.getDirtyQueryView(filePath);
    if (dirtyQueryView) {
      return dirtyQueryView.symbolsInFile(filePath).map(({ node, line }) => {
        const counts = dirtyQueryView.impactCounts(node.id);
        return {
          line,
          title: `↓${counts.dependents} ↑${counts.dependencies}`,
          symbolId: node.id,
        };
      });
    }

    const canonicalView = this.canonicalQueryView();
    if (canonicalView) {
      return canonicalView.symbolsInFile(filePath).flatMap(({ node, line }) => {
        const counts = canonicalView.impactCounts(node.id);
        if (!counts || (counts.dependents === 0 && counts.dependencies === 0)) return [];
        return [
          {
            line,
            title: `↓${counts.dependents} ↑${counts.dependencies}`,
            symbolId: node.id,
          },
        ];
      });
    }
    if (!this.db) return [];

    try {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const fileName = path.basename(normalizedPath);

      // Check cache
      const cached = this.cacheManager.get<CodeLensInfo[]>(CACHE_NAMES.CODE_LENS, fileName);
      if (cached) {
        return cached;
      }

      // Get all symbols in this file using cached statement
      const symbolsStmt = this.statementManager?.prepare(
        'fileSymbols',
        `
        SELECT id, name, line
        FROM symbols
        WHERE file_path LIKE ?
          AND type IN ('class', 'function', 'interface', 'method')
        ORDER BY line
      `
      );

      const symbols = (symbolsStmt?.all(`%${fileName}`) || []) as SymbolRow[];

      if (symbols.length === 0) {
        this.cacheManager.set(CACHE_NAMES.CODE_LENS, fileName, []);
        return [];
      }

      // Batch query for all impact counts at once
      const symbolIds = symbols.map((s) => s.id);
      const impactCounts = this.getBatchImpactCounts(symbolIds);

      const codeLenses: CodeLensInfo[] = [];

      for (const symbol of symbols) {
        const counts = impactCounts.get(symbol.id) || { downstream: 0, upstream: 0 };

        if (counts.downstream > 0 || counts.upstream > 0) {
          codeLenses.push({
            line: symbol.line,
            title: `↓${counts.downstream} ↑${counts.upstream}`,
            symbolId: symbol.id,
          });
        }
      }

      // Store in cache
      this.cacheManager.set(CACHE_NAMES.CODE_LENS, fileName, codeLenses);

      return codeLenses;
    } catch (error) {
      console.error(`getCodeLenses error: ${error}`);
      return [];
    }
  }

  /**
   * Get impact counts for multiple symbols in a single query
   * Uses batch query on relationship_symbols join table
   *
   * @param symbolIds - Array of symbol IDs
   * @returns Map of symbolId -> { downstream, upstream }
   */
  private getBatchImpactCounts(
    symbolIds: string[]
  ): Map<string, { downstream: number; upstream: number }> {
    const results = new Map<string, { downstream: number; upstream: number }>();
    const canonicalView = this.canonicalQueryView();
    if (canonicalView) {
      for (const id of symbolIds) {
        if (!canonicalView.analysis.index.getNode(id)) continue;
        const counts = canonicalView.impactCounts(id);
        results.set(id, {
          downstream: counts.dependents,
          upstream: counts.dependencies,
        });
      }
      return results;
    }
    if (!this.db || symbolIds.length === 0) return results;

    // Initialize all symbols with zero counts
    for (const id of symbolIds) {
      results.set(id, { downstream: 0, upstream: 0 });
    }

    try {
      // Check cache first
      const uncachedIds: string[] = [];
      for (const id of symbolIds) {
        const cached = this.cacheManager.get<{ downstream: number; upstream: number }>(
          CACHE_NAMES.IMPACT,
          id
        );
        if (cached) {
          results.set(id, cached);
        } else {
          uncachedIds.push(id);
        }
      }

      if (uncachedIds.length === 0) return results;

      // Batch query for downstream counts
      const placeholders = uncachedIds.map(() => '?').join(',');
      const downstreamStmt = this.db.prepare(`
        SELECT symbol_id, COUNT(DISTINCT relationship_id) as count
        FROM relationship_symbols
        WHERE symbol_id IN (${placeholders}) AND role = 'from'
        GROUP BY symbol_id
      `);
      const downstreamRows = downstreamStmt.all(...uncachedIds) as Array<{
        symbol_id: string;
        count: number;
      }>;

      // Batch query for upstream counts
      const upstreamStmt = this.db.prepare(`
        SELECT symbol_id, COUNT(DISTINCT relationship_id) as count
        FROM relationship_symbols
        WHERE symbol_id IN (${placeholders}) AND role = 'to'
        GROUP BY symbol_id
      `);
      const upstreamRows = upstreamStmt.all(...uncachedIds) as Array<{
        symbol_id: string;
        count: number;
      }>;

      // Build result map
      for (const row of downstreamRows) {
        const existing = results.get(row.symbol_id) || { downstream: 0, upstream: 0 };
        existing.downstream = row.count;
        results.set(row.symbol_id, existing);
      }

      for (const row of upstreamRows) {
        const existing = results.get(row.symbol_id) || { downstream: 0, upstream: 0 };
        existing.upstream = row.count;
        results.set(row.symbol_id, existing);
      }

      // Cache the results
      for (const id of uncachedIds) {
        const counts = results.get(id) || { downstream: 0, upstream: 0 };
        this.cacheManager.set(CACHE_NAMES.IMPACT, id, counts);
      }

      return results;
    } catch (error) {
      console.error(`getBatchImpactCounts error: ${error}`);
      return results;
    }
  }

  /**
   * Search symbols in workspace
   *
   * @param query - Search query
   * @returns Array of matching symbols
   */
  searchSymbols(query: string): SymbolSearchResult[] {
    const overlays = this.searchUnsavedOverlays(query);
    if (this.canonicalView) {
      return this.mergeOverlaySearchResults(
        overlays,
        this.canonicalView.search(query).map(({ node, filePath, line }) => ({
          name: canonicalNodeDisplayName(node),
          kind: this.mapTypeToKind(node.kind),
          filePath,
          line,
        }))
      );
    }
    if (!this.db) return overlays.slice(0, 50);

    try {
      const stmt = this.statementManager?.prepare(
        'searchSymbols',
        `
        SELECT id, name, type, file_path, line
        FROM symbols
        WHERE name LIKE ?
        ORDER BY name
        LIMIT 50
      `
      );

      const symbols = (stmt?.all(`%${query}%`) || []) as SymbolRow[];

      return this.mergeOverlaySearchResults(
        overlays,
        symbols.map((sym) => ({
          name: sym.name,
          kind: this.mapTypeToKind(sym.type),
          filePath: sym.file_path,
          line: sym.line || 1,
        }))
      );
    } catch (error) {
      console.error(`searchSymbols error: ${error}`);
      return overlays.slice(0, 50);
    }
  }

  /**
   * Get diagnostics for a file
   *
   * @param filePath - File path
   * @returns Array of diagnostics
   */
  getDiagnostics(filePath: string): DiagnosticInfo[] {
    const overlayView = this.getOverlayView(filePath);
    if (overlayView) {
      const dirtyQueryView = this.workspaceOverlayView?.view ?? overlayView.view;
      const diagnostics: DiagnosticInfo[] = [
        ...this.canonicalDiagnosticsForFile(filePath),
        ...this.getLegacyArchitecturalDiagnostics(filePath),
      ];
      for (const diagnostic of overlayView.delta.diagnostics ?? []) {
        diagnostics.push(mapCanonicalDiagnostic(diagnostic));
      }
      for (const { node, line } of dirtyQueryView.symbolsInFile(filePath)) {
        const dependents = dirtyQueryView.impactCounts(node.id).dependents;
        if (dependents > 10) {
          diagnostics.push({
            line,
            message: `High-impact symbol: ${canonicalNodeDisplayName(node)} has ${dependents} dependents`,
            severity: DiagnosticSeverity.Information,
          });
        }
      }
      return uniqueDiagnostics(diagnostics);
    }

    const canonicalView = this.canonicalQueryView();
    if (canonicalView) {
      const canonicalDiagnostics = this.canonicalDiagnosticsForFile(filePath);
      const impactDiagnostics = canonicalView.symbolsInFile(filePath).flatMap(({ node, line }) => {
        const dependents = canonicalView.impactCounts(node.id).dependents;
        return dependents > 10
          ? [
              {
                line,
                message: `High-impact symbol: ${canonicalNodeDisplayName(node)} has ${dependents} dependents`,
                severity: DiagnosticSeverity.Information,
              },
            ]
          : [];
      });
      return [
        ...canonicalDiagnostics,
        ...this.savedConventionDiagnosticsForFile(filePath),
        ...impactDiagnostics,
        ...this.getLegacyArchitecturalDiagnostics(filePath),
      ];
    }
    if (!this.db) return [];

    try {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const fileName = path.basename(normalizedPath);

      // Check cache
      const cached = this.cacheManager.get<DiagnosticInfo[]>(CACHE_NAMES.DIAGNOSTICS, fileName);
      if (cached) {
        return cached;
      }

      const diagnostics: DiagnosticInfo[] = [];

      // Check for circular dependencies using cached statement
      const circularStmt = this.statementManager?.prepare(
        'circularDeps',
        `
        SELECT from_symbols, to_symbols, properties, file_path, line
        FROM unified_relationships
        WHERE type = 'circular-dependency'
          AND file_path LIKE ?
      `
      );
      const circulars = (circularStmt?.all(`%${fileName}`) || []) as UnifiedRelRow[];

      for (const circular of circulars) {
        const props = JSON.parse(circular.properties || '{}');
        diagnostics.push({
          line: circular.line || 1,
          message: `Circular dependency detected: ${props.cyclePath?.join(' → ') || 'unknown cycle'}`,
          severity: DiagnosticSeverity.Warning,
        });
      }

      // Check for layer violations using cached statement
      const violationStmt = this.statementManager?.prepare(
        'layerViolations',
        `
        SELECT from_symbols, to_symbols, properties, file_path, line
        FROM unified_relationships
        WHERE type = 'layer-dependency'
          AND json_extract(properties, '$.isViolation') = 1
          AND file_path LIKE ?
      `
      );
      const violations = (violationStmt?.all(`%${fileName}`) || []) as UnifiedRelRow[];

      for (const violation of violations) {
        const props = JSON.parse(violation.properties || '{}');
        diagnostics.push({
          line: violation.line || 1,
          message: `Architecture violation: ${props.fromLayer} → ${props.toLayer}`,
          severity: DiagnosticSeverity.Warning,
        });
      }

      // Check for high-impact symbols using indexed JOIN (O(1) instead of O(n) LIKE scan)
      const highImpactStmt = this.statementManager?.prepare(
        'highImpactJoin',
        `
        SELECT s.id, s.name, s.line, COUNT(DISTINCT rs.relationship_id) as count
        FROM symbols s
        INNER JOIN relationship_symbols rs ON rs.symbol_id = s.id AND rs.role = 'from'
        WHERE s.file_path LIKE ?
        GROUP BY s.id
        HAVING count > 10
      `
      );
      const highImpact = (highImpactStmt?.all(`%${fileName}`) || []) as HighImpactRow[];

      for (const sym of highImpact) {
        diagnostics.push({
          line: sym.line || 1,
          message: `High-impact symbol: ${sym.name} has ${sym.count} dependents`,
          severity: DiagnosticSeverity.Information,
        });
      }

      // Store in cache
      this.cacheManager.set(CACHE_NAMES.DIAGNOSTICS, fileName, diagnostics);

      return diagnostics;
    } catch (error) {
      console.error(`getDiagnostics error: ${error}`);
      return [];
    }
  }

  /** Project persisted canonical diagnostics for one source file. */
  private canonicalDiagnosticsForFile(filePath: string): DiagnosticInfo[] {
    const resolvedFile = path.resolve(filePath);
    const relativeFile = path.relative(this.workspaceRoot, resolvedFile).replace(/\\/g, '/');
    return this.canonicalDiagnostics
      .filter(
        (diagnostic) =>
          !diagnostic.file ||
          diagnostic.file === relativeFile ||
          path.resolve(this.workspaceRoot, diagnostic.file) === resolvedFile
      )
      .map((diagnostic) => mapCanonicalDiagnostic(diagnostic));
  }

  /** Only project a retained result when it pins the active saved canonical revision. */
  private savedConventionDiagnosticsForFile(filePath: string): DiagnosticInfo[] {
    if (
      !this.savedConventionCheck ||
      this.savedConventionCheck.codeRevisionId !== this.canonicalRevisionId
    ) {
      return [];
    }
    return [
      ...conventionDiagnosticsForFile(
        this.savedConventionCheck,
        this.workspaceRoot,
        filePath,
        this.savedConventionHistoryId
      ),
    ];
  }

  /** Preserve file-scoped legacy enrichment that has no canonical fact-plane equivalent yet. */
  private getLegacyArchitecturalDiagnostics(filePath: string): DiagnosticInfo[] {
    if (!this.db) return [];

    try {
      const fileName = path.basename(filePath.replace(/\\/g, '/'));
      const diagnostics: DiagnosticInfo[] = [];
      const circularStmt = this.statementManager?.prepare(
        'canonicalCircularDeps',
        `
        SELECT properties, line
        FROM unified_relationships
        WHERE type = 'circular-dependency'
          AND file_path LIKE ?
      `
      );
      const circulars = (circularStmt?.all(`%${fileName}`) || []) as UnifiedRelRow[];
      for (const circular of circulars) {
        const props = JSON.parse(circular.properties || '{}');
        diagnostics.push({
          line: circular.line || 1,
          message: `Circular dependency detected: ${props.cyclePath?.join(' → ') || 'unknown cycle'}`,
          severity: DiagnosticSeverity.Warning,
        });
      }

      const violationStmt = this.statementManager?.prepare(
        'canonicalLayerViolations',
        `
        SELECT properties, line
        FROM unified_relationships
        WHERE type = 'layer-dependency'
          AND json_extract(properties, '$.isViolation') = 1
          AND file_path LIKE ?
      `
      );
      const violations = (violationStmt?.all(`%${fileName}`) || []) as UnifiedRelRow[];
      for (const violation of violations) {
        const props = JSON.parse(violation.properties || '{}');
        diagnostics.push({
          line: violation.line || 1,
          message: `Architecture violation: ${props.fromLayer} → ${props.toLayer}`,
          severity: DiagnosticSeverity.Warning,
        });
      }
      return diagnostics;
    } catch (error) {
      console.error(`getLegacyArchitecturalDiagnostics error: ${error}`);
      return [];
    }
  }

  /**
   * Map symbol type to LSP SymbolKind
   */
  private mapTypeToKind(type: string): SymbolKind {
    const mapping: Record<string, SymbolKind> = {
      class: SymbolKind.Class,
      interface: SymbolKind.Interface,
      function: SymbolKind.Function,
      method: SymbolKind.Method,
      property: SymbolKind.Property,
      variable: SymbolKind.Variable,
      constant: SymbolKind.Constant,
      enum: SymbolKind.Enum,
      type: SymbolKind.TypeParameter,
      namespace: SymbolKind.Namespace,
      module: SymbolKind.Module,
    };

    return mapping[type.toLowerCase()] || SymbolKind.Variable;
  }

  /**
   * Get symbol at a specific position in file
   *
   * @param filePath - File path
   * @param line - Line number (1-based)
   * @param character - Character position (0-based)
   * @returns Symbol info or null
   */
  getSymbolAtPosition(
    filePath: string,
    line: number,
    character = 0
  ): { id: string; name: string; type: string } | null {
    const dirtyQueryView = this.getDirtyQueryView(filePath);
    if (dirtyQueryView) {
      const symbol = dirtyQueryView.symbolAtPosition(filePath, line, character);
      return symbol
        ? {
            id: symbol.node.id,
            name: canonicalNodeDisplayName(symbol.node),
            type: symbol.node.kind,
          }
        : null;
    }

    const canonical = this.canonicalQueryView()?.symbolAtPosition(filePath, line, character);
    if (canonical) {
      return {
        id: canonical.node.id,
        name: canonicalNodeDisplayName(canonical.node),
        type: canonical.node.kind,
      };
    }
    if (!this.db) return null;

    try {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const fileName = path.basename(normalizedPath);

      const stmt = this.statementManager?.prepare(
        'symbolAtPosition',
        `
        SELECT id, name, type
        FROM symbols
        WHERE file_path LIKE ?
          AND line <= ?
        ORDER BY line DESC
        LIMIT 1
      `
      );

      const symbol = stmt?.get(`%${fileName}`, line) as
        | { id: string; name: string; type: string }
        | undefined;

      return symbol || null;
    } catch (error) {
      console.error(`getSymbolAtPosition error: ${error}`);
      return null;
    }
  }

  /**
   * Get impact analysis for a symbol
   * Uses relationship_symbols JOIN for O(1) lookup instead of LIKE
   *
   * @param symbolId - Symbol ID
   * @param maxDepth - Maximum depth to traverse (default: 3)
   * @param includeSymbols - Whether to include symbol IDs in result (default: true)
   * @returns Impact counts and optionally symbol IDs
   */
  getImpactAnalysis(
    symbolId: string,
    maxDepth: number = 3,
    includeSymbols: boolean = true
  ): { downstream: number; upstream: number; symbols: string[] } {
    const canonicalView = this.canonicalQueryView(symbolId);
    if (canonicalView?.analysis.index.getNode(symbolId)) {
      const affected = canonicalView
        .impact(symbolId, maxDepth)
        .slice(0, TsdocEdgeService.MAX_IMPACT_SYMBOLS);
      const dependencies = canonicalView.analysis.dependencies(symbolId, {
        external: 'exclude',
      });
      return {
        downstream: affected.length,
        upstream: dependencies.length,
        symbols: includeSymbols ? [...affected] : [],
      };
    }
    if (parseCanonicalId(symbolId)) return { downstream: 0, upstream: 0, symbols: [] };
    if (!this.db) return { downstream: 0, upstream: 0, symbols: [] };

    try {
      const visited = new Set<string>();
      const queue: Array<{ id: string; depth: number }> = [{ id: symbolId, depth: 0 }];
      visited.add(symbolId);

      // Use JOIN on relationship_symbols for BFS (no JSON.parse needed)
      const downstreamStmt = this.statementManager?.prepare(
        'impactDownstreamJoin',
        `
        SELECT DISTINCT rs2.symbol_id
        FROM relationship_symbols rs1
        INNER JOIN relationship_symbols rs2 ON rs2.relationship_id = rs1.relationship_id AND rs2.role = 'to'
        WHERE rs1.symbol_id = ? AND rs1.role = 'from'
      `
      );

      // BFS with size limit to prevent memory issues
      const maxSymbols = TsdocEdgeService.MAX_IMPACT_SYMBOLS;

      while (queue.length > 0 && visited.size <= maxSymbols) {
        const current = queue.shift();
        if (!current) break;
        if (current.depth >= maxDepth) continue;

        // Find downstream dependencies using indexed lookup
        const toSymbols = (downstreamStmt?.all(current.id) || []) as Array<{ symbol_id: string }>;

        for (const row of toSymbols) {
          if (!visited.has(row.symbol_id) && visited.size <= maxSymbols) {
            visited.add(row.symbol_id);
            queue.push({ id: row.symbol_id, depth: current.depth + 1 });
          }
        }
      }

      // Remove the starting symbol from count
      visited.delete(symbolId);

      // Get upstream count using indexed lookup
      const upstreamStmt = this.statementManager?.prepare(
        'impactUpstreamJoin',
        `
        SELECT COUNT(DISTINCT rs2.symbol_id) as count
        FROM relationship_symbols rs1
        INNER JOIN relationship_symbols rs2 ON rs2.relationship_id = rs1.relationship_id AND rs2.role = 'from'
        WHERE rs1.symbol_id = ? AND rs1.role = 'to'
      `
      );
      const upstreamCount = upstreamStmt?.get(symbolId) as { count: number } | undefined;

      // Only convert to array if requested to save memory
      const symbolArray = includeSymbols ? Array.from(visited) : [];

      return {
        downstream: visited.size,
        upstream: upstreamCount?.count || 0,
        symbols: symbolArray,
      };
    } catch (error) {
      console.error(`getImpactAnalysis error: ${error}`);
      return { downstream: 0, upstream: 0, symbols: [] };
    }
  }

  /**
   * Get related symbols for a given symbol
   *
   * @param symbolId - Symbol ID
   * @param limit - Maximum number of related symbols
   * @returns Array of related symbol info
   */
  getRelatedSymbols(
    symbolId: string,
    limit: number = 10
  ): Array<{ id: string; name: string; type: string; relationshipType: string }> {
    const canonicalView = this.canonicalQueryView(symbolId);
    if (canonicalView?.analysis.index.getNode(symbolId)) {
      return canonicalView.related(symbolId, limit).map(({ node, relationshipType }) => ({
        id: node.id,
        name: canonicalNodeDisplayName(node),
        type: node.kind,
        relationshipType,
      }));
    }
    if (parseCanonicalId(symbolId)) return [];
    if (!this.db) return [];

    try {
      // Use JOIN on relationship_symbols for efficient lookup (no JSON.parse needed)
      const relatedStmt = this.statementManager?.prepare(
        'relatedSymbolsJoin',
        `
        SELECT DISTINCT s.id, s.name, s.type, ur.type as rel_type
        FROM relationship_symbols rs1
        INNER JOIN unified_relationships ur ON ur.id = rs1.relationship_id
        INNER JOIN relationship_symbols rs2 ON rs2.relationship_id = rs1.relationship_id AND rs2.symbol_id != ?
        INNER JOIN symbols s ON s.id = rs2.symbol_id
        WHERE rs1.symbol_id = ?
        LIMIT ?
      `
      );

      const rows = (relatedStmt?.all(symbolId, symbolId, limit) || []) as Array<{
        id: string;
        name: string;
        type: string;
        rel_type: string;
      }>;

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        relationshipType: row.rel_type,
      }));
    } catch (error) {
      console.error(`getRelatedSymbols error: ${error}`);
      return [];
    }
  }

  /**
   * Find symbol by name (with caching)
   *
   * @param name - Symbol name to search
   * @returns Symbol location or null
   */
  findSymbolByName(
    name: string
  ): { id: string; name: string; type: string; filePath: string; line: number } | null {
    const canonical = this.canonicalQueryView()?.findByName(name);
    if (canonical) {
      return {
        id: canonical.node.id,
        name: canonicalNodeDisplayName(canonical.node),
        type: canonical.node.kind,
        filePath: canonical.filePath,
        line: canonical.line,
      };
    }
    if (!this.db) return null;

    // Check cache first
    const cached = this.cacheManager.get<{
      id: string;
      name: string;
      type: string;
      filePath: string;
      line: number;
    } | null>(CACHE_NAMES.SYMBOL, `name:${name}`);
    if (cached !== undefined) {
      return cached;
    }

    /** Database result for symbol lookup */
    type SymbolLocation = {
      id: string;
      name: string;
      type: string;
      file_path: string;
      line: number | null;
    };

    try {
      // First try exact match
      const exactStmt = this.statementManager?.prepare(
        'findSymbolExact',
        `
        SELECT id, name, type, file_path, line
        FROM symbols
        WHERE name = ?
        LIMIT 1
      `
      );
      let symbol = exactStmt?.get(name) as SymbolLocation | undefined;

      // If not found, try case-insensitive match
      if (!symbol) {
        const caseInsensitiveStmt = this.statementManager?.prepare(
          'findSymbolCaseInsensitive',
          `
          SELECT id, name, type, file_path, line
          FROM symbols
          WHERE LOWER(name) = LOWER(?)
          LIMIT 1
        `
        );
        symbol = caseInsensitiveStmt?.get(name) as SymbolLocation | undefined;
      }

      // If still not found, try partial match
      if (!symbol) {
        const partialStmt = this.statementManager?.prepare(
          'findSymbolPartial',
          `
          SELECT id, name, type, file_path, line
          FROM symbols
          WHERE name LIKE ?
          ORDER BY LENGTH(name)
          LIMIT 1
        `
        );
        symbol = partialStmt?.get(`%${name}%`) as SymbolLocation | undefined;
      }

      const result = symbol
        ? {
            id: symbol.id,
            name: symbol.name,
            type: symbol.type,
            filePath: symbol.file_path,
            line: symbol.line || 1,
          }
        : null;

      // Cache the result (including null for not found)
      this.cacheManager.set(CACHE_NAMES.SYMBOL, `name:${name}`, result);

      return result;
    } catch (error) {
      console.error(`findSymbolByName error: ${error}`);
      return null;
    }
  }

  /**
   * Batch find symbols by names (optimized for document links)
   * Uses IN clause for efficient batch lookup
   *
   * @param names - Array of symbol names to search
   * @returns Map of name -> symbol location
   */
  findSymbolsByNames(
    names: string[]
  ): Map<string, { id: string; name: string; type: string; filePath: string; line: number }> {
    const results = new Map<
      string,
      { id: string; name: string; type: string; filePath: string; line: number }
    >();
    const canonicalView = this.canonicalQueryView();
    if (canonicalView) {
      for (const name of names) {
        const canonical = canonicalView.findByName(name);
        if (!canonical) continue;
        results.set(name, {
          id: canonical.node.id,
          name: canonicalNodeDisplayName(canonical.node),
          type: canonical.node.kind,
          filePath: canonical.filePath,
          line: canonical.line,
        });
      }
      return results;
    }
    if (!this.db || names.length === 0) return results;

    /** Database result for symbol lookup */
    type SymbolLocation = {
      id: string;
      name: string;
      type: string;
      file_path: string;
      line: number | null;
    };

    try {
      // Check cache first for each name
      const uncachedNames: string[] = [];
      for (const name of names) {
        const cached = this.cacheManager.get<{
          id: string;
          name: string;
          type: string;
          filePath: string;
          line: number;
        } | null>(CACHE_NAMES.SYMBOL, `name:${name}`);
        if (cached !== undefined) {
          if (cached !== null) {
            results.set(name, cached);
          }
        } else {
          uncachedNames.push(name);
        }
      }

      if (uncachedNames.length === 0) return results;

      // Batch query for uncached names using IN clause
      const placeholders = uncachedNames.map(() => '?').join(',');
      const batchStmt = this.db.prepare(`
        SELECT id, name, type, file_path, line
        FROM symbols
        WHERE name IN (${placeholders})
      `);

      const symbols = batchStmt.all(...uncachedNames) as SymbolLocation[];

      // Build lookup map from results
      const foundNames = new Set<string>();
      for (const symbol of symbols) {
        const result = {
          id: symbol.id,
          name: symbol.name,
          type: symbol.type,
          filePath: symbol.file_path,
          line: symbol.line || 1,
        };
        results.set(symbol.name, result);
        foundNames.add(symbol.name);
        // Cache the result
        this.cacheManager.set(CACHE_NAMES.SYMBOL, `name:${symbol.name}`, result);
      }

      // Cache null for not found names
      for (const name of uncachedNames) {
        if (!foundNames.has(name)) {
          this.cacheManager.set(CACHE_NAMES.SYMBOL, `name:${name}`, null);
        }
      }

      return results;
    } catch (error) {
      console.error(`findSymbolsByNames error: ${error}`);
      return results;
    }
  }

  /**
   * Close database connection and cleanup all resources
   *
   * This method should be called when the LSP server shuts down
   * to prevent memory leaks.
   *
   * @returns void - No return value
   */
  close(): void {
    this.unsavedOverlays.clear();
    this.overlayViews.clear();
    this.pendingSavedOverlayGenerations.clear();
    this.workspaceOverlayView = null;
    this.canonicalView = null;
    this.canonicalRevisionId = null;
    this.canonicalDiagnostics = [];
    this.canonicalCoordinator?.close();
    this.canonicalCoordinator = null;
    this.canonicalRepository?.close();
    this.canonicalRepository = null;

    // Dispose cache manager (stops timer and clears caches)
    this.cacheManager.dispose();

    // Dispose statement manager
    if (this.statementManager) {
      this.statementManager.dispose();
      this.statementManager = null;
    }

    // Close database connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

function uniqueDiagnostics(diagnostics: readonly DiagnosticInfo[]): DiagnosticInfo[] {
  const byKey = new Map<string, DiagnosticInfo>();
  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.line,
      diagnostic.startCol ?? '',
      diagnostic.endLine ?? '',
      diagnostic.endCol ?? '',
      diagnostic.code ?? '',
      diagnostic.severity,
      diagnostic.message,
    ].join('\u0000');
    if (!byKey.has(key)) byKey.set(key, diagnostic);
  }
  return [...byKey.values()];
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
