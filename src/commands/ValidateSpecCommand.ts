/**
 * Validate Spec Command - Validate specification completeness
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SpecCompletenessValidator } from '../spec/SpecCompletenessValidator';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * ValidateSpecCommand - Validate specifications
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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
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
      console.log(
        `  Design Score:         ${this.colorizeScore(avgDesign)}${avgDesign}%${colors.reset}`
      );
      console.log(
        `  Implementation Score: ${this.colorizeScore(avgImpl)}${avgImpl}%${colors.reset}`
      );
      console.log(
        `  Total issues: ${summary.totalIssues > 0 ? colors.yellow : colors.green}${summary.totalIssues}${colors.reset}`
      );
      console.log();

      const completeSpecs = results.filter((r) => r.isComplete);
      if (completeSpecs.length > 0) {
        this.printSection('Complete Specifications');
        for (const result of completeSpecs.slice(0, 5)) {
          const fileName = path.basename(result.filePath);
          console.log(`${colors.green}✅${colors.reset} ${fileName}`);
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
          console.log(`${colors.yellow}⚠️${colors.reset} ${fileName}`);
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
