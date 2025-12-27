/**
 * MoveCommand - Move documentation files with reference updates
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { ReferenceUpdater } from '../utilities/ReferenceUpdater';

/**
 * Command to move documentation files and update all references
 * @public
 */
export class MoveCommand extends BaseCommand {
  getName(): string {
    return 'move';
  }

  getDescription(): string {
    return 'Move a documentation file and update all references';
  }

  protected getUsage(): string {
    return 'tsdoc-edge move <source> <destination> [--dry-run] [--yes]';
  }

  async execute(args: string[]): Promise<CommandResult> {
    const [sourcePath, destPath] = args;
    
    if (!sourcePath || !destPath) {
      console.log(this.getUsage());
      return { exitCode: 1, message: 'Missing arguments' };
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
      return { exitCode: 1, message: 'Source file does not exist' };
    }
    if (fs.existsSync(absDest)) {
      return { exitCode: 1, message: 'Destination already exists' };
    }

    // Find and update references
    const updater = new ReferenceUpdater(managedDir);
    const refs = updater.findReferences(path.relative(managedDir, absSource));

    console.log(`Found ${refs.length} references`);

    updater.updateReferences(refs, path.relative(managedDir, absDest));
    fs.renameSync(absSource, absDest);

    return { exitCode: 0, message: 'Move completed' };
  }
}
