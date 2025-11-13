/**
 * Find Method Command - Find methods/functions by qualified name
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';

/**
 * Command for finding methods by qualified name
 *
 * @public
 * @responsibility Search for methods/functions by qualified name
 * @contract Searches registry, displays matches with details
 * @doc [[FindMethodCommand]]
 * @doc [[CLI Commands#find-method]]
 *
 * @problem Need to find specific methods/functions in codebase
 * @solves Searches by qualified name (Class#method or Class.method)
 * @context Part of code navigation system
 *
 * @functionality
 * - Exact match: Try qualified name first
 * - Partial search: Fall back to partial matching
 * - Multiple results: Display all matches
 * - Detailed info: File, line, type, depth, parent, children
 * - Metadata display: Created/updated timestamps, tags
 *
 * @decision Use SymbolRegistryManager for search
 * @rationale Registry has qualified name and search capabilities
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Symbol search and metadata
 */
export class FindMethodCommand extends BaseCommand {
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
    return 'find-method';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find methods/functions by qualified name';
  }

  protected getUsage(): string {
    return `tsdoc-edge find-method <qualified-name>

  Examples:
    tsdoc-edge find-method DataProcessor#loadCSV
    tsdoc-edge find-method UserService.validateEmail
    tsdoc-edge find-method processData`;
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

      const query = args[0];

      if (!query) {
        this.printError('Usage: tsdoc-edge find-method <qualified-name>');
        console.log();
        console.log('Examples:');
        this.printInfo('  tsdoc-edge find-method DataProcessor#loadCSV');
        this.printInfo('  tsdoc-edge find-method UserService.validateEmail');
        this.printInfo('  tsdoc-edge find-method processData');
        console.log();
        return this.failure('Query required');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      if (!fs.existsSync(registryPath)) {
        this.printError('No registry found.');
        console.log();
        return this.failure('Registry not found');
      }

      const manager = this.manager || new SymbolRegistryManager(registryPath);

      this.printHeader(`Search: ${query}`);

      // Try exact match first
      let entry = manager.findByQualifiedName(query);

      if (!entry) {
        // Try partial search
        const results = manager.search(query);

        if (results.length === 0) {
          console.log(`${colors.yellow}No symbols found${colors.reset}`);
          console.log();
          return this.success();
        }

        if (results.length === 1) {
          entry = results[0];
        } else {
          console.log(`Found ${colors.bold}${results.length}${colors.reset} matching symbols:`);
          console.log();

          for (const result of results) {
            console.log(`${colors.bold}${result.id}${colors.reset} → ${result.sourceRef.qualifiedName}`);
            console.log(`  File: ${result.sourceRef.filePath}:${result.sourceRef.line || '?'}`);
            console.log(`  Type: ${result.sourceRef.type}`);
            console.log();
          }
          return this.success();
        }
      }

      if (entry) {
        console.log(`${colors.bold}${entry.id}${colors.reset} → ${entry.sourceRef.qualifiedName}`);
        console.log();
        console.log(`File:       ${entry.sourceRef.filePath}`);
        console.log(`Line:       ${entry.sourceRef.line || 'unknown'}`);
        console.log(`Type:       ${entry.sourceRef.type}`);
        console.log(`Depth:      ${entry.sourceRef.depth}`);

        if (entry.sourceRef.memberOf) {
          const parent = manager.findById(entry.sourceRef.memberOf);
          console.log(`Parent:     ${entry.sourceRef.memberOf} (${parent?.sourceRef.qualifiedName})`);
        }

        if (entry.sourceRef.memberType) {
          console.log(`Member Type: ${entry.sourceRef.memberType}`);
        }

        console.log(`Created:    ${entry.createdAt}`);
        console.log(`Updated:    ${entry.updatedAt}`);

        if (entry.tags && entry.tags.length > 0) {
          console.log(`Tags:       ${entry.tags.join(', ')}`);
        }

        console.log();

        // Show children if any
        const children = manager.getChildren(entry.id);
        if (children.length > 0) {
          console.log(`${colors.cyan}Children (${children.length}):${colors.reset}`);
          for (const child of children) {
            console.log(`  ${child.id} → ${child.sourceRef.qualifiedName}`);
          }
          console.log();
        }
      }

      return this.success();
    });
  }
}
