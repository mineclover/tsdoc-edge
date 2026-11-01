#!/usr/bin/env node

/**
 * TSDoc Edge CLI
 * Streamlined 20-command CLI surface backed by the 3-Layer SSOT architecture.
 *
 * @packageDocumentation
 * @doc [[CliCommandSurfaceSpecification]]
 * @doc [[CLI Commands]]
 * @problem Original cli.ts grew to 5,728 lines and 82 flat overlapping commands
 * @solves Modular command groups with a focused 20-command top-level surface
 * @context Core workflow (`sync`, `wc`, `dc`, `convention`) + 7 unified groups
 * @functionality Dispatches top-level CLI commands, computes Levenshtein command suggestions, records usage telemetry, and flushes stdout/stderr streams before process exit
 * @sideEffect console: Writes CLI output and error diagnostics to `process.stdout` and `process.stderr`; terminates via `process.exit`
 */

import { UsageTracker } from './analytics/UsageTracker';
import { type CommandResult, registerCliCommands } from './commands';
import { ConfigManager } from './config/ConfigManager';
import type { CommandUsageEvent } from './types/analytics';

/**
 * Calculate Levenshtein distance between two strings
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance
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
 * Find similar command names with length-proportional precision filtering
 * @param input - User command token
 * @param commands - Registered command names and aliases
 * @param maxDistance - Upper edit-distance bound
 * @returns Up to 3 close command suggestions
 */
function findSimilarCommands(input: string, commands: string[], maxDistance = 3): string[] {
  const lowerInput = input.toLowerCase();
  return commands
    .map((cmd) => ({ cmd, distance: levenshteinDistance(lowerInput, cmd.toLowerCase()) }))
    .filter(({ cmd, distance }) => {
      const maxLen = Math.max(lowerInput.length, cmd.length);
      return distance <= maxDistance && distance < maxLen && distance / maxLen <= 0.45;
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ cmd }) => cmd);
}

/**
 * Flush pending stdout/stderr buffer writes before terminating so large piped `--json` outputs never truncate.
 */
async function flushOutputsAndExit(exitCode: number): Promise<never> {
  const flushStream = (stream: NodeJS.WriteStream): Promise<void> =>
    new Promise((resolve) => {
      if (stream.writableLength === 0) {
        resolve();
        return;
      }
      stream.write('', () => resolve());
    });

  await Promise.all([flushStream(process.stdout), flushStream(process.stderr)]);
  process.exit(exitCode);
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
  const registry = registerCliCommands();

  // Get command
  let commandName = args[0] || 'help';
  let commandArgs = args.slice(1);

  // Handle --help and -h flags
  if (commandName === '--help' || commandName === '-h') {
    commandName = 'help';
    commandArgs = [];
  }

  // Handle --version and -v flags
  const rawPkg: unknown = require('../package.json');
  const pkgVersion = String((rawPkg as { version?: string }).version ?? '0.0.0');
  if (commandName === '--version' || commandName === '-v' || commandName === 'version') {
    console.log(`tsdoc-edge v${pkgVersion}`);
    await flushOutputsAndExit(0);
  }

  // Track command execution
  const startTime = performance.now();
  let result: CommandResult;

  try {
    const command = registry.get(commandName);

    if (!command) {
      console.log(`\x1b[31m✗ Unknown command: ${commandName}\x1b[0m`);
      console.log();

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
      result = await command.execute(commandArgs);
    }
  } catch (error) {
    result = {
      exitCode: 1,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }

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
    version: pkgVersion,
  };

  usageTracker.recordEvent(event);
  await flushOutputsAndExit(result.exitCode);
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`\x1b[31m✗ Fatal error:\x1b[0m ${detail}`);
  void flushOutputsAndExit(1);
});
