/**
 * Tree Command - Show symbol hierarchy tree
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';

/**
 * RegistryEntryNode interface for hierarchy tree
 */
interface RegistryEntryNode {
  id: string;
  sourceRef: {
    type?: string;
    qualifiedName?: string;
    symbolName?: string;
    filePath?: string;
  };
  children?: RegistryEntryNode[];
}

/**
 * Command for showing symbol hierarchy tree
 *
 * @public
 * @responsibility Display hierarchical symbol tree
 * @contract Reads registry, builds hierarchy, renders tree view
 * @doc [[TreeCommand]]
 * @doc [[CLI Commands#tree]]
 *
 * @problem Need to visualize symbol hierarchies (classes, methods, etc.)
 * @solves Displays tree structure of symbol relationships
 * @context Part of codebase navigation and understanding
 *
 * @functionality
 * - Tree building: Construct hierarchical tree from registry
 * - Root detection: Find top-level symbols (no parent)
 * - Recursive rendering: Display tree with indentation
 * - Type indicators: Show symbol types in tree
 * - Depth control: Handle deep hierarchies gracefully
 *
 * @decision Use SymbolRegistryManager for hierarchy data
 * @rationale Registry stores parent-child relationships
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Symbol hierarchy data
 */
export class TreeCommand extends BaseCommand {
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
    return 'tree';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show symbol hierarchy tree';
  }

  protected getUsage(): string {
    return 'tsdoc-edge tree';
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

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');

      if (!this.manager && !fs.existsSync(registryPath)) {
        this.printError('No registry found.');
        console.log();
        return this.failure('Registry not found');
      }

      const manager = this.manager || new SymbolRegistryManager(registryPath);
      const hierarchy = manager.buildHierarchy();

      this.printHeader('Symbol Hierarchy Tree');

      if (hierarchy.length === 0) {
        console.log(`${colors.yellow}No symbols registered${colors.reset}`);
        console.log();
        return this.success();
      }

      const printNode = (node: RegistryEntryNode, prefix: string = '', isLast: boolean = true) => {
        const connector = isLast ? '└── ' : '├── ';
        const typeColor =
          node.sourceRef.type === 'class'
            ? colors.blue
            : node.sourceRef.type === 'method'
              ? colors.green
              : node.sourceRef.type === 'function'
                ? colors.cyan
                : colors.reset;

        console.log(
          prefix +
            connector +
            colors.bold +
            node.id +
            colors.reset +
            ' ' +
            typeColor +
            node.sourceRef.qualifiedName +
            colors.reset +
            ` (${node.sourceRef.type})`
        );

        if (node.children && node.children.length > 0) {
          const childPrefix = prefix + (isLast ? '    ' : '│   ');
          node.children.forEach((child: RegistryEntryNode, index: number) => {
            const childIsLast = index === (node.children?.length ?? 0) - 1;
            printNode(child, childPrefix, childIsLast);
          });
        }
      };

      hierarchy.forEach((root, index) => {
        const isLast = index === hierarchy.length - 1;
        printNode(root, '', isLast);
      });

      console.log();
      console.log(`Total symbols: ${colors.bold}${manager.getAll().length}${colors.reset}`);
      console.log();

      return this.success();
    });
  }
}
