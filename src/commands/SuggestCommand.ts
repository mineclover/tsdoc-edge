/**
 * Suggest Command - Generate improvement suggestions
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import { CodeHealthChecker } from '../analyzer/CodeHealthChecker';
import type { ImprovementSuggestion } from '../types/analysis';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge suggest [directory] [options]

  Default directory: src

  Options:
    --human          Output in human-readable format (default: XML)
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

      const isHuman = this.hasFlag(args, '--human');
      // Option flags may come first, so the default is only replaced by a positional path below
      let targetPath = 'src';
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

      if (isHuman) {
        this.printHeader('TSDoc Edge - Improvement Suggestions');
      }

      if (!fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        return this.failure(`Path not found: ${targetPath}`);
      }

      if (isHuman) {
        this.printInfo(`Analyzing: ${targetPath}`);
        this.printInfo(`Min quality score: ${minQualityScore}`);
        console.log();
      }

      const report = this.checker.analyze({
        path: targetPath,
        includeChildren: true,
        includePrivate: false,
        minQualityScore,
        generateSuggestions: true,
      });

      const { suggestions } = report;

      if (!isHuman) {
        // Same selection as the human view: critical, then high, then medium, up to the limit
        const shown: ImprovementSuggestion[] = [];
        for (const priority of ['critical', 'high', 'medium'] as const) {
          if (shown.length >= limit) break;
          shown.push(
            ...suggestions.filter((s) => s.priority === priority).slice(0, limit - shown.length)
          );
        }

        this.printOutput(
          'improvement-suggestions',
          {
            summary: {
              targetPath,
              minQualityScore,
              totalFound: suggestions.length,
              limit,
              shownCount: shown.length,
            },
            suggestions: shown.map((s) => ({
              priority: s.priority,
              issue: s.issue,
              suggestion: s.suggestion,
              ...(s.symbolName ? { symbolName: s.symbolName } : {}),
              filePath: s.filePath,
            })),
          },
          args
        );
        return this.success();
      }

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
