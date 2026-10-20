/**
 * FixCommand - Automatically fix documentation issues
 * @packageDocumentation
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
 * - Adds @param tags
 * - Adds @returns tags
 * - Adds custom tags
 *
 * Supports dry-run mode for preview without modifications.
 *
 * @doc [[FixCommand]]
 * @public
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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge fix [directory] [options]

  Default: src
  Options:
    --human           Output in human-readable format (default: XML)
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

      const isHuman = this.hasFlag(args, '--human');
      // Option flags may come first, so the default is only replaced by a positional path below
      let targetPath = 'src';
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

      if (isHuman) {
        console.log(`${colors.bold}TSDoc Edge - Fix Documentation${colors.reset}`);
        console.log();
      }

      if (!fs.existsSync(targetPath)) {
        console.log(`${colors.red}❌ Path not found: ${targetPath}${colors.reset}`);
        return {
          exitCode: 1,
          message: `Path not found: ${targetPath}`,
          error: new Error(`Path not found: ${targetPath}`),
        };
      }

      if (isHuman) {
        console.log(`${colors.cyan}Fixing: ${targetPath}${colors.reset}`);
        console.log(`${colors.cyan}Min score: ${minScore}${colors.reset}`);
        console.log(`${colors.cyan}Dry run: ${dryRun}${colors.reset}`);
        console.log();

        // Analyze first
        console.log(`${colors.bold}📊 Analyzing...${colors.reset}`);
        console.log();
      }
      const checker = this.checker || new CodeHealthChecker();

      const report = checker.analyze({
        path: targetPath,
        includeChildren: true,
        includePrivate: false,
        minQualityScore: minScore,
        generateSuggestions: false,
      });

      const needsFixing = report.docScores.filter((s) => s.qualityScore < minScore && s.isPublic);
      if (isHuman) {
        console.log(`   Found ${report.docScores.length} symbols`);
        console.log(`   ${needsFixing.length} need fixing (quality < ${minScore})`);
        console.log();
      }

      if (needsFixing.length === 0) {
        if (isHuman) {
          console.log(`${colors.green}✓ All documentation meets quality standards!${colors.reset}`);
        } else {
          this.printOutput(
            'doc-fix',
            {
              summary: {
                targetPath,
                minScore,
                dryRun,
                symbolsAnalyzed: report.docScores.length,
                symbolsNeedingFix: 0,
                fileCount: 0,
                symbolsFixed: 0,
              },
              files: [],
            },
            args
          );
        }
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

      if (isHuman) {
        console.log(`${colors.bold}🔧 Fixing Files...${colors.reset}`);
        console.log();
      }

      // Import DocumentationFixer dynamically
      const { DocumentationFixer } = await import('../fixer/DocumentationFixer.js');
      const fixer = new DocumentationFixer();

      let totalFixed = 0;
      const fileResults: Array<Record<string, unknown>> = [];
      for (const [filePath, scores] of byFile.entries()) {
        if (isHuman) {
          console.log(`   ${path.basename(filePath)} (${scores.length} symbols)...`);
        }

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
          if (isHuman) {
            console.log(`      ${colors.red}✗ Error: ${result.error}${colors.reset}`);
          }
          fileResults.push({
            path: filePath,
            symbolCount: scores.length,
            status: 'error',
            symbolsFixed: 0,
            error: result.error,
          });
        } else if (result.modified) {
          if (isHuman) {
            console.log(
              `      ${colors.green}✓ Fixed ${result.symbolsFixed} symbols${colors.reset}`
            );
          }
          totalFixed += result.symbolsFixed;
          fileResults.push({
            path: filePath,
            symbolCount: scores.length,
            status: 'modified',
            symbolsFixed: result.symbolsFixed,
          });
        } else {
          if (isHuman) {
            console.log(`      ${colors.yellow}- No changes needed${colors.reset}`);
          }
          fileResults.push({
            path: filePath,
            symbolCount: scores.length,
            status: 'unchanged',
            symbolsFixed: 0,
          });
        }
      }

      if (isHuman) {
        console.log();
        if (dryRun) {
          console.log(`${colors.cyan}Dry run complete. No files were modified.${colors.reset}`);
        } else {
          console.log(
            `${colors.green}✓ Fixed ${totalFixed} symbols in ${byFile.size} files${colors.reset}`
          );
        }
        console.log();
      } else {
        this.printOutput(
          'doc-fix',
          {
            summary: {
              targetPath,
              minScore,
              dryRun,
              symbolsAnalyzed: report.docScores.length,
              symbolsNeedingFix: needsFixing.length,
              fileCount: byFile.size,
              symbolsFixed: totalFixed,
            },
            files: fileResults,
          },
          args
        );
      }

      return {
        exitCode: 0,
        message: `Fixed ${totalFixed} symbols in ${byFile.size} files`,
      };
    });
  }
}
