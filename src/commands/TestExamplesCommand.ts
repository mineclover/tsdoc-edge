/**
 * Test Examples Command - Extract and show test-based examples
 * @packageDocumentation
 * @responsibility Display test cases that can serve as documentation examples
 *
 * @problem Generic documentation examples become stale
 * @solves Shows actual test cases as living examples
 * @context SSOT principle: Tests are single source of truth for examples
 *
 * @doc [[TestExamplesCommand]]
 */

import { type TestExample, TestExampleExtractor } from '../analyzer/TestExampleExtractor';
import { ConfigManager } from '../config/ConfigManager';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Test Examples Command
 *
 * Extracts and displays test cases that can serve as documentation examples.
 *
 * @public
 * @example
 * ```bash
 * # Show all test examples
 * tsdoc-edge test-examples
 *
 * # Show examples for a specific file
 * tsdoc-edge test-examples --file DatabaseManager.test.ts
 *
 * # Filter by quality
 * tsdoc-edge test-examples --min-quality 8
 *
 * # Filter by complexity
 * tsdoc-edge test-examples --complexity simple
 * ```
 */
export class TestExamplesCommand extends BaseCommand {
  /**
   * configManager property
   * @public
   */
  protected configManager = ConfigManager.getInstance();

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'test-examples';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['examples', 'tex'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Extract and show test cases as documentation examples';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge test-examples [options]

Options:
  --file <name>        Filter by test file name
  --min-quality <n>    Minimum quality score (0-10)
  --complexity <level> Filter by complexity: simple, medium, complex
  --category <cat>     Filter by category: basic-usage, advanced-usage, integration, edge-case
  --limit <n>          Maximum examples to show (default: 20)

Examples:
  tsdoc-edge tex                           Show top examples
  tsdoc-edge tex --file DatabaseManager    Filter by file name
  tsdoc-edge tex --min-quality 8           Show only high-quality examples
  tsdoc-edge tex --complexity simple       Show simple examples`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    // Check for help flag first
    if (this.hasHelpFlag(args)) {
      return this.displayHelp();
    }

    // Parse options
    const options = this.parseOptions(args);

    console.log();
    this.printHeader('Test Examples - Living Documentation');
    console.log('Extract test cases to use as documentation examples');
    console.log();

    try {
      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const _config = this.configManager.get();
      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = new DatabaseManager(dbPath, jsonlPath);
      const extractor = new TestExampleExtractor(dbManager);

      // Extract examples
      this.printInfo('Extracting test examples...');
      console.log();

      const allExamples = extractor.extractAllExamples();

      // Filter examples
      let examples = allExamples;

      if (options.file) {
        examples = examples.filter((ex) => ex.filePath.includes(options.file!));
      }

      if (options.minQuality !== undefined) {
        examples = examples.filter((ex) => ex.quality >= options.minQuality!);
      }

      if (options.complexity) {
        examples = examples.filter((ex) => ex.complexity === options.complexity);
      }

      if (options.category) {
        examples = examples.filter((ex) => ex.category === options.category);
      }

      // Sort by quality
      examples.sort((a, b) => b.quality - a.quality);

      // Display summary
      this.printSection('📊 Summary');
      console.log(`  ${colors.bold}Total Examples:${colors.reset}      ${allExamples.length}`);
      console.log(`  ${colors.bold}Filtered Examples:${colors.reset}   ${examples.length}`);
      console.log();

      // Display quality distribution
      const qualityDistribution = this.getQualityDistribution(allExamples);
      console.log(`  ${colors.bold}Quality Distribution:${colors.reset}`);
      console.log(`    High (8-10):   ${qualityDistribution.high} examples`);
      console.log(`    Medium (5-7):  ${qualityDistribution.medium} examples`);
      console.log(`    Low (0-4):     ${qualityDistribution.low} examples`);
      console.log();

      // Display complexity distribution
      const complexityDistribution = this.getComplexityDistribution(allExamples);
      console.log(`  ${colors.bold}Complexity Distribution:${colors.reset}`);
      console.log(`    Simple:   ${complexityDistribution.simple} examples`);
      console.log(`    Medium:   ${complexityDistribution.medium} examples`);
      console.log(`    Complex:  ${complexityDistribution.complex} examples`);
      console.log();

      // Display category distribution
      const categoryDistribution = this.getCategoryDistribution(allExamples);
      console.log(`  ${colors.bold}Category Distribution:${colors.reset}`);
      console.log(`    Basic Usage:    ${categoryDistribution['basic-usage']} examples`);
      console.log(`    Advanced Usage: ${categoryDistribution['advanced-usage']} examples`);
      console.log(`    Integration:    ${categoryDistribution.integration} examples`);
      console.log(`    Edge Cases:     ${categoryDistribution['edge-case']} examples`);
      console.log();

      // Display top examples
      if (examples.length === 0) {
        this.printWarning('No examples found matching criteria');
        dbManager.close();
        return { exitCode: 0, message: 'No examples found' };
      }

      this.printSection(`🌟 Top Examples (showing ${Math.min(examples.length, 20)})`);
      console.log();

      const topExamples = examples.slice(0, 20);

      for (let i = 0; i < topExamples.length; i++) {
        const example = topExamples[i];
        this.displayExample(example, i + 1);
      }

      if (examples.length > 20) {
        console.log(`  ${colors.dim}... and ${examples.length - 20} more examples${colors.reset}`);
        console.log();
      }

      // Display recommendations
      this.printSection('💡 Recommendations');
      console.log();

      const highQualityExamples = examples.filter((ex) => ex.quality >= 8);
      if (highQualityExamples.length > 0) {
        console.log(
          `  ${colors.green}✓${colors.reset} ${highQualityExamples.length} high-quality examples ready for documentation`
        );
      }

      const simpleExamples = examples.filter((ex) => ex.complexity === 'simple');
      if (simpleExamples.length > 0) {
        console.log(
          `  ${colors.green}✓${colors.reset} ${simpleExamples.length} simple examples great for getting started`
        );
      }

      const basicUsageExamples = examples.filter((ex) => ex.category === 'basic-usage');
      if (basicUsageExamples.length > 0) {
        console.log(
          `  ${colors.green}✓${colors.reset} ${basicUsageExamples.length} basic usage examples for API documentation`
        );
      }

      console.log();
      console.log(
        `  ${colors.cyan}Tip:${colors.reset} Use --min-quality 8 to see only high-quality examples`
      );
      console.log(
        `  ${colors.cyan}Tip:${colors.reset} Use --complexity simple to see beginner-friendly examples`
      );
      console.log();

      dbManager.close();

      return { exitCode: 0, message: 'Examples extracted' };
    } catch (error) {
      this.printError(
        `Failed to extract examples: ${error instanceof Error ? error.message : String(error)}`
      );
      return { exitCode: 1, message: 'Extraction failed' };
    }
  }

  /**
   * Display a single example
   * @private
   */
  private displayExample(example: TestExample, index: number): void {
    const qualityColor =
      example.quality >= 8 ? colors.green : example.quality >= 5 ? colors.yellow : colors.red;
    const complexityBadge =
      example.complexity === 'simple' ? '🟢' : example.complexity === 'medium' ? '🟡' : '🔴';

    console.log(`  ${colors.bold}${index}.${colors.reset} ${example.description}`);
    console.log(
      `     ${colors.dim}Quality:${colors.reset} ${qualityColor}${example.quality}/10${colors.reset} | ${colors.dim}Complexity:${colors.reset} ${complexityBadge} ${example.complexity} | ${colors.dim}Category:${colors.reset} ${example.category}`
    );
    console.log(`     ${colors.dim}File:${colors.reset} ${example.filePath}:${example.line}`);
    console.log(
      `     ${colors.dim}Tests:${colors.reset} ${example.testedSymbols.slice(0, 3).join(', ')}${example.testedSymbols.length > 3 ? ` +${example.testedSymbols.length - 3}` : ''}`
    );
    console.log();
  }

  /**
   * Get quality distribution
   * @private
   */
  private getQualityDistribution(examples: TestExample[]): {
    high: number;
    medium: number;
    low: number;
  } {
    return {
      high: examples.filter((ex) => ex.quality >= 8).length,
      medium: examples.filter((ex) => ex.quality >= 5 && ex.quality < 8).length,
      low: examples.filter((ex) => ex.quality < 5).length,
    };
  }

  /**
   * Get complexity distribution
   * @private
   */
  private getComplexityDistribution(examples: TestExample[]): Record<string, number> {
    return {
      simple: examples.filter((ex) => ex.complexity === 'simple').length,
      medium: examples.filter((ex) => ex.complexity === 'medium').length,
      complex: examples.filter((ex) => ex.complexity === 'complex').length,
    };
  }

  /**
   * Get category distribution
   * @private
   */
  private getCategoryDistribution(examples: TestExample[]): Record<string, number> {
    return {
      'basic-usage': examples.filter((ex) => ex.category === 'basic-usage').length,
      'advanced-usage': examples.filter((ex) => ex.category === 'advanced-usage').length,
      integration: examples.filter((ex) => ex.category === 'integration').length,
      'edge-case': examples.filter((ex) => ex.category === 'edge-case').length,
    };
  }

  /**
   * Parse command options
   * @private
   */
  private parseOptions(args: string[]): {
    file?: string;
    minQuality?: number;
    complexity?: 'simple' | 'medium' | 'complex';
    category?: 'basic-usage' | 'advanced-usage' | 'integration' | 'edge-case';
  } {
    const options: Record<string, unknown> = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--file' && args[i + 1]) {
        options.file = args[i + 1];
        i++;
      } else if (arg === '--min-quality' && args[i + 1]) {
        options.minQuality = parseInt(args[i + 1], 10);
        i++;
      } else if (arg === '--complexity' && args[i + 1]) {
        options.complexity = args[i + 1];
        i++;
      } else if (arg === '--category' && args[i + 1]) {
        options.category = args[i + 1];
        i++;
      }
    }

    return options;
  }
}
