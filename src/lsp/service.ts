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
import { SymbolKind, DiagnosticSeverity } from 'vscode-languageserver/node';

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

/**
 * Cache entry with TTL for performance optimization
 *
 * @typeParam T - Type of cached value
 * @internal
 */
interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Unix timestamp when the entry was created */
  timestamp: number;
}

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
  /** SQLite database connection (better-sqlite3) */
  private db: any | null = null;

  /** Cache for symbol queries */
  private symbolCache = new Map<string, CacheEntry<any>>();
  /** Cache for code lens data per file */
  private codeLensCache = new Map<string, CacheEntry<CodeLensInfo[]>>();
  /** Cache for diagnostics per file */
  private diagnosticsCache = new Map<string, CacheEntry<DiagnosticInfo[]>>();
  /** Cache for impact analysis results */
  private impactCache = new Map<string, CacheEntry<{ downstream: number; upstream: number }>>();

  /** Cache TTL in milliseconds (5 seconds for real-time updates) */
  private static readonly CACHE_TTL = 5000;

  /** Prepared SQL statements for query reuse */
  private statements: Record<string, any> = {};

  /**
   * Creates a new TsdocEdgeService instance
   *
   * @param workspaceRoot - Root directory of the workspace
   */
  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.dbPath = path.join(workspaceRoot, '.tsdoc', 'symbols.db');
    this.initDatabase();
  }

  /**
   * Check if cache entry is valid based on TTL
   *
   * @param entry - Cache entry to validate
   * @returns True if entry exists and is within TTL
   * @internal
   */
  private isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
    if (!entry) return false;
    return Date.now() - entry.timestamp < TsdocEdgeService.CACHE_TTL;
  }

  /**
   * Invalidate all caches
   *
   * Call this when the database is updated (e.g., after `tsdoc-edge build`)
   *
   * @public
   */
  invalidateCache(): void {
    this.symbolCache.clear();
    this.codeLensCache.clear();
    this.diagnosticsCache.clear();
    this.impactCache.clear();
  }

  /**
   * Invalidate cache for a specific file
   *
   * Call this when a file is modified to refresh its analysis
   *
   * @param filePath - Absolute path to the file
   * @public
   */
  invalidateFileCache(filePath: string): void {
    const fileName = path.basename(filePath);
    // Remove entries that contain this file
    for (const key of this.codeLensCache.keys()) {
      if (key.includes(fileName)) {
        this.codeLensCache.delete(key);
      }
    }
    for (const key of this.diagnosticsCache.keys()) {
      if (key.includes(fileName)) {
        this.diagnosticsCache.delete(key);
      }
    }
  }

  /**
   * Get or create a prepared SQL statement
   *
   * @param name - Unique identifier for the statement
   * @param sql - SQL query string
   * @returns Prepared statement or null if database is not connected
   * @internal
   */
  private getStatement(name: string, sql: string): any {
    if (!this.db) return null;
    if (!this.statements[name]) {
      this.statements[name] = this.db.prepare(sql);
    }
    return this.statements[name];
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
      // Dynamic import of better-sqlite3
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Database = require('better-sqlite3');
      this.db = new Database(this.dbPath, { readonly: true });
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

      const symbol = this.db.prepare(`
        SELECT id, name, type, summary, file_path, line
        FROM symbols
        WHERE file_path LIKE ?
          AND line <= ?
        ORDER BY line DESC
        LIMIT 1
      `).get(`%${path.basename(normalizedPath)}`, line);

      if (!symbol) return null;

      // Get impact analysis
      const downstreamCount = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM unified_relationships
        WHERE from_symbols LIKE ?
      `).get(`%${symbol.id}%`)?.count || 0;

      const upstreamCount = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM unified_relationships
        WHERE to_symbols LIKE ?
      `).get(`%${symbol.id}%`)?.count || 0;

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

      // Get relationship types
      const relTypes = this.db.prepare(`
        SELECT type, COUNT(*) as count
        FROM unified_relationships
        WHERE from_symbols LIKE ? OR to_symbols LIKE ?
        GROUP BY type
        ORDER BY count DESC
        LIMIT 5
      `).all(`%${symbol.id}%`, `%${symbol.id}%`);

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
   */
  private getImpactCounts(symbolId: string): { downstream: number; upstream: number } {
    // Check cache
    const cached = this.impactCache.get(symbolId);
    if (this.isCacheValid(cached)) {
      return cached.value;
    }

    const downstreamStmt = this.getStatement('downstream', `
      SELECT COUNT(*) as count
      FROM unified_relationships
      WHERE from_symbols LIKE ?
    `);

    const upstreamStmt = this.getStatement('upstream', `
      SELECT COUNT(*) as count
      FROM unified_relationships
      WHERE to_symbols LIKE ?
    `);

    const downstream = downstreamStmt?.get(`%${symbolId}%`)?.count || 0;
    const upstream = upstreamStmt?.get(`%${symbolId}%`)?.count || 0;

    const result = { downstream, upstream };

    // Store in cache
    this.impactCache.set(symbolId, {
      value: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Get code lenses for a file
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
      const cached = this.codeLensCache.get(fileName);
      if (this.isCacheValid(cached)) {
        return cached.value;
      }

      // Get all symbols in this file using cached statement
      const symbolsStmt = this.getStatement('fileSymbols', `
        SELECT id, name, line
        FROM symbols
        WHERE file_path LIKE ?
          AND type IN ('class', 'function', 'interface', 'method')
        ORDER BY line
      `);

      const symbols = symbolsStmt?.all(`%${fileName}`) || [];
      const codeLenses: CodeLensInfo[] = [];

      for (const symbol of symbols) {
        const { downstream, upstream } = this.getImpactCounts(symbol.id);

        if (downstream > 0 || upstream > 0) {
          codeLenses.push({
            line: symbol.line,
            title: `↓${downstream} ↑${upstream}`,
            symbolId: symbol.id,
          });
        }
      }

      // Store in cache
      this.codeLensCache.set(fileName, {
        value: codeLenses,
        timestamp: Date.now(),
      });

      return codeLenses;
    } catch (error) {
      console.error(`getCodeLenses error: ${error}`);
      return [];
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
      const symbols = this.db.prepare(`
        SELECT id, name, type, file_path, line
        FROM symbols
        WHERE name LIKE ?
        ORDER BY name
        LIMIT 50
      `).all(`%${query}%`);

      return symbols.map((sym: any) => ({
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
      const cached = this.diagnosticsCache.get(fileName);
      if (this.isCacheValid(cached)) {
        return cached.value;
      }

      const diagnostics: DiagnosticInfo[] = [];

      // Check for circular dependencies using cached statement
      const circularStmt = this.getStatement('circularDeps', `
        SELECT from_symbols, to_symbols, properties, file_path, line
        FROM unified_relationships
        WHERE type = 'circular-dependency'
          AND file_path LIKE ?
      `);
      const circulars = circularStmt?.all(`%${fileName}`) || [];

      for (const circular of circulars) {
        const props = JSON.parse(circular.properties || '{}');
        diagnostics.push({
          line: circular.line || 1,
          message: `Circular dependency detected: ${props.cyclePath?.join(' → ') || 'unknown cycle'}`,
          severity: DiagnosticSeverity.Warning,
        });
      }

      // Check for layer violations using cached statement
      const violationStmt = this.getStatement('layerViolations', `
        SELECT from_symbols, to_symbols, properties, file_path, line
        FROM unified_relationships
        WHERE type = 'layer-dependency'
          AND json_extract(properties, '$.isViolation') = 1
          AND file_path LIKE ?
      `);
      const violations = violationStmt?.all(`%${fileName}`) || [];

      for (const violation of violations) {
        const props = JSON.parse(violation.properties || '{}');
        diagnostics.push({
          line: violation.line || 1,
          message: `Architecture violation: ${props.fromLayer} → ${props.toLayer}`,
          severity: DiagnosticSeverity.Warning,
        });
      }

      // Check for high-impact symbols (warning for symbols with many dependents)
      const highImpactStmt = this.getStatement('highImpact', `
        SELECT s.id, s.name, s.line, COUNT(r.id) as count
        FROM symbols s
        JOIN unified_relationships r ON r.from_symbols LIKE '%' || s.id || '%'
        WHERE s.file_path LIKE ?
        GROUP BY s.id
        HAVING count > 10
      `);
      const highImpact = highImpactStmt?.all(`%${fileName}`) || [];

      for (const sym of highImpact) {
        diagnostics.push({
          line: sym.line || 1,
          message: `High-impact symbol: ${sym.name} has ${sym.count} dependents`,
          severity: DiagnosticSeverity.Information,
        });
      }

      // Store in cache
      this.diagnosticsCache.set(fileName, {
        value: diagnostics,
        timestamp: Date.now(),
      });

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

      const symbol = this.db.prepare(`
        SELECT id, name, type
        FROM symbols
        WHERE file_path LIKE ?
          AND line <= ?
        ORDER BY line DESC
        LIMIT 1
      `).get(`%${fileName}`, line) as any;

      return symbol || null;
    } catch (error) {
      console.error(`getSymbolAtPosition error: ${error}`);
      return null;
    }
  }

  /**
   * Get impact analysis for a symbol
   *
   * @param symbolId - Symbol ID
   * @param maxDepth - Maximum depth to traverse
   * @returns Impact counts
   */
  getImpactAnalysis(symbolId: string, maxDepth: number = 3): { downstream: number; upstream: number; symbols: string[] } {
    if (!this.db) return { downstream: 0, upstream: 0, symbols: [] };

    try {
      const visited = new Set<string>();
      const queue: Array<{ id: string; depth: number }> = [{ id: symbolId, depth: 0 }];
      visited.add(symbolId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.depth >= maxDepth) continue;

        // Find downstream dependencies
        const relationships = this.db.prepare(`
          SELECT to_symbols
          FROM unified_relationships
          WHERE from_symbols LIKE ?
        `).all(`%${current.id}%`) as any[];

        for (const rel of relationships) {
          const toSymbols = JSON.parse(rel.to_symbols);
          for (const toSym of toSymbols) {
            if (!visited.has(toSym)) {
              visited.add(toSym);
              queue.push({ id: toSym, depth: current.depth + 1 });
            }
          }
        }
      }

      // Remove the starting symbol from count
      visited.delete(symbolId);

      // Get upstream count
      const upstreamCount = this.db.prepare(`
        SELECT COUNT(DISTINCT from_symbols) as count
        FROM unified_relationships
        WHERE to_symbols LIKE ?
      `).get(`%${symbolId}%`) as any;

      return {
        downstream: visited.size,
        upstream: upstreamCount?.count || 0,
        symbols: Array.from(visited),
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
      const related: Array<{ id: string; name: string; type: string; relationshipType: string }> = [];

      // Get directly related symbols
      const relationships = this.db.prepare(`
        SELECT from_symbols, to_symbols, type as rel_type
        FROM unified_relationships
        WHERE from_symbols LIKE ? OR to_symbols LIKE ?
        LIMIT ?
      `).all(`%${symbolId}%`, `%${symbolId}%`, limit * 2) as any[];

      const relatedIds = new Set<string>();

      for (const rel of relationships) {
        const fromSymbols = JSON.parse(rel.from_symbols);
        const toSymbols = JSON.parse(rel.to_symbols);

        for (const symId of [...fromSymbols, ...toSymbols]) {
          if (symId !== symbolId && !relatedIds.has(symId)) {
            relatedIds.add(symId);

            // Get symbol details
            const symbol = this.db.prepare(`
              SELECT id, name, type FROM symbols WHERE id = ?
            `).get(symId) as any;

            if (symbol) {
              related.push({
                id: symbol.id,
                name: symbol.name,
                type: symbol.type,
                relationshipType: rel.rel_type,
              });

              if (related.length >= limit) break;
            }
          }
        }

        if (related.length >= limit) break;
      }

      return related;
    } catch (error) {
      console.error(`getRelatedSymbols error: ${error}`);
      return [];
    }
  }

  /**
   * Find symbol by name
   *
   * @param name - Symbol name to search
   * @returns Symbol location or null
   */
  findSymbolByName(name: string): { id: string; name: string; type: string; filePath: string; line: number } | null {
    if (!this.db) return null;

    try {
      // First try exact match
      let symbol = this.db.prepare(`
        SELECT id, name, type, file_path, line
        FROM symbols
        WHERE name = ?
        LIMIT 1
      `).get(name) as any;

      // If not found, try case-insensitive match
      if (!symbol) {
        symbol = this.db.prepare(`
          SELECT id, name, type, file_path, line
          FROM symbols
          WHERE LOWER(name) = LOWER(?)
          LIMIT 1
        `).get(name) as any;
      }

      // If still not found, try partial match
      if (!symbol) {
        symbol = this.db.prepare(`
          SELECT id, name, type, file_path, line
          FROM symbols
          WHERE name LIKE ?
          ORDER BY LENGTH(name)
          LIMIT 1
        `).get(`%${name}%`) as any;
      }

      if (!symbol) return null;

      return {
        id: symbol.id,
        name: symbol.name,
        type: symbol.type,
        filePath: symbol.file_path,
        line: symbol.line || 1,
      };
    } catch (error) {
      console.error(`findSymbolByName error: ${error}`);
      return null;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
