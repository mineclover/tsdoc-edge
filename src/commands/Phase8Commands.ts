/**
 * Phase 8 Command Implementations
 *
 * Commands for quality analysis and documentation fixing:
 * - untested: Find symbols without test coverage
 * - without-responsibility: Find symbols without @responsibility tag
 * - without-contract: Find symbols without contract specification
 * - fix: Automatically fix documentation issues
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, colors, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from '../graph/SymbolSearchEngine';
import type { Symbol } from '../types/graph/graph';
import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';

/**
 * Interface for symbol rows from database
 */
interface SymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
  line: number;
  column: number;
  is_exported: number;
  is_public: number;
  summary: string | null;
}

/**
 * UntestedCommand - Find symbols without test coverage
 *
 * Searches the database for symbols that don't have associated tests.
 * Helps identify gaps in test coverage and improve code quality.
 */
export class UntestedCommand extends BaseCommand {
  private dbManager?: DatabaseManager;
  private graphBuilder?: SymbolGraphBuilder;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'untested';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find symbols without test coverage';
  }

  protected getUsage(): string {
    return 'tsdoc-edge untested';
  }

  /**
   * execute method
   * @param _args - _args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(_args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(_args)) {
        return this.displayHelp();
      }

      console.log(`${colors.bold}Untested Symbols${colors.reset}`);
      console.log();

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');

      if (!fs.existsSync(dbPath)) {
        console.log(
          `${colors.yellow}⚠️  Database not found. Run 'build' first.${colors.reset}`
        );
        console.log();
        return { exitCode: 0, message: 'Database not found' };
      }

      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const query = 'SELECT * FROM symbols';
        const stmt = dbManager.db.prepare(query);
        const rows = stmt.all() as SymbolRow[];

        const graphBuilder = this.graphBuilder || new SymbolGraphBuilder();

        for (const row of rows) {
          const symbol: Symbol = {
            id: row.id,
            name: row.name,
            type: row.type as Symbol['type'],
            filePath: row.file_path,
            line: row.line,
            column: row.column,
            isExported: row.is_exported === 1,
            isPublic: row.is_public === 1,
            summary: row.summary ?? undefined,
            tests: [],
            designDecisions: [],
          };
          graphBuilder.addSymbol(symbol);
        }

        const searchEngine = new SymbolSearchEngine(graphBuilder);
        const untested = searchEngine.findUntested();

        if (untested.length === 0) {
          console.log(`${colors.green}✅ All symbols have tests!${colors.reset}`);
          console.log();
        } else {
          console.log(`${colors.yellow}Found ${untested.length} untested symbols:${colors.reset}`);
          console.log();

          for (const symbol of untested) {
            console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
            console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
            console.log();
          }
        }

        return {
          exitCode: 0,
          message: `Found ${untested.length} untested symbols`,
        };
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}

/**
 * WithoutResponsibilityCommand - Find symbols without @responsibility tag
 *
 * Identifies symbols that lack responsibility documentation.
 * Helps ensure all code has clear ownership and purpose defined.
 */
export class WithoutResponsibilityCommand extends BaseCommand {
  private dbManager?: DatabaseManager;
  private graphBuilder?: SymbolGraphBuilder;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'without-responsibility';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find symbols without @responsibility tag';
  }

  protected getUsage(): string {
    return 'tsdoc-edge without-responsibility';
  }

  /**
   * execute method
   * @param _args - _args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(_args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(_args)) {
        return this.displayHelp();
      }

      console.log(`${colors.bold}Symbols Without Responsibility${colors.reset}`);
      console.log();

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');

      if (!fs.existsSync(dbPath)) {
        console.log(
          `${colors.yellow}⚠️  Database not found. Run 'build' first.${colors.reset}`
        );
        console.log();
        return { exitCode: 0, message: 'Database not found' };
      }

      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const query = 'SELECT * FROM symbols';
        const stmt = dbManager.db.prepare(query);
        const rows = stmt.all() as SymbolRow[];

        const graphBuilder = this.graphBuilder || new SymbolGraphBuilder();

        for (const row of rows) {
          const symbol: Symbol = {
            id: row.id,
            name: row.name,
            type: row.type as Symbol['type'],
            filePath: row.file_path,
            line: row.line,
            column: row.column,
            isExported: row.is_exported === 1,
            isPublic: row.is_public === 1,
            summary: row.summary ?? undefined,
            tests: [],
            designDecisions: [],
          };
          graphBuilder.addSymbol(symbol);
        }

        const searchEngine = new SymbolSearchEngine(graphBuilder);
        const withoutResponsibility = searchEngine.findWithoutResponsibility();

        if (withoutResponsibility.length === 0) {
          console.log(`${colors.green}✅ All symbols have responsibility definitions!${colors.reset}`);
          console.log();
        } else {
          console.log(
            `${colors.yellow}Found ${withoutResponsibility.length} symbols without responsibility:${colors.reset}`
          );
          console.log();

          for (const symbol of withoutResponsibility) {
            console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
            console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
            console.log();
          }
        }

        return {
          exitCode: 0,
          message: `Found ${withoutResponsibility.length} symbols without responsibility`,
        };
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}

/**
 * WithoutContractCommand - Find symbols without contract specification
 *
 * Finds symbols lacking contract documentation (pre/post-conditions, invariants).
 * Essential for understanding API guarantees and constraints.
 */
export class WithoutContractCommand extends BaseCommand {
  private dbManager?: DatabaseManager;
  private graphBuilder?: SymbolGraphBuilder;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'without-contract';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find symbols without contract specification';
  }

  protected getUsage(): string {
    return 'tsdoc-edge without-contract';
  }

  /**
   * execute method
   * @param _args - _args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(_args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(_args)) {
        return this.displayHelp();
      }

      console.log(`${colors.bold}Symbols Without Contract${colors.reset}`);
      console.log();

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');

      if (!fs.existsSync(dbPath)) {
        console.log(
          `${colors.yellow}⚠️  Database not found. Run 'build' first.${colors.reset}`
        );
        console.log();
        return { exitCode: 0, message: 'Database not found' };
      }

      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const query = 'SELECT * FROM symbols';
        const stmt = dbManager.db.prepare(query);
        const rows = stmt.all() as SymbolRow[];

        const graphBuilder = this.graphBuilder || new SymbolGraphBuilder();

        for (const row of rows) {
          const symbol: Symbol = {
            id: row.id,
            name: row.name,
            type: row.type as Symbol['type'],
            filePath: row.file_path,
            line: row.line,
            column: row.column,
            isExported: row.is_exported === 1,
            isPublic: row.is_public === 1,
            summary: row.summary ?? undefined,
            tests: [],
            designDecisions: [],
          };
          graphBuilder.addSymbol(symbol);
        }

        const searchEngine = new SymbolSearchEngine(graphBuilder);
        const withoutContract = searchEngine.findWithoutContract();

        if (withoutContract.length === 0) {
          console.log(`${colors.green}✅ All symbols have contract specifications!${colors.reset}`);
          console.log();
        } else {
          console.log(
            `${colors.yellow}Found ${withoutContract.length} symbols without contract:${colors.reset}`
          );
          console.log();

          for (const symbol of withoutContract) {
            console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
            console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
            console.log();
          }
        }

        return {
          exitCode: 0,
          message: `Found ${withoutContract.length} symbols without contract`,
        };
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}

/**
 * FixCommand - Automatically fix documentation issues
 *
 * Analyzes code and automatically fixes documentation problems:
 * - Adds missing summaries
 * - Adds @param tags
 * - Adds @returns tags
 * - Adds custom tags
 *
 * Supports dry-run mode for preview without modifications.
 */
export class FixCommand extends BaseCommand {
  private checker?: CodeHealthChecker;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'fix';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Automatically fix documentation issues';
  }

  protected getUsage(): string {
    return `tsdoc-edge fix [directory] [options]

  Default: src
  Options:
    --dry-run         Preview changes without modifying files
    --min-score=N     Minimum quality score threshold (default: 70)`;
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

      let targetPath = args[0] || 'src';
      let dryRun = false;
      let minScore = 70;

      // Parse options
      for (const arg of args) {
        if (arg === '--dry-run') {
          dryRun = true;
        } else if (arg.startsWith('--min-score=')) {
          minScore = Number.parseInt(arg.split('=')[1], 10);
        } else if (!arg.startsWith('--')) {
          targetPath = arg;
        }
      }

      console.log(`${colors.bold}TSDoc Edge - Fix Documentation${colors.reset}`);
      console.log();

      if (!fs.existsSync(targetPath)) {
        console.log(`${colors.red}❌ Path not found: ${targetPath}${colors.reset}`);
        return {
          exitCode: 1,
          message: `Path not found: ${targetPath}`,
          error: new Error(`Path not found: ${targetPath}`),
        };
      }

      console.log(`${colors.cyan}Fixing: ${targetPath}${colors.reset}`);
      console.log(`${colors.cyan}Min score: ${minScore}${colors.reset}`);
      console.log(`${colors.cyan}Dry run: ${dryRun}${colors.reset}`);
      console.log();

      // Analyze first
      console.log(`${colors.bold}📊 Analyzing...${colors.reset}`);
      console.log();
      const checker = this.checker || new CodeHealthChecker();

      const report = checker.analyze({
        path: targetPath,
        includeChildren: true,
        includePrivate: false,
        minQualityScore: minScore,
        generateSuggestions: false,
      });

      console.log(`   Found ${report.docScores.length} symbols`);
      const needsFixing = report.docScores.filter((s) => s.qualityScore < minScore && s.isPublic);
      console.log(`   ${needsFixing.length} need fixing (quality < ${minScore})`);
      console.log();

      if (needsFixing.length === 0) {
        console.log(`${colors.green}✓ All documentation meets quality standards!${colors.reset}`);
        return {
          exitCode: 0,
          message: 'All documentation meets quality standards',
        };
      }

      // Group by file
      const byFile = new Map<string, typeof needsFixing>();
      for (const score of needsFixing) {
        if (!byFile.has(score.filePath)) {
          byFile.set(score.filePath, []);
        }
        byFile.get(score.filePath)?.push(score);
      }

      console.log(`${colors.bold}🔧 Fixing Files...${colors.reset}`);
      console.log();

      // Import DocumentationFixer dynamically
      const { DocumentationFixer } = await import('../fixer/DocumentationFixer');
      const fixer = new DocumentationFixer();

      let totalFixed = 0;
      for (const [filePath, scores] of byFile.entries()) {
        console.log(`   ${path.basename(filePath)} (${scores.length} symbols)...`);

        const result = fixer.fixFile(filePath, scores, {
          addSummary: true,
          addParams: true,
          addReturns: true,
          addExamples: false,
          addCustomTags: true,
          dryRun,
          minScore,
        });

        if (result.error) {
          console.log(`      ${colors.red}✗ Error: ${result.error}${colors.reset}`);
        } else if (result.modified) {
          console.log(`      ${colors.green}✓ Fixed ${result.symbolsFixed} symbols${colors.reset}`);
          totalFixed += result.symbolsFixed;
        } else {
          console.log(`      ${colors.yellow}- No changes needed${colors.reset}`);
        }
      }

      console.log();
      if (dryRun) {
        console.log(`${colors.cyan}Dry run complete. No files were modified.${colors.reset}`);
      } else {
        console.log(
          `${colors.green}✓ Fixed ${totalFixed} symbols in ${byFile.size} files${colors.reset}`
        );
      }
      console.log();

      return {
        exitCode: 0,
        message: `Fixed ${totalFixed} symbols in ${byFile.size} files`,
      };
    });
  }
}
