import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { ReferenceUpdater } from '../utilities/ReferenceUpdater';

export class RenameCommand extends BaseCommand {
  getName(): string {
    return 'rename';
  }

  getDescription(): string {
    return 'Rename a documentation file and update all references';
  }

  protected getUsage(): string {
    return 'tsdoc-edge rename <old-path> <new-path> [--dry-run] [--yes]';
  }

  async execute(args: string[]): Promise<CommandResult> {
    const [oldPath, newPath] = args;
    
    if (!oldPath || !newPath) {
      console.log(this.getUsage());
      return { exitCode: 1, message: 'Missing arguments' };
    }

    const managedDir = path.resolve('managed');
    const absOld = path.resolve(managedDir, oldPath);
    const absNew = path.resolve(managedDir, newPath);

    // Validation
    if (!fs.existsSync(absOld)) {
      return { exitCode: 1, message: 'Source file does not exist' };
    }
    if (fs.existsSync(absNew)) {
      return { exitCode: 1, message: 'Destination already exists' };
    }

    // Find references
    const updater = new ReferenceUpdater(managedDir);
    const refs = updater.findReferences(path.relative(managedDir, absOld));

    console.log(`Found ${refs.length} references`);

    // Update
    updater.updateReferences(refs, path.relative(managedDir, absNew));
    fs.renameSync(absOld, absNew);

    return { exitCode: 0, message: 'Rename completed' };
  }
}
