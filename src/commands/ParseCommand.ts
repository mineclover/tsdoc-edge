/**
 * Parse command - Parse and display enhanced documentation
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { EnhancedDocExtractor } from '../parser/EnhancedDocExtractor';

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

  protected getUsage(): string {
    return `tsdoc-edge parse <source-path>

  source-path can be a file or directory`;
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

      const sourcePath = args[0];

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

      this.printHeader('TSDoc Edge - Parse Enhanced Docs');
      console.log(`Parsing: ${colors.cyan}${sourcePath}${colors.reset}`);
      console.log();

      const stats = fs.statSync(sourcePath);
      let allResults: any[] = [];

      if (stats.isDirectory()) {
        allResults = this.parseDirectory(sourcePath);
      } else {
        const sourceCode = fs.readFileSync(sourcePath, 'utf-8');
        allResults = this.extractor.extractFromFile(sourcePath, sourceCode);
      }

      if (allResults.length === 0) {
        this.printWarning('No enhanced documentation found');
        console.log();
        console.log('Add custom TSDoc tags to your code:');
        console.log(
          `  ${colors.dim}@problem, @functionality, @errorExp, @decision, @dependency, @plan${colors.reset}`
        );
        console.log();
        return this.success();
      }

      this.printSection('📊 Extraction Results');
      console.log(`   Total Symbols: ${colors.cyan}${allResults.length}${colors.reset}`);
      console.log();

      // Show symbols by completeness
      const byCompleteness = allResults.sort((a, b) => b.completeness - a.completeness);

      this.printSection('📋 Symbols by Completeness');
      for (const result of byCompleteness) {
        const relPath = path.relative(process.cwd(), result.symbol.filePath);
        const completenessColor =
          result.completeness >= 70
            ? colors.green
            : result.completeness >= 40
              ? colors.yellow
              : colors.red;
        console.log(`   ${colors.cyan}${result.symbol.name}${colors.reset}`);
        console.log(`     ${relPath}:${result.symbol.line}`);
        console.log(
          `     Completeness: ${completenessColor}${result.completeness}%${colors.reset}`
        );
        if (result.missing.length > 0) {
          console.log(`     Missing: ${colors.dim}${result.missing.join(', ')}${colors.reset}`);
        }
        console.log();
      }

      // Calculate average completeness
      const avgCompleteness = Math.round(
        allResults.reduce((sum, r) => sum + r.completeness, 0) / allResults.length
      );

      this.printSuccess(`Average Completeness: ${avgCompleteness}%`);
      console.log();

      return this.success();
    });
  }

  /**
   * Recursively parse directory
   */
  private parseDirectory(dir: string): any[] {
    const results: any[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          results.push(...this.parseDirectory(filePath));
        }
      } else if (
        file.endsWith('.ts') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.d.ts')
      ) {
        const sourceCode = fs.readFileSync(filePath, 'utf-8');
        const fileResults = this.extractor.extractFromFile(filePath, sourceCode);
        results.push(...fileResults);
      }
    }

    return results;
  }
}
