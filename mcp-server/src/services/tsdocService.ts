/**
 * TSDoc Service - Direct Database Access Layer
 *
 * @packageDocumentation
 * @doc [[MCP Integration]]
 * @context Direct read-only SQLite data access layer over `.tsdoc.db`, canonical `@ttsc/graph`, and `.tsdoc/spec-graph.db` for MCP tools
 * @functionality Lazy read-only SQLite connection pooling, symbol search, ontology statistics, relationship traversal, work/design context, impact analysis, and spec bindings
 * @sideEffect database: Opens and queries `.tsdoc.db`, canonical graph SQLite DB, and `.tsdoc/spec-graph.db` in read-only mode (read)
 * @sideEffect filesystem: Reads `.tsdoc.config.json` and workspace files when resolving database paths and context (read)
 *
 * @remarks
 * Provides direct SQLite access to TSDoc Edge knowledge graph for MCP tools.
 * This service replaces CLI execution with database queries for better performance.
 *
 * ## Purpose
 * Enable LLMs to query codebase knowledge graph through MCP without subprocess overhead
 *
 * ## Context
 * - Used by all 7 MCP tools ([[SearchSymbolsTool]], [[GetOntologyStatsTool]], etc.)
 * - Operates on TSDoc Edge database: `.tsdoc.db` (configured via `.tsdoc.config.json`, with legacy `.tsdoc/symbols.db` fallback)
 * - Read-only operations for safety
 *
 * ## Design Decisions
 *
 * @decision Direct Database Access
 * Replaced exec-based CLI calls with better-sqlite3 for:
 * - 10x faster queries (under 10ms avg)
 * - No subprocess overhead
 * - Better error handling
 * - Connection pooling
 *
 * @decision Readonly Mode
 * Database opened readonly to ensure MCP tools cannot corrupt data
 *
 * @decision Lazy Connection
 * Connection established on first query to minimize resource usage
 */

import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { ERROR_MESSAGES } from '../constants.js';
import type { ImpactNode, ImpactResult, OntologyStats, Relationship, Symbol } from '../types.js';

interface CanonicalNode {
  id: string;
  kind: string;
  name?: string;
  qualifiedName?: string;
  file?: string;
  exported?: boolean;
  external?: boolean;
  evidence?: { startLine?: number };
}

interface CanonicalEdge {
  kind: string;
  from: string;
  to: string;
  evidence?: Record<string, unknown>;
}

interface CanonicalSnapshot {
  revisionId: string;
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  aliases: Array<{ canonicalId: string; legacyId: string }>;
}

interface SpecSnapshot {
  revisionId: string;
  contentFingerprint: string;
  workspaceId: string;
  provenance: Record<string, unknown>;
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
  bindings: Array<Record<string, unknown>>;
}

/**
 * Service for direct TSDoc Edge database access
 *
 * @doc [[MCP Integration]]
 * @sideEffect database: Opens and queries `.tsdoc.db`, canonical graph SQLite DB, and `.tsdoc/spec-graph.db` in read-only mode (read)
 * @sideEffect filesystem: Reads `.tsdoc.config.json` and workspace files when resolving database paths and context (read)
 * @public
 *
 * @remarks
 * Main service class for MCP server database operations.
 * Provides simplified API over TSDoc Edge database schema.
 *
 * ## Responsibilities
 * - Database connection management (lazy loading, cleanup)
 * - Symbol and relationship queries
 * - Ontology statistics calculation
 * - Context aggregation for files
 *
 * ## Lifecycle
 * 1. Constructor: Sets database path
 * 2. First query: Opens readonly connection
 * 3. Multiple queries: Reuses connection
 * 4. close(): Explicitly closes connection
 *
 * @contract
 * - MUST call close() when service is no longer needed
 * - Database path MUST be valid TSDoc Edge workspace
 * - All queries are readonly and safe
 *
 * @throws Error - Database Not Found if `.tsdoc.db` doesn't exist; caller should run `tsdoc-edge build src`
 *
 * @example
 * ```typescript
 * const service = new TsDocService('/path/to/workspace');
 *
 * if (!service.isDatabaseAvailable()) {
 *   console.error('Run: tsdoc-edge build src');
 *   process.exit(1);
 * }
 *
 * const stats = await service.getOntologyStats(true);
 * console.log(`${stats.nodes.total} symbols indexed`);
 *
 * service.close();
 * ```
 */
export class TsDocService {
  private readonly workspaceRoot: string;
  private dbPath: string;
  private db: Database.Database | null = null;
  private canonicalDb: Database.Database | null = null;
  private specDb: Database.Database | null = null;
  private readonly canonicalDbPath: string;
  private readonly specDbPath: string;
  private relationshipsCache: Relationship[] | null = null;

  /**
   * Initialize TSDoc service
   *
   * @param workspaceRoot - Path to TSDoc Edge workspace (defaults to cwd)
   *
   * @remarks
   * Resolves database path from `.tsdoc.config.json` (`paths.databasePath`),
   * falling back to `.tsdoc.db` and legacy `.tsdoc/symbols.db`.
   * Does NOT open connection - connection is lazy loaded on first query.
   *
   * @public
   */
  constructor(workspaceRoot?: string) {
    this.workspaceRoot = path.resolve(workspaceRoot || process.cwd());
    this.dbPath = this.resolveDatabasePath(this.workspaceRoot);
    this.canonicalDbPath = this.resolveCanonicalGraphPath(this.workspaceRoot);
    this.specDbPath = this.resolveSpecGraphPath(this.workspaceRoot);
  }

  /** Resolve the canonical graph database path from project configuration. @internal */
  private resolveCanonicalGraphPath(rootDir: string): string {
    const configPath = path.join(rootDir, '.tsdoc.config.json');
    if (fs.existsSync(configPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
          canonicalGraph?: { databasePath?: string };
        };
        if (parsed.canonicalGraph?.databasePath) {
          return path.resolve(rootDir, parsed.canonicalGraph.databasePath);
        }
      } catch {
        // Use the canonical default below.
      }
    }
    return path.join(rootDir, '.tsdoc', 'canonical-graph.db');
  }

  /** Resolve the specification graph database path from environment/config/defaults. @internal */
  private resolveSpecGraphPath(rootDir: string): string {
    const configured = process.env.TSDOC_EDGE_SPEC_GRAPH_DB;
    if (configured) return path.resolve(rootDir, configured);
    const configPath = path.join(rootDir, '.tsdoc.config.json');
    if (fs.existsSync(configPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
          specGraph?: { databasePath?: string };
        };
        if (parsed.specGraph?.databasePath) {
          return path.resolve(rootDir, parsed.specGraph.databasePath);
        }
      } catch {
        // Use the specification graph default below.
      }
    }
    return path.join(rootDir, '.tsdoc', 'spec-graph.db');
  }

  /** Open the canonical graph database only when it exists. @internal */
  private getCanonicalDb(): Database.Database | null {
    if (!fs.existsSync(this.canonicalDbPath)) return null;
    if (!this.canonicalDb) {
      this.canonicalDb = new Database(this.canonicalDbPath, {
        readonly: true,
        fileMustExist: true,
      });
    }
    return this.canonicalDb;
  }

  /** Open the specification graph database only when it exists. @internal */
  private getSpecDb(): Database.Database | null {
    if (!fs.existsSync(this.specDbPath)) return null;
    if (!this.specDb) {
      this.specDb = new Database(this.specDbPath, { readonly: true, fileMustExist: true });
    }
    return this.specDb;
  }

  /** Read the active canonical graph revision in one read-only snapshot. @internal */
  private getCanonicalSnapshot(): CanonicalSnapshot | null {
    const db = this.getCanonicalDb();
    if (!db) return null;
    try {
      const state = db
        .prepare('SELECT active_revision_id FROM canonical_graph_state WHERE singleton = 1')
        .get() as { active_revision_id: string } | undefined;
      if (!state) return null;
      const nodes = db
        .prepare(
          'SELECT payload_json FROM canonical_graph_nodes WHERE revision_id = ? ORDER BY ordinal'
        )
        .all(state.active_revision_id)
        .map(
          (row) =>
            JSON.parse(String((row as { payload_json: string }).payload_json)) as CanonicalNode
        );
      const edges = db
        .prepare(
          'SELECT payload_json FROM canonical_graph_edges WHERE revision_id = ? ORDER BY ordinal'
        )
        .all(state.active_revision_id)
        .map(
          (row) =>
            JSON.parse(String((row as { payload_json: string }).payload_json)) as CanonicalEdge
        );
      const aliases = db
        .prepare(
          'SELECT canonical_id, legacy_id FROM canonical_symbol_aliases WHERE revision_id = ?'
        )
        .all(state.active_revision_id) as Array<{ canonical_id: string; legacy_id: string }>;
      return {
        revisionId: state.active_revision_id,
        nodes,
        edges,
        aliases: aliases.map((alias) => ({
          canonicalId: alias.canonical_id,
          legacyId: alias.legacy_id,
        })),
      };
    } catch {
      return null;
    }
  }

  /** Read the active specification graph revision. @internal */
  private getSpecSnapshot(): SpecSnapshot | null {
    const db = this.getSpecDb();
    if (!db) return null;
    try {
      const state = db
        .prepare('SELECT active_revision_id FROM spec_graph_state WHERE singleton = 1')
        .get() as { active_revision_id: string } | undefined;
      if (!state) return null;
      const row = db
        .prepare(
          'SELECT content_fingerprint, workspace_id, payload_json FROM spec_graph_revisions WHERE revision_id = ?'
        )
        .get(state.active_revision_id) as
        | { content_fingerprint: string; workspace_id: string; payload_json: string }
        | undefined;
      if (!row) return null;
      const payload = JSON.parse(row.payload_json) as {
        contentFingerprint?: string;
        workspaceId?: string;
        provenance?: Record<string, unknown>;
        nodes?: Array<Record<string, unknown>>;
        edges?: Array<Record<string, unknown>>;
        bindings?: Array<Record<string, unknown>>;
      };
      return {
        revisionId: state.active_revision_id,
        contentFingerprint: payload.contentFingerprint ?? row.content_fingerprint,
        workspaceId: payload.workspaceId ?? row.workspace_id,
        provenance: payload.provenance ?? {},
        nodes: payload.nodes ?? [],
        edges: payload.edges ?? [],
        bindings: payload.bindings ?? [],
      };
    } catch {
      return null;
    }
  }

  /** Identify canonical external and standard-library nodes. @internal */
  private isExternalNode(node: CanonicalNode): boolean {
    return (
      node.external === true ||
      /(^|\/)(node_modules|libs)(\/|:)/.test(node.file ?? '') ||
      (node.file ?? '').includes('/bundled:')
    );
  }

  /** Convert a canonical node to the stable MCP symbol shape. @internal */
  private mapCanonicalNode(node: CanonicalNode, snapshot: CanonicalSnapshot): Symbol {
    const legacyId = snapshot.aliases.find((alias) => alias.canonicalId === node.id)?.legacyId;
    return {
      id: legacyId ?? node.id,
      canonicalId: node.id,
      name: node.name ?? node.qualifiedName?.split('.').pop() ?? node.id,
      type: node.kind,
      kind: node.kind,
      ...(node.file ? { filePath: node.file } : {}),
      ...(node.evidence?.startLine ? { line: node.evidence.startLine } : {}),
      ...(node.exported !== undefined ? { isExported: node.exported } : {}),
      ...(node.external !== undefined ? { external: node.external } : {}),
    };
  }

  /** Resolve a requested identifier against canonical IDs and aliases. @internal */
  private resolveCanonicalId(value: string, snapshot: CanonicalSnapshot): string | null {
    if (snapshot.nodes.some((node) => node.id === value)) return value;
    const alias = snapshot.aliases.find((entry) => entry.legacyId === value);
    if (alias) return alias.canonicalId;
    const lower = value.toLowerCase();
    const node = snapshot.nodes.find((entry) => (entry.name ?? '').toLowerCase() === lower);
    return node?.id ?? null;
  }

  /** Convert canonical edges into the backwards-compatible relationship shape. @internal */
  private canonicalRelationships(
    snapshot: CanonicalSnapshot,
    includeExternal: boolean
  ): Relationship[] {
    const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]));
    const aliases = new Map(snapshot.aliases.map((alias) => [alias.canonicalId, alias.legacyId]));
    return snapshot.edges
      .filter((edge) => {
        const from = nodes.get(edge.from);
        const to = nodes.get(edge.to);
        return Boolean(
          from &&
            to &&
            (includeExternal || (!this.isExternalNode(from) && !this.isExternalNode(to)))
        );
      })
      .map((edge) => ({
        id: `canonical:${edge.kind}:${edge.from}:${edge.to}`,
        type: edge.kind,
        category: 'structural',
        direction: 'unidirectional',
        strength: 'strong',
        from: aliases.get(edge.from) ?? edge.from,
        to: aliases.get(edge.to) ?? edge.to,
        confidence: 1,
        properties: { canonical: true, evidence: edge.evidence },
      }));
  }

  /** Check whether the enrichment SQLite database (`.tsdoc.db`) exists on disk. @internal */
  /**
   * Check whether the enrichment SQLite database (`.tsdoc.db`) exists on disk.
   *
   * @returns True when the enrichment database file exists
   * @internal
   */
  private hasEnrichmentDatabase(): boolean {
    if (!fs.existsSync(this.dbPath)) {
      this.dbPath = this.resolveDatabasePath(this.workspaceRoot);
    }
    return fs.existsSync(this.dbPath);
  }

  /**
   * Compose canonical `@ttsc/graph` structural edges with retained `.tsdoc.db`
   * non-structural enrichment relationships (`testing`, `verification`, `semantic`,
   * `architectural`, `constraint`) per the C2 Capability Owner Matrix.
   *
   * @param includeExternal - Whether to include external library edges from `@ttsc/graph`
   * @returns Combined canonical structural and retained enrichment relationships
   * @internal
   */
  private getComposedRelationships(includeExternal: boolean): Relationship[] {
    const canonical = this.getCanonicalSnapshot();
    if (!canonical) {
      return this.getAllUnifiedRelationships();
    }
    const structural = this.canonicalRelationships(canonical, includeExternal);
    if (!this.hasEnrichmentDatabase()) {
      return structural;
    }
    const retainedEnrichment = this.getAllUnifiedRelationships().filter(
      (rel) => rel.category !== 'structural'
    );
    return [...structural, ...retainedEnrichment];
  }

  /**
   * Match relationship type names across canonical `@ttsc/graph` and legacy enrichment aliases.
   *
   * @param actual - Stored relationship type identifier
   * @param requested - Requested filter relationship type identifier
   * @returns True when `actual` and `requested` refer to the same relationship kind
   * @internal
   */
  private matchesRelationshipType(actual: string, requested: string): boolean {
    if (actual === requested) return true;
    const aliasGroups: ReadonlyArray<ReadonlySet<string>> = [
      new Set(['calls', 'call']),
      new Set(['type_ref', 'type-reference', 'type-dependency']),
      new Set(['extends', 'inheritance']),
      new Set(['implements', 'implementation']),
    ];
    return aliasGroups.some((group) => group.has(actual) && group.has(requested));
  }

  /**
   * Resolve SQLite database path from `.tsdoc.config.json`, `.tsdoc.db`, or legacy `.tsdoc/symbols.db`.
   *
   * @internal
   */
  private resolveDatabasePath(rootDir: string): string {
    const configPath = path.join(rootDir, '.tsdoc.config.json');
    if (fs.existsSync(configPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
          paths?: { databasePath?: string };
          database?: string;
        };
        const configured = parsed.paths?.databasePath || parsed.database;
        if (configured) {
          const resolved = path.resolve(rootDir, configured);
          if (fs.existsSync(resolved)) {
            return resolved;
          }
        }
      } catch {
        // Fall through to default locations
      }
    }

    const defaultDb = path.join(rootDir, '.tsdoc.db');
    if (fs.existsSync(defaultDb)) {
      return defaultDb;
    }

    const legacyDb = path.join(rootDir, '.tsdoc', 'symbols.db');
    if (fs.existsSync(legacyDb)) {
      return legacyDb;
    }

    return defaultDb;
  }

  /**
   * Check if TSDoc Edge database exists
   *
   * @returns True if database file exists at configured path
   *
   * @remarks
   * Checks filesystem for the resolved SQLite database without opening connection.
   *
   * @public
   */
  isDatabaseAvailable(): boolean {
    if (!fs.existsSync(this.dbPath)) {
      this.dbPath = this.resolveDatabasePath(this.workspaceRoot);
    }
    return fs.existsSync(this.dbPath) || this.getCanonicalSnapshot() !== null;
  }

  /**
   * Get database connection (lazy loaded)
   *
   * @returns SQLite database instance
   * @throws Error - If database does not exist (run `tsdoc-edge build src`)
   *
   * @remarks
   * Returns existing connection or creates new readonly connection.
   *
   * @contract
   * - Connection MUST be closed with `close()` when done
   * - Database opened readonly - cannot modify data
   *
   * @internal
   */
  private getDb(): Database.Database {
    if (!this.isDatabaseAvailable()) {
      throw new Error(ERROR_MESSAGES.DATABASE_NOT_FOUND);
    }

    if (!this.db) {
      this.db = new Database(this.dbPath, { readonly: true, fileMustExist: true });
    }

    return this.db;
  }

  /**
   * Close database connection
   *
   * @remarks
   * Explicitly closes connection and releases file descriptor.
   *
   * @contract
   * Safe to call multiple times - no-op if already closed
   *
   * @public
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (this.canonicalDb) {
      this.canonicalDb.close();
      this.canonicalDb = null;
    }
    if (this.specDb) {
      this.specDb.close();
      this.specDb = null;
    }
    // Clear cache
    this.relationshipsCache = null;
  }

  /**
   * Get all unified relationships from database
   *
   * @returns Array of all relationships with parsed JSON fields
   *
   * @remarks
   * Fetches all relationships and parses JSON columns into TypeScript types.
   * Cached in memory for duration of query (under 50ms for ~20K rows).
   *
   * @contract
   * Returns all relationships - caller must filter/paginate
   *
   * @internal
   */
  private getAllUnifiedRelationships(): Relationship[] {
    // Return cached relationships if available (performance optimization)
    if (this.relationshipsCache) {
      return this.relationshipsCache;
    }

    const db = this.getDb();

    const rows = db
      .prepare(`
      SELECT * FROM unified_relationships
    `)
      .all() as Array<{
      id: string;
      type: string;
      category: string;
      direction: string;
      strength: string;
      from_symbols: string;
      to_symbols: string;
      confidence: number;
      description: string | null;
      properties: string | null;
    }>;

    const relationships = rows.map((row) => ({
      id: row.id,
      type: row.type,
      category: row.category,
      direction: row.direction as 'unidirectional' | 'bidirectional' | 'undirected',
      strength: row.strength as 'strong' | 'medium' | 'weak',
      from: JSON.parse(row.from_symbols),
      to: JSON.parse(row.to_symbols),
      confidence: row.confidence,
      description: row.description || undefined,
      properties: row.properties ? JSON.parse(row.properties) : undefined,
    }));

    // Cache for subsequent calls
    this.relationshipsCache = relationships;

    return relationships;
  }

  /**
   * Get comprehensive ontology statistics
   *
   * @param _detailed - Include detailed breakdowns (currently unused)
   * @returns Statistics about knowledge graph structure
   *
   * @remarks
   * Calculates comprehensive statistics about codebase knowledge graph.
   * Used by [[tsdoc_get_ontology_stats]] MCP tool.
   *
   * ## Purpose
   * Provide LLMs with graph overview for complexity analysis
   *
   * ## Calculated Metrics
   *
   * ### Node Statistics
   * - Total count
   * - Distribution by type (class, function, method, etc.)
   * - Distribution by kind (if available)
   *
   * ### Relationship Statistics
   * - Total count
   * - Distribution by type (imports, extends, test-coverage, etc.)
   * - Distribution by category (structural, testing, semantic, etc.)
   * - Distribution by strength (strong, medium, weak)
   * - Distribution by direction (uni/bi/undirected)
   * - Explicit vs inferred count
   *
   * ### Graph Metrics
   * - Density: relationships per node
   * - Average degree: average connections per node
   * - Max degree: most connected node
   * - Coverage: percentage of nodes with ≥1 relationship
   *
   * ## Algorithm
   * 1. Load all symbols and relationships
   * 2. Group by various dimensions
   * 3. Calculate degree distribution
   * 4. Compute graph-level metrics
   *
   * ## Performance
   * - O(n) where n = symbols + relationships
   * - Typical: 5K symbols + 20K rels = ~100ms
   *
   * @example
   * ```typescript
   * const stats = await service.getOntologyStats();
   * console.log(`Density: ${stats.metrics.density.toFixed(2)}`);
   * console.log(`Coverage: ${stats.metrics.coverage.toFixed(1)}%`);
   * ```
   *
   * @public
   */
  async getOntologyStats(
    _detailed: boolean = false,
    includeExternal: boolean = false
  ): Promise<OntologyStats> {
    const canonical = this.getCanonicalSnapshot();
    if (canonical) {
      const nodes = canonical.nodes.filter((node) => includeExternal || !this.isExternalNode(node));
      const structuralRelationships = this.canonicalRelationships(canonical, includeExternal);
      const composedRelationships = this.getComposedRelationships(includeExternal);
      const byType = new Map<string, number>();
      for (const node of nodes) byType.set(node.kind, (byType.get(node.kind) ?? 0) + 1);
      const byRelType = new Map<string, number>();
      const byRelCategory = new Map<string, number>();
      const byRelStrength = new Map<string, number>();
      const byRelDirection = new Map<string, number>();
      let explicit = 0;
      let inferred = 0;
      for (const rel of composedRelationships) {
        byRelType.set(rel.type, (byRelType.get(rel.type) ?? 0) + 1);
        byRelCategory.set(rel.category, (byRelCategory.get(rel.category) ?? 0) + 1);
        byRelStrength.set(rel.strength, (byRelStrength.get(rel.strength) ?? 0) + 1);
        byRelDirection.set(rel.direction, (byRelDirection.get(rel.direction) ?? 0) + 1);
        if (rel.properties?.inferred === true) inferred += 1;
        else explicit += 1;
      }
      const degree = new Map<string, number>();
      for (const rel of structuralRelationships) {
        for (const id of [rel.from, rel.to])
          degree.set(String(id), (degree.get(String(id)) ?? 0) + 1);
      }
      const degrees = [...degree.values()];
      return {
        nodes: {
          total: nodes.length,
          byType: Object.fromEntries(byType),
          byKind: Object.fromEntries(byType),
        },
        relationships: {
          total: composedRelationships.length,
          byType: Object.fromEntries(byRelType),
          byCategory: Object.fromEntries(byRelCategory),
          byStrength: Object.fromEntries(byRelStrength),
          byDirection: Object.fromEntries(byRelDirection),
          explicit,
          inferred,
        },
        metrics: {
          density: nodes.length ? structuralRelationships.length / nodes.length : 0,
          avgDegree: degrees.length
            ? degrees.reduce((sum, value) => sum + value, 0) / degrees.length
            : 0,
          maxDegree: degrees.length ? Math.max(...degrees) : 0,
          coverage: nodes.length ? (degree.size / nodes.length) * 100 : 0,
        },
      };
    }
    const db = this.getDb();

    // Get all symbols
    const symbols = db.prepare('SELECT * FROM symbols').all() as Array<{
      id: string;
      name: string;
      type: string;
      kind?: string;
    }>;

    // Get all relationships
    const relationships = this.getAllUnifiedRelationships();

    // Calculate node statistics
    const nodesByType = new Map<string, number>();
    const nodesByKind = new Map<string, number>();

    for (const symbol of symbols) {
      nodesByType.set(symbol.type, (nodesByType.get(symbol.type) || 0) + 1);
      if (symbol.kind) {
        nodesByKind.set(symbol.kind, (nodesByKind.get(symbol.kind) || 0) + 1);
      }
    }

    // Calculate relationship statistics
    const relsByType = new Map<string, number>();
    const relsByCategory = new Map<string, number>();
    const relsByStrength = new Map<string, number>();
    const relsByDirection = new Map<string, number>();
    let explicitCount = 0;
    let inferredCount = 0;

    for (const rel of relationships) {
      relsByType.set(rel.type, (relsByType.get(rel.type) || 0) + 1);
      relsByCategory.set(rel.category, (relsByCategory.get(rel.category) || 0) + 1);
      relsByStrength.set(rel.strength, (relsByStrength.get(rel.strength) || 0) + 1);
      relsByDirection.set(rel.direction, (relsByDirection.get(rel.direction) || 0) + 1);

      if (rel.properties?.inferred === true) {
        inferredCount++;
      } else {
        explicitCount++;
      }
    }

    // Calculate graph metrics
    const totalNodes = symbols.length;
    const totalRels = relationships.length;
    const density = totalNodes > 0 ? totalRels / totalNodes : 0;

    // Calculate degree distribution
    const degrees = new Map<string, number>();
    for (const rel of relationships) {
      const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
      const tos = Array.isArray(rel.to) ? rel.to : [rel.to];

      for (const from of froms) {
        degrees.set(from, (degrees.get(from) || 0) + 1);
      }
      for (const to of tos) {
        degrees.set(to, (degrees.get(to) || 0) + 1);
      }
    }

    const degreeValues = Array.from(degrees.values());
    const avgDegree =
      degreeValues.length > 0 ? degreeValues.reduce((a, b) => a + b, 0) / degreeValues.length : 0;
    const maxDegree = degreeValues.length > 0 ? Math.max(...degreeValues) : 0;
    const coverage = totalNodes > 0 ? (degrees.size / totalNodes) * 100 : 0;

    return {
      nodes: {
        total: totalNodes,
        byType: Object.fromEntries(nodesByType),
        byKind: Object.fromEntries(nodesByKind),
      },
      relationships: {
        total: totalRels,
        byType: Object.fromEntries(relsByType),
        byCategory: Object.fromEntries(relsByCategory),
        byStrength: Object.fromEntries(relsByStrength),
        byDirection: Object.fromEntries(relsByDirection),
        explicit: explicitCount,
        inferred: inferredCount,
      },
      metrics: {
        density,
        avgDegree,
        maxDegree,
        coverage,
      },
    };
  }

  /**
   * List relationships with filtering and pagination
   *
   * @param params - Filter and pagination options (`type`, `category`, `strength`, `from`, `to`, `limit`, `offset`)
   * @returns Filtered relationships with total count
   *
   * @remarks
   * Flexible relationship query with multiple filter dimensions.
   * Used by [[tsdoc_list_relationships]] MCP tool.
   *
   * ## Purpose
   * Enable targeted exploration of specific relationship types
   *
   * ## Filter Logic
   * Filters applied sequentially (AND logic):
   * 1. Type filter (exact match)
   * 2. Category filter (exact match)
   * 3. Strength filter (exact match)
   * 4. From filter (symbol ID in from array)
   * 5. To filter (symbol ID in to array)
   * 6. Pagination (slice)
   *
   * ## Performance
   * - O(n) where n = total relationships
   * - Filters in-memory (fast enough for 20K relationships)
   * - Consider indexing if over 100K relationships
   *
   * @example
   * ```typescript
   * // Find all test coverage relationships
   * const result = await service.listRelationships({
   *   type: 'test-coverage',
   *   category: 'testing',
   *   limit: 50
   * });
   *
   * console.log(`Found ${result.total} test coverage relationships`);
   * ```
   *
   * @public
   */
  async listRelationships(params: {
    type?: string;
    category?: string;
    strength?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
    includeExternal?: boolean;
  }): Promise<{ total: number; relationships: Relationship[] }> {
    let relationships = this.getComposedRelationships(params.includeExternal ?? false);

    // Apply filters
    const requestedType = params.type;
    if (requestedType) {
      relationships = relationships.filter((r) =>
        this.matchesRelationshipType(r.type, requestedType)
      );
    }
    if (params.category) {
      relationships = relationships.filter((r) => r.category === params.category);
    }
    if (params.strength) {
      relationships = relationships.filter((r) => r.strength === params.strength);
    }
    const from = params.from;
    if (from) {
      relationships = relationships.filter((r) => {
        const froms = Array.isArray(r.from) ? r.from : [r.from];
        return froms.includes(from);
      });
    }
    const to = params.to;
    if (to) {
      relationships = relationships.filter((r) => {
        const tos = Array.isArray(r.to) ? r.to : [r.to];
        return tos.includes(to);
      });
    }

    const total = relationships.length;

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    relationships = relationships.slice(offset, offset + limit);

    return { total, relationships };
  }

  /**
   * Search for symbols by name or ID
   *
   * @param params - Search and filter options (`query`, `type`, `limit`, `offset`)
   * @returns Matching symbols with total count
   *
   * @remarks
   * Flexible symbol search with type filtering and pagination.
   * Used by [[tsdoc_search_symbols]] MCP tool.
   *
   * ## Purpose
   * Enable LLMs to find specific symbols by name or pattern
   *
   * ## Search Algorithm
   * 1. Filter by type (SQL WHERE clause if provided)
   * 2. Order by name (SQL ORDER BY)
   * 3. Load results into memory
   * 4. Filter by query substring (case-insensitive)
   * 5. Apply pagination (slice)
   *
   * ## Query Matching
   * - Matches against symbol.name OR symbol.id
   * - Case-insensitive substring match
   * - Examples:
   *   - "Manager" matches "DatabaseManager", "ConfigManager"
   *   - "test" matches "test-suite", "testFunction"
   *
   * ## Performance
   * - O(n) where n = filtered symbols (after type filter)
   * - Typical: ~200 classes, ~1600 methods
   * - Query filter in-memory: ~5ms for 5K symbols
   *
   * @example
   * ```typescript
   * // Find all Manager classes
   * const result = await service.searchSymbols({
   *   query: 'Manager',
   *   type: 'class',
   *   limit: 10
   * });
   *
   * for (const symbol of result.nodes) {
   *   console.log(`${symbol.name} in ${symbol.filePath}`);
   * }
   * ```
   *
   * @public
   */
  async searchSymbols(params: {
    query?: string;
    type?: string;
    limit?: number;
    offset?: number;
    includeExternal?: boolean;
  }): Promise<{ total: number; nodes: Symbol[] }> {
    const canonical = this.getCanonicalSnapshot();
    if (canonical) {
      let nodes = canonical.nodes
        .filter((node) => params.includeExternal || !this.isExternalNode(node))
        .map((node) => this.mapCanonicalNode(node, canonical));
      if (params.type) nodes = nodes.filter((node) => node.type === params.type);
      if (params.query) {
        const query = params.query.toLowerCase();
        nodes = nodes.filter(
          (node) =>
            node.name.toLowerCase().includes(query) ||
            node.id.toLowerCase().includes(query) ||
            node.canonicalId?.toLowerCase().includes(query)
        );
      }
      nodes.sort((left, right) => left.name.localeCompare(right.name));
      const total = nodes.length;
      const offset = params.offset ?? 0;
      return { total, nodes: nodes.slice(offset, offset + (params.limit ?? 20)) };
    }
    const db = this.getDb();

    let sql = 'SELECT * FROM symbols';
    const sqlParams: string[] = [];

    if (params.type) {
      sql += ' WHERE type = ?';
      sqlParams.push(params.type);
    }

    sql += ' ORDER BY name';

    const rawNodes = db.prepare(sql).all(...sqlParams) as Array<Record<string, unknown>>;
    let nodes = rawNodes.map((row) => this.mapSymbolRow(row));

    // Filter by query if provided
    if (params.query) {
      const query = params.query.toLowerCase();
      nodes = nodes.filter(
        (node) => node.name.toLowerCase().includes(query) || node.id.toLowerCase().includes(query)
      );
    }

    const total = nodes.length;

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    nodes = nodes.slice(offset, offset + limit);

    return { total, nodes };
  }

  /**
   * Get work context for a file
   *
   * @param filePath - Path to file (absolute or relative)
   * @param _depth - Context depth (currently unused, always depth=1)
   * @returns Markdown summary of file symbols and relationships
   *
   * @remarks
   * Generates work context for a file including symbols and relationships.
   * Used by [[tsdoc_get_work_context]] MCP tool.
   *
   * @example
   * ```typescript
   * const context = await service.getWorkContext(
   *   'src/commands/HealthCommand.ts'
   * );
   * console.log(context); // Markdown output
   * ```
   *
   * @public
   */
  async getWorkContext(
    filePath: string,
    _depth: number = 2,
    includeExternal: boolean = false
  ): Promise<string> {
    const canonical = this.getCanonicalSnapshot();
    if (canonical) {
      const normalizedPath = path.isAbsolute(filePath)
        ? path.relative(this.workspaceRoot, filePath)
        : filePath;
      const symbols = canonical.nodes
        .filter(
          (node) => node.file === normalizedPath && (includeExternal || !this.isExternalNode(node))
        )
        .map((node) => this.mapCanonicalNode(node, canonical));
      if (symbols.length === 0) {
        return `# Work Context\n\nNo symbols found in file: ${filePath}\n\nPlease ensure the file has been indexed with: tsdoc-edge build src`;
      }
      const ids = new Set(symbols.map((symbol) => symbol.canonicalId ?? symbol.id));
      const relationships = this.canonicalRelationships(canonical, includeExternal).filter(
        (rel) => {
          const from = Array.isArray(rel.from) ? rel.from : [rel.from];
          const to = Array.isArray(rel.to) ? rel.to : [rel.to];
          return (
            from.some((id) => ids.has(String(id)) || symbols.some((symbol) => symbol.id === id)) ||
            to.some((id) => ids.has(String(id)) || symbols.some((symbol) => symbol.id === id))
          );
        }
      );
      let markdown = `# Work Context: ${path.basename(filePath)}\n\nFile: ${filePath}\n\n## Summary\n\n`;
      markdown += `- **Symbols**: ${symbols.length}\n- **Relationships**: ${relationships.length}\n- **Density**: ${(relationships.length / symbols.length).toFixed(2)}\n- **Graph**: canonical revision \`${canonical.revisionId}\`\n\n## Symbols\n\n`;
      for (const symbol of symbols.slice(0, 20))
        markdown += `- **${symbol.name}** (${symbol.type})\n`;
      markdown += '\n## Relationships\n\n';
      for (const rel of relationships.slice(0, 50))
        markdown += `- **${rel.type}**: ${String(rel.from)} → ${String(rel.to)}\n`;
      return markdown;
    }
    const db = this.getDb();

    // Normalize path relative to workspaceRoot
    const normalizedPath = path.isAbsolute(filePath)
      ? path.relative(this.workspaceRoot, filePath)
      : filePath;

    // Get symbols in file
    const rawSymbols = db
      .prepare('SELECT * FROM symbols WHERE file_path = ?')
      .all(normalizedPath) as Array<Record<string, unknown>>;
    const symbols = rawSymbols.map((row) => this.mapSymbolRow(row));

    if (symbols.length === 0) {
      return `# Work Context\n\nNo symbols found in file: ${filePath}\n\nPlease ensure the file has been indexed with: tsdoc-edge build src`;
    }

    // Get relationships for these symbols
    const symbolIds = symbols.map((s) => s.id);
    const allRels = this.getAllUnifiedRelationships();
    const relationships = allRels.filter((rel) => {
      const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
      const tos = Array.isArray(rel.to) ? rel.to : [rel.to];
      return froms.some((f) => symbolIds.includes(f)) || tos.some((t) => symbolIds.includes(t));
    });

    // Build markdown output
    let markdown = `# Work Context: ${path.basename(filePath)}\n\n`;
    markdown += `File: ${filePath}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Symbols**: ${symbols.length}\n`;
    markdown += `- **Relationships**: ${relationships.length}\n`;
    markdown += `- **Density**: ${symbols.length > 0 ? (relationships.length / symbols.length).toFixed(2) : '0.00'}\n\n`;

    markdown += `## Symbols\n\n`;
    for (const symbol of symbols.slice(0, 20)) {
      markdown += `- **${symbol.name}** (${symbol.type})\n`;
    }
    if (symbols.length > 20) {
      markdown += `\n... and ${symbols.length - 20} more symbols\n`;
    }

    markdown += `\n## Relationships\n\n`;
    const relsByCategory = new Map<string, number>();
    for (const rel of relationships) {
      relsByCategory.set(rel.category, (relsByCategory.get(rel.category) || 0) + 1);
    }

    for (const [category, count] of relsByCategory) {
      markdown += `- **${category}**: ${count}\n`;
    }

    markdown += `\n*Note: For full LLM-optimized context, use: tsdoc-edge work-context ${filePath} --llm*\n`;

    return markdown;
  }

  /**
   * Get design context for a file
   *
   * @param filePath - Path to file
   * @returns Markdown summary of contracts, ADRs, error experiences, future plans, and related docs
   *
   * @remarks
   * Queries indexed contracts, decision records, error experiences, future plans, and doc references
   * directly from SQLite for the target file. Used by [[tsdoc_get_design_context]] MCP tool.
   *
   * @public
   */
  async getDesignContext(filePath: string, includeExternal: boolean = false): Promise<string> {
    const canonicalOnly = this.getCanonicalSnapshot();
    if (!fs.existsSync(this.dbPath) && canonicalOnly) {
      const normalizedPath = path.isAbsolute(filePath)
        ? path.relative(this.workspaceRoot, filePath)
        : filePath;
      const symbols = canonicalOnly.nodes
        .filter(
          (node) => node.file === normalizedPath && (includeExternal || !this.isExternalNode(node))
        )
        .map((node) => this.mapCanonicalNode(node, canonicalOnly));
      let markdown = `# Design Context: ${path.basename(filePath)}\n\n- **File**: \`${normalizedPath}\`\n- **Symbols**: ${symbols.length}\n- **Contracts**: 0 | **Decisions**: 0 | **Errors**: 0 | **Plans**: 0\n- **Graph**: canonical revision \`${canonicalOnly.revisionId}\`\n\n`;
      const spec = this.getSpecSnapshot();
      if (spec) {
        const canonicalIds = new Set(symbols.map((symbol) => symbol.canonicalId));
        const bindings = spec.bindings.filter((binding) => {
          const target = binding.target as Record<string, unknown> | undefined;
          return (
            typeof target?.canonicalNodeId === 'string' && canonicalIds.has(target.canonicalNodeId)
          );
        });
        markdown += `## Normative Specification Bindings\n\n- **Revision**: \`${spec.revisionId}\`\n- **Bindings**: ${bindings.length}\n\n`;
        for (const binding of bindings)
          markdown += `- **${String(binding.kind)}** \`${String(binding.specNodeId)}\`\n`;
      }
      return markdown;
    }
    const db = this.getDb();
    const normalizedPath = path.isAbsolute(filePath)
      ? path.relative(this.workspaceRoot, filePath)
      : filePath;

    const symbols = db
      .prepare('SELECT id, name, type, summary FROM symbols WHERE file_path = ?')
      .all(normalizedPath) as Array<{ id: string; name: string; type: string; summary?: string }>;

    if (symbols.length === 0) {
      return `# Design Context: ${path.basename(filePath)}\n\nNo indexed symbols found for \`${normalizedPath}\`.\nRun \`tsdoc-edge build src\` to index this file.\n`;
    }

    const symbolIds = symbols.map((s) => s.id);
    const symbolIdSet = new Set(symbolIds);
    const symbolNameById = new Map(symbols.map((s) => [s.id, s.name]));
    const placeholders = symbolIds.map(() => '?').join(', ');

    const contracts = db
      .prepare(
        `SELECT symbol_id, description, preconditions, postconditions, invariants FROM contracts WHERE symbol_id IN (${placeholders})`
      )
      .all(...symbolIds) as Array<{
      symbol_id: string;
      description: string;
      preconditions: string;
      postconditions: string;
      invariants: string;
    }>;

    const decisions = db
      .prepare(
        `SELECT symbol_id, title, decision, rationale, status, date FROM decision_records WHERE symbol_id IN (${placeholders})`
      )
      .all(...symbolIds) as Array<{
      symbol_id: string;
      title: string;
      decision: string;
      rationale: string;
      status: string;
      date: string;
    }>;

    const errors = db
      .prepare(
        `SELECT symbol_id, error_type, message, solution FROM error_experiences WHERE symbol_id IN (${placeholders})`
      )
      .all(...symbolIds) as Array<{
      symbol_id: string;
      error_type: string;
      message: string;
      solution: string;
    }>;

    const plans = db
      .prepare(
        `SELECT symbol_id, description, priority, status FROM future_plans WHERE symbol_id IN (${placeholders})`
      )
      .all(...symbolIds) as Array<{
      symbol_id: string;
      description: string;
      priority: string;
      status: string;
    }>;

    const docRefs = new Set<string>();
    for (const rel of this.getAllUnifiedRelationships()) {
      if (rel.type !== 'doc-reference') continue;
      const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
      if (!froms.some((id) => symbolIdSet.has(id))) continue;
      const tos = Array.isArray(rel.to) ? rel.to : [rel.to];
      for (const to of tos) {
        if (to) docRefs.add(to);
      }
    }

    let md = `# Design Context: ${path.basename(filePath)}\n\n`;
    md += `- **File**: \`${normalizedPath}\`\n`;
    md += `- **Symbols**: ${symbols.length}\n`;
    md += `- **Related Docs**: ${docRefs.size}\n`;
    md += `- **Contracts**: ${contracts.length} | **Decisions**: ${decisions.length} | **Errors**: ${errors.length} | **Plans**: ${plans.length}\n\n`;

    const spec = this.getSpecSnapshot();
    if (spec) {
      const canonical = this.getCanonicalSnapshot();
      const canonicalIdsForFile = new Set(
        canonical?.nodes.filter((node) => node.file === normalizedPath).map((node) => node.id) ?? []
      );
      const bindings = spec.bindings.filter((binding) => {
        const target = binding.target as Record<string, unknown> | undefined;
        const targetFile = typeof target?.file === 'string' ? target.file : undefined;
        return (
          includeExternal ||
          !targetFile ||
          !this.isExternalNode({ id: '', kind: '', file: targetFile })
        );
      });
      const relevant = bindings.filter((binding) => {
        const target = binding.target as Record<string, unknown> | undefined;
        return (
          target?.file === normalizedPath ||
          symbols.some((symbol) => target?.canonicalNodeId === symbol.id) ||
          (typeof target?.canonicalNodeId === 'string' &&
            canonicalIdsForFile.has(target.canonicalNodeId))
        );
      });
      md += `- **SpecGraph Revision**: \`${spec.revisionId}\`\n- **Normative Bindings**: ${relevant.length}\n\n`;
      if (relevant.length > 0) {
        md += '## Normative Specification Bindings\n\n';
        for (const binding of relevant) {
          const specNode = spec.nodes.find((node) => node.id === binding.specNodeId);
          md += `- **${String(binding.kind)}** \`${String(binding.specNodeId)}\`: ${String(specNode?.title ?? '')}\n`;
        }
        md += '\n';
      }
    }

    if (docRefs.size > 0) {
      md += `## Related Documents\n\n`;
      for (const docRef of docRefs) {
        md += `- [[${docRef}]]\n`;
      }
      md += `\n`;
    }

    if (contracts.length > 0) {
      md += `## Contracts\n\n`;
      for (const c of contracts) {
        md += `- **${symbolNameById.get(c.symbol_id) ?? c.symbol_id}**: ${c.description}\n`;
      }
      md += `\n`;
    }

    if (decisions.length > 0) {
      md += `## Design Decisions (ADR)\n\n`;
      for (const d of decisions) {
        md += `- **[${d.status}] ${symbolNameById.get(d.symbol_id) ?? d.symbol_id}**: ${d.decision}`;
        if (d.rationale) md += ` — _${d.rationale}_`;
        md += `\n`;
      }
      md += `\n`;
    }

    if (errors.length > 0) {
      md += `## Error Experiences\n\n`;
      for (const e of errors) {
        md += `- **${e.error_type}** (${symbolNameById.get(e.symbol_id) ?? e.symbol_id}): ${e.message}`;
        if (e.solution) md += ` → ${e.solution}`;
        md += `\n`;
      }
      md += `\n`;
    }

    if (plans.length > 0) {
      md += `## Future Plans & TODOs\n\n`;
      for (const p of plans) {
        md += `- **[${p.priority}]** (${symbolNameById.get(p.symbol_id) ?? p.symbol_id}): ${p.description}\n`;
      }
      md += `\n`;
    }

    return md;
  }

  /**
   * Normalize a raw SQLite `symbols` row into the MCP `Symbol` shape.
   *
   * @internal
   */
  private mapSymbolRow(row: Record<string, unknown>): Symbol {
    const filePath =
      typeof row.filePath === 'string'
        ? row.filePath
        : typeof row.file_path === 'string'
          ? row.file_path
          : undefined;
    const isExportedRaw = row.isExported ?? row.is_exported;
    const isPublicRaw = row.isPublic ?? row.is_public;
    return {
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      type: String(row.type ?? ''),
      ...(typeof row.kind === 'string' && row.kind.length > 0 ? { kind: row.kind } : {}),
      ...(filePath ? { filePath } : {}),
      ...(typeof row.line === 'number' ? { line: row.line } : {}),
      ...(isExportedRaw !== undefined && isExportedRaw !== null
        ? { isExported: Boolean(isExportedRaw) }
        : {}),
      ...(isPublicRaw !== undefined && isPublicRaw !== null
        ? { isPublic: Boolean(isPublicRaw) }
        : {}),
    };
  }

  /**
   * Resolve a symbol record by exact ID, legacy `<type>-<name>` suffix, UUID, or symbol name.
   *
   * @internal
   */
  private resolveSymbolRecord(symbolIdOrQuery: string): Symbol | null {
    const trimmed = symbolIdOrQuery.trim();
    if (!trimmed) {
      return null;
    }

    const db = this.getDb();

    const exact = db.prepare('SELECT * FROM symbols WHERE id = ?').get(trimmed) as
      | Record<string, unknown>
      | undefined;
    if (exact) {
      return this.mapSymbolRow(exact);
    }

    const suffix = db
      .prepare(
        'SELECT * FROM symbols WHERE LOWER(id) LIKE LOWER(?) ORDER BY is_exported DESC, line ASC LIMIT 1'
      )
      .get(`%-${trimmed}`) as Record<string, unknown> | undefined;
    if (suffix) {
      return this.mapSymbolRow(suffix);
    }

    const byUuidOrName = db
      .prepare(
        `SELECT * FROM symbols
         WHERE uuid = ?
            OR LOWER(name) = LOWER(?)
            OR REPLACE(LOWER(name), '-', '') = REPLACE(LOWER(?), '-', '')
         ORDER BY is_exported DESC,
                  CASE WHEN type IN ('class', 'interface', 'function', 'type') THEN 0 ELSE 1 END,
                  line ASC
         LIMIT 1`
      )
      .get(trimmed, trimmed, trimmed) as Record<string, unknown> | undefined;

    return byUuidOrName ? this.mapSymbolRow(byUuidOrName) : null;
  }

  /**
   * Query relationships for a specific symbol
   *
   * @param paramsOrSymbolId - Query parameters object (`symbolId`, `direction`, `maxDepth`) or symbol ID string
   * @param directionArg - Optional direction when called positionally
   * @param maxDepthArg - Optional depth when called positionally
   * @returns Markdown summary of symbol relationships
   *
   * @remarks
   * Finds all relationships connected to a symbol.
   * Used by [[tsdoc_query_relationships]] MCP tool.
   *
   * ## Purpose
   * Enable dependency and impact analysis for a symbol
   *
   * ## Direction Semantics
   * - **outgoing**: Relationships FROM this symbol (dependencies)
   * - **incoming**: Relationships TO this symbol (dependents)
   * - **both**: All connected relationships
   *
   * ## Algorithm
   * 1. Resolve target symbol ID (exact ID, legacy suffix, UUID, or name)
   * 2. Load all relationships and filter by direction
   * 3. Format as markdown (max 50 shown)
   *
   * ## Performance
   * - O(n) where n = total relationships
   * - Typical: 20K relationships scanned in ~10ms
   *
   * @example
   * ```typescript
   * // Find what DatabaseManager depends on
   * const deps = await service.queryRelationships({
   *   symbolId: 'databasemanager-class-databasemanager',
   *   direction: 'outgoing'
   * });
   *
   * // Find what depends on DatabaseManager
   * const dependents = await service.queryRelationships({
   *   symbolId: 'databasemanager-class-databasemanager',
   *   direction: 'incoming'
   * });
   * ```
   *
   * @public
   */
  async queryRelationships(
    paramsOrSymbolId:
      | {
          symbolId: string;
          direction?: 'incoming' | 'outgoing' | 'both';
          maxDepth?: number;
          includeExternal?: boolean;
        }
      | string,
    directionArg?: 'incoming' | 'outgoing' | 'both',
    maxDepthArg?: number
  ): Promise<string> {
    const params =
      typeof paramsOrSymbolId === 'string'
        ? {
            symbolId: paramsOrSymbolId,
            direction: directionArg,
            maxDepth: maxDepthArg,
          }
        : paramsOrSymbolId;

    const canonical = this.getCanonicalSnapshot();
    if (canonical) {
      const canonicalId = this.resolveCanonicalId(params.symbolId, canonical);
      if (canonicalId) {
        const aliases = new Map(
          canonical.aliases.map((alias) => [alias.canonicalId, alias.legacyId])
        );
        const canonicalRelationships = this.canonicalRelationships(
          canonical,
          params.includeExternal ?? false
        );
        const selected = new Set<string>();
        const queue: Array<{ id: string; depth: number }> = [{ id: canonicalId, depth: 0 }];
        const visited = new Set<string>([canonicalId]);
        while (queue.length > 0) {
          const current = queue.shift();
          if (!current || current.depth >= (params.maxDepth ?? 1)) continue;
          for (const edge of canonical.edges) {
            const forward =
              params.direction === 'outgoing' || params.direction === 'both' || !params.direction;
            const backward =
              params.direction === 'incoming' || params.direction === 'both' || !params.direction;
            const isForward = forward && edge.from === current.id;
            const isBackward = backward && edge.to === current.id;
            if (!isForward && !isBackward) continue;
            const next = isForward ? edge.to : edge.from;
            selected.add(`canonical:${edge.kind}:${edge.from}:${edge.to}`);
            if (!visited.has(next)) {
              visited.add(next);
              queue.push({ id: next, depth: current.depth + 1 });
            }
          }
        }
        const rootIds = new Set([canonicalId, aliases.get(canonicalId) ?? canonicalId]);
        const relationships = canonicalRelationships.filter((rel) => {
          const from = Array.isArray(rel.from) ? rel.from : [rel.from];
          const to = Array.isArray(rel.to) ? rel.to : [rel.to];
          return (
            selected.has(rel.id) ||
            from.some((value) => rootIds.has(String(value))) ||
            to.some((value) => rootIds.has(String(value)))
          );
        });
        let markdown = '# Relationship Query\n\n';
        markdown += `Symbol: ${canonicalId}\nDirection: ${params.direction || 'both'}\nFound: ${relationships.length} relationships\n\n`;
        for (const rel of relationships.slice(0, 50))
          markdown += `## ${rel.type}\n- From: ${String(rel.from)}\n- To: ${String(rel.to)}\n- Category: ${rel.category}\n- Strength: ${rel.strength}\n\n`;
        return markdown;
      }
    }

    const resolvedSymbol = this.resolveSymbolRecord(params.symbolId);
    const targetSymbolId = resolvedSymbol?.id ?? params.symbolId;
    const allRels = this.getAllUnifiedRelationships();

    let relationships: Relationship[] = [];

    if (params.direction === 'outgoing' || params.direction === 'both' || !params.direction) {
      const outgoing = allRels.filter((rel) => {
        const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
        return froms.includes(targetSymbolId);
      });
      relationships = relationships.concat(outgoing);
    }

    if (params.direction === 'incoming' || params.direction === 'both' || !params.direction) {
      const incoming = allRels.filter((rel) => {
        const tos = Array.isArray(rel.to) ? rel.to : [rel.to];
        return tos.includes(targetSymbolId);
      });
      relationships = relationships.concat(incoming);
    }

    let markdown = `# Relationship Query\n\n`;
    markdown += `Symbol: ${targetSymbolId}\n`;
    if (resolvedSymbol && targetSymbolId !== params.symbolId) {
      markdown += `Requested: ${params.symbolId}\n`;
    }
    markdown += `Direction: ${params.direction || 'both'}\n`;
    markdown += `Found: ${relationships.length} relationships\n\n`;

    for (const rel of relationships.slice(0, 50)) {
      const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
      const tos = Array.isArray(rel.to) ? rel.to : [rel.to];

      markdown += `## ${rel.type}\n`;
      markdown += `- From: ${froms.join(', ')}\n`;
      markdown += `- To: ${tos.join(', ')}\n`;
      markdown += `- Category: ${rel.category}\n`;
      markdown += `- Strength: ${rel.strength}\n\n`;
    }

    if (relationships.length > 50) {
      markdown += `\n... and ${relationships.length - 50} more relationships\n`;
    }

    return markdown;
  }

  /**
   * Get detailed information for a symbol
   *
   * @param symbolId - Symbol ID, legacy `<type>-<name>` suffix, UUID, or symbol name
   * @param includeExternal - Include canonical external and standard-library nodes
   * @returns Symbol details or null if not found
   *
   * @remarks
   * Retrieves full symbol record from database.
   * Used by [[tsdoc_get_symbol_details]] MCP tool.
   * Returns `null` if symbol does not exist.
   *
   * @example
   * ```typescript
   * const symbol = await service.getSymbolDetails('databasemanager-class-databasemanager');
   *
   * if (!symbol) {
   *   console.error('Symbol not found');
   *   return;
   * }
   *
   * console.log(`${symbol.name} in ${symbol.filePath}:${symbol.line}`);
   * ```
   *
   * @public
   */
  async getSymbolDetails(
    symbolId: string,
    includeExternal: boolean = false
  ): Promise<Symbol | null> {
    const canonical = this.getCanonicalSnapshot();
    if (canonical) {
      const canonicalId = this.resolveCanonicalId(symbolId, canonical);
      const node = canonicalId
        ? canonical.nodes.find((entry) => entry.id === canonicalId)
        : undefined;
      if (node && (includeExternal || !this.isExternalNode(node)))
        return this.mapCanonicalNode(node, canonical);
    }
    return this.resolveSymbolRecord(symbolId);
  }

  /**
   * Analyze multi-hop canonical impact with legacy fallback.
   * @param params - Symbol, direction, depth, and external-node options.
   * @returns Structured impact analysis grouped by depth.
   * @public
   */
  async getImpact(params: {
    symbol: string;
    direction: 'downstream' | 'upstream' | 'both';
    maxDepth: number;
    includeExternal: boolean;
  }): Promise<ImpactResult> {
    const canonical = this.getCanonicalSnapshot();
    if (canonical) {
      const root = this.resolveCanonicalId(params.symbol, canonical);
      if (root) {
        const nodes = new Map(canonical.nodes.map((node) => [node.id, node]));
        const edges = canonical.edges.filter(
          (edge) =>
            params.includeExternal ||
            (!this.isExternalNode(nodes.get(edge.from) ?? { id: '', kind: '' }) &&
              !this.isExternalNode(nodes.get(edge.to) ?? { id: '', kind: '' }))
        );
        const results: ImpactNode[] = [];
        const directions =
          params.direction === 'both' ? (['downstream', 'upstream'] as const) : [params.direction];
        for (const direction of directions) {
          const queue: Array<{ id: string; depth: number; path: string[] }> = [
            { id: root, depth: 0, path: [root] },
          ];
          const visited = new Set<string>([root]);
          while (queue.length > 0) {
            const current = queue.shift();
            if (!current || current.depth >= params.maxDepth) continue;
            const next = edges.filter((edge) =>
              direction === 'downstream' ? edge.to === current.id : edge.from === current.id
            );
            for (const edge of next) {
              const id = direction === 'downstream' ? edge.from : edge.to;
              if (visited.has(id)) continue;
              visited.add(id);
              const pathValue = [...current.path, id];
              results.push({
                symbolId: id,
                depth: current.depth + 1,
                path: pathValue,
                relationshipType: edge.kind,
                direction,
                external: nodes.get(id)?.external,
              });
              queue.push({ id, depth: current.depth + 1, path: pathValue });
            }
          }
        }
        const byDepth: Record<string, ImpactNode[]> = {};
        for (const item of results) {
          const bucket = byDepth[String(item.depth)] ?? [];
          bucket.push(item);
          byDepth[String(item.depth)] = bucket;
        }
        const riskLevel =
          results.length > 25 || results.some((item) => item.depth >= 3)
            ? 'High'
            : results.length > 5
              ? 'Medium'
              : 'Low';
        return {
          symbolId: root,
          direction: params.direction,
          maxDepth: params.maxDepth,
          impactedSymbols: results,
          byDepth,
          riskLevel,
          source: 'canonical',
        };
      }
    }
    const symbol = this.resolveSymbolRecord(params.symbol);
    const legacy = symbol ? this.getAllUnifiedRelationships() : [];
    const root = symbol?.id ?? params.symbol;
    const result: ImpactNode[] = [];
    const queue: Array<{ id: string; depth: number; path: string[] }> = [
      { id: root, depth: 0, path: [root] },
    ];
    const visited = new Set<string>([root]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.depth >= params.maxDepth) continue;
      for (const rel of legacy) {
        const from = Array.isArray(rel.from) ? rel.from : [rel.from];
        const to = Array.isArray(rel.to) ? rel.to : [rel.to];
        const directions =
          params.direction === 'both' ? (['downstream', 'upstream'] as const) : [params.direction];
        for (const direction of directions) {
          const matches =
            direction === 'downstream' ? to.includes(current.id) : from.includes(current.id);
          if (!matches) continue;
          const ids = direction === 'downstream' ? from : to;
          for (const id of ids) {
            if (visited.has(id)) continue;
            visited.add(id);
            const pathValue = [...current.path, id];
            result.push({
              symbolId: id,
              depth: current.depth + 1,
              path: pathValue,
              relationshipType: rel.type,
              direction,
            });
            queue.push({ id, depth: current.depth + 1, path: pathValue });
          }
        }
      }
    }
    const byDepth: Record<string, ImpactNode[]> = {};
    for (const item of result) {
      const bucket = byDepth[String(item.depth)] ?? [];
      bucket.push(item);
      byDepth[String(item.depth)] = bucket;
    }
    return {
      symbolId: root,
      direction: params.direction,
      maxDepth: params.maxDepth,
      impactedSymbols: result,
      byDepth,
      riskLevel: result.length > 25 ? 'High' : result.length > 5 ? 'Medium' : 'Low',
      source: 'legacy',
    };
  }

  /**
   * Query active normative specification nodes and code bindings.
   * @param params - Optional file, specification ID, and text filters.
   * @returns Active revision metadata, specification nodes, and bindings.
   * @public
   */
  async getSpecBindings(params: { filePath?: string; specId?: string; query?: string }): Promise<{
    revisionId: string | null;
    nodes: Array<Record<string, unknown>>;
    bindings: Array<Record<string, unknown>>;
  }> {
    const spec = this.getSpecSnapshot();
    if (!spec) return { revisionId: null, nodes: [], bindings: [] };
    const canonical = this.getCanonicalSnapshot();
    const fileCanonicalIds = new Set(
      canonical?.nodes.filter((node) => node.file === params.filePath).map((node) => node.id) ?? []
    );
    const query = params.query?.toLowerCase();
    const nodes = spec.nodes.filter((node) => {
      if (params.specId && node.id !== params.specId) return false;
      if (
        query &&
        !String(node.id).toLowerCase().includes(query) &&
        !String(node.title).toLowerCase().includes(query)
      )
        return false;
      return true;
    });
    const nodeIds = new Set(nodes.map((node) => String(node.id)));
    const bindings = spec.bindings.filter((binding) => {
      if (params.specId && !nodeIds.has(String(binding.specNodeId))) return false;
      const source = binding.source as Record<string, unknown> | undefined;
      const target = binding.target as Record<string, unknown> | undefined;
      if (
        params.filePath &&
        source?.file !== params.filePath &&
        target?.file !== params.filePath &&
        !(
          typeof target?.canonicalNodeId === 'string' &&
          fileCanonicalIds.has(target.canonicalNodeId)
        )
      )
        return false;
      if (query) {
        const haystacks = [
          binding.id,
          binding.specNodeId,
          binding.kind,
          source?.file,
          target?.file,
          target?.canonicalNodeId,
          target?.symbolName,
        ]
          .filter((val): val is string => typeof val === 'string')
          .map((val) => val.toLowerCase());
        const matchesNode = nodeIds.has(String(binding.specNodeId));
        const matchesField = haystacks.some((val) => val.includes(query));
        if (!matchesNode && !matchesField) return false;
      }
      return true;
    });
    return { revisionId: spec.revisionId, nodes, bindings };
  }

  /**
   * Execute a 3-Tier Data Trace query (`type-flow`, `boundary-lineage`, `code-slice`, or `all`).
   *
   * @param params - Data trace query options (`target`, `toTarget`, `tier`, `maxDepth`, `includeTests`, `includeExternal`)
   * @returns Structured `DataTraceReport` and LLM-friendly Markdown summary
   * @doc [[MCP Integration]]
   * @doc [[Data Lineage and Slicing]]
   * @public
   */
  async traceData(params: {
    target: string;
    toTarget?: string;
    tier?: 'all' | 'type-flow' | 'boundary-lineage' | 'code-slice';
    maxDepth?: number;
    includeTests?: boolean;
    includeExternal?: boolean;
  }): Promise<{
    report: Record<string, unknown>;
    markdown: string;
  }> {
    const canonical = this.getCanonicalSnapshot();
    if (!canonical) {
      throw new Error(
        'Canonical @ttsc/graph database (.tsdoc/canonical-graph.db) is not available. Run `tsdoc-edge sync` first.'
      );
    }
    const spec = this.getSpecSnapshot();
    const requireCjs = createRequire(import.meta.url);
    const coreModule = requireCjs('../../../dist/index.js') as {
      DataTraceService: new (
        graph: unknown,
        options?: { specGraph?: unknown; workspaceRoot?: string }
      ) => { trace: (req: unknown) => Record<string, unknown> };
      formatDataTraceLlmMarkdown: (report: unknown) => string;
    };

    const graphPayload = {
      contractVersion: '1.0',
      rootDir: this.workspaceRoot,
      tsconfigPath: path.join(this.workspaceRoot, 'tsconfig.json'),
      fingerprint: canonical.revisionId,
      provenance: { adapter: 'mcp-canonical-snapshot', producer: '@ttsc/graph' },
      nodes: canonical.nodes.map((n) => ({ ...n, sourceId: n.id })),
      edges: canonical.edges,
    };

    const specPayload = spec
      ? {
          contractVersion: '1.0',
          revisionId: spec.revisionId,
          contentFingerprint: spec.contentFingerprint,
          workspaceId: spec.workspaceId,
          provenance: spec.provenance,
          nodes: spec.nodes,
          edges: spec.edges,
          bindings: spec.bindings,
        }
      : null;

    const traceService = new coreModule.DataTraceService(graphPayload, {
      specGraph: specPayload,
      workspaceRoot: this.workspaceRoot,
    });
    const report = traceService.trace({
      target: params.target,
      toTarget: params.toTarget,
      tier: params.tier ?? 'all',
      maxDepth: params.maxDepth ?? 3,
      includeTests: params.includeTests ?? false,
      includeExternal: params.includeExternal ?? false,
      workspaceRoot: this.workspaceRoot,
    });
    const markdown = coreModule.formatDataTraceLlmMarkdown(report);
    return { report, markdown };
  }
}
