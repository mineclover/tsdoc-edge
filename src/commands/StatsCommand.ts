/**
 * Stats Command - Show documentation statistics
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

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
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show documentation statistics with optional comparison';
  }

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

      this.printHeader('TSDoc Edge - Documentation Statistics');

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const stats = dbManager.getStatistics();

        this.printSection('📊 Database Statistics');
        console.log(`Total Symbols: ${colors.green}${stats.totalSymbols}${colors.reset}`);
        console.log(`Total Enhanced Docs: ${colors.green}${stats.totalEnhancedDocs}${colors.reset}`);
        console.log(`DB Size: ${colors.cyan}${(stats.dbSize / 1024).toFixed(2)} KB${colors.reset}`);
        console.log();

        // Count documented vs undocumented - separated by source/test using Drizzle
        const allSymbols = dbManager.getAllSymbolRows();

        const total = allSymbols.length;
        const documented = allSymbols.filter(s => s.summary && s.summary.trim() !== '').length;
        const testTotal = allSymbols.filter(s => s.type === 'test-case' || s.type === 'test-suite').length;
        const sourceTotal = total - testTotal;
        const sourceDocumented = allSymbols.filter(s =>
          s.type !== 'test-case' && s.type !== 'test-suite' && s.summary && s.summary.trim() !== ''
        ).length;
        const coverage = total > 0 ? (documented / total) * 100 : 0;
        const sourceCoverage = sourceTotal > 0 ? (sourceDocumented / sourceTotal) * 100 : 0;

        this.printSection('📈 Documentation Coverage');
        console.log(`${colors.bold}Overall:${colors.reset}`);
        console.log(`  Documented: ${colors.green}${documented}${colors.reset} / ${total}`);
        console.log(`  Coverage: ${colors.bold}${coverage.toFixed(1)}%${colors.reset}`);
        console.log();
        console.log(`${colors.bold}Source Code Only:${colors.reset} ${colors.dim}(excluding test-case, test-suite)${colors.reset}`);
        console.log(`  Documented: ${colors.green}${sourceDocumented}${colors.reset} / ${sourceTotal}`);
        console.log(`  Coverage: ${colors.bold}${sourceCoverage.toFixed(1)}%${colors.reset}`);
        console.log();
        console.log(`${colors.dim}Test Symbols: ${testTotal} (${((testTotal / total) * 100).toFixed(1)}% of total)${colors.reset}`);
        console.log();

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}
