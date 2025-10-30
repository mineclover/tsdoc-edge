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

      expect(result.modified).toBe(true);
      expect(result.symbolsFixed).toBe(1);

      const fixedContent = fs.readFileSync(testFile, 'utf-8');
      expect(fixedContent).toContain('/**');
      expect(fixedContent).toContain('multiply function');
      expect(fixedContent).toContain('@param');
      expect(fixedContent).toContain('@returns');
      expect(fixedContent).toContain('@public');
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
      const _result = fixer.fixFile(testFile, scores, { minScore: 0 });

      const fixedContent = fs.readFileSync(testFile, 'utf-8');
      expect(fixedContent).toContain('@returns void');
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
      const _result = fixer.fixFile(testFile, scores, { minScore: 0 });

      const fixedContent = fs.readFileSync(testFile, 'utf-8');
      expect(fixedContent).toContain('@returns');
    });
  });
});
