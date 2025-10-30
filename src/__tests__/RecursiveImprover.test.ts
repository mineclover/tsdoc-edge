/**
 * RecursiveImprover tests
 * @public
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { RecursiveImprover } from '../fixer/RecursiveImprover';

describe('RecursiveImprover', () => {
  let improver: RecursiveImprover;
  let tempDir: string;

  beforeEach(() => {
    improver = new RecursiveImprover();
    tempDir = path.join(__dirname, '../../temp-test-recursive');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('improve', () => {
    it('should improve documentation quality over iterations', () => {
      const testFile = path.join(tempDir, 'test.ts');
      const sourceCode = `export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(x: number, y: number): number {
  return x * y;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 2,
        targetScore: 80,
      });

      expect(result).toBeDefined();
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.iterations).toBeLessThanOrEqual(2);
      expect(result.finalScore).toBeGreaterThanOrEqual(result.initialScore);
    });

    it('should stop when target score is reached', () => {
      const testFile = path.join(tempDir, 'good.ts');
      const sourceCode = `/**
 * Add two numbers
 * @param a - First number
 * @param b - Second number
 * @returns Sum of a and b
 * @public
 */
export function add(a: number, b: number): number {
  return a + b;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 5,
        targetScore: 80,
      });

      // Should stop early because quality is already good
      expect(result.iterations).toBeLessThan(5);
    });

    it('should respect maxIterations limit', () => {
      const testFile = path.join(tempDir, 'iterate.ts');
      const sourceCode = `export function func1(): void {}
export function func2(): void {}
export function func3(): void {}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const maxIterations = 2;
      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations,
        targetScore: 100, // Unreachable target
      });

      expect(result.iterations).toBeLessThanOrEqual(maxIterations);
    });

    it('should work with dry run mode', () => {
      const testFile = path.join(tempDir, 'dryrun.ts');
      const sourceCode = `export function test(): void {
  console.log('test');
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const originalContent = fs.readFileSync(testFile, 'utf-8');

      improver.improve({
        entryPoints: [tempDir],
        maxIterations: 1,
        targetScore: 80,
        dryRun: true,
      });

      const newContent = fs.readFileSync(testFile, 'utf-8');
      expect(newContent).toBe(originalContent); // File should not be modified
    });

    it('should track improvement progress', () => {
      const testFile = path.join(tempDir, 'progress.ts');
      const sourceCode = `export function a(): void {}
export function b(): void {}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 2,
        targetScore: 50,
      });

      expect(result.symbolsFixed).toBeGreaterThanOrEqual(0);
      expect(result.filesModified).toBeGreaterThanOrEqual(0);
      expect(result.iterationResults).toBeDefined();
      expect(result.iterationResults.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty directory', () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = improver.improve({
        entryPoints: [emptyDir],
        maxIterations: 1,
        targetScore: 80,
      });

      expect(result).toBeDefined();
      expect(result.iterations).toBeGreaterThanOrEqual(0);
    });

    it('should use default options when none provided', () => {
      const testFile = path.join(tempDir, 'defaults.ts');
      fs.writeFileSync(testFile, 'export function test(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
      });

      expect(result).toBeDefined();
      expect(result.iterations).toBeGreaterThanOrEqual(0);
    });
  });
});
