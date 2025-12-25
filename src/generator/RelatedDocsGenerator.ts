/**
 * Related documentation generator
 * Generates markdown documentation for symbols and their related symbols
 * @packageDocumentation
 */

import type { Symbol } from '../types/graph';

/**
 * Related documentation entry
 * @doc [[RelatedDocsGenerator]]
 * @public
 */
export interface RelatedDocEntry {
  symbol: Symbol;
  relevance: number;
  reason: string;
}

/**
 * Generates markdown documentation showing a symbol and its related documentation
 *
 * @public
 * @responsibility Generate comprehensive implementation context documentation
 * @contract Produce markdown that includes target symbol info and all related symbols ordered by relevance
 */
export class RelatedDocsGenerator {
  /**
   * Generate markdown documentation for a symbol and its related symbols
   *
   * @param targetSymbol - The symbol to document
   * @param relatedDocs - Related symbols with relevance scores
   * @returns Markdown string
   * @public
   */
  generateRelatedDocs(targetSymbol: Symbol, relatedDocs: RelatedDocEntry[]): string {
    let markdown = '';

    // Header
    markdown += `# Implementation Context: ${targetSymbol.name}\n\n`;

    // Target symbol section
    markdown += this.generateSymbolSection(targetSymbol, true);
    markdown += '\n---\n\n';

    // Related symbols section
    if (relatedDocs.length > 0) {
      markdown += '## Related Symbols\n\n';
      markdown += `Found ${relatedDocs.length} related symbols that may be useful for implementation.\n\n`;

      for (const entry of relatedDocs) {
        markdown += this.generateRelatedSymbolSection(entry);
        markdown += '\n';
      }
    } else {
      markdown += '## Related Symbols\n\n';
      markdown += 'No related symbols found.\n\n';
    }

    return markdown;
  }

  /**
   * Generate markdown section for a symbol
   *
   * @param symbol - Symbol to document
   * @param isTarget - Whether this is the target symbol
   * @returns Markdown string
   */
  private generateSymbolSection(symbol: Symbol, isTarget: boolean = false): string {
    let markdown = '';

    if (isTarget) {
      markdown += '## Target Symbol\n\n';
    }

    markdown += `### ${symbol.name}\n\n`;
    markdown += `**Type:** \`${symbol.type}\`\n\n`;
    markdown += `**Location:** \`${symbol.filePath}:${symbol.line}\`\n\n`;
    markdown += `**Exported:** ${symbol.isExported ? 'Yes' : 'No'}\n\n`;
    markdown += `**Public API:** ${symbol.isPublic ? 'Yes' : 'No'}\n\n`;

    // Summary
    if (symbol.summary) {
      markdown += `**Summary:** ${symbol.summary}\n\n`;
    } else {
      markdown += `**Summary:** *(No documentation)*\n\n`;
    }

    // Responsibility
    if (symbol.responsibility) {
      markdown += `**Responsibility:** ${symbol.responsibility.description}\n\n`;
    }

    // Contract
    if (symbol.contract) {
      markdown += '**Contract:**\n\n';

      if (symbol.contract.preconditions.length > 0) {
        markdown += '*Preconditions:*\n';
        for (const pre of symbol.contract.preconditions) {
          markdown += `- ${pre}\n`;
        }
        markdown += '\n';
      }

      if (symbol.contract.postconditions.length > 0) {
        markdown += '*Postconditions:*\n';
        for (const post of symbol.contract.postconditions) {
          markdown += `- ${post}\n`;
        }
        markdown += '\n';
      }
    }

    // Tests
    if (symbol.tests.length > 0) {
      markdown += `**Tests:** ${symbol.tests.length} test(s)\n\n`;
      for (const test of symbol.tests) {
        markdown += `- ${test.testFilePath}: \`${test.testName}\`\n`;
      }
      markdown += '\n';
    }

    // Design decisions
    if (symbol.designDecisions.length > 0) {
      markdown += '**Design Decisions:**\n\n';
      for (const decision of symbol.designDecisions) {
        markdown += `- ${decision}\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Generate markdown section for a related symbol
   *
   * @param entry - Related documentation entry
   * @returns Markdown string
   */
  private generateRelatedSymbolSection(entry: RelatedDocEntry): string {
    let markdown = '';

    // Relevance indicator
    const relevanceBar = this.getRelevanceBar(entry.relevance);
    markdown += `### ${entry.symbol.name} ${relevanceBar}\n\n`;

    markdown += `**Relevance:** ${(entry.relevance * 100).toFixed(0)}% - *${entry.reason}*\n\n`;
    markdown += `**Type:** \`${entry.symbol.type}\`\n\n`;
    markdown += `**Location:** \`${entry.symbol.filePath}:${entry.symbol.line}\`\n\n`;

    // Summary
    if (entry.symbol.summary) {
      markdown += `**Summary:** ${entry.symbol.summary}\n\n`;
    }

    // Responsibility (brief)
    if (entry.symbol.responsibility) {
      markdown += `**Responsibility:** ${entry.symbol.responsibility.description}\n\n`;
    }

    // Contract (brief)
    if (entry.symbol.contract) {
      const preCount = entry.symbol.contract.preconditions.length;
      const postCount = entry.symbol.contract.postconditions.length;
      if (preCount > 0 || postCount > 0) {
        markdown += `**Contract:** ${preCount} precondition(s), ${postCount} postcondition(s)\n\n`;
      }
    }

    markdown += '---\n';

    return markdown;
  }

  /**
   * Generate visual relevance indicator
   *
   * @param relevance - Relevance score (0-1)
   * @returns Visual bar
   */
  private getRelevanceBar(relevance: number): string {
    if (relevance >= 0.9) return '🔴🔴🔴🔴🔴';
    if (relevance >= 0.7) return '🔴🔴🔴🔴⚪';
    if (relevance >= 0.5) return '🔴🔴🔴⚪⚪';
    if (relevance >= 0.3) return '🔴🔴⚪⚪⚪';
    return '🔴⚪⚪⚪⚪';
  }

  /**
   * Generate a summary report of related documentation
   *
   * @param targetSymbol - Target symbol
   * @param relatedDocs - Related symbols
   * @returns Summary markdown
   * @public
   */
  generateSummaryReport(targetSymbol: Symbol, relatedDocs: RelatedDocEntry[]): string {
    let markdown = '';

    markdown += `# Implementation Context Summary: ${targetSymbol.name}\n\n`;

    // Statistics
    markdown += '## Statistics\n\n';
    markdown += `- **Total related symbols:** ${relatedDocs.length}\n`;

    const byReason = new Map<string, number>();
    for (const entry of relatedDocs) {
      const reasons = entry.reason.split(', ');
      for (const reason of reasons) {
        byReason.set(reason, (byReason.get(reason) || 0) + 1);
      }
    }

    markdown += '\n**Relationship types:**\n\n';
    for (const [reason, count] of Array.from(byReason.entries()).sort((a, b) => b[1] - a[1])) {
      markdown += `- ${reason}: ${count}\n`;
    }
    markdown += '\n';

    // High relevance symbols
    const highRelevance = relatedDocs.filter((e) => e.relevance >= 0.7);
    if (highRelevance.length > 0) {
      markdown += '## High-Relevance Symbols\n\n';
      markdown += `${highRelevance.length} symbol(s) with relevance ≥ 70%:\n\n`;
      for (const entry of highRelevance) {
        markdown += `- **${entry.symbol.name}** (${(entry.relevance * 100).toFixed(0)}%) - ${entry.reason}\n`;
      }
      markdown += '\n';
    }

    // Documentation coverage
    const documented = relatedDocs.filter(
      (e) => e.symbol.summary && e.symbol.summary.trim() !== ''
    );
    const withContract = relatedDocs.filter((e) => e.symbol.contract);
    const withResponsibility = relatedDocs.filter((e) => e.symbol.responsibility);
    const withTests = relatedDocs.filter((e) => e.symbol.tests.length > 0);

    markdown += '## Documentation Quality\n\n';
    markdown += `- **Documented:** ${documented.length}/${relatedDocs.length} (${((documented.length / relatedDocs.length) * 100).toFixed(0)}%)\n`;
    markdown += `- **With Contract:** ${withContract.length}/${relatedDocs.length} (${((withContract.length / relatedDocs.length) * 100).toFixed(0)}%)\n`;
    markdown += `- **With Responsibility:** ${withResponsibility.length}/${relatedDocs.length} (${((withResponsibility.length / relatedDocs.length) * 100).toFixed(0)}%)\n`;
    markdown += `- **With Tests:** ${withTests.length}/${relatedDocs.length} (${((withTests.length / relatedDocs.length) * 100).toFixed(0)}%)\n`;
    markdown += '\n';

    return markdown;
  }
}
