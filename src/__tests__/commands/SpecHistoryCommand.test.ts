/**
 * Tests for SpecHistoryCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SpecHistoryCommand } from '../../commands/SpecHistoryCommand';
import type { SpecVersionManager, VersionHistoryEntry } from '../../spec/SpecVersionManager';

describe('SpecHistoryCommand', () => {
  let command: SpecHistoryCommand;

  beforeEach(() => {
    command = new SpecHistoryCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('spec-history');
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
    const entries: VersionHistoryEntry[] = [
      {
        version: '1.1.0',
        date: '2026-01-02',
        commit: 'abc12345',
        message: 'Add <b>',
        author: 'Ann',
      },
      {
        version: '1.0.0',
        date: '2026-01-01',
        commit: 'def67890',
        message: 'Initial',
        author: 'Bob',
      },
    ];

    let tempDir: string;
    let docPath: string;
    let getHistory: jest.Mock;
    let log: jest.SpyInstance;

    const output = () => log.mock.calls.flat().join('\n');

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-history-'));
      docPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(docPath, '---\nversion: 1.1.0\n---\n# Spec\n');
      getHistory = jest.fn().mockReturnValue(entries);
      command = new SpecHistoryCommand({ getHistory } as unknown as SpecVersionManager);
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('prints only the XML document by default', async () => {
      const result = await command.execute([docPath]);

      expect(result.exitCode).toBe(0);
      const xml = output();
      expect(xml.startsWith('<spec-history>')).toBe(true);
      expect(xml.endsWith('</spec-history>')).toBe(true);
      expect(xml).toContain('<versionCount>2</versionCount>');
      expect(xml).toContain('<versions count="2">');
      expect(xml).toContain('<version>1.1.0</version>');
      expect(xml).toContain('<commit>abc12345</commit>');
      expect(xml).toContain('<message>Add &lt;b&gt;</message>');
      expect(xml).not.toContain('\x1b[');
    });

    it('emits an empty document when there is no history', async () => {
      getHistory.mockReturnValue([]);

      const result = await command.execute([docPath]);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('<versionCount>0</versionCount>');
      expect(output()).toContain('<versions count="0">');
      expect(output()).not.toContain('No version history found');
    });

    it('keeps the colored text output behind --human', async () => {
      const result = await command.execute(['--human', docPath]);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Specification Version History');
      expect(output()).toContain('2 versions found');
      expect(output()).toContain('Commit:  abc12345');
      expect(output()).not.toContain('<spec-history>');
    });

    it('keeps the empty-history message behind --human', async () => {
      getHistory.mockReturnValue([]);

      await command.execute([docPath, '--human']);

      expect(output()).toContain('No version history found');
      expect(output()).not.toContain('<spec-history>');
    });
  });
});
