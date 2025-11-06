/**
 * Base command class for CLI commands
 * @packageDocumentation
 */

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
 *
 * @depends None (base utility)
 * @depType internal
 * @depReason Foundation for command pattern
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
}
