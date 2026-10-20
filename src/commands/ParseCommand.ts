/**
 * Parse command - Parse and display enhanced documentation
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EnhancedDocExtractor, type ExtractedEnhancedDoc } from '../parser/EnhancedDocExtractor';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for parsing enhanced documentation
 *
 * @public
 * @responsibility Parse enhanced docs from TypeScript files
 * @contract Extract and display enhanced documentation with completeness metrics
 * @doc [[Parse Command]]
 * @doc [[CLI Commands#parse]]
 *
 * @problem Developers need to validate enhanced documentation completeness
 * @solves Parses TypeScript files and extracts enhanced doc tags with completeness scores
 * @context Part of documentation quality assurance system
 *
 * @functionality
 * - Single file parsing: Extract enhanced docs from one file
 * - Directory scanning: Recursively parse all TypeScript files
 * - Completeness calculation: Score each symbol's documentation
 * - Results display: Show symbols sorted by completeness
 * - Missing tag identification: Highlight incomplete documentation
 *
 * @decision Use EnhancedDocExtractor with auto-ID generation
 * @rationale Ensures consistent extraction and automatic ID assignment
 * @consequences All symbols get IDs automatically, partial docs are included
 *
 * @depends EnhancedDocExtractor
 * @depType internal
 * @depReason Core enhanced documentation parsing logic
 */
export class ParseCommand extends BaseCommand {
  private extractor: EnhancedDocExtractor;

  constructor(extractor?: EnhancedDocExtractor) {
    super();
    this.extractor =
      extractor ||
      new EnhancedDocExtractor({
        includePartial: true,
        autoGenerateIds: true,
      });
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'parse';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Parse and display enhanced documentation';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge parse <source-path> [options]

  source-path can be a file or directory

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
      const sourcePath = args.find((arg) => !arg.startsWith('-'));

      if (!sourcePath) {
        this.printError('Source path required');
        console.log();
        console.log('Usage:');
        this.printInfo('  tsdoc-edge parse <file|directory>');
        console.log();
        console.log('Examples:');
        console.log('  tsdoc-edge parse src/analyzer/CodeHealthChecker.ts');
        console.log('  tsdoc-edge parse src');
        console.log();
        return this.failure('Source path required');
      }

      if (!fs.existsSync(sourcePath)) {
        this.printError(`Source path not found: ${sourcePath}`);
        return this.failure(`Source path not found: ${sourcePath}`);
      }

      if (isHuman) {
        this.printHeader('TSDoc Edge - Parse Enhanced Docs');
        console.log(`Parsing: ${colors.cyan}${sourcePath}${colors.reset}`);
        console.log();
      }

      const stats = fs.statSync(sourcePath);
      let allResults: ExtractedEnhancedDoc[] = [];

      if (stats.isDirectory()) {
        allResults = this.parseDirectory(sourcePath);
      } else {
        const sourceCode = fs.readFileSync(sourcePath, 'utf-8');
        allResults = this.extractor.extractFromFile(sourcePath, sourceCode);
      }

      if (allResults.length === 0) {
        if (isHuman) {
          this.printWarning('No enhanced documentation found');
          console.log();
          console.log('Add custom TSDoc tags to your code:');
          console.log(
            `  ${colors.dim}@problem, @functionality, @errorExp, @decision, @dependency, @plan${colors.reset}`
          );
          console.log();
        } else {
          this.printParseXml(args, sourcePath, []);
        }
        return this.success();
      }

      // Symbols by completeness (highest first)
      const byCompleteness = [...allResults].sort((a, b) => b.completeness - a.completeness);

      if (isHuman) {
        this.printHumanResults(byCompleteness);
      } else {
        this.printParseXml(args, sourcePath, byCompleteness);
      }

      return this.success();
    });
  }

  /**
   * Print the colored terminal report (--human)
   * @param results - Results already ordered by completeness (descending)
   */
  private printHumanResults(results: ExtractedEnhancedDoc[]): void {
    this.printSection('📊 Extraction Results');
    console.log(`   Total Symbols: ${colors.cyan}${results.length}${colors.reset}`);
    console.log();

    this.printSection('📋 Symbols by Completeness');
    for (const result of results) {
      const relPath = path.relative(process.cwd(), result.symbol.filePath);
      const completenessColor =
        result.completeness >= 70
          ? colors.green
          : result.completeness >= 40
            ? colors.yellow
            : colors.red;
      console.log(`   ${colors.cyan}${result.symbol.name}${colors.reset}`);
      console.log(`     ${relPath}:${result.symbol.line}`);
      console.log(`     Completeness: ${completenessColor}${result.completeness}%${colors.reset}`);
      if (result.missing.length > 0) {
        console.log(`     Missing: ${colors.dim}${result.missing.join(', ')}${colors.reset}`);
      }
      console.log();
    }

    this.printSuccess(`Average Completeness: ${this.averageCompleteness(results)}%`);
    console.log();
  }

  /**
   * Rounded average completeness across results (0 when there are none)
   */
  private averageCompleteness(results: ExtractedEnhancedDoc[]): number {
    if (results.length === 0) return 0;
    return Math.round(results.reduce((sum, r) => sum + r.completeness, 0) / results.length);
  }

  /**
   * Print the default XML document
   * @param results - Results already ordered by completeness (descending)
   */
  private printParseXml(args: string[], sourcePath: string, results: ExtractedEnhancedDoc[]): void {
    this.printOutput(
      'parse-results',
      {
        summary: {
          sourcePath,
          totalSymbols: results.length,
          averageCompleteness: this.averageCompleteness(results),
        },
        symbols: results.map((result) => ({
          name: result.symbol.name,
          filePath: path.relative(process.cwd(), result.symbol.filePath),
          line: result.symbol.line,
          completeness: result.completeness,
          missing: result.missing,
        })),
      },
      args
    );
  }

  /**
   * Recursively parse directory
   */
  private parseDirectory(dir: string): ExtractedEnhancedDoc[] {
    const results: ExtractedEnhancedDoc[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          results.push(...this.parseDirectory(filePath));
        }
      } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
        const sourceCode = fs.readFileSync(filePath, 'utf-8');
        const fileResults = this.extractor.extractFromFile(filePath, sourceCode);
        results.push(...fileResults);
      }
    }

    return results;
  }
}
