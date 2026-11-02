/**
 * FixCommand - Automatically fix documentation issues
 *
 * @packageDocumentation
 * @doc [[FixCommand]]
 * @context Automated TSDoc repair subcommand invoked via `tsdoc-edge docs fix`
 * @functionality Analyzes TypeScript files with `CodeHealthChecker` and inserts missing TSDoc summary, `@param`, and `@returns` stubs (with `--dry-run` preview support)
 * @sideEffect console: Writes detected TSDoc issues and fix counts to stdout
 * @sideEffect filesystem: Reads TypeScript source files and writes inserted TSDoc comments unless `--dry-run` is active
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * FixCommand - Automatically fix documentation issues
 *
 * Analyzes code and automatically fixes documentation problems:
 * - Adds missing summaries
 * - Adds `@param` tags
 * - Adds `@returns` tags
 * - Adds custom tags
 *
 * Supports dry-run mode for preview without modifications.
 *
 * @doc [[FixCommand]]
 * @sideEffect filesystem: Reads and updates TypeScript TSDoc comments on disk; writes CLI progress to stdout
 * @public
 */
export class FixCommand extends BaseCommand {
  private checker?: CodeHealthChecker;

  constructor(checker?: CodeHealthChecker) {
    super();
    this.checker = checker;
  }

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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge docs fix [directory] [options]

  Default: src
  Options:
    --dry-run, -n     Preview changes without modifying files
    --min-score <n>   Minimum quality score threshold (default: 70)`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns `Promise<CommandResult>`
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(args, ['--dry-run', '-n'], ['--min-score']);
      if (flagError) {
        return flagError;
      }

      const positionalArgs = this.getPositionalArgs(args, ['--min-score']);
      const targetPath = positionalArgs[0] || 'src';
      const dryRun = this.hasFlag(args, '--dry-run') || this.hasFlag(args, '-n');
      const rawMinScore = this.getOption(args, '--min-score');
      let minScore = 70;
      if (rawMinScore !== undefined) {
        const parsedScore = Number.parseInt(rawMinScore, 10);
        if (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
          return this.failure(`Invalid --min-score value: ${rawMinScore}`, 1);
        }
        minScore = parsedScore;
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
      const { DocumentationFixer } = await import('../fixer/DocumentationFixer.js');
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
