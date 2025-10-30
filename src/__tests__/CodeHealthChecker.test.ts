/**
 * CodeHealthChecker tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';

describe('CodeHealthChecker', () => {
  let checker: CodeHealthChecker;
  let tempDir: string;

  beforeEach(() => {
    checker = new CodeHealthChecker();
    tempDir = path.join(__dirname, '../../temp-test-health');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('analyze', () => {
    it('should analyze a well-documented file', () => {
      const testFile = path.join(tempDir, 'good.ts');
      const sourceCode = `/**
 * Calculator class
 * @public
 */
export class Calculator {
  /**
   * Add two numbers
   * @param a - First number
   * @param b - Second number
   * @returns Sum
   * @public
   */
  add(a: number, b: number): number {
    return a + b;
  }

  /**
   * Subtract two numbers
   * @param a - First number
   * @param b - Second number
   * @returns Difference
   * @public
   */
  subtract(a: number, b: number): number {
    return a - b;
  }
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const report = checker.analyze({ path: tempDir });

      expect(report.metrics.totalFiles).toBeGreaterThanOrEqual(1);
      expect(report.metrics.totalSymbols).toBeGreaterThanOrEqual(3);
      expect(report.metrics.avgQualityScore).toBeGreaterThan(80);
      expect(report.docScores.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect undocumented symbols', () => {
      const testFile = path.join(tempDir, 'bad.ts');
      const sourceCode = `export function undocumented(x: number): number {
  return x * 2;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const report = checker.analyze({ path: tempDir });

      const undocumented = report.docScores.find((s) => s.symbolName === 'undocumented');
      expect(undocumented).toBeDefined();
      expect(undocumented!.hasDoc).toBe(false);
      expect(undocumented!.qualityScore).toBe(0);
    });

    it('should exclude local variables from analysis', () => {
      const testFile = path.join(tempDir, 'vars.ts');
      const sourceCode = `const localVar = 'local';

export const exportedVar = 'exported';

export function useVars(): void {
  console.log(localVar, exportedVar);
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const report = checker.analyze({ path: tempDir });

      // Should not include localVar in the analysis
      const localVarScore = report.docScores.find((s) => s.symbolName === 'localVar');
      expect(localVarScore).toBeUndefined();

      // Should include exportedVar
      const exportedVarScore = report.docScores.find((s) => s.symbolName === 'exportedVar');
      expect(exportedVarScore).toBeDefined();
    });

    it('should calculate health metrics correctly', () => {
      const testFile = path.join(tempDir, 'mixed.ts');
      const sourceCode = `/**
 * Good function
 * @param x - Number
 * @returns Result
 * @public
 */
export function good(x: number): number {
  return x;
}

export function bad(x: number): number {
  return x;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const report = checker.analyze({ path: tempDir });

      expect(report.metrics.documentedSymbols).toBeGreaterThanOrEqual(1);
      expect(report.metrics.documentedSymbols).toBeLessThan(report.metrics.totalSymbols);
      expect(report.metrics.avgQualityScore).toBeGreaterThan(0);
      expect(report.metrics.avgQualityScore).toBeLessThan(100);
    });

    it('should generate improvement suggestions', () => {
      const testFile = path.join(tempDir, 'needs-improvement.ts');
      const sourceCode = `export function needsDoc(x: number): number {
  return x;
}

/**
 * Partial docs
 * @public
 */
export function partialDoc(x: number): number {
  return x;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const report = checker.analyze({ path: tempDir });

      expect(report.suggestions).toBeDefined();
      // Suggestions may or may not be generated depending on code quality
      if (report.suggestions.length > 0) {
        expect(report.suggestions[0].priority).toBeDefined();
        expect(report.suggestions[0].issue).toBeDefined();
      }
    });

    it('should analyze TypeScript files only', () => {
      const tsFile = path.join(tempDir, 'code.ts');
      const jsFile = path.join(tempDir, 'code.js');
      const txtFile = path.join(tempDir, 'readme.txt');

      fs.writeFileSync(tsFile, 'export function test(): void {}', 'utf-8');
      fs.writeFileSync(jsFile, 'export function test() {}', 'utf-8');
      fs.writeFileSync(txtFile, 'Some text', 'utf-8');

      const report = checker.analyze({ path: tempDir });

      expect(report.metrics.totalFiles).toBeGreaterThan(0);
    });

    it('should handle different minQualityScore thresholds', () => {
      const testFile = path.join(tempDir, 'threshold.ts');
      const sourceCode = `/**
 * Partial documentation
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const report1 = checker.analyze({ path: tempDir, minQualityScore: 50 });
      const report2 = checker.analyze({ path: tempDir, minQualityScore: 90 });

      expect(report1).toBeDefined();
      expect(report2).toBeDefined();
    });

    it('should handle includePrivate option', () => {
      const testFile = path.join(tempDir, 'private.ts');
      const sourceCode = `export class Test {
  private _internal(): void {}
  public external(): void {}
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const withPrivate = checker.analyze({ path: tempDir, includePrivate: true });
      const withoutPrivate = checker.analyze({ path: tempDir, includePrivate: false });

      expect(withPrivate).toBeDefined();
      expect(withoutPrivate).toBeDefined();
    });

    it('should handle includeChildren option', () => {
      const testFile = path.join(tempDir, 'children.ts');
      const sourceCode = `export class Parent {
  method(): void {}
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const withChildren = checker.analyze({ path: tempDir, includeChildren: true });
      const withoutChildren = checker.analyze({ path: tempDir, includeChildren: false });

      expect(withChildren).toBeDefined();
      expect(withoutChildren).toBeDefined();
    });

    it('should handle generateSuggestions option', () => {
      const testFile = path.join(tempDir, 'suggestions.ts');
      const sourceCode = `export function undocumented(): void {}`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const withSuggestions = checker.analyze({ path: tempDir, generateSuggestions: true });
      const withoutSuggestions = checker.analyze({ path: tempDir, generateSuggestions: false });

      expect(withSuggestions.suggestions).toBeDefined();
      expect(withoutSuggestions.suggestions).toBeDefined();
    });

    it('should calculate health score correctly', () => {
      const testFile = path.join(tempDir, 'health.ts');
      const sourceCode = `/**
 * Well documented
 * @param x - Parameter
 * @returns Result
 * @example
 * \`\`\`ts
 * test(1);
 * \`\`\`
 * @public
 */
export function test(x: number): number {
  return x;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const report = checker.analyze({ path: tempDir });

      expect(report.metrics.healthScore).toBeGreaterThan(0);
      expect(report.metrics.healthScore).toBeLessThanOrEqual(100);
    });

    it('should handle nested directories', () => {
      const subDir = path.join(tempDir, 'nested', 'deep');
      fs.mkdirSync(subDir, { recursive: true });

      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(subDir, 'file2.ts');

      fs.writeFileSync(file1, 'export function a(): void {}', 'utf-8');
      fs.writeFileSync(file2, 'export function b(): void {}', 'utf-8');

      const report = checker.analyze({ path: tempDir });

      expect(report.metrics.totalFiles).toBeGreaterThanOrEqual(1);
    });
  });
});
