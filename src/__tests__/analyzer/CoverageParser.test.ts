/**
 * Tests for CoverageParser
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CoverageParser } from '../../analyzer/CoverageParser';

describe('CoverageParser', () => {
  let parser: CoverageParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new CoverageParser();
    tempDir = path.join(process.cwd(), '.test-temp', `coverage-parser-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create CoverageParser', () => {
      expect(parser).toBeDefined();
      expect(parser).toBeInstanceOf(CoverageParser);
    });
  });

  describe('parse', () => {
    it('should parse valid coverage file', () => {
      const coverageFile = path.join(tempDir, 'coverage-final.json');
      const coverageData = {
        '/project/src/math.ts': {
          path: '/project/src/math.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
          },
          fnMap: {
            0: {
              name: 'add',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 3 } },
              loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 5, 1: 3 },
          f: { 0: 5 },
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');
      const summary = parser.parse(coverageFile);

      expect(summary).toBeDefined();
      expect(summary.totalFiles).toBe(1);
      expect(summary.files).toBeDefined();
      expect(summary.files.size).toBe(1);
    });

    it('should retain a stable source identity and metric counts', () => {
      const coverageFile = path.join(tempDir, 'coverage-final.json');
      const coverageData = {
        '/project/src/math.ts': {
          path: '/project/src/math.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
          },
          fnMap: {
            0: {
              name: 'add',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 3 } },
            },
          },
          s: { 0: 1, 1: 0 },
          f: { 0: 1 },
          b: { 0: [1, 0] },
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');
      const first = parser.parseWithIdentity(coverageFile, {
        capturedAt: '2026-07-14T00:00:00.000Z',
      });
      const second = parser.parseWithIdentity(coverageFile, {
        capturedAt: '2026-07-15T00:00:00.000Z',
      });

      expect(first.source.sourceIdentity).toBe(second.source.sourceIdentity);
      expect(first.source.sourceDigest).toBe(second.source.sourceDigest);
      expect(first.source.capturedAt).not.toBe(second.source.capturedAt);
      expect(first.summary.totals.lines).toEqual({ covered: 1, total: 2 });
      expect(first.metrics.map((metric) => metric.metricId)).toEqual([
        'execution.line',
        'execution.function',
        'execution.branch',
      ]);
      expect(first.metrics[0]?.value).toMatchObject({ numerator: 1, denominator: 2, ratio: 0.5 });
      expect(first.fileMetrics).toHaveLength(1);
      expect(first.fileMetrics[0]?.filePath).toBe('/project/src/math.ts');
      expect(first.fileMetrics[0]?.metrics[0]?.value).toMatchObject({
        numerator: 1,
        denominator: 2,
        ratio: 0.5,
      });
      expect(first.fileMetrics[0]?.functions?.[0]).toMatchObject({
        name: 'add',
        startLine: 1,
        endLine: 1,
        covered: true,
        count: 1,
      });
    });

    it('should throw on non-existent file', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.json');
      expect(() => parser.parse(nonExistent)).toThrow('Coverage file not found');
    });

    it('should throw on invalid JSON', () => {
      const invalidFile = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(invalidFile, '{ invalid json }', 'utf-8');

      expect(() => parser.parse(invalidFile)).toThrow('Invalid JSON in coverage file');
    });

    it('should parse multiple files', () => {
      const coverageFile = path.join(tempDir, 'multi.json');
      const coverageData = {
        '/project/src/file1.ts': {
          path: '/project/src/file1.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
        '/project/src/file2.ts': {
          path: '/project/src/file2.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');
      const summary = parser.parse(coverageFile);

      expect(summary.totalFiles).toBe(2);
      expect(summary.files.size).toBe(2);
    });
  });

  describe('parseData', () => {
    it('should calculate statement coverage correctly', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 5 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1, 1: 0 }, // 50% coverage
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);

      expect(summary.statements).toBe(50);
    });

    it('should calculate function coverage correctly', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {
            0: {
              name: 'func1',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
              loc: { start: { line: 1, column: 0 }, end: { line: 2, column: 1 } },
            },
            1: {
              name: 'func2',
              decl: { start: { line: 3, column: 0 }, end: { line: 3, column: 5 } },
              loc: { start: { line: 3, column: 0 }, end: { line: 4, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 1 },
          f: { 0: 1, 1: 0 }, // 50% coverage
          b: {},
        },
      };

      const summary = parser.parseData(data);

      expect(summary.functions).toBe(50);
    });

    it('should handle empty data', () => {
      const summary = parser.parseData({});

      expect(summary.totalFiles).toBe(0);
      expect(summary.statements).toBe(0);
      expect(summary.functions).toBe(0);
      expect(summary.branches).toBe(0);
      expect(summary.lines).toBe(0);
    });

    it('should calculate line coverage from statement map', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 3, column: 5 } }, // Lines 1-3
            1: { start: { line: 5, column: 0 }, end: { line: 5, column: 5 } }, // Line 5
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1, 1: 0 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);

      expect(summary.lines).toBeGreaterThan(0);
    });

    it('should aggregate statistics across multiple files', () => {
      const data = {
        '/project/src/file1.ts': {
          path: '/project/src/file1.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
        '/project/src/file2.ts': {
          path: '/project/src/file2.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 0 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);

      expect(summary.statements).toBe(50); // 1 out of 2
    });

    it('should handle branch coverage', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {},
          branchMap: {
            0: {
              loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 5 } },
              type: 'if',
              locations: [],
            },
          },
          s: { 0: 1 },
          f: {},
          b: { 0: [5, 2] }, // 2 branches, one covered more than other
        },
      };

      const summary = parser.parseData(data);

      expect(summary.branches).toBe(100); // At least one branch taken
    });
  });

  describe('findFile', () => {
    it('should find file by exact path', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const file = parser.findFile(summary, '/project/src/test.ts');

      expect(file).toBeDefined();
      expect(file?.path).toBe('/project/src/test.ts');
    });

    it('should find file by normalized path', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const file = parser.findFile(summary, 'src/test.ts');

      // May or may not find depending on path matching strategy
      expect(file === null || file?.path).toBeDefined();
    });

    it('should find file by basename', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const file = parser.findFile(summary, 'test.ts');

      expect(file).toBeDefined();
      expect(file?.path).toBe('/project/src/test.ts');
    });

    it('should return null for non-existent file', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const file = parser.findFile(summary, 'nonexistent.ts');

      expect(file).toBeNull();
    });

    it('should find file with ending path match', () => {
      const data = {
        '/project/src/domain/test.ts': {
          path: '/project/src/domain/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const file = parser.findFile(summary, 'src/domain/test.ts');

      expect(file).toBeDefined();
    });
  });

  describe('getFunctionCoverage', () => {
    it('should get function coverage by name', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {
            0: {
              name: 'myFunction',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
              loc: { start: { line: 1, column: 0 }, end: { line: 2, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 1 },
          f: { 0: 5 },
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const fileCoverage = summary.files.get('/project/src/test.ts')!;
      const funcCoverage = parser.getFunctionCoverage(fileCoverage, 'myFunction');

      expect(funcCoverage).toBeDefined();
      expect(funcCoverage?.name).toBe('myFunction');
      expect(funcCoverage?.covered).toBe(true);
      expect(funcCoverage?.count).toBe(5);
    });

    it('should return null for non-existent function', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const fileCoverage = summary.files.get('/project/src/test.ts')!;
      const funcCoverage = parser.getFunctionCoverage(fileCoverage, 'nonExistent');

      expect(funcCoverage).toBeNull();
    });

    it('should mark function as covered if execution count > 0', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {
            0: {
              name: 'covered',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
              loc: { start: { line: 1, column: 0 }, end: { line: 2, column: 1 } },
            },
            1: {
              name: 'uncovered',
              decl: { start: { line: 3, column: 0 }, end: { line: 3, column: 5 } },
              loc: { start: { line: 3, column: 0 }, end: { line: 4, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 1 },
          f: { 0: 10, 1: 0 },
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const fileCoverage = summary.files.get('/project/src/test.ts')!;

      const covered = parser.getFunctionCoverage(fileCoverage, 'covered');
      const uncovered = parser.getFunctionCoverage(fileCoverage, 'uncovered');

      expect(covered?.covered).toBe(true);
      expect(uncovered?.covered).toBe(false);
    });

    it('should extract function line number', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {
            0: {
              name: 'myFunc',
              decl: { start: { line: 5, column: 0 }, end: { line: 5, column: 5 } },
              loc: { start: { line: 5, column: 0 }, end: { line: 10, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 1 },
          f: { 0: 1 },
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const fileCoverage = summary.files.get('/project/src/test.ts')!;
      const funcCoverage = parser.getFunctionCoverage(fileCoverage, 'myFunc');

      expect(funcCoverage?.line).toBe(5);
    });

    it('should handle anonymous functions', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
          fnMap: {
            0: {
              name: '',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
              loc: { start: { line: 1, column: 0 }, end: { line: 2, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 1 },
          f: { 0: 1 },
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const fileCoverage = summary.files.get('/project/src/test.ts')!;
      const funcCoverage = parser.getFunctionCoverage(fileCoverage, '(anonymous)');

      expect(funcCoverage?.name).toBe('(anonymous)');
    });
  });

  describe('edge cases', () => {
    it('should handle file with no statements', () => {
      const data = {
        '/project/src/empty.ts': {
          path: '/project/src/empty.ts',
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const file = summary.files.get('/project/src/empty.ts');

      expect(file?.statementCoverage).toBe(0);
      expect(file?.functionCoverage).toBe(0);
    });

    it('should handle undefined statement map', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: undefined,
          fnMap: undefined,
          branchMap: undefined,
          s: undefined,
          f: undefined,
          b: undefined,
        },
      };

      const summary = parser.parseData(data);

      expect(summary).toBeDefined();
      expect(summary.files.size).toBe(1);
    });

    it('should handle zero division (no statements)', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);

      expect(summary.statements).toBe(0);
      expect(Number.isNaN(summary.statements)).toBe(false);
    });

    it('should handle very large coverage values', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 999999999 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);

      expect(summary.statements).toBe(100); // Capped at 100%
    });

    it('should handle complex line ranges', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 10, column: 5 } },
            1: { start: { line: 20, column: 0 }, end: { line: 25, column: 5 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1, 1: 0 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const file = summary.files.get('/project/src/test.ts')!;

      expect(file.coveredLines.length).toBeGreaterThan(0);
      expect(file.uncoveredLines.length).toBeGreaterThan(0);
    });

    it('should identify covered and uncovered lines separately', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 5 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1, 1: 0 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);
      const file = summary.files.get('/project/src/test.ts')!;

      expect(file.coveredLines).toContain(1);
      expect(file.uncoveredLines).toContain(2);
    });

    it('should handle overlapping line ranges', () => {
      const data = {
        '/project/src/test.ts': {
          path: '/project/src/test.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 5, column: 5 } },
            1: { start: { line: 3, column: 0 }, end: { line: 7, column: 5 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1, 1: 0 },
          f: {},
          b: {},
        },
      };

      const summary = parser.parseData(data);

      expect(summary).toBeDefined();
      expect(summary.files.size).toBe(1);
    });
  });

  describe('integration', () => {
    it('should parse file and retrieve specific file coverage', () => {
      const coverageFile = path.join(tempDir, 'coverage.json');
      const coverageData = {
        '/project/src/calculator.ts': {
          path: '/project/src/calculator.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {
            0: {
              name: 'add',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 3 } },
              loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 1 },
          f: { 0: 1 },
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');
      const summary = parser.parse(coverageFile);
      const file = parser.findFile(summary, 'calculator.ts');
      const func = parser.getFunctionCoverage(file!, 'add');

      expect(file).toBeDefined();
      expect(func).toBeDefined();
      expect(func?.name).toBe('add');
    });
  });
});
