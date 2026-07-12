/**
 * XML Context Generator for Claude
 * @packageDocumentation
 * @responsibility Generate compact XML-structured context for LLMs
 */

import type { UnifiedContext } from '../analyzer/EntryPointContextAggregator';

/**
 * Generates compact XML context optimized for Claude
 *
 * Based on: https://platform.claude.com/docs/build-with-claude/prompt-engineering/use-xml-tags
 *
 * @public
 */
export class XMLContextGenerator {
  generate(context: UnifiedContext): string {
    const parts: string[] = [];

    parts.push(`<work-context file="${context.entryPoint}" type="${context.entryPointType}">`);

    // Summary
    if (context.primarySymbol) {
      parts.push(
        `<symbol name="${context.primarySymbol.name}" type="${context.primarySymbol.type}">`
      );
      parts.push(
        `<location file="${context.primarySymbol.filePath}" line="${context.primarySymbol.line}"/>`
      );
      if (context.primarySymbol.summary) {
        parts.push(`<summary>${this.escape(context.primarySymbol.summary)}</summary>`);
      }
      parts.push(`</symbol>`);
    }

    // Dependencies (compact, deduplicated)
    if (context.dependencies.length > 0) {
      const grouped = this.groupByType(context.dependencies);
      let totalUnique = 0;
      const depParts: string[] = [];
      for (const [relType, items] of Object.entries(grouped)) {
        const uniqueNames = [...new Set(items.map((d) => d.symbolName))];
        totalUnique += uniqueNames.length;
        depParts.push(`<dep type="${relType}">${uniqueNames.join(', ')}</dep>`);
      }
      parts.push(`<dependencies count="${totalUnique}">`);
      parts.push(...depParts);
      parts.push(`</dependencies>`);
    }

    // Used by (compact)
    if (context.usedBy.length > 0) {
      parts.push(`<used-by count="${context.usedBy.length}">`);
      const top = context.usedBy.slice(0, 10);
      parts.push(top.map((u) => u.symbolName).join(', '));
      if (context.usedBy.length > 10) {
        parts.push(`... +${context.usedBy.length - 10} more`);
      }
      parts.push(`</used-by>`);
    }

    // Tests (compact)
    if (context.testCoverage.length > 0) {
      parts.push(`<tests count="${context.testCoverage.length}">`);
      const testNames = context.testCoverage.slice(0, 5).map((t) => t.testSymbol);
      parts.push(testNames.join(', '));
      if (context.testCoverage.length > 5) {
        parts.push(`... +${context.testCoverage.length - 5} more`);
      }
      parts.push(`</tests>`);
    }

    // Impact
    if (context.impact.directImpact > 0 || context.impact.transitiveImpact > 0) {
      parts.push(
        `<impact direct="${context.impact.directImpact}" transitive="${context.impact.transitiveImpact}" files="${context.impact.affectedFiles.length}"/>`
      );
    }

    // Doc references
    if (context.docReferences.length > 0 || context.referencedByDocs.length > 0) {
      parts.push(`<docs>`);
      if (context.docReferences.length > 0) {
        parts.push(`<refs>${context.docReferences.map((d) => d.docSymbol).join(', ')}</refs>`);
      }
      if (context.referencedByDocs.length > 0) {
        parts.push(
          `<referenced-by>${context.referencedByDocs.map((d) => d.docSymbol).join(', ')}</referenced-by>`
        );
      }
      parts.push(`</docs>`);
    }

    // Related symbols (compact)
    if (context.relatedSymbols.length > 0) {
      const strong = context.relatedSymbols.filter((s) => s.strength === 'strong');
      if (strong.length > 0) {
        parts.push(
          `<related strength="strong">${strong.map((s) => s.symbolName).join(', ')}</related>`
        );
      }
    }

    parts.push(`</work-context>`);

    return parts.join('\n');
  }

  private groupByType(
    deps: Array<{ symbolName: string; relationship: string }>
  ): Record<string, typeof deps> {
    return deps.reduce(
      (acc, item) => {
        const key = item.relationship;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, typeof deps>
    );
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
