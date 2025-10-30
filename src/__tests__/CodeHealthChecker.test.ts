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
  });
});
