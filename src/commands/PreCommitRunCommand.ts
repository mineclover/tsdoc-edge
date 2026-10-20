/**
 * PreCommitRunCommand - Run pre-commit checks
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PreCommitChecker, type PreCommitReport } from '../analyzer/PreCommitChecker';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * PreCommitRunCommand - Execute pre-commit documentation checks
 *
 * Called by git pre-commit hook to validate staged files.
 * Uses PreCommitChecker to analyze documentation quality.
 *
 * @doc [[PreCommitRunCommand]]
 * @public
 */
export class PreCommitRunCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'pre-commit-run';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Run pre-commit documentation checks on staged files';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge pre-commit-run [options]

  Options:
    --human        Output in human-readable format (default: XML)
    --all          Check all files, not just staged
    --strict       Fail on warnings too
    --threshold=N  Override quality threshold (default: from config)`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const isHuman = this.hasFlag(args, '--human');
      const checkAll = args.includes('--all');
      const strict = args.includes('--strict');
      let _threshold: number | undefined;

      for (const arg of args) {
        if (arg.startsWith('--threshold=')) {
          _threshold = Number.parseInt(arg.split('=')[1], 10);
        }
      }

      if (isHuman) {
        console.log(`${colors.bold}TSDoc Edge - Pre-commit Check${colors.reset}`);
        console.log();
      }

      const checker = new PreCommitChecker();

      try {
        let report: PreCommitReport;
        if (checkAll) {
          // Get all TypeScript files in src/
          const allFiles = this.getAllTsFiles('src');
          report = checker.checkFiles(allFiles);
        } else {
          report = checker.check();
        }

        // Print results
        if (report.fileResults.length === 0) {
          const result = { exitCode: 0, message: 'No files to check' };
          if (isHuman) {
            console.log(`${colors.dim}No TypeScript files to check${colors.reset}`);
          } else {
            this.printXmlReport(report, strict, result, args);
          }
          return result;
        }

        // The exit code depends only on the report, never on the output mode
        const hasFailures = report.fileResults.some((file) => !file.passed);
        const hasWarnings = report.fileResults.some(
          (file) => file.passed && file.averageCompleteness < 70
        );

        let result: CommandResult;
        if (hasFailures) {
          result = {
            exitCode: 1,
            message: `Pre-commit failed: ${report.failedFiles} file(s) below threshold`,
          };
        } else if (strict && hasWarnings) {
          result = {
            exitCode: 1,
            message: 'Pre-commit passed with warnings (strict mode)',
          };
        } else {
          result = { exitCode: 0, message: 'Pre-commit check passed' };
        }

        if (!isHuman) {
          this.printXmlReport(report, strict, result, args);
          return result;
        }

        console.log(`${colors.cyan}Checked ${report.fileResults.length} file(s)${colors.reset}`);
        console.log();

        for (const file of report.fileResults) {
          const status = file.passed
            ? `${colors.green}✓${colors.reset}`
            : `${colors.red}✗${colors.reset}`;

          const scoreColor =
            file.averageCompleteness >= 70
              ? colors.green
              : file.averageCompleteness >= 50
                ? colors.yellow
                : colors.red;

          console.log(
            `${status} ${file.filePath} ${scoreColor}(${file.averageCompleteness}%)${colors.reset}`
          );

          if (!file.passed) {
            for (const symbol of file.failedSymbols) {
              console.log(
                `  ${colors.red}✗${colors.reset} ${symbol.name}: ${symbol.completeness}%`
              );
            }
          }
        }

        console.log();
        console.log(`${colors.bold}Summary${colors.reset}`);
        console.log(`  Files: ${report.fileResults.length}`);
        console.log(`  Passed: ${colors.green}${report.passedFiles}${colors.reset}`);
        console.log(`  Failed: ${colors.red}${report.failedFiles}${colors.reset}`);
        console.log(`  Average: ${this.averageScore(report)}%`);
        console.log();

        if (hasFailures) {
          console.log(`${colors.red}✗ Pre-commit check failed${colors.reset}`);
          console.log(`${colors.dim}Run 'tsdoc-edge fix' to auto-fix issues${colors.reset}`);
        } else if (strict && hasWarnings) {
          console.log(
            `${colors.yellow}! Pre-commit passed with warnings (strict mode)${colors.reset}`
          );
        } else {
          console.log(`${colors.green}✓ Pre-commit check passed${colors.reset}`);
        }
        return result;
      } catch (error) {
        // Handle case where no staged files
        if (error instanceof Error && error.message.includes('No staged')) {
          const result = { exitCode: 0, message: 'No staged files' };
          if (isHuman) {
            console.log(`${colors.dim}No staged TypeScript files to check${colors.reset}`);
          } else {
            this.printXmlReport(null, strict, result, args);
          }
          return result;
        }
        throw error;
      }
    });
  }

  /** Average completeness over all checked files, rounded to a whole percent */
  private averageScore(report: PreCommitReport): number {
    return report.fileResults.length > 0
      ? Math.round(
          report.fileResults.reduce((sum, f) => sum + f.averageCompleteness, 0) /
            report.fileResults.length
        )
      : 0;
  }

  /**
   * Print the pre-commit report as an XML document (default output)
   *
   * @param report - Checker report, or null when there are no staged files
   * @param strict - Whether strict mode (fail on warnings) is active
   * @param result - Result the command is about to return (exit code and message)
   * @param args - Command arguments
   */
  private printXmlReport(
    report: PreCommitReport | null,
    strict: boolean,
    result: CommandResult,
    args: string[]
  ): void {
    const fileResults = report?.fileResults ?? [];

    this.printOutput(
      'pre-commit-results',
      {
        summary: {
          totalFiles: fileResults.length,
          passedFiles: report?.passedFiles ?? 0,
          failedFiles: report?.failedFiles ?? 0,
          averageScore: report ? this.averageScore(report) : 0,
          strict,
          status: result.exitCode === 0 ? 'passed' : 'failed',
          exitCode: result.exitCode,
          message: result.message ?? '',
        },
        files: fileResults.map((file) => ({
          path: file.filePath,
          passed: file.passed,
          score: file.averageCompleteness,
          failedSymbols: file.failedSymbols.map((symbol) => ({
            name: symbol.name,
            completeness: symbol.completeness,
            line: symbol.line,
          })),
        })),
      },
      args
    );
  }

  private getAllTsFiles(dir: string): string[] {
    const files: string[] = [];

    const walk = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip test directories and node_modules
          if (entry.name !== '__tests__' && entry.name !== 'node_modules') {
            walk(fullPath);
          }
        } else if (
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.d.ts') &&
          !entry.name.endsWith('.test.ts')
        ) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }
}
