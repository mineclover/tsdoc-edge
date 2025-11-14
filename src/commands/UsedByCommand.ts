/**
 * Used By Command - Show what uses a symbol
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';

/**
 * Command for showing what uses a symbol (registry-based)
 *
 * @public
 * @responsibility Show reverse dependencies from registry
 * @contract Reads registry, finds symbol, displays all usages
 * @doc [[UsedByCommand]]
 * @doc [[CLI Commands#used-by]]
 *
 * @problem Need to understand what uses a given symbol
 * @solves Displays all reverse dependencies with details
 * @context Part of symbol graph query system
 *
 * @functionality
 * - Symbol lookup: Find symbol by ID in registry
 * - Usage retrieval: Get all symbols that use this symbol
 * - Detailed display: Show from symbol info and relationship
 * - Error handling: Validate registry and symbol existence
 * - Empty state: Clear message when not used
 *
 * @decision Use SymbolRegistryManager for usage data
 * @rationale Registry stores bidirectional relationships
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Usage relationship storage
 */
export class UsedByCommand extends BaseCommand {
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
    return 'used-by';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show what uses a symbol (registry)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge used-by <symbol-id>';
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
        this.printError('Usage: tsdoc-edge used-by <id>');
        console.log();
        return this.failure('Symbol ID required');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      if (!fs.existsSync(registryPath)) {
        this.printError('No registry found.');
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

      this.printHeader(`Used By ${id} (${entry.sourceRef.symbolName})`);

      const usedBy = manager.getUsedBy(id);

      if (usedBy.length === 0) {
        console.log(`${colors.yellow}Not used by any symbol${colors.reset}`);
        console.log();
      } else {
        for (const user of usedBy) {
          const from = manager.findById(user.fromId);
          const typeLabel = user.type ? ` [${user.type}]` : '';
          console.log(
            `${colors.bold}${user.fromId}${colors.reset}${typeLabel} → ${from?.sourceRef.symbolName || 'unknown'}`
          );
          console.log(`  Reason: ${user.reason}`);
          if (from) {
            console.log(`  Location: ${from.sourceRef.filePath}`);
          }
          console.log();
        }

        console.log(`Total: ${colors.green}${usedBy.length}${colors.reset} usages`);
        console.log();
      }

      return this.success();
    });
  }
}
