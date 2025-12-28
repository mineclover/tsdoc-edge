/**
 * Document Symbols Command - List explicitly defined project concepts
 * @packageDocumentation
 * @responsibility Display all document symbols (H1 [[Symbol]] definitions) from managed/
 *
 * @problem Too many auto-generated code symbols, hard to see core project concepts
 * @solves Lists only explicitly documented symbols that represent intentional project concepts
 * @context Project glossary / term dictionary for onboarding and AI context
 *
 * @doc [[DocSymbolsCommand]]
 */

import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { ConfigManager } from '../config/ConfigManager';
import { DocumentSymbolLister, type DocumentSymbol } from '../utilities/DocumentSymbolLister';

/**
 * Document Symbols Command
 *
 * Lists all explicitly defined document symbols from managed/ directory.
 * Shows project's core concepts, not auto-generated code symbols.
 *
 * @public
 * @example
 * ```bash
 * # List all document symbols
 * tsdoc-edge doc-symbols
 *
 * # Filter by category
 * tsdoc-edge doc-symbols --category features
 *
 * # Search by keyword
 * tsdoc-edge doc-symbols --search database
 *
 * # Generate project glossary for LLM
 * tsdoc-edge doc-symbols --llm > project-glossary.txt
 * ```
 */
export class DocSymbolsCommand extends BaseCommand {
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
    return 'doc-symbols';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['glossary'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'List all explicitly defined document symbols (project concepts)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge doc-symbols [options]

List all explicitly defined document symbols (project concepts) from managed/.
Shows project's core concepts, not auto-generated code symbols.

Options:
  --category <cat>   Filter by category (features, concepts, workflows, etc.)
  --search <query>   Search by keyword in name or summary
  --llm              Generate LLM-friendly project glossary format

Examples:
  tsdoc-edge doc-symbols                    List all symbols
  tsdoc-edge doc-symbols --category features
  tsdoc-edge doc-symbols --search database
  tsdoc-edge doc-symbols --llm > glossary.txt`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    // Check for help flag
    if (this.hasHelpFlag(args)) {
      return this.displayHelp();
    }

    const useLlmFormat = args.includes('--llm');
    const categoryFilter = this.getOptionValue(args, '--category')?.split(',').map((c: string) => c.trim());
    const searchQuery = this.getOptionValue(args, '--search')?.toLowerCase();

    try {
      const config = this.configManager.get();
      const managedDir = path.resolve(process.cwd(), 'managed');

      const lister = new DocumentSymbolLister(managedDir);
      let symbols = lister.listAllSymbols();

      // Filter by category
      if (categoryFilter && categoryFilter.length > 0) {
        symbols = symbols.filter(s => categoryFilter.includes(s.category));
      }

      // Filter by search query
      if (searchQuery) {
        symbols = symbols.filter(s =>
          s.name.toLowerCase().includes(searchQuery) ||
          s.summary.toLowerCase().includes(searchQuery) ||
          s.category.toLowerCase().includes(searchQuery)
        );
      }

      // Output
      if (useLlmFormat) {
        const output = this.generateLlmOutput(symbols);
        console.log(output);
      } else {
        this.displayHumanReadable(symbols);
      }

      return { exitCode: 0, message: `Found ${symbols.length} document symbols` };
    } catch (error) {
      this.printError(`Failed to list document symbols: ${error instanceof Error ? error.message : String(error)}`);
      return { exitCode: 1, message: 'Failed to list document symbols' };
    }
  }

  /**
   * Display symbols in human-readable format
   * @private
   */
  private displayHumanReadable(symbols: DocumentSymbol[]): void {
    console.log();
    this.printHeader('📚 Document Symbols');
    console.log();

    if (symbols.length === 0) {
      this.printWarning('No document symbols found in managed/ directory');
      console.log();
      console.log('Document symbols are defined with H1 headings:');
      console.log('  # [[SymbolName]]');
      console.log();
      return;
    }

    // Group by category
    const byCategory = new Map<string, DocumentSymbol[]>();
    for (const symbol of symbols) {
      if (!byCategory.has(symbol.category)) {
        byCategory.set(symbol.category, []);
      }
      byCategory.get(symbol.category)!.push(symbol);
    }

    // Sort categories
    const sortedCategories = Array.from(byCategory.entries()).sort((a, b) => {
      // Priority order
      const order = ['architecture', 'features', 'workflows', 'concepts'];
      const aIndex = order.indexOf(a[0]);
      const bIndex = order.indexOf(b[0]);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });

    // Display by category
    for (const [category, categorySymbols] of sortedCategories) {
      const icon = this.getCategoryIcon(category);
      console.log(`${colors.bold}${icon} ${this.capitalize(category)}${colors.reset} ${colors.dim}(${categorySymbols.length})${colors.reset}`);
      console.log();

      for (const symbol of categorySymbols) {
        console.log(`  ${colors.cyan}•${colors.reset} ${colors.bold}[[${symbol.name}]]${colors.reset}`);

        // Truncate summary if too long
        const maxSummaryLength = 80;
        let summary = symbol.summary;
        if (summary.length > maxSummaryLength) {
          summary = summary.substring(0, maxSummaryLength) + '...';
        }

        console.log(`    ${colors.dim}${summary}${colors.reset}`);
        console.log(`    ${colors.dim}📄 ${symbol.filePath}${colors.reset}`);
        console.log();
      }
    }

    // Summary
    console.log(`${colors.dim}${'─'.repeat(80)}${colors.reset}`);
    console.log(`${colors.bold}Total:${colors.reset} ${symbols.length} document symbols across ${byCategory.size} categories`);
    console.log();
  }

  /**
   * Generate LLM-friendly output
   * @private
   */
  private generateLlmOutput(symbols: DocumentSymbol[]): string {
    let output = '';

    // Header
    output += `# Project Glossary: TSDoc Edge\n\n`;
    output += `> **Generated**: ${new Date().toISOString()}\n`;
    output += `> **Total Symbols**: ${symbols.length}\n`;

    // List categories
    const categories = new Set(symbols.map(s => s.category));
    output += `> **Categories**: ${Array.from(categories).sort().join(', ')}\n\n`;
    output += `---\n\n`;

    output += `## Overview\n\n`;
    output += `This glossary contains ${symbols.length} explicitly defined document symbols that represent the core concepts of TSDoc Edge. `;
    output += `Each symbol has exactly one authoritative definition (SSOT principle) and represents an intentionally managed project concept.\n\n`;

    // Group by category
    const byCategory = new Map<string, DocumentSymbol[]>();
    for (const symbol of symbols) {
      if (!byCategory.has(symbol.category)) {
        byCategory.set(symbol.category, []);
      }
      byCategory.get(symbol.category)!.push(symbol);
    }

    // Sort categories
    const sortedCategories = Array.from(byCategory.entries()).sort((a, b) => {
      const order = ['architecture', 'features', 'workflows', 'concepts'];
      const aIndex = order.indexOf(a[0]);
      const bIndex = order.indexOf(b[0]);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });

    // Generate sections by category
    for (const [category, categorySymbols] of sortedCategories) {
      output += `## ${this.capitalize(category)} (${categorySymbols.length} symbols)\n\n`;

      for (const symbol of categorySymbols) {
        output += `### [[${symbol.name}]]\n\n`;
        output += `**Location**: \`${symbol.filePath}\`\n\n`;
        output += `**Definition**: ${symbol.summary}\n\n`;

        if (symbol.referenceCount > 1) {
          // -1 because H1 itself is counted
          output += `**References**: ${symbol.referenceCount - 1} cross-references in this document\n\n`;
        }

        output += `---\n\n`;
      }
    }

    // Footer
    output += `## Usage\n\n`;
    output += `These symbols represent the core vocabulary of TSDoc Edge. When working with this codebase:\n\n`;
    output += `1. **Understand these concepts first** - They form the foundation of the project\n`;
    output += `2. **Use consistent terminology** - Always refer to concepts by their [[Symbol]] names\n`;
    output += `3. **Link to definitions** - Reference symbols with [[SymbolName]] syntax in documentation\n`;
    output += `4. **Maintain SSOT** - Each symbol has exactly one authoritative definition\n\n`;

    output += `_Generated by TSDoc Edge doc-symbols command with --llm flag_\n`;

    return output;
  }

  /**
   * Get icon for category
   * @private
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'architecture': '🏗️',
      'features': '⚙️',
      'workflows': '🔄',
      'concepts': '💡',
      'commands': '⌨️',
      'root': '📁',
    };

    return icons[category] || '📄';
  }

  /**
   * Capitalize first letter
   * @private
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get option value from args
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
