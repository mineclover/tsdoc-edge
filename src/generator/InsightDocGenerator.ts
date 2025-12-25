/**
 * Generates insight documentation from depth-traversed symbols
 * @packageDocumentation
 * @responsibility Generate hierarchical documentation by depth levels
 */

import type { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import type { Symbol } from '../types/graph';

/**
 * Options for insight document generation
 * @doc [[InsightDocGenerator]]
 * @public
 */
export interface InsightGenOptions {
  /**
   * Document title
   */
  title?: string;

  /**
   * Entry point description
   */
  entryDescription?: string;

  /**
   * Include symbol type badges
   */
  includeTypeBadges?: boolean;

  /**
   * Include dependency counts
   */
  includeDependencyCounts?: boolean;

  /**
   * Group by category instead of depth
   */
  groupByCategory?: boolean;
}

/**
 * Symbol category for grouping
 */
type SymbolCategory =
  | 'Core Workflow'
  | 'Analysis'
  | 'Symbol Graph'
  | 'Validation'
  | 'Fixers'
  | 'Generators'
  | 'Storage'
  | 'Configuration'
  | 'Utilities';

/**
 * Generates hierarchical insight documentation
 *
 * @public
 */
export class InsightDocGenerator {
  private graphBuilder: SymbolGraphBuilder;

  /**
   * Creates a new InsightDocGenerator
   * @param graphBuilder - Symbol graph builder for relationship queries
   */
  constructor(graphBuilder: SymbolGraphBuilder) {
    this.graphBuilder = graphBuilder;
  }

  /**
   * Generate insight document from depth-grouped symbols
   *
   * @param symbolsByDepth - Symbols grouped by depth level
   * @param options - Generation options
   * @returns Markdown document string
   */
  generate(symbolsByDepth: Map<number, Symbol[]>, options: InsightGenOptions = {}): string {
    const lines: string[] = [];

    // Header
    const title = options.title || 'TSDoc Edge - Code Insights';
    lines.push(`# ${title}`);
    lines.push('');

    if (options.entryDescription) {
      lines.push(`> ${options.entryDescription}`);
      lines.push('');
    }

    lines.push(`> Generated: ${new Date().toISOString().split('T')[0]}`);
    lines.push('');

    // Generate by category if requested
    if (options.groupByCategory) {
      return this.generateByCategory(symbolsByDepth, options);
    }

    // Generate by depth level
    const depths = Array.from(symbolsByDepth.keys()).sort((a, b) => a - b);

    for (const depth of depths) {
      const symbols = symbolsByDepth.get(depth);
      if (!symbols || symbols.length === 0) continue;

      // Depth section header
      const levelName = this.getDepthLevelName(depth);
      lines.push(`## ${levelName}`);
      lines.push('');

      // Group by type within depth
      const byType = this.groupByType(symbols);

      for (const [type, typeSymbols] of byType.entries()) {
        if (typeSymbols.length === 0) continue;

        // Type subsection
        lines.push(`### ${this.capitalizeType(type)} (${typeSymbols.length})`);
        lines.push('');

        for (const symbol of typeSymbols) {
          lines.push(...this.formatSymbol(symbol, options));
          lines.push('');
        }
      }

      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate document grouped by category instead of depth
   *
   * @param symbolsByDepth - Symbols grouped by depth
   * @param options - Generation options
   * @returns Markdown document string
   */
  private generateByCategory(
    symbolsByDepth: Map<number, Symbol[]>,
    options: InsightGenOptions
  ): string {
    const lines: string[] = [];

    // Collect all symbols
    const allSymbols: Symbol[] = [];
    for (const symbols of symbolsByDepth.values()) {
      allSymbols.push(...symbols);
    }

    // Group by category
    const byCategory = this.groupByCategory(allSymbols);

    const title = options.title || 'TSDoc Edge - Core Features';
    lines.push(`# ${title}`);
    lines.push('');
    lines.push('> 핵심 기능 정의 문서 (Core API 기반)');
    lines.push('');

    const categoryOrder: SymbolCategory[] = [
      'Core Workflow',
      'Analysis',
      'Symbol Graph',
      'Validation',
      'Fixers',
      'Generators',
      'Storage',
      'Configuration',
      'Utilities',
    ];

    let categoryIndex = 1;
    for (const category of categoryOrder) {
      const symbols = byCategory.get(category);
      if (!symbols || symbols.length === 0) continue;

      lines.push(`## ${categoryIndex}. ${category}`);
      lines.push('');

      for (const symbol of symbols) {
        lines.push(`### ${symbol.name}`);
        if (symbol.summary) {
          lines.push(symbol.summary);
        }
        lines.push(...this.formatSymbolDetails(symbol, options));
        lines.push('');
      }

      lines.push('---');
      lines.push('');
      categoryIndex++;
    }

    return lines.join('\n');
  }

  /**
   * Format a single symbol
   *
   * @param symbol - Symbol to format
   * @param options - Generation options
   * @returns Array of markdown lines
   */
  private formatSymbol(symbol: Symbol, options: InsightGenOptions): string[] {
    const lines: string[] = [];

    // Symbol header
    let header = `**${symbol.name}**`;
    if (options.includeTypeBadges) {
      header += ` \`${symbol.type}\``;
    }
    lines.push(header);

    // Location
    lines.push(`**Location:** \`${symbol.filePath}:${symbol.line}\``);

    // Summary
    if (symbol.summary) {
      lines.push(`**Summary:** ${symbol.summary}`);
    }

    lines.push(...this.formatSymbolDetails(symbol, options));

    return lines;
  }

  /**
   * Format symbol details (responsibility, contract, dependencies)
   *
   * @param symbol - Symbol to format
   * @param options - Generation options
   * @returns Array of markdown lines
   */
  private formatSymbolDetails(symbol: Symbol, options: InsightGenOptions): string[] {
    const lines: string[] = [];

    // Responsibility
    if (symbol.responsibility) {
      lines.push(`- ${symbol.responsibility.description}`);
    }

    // Contract
    if (symbol.contract) {
      lines.push(`- Contract: ${symbol.contract.preconditions.join(', ')}`);
    }

    // Dependencies
    if (options.includeDependencyCounts) {
      const deps = this.graphBuilder.getDependencies(symbol.id);
      const users = this.graphBuilder.getDependents(symbol.id);

      if (deps.length > 0) {
        lines.push(`- Dependencies: ${deps.length} symbols`);
      }
      if (users.length > 0) {
        lines.push(`- Used by: ${users.length} symbols`);
      }
    }

    // Reference
    lines.push(`- 참조: \`${symbol.filePath}\``);

    return lines;
  }

  /**
   * Get human-readable depth level name
   *
   * @param depth - Depth level number
   * @returns Level name
   */
  private getDepthLevelName(depth: number): string {
    switch (depth) {
      case 0:
        return 'Level 0: Entry Points';
      case 1:
        return 'Level 1: Direct Dependencies';
      case 2:
        return 'Level 2: Indirect Dependencies';
      default:
        return `Level ${depth}: Dependencies (Depth ${depth})`;
    }
  }

  /**
   * Group symbols by type
   *
   * @param symbols - Symbols to group
   * @returns Map of type to symbols
   */
  private groupByType(symbols: Symbol[]): Map<Symbol['type'], Symbol[]> {
    const result = new Map<Symbol['type'], Symbol[]>();

    for (const symbol of symbols) {
      const list = result.get(symbol.type) || [];
      list.push(symbol);
      result.set(symbol.type, list);
    }

    return result;
  }

  /**
   * Group symbols by category
   *
   * @param symbols - Symbols to group
   * @returns Map of category to symbols
   */
  private groupByCategory(symbols: Symbol[]): Map<SymbolCategory, Symbol[]> {
    const result = new Map<SymbolCategory, Symbol[]>();

    for (const symbol of symbols) {
      const category = this.inferCategory(symbol);
      const list = result.get(category) || [];
      list.push(symbol);
      result.set(category, list);
    }

    return result;
  }

  /**
   * Infer category from symbol file path and name
   *
   * @param symbol - Symbol to categorize
   * @returns Category
   */
  private inferCategory(symbol: Symbol): SymbolCategory {
    const path = symbol.filePath.toLowerCase();
    const name = symbol.name.toLowerCase();

    if (path.includes('/analyzer/')) return 'Analysis';
    if (path.includes('/graph/')) return 'Symbol Graph';
    if (path.includes('/validator/')) return 'Validation';
    if (path.includes('/fixer/')) return 'Fixers';
    if (path.includes('/generator/')) return 'Generators';
    if (path.includes('/storage/')) return 'Storage';
    if (path.includes('/config/')) return 'Configuration';
    if (
      path.includes('/parser/') ||
      name.includes('parser') ||
      name.includes('tsdoc') ||
      symbol.filePath.includes('index.ts')
    ) {
      return 'Core Workflow';
    }

    return 'Utilities';
  }

  /**
   * Capitalize symbol type for display
   *
   * @param type - Symbol type
   * @returns Capitalized type
   */
  private capitalizeType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
