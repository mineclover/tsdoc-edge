/**
 * Unified Task Command
 * Routes to appropriate task subcommand
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { TaskListCommand, TaskAddCommand, TaskUpdateCommand, TaskStatsCommand } from './TaskCommands';

const SUBCOMMANDS = {
  list: { command: TaskListCommand, description: 'List tasks with filters' },
  add: { command: TaskAddCommand, description: 'Add a new task' },
  update: { command: TaskUpdateCommand, description: 'Update task status/properties' },
  stats: { command: TaskStatsCommand, description: 'Show task statistics' },
} as const;

type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all task operations
 * @public
 */
export class TaskCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'task';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Unified task management (list|add|update|stats)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    const subcommandList = Object.entries(SUBCOMMANDS)
      .map(([name, { description }]) => `  ${name.padEnd(8)} ${description}`)
      .join('\n');

    return `tsdoc-edge task <subcommand> [options]

Subcommands:
${subcommandList}

Examples:
  tsdoc-edge task list --status=todo
  tsdoc-edge task add "Fix bug" --priority=high
  tsdoc-edge task update <id> --status=done
  tsdoc-edge task stats

Use 'tsdoc-edge task <subcommand> --help' for subcommand details.`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Only show unified help if no args or first arg is help flag
      if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        return this.displayHelp();
      }

      const subcommandName = args[0] as SubcommandName;
      const subcommandArgs = args.slice(1);

      if (!(subcommandName in SUBCOMMANDS)) {
        this.printError(`Unknown subcommand: ${subcommandName}`);
        console.log();
        console.log('Available subcommands:');
        for (const [name, { description }] of Object.entries(SUBCOMMANDS)) {
          console.log(`  ${this.colors.cyan}${name.padEnd(8)}${this.colors.reset} ${description}`);
        }
        console.log();
        return this.failure(`Unknown subcommand: ${subcommandName}`);
      }

      const { command: CommandClass } = SUBCOMMANDS[subcommandName];
      const subcommand = new CommandClass();
      return subcommand.execute(subcommandArgs);
    });
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      cyan: '\x1b[36m',
    };
  }
}
