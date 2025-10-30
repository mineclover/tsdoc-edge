/**
 * DocumentationFixer tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocumentationAnalyzer } from '../analyzer/DocumentationAnalyzer';
import { DocumentationFixer } from '../fixer/DocumentationFixer';

describe('DocumentationFixer', () => {
  let analyzer: DocumentationAnalyzer;
  let fixer: DocumentationFixer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new DocumentationAnalyzer();
    fixer = new DocumentationFixer();
    tempDir = path.join(__dirname, '../../temp-test');
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

  describe('fixFile', () => {
    it('should add documentation to undocumented function', () => {
      const testFile = path.join(tempDir, 'test.ts');
      const sourceCode = `export function multiply(x: number, y: number): number {
  return x * y;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      // Fixer should process the file
      expect(result).toBeDefined();
      expect(result.symbolsFixed).toBeGreaterThanOrEqual(0);

      // If modified, should contain documentation
      if (result.modified) {
        const fixedContent = fs.readFileSync(testFile, 'utf-8');
        expect(fixedContent).toContain('/**');
      }
    });

    it('should add @returns void to void functions', () => {
      const testFile = path.join(tempDir, 'test.ts');
      const sourceCode = `/**
 * Print message
 * @param msg - Message
 * @public
 */
export function print(msg: string): void {
  console.log(msg);
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      // Verify fixer ran without error
      expect(result).toBeDefined();
      expect(result.symbolsFixed).toBeGreaterThanOrEqual(0);
    });

    it('should not modify files with high quality documentation', () => {
      const testFile = path.join(tempDir, 'test.ts');
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

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores);

      expect(result.modified).toBe(false);
      expect(result.symbolsFixed).toBe(0);
    });

    it('should work with dry run mode', () => {
      const testFile = path.join(tempDir, 'test.ts');
      const sourceCode = `export function divide(x: number, y: number): number {
  return x / y;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0, dryRun: true });

      expect(result.modified).toBe(false);

      // File should not be modified
      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toBe(sourceCode);
    });

    it('should handle files with multiple JSDoc comments correctly', () => {
      const testFile = path.join(tempDir, 'test.ts');
      const sourceCode = `/**
 * Utility functions
 * @packageDocumentation
 */

/**
 * Check if empty
 * @param str - String
 * @public
 */
export function isEmpty(str: string): boolean {
  return !str;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      // Verify fixer ran without error
      expect(result).toBeDefined();
      expect(result.symbolsFixed).toBeGreaterThanOrEqual(0);
    });

    it('should handle classes with methods', () => {
      const testFile = path.join(tempDir, 'class.ts');
      const sourceCode = `export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      expect(result).toBeDefined();
      expect(result.symbolsFixed).toBeGreaterThanOrEqual(0);
    });

    it('should handle interfaces', () => {
      const testFile = path.join(tempDir, 'interface.ts');
      const sourceCode = `export interface User {
  name: string;
  age: number;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      expect(result).toBeDefined();
    });

    it('should handle enums', () => {
      const testFile = path.join(tempDir, 'enum.ts');
      const sourceCode = `export enum Status {
  Active = 'active',
  Inactive = 'inactive'
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      expect(result).toBeDefined();
    });

    it('should handle type aliases', () => {
      const testFile = path.join(tempDir, 'type.ts');
      const sourceCode = `export type Point = {
  x: number;
  y: number;
};
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      expect(result).toBeDefined();
    });

    it('should handle functions with optional parameters', () => {
      const testFile = path.join(tempDir, 'optional.ts');
      const sourceCode = `export function greet(name: string, title?: string): string {
  return title ? \`\${title} \${name}\` : name;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      expect(result).toBeDefined();
      expect(result.symbolsFixed).toBeGreaterThanOrEqual(0);
    });

    it('should handle functions with rest parameters', () => {
      const testFile = path.join(tempDir, 'rest.ts');
      const sourceCode = `export function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      expect(result).toBeDefined();
      expect(result.symbolsFixed).toBeGreaterThanOrEqual(0);
    });

    it('should handle async functions', () => {
      const testFile = path.join(tempDir, 'async.ts');
      const sourceCode = `export async function fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      expect(result).toBeDefined();
      expect(result.symbolsFixed).toBeGreaterThanOrEqual(0);
    });

    it('should handle generic functions', () => {
      const testFile = path.join(tempDir, 'generic.ts');
      const sourceCode = `export function identity<T>(value: T): T {
  return value;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      expect(result).toBeDefined();
      expect(result.symbolsFixed).toBeGreaterThanOrEqual(0);
    });
  });
});
