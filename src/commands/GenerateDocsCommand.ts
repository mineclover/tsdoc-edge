/**
 * Generate Docs Command - Generate enhanced documentation
 *
 * @packageDocumentation
 * @doc [[GenerateDocsCommand]]
 * @doc [[CLI Commands]]
 * @context Markdown API documentation generation via `tsdoc-edge docs generate`
 * @functionality Extracts enhanced TSDoc metadata from TypeScript files via `EnhancedDocExtractor` and emits Markdown files via `EnhancedMarkdownGenerator`
 * @sideEffect console: Writes generation progress and file counts to stdout
 * @sideEffect filesystem: Reads TypeScript source files and writes generated Markdown documentation files to the output directory
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EnhancedMarkdownGenerator } from '../generator/EnhancedMarkdownGenerator';
import { EnhancedDocExtractor, type ExtractedEnhancedDoc } from '../parser/EnhancedDocExtractor';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * GenerateDocsCommand - Generate enhanced docs
 * @public
 * @doc [[GenerateDocsCommand]]
 * @doc [[CLI Commands]]
 * @doc [[CLI Commands#generate-docs]]
 * @sideEffect filesystem: Reads TypeScript sources and writes generated Markdown documentation files; logs status to stdout
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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge docs generate <source-path> [output-dir] [options]

  Default output-dir: ./docs/generated
  Options:
    --dry-run, -n   Preview generated files without writing`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(args, ['--dry-run', '-n']);
      if (flagError) return flagError;

      const positional = this.getPositionalArgs(args);
      const sourcePath = positional[0];
      const outputDir = positional[1] || './docs/generated';
      const dryRun = this.hasFlag(args, ['--dry-run', '-n']);

      if (!sourcePath) {
        this.printError('Source path required');
        console.log();
        console.log('Usage:');
        this.printInfo('  tsdoc-edge docs generate <file|directory> [output-dir]');
        console.log();
        return this.failure('Source path required');
      }

      if (!fs.existsSync(sourcePath)) {
        this.printError(`Source path not found: ${sourcePath}`);
        console.log();
        console.log('This command expects a TypeScript file or directory path.');
        console.log();
        console.log('Examples:');
        this.printInfo('  tsdoc-edge d generate src/commands/BuildCommand.ts');
        this.printInfo('  tsdoc-edge d generate src/commands');
        console.log();
        return this.failure(`Source path not found: ${sourcePath}`);
      }

      this.printHeader('TSDoc Edge - Generate Docs');
      console.log(`Generating docs from: ${colors.cyan}${sourcePath}${colors.reset}`);
      console.log(`Output directory: ${colors.cyan}${outputDir}${colors.reset}`);
      console.log();

      const stats = fs.statSync(sourcePath);
      let allResults: ExtractedEnhancedDoc[] = [];

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

      if (!dryRun && !fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      this.printSection('📝 Generating Markdown Files');

      let generated = 0;
      for (const result of allResults) {
        if (result.completeness < 10) continue;

        const markdown = this.generator.generateDocument(result.symbol, result.doc);
        const fileName = `${result.symbol.name}.md`;
        const outputPath = path.join(outputDir, fileName);

        if (!dryRun) fs.writeFileSync(outputPath, markdown, 'utf-8');
        generated++;

        const relPath = path.relative(process.cwd(), outputPath);
        this.printSuccess(`${result.symbol.name}`);
        console.log(`     ${colors.dim}→ ${relPath}${colors.reset}`);
      }

      console.log();
      this.printSuccess(`${dryRun ? 'Would generate' : 'Generated'} ${generated} markdown file(s)`);
      console.log();

      return this.success();
    });
  }

  private parseDirectory(dir: string): ExtractedEnhancedDoc[] {
    const results: ExtractedEnhancedDoc[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          results.push(...this.parseDirectory(filePath));
        }
      } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
        const sourceCode = fs.readFileSync(filePath, 'utf-8');
        const fileResults = this.extractor.extractFromFile(filePath, sourceCode);
        results.push(...fileResults);
      }
    }

    return results;
  }
}
