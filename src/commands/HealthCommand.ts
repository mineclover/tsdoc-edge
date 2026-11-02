/**
 * Health command - Check code health and generate report
 *
 * @packageDocumentation
 * @doc [[HealthCommand]]
 * @context Top-level `health` command for rapid codebase quality and documentation health assessment
 * @functionality Evaluates target source directories via `CodeHealthChecker`, computes letter grades, and emits human, XML, or file reports
 * @sideEffect console: Writes formatted health grades, metrics, and recommendations to stdout
 * @sideEffect filesystem: Scans source files and writes optional `--output` health reports on disk
 */

import * as fs from 'node:fs';
import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';
import type { AnalysisReport, CodeHealthMetrics } from '../types/analysis';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for checking code health
 *
 * @doc [[HealthCommand]]
 * @public
 * @responsibility Check code health and generate health report
 * @contract Execute health check and return formatted health report
 * @sideEffect console: Writes formatted health report to stdout; scans source files and writes optional `--output` file
 *
 * @problem Developers need quick overview of codebase health status
 * @solves Provides concise health report with grade, recommendations, and key metrics
 * @context Part of quality monitoring system for quick health assessment
 *
 * @functionality
 * - Health analysis: Run code health check on target directory
 * - Grade calculation: Compute health grade (A+ to F) from metrics
 * - Recommendations: Provide actionable improvement suggestions
 * - Quick stats: Display key metrics summary
 *
 * @decision Focus on quick health overview vs detailed analysis
 * @rationale Users need fast health snapshot without overwhelming detail
 * @consequences Simpler output than AnalyzeCommand, more actionable
 */
export class HealthCommand extends BaseCommand {
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
    return 'health';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['h'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Check code health and generate report';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge health [directory] [options]

  Default: src
  Options:
    --human  Human-readable terminal report (default)
    --json   Structured JSON report
    --xml    XML report`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(args, ['--human', '--json', '--xml']);
      if (flagError) {
        return flagError;
      }

      // Filter out flags to get positional arguments
      const positionalArgs = args.filter((arg) => !arg.startsWith('-'));
      const targetPath = positionalArgs[0] || 'src';

      if (!fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        return this.failure(`Path not found: ${targetPath}`);
      }

      const report = this.checker.analyze({
        path: targetPath,
        includeChildren: true,
        includePrivate: false,
        minQualityScore: 70,
        generateSuggestions: false,
      });

      const { metrics } = report;
      const healthScore = metrics.healthScore;
      const healthGrade = this.getHealthGrade(healthScore);
      const docScore = metrics.avgQualityScore;
      const testScore =
        metrics.totalFiles > 0
          ? Math.round((metrics.filesWithTests / metrics.totalFiles) * 100)
          : 0;
      const documentedPercent =
        metrics.totalSymbols > 0
          ? Math.round((metrics.documentedSymbols / metrics.totalSymbols) * 100)
          : 0;

      const recommendations: string[] = [];
      if (healthScore >= 80) {
        recommendations.push('Your codebase health is excellent!');
        recommendations.push('Keep maintaining this quality standard.');
      } else if (healthScore >= 60) {
        recommendations.push('Your codebase health is good but can be improved.');
        recommendations.push(`Focus on: ${this.getHealthFocus(metrics)}`);
      } else if (healthScore >= 40) {
        recommendations.push('Your codebase health needs attention.');
        recommendations.push(`Priority: ${this.getHealthFocus(metrics)}`);
      } else {
        recommendations.push('Your codebase health is critical.');
        recommendations.push(`Urgent action required: ${this.getHealthFocus(metrics)}`);
      }

      if (this.hasFlag(args, '--json')) {
        console.log(
          JSON.stringify(
            {
              target: { path: targetPath },
              overall: { healthScore, healthGrade, maxScore: 100 },
              breakdown: { documentationQuality: docScore, testCoverage: testScore },
              recommendations,
              statistics: {
                totalSymbols: metrics.totalSymbols,
                documented: metrics.documentedSymbols,
                documentedPercent,
                filesWithTests: metrics.filesWithTests,
                totalFiles: metrics.totalFiles,
                filesNeedingAttention: report.filesNeedingAttention.length,
              },
            },
            null,
            2
          )
        );
      } else if (this.hasFlag(args, '--xml')) {
        this.printOutput(
          'health',
          {
            target: {
              path: targetPath,
            },
            overall: {
              healthScore,
              healthGrade,
              maxScore: 100,
            },
            breakdown: {
              documentationQuality: docScore,
              testCoverage: testScore,
            },
            recommendations: recommendations.map((text) => ({ text })),
            statistics: {
              totalSymbols: metrics.totalSymbols,
              documented: metrics.documentedSymbols,
              documentedPercent,
              filesWithTests: metrics.filesWithTests,
              totalFiles: metrics.totalFiles,
              filesNeedingAttention: report.filesNeedingAttention.length,
            },
          },
          args
        );
      } else {
        // Human-readable output (default, also accepted explicitly via --human)
        this.printHeader('TSDoc Edge - Health Check');
        this.printInfo(`Checking health: ${targetPath}`);
        console.log();
        this.printHealthReport(report);
      }

      return this.success();
    });
  }

  /**
   * Print health report
   */
  private printHealthReport(report: AnalysisReport): void {
    const { metrics } = report;

    const healthScore = metrics.healthScore;
    const healthGrade = this.getHealthGrade(healthScore);
    const healthEmoji = this.getHealthEmoji(healthScore);

    this.printSection(`${healthEmoji} Overall Health: ${healthGrade} (${healthScore}/100)`);
    console.log();

    // Show health breakdown
    const docScore = metrics.avgQualityScore;
    const testScore =
      metrics.totalFiles > 0 ? Math.round((metrics.filesWithTests / metrics.totalFiles) * 100) : 0;

    console.log(
      `   📝 Documentation Quality: ${this.getScoreColor(docScore)}${docScore}/100${colors.reset}`
    );
    console.log(
      `   🧪 Test Coverage: ${this.getScoreColor(testScore)}${testScore}/100${colors.reset}`
    );
    console.log();

    // Health recommendations
    this.printSection('💡 Recommendations');
    if (healthScore >= 80) {
      console.log(`   ${colors.green}✓${colors.reset} Your codebase health is excellent!`);
      console.log(`   ${colors.green}✓${colors.reset} Keep maintaining this quality standard.`);
    } else if (healthScore >= 60) {
      console.log(
        `   ${colors.yellow}!${colors.reset} Your codebase health is good but can be improved.`
      );
      console.log(`   ${colors.yellow}!${colors.reset} Focus on: ${this.getHealthFocus(metrics)}`);
    } else if (healthScore >= 40) {
      console.log(`   ${colors.yellow}⚠${colors.reset} Your codebase health needs attention.`);
      console.log(`   ${colors.yellow}⚠${colors.reset} Priority: ${this.getHealthFocus(metrics)}`);
    } else {
      console.log(`   ${colors.red}❌${colors.reset} Your codebase health is critical.`);
      console.log(
        `   ${colors.red}❌${colors.reset} Urgent action required: ${this.getHealthFocus(metrics)}`
      );
    }
    console.log();

    // Quick stats
    const documentedPercent =
      metrics.totalSymbols > 0
        ? Math.round((metrics.documentedSymbols / metrics.totalSymbols) * 100)
        : 0;
    this.printSection('📊 Quick Stats');
    console.log(`   Total Symbols: ${metrics.totalSymbols}`);
    console.log(`   Documented: ${metrics.documentedSymbols} (${documentedPercent}%)`);
    console.log(`   Files with Tests: ${metrics.filesWithTests}/${metrics.totalFiles}`);
    console.log(`   Files Needing Attention: ${report.filesNeedingAttention.length}`);
    console.log();

    console.log(
      `${colors.cyan}💡 Tip: Run 'tsdoc-edge docs suggest' for detailed improvement suggestions${colors.reset}`
    );
    console.log();
  }

  /**
   * Get color based on score
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return colors.green;
    if (score >= 60) return colors.yellow;
    return colors.red;
  }

  /**
   * Get health grade
   */
  private getHealthGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Get health emoji
   */
  private getHealthEmoji(score: number): string {
    if (score >= 80) return '🌟';
    if (score >= 60) return '✅';
    if (score >= 40) return '⚠️';
    return '❌';
  }

  /**
   * Get health focus area
   */
  private getHealthFocus(metrics: CodeHealthMetrics): string {
    const docScore = metrics.avgQualityScore;
    const testScore =
      metrics.totalFiles > 0 ? Math.round((metrics.filesWithTests / metrics.totalFiles) * 100) : 0;

    if (docScore < testScore) {
      return 'Improve documentation quality';
    }
    if (testScore < docScore) {
      return 'Add more test coverage';
    }
    return 'Improve both documentation and tests';
  }
}
