/**
 * MoveCommand - Move documentation files with reference updates
 *
 * @packageDocumentation
 * @doc [[CliCommandSurfaceSpecification]]
 * @doc [[Document Symbol System]]
 * @context Managed documentation file relocation within `tsdoc-edge docs move`
 * @functionality Validates source and destination paths under `managed/`, discovers inbound references via `ReferenceUpdater`, and updates links before renaming files (or previews with `--dry-run`)
 * @sideEffect console: Writes reference counts, dry-run previews, and validation errors to stdout
 * @sideEffect filesystem: Updates markdown reference links and renames documentation files under `managed/` in write mode
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ReferenceUpdater } from '../utilities/ReferenceUpdater';
import { BaseCommand, type CommandResult } from './BaseCommand';

/**
 * Command to move documentation files and update all references
 *
 * @doc [[CliCommandSurfaceSpecification]]
 * @doc [[Document Symbol System]]
 * @public
 */
export class MoveCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'move';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Move a documentation file and update all references';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge docs move <source> <destination> [options]

Move a documentation file and automatically update all references to it.

Options:
  --dry-run, -n Show what would be changed without making changes
  --yes        Skip confirmation prompt

Examples:
  tsdoc-edge docs move features/old.md features/new.md
  tsdoc-edge docs move features/file.md archive/
  tsdoc-edge docs move concepts/api.md features/ --dry-run`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    // Check for help flag
    if (this.hasHelpFlag(args)) {
      return Promise.resolve(this.displayHelp());
    }

    const flagError = this.validateAllowedFlags(args, ['--dry-run', '-n', '--yes']);
    if (flagError) return Promise.resolve(flagError);

    const [sourcePath, destPath] = this.getPositionalArgs(args);
    const dryRun = this.hasFlag(args, ['--dry-run', '-n']);

    if (!sourcePath || !destPath) {
      this.printError('Source and destination paths required');
      console.log();
      console.log(this.getUsage());
      return Promise.resolve({ exitCode: 1, message: 'Missing arguments' });
    }

    const managedDir = path.resolve('managed');
    const absSource = path.resolve(managedDir, sourcePath);

    let absDest: string;
    if (destPath.endsWith('/')) {
      absDest = path.join(managedDir, destPath, path.basename(absSource));
    } else {
      absDest = path.resolve(managedDir, destPath);
    }

    // Validation
    if (!fs.existsSync(absSource)) {
      return Promise.resolve({ exitCode: 1, message: 'Source file does not exist' });
    }
    if (fs.existsSync(absDest)) {
      return Promise.resolve({ exitCode: 1, message: 'Destination already exists' });
    }

    // Find and update references
    const updater = new ReferenceUpdater(managedDir);
    const refs = updater.findReferences(path.relative(managedDir, absSource));

    console.log(`Found ${refs.length} references`);

    if (dryRun) {
      console.log(`Would update ${refs.length} references`);
      console.log(`Would move ${absSource} to ${absDest}`);
      return Promise.resolve({ exitCode: 0, message: 'Dry run complete' });
    }

    updater.updateReferences(refs, path.relative(managedDir, absDest));
    fs.renameSync(absSource, absDest);

    return Promise.resolve({ exitCode: 0, message: 'Move completed' });
  }
}
