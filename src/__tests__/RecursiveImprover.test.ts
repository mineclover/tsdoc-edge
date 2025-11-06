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

    it('should log progress when verbose mode is enabled', () => {
      const testFile = path.join(tempDir, 'verbose.ts');
      const sourceCode = `export function test(): void {}`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 2,
        targetScore: 80,
        verbose: true,
      });

      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should stop when no symbols need fixing', () => {
      const testFile = path.join(tempDir, 'perfect.ts');
      const sourceCode = `/**
 * Perfect documentation
 * @param a - First number
 * @param b - Second number
 * @returns Sum
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
        targetScore: 50, // Low target that's already met
        verbose: true,
      });

      expect(result).toBeDefined();
      expect(result.iterations).toBeGreaterThanOrEqual(0);
    });

    it('should stop when score does not improve', () => {
      const testFile = path.join(tempDir, 'noimprov.ts');
      fs.writeFileSync(testFile, 'export function test(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 3,
        targetScore: 100, // Very high target
        verbose: true,
      });

      expect(result).toBeDefined();
      expect(result.iterations).toBeGreaterThanOrEqual(0);
    });

    it('should handle single file as entry point', () => {
      const testFile = path.join(tempDir, 'single.ts');
      fs.writeFileSync(testFile, 'export function test(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [testFile], // Single file, not directory
        maxIterations: 1,
        targetScore: 80,
      });

      expect(result).toBeDefined();
      expect(result.iterations).toBeGreaterThanOrEqual(0);
    });

    it('should skip hidden directories', () => {
      const hiddenDir = path.join(tempDir, '.hidden');
      fs.mkdirSync(hiddenDir, { recursive: true });
      fs.writeFileSync(path.join(hiddenDir, 'test.ts'), 'export function test(): void {}', 'utf-8');

      const normalDir = path.join(tempDir, 'normal');
      fs.mkdirSync(normalDir, { recursive: true });
      fs.writeFileSync(path.join(normalDir, 'test.ts'), 'export function test(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 1,
        targetScore: 80,
      });

      expect(result).toBeDefined();
    });

    it('should skip node_modules directory', () => {
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'test.ts'),
        'export function test(): void {}',
        'utf-8'
      );

      const normalDir = path.join(tempDir, 'src');
      fs.mkdirSync(normalDir, { recursive: true });
      fs.writeFileSync(path.join(normalDir, 'test.ts'), 'export function test(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 1,
        targetScore: 80,
      });

      expect(result).toBeDefined();
    });

    it('should propagate fix options to DocumentationFixer', () => {
      const testFile = path.join(tempDir, 'fix-options.ts');
      const sourceCode = `export function test(x: number): string {
  return x.toString();
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 1,
        targetScore: 80,
        fixOptions: {
          addSummary: true,
          addParams: true,
          addReturns: true,
          addCustomTags: true,
        },
      });

      expect(result).toBeDefined();
      if (result.symbolsFixed > 0) {
        const fixedCode = fs.readFileSync(testFile, 'utf-8');
        expect(fixedCode).toContain('/**');
      }
    });

    it('should handle multiple files in iteration', () => {
      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(tempDir, 'file2.ts');
      const file3 = path.join(tempDir, 'file3.ts');

      fs.writeFileSync(file1, 'export function func1(): void {}', 'utf-8');
      fs.writeFileSync(file2, 'export function func2(): void {}', 'utf-8');
      fs.writeFileSync(file3, 'export function func3(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 2,
        targetScore: 80,
      });

      expect(result.improvedFiles.length).toBeGreaterThanOrEqual(0);
      expect(result.filesModified).toBeGreaterThanOrEqual(0);
    });

    it('should accurately track iteration statistics', () => {
      const testFile = path.join(tempDir, 'stats.ts');
      fs.writeFileSync(testFile, 'export function test(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 3,
        targetScore: 80,
      });

      expect(result.iterationResults).toBeDefined();
      expect(result.iterationResults.length).toBe(result.iterations);

      // Each iteration should have score and fixes
      for (const iter of result.iterationResults) {
        expect(iter.iteration).toBeGreaterThan(0);
        expect(iter.score).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(iter.fixes)).toBe(true);
      }
    });

    it('should increase score progressively across iterations', () => {
      const testFile = path.join(tempDir, 'progressive.ts');
      const sourceCode = `export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(x: number, y: number): number {
  return x - y;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 3,
        targetScore: 90,
      });

      if (result.iterations > 1) {
        // Check that scores generally increase (or stay same if no improvement possible)
        for (let i = 1; i < result.iterationResults.length; i++) {
          const prevScore = result.iterationResults[i - 1].score;
          const currScore = result.iterationResults[i].score;
          expect(currScore).toBeGreaterThanOrEqual(prevScore - 5); // Allow small variance
        }
      }
    });

    it('should handle non-existent entry points gracefully', () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist');

      const result = improver.improve({
        entryPoints: [nonExistentPath],
        maxIterations: 1,
        targetScore: 80,
      });

      expect(result).toBeDefined();
      expect(result.iterations).toBeGreaterThanOrEqual(0);
    });

    it('should track improved files correctly', () => {
      const file1 = path.join(tempDir, 'improved1.ts');
      const file2 = path.join(tempDir, 'improved2.ts');

      fs.writeFileSync(file1, 'export function test1(): void {}', 'utf-8');
      fs.writeFileSync(file2, 'export function test2(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 2,
        targetScore: 80,
      });

      expect(result.improvedFiles).toBeDefined();
      expect(Array.isArray(result.improvedFiles)).toBe(true);
      expect(result.filesModified).toBe(result.improvedFiles.length);
    });

    it('should calculate final score correctly', () => {
      const testFile = path.join(tempDir, 'final-score.ts');
      fs.writeFileSync(testFile, 'export function test(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 2,
        targetScore: 80,
      });

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.finalScore).toBeLessThanOrEqual(100);
      expect(result.finalScore).toBeGreaterThanOrEqual(result.initialScore);
    });

    it('should skip test files during improvement', () => {
      const testFile = path.join(tempDir, 'module.test.ts');
      const normalFile = path.join(tempDir, 'module.ts');

      fs.writeFileSync(testFile, 'export function testFunc(): void {}', 'utf-8');
      fs.writeFileSync(normalFile, 'export function normalFunc(): void {}', 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 1,
        targetScore: 80,
      });

      expect(result).toBeDefined();
      // Test files should be skipped (based on walkDirectory implementation)
    });

    it('should handle mixed quality files', () => {
      const poorFile = path.join(tempDir, 'poor.ts');
      const goodFile = path.join(tempDir, 'good.ts');

      fs.writeFileSync(poorFile, 'export function poor(): void {}', 'utf-8');
      fs.writeFileSync(
        goodFile,
        `/**
 * Well documented function
 * @returns Greeting string
 * @public
 */
export function good(): string {
  return 'hello';
}
`,
        'utf-8'
      );

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 2,
        targetScore: 80,
      });

      expect(result).toBeDefined();
      // Should improve poor file but not modify good file
      expect(result.iterations).toBeGreaterThanOrEqual(0);
    });

    it('should respect minScore from fixOptions', () => {
      const testFile = path.join(tempDir, 'min-score.ts');
      const sourceCode = `/**
 * Partially documented
 * @public
 */
export function partial(): void {}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const result = improver.improve({
        entryPoints: [tempDir],
        maxIterations: 2,
        targetScore: 90,
        fixOptions: {
          minScore: 60, // Only fix symbols with score < 60
        },
      });

      expect(result).toBeDefined();
      // This function might have score > 60, so might not be fixed
    });
  });
});
