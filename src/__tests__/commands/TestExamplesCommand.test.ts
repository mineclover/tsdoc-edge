/**
 * Tests for TestExamplesCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { type TestExample, TestExampleExtractor } from '../../analyzer/TestExampleExtractor';
import { TestExamplesCommand } from '../../commands/TestExamplesCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

jest.mock('../../analyzer/TestExampleExtractor');

const hasAnsi = (text: string): boolean => text.includes('\x1b[');

function makeExample(overrides: Partial<TestExample>): TestExample {
  return {
    id: 'example',
    description: 'does something',
    filePath: 'src/__tests__/Thing.test.ts',
    line: 10,
    code: 'expect(true).toBe(true);',
    testedSymbols: ['Thing'],
    complexity: 'simple',
    category: 'basic-usage',
    quality: 9,
    ...overrides,
  };
}

describe('TestExamplesCommand', () => {
  let command: TestExamplesCommand;

  beforeEach(() => {
    command = new TestExamplesCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('test-examples');
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

    it('should document --human in the usage text', () => {
      expect((command as unknown as { getUsage(): string }).getUsage()).toContain('--human');
    });
  });

  describe('output modes', () => {
    const originalCwd = process.cwd();
    let tempDir: string;
    let log: jest.SpyInstance;

    const run = async (
      args: string[]
    ): Promise<{ exitCode: number; message?: string; output: string }> => {
      log.mockClear();
      const result = await command.execute(args);
      return {
        exitCode: result.exitCode,
        message: result.message,
        output: log.mock.calls.flat().join('\n'),
      };
    };

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-test-examples-')));
      new DatabaseManager(path.join(tempDir, '.tsdoc.db')).close();
      process.chdir(tempDir);
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      (TestExampleExtractor as unknown as jest.Mock).mockImplementation(() => ({
        extractAllExamples: () => [
          makeExample({
            description: 'creates a symbol & stores <it>',
            quality: 9,
            testedSymbols: ['Alpha', 'Beta', 'Gamma', 'Delta'],
          }),
          makeExample({
            description: 'handles empty input',
            quality: 4,
            complexity: 'complex',
            category: 'edge-case',
            filePath: 'src/__tests__/Other.test.ts',
          }),
          makeExample({
            description: 'wires modules together',
            quality: 6,
            complexity: 'medium',
            category: 'integration',
          }),
        ],
      }));
    });

    afterEach(() => {
      log.mockRestore();
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('prints only an XML document by default', async () => {
      const { exitCode, message, output } = await run([]);

      expect(exitCode).toBe(0);
      expect(message).toBe('Examples extracted');
      expect(output.startsWith('<test-examples>')).toBe(true);
      expect(output.endsWith('</test-examples>')).toBe(true);
      expect(output).toContain('<totalExamples>3</totalExamples>');
      expect(output).toContain('<examples count="3">');
      expect(output).toContain(
        '<description>creates a symbol &amp; stores &lt;it&gt;</description>'
      );
      expect(output).toContain('<name>Delta</name>');
      expect(output).not.toContain('<fileFilter>');
      expect(output).not.toContain('<minQuality>');
      expect(hasAnsi(output)).toBe(false);
      expect(output).not.toContain('Living Documentation');
    });

    it('lists examples best-first and applies filters and --limit', async () => {
      const { output } = await run(['--min-quality', '5', '--limit', '1']);

      expect(output).toContain('<minQuality>5</minQuality>');
      expect(output).toContain('<filteredExamples>2</filteredExamples>');
      expect(output).toContain('<shownExamples>1</shownExamples>');
      expect(output).toContain('<examples count="1">');
      expect(output).toContain('<rank>1</rank>');
      expect(output).toContain('creates a symbol');
      expect(output).not.toContain('wires modules together');
    });

    it('still emits a document when nothing matches', async () => {
      const { exitCode, message, output } = await run([
        '--complexity',
        'complex',
        '--min-quality',
        '9',
      ]);

      expect(exitCode).toBe(0);
      expect(message).toBe('No examples found');
      expect(output).toContain('<examples count="0">');
      expect(output).toContain('<filteredExamples>0</filteredExamples>');
    });

    it('keeps the colored report behind --human', async () => {
      const { exitCode, message, output } = await run(['--human']);

      expect(exitCode).toBe(0);
      expect(message).toBe('Examples extracted');
      expect(output).toContain('Test Examples - Living Documentation');
      expect(output).toContain('Top Examples');
      expect(output).toContain('Recommendations');
      expect(hasAnsi(output)).toBe(true);
      expect(output).not.toContain('<test-examples>');
    });

    it('fails without printing a document when the database is missing', async () => {
      fs.rmSync(path.join(tempDir, '.tsdoc.db'));

      const { exitCode, output } = await run([]);

      expect(exitCode).toBe(1);
      expect(output).not.toContain('<test-examples>');
    });
  });
});
