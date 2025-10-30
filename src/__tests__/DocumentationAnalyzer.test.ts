/**
 * DocumentationAnalyzer tests
 */

import { DocumentationAnalyzer } from '../analyzer/DocumentationAnalyzer';

describe('DocumentationAnalyzer', () => {
  let analyzer: DocumentationAnalyzer;

  beforeEach(() => {
    analyzer = new DocumentationAnalyzer();
  });

  describe('analyzeFile', () => {
    it('should analyze a function with complete documentation', () => {
      const sourceCode = `
/**
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
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores).toHaveLength(1);
      expect(scores[0].symbolName).toBe('add');
      expect(scores[0].hasDoc).toBe(true);
      expect(scores[0].hasSummary).toBe(true);
      expect(scores[0].hasCompleteParams).toBe(true);
      expect(scores[0].hasReturns).toBe(true);
      expect(scores[0].qualityScore).toBeGreaterThan(80);
    });

    it('should analyze a function with missing documentation', () => {
      const sourceCode = `
export function multiply(x: number, y: number): number {
  return x * y;
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores).toHaveLength(1);
      expect(scores[0].symbolName).toBe('multiply');
      expect(scores[0].hasDoc).toBe(false);
      expect(scores[0].qualityScore).toBe(0);
    });

    it('should skip local variables', () => {
      const sourceCode = `
const localVar = 'hello';

export const exportedVar = 'world';
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      // Should find both variables but only exported one should be public
      const exportedVar = scores.find((s) => s.symbolName === 'exportedVar');
      const localVar = scores.find((s) => s.symbolName === 'localVar');

      expect(exportedVar).toBeDefined();
      expect(exportedVar?.isPublic).toBe(true);

      if (localVar) {
        expect(localVar.isPublic).toBe(false);
      }
    });

    it('should skip catch clause error parameters', () => {
      const sourceCode = `
/**
 * Test function
 * @public
 */
export function test(): void {
  try {
    throw new Error('test');
  } catch (error) {
    console.log(error);
  }
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      // Should only find the function, not the error parameter
      expect(scores).toHaveLength(1);
      expect(scores[0].symbolName).toBe('test');
    });

    it('should analyze void functions correctly', () => {
      const sourceCode = `
/**
 * Print a message
 * @param message - Message to print
 * @returns void - No return value
 * @public
 */
export function printMessage(message: string): void {
  console.log(message);
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores).toHaveLength(1);
      expect(scores[0].symbolName).toBe('printMessage');
      expect(scores[0].hasReturns).toBe(true);
      expect(scores[0].qualityScore).toBeGreaterThan(80);
    });

    it('should analyze class with methods', () => {
      const sourceCode = `
/**
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
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode, true);

      // Should find both class and method
      expect(scores.length).toBeGreaterThanOrEqual(1);
      const classScore = scores.find((s) => s.symbolName === 'Calculator');
      expect(classScore).toBeDefined();
      expect(classScore!.children).toHaveLength(1);
      expect(classScore!.children[0].symbolName).toBe('add');
    });

    it('should analyze file with multiple JSDoc comments', () => {
      const sourceCode = `
/**
 * Utility functions
 * @packageDocumentation
 */

/**
 * Check if string is empty
 * @param str - String to check
 * @returns True if empty
 * @public
 */
export function isEmpty(str: string): boolean {
  return !str || str.length === 0;
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores).toHaveLength(1);
      expect(scores[0].symbolName).toBe('isEmpty');
      expect(scores[0].hasDoc).toBe(true);
      expect(scores[0].hasSummary).toBe(true);
      expect(scores[0].hasCompleteParams).toBe(true);
      expect(scores[0].hasReturns).toBe(true);
    });
  });
});
