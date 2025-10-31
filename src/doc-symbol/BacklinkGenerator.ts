/**
 * Backlink generator for document symbols
 * @packageDocumentation
 * @responsibility Generate and update backlink sections in documents
 */

import * as fs from 'node:fs';
import type { Backlink } from '../types/feature';
import type { DocumentSymbolRegistry } from './DocumentSymbolRegistry';

/**
 * Generates and updates backlinks in documents
 *
 * @public
 * @responsibility Auto-generate backlink sections
 */
export class BacklinkGenerator {
  private registry: DocumentSymbolRegistry;

  constructor(registry: DocumentSymbolRegistry) {
    this.registry = registry;
  }

  /**
   * Generate backlinks markdown for a symbol
   *
   * @param symbolName - Document symbol name
   * @returns Backlinks markdown
   */
  generateBacklinks(symbolName: string): string {
    const definition = this.registry.getDefinition(symbolName);
    if (!definition) {
      return '';
    }

    const backlinks = this.collectBacklinks(symbolName);
    if (backlinks.length === 0) {
      return '';
    }

    let markdown = '---\n\n';
    markdown += '## Backlinks\n\n';

    // Group by type
    const docBacklinks = backlinks.filter((b) => b.type === 'document');
    const codeBacklinks = backlinks.filter((b) => b.type === 'code');

    // Document references
    if (docBacklinks.length > 0) {
      markdown += '### Referenced By\n\n';
      for (const link of docBacklinks) {
        const sectionPart = link.section ? `#${link.section}` : '';
        markdown += `- [[${link.source}]]${sectionPart} → ${link.filePath}:${link.line}\n`;
      }
      markdown += '\n';
    }

    // Code implementations
    if (codeBacklinks.length > 0) {
      markdown += '### Implemented By\n\n';
      for (const link of codeBacklinks) {
        const sectionPart = link.section ? ` (${link.section})` : '';
        markdown += `- ${link.source}${sectionPart} → ${link.filePath}:${link.line}\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Collect all backlinks for a symbol
   *
   * @param symbolName - Symbol name
   * @returns Backlinks
   */
  private collectBacklinks(symbolName: string): Backlink[] {
    const backlinks: Backlink[] = [];

    // Document references
    const refs = this.registry.getReferences(symbolName);
    for (const ref of refs) {
      // Find the primary definition that contains this reference
      const refDef = this.findContainingDefinition(ref.filePath);
      if (refDef) {
        backlinks.push({
          type: 'document',
          source: refDef.name,
          filePath: ref.filePath,
          line: ref.line,
          section: ref.section,
        });
      }
    }

    // Code connections
    const connections = this.registry.getCodeConnections(symbolName);
    for (const conn of connections) {
      backlinks.push({
        type: 'code',
        source: conn.codeSymbol,
        filePath: conn.filePath,
        line: conn.line,
        section: conn.section,
      });
    }

    return backlinks;
  }

  /**
   * Find primary definition in a file
   */
  private findContainingDefinition(filePath: string): { name: string } | null {
    const allNames = this.registry.getAllSymbolNames();

    for (const name of allNames) {
      const def = this.registry.getDefinition(name);
      if (def && def.filePath === filePath) {
        return { name: def.name };
      }
    }

    return null;
  }

  /**
   * Update backlinks section in document
   *
   * @param filePath - Document path
   * @param symbolName - Symbol name
   */
  updateBacklinksSection(filePath: string, symbolName: string): void {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const backlinksMarkdown = this.generateBacklinks(symbolName);

    // If no backlinks, remove section if exists
    if (!backlinksMarkdown) {
      const updated = this.removeBacklinksSection(content);
      fs.writeFileSync(filePath, updated, 'utf-8');
      return;
    }

    // Find existing backlinks section
    const section = this.findBacklinksSection(content);

    let updated: string;
    if (section) {
      // Replace existing section
      updated = content.substring(0, section.start) + backlinksMarkdown + content.substring(section.end);
    } else {
      // Append to end
      updated = content.trim() + '\n\n' + backlinksMarkdown;
    }

    fs.writeFileSync(filePath, updated, 'utf-8');
  }

  /**
   * Find backlinks section in content
   *
   * @param content - Document content
   * @returns Section range or null
   */
  private findBacklinksSection(content: string): { start: number; end: number } | null {
    // Find "---\n\n## Backlinks" section
    const regex = /^---\n\n## Backlinks\n/gm;
    const match = regex.exec(content);

    if (!match) {
      return null;
    }

    const start = match.index;

    // Find next H1 or end of file
    const afterSection = content.substring(start + match[0].length);
    const nextH1Match = afterSection.match(/^# /m);

    const end = nextH1Match
      ? start + match[0].length + nextH1Match.index!
      : content.length;

    return { start, end };
  }

  /**
   * Remove backlinks section from content
   */
  private removeBacklinksSection(content: string): string {
    const section = this.findBacklinksSection(content);
    if (!section) {
      return content;
    }

    return content.substring(0, section.start).trim() + '\n';
  }

  /**
   * Update backlinks for all documents
   *
   * @returns Updated file paths
   */
  updateAllBacklinks(): string[] {
    const updated: string[] = [];
    const allSymbols = this.registry.getAllSymbolNames();

    for (const symbolName of allSymbols) {
      const definition = this.registry.getDefinition(symbolName);
      if (definition) {
        this.updateBacklinksSection(definition.filePath, symbolName);
        updated.push(definition.filePath);
      }
    }

    return updated;
  }
}
