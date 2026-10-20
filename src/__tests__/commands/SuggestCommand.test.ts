/**
 * Tests for SuggestCommand
 */

import * as fs from 'node:fs';
import { CodeHealthChecker } from '../../analyzer/CodeHealthChecker';
import { SuggestCommand } from '../../commands/SuggestCommand';
import type { AnalysisReport, ImprovementSuggestion } from '../../types/analysis';

jest.mock('node:fs');
jest.mock('../../analyzer/CodeHealthChecker');

function suggestion(
  priority: ImprovementSuggestion['priority'],
  symbolName: string
): ImprovementSuggestion {
  return {
    priority,
    category: 'documentation',
    filePath: `src/${symbolName}.ts`,
    symbolName,
    issue: `Low documentation quality for ${symbolName}`,
    suggestion: `Document ${symbolName}`,
    effort: 'small',
  };
}

function reportWith(suggestions: ImprovementSuggestion[]): AnalysisReport {
  return {
    timestamp: new Date().toISOString(),
    projectPath: 'src',
    metrics: {
      totalFiles: 1,
      totalSymbols: 1,
      publicSymbols: 1,
      documentedSymbols: 1,
      fullyDocumentedSymbols: 1,
      filesWithTests: 1,
      filesWithoutTests: 0,
      avgQualityScore: 80,
      healthScore: 80,
    },
    docScores: [],
    testCoverage: [],
    topIssues: [],
    filesNeedingAttention: [],
    suggestions,
  };
}

describe('SuggestCommand', () => {
  let command: SuggestCommand;
  let mockChecker: jest.Mocked<CodeHealthChecker>;

  beforeEach(() => {
    mockChecker = new CodeHealthChecker() as jest.Mocked<CodeHealthChecker>;
    mockChecker.analyze = jest.fn().mockReturnValue(reportWith([]));
    command = new SuggestCommand(mockChecker);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  const run = async (args: string[]): Promise<{ output: string; exitCode: number }> => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = await command.execute(args);
    return {
      output: log.mock.calls.map((call) => call.join(' ')).join('\n'),
      exitCode: result.exitCode,
    };
  };

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('suggest');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('suggestion');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should fail if path does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await command.execute(['nonexistent']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Path not found');
    });
  });

  describe('output format', () => {
    beforeEach(() => {
      mockChecker.analyze = jest
        .fn()
        .mockReturnValue(
          reportWith([
            suggestion('medium', 'Medium'),
            suggestion('critical', 'CriticalOne'),
            suggestion('critical', 'CriticalTwo'),
            suggestion('high', 'High'),
          ])
        );
    });

    it('prints only an XML document by default', async () => {
      const { output, exitCode } = await run(['src']);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<improvement-suggestions>')).toBe(true);
      expect(output.endsWith('</improvement-suggestions>')).toBe(true);
      expect(output).toContain('<totalFound>4</totalFound>');
      expect(output).toContain('<symbolName>CriticalOne</symbolName>');
      expect(output).not.toContain('\x1b[');
    });

    it('orders by priority and honors --limit like the human view', async () => {
      const { output } = await run(['src', '--limit=3']);

      expect(output).toContain('<shownCount>3</shownCount>');
      expect(output).toContain('<suggestions count="3">');
      expect(output.indexOf('CriticalOne')).toBeLessThan(output.indexOf('CriticalTwo'));
      expect(output.indexOf('CriticalTwo')).toBeLessThan(output.indexOf('<symbolName>High'));
      expect(output).not.toContain('<symbolName>Medium');
    });

    it('still emits a document when there is nothing to suggest', async () => {
      mockChecker.analyze = jest.fn().mockReturnValue(reportWith([]));

      const { output } = await run(['src']);

      expect(output).toContain('<totalFound>0</totalFound>');
      expect(output).toContain('<suggestions count="0">');
    });

    it('accepts --human before the path', async () => {
      const { output } = await run(['--human', 'src']);

      expect(mockChecker.analyze).toHaveBeenCalledWith(expect.objectContaining({ path: 'src' }));
      expect(output).toContain('Improvement Suggestions (4 total)');
    });

    it('prints the colored report with --human', async () => {
      const { output } = await run(['src', '--human', '--limit=2']);

      expect(output).toContain('TSDoc Edge - Improvement Suggestions');
      expect(output).toContain('Critical Priority');
      expect(output).toContain('... and 2 more suggestions');
      expect(output).toContain('\x1b[');
      expect(output).not.toContain('<improvement-suggestions>');
    });
  });
});
