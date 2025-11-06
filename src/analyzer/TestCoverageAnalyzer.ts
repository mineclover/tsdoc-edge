/**
 * Test coverage analyzer
 * @packageDocumentation
 * @responsibility Detect test files and estimate coverage
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestCoverageInfo } from '../types/analysis';

/**
 * Analyzes test coverage by finding test files
 *
 * @public
 * @responsibility Match source files with their test files
 */
export class TestCoverageAnalyzer {
  /**
   * Analyze test coverage for a source file
   *
   * @param sourceFile - Path to source file
   * @returns Test coverage information
   * @public
   */
  analyzeFile(sourceFile: string): TestCoverageInfo {
    const testFile = this.findTestFile(sourceFile);
    const hasTest = !!testFile;

    return {
      sourceFile,
      testFile,
      hasTest,
      symbolCount: 0, // Will be filled by caller
      estimatedCoverage: hasTest ? 50 : 0, // Default estimate
    };
  }

  /**
   * Analyze test coverage for multiple files
   *
   * @param sourceFiles - Array of source file paths
   * @returns Array of test coverage information
   * @public
   */
  analyzeFiles(sourceFiles: string[]): TestCoverageInfo[] {
    return sourceFiles.map((file) => this.analyzeFile(file));
  }

  /**
   * Find test file for a source file
   *
   * @param sourceFile - Path to source file
   * @returns Test file path or undefined
   */
  private findTestFile(sourceFile: string): string | undefined {
    const dir = path.dirname(sourceFile);
    const basename = path.basename(sourceFile, '.ts');

    // Common test file patterns
    const patterns = [
      // Same directory
      path.join(dir, `${basename}.test.ts`),
      path.join(dir, `${basename}.spec.ts`),

      // __tests__ directory (sibling)
      path.join(dir, '__tests__', `${basename}.test.ts`),
      path.join(dir, '__tests__', `${basename}.spec.ts`),

      // tests directory (sibling)
      path.join(dir, 'tests', `${basename}.test.ts`),
      path.join(dir, 'tests', `${basename}.spec.ts`),

      // __tests__ directory (parent)
      path.join(path.dirname(dir), '__tests__', `${basename}.test.ts`),
      path.join(path.dirname(dir), '__tests__', `${basename}.spec.ts`),

      // Convert src/ to __tests__/
      sourceFile
        .replace(/^src\//, 'src/__tests__/')
        .replace('.ts', '.test.ts'),
      sourceFile
        .replace(/^src\//, 'src/__tests__/')
        .replace('.ts', '.spec.ts'),
      sourceFile
        .replace('/src/', '/__tests__/')
        .replace('.ts', '.test.ts'),
      sourceFile.replace('/src/', '/__tests__/').replace('.ts', '.spec.ts'),
    ];

    /**
     * pattern
     * @public
     */
    for (const pattern of patterns) {
      if (fs.existsSync(pattern)) {
        return pattern;
      }
    }

    return undefined;
  }

  /**
   * Calculate test coverage statistics
   *
   * @param coverageInfo - Array of coverage information
   * @returns Coverage statistics
   * @public
   */
  calculateStatistics(coverageInfo: TestCoverageInfo[]): {
    totalFiles: number;
    filesWithTests: number;
    filesWithoutTests: number;
    coveragePercentage: number;
  } {
    const totalFiles = coverageInfo.length;
    const filesWithTests = coverageInfo.filter((info) => info.hasTest).length;
    const filesWithoutTests = totalFiles - filesWithTests;
    const coveragePercentage = totalFiles > 0 ? (filesWithTests / totalFiles) * 100 : 0;

    return {
      totalFiles,
      filesWithTests,
      filesWithoutTests,
      coveragePercentage,
    };
  }

  /**
   * Get files without tests
   *
   * @param coverageInfo - Array of coverage information
   * @returns Array of file paths without tests
   * @public
   */
  getFilesWithoutTests(coverageInfo: TestCoverageInfo[]): string[] {
    return coverageInfo.filter((info) => !info.hasTest).map((info) => info.sourceFile);
  }

  /**
   * Prioritize files for testing
   *
   * @param coverageInfo - Array of coverage information
   * @returns Sorted array by priority (high to low)
   * @public
   */
  prioritizeForTesting(coverageInfo: TestCoverageInfo[]): TestCoverageInfo[] {
    return coverageInfo
      .filter((info) => !info.hasTest)
      .sort((a, b) => {
        // Prioritize by symbol count (more symbols = higher priority)
        return b.symbolCount - a.symbolCount;
      });
  }
}
