/**
 * Tree Command - Show symbol hierarchy tree
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager, type SymbolRow } from '../storage/DatabaseManager';

/**
 * TreeNode interface for hierarchy tree
 */
interface TreeNode {
  id: string;
  name: string;
  type: string;
  filePath: string;
  line: number;
  children: TreeNode[];
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
 * @decision Use DatabaseManager with Drizzle ORM for hierarchy data
 * @rationale Database provides efficient queries for symbol relationships
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason Symbol hierarchy data via Drizzle ORM
 */
export class TreeCommand extends BaseCommand {
  private dbManager?: DatabaseManager;

  constructor(dbManager?: DatabaseManager) {
    super();
    this.dbManager = dbManager;
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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge tree [path-filter]

Examples:
  tsdoc-edge tree                      Show all symbols
  tsdoc-edge tree src/commands         Filter by path
  tsdoc-edge tree DatabaseManager      Filter by name pattern`;
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

      // Parse filter path from args
      const filterPath = args[0];

      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        this.printHeader('Symbol Hierarchy Tree');

        // Get symbols from database using Drizzle ORM
        const allSymbols = dbManager.getAllSymbolRows();

        if (allSymbols.length === 0) {
          console.log(`${colors.yellow}No symbols found in database${colors.reset}`);
          console.log();
          return this.success();
        }

        // Filter by path if provided
        let symbols = allSymbols;
        if (filterPath) {
          symbols = allSymbols.filter(s => s.file_path.includes(filterPath));
          console.log(`${colors.dim}Filtering by path: ${filterPath}${colors.reset}`);
          console.log();

          if (symbols.length === 0) {
            console.log(`${colors.yellow}No symbols found matching: ${filterPath}${colors.reset}`);
            console.log();
            return this.success();
          }
        }

        // Build hierarchy tree from symbols
        const hierarchy = this.buildHierarchy(symbols);

        // Print tree
        const printNode = (node: TreeNode, prefix: string = '', isLast: boolean = true) => {
          const connector = isLast ? '└── ' : '├── ';
          const typeColor =
            node.type === 'class'
              ? colors.blue
              : node.type === 'method'
                ? colors.green
                : node.type === 'function'
                  ? colors.cyan
                  : node.type === 'interface'
                    ? colors.yellow
                    : colors.reset;

          console.log(
            prefix +
              connector +
              typeColor +
              colors.bold +
              node.name +
              colors.reset +
              ` ${colors.dim}(${node.type})${colors.reset}`
          );

          if (node.children.length > 0) {
            const childPrefix = prefix + (isLast ? '    ' : '│   ');
            node.children.forEach((child, index) => {
              const childIsLast = index === node.children.length - 1;
              printNode(child, childPrefix, childIsLast);
            });
          }
        };

        hierarchy.forEach((root, index) => {
          const isLast = index === hierarchy.length - 1;
          printNode(root, '', isLast);
        });

        console.log();
        console.log(`Total symbols: ${colors.bold}${symbols.length}${colors.reset}`);
        console.log();

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }

  /**
   * Build hierarchy tree from symbols
   * Groups by file, then by class/interface containing methods
   */
  private buildHierarchy(symbols: SymbolRow[]): TreeNode[] {
    // Group symbols by file
    const byFile = new Map<string, SymbolRow[]>();
    for (const symbol of symbols) {
      const fileSymbols = byFile.get(symbol.file_path) || [];
      fileSymbols.push(symbol);
      byFile.set(symbol.file_path, fileSymbols);
    }

    const roots: TreeNode[] = [];

    for (const [filePath, fileSymbols] of byFile.entries()) {
      // Separate classes/interfaces from methods/properties
      const containers = fileSymbols.filter(s =>
        ['class', 'interface', 'type', 'enum'].includes(s.type)
      );
      const members = fileSymbols.filter(s =>
        ['method', 'property', 'getter', 'setter'].includes(s.type)
      );
      const standalone = fileSymbols.filter(s =>
        ['function', 'variable', 'constant'].includes(s.type)
      );

      // Build container nodes with their members
      for (const container of containers) {
        const containerNode: TreeNode = {
          id: container.id,
          name: container.name,
          type: container.type,
          filePath: container.file_path,
          line: container.line,
          children: [],
        };

        // Find members that belong to this container (by name prefix)
        const containerMembers = members.filter(m =>
          m.name.startsWith(`${container.name}.`)
        );

        for (const member of containerMembers) {
          containerNode.children.push({
            id: member.id,
            name: member.name.replace(`${container.name}.`, ''),
            type: member.type,
            filePath: member.file_path,
            line: member.line,
            children: [],
          });
        }

        // Sort children by line number
        containerNode.children.sort((a, b) => a.line - b.line);

        roots.push(containerNode);
      }

      // Add standalone functions/variables
      for (const item of standalone) {
        roots.push({
          id: item.id,
          name: item.name,
          type: item.type,
          filePath: item.file_path,
          line: item.line,
          children: [],
        });
      }
    }

    // Sort roots by file path, then by line
    roots.sort((a, b) => {
      const fileCompare = a.filePath.localeCompare(b.filePath);
      if (fileCompare !== 0) return fileCompare;
      return a.line - b.line;
    });

    return roots;
  }
}
