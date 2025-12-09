/**
 * InstallHookCommand - Install Git pre-commit hook
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, colors, type CommandResult } from './BaseCommand';

/**
 * InstallHookCommand - Install Git pre-commit hook
 *
 * Creates a pre-commit hook script that runs tsdoc-edge checks
 * before allowing commits.
 *
 * @public
 */
export class InstallHookCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'install-hook';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Install Git pre-commit hook for documentation checks';
  }

  protected getUsage(): string {
    return 'tsdoc-edge install-hook';
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

      console.log(`${colors.bold}TSDoc Edge - Install Pre-commit Hook${colors.reset}`);
      console.log();

      const gitDir = path.join(process.cwd(), '.git');
      if (!fs.existsSync(gitDir)) {
        console.log(`${colors.red}✗ Not a git repository${colors.reset}`);
        console.log();
        console.log('Initialize a git repository first:');
        console.log(`  ${colors.cyan}git init${colors.reset}`);
        console.log();
        return {
          exitCode: 1,
          message: 'Not a git repository',
          error: new Error('Not a git repository'),
        };
      }

      const hooksDir = path.join(gitDir, 'hooks');
      const hookPath = path.join(hooksDir, 'pre-commit');

      // Create hooks directory if it doesn't exist
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }

      // Check if hook already exists
      if (fs.existsSync(hookPath)) {
        const existing = fs.readFileSync(hookPath, 'utf-8');
        if (existing.includes('tsdoc-edge pre-commit-run')) {
          console.log(`${colors.yellow}⚠  Pre-commit hook already installed${colors.reset}`);
          console.log();
          return { exitCode: 0, message: 'Hook already installed' };
        }

        console.log(`${colors.yellow}⚠  Pre-commit hook already exists${colors.reset}`);
        console.log();
        console.log('To preserve existing hook, add this to your pre-commit script:');
        console.log(`  ${colors.cyan}tsdoc-edge pre-commit-run${colors.reset}`);
        console.log();
        return { exitCode: 1, message: 'Hook already exists' };
      }

      // Create hook script
      const hookScript = `#!/bin/sh
# TSDoc Edge pre-commit hook
# Auto-generated - do not edit manually

npx tsdoc-edge pre-commit-run
exit $?
`;

      fs.writeFileSync(hookPath, hookScript, 'utf-8');
      fs.chmodSync(hookPath, 0o755); // Make executable

      console.log(`${colors.green}✓ Pre-commit hook installed successfully${colors.reset}`);
      console.log();
      console.log('Hook installed at:');
      console.log(`  ${colors.cyan}${hookPath}${colors.reset}`);
      console.log();
      console.log('Configure thresholds in .tsdoc.config.json:');
      console.log(`  ${colors.dim}"preCommit": {`);
      console.log(`    "enabled": true,`);
      console.log(`    "threshold": 50,`);
      console.log(`    "warningThreshold": 30`);
      console.log(`  }${colors.reset}`);
      console.log();

      return { exitCode: 0, message: 'Hook installed successfully' };
    });
  }
}
