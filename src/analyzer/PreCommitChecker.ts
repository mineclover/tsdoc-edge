/**
 * Pre-commit Documentation Checker
 *
 * @remarks
 * Validates documentation quality in staged files before commit.
 * Integrates with Git pre-commit hooks to enforce documentation standards.
 *
 * @problem Manual code review can't catch all documentation issues
 * @solves Automated documentation quality checks in CI/CD pipeline
 * @context Need to maintain documentation quality as code changes
 *
 * @functionality Staged file detection, Enhanced docs extraction, Threshold validation, Git integration
 *
 * @decision Use git diff --cached to get staged files
 * @rationale Standard git approach, Works with all git workflows
 * @consequences Requires git repository, Fast and reliable
 *
 * @depends child_process, fs, path, EnhancedDocExtractor
 * @depType external, internal
 * @depReason Git commands for staged files, Enhanced doc parsing
 *
 * @doc [[PreCommitChecker]]
 * @public
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { EnhancedDocExtractor } from '../parser/EnhancedDocExtractor';
import type { PreCommitConfig } from '../types/config';

/**
 * File check result
 *
 * @public
 */
export interface FileCheckResult {
  /**
   * File path (relative to project root)
   */
  filePath: string;

  /**
   * Whether the file passed the check
   */
  passed: boolean;

  /**
   * Number of symbols checked
   */
  symbolsChecked: number;

  /**
   * Average completeness score (0-100)
   */
  averageCompleteness: number;

  /**
   * Symbols that failed threshold check
   */
  failedSymbols: Array<{
    name: string;
    completeness: number;
    line: number;
  }>;

  /**
   * Symbols that passed but need improvement
   */
  warningSymbols: Array<{
    name: string;
    completeness: number;
    line: number;
  }>;

  /**
   * Whether file has no enhanced docs
   */
  missingDocs: boolean;
}

/**
 * Pre-commit check report
 *
 * @public
 */
export interface PreCommitReport {
  /**
   * Whether all files passed
   */
  passed: boolean;

  /**
   * Total files checked
   */
  totalFiles: number;

  /**
   * Files that passed
   */
  passedFiles: number;

  /**
   * Files that failed
   */
  failedFiles: number;

  /**
   * Files with warnings
   */
  warningFiles: number;

  /**
   * Detailed results per file
   */
  fileResults: FileCheckResult[];

  /**
   * Configuration used
   */
  config: PreCommitConfig;
}

/**
 * Pre-commit documentation checker
 *
 * @remarks
 * Checks documentation quality in staged files before commit.
 * Can be integrated with Git hooks or CI/CD pipelines.
 *
 * @example
 * ```typescript
 * const checker = new PreCommitChecker();
 * const report = checker.check();
 *
 * if (!report.passed) {
 *   console.error('Documentation check failed!');
 *   process.exit(1);
 * }
 * ```
 *
 * @public
 */
export class PreCommitChecker {
  private config: PreCommitConfig;
  private extractor: EnhancedDocExtractor;
  private projectRoot: string;

  /**
   * Create pre-commit checker
   *
   * @param config - Pre-commit configuration (optional, uses ConfigManager if not provided)
   */
  constructor(config?: PreCommitConfig) {
    const configManager = ConfigManager.getInstance();
    this.config = config || configManager.get().preCommit || {};
    this.extractor = new EnhancedDocExtractor({
      includePartial: true,
      autoGenerateIds: true,
    });
    this.projectRoot = configManager.getProjectRoot();
  }

  /**
   * Get list of staged TypeScript files
   *
   * @returns Array of staged file paths (relative to project root)
   *
   * @remarks
   * Uses `git diff --cached --name-only` to get staged files.
   * Filters for .ts files (excluding .d.ts and .test.ts).
   */
  private getStagedFiles(): string[] {
    try {
      const output = execSync('git diff --cached --name-only', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });

      return output
        .split('\n')
        .filter((file) => file.trim() !== '')
        .filter(
          (file) =>
            file.endsWith('.ts') &&
            !file.endsWith('.d.ts') &&
            !file.endsWith('.test.ts')
        );
    } catch (error) {
      // Not a git repository or git not available
      return [];
    }
  }

  /**
   * Check documentation in a single file
   *
   * @param filePath - File path (relative to project root)
   * @returns File check result
   */
  private checkFile(filePath: string): FileCheckResult {
    const absolutePath = path.resolve(this.projectRoot, filePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return {
        filePath,
        passed: true,
        symbolsChecked: 0,
        averageCompleteness: 100,
        failedSymbols: [],
        warningSymbols: [],
        missingDocs: false,
      };
    }

    // Extract enhanced docs
    const sourceCode = fs.readFileSync(absolutePath, 'utf-8');
    const results = this.extractor.extractFromFile(absolutePath, sourceCode);

    if (results.length === 0) {
      // No enhanced docs found
      const failOnMissing = this.config.failOnMissing ?? false;
      return {
        filePath,
        passed: !failOnMissing,
        symbolsChecked: 0,
        averageCompleteness: 0,
        failedSymbols: [],
        warningSymbols: [],
        missingDocs: true,
      };
    }

    // Check each symbol against thresholds
    const threshold = this.config.threshold ?? 50;
    const warningThreshold = this.config.warningThreshold ?? 30;

    const failedSymbols: FileCheckResult['failedSymbols'] = [];
    const warningSymbols: FileCheckResult['warningSymbols'] = [];

    for (const result of results) {
      const symbolInfo = {
        name: result.symbol.name,
        completeness: result.completeness,
        line: result.symbol.line,
      };

      if (result.completeness < threshold) {
        failedSymbols.push(symbolInfo);
      } else if (result.completeness < warningThreshold + (threshold - warningThreshold)) {
        warningSymbols.push(symbolInfo);
      }
    }

    const averageCompleteness =
      results.reduce((sum, r) => sum + r.completeness, 0) / results.length;

    return {
      filePath,
      passed: failedSymbols.length === 0,
      symbolsChecked: results.length,
      averageCompleteness,
      failedSymbols,
      warningSymbols,
      missingDocs: false,
    };
  }

  /**
   * Check documentation in all staged files
   *
   * @returns Pre-commit check report
   *
   * @remarks
   * Returns a report with overall status and per-file results.
   * If no files are staged, returns a passing report.
   */
  public check(): PreCommitReport {
    const stagedFiles = this.getStagedFiles();

    if (stagedFiles.length === 0) {
      return {
        passed: true,
        totalFiles: 0,
        passedFiles: 0,
        failedFiles: 0,
        warningFiles: 0,
        fileResults: [],
        config: this.config,
      };
    }

    const fileResults = stagedFiles.map((file) => this.checkFile(file));

    const passedFiles = fileResults.filter((r) => r.passed).length;
    const failedFiles = fileResults.filter((r) => !r.passed).length;
    const warningFiles = fileResults.filter(
      (r) => r.passed && r.warningSymbols.length > 0
    ).length;

    return {
      passed: failedFiles === 0,
      totalFiles: stagedFiles.length,
      passedFiles,
      failedFiles,
      warningFiles,
      fileResults,
      config: this.config,
    };
  }

  /**
   * Check a specific list of files (not just staged)
   *
   * @param files - Array of file paths (relative to project root)
   * @returns Pre-commit check report
   *
   * @remarks
   * Useful for testing or CI/CD pipelines where you want to check
   * specific files rather than only staged files.
   */
  public checkFiles(files: string[]): PreCommitReport {
    const tsFiles = files.filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.endsWith('.d.ts') &&
        !file.endsWith('.test.ts')
    );

    if (tsFiles.length === 0) {
      return {
        passed: true,
        totalFiles: 0,
        passedFiles: 0,
        failedFiles: 0,
        warningFiles: 0,
        fileResults: [],
        config: this.config,
      };
    }

    const fileResults = tsFiles.map((file) => this.checkFile(file));

    const passedFiles = fileResults.filter((r) => r.passed).length;
    const failedFiles = fileResults.filter((r) => !r.passed).length;
    const warningFiles = fileResults.filter(
      (r) => r.passed && r.warningSymbols.length > 0
    ).length;

    return {
      passed: failedFiles === 0,
      totalFiles: tsFiles.length,
      passedFiles,
      failedFiles,
      warningFiles,
      fileResults,
      config: this.config,
    };
  }
}
