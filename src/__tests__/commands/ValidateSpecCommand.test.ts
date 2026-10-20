/**
 * Tests for ValidateSpecCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ValidateSpecCommand } from '../../commands/ValidateSpecCommand';
import type { SpecCompletenessValidator } from '../../spec/SpecCompletenessValidator';

describe('ValidateSpecCommand', () => {
  let command: ValidateSpecCommand;

  beforeEach(() => {
    command = new ValidateSpecCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('validate-spec');
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
    let validateMultiple: jest.Mock;
    let getSummary: jest.Mock;
    let log: jest.SpyInstance;

    const output = () => log.mock.calls.flat().join('\n');

    const result = (name: string, isComplete: boolean, design: number, impl: number) => ({
      filePath: path.join(tempDir, name),
      score: Math.round((design + impl) / 2),
      designScore: design,
      implementationScore: impl,
      isComplete,
      issues: isComplete ? [] : [{ type: 'warning', category: 'structure', message: 'missing' }],
    });

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-spec-'));
      fs.writeFileSync(path.join(tempDir, 'a.md'), '# A\n');
      fs.writeFileSync(path.join(tempDir, 'b.md'), '# B\n');
      validateMultiple = jest
        .fn()
        .mockReturnValue([result('a.md', true, 90, 70), result('b.md', false, 40, 20)]);
      getSummary = jest.fn().mockReturnValue({
        total: 2,
        complete: 1,
        incomplete: 1,
        averageScore: 55,
        totalIssues: 1,
      });
      command = new ValidateSpecCommand({
        validateMultiple,
        getSummary,
      } as unknown as SpecCompletenessValidator);
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('prints only the XML document by default and still fails on incomplete specs', async () => {
      const outcome = await command.execute([tempDir]);

      expect(outcome.exitCode).toBe(1);
      const xml = output();
      expect(xml.startsWith('<spec-validation>')).toBe(true);
      expect(xml.endsWith('</spec-validation>')).toBe(true);
      expect(xml).toContain('<total>2</total>');
      expect(xml).toContain('<incomplete>1</incomplete>');
      expect(xml).toContain('<averageDesignScore>65</averageDesignScore>');
      expect(xml).toContain('<averageImplementationScore>45</averageImplementationScore>');
      expect(xml).toContain('<specs count="2">');
      expect(xml).toContain('<isComplete>true</isComplete>');
      expect(xml).toContain('<isComplete>false</isComplete>');
      expect(xml).toContain('<issueCount>1</issueCount>');
      expect(xml).not.toContain('\x1b[');
    });

    it('lists every specification in XML even when the text view truncates', async () => {
      const many = Array.from({ length: 8 }, (_, i) => result(`s${i}.md`, true, 90, 90));
      validateMultiple.mockReturnValue(many);
      getSummary.mockReturnValue({
        total: 8,
        complete: 8,
        incomplete: 0,
        averageScore: 90,
        totalIssues: 0,
      });

      const outcome = await command.execute([tempDir]);

      expect(outcome.exitCode).toBe(0);
      expect(output()).toContain('<specs count="8">');
    });

    it('keeps the colored text output behind --human', async () => {
      const outcome = await command.execute([tempDir, '--human']);

      expect(outcome.exitCode).toBe(1);
      expect(output()).toContain('Validating Specification Completeness');
      expect(output()).toContain('Complete Specifications');
      expect(output()).toContain('Incomplete Specifications');
      expect(output()).not.toContain('<spec-validation>');
    });

    it('treats --human as a flag, not as the directory argument', async () => {
      const outcome = await command.execute(['--human', tempDir]);

      expect(outcome.exitCode).toBe(1);
      expect(output()).toContain('Validating Specification Completeness');
    });

    it('emits an empty XML document when there are no markdown files', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-spec-empty-'));
      try {
        const outcome = await command.execute([emptyDir]);

        expect(outcome.exitCode).toBe(0);
        expect(output()).toContain('<total>0</total>');
        expect(output()).toContain('<specs count="0">');
        expect(output()).not.toContain('No markdown files found');
        expect(validateMultiple).not.toHaveBeenCalled();
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });

    it('keeps the missing-path failure in both modes', async () => {
      const missing = path.join(tempDir, 'missing');

      const outcome = await command.execute([missing]);

      expect(outcome.exitCode).toBe(1);
      expect(output()).toContain('Path not found');
    });
  });
});
