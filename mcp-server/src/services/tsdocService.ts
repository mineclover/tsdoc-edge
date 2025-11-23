/**
 * Service for interacting with TSDoc Edge CLI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import type { Symbol, Relationship, OntologyStats, WorkContext } from '../types.js';
import { ERROR_MESSAGES } from '../constants.js';

const execAsync = promisify(exec);

export class TsDocService {
  private cwd: string;
  private cliPath: string;
  private dbPath: string;

  constructor(workspaceRoot?: string) {
    this.cwd = workspaceRoot || process.cwd();
    this.cliPath = path.join(this.cwd, 'dist', 'cli.js');
    this.dbPath = path.join(this.cwd, '.tsdoc', 'symbols.db');

    // Validate CLI exists
    if (!fs.existsSync(this.cliPath)) {
      this.cliPath = 'tsdoc-edge'; // Fall back to global installation
    }
  }

  /**
   * Check if database exists
   */
  isDatabaseAvailable(): boolean {
    return fs.existsSync(this.dbPath);
  }

  /**
   * Execute TSDoc Edge CLI command
   */
  private async executeCli(args: string[]): Promise<string> {
    if (!this.isDatabaseAvailable()) {
      throw new Error(ERROR_MESSAGES.DATABASE_NOT_FOUND);
    }

    const command = this.cliPath.endsWith('.js')
      ? `node ${this.cliPath} ${args.join(' ')}`
      : `${this.cliPath} ${args.join(' ')}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.cwd,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 60000, // 60 second timeout
      });

      if (stderr && !stderr.includes('[0m')) {
        console.error('CLI stderr:', stderr);
      }

      return stdout;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`CLI execution failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get ontology statistics
   */
  async getOntologyStats(detailed: boolean = false): Promise<OntologyStats> {
    const args = ['ontology-stats', '--json'];
    if (detailed) {
      args.push('--detailed');
    }

    const output = await this.executeCli(args);
    return JSON.parse(output);
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
    const args = ['ontology-list', '--format', 'json'];

    if (params.type) {
      args.push('--rels', params.type);
    } else if (params.category) {
      args.push('--category', params.category);
    } else if (params.strength) {
      args.push('--strength', params.strength);
    } else {
      // Default to listing all relationships
      args.push('--category', 'structural');
    }

    if (params.limit) {
      args.push('--limit', String(params.limit));
    }
    if (params.offset) {
      args.push('--offset', String(params.offset));
    }

    const output = await this.executeCli(args);
    return JSON.parse(output);
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
    const args = ['ontology-list', '--format', 'json'];

    if (params.type) {
      args.push('--nodes', params.type);
    } else {
      // Default to listing all nodes
      args.push('--nodes', 'class');
    }

    if (params.limit) {
      args.push('--limit', String(params.limit));
    }
    if (params.offset) {
      args.push('--offset', String(params.offset));
    }

    const output = await this.executeCli(args);
    const result = JSON.parse(output);

    // Filter by query if provided
    if (params.query && result.nodes) {
      const query = params.query.toLowerCase();
      result.nodes = result.nodes.filter((node: Symbol) =>
        node.name.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query)
      );
      result.total = result.nodes.length;
    }

    return result;
  }

  /**
   * Get work context for a file
   */
  async getWorkContext(filePath: string, depth: number = 2): Promise<string> {
    const args = ['work-context', filePath, '--llm'];
    if (depth !== 2) {
      args.push('--depth', String(depth));
    }

    return await this.executeCli(args);
  }

  /**
   * Get design context for a file
   */
  async getDesignContext(filePath: string): Promise<string> {
    const args = ['design-context', filePath];
    return await this.executeCli(args);
  }

  /**
   * Query relationships for a specific symbol
   */
  async queryRelationships(params: {
    symbolId: string;
    direction?: 'incoming' | 'outgoing' | 'both';
    maxDepth?: number;
  }): Promise<string> {
    const args = ['relationship-query', params.symbolId];

    if (params.direction && params.direction !== 'both') {
      args.push('--direction', params.direction);
    }
    if (params.maxDepth && params.maxDepth > 1) {
      args.push('--depth', String(params.maxDepth));
    }

    return await this.executeCli(args);
  }

  /**
   * Get symbol details
   */
  async getSymbolDetails(symbolId: string): Promise<Symbol | null> {
    try {
      const result = await this.searchSymbols({
        query: symbolId,
        limit: 1,
      });

      if (result.nodes && result.nodes.length > 0) {
        return result.nodes[0];
      }

      return null;
    } catch (error) {
      console.error('Error fetching symbol details:', error);
      return null;
    }
  }
}
