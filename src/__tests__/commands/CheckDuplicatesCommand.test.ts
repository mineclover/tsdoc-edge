/**
 * Tests for CheckDuplicatesCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CheckDuplicatesCommand } from '../../commands/CheckDuplicatesCommand';
import type { SpecContentSimilarityChecker } from '../../spec/SpecContentSimilarityChecker';
import type { ContentSimilarity } from '../../types/spec';

describe('CheckDuplicatesCommand', () => {
  let command: CheckDuplicatesCommand;

  beforeEach(() => {
    command = new CheckDuplicatesCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('check-duplicates');
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
    let tempDir: string;
    const output = () => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    const similarity = (
      file1: string,
      file2: string,
      value: number,
      suggestion: ContentSimilarity['suggestion']
    ): ContentSimilarity => ({
      file1,
      file2,
      similarity: value,
      overlappingSections: [{ section: 'Overview', similarity: 0.9 }],
      suggestion,
      reason: `reason for ${suggestion}`,
    });

    const checkerReturning = (results: ContentSimilarity[]) =>
      ({
        checkMultiple: jest.fn().mockReturnValue(results),
        getSummary: jest.fn().mockReturnValue({
          totalPairs: results.length,
          mergeSuggestions: results.filter((r) => r.suggestion === 'merge').length,
          crossRefSuggestions: results.filter((r) => r.suggestion === 'cross-reference').length,
          keepSeparate: results.filter((r) => r.suggestion === 'keep-separate').length,
          averageSimilarity: 0.5,
        }),
      }) as unknown as SpecContentSimilarityChecker;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-check-dup-'));
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    const writeDocs = (...names: string[]) => {
      for (const name of names) {
        fs.writeFileSync(path.join(tempDir, name), `# ${name}\n`);
      }
    };

    it('prints an XML document by default and keeps the failing exit code for merges', async () => {
      writeDocs('a.md', 'b.md', 'c.md');
      const results = [
        similarity(path.join(tempDir, 'a.md'), path.join(tempDir, 'b.md'), 0.91, 'merge'),
        similarity(path.join(tempDir, 'a.md'), path.join(tempDir, 'c.md'), 0.2, 'keep-separate'),
      ];
      command = new CheckDuplicatesCommand(checkerReturning(results));

      const result = await command.execute([tempDir]);

      expect(result.exitCode).toBe(1);
      expect(output().startsWith('<content-similarity>')).toBe(true);
      expect(output()).toContain('<status>analyzed</status>');
      expect(output()).toContain('<totalDocuments>3</totalDocuments>');
      expect(output()).toContain('<pairsAnalyzed>3</pairsAnalyzed>');
      expect(output()).toContain('<mergeSuggestions>1</mergeSuggestions>');
      expect(output()).toContain('<keepSeparate>1</keepSeparate>');
      expect(output()).toContain('<suggestion>merge</suggestion>');
      expect(output()).toContain('<similarity>91</similarity>');
      expect(output()).toContain('<section>Overview</section>');
      expect(output()).not.toContain('keep-separate</suggestion>');
      expect(output()).not.toContain('\x1b[');
      expect(output().trim().endsWith('</content-similarity>')).toBe(true);
    });

    it('still prints a document when there is nothing to compare', async () => {
      writeDocs('only.md');
      command = new CheckDuplicatesCommand(checkerReturning([]));

      const result = await command.execute([tempDir]);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('<status>insufficient-documents</status>');
      expect(output()).toContain('<totalDocuments>1</totalDocuments>');
      expect(output()).toContain('<pairs count="0">');
    });

    it('does not mistake --human for the directory argument', async () => {
      writeDocs('a.md', 'b.md');
      const results = [
        similarity(path.join(tempDir, 'a.md'), path.join(tempDir, 'b.md'), 0.91, 'merge'),
      ];
      command = new CheckDuplicatesCommand(checkerReturning(results));

      const result = await command.execute(['--human', tempDir]);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Checking Content Similarity');
      expect(output()).toContain('Merge Suggestions (High Similarity)');
      expect(output()).toContain('Found 1 pair(s) with high similarity that should be merged');
      expect(output()).toContain('\x1b[');
      expect(output()).not.toContain('<content-similarity>');
    });

    it('fails on a missing path in both formats', async () => {
      command = new CheckDuplicatesCommand(checkerReturning([]));

      const xml = await command.execute([path.join(tempDir, 'missing')]);
      const human = await command.execute(['--human', path.join(tempDir, 'missing')]);

      expect(xml.exitCode).toBe(1);
      expect(human.exitCode).toBe(1);
      expect(output()).not.toContain('<content-similarity>');
    });
  });
});
