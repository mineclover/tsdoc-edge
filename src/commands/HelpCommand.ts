/**
 * HelpCommand - Display help information
 *
 * Shows all available commands with their descriptions.
 * Uses CommandRegistry to dynamically list registered commands.
 *

 * @doc [[HelpCommand]] * @packageDocumentation
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
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      const showAll = args.includes('--all') || args.includes('-a');

      console.log(`${colors.bold}TSDoc Edge CLI${colors.reset}`);
      console.log();

      // Most important command highlight
      console.log(`${colors.bold}${colors.yellow}🌟 Key Command:${colors.reset}`);
      console.log(`  ${colors.green}${colors.bold}tsdoc-edge wc <file>${colors.reset}  ${colors.dim}Shows all context needed before editing a file${colors.reset}`);
      console.log();

      // Quick start
      console.log(`${colors.bold}Quick Start:${colors.reset}`);
      console.log(`  ${colors.cyan}init${colors.reset}           Initialize project`);
      console.log(`  ${colors.cyan}build src${colors.reset}      Build symbol database ${colors.dim}(alias: b)${colors.reset}`);
      console.log(`  ${colors.cyan}wc <file>${colors.reset}      Get work context before editing`);
      console.log();

      // Core commands by category
      console.log(`${colors.bold}Core Commands:${colors.reset}`);
      console.log(`  ${colors.cyan}stats${colors.reset}          Show documentation statistics ${colors.dim}(s)${colors.reset}`);
      console.log(`  ${colors.cyan}health${colors.reset}         Check code health ${colors.dim}(h)${colors.reset}`);
      console.log(`  ${colors.cyan}symbol${colors.reset}         Symbol operations ${colors.dim}(sym)${colors.reset} - deps, who-uses, orphans`);
      console.log(`  ${colors.cyan}relationship${colors.reset}   Relationship analysis ${colors.dim}(r)${colors.reset} - impact, path, clusters`);
      console.log(`  ${colors.cyan}validate${colors.reset}       Validation commands ${colors.dim}(v)${colors.reset} - docs, connectivity`);
      console.log(`  ${colors.cyan}docs${colors.reset}           Documentation tools ${colors.dim}(d)${colors.reset} - index, backlinks, generate`);
      console.log();

      if (showAll && this.registry) {
        console.log(`${colors.bold}All Commands:${colors.reset}`);
        const commands = this.registry.getAll();
        for (const cmd of commands) {
          const name = cmd.getName();
          const aliases = cmd.getAlias();
          const aliasStr = aliases.length > 0 ? ` ${colors.dim}(${aliases.join(', ')})${colors.reset}` : '';
          console.log(`  ${colors.cyan}${name.padEnd(18)}${colors.reset}${aliasStr.padEnd(15)} ${cmd.getDescription()}`);
        }
        console.log();
      } else {
        console.log(`${colors.dim}Run 'tsdoc-edge help --all' to see all ${this.registry?.getAll().length || 0} commands${colors.reset}`);
        console.log();
      }

      console.log(`${colors.bold}Examples:${colors.reset}`);
      console.log(`  ${colors.dim}tsdoc-edge wc src/commands/BuildCommand.ts${colors.reset}`);
      console.log(`  ${colors.dim}tsdoc-edge sym deps DatabaseManager${colors.reset}`);
      console.log(`  ${colors.dim}tsdoc-edge r impact UserService${colors.reset}`);
      console.log();

      return {
        exitCode: 0,
        message: 'Help displayed',
      };
    });
  }
}
