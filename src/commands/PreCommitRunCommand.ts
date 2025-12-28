/**
 * PreCommitRunCommand - Run pre-commit checks
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, colors, type CommandResult } from './BaseCommand';
import { PreCommitChecker } from '../analyzer/PreCommitChecker';

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

      const checkAll = args.includes('--all');
      const strict = args.includes('--strict');
      let threshold: number | undefined;

      for (const arg of args) {
        if (arg.startsWith('--threshold=')) {
          threshold = Number.parseInt(arg.split('=')[1], 10);
        }
      }

      console.log(`${colors.bold}TSDoc Edge - Pre-commit Check${colors.reset}`);
      console.log();

      const checker = new PreCommitChecker();

      try {
        let report;
        if (checkAll) {
          // Get all TypeScript files in src/
          const allFiles = this.getAllTsFiles('src');
          report = checker.checkFiles(allFiles);
        } else {
          report = checker.check();
        }

        // Print results
        if (report.fileResults.length === 0) {
          console.log(`${colors.dim}No TypeScript files to check${colors.reset}`);
          return { exitCode: 0, message: 'No files to check' };
        }

        console.log(`${colors.cyan}Checked ${report.fileResults.length} file(s)${colors.reset}`);
        console.log();

        let hasFailures = false;
        let hasWarnings = false;

        for (const file of report.fileResults) {
          const status = file.passed
            ? `${colors.green}✓${colors.reset}`
            : `${colors.red}✗${colors.reset}`;

          const scoreColor = file.averageCompleteness >= 70
            ? colors.green
            : file.averageCompleteness >= 50
              ? colors.yellow
              : colors.red;

          console.log(`${status} ${file.filePath} ${scoreColor}(${file.averageCompleteness}%)${colors.reset}`);

          if (!file.passed) {
            hasFailures = true;
            for (const symbol of file.failedSymbols) {
              console.log(`  ${colors.red}✗${colors.reset} ${symbol.name}: ${symbol.completeness}%`);
            }
          } else if (file.averageCompleteness < 70) {
            hasWarnings = true;
          }
        }

        console.log();
        console.log(`${colors.bold}Summary${colors.reset}`);
        console.log(`  Files: ${report.fileResults.length}`);
        console.log(`  Passed: ${colors.green}${report.passedFiles}${colors.reset}`);
        console.log(`  Failed: ${colors.red}${report.failedFiles}${colors.reset}`);
        const avgScore = report.fileResults.length > 0
          ? Math.round(report.fileResults.reduce((sum, f) => sum + f.averageCompleteness, 0) / report.fileResults.length)
          : 0;
        console.log(`  Average: ${avgScore}%`);
        console.log();

        if (hasFailures) {
          console.log(`${colors.red}✗ Pre-commit check failed${colors.reset}`);
          console.log(`${colors.dim}Run 'tsdoc-edge fix' to auto-fix issues${colors.reset}`);
          return {
            exitCode: 1,
            message: `Pre-commit failed: ${report.failedFiles} file(s) below threshold`,
          };
        }

        if (strict && hasWarnings) {
          console.log(`${colors.yellow}! Pre-commit passed with warnings (strict mode)${colors.reset}`);
          return {
            exitCode: 1,
            message: 'Pre-commit passed with warnings (strict mode)',
          };
        }

        console.log(`${colors.green}✓ Pre-commit check passed${colors.reset}`);
        return { exitCode: 0, message: 'Pre-commit check passed' };
      } catch (error) {
        // Handle case where no staged files
        if (error instanceof Error && error.message.includes('No staged')) {
          console.log(`${colors.dim}No staged TypeScript files to check${colors.reset}`);
          return { exitCode: 0, message: 'No staged files' };
        }
        throw error;
      }
    });
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
