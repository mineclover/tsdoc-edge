#!/usr/bin/env node

/**
 * TSDoc Edge CLI (Refactored)
 * Command-line interface with modular command pattern
 *
 * @problem Original cli.ts is 5,728 lines with all logic in one file
 * @solves Command pattern with separate command classes
 * @context Gradual migration from monolithic to modular architecture
 */

import { UsageTracker } from './analytics/UsageTracker';
import {
  AnalyzeCommand,
  BuildCommand,
  VisualizeDepsCommand,
  CheckDuplicatesCommand,
  CommandRegistry,
  CoreApiCommand,
  FixCommand,
  HealthCommand,
  HelpCommand,
  IdCommand,
  ImproveCommand,
  InitCommand,
  InstallHookCommand,
  ParseCommand,
  PlansCommand,
  QueryInferredCommand,
  RebuildIndexCommand,
  StatsCommand,
  SuggestCommand,
  SyncCoverageCommand,
  TodosCommand,
  TreeCommand,
  UndocumentedCommand,
  UninstallHookCommand,
  UntestedCommand,
  UsageCommand,
  ValidateUnifiedCommand,
  SymbolUnifiedCommand,
  type CommandResult,
} from './commands';
import { ParallelWorkCommand } from './commands/ParallelWorkCommand';
import { TestRelationshipsCommand } from './commands/TestRelationshipsCommand';
import { RelationshipCommand } from './commands/RelationshipCommand';
import { WorkContextCommand } from './commands/WorkContextCommand';
import { DesignContextCommand } from './commands/DesignContextCommand';
import { DocSymbolsCommand } from './commands/DocSymbolsCommand';
import { SystemStatusCommand } from './commands/SystemStatusCommand';
import { ExploreEntrypointCommand } from './commands/ExploreEntrypointCommand';
import { ParseMermaidCommand } from './commands/ParseMermaidCommand';
import { PromoteSymbolCommand } from './commands/PromoteSymbolCommand';
import { CoverageReportCommand } from './commands/CoverageReportCommand';
import { DetectDeadCodeCommand } from './commands/DetectDeadCodeCommand';
import { MoveCommand } from './commands/MoveCommand';
import { TestExamplesCommand } from './commands/TestExamplesCommand';
import { LintCommand } from './commands/LintCommand';
import { PreCommitRunCommand } from './commands/PreCommitRunCommand';
import { SpecCommand } from './commands/SpecCommand';
import { TaskCommand } from './commands/TaskCommand';
import { OntologyCommand } from './commands/OntologyCommand';
import { DocsCommand } from './commands/DocsCommand';
import { CheckLinksCommand } from './commands/CheckLinksCommand';
import { DepsCommand } from './commands/DepsCommand';
import { WhoUsesCommand } from './commands/WhoUsesCommand';
import { OrphansCommand } from './commands/OrphansCommand';
import { EndpointsCommand } from './commands/EndpointsCommand';
import { HttpEndpointsCommand } from './commands/HttpEndpointsCommand';
import { HubsCommand } from './commands/HubsCommand';
import { LayersCommand } from './commands/LayersCommand';
import { CommonCommand } from './commands/CommonCommand';
import { RoutesCommand } from './commands/RoutesCommand';
import { ConfigManager } from './config/ConfigManager';
import type { CommandUsageEvent } from './types/analytics';

/**
 * Calculate Levenshtein distance between two strings
 * @param a - a parameter
 * @param b - b parameter
 * @returns Returns number
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Find similar command names
 * @param input - input parameter
 * @param commands - commands parameter
 * @param maxDistance - maxDistance parameter
 * @returns Returns string[]
 */
function findSimilarCommands(input: string, commands: string[], maxDistance = 3): string[] {
  return commands
    .map(cmd => ({ cmd, distance: levenshteinDistance(input.toLowerCase(), cmd.toLowerCase()) }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ cmd }) => cmd);
}

// Parse command line arguments
const args = process.argv.slice(2);

// Check for config path flag
let configPath: string | undefined;
const configIndex = args.findIndex((arg) => arg.startsWith('--config='));
if (configIndex !== -1) {
  configPath = args[configIndex].split('=')[1];
  args.splice(configIndex, 1);
}

// Initialize ConfigManager with custom config path if provided
if (configPath) {
  ConfigManager.getInstance(process.cwd(), configPath);
}

/**
 * Main CLI execution function
 * @returns Returns Promise<void>
 */
async function main(): Promise<void> {
  const usageTracker = new UsageTracker();
  const registry = new CommandRegistry();

  // Register commands - Core workflow
  registry.register(new BuildCommand());
  registry.register(new WorkContextCommand());
  registry.register(new DesignContextCommand());
  registry.register(new HealthCommand());
  registry.register(new StatsCommand());
  registry.register(new InitCommand());

  // Register commands - Unified commands
  registry.register(new ValidateUnifiedCommand());
  registry.register(new SymbolUnifiedCommand());
  registry.register(new RelationshipCommand());
  registry.register(new SpecCommand());
  registry.register(new TaskCommand());
  registry.register(new OntologyCommand());
  registry.register(new DocsCommand());

  // Register commands - Analysis & tools
  registry.register(new AnalyzeCommand());
  registry.register(new SuggestCommand());
  registry.register(new FixCommand());
  registry.register(new ImproveCommand());
  registry.register(new LintCommand());

  // Register commands - Code exploration
  registry.register(new ParseCommand());
  registry.register(new TreeCommand());
  registry.register(new UndocumentedCommand());
  registry.register(new UntestedCommand());
  registry.register(new CoreApiCommand());
  registry.register(new DocSymbolsCommand());
  registry.register(new PlansCommand());
  registry.register(new TodosCommand());

  // Register commands - Specialized
  registry.register(new VisualizeDepsCommand());
  registry.register(new CheckDuplicatesCommand());
  registry.register(new ParallelWorkCommand());
  registry.register(new TestRelationshipsCommand());
  registry.register(new SystemStatusCommand());
  registry.register(new TestExamplesCommand());
  registry.register(new ExploreEntrypointCommand());
  registry.register(new ParseMermaidCommand());
  registry.register(new PromoteSymbolCommand());
  registry.register(new CoverageReportCommand());
  registry.register(new DetectDeadCodeCommand());
  registry.register(new QueryInferredCommand());
  registry.register(new MoveCommand());
  registry.register(new SyncCoverageCommand());
  registry.register(new RebuildIndexCommand());
  registry.register(new IdCommand());

  // Register commands - Utility
  registry.register(new UsageCommand());
  registry.register(new InstallHookCommand());
  registry.register(new UninstallHookCommand());

  // Standalone utility commands
  registry.register(new CheckLinksCommand());
  registry.register(new DepsCommand());
  registry.register(new WhoUsesCommand());
  registry.register(new OrphansCommand());
  registry.register(new PreCommitRunCommand());

  // Analysis commands
  registry.register(new EndpointsCommand());
  registry.register(new HttpEndpointsCommand());
  registry.register(new HubsCommand());
  registry.register(new LayersCommand());
  registry.register(new CommonCommand());
  registry.register(new RoutesCommand());

  registry.register(new HelpCommand(registry));

  // Get command
  let commandName = args[0] || 'help';
  let commandArgs = args.slice(1);

  // Handle --help and -h flags
  if (commandName === '--help' || commandName === '-h') {
    commandName = 'help';
    commandArgs = [];
  }

  // Handle --version and -v flags
  if (commandName === '--version' || commandName === '-v' || commandName === 'version') {
    const version = require('../package.json').version;
    console.log(`tsdoc-edge v${version}`);
    process.exit(0);
  }

  // Track command execution
  const startTime = performance.now();
  let result: CommandResult;

  try {
    const command = registry.get(commandName);

    if (!command) {
      // Command not found - show error with suggestions
      console.log(`\x1b[31m✗ Unknown command: ${commandName}\x1b[0m`);
      console.log();

      // Find similar commands
      const allNames = registry.getNames();
      const similar = findSimilarCommands(commandName, allNames);

      if (similar.length > 0) {
        console.log('\x1b[33mDid you mean?\x1b[0m');
        for (const name of similar) {
          const cmd = registry.get(name);
          if (cmd) {
            console.log(`  \x1b[36m${name.padEnd(20)}\x1b[0m ${cmd.getDescription()}`);
          }
        }
        console.log();
      }

      console.log('Run \x1b[36mtsdoc-edge --help\x1b[0m to see all commands');
      console.log();

      result = {
        exitCode: 1,
        message: `Unknown command: ${commandName}`,
        error: new Error(`Unknown command: ${commandName}`),
      };
    } else {
      // Execute command
      result = await command.execute(commandArgs);
    }
  } catch (error) {
    result = {
      exitCode: 1,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }

  // Record usage event
  const endTime = performance.now();
  const duration = endTime - startTime;

  const event: CommandUsageEvent = {
    command: commandName,
    args: commandArgs,
    timestamp: new Date().toISOString(),
    duration,
    success: result.exitCode === 0,
    error: result.error?.message,
    cwd: process.cwd(),
    nodeVersion: process.version,
    version: require('../package.json').version,
  };

  usageTracker.recordEvent(event);

  // Exit with appropriate code
  process.exit(result.exitCode);
}

// Run main function
main().catch((error) => {
  console.error('\x1b[31m✗ Fatal error:\x1b[0m', error);
  process.exit(1);
});
