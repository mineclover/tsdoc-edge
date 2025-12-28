/**
 * Check Duplicates Command - Check for duplicate content in specifications
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SpecContentSimilarityChecker } from '../spec/SpecContentSimilarityChecker';

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
    return 'tsdoc-edge check-duplicates [docs-directory]\n\n  Default: managed';
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

      const target = args[0];
      const docsDir = target || 'managed';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Path not found: ${docsPath}`);
        console.log();
        return this.failure(`Path not found: ${docsPath}`);
      }

      this.printHeader('Checking Content Similarity');

      const markdownFiles = findMarkdownFiles(docsPath);

      if (markdownFiles.length === 0) {
        console.log(`${colors.yellow}No markdown files found${colors.reset}`);
        console.log();
        return this.success();
      }

      if (markdownFiles.length < 2) {
        console.log(`${colors.yellow}Need at least 2 files to check for duplicates${colors.reset}`);
        console.log();
        return this.success();
      }

      const checker = this.checker || new SpecContentSimilarityChecker();
      const results = checker.checkMultiple(markdownFiles);
      const summary = checker.getSummary(results);

      // Print summary
      this.printSection('Summary');
      console.log(`Total documents: ${colors.cyan}${markdownFiles.length}${colors.reset}`);
      console.log(
        `Pairs analyzed: ${colors.cyan}${(markdownFiles.length * (markdownFiles.length - 1)) / 2}${colors.reset}`
      );
      console.log(`Similar pairs found: ${colors.cyan}${summary.totalPairs}${colors.reset}`);
      console.log(`Average similarity: ${colors.cyan}${(summary.averageSimilarity * 100).toFixed(1)}%${colors.reset}`);
      console.log();
      console.log(`${colors.bold}Suggestions:${colors.reset}`);
      console.log(`  Merge: ${colors.red}${summary.mergeSuggestions}${colors.reset}`);
      console.log(`  Cross-reference: ${colors.yellow}${summary.crossRefSuggestions}${colors.reset}`);
      console.log(`  Keep separate: ${colors.green}${summary.keepSeparate}${colors.reset}`);
      console.log();

      if (results.length === 0) {
        this.printSuccess('No significant content similarity detected');
        console.log();
        return this.success();
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

      // Exit with warning if merge suggestions exist
      if (mergeSuggestions.length > 0) {
        this.printError(`Found ${mergeSuggestions.length} pair(s) with high similarity that should be merged`);
        console.log();
        return this.failure(`Found ${mergeSuggestions.length} pairs with high similarity`);
      }

      return this.success();
    });
  }
}
