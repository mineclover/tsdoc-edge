/**
 * Suggest Command - Generate improvement suggestions
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';
import type { AnalysisReport } from '../types/analysis';

/**
 * SuggestCommand - Generate improvement suggestions
 * @public
 * @doc [[SuggestCommand]]
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
