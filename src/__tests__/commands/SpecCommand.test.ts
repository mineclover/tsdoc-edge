/**
 * Tests for SpecCommand (router)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SpecCommand } from '../../commands/SpecCommand';

describe('SpecCommand', () => {
  let command: SpecCommand;
  let log: jest.SpyInstance;

  const output = () => log.mock.calls.flat().join('\n');

  beforeEach(() => {
    command = new SpecCommand();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns command name', () => {
    expect(command.getName()).toBe('spec');
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
    expect(output()).toContain('bump');
  });

  describe('routing', () => {
    let tempDir: string;
    let docPath: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-router-'));
      docPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(docPath, '---\nversion: 1.0.0\nstatus: draft\n---\n# Spec\n');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('routes to the subcommand and prints its XML document by default', async () => {
      const result = await command.execute(['bump', docPath, 'minor']);

      expect(result.exitCode).toBe(0);
      expect(output().startsWith('<spec-bump>')).toBe(true);
      expect(output()).toContain('<newVersion>1.1.0</newVersion>');
    });

    it('passes --human through to the subcommand', async () => {
      const result = await command.execute(['bump', docPath, 'minor', '--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Version Bumped');
      expect(output()).not.toContain('<spec-bump>');
    });

    it('routes status stats to the XML report', async () => {
      await command.execute(['status', 'stats', tempDir]);

      expect(output().startsWith('<spec-status-stats>')).toBe(true);
      expect(output()).toContain('<total>1</total>');
    });
  });
});
