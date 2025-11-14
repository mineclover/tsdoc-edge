/**
 * Deps Command - Show dependencies of a symbol
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';

/**
 * Command for showing symbol dependencies
 *
 * @public
 * @responsibility Show dependencies of a symbol from registry
 * @contract Reads registry, finds symbol, displays all dependencies
 * @doc [[DepsCommand]]
 * @doc [[CLI Commands#deps]]
 *
 * @problem Need to understand what a symbol depends on
 * @solves Displays all dependencies with their types and reasons
 * @context Part of symbol graph query system
 *
 * @functionality
 * - Symbol lookup: Find symbol by ID in registry
 * - Dependency retrieval: Get all dependencies of a symbol
 * - Detailed display: Show target symbol info and relationship
 * - Error handling: Validate registry and symbol existence
 * - Usage guidance: Show helpful error messages
 *
 * @decision Use SymbolRegistryManager for dependency data
 * @rationale Registry already stores dependency relationships
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Dependency data storage
 */
export class DepsCommand extends BaseCommand {
  private manager?: SymbolRegistryManager;

  constructor(manager?: SymbolRegistryManager) {
    super();
    this.manager = manager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'deps';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show dependencies of a symbol';
  }

  protected getUsage(): string {
    return 'tsdoc-edge deps <symbol-id>';
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

      const id = args[0];
      if (!id) {
        this.printError('Usage: tsdoc-edge deps <id>');
        console.log();
        return this.failure('Symbol ID required');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      if (!fs.existsSync(registryPath)) {
        this.printError('No registry found. Run "tsdoc-edge id new" first.');
        console.log();
        return this.failure('Registry not found');
      }

      const manager = this.manager || new SymbolRegistryManager(registryPath);
      const entry = manager.findById(id);

      if (!entry) {
        this.printError(`Symbol not found: ${id}`);
        console.log();
        return this.failure(`Symbol not found: ${id}`);
      }

      this.printHeader(`Dependencies of ${id} (${entry.sourceRef.symbolName})`);

      const deps = manager.getDependencies(id);

      if (deps.length === 0) {
        console.log(`${colors.yellow}No dependencies${colors.reset}`);
        console.log();
      } else {
        for (const dep of deps) {
          const target = manager.findById(dep.targetId);
          const typeLabel = dep.type ? ` [${dep.type}]` : '';
          console.log(
            `${colors.bold}${dep.targetId}${colors.reset}${typeLabel} → ${target?.sourceRef.symbolName || 'unknown'}`
          );
          console.log(`  Reason: ${dep.reason}`);
          if (target) {
            console.log(`  Location: ${target.sourceRef.filePath}`);
          }
          console.log();
        }

        console.log(`Total: ${colors.green}${deps.length}${colors.reset} dependencies`);
        console.log();
      }

      return this.success();
    });
  }
}
