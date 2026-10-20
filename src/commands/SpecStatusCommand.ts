/**
 * Spec Status Command - Manage specification status
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SpecStatusManager } from '../spec/SpecStatusManager';
import type { SpecStatus } from '../types/spec';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

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
 * Command for managing specification status
 *
 * @public
 * @responsibility Manage document status lifecycle
 * @contract Validates and applies status transitions
 * @doc [[SpecStatusCommand]]
 * @doc [[CLI Commands#spec-status]]
 *
 * @problem Documents need lifecycle management (draft → review → approved → active)
 * @solves Enforces valid status transitions with validation checks
 * @context Part of specification quality control
 *
 * @functionality
 * - show: Display current status and allowed transitions
 * - promote: Change status with validation
 * - list-ready: Find documents ready for promotion
 * - stats: Show status distribution
 *
 * @decision Use SpecStatusManager for validation logic
 * @rationale Centralized status transition rules
 * @consequences Requires frontmatter in documents
 *
 * @depends SpecStatusManager
 * @depType internal
 * @depReason Status transition logic
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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge spec-status <subcommand> <file> [status] [options]

  Subcommands:
    show <file>            Show current status
    promote <file> <status> Promote to new status
    list-ready [dir]       List documents ready for promotion
    stats [dir]            Show status distribution

  Options:
    --human                Output in human-readable format (default: XML)`;
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
      const positional = args.filter((arg) => arg !== '--human');
      const subcommand = positional[0];
      const target = positional[1];

      if (!subcommand) {
        this.printError('Usage:');
        this.printInfo(
          '  tsdoc-edge spec-status show <file>           - Show current status and allowed transitions'
        );
        this.printInfo(
          '  tsdoc-edge spec-status promote <file> <status> - Promote document to new status'
        );
        this.printInfo(
          '  tsdoc-edge spec-status list-ready [dir]      - List documents ready for promotion'
        );
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

        if (isHuman) {
          this.printHeader('Specification Status');
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        let currentStatus: string = 'draft';
        if (frontmatterMatch) {
          const statusMatch = frontmatterMatch[1].match(/status:\s*["']?(\w+)["']?/);
          currentStatus = statusMatch ? statusMatch[1] : 'draft';
        }

        const allowed = manager.getAllowedTransitions(filePath);

        if (isHuman) {
          console.log(`File: ${colors.cyan}${filePath}${colors.reset}`);
          console.log(`Current status: ${colors.bold}${currentStatus}${colors.reset}`);
          console.log();

          console.log(`${colors.bold}Allowed transitions:${colors.reset}`);
          if (allowed.length === 0) {
            console.log(`  ${colors.dim}(none - terminal status)${colors.reset}`);
          } else {
            for (const status of allowed) {
              const validation = manager.validateTransition(filePath, status);
              const icon = validation.valid ? `${colors.green}✅` : `${colors.yellow}⚠️`;
              console.log(`  ${icon} ${status}${colors.reset}`);

              if (!validation.valid) {
                for (const check of validation.checks.filter((c) => !c.passed)) {
                  console.log(`     ${colors.dim}${check.message}${colors.reset}`);
                }
              }
            }
          }
          console.log();
        } else {
          const transitions = allowed.map((status) => {
            const validation = manager.validateTransition(filePath, status);
            const failedChecks = validation.checks
              .filter((c) => !c.passed)
              .map((c) => ({ name: c.name, message: c.message }));
            return {
              status,
              valid: validation.valid,
              ...(failedChecks.length > 0 ? { failedChecks } : {}),
            };
          });

          this.printOutput(
            'spec-status-show',
            {
              summary: {
                file: path.relative(process.cwd(), filePath),
                currentStatus,
                allowedTransitionCount: transitions.length,
              },
              allowedTransitions: transitions,
            },
            args
          );
        }
        return this.success();
      }

      // promote: Promote to new status
      else if (subcommand === 'promote') {
        const newStatus = positional[2];

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

        if (isHuman) {
          this.printHeader('Promoting Specification');

          console.log(`File: ${colors.cyan}${filePath}${colors.reset}`);
          console.log(`Target status: ${colors.bold}${newStatus}${colors.reset}`);
          console.log();
        }

        const validation = manager.validateTransition(filePath, newStatus as SpecStatus);

        if (isHuman) {
          this.printSection('Validation Checks');
          for (const check of validation.checks) {
            const icon = check.passed ? `${colors.green}✅` : `${colors.red}❌`;
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
          manager.applyTransition(filePath, newStatus as SpecStatus);
          this.printSuccess(`Successfully promoted to "${newStatus}"`);
          console.log();
          return this.success();
        }

        // XML: the validation checks are part of the report, so a failed validation still
        // prints the document (promoted=false) and exits non-zero.
        if (validation.valid) {
          manager.applyTransition(filePath, newStatus as SpecStatus);
        }

        this.printOutput(
          'spec-status-promote',
          {
            summary: {
              file: path.relative(process.cwd(), filePath),
              currentStatus: validation.from,
              targetStatus: newStatus,
              valid: validation.valid,
              promoted: validation.valid,
            },
            checks: validation.checks.map((c) => ({
              name: c.name,
              passed: c.passed,
              message: c.message,
            })),
          },
          args
        );
        return validation.valid ? this.success() : this.failure('Validation failed');
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

        if (isHuman) {
          this.printHeader('Documents Ready for Promotion');
        }

        const markdownFiles = findMarkdownFiles(dirPath);
        const promotable = manager.getPromotableDocs(markdownFiles);

        const ready = promotable.filter((p) => p.canPromote);
        const notReady = promotable.filter((p) => !p.canPromote);

        if (isHuman) {
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
        } else {
          const toItem = (doc: (typeof promotable)[number]) => ({
            file: path.relative(process.cwd(), doc.filePath),
            currentStatus: doc.currentStatus,
            targetStatus: doc.targetStatus,
            reason: doc.reason,
          });

          this.printOutput(
            'spec-status-ready',
            {
              summary: {
                directory: path.relative(process.cwd(), dirPath) || '.',
                readyCount: ready.length,
                notReadyCount: notReady.length,
              },
              ready: ready.map(toItem),
              notReady: notReady.map(toItem),
            },
            args
          );
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

        if (isHuman) {
          this.printHeader('Specification Status Distribution');
        }

        const markdownFiles = findMarkdownFiles(dirPath);
        const distribution = manager.getStatusDistribution(markdownFiles);
        const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

        if (isHuman) {
          this.printSection('Status Distribution');

          console.log(`Total documents: ${colors.cyan}${total}${colors.reset}`);
          console.log();

          for (const [status, count] of Object.entries(distribution)) {
            if (count > 0) {
              const percentage = ((count / total) * 100).toFixed(1);
              console.log(`  ${colors.bold}${status}${colors.reset}: ${count} (${percentage}%)`);
            }
          }
          console.log();
        } else {
          this.printOutput(
            'spec-status-stats',
            {
              summary: {
                directory: path.relative(process.cwd(), dirPath) || '.',
                total,
              },
              distribution: Object.entries(distribution).map(([status, count]) => ({
                status,
                count,
                percent: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
              })),
            },
            args
          );
        }
        return this.success();
      } else {
        this.printError(`Unknown subcommand: ${subcommand}`);
        this.printInfo('Valid subcommands: show, promote, list-ready, stats');
        console.log();
        return this.failure(`Unknown subcommand: ${subcommand}`);
      }
    });
  }
}
