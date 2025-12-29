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

import * as path from 'node:path';
import * as fs from 'node:fs';
import Database from 'better-sqlite3';
import { SymbolKind, DiagnosticSeverity } from 'vscode-languageserver/node';
import type { SqliteDatabase, SymbolRow, CountRow, RelTypeCountRow, UnifiedRelRow, HighImpactRow } from '../types/database';
import { CacheManager } from './cache-manager';
import { StatementManager } from './statement-manager';
import { IncrementalBuilder, type IncrementalExtractResult } from './incremental-builder';

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

/**
 * Diagnostic information for architectural issues
 *
 * @public
 * @see TsdocEdgeService.getDiagnostics
 */
export interface DiagnosticInfo {
  /** Line number (1-based) where the issue is located */
  line: number;
  /** Human-readable description of the issue */
  message: string;
  /** Severity level (Error, Warning, Information, Hint) */
  severity: DiagnosticSeverity;
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
  /** Path to SQLite database (.tsdoc/symbols.db) */
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

  /** Maximum symbols to return in impact analysis */
  private static readonly MAX_IMPACT_SYMBOLS = 100;

  /**
   * Creates a new TsdocEdgeService instance
   *
   * @param workspaceRoot - Root directory of the workspace
   */
  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.dbPath = path.join(workspaceRoot, '.tsdoc', 'symbols.db');

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
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      return null;
    }

    try {
      let result: IncrementalExtractResult;

      if (content !== undefined) {
        // Process from provided content (unsaved buffer)
        result = this.incrementalBuilder.processContent(filePath, content);
      } else {
        // Process from disk
        result = this.incrementalBuilder.processFileChange(filePath);
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

  /**
   * Initialize SQLite database connection in readonly mode
   * @internal
   */
  private initDatabase(): void {
    if (!fs.existsSync(this.dbPath)) {
      console.warn(`TSDoc Edge database not found at: ${this.dbPath}`);
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

  /**
   * Get hover information for a symbol at position
   *
   * @param filePath - File path
   * @param line - Line number (1-based)
   * @param character - Character position
   * @returns Markdown hover content or null
   */
  getHoverInfo(filePath: string, line: number, character: number): string | null {
    if (!this.db) return null;

    try {
      // Find symbol at this position
      const normalizedPath = filePath.replace(/\\/g, '/');

      // Use cached prepared statements to prevent memory leaks
      const symbolStmt = this.statementManager?.prepare('hoverSymbol', `
        SELECT id, name, type, summary, file_path, line
        FROM symbols
        WHERE file_path LIKE ?
          AND line <= ?
        ORDER BY line DESC
        LIMIT 1
      `);

      const symbol = symbolStmt?.get(`%${path.basename(normalizedPath)}`, line) as SymbolRow | undefined;

      if (!symbol) return null;

      // Get impact analysis using indexed JOIN (O(1) instead of O(n) LIKE scan)
      const downstreamStmt = this.statementManager?.prepare('hoverDownstreamJoin', `
        SELECT COUNT(DISTINCT rs.relationship_id) as count
        FROM relationship_symbols rs
        WHERE rs.symbol_id = ? AND rs.role = 'from'
      `);
      const downstreamCount = (downstreamStmt?.get(symbol.id) as CountRow | undefined)?.count || 0;

      const upstreamStmt = this.statementManager?.prepare('hoverUpstreamJoin', `
        SELECT COUNT(DISTINCT rs.relationship_id) as count
        FROM relationship_symbols rs
        WHERE rs.symbol_id = ? AND rs.role = 'to'
      `);
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
      const relTypesStmt = this.statementManager?.prepare('hoverRelTypesJoin', `
        SELECT ur.type, COUNT(DISTINCT ur.id) as count
        FROM unified_relationships ur
        INNER JOIN relationship_symbols rs ON ur.id = rs.relationship_id
        WHERE rs.symbol_id = ?
        GROUP BY ur.type
        ORDER BY count DESC
        LIMIT 5
      `);
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
   * Get impact counts for a symbol (cached)
   * Uses indexed JOIN on relationship_symbols table for O(1) lookup
   */
  private getImpactCounts(symbolId: string): { downstream: number; upstream: number } {
    // Check cache
    const cached = this.cacheManager.get<{ downstream: number; upstream: number }>(CACHE_NAMES.IMPACT, symbolId);
    if (cached) {
      return cached;
    }

    // Use JOIN on relationship_symbols for indexed lookup (O(1) instead of O(n) LIKE scan)
    const downstreamStmt = this.statementManager?.prepare('downstreamJoin', `
      SELECT COUNT(DISTINCT rs.relationship_id) as count
      FROM relationship_symbols rs
      WHERE rs.symbol_id = ? AND rs.role = 'from'
    `);

    const upstreamStmt = this.statementManager?.prepare('upstreamJoin', `
      SELECT COUNT(DISTINCT rs.relationship_id) as count
      FROM relationship_symbols rs
      WHERE rs.symbol_id = ? AND rs.role = 'to'
    `);

    const downstream = (downstreamStmt?.get(symbolId) as CountRow | undefined)?.count || 0;
    const upstream = (upstreamStmt?.get(symbolId) as CountRow | undefined)?.count || 0;

    const result = { downstream, upstream };

    // Store in cache
    this.cacheManager.set(CACHE_NAMES.IMPACT, symbolId, result);

    return result;
  }

  /**
   * Get code lenses for a file
   * Optimized with batch impact count query
   *
   * @param filePath - File path
   * @returns Array of code lens info
   */
  getCodeLenses(filePath: string): CodeLensInfo[] {
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
      const symbolsStmt = this.statementManager?.prepare('fileSymbols', `
        SELECT id, name, line
        FROM symbols
        WHERE file_path LIKE ?
          AND type IN ('class', 'function', 'interface', 'method')
        ORDER BY line
      `);

      const symbols = (symbolsStmt?.all(`%${fileName}`) || []) as SymbolRow[];

      if (symbols.length === 0) {
        this.cacheManager.set(CACHE_NAMES.CODE_LENS, fileName, []);
        return [];
      }

      // Batch query for all impact counts at once
      const symbolIds = symbols.map(s => s.id);
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
  private getBatchImpactCounts(symbolIds: string[]): Map<string, { downstream: number; upstream: number }> {
    const results = new Map<string, { downstream: number; upstream: number }>();
    if (!this.db || symbolIds.length === 0) return results;

    // Initialize all symbols with zero counts
    for (const id of symbolIds) {
      results.set(id, { downstream: 0, upstream: 0 });
    }

    try {
      // Check cache first
      const uncachedIds: string[] = [];
      for (const id of symbolIds) {
        const cached = this.cacheManager.get<{ downstream: number; upstream: number }>(CACHE_NAMES.IMPACT, id);
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
      const downstreamRows = downstreamStmt.all(...uncachedIds) as Array<{ symbol_id: string; count: number }>;

      // Batch query for upstream counts
      const upstreamStmt = this.db.prepare(`
        SELECT symbol_id, COUNT(DISTINCT relationship_id) as count
        FROM relationship_symbols
        WHERE symbol_id IN (${placeholders}) AND role = 'to'
        GROUP BY symbol_id
      `);
      const upstreamRows = upstreamStmt.all(...uncachedIds) as Array<{ symbol_id: string; count: number }>;

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
    if (!this.db) return [];

    try {
      const stmt = this.statementManager?.prepare('searchSymbols', `
        SELECT id, name, type, file_path, line
        FROM symbols
        WHERE name LIKE ?
        ORDER BY name
        LIMIT 50
      `);

      const symbols = (stmt?.all(`%${query}%`) || []) as SymbolRow[];

      return symbols.map((sym) => ({
        name: sym.name,
        kind: this.mapTypeToKind(sym.type),
        filePath: sym.file_path,
        line: sym.line || 1,
      }));
    } catch (error) {
      console.error(`searchSymbols error: ${error}`);
      return [];
    }
  }

  /**
   * Get diagnostics for a file
   *
   * @param filePath - File path
   * @returns Array of diagnostics
   */
  getDiagnostics(filePath: string): DiagnosticInfo[] {
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
      const circularStmt = this.statementManager?.prepare('circularDeps', `
        SELECT from_symbols, to_symbols, properties, file_path, line
        FROM unified_relationships
        WHERE type = 'circular-dependency'
          AND file_path LIKE ?
      `);
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
      const violationStmt = this.statementManager?.prepare('layerViolations', `
        SELECT from_symbols, to_symbols, properties, file_path, line
        FROM unified_relationships
        WHERE type = 'layer-dependency'
          AND json_extract(properties, '$.isViolation') = 1
          AND file_path LIKE ?
      `);
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
      const highImpactStmt = this.statementManager?.prepare('highImpactJoin', `
        SELECT s.id, s.name, s.line, COUNT(DISTINCT rs.relationship_id) as count
        FROM symbols s
        INNER JOIN relationship_symbols rs ON rs.symbol_id = s.id AND rs.role = 'from'
        WHERE s.file_path LIKE ?
        GROUP BY s.id
        HAVING count > 10
      `);
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
   * @returns Symbol info or null
   */
  getSymbolAtPosition(filePath: string, line: number): { id: string; name: string; type: string } | null {
    if (!this.db) return null;

    try {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const fileName = path.basename(normalizedPath);

      const stmt = this.statementManager?.prepare('symbolAtPosition', `
        SELECT id, name, type
        FROM symbols
        WHERE file_path LIKE ?
          AND line <= ?
        ORDER BY line DESC
        LIMIT 1
      `);

      const symbol = stmt?.get(`%${fileName}`, line) as { id: string; name: string; type: string } | undefined;

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
    if (!this.db) return { downstream: 0, upstream: 0, symbols: [] };

    try {
      const visited = new Set<string>();
      const queue: Array<{ id: string; depth: number }> = [{ id: symbolId, depth: 0 }];
      visited.add(symbolId);

      // Use JOIN on relationship_symbols for BFS (no JSON.parse needed)
      const downstreamStmt = this.statementManager?.prepare('impactDownstreamJoin', `
        SELECT DISTINCT rs2.symbol_id
        FROM relationship_symbols rs1
        INNER JOIN relationship_symbols rs2 ON rs2.relationship_id = rs1.relationship_id AND rs2.role = 'to'
        WHERE rs1.symbol_id = ? AND rs1.role = 'from'
      `);

      // BFS with size limit to prevent memory issues
      const maxSymbols = TsdocEdgeService.MAX_IMPACT_SYMBOLS;

      while (queue.length > 0 && visited.size <= maxSymbols) {
        const current = queue.shift()!;
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
      const upstreamStmt = this.statementManager?.prepare('impactUpstreamJoin', `
        SELECT COUNT(DISTINCT rs2.symbol_id) as count
        FROM relationship_symbols rs1
        INNER JOIN relationship_symbols rs2 ON rs2.relationship_id = rs1.relationship_id AND rs2.role = 'from'
        WHERE rs1.symbol_id = ? AND rs1.role = 'to'
      `);
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
  getRelatedSymbols(symbolId: string, limit: number = 10): Array<{ id: string; name: string; type: string; relationshipType: string }> {
    if (!this.db) return [];

    try {
      // Use JOIN on relationship_symbols for efficient lookup (no JSON.parse needed)
      const relatedStmt = this.statementManager?.prepare('relatedSymbolsJoin', `
        SELECT DISTINCT s.id, s.name, s.type, ur.type as rel_type
        FROM relationship_symbols rs1
        INNER JOIN unified_relationships ur ON ur.id = rs1.relationship_id
        INNER JOIN relationship_symbols rs2 ON rs2.relationship_id = rs1.relationship_id AND rs2.symbol_id != ?
        INNER JOIN symbols s ON s.id = rs2.symbol_id
        WHERE rs1.symbol_id = ?
        LIMIT ?
      `);

      const rows = (relatedStmt?.all(symbolId, symbolId, limit) || []) as Array<{
        id: string;
        name: string;
        type: string;
        rel_type: string;
      }>;

      return rows.map(row => ({
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
  findSymbolByName(name: string): { id: string; name: string; type: string; filePath: string; line: number } | null {
    if (!this.db) return null;

    // Check cache first
    const cached = this.cacheManager.get<{ id: string; name: string; type: string; filePath: string; line: number } | null>(CACHE_NAMES.SYMBOL, `name:${name}`);
    if (cached !== undefined) {
      return cached;
    }

    /** Database result for symbol lookup */
    type SymbolLocation = { id: string; name: string; type: string; file_path: string; line: number | null };

    try {
      // First try exact match
      const exactStmt = this.statementManager?.prepare('findSymbolExact', `
        SELECT id, name, type, file_path, line
        FROM symbols
        WHERE name = ?
        LIMIT 1
      `);
      let symbol = exactStmt?.get(name) as SymbolLocation | undefined;

      // If not found, try case-insensitive match
      if (!symbol) {
        const caseInsensitiveStmt = this.statementManager?.prepare('findSymbolCaseInsensitive', `
          SELECT id, name, type, file_path, line
          FROM symbols
          WHERE LOWER(name) = LOWER(?)
          LIMIT 1
        `);
        symbol = caseInsensitiveStmt?.get(name) as SymbolLocation | undefined;
      }

      // If still not found, try partial match
      if (!symbol) {
        const partialStmt = this.statementManager?.prepare('findSymbolPartial', `
          SELECT id, name, type, file_path, line
          FROM symbols
          WHERE name LIKE ?
          ORDER BY LENGTH(name)
          LIMIT 1
        `);
        symbol = partialStmt?.get(`%${name}%`) as SymbolLocation | undefined;
      }

      const result = symbol ? {
        id: symbol.id,
        name: symbol.name,
        type: symbol.type,
        filePath: symbol.file_path,
        line: symbol.line || 1,
      } : null;

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
  findSymbolsByNames(names: string[]): Map<string, { id: string; name: string; type: string; filePath: string; line: number }> {
    const results = new Map<string, { id: string; name: string; type: string; filePath: string; line: number }>();
    if (!this.db || names.length === 0) return results;

    /** Database result for symbol lookup */
    type SymbolLocation = { id: string; name: string; type: string; file_path: string; line: number | null };

    try {
      // Check cache first for each name
      const uncachedNames: string[] = [];
      for (const name of names) {
        const cached = this.cacheManager.get<{ id: string; name: string; type: string; filePath: string; line: number } | null>(CACHE_NAMES.SYMBOL, `name:${name}`);
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
