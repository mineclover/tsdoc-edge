/**
 * Code health checker
 * @packageDocumentation
 * @responsibility Generate comprehensive health reports with improvement suggestions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  AnalysisOptions,
  AnalysisReport,
  CodeHealthMetrics,
  DocQualityScore,
  ImprovementSuggestion,
  TestCoverageInfo,
} from '../types/analysis';
import { DocumentationAnalyzer } from './DocumentationAnalyzer';
import { TestCoverageAnalyzer } from './TestCoverageAnalyzer';

/**
 * Checks overall code health and generates improvement suggestions
 *
 * @public
 * @responsibility Combine documentation and test analysis to produce actionable reports
 */
export class CodeHealthChecker {
  private docAnalyzer: DocumentationAnalyzer;
  private testAnalyzer: TestCoverageAnalyzer;

  constructor() {
    this.docAnalyzer = new DocumentationAnalyzer();
    this.testAnalyzer = new TestCoverageAnalyzer();
  }

  /**
   * Analyze code health for a directory
   *
   * @param options - Analysis options
   * @returns Complete analysis report
   * @public
   */
  analyze(options: AnalysisOptions): AnalysisReport {
    /**
     * { path: targetPath, includeChildren = true, includePrivate = false }
     * @public
     */
    const { path: targetPath, includeChildren = true, includePrivate = false } = options;

    // Collect source files
    /**
     * sourceFiles
     * @public
     */
    const sourceFiles = this.collectSourceFiles(targetPath);

    // Analyze documentation
    /**
     * allDocScores
     * @public
     */
    const allDocScores: DocQualityScore[] = [];
    /**
     * file
     * @public
     */
    for (const file of sourceFiles) {
      /**
       * sourceCode
       * @public
       */
      const sourceCode = fs.readFileSync(file, 'utf-8');
      /**
       * scores
       * @public
       */
      const scores = this.docAnalyzer.analyzeFile(file, sourceCode, includeChildren);

      // Filter private symbols if needed
      /**
       * filtered
       * @public
       */
      const filtered = includePrivate ? scores : scores.filter((s) => s.isPublic);

      allDocScores.push(...filtered);
    }

    // Analyze test coverage
    /**
     * testCoverage
     * @public
     */
    const testCoverage = this.testAnalyzer.analyzeFiles(sourceFiles);

    // Update symbol counts in test coverage
    this.updateSymbolCounts(testCoverage, allDocScores);

    // Calculate metrics
    /**
     * metrics
     * @public
     */
    const metrics = this.calculateMetrics(allDocScores, testCoverage);

    // Generate suggestions
    /**
     * suggestions
     * @public
     */
    const suggestions = options.generateSuggestions
      ? this.generateSuggestions(allDocScores, testCoverage, options)
      : [];

    // Find top issues
    /**
     * topIssues
     * @public
     */
    const topIssues = this.findTopIssues(allDocScores, 10);

    // Find files needing attention
    /**
     * filesNeedingAttention
     * @public
     */
    const filesNeedingAttention = this.findFilesNeedingAttention(allDocScores, testCoverage);

    return {
      timestamp: new Date().toISOString(),
      projectPath: targetPath,
      metrics,
      docScores: allDocScores,
      testCoverage,
      suggestions,
      topIssues,
      filesNeedingAttention,
    };
  }

  /**
   * Collect TypeScript source files from a directory
   *
   * @param targetPath - Path to directory or file
   * @returns Array of file paths
   */
  private collectSourceFiles(targetPath: string): string[] {
    /**
     * files
     * @public
     */
    const files: string[] = [];

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Path not found: ${targetPath}`);
    }

    /**
     * stat
     * @public
     */
    const stat = fs.statSync(targetPath);

    if (stat.isFile()) {
      if (targetPath.endsWith('.ts') && !targetPath.endsWith('.test.ts')) {
        files.push(targetPath);
      }
      return files;
    }

    // Recursively collect files
    this.walkDirectory(targetPath, files);

    return files;
  }

  /**
   * Walk directory recursively
   *
   * @param dir - Directory path
   * @param files - Array to collect file paths
   */
  private walkDirectory(dir: string, files: string[]): void {
    /**
     * entries
     * @public
     */
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    /**
     * entry
     * @public
     */
    for (const entry of entries) {
      /**
       * fullPath
       * @public
       */
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        this.walkDirectory(fullPath, files);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }

  /**
   * Update symbol counts in test coverage info
   *
   * @param testCoverage - Test coverage information
   * @param docScores - Documentation quality scores
   */
  private updateSymbolCounts(testCoverage: TestCoverageInfo[], docScores: DocQualityScore[]): void {
    /**
     * coverage
     * @public
     */
    for (const coverage of testCoverage) {
      /**
       * symbolCount
       * @public
       */
      const symbolCount = docScores.filter((s) => s.filePath === coverage.sourceFile).length;
      coverage.symbolCount = symbolCount;

      // Update estimated coverage based on symbol count
      if (coverage.hasTest) {
        coverage.estimatedCoverage = Math.min(80, 50 + symbolCount * 2);
      }
    }
  }

  /**
   * Calculate health metrics
   *
   * @param docScores - Documentation quality scores
   * @param testCoverage - Test coverage information
   * @returns Health metrics
   */
  private calculateMetrics(
    docScores: DocQualityScore[],
    testCoverage: TestCoverageInfo[]
  ): CodeHealthMetrics {
    /**
     * totalFiles
     * @public
     */
    const totalFiles = new Set(docScores.map((s) => s.filePath)).size;
    /**
     * totalSymbols
     * @public
     */
    const totalSymbols = docScores.length;
    /**
     * publicSymbols
     * @public
     */
    const publicSymbols = docScores.filter((s) => s.isPublic).length;
    /**
     * documentedSymbols
     * @public
     */
    const documentedSymbols = docScores.filter((s) => s.hasDoc).length;
    /**
     * fullyDocumentedSymbols
     * @public
     */
    const fullyDocumentedSymbols = docScores.filter((s) => s.qualityScore >= 80).length;

    /**
     * testStats
     * @public
     */
    const testStats = this.testAnalyzer.calculateStatistics(testCoverage);

    /**
     * avgQualityScore
     * @public
     */
    const avgQualityScore =
      totalSymbols > 0 ? docScores.reduce((sum, s) => sum + s.qualityScore, 0) / totalSymbols : 0;

    // Calculate overall health score
    /**
     * docScore
     * @public
     */
    const docScore = avgQualityScore;
    /**
     * testScore
     * @public
     */
    const testScore = testStats.coveragePercentage;
    /**
     * healthScore
     * @public
     */
    const healthScore = docScore * 0.6 + testScore * 0.4;

    return {
      totalFiles,
      totalSymbols,
      publicSymbols,
      documentedSymbols,
      fullyDocumentedSymbols,
      filesWithTests: testStats.filesWithTests,
      filesWithoutTests: testStats.filesWithoutTests,
      avgQualityScore: Math.round(avgQualityScore),
      healthScore: Math.round(healthScore),
    };
  }

  /**
   * Generate improvement suggestions
   *
   * @param docScores - Documentation quality scores
   * @param testCoverage - Test coverage information
   * @param options - Analysis options
   * @returns Array of improvement suggestions
   */
  private generateSuggestions(
    docScores: DocQualityScore[],
    testCoverage: TestCoverageInfo[],
    options: AnalysisOptions
  ): ImprovementSuggestion[] {
    /**
     * suggestions
     * @public
     */
    const suggestions: ImprovementSuggestion[] = [];
    /**
     * minScore
     * @public
     */
    const minScore = options.minQualityScore || 70;

    // Documentation suggestions
    /**
     * score
     * @public
     */
    for (const score of docScores) {
      if (score.qualityScore < minScore && score.isPublic) {
        /**
         * priority
         * @public
         */
        const priority = this.getPriority(score.qualityScore);
        /**
         * effort
         * @public
         */
        const effort = score.missing.length > 3 ? 'medium' : 'small';

        suggestions.push({
          priority,
          category: 'documentation',
          filePath: score.filePath,
          symbolName: score.symbolName,
          issue: `Low documentation quality (${score.qualityScore}/100)`,
          suggestion: `Add missing documentation: ${score.missing.join(', ')}`,
          effort,
        });
      }
    }

    // Test coverage suggestions
    /**
     * filesWithoutTests
     * @public
     */
    const filesWithoutTests = this.testAnalyzer.getFilesWithoutTests(testCoverage);
    /**
     * file
     * @public
     */
    for (const file of filesWithoutTests) {
      /**
       * symbolCount
       * @public
       */
      const symbolCount = docScores.filter((s) => s.filePath === file).length;
      /**
       * effort
       * @public
       */
      const effort = symbolCount > 10 ? 'large' : symbolCount > 5 ? 'medium' : 'small';

      suggestions.push({
        priority: 'high',
        category: 'testing',
        filePath: file,
        issue: `No test file found (${symbolCount} symbols)`,
        suggestion: `Create test file: ${this.suggestTestPath(file)}`,
        effort,
      });
    }

    // Sort by priority
    return this.sortSuggestions(suggestions);
  }

  /**
   * Get priority level based on quality score
   *
   * @param score - Quality score
   * @returns Priority level
   */
  private getPriority(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score === 0) return 'critical';
    if (score < 40) return 'high';
    if (score < 70) return 'medium';
    return 'low';
  }

  /**
   * Suggest test file path
   *
   * @param sourceFile - Source file path
   * @returns Suggested test file path
   */
  private suggestTestPath(sourceFile: string): string {
    /**
     * dir
     * @public
     */
    const dir = path.dirname(sourceFile);
    /**
     * basename
     * @public
     */
    const basename = path.basename(sourceFile, '.ts');
    return path.join(dir, '__tests__', `${basename}.test.ts`);
  }

  /**
   * Sort suggestions by priority
   *
   * @param suggestions - Array of suggestions
   * @returns Sorted array
   */
  private sortSuggestions(suggestions: ImprovementSuggestion[]): ImprovementSuggestion[] {
    /**
     * priorityOrder
     * @public
     */
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Find top issues (worst quality scores)
   *
   * @param docScores - Documentation quality scores
   * @param limit - Number of issues to return
   * @returns Top issues
   */
  private findTopIssues(docScores: DocQualityScore[], limit: number): DocQualityScore[] {
    return docScores
      .filter((s) => s.isPublic)
      .sort((a, b) => a.qualityScore - b.qualityScore)
      .slice(0, limit);
  }

  /**
   * Find files needing attention
   *
   * @param docScores - Documentation quality scores
   * @param testCoverage - Test coverage information
   * @returns Array of file paths
   */
  private findFilesNeedingAttention(
    docScores: DocQualityScore[],
    testCoverage: TestCoverageInfo[]
  ): string[] {
    /**
     * files
     * @public
     */
    const files = new Set<string>();

    // Files with low documentation scores
    /**
     * fileScores
     * @public
     */
    const fileScores = new Map<string, number[]>();
    /**
     * score
     * @public
     */
    for (const score of docScores) {
      if (!fileScores.has(score.filePath)) {
        fileScores.set(score.filePath, []);
      }
      fileScores.get(score.filePath)?.push(score.qualityScore);
    }

    /**
     * [file, scores]
     * @public
     */
    for (const [file, scores] of fileScores.entries()) {
      /**
       * avgScore
       * @public
       */
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      if (avgScore < 60) {
        files.add(file);
      }
    }

    // Files without tests
    /**
     * coverage
     * @public
     */
    for (const coverage of testCoverage) {
      if (!coverage.hasTest) {
        files.add(coverage.sourceFile);
      }
    }

    return Array.from(files);
  }
}
