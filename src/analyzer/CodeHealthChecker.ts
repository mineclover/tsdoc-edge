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
// Note: TestCoverageAnalyzer API has changed, temporarily disabled
// import { TestCoverageAnalyzer } from './TestCoverageAnalyzer';

/**
 * Checks overall code health and generates improvement suggestions
 *
 * @doc [[AnalysisFeatures#Health]]
 * @public
 * @responsibility Combine documentation and test analysis to produce actionable reports
 *
 * @problem Developers struggle to assess overall code quality and prioritize improvements
 * @solves Combines documentation quality and test coverage into a single health score
 * @context Need unified metrics to track code quality over time
 *
 * @functionality Health score calculation, Improvement suggestions, Documentation analysis, Test coverage analysis
 *
 * @decision Combine doc quality and test coverage into single metric
 * @rationale Both are essential for maintainability and should be tracked together
 * @consequences Single score simplifies tracking, May oversimplify complex quality issues
 *
 * @depends DocumentationAnalyzer, TestCoverageAnalyzer
 * @depType module
 * @depReason Need separate analyzers for modular design
 */
export class CodeHealthChecker {
  private docAnalyzer: DocumentationAnalyzer;
  // Note: TestCoverageAnalyzer API has changed, temporarily disabled
  // private testAnalyzer: TestCoverageAnalyzer;

  constructor() {
    this.docAnalyzer = new DocumentationAnalyzer();
    // this.testAnalyzer = new TestCoverageAnalyzer();
  }

  /**
   * Analyze code health for a directory
   *
   * @param options - Analysis options
   * @returns Complete analysis report
   * @public
   */
  analyze(options: AnalysisOptions): AnalysisReport {
    const { path: targetPath, includeChildren = true, includePrivate = false } = options;

    // Collect source files
    const sourceFiles = this.collectSourceFiles(targetPath);

    // Analyze documentation
    const allDocScores: DocQualityScore[] = [];
    /**
     * file
     * @public
     */
    for (const file of sourceFiles) {
      const sourceCode = fs.readFileSync(file, 'utf-8');
      const scores = this.docAnalyzer.analyzeFile(file, sourceCode, includeChildren);

      // Filter private symbols if needed
      const filtered = includePrivate ? scores : scores.filter((s) => s.isPublic);

      allDocScores.push(...filtered);
    }

    // Analyze test coverage using simple file matching
    const testCoverage = this.analyzeTestCoverage(sourceFiles, targetPath);

    // Update symbol counts in test coverage
    this.updateSymbolCounts(testCoverage, allDocScores);

    // Calculate metrics
    const metrics = this.calculateMetrics(allDocScores, testCoverage);

    // Generate suggestions
    const suggestions = options.generateSuggestions
      ? this.generateSuggestions(allDocScores, testCoverage, options)
      : [];

    // Find top issues
    const topIssues = this.findTopIssues(allDocScores, 10);

    // Find files needing attention
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
    const files: string[] = [];

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Path not found: ${targetPath}`);
    }

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
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
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
   * Analyze test coverage by finding test files for source files
   *
   * @param sourceFiles - List of source file paths
   * @param rootPath - Root directory path
   * @returns Test coverage information for each source file
   */
  private analyzeTestCoverage(sourceFiles: string[], rootPath: string): TestCoverageInfo[] {
    const coverage: TestCoverageInfo[] = [];

    for (const sourceFile of sourceFiles) {
      const testFile = this.findTestFile(sourceFile, rootPath);
      coverage.push({
        sourceFile,
        testFile: testFile || undefined,
        hasTest: testFile !== null,
        symbolCount: 0,
        estimatedCoverage: testFile ? 50 : 0,
      });
    }

    return coverage;
  }

  /**
   * Find test file for a source file
   *
   * Checks multiple common test file locations:
   * 1. Same directory: foo.ts -> foo.test.ts
   * 2. __tests__ directory: src/foo.ts -> src/__tests__/foo.test.ts
   * 3. Top-level __tests__: src/dir/foo.ts -> src/__tests__/dir/foo.test.ts
   *
   * @param sourceFile - Source file path
   * @param rootPath - Root directory path
   * @returns Test file path or null
   */
  private findTestFile(sourceFile: string, rootPath: string): string | null {
    const dir = path.dirname(sourceFile);
    const baseName = path.basename(sourceFile, '.ts');
    const normalizedRoot = rootPath.replace(/\\/g, '/');

    // Common test file patterns
    const patterns = [
      // Same directory: foo.ts -> foo.test.ts
      path.join(dir, `${baseName}.test.ts`),
      // Same directory: foo.ts -> foo.spec.ts
      path.join(dir, `${baseName}.spec.ts`),
      // __tests__ in same directory: foo.ts -> __tests__/foo.test.ts
      path.join(dir, '__tests__', `${baseName}.test.ts`),
      // __tests__ in root: src/dir/foo.ts -> src/__tests__/dir/foo.test.ts
      this.buildTestPathFromRoot(sourceFile, rootPath, baseName),
    ];

    for (const pattern of patterns) {
      if (pattern && fs.existsSync(pattern)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Build test file path relative to root __tests__ directory
   *
   * @param sourceFile - Source file path
   * @param rootPath - Root directory
   * @param baseName - Base file name (without extension)
   * @returns Potential test file path
   */
  private buildTestPathFromRoot(sourceFile: string, rootPath: string, baseName: string): string | null {
    // Normalize paths for comparison
    const normalizedSource = sourceFile.replace(/\\/g, '/');
    const normalizedRoot = rootPath.replace(/\\/g, '/');

    // Get relative path from root
    if (!normalizedSource.startsWith(normalizedRoot)) {
      return null;
    }

    const relativePath = normalizedSource.slice(normalizedRoot.length + 1);
    const relativeDir = path.dirname(relativePath);

    // Build path: root/__tests__/relativeDir/baseName.test.ts
    return path.join(rootPath, '__tests__', relativeDir, `${baseName}.test.ts`);
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
    const totalFiles = new Set(docScores.map((s) => s.filePath)).size;
    const totalSymbols = docScores.length;
    const publicSymbols = docScores.filter((s) => s.isPublic).length;
    const documentedSymbols = docScores.filter((s) => s.hasDoc).length;
    const fullyDocumentedSymbols = docScores.filter((s) => s.qualityScore >= 80).length;

    // Calculate test coverage stats from analyzed files
    const filesWithTests = testCoverage.filter((c) => c.hasTest).length;
    const filesWithoutTests = testCoverage.length - filesWithTests;
    const coveragePercentage =
      testCoverage.length > 0 ? (filesWithTests / testCoverage.length) * 100 : 0;

    const testStats = {
      totalTests: filesWithTests,
      passRate: 100,
      failRate: 0,
      coveragePercent: coveragePercentage,
      coveragePercentage,
      filesWithTests,
      filesWithoutTests,
    };

    const avgQualityScore =
      totalSymbols > 0 ? docScores.reduce((sum, s) => sum + s.qualityScore, 0) / totalSymbols : 0;

    // Calculate overall health score
    const docScore = avgQualityScore;
    const testScore = testStats.coveragePercentage;
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
    const suggestions: ImprovementSuggestion[] = [];
    const minScore = options.minQualityScore || 70;

    // Documentation suggestions
    /**
     * score
     * @public
     */
    for (const score of docScores) {
      if (score.qualityScore < minScore && score.isPublic) {
        const priority = this.getPriority(score.qualityScore);
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
    // const filesWithoutTests = this.testAnalyzer.getFilesWithoutTests(testCoverage);
    const filesWithoutTests: string[] = [];
    /**
     * file
     * @public
     */
    for (const file of filesWithoutTests) {
      const symbolCount = docScores.filter((s) => s.filePath === file).length;
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
    const dir = path.dirname(sourceFile);
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
    const files = new Set<string>();

    // Files with low documentation scores
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
