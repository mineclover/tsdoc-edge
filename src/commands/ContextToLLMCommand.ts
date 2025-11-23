/**
 * Context to LLM Command
 * @packageDocumentation
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { EntryPointContextAggregator } from '../analyzer/EntryPointContextAggregator';
import { LLMsTextGenerator } from '../generator/LLMsTextGenerator';

/**
 * Command to generate LLM-friendly context for an entry point
 *
 * @public
 * @responsibility Generate comprehensive context in LLMs.txt format
 * @contract Aggregate all relationships and format for LLM consumption
 *
 * @problem Developers and LLMs need complete context before modifying code
 * @solves Single command to get all relevant information about an entry point
 * @context Part of AI-assisted development workflow
 *
 * @functionality
 * - Accept file path, symbol ID, or doc symbol as entry point
 * - Aggregate all relationships (dependencies, usages, docs, tests)
 * - Generate LLMs.txt formatted output
 * - Save to file or print to stdout
 * - Support different depth levels
 *
 * @decision Use LLMs.txt format
 * @rationale Standard format that LLMs understand well
 * @consequences Easy integration with AI coding assistants
 */
export class ContextToLLMCommand extends BaseCommand {
  /**
   * Get command name
   *
   * @returns Command name
   */
  getName(): string {
    return 'context-to-llm';
  }

  /**
   * Get command description
   *
   * @returns Command description
   */
  getDescription(): string {
    return 'Generate LLM-friendly context for a file, symbol, or document';
  }

  protected getUsage(): string {
    return `tsdoc-edge context-to-llm <entry-point> [options]

  Entry Point:
    - File path:    src/analyzer/DocReferenceAnalyzer.ts
    - Symbol ID:    class-docreferenceanalyzer
    - Doc symbol:   "[[FeatureName]]"

  Options:
    --depth <n>      Relationship traversal depth (default: 2)
    --output <file>  Save to file instead of stdout
    --format <fmt>   Output format: llms-txt (default), json

  Examples:
    tsdoc-edge context-to-llm src/commands/BuildCommand.ts
    tsdoc-edge context-to-llm class-buildcommand --depth 3
    tsdoc-edge context-to-llm "[[CLI Commands]]" --output context.txt`;
  }

  /**
   * Execute command
   *
   * @param args - Command arguments
   * @returns Command result
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const entryPoint = args[0];

      if (!entryPoint) {
        this.printError('Entry point required');
        console.log();
        console.log('Usage:');
        this.printInfo('  tsdoc-edge context-to-llm <file|symbol|doc>');
        console.log();
        return this.failure('Entry point required');
      }

      // Parse options
      const depth = this.getOptionValue(args, '--depth', 2);
      const outputFile = this.getOptionValue(args, '--output');
      const format = this.getOptionValue(args, '--format', 'llms-txt');

      this.printHeader('TSDoc Edge - Context to LLM');
      console.log(`Entry point: ${colors.cyan}${entryPoint}${colors.reset}`);
      console.log(`Depth: ${colors.cyan}${depth}${colors.reset}`);
      console.log(`Format: ${colors.cyan}${format}${colors.reset}`);

      if (outputFile) {
        console.log(`Output: ${colors.cyan}${outputFile}${colors.reset}`);
      }

      console.log();

      // Initialize database
      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');

      if (!fs.existsSync(dbPath)) {
        this.printError('Database not found. Run "tsdoc-edge build src" first.');
        return this.failure('Database not found');
      }

      const dbManager = new DatabaseManager(dbPath, jsonlPath);

      try {
        // Aggregate context
        this.printSection('Aggregating Context');
        const aggregator = new EntryPointContextAggregator(dbManager);
        const context = aggregator.gatherContext(entryPoint, depth);

        console.log(`  Entry point type: ${colors.cyan}${context.entryPointType}${colors.reset}`);
        console.log(`  Total relationships: ${colors.cyan}${context.metadata.totalRelationships}${colors.reset}`);
        console.log(`    Explicit: ${colors.green}${context.metadata.explicitCount}${colors.reset}`);
        console.log(`    Inferred: ${colors.yellow}${context.metadata.inferredCount}${colors.reset}`);
        console.log();

        if (context.primarySymbol) {
          this.printSection('Primary Symbol');
          console.log(`  Name: ${colors.cyan}${context.primarySymbol.name}${colors.reset}`);
          console.log(`  Type: ${colors.cyan}${context.primarySymbol.type}${colors.reset}`);
          console.log(`  File: ${colors.dim}${context.primarySymbol.filePath}:${context.primarySymbol.line}${colors.reset}`);
          console.log();
        }

        // Show quick stats
        this.printSection('Context Overview');
        console.log(`  Dependencies: ${colors.cyan}${context.dependencies.length}${colors.reset}`);
        console.log(`  Used by: ${colors.cyan}${context.usedBy.length}${colors.reset}`);
        console.log(`  Doc references: ${colors.cyan}${context.docReferences.length}${colors.reset}`);
        console.log(`  Referenced by docs: ${colors.cyan}${context.referencedByDocs.length}${colors.reset}`);
        console.log(`  Related symbols: ${colors.cyan}${context.relatedSymbols.length}${colors.reset}`);
        console.log(`  Test coverage: ${colors.cyan}${context.testCoverage.length}${colors.reset}`);
        console.log();

        // Show impact
        this.printSection('Change Impact');
        console.log(`  Direct impact: ${colors.yellow}${context.impact.directImpact}${colors.reset} symbols`);
        console.log(`  Transitive impact: ${colors.yellow}${context.impact.transitiveImpact}${colors.reset} symbols`);
        console.log(`  Affected files: ${colors.yellow}${context.impact.affectedFiles.length}${colors.reset}`);
        console.log(`  Affected tests: ${colors.yellow}${context.impact.affectedTests.length}${colors.reset}`);
        console.log(`  Affected docs: ${colors.yellow}${context.impact.affectedDocs.length}${colors.reset}`);
        console.log();

        // Generate output
        this.printSection('Generating Output');
        let output: string;

        if (format === 'json') {
          output = JSON.stringify(context, null, 2);
        } else {
          // Default: llms-txt
          const generator = new LLMsTextGenerator(dbManager);
          output = generator.generate(context);
        }

        // Save or print
        if (outputFile) {
          fs.writeFileSync(outputFile, output, 'utf-8');
          this.printSuccess(`Context saved to: ${outputFile}`);
          console.log(`  Size: ${colors.cyan}${(output.length / 1024).toFixed(2)} KB${colors.reset}`);
        } else {
          console.log();
          console.log('─'.repeat(80));
          console.log(output);
          console.log('─'.repeat(80));
        }

        console.log();
        this.printSuccess('Context generated successfully!');
        console.log();

        return this.success();
      } finally {
        dbManager.close();
      }
    });
  }

  /**
   * Get option value from args
   *
   * @param args - Command arguments
   * @param option - Option name (e.g., '--depth')
   * @param defaultValue - Default value if not found
   * @returns Option value
   * @private
   */
  private getOptionValue(args: string[], option: string, defaultValue?: any): any {
    const index = args.indexOf(option);
    if (index !== -1 && index + 1 < args.length) {
      const value = args[index + 1];
      // Try to parse as number if default is number
      if (typeof defaultValue === 'number') {
        const num = parseInt(value, 10);
        return isNaN(num) ? defaultValue : num;
      }
      return value;
    }
    return defaultValue;
  }
}
