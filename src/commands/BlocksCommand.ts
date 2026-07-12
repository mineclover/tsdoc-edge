/**
 * Blocks Command - Display code blocks for a symbol
 * @packageDocumentation
 */

import Database from 'better-sqlite3';
import type { OutputSchema } from '../output/types';
import { arrayOf } from '../output/types';
import { XmlBuilder } from '../output/XmlBuilder';
import { BaseCommand, type CommandResult } from './BaseCommand';

const BlocksSchema: OutputSchema = {
  root: 'code-blocks',
  sections: {
    symbol: {
      id: 'string',
      name: 'string',
      type: 'string',
      file: 'string',
    },
    summary: {
      totalBlocks: 'number',
      totalLines: 'number',
      averageComplexity: 'number',
      byType: 'string', // JSON
    },
    blocks: arrayOf('block', {
      id: 'string',
      type: 'string',
      startLine: 'number',
      endLine: 'number',
      lines: 'number',
      purpose: 'string',
      complexity: 'number',
      sideEffects: 'number',
    }),
  },
};

export class BlocksCommand extends BaseCommand {
  getName(): string {
    return 'blocks';
  }

  getAlias(): string[] {
    return ['bl'];
  }

  getDescription(): string {
    return 'Display code blocks for a symbol';
  }

  async execute(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        exitCode: 1,
        message: 'Usage: blocks <symbol-id> [--type=<type>]',
      };
    }

    const symbolId = args[0];
    const typeFilter = args.find((a) => a.startsWith('--type='))?.split('=')[1];

    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) return dbCheck;

    const dbPath = this.getDatabasePath();
    const db = new Database(dbPath, { readonly: true });

    try {
      // Get symbol info
      const symbol = db
        .prepare(`
        SELECT id, name, type, file_path as file
        FROM symbols
        WHERE id = ?
      `)
        .get(symbolId) as { id: string; name: string; type: string; file: string } | undefined;

      if (!symbol) {
        db.close();
        return {
          exitCode: 1,
          message: `Symbol not found: ${symbolId}`,
        };
      }

      // Get blocks
      let query = `
        SELECT
          id, type, start_line as startLine, end_line as endLine,
          purpose, complexity, side_effects as sideEffects
        FROM code_blocks
        WHERE symbol_id = ?
      `;

      const params: unknown[] = [symbolId];

      if (typeFilter) {
        query += ' AND type = ?';
        params.push(typeFilter);
      }

      query += ' ORDER BY start_line';

      const blocks = db.prepare(query).all(...params) as Array<{
        id: string;
        type: string;
        startLine: number;
        endLine: number;
        purpose: string;
        complexity: number;
        sideEffects: string;
      }>;

      if (blocks.length === 0) {
        db.close();
        new XmlBuilder(BlocksSchema)
          .section('symbol', symbol)
          .section('summary', {
            totalBlocks: 0,
            totalLines: 0,
            averageComplexity: 0,
            byType: '{}',
          })
          .section('blocks', [])
          .print();
        return { exitCode: 0, message: 'No blocks found' };
      }

      // Calculate statistics
      const totalBlocks = blocks.length;
      const totalLines = blocks.reduce((sum, b) => sum + (b.endLine - b.startLine + 1), 0);
      const averageComplexity =
        blocks.reduce((sum, b) => sum + (b.complexity || 0), 0) / totalBlocks;

      const byType: Record<string, number> = {};
      for (const block of blocks) {
        byType[block.type] = (byType[block.type] || 0) + 1;
      }

      // Format blocks for output
      const formattedBlocks = blocks.map((b) => ({
        id: b.id,
        type: b.type,
        startLine: b.startLine,
        endLine: b.endLine,
        lines: b.endLine - b.startLine + 1,
        purpose: b.purpose || '',
        complexity: b.complexity || 0,
        sideEffects: b.sideEffects ? JSON.parse(b.sideEffects).length : 0,
      }));

      new XmlBuilder(BlocksSchema)
        .section('symbol', symbol)
        .section('summary', {
          totalBlocks,
          totalLines,
          averageComplexity: Math.round(averageComplexity * 10) / 10,
          byType: JSON.stringify(byType),
        })
        .section('blocks', formattedBlocks)
        .print();

      db.close();
      return { exitCode: 0, message: `Found ${blocks.length} blocks` };
    } catch (error) {
      db.close();
      return {
        exitCode: 1,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
