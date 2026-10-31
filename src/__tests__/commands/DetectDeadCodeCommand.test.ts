/**
 * Tests for DetectDeadCodeCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DetectDeadCodeCommand } from '../../commands/DetectDeadCodeCommand';
import { DeadCodeTagger } from '../../fixer/DeadCodeTagger';
import type { DatabaseManager } from '../../storage/DatabaseManager';
import type { Symbol } from '../../types/graph/graph';

describe('DetectDeadCodeCommand', () => {
  let command: DetectDeadCodeCommand;
  let mockDb: Partial<DatabaseManager>;
  let tagger: DeadCodeTagger;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-deadcode-cmd-test-'));
    tagger = new DeadCodeTagger();

    mockDb = {
      getAllSymbols: jest.fn().mockResolvedValue([
        {
          id: 'sym-active-class',
          name: 'ActiveService',
          type: 'class',
          filePath: path.join(tempDir, 'ActiveService.ts'),
          line: 5,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        } as Symbol,
        {
          id: 'sym-isolated-helper',
          name: 'isolatedHelper',
          type: 'function',
          filePath: path.join(tempDir, 'IsolatedHelper.ts'),
          line: 2,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        } as Symbol,
        {
          id: 'sym-unused-export',
          name: 'UnusedExportedType',
          type: 'type',
          filePath: path.join(tempDir, 'UnusedType.ts'),
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        } as Symbol,
      ]),
      countIncomingCalls: jest.fn().mockImplementation((id: string) => {
        return id === 'sym-active-class' ? 5 : 0;
      }),
      countIncomingReferences: jest.fn().mockImplementation((id: string) => {
        return id === 'sym-active-class' ? 3 : 0;
      }),
      getCallerFilePaths: jest.fn().mockReturnValue([]),
      close: jest.fn(),
    };

    // Create dummy files in tempDir
    fs.writeFileSync(
      path.join(tempDir, 'ActiveService.ts'),
      'export class ActiveService {}\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tempDir, 'IsolatedHelper.ts'),
      'function isolatedHelper() { return 1; }\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tempDir, 'UnusedType.ts'),
      'export type UnusedExportedType = string;\n',
      'utf-8'
    );

    command = new DetectDeadCodeCommand(mockDb as unknown as DatabaseManager, tagger);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('detect-dead-code');
    });

    it('should return command aliases', () => {
      expect(command.getAliases()).toContain('dead-code');
      expect(command.getAliases()).toContain('deadcode');
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

    it('should explore and output dead code candidates in json format', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await command.execute(['--json', '--all']);
      expect(result.exitCode).toBe(0);

      expect(logSpy).toHaveBeenCalled();
      const rawJson = logSpy.mock.calls.find((call) => call[0]?.includes('totalCandidates'))?.[0];
      expect(rawJson).toBeDefined();

      const parsed = JSON.parse(rawJson);
      expect(parsed.totalCandidates).toBeGreaterThanOrEqual(1);

      const candidateNames = parsed.candidates.map((c: { name: string }) => c.name);
      expect(candidateNames).toContain('isolatedHelper');
      expect(candidateNames).not.toContain('ActiveService');

      logSpy.mockRestore();
    });

    it('should filter candidates by type', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await command.execute(['--type=function', '--json', '--all']);
      expect(result.exitCode).toBe(0);

      const rawJson = logSpy.mock.calls.find((call) => call[0]?.includes('totalCandidates'))?.[0];
      const parsed = JSON.parse(rawJson);
      expect(parsed.candidates.every((c: { type: string }) => c.type === 'function')).toBe(true);
      logSpy.mockRestore();
    });

    it('should display summary breakdown with --summary', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await command.execute(['--summary']);
      expect(result.exitCode).toBe(0);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should support searching existing tagged dead code with --tagged', async () => {
      // Add a tagged file in tempDir
      fs.writeFileSync(
        path.join(tempDir, 'TaggedFile.ts'),
        '/** @deadcode reason="legacy" confidence="high" */\nexport function legacyCalc() {}\n',
        'utf-8'
      );

      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await command.execute([tempDir, '--tagged', '--json']);
      expect(result.exitCode).toBe(0);

      const rawJson = logSpy.mock.calls.find((call) => call[0]?.includes('searchRoot'))?.[0];
      expect(rawJson).toBeDefined();

      const parsed = JSON.parse(rawJson);
      expect(parsed.count).toBe(1);
      expect(parsed.symbols[0].name).toBe('legacyCalc');
      logSpy.mockRestore();
    });

    it('should preview tagging in --dry-run mode without modifying source files', async () => {
      const targetFile = path.join(tempDir, 'IsolatedHelper.ts');
      const originalContent = fs.readFileSync(targetFile, 'utf-8');

      const result = await command.execute([targetFile, '--tag', '--dry-run', '--all']);
      expect(result.exitCode).toBe(0);

      const postContent = fs.readFileSync(targetFile, 'utf-8');
      expect(postContent).toBe(originalContent);
    });

    it('should tag dead code candidate in source file with --tag', async () => {
      const targetFile = path.join(tempDir, 'IsolatedHelper.ts');

      const result = await command.execute([targetFile, '--tag', '--all']);
      expect(result.exitCode).toBe(0);

      const postContent = fs.readFileSync(targetFile, 'utf-8');
      expect(postContent).toContain('@deprecated');
      expect(postContent).toContain('@deadcode');
    });

    it('should untag dead code candidate with --untag', async () => {
      const targetFile = path.join(tempDir, 'IsolatedHelper.ts');
      // Pre-tag
      await command.execute([targetFile, '--tag', '--all']);
      expect(fs.readFileSync(targetFile, 'utf-8')).toContain('@deadcode');

      // Now untag
      const result = await command.execute([targetFile, '--untag', '--all']);
      expect(result.exitCode).toBe(0);

      const postContent = fs.readFileSync(targetFile, 'utf-8');
      expect(postContent).not.toContain('@deadcode');
    });

    it('should safely close database connection in finally block', async () => {
      await command.execute(['--all']);
      expect(mockDb.close).toHaveBeenCalledTimes(1);
    });
  });
});
