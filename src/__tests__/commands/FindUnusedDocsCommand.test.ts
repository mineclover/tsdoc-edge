/**
 * Tests for FindUnusedDocsCommand
 */

import { FindUnusedDocsCommand } from '../../commands/FindUnusedDocsCommand';
import type { UnusedDocumentDetector } from '../../spec/UnusedDocumentDetector';

describe('FindUnusedDocsCommand', () => {
  let command: FindUnusedDocsCommand;

  beforeEach(() => {
    command = new FindUnusedDocsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('find-unused-docs');
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
  });

  describe('output format', () => {
    let consoleSpy: jest.SpyInstance;
    const output = () => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const detector = {
        detect: jest.fn().mockReturnValue([
          {
            filePath: 'managed/old.md',
            reason: 'stale-draft',
            lastModified: '2025-01-01T00:00:00.000Z',
            daysSinceModified: 120,
            referenceCount: 0,
            codeConnectionCount: 0,
            suggestedAction: 'delete',
          },
        ]),
        getSummary: jest.fn().mockReturnValue({
          total: 1,
          byReason: { 'stale-draft': 1 },
          byAction: { delete: 1 },
          averageDaysSinceModified: 120,
        }),
      } as unknown as UnusedDocumentDetector;
      command = new FindUnusedDocsCommand(detector);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('prints an XML document by default', async () => {
      const result = await command.execute(['.']);

      expect(result.exitCode).toBe(0);
      expect(output().startsWith('<unused-documents>')).toBe(true);
      expect(output()).toContain('<totalFound>1</totalFound>');
      expect(output()).toContain('<averageDaysSinceModified>120</averageDaysSinceModified>');
      expect(output()).toContain('<reason>stale-draft</reason>');
      expect(output()).toContain('<action>delete</action>');
      expect(output()).toContain('<filePath>managed/old.md</filePath>');
      expect(output()).toContain('<daysSinceModified>120</daysSinceModified>');
      expect(output()).not.toContain('\x1b[');
    });

    it('does not mistake --human for the directory argument', async () => {
      const result = await command.execute(['--human', '.']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Finding Unused Documents');
      expect(output()).toContain('Total unused/stale documents');
      expect(output()).toContain('Suggested: Delete');
      expect(output()).toContain('managed/old.md');
      expect(output()).toContain('\x1b[');
      expect(output()).not.toContain('<unused-documents>');
    });

    it('fails on a missing directory in both formats', async () => {
      const xml = await command.execute(['no-such-dir-for-tsdoc-edge']);
      const human = await command.execute(['--human', 'no-such-dir-for-tsdoc-edge']);

      expect(xml.exitCode).toBe(1);
      expect(human.exitCode).toBe(1);
      expect(output()).not.toContain('<unused-documents>');
    });
  });
});
