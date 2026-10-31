/**
 * Backlink generator for document symbols
 * @packageDocumentation
 * @responsibility Generate and update backlink sections in documents
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Backlink } from '../types/feature';
import type { DocumentSymbolRegistry } from './DocumentSymbolRegistry';

/**
 * Generates and updates backlinks in documents
 *
 * @doc [[BacklinkGenerator]]
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

    markdown += this.formatDocumentBacklinks(docBacklinks);
    markdown += this.formatCodeBacklinks(codeBacklinks);

    return markdown;
  }

  /**
   * Format document backlinks section
   *
   * @param links - Document backlinks
   * @returns Formatted markdown section
   */
  private formatDocumentBacklinks(links: Backlink[]): string {
    if (links.length === 0) {
      return '';
    }

    let markdown = '### Referenced By\n\n';
    for (const link of links) {
      const sectionPart = link.section ? `#${link.section}` : '';
      const relPath = this.formatPath(link.filePath);
      markdown += `- [[${link.source}]]${sectionPart} → ${relPath}:${link.line}\n`;
    }
    markdown += '\n';
    return markdown;
  }

  /**
   * Format code backlinks section
   *
   * @param links - Code backlinks
   * @returns Formatted markdown section
   */
  private formatCodeBacklinks(links: Backlink[]): string {
    if (links.length === 0) {
      return '';
    }

    let markdown = '### Implemented By\n\n';
    for (const link of links) {
      const sectionPart = link.section ? ` (${link.section})` : '';
      const relPath = this.formatPath(link.filePath);
      markdown += `- ${link.source}${sectionPart} → ${relPath}:${link.line}\n`;
    }
    markdown += '\n';
    return markdown;
  }

  /**
   * Normalize file path relative to project root
   */
  private formatPath(filePath: string): string {
    const rel = path.isAbsolute(filePath) ? path.relative(process.cwd(), filePath) : filePath;
    return rel.replace(/\\/g, '/');
  }

  /**
   * Collect all backlinks for a symbol
   *
   * @param symbolName - Symbol name
   * @returns Backlinks
   */
  private collectBacklinks(symbolName: string): Backlink[] {
    const backlinks: Backlink[] = [];
    const seenFiles = new Set<string>();

    // Document references
    const refs = this.registry.getReferences(symbolName);
    for (const ref of refs) {
      // Find the primary definition that contains this reference
      const refDef = this.findContainingDefinition(ref.filePath);
      if (refDef) {
        // Prevent self-references
        if (refDef.name === symbolName) {
          continue;
        }
        // Deduplicate references per source document
        if (seenFiles.has(ref.filePath)) {
          continue;
        }
        seenFiles.add(ref.filePath);
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
    const seenConnections = new Map<string, (typeof connections)[number]>();
    for (const conn of connections) {
      const normPath = this.formatPath(conn.filePath);
      const key = `${conn.codeSymbol}:${normPath}`;
      const existing = seenConnections.get(key);
      if (!existing || (existing.line === 1 && conn.line > 1)) {
        seenConnections.set(key, conn);
      }
    }
    for (const conn of seenConnections.values()) {
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
   * @returns boolean - True if file content was modified and written to disk
   */
  updateBacklinksSection(filePath: string, symbolName: string): boolean {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const backlinksMarkdown = this.generateBacklinks(symbolName);

    let updated: string;
    // If no backlinks, remove section if exists
    if (!backlinksMarkdown) {
      updated = this.removeBacklinksSection(content);
    } else {
      // Find existing backlinks section
      const section = this.findBacklinksSection(content);
      if (section) {
        // Replace existing section
        updated =
          content.substring(0, section.start) + backlinksMarkdown + content.substring(section.end);
      } else {
        // Append to end
        updated = `${content.trim()}\n\n${backlinksMarkdown}`;
      }
    }

    if (updated !== content) {
      fs.writeFileSync(filePath, updated, 'utf-8');
      return true;
    }
    return false;
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

    // Find next section boundary (equal or higher level heading H1/H2, or horizontal rule ---) or end of file
    const afterSection = content.substring(start + match[0].length);
    const nextSectionMatch = afterSection.match(/^(?:---|#{1,2}\s+)/m);
    const nextSectionIndex = nextSectionMatch?.index;

    const end =
      nextSectionIndex === undefined ? content.length : start + match[0].length + nextSectionIndex;

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

    const before = content.substring(0, section.start).trimEnd();
    const after = content.substring(section.end).trimStart();
    if (after) {
      return `${before}\n\n${after}\n`;
    }
    return `${before}\n`;
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
