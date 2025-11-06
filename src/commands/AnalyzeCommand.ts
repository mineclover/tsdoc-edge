/**
 * Analyze command - Analyzes code health for a directory
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';
import type { AnalysisReport } from '../types/analysis';

/**
 * Command for analyzing code health
 *
 * @public
 * @responsibility Analyze code health for a directory
 * @contract Execute code health analysis and return formatted report
 *
 * @problem Developers need to understand code quality metrics across a directory
 * @solves Analyzes code health with configurable options and generates detailed reports
 * @context Part of quality assurance system for documentation and code standards
 *
 * @functionality
 * - Directory analysis: Scan and analyze all files in target path
 * - Option parsing: Support for --no-children, --include-private, --min-score flags
 * - Quality metrics: Calculate documentation coverage, quality scores, test coverage
 * - Report generation: Format and display analysis results with colors
 *
 * @decision Use CodeHealthChecker with configurable options
 * @rationale Allows flexible analysis based on user needs
 * @consequences Users can customize analysis depth and scope
 *
 * @depends CodeHealthChecker, AnalysisReport
 * @depType internal
 * @depReason Core analysis logic and type definitions
 */
export class AnalyzeCommand extends BaseCommand {
  private checker: CodeHealthChecker;

  constructor(checker?: CodeHealthChecker) {
    super();
    this.checker = checker || new CodeHealthChecker();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'analyze';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Analyze code health for a directory';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      let targetPath = args[0] || 'src';
      let includeChildren = true;
      let includePrivate = false;
      let minQualityScore = 70;

      // Parse options
      for (const arg of args) {
        if (arg.startsWith('--no-children')) {
          includeChildren = false;
        } else if (arg.startsWith('--include-private')) {
          includePrivate = true;
        } else if (arg.startsWith('--min-score=')) {
          minQualityScore = Number.parseInt(arg.split('=')[1], 10);
        } else if (!arg.startsWith('--')) {
          targetPath = arg;
        }
      }

      this.printHeader('TSDoc Edge - Code Analysis');

      if (!fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        return this.failure(`Path not found: ${targetPath}`);
      }

      this.printInfo(`Analyzing: ${targetPath}`);
      this.printInfo(`Include children: ${includeChildren}`);
      this.printInfo(`Include private: ${includePrivate}`);
      this.printInfo(`Min quality score: ${minQualityScore}`);
      console.log();

      const report = this.checker.analyze({
        path: targetPath,
        includeChildren,
        includePrivate,
        minQualityScore,
        generateSuggestions: false,
      });

      this.printAnalysisReport(report);

      return this.success();
    });
  }

  /**
   * Print analysis report
   */
  private printAnalysisReport(report: AnalysisReport): void {
    const { metrics } = report;

    this.printSection('📊 Overall Metrics');
    console.log(`   Total Files: ${colors.green}${metrics.totalFiles}${colors.reset}`);
    console.log(`   Total Symbols: ${colors.green}${metrics.totalSymbols}${colors.reset}`);
    console.log(`   Public Symbols: ${colors.green}${metrics.publicSymbols}${colors.reset}`);
    console.log(
      `   Documented Symbols: ${colors.green}${metrics.documentedSymbols}${colors.reset} (${Math.round((metrics.documentedSymbols / metrics.totalSymbols) * 100)}%)`
    );
    console.log(
      `   Fully Documented: ${colors.green}${metrics.fullyDocumentedSymbols}${colors.reset} (${Math.round((metrics.fullyDocumentedSymbols / metrics.totalSymbols) * 100)}%)`
    );
    console.log();

    this.printSection('🧪 Test Coverage');
    console.log(`   Files with Tests: ${colors.green}${metrics.filesWithTests}${colors.reset}`);
    console.log(
      `   Files without Tests: ${colors.yellow}${metrics.filesWithoutTests}${colors.reset}`
    );
    console.log(
      `   Coverage: ${this.getScoreColor(Math.round((metrics.filesWithTests / metrics.totalFiles) * 100))}${Math.round((metrics.filesWithTests / metrics.totalFiles) * 100)}%${colors.reset}`
    );
    console.log();

    this.printSection('📈 Quality Scores');
    console.log(
      `   Average Doc Quality: ${this.getScoreColor(metrics.avgQualityScore)}${metrics.avgQualityScore}/100${colors.reset}`
    );
    console.log(
      `   Overall Health Score: ${this.getScoreColor(metrics.healthScore)}${metrics.healthScore}/100${colors.reset}`
    );
    console.log();

    // Top issues
    if (report.topIssues.length > 0) {
      this.printSection('⚠️  Top Issues (Lowest Quality Scores)');
      for (let i = 0; i < Math.min(10, report.topIssues.length); i++) {
        const issue = report.topIssues[i];
        console.log(
          `   ${i + 1}. ${colors.yellow}${issue.symbolName}${colors.reset} (${this.getScoreColor(issue.qualityScore)}${issue.qualityScore}/100${colors.reset}) - ${issue.filePath}:${issue.line}`
        );
        if (issue.missing.length > 0) {
          console.log(`      Missing: ${colors.red}${issue.missing.join(', ')}${colors.reset}`);
        }
      }
      console.log();
    }

    // Files needing attention
    if (report.filesNeedingAttention.length > 0) {
      this.printSection('📁 Files Needing Attention');
      for (const file of report.filesNeedingAttention.slice(0, 10)) {
        console.log(`   • ${file}`);
      }
      if (report.filesNeedingAttention.length > 10) {
        console.log(`   ... and ${report.filesNeedingAttention.length - 10} more`);
      }
      console.log();
    }
  }

  /**
   * Get color based on score
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return colors.green;
    if (score >= 60) return colors.yellow;
    return colors.red;
  }
}
