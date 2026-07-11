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
 * Subcommand definition for unified commands
 */
interface SubcommandInfo {
  name: string;
  description: string;
}

/**
 * Unified command group definition
 */
interface UnifiedCommandGroup {
  name: string;
  alias: string;
  description: string;
  subcommands: SubcommandInfo[];
}

/**
 * HelpCommand - Display CLI help and available commands
 */
export class HelpCommand extends BaseCommand {
  private registry?: CommandRegistry;

  /**
   * Unified command groups with their subcommands
   */
  private readonly unifiedCommands: UnifiedCommandGroup[] = [
    {
      name: 'symbol',
      alias: 'sym',
      description: 'Symbol operations',
      subcommands: [
        { name: 'query', description: 'Query symbol information' },
        { name: 'deps', description: 'Show dependencies (what this uses)' },
        { name: 'who-uses', description: 'Show reverse dependencies (what uses this)' },
        { name: 'orphans', description: 'Find symbols without dependents' },
        { name: 'search', description: 'Search symbols by pattern' },
      ],
    },
    {
      name: 'relationship',
      alias: 'r',
      description: 'Relationship analysis',
      subcommands: [
        { name: 'query', description: 'Query relationships' },
        { name: 'impact', description: 'Analyze change impact' },
        { name: 'path', description: 'Find dependency path between symbols' },
        { name: 'clusters', description: 'Find architectural modules' },
        { name: 'export', description: 'Export relationship graph' },
      ],
    },
    {
      name: 'validate',
      alias: 'v',
      description: 'Validation commands',
      subcommands: [
        { name: 'docs', description: 'Validate documentation files' },
        { name: 'connectivity', description: 'Check symbol connectivity' },
        { name: 'refs', description: 'Validate symbol references' },
        { name: 'spec', description: 'Validate specification files' },
      ],
    },
    {
      name: 'docs',
      alias: 'd',
      description: 'Documentation tools',
      subcommands: [
        { name: 'index', description: 'Index documentation files' },
        { name: 'backlinks', description: 'Update backlinks' },
        { name: 'generate', description: 'Generate documentation' },
        { name: 'unused', description: 'Find unused documentation' },
      ],
    },
    {
      name: 'spec',
      alias: 'sp',
      description: 'Specification management',
      subcommands: [
        { name: 'status', description: 'Show spec status' },
        { name: 'validate', description: 'Validate specifications' },
        { name: 'list', description: 'List all specifications' },
      ],
    },
    {
      name: 'convention',
      alias: 'conv',
      description: 'Revision-pinned spec-binding conventions',
      subcommands: [{ name: 'check', description: 'Check a convention pack on the saved graph' }],
    },
    {
      name: 'ontology',
      alias: 'ont',
      description: 'Ontology management',
      subcommands: [
        { name: 'status', description: 'Show ontology status' },
        { name: 'validate', description: 'Validate ontology' },
      ],
    },
  ];

  /**
   * Legacy commands that are still supported but have unified alternatives
   */
  private readonly legacyCommands = [
    'validate-docs',
    'index-docs',
    'update-backlinks',
    'find-unused-docs',
  ];

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
      const showAll = this.hasFlag(args, ['--all', '-a']);
      const showTree = this.hasFlag(args, ['--tree', '-t']);
      const specificCommand = args.find((arg) => !arg.startsWith('-'));

      // Show help for specific unified command
      if (specificCommand) {
        const group = this.unifiedCommands.find(
          (g) => g.name === specificCommand || g.alias === specificCommand
        );
        if (group) {
          this.printUnifiedCommandHelp(group);
          return this.success('Help displayed');
        }
      }

      console.log(`${colors.bold}TSDoc Edge CLI${colors.reset}`);
      console.log();

      // Most important command highlight
      console.log(`${colors.bold}${colors.yellow}★ Key Command:${colors.reset}`);
      console.log(
        `  ${colors.green}${colors.bold}tsdoc-edge wc <file>${colors.reset}  ${colors.dim}Shows all context needed before editing a file${colors.reset}`
      );
      console.log();

      // Quick start
      console.log(`${colors.bold}Quick Start:${colors.reset}`);
      console.log(`  ${colors.cyan}init${colors.reset}           Initialize project`);
      console.log(
        `  ${colors.cyan}build src${colors.reset}      Build symbol database ${colors.dim}(alias: b)${colors.reset}`
      );
      console.log(`  ${colors.cyan}wc <file>${colors.reset}      Get work context before editing`);
      console.log();

      // Core standalone commands
      console.log(`${colors.bold}Core Commands:${colors.reset}`);
      console.log(
        `  ${colors.cyan}stats${colors.reset}          Show documentation statistics ${colors.dim}(s)${colors.reset}`
      );
      console.log(
        `  ${colors.cyan}health${colors.reset}         Check code health ${colors.dim}(h)${colors.reset}`
      );
      console.log(`  ${colors.cyan}lint${colors.reset}           Lint source code`);
      console.log(
        `  ${colors.cyan}convention check${colors.reset} Check a versioned convention pack`
      );
      console.log();

      // Unified commands with subcommand tree
      console.log(
        `${colors.bold}Command Groups:${colors.reset} ${colors.dim}(run 'help <group>' for details)${colors.reset}`
      );
      console.log();

      for (const group of this.unifiedCommands) {
        const aliasStr = `${colors.dim}(${group.alias})${colors.reset}`;
        console.log(`  ${colors.cyan}${group.name}${colors.reset} ${aliasStr}`);
        console.log(`  ${colors.dim}${group.description}${colors.reset}`);

        if (showTree) {
          // Show all subcommands in tree format
          for (let i = 0; i < group.subcommands.length; i++) {
            const sub = group.subcommands[i];
            const isLast = i === group.subcommands.length - 1;
            const prefix = isLast ? '└─' : '├─';
            console.log(
              `  ${colors.dim}${prefix}${colors.reset} ${sub.name.padEnd(12)} ${colors.dim}${sub.description}${colors.reset}`
            );
          }
        } else {
          // Show top 3 subcommands inline
          const topSubs = group.subcommands
            .slice(0, 3)
            .map((s) => s.name)
            .join(', ');
          const moreCount = group.subcommands.length - 3;
          const moreStr = moreCount > 0 ? `, +${moreCount} more` : '';
          console.log(`  ${colors.dim}└─ ${topSubs}${moreStr}${colors.reset}`);
        }
        console.log();
      }

      if (showAll && this.registry) {
        this.printAllCommands();
      } else {
        const totalCount = this.registry?.getAll().length || 0;
        console.log(`${colors.dim}Options:${colors.reset}`);
        console.log(
          `  ${colors.dim}help --tree${colors.reset}    Show all subcommands in tree format`
        );
        console.log(`  ${colors.dim}help --all${colors.reset}     Show all ${totalCount} commands`);
        console.log(
          `  ${colors.dim}help <group>${colors.reset}   Show details for a command group`
        );
        console.log();
      }

      console.log(`${colors.bold}Examples:${colors.reset}`);
      console.log(`  ${colors.dim}tsdoc-edge wc src/commands/BuildCommand.ts${colors.reset}`);
      console.log(`  ${colors.dim}tsdoc-edge symbol deps DatabaseManager${colors.reset}`);
      console.log(`  ${colors.dim}tsdoc-edge relationship impact UserService${colors.reset}`);
      console.log(
        `  ${colors.dim}tsdoc-edge convention check --pack managed/conventions/core.json${colors.reset}`
      );
      console.log();

      // New user guidance
      console.log(`${colors.bold}New to TSDoc Edge?${colors.reset}`);
      console.log(
        `  1. ${colors.cyan}tsdoc-edge init${colors.reset}        Initialize your project`
      );
      console.log(`  2. ${colors.cyan}tsdoc-edge build src${colors.reset}   Build symbol database`);
      console.log(
        `  3. ${colors.cyan}tsdoc-edge wc <file>${colors.reset}   Get context before editing`
      );
      console.log();
      console.log(
        `  ${colors.dim}Guides: managed/quick-start.md, managed/guides/usage-scenarios.md${colors.reset}`
      );
      console.log();

      return this.success('Help displayed');
    });
  }

  /**
   * Print help for a specific unified command group
   */
  private printUnifiedCommandHelp(group: UnifiedCommandGroup): void {
    console.log(
      `${colors.bold}${group.name}${colors.reset} ${colors.dim}(alias: ${group.alias})${colors.reset}`
    );
    console.log(`${colors.dim}${group.description}${colors.reset}`);
    console.log();

    console.log(`${colors.bold}Usage:${colors.reset}`);
    console.log(`  tsdoc-edge ${group.name} <subcommand> [options]`);
    console.log(`  tsdoc-edge ${group.alias} <subcommand> [options]`);
    console.log();

    console.log(`${colors.bold}Subcommands:${colors.reset}`);
    for (const sub of group.subcommands) {
      console.log(`  ${colors.cyan}${sub.name.padEnd(14)}${colors.reset} ${sub.description}`);
    }
    console.log();

    console.log(`${colors.bold}Examples:${colors.reset}`);
    if (group.subcommands.length > 0) {
      const firstSub = group.subcommands[0];
      console.log(`  ${colors.dim}tsdoc-edge ${group.name} ${firstSub.name}${colors.reset}`);
      console.log(`  ${colors.dim}tsdoc-edge ${group.alias} ${firstSub.name}${colors.reset}`);
    }
    console.log();

    console.log(
      `${colors.dim}Run 'tsdoc-edge ${group.name} <subcommand> --help' for subcommand details${colors.reset}`
    );
    console.log();
  }

  /**
   * Print all registered commands grouped by category
   */
  private printAllCommands(): void {
    if (!this.registry) return;

    console.log(`${colors.bold}All Commands:${colors.reset}`);
    console.log();

    const commands = this.registry.getAll();
    const unifiedNames = this.unifiedCommands.map((g) => g.name);

    // Categorize commands
    const standalone: typeof commands = [];
    const unified: typeof commands = [];
    const legacy: typeof commands = [];

    for (const cmd of commands) {
      const name = cmd.getName();
      if (unifiedNames.includes(name)) {
        unified.push(cmd);
      } else if (this.legacyCommands.includes(name)) {
        legacy.push(cmd);
      } else {
        standalone.push(cmd);
      }
    }

    // Print unified commands
    if (unified.length > 0) {
      console.log(`${colors.dim}─ Command Groups ─${colors.reset}`);
      for (const cmd of unified) {
        this.printCommandLine(cmd);
      }
      console.log();
    }

    // Print standalone commands
    if (standalone.length > 0) {
      console.log(`${colors.dim}─ Standalone Commands ─${colors.reset}`);
      for (const cmd of standalone) {
        this.printCommandLine(cmd);
      }
      console.log();
    }

    // Print legacy commands with deprecation hint
    if (legacy.length > 0) {
      console.log(`${colors.dim}─ Legacy Commands (prefer unified alternatives) ─${colors.reset}`);
      for (const cmd of legacy) {
        const name = cmd.getName();
        const aliases = cmd.getAlias();
        const aliasStr =
          aliases.length > 0 ? ` ${colors.dim}(${aliases.join(', ')})${colors.reset}` : '';
        console.log(
          `  ${colors.yellow}${name.padEnd(18)}${colors.reset}${aliasStr.padEnd(15)} ${cmd.getDescription()}`
        );
      }
      console.log();
    }
  }

  /**
   * Print a single command line
   */
  private printCommandLine(cmd: {
    getName(): string;
    getAlias(): string[];
    getDescription(): string;
  }): void {
    const name = cmd.getName();
    const aliases = cmd.getAlias();
    const aliasStr =
      aliases.length > 0 ? ` ${colors.dim}(${aliases.join(', ')})${colors.reset}` : '';
    console.log(
      `  ${colors.cyan}${name.padEnd(18)}${colors.reset}${aliasStr.padEnd(15)} ${cmd.getDescription()}`
    );
  }
}
