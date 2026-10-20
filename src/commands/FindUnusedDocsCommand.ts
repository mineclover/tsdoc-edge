/**
 * Find Unused Docs Command - Find unused and stale documents
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { UnusedDocumentDetector } from '../spec/UnusedDocumentDetector';
import type { UnusedDocument } from '../types/spec';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for finding unused documents
 *
 * @public
 * @responsibility Find stale and unused documentation
 * @contract Scans documents, detects unused/stale, suggests actions
 * @doc [[FindUnusedDocsCommand]]
 * @doc [[CLI Commands#find-unused-docs]]
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
 *
 * @depends UnusedDocumentDetector
 * @depType internal
 * @depReason Unused document detection
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
    return `tsdoc-edge find-unused-docs [docs-directory] [options]

  Default: managed

  Options:
    --human          Output in human-readable format (default: XML)`;
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

      // Deprecation warning (only when called directly as legacy command)
      if (this.showDeprecationWarning && isHuman) {
        this.printDeprecationWarning('tsdoc-edge docs unused');
      }

      // `--human` is a boolean flag, so it must not be mistaken for the directory argument
      const target = args.filter((arg) => arg !== '--human')[0];
      const dir = target || 'managed';
      const dirPath = path.resolve(process.cwd(), dir);

      if (!fs.existsSync(dirPath)) {
        this.printError(`Directory not found: ${dirPath}`);
        console.log();
        return this.failure(`Directory not found: ${dirPath}`);
      }

      if (isHuman) {
        this.printHeader('Finding Unused Documents');
      }

      const detector = this.detector || new UnusedDocumentDetector();
      const results = detector.detect(dirPath);
      const summary = detector.getSummary(results);

      if (isHuman) {
        this.printHumanReport(results, summary);
      } else {
        this.printOutput(
          'unused-documents',
          {
            summary: {
              path: dir,
              totalFound: summary.total,
              averageDaysSinceModified: summary.averageDaysSinceModified,
            },
            reasons: Object.entries(summary.byReason).map(([reason, count]) => ({
              reason,
              count,
            })),
            actions: Object.entries(summary.byAction).map(([action, count]) => ({
              action,
              count,
            })),
            documents: results.map((r) => ({
              filePath: r.filePath,
              reason: r.reason,
              suggestedAction: r.suggestedAction,
              daysSinceModified: r.daysSinceModified,
            })),
          },
          args
        );
      }

      return this.success();
    });
  }

  /**
   * Print the colored terminal report (`--human`)
   * @private
   */
  private printHumanReport(
    results: UnusedDocument[],
    summary: ReturnType<UnusedDocumentDetector['getSummary']>
  ): void {
    // Print summary
    this.printSection('Summary');
    console.log(`Total unused/stale documents: ${colors.cyan}${summary.total}${colors.reset}`);

    if (summary.total === 0) {
      this.printSuccess('No unused or stale documents found');
      console.log();
      return;
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
    const byAction: Record<string, typeof results> = {
      delete: [],
      archive: [],
      review: [],
      complete: [],
    };

    for (const result of results) {
      byAction[result.suggestedAction].push(result);
    }

    // Print delete suggestions
    if (byAction.delete.length > 0) {
      this.printSection('Suggested: Delete');
      console.log(
        `${colors.dim}These documents are stale drafts with no references${colors.reset}`
      );
      console.log();
      for (const result of byAction.delete.slice(0, 10)) {
        console.log(`${colors.red}🗑${colors.reset}  ${result.filePath}`);
        console.log(
          `   ${colors.dim}${result.reason} (${result.daysSinceModified} days old)${colors.reset}`
        );
        console.log();
      }
      if (byAction.delete.length > 10) {
        console.log(`${colors.dim}... and ${byAction.delete.length - 10} more${colors.reset}`);
        console.log();
      }
    }

    // Print archive suggestions
    if (byAction.archive.length > 0) {
      this.printSection('Suggested: Archive');
      console.log(`${colors.dim}These documents are old but may have value${colors.reset}`);
      console.log();
      for (const result of byAction.archive.slice(0, 10)) {
        console.log(`${colors.yellow}📦${colors.reset} ${result.filePath}`);
        console.log(
          `   ${colors.dim}${result.reason} (${result.daysSinceModified} days old)${colors.reset}`
        );
        console.log();
      }
      if (byAction.archive.length > 10) {
        console.log(`${colors.dim}... and ${byAction.archive.length - 10} more${colors.reset}`);
        console.log();
      }
    }
  }
}
