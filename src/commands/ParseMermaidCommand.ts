/**
 * Parse Mermaid Command - .mmd 다이어그램에서 심볼 추출 및 문서 자동 생성
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { MermaidSymbolExtractor } from '../doc-symbol/MermaidSymbolExtractor';

/**
 * Parse Mermaid Command - Mermaid 다이어그램 파싱 및 문서 생성
 *
 * @public
 */
export class ParseMermaidCommand extends BaseCommand {
  getName(): string {
    return 'parse-mermaid';
  }

  getDescription(): string {
    return 'Parse Mermaid diagram (.mmd) and extract symbols/relationships';
  }

  protected getUsage(): string {
    return `tsdoc-edge parse-mermaid <file.mmd> [options]

  Options:
    --generate-docs      Generate documentation files
    --output=DIR         Output directory (default: managed/relationships)`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const mmdPath = args[0];
      const shouldGenerate = args.includes('--generate-docs');
      const outputDir = this.extractFlag(args, '--output') || 'managed/relationships';

      if (!mmdPath) {
        this.printError('Mermaid file required: parse-mermaid <file.mmd>');
        console.log();
        console.log('Examples:');
        console.log('  tsdoc-edge parse-mermaid managed/architecture/diagrams/dependency-meta-structure.mmd');
        console.log('  tsdoc-edge parse-mermaid diagram.mmd --generate-docs');
        console.log('  tsdoc-edge parse-mermaid diagram.mmd --generate-docs --output docs/relationships');
        return this.failure('Missing file path');
      }

      // Resolve path
      const absolutePath = path.resolve(process.cwd(), mmdPath);

      if (!fs.existsSync(absolutePath)) {
        this.printError(`File not found: ${mmdPath}`);
        return this.failure('File not found');
      }

      if (!mmdPath.endsWith('.mmd')) {
        this.printError('File must be a Mermaid diagram (.mmd)');
        return this.failure('Invalid file type');
      }

      this.printHeader(`Parse Mermaid: ${path.basename(mmdPath)}`);
      console.log(`📊 ${mmdPath}`);
      console.log();

      // Read and parse
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const extractor = new MermaidSymbolExtractor();
      const result = extractor.extract(content, mmdPath);

      // Display results
      this.displayParseResults(result);

      // Check existing files (H2 generation is safe, only warn if canonical H1 exists)
      if (shouldGenerate) {
        console.log();
        this.printSection('Checking Existing Documentation');

        const existingH1Symbols = this.scanExistingH1Symbols(outputDir);
        const canonicalConflicts: string[] = [];
        const existingFiles: string[] = [];

        for (const suggestion of result.suggestedDocs) {
          const docPath = path.join(outputDir, suggestion.filename);

          // Check if canonical H1 definition exists
          if (existingH1Symbols.has(suggestion.symbolName)) {
            canonicalConflicts.push(
              `${suggestion.filename} - canonical [[${suggestion.symbolName}]] already exists`
            );
          }

          // Check if file exists (will be overwritten in H2 mode)
          if (fs.existsSync(docPath)) {
            existingFiles.push(suggestion.filename);
          }
        }

        if (canonicalConflicts.length > 0) {
          console.log(`  ${this.colors.yellow}⚠️  Canonical symbols exist (${canonicalConflicts.length}):${this.colors.reset}`);
          canonicalConflicts.slice(0, 5).forEach(c => {
            console.log(`    ${this.colors.dim}${c}${this.colors.reset}`);
          });
          if (canonicalConflicts.length > 5) {
            console.log(`    ${this.colors.dim}... and ${canonicalConflicts.length - 5} more${this.colors.reset}`);
          }
          console.log(`  ${this.colors.cyan}💡 H2 reference docs will be generated (not canonical H1)${this.colors.reset}`);
          console.log();
        }

        if (existingFiles.length > 0) {
          console.log(`  ${this.colors.yellow}⚠️  Files will be overwritten (${existingFiles.length}):${this.colors.reset}`);
          existingFiles.slice(0, 5).forEach(f => {
            console.log(`    ${this.colors.dim}${f}${this.colors.reset}`);
          });
          if (existingFiles.length > 5) {
            console.log(`    ${this.colors.dim}... and ${existingFiles.length - 5} more${this.colors.reset}`);
          }

          if (!args.includes('--force')) {
            console.log();
            console.log(`  ${this.colors.cyan}💡 Use --force to overwrite existing files${this.colors.reset}`);
            this.printWarning('Skipping generation (use --force to overwrite)');
            return this.success('Check complete');
          }
        }

        console.log();
        this.printSection('Generating H2 Reference Documentation');

        const outputDirAbs = path.resolve(process.cwd(), outputDir);
        if (!fs.existsSync(outputDirAbs)) {
          fs.mkdirSync(outputDirAbs, { recursive: true });
          this.printInfo(`Created directory: ${outputDir}`);
        }

        let generated = 0;
        let skipped = 0;

        for (const suggestion of result.suggestedDocs) {
          const docPath = path.join(outputDirAbs, suggestion.filename);

          // In H2 mode, we can safely overwrite (if --force) or skip
          if (fs.existsSync(docPath) && !args.includes('--force')) {
            skipped++;
          } else {
            fs.writeFileSync(docPath, suggestion.skeleton, 'utf-8');
            const action = fs.existsSync(docPath) ? 'updated' : 'created';
            console.log(`  ${this.colors.green}✓${this.colors.reset} ${suggestion.filename} (${action} as H2 reference)`);
            generated++;
          }
        }

        console.log();
        this.printSuccess(`Generated ${generated} documents, skipped ${skipped}`);

        if (generated > 0) {
          console.log();
          console.log('Next steps:');
          console.log(`  1. Review generated docs in ${outputDir}/`);
          console.log('  2. Fill in TODO sections with implementation details');
          console.log('  3. Add [[Symbol]] references to related docs');
          console.log('  4. Run: tsdoc-edge validate-symbol-refs');
        }
      } else {
        console.log();
        console.log('💡 Tip: Use --generate-docs to create documentation skeletons');
      }

      console.log();

      return this.success(`Parsed ${result.symbols.length} symbols, ${result.relationships.length} relationships`);
    });
  }

  private displayParseResults(result: any): void {
    // Metadata
    this.printSection('Diagram Metadata');
    console.log(`  Type: ${this.colors.cyan}${result.metadata.diagramType}${this.colors.reset}`);
    if (result.metadata.orientation) {
      console.log(`  Orientation: ${this.colors.cyan}${result.metadata.orientation}${this.colors.reset}`);
    }
    if (result.metadata.subgraphs.length > 0) {
      console.log(`  Subgraphs: ${this.colors.cyan}${result.metadata.subgraphs.length}${this.colors.reset}`);
      result.metadata.subgraphs.forEach((sg: any) => {
        console.log(`    • ${sg.title}`);
      });
    }
    console.log();

    // Symbols
    this.printSection('Extracted Symbols');
    console.log(`  Total: ${this.colors.cyan}${result.symbols.length}${this.colors.reset}`);
    console.log();

    // Group by status
    const implemented = result.symbols.filter((s: any) => s.status === 'implemented');
    const notImplemented = result.symbols.filter((s: any) => s.status === 'not-implemented');
    const partial = result.symbols.filter((s: any) => s.status === 'partial');

    if (implemented.length > 0) {
      console.log(`  ${this.colors.green}✅ Implemented (${implemented.length}):${this.colors.reset}`);
      implemented.forEach((s: any) => {
        const metrics = s.metrics ? ` (${s.metrics.count.toLocaleString()} ${s.metrics.unit})` : '';
        console.log(`    • [[${s.symbolName}]]${metrics}`);
      });
      console.log();
    }

    if (partial.length > 0) {
      console.log(`  ${this.colors.yellow}⚠️  Partial (${partial.length}):${this.colors.reset}`);
      partial.forEach((s: any) => {
        console.log(`    • [[${s.symbolName}]]`);
      });
      console.log();
    }

    if (notImplemented.length > 0) {
      console.log(`  ${this.colors.dim}❌ Not Implemented (${notImplemented.length}):${this.colors.reset}`);
      notImplemented.forEach((s: any) => {
        console.log(`    ${this.colors.dim}• [[${s.symbolName}]]${this.colors.reset}`);
      });
      console.log();
    }

    // Relationships
    this.printSection('Relationships');
    console.log(`  Total edges: ${this.colors.cyan}${result.relationships.length}${this.colors.reset}`);

    const byType = {
      solid: result.relationships.filter((r: any) => r.edgeType === 'solid').length,
      dotted: result.relationships.filter((r: any) => r.edgeType === 'dotted').length,
      thick: result.relationships.filter((r: any) => r.edgeType === 'thick').length,
    };

    if (byType.solid > 0) {
      console.log(`    Solid (→): ${this.colors.cyan}${byType.solid}${this.colors.reset}`);
    }
    if (byType.dotted > 0) {
      console.log(`    Dotted (⋯→): ${this.colors.cyan}${byType.dotted}${this.colors.reset}`);
    }
    if (byType.thick > 0) {
      console.log(`    Thick (⟹): ${this.colors.cyan}${byType.thick}${this.colors.reset}`);
    }
    console.log();

    // Document suggestions
    if (result.suggestedDocs.length > 0) {
      this.printSection('Documentation Suggestions');
      console.log(`  ${result.suggestedDocs.length} documents can be auto-generated:`);
      console.log();
      result.suggestedDocs.slice(0, 5).forEach((doc: any) => {
        console.log(`    • ${doc.filename} for [[${doc.symbolName}]]`);
      });
      if (result.suggestedDocs.length > 5) {
        console.log(`    ${this.colors.dim}... and ${result.suggestedDocs.length - 5} more${this.colors.reset}`);
      }
    }
  }

  /**
   * Scan existing markdown files for canonical H1 [[Symbol]] definitions
   *
   * Only detects H1 definitions: # [[Symbol]]
   * H2 definitions (## [[Symbol]]) are references, not canonical
   */
  private scanExistingH1Symbols(dir: string): Map<string, string> {
    const symbols = new Map<string, string>();

    if (!fs.existsSync(dir)) {
      return symbols;
    }

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const h1Match = content.match(/^#\s+\[\[([^\]]+)\]\]/m);

      if (h1Match) {
        symbols.set(h1Match[1], filePath);
      }
    }

    return symbols;
  }

  private extractFlag(args: string[], flag: string): string | undefined {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
    return undefined;
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
