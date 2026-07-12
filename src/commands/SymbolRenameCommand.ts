/**
 * Symbol Rename Command - Rename symbol and update all references
 *
 * @packageDocumentation
 * @responsibility Rename documentation symbols and update all references
 * @contract Safely rename symbols while maintaining SSOT and reference integrity
 *
 * @problem Renaming symbols manually breaks references across documentation
 * @solves Automatically updates all [[Symbol]] references when renaming
 * @context TSDoc Edge SSOT documentation system
 */

import * as readline from 'node:readline';
import { type SymbolReference, SymbolReferenceUpdater } from '../utilities/SymbolReferenceUpdater';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Symbol rename validation result
 */
interface RenameValidation {
  /** Old symbol name */
  oldSymbol: string;
  /** New symbol name */
  newSymbol: string;
  /** H1 primary definitions found */
  h1Count: number;
  /** H2 auxiliary definitions found */
  h2Count: number;
  /** Total references found */
  totalRefs: number;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Symbol Rename Command
 *
 * Renames a documentation symbol and updates all references to it
 *
 * @doc [[SymbolRenameCommand]]
 * @public
 * @responsibility Rename symbols safely with reference updates
 * @contract Find all references, update them, maintain SSOT principle
 *
 * @example
 * ```bash
 * # Rename symbol
 * tsdoc-edge symbol-rename "Old Symbol" "New Symbol"
 *
 * # Dry run (preview only)
 * tsdoc-edge symbol-rename "Old Symbol" "New Symbol" --dry-run
 *
 * # Auto-confirm
 * tsdoc-edge symbol-rename "Old Symbol" "New Symbol" --yes
 * ```
 */
export class SymbolRenameCommand extends BaseCommand {
  private updater: SymbolReferenceUpdater;

  constructor() {
    super();
    this.updater = new SymbolReferenceUpdater();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'symbol-rename';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Rename symbol and update all references';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge symbol-rename <old-symbol> <new-symbol> [options]

  Arguments:
    old-symbol  Current symbol name (without [[ ]])
    new-symbol  New symbol name (without [[ ]])

  Options:
    --dry-run   Preview changes without applying
    --yes, -y   Auto-confirm all changes
    --base-dir=DIR  Base directory (default: managed)

  Examples:
    tsdoc-edge symbol-rename "Old Symbol" "New Symbol"
    tsdoc-edge symbol-rename "Feature A" "Feature B" --dry-run
    tsdoc-edge symbol-rename "OldName" "NewName" --yes`;
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

      // Parse arguments
      const nonFlagArgs = args.filter((arg) => !arg.startsWith('--') && !arg.startsWith('-'));
      if (nonFlagArgs.length < 2) {
        throw new Error('Missing required arguments: old-symbol and new-symbol');
      }

      const oldSymbol = nonFlagArgs[0];
      const newSymbol = nonFlagArgs[1];
      const dryRun = args.includes('--dry-run');
      const autoConfirm = args.includes('--yes') || args.includes('-y');
      const baseDirArg = args.find((arg) => arg.startsWith('--base-dir='));
      const baseDir = baseDirArg ? baseDirArg.split('=')[1] : 'managed';

      this.printHeader('Rename Symbol');

      if (dryRun) {
        this.printInfo('Running in dry-run mode (no changes will be made)');
        console.log();
      }

      // Step 1: Validate
      this.printInfo('Step 1: Validating symbol rename...');
      const validation = await this.validate(oldSymbol, newSymbol, baseDir);

      if (validation.errors.length > 0) {
        console.log();
        this.printError('Validation failed:');
        for (const error of validation.errors) {
          console.log(`  ${colors.red}✗${colors.reset} ${error}`);
        }
        return this.failure('Validation failed');
      }

      if (validation.warnings.length > 0) {
        console.log();
        this.printWarning('Warnings:');
        for (const warning of validation.warnings) {
          console.log(`  ${colors.yellow}⚠${colors.reset} ${warning}`);
        }
        console.log();
      }

      console.log();
      this.printSuccess('Validation passed');
      console.log(`  Old Symbol: ${colors.cyan}[[${validation.oldSymbol}]]${colors.reset}`);
      console.log(`  New Symbol: ${colors.cyan}[[${validation.newSymbol}]]${colors.reset}`);
      console.log(`  H1 Primary Definitions: ${colors.green}${validation.h1Count}${colors.reset}`);
      console.log(`  H2 Auxiliary Definitions: ${validation.h2Count}`);
      console.log(`  Total References: ${validation.totalRefs}`);

      // Step 2: Find references
      console.log();
      this.printInfo('Step 2: Finding all references...');
      const references = await this.updater.findReferences(
        validation.oldSymbol,
        baseDir,
        validation.newSymbol
      );

      console.log();
      this.printSuccess(
        `Found ${references.length} references in ${new Set(references.map((r) => r.file)).size} files`
      );

      // Count by type
      const h1Refs = references.filter((r) => r.type === 'h1-primary');
      const h2Refs = references.filter((r) => r.type === 'h2-auxiliary');
      const h3Refs = references.filter((r) => r.type === 'h3-sub-auxiliary');
      const inlineRefs = references.filter((r) => r.type === 'inline');

      console.log(`  H1 Primary: ${h1Refs.length}`);
      console.log(`  H2 Auxiliary: ${h2Refs.length}`);
      console.log(`  H3 Sub-auxiliary: ${h3Refs.length}`);
      console.log(`  Inline: ${inlineRefs.length}`);

      // Step 3: Preview changes
      if (references.length > 0) {
        console.log();
        this.printInfo('Step 3: Preview of changes');
        console.log();
        this.previewChanges(validation, references, baseDir);
      }

      // Step 4: Confirm
      if (!dryRun && !autoConfirm) {
        console.log();
        const confirmed = await this.confirm('Proceed with symbol rename?');
        if (!confirmed) {
          this.printWarning('Operation cancelled');
          return this.failure('Operation cancelled by user');
        }
      }

      if (dryRun) {
        console.log();
        this.printInfo('Dry-run complete (no changes made)');
        return this.success();
      }

      // Step 5: Apply changes
      console.log();
      this.printInfo('Step 4: Applying changes...');

      const updateResult = await this.updater.updateReferences(
        validation.oldSymbol,
        validation.newSymbol,
        {
          baseDir,
          dryRun: false,
          updateH1: true,
          updateH2: true,
          updateH3: true,
          updateInline: true,
        }
      );

      console.log(
        `  ${colors.green}✓${colors.reset} Updated ${updateResult.updated} references in ${updateResult.filesModified.length} files`
      );
      console.log(`    - H1 Primary: ${updateResult.h1Count}`);
      console.log(`    - H2 Auxiliary: ${updateResult.h2Count}`);
      console.log(`    - H3 Sub-auxiliary: ${updateResult.h3Count}`);
      console.log(`    - Inline: ${updateResult.inlineCount}`);

      if (updateResult.errors.length > 0) {
        console.log();
        this.printWarning('Some errors occurred:');
        for (const error of updateResult.errors) {
          console.log(`  ${colors.yellow}⚠${colors.reset} ${error.file}: ${error.error}`);
        }
      }

      // Step 6: Success
      console.log();
      this.printSuccess('Symbol rename complete!');
      console.log();
      console.log(`Next steps:`);
      console.log(
        `  1. Run ${colors.cyan}tsdoc-edge update-backlinks ${baseDir}${colors.reset} to regenerate backlinks`
      );
      console.log(
        `  2. Run ${colors.cyan}tsdoc-edge validate-symbol-refs ${baseDir}${colors.reset} to verify integrity`
      );

      return this.success();
    });
  }

  /**
   * Validate symbol rename operation
   */
  private async validate(
    oldSymbol: string,
    newSymbol: string,
    baseDir: string
  ): Promise<RenameValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check symbol names are not empty
    if (!oldSymbol || oldSymbol.trim() === '') {
      errors.push('Old symbol name cannot be empty');
    }

    if (!newSymbol || newSymbol.trim() === '') {
      errors.push('New symbol name cannot be empty');
    }

    // Check if symbols are identical
    if (oldSymbol === newSymbol) {
      errors.push('Old and new symbol names are identical');
    }

    // Find all references to old symbol
    const references = await this.updater.findReferences(oldSymbol, baseDir);

    const h1Count = references.filter((r) => r.type === 'h1-primary').length;
    const h2Count = references.filter((r) => r.type === 'h2-auxiliary').length;

    // Check SSOT principle: exactly 1 H1 definition
    if (h1Count === 0) {
      errors.push(`Symbol "[[${oldSymbol}]]" has no H1 primary definition - cannot rename`);
    } else if (h1Count > 1) {
      errors.push(
        `Symbol "[[${oldSymbol}]]" has ${h1Count} H1 primary definitions - SSOT violation`
      );
    }

    // Check if new symbol already exists
    const newSymbolRefs = await this.updater.findReferences(newSymbol, baseDir);
    const newH1Count = newSymbolRefs.filter((r) => r.type === 'h1-primary').length;

    if (newH1Count > 0) {
      errors.push(`Symbol "[[${newSymbol}]]" already exists with ${newH1Count} H1 definition(s)`);
    }

    // Warn if no references found
    if (references.length === 0) {
      warnings.push('No references found to old symbol');
    }

    return {
      oldSymbol,
      newSymbol,
      h1Count,
      h2Count,
      totalRefs: references.length,
      errors,
      warnings,
    };
  }

  /**
   * Preview changes
   */
  private previewChanges(
    validation: RenameValidation,
    references: SymbolReference[],
    baseDir: string
  ): void {
    // Group by file
    const refsByFile = new Map<string, SymbolReference[]>();
    for (const ref of references) {
      if (!refsByFile.has(ref.file)) {
        refsByFile.set(ref.file, []);
      }
      refsByFile.get(ref.file)?.push(ref);
    }

    // Show symbol change
    console.log(`${colors.bold}Symbol rename:${colors.reset}`);
    console.log(`  ${colors.red}- [[${validation.oldSymbol}]]${colors.reset}`);
    console.log(`  ${colors.green}+ [[${validation.newSymbol}]]${colors.reset}`);
    console.log();

    // Show reference updates (limited to 10 files)
    console.log(`${colors.bold}References to update (${refsByFile.size} files):${colors.reset}`);

    let fileCount = 0;
    for (const [file, fileRefs] of refsByFile) {
      if (fileCount >= 10) {
        console.log(`  ${colors.dim}... and ${refsByFile.size - 10} more files${colors.reset}`);
        break;
      }

      const relativeFile = file.replace(`${baseDir}/`, '');
      console.log();
      console.log(`  ${fileCount + 1}. ${colors.cyan}${relativeFile}${colors.reset}`);

      // Group by type
      const h1 = fileRefs.filter((r) => r.type === 'h1-primary');
      const h2 = fileRefs.filter((r) => r.type === 'h2-auxiliary');
      const h3 = fileRefs.filter((r) => r.type === 'h3-sub-auxiliary');
      const inline = fileRefs.filter((r) => r.type === 'inline');

      if (h1.length > 0) {
        console.log(`     ${colors.green}H1 Primary:${colors.reset} ${h1.length} reference(s)`);
        for (const ref of h1.slice(0, 2)) {
          console.log(
            `       Line ${ref.line}: ${colors.red}${ref.oldText}${colors.reset} → ${colors.green}${ref.newText}${colors.reset}`
          );
        }
      }

      if (h2.length > 0) {
        console.log(`     ${colors.blue}H2 Auxiliary:${colors.reset} ${h2.length} reference(s)`);
      }

      if (h3.length > 0) {
        console.log(
          `     ${colors.blue}H3 Sub-auxiliary:${colors.reset} ${h3.length} reference(s)`
        );
      }

      if (inline.length > 0) {
        console.log(`     Inline: ${inline.length} reference(s)`);
        const preview = inline.slice(0, 2);
        for (const ref of preview) {
          console.log(`       Line ${ref.line}: ...${ref.oldText}...`);
        }
        if (inline.length > 2) {
          console.log(`       ${colors.dim}... and ${inline.length - 2} more${colors.reset}`);
        }
      }

      fileCount++;
    }
  }

  /**
   * Confirm action with user
   */
  private async confirm(message: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(`${message} [y/N]: `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}
