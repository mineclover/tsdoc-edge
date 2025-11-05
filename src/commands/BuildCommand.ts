/**
 * Build command for creating symbol database
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { FileScanner } from '../scanner/FileScanner';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { BaseCommand, type CommandResult } from './BaseCommand';

/**
 * Command for building symbol database from source files
 *
 * @public
 * @responsibility Build and populate symbol database from TypeScript files
 * @contract Scan source files, extract symbols, and store in database
 *
 * @problem Need to extract all symbols from TypeScript codebase and make them searchable
 * @solves Scans TypeScript files, parses TSDoc, builds symbol graph, stores in SQLite + JSONL
 * @context Foundation for all other CLI commands that query symbol data
 *
 * @functionality
 * - Path validation: Check target directory exists
 * - File scanning: Find all TypeScript files (exclude tests, node_modules)
 * - Symbol extraction: Parse TSDoc and extract metadata
 * - Database storage: Insert into SQLite with indexes
 * - JSONL export: Git-friendly version control
 * - Statistics reporting: Files scanned, symbols found, duration
 *
 * @decision Use async scan with promise-based result
 * @rationale Large codebases require non-blocking I/O, better UX with progress
 * @consequences Slightly more complex error handling, but better performance
 *
 * @depends FileScanner, DatabaseManager, SymbolRegistryManager, ConfigManager
 * @depType internal
 * @depReason Core infrastructure for symbol extraction and storage
 */
export class BuildCommand extends BaseCommand {
  private configManager: ConfigManager;

  constructor(configManager?: ConfigManager) {
    super();
    this.configManager = configManager || ConfigManager.getInstance();
  }

  getName(): string {
    return 'build';
  }

  getDescription(): string {
    return 'Build symbol database from source files';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      const targetPath = args[0] || 'src';

      this.printHeader('TSDoc Edge - Build Database');

      // Validate path
      if (!fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        return this.failure(`Path not found: ${targetPath}`);
      }

      this.printInfo(`Building database from: ${targetPath}`);
      console.log();

      // Setup paths
      const config = this.configManager.get();
      const dbPath = path.join(process.cwd(), config.paths.databasePath || '.tsdoc.db');
      const jsonlPath = path.join(process.cwd(), config.paths.jsonlDir || 'docs/data');
      const registryPath = path.join(jsonlPath, 'registry.jsonl');

      // Ensure jsonl directory exists
      if (!fs.existsSync(jsonlPath)) {
        fs.mkdirSync(jsonlPath, { recursive: true });
      }

      // Initialize managers
      const dbManager = new DatabaseManager(dbPath, jsonlPath);
      const registryManager = new SymbolRegistryManager(registryPath);

      // Create scanner
      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: targetPath,
        include: ['**/*.ts', '**/*.tsx'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts'],
      });

      // Run scan
      this.printInfo('Scanning TypeScript files...');

      const startTime = Date.now();
      const result = await scanner.scan();
      const duration = Date.now() - startTime;

      console.log();
      this.printSuccess('Database build complete');
      console.log();

      // Print statistics
      this.printSection('Statistics');
      console.log(`  Files scanned: ${this.colors.cyan}${result.filesScanned}${this.colors.reset}`);
      console.log(`  Symbols found: ${this.colors.cyan}${result.symbolsFound}${this.colors.reset}`);
      console.log(`  Symbols inserted: ${this.colors.green}${result.symbolsInserted}${this.colors.reset}`);
      console.log(`  Duration: ${this.colors.cyan}${duration}ms${this.colors.reset}`);
      console.log();
      console.log(`${this.colors.dim}Database: ${dbPath}${this.colors.reset}`);

      // Show errors if any
      if (result.errors.length > 0) {
        console.log();
        this.printWarning(`Errors (${result.errors.length}):`);
        result.errors.slice(0, 10).forEach((err) => {
          console.log(`  ${this.colors.dim}${err}${this.colors.reset}`);
        });
        if (result.errors.length > 10) {
          console.log(`  ${this.colors.dim}... and ${result.errors.length - 10} more${this.colors.reset}`);
        }
      }

      console.log();

      return this.success(`Built database with ${result.symbolsInserted} symbols`);
    });
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
