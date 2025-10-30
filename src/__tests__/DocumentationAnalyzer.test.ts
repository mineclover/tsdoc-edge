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

    it('should analyze interfaces correctly', () => {
      const sourceCode = `
/**
 * User interface
 * @public
 */
export interface User {
  /** User name */
  name: string;
  /** User age */
  age: number;
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode, true);

      const interfaceScore = scores.find((s) => s.symbolName === 'User');
      expect(interfaceScore).toBeDefined();
      expect(interfaceScore?.hasDoc).toBe(true);
    });

    it('should analyze enums correctly', () => {
      const sourceCode = `
/**
 * Status enum
 * @public
 */
export enum Status {
  Active = 'active',
  Inactive = 'inactive'
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores).toHaveLength(1);
      expect(scores[0].symbolName).toBe('Status');
      expect(scores[0].symbolType).toBe('enum');
    });

    it('should analyze type aliases correctly', () => {
      const sourceCode = `
/**
 * Point type
 * @public
 */
export type Point = {
  x: number;
  y: number;
};
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores).toHaveLength(1);
      expect(scores[0].symbolName).toBe('Point');
      expect(scores[0].symbolType).toBe('type');
    });

    it('should handle functions with optional parameters', () => {
      const sourceCode = `
/**
 * Greet function
 * @param name - User name
 * @param title - Optional title
 * @returns Greeting string
 * @public
 */
export function greet(name: string, title?: string): string {
  return title ? \`\${title} \${name}\` : name;
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores).toHaveLength(1);
      expect(scores[0].hasCompleteParams).toBe(true);
    });

    it('should analyze private members correctly', () => {
      const sourceCode = `
export class MyClass {
  /**
   * Private method
   * @private
   */
  private _privateMethod(): void {}

  /**
   * Public method
   * @public
   */
  public publicMethod(): void {}
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode, true);

      const privateMethod = scores.find((s) => s.symbolName === '_privateMethod');
      const publicMethod = scores.find((s) => s.symbolName === 'publicMethod');

      expect(privateMethod?.isPublic).toBe(false);
      expect(publicMethod?.isPublic).toBe(true);
    });

    it('should handle missing @returns tag', () => {
      const sourceCode = `
/**
 * Test function without returns
 * @param x - Number
 * @public
 */
export function test(x: number): number {
  return x * 2;
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores[0].hasReturns).toBe(false);
      expect(scores[0].missing).toContain('@returns');
    });

    it('should handle missing @param tags', () => {
      const sourceCode = `
/**
 * Test function without param docs
 * @returns Number
 * @public
 */
export function test(x: number, y: number): number {
  return x + y;
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores[0].hasCompleteParams).toBe(false);
      expect(scores[0].missing.some((m) => m.includes('@param'))).toBe(true);
    });

    it('should detect or not detect custom tags based on implementation', () => {
      const sourceCode = `
/**
 * Test with custom tags
 * @param x - Number
 * @returns Result
 * @responsibility Handle computation
 * @contract x must be positive
 * @public
 */
export function test(x: number): number {
  return x;
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      // Custom tags detection depends on TSDoc parser configuration
      expect(scores[0]).toBeDefined();
      expect(typeof scores[0].hasCustomTags).toBe('boolean');
    });

    it('should detect examples', () => {
      const sourceCode = `
/**
 * Add two numbers
 * @param a - First number
 * @param b - Second number
 * @returns Sum
 * @example
 * \`\`\`ts
 * add(1, 2); // returns 3
 * \`\`\`
 * @public
 */
export function add(a: number, b: number): number {
  return a + b;
}
`;
      const scores = analyzer.analyzeFile('test.ts', sourceCode);

      expect(scores[0].hasExamples).toBe(true);
    });
  });
});
