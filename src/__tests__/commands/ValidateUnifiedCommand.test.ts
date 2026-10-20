/**
 * Tests for ValidateUnifiedCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ValidateUnifiedCommand } from '../../commands/ValidateUnifiedCommand';

describe('ValidateUnifiedCommand', () => {
  let command: ValidateUnifiedCommand;

  beforeEach(() => {
    command = new ValidateUnifiedCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('val');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    let log: jest.SpyInstance;

    const output = () => log.mock.calls.flat().join('\n');

    beforeEach(() => {
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('documents --human in the help text', async () => {
      await command.execute(['--help']);

      expect(output()).toContain('--human');
    });

    it('lists the available subcommands for an unknown subcommand', async () => {
      const result = await command.execute(['bogus']);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Unknown subcommand: bogus');
      expect(output()).toContain('Available subcommands:');
      expect(output()).toContain('connectivity');
    });

    describe('spec subcommand', () => {
      let tempDir: string;

      beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'val-spec-'));
        fs.writeFileSync(path.join(tempDir, 'a.md'), '# A\n');
      });

      afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
      });

      it('runs the subcommand and prints its XML document by default', async () => {
        await command.execute(['spec', tempDir]);

        expect(output().startsWith('<spec-validation>')).toBe(true);
        expect(output()).not.toContain('\x1b[');
      });

      it('passes --human through to the subcommand', async () => {
        await command.execute(['spec', tempDir, '--human']);

        expect(output()).toContain('Validating Specification Completeness');
        expect(output()).not.toContain('<spec-validation>');
      });
    });
  });
});
