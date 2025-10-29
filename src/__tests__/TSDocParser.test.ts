/**
 * Tests for TSDocParser
 */

import { TSDocParser } from '../parser/TSDocParser';

describe('TSDocParser', () => {
  let parser: TSDocParser;

  beforeEach(() => {
    parser = new TSDocParser();
  });

  it('should create a parser instance', () => {
    expect(parser).toBeInstanceOf(TSDocParser);
  });

  it('should parse a simple function with TSDoc comment', () => {
    const sourceCode = `
/**
 * Adds two numbers
 * @param a - First number
 * @param b - Second number
 * @returns Sum of a and b
 * @public
 */
function add(a: number, b: number): number {
  return a + b;
}
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  });

  it('should handle files without TSDoc comments', () => {
    const sourceCode = `
function add(a: number, b: number): number {
  return a + b;
}
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    expect(result.comments.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should parse multiple symbols in a file', () => {
    const sourceCode = `
/**
 * A test class
 * @public
 */
class TestClass {
  /**
   * A test method
   * @returns A string
   */
  testMethod(): string {
    return 'test';
  }
}

/**
 * A test function
 * @param x - A number
 * @returns Double the input
 */
function double(x: number): number {
  return x * 2;
}
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    expect(result.comments.length).toBeGreaterThanOrEqual(2);
  });
});
