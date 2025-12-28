/**
 * Base command class for CLI commands
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DatabaseManager, SymbolRow } from '../storage/DatabaseManager';
import type { Symbol } from '../types/graph/graph';

/**
 * Result of symbol resolution
 */
export interface ResolvedSymbol {
  symbol: Symbol | SymbolRow;
  id: string;
  autoSelected: boolean;
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Exit code (0 = success) */
  exitCode: number;
  /** Output message */
  message?: string;
  /** Error if failed */
  error?: Error;
}

/**
 * ANSI color codes for terminal output
 */
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
} as const;

/**
 * Base class for all CLI commands
 *
 * @public
 * @responsibility Provide common CLI command infrastructure
 * @contract Execute command and return structured result
 *
 * @problem CLI commands have repeated boilerplate (header printing, error handling, output formatting)
 * @solves Abstract base class with template method pattern for common operations
 * @context 40+ CLI commands need consistent UX and error handling
 *
 * @functionality
 * - Command lifecycle: Validation → Execution → Result handling
 * - Output formatting: Headers, sections, success/error messages
 * - Error handling: Structured error results with exit codes
 * - Testability: Returns result objects instead of process.exit
 *
 * @decision Use abstract class instead of interface
 * @rationale Provides default implementations for common operations, enforces structure while allowing customization
 * @consequences Child classes inherit common functionality, can override when needed
 */
export abstract class BaseCommand {
  /**
   * Execute the command
   *
   * @param args - Command arguments
   * @returns Command result with exit code
   */
  abstract execute(args: string[]): Promise<CommandResult>;

  /**
   * Get command name
   *
   * @returns Command name
   */
  abstract getName(): string;

  /**
   * Get command aliases
   *
   * @returns Array of command aliases (default: empty array)
   */
  getAlias(): string[] {
    return [];
  }

  /**
   * Get command description
   *
   * @returns Command description
   */
  abstract getDescription(): string;

  /**
   * Print header with title
   *
   * @param title - Header title
   * @returns void - No return value
   */
  protected printHeader(title: string): void {
    console.log(colors.bold + colors.blue + '='.repeat(80) + colors.reset);
    console.log(colors.bold + colors.blue + title + colors.reset);
    console.log(colors.bold + colors.blue + '='.repeat(80) + colors.reset);
    console.log();
  }

  /**
   * Print section title
   *
   * @param title - Section title
   * @returns void - No return value
   */
  protected printSection(title: string): void {
    console.log(colors.bold + colors.cyan + title + colors.reset);
    console.log(colors.cyan + '-'.repeat(80) + colors.reset);
  }

  /**
   * Print success message
   *
   * @param message - Success message
   * @returns void - No return value
   */
  protected printSuccess(message: string): void {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
  }

  /**
   * Print error message
   *
   * @param message - Error message
   * @returns void - No return value
   */
  protected printError(message: string): void {
    console.log(`${colors.red}✗ ${message}${colors.reset}`);
  }

  /**
   * Print warning message
   *
   * @param message - Warning message
   * @returns void - No return value
   */
  protected printWarning(message: string): void {
    console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
  }

  /**
   * Print info message
   *
   * @param message - Info message
   * @returns void - No return value
   */
  protected printInfo(message: string): void {
    console.log(`${colors.cyan}ℹ ${message}${colors.reset}`);
  }

  /**
   * Create success result
   *
   * @param message - Optional success message
   * @returns Success result
   */
  protected success(message?: string): CommandResult {
    return {
      exitCode: 0,
      message,
    };
  }

  /**
   * Create error result
   *
   * @param error - Error object or message
   * @param exitCode - Exit code (default: 1)
   * @returns Error result
   */
  protected failure(error: Error | string, exitCode = 1): CommandResult {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    return {
      exitCode,
      message: errorObj.message,
      error: errorObj,
    };
  }

  /**
   * Validate required arguments
   *
   * @param args - Command arguments
   * @param minArgs - Minimum required arguments
   * @param usage - Usage message
   * @returns Validation result (null if valid, error result if invalid)
   */
  protected validateArgs(
    args: string[],
    minArgs: number,
    usage: string
  ): CommandResult | null {
    if (args.length < minArgs) {
      this.printError(`Not enough arguments`);
      console.log();
      console.log(`Usage: ${usage}`);
      console.log();
      return this.failure('Invalid arguments', 1);
    }
    return null;
  }

  /**
   * Check if help flag is present in arguments
   *
   * @param args - Command arguments
   * @returns True if --help or -h flag is present
   */
  protected hasHelpFlag(args: string[]): boolean {
    return args.includes('--help') || args.includes('-h');
  }

  /**
   * Get command usage information
   * Override this method to provide custom usage info
   *
   * @returns Usage string
   */
  protected getUsage(): string {
    return `tsdoc-edge ${this.getName()} [options]`;
  }

  /**
   * Display help message for command
   * Displays name, description, and usage
   * Note: Named "displayHelp" to avoid conflicts with command-specific help methods
   *
   * @returns Success result
   */
  protected displayHelp(): CommandResult {
    this.printHeader(`${this.getName()} - Help`);

    console.log(colors.bold + 'Description:' + colors.reset);
    console.log(`  ${this.getDescription()}`);
    console.log();

    console.log(colors.bold + 'Usage:' + colors.reset);
    console.log(`  ${this.getUsage()}`);
    console.log();

    console.log(colors.bold + 'Options:' + colors.reset);
    console.log(`  ${colors.cyan}--help, -h${colors.reset}     Show this help message`);
    console.log();

    return this.success();
  }

  /**
   * Handle command execution with error catching
   *
   * @param fn - Async function to execute
   * @returns Command result
   */
  protected async executeWithErrorHandling(
    fn: () => Promise<CommandResult>
  ): Promise<CommandResult> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error) {
        this.printError(error.message);
        return this.failure(error);
      }
      const unknownError = new Error('Unknown error occurred');
      this.printError(unknownError.message);
      return this.failure(unknownError);
    }
  }

  /**
   * Get database path from config or default
   * Reads .tsdoc.config.json and returns the configured database path,
   * or falls back to .tsdoc/symbols.db for backwards compatibility
   *
   * @returns Absolute path to the database file
   */
  protected getDatabasePath(): string {
    const configPath = path.join(process.cwd(), '.tsdoc.config.json');

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.paths?.databasePath) {
          return path.join(process.cwd(), config.paths.databasePath);
        }
      } catch {
        // Ignore config parse errors, use default
      }
    }

    // Default fallback for backwards compatibility
    return path.join(process.cwd(), '.tsdoc', 'symbols.db');
  }

  /**
   * Get JSONL directory path from config or default
   *
   * @returns Absolute path to the JSONL directory
   */
  protected getJsonlPath(): string {
    const configPath = path.join(process.cwd(), '.tsdoc.config.json');

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.paths?.jsonlDir) {
          return path.join(process.cwd(), config.paths.jsonlDir);
        }
      } catch {
        // Ignore config parse errors, use default
      }
    }

    // Default fallback
    return path.join(process.cwd(), '.tsdoc', 'data');
  }

  /**
   * Resolve symbol by ID or name pattern
   * Automatically selects class/interface if exact name match exists
   *
   * @param dbManager - Database manager instance
   * @param symbolIdOrName - Symbol ID or name to look up
   * @returns Resolved symbol or null if not found
   */
  protected resolveSymbol(dbManager: DatabaseManager, symbolIdOrName: string): ResolvedSymbol | null {
    // Try exact ID first
    const exactSymbol = dbManager.getSymbol(symbolIdOrName);
    if (exactSymbol) {
      return { symbol: exactSymbol as Symbol, id: symbolIdOrName, autoSelected: false };
    }

    // Try name pattern match
    const matches = dbManager.findSymbolsByNamePattern(symbolIdOrName);
    if (matches.length === 0) {
      return null;
    }

    // Auto-select if exact name match with primary type
    const primaryMatch = matches.find(m =>
      m.name.toLowerCase() === symbolIdOrName.toLowerCase() &&
      ['class', 'interface', 'function', 'type'].includes(m.type)
    );

    if (primaryMatch) {
      console.log(`${colors.dim}Selected: ${primaryMatch.name} (${primaryMatch.type})${colors.reset}`);
      console.log();
      const symbol = dbManager.getSymbol(primaryMatch.id);
      return symbol ? { symbol: symbol as Symbol, id: primaryMatch.id, autoSelected: true } : null;
    }

    // Return first match if only one
    if (matches.length === 1) {
      const symbol = dbManager.getSymbol(matches[0].id);
      return symbol ? { symbol: symbol as Symbol, id: matches[0].id, autoSelected: false } : null;
    }

    // If multiple matches, try to auto-select a class/interface
    // Prefer matches where the search term is at the start of the name
    const searchLower = symbolIdOrName.toLowerCase();
    const classOrInterfaceMatches = matches.filter(m => ['class', 'interface'].includes(m.type));

    if (classOrInterfaceMatches.length > 0) {
      // Prefer match where name starts with the search term
      const startsWithMatch = classOrInterfaceMatches.find(m =>
        m.name.toLowerCase().startsWith(searchLower)
      );
      const selected = startsWithMatch || classOrInterfaceMatches[0];

      console.log(`${colors.dim}Selected: ${selected.name} (${selected.type})${colors.reset}`);
      console.log();
      const symbol = dbManager.getSymbol(selected.id);
      return symbol ? { symbol: symbol as Symbol, id: selected.id, autoSelected: true } : null;
    }

    // Multiple ambiguous matches - show options
    console.log(`${colors.yellow}Multiple matches found:${colors.reset}`);
    for (const m of matches.slice(0, 10)) {
      console.log(`  ${colors.cyan}${m.id}${colors.reset} (${m.name}) [${m.type}]`);
    }
    if (matches.length > 10) {
      console.log(`  ... and ${matches.length - 10} more`);
    }
    console.log();
    console.log('Please use a more specific ID or name.');
    return null;
  }

  /**
   * Check if database exists and return failure result if not
   * Use this for consistent error messaging across commands
   *
   * @returns CommandResult if database not found, null if exists
   */
  protected checkDatabaseExists(): CommandResult | null {
    const dbPath = this.getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      this.printError('Database not found');
      console.log();
      console.log(`${colors.dim}The symbol database has not been built yet.${colors.reset}`);
      console.log();
      console.log(`${colors.cyan}To fix this, run:${colors.reset}`);
      console.log(`  tsdoc-edge build src`);
      console.log();
      return this.failure('Database not found. Run: tsdoc-edge build src');
    }
    return null;
  }

  /**
   * Check if a file exists and return failure with helpful message
   *
   * @param filePath - Path to check
   * @param fileType - Description of file type (e.g., "Source file", "Config file")
   * @returns CommandResult if file not found, null if exists
   */
  protected checkFileExists(filePath: string, fileType = 'File'): CommandResult | null {
    if (!fs.existsSync(filePath)) {
      this.printError(`${fileType} not found: ${filePath}`);
      console.log();

      // Provide suggestions based on file type
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        console.log(`${colors.dim}Check that the file path is correct and the file exists.${colors.reset}`);
      } else if (filePath.endsWith('.md')) {
        console.log(`${colors.dim}Check that the markdown file exists in the managed/ directory.${colors.reset}`);
      } else if (filePath.includes('.tsdoc')) {
        console.log(`${colors.dim}Run 'tsdoc-edge init' to create the configuration.${colors.reset}`);
      }
      console.log();

      return this.failure(`${fileType} not found: ${filePath}`);
    }
    return null;
  }

  /**
   * Check if a directory exists and return failure with helpful message
   *
   * @param dirPath - Path to check
   * @param dirType - Description of directory type
   * @returns CommandResult if directory not found, null if exists
   */
  protected checkDirectoryExists(dirPath: string, dirType = 'Directory'): CommandResult | null {
    if (!fs.existsSync(dirPath)) {
      this.printError(`${dirType} not found: ${dirPath}`);
      console.log();
      console.log(`${colors.dim}Create the directory or check the path.${colors.reset}`);
      console.log();
      return this.failure(`${dirType} not found: ${dirPath}`);
    }
    return null;
  }

  /**
   * Check if config file exists and return failure with helpful message
   *
   * @returns CommandResult if config not found, null if exists
   */
  protected checkConfigExists(): CommandResult | null {
    const configPath = path.join(process.cwd(), '.tsdoc.config.json');
    if (!fs.existsSync(configPath)) {
      this.printError('Configuration file not found');
      console.log();
      console.log(`${colors.dim}TSDoc Edge requires a configuration file to operate.${colors.reset}`);
      console.log();
      console.log(`${colors.cyan}To create one, run:${colors.reset}`);
      console.log(`  tsdoc-edge init`);
      console.log();
      return this.failure('Configuration file not found. Run: tsdoc-edge init');
    }
    return null;
  }

  /**
   * Format and display a user-friendly error with context
   *
   * @param error - The error that occurred
   * @param context - Additional context about what was being attempted
   * @returns CommandResult with error
   */
  protected handleError(error: unknown, context?: string): CommandResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (context) {
      this.printError(`Failed to ${context}`);
    } else {
      this.printError('An error occurred');
    }
    console.log();
    console.log(`${colors.dim}Error: ${errorMessage}${colors.reset}`);
    console.log();

    // Provide suggestions for common errors
    if (errorMessage.includes('ENOENT')) {
      console.log(`${colors.yellow}Hint:${colors.reset} A file or directory was not found. Check the path.`);
    } else if (errorMessage.includes('EACCES')) {
      console.log(`${colors.yellow}Hint:${colors.reset} Permission denied. Check file permissions.`);
    } else if (errorMessage.includes('SQLITE')) {
      console.log(`${colors.yellow}Hint:${colors.reset} Database error. Try running 'tsdoc-edge build src' to rebuild.`);
    } else if (errorMessage.includes('JSON')) {
      console.log(`${colors.yellow}Hint:${colors.reset} Invalid JSON. Check for syntax errors in the file.`);
    }
    console.log();

    return this.failure(error instanceof Error ? error : new Error(errorMessage));
  }
}
