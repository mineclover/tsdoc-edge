/**
 * Find Unused Docs Command - Find unused and stale documents
 *
 * @packageDocumentation
 * @doc [[FindUnusedDocsCommand]]
 * @doc [[CLI Commands]]
 * @context Stale and unreferenced documentation audit via `tsdoc-edge docs find-unused`
 * @functionality Evaluates managed Markdown documents with `UnusedDocumentDetector` and reports archival, review, or deletion candidates
 * @sideEffect console: Writes unused document diagnostics and action recommendations to stdout
 * @sideEffect filesystem: Scans managed Markdown files and file timestamps on disk (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { UnusedDocumentDetector } from '../spec/UnusedDocumentDetector';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for finding unused documents
 *
 * @public
 * @responsibility Find stale and unused documentation
 * @contract Scans documents, detects unused/stale, suggests actions
 * @doc [[FindUnusedDocsCommand]]
 * @doc [[CLI Commands]]
 * @doc [[CLI Commands#find-unused-docs]]
 * @sideEffect console: Writes unused document reports to stdout; scans managed Markdown files
 *
 * @problem Documentation accumulates over time, some becomes obsolete
 * @solves Identifies unused documents and suggests deletion/archival
 * @context Part of documentation maintenance
 *
 * @functionality
 * - Age detection: Find old documents
 * - Reference checking: Detect unreferenced documents
 * - Status analysis: Check document status
 * - Action suggestions: Delete, archive, review, or complete
 * - Summary statistics: Total, reasons, actions
 *
 * @decision Use UnusedDocumentDetector for analysis
 * @rationale Specialized detector with configurable thresholds
 * @consequences Requires managed directory to scan
 */
export class FindUnusedDocsCommand extends BaseCommand {
  private detector?: UnusedDocumentDetector;
  private showDeprecationWarning: boolean;

  constructor(detector?: UnusedDocumentDetector, showDeprecationWarning = false) {
    super();
    this.detector = detector;
    this.showDeprecationWarning = showDeprecationWarning;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'find-unused-docs';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find unused and stale documents';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge docs find-unused [docs-directory] [--json]

  Options:
    --json    Output structured JSON report

  Default: managed`;
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

      const flagError = this.validateAllowedFlags(args, ['--json'], []);
      if (flagError) return flagError;

      // Deprecation warning (only when called directly as legacy command)
      if (this.showDeprecationWarning) {
        this.printDeprecationWarning('tsdoc-edge docs find-unused');
      }

      const jsonMode = this.hasFlag(args, '--json');
      const positional = this.getPositionalArgs(args, []);
      if (positional.length > 1) {
        const msg = `Unexpected argument: ${positional[1]}`;
        this.printError(msg);
        return this.failure(msg, 2);
      }

      const dir = positional[0] || 'managed';
      const dirPath = path.resolve(process.cwd(), dir);

      if (!fs.existsSync(dirPath)) {
        const msg = `Directory not found: ${dirPath}`;
        if (jsonMode) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          this.printError(msg);
          console.log();
        }
        return this.failure(msg);
      }

      const detector = this.detector || new UnusedDocumentDetector();
      const results = detector.detect(dirPath);
      const summary = detector.getSummary(results);

      if (jsonMode) {
        console.log(
          JSON.stringify(
            {
              directory: path.relative(process.cwd(), dirPath) || '.',
              summary,
              documents: results.map((item) => ({
                ...item,
                relativePath: path.relative(process.cwd(), item.filePath) || item.filePath,
              })),
            },
            null,
            2
          )
        );
        return this.success();
      }

      this.printHeader('Finding Unused Documents');

      // Print summary
      this.printSection('Summary');
      console.log(`Total unused/stale documents: ${colors.cyan}${summary.total}${colors.reset}`);

      if (summary.total === 0) {
        this.printSuccess('No unused or stale documents found');
        console.log();
        return this.success();
      }

      console.log(
        `Average days since modified: ${colors.cyan}${summary.averageDaysSinceModified}${colors.reset}`
      );
      console.log();

      console.log(`${colors.bold}By Reason:${colors.reset}`);
      for (const [reason, count] of Object.entries(summary.byReason)) {
        console.log(`  ${reason}: ${count}`);
      }
      console.log();

      console.log(`${colors.bold}By Suggested Action:${colors.reset}`);
      for (const [action, count] of Object.entries(summary.byAction)) {
        const actionColor =
          action === 'delete' ? colors.red : action === 'archive' ? colors.yellow : colors.blue;
        console.log(`  ${actionColor}${action}${colors.reset}: ${count}`);
      }
      console.log();

      // Group by suggested action
      const byAction: Record<'delete' | 'archive' | 'review' | 'complete', typeof results> = {
        delete: [],
        archive: [],
        review: [],
        complete: [],
      };

      for (const result of results) {
        byAction[result.suggestedAction].push(result);
      }

      const sections: Array<{
        key: 'delete' | 'archive' | 'review' | 'complete';
        title: string;
        subtitle: string;
        icon: string;
        color: string;
      }> = [
        {
          key: 'delete',
          title: 'Suggested: Delete',
          subtitle: 'These documents are stale drafts with no references',
          icon: '🗑 ',
          color: colors.red,
        },
        {
          key: 'archive',
          title: 'Suggested: Archive',
          subtitle: 'These documents are deprecated and old but may have historical value',
          icon: '📦',
          color: colors.yellow,
        },
        {
          key: 'review',
          title: 'Suggested: Review',
          subtitle: 'These documents have no incoming references or have lingered in review',
          icon: '🔍',
          color: colors.blue,
        },
        {
          key: 'complete',
          title: 'Suggested: Complete Code Connections',
          subtitle: 'These active technical specs currently have zero code connections',
          icon: '🔗',
          color: colors.cyan,
        },
      ];

      for (const section of sections) {
        const items = byAction[section.key];
        if (items.length === 0) continue;
        this.printSection(section.title);
        console.log(`${colors.dim}${section.subtitle}${colors.reset}`);
        console.log();
        for (const result of items.slice(0, 10)) {
          const displayPath = path.relative(process.cwd(), result.filePath) || result.filePath;
          console.log(`${section.color}${section.icon}${colors.reset} ${displayPath}`);
          console.log(
            `   ${colors.dim}${result.reason} (${result.daysSinceModified} days old, refs=${result.referenceCount}, code=${result.codeConnectionCount})${colors.reset}`
          );
          console.log();
        }
        if (items.length > 10) {
          console.log(`${colors.dim}... and ${items.length - 10} more${colors.reset}`);
          console.log();
        }
      }

      return this.success();
    });
  }
}
