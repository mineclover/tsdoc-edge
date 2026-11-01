/**
 * Blocks Command - Display code blocks for a symbol
 * @packageDocumentation
 */

import Database from 'better-sqlite3';
import type { OutputSchema } from '../output/types';
import { arrayOf } from '../output/types';
import { XmlBuilder } from '../output/XmlBuilder';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

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
      byType: 'string',
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

/**
 * Command for displaying extracted code blocks and complexity metrics for a symbol.
 *
 * @public
 */
export class BlocksCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'blocks';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['bl'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Display code blocks and complexity breakdown for a symbol';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge blocks <symbol-id-or-name> [options]

Options:
  --type <type>   Filter blocks by block type
  --human         Human-readable output (default)
  --json          JSON output
  --xml           XML output`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(args, ['--human', '--json', '--xml'], ['--type']);
      if (flagError) return flagError;

      const positionalArgs = this.getPositionalArgs(args, ['--type']);
      const requestedSymbol = positionalArgs[0];
      if (!requestedSymbol) {
        this.printError('Usage: tsdoc-edge blocks <symbol-id-or-name> [--type <type>]');
        return this.failure('Usage: blocks <symbol-id> [--type=<type>]');
      }

      const typeFilter = this.getOption(args, '--type');
      const isJson = this.hasFlag(args, '--json');
      const isXml = this.hasFlag(args, '--xml');

      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbPath = this.getDatabasePath();
      const db = new Database(dbPath, { readonly: true });

      try {
        const symbol = db
          .prepare(
            `SELECT id, name, type, file_path as file
             FROM symbols
             WHERE id = ? OR name = ? OR LOWER(name) = LOWER(?)
             ORDER BY CASE
               WHEN id = ? THEN 0
               WHEN name = ? THEN 1
               ELSE 2
             END, is_exported DESC
             LIMIT 1`
          )
          .get(
            requestedSymbol,
            requestedSymbol,
            requestedSymbol,
            requestedSymbol,
            requestedSymbol
          ) as { id: string; name: string; type: string; file: string } | undefined;

        if (!symbol) {
          this.printError(`Symbol not found: ${requestedSymbol}`);
          return this.failure(`Symbol not found: ${requestedSymbol}`);
        }

        let query = `
          SELECT
            id, type, start_line as startLine, end_line as endLine,
            purpose, complexity, side_effects as sideEffects
          FROM code_blocks
          WHERE symbol_id = ?
        `;
        const params: unknown[] = [symbol.id];

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

        const totalBlocks = blocks.length;
        const totalLines = blocks.reduce((sum, b) => sum + (b.endLine - b.startLine + 1), 0);
        const averageComplexity =
          totalBlocks > 0
            ? Math.round(
                (blocks.reduce((sum, b) => sum + (b.complexity || 0), 0) / totalBlocks) * 10
              ) / 10
            : 0;

        const byType: Record<string, number> = {};
        for (const block of blocks) {
          byType[block.type] = (byType[block.type] || 0) + 1;
        }

        const formattedBlocks = blocks.map((b) => {
          const parsedSideEffects: unknown = b.sideEffects ? JSON.parse(b.sideEffects) : null;
          return {
            id: b.id,
            type: b.type,
            startLine: b.startLine,
            endLine: b.endLine,
            lines: b.endLine - b.startLine + 1,
            purpose: b.purpose || '',
            complexity: b.complexity || 0,
            sideEffects: Array.isArray(parsedSideEffects) ? parsedSideEffects.length : 0,
          };
        });

        if (isJson) {
          console.log(
            JSON.stringify(
              {
                symbol,
                summary: {
                  totalBlocks,
                  totalLines,
                  averageComplexity,
                  byType,
                },
                blocks: formattedBlocks,
              },
              null,
              2
            )
          );
        } else if (isXml) {
          new XmlBuilder(BlocksSchema)
            .section('symbol', symbol)
            .section('summary', {
              totalBlocks,
              totalLines,
              averageComplexity,
              byType: JSON.stringify(byType),
            })
            .section('blocks', formattedBlocks)
            .print();
        } else {
          this.printHeader(`Code Blocks: ${symbol.name} (${symbol.type})`);
          console.log(`  ${colors.dim}${symbol.file} (${symbol.id})${colors.reset}`);
          console.log();

          if (formattedBlocks.length === 0) {
            this.printInfo('No extracted code blocks recorded for this symbol');
            console.log();
          } else {
            this.printSection('Summary');
            console.log(
              `  Total Blocks:       ${colors.cyan}${totalBlocks}${colors.reset} (${totalLines} lines)`
            );
            console.log(`  Average Complexity: ${colors.cyan}${averageComplexity}${colors.reset}`);
            console.log();

            this.printSection('Blocks');
            for (const block of formattedBlocks) {
              console.log(
                `  ${colors.cyan}[${block.type}]${colors.reset} lines ${block.startLine}-${block.endLine} (${block.lines} lines, complexity: ${colors.yellow}${block.complexity}${colors.reset}, side-effects: ${block.sideEffects})`
              );
              if (block.purpose) {
                console.log(`    ${colors.dim}${block.purpose}${colors.reset}`);
              }
            }
            console.log();
          }
        }

        return this.success(
          totalBlocks === 0 ? 'No blocks found' : `Found ${formattedBlocks.length} blocks`
        );
      } finally {
        db.close();
      }
    });
  }
}
