/**
 * Health command - Check code health and generate report
 * @packageDocumentation
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
 *
 * @depends CodeHealthChecker, AnalysisReport
 * @depType internal
 * @depReason Core health checking logic
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
    return 'tsdoc-edge health [directory]\n\n  Default: src';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      // Filter out flags to get positional arguments
      const positionalArgs = args.filter((arg) => !arg.startsWith('--'));
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

      // Check if human-readable format is requested
      if (this.hasFlag(args, '--human')) {
        // Original color output
        this.printHeader('TSDoc Edge - Health Check');
        this.printInfo(`Checking health: ${targetPath}`);
        console.log();
        this.printHealthReport(report);
      } else {
        // XML output (default)
        const { metrics } = report;
        const healthScore = metrics.healthScore;
        const healthGrade = this.getHealthGrade(healthScore);
        const docScore = metrics.avgQualityScore;
        const testScore = Math.round((metrics.filesWithTests / metrics.totalFiles) * 100);

        // Build recommendations based on health score
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
              documentedPercent: Math.round(
                (metrics.documentedSymbols / metrics.totalSymbols) * 100
              ),
              filesWithTests: metrics.filesWithTests,
              totalFiles: metrics.totalFiles,
              filesNeedingAttention: report.filesNeedingAttention.length,
            },
          },
          args
        );
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
    const testScore = Math.round((metrics.filesWithTests / metrics.totalFiles) * 100);

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
    this.printSection('📊 Quick Stats');
    console.log(`   Total Symbols: ${metrics.totalSymbols}`);
    console.log(
      `   Documented: ${metrics.documentedSymbols} (${Math.round((metrics.documentedSymbols / metrics.totalSymbols) * 100)}%)`
    );
    console.log(`   Files with Tests: ${metrics.filesWithTests}/${metrics.totalFiles}`);
    console.log(`   Files Needing Attention: ${report.filesNeedingAttention.length}`);
    console.log();

    console.log(
      `${colors.cyan}💡 Tip: Run 'tsdoc-edge suggest' for detailed improvement suggestions${colors.reset}`
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
    const testScore = Math.round((metrics.filesWithTests / metrics.totalFiles) * 100);

    if (docScore < testScore) {
      return 'Improve documentation quality';
    }
    if (testScore < docScore) {
      return 'Add more test coverage';
    }
    return 'Improve both documentation and tests';
  }
}
