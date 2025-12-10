/**
 * Relationship Validation Command
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager, type UnifiedRelationshipRow } from '../storage/DatabaseManager';

interface ValidationIssue {
  type: 'orphan' | 'duplicate' | 'low-confidence' | 'inconsistent';
  severity: 'error' | 'warning' | 'info';
  message: string;
  relationshipId?: string;
  symbolId?: string;
}

/**
 * Command for validating relationship data integrity
 * @public
 */
export class RelationshipValidateCommand extends BaseCommand {
  getName(): string {
    return 'relationship-validate';
  }

  getDescription(): string {
    return 'Validate relationship data integrity and consistency';
  }

  protected getUsage(): string {
    return `tsdoc-edge relationship-validate [options]

Validates the integrity of relationship data in the database.

Options:
  --fix                 Attempt to fix issues automatically
  --min-confidence <n>  Flag relationships below this confidence (default: 0.5)
  --verbose             Show all issues, not just summary

Checks performed:
  • Orphaned relationships (references to non-existent symbols)
  • Duplicate relationships
  • Low confidence relationships
  • Inconsistent bidirectional relationships

Examples:
  tsdoc-edge relationship-validate
  tsdoc-edge relationship-validate --verbose
  tsdoc-edge relationship-validate --fix
  tsdoc-edge relationship-validate --min-confidence 0.7`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const options = {
        fix: args.includes('--fix'),
        verbose: args.includes('--verbose'),
        minConfidence: Number.parseFloat(this.getOption(args, '--min-confidence') || '0.5'),
      };

      this.printHeader('Relationship Validation');

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      console.log();
      this.printInfo('Running validation checks...');
      console.log();

      const issues: ValidationIssue[] = [];

      // Check 1: Orphaned relationships
      this.printSection('1. Checking for Orphaned Relationships');
      const orphanIssues = this.checkOrphanedRelationships(dbManager);
      issues.push(...orphanIssues);

      if (orphanIssues.length === 0) {
        this.printSuccess('No orphaned relationships found');
      } else {
        this.printWarning(`Found ${orphanIssues.length} orphaned relationships`);
        if (options.verbose) {
          for (const issue of orphanIssues.slice(0, 10)) {
            console.log(`  ${this.colors.yellow}⚠${this.colors.reset} ${issue.message}`);
          }
          if (orphanIssues.length > 10) {
            console.log(`  ${this.colors.dim}... and ${orphanIssues.length - 10} more${this.colors.reset}`);
          }
        }
      }
      console.log();

      // Check 2: Duplicate relationships
      this.printSection('2. Checking for Duplicate Relationships');
      const duplicateIssues = this.checkDuplicateRelationships(dbManager);
      issues.push(...duplicateIssues);

      if (duplicateIssues.length === 0) {
        this.printSuccess('No duplicate relationships found');
      } else {
        this.printWarning(`Found ${duplicateIssues.length} duplicate relationships`);
        if (options.verbose) {
          for (const issue of duplicateIssues.slice(0, 10)) {
            console.log(`  ${this.colors.yellow}⚠${this.colors.reset} ${issue.message}`);
          }
          if (duplicateIssues.length > 10) {
            console.log(`  ${this.colors.dim}... and ${duplicateIssues.length - 10} more${this.colors.reset}`);
          }
        }
      }
      console.log();

      // Check 3: Low confidence relationships
      this.printSection('3. Checking Confidence Levels');
      const confidenceIssues = this.checkLowConfidence(dbManager, options.minConfidence);
      issues.push(...confidenceIssues);

      if (confidenceIssues.length === 0) {
        this.printSuccess(`All relationships meet confidence threshold (${options.minConfidence})`);
      } else {
        this.printInfo(`Found ${confidenceIssues.length} relationships below confidence threshold`);
        if (options.verbose) {
          for (const issue of confidenceIssues.slice(0, 10)) {
            console.log(`  ${this.colors.blue}ℹ${this.colors.reset} ${issue.message}`);
          }
          if (confidenceIssues.length > 10) {
            console.log(`  ${this.colors.dim}... and ${confidenceIssues.length - 10} more${this.colors.reset}`);
          }
        }
      }
      console.log();

      // Check 4: Consistency checks
      this.printSection('4. Checking Bidirectional Consistency');
      const consistencyIssues = this.checkBidirectionalConsistency(dbManager);
      issues.push(...consistencyIssues);

      if (consistencyIssues.length === 0) {
        this.printSuccess('All bidirectional relationships are consistent');
      } else {
        this.printWarning(`Found ${consistencyIssues.length} inconsistent bidirectional relationships`);
        if (options.verbose) {
          for (const issue of consistencyIssues.slice(0, 10)) {
            console.log(`  ${this.colors.yellow}⚠${this.colors.reset} ${issue.message}`);
          }
          if (consistencyIssues.length > 10) {
            console.log(`  ${this.colors.dim}... and ${consistencyIssues.length - 10} more${this.colors.reset}`);
          }
        }
      }
      console.log();

      // Summary
      console.log();
      this.printSection('Validation Summary');

      const errors = issues.filter((i) => i.severity === 'error').length;
      const warnings = issues.filter((i) => i.severity === 'warning').length;
      const infos = issues.filter((i) => i.severity === 'info').length;

      console.log(`  Total issues: ${this.colors.cyan}${issues.length}${this.colors.reset}`);
      if (errors > 0) {
        console.log(`  ${this.colors.red}✗ Errors: ${errors}${this.colors.reset}`);
      }
      if (warnings > 0) {
        console.log(`  ${this.colors.yellow}⚠ Warnings: ${warnings}${this.colors.reset}`);
      }
      if (infos > 0) {
        console.log(`  ${this.colors.blue}ℹ Info: ${infos}${this.colors.reset}`);
      }
      console.log();

      // Fix issues if requested
      if (options.fix && issues.length > 0) {
        console.log();
        this.printInfo('Attempting to fix issues...');
        const fixed = this.fixIssues(dbManager, issues);
        console.log();
        this.printSuccess(`Fixed ${fixed} issue(s)`);
        console.log();
      } else if (issues.length > 0) {
        console.log(`  ${this.colors.dim}Run with --fix to attempt automatic fixes${this.colors.reset}`);
        console.log();
      }

      dbManager.close();

      const exitCode = errors > 0 ? 1 : 0;
      return {
        success: exitCode === 0,
        message: `Validation complete: ${issues.length} issue(s) found`,
        exitCode,
      };
    });
  }

  /**
   * Check for relationships referencing non-existent symbols
   */
  private checkOrphanedRelationships(dbManager: DatabaseManager): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      const relationships = dbManager.db
        .prepare('SELECT id, from_symbols, to_symbols FROM unified_relationships')
        .all() as Array<{ id: string; from_symbols: string; to_symbols: string }>;

      for (const rel of relationships) {
        const fromSymbols = JSON.parse(rel.from_symbols);
        const toSymbols = JSON.parse(rel.to_symbols);

        // Check each symbol exists
        for (const symbolId of [...fromSymbols, ...toSymbols]) {
          const exists = dbManager.db
            .prepare('SELECT id FROM symbols WHERE id = ?')
            .get(symbolId);

          if (!exists) {
            issues.push({
              type: 'orphan',
              severity: 'error',
              message: `Relationship ${rel.id} references non-existent symbol: ${symbolId}`,
              relationshipId: rel.id,
              symbolId,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Error checking orphaned relationships:', error);
    }

    return issues;
  }

  /**
   * Check for duplicate relationships
   */
  private checkDuplicateRelationships(dbManager: DatabaseManager): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      const duplicates = dbManager.db
        .prepare(
          `
        SELECT
          type,
          from_symbols,
          to_symbols,
          COUNT(*) as count
        FROM unified_relationships
        GROUP BY type, from_symbols, to_symbols
        HAVING count > 1
      `
        )
        .all() as Array<{ type: string; from_symbols: string; to_symbols: string; count: number }>;

      for (const dup of duplicates) {
        issues.push({
          type: 'duplicate',
          severity: 'warning',
          message: `Duplicate relationship: ${dup.type} (${dup.from_symbols} -> ${dup.to_symbols}) appears ${dup.count} times`,
        });
      }
    } catch (error) {
      console.warn('Error checking duplicates:', error);
    }

    return issues;
  }

  /**
   * Check for low confidence relationships
   */
  private checkLowConfidence(dbManager: DatabaseManager, threshold: number): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      const lowConfidence = dbManager.db
        .prepare(
          `
        SELECT id, type, confidence
        FROM unified_relationships
        WHERE confidence < ?
        ORDER BY confidence ASC
      `
        )
        .all(threshold) as Array<{ id: string; type: string; confidence: number }>;

      for (const rel of lowConfidence) {
        issues.push({
          type: 'low-confidence',
          severity: 'info',
          message: `Low confidence (${rel.confidence.toFixed(2)}): ${rel.type} [${rel.id}]`,
          relationshipId: rel.id,
        });
      }
    } catch (error) {
      console.warn('Error checking confidence:', error);
    }

    return issues;
  }

  /**
   * Check bidirectional relationship consistency
   */
  private checkBidirectionalConsistency(dbManager: DatabaseManager): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      // Find bidirectional relationships
      const bidirectional = dbManager.db
        .prepare(
          `
        SELECT id, type, from_symbols, to_symbols
        FROM unified_relationships
        WHERE direction = 'bidirectional'
      `
        )
        .all() as Array<{ id: string; type: string; from_symbols: string; to_symbols: string }>;

      for (const rel of bidirectional) {
        const fromSymbols = JSON.parse(rel.from_symbols);
        const toSymbols = JSON.parse(rel.to_symbols);

        // Check if reverse relationship exists
        const reverse = dbManager.db
          .prepare(
            `
          SELECT id
          FROM unified_relationships
          WHERE type = ?
            AND from_symbols = ?
            AND to_symbols = ?
        `
          )
          .get(rel.type, rel.to_symbols, rel.from_symbols);

        if (!reverse) {
          issues.push({
            type: 'inconsistent',
            severity: 'warning',
            message: `Bidirectional relationship ${rel.id} missing reverse: ${toSymbols.join(',')} → ${fromSymbols.join(',')}`,
            relationshipId: rel.id,
          });
        }
      }
    } catch (error) {
      console.warn('Error checking bidirectional consistency:', error);
    }

    return issues;
  }

  /**
   * Attempt to fix issues automatically
   */
  private fixIssues(dbManager: DatabaseManager, issues: ValidationIssue[]): number {
    let fixed = 0;

    // Fix orphaned relationships by deleting them
    const orphanedIds = issues
      .filter((i) => i.type === 'orphan' && i.relationshipId)
      .map((i) => i.relationshipId);

    if (orphanedIds.length > 0) {
      try {
        const uniqueIds = [...new Set(orphanedIds)];
        for (const id of uniqueIds) {
          dbManager.db.prepare('DELETE FROM unified_relationships WHERE id = ?').run(id);
          fixed++;
        }
        console.log(`  ${this.colors.green}✓${this.colors.reset} Removed ${fixed} orphaned relationships`);
      } catch (error) {
        console.warn('  Failed to remove orphaned relationships:', error);
      }
    }

    // Fix duplicates by keeping only one
    const duplicateGroups = issues.filter((i) => i.type === 'duplicate');
    if (duplicateGroups.length > 0) {
      console.log(`  ${this.colors.yellow}⚠${this.colors.reset} Duplicate removal requires manual intervention`);
    }

    return fixed;
  }

  private getOption(args: string[], flag: string): string | undefined {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
    return undefined;
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
