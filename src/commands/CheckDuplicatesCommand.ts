/**
 * Check Duplicates Command - Check for duplicate content in specifications
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SpecContentSimilarityChecker } from '../spec/SpecContentSimilarityChecker';
import type { ContentSimilarity } from '../types/spec';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/** Aggregate numbers returned by `SpecContentSimilarityChecker.getSummary` */
type SimilaritySummary = ReturnType<SpecContentSimilarityChecker['getSummary']>;

/**
 * Helper function to recursively find markdown files
 * @param dir - dir parameter
 * @returns Returns string[]
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  const stat = fs.statSync(dir);

  if (stat.isFile()) {
    return [dir];
  }

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const entryStat = fs.statSync(fullPath);

    if (entryStat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Command for checking duplicate content in specifications
 *
 * @public
 * @responsibility Check for content similarity across documents
 * @contract Analyzes documents, detects duplicates, suggests actions
 * @doc [[CheckDuplicatesCommand]]
 * @doc [[CLI Commands#check-duplicates]]
 *
 * @problem Documentation may have duplicate or highly similar content
 * @solves Detects content similarity and suggests merging or cross-referencing
 * @context Part of documentation quality assurance
 *
 * @functionality
 * - File scanning: Find all markdown files in directory
 * - Similarity analysis: Compare all document pairs
 * - Categorization: Merge, cross-reference, or keep separate
 * - Detailed reporting: Show overlapping sections
 * - Quality threshold: Exit with error if high similarity found
 *
 * @decision Use SpecContentSimilarityChecker for analysis
 * @rationale Specialized checker with configurable thresholds
 * @consequences Requires at least 2 files to compare
 *
 * @depends SpecContentSimilarityChecker
 * @depType internal
 * @depReason Content similarity analysis
 */
export class CheckDuplicatesCommand extends BaseCommand {
  private checker?: SpecContentSimilarityChecker;

  constructor(checker?: SpecContentSimilarityChecker) {
    super();
    this.checker = checker;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'check-duplicates';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Check for duplicate content in specifications';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge check-duplicates [docs-directory] [options]

  Default: managed

  Options:
    --human          Output in human-readable format (default: XML)`;
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

      const isHuman = this.hasFlag(args, '--human');
      // `--human` is a boolean flag, so it must not be mistaken for the directory argument
      const target = args.filter((arg) => arg !== '--human')[0];
      const docsDir = target || 'managed';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Path not found: ${docsPath}`);
        console.log();
        return this.failure(`Path not found: ${docsPath}`);
      }

      if (isHuman) {
        this.printHeader('Checking Content Similarity');
      }

      const markdownFiles = findMarkdownFiles(docsPath);

      if (markdownFiles.length === 0) {
        if (isHuman) {
          console.log(`${colors.yellow}No markdown files found${colors.reset}`);
          console.log();
        } else {
          this.printSimilarityXml(args, docsDir, markdownFiles.length, 'no-documents', []);
        }
        return this.success();
      }

      if (markdownFiles.length < 2) {
        if (isHuman) {
          console.log(
            `${colors.yellow}Need at least 2 files to check for duplicates${colors.reset}`
          );
          console.log();
        } else {
          this.printSimilarityXml(
            args,
            docsDir,
            markdownFiles.length,
            'insufficient-documents',
            []
          );
        }
        return this.success();
      }

      const checker = this.checker || new SpecContentSimilarityChecker();
      const results = checker.checkMultiple(markdownFiles);
      const summary = checker.getSummary(results);

      if (isHuman) {
        this.printHumanReport(markdownFiles.length, results, summary);
      } else {
        this.printSimilarityXml(args, docsDir, markdownFiles.length, 'analyzed', results, summary);
      }

      // Exit with warning if merge suggestions exist
      const mergeCount = results.filter((r) => r.suggestion === 'merge').length;
      if (mergeCount > 0) {
        if (isHuman) {
          this.printError(`Found ${mergeCount} pair(s) with high similarity that should be merged`);
          console.log();
        }
        return this.failure(`Found ${mergeCount} pairs with high similarity`);
      }

      return this.success();
    });
  }

  /**
   * Print the colored terminal report (`--human`)
   * @private
   */
  private printHumanReport(
    totalDocuments: number,
    results: ContentSimilarity[],
    summary: SimilaritySummary
  ): void {
    // Print summary
    this.printSection('Summary');
    console.log(`Total documents: ${colors.cyan}${totalDocuments}${colors.reset}`);
    console.log(
      `Pairs analyzed: ${colors.cyan}${(totalDocuments * (totalDocuments - 1)) / 2}${colors.reset}`
    );
    console.log(`Similar pairs found: ${colors.cyan}${summary.totalPairs}${colors.reset}`);
    console.log(
      `Average similarity: ${colors.cyan}${(summary.averageSimilarity * 100).toFixed(1)}%${colors.reset}`
    );
    console.log();
    console.log(`${colors.bold}Suggestions:${colors.reset}`);
    console.log(`  Merge: ${colors.red}${summary.mergeSuggestions}${colors.reset}`);
    console.log(`  Cross-reference: ${colors.yellow}${summary.crossRefSuggestions}${colors.reset}`);
    console.log(`  Keep separate: ${colors.green}${summary.keepSeparate}${colors.reset}`);
    console.log();

    if (results.length === 0) {
      this.printSuccess('No significant content similarity detected');
      console.log();
      return;
    }

    // Print merge suggestions
    const mergeSuggestions = results.filter((r) => r.suggestion === 'merge');
    if (mergeSuggestions.length > 0) {
      this.printSection('Merge Suggestions (High Similarity)');
      for (const result of mergeSuggestions) {
        console.log(
          `${colors.red}🔴${colors.reset} ${colors.bold}Similarity: ${(result.similarity * 100).toFixed(1)}%${colors.reset}`
        );
        console.log(`   File 1: ${result.file1}`);
        console.log(`   File 2: ${result.file2}`);
        console.log(`   ${colors.dim}${result.reason}${colors.reset}`);

        if (result.overlappingSections.length > 0) {
          console.log(`   ${colors.bold}Overlapping sections:${colors.reset}`);
          for (const section of result.overlappingSections) {
            console.log(`     - ${section.section} (${(section.similarity * 100).toFixed(1)}%)`);
          }
        }
        console.log();
      }
    }

    // Print cross-reference suggestions
    const crossRefSuggestions = results.filter((r) => r.suggestion === 'cross-reference');
    if (crossRefSuggestions.length > 0) {
      this.printSection('Cross-Reference Suggestions (Moderate Similarity)');
      for (const result of crossRefSuggestions) {
        console.log(
          `${colors.yellow}🟡${colors.reset} ${colors.bold}Similarity: ${(result.similarity * 100).toFixed(1)}%${colors.reset}`
        );
        console.log(`   File 1: ${result.file1}`);
        console.log(`   File 2: ${result.file2}`);
        console.log(`   ${colors.dim}${result.reason}${colors.reset}`);

        if (result.overlappingSections.length > 0) {
          console.log(`   ${colors.bold}Overlapping sections:${colors.reset}`);
          for (const section of result.overlappingSections) {
            console.log(`     - ${section.section} (${(section.similarity * 100).toFixed(1)}%)`);
          }
        }
        console.log();
      }
    }
  }

  /**
   * Print the default XML document
   *
   * @param status - Why the analysis ran or was skipped (fewer than 2 documents)
   * @private
   */
  private printSimilarityXml(
    args: string[],
    docsDir: string,
    totalDocuments: number,
    status: 'no-documents' | 'insufficient-documents' | 'analyzed',
    results: ContentSimilarity[],
    summary?: SimilaritySummary
  ): void {
    this.printOutput(
      'content-similarity',
      {
        summary: {
          path: docsDir,
          status,
          totalDocuments,
          pairsAnalyzed: (totalDocuments * (totalDocuments - 1)) / 2,
          similarPairsFound: summary?.totalPairs ?? 0,
          averageSimilarity: Number(((summary?.averageSimilarity ?? 0) * 100).toFixed(1)),
          mergeSuggestions: summary?.mergeSuggestions ?? 0,
          crossRefSuggestions: summary?.crossRefSuggestions ?? 0,
          keepSeparate: summary?.keepSeparate ?? 0,
        },
        // Like the human report, list only pairs that call for action; the summary counts the rest
        pairs: results
          .filter((r) => r.suggestion !== 'keep-separate')
          .map((r) => ({
            file1: path.relative(process.cwd(), r.file1),
            file2: path.relative(process.cwd(), r.file2),
            similarity: Number((r.similarity * 100).toFixed(1)),
            suggestion: r.suggestion,
            reason: r.reason,
            overlappingSections: r.overlappingSections.map((section) => ({
              section: section.section,
              similarity: Number((section.similarity * 100).toFixed(1)),
            })),
          })),
      },
      args
    );
  }
}
