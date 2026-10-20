/**
 * Validate Generated Docs Command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type DocValidationResult,
  GeneratedDocsValidator,
} from '../validator/GeneratedDocsValidator';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command to validate generated markdown documentation
 *
 * @doc [[ValidateGeneratedDocsCommand]]
 * @public
 * @responsibility Validate generated markdown docs for structure and completeness
 * @contract Check required sections, metadata, and formatting
 *
 * @problem Generated docs may have missing sections or incorrect structure
 * @solves Automated validation ensures doc quality
 * @context Part of documentation generation workflow
 *
 * @functionality
 * - Validate single file or directory of markdown files
 * - Check required sections (Problem Solving, Functionality)
 * - Verify metadata presence
 * - Calculate completeness scores
 * - Show detailed error/warning reports
 *
 * @decision Focus on structural validation
 * @rationale Structure is measurable and fixable
 * @consequences May miss semantic/content issues
 */
export class ValidateGeneratedDocsCommand extends BaseCommand {
  private validator: GeneratedDocsValidator;

  constructor() {
    super();
    this.validator = new GeneratedDocsValidator();
  }

  /**
   * Get command name
   *
   * @returns Command name
   */
  getName(): string {
    return 'validate-generated-docs';
  }

  /**
   * Get command description
   *
   * @returns Command description
   */
  getDescription(): string {
    return 'Validate generated markdown documentation';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge validate-generated-docs <path> [options]

  Path can be a single .md file or a directory

  Options:
    --human          Output in human-readable format (default: XML)

  Example:
    tsdoc-edge validate-generated-docs docs/generated
    tsdoc-edge validate-generated-docs docs/generated/MyClass.md`;
  }

  /**
   * Execute command
   *
   * @param args - Command arguments [path]
   * @returns Command result
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const isHuman = this.hasFlag(args, '--human');
      const targetPath = args.find((arg) => !arg.startsWith('-'));

      if (!targetPath) {
        this.printError('Path required');
        console.log();
        console.log('Usage:');
        this.printInfo('  tsdoc-edge validate-generated-docs <file|directory>');
        console.log();
        return this.failure('Path required');
      }

      if (!fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        return this.failure(`Path not found: ${targetPath}`);
      }

      if (isHuman) this.printHeader('TSDoc Edge - Validate Generated Docs');

      const stats = fs.statSync(targetPath);
      let results: DocValidationResult[] = [];

      if (stats.isDirectory()) {
        if (isHuman) {
          console.log(`Validating directory: ${colors.cyan}${targetPath}${colors.reset}`);
          console.log();
        }
        results = this.validator.validateDirectory(targetPath);
      } else if (targetPath.endsWith('.md')) {
        if (isHuman) {
          console.log(`Validating file: ${colors.cyan}${targetPath}${colors.reset}`);
          console.log();
        }
        results = [this.validator.validate(targetPath)];
      } else {
        this.printError('Path must be a .md file or directory');
        return this.failure('Invalid path');
      }

      if (results.length === 0 && isHuman) {
        this.printWarning('No markdown files found');
        return this.success();
      }

      const summary = this.validator.getSummary(results);
      const allValid = summary.invalid === 0 && summary.withErrors === 0;

      if (isHuman) {
        this.printHumanReport(results, summary);
      } else {
        this.printOutput(
          'validation-results',
          {
            summary: {
              targetPath,
              total: summary.total,
              valid: summary.valid,
              invalid: summary.invalid,
              withErrors: summary.withErrors,
              withWarnings: summary.withWarnings,
              averageSections: Number(summary.averageSections.toFixed(1)),
            },
            documents: results.map((result) => ({
              path: path.relative(process.cwd(), result.filePath),
              isValid: result.isValid,
              completeness: this.validator.calculateCompleteness(result),
              errors: result.errors.map((message) => ({ message })),
              warnings: result.warnings.map((message) => ({ message })),
              missingSections: result.missingSections.map((name) => ({ name })),
            })),
          },
          args
        );
      }

      return allValid ? this.success() : this.failure(`${summary.invalid} invalid documents`);
    });
  }

  /**
   * Print the colored terminal report (--human)
   */
  private printHumanReport(
    results: DocValidationResult[],
    summary: ReturnType<GeneratedDocsValidator['getSummary']>
  ): void {
    // Show summary

    this.printSection('Summary');
    console.log(`  Total documents: ${colors.cyan}${summary.total}${colors.reset}`);
    console.log(`  Valid: ${colors.green}${summary.valid}${colors.reset}`);
    console.log(
      `  Invalid: ${summary.invalid > 0 ? colors.red : colors.dim}${summary.invalid}${colors.reset}`
    );
    console.log(
      `  With errors: ${summary.withErrors > 0 ? colors.red : colors.dim}${summary.withErrors}${colors.reset}`
    );
    console.log(
      `  With warnings: ${summary.withWarnings > 0 ? colors.yellow : colors.dim}${summary.withWarnings}${colors.reset}`
    );
    console.log(
      `  Avg sections: ${colors.cyan}${summary.averageSections.toFixed(1)}${colors.reset}`
    );
    console.log();

    // Show invalid documents
    const invalid = results.filter((r) => !r.isValid);
    if (invalid.length > 0) {
      this.printSection('Invalid Documents');
      for (const result of invalid) {
        const relPath = path.relative(process.cwd(), result.filePath);
        console.log(`  ${colors.red}✗${colors.reset} ${relPath}`);

        if (result.errors.length > 0) {
          result.errors.forEach((err: string) => {
            console.log(`     ${colors.red}Error${colors.reset}: ${err}`);
          });
        }

        if (result.missingSections.length > 0) {
          console.log(
            `     ${colors.yellow}Missing sections${colors.reset}: ${result.missingSections.join(', ')}`
          );
        }

        console.log();
      }
    }

    // Show warnings
    const withWarnings = results.filter((r) => r.warnings.length > 0);
    if (withWarnings.length > 0 && withWarnings.length <= 10) {
      this.printSection('Documents with Warnings');
      for (const result of withWarnings) {
        const relPath = path.relative(process.cwd(), result.filePath);
        console.log(`  ${colors.yellow}⚠${colors.reset} ${relPath}`);

        result.warnings.forEach((warning: string) => {
          console.log(`     ${colors.yellow}Warning${colors.reset}: ${warning}`);
        });

        console.log();
      }
    } else if (withWarnings.length > 10) {
      this.printInfo(`${withWarnings.length} documents have warnings (showing first 10)`);
      console.log();
    }

    // Show completeness scores
    if (results.length <= 10) {
      this.printSection('Completeness Scores');
      for (const result of results) {
        const relPath = path.relative(process.cwd(), result.filePath);
        const fileName = path.basename(relPath);
        const score = this.validator.calculateCompleteness(result);

        const scoreColor = score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red;

        console.log(`  ${fileName.padEnd(40)} ${scoreColor}${score}%${colors.reset}`);
      }
      console.log();
    }

    // Final result
    if (summary.invalid === 0 && summary.withErrors === 0) {
      this.printSuccess(`All ${summary.total} document(s) are valid!`);

      if (summary.withWarnings > 0) {
        this.printInfo(`Note: ${summary.withWarnings} document(s) have warnings (non-critical)`);
      }

      console.log();
    } else {
      this.printError(`${summary.invalid} invalid document(s) found`);
      console.log();
    }
  }
}
