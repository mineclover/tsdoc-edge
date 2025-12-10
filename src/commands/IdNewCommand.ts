/**
 * Id New Command - Generate new symbol IDs
 * @packageDocumentation
 */

import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import type { Symbol } from '../types/graph/graph';

/**
 * IdNewCommand - Generate new symbol IDs
 * @public
 * @doc [[Id New Command]]
 * @doc [[CLI Commands#id-new]]
 */
export class IdNewCommand extends BaseCommand {
  constructor(private manager?: SymbolRegistryManager) {
    super();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'id-new';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Generate new symbol ID';
  }

  protected getUsage(): string {
    return 'tsdoc-edge id-new <file-path> <symbol-name>';
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

      const filePath = args[0];
      const symbolName = args[1];

      if (!filePath || !symbolName) {
        this.printError('File path and symbol name required');
        console.log();
        console.log('Usage:');
        this.printInfo('  tsdoc-edge id-new <file> <symbol> [options]');
        console.log();
        console.log('Options:');
        console.log('  --type=<type>           Symbol type');
        console.log('  --parent=<id>           Parent symbol ID');
        console.log('  --member-type=<type>    Member type (instance, static, inner)');
        console.log();
        return this.failure('Missing required arguments');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      const manager = this.manager || new SymbolRegistryManager(registryPath);

      let type: string | undefined;
      let parent: string | undefined;
      let memberType: 'instance' | 'static' | 'inner' | undefined;

      for (const arg of args.slice(2)) {
        if (arg.startsWith('--type=')) {
          type = arg.split('=')[1];
        } else if (arg.startsWith('--parent=')) {
          parent = arg.split('=')[1];
        } else if (arg.startsWith('--member-type=')) {
          memberType = arg.split('=')[1] as 'instance' | 'static' | 'inner';
        }
      }

      if (parent && !manager.findById(parent)) {
        this.printError(`Parent symbol not found: ${parent}`);
        return this.failure(`Parent not found: ${parent}`);
      }

      const id = manager.register({
        filePath,
        symbolName,
        type: type as any, // Type narrowed to ImplementationSymbolType by register()
        memberOf: parent,
        memberType,
      });
      manager.save();

      const entry = manager.findById(id);

      this.printSuccess('ID generated:');
      console.log();
      console.log(`  ID: ${colors.bold}${id}${colors.reset}`);
      console.log(`  Qualified Name: ${colors.bold}${entry?.sourceRef.qualifiedName}${colors.reset}`);
      console.log(`  File: ${filePath}`);
      console.log(`  Symbol: ${symbolName}`);
      if (type) console.log(`  Type: ${type}`);
      console.log();
      console.log('Add this to your TSDoc comment:');
      this.printInfo(`  @id ${id}`);
      console.log();

      return this.success();
    });
  }
}

/**
 * ValidateSpecCommand - Validate specification completeness
 * @public
 * @doc [[Validate Spec Command]]
 * @doc [[CLI Commands#validate-spec]]
 */
