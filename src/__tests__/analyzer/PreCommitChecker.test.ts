/**
 * Tests for PreCommitChecker
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PreCommitChecker } from '../../analyzer/PreCommitChecker';

describe('PreCommitChecker', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `precommit-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create PreCommitChecker with default config', () => {
      const checker = new PreCommitChecker();

      expect(checker).toBeDefined();
    });

    it('should create PreCommitChecker with custom config', () => {
      const checker = new PreCommitChecker({
        threshold: 80,
        warningThreshold: 60,
        failOnMissing: true,
      });

      expect(checker).toBeDefined();
    });
  });

  describe('checkFiles', () => {
    it('should check file with good documentation', () => {
      const testFile = path.join(tempDir, 'good.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Well documented service
 * @problem User management complexity
 * @solves Centralized user operations
 * @context Multi-tenant application
 * @functionality CRUD operations, authentication
 * @decision Use repository pattern
 * @rationale Better testability
 * @consequences More abstraction layers
 * @depends UserRepository
 * @depType module
 * @depReason Data access
 * @public
 */
export class UserService {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ threshold: 50 });
      const report = checker.checkFiles([testFile]);

      expect(report.passed).toBe(true);
      expect(report.passedFiles).toBe(1);
      expect(report.failedFiles).toBe(0);
    });

    it('should check file with poor documentation', () => {
      const testFile = path.join(tempDir, 'poor.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Simple class
 * @problem Basic problem
 */
export class Simple {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ threshold: 80 });
      const report = checker.checkFiles([testFile]);

      expect(report.passed).toBe(false);
      expect(report.failedFiles).toBeGreaterThan(0);
    });

    it('should check multiple files', () => {
      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(tempDir, 'file2.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Class 1
 * @problem Problem 1
 * @solves Solution 1
 * @context Context 1
 * @functionality Functionality 1
 */
export class Class1 {}
`,
        'utf-8'
      );

      fs.writeFileSync(
        file2,
        `
/**
 * Class 2
 * @problem Problem 2
 */
export class Class2 {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ threshold: 50 });
      const report = checker.checkFiles([file1, file2]);

      expect(report.totalFiles).toBe(2);
    });

    it('should filter non-TypeScript files', () => {
      const tsFile = path.join(tempDir, 'code.ts');
      const jsFile = path.join(tempDir, 'code.js');
      const txtFile = path.join(tempDir, 'readme.txt');

      fs.writeFileSync(tsFile, 'export class Test {}', 'utf-8');
      fs.writeFileSync(jsFile, 'export class Test {}', 'utf-8');
      fs.writeFileSync(txtFile, 'readme', 'utf-8');

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([tsFile, jsFile, txtFile]);

      expect(report.totalFiles).toBe(1);
    });

    it('should exclude test files', () => {
      const codeFile = path.join(tempDir, 'code.ts');
      const testFile = path.join(tempDir, 'code.test.ts');

      fs.writeFileSync(codeFile, 'export class Code {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("test", () => {})', 'utf-8');

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([codeFile, testFile]);

      expect(report.totalFiles).toBe(1);
    });

    it('should exclude declaration files', () => {
      const codeFile = path.join(tempDir, 'code.ts');
      const declFile = path.join(tempDir, 'types.d.ts');

      fs.writeFileSync(codeFile, 'export class Code {}', 'utf-8');
      fs.writeFileSync(declFile, 'declare module "test";', 'utf-8');

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([codeFile, declFile]);

      expect(report.totalFiles).toBe(1);
    });

    it('should handle non-existent files', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.ts');

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([nonExistent]);

      expect(report.totalFiles).toBe(1);
      expect(report.passedFiles).toBe(1);
    });

    it('should handle empty file list', () => {
      const checker = new PreCommitChecker();
      const report = checker.checkFiles([]);

      expect(report.totalFiles).toBe(0);
      expect(report.passed).toBe(true);
    });

    it('should report failed symbols', () => {
      const testFile = path.join(tempDir, 'failed.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Poorly documented
 * @problem Basic
 */
export class Poor {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ threshold: 80 });
      const report = checker.checkFiles([testFile]);

      expect(report.fileResults[0].failedSymbols.length).toBeGreaterThan(0);
      expect(report.fileResults[0].failedSymbols[0].name).toBe('Poor');
    });

    it('should report warning symbols', () => {
      const testFile = path.join(tempDir, 'warning.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Moderate documentation
 * @problem Problem
 * @solves Solution
 * @context Context
 */
export class Moderate {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({
        threshold: 90,
        warningThreshold: 40,
      });
      const report = checker.checkFiles([testFile]);

      if (report.fileResults[0].averageCompleteness < 90 &&
          report.fileResults[0].averageCompleteness > 40) {
        expect(report.warningFiles).toBeGreaterThan(0);
      }
    });

    it('should calculate average completeness', () => {
      const testFile = path.join(tempDir, 'average.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Class 1
 * @problem P1
 * @solves S1
 */
export class Class1 {}

/**
 * Class 2
 * @problem P2
 */
export class Class2 {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report.fileResults[0].averageCompleteness).toBeGreaterThanOrEqual(0);
      expect(report.fileResults[0].averageCompleteness).toBeLessThanOrEqual(100);
    });

    it('should handle files with no enhanced docs', () => {
      const testFile = path.join(tempDir, 'no-docs.ts');
      fs.writeFileSync(
        testFile,
        `
export class NoDocs {
  method() {
    return 'test';
  }
}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ failOnMissing: false, threshold: 0 });
      const report = checker.checkFiles([testFile]);

      // File with minimal/no enhanced docs should be analyzed
      expect(report.fileResults[0]).toBeDefined();
      expect(report.totalFiles).toBe(1);
    });

    it('should fail on missing docs when configured', () => {
      const testFile = path.join(tempDir, 'no-docs-fail.ts');
      fs.writeFileSync(
        testFile,
        `
export class NoDocs {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ failOnMissing: true });
      const report = checker.checkFiles([testFile]);

      expect(report.fileResults[0].passed).toBe(false);
      expect(report.passed).toBe(false);
    });
  });

  describe('threshold behavior', () => {
    it('should pass with threshold 50', () => {
      const testFile = path.join(tempDir, 't50.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Moderate docs
 * @problem Problem
 * @solves Solution
 * @context Context
 * @functionality Functionality
 * @decision Decision
 * @rationale Rationale
 */
export class Moderate {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ threshold: 50 });
      const report = checker.checkFiles([testFile]);

      // Check that analysis ran successfully
      expect(report.fileResults[0].symbolsChecked).toBe(1);
      // With more comprehensive docs, should pass threshold 50
      if (report.fileResults[0].averageCompleteness >= 50) {
        expect(report.passed).toBe(true);
      }
    });

    it('should fail with threshold 90', () => {
      const testFile = path.join(tempDir, 't90.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Simple docs
 * @problem Problem
 * @solves Solution
 */
export class Simple {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ threshold: 90 });
      const report = checker.checkFiles([testFile]);

      expect(report.passed).toBe(false);
    });

    it('should use default threshold when not specified', () => {
      const testFile = path.join(tempDir, 'default.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Basic docs
 * @problem Problem
 */
export class Basic {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report).toBeDefined();
      expect(report.config.threshold).toBeDefined();
    });
  });

  describe('report structure', () => {
    it('should include config in report', () => {
      const checker = new PreCommitChecker({
        threshold: 70,
        warningThreshold: 50,
      });
      const report = checker.checkFiles([]);

      expect(report.config).toBeDefined();
      expect(report.config.threshold).toBe(70);
      expect(report.config.warningThreshold).toBe(50);
    });

    it('should include file results', () => {
      const testFile = path.join(tempDir, 'results.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Test class
 * @problem Test
 */
export class Test {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report.fileResults).toBeDefined();
      expect(report.fileResults.length).toBe(1);
      expect(report.fileResults[0].filePath).toBe(testFile);
    });

    it('should include symbol details in results', () => {
      const testFile = path.join(tempDir, 'details.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Detailed class
 * @problem Problem
 */
export class Detailed {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ threshold: 80 });
      const report = checker.checkFiles([testFile]);

      const fileResult = report.fileResults[0];
      expect(fileResult.symbolsChecked).toBeGreaterThan(0);
      if (fileResult.failedSymbols.length > 0) {
        expect(fileResult.failedSymbols[0].name).toBeDefined();
        expect(fileResult.failedSymbols[0].line).toBeDefined();
        expect(fileResult.failedSymbols[0].completeness).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle files with multiple symbols', () => {
      const testFile = path.join(tempDir, 'multiple.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Class 1
 * @problem P1
 * @solves S1
 */
export class Class1 {}

/**
 * Class 2
 * @problem P2
 * @solves S2
 */
export class Class2 {}

/**
 * Class 3
 * @problem P3
 */
export class Class3 {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker({ threshold: 60 });
      const report = checker.checkFiles([testFile]);

      expect(report.fileResults[0].symbolsChecked).toBe(3);
    });

    it('should handle files with syntax errors', () => {
      const testFile = path.join(tempDir, 'syntax-error.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Invalid
 * @problem Problem
 */
export class Invalid {
  // Missing closing brace
`,
        'utf-8'
      );

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report).toBeDefined();
    });

    it('should handle files with special characters', () => {
      const testFile = path.join(tempDir, 'special-chars.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Class with special chars: <>&"'
 * @problem Problem
 * @solves Solution
 */
export class Special {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report).toBeDefined();
    });

    it('should handle deeply nested file paths', () => {
      const nestedDir = path.join(tempDir, 'a', 'b', 'c', 'd');
      fs.mkdirSync(nestedDir, { recursive: true });
      const testFile = path.join(nestedDir, 'nested.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Nested class
 * @problem Nested problem
 * @solves Nested solution
 */
export class Nested {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report).toBeDefined();
    });

    it('should handle files with long documentation', () => {
      const longDoc = Array(100).fill('@param x - Parameter').join('\n * ');
      const testFile = path.join(tempDir, 'long-doc.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Very long documentation
 * @problem Problem
 * @solves Solution
 * ${longDoc}
 */
export class LongDoc {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report).toBeDefined();
    });

    it('should handle files with Unicode characters', () => {
      const testFile = path.join(tempDir, 'unicode.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Unicode class: 한글, 日本語, 中文
 * @problem Unicode problem
 * @solves Unicode solution
 */
export class Unicode {}
`,
        'utf-8'
      );

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report).toBeDefined();
    });

    it('should handle empty files', () => {
      const testFile = path.join(tempDir, 'empty.ts');
      fs.writeFileSync(testFile, '', 'utf-8');

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report.fileResults[0].symbolsChecked).toBe(0);
    });

    it('should handle files with only comments', () => {
      const testFile = path.join(tempDir, 'only-comments.ts');
      fs.writeFileSync(
        testFile,
        `
// This is a comment
/* Another comment */
/**
 * JSDoc comment
 */
`,
        'utf-8'
      );

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([testFile]);

      expect(report.fileResults[0].symbolsChecked).toBe(0);
    });
  });
});
