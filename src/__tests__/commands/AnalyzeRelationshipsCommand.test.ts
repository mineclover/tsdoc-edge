/**
 * Tests for AnalyzeRelationshipsCommand
 */

import type { AnalyzerContext } from '../../analyzer/types';
import { AnalyzeRelationshipsCommand } from '../../commands/AnalyzeRelationshipsCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

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

    it('should list analyzers with --list flag', async () => {
      const result = await command.execute(['--list']);
      expect(result.exitCode).toBe(0);
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
