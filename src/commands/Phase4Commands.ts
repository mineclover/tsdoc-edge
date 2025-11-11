/**
 * Phase 4 Commands - Consolidated file for rapid implementation
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';
import { ConfigManager } from '../config/ConfigManager';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { SpecCompletenessValidator } from '../spec/SpecCompletenessValidator';
import { EnhancedDocExtractor } from '../parser/EnhancedDocExtractor';
import { EnhancedMarkdownGenerator } from '../generator/EnhancedMarkdownGenerator';
import type { AnalysisReport } from '../types/analysis';
import type { Symbol } from '../types/graph/graph';

/**
 * SuggestCommand - Generate improvement suggestions
 * @public
 * @doc [[Suggest Command]]
 * @doc [[CLI Commands#suggest]]
 */
export class SuggestCommand extends BaseCommand {
  private checker: CodeHealthChecker;

  constructor(checker?: CodeHealthChecker) {
    super();
    this.checker = checker || new CodeHealthChecker();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'suggest';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Generate improvement suggestions for code documentation';
  }

  protected getUsage(): string {
    return `tsdoc-edge suggest [directory] [options]

  Default directory: src

  Options:
    --min-score=N    Minimum quality score (default: 70)
    --limit=N        Maximum suggestions to show (default: 20)`;
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

      let targetPath = args[0] || 'src';
      let minQualityScore = 70;
      let limit = 20;

      for (const arg of args) {
        if (arg.startsWith('--min-score=')) {
          minQualityScore = Number.parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--limit=')) {
          limit = Number.parseInt(arg.split('=')[1], 10);
        } else if (!arg.startsWith('--')) {
          targetPath = arg;
        }
      }

      this.printHeader('TSDoc Edge - Improvement Suggestions');

      if (!fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        return this.failure(`Path not found: ${targetPath}`);
      }

      this.printInfo(`Analyzing: ${targetPath}`);
      this.printInfo(`Min quality score: ${minQualityScore}`);
      console.log();

      const report = this.checker.analyze({
        path: targetPath,
        includeChildren: true,
        includePrivate: false,
        minQualityScore,
        generateSuggestions: true,
      });

      const { suggestions } = report;

      if (suggestions.length === 0) {
        this.printSuccess('No issues found! Your codebase looks great.');
        return this.success();
      }

      this.printSection(`🎯 Improvement Suggestions (${suggestions.length} total)`);
      console.log();

      const critical = suggestions.filter((s) => s.priority === 'critical');
      const high = suggestions.filter((s) => s.priority === 'high');
      const medium = suggestions.filter((s) => s.priority === 'medium');

      let shown = 0;

      if (critical.length > 0 && shown < limit) {
        console.log(`${colors.red}${colors.bold}🔴 Critical Priority${colors.reset}`);
        console.log();
        for (const s of critical.slice(0, limit - shown)) {
          console.log(`   ${colors.bold}${s.issue}${colors.reset}`);
          console.log(`     ${colors.cyan}→ ${s.suggestion}${colors.reset}`);
          console.log(`     ${colors.dim}${s.symbolName || s.filePath}${colors.reset}`);
          console.log();
          shown++;
        }
      }

      if (high.length > 0 && shown < limit) {
        console.log(`${colors.yellow}${colors.bold}🟡 High Priority${colors.reset}`);
        console.log();
        for (const s of high.slice(0, limit - shown)) {
          console.log(`   ${colors.bold}${s.issue}${colors.reset}`);
          console.log(`     ${colors.cyan}→ ${s.suggestion}${colors.reset}`);
          console.log(`     ${colors.dim}${s.symbolName || s.filePath}${colors.reset}`);
          console.log();
          shown++;
        }
      }

      if (shown < limit && medium.length > 0) {
        console.log(`${colors.blue}${colors.bold}🔵 Medium Priority${colors.reset}`);
        console.log();
        for (const s of medium.slice(0, limit - shown)) {
          console.log(`   ${colors.bold}${s.issue}${colors.reset}`);
          console.log(`     ${colors.cyan}→ ${s.suggestion}${colors.reset}`);
          console.log(`     ${colors.dim}${s.symbolName || s.filePath}${colors.reset}`);
          console.log();
          shown++;
        }
      }

      if (suggestions.length > limit) {
        console.log(`... and ${suggestions.length - limit} more suggestions`);
        console.log();
      }

      return this.success();
    });
  }
}

/**
 * InitCommand - Initialize configuration
 * @public
 * @doc [[Init Command]]
 * @doc [[CLI Commands#init]]
 */
export class InitCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'init';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Initialize TSDoc Edge configuration';
  }

  protected getUsage(): string {
    return `tsdoc-edge init [options]

  Options:
    --force          Overwrite existing configuration
    --name=NAME      Project name
    --version=VER    Project version`;
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

      this.printHeader('TSDoc Edge - Initialize Project');

      const hasForce = args.includes('--force');
      const nameArg = args.find((arg) => arg.startsWith('--name='));
      const versionArg = args.find((arg) => arg.startsWith('--version='));

      const configManager = ConfigManager.getInstance();

      if (configManager.exists() && !hasForce) {
        this.printWarning('Configuration file already exists at:');
        this.printInfo(`   ${configManager.getConfigPath()}`);
        console.log();
        console.log('Use --force to overwrite the existing configuration.');
        console.log();
        return this.failure('Configuration already exists');
      }

      const projectName = nameArg ? nameArg.split('=')[1] : path.basename(process.cwd());
      const projectVersion = versionArg ? versionArg.split('=')[1] : '1.0.0';

      configManager.init(
        {
          project: {
            name: projectName,
            version: projectVersion,
          },
        },
        hasForce
      );

      this.printSuccess('Configuration file created successfully!');
      console.log();
      console.log('Configuration file:');
      this.printInfo(`   ${configManager.getConfigPath()}`);
      console.log();

      const config = configManager.get();
      console.log('Project Settings:');
      console.log(`   Name: ${colors.bold}${config.project.name}${colors.reset}`);
      console.log(`   Version: ${colors.bold}${config.project.version}${colors.reset}`);
      console.log();

      console.log('Storage Paths:');
      this.printInfo(`   Comments: ${config.paths.commentsDir}`);
      this.printInfo(`   Database: ${config.paths.databasePath}`);
      this.printInfo(`   JSONL: ${config.paths.jsonlDir}`);
      this.printInfo(`   Output: ${config.paths.outputDir}`);
      console.log();

      console.log('Creating directories...');
      configManager.ensureDirectories();
      this.printSuccess('Directories created successfully!');
      console.log();

      console.log('Next steps:');
      console.log('  1. Customize your configuration in .tsdoc.config.json');
      console.log('  2. Build database: tsdoc-edge build src');
      console.log('  3. Validate your project: tsdoc-edge validate');
      console.log();

      return this.success();
    });
  }
}

/**
 * IdNewCommand - Generate new symbol ID
 * @public
 * @doc [[ID New Command]]
 * @doc [[CLI Commands#id-new]]
 */
export class IdNewCommand extends BaseCommand {
  constructor(private manager?: SymbolRegistryManager) {
    super();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'id-new';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Generate new symbol ID';
  }

  protected getUsage(): string {
    return 'tsdoc-edge id-new <file-path> <symbol-name>';
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

      const filePath = args[0];
      const symbolName = args[1];

      if (!filePath || !symbolName) {
        this.printError('File path and symbol name required');
        console.log();
        console.log('Usage:');
        this.printInfo('  tsdoc-edge id-new <file> <symbol> [options]');
        console.log();
        console.log('Options:');
        console.log('  --type=<type>           Symbol type');
        console.log('  --parent=<id>           Parent symbol ID');
        console.log('  --member-type=<type>    Member type (instance, static, inner)');
        console.log();
        return this.failure('Missing required arguments');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      const manager = this.manager || new SymbolRegistryManager(registryPath);

      let type: string | undefined;
      let parent: string | undefined;
      let memberType: 'instance' | 'static' | 'inner' | undefined;

      for (const arg of args.slice(2)) {
        if (arg.startsWith('--type=')) {
          type = arg.split('=')[1];
        } else if (arg.startsWith('--parent=')) {
          parent = arg.split('=')[1];
        } else if (arg.startsWith('--member-type=')) {
          memberType = arg.split('=')[1] as 'instance' | 'static' | 'inner';
        }
      }

      if (parent && !manager.findById(parent)) {
        this.printError(`Parent symbol not found: ${parent}`);
        return this.failure(`Parent not found: ${parent}`);
      }

      const id = manager.register({
        filePath,
        symbolName,
        type: type as Symbol['type'],
        memberOf: parent,
        memberType,
      });
      manager.save();

      const entry = manager.findById(id);

      this.printSuccess('ID generated:');
      console.log();
      console.log(`  ID: ${colors.bold}${id}${colors.reset}`);
      console.log(`  Qualified Name: ${colors.bold}${entry?.sourceRef.qualifiedName}${colors.reset}`);
      console.log(`  File: ${filePath}`);
      console.log(`  Symbol: ${symbolName}`);
      if (type) console.log(`  Type: ${type}`);
      console.log();
      console.log('Add this to your TSDoc comment:');
      this.printInfo(`  @id ${id}`);
      console.log();

      return this.success();
    });
  }
}

/**
 * ValidateSpecCommand - Validate specification completeness
 * @public
 * @doc [[Validate Spec Command]]
 * @doc [[CLI Commands#validate-spec]]
 */
export class ValidateSpecCommand extends BaseCommand {
  constructor(private validator?: SpecCompletenessValidator) {
    super();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'validate-spec';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Validate specification completeness';
  }

  protected getUsage(): string {
    return 'tsdoc-edge validate-spec [docs-directory]\n\n  Default: managed';
  }

  /**
   * Colorize score based on value
   */
  private colorizeScore(score: number): string {
    if (score >= 80) return colors.green;
    if (score >= 60) return colors.yellow;
    return colors.red;
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

      const docsDir = args[0] || 'managed';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Path not found: ${docsPath}`);
        return this.failure(`Path not found: ${docsPath}`);
      }

      this.printHeader('Validating Specification Completeness');

      const markdownFiles = this.findMarkdownFiles(docsPath);

      if (markdownFiles.length === 0) {
        this.printWarning('No markdown files found');
        return this.success();
      }

      const validator = this.validator || new SpecCompletenessValidator();
      const results = validator.validateMultiple(markdownFiles);
      const summary = validator.getSummary(results);

      // Calculate average design and implementation scores
      const avgDesign = Math.round(
        results.reduce((sum, r) => sum + r.designScore, 0) / results.length
      );
      const avgImpl = Math.round(
        results.reduce((sum, r) => sum + r.implementationScore, 0) / results.length
      );

      this.printSection('Summary');
      console.log(`Total specifications: ${colors.cyan}${summary.total}${colors.reset}`);
      console.log(`Complete: ${colors.green}${summary.complete}${colors.reset}`);
      console.log(`Incomplete: ${colors.yellow}${summary.incomplete}${colors.reset}`);
      console.log();
      console.log(`${colors.bold}Score Breakdown:${colors.reset}`);
      console.log(`  Design Score:         ${this.colorizeScore(avgDesign)}${avgDesign}%${colors.reset}`);
      console.log(`  Implementation Score: ${this.colorizeScore(avgImpl)}${avgImpl}%${colors.reset}`);
      console.log(
        `  Total issues: ${summary.totalIssues > 0 ? colors.yellow : colors.green}${summary.totalIssues}${colors.reset}`
      );
      console.log();

      const completeSpecs = results.filter((r) => r.isComplete);
      if (completeSpecs.length > 0) {
        this.printSection('Complete Specifications');
        for (const result of completeSpecs.slice(0, 5)) {
          const fileName = path.basename(result.filePath);
          console.log(
            `${colors.green}✅${colors.reset} ${fileName}`
          );
          console.log(
            `   Design: ${this.colorizeScore(result.designScore)}${result.designScore}%${colors.reset}  Implementation: ${this.colorizeScore(result.implementationScore)}${result.implementationScore}%${colors.reset}`
          );
        }
        if (completeSpecs.length > 5) {
          console.log(`... and ${completeSpecs.length - 5} more`);
        }
        console.log();
      }

      const incompleteSpecs = results.filter((r) => !r.isComplete);
      if (incompleteSpecs.length > 0) {
        this.printSection('Incomplete Specifications');
        for (const result of incompleteSpecs.slice(0, 5)) {
          const fileName = path.basename(result.filePath);
          console.log(
            `${colors.yellow}⚠️${colors.reset} ${fileName}`
          );
          console.log(
            `   Design: ${this.colorizeScore(result.designScore)}${result.designScore}%${colors.reset}  Implementation: ${this.colorizeScore(result.implementationScore)}${result.implementationScore}%${colors.reset}`
          );
        }
        if (incompleteSpecs.length > 5) {
          console.log(`... and ${incompleteSpecs.length - 5} more`);
        }
        console.log();
      }

      if (summary.incomplete > 0) {
        return this.failure(`${summary.incomplete} incomplete specifications`);
      }

      return this.success();
    });
  }

  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    const stat = fs.statSync(dir);

    if (stat.isFile()) return [dir];

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isDirectory()) {
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  }
}

/**
 * GenerateDocsCommand - Generate markdown docs from enhanced docs
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
