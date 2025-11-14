/**
 * Generate Docs Command - Generate enhanced documentation
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { EnhancedDocExtractor } from '../parser/EnhancedDocExtractor';
import { EnhancedMarkdownGenerator } from '../generator/EnhancedMarkdownGenerator';
import type { Symbol } from '../types/graph/graph';

/**
 * GenerateDocsCommand - Generate enhanced docs
 * @public
 * @doc [[Generate Docs Command]]
 * @doc [[CLI Commands#generate-docs]]
 */
export class GenerateDocsCommand extends BaseCommand {
  private extractor: EnhancedDocExtractor;
  private generator: EnhancedMarkdownGenerator;

  constructor(extractor?: EnhancedDocExtractor, generator?: EnhancedMarkdownGenerator) {
    super();
    this.extractor =
      extractor ||
      new EnhancedDocExtractor({
        includePartial: true,
        autoGenerateIds: true,
      });
    this.generator = generator || new EnhancedMarkdownGenerator();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'generate-docs';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Generate markdown documentation from enhanced docs';
  }

  protected getUsage(): string {
    return `tsdoc-edge generate-docs <source-path> [output-dir]

  Default output-dir: ./docs/generated`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const sourcePath = args[0];
      const outputDir = args[1] || './docs/generated';

      if (!sourcePath) {
        this.printError('Source path required');
        console.log();
        console.log('Usage:');
        this.printInfo('  tsdoc-edge generate-docs <file|directory> [output-dir]');
        console.log();
        return this.failure('Source path required');
      }

      if (!fs.existsSync(sourcePath)) {
        this.printError(`Source path not found: ${sourcePath}`);
        return this.failure(`Source path not found: ${sourcePath}`);
      }

      this.printHeader('TSDoc Edge - Generate Docs');
      console.log(`Generating docs from: ${colors.cyan}${sourcePath}${colors.reset}`);
      console.log(`Output directory: ${colors.cyan}${outputDir}${colors.reset}`);
      console.log();

      const stats = fs.statSync(sourcePath);
      let allResults: any[] = [];

      if (stats.isDirectory()) {
        allResults = this.parseDirectory(sourcePath);
      } else {
        const sourceCode = fs.readFileSync(sourcePath, 'utf-8');
        allResults = this.extractor.extractFromFile(sourcePath, sourceCode);
      }

      if (allResults.length === 0) {
        this.printWarning('No enhanced documentation found');
        return this.success();
      }

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      this.printSection('📝 Generating Markdown Files');

      let generated = 0;
      for (const result of allResults) {
        if (result.completeness < 10) continue;

        const markdown = this.generator.generateDocument(result.symbol, result.doc);
        const fileName = `${result.symbol.name}.md`;
        const outputPath = path.join(outputDir, fileName);

        fs.writeFileSync(outputPath, markdown, 'utf-8');
        generated++;

        const relPath = path.relative(process.cwd(), outputPath);
        this.printSuccess(`${result.symbol.name}`);
        console.log(`     ${colors.dim}→ ${relPath}${colors.reset}`);
      }

      console.log();
      this.printSuccess(`Generated ${generated} markdown file(s)`);
      console.log();

      return this.success();
    });
  }

  private parseDirectory(dir: string): any[] {
    const results: any[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          results.push(...this.parseDirectory(filePath));
        }
      } else if (
        file.endsWith('.ts') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.d.ts')
      ) {
        const sourceCode = fs.readFileSync(filePath, 'utf-8');
        const fileResults = this.extractor.extractFromFile(filePath, sourceCode);
        results.push(...fileResults);
      }
    }

    return results;
  }
}
