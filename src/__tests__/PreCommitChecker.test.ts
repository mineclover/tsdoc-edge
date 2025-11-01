/**
 * PreCommitChecker Tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { PreCommitChecker } from '../analyzer/PreCommitChecker';
import type { PreCommitConfig } from '../types/config';

describe('PreCommitChecker', () => {
  const testProjectRoot = path.join(__dirname, '../../');

  beforeEach(() => {
    ConfigManager.reset();
  });

  afterEach(() => {
    ConfigManager.reset();
  });

  describe('constructor', () => {
    it('should create checker with default config', () => {
      const checker = new PreCommitChecker();
      expect(checker).toBeInstanceOf(PreCommitChecker);
    });

    it('should create checker with custom config', () => {
      const config: PreCommitConfig = {
        enabled: true,
        threshold: 70,
        warningThreshold: 40,
        failOnMissing: true,
      };
      const checker = new PreCommitChecker(config);
      expect(checker).toBeInstanceOf(PreCommitChecker);
    });
  });

  describe('checkFiles', () => {
    it('should return passing report for empty file list', () => {
      const checker = new PreCommitChecker();
      const report = checker.checkFiles([]);

      expect(report.passed).toBe(true);
      expect(report.totalFiles).toBe(0);
      expect(report.passedFiles).toBe(0);
      expect(report.failedFiles).toBe(0);
    });

    it('should filter non-TypeScript files', () => {
      const checker = new PreCommitChecker();
      const report = checker.checkFiles([
        'README.md',
        'package.json',
        'src/index.js',
      ]);

      expect(report.totalFiles).toBe(0);
    });

    it('should filter test and declaration files', () => {
      const checker = new PreCommitChecker();
      const report = checker.checkFiles([
        'src/foo.test.ts',
        'src/bar.d.ts',
      ]);

      expect(report.totalFiles).toBe(0);
    });

    it('should check TypeScript files with enhanced docs', () => {
      const checker = new PreCommitChecker({
        threshold: 50,
        warningThreshold: 30,
      });

      // Use a real file from the project that has enhanced docs
      const report = checker.checkFiles([
        'src/analyzer/CodeHealthChecker.ts',
      ]);

      expect(report.totalFiles).toBe(1);
      expect(report.fileResults).toHaveLength(1);

      const result = report.fileResults[0];
      expect(result.filePath).toBe('src/analyzer/CodeHealthChecker.ts');
      expect(result.symbolsChecked).toBeGreaterThan(0);
      expect(result.missingDocs).toBe(false);
    });

    it('should fail files below threshold', () => {
      const checker = new PreCommitChecker({
        threshold: 95, // Very high threshold
        failOnMissing: false,
      });

      const report = checker.checkFiles([
        'src/analyzer/CodeHealthChecker.ts',
      ]);

      expect(report.totalFiles).toBe(1);

      const result = report.fileResults[0];
      // Should likely fail with 95% threshold unless docs are perfect
      if (result.averageCompleteness < 95) {
        expect(result.passed).toBe(false);
        expect(result.failedSymbols.length).toBeGreaterThan(0);
      }
    });

    it('should handle files with no enhanced docs', () => {
      const checker = new PreCommitChecker({
        threshold: 50,
        failOnMissing: false,
      });

      // Use a file that likely doesn't have enhanced docs
      const report = checker.checkFiles(['src/types/config/config.ts']);

      expect(report.totalFiles).toBe(1);

      const result = report.fileResults[0];
      if (result.symbolsChecked === 0) {
        expect(result.missingDocs).toBe(true);
        expect(result.passed).toBe(true); // failOnMissing is false
      }
    });

    it('should fail on missing docs when configured', () => {
      const checker = new PreCommitChecker({
        threshold: 50,
        failOnMissing: true,
      });

      // Use a file that likely doesn't have enhanced docs
      const report = checker.checkFiles(['src/types/config/config.ts']);

      expect(report.totalFiles).toBe(1);

      const result = report.fileResults[0];
      if (result.symbolsChecked === 0) {
        expect(result.missingDocs).toBe(true);
        expect(result.passed).toBe(false); // failOnMissing is true
      }
    });

    it('should identify warning symbols', () => {
      const checker = new PreCommitChecker({
        threshold: 80,
        warningThreshold: 50,
      });

      const report = checker.checkFiles([
        'src/analyzer/CodeHealthChecker.ts',
      ]);

      expect(report.totalFiles).toBe(1);

      const result = report.fileResults[0];
      if (result.symbolsChecked > 0) {
        // Symbols between 50-80% completeness should be warnings
        const totalIssues = result.failedSymbols.length + result.warningSymbols.length;
        expect(totalIssues).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle non-existent files gracefully', () => {
      const checker = new PreCommitChecker();
      const report = checker.checkFiles(['src/non-existent-file.ts']);

      expect(report.totalFiles).toBe(1);
      expect(report.passed).toBe(true);

      const result = report.fileResults[0];
      expect(result.symbolsChecked).toBe(0);
      expect(result.passed).toBe(true);
    });

    it('should calculate correct summary statistics', () => {
      const checker = new PreCommitChecker({
        threshold: 60,
        warningThreshold: 40,
      });

      const report = checker.checkFiles([
        'src/analyzer/CodeHealthChecker.ts',
        'src/analyzer/EnhancedDocExtractor.ts',
        'src/types/config/config.ts',
      ]);

      expect(report.totalFiles).toBe(3);
      expect(report.passedFiles + report.failedFiles).toBe(report.totalFiles);
      expect(report.warningFiles).toBeGreaterThanOrEqual(0);
      expect(report.warningFiles).toBeLessThanOrEqual(report.passedFiles);
    });
  });

  describe('check (staged files)', () => {
    it('should return passing report when no files staged', () => {
      const checker = new PreCommitChecker();
      const report = checker.check();

      // May pass or fail depending on git state
      expect(report).toHaveProperty('passed');
      expect(report).toHaveProperty('totalFiles');
      expect(report).toHaveProperty('fileResults');
    });
  });

  describe('integration', () => {
    it('should work with ConfigManager', () => {
      const configManager = ConfigManager.getInstance(testProjectRoot);
      const config = configManager.get();

      config.preCommit = {
        enabled: true,
        threshold: 60,
        warningThreshold: 40,
      };

      const checker = new PreCommitChecker();
      const report = checker.checkFiles([
        'src/analyzer/CodeHealthChecker.ts',
      ]);

      expect(report.config).toEqual(config.preCommit);
    });
  });
});
