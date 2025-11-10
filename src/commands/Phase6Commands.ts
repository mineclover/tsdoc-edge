/**
 * Phase 6 Commands - Spec management and document search
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SpecContentSimilarityChecker } from '../spec/SpecContentSimilarityChecker';
import { SpecStatusManager } from '../spec/SpecStatusManager';
import { UnusedDocumentDetector } from '../spec/UnusedDocumentDetector';
import { SpecVersionManager } from '../spec/SpecVersionManager';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../doc-symbol/DocumentSymbolRegistry';

/**
 * Helper function to recursively find markdown files
 * @param dir - dir parameter
 * @returns Returns string[]
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  const stat = fs.statSync(dir);

  if (stat.isFile()) {
    return [dir];
  }

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const entryStat = fs.statSync(fullPath);

    if (entryStat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Command for checking duplicate content in specifications
 *
 * @public
 * @responsibility Check for content similarity across documents
 * @contract Analyzes documents, detects duplicates, suggests actions
 *
 * @problem Documentation may have duplicate or highly similar content
 * @solves Detects content similarity and suggests merging or cross-referencing
 * @context Part of documentation quality assurance
 *
 * @functionality
 * - File scanning: Find all markdown files in directory
 * - Similarity analysis: Compare all document pairs
 * - Categorization: Merge, cross-reference, or keep separate
 * - Detailed reporting: Show overlapping sections
 * - Quality threshold: Exit with error if high similarity found
 *
 * @decision Use SpecContentSimilarityChecker for analysis
 * @rationale Specialized checker with configurable thresholds
 * @consequences Requires at least 2 files to compare
 *
 * @depends SpecContentSimilarityChecker
 * @depType internal
 * @depReason Content similarity analysis
 */
export class CheckDuplicatesCommand extends BaseCommand {
  private checker?: SpecContentSimilarityChecker;

  constructor(checker?: SpecContentSimilarityChecker) {
    super();
    this.checker = checker;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'check-duplicates';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Check for duplicate content in specifications';
  }

  protected getUsage(): string {
    return 'tsdoc-edge check-duplicates [docs-directory]\n\n  Default: managed';
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

      const target = args[0];
      const docsDir = target || 'managed';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Path not found: ${docsPath}`);
        console.log();
        return this.failure(`Path not found: ${docsPath}`);
      }

      this.printHeader('Checking Content Similarity');

      const markdownFiles = findMarkdownFiles(docsPath);

      if (markdownFiles.length === 0) {
        console.log(`${colors.yellow}No markdown files found${colors.reset}`);
        console.log();
        return this.success();
      }

      if (markdownFiles.length < 2) {
        console.log(`${colors.yellow}Need at least 2 files to check for duplicates${colors.reset}`);
        console.log();
        return this.success();
      }

      const checker = this.checker || new SpecContentSimilarityChecker();
      const results = checker.checkMultiple(markdownFiles);
      const summary = checker.getSummary(results);

      // Print summary
      this.printSection('Summary');
      console.log(`Total documents: ${colors.cyan}${markdownFiles.length}${colors.reset}`);
      console.log(
        `Pairs analyzed: ${colors.cyan}${(markdownFiles.length * (markdownFiles.length - 1)) / 2}${colors.reset}`
      );
      console.log(`Similar pairs found: ${colors.cyan}${summary.totalPairs}${colors.reset}`);
      console.log(`Average similarity: ${colors.cyan}${(summary.averageSimilarity * 100).toFixed(1)}%${colors.reset}`);
      console.log();
      console.log(`${colors.bold}Suggestions:${colors.reset}`);
      console.log(`  Merge: ${colors.red}${summary.mergeSuggestions}${colors.reset}`);
      console.log(`  Cross-reference: ${colors.yellow}${summary.crossRefSuggestions}${colors.reset}`);
      console.log(`  Keep separate: ${colors.green}${summary.keepSeparate}${colors.reset}`);
      console.log();

      if (results.length === 0) {
        this.printSuccess('No significant content similarity detected');
        console.log();
        return this.success();
      }

      // Print merge suggestions
      const mergeSuggestions = results.filter((r) => r.suggestion === 'merge');
      if (mergeSuggestions.length > 0) {
        this.printSection('Merge Suggestions (High Similarity)');
        for (const result of mergeSuggestions) {
          console.log(
            `${colors.red}🔴${colors.reset} ${colors.bold}Similarity: ${(result.similarity * 100).toFixed(1)}%${colors.reset}`
          );
          console.log(`   File 1: ${result.file1}`);
          console.log(`   File 2: ${result.file2}`);
          console.log(`   ${colors.dim}${result.reason}${colors.reset}`);

          if (result.overlappingSections.length > 0) {
            console.log(`   ${colors.bold}Overlapping sections:${colors.reset}`);
            for (const section of result.overlappingSections) {
              console.log(`     - ${section.section} (${(section.similarity * 100).toFixed(1)}%)`);
            }
          }
          console.log();
        }
      }

      // Print cross-reference suggestions
      const crossRefSuggestions = results.filter((r) => r.suggestion === 'cross-reference');
      if (crossRefSuggestions.length > 0) {
        this.printSection('Cross-Reference Suggestions (Moderate Similarity)');
        for (const result of crossRefSuggestions) {
          console.log(
            `${colors.yellow}🟡${colors.reset} ${colors.bold}Similarity: ${(result.similarity * 100).toFixed(1)}%${colors.reset}`
          );
          console.log(`   File 1: ${result.file1}`);
          console.log(`   File 2: ${result.file2}`);
          console.log(`   ${colors.dim}${result.reason}${colors.reset}`);

          if (result.overlappingSections.length > 0) {
            console.log(`   ${colors.bold}Overlapping sections:${colors.reset}`);
            for (const section of result.overlappingSections) {
              console.log(`     - ${section.section} (${(section.similarity * 100).toFixed(1)}%)`);
            }
          }
          console.log();
        }
      }

      // Exit with warning if merge suggestions exist
      if (mergeSuggestions.length > 0) {
        this.printError(`Found ${mergeSuggestions.length} pair(s) with high similarity that should be merged`);
        console.log();
        return this.failure(`Found ${mergeSuggestions.length} pairs with high similarity`);
      }

      return this.success();
    });
  }
}

/**
 * Command for managing specification status
 *
 * @public
 * @responsibility Manage document lifecycle status
 * @contract Validates transitions, updates status, shows statistics
 *
 * @problem Need to track document maturity and readiness
 * @solves Manages status transitions (draft → review → approved → active)
 * @context Part of specification lifecycle management
 *
 * @functionality
 * - Show status: Display current status and allowed transitions
 * - Promote: Change document status with validation
 * - List ready: Find documents ready for promotion
 * - Stats: Show status distribution across documents
 * - Validation: Ensure quality requirements before promotion
 *
 * @decision Use SpecStatusManager for lifecycle management
 * @rationale Centralized status logic with validation rules
 * @consequences Requires valid status values and transition paths
 *
 * @depends SpecStatusManager
 * @depType internal
 * @depReason Status lifecycle management
 */
export class SpecStatusCommand extends BaseCommand {
  private manager?: SpecStatusManager;

  constructor(manager?: SpecStatusManager) {
    super();
    this.manager = manager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'spec-status';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Manage specification status';
  }

  protected getUsage(): string {
    return `tsdoc-edge spec-status <subcommand> <file> [status]

  Subcommands:
    show <file>            Show current status
    promote <file> <status> Promote to new status`;
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

      const subcommand = args[0];
      const target = args[1];

      if (!subcommand) {
        this.printError('Usage:');
        this.printInfo('  tsdoc-edge spec-status show <file>           - Show current status and allowed transitions');
        this.printInfo('  tsdoc-edge spec-status promote <file> <status> - Promote document to new status');
        this.printInfo('  tsdoc-edge spec-status list-ready [dir]      - List documents ready for promotion');
        this.printInfo('  tsdoc-edge spec-status stats [dir]           - Show status distribution');
        console.log();
        return this.failure('Subcommand required');
      }

      const manager = this.manager || new SpecStatusManager();

      // show: Show current status
      if (subcommand === 'show') {
        if (!target) {
          this.printError('Usage: tsdoc-edge spec-status show <file>');
          console.log();
          return this.failure('File path required');
        }

        const filePath = path.resolve(process.cwd(), target);

        if (!fs.existsSync(filePath)) {
          this.printError(`File not found: ${filePath}`);
          console.log();
          return this.failure(`File not found: ${filePath}`);
        }

        this.printHeader('Specification Status');

        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        let currentStatus: string = 'draft';
        if (frontmatterMatch) {
          const statusMatch = frontmatterMatch[1].match(/status:\s*["']?(\w+)["']?/);
          currentStatus = statusMatch ? statusMatch[1] : 'draft';
        }

        console.log(`File: ${colors.cyan}${filePath}${colors.reset}`);
        console.log(`Current status: ${colors.bold}${currentStatus}${colors.reset}`);
        console.log();

        const allowed = manager.getAllowedTransitions(filePath);
        console.log(`${colors.bold}Allowed transitions:${colors.reset}`);
        if (allowed.length === 0) {
          console.log(`  ${colors.dim}(none - terminal status)${colors.reset}`);
        } else {
          for (const status of allowed) {
            const validation = manager.validateTransition(filePath, status);
            const icon = validation.valid ? colors.green + '✅' : colors.yellow + '⚠️';
            console.log(`  ${icon} ${status}${colors.reset}`);

            if (!validation.valid) {
              for (const check of validation.checks.filter((c) => !c.passed)) {
                console.log(`     ${colors.dim}${check.message}${colors.reset}`);
              }
            }
          }
        }
        console.log();
        return this.success();
      }

      // promote: Promote to new status
      else if (subcommand === 'promote') {
        const newStatus = args[2];

        if (!target || !newStatus) {
          this.printError('Usage: tsdoc-edge spec-status promote <file> <status>');
          this.printInfo('Valid statuses: draft, review, approved, active, deprecated, archived');
          console.log();
          return this.failure('File and status required');
        }

        const filePath = path.resolve(process.cwd(), target);

        if (!fs.existsSync(filePath)) {
          this.printError(`File not found: ${filePath}`);
          console.log();
          return this.failure(`File not found: ${filePath}`);
        }

        this.printHeader('Promoting Specification');

        console.log(`File: ${colors.cyan}${filePath}${colors.reset}`);
        console.log(`Target status: ${colors.bold}${newStatus}${colors.reset}`);
        console.log();

        const validation = manager.validateTransition(filePath, newStatus as any);

        this.printSection('Validation Checks');
        for (const check of validation.checks) {
          const icon = check.passed ? colors.green + '✅' : colors.red + '❌';
          console.log(`${icon} ${check.name}${colors.reset}`);
          console.log(`   ${colors.dim}${check.message}${colors.reset}`);
        }
        console.log();

        if (!validation.valid) {
          this.printError('Cannot promote: validation failed');
          console.log();
          return this.failure('Validation failed');
        }

        // Apply transition
        manager.applyTransition(filePath, newStatus as any);
        this.printSuccess(`Successfully promoted to "${newStatus}"`);
        console.log();
        return this.success();
      }

      // list-ready: List documents ready for promotion
      else if (subcommand === 'list-ready') {
        const dir = target || 'managed';
        const dirPath = path.resolve(process.cwd(), dir);

        if (!fs.existsSync(dirPath)) {
          this.printError(`Directory not found: ${dirPath}`);
          console.log();
          return this.failure(`Directory not found: ${dirPath}`);
        }

        this.printHeader('Documents Ready for Promotion');

        const markdownFiles = findMarkdownFiles(dirPath);
        const promotable = manager.getPromotableDocs(markdownFiles);

        const ready = promotable.filter((p) => p.canPromote);
        const notReady = promotable.filter((p) => !p.canPromote);

        this.printSection('Ready for Promotion');
        if (ready.length === 0) {
          console.log(`${colors.dim}(no documents ready)${colors.reset}`);
        } else {
          for (const doc of ready) {
            console.log(`${colors.green}✅${colors.reset} ${doc.filePath}`);
            console.log(`   ${doc.currentStatus} → ${doc.targetStatus}`);
            console.log(`   ${colors.dim}${doc.reason}${colors.reset}`);
            console.log();
          }
        }

        if (notReady.length > 0) {
          this.printSection('Not Ready');
          for (const doc of notReady) {
            console.log(`${colors.yellow}⚠️${colors.reset} ${doc.filePath}`);
            console.log(`   ${doc.currentStatus} → ${doc.targetStatus}`);
            console.log(`   ${colors.dim}${doc.reason}${colors.reset}`);
            console.log();
          }
        }
        return this.success();
      }

      // stats: Show status distribution
      else if (subcommand === 'stats') {
        const dir = target || 'managed';
        const dirPath = path.resolve(process.cwd(), dir);

        if (!fs.existsSync(dirPath)) {
          this.printError(`Directory not found: ${dirPath}`);
          console.log();
          return this.failure(`Directory not found: ${dirPath}`);
        }

        this.printHeader('Specification Status Distribution');

        const markdownFiles = findMarkdownFiles(dirPath);
        const distribution = manager.getStatusDistribution(markdownFiles);

        this.printSection('Status Distribution');
        const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

        console.log(`Total documents: ${colors.cyan}${total}${colors.reset}`);
        console.log();

        for (const [status, count] of Object.entries(distribution)) {
          if (count > 0) {
            const percentage = ((count / total) * 100).toFixed(1);
            console.log(`  ${colors.bold}${status}${colors.reset}: ${count} (${percentage}%)`);
          }
        }
        console.log();
        return this.success();
      }

      else {
        this.printError(`Unknown subcommand: ${subcommand}`);
        this.printInfo('Valid subcommands: show, promote, list-ready, stats');
        console.log();
        return this.failure(`Unknown subcommand: ${subcommand}`);
      }
    });
  }
}

/**
 * Command for finding unused documents
 *
 * @public
 * @responsibility Find stale and unused documentation
 * @contract Scans documents, detects unused/stale, suggests actions
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

  constructor(detector?: UnusedDocumentDetector) {
    super();
    this.detector = detector;
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

  protected getUsage(): string {
    return 'tsdoc-edge find-unused-docs [docs-directory]\n\n  Default: managed';
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

      const target = args[0];
      const dir = target || 'managed';
      const dirPath = path.resolve(process.cwd(), dir);

      if (!fs.existsSync(dirPath)) {
        this.printError(`Directory not found: ${dirPath}`);
        console.log();
        return this.failure(`Directory not found: ${dirPath}`);
      }

      this.printHeader('Finding Unused Documents');

      const detector = this.detector || new UnusedDocumentDetector();
      const results = detector.detect(dirPath);
      const summary = detector.getSummary(results);

      // Print summary
      this.printSection('Summary');
      console.log(`Total unused/stale documents: ${colors.cyan}${summary.total}${colors.reset}`);

      if (summary.total === 0) {
        this.printSuccess('No unused or stale documents found');
        console.log();
        return this.success();
      }

      console.log(`Average days since modified: ${colors.cyan}${summary.averageDaysSinceModified}${colors.reset}`);
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
        console.log(`${colors.dim}These documents are stale drafts with no references${colors.reset}`);
        console.log();
        for (const result of byAction.delete.slice(0, 10)) {
          console.log(`${colors.red}🗑${colors.reset}  ${result.filePath}`);
          console.log(`   ${colors.dim}${result.reason} (${result.daysSinceModified} days old)${colors.reset}`);
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
          console.log(`   ${colors.dim}${result.reason} (${result.daysSinceModified} days old)${colors.reset}`);
          console.log();
        }
        if (byAction.archive.length > 10) {
          console.log(`${colors.dim}... and ${byAction.archive.length - 10} more${colors.reset}`);
          console.log();
        }
      }

      return this.success();
    });
  }
}

/**
 * Command for showing specification version history
 *
 * @public
 * @responsibility Display version history from Git
 * @contract Reads Git history, shows versions with metadata
 *
 * @problem Need to track document evolution over time
 * @solves Shows all versions with commit info
 * @context Part of specification versioning system
 *
 * @functionality
 * - Git history: Read version history from Git
 * - Version display: Show version, date, author, commit
 * - Chronological order: Latest versions first
 * - Empty state: Handle files with no history
 * - Metadata: Commit message and author info
 *
 * @decision Use SpecVersionManager for version tracking
 * @rationale Integrates with Git for version history
 * @consequences Requires Git repository and file in version control
 *
 * @depends SpecVersionManager
 * @depType internal
 * @depReason Version history management
 */
export class SpecHistoryCommand extends BaseCommand {
  private manager?: SpecVersionManager;

  constructor(manager?: SpecVersionManager) {
    super();
    this.manager = manager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'spec-history';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show specification version history';
  }

  protected getUsage(): string {
    return 'tsdoc-edge spec-history <file-path>';
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

      const target = args[0];

      if (!target) {
        this.printError('Usage: tsdoc-edge spec-history <file>');
        console.log();
        return this.failure('File path required');
      }

      const filePath = path.resolve(process.cwd(), target);

      if (!fs.existsSync(filePath)) {
        this.printError(`File not found: ${filePath}`);
        console.log();
        return this.failure(`File not found: ${filePath}`);
      }

      const manager = this.manager || new SpecVersionManager();
      const history = manager.getHistory(filePath);

      if (history.length === 0) {
        console.log(`${colors.yellow}No version history found${colors.reset}`);
        console.log();
        return this.success();
      }

      this.printHeader('Specification Version History');
      console.log(`File: ${colors.cyan}${path.relative(process.cwd(), filePath)}${colors.reset}`);
      console.log();

      this.printSection(`${history.length} versions found`);

      for (const entry of history) {
        console.log(`${colors.green}v${entry.version}${colors.reset} (${entry.date})`);
        console.log(`  ${colors.dim}Commit:  ${entry.commit}${colors.reset}`);
        console.log(`  ${colors.dim}Author:  ${entry.author}${colors.reset}`);
        console.log(`  ${colors.dim}Message: ${entry.message}${colors.reset}`);
        console.log();
      }

      return this.success();
    });
  }
}

/**
 * Command for comparing specification versions
 *
 * @public
 * @responsibility Compare two versions of a specification
 * @contract Reads versions from Git, computes diff, displays changes
 *
 * @problem Need to understand changes between versions
 * @solves Shows added, removed, and modified sections
 * @context Part of specification versioning system
 *
 * @functionality
 * - Version retrieval: Get content from Git history
 * - Diff computation: Compare two versions
 * - Change categorization: Added, removed, modified sections
 * - Summary generation: High-level change description
 * - Detailed display: Show specific changes
 *
 * @decision Use SpecVersionManager for diff computation
 * @rationale Integrates with Git for version comparison
 * @consequences Requires valid version numbers in Git history
 *
 * @depends SpecVersionManager
 * @depType internal
 * @depReason Version comparison
 */
export class SpecDiffCommand extends BaseCommand {
  private manager?: SpecVersionManager;

  constructor(manager?: SpecVersionManager) {
    super();
    this.manager = manager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'spec-diff';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Compare specification versions';
  }

  protected getUsage(): string {
    return `tsdoc-edge spec-diff <file> <from-version> <to-version>

  Example: tsdoc-edge spec-diff managed/features/validation.md 1.0.0 2.0.0`;
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

      const target = args[0];
      const fromVersion = args[1];
      const toVersion = args[2];

      if (!target || !fromVersion || !toVersion) {
        this.printError('Usage: tsdoc-edge spec-diff <file> <from-version> <to-version>');
        this.printInfo('Example: tsdoc-edge spec-diff managed/features/validation.md 1.0.0 2.0.0');
        console.log();
        return this.failure('File and version numbers required');
      }

      const filePath = path.resolve(process.cwd(), target);

      if (!fs.existsSync(filePath)) {
        this.printError(`File not found: ${filePath}`);
        console.log();
        return this.failure(`File not found: ${filePath}`);
      }

      const manager = this.manager || new SpecVersionManager();

      const diff = manager.diff(filePath, fromVersion, toVersion);

      this.printHeader('Specification Version Comparison');
      console.log(`File: ${colors.cyan}${path.relative(process.cwd(), filePath)}${colors.reset}`);
      console.log(`From: ${colors.yellow}v${diff.from}${colors.reset}`);
      console.log(`To:   ${colors.green}v${diff.to}${colors.reset}`);
      console.log();

      this.printSection('Summary');
      console.log(diff.summary);
      console.log();

      if (diff.changes.added.length > 0) {
        this.printSection('Added Sections');
        for (const section of diff.changes.added) {
          console.log(`${colors.green}+ ${section}${colors.reset}`);
        }
        console.log();
      }

      if (diff.changes.removed.length > 0) {
        this.printSection('Removed Sections');
        for (const section of diff.changes.removed) {
          console.log(`${colors.red}- ${section}${colors.reset}`);
        }
        console.log();
      }

      if (diff.changes.modified.length > 0) {
        this.printSection('Modified Content');
        for (const section of diff.changes.modified) {
          console.log(`${colors.yellow}~ ${section}${colors.reset}`);
        }
        console.log();
      }

      return this.success();
    });
  }
}

/**
 * Command for bumping specification version
 *
 * @public
 * @responsibility Increment specification version number
 * @contract Validates bump type, updates frontmatter, shows changes
 *
 * @problem Need to increment version following semver
 * @solves Bumps version (major, minor, patch) automatically
 * @context Part of specification versioning system
 *
 * @functionality
 * - Bump type validation: major, minor, or patch
 * - Version parsing: Read current version from frontmatter
 * - Version increment: Follow semver rules
 * - Frontmatter update: Write new version to file
 * - Change display: Show old and new versions
 *
 * @decision Use SpecVersionManager for version bumping
 * @rationale Centralized semver logic
 * @consequences Requires valid semver format in frontmatter
 *
 * @depends SpecVersionManager
 * @depType internal
 * @depReason Version bumping logic
 */
export class SpecBumpCommand extends BaseCommand {
  private manager?: SpecVersionManager;

  constructor(manager?: SpecVersionManager) {
    super();
    this.manager = manager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'spec-bump';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Bump specification version';
  }

  protected getUsage(): string {
    return `tsdoc-edge spec-bump <file> <bump-type>

  Bump types: major, minor, patch
  Example: tsdoc-edge spec-bump managed/features/validation.md minor`;
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

      const target = args[0];
      const bumpType = args[1] as 'major' | 'minor' | 'patch' | undefined;

      if (!target) {
        this.printError('Usage: tsdoc-edge spec-bump <file> <bump-type>');
        this.printInfo('Bump types: major, minor, patch');
        this.printInfo('Example: tsdoc-edge spec-bump managed/features/validation.md minor');
        console.log();
        return this.failure('File and bump type required');
      }

      if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
        this.printError('Invalid bump type. Use: major, minor, or patch');
        console.log();
        return this.failure('Invalid bump type');
      }

      const filePath = path.resolve(process.cwd(), target);

      if (!fs.existsSync(filePath)) {
        this.printError(`File not found: ${filePath}`);
        console.log();
        return this.failure(`File not found: ${filePath}`);
      }

      const manager = this.manager || new SpecVersionManager();

      const oldVersion = manager.getCurrentVersion(filePath);
      const newVersion = manager.bump(filePath, bumpType);

      this.printHeader('Version Bumped');
      console.log(`File: ${colors.cyan}${path.relative(process.cwd(), filePath)}${colors.reset}`);
      console.log(`Old version: ${colors.yellow}${oldVersion}${colors.reset}`);
      console.log(`New version: ${colors.green}${newVersion}${colors.reset}`);
      console.log(`Bump type:   ${colors.blue}${bumpType}${colors.reset}`);
      console.log();
      this.printSuccess('Version updated successfully');
      console.log();

      return this.success();
    });
  }
}

/**
 * Command for finding document symbols
 *
 * @public
 * @responsibility Search for document symbol definitions and references
 * @contract Parses documents, searches registry, displays matches
 *
 * @problem Need to find where document symbols are defined/referenced
 * @solves Searches all documents for symbol definitions and usages
 * @context Part of document symbol system
 *
 * @functionality
 * - File scanning: Find all markdown files
 * - Symbol parsing: Extract [[Symbol]] definitions and references
 * - Registry search: Look up symbol in registry
 * - Match display: Show definitions and references
 * - Summary statistics: Total matches and locations
 *
 * @decision Use DocumentSymbolParser and Registry for search
 * @rationale Centralized symbol tracking
 * @consequences Requires documents directory to search
 *
 * @depends DocumentSymbolParser, DocumentSymbolRegistry
 * @depType internal
 * @depReason Symbol parsing and registry
 */
export class FindDocCommand extends BaseCommand {
  private parser?: DocumentSymbolParser;
  private registry?: DocumentSymbolRegistry;

  constructor(parser?: DocumentSymbolParser, registry?: DocumentSymbolRegistry) {
    super();
    this.parser = parser;
    this.registry = registry;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'find-doc';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find document symbol definitions and references';
  }

  protected getUsage(): string {
    return `tsdoc-edge find-doc <symbol-name>

  Example: tsdoc-edge find-doc FeatureName`;
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

      const symbolName = args[0];

      if (!symbolName) {
        this.printError('Usage: tsdoc-edge find-doc <symbol-name>');
        console.log();
        return this.failure('Symbol name required');
      }

      const docsDir = 'docs';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Directory not found: ${docsPath}`);
        console.log();
        return this.failure(`Directory not found: ${docsPath}`);
      }

      // Find and parse documents
      const markdownFiles = findMarkdownFiles(docsPath);
      const parser = this.parser || new DocumentSymbolParser();
      const registry = this.registry || new DocumentSymbolRegistry();

      for (const filePath of markdownFiles) {
        try {
          const parsed = parser.parse(filePath);
          if (parsed) {
            registry.registerDocument(parsed);
          }
        } catch (error) {
          // Silent error - continue parsing other files
        }
      }

      // Search for symbol
      this.printHeader(`Finding Document Symbol: ${symbolName}`);

      const definition = registry.getDefinition(symbolName);
      const references = registry.getReferences(symbolName);

      if (!definition && references.length === 0) {
        console.log(`${colors.yellow}No definitions or references found for "${symbolName}"${colors.reset}`);
        console.log();
        return this.success();
      }

      // Print definition
      if (definition) {
        this.printSection('Definition');
        console.log(`${colors.green}📄${colors.reset} ${definition.filePath}:${definition.line}`);
        if (definition.content) {
          console.log(`   ${colors.dim}${definition.content}${colors.reset}`);
        }
        console.log();
      }

      // Print references
      if (references.length > 0) {
        this.printSection(`References (${references.length})`);
        for (const ref of references) {
          console.log(`${colors.cyan}🔗${colors.reset} ${ref.filePath}:${ref.line}`);
          if (ref.content) {
            console.log(`   ${colors.dim}${ref.content.substring(0, 80)}...${colors.reset}`);
          }
          console.log();
        }
      }

      console.log(`Total: ${colors.bold}${(definition ? 1 : 0) + references.length}${colors.reset} matches`);
      console.log();

      return this.success();
    });
  }
}
