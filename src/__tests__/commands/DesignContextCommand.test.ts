/**
 * DesignContextCommand tests
 * @testScenario Display design context for a file
 * @testScenario Handle non-existent file
 * @testScenario Show contracts and decisions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DesignContextCommand } from '../../commands/DesignContextCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(() => ({
        paths: {
          databasePath: '.tsdoc/db.sqlite',
          jsonlDir: '.tsdoc/jsonl',
          managedDir: 'managed',
        },
        documentManagement: { ignoreCodeBlocks: true },
      })),
      resolvePath: jest.fn((target: string) => require('node:path').resolve(process.cwd(), target)),
    })),
  },
}));

describe('DesignContextCommand', () => {
  let command: DesignContextCommand;
  let consoleSpy: jest.SpyInstance;
  let tempDir: string;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'design-context-test-'))
    );
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getName', () => {
    it('should return "design-context"', () => {
      command = new DesignContextCommand();
      expect(command.getName()).toBe('design-context');
    });
  });

  describe('getAlias', () => {
    it('should return "dc" as alias', () => {
      command = new DesignContextCommand();
      expect(command.getAlias()).toContain('dc');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      command = new DesignContextCommand();
      expect(command.getDescription()).toContain('design');
    });
  });

  describe('execute', () => {
    it('should show help when --help flag is passed', async () => {
      command = new DesignContextCommand();
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should fail when no file path provided', async () => {
      command = new DesignContextCommand();
      const result = await command.execute([]);

      expect(result.exitCode).not.toBe(0);
    });

    it('should fail for non-existent file', async () => {
      command = new DesignContextCommand();
      const result = await command.execute(['/nonexistent/file.ts']);

      expect(result.exitCode).not.toBe(0);
    });
  });
  describe('output modes', () => {
    const originalCwd = process.cwd();
    const hasAnsi = (text: string): boolean => text.includes('\x1b[');

    const run = async (args: string[]): Promise<{ exitCode: number; output: string }> => {
      consoleSpy.mockClear();
      const result = await new DesignContextCommand().execute(args);
      return { exitCode: result.exitCode, output: consoleSpy.mock.calls.flat().join('\n') };
    };

    beforeEach(() => {
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'src', 'Thing.ts'),
        '/**\n * Thing\n * @doc [[MissingDoc]]\n */\nexport function thing(): void {}\n',
        'utf-8'
      );

      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, 'jsonl'));
      db.db
        .prepare(
          `INSERT INTO symbols (id, name, type, file_path, line, column, is_exported, is_public, summary, created_at, updated_at, version, jsonl_line)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'thing-function-thing',
          'thing',
          'function',
          'src/Thing.ts',
          5,
          0,
          1,
          1,
          'Does <something> & more',
          '2025-01-01',
          '2025-01-01',
          '1.0.0',
          1
        );
      db.close();

      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('prints only an XML document by default', async () => {
      const { exitCode, output } = await run(['src/Thing.ts']);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<design-context>')).toBe(true);
      expect(output.endsWith('</design-context>')).toBe(true);
      expect(output).toContain('<filePath>src/Thing.ts</filePath>');
      expect(output).toContain('<symbolCount>1</symbolCount>');
      expect(output).toContain('<name>thing</name>');
      expect(output).toContain('<summary>Does &lt;something&gt; &amp; more</summary>');
      expect(output).toContain('<symbolRef>MissingDoc</symbolRef>');
      expect(output).toContain('<found>false</found>');
      expect(output).toContain('<tests count="0">');
      expect(output).toContain('<recommendations count=');
      expect(hasAnsi(output)).toBe(false);
      expect(output).not.toContain('Work Context');
    });

    it('accepts --human anywhere and keeps the colored report behind it', async () => {
      for (const args of [
        ['src/Thing.ts', '--human'],
        ['--human', 'src/Thing.ts'],
      ]) {
        const { exitCode, output } = await run(args);

        expect(exitCode).toBe(0);
        expect(output).toContain('Work Context: Thing.ts');
        expect(output).toContain('📚 관련 문서');
        expect(output).toContain('📊 요약');
        expect(hasAnsi(output)).toBe(true);
        expect(output).not.toContain('<design-context>');
      }
    });

    it('keeps --llm output unchanged and ahead of the default mode', async () => {
      const { exitCode, output } = await run(['src/Thing.ts', '--llm']);

      expect(exitCode).toBe(0);
      expect(output).toContain('# Design Context: src/Thing.ts');
      expect(output).not.toContain('<design-context>');
    });

    it('keeps failing for a missing file in both modes', async () => {
      for (const args of [['src/Missing.ts'], ['src/Missing.ts', '--human']]) {
        const { exitCode, output } = await run(args);

        expect(exitCode).not.toBe(0);
        expect(output).not.toContain('<design-context>');
      }
    });

    it('documents --human in the usage text', () => {
      expect(
        (new DesignContextCommand() as unknown as { getUsage(): string }).getUsage()
      ).toContain('--human');
    });
  });
});
