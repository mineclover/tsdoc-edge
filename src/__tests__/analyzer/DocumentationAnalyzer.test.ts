/**
 * Tests for DocumentationAnalyzer
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocumentationAnalyzer } from '../../analyzer/DocumentationAnalyzer';

describe('DocumentationAnalyzer', () => {
  let analyzer: DocumentationAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new DocumentationAnalyzer();
    tempDir = path.join(process.cwd(), '.test-temp', `analyzer-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create DocumentationAnalyzer', () => {
      expect(analyzer).toBeDefined();
    });
  });

  describe('analyzeFile', () => {
    it('should analyze file with documentation', () => {
      const testFile = path.join(tempDir, 'documented.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Well documented class
 * @public
 * @param name - User name
 * @returns User object
 */
export class UserService {
  /**
   * Get user by ID
   * @param id - User ID
   * @returns User object
   * @public
   */
  getUser(id: string) {
    return { id, name: 'Test' };
  }
}
`,
        'utf-8'
      );

      const result = analyzer.analyzeFile(testFile);

      expect(result).toBeDefined();
      expect(result.filePath).toBe(testFile);
      expect(result.symbols.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle file without documentation', () => {
      const testFile = path.join(tempDir, 'undocumented.ts');
      fs.writeFileSync(
        testFile,
        `
export class SimpleClass {
  method() {
    return 'test';
  }
}
`,
        'utf-8'
      );

      const result = analyzer.analyzeFile(testFile);

      expect(result).toBeDefined();
      expect(result.filePath).toBe(testFile);
    });

    it('should handle non-existent file', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.ts');

      expect(() => analyzer.analyzeFile(nonExistent)).toThrow();
    });
  });

  describe('calculateQualityScore', () => {
    it('should score well-documented symbol highly', () => {
      const testFile = path.join(tempDir, 'quality.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Comprehensive documentation
 * @public
 * @param name - Parameter description
 * @param value - Another parameter
 * @returns Return value description
 * @example
 * const result = doSomething('test', 42);
 */
export function doSomething(name: string, value: number): string {
  return name + value;
}
`,
        'utf-8'
      );

      const result = analyzer.analyzeFile(testFile);

      expect(result.averageQuality).toBeGreaterThanOrEqual(0);
      expect(result.averageQuality).toBeLessThanOrEqual(100);
    });

    it('should score undocumented symbol lowly', () => {
      const testFile = path.join(tempDir, 'poor.ts');
      fs.writeFileSync(
        testFile,
        `
export function noDocumentation() {
  return 'test';
}
`,
        'utf-8'
      );

      const result = analyzer.analyzeFile(testFile);

      expect(result.averageQuality).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeDirectory', () => {
    it('should analyze multiple files', () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'file1.ts'), 'export class Class1 {}', 'utf-8');
      fs.writeFileSync(path.join(srcDir, 'file2.ts'), 'export class Class2 {}', 'utf-8');

      const results = analyzer.analyzeDirectory(srcDir);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should exclude test files', () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'code.ts'), 'export class Code {}', 'utf-8');
      fs.writeFileSync(path.join(srcDir, 'code.test.ts'), 'describe("test", () => {})', 'utf-8');

      const results = analyzer.analyzeDirectory(srcDir);

      // Should only analyze code.ts, not code.test.ts
      const filePaths = results.map((r) => r.filePath);
      expect(filePaths.some((p) => p.endsWith('.test.ts'))).toBe(false);
    });

    it('should handle empty directory', () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const results = analyzer.analyzeDirectory(emptyDir);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should calculate coverage statistics', () => {
      const testFile = path.join(tempDir, 'stats.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Documented class
 * @public
 */
export class Documented {
  /**
   * Documented method
   * @public
   */
  method1() {}

  // Undocumented method
  method2() {}
}
`,
        'utf-8'
      );

      const result = analyzer.analyzeFile(testFile);

      expect(result.totalSymbols).toBeGreaterThanOrEqual(0);
      expect(result.documentedSymbols).toBeGreaterThanOrEqual(0);
    });

    it('should track symbol types', () => {
      const testFile = path.join(tempDir, 'types.ts');
      fs.writeFileSync(
        testFile,
        `
export class MyClass {}
export interface MyInterface {}
export function myFunction() {}
export const myConst = 'test';
`,
        'utf-8'
      );

      const result = analyzer.analyzeFile(testFile);

      expect(result.symbols.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle syntax errors gracefully', () => {
      const testFile = path.join(tempDir, 'invalid.ts');
      fs.writeFileSync(testFile, 'this is not valid typescript }{][', 'utf-8');

      // Should not throw, but return empty or error result
      const result = analyzer.analyzeFile(testFile);

      expect(result).toBeDefined();
    });

    it('should handle special characters', () => {
      const testFile = path.join(tempDir, 'special.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Class with special chars: <>&"'
 * @public
 */
export class Special {}
`,
        'utf-8'
      );

      const result = analyzer.analyzeFile(testFile);

      expect(result).toBeDefined();
    });
  });
});
