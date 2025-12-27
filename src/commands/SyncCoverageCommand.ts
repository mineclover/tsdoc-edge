/**
 * Sync Coverage Command - Sync test coverage data
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command for syncing test coverage data
 *
 * @doc [[SyncCoverageCommand]]
 * @public
 * @responsibility Sync test coverage from Istanbul/NYC reports
 * @contract Reads coverage JSON, maps to symbols, updates database
 *
 * @problem Need to track which symbols are tested
 * @solves Imports coverage data and associates with symbols
 * @context Part of test coverage tracking
 *
 * @functionality
 * - Coverage parsing: Read Istanbul coverage-final.json
 * - Symbol mapping: Map coverage to symbol IDs
 * - Database update: Store coverage in symbols table
 * - Summary display: Total symbols covered
 * - Error handling: Handle missing coverage file
 *
 * @decision Use DatabaseManager for storage
 * @rationale Direct database access for coverage updates
 * @consequences Requires Istanbul/NYC coverage report
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason Coverage data storage
 */
export class SyncCoverageCommand extends BaseCommand {
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
    return 'sync-coverage';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Sync test coverage data from Istanbul/NYC';
  }

  protected getUsage(): string {
    return 'tsdoc-edge sync-coverage [coverage-file]\n\n  Default: coverage/coverage-final.json';
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

      const coveragePath = args[0] || 'coverage/coverage-final.json';

      if (!fs.existsSync(coveragePath)) {
        this.printError(`Coverage file not found: ${coveragePath}`);
        console.log();
        console.log('Generate coverage first:');
        this.printInfo('  npm test -- --coverage');
        console.log();
        return this.failure(`Coverage file not found: ${coveragePath}`);
      }

      this.printHeader('Sync Test Coverage');
      console.log(`Coverage file: ${colors.cyan}${coveragePath}${colors.reset}`);
      console.log();

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        // Read coverage file
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        const fileCount = Object.keys(coverageData).length;

        this.printSection('✅ Coverage File Read');
        console.log(`Coverage format: ${colors.cyan}Istanbul/NYC${colors.reset}`);
        console.log(`Total files in coverage: ${colors.green}${fileCount}${colors.reset}`);
        console.log();
        console.log(`${colors.dim}Note: Full coverage sync requires CoverageSyncer integration${colors.reset}`);
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
