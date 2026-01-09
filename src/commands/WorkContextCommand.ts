/**
 * Work Context Command - Relationship-based context discovery
 * @packageDocumentation
 * @responsibility Provide complete work context before editing a file
 *
 * @problem Developers need all context before modifying code
 * @solves Uses relationship graph for comprehensive, instant context
 * @context SSOT principle: Minimal queries, maximum information
 *
 * @doc [[WorkContextCommand]]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { ConfigManager } from '../config/ConfigManager';
import { DatabaseManager } from '../storage/DatabaseManager';
import { EnhancedWorkContextAnalyzer } from '../analyzer/EnhancedWorkContextAnalyzer';
import { EntryPointContextAggregator } from '../analyzer/EntryPointContextAggregator';
import { LLMsTextGenerator } from '../generator/LLMsTextGenerator';
import { XMLContextGenerator } from '../generator/XMLContextGenerator';

/**
 * Work Context Command
 *
 * Shows comprehensive context for a file using relationship graph analysis.
 *
 * @public
 * @example
 * ```bash
 * # Get complete context for a file
 * tsdoc-edge work-context src/storage/DatabaseManager.ts
 *
 * # Get LLM-friendly context
 * tsdoc-edge work-context src/storage/DatabaseManager.ts --llm
 *
 * # Save LLM context to file
 * tsdoc-edge work-context src/storage/DatabaseManager.ts --llm --output context.txt
 *
 * # Alias
 * tsdoc-edge wc src/storage/DatabaseManager.ts
 * tsdoc-edge wc src/storage/DatabaseManager.ts --llm
 * ```
 */
export class WorkContextCommand extends BaseCommand {
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
    return 'work-context';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['wc'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show comprehensive relationship-based context for a file';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {

    if (args.length < 1 || args[0].startsWith('--')) {
      console.log(`${colors.yellow}Usage:${colors.reset} tsdoc-edge work-context <file-path> [options]`);
      console.log();
      console.log('Options:');
      console.log('  --human            Human-readable format with colors (default: XML)');
      console.log('  --llm              LLMs.txt markdown format');
      console.log('  --output <file>    Save output to file instead of stdout');
      console.log('  --depth <n>        Context depth (default: 2)');
      console.log('  --category <cats>  Filter by categories (comma-separated)');
      console.log('                     Available: documentation, structural, verification');
      console.log();
      console.log('Examples:');
      console.log('  tsdoc-edge work-context src/storage/DatabaseManager.ts');
      console.log('  tsdoc-edge wc src/commands/BuildCommand.ts --llm');
      console.log('  tsdoc-edge wc src/analyzer/Parser.ts --llm --output context.txt');
      console.log('  tsdoc-edge wc src/commands/BuildCommand.ts --category structural');
      console.log('  tsdoc-edge wc src/storage/DatabaseManager.ts --category documentation,verification');
      console.log();
      console.log('Tip: Use this before editing a file to see all related context');
      return { exitCode: 1, message: 'File path required' };
    }

    const targetFile = args[0];
    const useHumanFormat = args.includes('--human');
    const useLlmFormat = args.includes('--llm');
    // Default to XML format unless --human or --llm is specified
    const useXmlFormat = !useHumanFormat && !useLlmFormat;
    const outputFile = this.getOptionValue(args, '--output');
    const depth = parseInt(this.getOptionValue(args, '--depth') || '2', 10);
    const categoryFilter = this.getOptionValue(args, '--category')?.split(',').map((c: string) => c.trim());

    // Resolve absolute path
    const absolutePath = path.resolve(process.cwd(), targetFile);

    if (!fs.existsSync(absolutePath)) {
      this.printError(`File not found: ${targetFile}`);
      return { exitCode: 1, message: 'File not found' };
    }

    // Only show header for human-readable format
    if (!useXmlFormat) {
      console.log();
      this.printHeader(`Work Context: ${path.basename(targetFile)}`);
      console.log(`📄 ${targetFile}`);
      console.log();
    }

    try {
      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const config = this.configManager.get();
      const dbPath = this.getDatabasePath();

      const dbManager = new DatabaseManager(dbPath, config.paths.jsonlDir);

      // Branch: XML format vs LLM format vs Human-readable format
      if (useXmlFormat) {
        // Use compact XML format (optimized for Claude) - no header decoration
        const aggregator = new EntryPointContextAggregator(dbManager);
        const context = aggregator.gatherContext(absolutePath, depth);

        const generator = new XMLContextGenerator();
        const output = generator.generate(context);

        if (outputFile) {
          const outputPath = path.resolve(process.cwd(), outputFile);
          fs.writeFileSync(outputPath, output, 'utf-8');
          console.log(`XML context saved to: ${outputFile}`);
        } else {
          console.log(output);
        }

        dbManager.close();
        return { exitCode: 0, message: 'XML context generated' };
      }

      if (useLlmFormat) {
        // Use LLM-friendly format
        const aggregator = new EntryPointContextAggregator(dbManager);
        const context = aggregator.gatherContext(absolutePath, depth);

        const generator = new LLMsTextGenerator(dbManager);
        const output = generator.generate(context);

        if (outputFile) {
          // Save to file
          const outputPath = path.resolve(process.cwd(), outputFile);
          fs.writeFileSync(outputPath, output, 'utf-8');
          this.printSuccess(`LLM context saved to: ${outputFile}`);
          console.log();
          console.log(`${colors.dim}Context metadata:${colors.reset}`);
          console.log(`  Entry point: ${context.entryPoint}`);
          console.log(`  Type: ${context.entryPointType}`);
          console.log(`  Depth: ${depth}`);
          console.log(`  Total relationships: ${context.metadata.totalRelationships}`);
          console.log(`  Explicit: ${context.metadata.explicitCount}`);
          console.log(`  Inferred: ${context.metadata.inferredCount}`);
          console.log(`  Output size: ${(output.length / 1024).toFixed(2)} KB`);
        } else {
          // Print to stdout
          console.log(output);
        }

        dbManager.close();
        return { exitCode: 0, message: 'LLM context generated' };
      }

      // Human-readable format (original behavior)
      const analyzer = new EnhancedWorkContextAnalyzer(dbManager);

      // Analyze file
      const context = analyzer.analyze(absolutePath);

      // Helper function to check if a category should be displayed
      const shouldShowCategory = (category: string): boolean => {
        if (!categoryFilter || categoryFilter.length === 0) return true;
        return categoryFilter.includes(category);
      };

      if (context.symbols.length === 0) {
        this.printWarning('No symbols found in this file');
        console.log();
        console.log('This file may not have been indexed. Try rebuilding:');
        console.log('  tsdoc-edge build src --force');
        dbManager.close();
        return { exitCode: 0, message: 'No symbols found' };
      }

      // Display summary
      this.printSection('📊 Summary');
      console.log(`  ${colors.bold}Symbols:${colors.reset}              ${context.summary.symbolCount}`);
      console.log(`  ${colors.bold}Relationships:${colors.reset}        ${context.summary.relationshipCount}`);
      console.log(`  ${colors.bold}Relationship Density:${colors.reset} ${context.summary.density.toFixed(2)}`);
      console.log(`  ${colors.bold}Test Coverage:${colors.reset}        ${context.summary.testCoverage.toFixed(1)}% (${context.relationships.tests.length} tests)`);
      console.log(`  ${colors.bold}Documentation:${colors.reset}        ${context.summary.documentationCoverage.toFixed(1)}% (${context.relationships.documentation.length} docs)`);
      console.log();

      // Display symbols
      this.printSection('🔤 Symbols');
      const exportedSymbols = context.symbols.filter(s => s.isExported);
      const publicSymbols = context.symbols.filter(s => s.isPublic);

      console.log(`  Total: ${context.symbols.length} (${exportedSymbols.length} exported, ${publicSymbols.length} public)`);
      console.log();

      // Show top symbols
      context.symbols.slice(0, 10).forEach(symbol => {
        const badges: string[] = [];
        if (symbol.isExported) badges.push('exported');
        if (symbol.isPublic) badges.push('public');

        const badgeStr = badges.length > 0 ? ` [${badges.join(', ')}]` : '';
        console.log(`  ${colors.cyan}${symbol.name}${colors.reset} (${symbol.type})${badgeStr}`);
      });

      if (context.symbols.length > 10) {
        console.log(`  ${colors.dim}... and ${context.symbols.length - 10} more${colors.reset}`);
      }
      console.log();

      // Documentation
      if (shouldShowCategory('documentation') && context.relationships.documentation.length > 0) {
        this.printSection('📄 Documentation');
        const uniqueDocs = new Map<string, string[]>();

        for (const doc of context.relationships.documentation) {
          if (!uniqueDocs.has(doc.docRef)) {
            uniqueDocs.set(doc.docRef, []);
          }
          uniqueDocs.get(doc.docRef)!.push(doc.symbolName);
        }

        for (const [docRef, symbols] of uniqueDocs) {
          console.log(`  ${colors.cyan}[[${docRef}]]${colors.reset}`);
          console.log(`    Referenced by: ${symbols.slice(0, 3).join(', ')}${symbols.length > 3 ? ` +${symbols.length - 3}` : ''}`);
        }
        console.log();
      }

      // Test Coverage
      if (shouldShowCategory('verification')) {
        if (context.relationships.tests.length > 0) {
          this.printSection('✅ Test Coverage');
          console.log(`  ${context.relationships.tests.length} test cases covering ${context.impact.testFiles.size} test file(s)`);
          console.log();

          // Group by symbol
          const testsBySymbol = new Map<string, string[]>();
          for (const test of context.relationships.tests) {
            if (!testsBySymbol.has(test.symbolName)) {
              testsBySymbol.set(test.symbolName, []);
            }
            testsBySymbol.get(test.symbolName)!.push(test.testName);
          }

          // Show top tested symbols
          const sortedSymbols = Array.from(testsBySymbol.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 5);

          for (const [symbolName, tests] of sortedSymbols) {
            console.log(`  ${colors.green}${symbolName}${colors.reset}: ${tests.length} tests`);
            tests.slice(0, 3).forEach(testName => {
              console.log(`    • ${testName}`);
            });
            if (tests.length > 3) {
              console.log(`    ${colors.dim}... and ${tests.length - 3} more${colors.reset}`);
            }
          }

          console.log();
          console.log(`  ${colors.dim}Test files:${colors.reset}`);
          Array.from(context.impact.testFiles).slice(0, 3).forEach(testFile => {
            console.log(`    ${path.relative(process.cwd(), testFile)}`);
          });
          if (context.impact.testFiles.size > 3) {
            console.log(`    ${colors.dim}... and ${context.impact.testFiles.size - 3} more${colors.reset}`);
          }
          console.log();
        } else {
          this.printWarning('⚠️  No test coverage found');
          console.log();
        }
      }

      // Dependencies
      if (shouldShowCategory('structural') && context.relationships.dependencies.length > 0) {
        this.printSection('📦 Dependencies');
        console.log(`  This file depends on ${context.impact.dependencyFiles.size} other file(s)`);
        console.log();

        const depFiles = Array.from(context.impact.dependencyFiles).slice(0, 10);
        depFiles.forEach(depFile => {
          const relativePath = path.relative(process.cwd(), depFile);
          console.log(`  ${colors.blue}${relativePath}${colors.reset}`);
        });

        if (context.impact.dependencyFiles.size > 10) {
          console.log(`  ${colors.dim}... and ${context.impact.dependencyFiles.size - 10} more${colors.reset}`);
        }
        console.log();
      }

      // Dependents (Impact Analysis)
      if (shouldShowCategory('structural') && context.relationships.dependents.length > 0) {
        this.printSection('🔗 Impact Analysis');
        console.log(`  ${context.impact.dependentFiles.size} file(s) depend on this file`);
        console.log();

        const depFiles = Array.from(context.impact.dependentFiles).slice(0, 10);
        depFiles.forEach(depFile => {
          const relativePath = path.relative(process.cwd(), depFile);
          console.log(`  ${colors.yellow}${relativePath}${colors.reset}`);
        });

        if (context.impact.dependentFiles.size > 10) {
          console.log(`  ${colors.dim}... and ${context.impact.dependentFiles.size - 10} more${colors.reset}`);
        }

        console.log();
        this.printWarning('⚠️  Changes to this file may affect the files listed above');
        console.log();
      }

      // Semantic Neighbors
      if (context.relationships.semanticNeighbors.length > 0) {
        this.printSection('🌐 Semantic Neighbors');
        console.log(`  ${context.relationships.semanticNeighbors.length} related symbols (same domain/feature)`);
        console.log();

        const neighborsBySymbol = new Map<string, string[]>();
        for (const neighbor of context.relationships.semanticNeighbors) {
          if (!neighborsBySymbol.has(neighbor.symbolName)) {
            neighborsBySymbol.set(neighbor.symbolName, []);
          }
          neighborsBySymbol.get(neighbor.symbolName)!.push(neighbor.neighborName);
        }

        for (const [symbolName, neighbors] of Array.from(neighborsBySymbol.entries()).slice(0, 5)) {
          console.log(`  ${colors.cyan}${symbolName}${colors.reset} → ${neighbors.slice(0, 3).join(', ')}${neighbors.length > 3 ? ` +${neighbors.length - 3}` : ''}`);
        }
        console.log();
      }

      // Actionable recommendations
      this.printSection('💡 Recommendations');

      if (context.summary.testCoverage < 80) {
        console.log(`  ${colors.yellow}•${colors.reset} Low test coverage (${context.summary.testCoverage.toFixed(1)}%) - consider adding tests`);
      }

      if (context.summary.documentationCoverage < 50) {
        console.log(`  ${colors.yellow}•${colors.reset} Low documentation coverage (${context.summary.documentationCoverage.toFixed(1)}%) - add @doc tags`);
      }

      if (context.relationships.dependents.length > 20) {
        console.log(`  ${colors.yellow}•${colors.reset} High impact file (${context.relationships.dependents.length} dependents) - test thoroughly`);
      }

      if (context.summary.density < 2.0) {
        console.log(`  ${colors.yellow}•${colors.reset} Low relationship density (${context.summary.density.toFixed(2)}) - consider adding semantic relationships`);
      }

      console.log();

      dbManager.close();

      return { exitCode: 0, message: 'Context displayed' };
    } catch (error) {
      this.printError(`Failed to analyze file: ${error instanceof Error ? error.message : String(error)}`);
      return { exitCode: 1, message: 'Analysis failed' };
    }
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
  private getOptionValue(args: string[], option: string, defaultValue?: string): string | undefined {
    const index = args.indexOf(option);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
    return defaultValue;
  }
}
