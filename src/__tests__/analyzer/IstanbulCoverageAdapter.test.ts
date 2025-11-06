/**
 * Tests for IstanbulCoverageAdapter
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { IstanbulCoverageAdapter } from '../../analyzer/IstanbulCoverageAdapter';

describe('IstanbulCoverageAdapter', () => {
  let adapter: IstanbulCoverageAdapter;
  let tempDir: string;

  beforeEach(() => {
    adapter = new IstanbulCoverageAdapter();
    tempDir = path.join(process.cwd(), '.test-temp', `istanbul-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create IstanbulCoverageAdapter', () => {
      expect(adapter).toBeDefined();
    });
  });

  describe('getName', () => {
    it('should return adapter name', () => {
      const name = adapter.getName();

      expect(name).toBe('Istanbul');
    });
  });

  describe('parseCoverage', () => {
    it('should parse valid Istanbul coverage file', () => {
      const coverageFile = path.join(tempDir, 'coverage-final.json');
      const coverageData = {
        '/project/src/calculator.ts': {
          path: '/project/src/calculator.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 15 } },
          },
          fnMap: {
            0: {
              name: 'add',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 3 } },
              loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 10, 1: 10 },
          f: { 0: 10 },
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary).toBeDefined();
      expect(summary.fileCoverage).toBeDefined();
      expect(Object.keys(summary.fileCoverage).length).toBeGreaterThan(0);
    });

    it('should parse coverage with multiple files', () => {
      const coverageFile = path.join(tempDir, 'coverage-multiple.json');
      const coverageData = {
        '/project/src/file1.ts': {
          path: '/project/src/file1.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 5 },
          f: {},
          b: {},
        },
        '/project/src/file2.ts': {
          path: '/project/src/file2.ts',
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 3 },
          f: {},
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(Object.keys(summary.fileCoverage).length).toBe(2);
    });

    it('should parse coverage with branches', () => {
      const coverageFile = path.join(tempDir, 'coverage-branches.json');
      const coverageData = {
        '/project/src/conditional.ts': {
          path: '/project/src/conditional.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {},
          branchMap: {
            0: {
              loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
              type: 'if',
              locations: [
                { start: { line: 2, column: 0 }, end: { line: 2, column: 5 } },
                { start: { line: 3, column: 0 }, end: { line: 3, column: 5 } },
              ],
            },
          },
          s: { 0: 10 },
          f: {},
          b: { 0: [8, 2] },
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary.fileCoverage['/project/src/conditional.ts']).toBeDefined();
    });

    it('should parse coverage with functions', () => {
      const coverageFile = path.join(tempDir, 'coverage-functions.json');
      const coverageData = {
        '/project/src/math.ts': {
          path: '/project/src/math.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {
            0: {
              name: 'add',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 3 } },
              loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
            },
            1: {
              name: 'subtract',
              decl: { start: { line: 5, column: 0 }, end: { line: 5, column: 8 } },
              loc: { start: { line: 5, column: 0 }, end: { line: 7, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 10 },
          f: { 0: 10, 1: 5 },
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary.fileCoverage['/project/src/math.ts']).toBeDefined();
    });

    it('should handle empty coverage file', () => {
      const coverageFile = path.join(tempDir, 'coverage-empty.json');
      fs.writeFileSync(coverageFile, '{}', 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary.fileCoverage).toBeDefined();
      expect(Object.keys(summary.fileCoverage).length).toBe(0);
    });

    it('should calculate total statistics', () => {
      const coverageFile = path.join(tempDir, 'coverage-stats.json');
      const coverageData = {
        '/project/src/file.ts': {
          path: '/project/src/file.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
          },
          fnMap: {
            0: {
              name: 'func',
              decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 4 } },
              loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
            },
          },
          branchMap: {},
          s: { 0: 10, 1: 0 },
          f: { 0: 10 },
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary.total).toBeDefined();
      expect(summary.total.statements).toBeDefined();
      expect(summary.total.functions).toBeDefined();
    });

    it('should handle non-existent file gracefully', () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.json');

      expect(() => adapter.parseCoverage(nonExistentFile)).toThrow();
    });

    it('should handle malformed JSON', () => {
      const malformedFile = path.join(tempDir, 'malformed.json');
      fs.writeFileSync(malformedFile, '{ invalid json }', 'utf-8');

      expect(() => adapter.parseCoverage(malformedFile)).toThrow();
    });

    it('should parse Jest coverage format', () => {
      const coverageFile = path.join(tempDir, 'jest-coverage.json');
      const jestCoverage = {
        '/project/src/component.ts': {
          path: '/project/src/component.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(jestCoverage), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary).toBeDefined();
      expect(summary.fileCoverage).toBeDefined();
    });

    it('should parse Vitest coverage format', () => {
      const coverageFile = path.join(tempDir, 'vitest-coverage.json');
      const vitestCoverage = {
        '/project/src/utils.ts': {
          path: '/project/src/utils.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 15 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 5 },
          f: {},
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(vitestCoverage), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary).toBeDefined();
      expect(summary.fileCoverage).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle coverage with zero executions', () => {
      const coverageFile = path.join(tempDir, 'coverage-zero.json');
      const coverageData = {
        '/project/src/unused.ts': {
          path: '/project/src/unused.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 0 },
          f: {},
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary.fileCoverage['/project/src/unused.ts']).toBeDefined();
    });

    it('should handle coverage with high execution counts', () => {
      const coverageFile = path.join(tempDir, 'coverage-high.json');
      const coverageData = {
        '/project/src/hot.ts': {
          path: '/project/src/hot.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 999999 },
          f: {},
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary.fileCoverage['/project/src/hot.ts']).toBeDefined();
    });

    it('should handle coverage with special characters in paths', () => {
      const coverageFile = path.join(tempDir, 'coverage-special.json');
      const coverageData = {
        '/project/src/special-file.ts': {
          path: '/project/src/special-file.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary.fileCoverage['/project/src/special-file.ts']).toBeDefined();
    });

    it('should handle coverage with deeply nested structures', () => {
      const coverageFile = path.join(tempDir, 'coverage-nested.json');
      const coverageData = {
        '/project/src/nested/deep/file.ts': {
          path: '/project/src/nested/deep/file.ts',
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      fs.writeFileSync(coverageFile, JSON.stringify(coverageData), 'utf-8');

      const summary = adapter.parseCoverage(coverageFile);

      expect(summary.fileCoverage['/project/src/nested/deep/file.ts']).toBeDefined();
    });
  });
});
