/**
 * Relationship Validation Command
 * @packageDocumentation
 */

import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';

/** A relationship validation issue */
interface ValidationIssue {
  type: 'orphan' | 'duplicate' | 'low-confidence' | 'inconsistent';
  severity: 'error' | 'warning' | 'info';
  message: string;
  relationshipId?: string;
  symbolId?: string;
}

/**
 * Command for validating relationship data integrity
 * @doc [[RelationshipValidateCommand]]
 * @public
 */
export class RelationshipValidateCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-validate';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Validate relationship data integrity and consistency';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
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
  • Malformed bidirectional relationship endpoints

Examples:
  tsdoc-edge relationship-validate
  tsdoc-edge relationship-validate --verbose
  tsdoc-edge relationship-validate --fix
  tsdoc-edge relationship-validate --min-confidence 0.7`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
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
            console.log(
              `  ${this.colors.dim}... and ${orphanIssues.length - 10} more${this.colors.reset}`
            );
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
            console.log(
              `  ${this.colors.dim}... and ${duplicateIssues.length - 10} more${this.colors.reset}`
            );
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
            console.log(
              `  ${this.colors.dim}... and ${confidenceIssues.length - 10} more${this.colors.reset}`
            );
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
        this.printWarning(
          `Found ${consistencyIssues.length} inconsistent bidirectional relationships`
        );
        if (options.verbose) {
          for (const issue of consistencyIssues.slice(0, 10)) {
            console.log(`  ${this.colors.yellow}⚠${this.colors.reset} ${issue.message}`);
          }
          if (consistencyIssues.length > 10) {
            console.log(
              `  ${this.colors.dim}... and ${consistencyIssues.length - 10} more${this.colors.reset}`
            );
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
        console.log(
          `  ${this.colors.dim}Run with --fix to attempt automatic fixes${this.colors.reset}`
        );
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
   * Uses batch lookup to minimize database queries
   */
  private checkOrphanedRelationships(dbManager: DatabaseManager): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      const relationships = dbManager.getAllRelationshipsForValidation();

      // Collect materialized code-symbol endpoints and track which relationship uses which.
      // Some relationship kinds intentionally carry document, test-case, or file identifiers.
      const symbolToRelationships = new Map<string, string[]>();
      for (const rel of relationships) {
        const fromSymbols = JSON.parse(rel.fromSymbols) as string[];
        const toSymbols = JSON.parse(rel.toSymbols) as string[];

        for (const symbolId of this.materializedSymbolEndpoints(rel.type, fromSymbols, toSymbols)) {
          if (!symbolToRelationships.has(symbolId)) {
            symbolToRelationships.set(symbolId, []);
          }
          symbolToRelationships.get(symbolId)?.push(rel.id);
        }
      }

      // Batch lookup all symbols at once
      const uniqueSymbolIds = Array.from(symbolToRelationships.keys());
      const existingSymbols = new Set(dbManager.getSymbolsByIds(uniqueSymbolIds).map((s) => s.id));

      // Find missing symbols
      for (const [symbolId, relIds] of symbolToRelationships) {
        if (!existingSymbols.has(symbolId)) {
          for (const relId of relIds) {
            issues.push({
              type: 'orphan',
              severity: 'error',
              message: `Relationship ${relId} references non-existent symbol: ${symbolId}`,
              relationshipId: relId,
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
   * Return only endpoints that are materialized in the code-symbol table.
   *
   * Document references use `doc:` identifiers, test examples use virtual test-case IDs,
   * and re-exports use a source file path. Those endpoint namespaces are valid but cannot
   * be resolved through `symbols.id`.
   */
  private materializedSymbolEndpoints(
    relationshipType: string,
    fromSymbols: readonly string[],
    toSymbols: readonly string[]
  ): readonly string[] {
    switch (relationshipType) {
      case 'doc-reference':
        return fromSymbols;
      case 'test-as-example':
      case 're-export':
        return toSymbols;
      default:
        return [...fromSymbols, ...toSymbols];
    }
  }

  /**
   * Check for duplicate relationships
   */
  private checkDuplicateRelationships(dbManager: DatabaseManager): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      const duplicates = dbManager.findDuplicateRelationships();

      for (const dup of duplicates) {
        issues.push({
          type: 'duplicate',
          severity: 'warning',
          message: `Duplicate relationship: ${dup.type} (${dup.fromSymbols} -> ${dup.toSymbols}) appears ${dup.count} times`,
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
      const lowConfidence = dbManager.getLowConfidenceRelationships(threshold);

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
   * Check that a bidirectional relationship represents both endpoint sets.
   *
   * A single `bidirectional` record is canonical; requiring a duplicate reverse row would
   * falsely report every correctly materialized bidirectional relationship as inconsistent.
   */
  private checkBidirectionalConsistency(dbManager: DatabaseManager): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      // A bidirectional direction encodes the reverse relation in the same record.
      const bidirectional = dbManager.getBidirectionalRelationships();

      for (const rel of bidirectional) {
        const fromSymbols = JSON.parse(rel.fromSymbols) as string[];
        const toSymbols = JSON.parse(rel.toSymbols) as string[];

        if (fromSymbols.length === 0 || toSymbols.length === 0) {
          issues.push({
            type: 'inconsistent',
            severity: 'warning',
            message: `Bidirectional relationship ${rel.id} must include endpoints on both sides`,
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
        const uniqueIds = [...new Set(orphanedIds)].filter((id): id is string => id !== undefined);
        for (const id of uniqueIds) {
          if (dbManager.deleteRelationship(id)) {
            fixed++;
          }
        }
        console.log(
          `  ${this.colors.green}✓${this.colors.reset} Removed ${fixed} orphaned relationships`
        );
      } catch (error) {
        console.warn('  Failed to remove orphaned relationships:', error);
      }
    }

    // Fix duplicates by keeping only one
    const duplicateGroups = issues.filter((i) => i.type === 'duplicate');
    if (duplicateGroups.length > 0) {
      console.log(
        `  ${this.colors.yellow}⚠${this.colors.reset} Duplicate removal requires manual intervention`
      );
    }

    return fixed;
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
