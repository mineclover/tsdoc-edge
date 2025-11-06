/**
 * Tests for TestCoverageAnalyzer
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { TestCoverageAnalyzer } from '../../analyzer/TestCoverageAnalyzer';

describe('TestCoverageAnalyzer', () => {
  let analyzer: TestCoverageAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new TestCoverageAnalyzer();
    tempDir = path.join(process.cwd(), '.test-temp', `coverage-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create TestCoverageAnalyzer instance', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(TestCoverageAnalyzer);
    });
  });

  describe('analyzeFile', () => {
    it('should return coverage info with hasTest true when test file exists', () => {
      const sourceFile = path.join(tempDir, 'service.ts');
      const testFile = path.join(tempDir, 'service.test.ts');

      fs.writeFileSync(sourceFile, 'export class Service {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Service", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result).toBeDefined();
      expect(result.sourceFile).toBe(sourceFile);
      expect(result.testFile).toBe(testFile);
      expect(result.hasTest).toBe(true);
      expect(result.estimatedCoverage).toBe(50);
    });

    it('should return coverage info with hasTest false when no test file exists', () => {
      const sourceFile = path.join(tempDir, 'untested.ts');

      fs.writeFileSync(sourceFile, 'export class Untested {}', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result).toBeDefined();
      expect(result.sourceFile).toBe(sourceFile);
      expect(result.testFile).toBeUndefined();
      expect(result.hasTest).toBe(false);
      expect(result.estimatedCoverage).toBe(0);
    });

    it('should initialize symbolCount to 0', () => {
      const sourceFile = path.join(tempDir, 'code.ts');
      fs.writeFileSync(sourceFile, 'export class Code {}', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.symbolCount).toBe(0);
    });

    it('should find .spec.ts test files', () => {
      const sourceFile = path.join(tempDir, 'helper.ts');
      const testFile = path.join(tempDir, 'helper.spec.ts');

      fs.writeFileSync(sourceFile, 'export function helper() {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("helper", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
      expect(result.hasTest).toBe(true);
    });

    it('should prefer .test.ts over .spec.ts when both exist', () => {
      const sourceFile = path.join(tempDir, 'module.ts');
      const testFile = path.join(tempDir, 'module.test.ts');
      const specFile = path.join(tempDir, 'module.spec.ts');

      fs.writeFileSync(sourceFile, 'export class Module {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Module", () => {})', 'utf-8');
      fs.writeFileSync(specFile, 'describe("Module", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
    });
  });

  describe('analyzeFiles', () => {
    it('should analyze multiple source files', () => {
      const sourceFiles = [
        path.join(tempDir, 'file1.ts'),
        path.join(tempDir, 'file2.ts'),
        path.join(tempDir, 'file3.ts'),
      ];

      sourceFiles.forEach((file) => {
        fs.writeFileSync(file, 'export class Test {}', 'utf-8');
      });

      const results = analyzer.analyzeFiles(sourceFiles);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.sourceFile)).toEqual(sourceFiles);
    });

    it('should handle empty array', () => {
      const results = analyzer.analyzeFiles([]);

      expect(results).toEqual([]);
    });

    it('should process files independently', () => {
      const sourceFile1 = path.join(tempDir, 'tested.ts');
      const testFile1 = path.join(tempDir, 'tested.test.ts');
      const sourceFile2 = path.join(tempDir, 'untested.ts');

      fs.writeFileSync(sourceFile1, 'export class Tested {}', 'utf-8');
      fs.writeFileSync(testFile1, 'describe("Tested", () => {})', 'utf-8');
      fs.writeFileSync(sourceFile2, 'export class Untested {}', 'utf-8');

      const results = analyzer.analyzeFiles([sourceFile1, sourceFile2]);

      expect(results).toHaveLength(2);
      expect(results[0].hasTest).toBe(true);
      expect(results[1].hasTest).toBe(false);
    });

    it('should return array of TestCoverageInfo objects', () => {
      const sourceFiles = [path.join(tempDir, 'test.ts')];
      fs.writeFileSync(sourceFiles[0], 'export class Test {}', 'utf-8');

      const results = analyzer.analyzeFiles(sourceFiles);

      expect(Array.isArray(results)).toBe(true);
      expect(results[0]).toHaveProperty('sourceFile');
      expect(results[0]).toHaveProperty('hasTest');
      expect(results[0]).toHaveProperty('estimatedCoverage');
      expect(results[0]).toHaveProperty('symbolCount');
    });
  });

  describe('findTestFile - __tests__ directory patterns', () => {
    it('should find test in __tests__ sibling directory', () => {
      const srcDir = path.join(tempDir, 'src');
      const testsDir = path.join(srcDir, '__tests__');
      fs.mkdirSync(testsDir, { recursive: true });

      const sourceFile = path.join(srcDir, 'utils.ts');
      const testFile = path.join(testsDir, 'utils.test.ts');

      fs.writeFileSync(sourceFile, 'export function utils() {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("utils", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
      expect(result.hasTest).toBe(true);
    });

    it('should find .spec.ts in __tests__ sibling directory', () => {
      const srcDir = path.join(tempDir, 'src');
      const testsDir = path.join(srcDir, '__tests__');
      fs.mkdirSync(testsDir, { recursive: true });

      const sourceFile = path.join(srcDir, 'parser.ts');
      const testFile = path.join(testsDir, 'parser.spec.ts');

      fs.writeFileSync(sourceFile, 'export class Parser {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Parser", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
    });

    it('should find test in __tests__ parent directory of nested files', () => {
      // When source is at src/modules/auth.ts, the parent directory of src/modules is src
      // So this test checks if we look for __tests__ at that parent level
      const srcDir = path.join(tempDir, 'src');
      const modulesDir = path.join(srcDir, 'modules');
      const testsDir = path.join(srcDir, '__tests__');

      fs.mkdirSync(modulesDir, { recursive: true });
      fs.mkdirSync(testsDir, { recursive: true });

      const sourceFile = path.join(modulesDir, 'auth.ts');
      const testFile = path.join(testsDir, 'auth.test.ts');

      fs.writeFileSync(sourceFile, 'export class Auth {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Auth", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
    });
  });

  describe('findTestFile - tests directory patterns', () => {
    it('should find test in tests sibling directory', () => {
      const srcDir = path.join(tempDir, 'src');
      const testsDir = path.join(srcDir, 'tests');
      fs.mkdirSync(testsDir, { recursive: true });

      const sourceFile = path.join(srcDir, 'validator.ts');
      const testFile = path.join(testsDir, 'validator.test.ts');

      fs.writeFileSync(sourceFile, 'export class Validator {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Validator", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
    });

    it('should find .spec.ts in tests sibling directory', () => {
      const srcDir = path.join(tempDir, 'src');
      const testsDir = path.join(srcDir, 'tests');
      fs.mkdirSync(testsDir, { recursive: true });

      const sourceFile = path.join(srcDir, 'database.ts');
      const testFile = path.join(testsDir, 'database.spec.ts');

      fs.writeFileSync(sourceFile, 'export class Database {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Database", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
    });
  });

  describe('findTestFile - src to __tests__ conversion', () => {
    it('should find test by converting /src/ to /__tests__/', () => {
      const srcDir = path.join(tempDir, 'src');
      const testDir = path.join(tempDir, '__tests__');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDir, { recursive: true });

      const sourceFile = path.join(srcDir, 'logger.ts');
      const testFile = path.join(testDir, 'logger.test.ts');

      fs.writeFileSync(sourceFile, 'export class Logger {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Logger", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
      expect(result.hasTest).toBe(true);
    });

    it('should find .spec.ts by converting /src/ to /__tests__/', () => {
      const srcDir = path.join(tempDir, 'src');
      const testDir = path.join(tempDir, '__tests__');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDir, { recursive: true });

      const sourceFile = path.join(srcDir, 'router.ts');
      const testFile = path.join(testDir, 'router.spec.ts');

      fs.writeFileSync(sourceFile, 'export class Router {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Router", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
    });

    it('should handle nested directories when converting src to __tests__', () => {
      const srcDir = path.join(tempDir, 'src', 'modules', 'auth');
      const testDir = path.join(tempDir, '__tests__', 'modules', 'auth');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDir, { recursive: true });

      const sourceFile = path.join(srcDir, 'oauth.ts');
      const testFile = path.join(testDir, 'oauth.test.ts');

      fs.writeFileSync(sourceFile, 'export class OAuth {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("OAuth", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate coverage percentage correctly', () => {
      const coverageInfo = [
        {
          sourceFile: 'file1.ts',
          testFile: 'file1.test.ts',
          hasTest: true,
          symbolCount: 5,
          estimatedCoverage: 50,
        },
        {
          sourceFile: 'file2.ts',
          hasTest: false,
          symbolCount: 3,
          estimatedCoverage: 0,
        },
      ];

      const stats = analyzer.calculateStatistics(coverageInfo);

      expect(stats.totalFiles).toBe(2);
      expect(stats.filesWithTests).toBe(1);
      expect(stats.filesWithoutTests).toBe(1);
      expect(stats.coveragePercentage).toBe(50);
    });

    it('should return 100% coverage when all files have tests', () => {
      const coverageInfo = [
        {
          sourceFile: 'file1.ts',
          testFile: 'file1.test.ts',
          hasTest: true,
          symbolCount: 10,
          estimatedCoverage: 50,
        },
        {
          sourceFile: 'file2.ts',
          testFile: 'file2.test.ts',
          hasTest: true,
          symbolCount: 8,
          estimatedCoverage: 50,
        },
      ];

      const stats = analyzer.calculateStatistics(coverageInfo);

      expect(stats.coveragePercentage).toBe(100);
      expect(stats.filesWithTests).toBe(2);
      expect(stats.filesWithoutTests).toBe(0);
    });

    it('should return 0% coverage when no files have tests', () => {
      const coverageInfo = [
        {
          sourceFile: 'file1.ts',
          hasTest: false,
          symbolCount: 5,
          estimatedCoverage: 0,
        },
        {
          sourceFile: 'file2.ts',
          hasTest: false,
          symbolCount: 3,
          estimatedCoverage: 0,
        },
      ];

      const stats = analyzer.calculateStatistics(coverageInfo);

      expect(stats.coveragePercentage).toBe(0);
      expect(stats.filesWithTests).toBe(0);
      expect(stats.filesWithoutTests).toBe(2);
    });

    it('should handle empty coverage info array', () => {
      const stats = analyzer.calculateStatistics([]);

      expect(stats.totalFiles).toBe(0);
      expect(stats.filesWithTests).toBe(0);
      expect(stats.filesWithoutTests).toBe(0);
      expect(stats.coveragePercentage).toBe(0);
    });

    it('should handle single file with test', () => {
      const coverageInfo = [
        {
          sourceFile: 'single.ts',
          testFile: 'single.test.ts',
          hasTest: true,
          symbolCount: 1,
          estimatedCoverage: 50,
        },
      ];

      const stats = analyzer.calculateStatistics(coverageInfo);

      expect(stats.totalFiles).toBe(1);
      expect(stats.filesWithTests).toBe(1);
      expect(stats.coveragePercentage).toBe(100);
    });

    it('should handle single file without test', () => {
      const coverageInfo = [
        {
          sourceFile: 'single.ts',
          hasTest: false,
          symbolCount: 1,
          estimatedCoverage: 0,
        },
      ];

      const stats = analyzer.calculateStatistics(coverageInfo);

      expect(stats.totalFiles).toBe(1);
      expect(stats.filesWithTests).toBe(0);
      expect(stats.coveragePercentage).toBe(0);
    });

    it('should handle fractional coverage percentages', () => {
      const coverageInfo = Array(3)
        .fill(null)
        .map((_, i) => ({
          sourceFile: `file${i}.ts`,
          testFile: i === 0 ? `file${i}.test.ts` : undefined,
          hasTest: i === 0,
          symbolCount: 5,
          estimatedCoverage: i === 0 ? 50 : 0,
        }));

      const stats = analyzer.calculateStatistics(coverageInfo);

      expect(stats.totalFiles).toBe(3);
      expect(stats.filesWithTests).toBe(1);
      expect(stats.coveragePercentage).toBeCloseTo(33.33, 1);
    });
  });

  describe('getFilesWithoutTests', () => {
    it('should return only files without tests', () => {
      const coverageInfo = [
        {
          sourceFile: 'tested.ts',
          testFile: 'tested.test.ts',
          hasTest: true,
          symbolCount: 5,
          estimatedCoverage: 50,
        },
        {
          sourceFile: 'untested1.ts',
          hasTest: false,
          symbolCount: 3,
          estimatedCoverage: 0,
        },
        {
          sourceFile: 'untested2.ts',
          hasTest: false,
          symbolCount: 4,
          estimatedCoverage: 0,
        },
      ];

      const result = analyzer.getFilesWithoutTests(coverageInfo);

      expect(result).toEqual(['untested1.ts', 'untested2.ts']);
      expect(result).not.toContain('tested.ts');
    });

    it('should return empty array when all files have tests', () => {
      const coverageInfo = [
        {
          sourceFile: 'file1.ts',
          testFile: 'file1.test.ts',
          hasTest: true,
          symbolCount: 5,
          estimatedCoverage: 50,
        },
        {
          sourceFile: 'file2.ts',
          testFile: 'file2.test.ts',
          hasTest: true,
          symbolCount: 3,
          estimatedCoverage: 50,
        },
      ];

      const result = analyzer.getFilesWithoutTests(coverageInfo);

      expect(result).toEqual([]);
    });

    it('should return all files when none have tests', () => {
      const coverageInfo = [
        {
          sourceFile: 'file1.ts',
          hasTest: false,
          symbolCount: 5,
          estimatedCoverage: 0,
        },
        {
          sourceFile: 'file2.ts',
          hasTest: false,
          symbolCount: 3,
          estimatedCoverage: 0,
        },
      ];

      const result = analyzer.getFilesWithoutTests(coverageInfo);

      expect(result).toHaveLength(2);
      expect(result).toContain('file1.ts');
      expect(result).toContain('file2.ts');
    });

    it('should handle empty array', () => {
      const result = analyzer.getFilesWithoutTests([]);

      expect(result).toEqual([]);
    });

    it('should preserve file paths exactly', () => {
      const file1 = '/absolute/path/to/file1.ts';
      const file2 = '/absolute/path/to/file2.ts';

      const coverageInfo = [
        {
          sourceFile: file1,
          hasTest: false,
          symbolCount: 5,
          estimatedCoverage: 0,
        },
        {
          sourceFile: file2,
          hasTest: false,
          symbolCount: 3,
          estimatedCoverage: 0,
        },
      ];

      const result = analyzer.getFilesWithoutTests(coverageInfo);

      expect(result).toEqual([file1, file2]);
    });
  });

  describe('prioritizeForTesting', () => {
    it('should sort files by symbol count in descending order', () => {
      const coverageInfo = [
        {
          sourceFile: 'small.ts',
          hasTest: false,
          symbolCount: 2,
          estimatedCoverage: 0,
        },
        {
          sourceFile: 'large.ts',
          hasTest: false,
          symbolCount: 10,
          estimatedCoverage: 0,
        },
        {
          sourceFile: 'medium.ts',
          hasTest: false,
          symbolCount: 5,
          estimatedCoverage: 0,
        },
      ];

      const result = analyzer.prioritizeForTesting(coverageInfo);

      expect(result[0].sourceFile).toBe('large.ts');
      expect(result[1].sourceFile).toBe('medium.ts');
      expect(result[2].sourceFile).toBe('small.ts');
    });

    it('should exclude files with tests', () => {
      const coverageInfo = [
        {
          sourceFile: 'tested.ts',
          testFile: 'tested.test.ts',
          hasTest: true,
          symbolCount: 100,
          estimatedCoverage: 50,
        },
        {
          sourceFile: 'untested.ts',
          hasTest: false,
          symbolCount: 5,
          estimatedCoverage: 0,
        },
      ];

      const result = analyzer.prioritizeForTesting(coverageInfo);

      expect(result).toHaveLength(1);
      expect(result[0].sourceFile).toBe('untested.ts');
    });

    it('should handle empty array', () => {
      const result = analyzer.prioritizeForTesting([]);

      expect(result).toEqual([]);
    });

    it('should handle all files with tests', () => {
      const coverageInfo = [
        {
          sourceFile: 'file1.ts',
          testFile: 'file1.test.ts',
          hasTest: true,
          symbolCount: 5,
          estimatedCoverage: 50,
        },
        {
          sourceFile: 'file2.ts',
          testFile: 'file2.test.ts',
          hasTest: true,
          symbolCount: 3,
          estimatedCoverage: 50,
        },
      ];

      const result = analyzer.prioritizeForTesting(coverageInfo);

      expect(result).toEqual([]);
    });

    it('should return TestCoverageInfo with all properties', () => {
      const coverageInfo = [
        {
          sourceFile: 'file.ts',
          hasTest: false,
          symbolCount: 5,
          estimatedCoverage: 0,
        },
      ];

      const result = analyzer.prioritizeForTesting(coverageInfo);

      expect(result[0]).toHaveProperty('sourceFile');
      expect(result[0]).toHaveProperty('hasTest');
      expect(result[0]).toHaveProperty('symbolCount');
      expect(result[0]).toHaveProperty('estimatedCoverage');
    });

    it('should handle files with same symbol count', () => {
      const coverageInfo = [
        {
          sourceFile: 'file1.ts',
          hasTest: false,
          symbolCount: 5,
          estimatedCoverage: 0,
        },
        {
          sourceFile: 'file2.ts',
          hasTest: false,
          symbolCount: 5,
          estimatedCoverage: 0,
        },
      ];

      const result = analyzer.prioritizeForTesting(coverageInfo);

      expect(result).toHaveLength(2);
      expect(result[0].symbolCount).toBe(5);
      expect(result[1].symbolCount).toBe(5);
    });

    it('should handle zero symbol count', () => {
      const coverageInfo = [
        {
          sourceFile: 'empty.ts',
          hasTest: false,
          symbolCount: 0,
          estimatedCoverage: 0,
        },
        {
          sourceFile: 'nonempty.ts',
          hasTest: false,
          symbolCount: 5,
          estimatedCoverage: 0,
        },
      ];

      const result = analyzer.prioritizeForTesting(coverageInfo);

      expect(result[0].sourceFile).toBe('nonempty.ts');
      expect(result[1].sourceFile).toBe('empty.ts');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle file without .ts extension', () => {
      const sourceFile = path.join(tempDir, 'file.js');
      fs.writeFileSync(sourceFile, 'export const test = 1;', 'utf-8');

      // Should not throw
      const result = analyzer.analyzeFile(sourceFile);

      expect(result).toBeDefined();
      expect(result.sourceFile).toBe(sourceFile);
    });

    it('should handle deeply nested directories', () => {
      const deepDir = path.join(tempDir, 'a', 'b', 'c', 'd', 'e');
      fs.mkdirSync(deepDir, { recursive: true });

      const sourceFile = path.join(deepDir, 'deep.ts');
      fs.writeFileSync(sourceFile, 'export class Deep {}', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result).toBeDefined();
      expect(result.sourceFile).toBe(sourceFile);
    });

    it('should handle file paths with special characters', () => {
      const fileName = 'my-special_file.123.ts';
      const sourceFile = path.join(tempDir, fileName);
      const testFile = path.join(tempDir, 'my-special_file.123.test.ts');

      fs.writeFileSync(sourceFile, 'export class Special {}', 'utf-8');
      fs.writeFileSync(testFile, 'describe("Special", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile);
      expect(result.hasTest).toBe(true);
    });

    it('should not fail with non-existent source file path', () => {
      const sourceFile = path.join(tempDir, 'nonexistent.ts');

      // Should not throw
      const result = analyzer.analyzeFile(sourceFile);

      expect(result).toBeDefined();
      expect(result.sourceFile).toBe(sourceFile);
      expect(result.hasTest).toBe(false);
    });

    it('should handle multiple test files (first match wins)', () => {
      const sourceFile = path.join(tempDir, 'multi.ts');
      const testFile1 = path.join(tempDir, 'multi.test.ts');
      const testFile2 = path.join(tempDir, '__tests__', 'multi.test.ts');

      fs.mkdirSync(path.join(tempDir, '__tests__'), { recursive: true });
      fs.writeFileSync(sourceFile, 'export class Multi {}', 'utf-8');
      fs.writeFileSync(testFile1, 'describe("Multi", () => {})', 'utf-8');
      fs.writeFileSync(testFile2, 'describe("Multi", () => {})', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result.testFile).toBe(testFile1);
    });

    it('should handle very long file paths', () => {
      const longName = 'a'.repeat(100);
      const sourceFile = path.join(tempDir, `${longName}.ts`);
      fs.writeFileSync(sourceFile, 'export class A {}', 'utf-8');

      const result = analyzer.analyzeFile(sourceFile);

      expect(result).toBeDefined();
      expect(result.sourceFile).toBe(sourceFile);
    });

    it('should calculate statistics with large numbers', () => {
      const coverageInfo = Array(1000)
        .fill(null)
        .map((_, i) => ({
          sourceFile: `file${i}.ts`,
          testFile: i % 3 === 0 ? `file${i}.test.ts` : undefined,
          hasTest: i % 3 === 0,
          symbolCount: i,
          estimatedCoverage: i % 3 === 0 ? 50 : 0,
        }));

      const stats = analyzer.calculateStatistics(coverageInfo);

      expect(stats.totalFiles).toBe(1000);
      expect(stats.filesWithTests).toBe(334); // 1000 / 3 ≈ 333.33
      expect(stats.filesWithoutTests).toBe(666);
      expect(stats.coveragePercentage).toBeCloseTo(33.4, 0);
    });
  });

  describe('integration scenarios', () => {
    it('should analyze project with mixed test coverage', () => {
      const srcDir = path.join(tempDir, 'src');
      const testDir = path.join(tempDir, '__tests__');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDir, { recursive: true });

      // Create source files
      const files = ['auth.ts', 'logger.ts', 'utils.ts', 'config.ts', 'parser.ts'];
      files.forEach((file) => {
        fs.writeFileSync(path.join(srcDir, file), `export class ${file.split('.')[0]} {}`, 'utf-8');
      });

      // Create tests for some files
      fs.writeFileSync(path.join(testDir, 'auth.test.ts'), 'describe("auth", () => {})', 'utf-8');
      fs.writeFileSync(path.join(testDir, 'logger.test.ts'), 'describe("logger", () => {})', 'utf-8');

      const sourceFiles = files.map((f) => path.join(srcDir, f));
      const coverage = analyzer.analyzeFiles(sourceFiles);
      const stats = analyzer.calculateStatistics(coverage);
      const untested = analyzer.getFilesWithoutTests(coverage);

      expect(coverage).toHaveLength(5);
      expect(stats.filesWithTests).toBe(2);
      expect(stats.coveragePercentage).toBe(40);
      expect(untested).toHaveLength(3);
    });

    it('should prioritize files correctly in real scenario', () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const coverage = [
        {
          sourceFile: path.join(srcDir, 'small.ts'),
          hasTest: false,
          symbolCount: 2,
          estimatedCoverage: 0,
        },
        {
          sourceFile: path.join(srcDir, 'large.ts'),
          hasTest: false,
          symbolCount: 50,
          estimatedCoverage: 0,
        },
        {
          sourceFile: path.join(srcDir, 'tested.ts'),
          testFile: path.join(srcDir, 'tested.test.ts'),
          hasTest: true,
          symbolCount: 100,
          estimatedCoverage: 50,
        },
        {
          sourceFile: path.join(srcDir, 'medium.ts'),
          hasTest: false,
          symbolCount: 15,
          estimatedCoverage: 0,
        },
      ];

      const prioritized = analyzer.prioritizeForTesting(coverage);

      expect(prioritized).toHaveLength(3);
      expect(prioritized[0].symbolCount).toBe(50);
      expect(prioritized[1].symbolCount).toBe(15);
      expect(prioritized[2].symbolCount).toBe(2);
    });
  });
});
