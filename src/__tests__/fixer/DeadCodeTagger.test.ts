/**
 * Tests for DeadCodeTagger
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DeadCodeTagger } from '../../fixer/DeadCodeTagger';

describe('DeadCodeTagger', () => {
  let tagger: DeadCodeTagger;
  let tempDir: string;

  beforeEach(() => {
    tagger = new DeadCodeTagger();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-tagger-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('tagging without existing JSDoc', () => {
    it('should generate a new TSDoc block with @deprecated and @deadcode tags', () => {
      const filePath = path.join(tempDir, 'sample.ts');
      const initialCode = 'export function unusedHelper(x: number) {\n  return x * 2;\n}\n';
      fs.writeFileSync(filePath, initialCode, 'utf-8');

      const results = tagger.tagSymbolsInFile(
        filePath,
        [
          {
            name: 'unusedHelper',
            line: 1,
            type: 'function',
            reason: 'isolated',
            confidence: 'high',
          },
        ],
        { dryRun: false }
      );

      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('tagged');

      const modifiedCode = fs.readFileSync(filePath, 'utf-8');
      expect(modifiedCode).toContain('@deprecated Unused dead code: isolated.');
      expect(modifiedCode).toContain('@deadcode reason="isolated" confidence="high"');
      expect(modifiedCode).toContain('export function unusedHelper');
    });

    it('should handle indentation for class methods and properties', () => {
      const filePath = path.join(tempDir, 'class-sample.ts');
      const initialCode = [
        'export class WorkerService {',
        '  private unusedInternalMethod() {',
        '    return 42;',
        '  }',
        '}',
      ].join('\n');
      fs.writeFileSync(filePath, initialCode, 'utf-8');

      const results = tagger.tagSymbolsInFile(
        filePath,
        [
          {
            name: 'unusedInternalMethod',
            line: 2,
            type: 'method',
            reason: 'never-called',
            confidence: 'medium',
          },
        ],
        { dryRun: false }
      );

      expect(results[0].action).toBe('tagged');
      const modifiedCode = fs.readFileSync(filePath, 'utf-8');
      expect(modifiedCode).toContain('  /**');
      expect(modifiedCode).toContain('   * @deprecated Unused dead code: never-called.');
      expect(modifiedCode).toContain('   * @deadcode reason="never-called" confidence="medium"');
      expect(modifiedCode).toContain('   */');
    });
  });

  describe('tagging with existing JSDoc', () => {
    it('should append tags inside the existing comment before closing */', () => {
      const filePath = path.join(tempDir, 'existing-doc.ts');
      const initialCode = [
        '/**',
        ' * Options interface for test',
        ' * @public',
        ' */',
        'export interface TestOptions {',
        '  timeout?: number;',
        '}',
      ].join('\n');
      fs.writeFileSync(filePath, initialCode, 'utf-8');

      const results = tagger.tagSymbolsInFile(
        filePath,
        [
          {
            name: 'TestOptions',
            line: 5,
            type: 'interface',
            reason: 'unused-export',
            confidence: 'high',
          },
        ],
        { dryRun: false }
      );

      expect(results[0].action).toBe('tagged');
      const modifiedCode = fs.readFileSync(filePath, 'utf-8');
      expect(modifiedCode).toContain('Options interface for test');
      expect(modifiedCode).toContain('@public');
      expect(modifiedCode).toContain(' * @deprecated Unused dead code: unused-export.');
      expect(modifiedCode).toContain(' * @deadcode reason="unused-export" confidence="high"');
      expect(modifiedCode).toContain(' */');
    });

    it('should properly expand and tag single-line JSDoc comments', () => {
      const filePath = path.join(tempDir, 'single-line.ts');
      const initialCode = '/** Single line helper description */\nexport const helper = 42;\n';
      fs.writeFileSync(filePath, initialCode, 'utf-8');

      const results = tagger.tagSymbolsInFile(
        filePath,
        [
          {
            name: 'helper',
            line: 2,
            type: 'constant',
            reason: 'unused-export',
            confidence: 'high',
          },
        ],
        { dryRun: false }
      );

      expect(results[0].action).toBe('tagged');
      const modifiedCode = fs.readFileSync(filePath, 'utf-8');
      expect(modifiedCode).toContain('/**\n * Single line helper description\n');
      expect(modifiedCode).toContain(' * @deprecated Unused dead code: unused-export.');
      expect(modifiedCode).toContain(' * @deadcode reason="unused-export" confidence="high"');
      expect(modifiedCode).toContain(' */\nexport const helper = 42;');
    });

    it('should not duplicate tags if already tagged', () => {
      const filePath = path.join(tempDir, 'already-tagged.ts');
      const initialCode = [
        '/**',
        ' * Already tagged symbol',
        ' * @deprecated Unused dead code: isolated.',
        ' * @deadcode reason="isolated" confidence="high"',
        ' */',
        'export const OBSOLETE_CONST = 100;',
      ].join('\n');
      fs.writeFileSync(filePath, initialCode, 'utf-8');

      const results = tagger.tagSymbolsInFile(
        filePath,
        [
          {
            name: 'OBSOLETE_CONST',
            line: 6,
            type: 'constant',
            reason: 'isolated',
            confidence: 'high',
          },
        ],
        { dryRun: false }
      );

      expect(results[0].action).toBe('already-tagged');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toBe(initialCode);
    });
  });

  describe('dryRun mode', () => {
    it('should preview tagging without altering source file on disk', () => {
      const filePath = path.join(tempDir, 'dryrun.ts');
      const initialCode = 'export type UnusedType = string | number;\n';
      fs.writeFileSync(filePath, initialCode, 'utf-8');

      const results = tagger.tagSymbolsInFile(
        filePath,
        [
          {
            name: 'UnusedType',
            line: 1,
            type: 'type',
            reason: 'isolated',
            confidence: 'high',
          },
        ],
        { dryRun: true }
      );

      expect(results[0].action).toBe('tagged');
      const unchangedCode = fs.readFileSync(filePath, 'utf-8');
      expect(unchangedCode).toBe(initialCode);
    });
  });

  describe('multi-symbol tagging in same file', () => {
    it('should tag multiple symbols in descending order preserving line offsets', () => {
      const filePath = path.join(tempDir, 'multi.ts');
      const initialCode = [
        'export function firstHelper() {',
        '  return 1;',
        '}',
        '',
        'export function secondHelper() {',
        '  return 2;',
        '}',
      ].join('\n');
      fs.writeFileSync(filePath, initialCode, 'utf-8');

      const results = tagger.tagSymbolsInFile(
        filePath,
        [
          { name: 'firstHelper', line: 1, type: 'function', reason: 'isolated' },
          { name: 'secondHelper', line: 5, type: 'function', reason: 'isolated' },
        ],
        { dryRun: false }
      );

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.action === 'tagged')).toBe(true);

      const modifiedCode = fs.readFileSync(filePath, 'utf-8');
      expect(modifiedCode).toContain('@deadcode reason="isolated"');
      expect(modifiedCode).toContain('firstHelper');
      expect(modifiedCode).toContain('secondHelper');
    });
  });

  describe('untagSymbolsInFile', () => {
    it('should remove dead code tags and clean up empty comment block', () => {
      const filePath = path.join(tempDir, 'untag.ts');
      const taggedCode = [
        '/**',
        ' * @deprecated Unused dead code: isolated.',
        ' * @deadcode reason="isolated" confidence="high"',
        ' */',
        'export function revivedFunction() {',
        '  return true;',
        '}',
      ].join('\n');
      fs.writeFileSync(filePath, taggedCode, 'utf-8');

      const results = tagger.untagSymbolsInFile(filePath, [{ name: 'revivedFunction', line: 5 }], {
        dryRun: false,
      });

      expect(results[0].action).toBe('untagged');
      const cleanCode = fs.readFileSync(filePath, 'utf-8');
      expect(cleanCode).not.toContain('@deadcode');
      expect(cleanCode).not.toContain('@deprecated');
      expect(cleanCode).toContain('export function revivedFunction');
    });

    it('should preserve original non-deadcode doc lines when untagging', () => {
      const filePath = path.join(tempDir, 'preserve-doc.ts');
      const code = [
        '/**',
        ' * Core calculation utility',
        ' * @public',
        ' * @deprecated Unused dead code: isolated.',
        ' * @deadcode reason="isolated" confidence="high"',
        ' */',
        'export function computeTotal() {',
        '  return 100;',
        '}',
      ].join('\n');
      fs.writeFileSync(filePath, code, 'utf-8');

      const results = tagger.untagSymbolsInFile(filePath, [{ name: 'computeTotal', line: 7 }], {
        dryRun: false,
      });

      expect(results[0].action).toBe('untagged');
      const cleaned = fs.readFileSync(filePath, 'utf-8');
      expect(cleaned).toContain('Core calculation utility');
      expect(cleaned).toContain('@public');
      expect(cleaned).not.toContain('@deadcode');
      expect(cleaned).not.toContain('@deprecated Unused dead code');
    });
  });

  describe('findTaggedSymbols', () => {
    it('should find all symbols tagged with @deprecated or @deadcode', () => {
      const file1 = path.join(tempDir, 'modA.ts');
      const file2 = path.join(tempDir, 'modB.ts');

      fs.writeFileSync(
        file1,
        ['/** @deadcode reason="unused" confidence="high" */', 'export class DeadA {}'].join('\n'),
        'utf-8'
      );

      fs.writeFileSync(
        file2,
        [
          '/** @deprecated Use ModC instead */',
          'export function oldB() {}',
          'export function activeC() {}',
        ].join('\n'),
        'utf-8'
      );

      const found = tagger.findTaggedSymbols([tempDir]);
      expect(found).toHaveLength(2);

      const names = found.map((s) => s.name);
      expect(names).toContain('DeadA');
      expect(names).toContain('oldB');
      expect(names).not.toContain('activeC');
    });
  });
});
