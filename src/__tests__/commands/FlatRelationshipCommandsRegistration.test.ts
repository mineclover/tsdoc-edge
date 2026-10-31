/**
 * Regression tests for flat relationship command registration
 *
 * @testScenario Verify that all flat relationship commands are registered in CommandRegistry
 * @testScenario Verify that command names match package.json scripts and published interfaces
 * @testScenario Verify that invoking flat commands through the CLI registry succeeds
 */

import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AnalyzeRelationshipsCommand } from '../../commands/AnalyzeRelationshipsCommand';
import { CommandRegistry } from '../../commands/CommandRegistry';
import { RelationshipCheckCommand } from '../../commands/RelationshipCheckCommand';
import { RelationshipClustersCommand } from '../../commands/RelationshipClustersCommand';
import { RelationshipExportCommand } from '../../commands/RelationshipExportCommand';
import { RelationshipHelpCommand } from '../../commands/RelationshipHelpCommand';
import { RelationshipImpactCommand } from '../../commands/RelationshipImpactCommand';
import { RelationshipMetricsCommand } from '../../commands/RelationshipMetricsCommand';
import { RelationshipPathCommand } from '../../commands/RelationshipPathCommand';
import { RelationshipQueryCommand } from '../../commands/RelationshipQueryCommand';
import { RelationshipStatsCommand } from '../../commands/RelationshipStatsCommand';
import { RelationshipValidateCommand } from '../../commands/RelationshipValidateCommand';
import { RelationshipVisualizeCommand } from '../../commands/RelationshipVisualizeCommand';

describe('Flat Relationship Commands Registration', () => {
  const commandClasses = [
    RelationshipImpactCommand,
    RelationshipMetricsCommand,
    RelationshipClustersCommand,
    RelationshipCheckCommand,
    RelationshipValidateCommand,
    RelationshipExportCommand,
    RelationshipStatsCommand,
    RelationshipQueryCommand,
    RelationshipPathCommand,
    RelationshipVisualizeCommand,
    RelationshipHelpCommand,
    AnalyzeRelationshipsCommand,
  ];

  const expectedCommandNames = [
    'relationship-impact',
    'relationship-metrics',
    'relationship-clusters',
    'relationship-check',
    'relationship-validate',
    'relationship-export',
    'relationship-stats',
    'relationship-query',
    'relationship-path',
    'relationship-visualize',
    'relationship-help',
    'analyze-relationships',
  ];

  describe('Command Metadata & Instantiation', () => {
    it.each(commandClasses)('instantiates %p with zero constructor args', (CommandClass) => {
      const instance = new CommandClass();
      expect(instance).toBeDefined();
      expect(typeof instance.getName()).toBe('string');
      expect(typeof instance.getDescription()).toBe('string');
    });

    it('declares exact expected hyphenated command names', () => {
      const names = commandClasses.map((Cmd) => new Cmd().getName());
      expect(names).toEqual(expectedCommandNames);
    });
  });

  describe('CommandRegistry Integration', () => {
    let registry: CommandRegistry;

    beforeEach(() => {
      registry = new CommandRegistry();
      for (const CommandClass of commandClasses) {
        registry.register(new CommandClass());
      }
    });

    it.each(expectedCommandNames)('resolves %s from registry', (commandName) => {
      expect(registry.has(commandName)).toBe(true);
      const command = registry.get(commandName);
      expect(command).toBeDefined();
      expect(command?.getName()).toBe(commandName);
    });

    it.each(expectedCommandNames)(
      'executes %s with --help successfully (exitCode: 0)',
      async (commandName) => {
        const command = registry.get(commandName);
        expect(command).toBeDefined();
        const result = await command!.execute(['--help']);
        expect(result.exitCode).toBe(0);
      }
    );
  });

  describe('package.json Script Target Alignment', () => {
    const packageJsonPath = path.resolve(__dirname, '../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const expectedScripts: Record<string, string> = {
      'rel:check': 'relationship-check',
      'rel:impact': 'relationship-impact',
      'rel:metrics': 'relationship-metrics',
      'rel:validate': 'relationship-validate',
      'rel:clusters': 'relationship-clusters',
      'rel:help': 'relationship-help',
    };

    it.each(Object.entries(expectedScripts))(
      'script %s targets registered flat command %s',
      (scriptName, commandName) => {
        const scriptCommand = packageJson.scripts[scriptName];
        expect(scriptCommand).toBeDefined();
        expect(scriptCommand).toContain(commandName);
        expect(expectedCommandNames).toContain(commandName);
      }
    );
  });

  describe('CLI Process Execution Regression', () => {
    const testDistCli = path.resolve(__dirname, '../../cli.js');
    const distCli = path.resolve(process.cwd(), 'dist/cli.js');
    const cliPath = fs.existsSync(testDistCli) ? testDistCli : distCli;

    const runCli = (args: string[]) => {
      return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
    };

    it.each(expectedCommandNames)(
      'invokes %s via CLI binary without Unknown Command error',
      (commandName) => {
        if (!fs.existsSync(cliPath)) {
          return; // Skip if neither dist nor .test-dist is built yet
        }
        const result = runCli([commandName, '--help']);
        expect(result.stderr).not.toContain(`Unknown command: ${commandName}`);
        expect(result.stdout).not.toContain(`Unknown command: ${commandName}`);
        expect(result.status).toBe(0);
      }
    );
  });
});
