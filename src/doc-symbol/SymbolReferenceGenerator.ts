/**
 * Symbol Reference Generator
 * @packageDocumentation
 * @responsibility Generate Symbol References section in documents
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ParsedDocSymbols } from '../types/feature';
import { SymbolReferenceResolver, type ResolvedSymbolRef } from './SymbolReferenceResolver';
import type { SymbolRegistryManager } from '../storage/SymbolRegistryManager';

/**
 * Generates and updates Symbol References section in documents
 *
 * @doc [[SymbolReferenceGenerator]]
 * @public
 * @responsibility Auto-generate Symbol References footnotes
 */
export class SymbolReferenceGenerator {
  private resolver: SymbolReferenceResolver;

  constructor(registryManager: SymbolRegistryManager) {
    this.resolver = new SymbolReferenceResolver(registryManager);
  }

  /**
   * Generate Symbol References markdown for a document
   *
   * @param parsed - Parsed document symbols
   * @returns Symbol References markdown
   */
  generateSymbolReferences(parsed: ParsedDocSymbols): string {
    if (parsed.symbolFootnoteRefs.length === 0) {
      return '';
    }

    // Resolve all references
    const resolved = this.resolver.resolveMultiple(
      parsed.symbolFootnoteRefs,
      parsed.filePath
    );

    if (resolved.size === 0) {
      return '';
    }

    // Generate markdown
    let markdown = '## Symbol References\n\n';

    // Sort by identifier for consistent output
    const sortedEntries = Array.from(resolved.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [identifier, ref] of sortedEntries) {
      markdown += `[^${identifier}]: [${ref.symbolName}](${ref.relativePath}#${ref.anchor})\n`;
    }

    markdown += '\n';

    return markdown;
  }

  /**
   * Update document with Symbol References section
   *
   * @param filePath - Document file path
   * @param parsed - Parsed document symbols
   * @returns True if updated
   */
  updateDocument(filePath: string, parsed: ParsedDocSymbols): boolean {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Generate new Symbol References section
    const newSection = this.generateSymbolReferences(parsed);

    // If no symbol references, remove existing section if any
    if (newSection === '') {
      const withoutSection = this.removeSymbolReferencesSection(content);
      if (withoutSection !== content) {
        fs.writeFileSync(filePath, withoutSection, 'utf-8');
        return true;
      }
      return false;
    }

    // Check if section already exists
    const updated = this.replaceOrAppendSection(content, newSection);

    if (updated !== content) {
      fs.writeFileSync(filePath, updated, 'utf-8');
      return true;
    }

    return false;
  }

  /**
   * Replace or append Symbol References section
   *
   * @param content - Document content
   * @param newSection - New section markdown
   * @returns Updated content
   */
  private replaceOrAppendSection(content: string, newSection: string): string {
    // Check for existing Symbol References section
    const sectionRegex = /^## Symbol References\s*\n[\s\S]*?(?=\n##|\n---|\n$|$)/m;

    if (sectionRegex.test(content)) {
      // Replace existing section
      return content.replace(sectionRegex, newSection.trim());
    }

    // Check if there's a Backlinks section to insert before
    const backlinkRegex = /^---\s*\n+## Backlinks/m;
    const backlinkMatch = content.match(backlinkRegex);

    if (backlinkMatch) {
      // Insert before Backlinks
      const insertPos = backlinkMatch.index!;
      return (
        content.slice(0, insertPos) +
        newSection +
        '\n' +
        content.slice(insertPos)
      );
    }

    // Append to end of document
    let result = content.trimEnd();

    // Ensure proper spacing
    if (!result.endsWith('\n\n')) {
      if (result.endsWith('\n')) {
        result += '\n';
      } else {
        result += '\n\n';
      }
    }

    result += newSection;

    return result;
  }

  /**
   * Remove Symbol References section from content
   *
   * @param content - Document content
   * @returns Content without Symbol References section
   */
  private removeSymbolReferencesSection(content: string): string {
    // Match section including trailing newlines
    const sectionRegex = /\n*## Symbol References\s*\n[\s\S]*?(?=\n##|\n---|\n$|$)/m;

    return content.replace(sectionRegex, '');
  }

  /**
   * Get unresolved references in a document
   *
   * @param parsed - Parsed document symbols
   * @returns Array of unresolved identifiers with line numbers
   */
  getUnresolved(parsed: ParsedDocSymbols): Array<{ identifier: string; line: number }> {
    const unresolved: Array<{ identifier: string; line: number }> = [];

    for (const ref of parsed.symbolFootnoteRefs) {
      const result = this.resolver.resolve(ref, parsed.filePath);
      if (!result) {
        unresolved.push({
          identifier: ref.identifier,
          line: ref.line,
        });
      }
    }

    return unresolved;
  }

  /**
   * Batch update multiple documents
   *
   * @param parsedDocs - Array of parsed documents
   * @returns Statistics
   */
  batchUpdate(
    parsedDocs: ParsedDocSymbols[]
  ): { updated: number; skipped: number; errors: Array<{ file: string; error: string }> } {
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ file: string; error: string }> = [];

    for (const parsed of parsedDocs) {
      try {
        const wasUpdated = this.updateDocument(parsed.filePath, parsed);
        if (wasUpdated) {
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        errors.push({
          file: parsed.filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { updated, skipped, errors };
  }
}
