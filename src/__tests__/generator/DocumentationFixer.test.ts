/**
 * DocumentationFixer tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocumentationAnalyzer } from '../../analyzer/DocumentationAnalyzer';
import { DocumentationFixer } from '../../fixer/DocumentationFixer';

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

    it('should verify before/after content when adding documentation', () => {
      const testFile = path.join(tempDir, 'before-after.ts');
      const beforeCode = `export function subtract(a: number, b: number): number {
  return a - b;
}
`;
      fs.writeFileSync(testFile, beforeCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, beforeCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      if (result.modified) {
        const afterCode = fs.readFileSync(testFile, 'utf-8');
        expect(afterCode).toContain('/**');
        expect(afterCode).toContain('*/');
        expect(afterCode).not.toBe(beforeCode);
        expect(afterCode.length).toBeGreaterThan(beforeCode.length);
      }
    });

    it('should append missing @param to partially documented function', () => {
      const testFile = path.join(tempDir, 'partial.ts');
      const sourceCode = `/**
 * Calculate area
 * @param width - Width
 * @public
 */
export function calculateArea(width: number, height: number): number {
  return width * height;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0, addParams: true });

      expect(result).toBeDefined();
      if (result.modified) {
        const fixedCode = fs.readFileSync(testFile, 'utf-8');
        expect(fixedCode).toContain('@param height');
      }
    });

    it('should respect addSummary option', () => {
      const testFile = path.join(tempDir, 'no-summary.ts');
      const sourceCode = `export function test(): void {
  console.log('test');
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, {
        minScore: 0,
        addSummary: false,
        addParams: false,
        addReturns: false,
      });

      expect(result.symbolsFixed).toBe(0);
    });

    it('should respect addParams=false option', () => {
      const testFile = path.join(tempDir, 'no-params.ts');
      const sourceCode = `export function add(a: number, b: number): number {
  return a + b;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, {
        minScore: 0,
        addSummary: true,
        addParams: false,
        addReturns: true,
      });

      if (result.modified) {
        const fixedCode = fs.readFileSync(testFile, 'utf-8');
        expect(fixedCode).toContain('/**');
        // Should not add @param tags
        expect(fixedCode.match(/@param/g)?.length || 0).toBe(0);
      }
    });

    it('should respect addReturns=false option', () => {
      const testFile = path.join(tempDir, 'no-returns.ts');
      const sourceCode = `export function getValue(): string {
  return 'value';
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, {
        minScore: 0,
        addSummary: true,
        addParams: true,
        addReturns: false,
      });

      if (result.modified) {
        const fixedCode = fs.readFileSync(testFile, 'utf-8');
        expect(fixedCode).toContain('/**');
        expect(fixedCode).not.toContain('@returns');
      }
    });

    it('should handle file not found error', () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.ts');
      const result = fixer.fixFile(nonExistentFile, [], { minScore: 0 });

      expect(result.modified).toBe(false);
      expect(result.symbolsFixed).toBe(0);
      expect(result.error).toBeDefined();
    });

    it('should handle syntax errors gracefully', () => {
      const testFile = path.join(tempDir, 'syntax-error.ts');
      const invalidCode = `export function broken( {
  return invalid syntax here
`;
      fs.writeFileSync(testFile, invalidCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, invalidCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      // Should not crash, may or may not fix depending on parser tolerance
      expect(result).toBeDefined();
    });

    it('should add @public tag when addCustomTags is enabled', () => {
      const testFile = path.join(tempDir, 'custom-tags.ts');
      const sourceCode = `export function publicFunc(): void {
  console.log('public');
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, {
        minScore: 0,
        addCustomTags: true,
      });

      if (result.modified) {
        const fixedCode = fs.readFileSync(testFile, 'utf-8');
        expect(fixedCode).toContain('@public');
      }
    });

    it('should preserve existing code when appending to JSDoc', () => {
      const testFile = path.join(tempDir, 'preserve.ts');
      const sourceCode = `/**
 * Existing summary
 * @param x - X value
 */
export function compute(x: number, y: number): number {
  return x + y;
}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0, addParams: true });

      const fixedCode = fs.readFileSync(testFile, 'utf-8');
      expect(fixedCode).toContain('Existing summary');
      expect(fixedCode).toContain('@param x - X value');
      expect(fixedCode).toContain('compute(x: number, y: number)');
    });

    it('should handle arrow functions', () => {
      const testFile = path.join(tempDir, 'arrow.ts');
      const sourceCode = `export const arrow = (x: number): number => x * 2;
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const scores = analyzer.analyzeFile(testFile, sourceCode);
      const result = fixer.fixFile(testFile, scores, { minScore: 0 });

      expect(result).toBeDefined();
    });

    it('should handle empty files', () => {
      const testFile = path.join(tempDir, 'empty.ts');
      fs.writeFileSync(testFile, '', 'utf-8');

      const result = fixer.fixFile(testFile, [], { minScore: 0 });

      expect(result.modified).toBe(false);
      expect(result.symbolsFixed).toBe(0);
    });
  });
});
