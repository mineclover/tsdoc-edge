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
import type { CommandResult } from './commands/BaseCommand';
import { CommandRegistry } from './commands/CommandRegistry';
import { registerAllCommands } from './commands/command-loader';
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
    .map((cmd) => ({ cmd, distance: levenshteinDistance(input.toLowerCase(), cmd.toLowerCase()) }))
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

  // Commands are declared in command-loader and only loaded when first requested.
  registerAllCommands(registry);

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
