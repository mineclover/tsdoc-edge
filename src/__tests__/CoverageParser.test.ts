/**
 * Tests for CoverageParser
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CoverageParser } from '../analyzer/CoverageParser';

describe('CoverageParser', () => {
  let parser: CoverageParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new CoverageParser();
    tempDir = path.join(__dirname, '__temp__');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('parse', () => {
    test('should parse Istanbul coverage format', () => {
      const coverageData = {
        '/project/src/foo.ts': {
          path: '/project/src/foo.ts',
          s: { '0': 5, '1': 3, '2': 0 },
          f: { '0': 5, '1': 0 },
          b: { '0': [2, 1] },
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
            '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
            '2': { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
          },
          fnMap: {
            '0': { name: 'foo', decl: { start: { line: 1 } } },
            '1': { name: 'bar', decl: { start: { line: 5 } } },
          },
        },
      };

      const coveragePath = path.join(tempDir, 'coverage-final.json');
      fs.writeFileSync(coveragePath, JSON.stringify(coverageData));

      const summary = parser.parse(coveragePath);

      expect(summary.totalFiles).toBe(1);
      expect(summary.statements).toBeCloseTo(66.67, 1);
      expect(summary.functions).toBe(50);
      expect(summary.files.size).toBe(1);
    });

    test('should throw error if file does not exist', () => {
      expect(() => parser.parse('/nonexistent/coverage.json')).toThrow(
        'Coverage file not found'
      );
    });

    test('should throw error if JSON is invalid', () => {
      const coveragePath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(coveragePath, 'invalid json');

      expect(() => parser.parse(coveragePath)).toThrow('Invalid JSON');
    });
  });

  describe('parseData', () => {
    test('should parse multiple files', () => {
      const data = {
        '/project/src/foo.ts': {
          path: '/project/src/foo.ts',
          s: { '0': 5, '1': 5 },
          f: { '0': 5 },
          b: { '0': [2, 1] },
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
            '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
          },
          fnMap: {
            '0': { name: 'foo', decl: { start: { line: 1 } } },
          },
        },
        '/project/src/bar.ts': {
          path: '/project/src/bar.ts',
          s: { '0': 0, '1': 0 },
          f: { '0': 0 },
          b: {},
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
            '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
          },
          fnMap: {
            '0': { name: 'bar', decl: { start: { line: 1 } } },
          },
        },
      };

      const summary = parser.parseData(data);

      expect(summary.totalFiles).toBe(2);
      expect(summary.statements).toBe(50); // 2 out of 4 statements covered
      expect(summary.functions).toBe(50); // 1 out of 2 functions covered
      expect(summary.files.size).toBe(2);
    });

    test('should calculate coverage percentages correctly', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          s: { '0': 10, '1': 5, '2': 0, '3': 0 },
          f: { '0': 10, '1': 0 },
          b: { '0': [5, 0], '1': [3, 2] },
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
            '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
            '2': { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
            '3': { start: { line: 4, column: 0 }, end: { line: 4, column: 10 } },
          },
          fnMap: {
            '0': { name: 'covered', decl: { start: { line: 1 } } },
            '1': { name: 'uncovered', decl: { start: { line: 5 } } },
          },
        },
      };

      const summary = parser.parseData(data);

      expect(summary.statements).toBe(50); // 2/4
      expect(summary.functions).toBe(50); // 1/2
      expect(summary.branches).toBe(100); // 2/2 (both branches have at least one path hit)
    });

    test('should handle empty coverage data', () => {
      const summary = parser.parseData({});

      expect(summary.totalFiles).toBe(0);
      expect(summary.statements).toBe(0);
      expect(summary.functions).toBe(0);
      expect(summary.branches).toBe(0);
      expect(summary.lines).toBe(0);
    });
  });

  describe('findFile', () => {
    let summary: any;

    beforeEach(() => {
      const data = {
        '/project/src/foo.ts': {
          path: '/project/src/foo.ts',
          s: { '0': 5 },
          f: { '0': 5 },
          b: {},
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {
            '0': { name: 'foo', decl: { start: { line: 1 } } },
          },
        },
        '/project/src/bar.ts': {
          path: '/project/src/bar.ts',
          s: { '0': 0 },
          f: { '0': 0 },
          b: {},
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {
            '0': { name: 'bar', decl: { start: { line: 1 } } },
          },
        },
      };

      summary = parser.parseData(data);
    });

    test('should find file by exact path', () => {
      const file = parser.findFile(summary, '/project/src/foo.ts');
      expect(file).toBeDefined();
      expect(file?.path).toBe('/project/src/foo.ts');
    });

    test('should find file by basename', () => {
      const file = parser.findFile(summary, 'foo.ts');
      expect(file).toBeDefined();
      expect(file?.path).toBe('/project/src/foo.ts');
    });

    test('should find file by relative path', () => {
      const file = parser.findFile(summary, 'src/bar.ts');
      expect(file).toBeDefined();
      expect(file?.path).toBe('/project/src/bar.ts');
    });

    test('should return null if file not found', () => {
      const file = parser.findFile(summary, 'nonexistent.ts');
      expect(file).toBeNull();
    });
  });

  describe('getFunctionCoverage', () => {
    test('should get function coverage by name', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          s: { '0': 5 },
          f: { '0': 10, '1': 0 },
          b: {},
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {
            '0': { name: 'covered', decl: { start: { line: 1 } } },
            '1': { name: 'uncovered', decl: { start: { line: 5 } } },
          },
        },
      };

      const summary = parser.parseData(data);
      const file = summary.files.get('/project/src/test.ts')!;

      const covered = parser.getFunctionCoverage(file, 'covered');
      expect(covered).toBeDefined();
      expect(covered?.covered).toBe(true);
      expect(covered?.count).toBe(10);

      const uncovered = parser.getFunctionCoverage(file, 'uncovered');
      expect(uncovered).toBeDefined();
      expect(uncovered?.covered).toBe(false);
      expect(uncovered?.count).toBe(0);
    });

    test('should return null if function not found', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          s: { '0': 5 },
          f: { '0': 5 },
          b: {},
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {
            '0': { name: 'foo', decl: { start: { line: 1 } } },
          },
        },
      };

      const summary = parser.parseData(data);
      const file = summary.files.get('/project/src/test.ts')!;

      const result = parser.getFunctionCoverage(file, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('Line Coverage', () => {
    test('should track covered and uncovered lines', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          s: { '0': 5, '1': 0, '2': 3 },
          f: {},
          b: {},
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 2, column: 10 } },
            '1': { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
            '2': { start: { line: 5, column: 0 }, end: { line: 7, column: 5 } },
          },
          fnMap: {},
        },
      };

      const summary = parser.parseData(data);
      const file = summary.files.get('/project/src/test.ts')!;

      expect(file.coveredLines).toContain(1);
      expect(file.coveredLines).toContain(2);
      expect(file.coveredLines).toContain(5);
      expect(file.coveredLines).toContain(6);
      expect(file.coveredLines).toContain(7);
      expect(file.uncoveredLines).toContain(3);
    });
  });
});
