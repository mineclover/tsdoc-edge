/**
 * Connectivity validator for ensuring SSOT compliance
 * @packageDocumentation
 */

import type { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from '../graph/SymbolSearchEngine';
import type { ValidationResult } from '../types';
import type {
  ConnectivityAnalysis,
  DetailedValidationIssue,
  DetailedValidationReport,
  Symbol,
} from '../types/graph';

/**
 * Validates connectivity and completeness of documentation across the codebase
 * @public
 * @doc [[ValidationFeatures#Connectivity]]
 * @responsibility Ensure SSOT compliance and documentation connectivity
 * @contract Validate all symbols have proper connections and documentation
 *
 * @problem Documentation systems often become disconnected from code, with broken links, missing tests, and orphaned symbols
 * @solves Analyzes entire symbol graph to detect connectivity issues, calculates quality scores, and generates actionable reports
 * @context TSDoc Edge enforces SSOT principle by ensuring all symbols are properly documented, tested, and connected
 *
 * @functionality
 * - Connectivity analysis: Detect undocumented, untested, orphaned symbols
 * - Link validation: Find broken references between symbols
 * - Circular dependency detection: Identify problematic dependency cycles
 * - Score calculation: Weighted scoring system (0-100) based on documentation quality
 * - Detailed reporting: Actionable reports grouped by file, type, and severity
 * - Contract validation: Ensure preconditions, postconditions, and invariants are defined
 *
 * @decision Use weighted penalty system for connectivity scoring
 * @rationale Different issues have different impact: untested code (25%) is more critical than missing responsibility (15%)
 * @consequences Clear prioritization of issues, encourages focusing on high-impact problems first
 *
 * @depends SymbolGraphBuilder, SymbolSearchEngine
 * @depType internal
 * @depReason Requires graph data and search capabilities for connectivity analysis
 */
export class ConnectivityValidator {
  private graphBuilder: SymbolGraphBuilder;
  private searchEngine: SymbolSearchEngine;

  /**
   * Creates a new ConnectivityValidator
   * @param graphBuilder - Symbol graph builder
   */
  constructor(graphBuilder: SymbolGraphBuilder) {
    this.graphBuilder = graphBuilder;
    this.searchEngine = new SymbolSearchEngine(graphBuilder);
  }

  /**
   * Perform comprehensive connectivity analysis
   * @returns Analysis results with all connectivity issues
   * @testScenario All symbols properly connected
   * @testScenario Some symbols missing documentation
   * @testScenario Broken links detected
   * @testScenario Circular dependencies found
   */
  analyze(): ConnectivityAnalysis {
    const undocumented = this.searchEngine.findUndocumented();
    const untested = this.searchEngine.findUntested();
    const noResponsibility = this.searchEngine.findWithoutResponsibility();
    const noContract = this.searchEngine.findWithoutContract();
    const orphaned = this.searchEngine.findOrphaned();
    const brokenLinks = this.findBrokenLinks();
    const circularDependencies = this.graphBuilder.detectCircularDependencies();

    const connectivityScore = this.calculateConnectivityScore({
      undocumented,
      untested,
      noResponsibility,
      noContract,
      orphaned,
      brokenLinks,
      circularDependencies,
    });

    return {
      undocumented,
      untested,
      noResponsibility,
      noContract,
      orphaned,
      brokenLinks,
      circularDependencies,
      connectivityScore,
    };
  }

  /**
   * Find broken links (references to non-existent symbols)
   * @returns Array of broken links
   */
  private findBrokenLinks(): Array<{
    from: string;
    to: string;
    type: string;
    filePath: string;
  }> {
    const brokenLinks: Array<{
      from: string;
      to: string;
      type: string;
      filePath: string;
    }> = [];

    const relationships = this.graphBuilder.getGraph().relationships;

    /**
     * rel
     * @public
     */
    for (const rel of relationships) {
      const fromSymbol = this.graphBuilder.getSymbol(rel.from);
      const toSymbol = this.graphBuilder.getSymbol(rel.to);

      if (!fromSymbol) {
        brokenLinks.push({
          from: rel.from,
          to: rel.to,
          type: rel.type,
          filePath: rel.filePath,
        });
      }

      if (!toSymbol) {
        brokenLinks.push({
          from: rel.from,
          to: rel.to,
          type: rel.type,
          filePath: rel.filePath,
        });
      }
    }

    return brokenLinks;
  }

  /**
   * Calculate overall connectivity score (0-100)
   * @param analysis - Partial analysis data
   * @returns Connectivity score
   */
  private calculateConnectivityScore(
    analysis: Omit<ConnectivityAnalysis, 'connectivityScore'>
  ): number {
    const totalSymbols = this.graphBuilder.getAllSymbols().length;
    if (totalSymbols === 0) return 100;

    // Weight factors for different issues
    const weights = {
      undocumented: 0.2,
      untested: 0.25,
      noResponsibility: 0.15,
      noContract: 0.15,
      orphaned: 0.1,
      brokenLinks: 0.1,
      circularDeps: 0.05,
    };

    let penalties = 0;

    penalties += (analysis.undocumented.length / totalSymbols) * weights.undocumented * 100;
    penalties += (analysis.untested.length / totalSymbols) * weights.untested * 100;
    penalties += (analysis.noResponsibility.length / totalSymbols) * weights.noResponsibility * 100;
    penalties += (analysis.noContract.length / totalSymbols) * weights.noContract * 100;
    penalties += (analysis.orphaned.length / totalSymbols) * weights.orphaned * 100;
    penalties += (analysis.brokenLinks.length / totalSymbols) * weights.brokenLinks * 100;
    penalties += (analysis.circularDependencies.length / totalSymbols) * weights.circularDeps * 100;

    return Math.max(0, Math.min(100, 100 - penalties));
  }

  /**
   * Validate a single symbol's connectivity
   * @param symbol - Symbol to validate
   * @returns Array of validation results
   */
  validateSymbol(symbol: Symbol): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Check documentation
    if (!symbol.summary || symbol.summary.trim() === '') {
      results.push({
        ruleId: 'require-documentation',
        severity: 'error',
        message: `Symbol '${symbol.name}' has no documentation summary`,
      });
    }

    // Check tests for public APIs
    if (symbol.isPublic && symbol.tests.length === 0) {
      results.push({
        ruleId: 'require-tests',
        severity: 'error',
        message: `Public API '${symbol.name}' has no tests`,
      });
    }

    // Check responsibility definition
    if (symbol.isPublic && !symbol.responsibility) {
      results.push({
        ruleId: 'require-responsibility',
        severity: 'warning',
        message: `Symbol '${symbol.name}' has no defined responsibility`,
      });
    }

    // Check contract for functions/methods
    if (
      (symbol.type === 'function' || symbol.type === 'method') &&
      symbol.isPublic &&
      !symbol.contract
    ) {
      results.push({
        ruleId: 'require-contract',
        severity: 'warning',
        message: `Function/method '${symbol.name}' has no contract specification`,
      });
    }

    // Check for orphaned symbols
    const deps = this.graphBuilder.getDependencies(symbol.id);
    const dependents = this.graphBuilder.getDependents(symbol.id);

    if (deps.length === 0 && dependents.length === 0 && !symbol.isExported) {
      results.push({
        ruleId: 'no-orphaned-symbols',
        severity: 'info',
        message: `Symbol '${symbol.name}' is orphaned (no relationships)`,
      });
    }

    return results;
  }

  /**
   * Generate connectivity report
   * @returns Human-readable report string
   */
  generateReport(): string {
    const analysis = this.analyze();
    const stats = this.graphBuilder.getStatistics();

    let report = '# Connectivity Analysis Report\n\n';
    report += `## Overall Score: ${analysis.connectivityScore.toFixed(2)}/100\n\n`;

    report += '## Statistics\n';
    report += `- Total Symbols: ${stats.totalSymbols}\n`;
    report += `- Total Relationships: ${stats.totalRelationships}\n`;
    report += `- Avg Dependencies: ${stats.avgDependencies.toFixed(2)}\n`;
    report += `- Max Dependencies: ${stats.maxDependencies}\n`;
    report += `- Orphaned Symbols: ${stats.orphanedSymbols}\n\n`;

    report += '## Issues\n\n';

    if (analysis.undocumented.length > 0) {
      report += `### Undocumented Symbols (${analysis.undocumented.length})\n`;
      /**
       * sym
       * @public
       */
      for (const sym of analysis.undocumented.slice(0, 10)) {
        report += `- ${sym.name} (${sym.filePath}:${sym.line})\n`;
      }
      if (analysis.undocumented.length > 10) {
        report += `... and ${analysis.undocumented.length - 10} more\n`;
      }
      report += '\n';
    }

    if (analysis.untested.length > 0) {
      report += `### Untested Symbols (${analysis.untested.length})\n`;
      /**
       * sym
       * @public
       */
      for (const sym of analysis.untested.slice(0, 10)) {
        report += `- ${sym.name} (${sym.filePath}:${sym.line})\n`;
      }
      if (analysis.untested.length > 10) {
        report += `... and ${analysis.untested.length - 10} more\n`;
      }
      report += '\n';
    }

    if (analysis.circularDependencies.length > 0) {
      report += `### Circular Dependencies (${analysis.circularDependencies.length})\n`;
      /**
       * cycle
       * @public
       */
      for (const cycle of analysis.circularDependencies.slice(0, 5)) {
        report += `- ${cycle.join(' -> ')}\n`;
      }
      if (analysis.circularDependencies.length > 5) {
        report += `... and ${analysis.circularDependencies.length - 5} more\n`;
      }
      report += '\n';
    }

    if (analysis.brokenLinks.length > 0) {
      report += `### Broken Links (${analysis.brokenLinks.length})\n`;
      /**
       * link
       * @public
       */
      for (const link of analysis.brokenLinks.slice(0, 10)) {
        report += `- ${link.from} -> ${link.to} (${link.type})\n`;
      }
      if (analysis.brokenLinks.length > 10) {
        report += `... and ${analysis.brokenLinks.length - 10} more\n`;
      }
      report += '\n';
    }

    return report;
  }

  /**
   * Generate detailed validation report with actionable items
   * @returns Detailed report with specific issues and locations
   * @public
   * @testScenario Generate report for symbols with various issues
   * @testScenario Group issues by file
   * @testScenario Provide fix suggestions
   */
  generateDetailedReport(): DetailedValidationReport {
    const allSymbols = this.graphBuilder.getAllSymbols();
    const allIssues: DetailedValidationIssue[] = [];

    // Collect all issues from all symbols
    /**
     * symbol
     * @public
     */
    for (const symbol of allSymbols) {
      const issues = this.extractDetailedIssues(symbol);
      allIssues.push(...issues);
    }

    // Group issues by file
    const issuesByFile = new Map<
      string,
      {
        filePath: string;
        issueCount: number;
        issues: DetailedValidationIssue[];
      }
    >();

    /**
     * issue
     * @public
     */
    for (const issue of allIssues) {
      const existing = issuesByFile.get(issue.filePath);
      if (existing) {
        existing.issues.push(issue);
        existing.issueCount++;
      } else {
        issuesByFile.set(issue.filePath, {
          filePath: issue.filePath,
          issueCount: 1,
          issues: [issue],
        });
      }
    }

    // Group issues by type
    const issuesByType = new Map<string, DetailedValidationIssue[]>();
    /**
     * issue
     * @public
     */
    for (const issue of allIssues) {
      const existing = issuesByType.get(issue.issueType);
      if (existing) {
        existing.push(issue);
      } else {
        issuesByType.set(issue.issueType, [issue]);
      }
    }

    // Calculate severity counts
    const issuesBySeverity = {
      error: allIssues.filter((i) => i.severity === 'error').length,
      warning: allIssues.filter((i) => i.severity === 'warning').length,
      info: allIssues.filter((i) => i.severity === 'info').length,
    };

    // Calculate summary statistics
    const documented = allSymbols.filter((s) => s.summary && s.summary.trim() !== '').length;
    const tested = allSymbols.filter((s) => s.tests && s.tests.length > 0).length;
    const withResponsibility = allSymbols.filter((s) => s.responsibility).length;
    const withContract = allSymbols.filter((s) => s.contract).length;

    const completionPercentage =
      allSymbols.length > 0
        ? ((documented + tested + withResponsibility + withContract) / (allSymbols.length * 4)) *
          100
        : 0;

    return {
      timestamp: new Date().toISOString(),
      totalSymbols: allSymbols.length,
      totalIssues: allIssues.length,
      issuesBySeverity,
      issuesByFile,
      issuesByType,
      allIssues,
      completionPercentage,
      summary: {
        documented,
        undocumented: allSymbols.length - documented,
        tested,
        untested: allSymbols.length - tested,
        withResponsibility,
        withoutResponsibility: allSymbols.length - withResponsibility,
        withContract,
        withoutContract: allSymbols.length - withContract,
      },
    };
  }

  /**
   * Extract detailed issues from a single symbol
   * @param symbol - Symbol to analyze
   * @returns Array of detailed issues
   */
  private extractDetailedIssues(symbol: Symbol): DetailedValidationIssue[] {
    const issues: DetailedValidationIssue[] = [];

    // Check documentation
    if (!symbol.summary || symbol.summary.trim() === '') {
      issues.push({
        symbolId: symbol.id,
        symbolName: symbol.name,
        symbolType: symbol.type,
        filePath: symbol.filePath,
        line: symbol.line,
        issueType: 'missing-documentation',
        severity: 'error',
        message: `Symbol '${symbol.name}' has no documentation summary`,
        suggestedFix: `Add a JSDoc comment with a summary:\n/**\n * [Describe what ${symbol.name} does]\n */`,
      });
    }

    // Check tests for public APIs
    if (symbol.isPublic && symbol.tests.length === 0) {
      issues.push({
        symbolId: symbol.id,
        symbolName: symbol.name,
        symbolType: symbol.type,
        filePath: symbol.filePath,
        line: symbol.line,
        issueType: 'missing-tests',
        severity: 'error',
        message: `Public API '${symbol.name}' has no tests`,
        suggestedFix: `Add @testedBy or @testScenario tags to link test files`,
      });
    }

    // Check responsibility definition
    if (symbol.isPublic && !symbol.responsibility) {
      issues.push({
        symbolId: symbol.id,
        symbolName: symbol.name,
        symbolType: symbol.type,
        filePath: symbol.filePath,
        line: symbol.line,
        issueType: 'missing-responsibility',
        severity: 'warning',
        message: `Symbol '${symbol.name}' has no defined responsibility`,
        suggestedFix: `Add @responsibility tag:\n@responsibility [Describe the responsibility of ${symbol.name}]`,
      });
    }

    // Check contract for functions/methods
    if (
      (symbol.type === 'function' || symbol.type === 'method') &&
      symbol.isPublic &&
      !symbol.contract
    ) {
      issues.push({
        symbolId: symbol.id,
        symbolName: symbol.name,
        symbolType: symbol.type,
        filePath: symbol.filePath,
        line: symbol.line,
        issueType: 'missing-contract',
        severity: 'warning',
        message: `Function/method '${symbol.name}' has no contract specification`,
        suggestedFix: `Add @contract tag:\n@contract [Describe what ${symbol.name} promises to do]`,
      });
    }

    // Check for detailed contract elements
    if (symbol.contract) {
      const missingItems: string[] = [];

      if (
        (symbol.type === 'function' || symbol.type === 'method') &&
        (!symbol.contract.preconditions || symbol.contract.preconditions.length === 0)
      ) {
        missingItems.push('preconditions');
      }

      if (
        (symbol.type === 'function' || symbol.type === 'method') &&
        (!symbol.contract.postconditions || symbol.contract.postconditions.length === 0)
      ) {
        missingItems.push('postconditions');
      }

      if (missingItems.length > 0) {
        issues.push({
          symbolId: symbol.id,
          symbolName: symbol.name,
          symbolType: symbol.type,
          filePath: symbol.filePath,
          line: symbol.line,
          issueType: 'missing-precondition',
          severity: 'info',
          message: `Contract for '${symbol.name}' is incomplete`,
          missingItems,
          suggestedFix: `Add missing contract elements:\n${missingItems.map((item) => `@${item} [Describe ${item}]`).join('\n')}`,
        });
      }
    }

    // Check for orphaned symbols
    const deps = this.graphBuilder.getDependencies(symbol.id);
    const dependents = this.graphBuilder.getDependents(symbol.id);

    if (deps.length === 0 && dependents.length === 0 && !symbol.isExported) {
      issues.push({
        symbolId: symbol.id,
        symbolName: symbol.name,
        symbolType: symbol.type,
        filePath: symbol.filePath,
        line: symbol.line,
        issueType: 'orphaned',
        severity: 'info',
        message: `Symbol '${symbol.name}' is orphaned (no relationships)`,
        suggestedFix: `Consider:\n- Exporting if it should be public\n- Adding @dependsOn/@usedBy tags\n- Removing if unused`,
      });
    }

    return issues;
  }

  /**
   * Format detailed report as human-readable text
   * @param report - Detailed validation report
   * @returns Formatted report string
   * @public
   */
  formatDetailedReport(report: DetailedValidationReport): string {
    let output = '';

    // Header
    output += '╔═══════════════════════════════════════════════════════════════════════════════╗\n';
    output += '║               DETAILED VALIDATION REPORT - ACTIONABLE ITEMS                  ║\n';
    output +=
      '╚═══════════════════════════════════════════════════════════════════════════════╝\n\n';

    // Summary
    output += `📊 SUMMARY\n`;
    output += `${'─'.repeat(80)}\n`;
    output += `Generated: ${new Date(report.timestamp).toLocaleString()}\n`;
    output += `Total Symbols: ${report.totalSymbols}\n`;
    output += `Total Issues: ${report.totalIssues}\n`;
    output += `Completion: ${report.completionPercentage.toFixed(2)}%\n\n`;

    output += `Documentation: ${report.summary.documented}/${report.totalSymbols} (${((report.summary.documented / report.totalSymbols) * 100).toFixed(1)}%)\n`;
    output += `Tests: ${report.summary.tested}/${report.totalSymbols} (${((report.summary.tested / report.totalSymbols) * 100).toFixed(1)}%)\n`;
    output += `Responsibility: ${report.summary.withResponsibility}/${report.totalSymbols} (${((report.summary.withResponsibility / report.totalSymbols) * 100).toFixed(1)}%)\n`;
    output += `Contract: ${report.summary.withContract}/${report.totalSymbols} (${((report.summary.withContract / report.totalSymbols) * 100).toFixed(1)}%)\n\n`;

    // Issues by severity
    output += `🚨 ISSUES BY SEVERITY\n`;
    output += `${'─'.repeat(80)}\n`;
    output += `❌ Errors: ${report.issuesBySeverity.error}\n`;
    output += `⚠️  Warnings: ${report.issuesBySeverity.warning}\n`;
    output += `ℹ️  Info: ${report.issuesBySeverity.info}\n\n`;

    // Issues by file (sorted by issue count)
    output += `📁 ISSUES BY FILE\n`;
    output += `${'─'.repeat(80)}\n`;

    const sortedFiles = Array.from(report.issuesByFile.values()).sort(
      (a, b) => b.issueCount - a.issueCount
    );

    /**
     * fileGroup
     * @public
     */
    for (const fileGroup of sortedFiles) {
      output += `\n📄 ${fileGroup.filePath} (${fileGroup.issueCount} issues)\n`;

      // Group by symbol within file
      const issuesBySymbol = new Map<string, DetailedValidationIssue[]>();
      /**
       * issue
       * @public
       */
      for (const issue of fileGroup.issues) {
        const existing = issuesBySymbol.get(issue.symbolName);
        if (existing) {
          existing.push(issue);
        } else {
          issuesBySymbol.set(issue.symbolName, [issue]);
        }
      }

      /**
       * [symbolName, issues]
       * @public
       */
      for (const [symbolName, issues] of issuesBySymbol.entries()) {
        const firstIssue = issues[0];
        output += `  ${firstIssue.symbolType} ${symbolName} (line ${firstIssue.line})\n`;

        // Sort issues by severity
        const sortedIssues = issues.sort((a, b) => {
          const severityOrder = { error: 0, warning: 1, info: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        });

        /**
         * issue
         * @public
         */
        for (const issue of sortedIssues) {
          const icon =
            issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️ ' : 'ℹ️ ';
          output += `    ${icon} ${issue.message}\n`;

          if (issue.missingItems && issue.missingItems.length > 0) {
            output += `       Missing: ${issue.missingItems.join(', ')}\n`;
          }

          if (issue.suggestedFix) {
            output += `       💡 Fix: ${issue.suggestedFix.split('\n')[0]}\n`;
          }
        }
      }
    }

    // Quick stats by issue type
    output += `\n📊 ISSUES BY TYPE\n`;
    output += `${'─'.repeat(80)}\n`;
    /**
     * [issueType, issues]
     * @public
     */
    for (const [issueType, issues] of Array.from(report.issuesByType.entries()).sort(
      (a, b) => b[1].length - a[1].length
    )) {
      output += `  ${issueType}: ${issues.length}\n`;
    }

    output += '\n';
    output += `${'═'.repeat(80)}\n`;
    output += `💡 TIP: Fix errors first, then warnings, then info items.\n`;
    output += `${'═'.repeat(80)}\n`;

    return output;
  }
}
