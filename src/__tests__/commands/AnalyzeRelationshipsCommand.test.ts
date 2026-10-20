/**
 * Tests for AnalyzeRelationshipsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AnalyzerContext } from '../../analyzer/types';
import { AnalyzeRelationshipsCommand } from '../../commands/AnalyzeRelationshipsCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';
import { seedRelationshipDatabase } from '../fixtures/relationship-db';

describe('AnalyzeRelationshipsCommand', () => {
  let command: AnalyzeRelationshipsCommand;

  beforeEach(() => {
    command = new AnalyzeRelationshipsCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('analyze-relationships');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('relationship');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const logSpy = jest.spyOn(console, 'log');
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--router-module'));
    });

    it('should list analyzers as XML by default', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['--list']);
      const xml = log.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<analyzer-list>')).toBe(true);
      expect(xml).toContain('<type>calls</type>');
      expect(xml).toContain('<category>behavioral</category>');
      expect(xml).not.toContain('\x1b[');
    });

    it('should list analyzers as colored text with --list --human', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['--list', '--human']);
      const text = log.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(text).toContain('Available Analyzer Types');
      expect(text).toContain('requires:');
      expect(text).toContain('\x1b[');
      expect(text).not.toContain('<analyzer-list>');
    });

    describe('with a project database', () => {
      let tempDir: string;
      const originalCwd = process.cwd();

      beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-relationships-'));
        process.chdir(tempDir);
        seedRelationshipDatabase(tempDir);
      });

      afterEach(() => {
        process.chdir(originalCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
      });

      it('should report a single analyzer run as XML by default', async () => {
        const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        const result = await command.execute(['--type=substitution']);
        const xml = log.mock.calls.flat().join('\n');

        expect(result.exitCode).toBe(0);
        expect(xml.startsWith('<relationship-analysis>')).toBe(true);
        expect(xml).toContain('<analyzerType>substitution</analyzerType>');
        expect(xml).toContain('<status>analyzed</status>');
        expect(xml).toContain('<samples count="0">');
        expect(xml).not.toContain('Loading legacy dependency graph');
        expect(xml).not.toContain('\x1b[');
      });

      it('should keep the colored progress output with --human', async () => {
        const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        const result = await command.execute(['--type=substitution', '--human']);
        const text = log.mock.calls.flat().join('\n');

        expect(result.exitCode).toBe(0);
        expect(text).toContain('TSDoc Edge - Relationship Analysis');
        expect(text).toContain('Found 0 relationships');
        expect(text).toContain('Total relationships:');
        expect(text).toContain('\x1b[');
        expect(text).not.toContain('<relationship-analysis>');
      });
    });

    it('should fail structural analysis when the graph-router module is missing', async () => {
      const result = await command.execute(['--type=structural']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('requires --router-module');
    });

    it('should not claim all analyzers ran when the graph-router module is missing', async () => {
      const result = await command.execute(['--type=all']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('requires --router-module');
    });

    it('closes the legacy database when a selected analyzer fails', async () => {
      const close = jest.fn();
      const privateCommand = command as unknown as {
        buildContext(
          srcDir: string,
          analyzerTypes: readonly string[],
          routerOptions: unknown
        ): Promise<AnalyzerContext>;
        registry: {
          analyze(type: string, context: AnalyzerContext): unknown[];
        };
      };
      jest.spyOn(privateCommand, 'buildContext').mockResolvedValue({
        projectRoot: process.cwd(),
        graphAnalysis: {} as NonNullable<AnalyzerContext['graphAnalysis']>,
        dbManager: { close } as unknown as DatabaseManager,
      });
      jest.spyOn(privateCommand.registry, 'analyze').mockImplementation(() => {
        throw new Error('fixture analyzer failure');
      });

      const result = await command.execute(['--type=structural', '--router-module=fixture-module']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('fixture analyzer failure');
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});
