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
import { BuildCommand, CommandRegistry, UsageCommand, type CommandResult } from './commands';
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
 */
async function main(): Promise<void> {
  const usageTracker = new UsageTracker();
  const registry = new CommandRegistry();

  // Register commands
  registry.register(new BuildCommand());
  registry.register(new UsageCommand());

  // Get command
  const commandName = args[0] || 'help';
  const commandArgs = args.slice(1);

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
