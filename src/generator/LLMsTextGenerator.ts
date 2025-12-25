/**
 * LLMs.txt Generator
 * @packageDocumentation
 * @responsibility Generate LLM-friendly context text from unified context
 */

import type { UnifiedContext } from '../analyzer/EntryPointContextAggregator';
import type { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Generates LLMs.txt format documentation
 *
 * @doc [[LLMsTextGenerator]]
 * @public
 * @responsibility Transform unified context into LLM-readable format
 * @contract Follow LLMs.txt specification for clarity
 *
 * @problem LLMs need structured context to understand code
 * @solves Generates standardized, comprehensive context documents
 * @context Part of AI-assisted development workflow
 *
 * @functionality
 * - Format context in markdown
 * - Prioritize most relevant information
 * - Include code examples from tests
 * - Show relationship strengths
 * - Provide change impact warnings
 *
 * @decision Use markdown with clear sections
 * @rationale LLMs understand markdown structure well
 * @consequences Easy for both humans and AI to parse
 *
 * @see https://llmstxt.org/ for format specification
 */
export class LLMsTextGenerator {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Generate LLMs.txt content from unified context
   *
   * @param context - Unified context
   * @returns LLMs.txt formatted string
   */
  generate(context: UnifiedContext): string {
    let output = '';

    // Header
    output += this.generateHeader(context);

    // Summary section
    output += this.generateSummary(context);

    // Location and metadata
    output += this.generateLocation(context);

    // Purpose (from TSDoc tags)
    output += this.generatePurpose(context);

    // Dependencies
    output += this.generateDependencies(context);

    // Usage (reverse dependencies)
    output += this.generateUsage(context);

    // Documentation references
    output += this.generateDocReferences(context);

    // Related symbols
    output += this.generateRelatedSymbols(context);

    // Test coverage
    output += this.generateTestCoverage(context);

    // Change impact
    output += this.generateChangeImpact(context);

    // Example code
    output += this.generateExamples(context);

    // Footer metadata
    output += this.generateFooter(context);

    return output;
  }

  /**
   * Generate header section
   */
  private generateHeader(context: UnifiedContext): string {
    let header = `# Context: ${context.entryPoint}\n\n`;
    header += `> **Entry Point Type**: ${context.entryPointType}\n`;
    header += `> **Generated**: ${new Date(context.metadata.generatedAt).toISOString()}\n`;
    header += `> **Depth**: ${context.metadata.depth} levels\n\n`;
    header += `---\n\n`;
    return header;
  }

  /**
   * Generate summary section
   */
  private generateSummary(context: UnifiedContext): string {
    if (!context.primarySymbol) {
      return `## Summary\n\nNo primary symbol found.\n\n`;
    }

    let summary = `## Summary\n\n`;
    summary += `**${context.primarySymbol.name}** is a \`${context.primarySymbol.type}\``;

    if (context.primarySymbol.summary) {
      summary += `: ${context.primarySymbol.summary}`;
    }

    summary += `\n\n`;
    return summary;
  }

  /**
   * Generate location section
   */
  private generateLocation(context: UnifiedContext): string {
    if (!context.primarySymbol) return '';

    let loc = `## Location\n\n`;
    loc += `- **File**: \`${context.primarySymbol.filePath}\`\n`;
    loc += `- **Line**: ${context.primarySymbol.line}\n`;
    loc += `- **Type**: \`${context.primarySymbol.type}\`\n`;
    loc += `- **Visibility**: ${context.primarySymbol.isPublic ? 'Public API' : 'Internal'}\n`;
    loc += `- **Exported**: ${context.primarySymbol.isExported ? 'Yes' : 'No'}\n\n`;

    return loc;
  }

  /**
   * Generate purpose section from TSDoc tags
   */
  private generatePurpose(context: UnifiedContext): string {
    if (!context.primarySymbol) return '';

    // Try to get enhanced doc info
    const symbol = this.dbManager.getSymbol(context.primarySymbol.id);
    if (!symbol) return '';

    let purpose = `## Purpose\n\n`;

    // Extract from TSDoc comments if available
    // For now, use summary
    if (symbol.summary) {
      purpose += `${symbol.summary}\n\n`;
    } else {
      purpose += `_No purpose documentation available_\n\n`;
    }

    return purpose;
  }

  /**
   * Generate dependencies section
   */
  private generateDependencies(context: UnifiedContext): string {
    if (context.dependencies.length === 0) {
      return `## Dependencies\n\n_This symbol has no direct dependencies._\n\n`;
    }

    let deps = `## Dependencies\n\n`;
    deps += `This symbol depends on ${context.dependencies.length} other symbol(s):\n\n`;

    // Group by relationship type
    const grouped = this.groupBy(context.dependencies, d => d.relationship);

    for (const [relType, items] of Object.entries(grouped)) {
      deps += `### ${relType}\n\n`;
      for (const dep of items) {
        deps += `- \`${dep.symbolName}\` (${dep.type})\n`;
      }
      deps += `\n`;
    }

    return deps;
  }

  /**
   * Generate usage (reverse dependencies) section
   */
  private generateUsage(context: UnifiedContext): string {
    if (context.usedBy.length === 0) {
      return `## Usage\n\n_This symbol is not used by any other code (yet)._\n\n`;
    }

    let usage = `## Usage\n\n`;
    usage += `**${context.usedBy.length}** symbol(s) use this:\n\n`;

    // Show up to 10 most important usages
    const topUsages = context.usedBy.slice(0, 10);

    for (const use of topUsages) {
      usage += `- **${use.symbolName}** (${use.type})\n`;
      usage += `  - Relationship: ${use.relationship}\n`;
    }

    if (context.usedBy.length > 10) {
      usage += `\n_...and ${context.usedBy.length - 10} more_\n`;
    }

    usage += `\n`;
    return usage;
  }

  /**
   * Generate documentation references section
   */
  private generateDocReferences(context: UnifiedContext): string {
    let refs = `## Documentation References\n\n`;

    // Code → Doc
    if (context.docReferences.length > 0) {
      refs += `### This Code References Documentation\n\n`;
      for (const ref of context.docReferences) {
        const section = ref.section ? `#${ref.section}` : '';
        refs += `- [[${ref.docSymbol}${section}]]\n`;
        refs += `  - _at ${ref.filePath}:${ref.line}_\n`;
      }
      refs += `\n`;
    }

    // Doc → Code (inferred)
    if (context.referencedByDocs.length > 0) {
      refs += `### Documentation That References This Code\n\n`;
      for (const ref of context.referencedByDocs) {
        const badge = ref.isInferred ? ' _(inferred)_' : '';
        refs += `- [[${ref.docSymbol}]]${badge}\n`;
      }
      refs += `\n`;
    }

    if (context.docReferences.length === 0 && context.referencedByDocs.length === 0) {
      refs += `_No documentation references found._\n\n`;
    }

    return refs;
  }

  /**
   * Generate related symbols section
   */
  private generateRelatedSymbols(context: UnifiedContext): string {
    if (context.relatedSymbols.length === 0) {
      return `## Related Symbols\n\n_No related symbols detected._\n\n`;
    }

    let related = `## Related Symbols\n\n`;
    related += `Found ${context.relatedSymbols.length} related symbol(s):\n\n`;

    // Group by strength
    const byStrength = this.groupBy(context.relatedSymbols, s => s.strength);

    const strengthOrder: Array<'strong' | 'medium' | 'weak'> = ['strong', 'medium', 'weak'];

    for (const strength of strengthOrder) {
      const items = byStrength[strength];
      if (!items || items.length === 0) continue;

      related += `### ${strength.charAt(0).toUpperCase() + strength.slice(1)} Relationship\n\n`;

      for (const sym of items) {
        related += `- **${sym.symbolName}** (${sym.relationshipType})\n`;
      }
      related += `\n`;
    }

    return related;
  }

  /**
   * Generate test coverage section
   */
  private generateTestCoverage(context: UnifiedContext): string {
    if (context.testCoverage.length === 0) {
      return `## Test Coverage\n\n⚠️ **No tests found for this symbol.**\n\n`;
    }

    let tests = `## Test Coverage\n\n`;
    tests += `✅ **${context.testCoverage.length}** test(s) cover this symbol:\n\n`;

    for (const test of context.testCoverage) {
      tests += `- **${test.testSymbol}** (${test.coverageType})\n`;
      tests += `  - File: \`${test.testFile}\`\n`;
    }

    tests += `\n`;
    return tests;
  }

  /**
   * Generate change impact section
   */
  private generateChangeImpact(context: UnifiedContext): string {
    let impact = `## Change Impact Analysis\n\n`;

    if (context.impact.directImpact === 0 && context.impact.transitiveImpact === 0) {
      impact += `✅ **Low Impact**: This symbol appears to be isolated.\n\n`;
      return impact;
    }

    impact += `⚠️ **Modifying this symbol will affect:**\n\n`;

    if (context.impact.directImpact > 0) {
      impact += `- **${context.impact.directImpact}** symbols directly\n`;
    }

    if (context.impact.transitiveImpact > 0) {
      impact += `- **${context.impact.transitiveImpact}** symbols transitively (depth ${context.metadata.depth})\n`;
    }

    if (context.impact.affectedFiles.length > 0) {
      impact += `- **${context.impact.affectedFiles.length}** file(s)\n`;
    }

    if (context.impact.affectedTests.length > 0) {
      impact += `- **${context.impact.affectedTests.length}** test file(s)\n`;
    }

    if (context.impact.affectedDocs.length > 0) {
      impact += `- **${context.impact.affectedDocs.length}** documentation page(s)\n`;
    }

    impact += `\n**Recommendation**: Review all affected components before making changes.\n\n`;

    return impact;
  }

  /**
   * Generate example code section
   */
  private generateExamples(context: UnifiedContext): string {
    let examples = `## Example Usage\n\n`;

    if (context.testCoverage.length > 0) {
      examples += `From tests:\n\n`;
      examples += '```typescript\n';
      examples += `// See ${context.testCoverage[0].testFile}\n`;
      examples += `// Test: ${context.testCoverage[0].testSymbol}\n`;
      examples += '```\n\n';
    } else {
      examples += `_No example usage available yet._\n\n`;
    }

    return examples;
  }

  /**
   * Generate footer metadata
   */
  private generateFooter(context: UnifiedContext): string {
    let footer = `---\n\n`;
    footer += `## Generation Metadata\n\n`;
    footer += `- Generated by: TSDoc Edge\n`;
    footer += `- Total relationships: ${context.metadata.totalRelationships}\n`;
    footer += `  - Explicit: ${context.metadata.explicitCount}\n`;
    footer += `  - Inferred: ${context.metadata.inferredCount}\n`;
    footer += `- Context depth: ${context.metadata.depth} level(s)\n`;
    footer += `- Generated at: ${context.metadata.generatedAt}\n`;

    return footer;
  }

  /**
   * Helper to group array by key
   */
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
}
