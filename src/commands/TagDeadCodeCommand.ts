/**
 * Tag Dead Code command - Direct command to annotate unused dead code with TSDoc tags
 * @packageDocumentation
 */

import type { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DetectDeadCodeCommand } from './DetectDeadCodeCommand';

/**
 * Command for automatically tagging unused/dead code in source files
 *
 * @doc [[TagDeadCodeCommand]]
 * @public
 * @responsibility Provide dedicated entry point for tagging dead code with @deprecated and @deadcode
 * @contract Analyzes dead code candidates and inserts TSDoc tags directly into source files
 */
export class TagDeadCodeCommand extends BaseCommand {
  public readonly detector: DetectDeadCodeCommand;

  constructor(db?: DatabaseManager) {
    super();
    this.detector = new DetectDeadCodeCommand(db);
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'tag-dead-code';
  }

  /**
   * getAliases method
   * @returns Returns array of aliases
   * @public
   */
  getAliases(): string[] {
    return ['tag-deadcode'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Annotate unused/dead code in source files with @deprecated and @deadcode TSDoc tags';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge tag-dead-code [path] [options]

  Options:
    --dry-run            Preview tagging actions without modifying files
    --untag              Remove dead code tags instead of adding them
    --confidence=LEVEL   Filter by confidence (high/medium/low/all, default: high)
    --type=TYPE          Filter by symbol type (function/class/interface/type/constant/variable)
    --reason=TEXT        Custom reason to attach to generated tags`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    if (this.hasHelpFlag(args)) {
      return this.displayHelp();
    }

    // If neither --tag nor --untag is specified, default to --tag
    const forwardedArgs = [...args];
    if (!forwardedArgs.includes('--tag') && !forwardedArgs.includes('--untag')) {
      forwardedArgs.push('--tag');
    }
    return this.detector.execute(forwardedArgs);
  }
}
