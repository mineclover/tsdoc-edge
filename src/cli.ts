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
  AnalyzeIOCommand,
  BuildCommand,
  VisualizeDepsCommand,
  CheckDuplicatesCommand,
  CheckLinksCommand,
  CommandRegistry,
  CoreApiCommand,
  DepsCommand,
  FindDocCommand,
  FindMethodCommand,
  FindUnusedDocsCommand,
  FixCommand,
  GenerateDocsCommand,
  HealthCommand,
  HelpCommand,
  IdCommand,
  IdNewCommand,
  ImproveCommand,
  IndexDocsCommand,
  InitCommand,
  InstallHookCommand,
  OrphansCommand,
  ParseCommand,
  PlansCommand,
  ScanCommand,
  SpecBumpCommand,
  SpecDiffCommand,
  SpecHistoryCommand,
  SpecStatusCommand,
  StatsCommand,
  SuggestCommand,
  SyncCoverageCommand,
  TodosCommand,
  TreeCommand,
  UndocumentedCommand,
  UninstallHookCommand,
  UntestedCommand,
  UpdateBacklinksCommand,
  UpdateSymbolRefsCommand,
  UsageCommand,
  UsedByCommand,
  ValidateCommand,
  ValidateDocsCommand,
  ValidateSpecCommand,
  WhoUsesCommand,
  WithoutContractCommand,
  WithoutResponsibilityCommand,
  type CommandResult,
} from './commands';
import { DetectCircularTypesCommand, FindRootTypesCommand, TypeChainCommand } from './commands/TypeChainCommand';
import { ParallelWorkCommand } from './commands/ParallelWorkCommand';
import { TestRelationshipsCommand } from './commands/TestRelationshipsCommand';
import { AnalyzeChainsCommand } from './commands/AnalyzeChainsCommand';
import { AnalyzeCallsCommand } from './commands/AnalyzeCallsCommand';
import { AnalyzeTestsCommand } from './commands/AnalyzeTestsCommand';
import { AnalyzeTypesCommand } from './commands/AnalyzeTypesCommand';
import { WorkContextCommand } from './commands/WorkContextCommand';
import { ExploreEntrypointCommand } from './commands/ExploreEntrypointCommand';
import { ParseMermaidCommand } from './commands/ParseMermaidCommand';
import { ValidateSymbolRefsCommand } from './commands/ValidateSymbolRefsCommand';
import { PromoteSymbolCommand } from './commands/PromoteSymbolCommand';
import { CoverageReportCommand } from './commands/CoverageReportCommand';
import { DetectDeadCodeCommand } from './commands/DetectDeadCodeCommand';
import { SymbolQueryCommand } from './commands/SymbolQueryCommand';
import { SymbolFixCommand } from './commands/SymbolFixCommand';
import { ConfigManager } from './config/ConfigManager';
import type { CommandUsageEvent } from './types/analytics';

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

  // Register commands
  registry.register(new BuildCommand());
  registry.register(new UsageCommand());
  registry.register(new AnalyzeCommand());
  registry.register(new ValidateCommand());
  registry.register(new HealthCommand());
  registry.register(new IndexDocsCommand());
  registry.register(new ParseCommand());
  registry.register(new ValidateDocsCommand());
  registry.register(new UpdateBacklinksCommand());
  registry.register(new UpdateSymbolRefsCommand());
  registry.register(new CheckLinksCommand());
  registry.register(new SuggestCommand());
  registry.register(new InitCommand());
  registry.register(new IdNewCommand());
  registry.register(new ValidateSpecCommand());
  registry.register(new GenerateDocsCommand());
  registry.register(new DepsCommand());
  registry.register(new UsedByCommand());
  registry.register(new WhoUsesCommand());
  registry.register(new OrphansCommand());
  registry.register(new UndocumentedCommand());
  registry.register(new TreeCommand());
  registry.register(new CheckDuplicatesCommand());
  registry.register(new SpecStatusCommand());
  registry.register(new FindUnusedDocsCommand());
  registry.register(new SpecHistoryCommand());
  registry.register(new SpecDiffCommand());
  registry.register(new SpecBumpCommand());
  registry.register(new FindDocCommand());
  registry.register(new PlansCommand());
  registry.register(new FindMethodCommand());
  registry.register(new TodosCommand());
  registry.register(new StatsCommand());
  registry.register(new CoreApiCommand());
  registry.register(new ScanCommand());
  registry.register(new SyncCoverageCommand());
  registry.register(new AnalyzeChainsCommand());
  registry.register(new AnalyzeCallsCommand());
  registry.register(new AnalyzeTestsCommand());
  registry.register(new AnalyzeTypesCommand());
  registry.register(new AnalyzeIOCommand());
  registry.register(new VisualizeDepsCommand());
  registry.register(new UntestedCommand());
  registry.register(new WithoutResponsibilityCommand());
  registry.register(new WithoutContractCommand());
  registry.register(new FixCommand());
  registry.register(new IdCommand());
  registry.register(new ImproveCommand());
  registry.register(new InstallHookCommand());
  registry.register(new UninstallHookCommand());
  registry.register(new TypeChainCommand());
  registry.register(new FindRootTypesCommand());
  registry.register(new DetectCircularTypesCommand());
  registry.register(new ParallelWorkCommand());
  registry.register(new TestRelationshipsCommand());
  registry.register(new WorkContextCommand());
  registry.register(new ExploreEntrypointCommand());
  registry.register(new ParseMermaidCommand());
  registry.register(new ValidateSymbolRefsCommand());
  registry.register(new PromoteSymbolCommand());
  registry.register(new CoverageReportCommand());
  registry.register(new DetectDeadCodeCommand());
  registry.register(new SymbolQueryCommand());
  registry.register(new SymbolFixCommand());
  registry.register(new HelpCommand(registry));

  // Get command
  let commandName = args[0] || 'help';
  let commandArgs = args.slice(1);

  // Handle --help and -h flags
  if (commandName === '--help' || commandName === '-h') {
    commandName = 'help';
    commandArgs = [];
  }

  // Track command execution
  const startTime = performance.now();
  let result: CommandResult;

  try {
    const command = registry.get(commandName);

    if (!command) {
      // Command not found - show error and help
      console.log(`\x1b[31m✗ Unknown command: ${commandName}\x1b[0m`);
      console.log();
      console.log('Available commands:');
      for (const cmd of registry.getAll()) {
        console.log(`  ${cmd.getName().padEnd(20)} ${cmd.getDescription()}`);
      }
      console.log();
      console.log('Use the old CLI for other commands: tsdoc-edge <command>');
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
