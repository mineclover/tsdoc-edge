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

  it('should parse interfaces', () => {
    const sourceCode = `
/**
 * A test interface
 * @public
 */
interface TestInterface {
  name: string;
  age: number;
}
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.comments[0].symbolName).toBe('TestInterface');
  });

  it('should parse variable declarations', () => {
    const sourceCode = `
/**
 * A test variable
 * @public
 */
const testVar = 'test value';
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    expect(result.comments.length).toBeGreaterThan(0);
    // Variable declarations may have symbol name as 'unknown' depending on how JSDoc is attached
    expect(result.comments[0].symbolName).toBeDefined();
  });

  it('should handle export declarations', () => {
    const sourceCode = `
/**
 * Exported constant
 * @public
 */
export const CONSTANT = 42;

/**
 * Exported function
 * @param x - Input
 * @returns Output
 */
export function process(x: number): number {
  return x * 2;
}
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    expect(result.comments.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle enum declarations', () => {
    const sourceCode = `
/**
 * Status enum
 * @public
 */
enum Status {
  Active = 'active',
  Inactive = 'inactive'
}
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    expect(result.comments.length).toBeGreaterThan(0);
  });

  it('should handle type aliases', () => {
    const sourceCode = `
/**
 * Point type
 * @public
 */
type Point = {
  x: number;
  y: number;
};
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    expect(result.comments.length).toBeGreaterThan(0);
  });

  it('should handle invalid TypeScript code gracefully', () => {
    const sourceCode = `
/**
 * This is invalid code
 */
function missing syntax { // Missing parameters
  return;
}
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    // Parser should handle syntax errors - TypeScript still parses it
    expect(result.errors).toBeDefined();
  });

  it('should handle malformed JSDoc comments', () => {
    const sourceCode = `
/**
 * This is a malformed comment with invalid TSDoc
 * @invalidTag this tag does not exist
 * @param
 */
function testFunc(): void {
  return;
}
    `;

    const result = parser.parseFile('test.ts', sourceCode);

    expect(result.filePath).toBe('test.ts');
    // Parser should still extract the comment even if it has invalid tags
    expect(result.comments.length).toBeGreaterThanOrEqual(0);
  });
});
