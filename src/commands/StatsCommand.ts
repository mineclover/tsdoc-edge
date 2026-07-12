/**
 * Stats Command - Show documentation statistics
 * @packageDocumentation
 */

import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for showing documentation statistics
 *
 * @public
 * @responsibility Display comprehensive documentation statistics
 * @contract Analyzes database, computes stats, optionally compares/saves
 * @doc [[StatsCommand]]
 * @doc [[CLI Commands#stats]]
 *
 * @problem Need to track documentation quality metrics over time
 * @solves Collects and displays stats with optional historical comparison
 * @context Part of quality tracking and improvement
 *
 * @functionality
 * - Stats collection: Total symbols, coverage, health scores
 * - Historical comparison: Compare with previous snapshots
 * - Trend analysis: Show improvements or regressions
 * - Save snapshots: Store stats for future comparison
 * - Warnings-only mode: Show only regressions
 *
 * @decision Use TrackableStatsCollector and StatsHistoryManager
 * @rationale Centralized stats collection with history tracking
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager, TrackableStatsCollector, StatsHistoryManager
 * @depType internal
 * @depReason Stats collection and history tracking
 */
export class StatsCommand extends BaseCommand {
  private dbManager?: DatabaseManager;

  constructor(dbManager?: DatabaseManager) {
    super();
    this.dbManager = dbManager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'stats';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['s'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show documentation statistics with optional comparison';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge stats';
  }

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

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const stats = dbManager.getStatistics();

        // Count documented vs undocumented - separated by source/test using Drizzle
        const allSymbols = dbManager.getAllSymbolRows();
        const total = allSymbols.length;

        // Show guidance if no symbols
        if (total === 0) {
          if (this.hasFlag(args, '--human')) {
            this.printHeader('TSDoc Edge - Documentation Statistics');
            console.log(`${colors.yellow}No symbols found in database.${colors.reset}`);
            console.log();
            console.log(`${colors.bold}Getting Started:${colors.reset}`);
            console.log(
              `  1. Run ${colors.cyan}tsdoc-edge build src${colors.reset} to build the symbol database`
            );
            console.log(
              `  2. Run ${colors.cyan}tsdoc-edge stats${colors.reset} again to see statistics`
            );
            console.log();
          } else {
            // XML output for empty database
            this.printOutput(
              'statistics',
              {
                database: {
                  totalSymbols: 0,
                  totalEnhancedDocs: 0,
                  dbSizeKB: 0,
                },
                message: {
                  text: 'No symbols found in database. Run tsdoc-edge build src to build the symbol database.',
                },
              },
              args
            );
          }
          return this.success();
        }

        const documented = allSymbols.filter((s) => s.summary && s.summary.trim() !== '').length;
        const testTotal = allSymbols.filter(
          (s) => s.type === 'test-case' || s.type === 'test-suite'
        ).length;
        const sourceTotal = total - testTotal;
        const sourceDocumented = allSymbols.filter(
          (s) =>
            s.type !== 'test-case' &&
            s.type !== 'test-suite' &&
            s.summary &&
            s.summary.trim() !== ''
        ).length;
        const coverage = (documented / total) * 100;
        const sourceCoverage = sourceTotal > 0 ? (sourceDocumented / sourceTotal) * 100 : 0;
        const testPercent = (testTotal / total) * 100;

        // Check if human-readable format is requested
        if (this.hasFlag(args, '--human')) {
          // Original color output
          this.printHeader('TSDoc Edge - Documentation Statistics');

          this.printSection('📊 Database Statistics');
          console.log(`Total Symbols: ${colors.green}${stats.totalSymbols}${colors.reset}`);
          console.log(
            `Total Enhanced Docs: ${colors.green}${stats.totalEnhancedDocs}${colors.reset}`
          );
          console.log(
            `DB Size: ${colors.cyan}${(stats.dbSize / 1024).toFixed(2)} KB${colors.reset}`
          );
          console.log();

          this.printSection('📈 Documentation Coverage');
          console.log(`${colors.bold}Overall:${colors.reset}`);
          console.log(`  Documented: ${colors.green}${documented}${colors.reset} / ${total}`);
          console.log(`  Coverage: ${colors.bold}${coverage.toFixed(1)}%${colors.reset}`);
          console.log();
          console.log(
            `${colors.bold}Source Code Only:${colors.reset} ${colors.dim}(excluding test-case, test-suite)${colors.reset}`
          );
          console.log(
            `  Documented: ${colors.green}${sourceDocumented}${colors.reset} / ${sourceTotal}`
          );
          console.log(`  Coverage: ${colors.bold}${sourceCoverage.toFixed(1)}%${colors.reset}`);
          console.log();
          console.log(
            `${colors.dim}Test Symbols: ${testTotal} (${testPercent.toFixed(1)}% of total)${colors.reset}`
          );
          console.log();
        } else {
          // XML output (default)
          this.printOutput(
            'statistics',
            {
              database: {
                totalSymbols: stats.totalSymbols,
                totalEnhancedDocs: stats.totalEnhancedDocs,
                dbSizeKB: (stats.dbSize / 1024).toFixed(2),
              },
              coverage: {
                overall: {
                  documented,
                  total,
                  coveragePercent: coverage.toFixed(1),
                },
                source: {
                  documented: sourceDocumented,
                  total: sourceTotal,
                  coveragePercent: sourceCoverage.toFixed(1),
                },
                tests: {
                  total: testTotal,
                  percentOfTotal: testPercent.toFixed(1),
                },
              },
            },
            args
          );
        }

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}
