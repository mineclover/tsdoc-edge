/**
 * Tests for SpecBumpCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SpecBumpCommand } from '../../commands/SpecBumpCommand';

describe('SpecBumpCommand', () => {
  let command: SpecBumpCommand;

  beforeEach(() => {
    command = new SpecBumpCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('spec-bump');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('documents --human in the help text', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      try {
        await command.execute(['--help']);
        expect(log.mock.calls.flat().join('\n')).toContain('--human');
      } finally {
        log.mockRestore();
      }
    });
  });

  describe('output formats', () => {
    let tempDir: string;
    let docPath: string;
    let log: jest.SpyInstance;

    const output = () => log.mock.calls.flat().join('\n');

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-bump-'));
      docPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(docPath, '---\nversion: 1.0.0\nstatus: draft\n---\n\n# Spec\n');
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('prints only the XML document by default and bumps the file', async () => {
      const result = await command.execute([docPath, 'minor']);

      expect(result.exitCode).toBe(0);
      const xml = output();
      expect(xml.startsWith('<spec-bump>')).toBe(true);
      expect(xml.endsWith('</spec-bump>')).toBe(true);
      expect(xml).toContain('<bumpType>minor</bumpType>');
      expect(xml).toContain('<oldVersion>1.0.0</oldVersion>');
      expect(xml).toContain('<newVersion>1.1.0</newVersion>');
      expect(xml).toContain('<updated>true</updated>');
      expect(xml).not.toContain('\x1b[');
      expect(fs.readFileSync(docPath, 'utf-8')).toContain('version: 1.1.0');
    });

    it('keeps the colored text output behind --human with the same side effect', async () => {
      const result = await command.execute([docPath, 'patch', '--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Version Bumped');
      expect(output()).toContain('Version updated successfully');
      expect(output()).not.toContain('<spec-bump>');
      expect(fs.readFileSync(docPath, 'utf-8')).toContain('version: 1.0.1');
    });

    it('accepts --human before the positional arguments', async () => {
      const result = await command.execute(['--human', docPath, 'major']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Version Bumped');
      expect(fs.readFileSync(docPath, 'utf-8')).toContain('version: 2.0.0');
    });

    it('rejects an invalid bump type without touching the file', async () => {
      const result = await command.execute([docPath, 'huge']);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Invalid bump type');
      expect(output()).not.toContain('<spec-bump>');
      expect(fs.readFileSync(docPath, 'utf-8')).toContain('version: 1.0.0');
    });
  });
});
