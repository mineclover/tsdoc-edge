/**
 * Tests for OntologyCommand (router)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { OntologyCommand } from '../../commands/OntologyCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('OntologyCommand', () => {
  const originalCwd = process.cwd();
  let command: OntologyCommand;
  let log: jest.SpyInstance;

  const output = () => log.mock.calls.flat().join('\n');

  beforeEach(() => {
    command = new OntologyCommand();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
  });

  it('returns command name', () => {
    expect(command.getName()).toBe('ontology');
  });

  it('documents --human in the help text', async () => {
    const result = await command.execute(['--help']);

    expect(result.exitCode).toBe(0);
    expect(output()).toContain('--human');
  });

  it('lists the available subcommands for an unknown subcommand', async () => {
    const result = await command.execute(['bogus']);

    expect(result.exitCode).toBe(1);
    expect(output()).toContain('Unknown subcommand: bogus');
    expect(output()).toContain('Available subcommands:');
    expect(output()).toContain('stats');
    expect(output()).toContain('list');
  });

  describe('routing', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ontology-router-'));
      new DatabaseManager(path.join(tempDir, '.tsdoc.db')).close();
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('routes stats to the XML report by default', async () => {
      const result = await command.execute(['stats']);

      expect(result.exitCode).toBe(0);
      expect(output().startsWith('<ontology-statistics>')).toBe(true);
    });

    it('passes --human through to the subcommand', async () => {
      const result = await command.execute(['stats', '--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Ontology Model Statistics');
      expect(output()).not.toContain('<ontology-statistics>');
    });

    it('routes list to the XML listing', async () => {
      await command.execute(['list', '--nodes', 'class']);

      expect(output().startsWith('<ontology-node-list>')).toBe(true);
    });
  });
});
