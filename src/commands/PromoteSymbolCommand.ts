/**
 * Promote Symbol Command - H2 참조 정의를 H1 canonical로 승격
 *
 * @packageDocumentation
 * @responsibility Promote H2 reference to canonical H1 in separate file
 *
 * @problem H2 references need to become canonical SSOT definitions
 * @solves Extract H2 content, create new canonical file, replace original with inline ref
 * @context Enforce "one symbol = one file" for canonical definitions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';

interface H2Section {
  symbolName: string;
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * Promote Symbol Command - H2를 독립 파일의 H1으로 승격
 *
 * @public
 */
export class PromoteSymbolCommand extends BaseCommand {
  getName(): string {
    return 'promote-symbol';
  }

  getDescription(): string {
    return 'Promote H2 reference to canonical H1 in separate file';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      const sourceFile = args[0];
      const symbolName = args[1];
      const targetDir = args[2] || 'managed/relationships';

      if (!sourceFile || !symbolName) {
        this.printError('Usage: promote-symbol <source-file> <symbol-name> [target-dir]');
        console.log();
        console.log('Examples:');
        console.log('  tsdoc-edge promote-symbol docs/overview.md "Code Dependency"');
        console.log('  tsdoc-edge promote-symbol diagram.md "IO Dependency" managed/relationships');
        console.log();
        return this.failure('Missing arguments');
      }

      this.printHeader(`Promote Symbol: ${symbolName}`);
      console.log(`📄 Source: ${sourceFile}`);
      console.log(`📁 Target: ${targetDir}/`);
      console.log();

      // Check source file exists
      if (!fs.existsSync(sourceFile)) {
        this.printError(`Source file not found: ${sourceFile}`);
        return this.failure('File not found');
      }

      // Read source file
      const content = fs.readFileSync(sourceFile, 'utf-8');
      const lines = content.split('\n');

      // Find H2 section
      this.printInfo('Searching for H2 section...');
      const h2Section = this.findH2Section(lines, symbolName);

      if (!h2Section) {
        this.printError(`H2 section not found: ## [[${symbolName}]]`);
        console.log();
        console.log('Available H2 sections in file:');
        const allH2 = this.findAllH2Sections(lines);
        allH2.forEach(s => {
          console.log(`  • [[${s.symbolName}]]`);
        });
        return this.failure('H2 not found');
      }

      this.printSuccess(`Found ## [[${symbolName}]] at line ${h2Section.startLine}`);
      console.log();

      // Check for existing canonical H1
      this.printInfo('Checking for existing canonical definition...');
      const targetFilename = this.generateFilename(symbolName);
      const targetPath = path.join(targetDir, targetFilename);

      if (fs.existsSync(targetPath)) {
        const existingContent = fs.readFileSync(targetPath, 'utf-8');
        const hasH1 = /^#\s+\[\[([^\]]+)\]\]/m.test(existingContent);

        if (hasH1) {
          this.printError(`Canonical H1 already exists: ${targetPath}`);
          return this.failure('H1 already exists');
        }
      }

      // Extract frontmatter from source file
      const sourceFrontmatter = this.extractFrontmatter(content);

      // Create canonical H1 file
      this.printSection('Creating Canonical H1 File');

      const canonicalContent = this.generateCanonicalDocument(
        symbolName,
        h2Section.content,
        sourceFrontmatter,
        sourceFile
      );

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        this.printInfo(`Created directory: ${targetDir}`);
      }

      fs.writeFileSync(targetPath, canonicalContent, 'utf-8');
      this.printSuccess(`Created: ${targetPath}`);
      console.log();

      // Update source file (replace H2 with inline reference)
      this.printSection('Updating Source File');

      const updatedContent = this.replaceH2WithReference(
        lines,
        h2Section,
        symbolName,
        targetPath
      );

      fs.writeFileSync(sourceFile, updatedContent, 'utf-8');
      this.printSuccess(`Updated: ${sourceFile}`);
      console.log(`  Replaced H2 section with inline reference to [[${symbolName}]]`);
      console.log();

      // Summary
      this.printSection('Promotion Summary');
      console.log(`  ${this.colors.green}✓${this.colors.reset} Canonical H1 created: ${targetPath}`);
      console.log(`  ${this.colors.green}✓${this.colors.reset} Source file updated: ${sourceFile}`);
      console.log(`  ${this.colors.green}✓${this.colors.reset} Symbol: [[${symbolName}]]`);
      console.log();

      console.log('Next steps:');
      console.log(`  1. Review canonical file: ${targetPath}`);
      console.log('  2. Fill in TODO sections with implementation details');
      console.log('  3. Validate: tsdoc-edge validate-symbol-refs managed');
      console.log();

      return this.success(`Promoted [[${symbolName}]] to canonical H1`);
    });
  }

  /**
   * Find H2 section by symbol name
   */
  private findH2Section(lines: string[], symbolName: string): H2Section | null {
    const h2Pattern = /^##\s+\[\[([^\]]+)\]\]/;
    let startLine = -1;
    let endLine = lines.length;

    // Find start
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(h2Pattern);
      if (match && match[1] === symbolName) {
        startLine = i;
        break;
      }
    }

    if (startLine === -1) return null;

    // Find end (next heading or EOF)
    for (let i = startLine + 1; i < lines.length; i++) {
      if (lines[i].match(/^#{1,2}\s+/)) {
        endLine = i;
        break;
      }
    }

    const content = lines.slice(startLine + 1, endLine).join('\n').trim();

    return {
      symbolName,
      content,
      startLine,
      endLine,
    };
  }

  /**
   * Find all H2 sections in file
   */
  private findAllH2Sections(lines: string[]): Array<{ symbolName: string }> {
    const h2Pattern = /^##\s+\[\[([^\]]+)\]\]/;
    const sections: Array<{ symbolName: string }> = [];

    for (const line of lines) {
      const match = line.match(h2Pattern);
      if (match) {
        sections.push({ symbolName: match[1] });
      }
    }

    return sections;
  }

  /**
   * Generate filename from symbol name
   */
  private generateFilename(symbolName: string): string {
    return (
      symbolName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') + '.md'
    );
  }

  /**
   * Extract frontmatter from content
   */
  private extractFrontmatter(content: string): Record<string, any> {
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    if (!frontmatterMatch) return {};

    const frontmatter: Record<string, any> = {};
    const lines = frontmatterMatch[1].split('\n');

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        frontmatter[match[1].trim()] = match[2].trim();
      }
    }

    return frontmatter;
  }

  /**
   * Generate canonical H1 document
   */
  private generateCanonicalDocument(
    symbolName: string,
    h2Content: string,
    sourceFrontmatter: Record<string, any>,
    sourceFile: string
  ): string {
    // Determine category from source or default
    const category = sourceFrontmatter.category || 'unknown';
    const status = sourceFrontmatter.status || 'planned';

    return `---
title: ${symbolName}
type: relationship
category: ${category}
status: ${status}
canonical: true
promoted-from: ${sourceFile}
created-at: ${new Date().toISOString()}
---

# [[${symbolName}]]

${h2Content}

---

**Canonical Definition**: This is the single source of truth for [[${symbolName}]]
**Promoted From**: ${sourceFile}
**Status**: ${status === 'implemented' ? '✅ Implemented' : '⚠️ Requires completion'}
`;
  }

  /**
   * Replace H2 section with inline reference
   */
  private replaceH2WithReference(
    lines: string[],
    h2Section: H2Section,
    symbolName: string,
    targetPath: string
  ): string {
    const beforeSection = lines.slice(0, h2Section.startLine);
    const afterSection = lines.slice(h2Section.endLine);

    const reference = [
      '',
      `> **${symbolName}**: See [[${symbolName}]] for canonical definition`,
      `> (Promoted to \`${targetPath}\`)`,
      '',
    ];

    return [...beforeSection, ...reference, ...afterSection].join('\n');
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
