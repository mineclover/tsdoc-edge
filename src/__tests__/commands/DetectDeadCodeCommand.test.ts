/**
 * Tests for DetectDeadCodeCommand
 */

import { DetectDeadCodeCommand } from '../../commands/DetectDeadCodeCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

describe('DetectDeadCodeCommand', () => {
  let command: DetectDeadCodeCommand;

  beforeEach(() => {
    command = new DetectDeadCodeCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('detect-dead-code');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('dead');
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
      const db = {
        getAllSymbols: jest.fn().mockResolvedValue([
          {
            id: 'function-dead-fn',
            name: 'deadFn',
            type: 'function',
            filePath: 'src/lib/dead.ts',
            line: 4,
            column: 0,
            isExported: false,
            isPublic: false,
          },
          {
            id: 'function-api-fn',
            name: 'apiFn',
            type: 'function',
            filePath: 'src/lib/api.ts',
            line: 9,
            column: 0,
            isExported: true,
            isPublic: true,
          },
        ]),
        countIncomingCalls: jest.fn().mockReturnValue(0),
        countIncomingReferences: jest.fn().mockReturnValue(0),
        getCallerFilePaths: jest.fn().mockReturnValue([]),
        close: jest.fn(),
      } as unknown as DatabaseManager;
      command = new DetectDeadCodeCommand(db);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('prints an XML document by default', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(output().startsWith('<dead-code-detection>')).toBe(true);
      expect(output()).toContain('<totalSymbolsAnalyzed>2</totalSymbolsAnalyzed>');
      expect(output()).toContain('<totalCandidates>1</totalCandidates>');
      expect(output()).toContain('<highConfidence>1</highConfidence>');
      expect(output()).toContain('<name>deadFn</name>');
      expect(output()).toContain('<reason>isolated</reason>');
      expect(output()).toContain('<text>Safe to delete: No incoming calls or dependencies</text>');
      expect(output()).not.toContain('apiFn');
      expect(output()).not.toContain('\x1b[');
    });

    it('prints the colored text report with --human', async () => {
      await command.execute(['--human']);

      expect(output()).toContain('Dead Code Detection');
      expect(output()).toContain('Analyzing 2 symbols...');
      expect(output()).toContain('Total dead code candidates');
      expect(output()).toContain('deadFn (function)');
      expect(output()).toContain('\x1b[');
      expect(output()).not.toContain('<dead-code-detection>');
    });
  });
});
