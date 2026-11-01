/**
 * UninstallHookCommand - Remove Git pre-commit hook
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * UninstallHookCommand - Remove Git pre-commit hook
 *
 * Removes the pre-commit hook script if it was installed by tsdoc-edge.
 *
 * @doc [[UninstallHookCommand]]
 * @public
 */
export class UninstallHookCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'uninstall-hook';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Uninstall Git pre-commit hook';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge uninstall-hook [options]

  Options:
    --dry-run, -n   Preview hook removal without deleting files`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(args, ['--dry-run', '-n']);
      if (flagError) return flagError;
      const dryRun = this.hasFlag(args, ['--dry-run', '-n']);

      console.log(`${colors.bold}TSDoc Edge - Uninstall Pre-commit Hook${colors.reset}`);
      console.log();

      const gitDir = path.join(process.cwd(), '.git');
      if (!fs.existsSync(gitDir)) {
        console.log(`${colors.red}✗ Not a git repository${colors.reset}`);
        console.log();
        return { exitCode: 1, message: 'Not a git repository' };
      }

      const hookPath = path.join(gitDir, 'hooks', 'pre-commit');

      if (!fs.existsSync(hookPath)) {
        console.log(`${colors.yellow}⚠  Pre-commit hook not found${colors.reset}`);
        console.log();
        return { exitCode: 0, message: 'Hook not found' };
      }

      const existing = fs.readFileSync(hookPath, 'utf-8');
      if (!existing.includes('tsdoc-edge pre-commit-run')) {
        console.log(
          `${colors.yellow}⚠  Hook exists but was not installed by tsdoc-edge${colors.reset}`
        );
        console.log();
        console.log('Remove manually if needed:');
        console.log(`  ${colors.cyan}rm ${hookPath}${colors.reset}`);
        console.log();
        return { exitCode: 1, message: 'Hook not installed by tsdoc-edge' };
      }

      if (dryRun) {
        console.log(`${colors.cyan}Would remove pre-commit hook: ${hookPath}${colors.reset}`);
        return { exitCode: 0, message: 'Dry run complete' };
      }

      fs.unlinkSync(hookPath);

      console.log(`${colors.green}✓ Pre-commit hook uninstalled successfully${colors.reset}`);
      console.log();

      return { exitCode: 0, message: 'Hook uninstalled successfully' };
    });
  }
}
