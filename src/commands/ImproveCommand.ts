/**
 * ImproveCommand - Recursive documentation quality improvement
 * @packageDocumentation
 */

import { RecursiveImprover } from '../fixer/RecursiveImprover';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * ImproveCommand - Recursive documentation quality improvement
 *
 * Recursively improves documentation until target score is reached.
 * Uses RecursiveImprover to iteratively fix documentation issues.
 *
 * @doc [[ImproveCommand]]
 * @public
 * @problem Documentation quality degrades over time as code evolves
 * @solves Automated iterative improvement until quality threshold met
 * @context Large codebases need systematic quality enforcement
 *
 * @functionality
 * - Iterative improvement: Runs fix command repeatedly until target score reached
 * - Progress tracking: Shows improvement metrics each iteration
 * - Configurable thresholds: Set target score and max iterations
 * - Dry-run mode: Preview changes before applying
 *
 * @decision Use recursive approach instead of single-pass
 * @rationale Some fixes expose new issues, iteration ensures complete improvement
 * @consequences Slower but more thorough, may require multiple analysis passes
 *
 * @depends RecursiveImprover, BaseCommand
 * @depType internal, internal
 * @depReason Core improvement engine, command framework
 */
export class ImproveCommand extends BaseCommand {
  private improver?: RecursiveImprover;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'improve';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Recursively improve documentation to target score';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge improve [options]

  Options:
    --target=N           Target quality score (default: 80)
    --max-iterations=N   Maximum iterations (default: 10)
    --dry-run            Preview changes without modifying files
    --verbose, -v        Verbose output`;
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

      let targetScore = 80;
      let maxIterations = 10;
      let dryRun = false;
      let verbose = false;

      // Parse options
      for (const arg of args) {
        if (arg.startsWith('--target=')) {
          targetScore = Number.parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--max-iterations=')) {
          maxIterations = Number.parseInt(arg.split('=')[1], 10);
        } else if (arg === '--dry-run') {
          dryRun = true;
        } else if (arg === '--verbose' || arg === '-v') {
          verbose = true;
        }
      }

      console.log(`${colors.bold}TSDoc Edge - Recursive Improvement${colors.reset}`);
      console.log();
      console.log(`${colors.cyan}Target score: ${targetScore}/100${colors.reset}`);
      console.log(`${colors.cyan}Max iterations: ${maxIterations}${colors.reset}`);
      console.log(`${colors.cyan}Dry run: ${dryRun}${colors.reset}`);
      console.log();

      const improver = this.improver || new RecursiveImprover();

      console.log(`${colors.bold}🚀 Starting Recursive Improvement...${colors.reset}`);
      console.log();

      const result = improver.improve({
        targetScore,
        maxIterations,
        dryRun,
        verbose,
        fixOptions: {
          addSummary: true,
          addParams: true,
          addReturns: true,
          addExamples: false,
          addCustomTags: true,
        },
      });

      console.log();
      console.log(`${colors.bold}📊 Results${colors.reset}`);
      console.log();
      console.log(`   Initial Score: ${colors.cyan}${result.initialScore}/100${colors.reset}`);
      console.log(`   Final Score: ${colors.green}${result.finalScore}/100${colors.reset}`);
      console.log(
        `   Improvement: ${colors.green}+${result.finalScore - result.initialScore}${colors.reset} points`
      );
      console.log(`   Iterations: ${result.iterations}`);
      console.log(`   Files Modified: ${result.filesModified}`);
      console.log(`   Symbols Fixed: ${result.symbolsFixed}`);
      console.log();

      if (result.finalScore >= targetScore) {
        console.log(`${colors.green}🎉 Target score reached!${colors.reset}`);
      } else {
        console.log(
          `${colors.yellow}⚠️  Target score not reached after ${result.iterations} iterations${colors.reset}`
        );
      }
      console.log();

      return {
        exitCode: result.finalScore >= targetScore ? 0 : 1,
        message: `Improved from ${result.initialScore} to ${result.finalScore}`,
      };
    });
  }
}
