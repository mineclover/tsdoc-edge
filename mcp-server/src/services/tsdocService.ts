/**
 * Service for interacting with TSDoc Edge directly
 *
 * Uses DatabaseManager and other services directly instead of CLI execution
 */

import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import type { Symbol, Relationship, OntologyStats } from '../types.js';
import { ERROR_MESSAGES } from '../constants.js';

/**
 * Simplified DatabaseManager for MCP server
 * Directly accesses the TSDoc Edge database
 */
export class TsDocService {
  private dbPath: string;
  private db: Database.Database | null = null;

  constructor(workspaceRoot?: string) {
    const cwd = workspaceRoot || process.cwd();
    this.dbPath = path.join(cwd, '.tsdoc', 'symbols.db');
  }

  /**
   * Check if database exists
   */
  isDatabaseAvailable(): boolean {
    return fs.existsSync(this.dbPath);
  }

  /**
   * Get database connection
   */
  private getDb(): Database.Database {
    if (!this.isDatabaseAvailable()) {
      throw new Error(ERROR_MESSAGES.DATABASE_NOT_FOUND);
    }

    if (!this.db) {
      this.db = new Database(this.dbPath, { readonly: true });
    }

    return this.db;
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

  /**
   * Get all unified relationships
   */
  private getAllUnifiedRelationships(): Relationship[] {
    const db = this.getDb();

    const rows = db.prepare(`
      SELECT * FROM unified_relationships
    `).all() as Array<{
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

    return rows.map(row => ({
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
  }

  /**
   * Get ontology statistics
   */
  async getOntologyStats(_detailed: boolean = false): Promise<OntologyStats> {
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
    const avgDegree = degreeValues.length > 0
      ? degreeValues.reduce((a, b) => a + b, 0) / degreeValues.length
      : 0;
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
   * List relationships with filters
   */
  async listRelationships(params: {
    type?: string;
    category?: string;
    strength?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; relationships: Relationship[] }> {
    let relationships = this.getAllUnifiedRelationships();

    // Apply filters
    if (params.type) {
      relationships = relationships.filter(r => r.type === params.type);
    }
    if (params.category) {
      relationships = relationships.filter(r => r.category === params.category);
    }
    if (params.strength) {
      relationships = relationships.filter(r => r.strength === params.strength);
    }
    if (params.from) {
      relationships = relationships.filter(r => {
        const froms = Array.isArray(r.from) ? r.from : [r.from];
        return froms.includes(params.from!);
      });
    }
    if (params.to) {
      relationships = relationships.filter(r => {
        const tos = Array.isArray(r.to) ? r.to : [r.to];
        return tos.includes(params.to!);
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
   * Search for symbols
   */
  async searchSymbols(params: {
    query?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; nodes: Symbol[] }> {
    const db = this.getDb();

    let sql = 'SELECT * FROM symbols';
    const sqlParams: any[] = [];

    if (params.type) {
      sql += ' WHERE type = ?';
      sqlParams.push(params.type);
    }

    sql += ' ORDER BY name';

    let nodes = db.prepare(sql).all(...sqlParams) as Symbol[];

    // Filter by query if provided
    if (params.query) {
      const query = params.query.toLowerCase();
      nodes = nodes.filter(node =>
        node.name.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query)
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
   * Note: This is a simplified version. For full functionality,
   * use the CLI command: tsdoc-edge work-context --llm
   */
  async getWorkContext(filePath: string, _depth: number = 2): Promise<string> {
    const db = this.getDb();

    // Normalize path
    const normalizedPath = path.isAbsolute(filePath)
      ? path.relative(process.cwd(), filePath)
      : filePath;

    // Get symbols in file
    const symbols = db.prepare('SELECT * FROM symbols WHERE filePath = ?')
      .all(normalizedPath) as Symbol[];

    if (symbols.length === 0) {
      return `# Work Context\n\nNo symbols found in file: ${filePath}\n\nPlease ensure the file has been indexed with: tsdoc-edge build src`;
    }

    // Get relationships for these symbols
    const symbolIds = symbols.map(s => s.id);
    const allRels = this.getAllUnifiedRelationships();
    const relationships = allRels.filter(rel => {
      const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
      const tos = Array.isArray(rel.to) ? rel.to : [rel.to];
      return froms.some(f => symbolIds.includes(f)) || tos.some(t => symbolIds.includes(t));
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
   */
  async getDesignContext(filePath: string): Promise<string> {
    return `# Design Context\n\nFor full design context (contracts, decisions, error patterns), use:\n\ntsdoc-edge design-context ${filePath}\n`;
  }

  /**
   * Query relationships for a specific symbol
   */
  async queryRelationships(params: {
    symbolId: string;
    direction?: 'incoming' | 'outgoing' | 'both';
    maxDepth?: number;
  }): Promise<string> {
    const allRels = this.getAllUnifiedRelationships();

    let relationships: Relationship[] = [];

    if (params.direction === 'outgoing' || params.direction === 'both' || !params.direction) {
      const outgoing = allRels.filter(rel => {
        const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
        return froms.includes(params.symbolId);
      });
      relationships = relationships.concat(outgoing);
    }

    if (params.direction === 'incoming' || params.direction === 'both' || !params.direction) {
      const incoming = allRels.filter(rel => {
        const tos = Array.isArray(rel.to) ? rel.to : [rel.to];
        return tos.includes(params.symbolId);
      });
      relationships = relationships.concat(incoming);
    }

    let markdown = `# Relationship Query\n\n`;
    markdown += `Symbol: ${params.symbolId}\n`;
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
   * Get symbol details
   */
  async getSymbolDetails(symbolId: string): Promise<Symbol | null> {
    const db = this.getDb();

    const symbol = db.prepare('SELECT * FROM symbols WHERE id = ?').get(symbolId) as Symbol | undefined;

    return symbol || null;
  }
}
