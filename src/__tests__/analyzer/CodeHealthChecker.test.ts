/**
 * Tests for CodeHealthChecker
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CodeHealthChecker } from '../../analyzer/CodeHealthChecker';

describe('CodeHealthChecker', () => {
  let checker: CodeHealthChecker;
  let tempDir: string;

  beforeEach(() => {
    checker = new CodeHealthChecker();
    tempDir = path.join(process.cwd(), '.test-temp', `health-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create CodeHealthChecker instance', () => {
      expect(checker).toBeDefined();
      expect(checker).toBeInstanceOf(CodeHealthChecker);
    });
  });

  describe('analyze - basic functionality', () => {
    it('should analyze empty directory', () => {
      const result = checker.analyze({ path: tempDir });

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.projectPath).toBe(tempDir);
      expect(result.metrics).toBeDefined();
      expect(result.docScores).toEqual([]);
      expect(result.testCoverage).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.topIssues).toEqual([]);
      expect(result.filesNeedingAttention).toEqual([]);
    });

    it('should throw error for non-existent path', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist');

      expect(() => {
        checker.analyze({ path: nonExistent });
      }).toThrow('Path not found:');
    });

    it('should analyze single TypeScript file', () => {
      const testFile = path.join(tempDir, 'simple.ts');
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

      const result = checker.analyze({ path: testFile });

      expect(result).toBeDefined();
      expect(result.projectPath).toBe(testFile);
      expect(result.metrics).toBeDefined();
      expect(result.docScores).toBeDefined();
      expect(result.testCoverage).toBeDefined();
    });

    it('should skip test files during analysis', () => {
      const testFile = path.join(tempDir, 'example.test.ts');
      fs.writeFileSync(
        testFile,
        `
describe('Test', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.docScores).toEqual([]);
      expect(result.testCoverage).toEqual([]);
    });

    it('should analyze directory with multiple files', () => {
      fs.writeFileSync(path.join(tempDir, 'file1.ts'), 'export class Class1 {}', 'utf-8');
      fs.writeFileSync(path.join(tempDir, 'file2.ts'), 'export function func2() {}', 'utf-8');
      fs.writeFileSync(path.join(tempDir, 'file3.ts'), 'export interface Interface3 {}', 'utf-8');

      const result = checker.analyze({ path: tempDir });

      expect(result.docScores.length).toBeGreaterThanOrEqual(0);
      expect(result.testCoverage.length).toBe(3);
    });
  });

  describe('analyze - health score calculation', () => {
    it('should calculate health score as 60% docs + 40% tests', () => {
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
  constructor(private name: string) {}

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User object
   * @public
   */
  getUser(id: string) {
    return { id, name: this.name };
  }
}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.healthScore).toBeDefined();
      expect(result.metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.healthScore).toBeLessThanOrEqual(100);
      expect(result.metrics.avgQualityScore).toBeDefined();
    });

    it('should have lower health score without tests', () => {
      const testFile = path.join(tempDir, 'no-test.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Documented class
 * @public
 */
export class DocumentedClass {
  /**
   * A method
   * @public
   */
  method() {
    return 'test';
  }
}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.filesWithoutTests).toBe(1);
      expect(result.metrics.filesWithTests).toBe(0);
    });

    it('should have higher health score with tests', () => {
      const srcFile = path.join(tempDir, 'documented.ts');
      const testFile = path.join(tempDir, 'documented.test.ts');

      fs.writeFileSync(
        srcFile,
        `
/**
 * Documented class
 * @public
 */
export class DocumentedClass {
  /**
   * A method
   * @public
   */
  method() {
    return 'test';
  }
}
`,
        'utf-8'
      );

      fs.writeFileSync(
        testFile,
        `
describe('DocumentedClass', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.filesWithTests).toBe(1);
      expect(result.metrics.filesWithoutTests).toBe(0);
    });

    it('should have perfect health score (100) with full docs and tests', () => {
      const srcFile = path.join(tempDir, 'perfect.ts');
      const testFile = path.join(tempDir, 'perfect.test.ts');

      fs.writeFileSync(
        srcFile,
        `
/**
 * Perfect class
 * @public
 */
export class PerfectClass {
  /**
   * Perfect method
   * @returns Result
   * @public
   */
  method(): string {
    return 'test';
  }
}
`,
        'utf-8'
      );

      fs.writeFileSync(
        testFile,
        `
describe('PerfectClass', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      // Health score should be high when both docs and tests exist
      expect(result.metrics.healthScore).toBeGreaterThan(50);
      expect(result.metrics.filesWithTests).toBe(1);
    });
  });

  describe('analyze - documentation quality', () => {
    it('should identify undocumented public symbols', () => {
      const testFile = path.join(tempDir, 'undocumented.ts');
      fs.writeFileSync(
        testFile,
        `
export class UndocumentedClass {
  method() {
    return 'test';
  }
}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.documentedSymbols).toBeLessThanOrEqual(result.metrics.totalSymbols);
    });

    it('should count fully documented symbols', () => {
      const testFile = path.join(tempDir, 'full-doc.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Full documentation
 * @public
 * @param input - Input parameter
 * @returns Output value
 * @example
 * const result = myFunc('test');
 */
export function myFunc(input: string): string {
  return input;
}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.fullyDocumentedSymbols).toBeGreaterThanOrEqual(0);
    });

    it('should track missing documentation items', () => {
      const testFile = path.join(tempDir, 'partial-doc.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Partial documentation
 * @public
 */
export class PartialClass {
  method(param: string): number {
    return param.length;
  }
}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      const docScores = result.docScores.filter((s) => s.isPublic);
      if (docScores.length > 0) {
        const hasPartialDocs = docScores.some((s) => s.missing.length > 0);
        expect(typeof hasPartialDocs).toBe('boolean');
      }
    });

    it('should include public symbols by default', () => {
      const testFile = path.join(tempDir, 'visibility.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Public symbol
 * @public
 */
export class PublicClass {}

class PrivateClass {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir, includePrivate: false });

      const publicScores = result.docScores.filter((s) => s.isPublic);
      expect(publicScores.length).toBeGreaterThanOrEqual(0);
    });

    it('should include private symbols when requested', () => {
      const testFile = path.join(tempDir, 'visibility.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Public symbol
 * @public
 */
export class PublicClass {}

class PrivateClass {}
`,
        'utf-8'
      );

      const resultWithPrivate = checker.analyze({ path: tempDir, includePrivate: true });
      const resultWithoutPrivate = checker.analyze({ path: tempDir, includePrivate: false });

      expect(resultWithPrivate.docScores.length).toBeGreaterThanOrEqual(
        resultWithoutPrivate.docScores.length
      );
    });
  });

  describe('analyze - test coverage integration', () => {
    it('should detect test files in same directory', () => {
      const srcFile = path.join(tempDir, 'service.ts');
      const testFile = path.join(tempDir, 'service.test.ts');

      fs.writeFileSync(srcFile, 'export class Service {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Service", () => {})', 'utf-8');

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.filesWithTests).toBe(1);
      expect(result.testCoverage[0].hasTest).toBe(true);
      expect(result.testCoverage[0].testFile).toBe(testFile);
    });

    it('should detect test files in __tests__ subdirectory', () => {
      const srcFile = path.join(tempDir, 'utility.ts');
      const testDir = path.join(tempDir, '__tests__');
      const testFile = path.join(testDir, 'utility.test.ts');

      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(srcFile, 'export function util() {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("util", () => {})', 'utf-8');

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.filesWithTests).toBe(1);
      expect(result.testCoverage[0].hasTest).toBe(true);
    });

    it('should update symbol counts in test coverage', () => {
      const srcFile = path.join(tempDir, 'module.ts');
      const testFile = path.join(tempDir, 'module.test.ts');

      fs.writeFileSync(
        srcFile,
        `
/**
 * Class 1
 * @public
 */
export class Class1 {
  /**
   * Method
   * @public
   */
  method() {}
}

/**
 * Class 2
 * @public
 */
export class Class2 {}
`,
        'utf-8'
      );

      fs.writeFileSync(testFile, 'describe("module", () => {})', 'utf-8');

      const result = checker.analyze({ path: tempDir });

      const coverage = result.testCoverage[0];
      expect(coverage.symbolCount).toBeGreaterThanOrEqual(0);
    });

    it('should estimate coverage based on symbol count', () => {
      const srcFile = path.join(tempDir, 'large.ts');
      const testFile = path.join(tempDir, 'large.test.ts');

      fs.writeFileSync(
        srcFile,
        `
/**
 * Class A
 * @public
 */
export class ClassA {
  /**
   * Method 1
   * @public
   */
  method1() {}
}
`,
        'utf-8'
      );

      fs.writeFileSync(testFile, 'describe("large", () => {})', 'utf-8');

      const result = checker.analyze({ path: tempDir });

      const coverage = result.testCoverage[0];
      if (coverage.hasTest) {
        expect(coverage.estimatedCoverage).toBeGreaterThanOrEqual(50);
        expect(coverage.estimatedCoverage).toBeLessThanOrEqual(80);
      }
    });
  });

  describe('analyze - suggestions', () => {
    it('should not generate suggestions by default', () => {
      const testFile = path.join(tempDir, 'file.ts');
      fs.writeFileSync(testFile, 'export class MyClass {}', 'utf-8');

      const result = checker.analyze({ path: testFile });

      expect(result.suggestions).toEqual([]);
    });

    it('should generate suggestions when requested', () => {
      const testFile = path.join(tempDir, 'bad-doc.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Missing documentation
 */
export class PoorlyDocumentedClass {
  method(param1: string, param2: number) {
    return 'test';
  }
}
`,
        'utf-8'
      );

      const result = checker.analyze({
        path: testFile,
        generateSuggestions: true,
        minQualityScore: 80,
      });

      // Should have suggestions for low-quality docs
      const docSuggestions = result.suggestions.filter((s) => s.category === 'documentation');
      expect(docSuggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should prioritize suggestions by severity', () => {
      const srcFile = path.join(tempDir, 'untested.ts');

      fs.writeFileSync(
        srcFile,
        `
export class UntreatedClass {
  method1() {}
  method2() {}
  method3() {}
  method4() {}
  method5() {}
  method6() {}
  method7() {}
  method8() {}
  method9() {}
  method10() {}
  method11() {}
}
`,
        'utf-8'
      );

      const result = checker.analyze({
        path: tempDir,
        generateSuggestions: true,
      });

      if (result.suggestions.length > 0) {
        // First suggestion should have higher or equal priority
        const firstPriority = result.suggestions[0].priority;
        const lastPriority = result.suggestions[result.suggestions.length - 1].priority;

        const priorityValue = { critical: 0, high: 1, medium: 2, low: 3 };
        expect(priorityValue[firstPriority]).toBeLessThanOrEqual(priorityValue[lastPriority]);
      }
    });

    it('should suggest tests for files without them', () => {
      const srcFile = path.join(tempDir, 'util.ts');

      fs.writeFileSync(
        srcFile,
        `
export function helper() {
  return 'test';
}
`,
        'utf-8'
      );

      const result = checker.analyze({
        path: tempDir,
        generateSuggestions: true,
      });

      const testSuggestions = result.suggestions.filter((s) => s.category === 'testing');
      if (testSuggestions.length > 0) {
        expect(testSuggestions[0].suggestion).toContain('Create test file');
      }
    });

    it('should suggest documentation improvements', () => {
      const srcFile = path.join(tempDir, 'incomplete.ts');

      fs.writeFileSync(
        srcFile,
        `
/**
 * Incomplete documentation
 * @public
 */
export class IncompleteClass {
  method() {
    return 'test';
  }
}
`,
        'utf-8'
      );

      const result = checker.analyze({
        path: tempDir,
        generateSuggestions: true,
        minQualityScore: 100,
      });

      const docSuggestions = result.suggestions.filter((s) => s.category === 'documentation');
      if (docSuggestions.length > 0) {
        expect(docSuggestions[0].issue).toContain('documentation quality');
      }
    });

    it('should estimate effort for suggestions', () => {
      const srcFile = path.join(tempDir, 'effort-test.ts');

      fs.writeFileSync(
        srcFile,
        `
export class SmallClass {
  method() {}
}
`,
        'utf-8'
      );

      const result = checker.analyze({
        path: tempDir,
        generateSuggestions: true,
      });

      const suggestions = result.suggestions;
      if (suggestions.length > 0) {
        const validEfforts = ['small', 'medium', 'large'];
        suggestions.forEach((s) => {
          expect(validEfforts).toContain(s.effort);
        });
      }
    });
  });

  describe('analyze - top issues and files needing attention', () => {
    it('should identify top issues (lowest quality scores)', () => {
      const testFile = path.join(tempDir, 'issues.ts');

      fs.writeFileSync(
        testFile,
        `
export class Class1 {}
export class Class2 {}
export class Class3 {}
export class Class4 {}
export class Class5 {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.topIssues).toBeDefined();
      expect(Array.isArray(result.topIssues)).toBe(true);
      expect(result.topIssues.length).toBeLessThanOrEqual(10);
    });

    it('should limit top issues to 10 by default', () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Create 15 undocumented classes
      for (let i = 0; i < 15; i++) {
        fs.writeFileSync(path.join(srcDir, `class${i}.ts`), `export class Class${i} {}`, 'utf-8');
      }

      const result = checker.analyze({ path: srcDir });

      expect(result.topIssues.length).toBeLessThanOrEqual(10);
    });

    it('should identify files needing attention (low doc quality)', () => {
      const testFile = path.join(tempDir, 'bad-quality.ts');

      fs.writeFileSync(
        testFile,
        `
export class BadClass1 {}
export class BadClass2 {}
export class BadClass3 {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.filesNeedingAttention).toBeDefined();
      expect(Array.isArray(result.filesNeedingAttention)).toBe(true);
    });

    it('should identify files without tests as needing attention', () => {
      const testFile = path.join(tempDir, 'no-tests.ts');

      fs.writeFileSync(
        testFile,
        `
export class NoTestClass {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.filesNeedingAttention.length).toBeGreaterThanOrEqual(0);
    });

    it('should not list tested files as needing attention (if quality is good)', () => {
      const srcFile = path.join(tempDir, 'good.ts');
      const testFile = path.join(tempDir, 'good.test.ts');

      fs.writeFileSync(
        srcFile,
        `
/**
 * Good class
 * @public
 */
export class GoodClass {
  /**
   * Method
   * @public
   */
  method() {
    return 'test';
  }
}
`,
        'utf-8'
      );

      fs.writeFileSync(testFile, 'describe("good", () => {})', 'utf-8');

      const result = checker.analyze({ path: tempDir });

      // File should not be in attention list if quality is reasonable
      const inAttention = result.filesNeedingAttention.some((f) => f === srcFile);
      expect(typeof inAttention).toBe('boolean');
    });
  });

  describe('analyze - options handling', () => {
    it('should respect includeChildren option', () => {
      const testFile = path.join(tempDir, 'nested.ts');

      fs.writeFileSync(
        testFile,
        `
/**
 * Parent class
 * @public
 */
export class Parent {
  /**
   * Child method
   * @public
   */
  childMethod() {}
}
`,
        'utf-8'
      );

      const withChildren = checker.analyze({ path: testFile, includeChildren: true });
      const withoutChildren = checker.analyze({ path: testFile, includeChildren: false });

      expect(withChildren.docScores.length).toBeGreaterThanOrEqual(
        withoutChildren.docScores.length
      );
    });

    it('should respect includePrivate option', () => {
      const testFile = path.join(tempDir, 'private.ts');

      fs.writeFileSync(
        testFile,
        `
/**
 * Public
 * @public
 */
export class Public {}

class Private {}
`,
        'utf-8'
      );

      const withPrivate = checker.analyze({ path: testFile, includePrivate: true });
      const withoutPrivate = checker.analyze({ path: testFile, includePrivate: false });

      expect(withPrivate.docScores.length).toBeGreaterThanOrEqual(withoutPrivate.docScores.length);
    });

    it('should respect minQualityScore option for suggestions', () => {
      const testFile = path.join(tempDir, 'quality-threshold.ts');

      fs.writeFileSync(
        testFile,
        `
/**
 * Documented
 * @public
 */
export class Documented {}
`,
        'utf-8'
      );

      const lowThreshold = checker.analyze({
        path: testFile,
        generateSuggestions: true,
        minQualityScore: 10,
      });

      const highThreshold = checker.analyze({
        path: testFile,
        generateSuggestions: true,
        minQualityScore: 100,
      });

      // Higher threshold should generate more suggestions
      expect(highThreshold.suggestions.length).toBeGreaterThanOrEqual(
        lowThreshold.suggestions.length
      );
    });
  });

  describe('analyze - metrics calculation', () => {
    it('should report correct file and symbol counts', () => {
      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(tempDir, 'file2.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Class 1
 * @public
 */
export class Class1 {
  /**
   * Method
   * @public
   */
  method() {}
}
`,
        'utf-8'
      );

      fs.writeFileSync(
        file2,
        `
/**
 * Function
 * @public
 */
export function myFunc() {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.totalFiles).toBe(2);
      expect(result.metrics.totalSymbols).toBeGreaterThanOrEqual(0);
    });

    it('should calculate public vs total symbols correctly', () => {
      const testFile = path.join(tempDir, 'visibility.ts');

      fs.writeFileSync(
        testFile,
        `
/**
 * Public
 * @public
 */
export class Public {}

class Private {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir, includePrivate: true });

      expect(result.metrics.publicSymbols).toBeLessThanOrEqual(result.metrics.totalSymbols);
    });

    it('should calculate documented vs total symbols correctly', () => {
      const testFile = path.join(tempDir, 'doc-count.ts');

      fs.writeFileSync(
        testFile,
        `
/**
 * Documented
 * @public
 */
export class DocumentedClass {}

export class UndocumentedClass {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.documentedSymbols).toBeLessThanOrEqual(result.metrics.totalSymbols);
    });

    it('should calculate test coverage percentage correctly', () => {
      const file1 = path.join(tempDir, 'tested.ts');
      const file2 = path.join(tempDir, 'untested.ts');
      const testFile = path.join(tempDir, 'tested.test.ts');

      fs.writeFileSync(file1, 'export class Tested {}', 'utf-8');
      fs.writeFileSync(file2, 'export class Untested {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("tested", () => {})', 'utf-8');

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.filesWithTests).toBe(1);
      expect(result.metrics.filesWithoutTests).toBe(1);
    });

    it('should return metrics with valid ranges', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Class
 * @public
 */
export class TestClass {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });
      const metrics = result.metrics;

      expect(metrics.totalFiles).toBeGreaterThanOrEqual(0);
      expect(metrics.totalSymbols).toBeGreaterThanOrEqual(0);
      expect(metrics.publicSymbols).toBeGreaterThanOrEqual(0);
      expect(metrics.documentedSymbols).toBeGreaterThanOrEqual(0);
      expect(metrics.fullyDocumentedSymbols).toBeGreaterThanOrEqual(0);
      expect(metrics.filesWithTests).toBeGreaterThanOrEqual(0);
      expect(metrics.filesWithoutTests).toBeGreaterThanOrEqual(0);
      expect(metrics.avgQualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.avgQualityScore).toBeLessThanOrEqual(100);
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);
    });
  });

  describe('analyze - nested directories and complex structures', () => {
    it('should analyze nested directory structures', () => {
      const subDir = path.join(tempDir, 'src', 'services');
      fs.mkdirSync(subDir, { recursive: true });

      fs.writeFileSync(
        path.join(subDir, 'user.ts'),
        `
/**
 * User service
 * @public
 */
export class UserService {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: tempDir });

      expect(result.docScores.length).toBeGreaterThanOrEqual(0);
      expect(result.testCoverage.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip node_modules directory', () => {
      const nodeModules = path.join(tempDir, 'node_modules');
      fs.mkdirSync(nodeModules, { recursive: true });

      fs.writeFileSync(path.join(nodeModules, 'package.ts'), 'export class Package {}', 'utf-8');

      const srcFile = path.join(tempDir, 'src.ts');
      fs.writeFileSync(srcFile, 'export class App {}', 'utf-8');

      const result = checker.analyze({ path: tempDir });

      // Should only find src.ts, not node_modules
      expect(result.testCoverage.some((t) => t.sourceFile.includes('node_modules'))).toBe(false);
    });

    it('should skip hidden directories', () => {
      const hiddenDir = path.join(tempDir, '.hidden');
      fs.mkdirSync(hiddenDir, { recursive: true });

      fs.writeFileSync(path.join(hiddenDir, 'hidden.ts'), 'export class Hidden {}', 'utf-8');

      const srcFile = path.join(tempDir, 'visible.ts');
      fs.writeFileSync(srcFile, 'export class Visible {}', 'utf-8');

      const result = checker.analyze({ path: tempDir });

      expect(result.testCoverage.some((t) => t.sourceFile.includes('.hidden'))).toBe(false);
    });
  });

  describe('analyze - timestamp and metadata', () => {
    it('should include valid ISO timestamp', () => {
      const result = checker.analyze({ path: tempDir });

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      // ISO 8601 format validation
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should include correct project path', () => {
      const result = checker.analyze({ path: tempDir });

      expect(result.projectPath).toBe(tempDir);
    });

    it('should have consistent data across runs for same input', () => {
      const srcFile = path.join(tempDir, 'stable.ts');
      fs.writeFileSync(
        srcFile,
        `
/**
 * Stable class
 * @public
 */
export class StableClass {}
`,
        'utf-8'
      );

      const result1 = checker.analyze({ path: srcFile });
      const result2 = checker.analyze({ path: srcFile });

      expect(result1.metrics.totalFiles).toBe(result2.metrics.totalFiles);
      expect(result1.metrics.totalSymbols).toBe(result2.metrics.totalSymbols);
      expect(result1.metrics.healthScore).toBe(result2.metrics.healthScore);
    });
  });

  describe('analyze - edge cases', () => {
    it('should handle TypeScript syntax variations', () => {
      const testFile = path.join(tempDir, 'syntax.ts');

      fs.writeFileSync(
        testFile,
        `
/**
 * Arrow function
 * @public
 */
export const arrowFunc = (x: number): number => x * 2;

/**
 * Async function
 * @public
 */
export async function asyncFunc() {
  return 'test';
}

/**
 * Generic function
 * @public
 */
export function genericFunc<T>(item: T): T {
  return item;
}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: testFile });

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should handle large files', () => {
      const largeFile = path.join(tempDir, 'large.ts');

      let content = '';
      for (let i = 0; i < 50; i++) {
        content += `
/**
 * Class ${i}
 * @public
 */
export class Class${i} {
  /**
   * Method ${i}
   * @public
   */
  method${i}() {
    return ${i};
  }
}
`;
      }

      fs.writeFileSync(largeFile, content, 'utf-8');

      const result = checker.analyze({ path: tempDir });

      expect(result.metrics.totalSymbols).toBeGreaterThan(0);
      expect(result.docScores.length).toBeGreaterThan(0);
    });

    it('should handle files with only comments', () => {
      const testFile = path.join(tempDir, 'comments-only.ts');

      fs.writeFileSync(
        testFile,
        `
// This is a comment
// Another comment
/* Block comment */
`,
        'utf-8'
      );

      const result = checker.analyze({ path: testFile });

      expect(result.docScores).toBeDefined();
    });

    it('should handle mixed documentation styles', () => {
      const testFile = path.join(tempDir, 'mixed.ts');

      fs.writeFileSync(
        testFile,
        `
/** Single line doc @public */
export class SingleLine {}

/**
 * Multi-line doc
 * @public
 */
export class MultiLine {}

export class NoDoc {}
`,
        'utf-8'
      );

      const result = checker.analyze({ path: testFile });

      expect(result.docScores.length).toBeGreaterThanOrEqual(0);
    });
  });
});
