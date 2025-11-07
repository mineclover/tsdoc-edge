/**
 * HelpCommand - Display help information
 *
 * Shows all available commands with their descriptions.
 * Uses CommandRegistry to dynamically list registered commands.
 *
 * @packageDocumentation
 */

import { BaseCommand, colors, type CommandResult } from './BaseCommand';
import type { CommandRegistry } from './CommandRegistry';

/**
 * HelpCommand - Display CLI help and available commands
 */
export class HelpCommand extends BaseCommand {
  private registry?: CommandRegistry;

  constructor(registry?: CommandRegistry) {
    super();
    this.registry = registry;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'help';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show this help message';
  }

  /**
   * execute method
   * @param _args - _args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(_args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      console.log(`${colors.bold}TSDoc Edge CLI - Help${colors.reset}`);
      console.log();
      console.log('Usage:');
      console.log('  tsdoc-edge <command> [options]');
      console.log();

      if (this.registry) {
        console.log('Available Commands:');
        console.log();

        const commands = this.registry.getAll();
        const maxNameLength = Math.max(...commands.map((c) => c.getName().length));

        for (const cmd of commands) {
          const name = cmd.getName().padEnd(maxNameLength);
          console.log(`  ${colors.cyan}${name}${colors.reset}  ${cmd.getDescription()}`);
        }
      }

      console.log();
      console.log(`${colors.bold}${colors.yellow}🌟 Most Important Command:${colors.reset}`);
      console.log(`  ${colors.green}${colors.bold}tsdoc-edge work-context <file>${colors.reset}`);
      console.log(`  ${colors.dim}  → Shows ALL context needed to work on a file (docs, types, tests, impact)${colors.reset}`);
      console.log(`  ${colors.dim}  → All analysis features exist to serve this single command${colors.reset}`);
      console.log();
      console.log('Common Workflow:');
      console.log(`  ${colors.dim}tsdoc-edge init${colors.reset}                           Initialize project configuration`);
      console.log(`  ${colors.dim}tsdoc-edge build src${colors.reset}                      Build symbol database`);
      console.log(`  ${colors.bold}${colors.green}tsdoc-edge work-context src/file.ts${colors.reset}       ${colors.yellow}← Start here before editing!${colors.reset}`);
      console.log();
      console.log('Additional Commands:');
      console.log(`  ${colors.dim}tsdoc-edge analyze src${colors.reset}                    Analyze code health`);
      console.log(`  ${colors.dim}tsdoc-edge validate${colors.reset}                       Validate documentation`);
      console.log(`  ${colors.dim}tsdoc-edge health${colors.reset}                         Check overall health`);
      console.log(`  ${colors.dim}tsdoc-edge fix src --dry-run${colors.reset}              Preview documentation fixes`);
      console.log(`  ${colors.dim}tsdoc-edge stats${colors.reset}                          Show documentation statistics`);
      console.log();
      console.log('For more information, visit: https://github.com/your-repo/tsdoc-edge');
      console.log();

      return {
        exitCode: 0,
        message: 'Help displayed',
      };
    });
  }
}
