/**
 * Rename Command - Rename file and update all references
 *
 * @packageDocumentation
 * @responsibility Rename documentation files and update all references
 * @contract Safely rename files while maintaining reference integrity
 *
 * @problem Manual file renaming breaks references (backlinks, paths, relative links)
 * @solves Automatically updates all references when renaming files
 * @context Part of documentation maintenance workflow
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { FileReferenceUpdater, type FileReference } from '../utilities/FileReferenceUpdater';

/**
 * Rename validation result
 */
interface RenameValidation {
  /** Absolute old path */
  oldPath: string;
  /** Absolute new path */
  newPath: string;
  /** Old file exists */
  oldExists: boolean;
  /** New file exists (should be false) */
  newExists: boolean;
  /** Old file has H1 symbol */
  hasH1Symbol: boolean;
  /** Symbol name if found */
  symbolName?: string;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Rename Command
 *
 * Renames a documentation file and updates all references to it
 *
 * @public
 * @responsibility Rename files safely with reference updates
 * @contract Find all references, update them, rename file, validate result
 *
 * @example
 * ```bash
 * # Rename file
 * tsdoc-edge rename old-file.md new-file.md
 *
 * # Dry run (preview only)
 * tsdoc-edge rename old-file.md new-file.md --dry-run
 *
 * # Auto-confirm
 * tsdoc-edge rename old-file.md new-file.md --yes
 * ```
 */
export class RenameCommand extends BaseCommand {
  private updater: FileReferenceUpdater;

  constructor() {
    super();
    this.updater = new FileReferenceUpdater();
  }

  getName(): string {
    return 'rename';
  }

  getDescription(): string {
    return 'Rename file and update all references';
  }

  protected getUsage(): string {
    return `tsdoc-edge rename <old-path> <new-path> [options]

  Arguments:
    old-path    Current file path (relative to managed/)
    new-path    New file path (relative to managed/)

  Options:
    --dry-run   Preview changes without applying
    --yes, -y   Auto-confirm all changes
    --base-dir=DIR  Base directory (default: managed)

  Examples:
    tsdoc-edge rename features/old.md features/new.md
    tsdoc-edge rename old.md new.md --dry-run
    tsdoc-edge rename path/old.md path/new.md --yes`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      // Parse arguments
      const nonFlagArgs = args.filter((arg) => !arg.startsWith('--') && !arg.startsWith('-'));
      if (nonFlagArgs.length < 2) {
        throw new Error('Missing required arguments: old-path and new-path');
      }

      const oldPath = nonFlagArgs[0];
      const newPath = nonFlagArgs[1];
      const dryRun = args.includes('--dry-run');
      const autoConfirm = args.includes('--yes') || args.includes('-y');
      const baseDirArg = args.find((arg) => arg.startsWith('--base-dir='));
      const baseDir = baseDirArg ? baseDirArg.split('=')[1] : 'managed';

      this.printHeader('Rename File');

      if (dryRun) {
        this.printInfo('Running in dry-run mode (no changes will be made)');
        console.log();
      }

      // Step 1: Validate
      this.printInfo('Step 1: Validating rename operation...');
      const validation = await this.validate(oldPath, newPath, baseDir);

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
      console.log(`  Old: ${colors.cyan}${validation.oldPath}${colors.reset}`);
      console.log(`  New: ${colors.cyan}${validation.newPath}${colors.reset}`);

      if (validation.symbolName) {
        console.log(`  Symbol: ${colors.green}[[${validation.symbolName}]]${colors.reset}`);
      }

      // Step 2: Find references
      console.log();
      this.printInfo('Step 2: Finding all references...');
      const references = await this.updater.findReferences(validation.oldPath, baseDir, validation.newPath);

      console.log();
      this.printSuccess(`Found ${references.length} references in ${new Set(references.map(r => r.file)).size} files`);

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
        const confirmed = await this.confirm('Proceed with rename?');
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

      // Update references
      const updateResult = await this.updater.updateReferences(validation.oldPath, validation.newPath, {
        baseDir,
        dryRun: false,
        updateBacklinks: true,
        updatePaths: true,
        updateRelativeLinks: true,
        updateMarkdownLinks: true,
      });

      console.log(`  ${colors.green}✓${colors.reset} Updated ${updateResult.updated} references in ${updateResult.filesModified.length} files`);

      // Rename file
      fs.renameSync(validation.oldPath, validation.newPath);
      console.log(`  ${colors.green}✓${colors.reset} Renamed file`);

      if (updateResult.errors.length > 0) {
        console.log();
        this.printWarning('Some errors occurred:');
        for (const error of updateResult.errors) {
          console.log(`  ${colors.yellow}⚠${colors.reset} ${error.file}: ${error.error}`);
        }
      }

      // Step 6: Success
      console.log();
      this.printSuccess('Rename complete!');
      console.log();
      console.log(`Next steps:`);
      console.log(`  1. Run ${colors.cyan}tsdoc-edge update-backlinks ${baseDir}${colors.reset} to regenerate backlinks`);
      console.log(`  2. Run ${colors.cyan}tsdoc-edge validate-symbol-refs ${baseDir}${colors.reset} to verify integrity`);

      return this.success();
    });
  }

  /**
   * Validate rename operation
   */
  private async validate(
    oldPath: string,
    newPath: string,
    baseDir: string
  ): Promise<RenameValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Convert to absolute paths
    const absoluteOldPath = path.isAbsolute(oldPath) ? oldPath : path.resolve(baseDir, oldPath);
    const absoluteNewPath = path.isAbsolute(newPath) ? newPath : path.resolve(baseDir, newPath);

    // Check old file exists
    const oldExists = fs.existsSync(absoluteOldPath);
    if (!oldExists) {
      errors.push(`Old file does not exist: ${absoluteOldPath}`);
    }

    // Check new file does NOT exist
    const newExists = fs.existsSync(absoluteNewPath);
    if (newExists) {
      errors.push(`New file already exists: ${absoluteNewPath}`);
    }

    // Check new directory exists
    const newDir = path.dirname(absoluteNewPath);
    if (!fs.existsSync(newDir)) {
      errors.push(`Destination directory does not exist: ${newDir}`);
    }

    // Check H1 symbol
    let hasH1Symbol = false;
    let symbolName: string | undefined;

    if (oldExists) {
      try {
        const content = fs.readFileSync(absoluteOldPath, 'utf-8');
        const h1Match = content.match(/^# \[\[(.+?)\]\]/m);
        if (h1Match) {
          hasH1Symbol = true;
          symbolName = h1Match[1];
        } else {
          warnings.push('File has no H1 [[Symbol]] definition');
        }
      } catch (error) {
        warnings.push('Could not read file to check H1 symbol');
      }
    }

    // Check file extension
    if (!newPath.endsWith('.md')) {
      warnings.push('New filename does not end with .md');
    }

    return {
      oldPath: absoluteOldPath,
      newPath: absoluteNewPath,
      oldExists,
      newExists,
      hasH1Symbol,
      symbolName,
      errors,
      warnings,
    };
  }

  /**
   * Preview changes
   */
  private previewChanges(
    validation: RenameValidation,
    references: FileReference[],
    baseDir: string
  ): void {
    // Group by file
    const refsByFile = new Map<string, FileReference[]>();
    for (const ref of references) {
      if (!refsByFile.has(ref.file)) {
        refsByFile.set(ref.file, []);
      }
      refsByFile.get(ref.file)!.push(ref);
    }

    // Show file rename
    console.log(`${colors.bold}File to rename:${colors.reset}`);
    const relativeOld = path.relative(baseDir, validation.oldPath);
    const relativeNew = path.relative(baseDir, validation.newPath);
    console.log(`  ${colors.red}- ${relativeOld}${colors.reset}`);
    console.log(`  ${colors.green}+ ${relativeNew}${colors.reset}`);
    console.log();

    // Show reference updates (limited to 10 files)
    console.log(`${colors.bold}References to update (${refsByFile.size} files):${colors.reset}`);

    let fileCount = 0;
    for (const [file, fileRefs] of refsByFile) {
      if (fileCount >= 10) {
        console.log(`  ${colors.dim}... and ${refsByFile.size - 10} more files${colors.reset}`);
        break;
      }

      const relativeFile = path.relative(baseDir, file);
      console.log();
      console.log(`  ${fileCount + 1}. ${colors.cyan}${relativeFile}${colors.reset}`);

      // Show first 3 references in this file
      for (let i = 0; i < Math.min(3, fileRefs.length); i++) {
        const ref = fileRefs[i];
        console.log(`     Line ${ref.line}:`);
        console.log(`     ${colors.red}- ${ref.oldText}${colors.reset}`);
        console.log(`     ${colors.green}+ ${ref.newText}${colors.reset}`);
      }

      if (fileRefs.length > 3) {
        console.log(`     ${colors.dim}... and ${fileRefs.length - 3} more references${colors.reset}`);
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
