/**
 * Rebuild Index Command - Rebuild FTS5 search indexes
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command for rebuilding FTS5 search indexes
 *
 * @public
 * @responsibility Rebuild corrupted or out-of-sync FTS5 indexes
 * @contract Rebuild FTS5 virtual tables from content tables
 * @doc [[RebuildIndexCommand]]
 * @doc [[CLI Commands#rebuild-index]]
 *
 * @problem FTS5 indexes can become corrupted or out of sync with content tables
 * @solves Provides a command to rebuild FTS5 indexes without rebuilding entire database
 * @context FTS5 corruption can occur after database migrations or interrupted operations
 *
 * @functionality
 * - Index rebuild: Rebuild symbols_fts and enhanced_docs_fts tables
 * - Verification: Verify counts match after rebuild
 * - Error handling: Graceful handling of empty or missing tables
 *
 * @decision Use SQLite's special 'rebuild' command for FTS5
 * @rationale Native SQLite command is the safest and most efficient way
 * @consequences Requires exclusive database access during rebuild
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason Database access and FTS5 rebuild operations
 */
export class RebuildIndexCommand extends BaseCommand {
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
    return 'rebuild-index';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Rebuild FTS5 search indexes to fix corruption';
  }

  protected getUsage(): string {
    return 'tsdoc-edge rebuild-index';
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

      this.printHeader('TSDoc Edge - Rebuild FTS5 Index');

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        // Get counts before rebuild
        const statsBefore = dbManager.getStatistics();
        console.log(`${colors.cyan}📊 Symbols in database: ${statsBefore.totalSymbols}${colors.reset}`);
        console.log();

        // Rebuild FTS5 indexes
        this.printSection('🔨 Rebuilding FTS5 Indexes');
        console.log('This may take a moment...');
        console.log();

        const startTime = Date.now();
        const result = dbManager.rebuildFTS5Index();
        const duration = Date.now() - startTime;

        // Display results
        this.printSuccess('✅ FTS5 indexes rebuilt successfully!');
        console.log();

        this.printSection('📊 Rebuild Results');
        console.log(`Symbols FTS index: ${colors.green}${result.symbolsFts}${colors.reset} entries`);
        console.log(`Enhanced docs FTS index: ${colors.green}${result.enhancedDocsFts}${colors.reset} entries`);
        console.log(`Duration: ${colors.cyan}${duration}ms${colors.reset}`);
        console.log();

        // Verify
        if (result.symbolsFts === statsBefore.totalSymbols) {
          this.printSuccess('✅ Index counts match database counts');
        } else {
          this.printWarning(`⚠️  Warning: Symbol count mismatch (DB: ${statsBefore.totalSymbols}, FTS: ${result.symbolsFts})`);
        }
        console.log();

        // Test search using Drizzle
        this.printSection('🧪 Testing Search Functionality');
        const testSymbols = dbManager.querySymbols({ limit: 1 });

        if (testSymbols.length > 0) {
          const testName = testSymbols[0].name;
          try {
            const searchResults = dbManager.searchSymbols(testName);
            this.printSuccess(`✅ Search test passed (query: "${testName}", results: ${searchResults.length})`);
          } catch (error) {
            this.printError(`❌ Search test failed: ${error}`);
            return this.failure('Search functionality not working after rebuild');
          }
        }
        console.log();

        this.printSuccess('✨ FTS5 index rebuild complete!');
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
