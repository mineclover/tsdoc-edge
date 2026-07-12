/**
 * LintCommand - Unified code quality check
 * @packageDocumentation
 */

import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Result of a single lint check category
 */
interface LintResult {
  /** Category name (e.g., 'Code Health', 'Documentation') */
  category: string;
  /** Whether this check passed */
  passed: boolean;
  /** Optional score (0-100) */
  score?: number;
  /** List of issues found */
  issues: string[];
  /** List of warnings found */
  warnings: string[];
}

/**
 * LintCommand - Run all quality checks in one command
 *
 * @doc [[LintCommand]]
 * @public
 */
export class LintCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'lint';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Run all code quality checks';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge lint [options]

  Options:
    --fix          Auto-fix issues where possible
    --strict       Fail on warnings too
    --json         Output as JSON
    --ci           CI mode (exit code based on results)`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const strict = args.includes('--strict');
      const json = args.includes('--json');
      const ci = args.includes('--ci');

      console.log(`${colors.bold}TSDoc Edge - Code Quality Check${colors.reset}`);
      console.log();

      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const db = new DatabaseManager(dbPath, jsonlPath);

      const results: LintResult[] = [];
      let totalIssues = 0;
      let totalWarnings = 0;

      try {
        // 1. Code Health Check
        console.log(`${colors.cyan}[1/4] Checking code health...${colors.reset}`);
        const healthResult = this.checkHealth();
        results.push(healthResult);
        totalIssues += healthResult.issues.length;
        totalWarnings += healthResult.warnings.length;

        // 2. Documentation Coverage
        console.log(`${colors.cyan}[2/4] Checking documentation coverage...${colors.reset}`);
        const docResult = this.checkDocumentation(db);
        results.push(docResult);
        totalIssues += docResult.issues.length;
        totalWarnings += docResult.warnings.length;

        // 3. Relationship Density
        console.log(`${colors.cyan}[3/4] Checking relationship density...${colors.reset}`);
        const relResult = this.checkRelationships(db);
        results.push(relResult);
        totalIssues += relResult.issues.length;
        totalWarnings += relResult.warnings.length;

        // 4. Test Coverage
        console.log(`${colors.cyan}[4/4] Checking test coverage...${colors.reset}`);
        const testResult = this.checkTestCoverage(db);
        results.push(testResult);
        totalIssues += testResult.issues.length;
        totalWarnings += testResult.warnings.length;

        console.log();

        // Output results
        if (json) {
          console.log(JSON.stringify({ results, totalIssues, totalWarnings }, null, 2));
        } else {
          this.printResults(results);
          this.printSummary(results, totalIssues, totalWarnings);
        }

        // Determine exit code
        const failed = totalIssues > 0 || (strict && totalWarnings > 0);

        if (ci) {
          return {
            exitCode: failed ? 1 : 0,
            message: failed
              ? `Quality check failed: ${totalIssues} issues, ${totalWarnings} warnings`
              : 'All quality checks passed',
          };
        }

        return {
          exitCode: 0,
          message: `Lint complete: ${totalIssues} issues, ${totalWarnings} warnings`,
        };
      } finally {
        db.close();
      }
    });
  }

  private checkHealth(): LintResult {
    const checker = new CodeHealthChecker();
    const report = checker.analyze({
      path: 'src',
      includeChildren: true,
      includePrivate: false,
      minQualityScore: 70,
      generateSuggestions: false,
    });

    const issues: string[] = [];
    const warnings: string[] = [];

    if (report.metrics.healthScore < 50) {
      issues.push(`Health score critically low: ${report.metrics.healthScore}/100`);
    } else if (report.metrics.healthScore < 70) {
      warnings.push(`Health score needs improvement: ${report.metrics.healthScore}/100`);
    }

    // Top issues (CodeHealthChecker already filters boilerplate methods)
    // Threshold of 40 means only severely undocumented symbols are reported
    for (const issue of report.topIssues.slice(0, 5)) {
      if (issue.qualityScore < 40) {
        issues.push(`${issue.symbolName}: score ${issue.qualityScore}/100 (${issue.filePath})`);
      }
    }

    return {
      category: 'Code Health',
      passed: issues.length === 0,
      score: report.metrics.healthScore,
      issues,
      warnings,
    };
  }

  private checkDocumentation(db: DatabaseManager): LintResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    const allSymbols = db.getAllSymbolRows();

    // Exclude test symbols and fixture/demo files from documentation requirements
    const implSymbols = allSymbols.filter(
      (s) =>
        s.type !== 'test-case' &&
        s.type !== 'test-suite' &&
        s.type !== 'test-scenario' &&
        !s.file_path?.includes('__tests__') &&
        !s.file_path?.includes('/demo/') &&
        !s.file_path?.includes('/fixtures/') &&
        !s.file_path?.includes('/examples/')
    );

    const documented = implSymbols.filter((s) => s.summary);
    const coverage =
      implSymbols.length > 0 ? Math.round((documented.length / implSymbols.length) * 100) : 0;

    if (coverage < 50) {
      issues.push(`Documentation coverage critically low: ${coverage}%`);
    } else if (coverage < 70) {
      warnings.push(`Documentation coverage needs improvement: ${coverage}%`);
    }

    // Check for undocumented public non-test symbols
    const undocumentedPublic = implSymbols.filter(
      (s) => s.is_public === 1 && s.is_exported === 1 && !s.summary
    );

    // Calculate undocumented ratio
    const exportedPublic = implSymbols.filter((s) => s.is_public === 1 && s.is_exported === 1);
    const undocRatio =
      exportedPublic.length > 0
        ? Math.round((undocumentedPublic.length / exportedPublic.length) * 100)
        : 0;

    if (undocRatio > 50) {
      issues.push(
        `${undocRatio}% of exported symbols undocumented (${undocumentedPublic.length}/${exportedPublic.length})`
      );
    } else if (undocRatio > 30) {
      warnings.push(
        `${undocRatio}% of exported symbols undocumented (${undocumentedPublic.length}/${exportedPublic.length})`
      );
    }

    return {
      category: 'Documentation',
      passed: issues.length === 0,
      score: coverage,
      issues,
      warnings,
    };
  }

  private checkRelationships(db: DatabaseManager): LintResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    const allSymbols = db.getAllSymbolRows();
    const allRelationships = db.getAllUnifiedRelationships();

    // Exclude test symbols and fixture/demo files for accurate metrics
    const implSymbols = allSymbols.filter(
      (s) =>
        s.type !== 'test-case' &&
        s.type !== 'test-suite' &&
        s.type !== 'test-scenario' &&
        !s.file_path?.includes('__tests__') &&
        !s.file_path?.includes('/demo/') &&
        !s.file_path?.includes('/fixtures/') &&
        !s.file_path?.includes('/examples/')
    );

    const density =
      implSymbols.length > 0
        ? Math.round((allRelationships.length / implSymbols.length) * 100) / 100
        : 0;

    // Check for orphaned symbols (no relationships) - excluding test symbols
    const symbolsWithRels = new Set<string>();
    for (const rel of allRelationships) {
      const sources = Array.isArray(rel.from) ? rel.from : [rel.from];
      const targets = Array.isArray(rel.to) ? rel.to : [rel.to];
      for (const s of sources) symbolsWithRels.add(s);
      for (const t of targets) symbolsWithRels.add(t);
    }

    // Only count orphans from top-level implementation symbols (exclude methods/properties)
    // Methods and properties inherit connectivity from their parent class
    const topLevelSymbols = implSymbols.filter((s) => s.type !== 'method' && s.type !== 'property');
    const orphanedCount = topLevelSymbols.filter((s) => !symbolsWithRels.has(s.id)).length;
    const orphanRatio =
      topLevelSymbols.length > 0 ? Math.round((orphanedCount / topLevelSymbols.length) * 100) : 0;

    // Calculate score based on connected ratio (inverse of orphan ratio)
    const connectedRatio = 100 - orphanRatio;
    const score = Math.round(connectedRatio);

    if (orphanRatio > 30) {
      issues.push(
        `${orphanRatio}% of top-level symbols are orphans (${orphanedCount}/${topLevelSymbols.length})`
      );
    } else if (orphanRatio > 15) {
      warnings.push(
        `${orphanRatio}% of top-level symbols are orphans (${orphanedCount}/${topLevelSymbols.length})`
      );
    }

    if (density < 3) {
      warnings.push(`Low relationship density: ${density} rels/symbol`);
    }

    return {
      category: 'Relationships',
      passed: issues.length === 0,
      score,
      issues,
      warnings,
    };
  }

  private checkTestCoverage(db: DatabaseManager): LintResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    const allSymbols = db.getAllSymbolRows();
    const testSymbols = allSymbols.filter((s) => s.type === 'test-case' || s.type === 'test-suite');
    const implSymbols = allSymbols.filter((s) => s.type !== 'test-case' && s.type !== 'test-suite');

    const testRatio =
      implSymbols.length > 0 ? Math.round((testSymbols.length / implSymbols.length) * 100) : 0;

    if (testRatio < 20) {
      issues.push(`Test coverage critically low: ${testRatio}% test-to-impl ratio`);
    } else if (testRatio < 50) {
      warnings.push(`Test coverage needs improvement: ${testRatio}% test-to-impl ratio`);
    }

    return {
      category: 'Test Coverage',
      passed: issues.length === 0,
      score: Math.min(100, testRatio),
      issues,
      warnings,
    };
  }

  private printResults(results: LintResult[]): void {
    console.log(
      `${colors.bold}Results${colors.reset} ${colors.dim}(excluding test-case/test-suite)${colors.reset}`
    );
    console.log();

    for (const result of results) {
      const status = result.passed
        ? `${colors.green}✓${colors.reset}`
        : `${colors.red}✗${colors.reset}`;
      const scoreColor =
        result.score && result.score >= 80
          ? colors.green
          : result.score && result.score >= 60
            ? colors.yellow
            : colors.red;

      console.log(
        `${status} ${colors.bold}${result.category}${colors.reset}${result.score !== undefined ? ` ${scoreColor}(${result.score}/100)${colors.reset}` : ''}`
      );

      for (const issue of result.issues) {
        console.log(`  ${colors.red}✗${colors.reset} ${issue}`);
      }
      for (const warning of result.warnings) {
        console.log(`  ${colors.yellow}!${colors.reset} ${warning}`);
      }
      console.log();
    }
  }

  private printSummary(results: LintResult[], issues: number, warnings: number): void {
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;

    // Calculate overall score (weighted average)
    const scores = results
      .filter((result): result is LintResult & { score: number } => result.score !== undefined)
      .map((result) => result.score);
    const overallScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const grade = this.getGrade(overallScore);
    const gradeColor =
      overallScore >= 80 ? colors.green : overallScore >= 60 ? colors.yellow : colors.red;

    console.log(`${colors.bold}Summary${colors.reset}`);
    console.log(`  Overall: ${gradeColor}${grade} (${overallScore}/100)${colors.reset}`);
    console.log(`  Checks: ${passed}/${total} passed`);
    console.log(`  Issues: ${colors.red}${issues}${colors.reset}`);
    console.log(`  Warnings: ${colors.yellow}${warnings}${colors.reset}`);
    console.log();

    if (issues === 0 && warnings === 0) {
      console.log(`${colors.green}✓ All quality checks passed!${colors.reset}`);
    } else if (issues === 0) {
      console.log(`${colors.yellow}! Quality checks passed with warnings${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Quality checks failed${colors.reset}`);
    }
  }

  private getGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D';
    return 'F';
  }
}
