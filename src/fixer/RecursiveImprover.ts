/**
 * Recursive documentation improver
 * @packageDocumentation
 * @responsibility Recursively improve documentation quality across the codebase
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';
import { ConfigManager } from '../config/ConfigManager';
import type { AnalysisReport } from '../types/analysis';
import { DocumentationFixer, type FixOptions, type FixResult } from './DocumentationFixer';

/**
 * Options for recursive improvement
 */
export interface RecursiveImproveOptions {
  /** Target quality score to reach */
  targetScore?: number;
  /** Maximum iterations */
  maxIterations?: number;
  /** Entry points to start from (from config if not specified) */
  entryPoints?: string[];
  /** Fix options */
  fixOptions?: FixOptions;
  /** Dry run - don't modify files */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Result of recursive improvement
 */
export interface RecursiveImproveResult {
  /** Total iterations performed */
  iterations: number;
  /** Initial health score */
  initialScore: number;
  /** Final health score */
  finalScore: number;
  /** Total files modified */
  filesModified: number;
  /** Total symbols fixed */
  symbolsFixed: number;
  /** Files that were improved */
  improvedFiles: string[];
  /** Fix results per iteration */
  iterationResults: Array<{
    iteration: number;
    score: number;
    fixes: FixResult[];
  }>;
}

/**
 * Recursively improves documentation quality
 *
 * @public
 * @responsibility Iteratively analyze and improve code documentation until target is reached
 */
export class RecursiveImprover {
  private checker: CodeHealthChecker;
  private fixer: DocumentationFixer;
  private configManager: ConfigManager;

  constructor() {
    this.checker = new CodeHealthChecker();
    this.fixer = new DocumentationFixer();
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * Improve documentation recursively
   *
   * @param options - Improvement options
   * @returns Improvement result
   * @public
   */
  improve(options: RecursiveImproveOptions = {}): RecursiveImproveResult {
    /**
     * {
     *       targetScore = 80,
     *       maxIterations = 10,
     *       entryPoints = this.getEntryPoints(),
     *       fixOptions = {},
     *       dryRun = false,
     *       verbose = false,
     *     }
     * @public
     */
    const {
      targetScore = 80,
      maxIterations = 10,
      entryPoints = this.getEntryPoints(),
      fixOptions = {},
      dryRun = false,
      verbose = false,
    } = options;

    const improvedFiles = new Set<string>();
    const iterationResults: RecursiveImproveResult['iterationResults'] = [];
    let totalSymbolsFixed = 0;

    // Get initial analysis
    const paths = this.expandEntryPoints(entryPoints);
    const initialReport = this.analyzeAll(paths);
    const initialScore = initialReport.metrics.healthScore;

    if (verbose) {
      console.log(`Initial health score: ${initialScore}/100`);
      console.log(`Target score: ${targetScore}/100`);
      console.log(`Max iterations: ${maxIterations}`);
      console.log();
    }

    let currentScore = initialScore;
    let iteration = 0;

    // Iterate until target reached or max iterations
    while (currentScore < targetScore && iteration < maxIterations) {
      if (verbose) {
        console.log(`\n=== Iteration ${iteration + 1} ===`);
        console.log(`Current score: ${currentScore}/100`);
      }

      // Get current analysis
      const report = this.analyzeAll(paths);

      // Find symbols that need fixing
      const needsFixing = report.docScores.filter(
        (s) => s.qualityScore < targetScore && s.isPublic
      );

      if (needsFixing.length === 0) {
        if (verbose) {
          console.log('No more symbols need fixing');
        }
        break;
      }

      // Group by file
      const byFile = new Map<string, typeof needsFixing>();
      /**
       * score
       * @public
       */
      for (const score of needsFixing) {
        if (!byFile.has(score.filePath)) {
          byFile.set(score.filePath, []);
        }
        byFile.get(score.filePath)?.push(score);
      }

      // Fix each file
      const fixes: FixResult[] = [];
      /**
       * [filePath, scores]
       * @public
       */
      for (const [filePath, scores] of byFile.entries()) {
        if (verbose) {
          console.log(`  Fixing ${filePath} (${scores.length} symbols)...`);
        }

        const result = this.fixer.fixFile(filePath, scores, {
          ...fixOptions,
          dryRun,
        });

        fixes.push(result);

        if (result.modified) {
          improvedFiles.add(filePath);
          totalSymbolsFixed += result.symbolsFixed;

          if (verbose) {
            console.log(`    Fixed ${result.symbolsFixed} symbols`);
          }
        }
      }

      // Re-analyze to get new score
      const newReport = this.analyzeAll(paths);
      currentScore = newReport.metrics.healthScore;

      // Increment iteration counter after successful work
      iteration++;

      iterationResults.push({
        iteration,
        score: currentScore,
        fixes,
      });

      if (verbose) {
        console.log(`  New score: ${currentScore}/100`);
      }

      // If score didn't improve, stop
      if (currentScore <= report.metrics.healthScore) {
        if (verbose) {
          console.log('  Score did not improve, stopping');
        }
        break;
      }
    }

    return {
      iterations: iteration,
      initialScore,
      finalScore: currentScore,
      filesModified: improvedFiles.size,
      symbolsFixed: totalSymbolsFixed,
      improvedFiles: Array.from(improvedFiles),
      iterationResults,
    };
  }

  /**
   * Get entry points from config or default
   *
   * @returns Entry point paths
   */
  private getEntryPoints(): string[] {
    const config = this.configManager.get();
    return config.project.entryPoints || ['src/index.ts'];
  }

  /**
   * Expand entry points to include all source files in the project
   *
   * @param entryPoints - Entry point paths
   * @returns All source file paths
   */
  private expandEntryPoints(entryPoints: string[]): string[] {
    const config = this.configManager.get();
    const srcDirs = config.project.srcDirs || ['src'];
    const allPaths = new Set<string>();

    // Add entry points
    /**
     * entry
     * @public
     */
    for (const entry of entryPoints) {
      const resolved = this.configManager.resolvePath(entry);
      if (fs.existsSync(resolved)) {
        if (fs.statSync(resolved).isFile()) {
          allPaths.add(resolved);
        } else {
          // Add all files in directory
          this.walkDirectory(resolved, allPaths);
        }
      }
    }

    // Add all source directories
    /**
     * srcDir
     * @public
     */
    for (const srcDir of srcDirs) {
      const resolved = this.configManager.resolvePath(srcDir);
      if (fs.existsSync(resolved)) {
        this.walkDirectory(resolved, allPaths);
      }
    }

    return Array.from(allPaths);
  }

  /**
   * Walk directory and collect TypeScript files
   *
   * @param dir - Directory path
   * @param files - Set to collect files
   */
  private walkDirectory(dir: string, files: Set<string>): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    /**
     * entry
     * @public
     */
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        this.walkDirectory(fullPath, files);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.add(fullPath);
      }
    }
  }

  /**
   * Analyze all paths
   *
   * @param paths - Array of paths
   * @returns Analysis report
   */
  private analyzeAll(paths: string[]): AnalysisReport {
    // Use the first path's directory as the base
    const basePath = paths.length > 0 ? path.dirname(paths[0]) : 'src';

    return this.checker.analyze({
      path: basePath,
      includeChildren: true,
      includePrivate: false,
      minQualityScore: 70,
      generateSuggestions: false,
    });
  }
}
