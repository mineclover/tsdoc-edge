/**
 * Orphans Command - Find orphaned symbols
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { DatabaseManager } from '../storage/DatabaseManager';
import { ConfigManager } from '../config/ConfigManager';

/**
 * Command for finding orphaned symbols
 *
 * @public
 * @responsibility Find symbols with no dependencies or usages
 * @contract Reads registry, identifies orphans, displays results
 * @doc [[OrphansCommand]]
 * @doc [[CLI Commands#orphans]]
 *
 * @problem Need to identify unused or disconnected symbols
 * @solves Finds symbols that are neither used nor use others
 * @context Part of code quality analysis
 *
 * @functionality
 * - Orphan detection: Find symbols with no relationships
 * - Registry scanning: Check all registered symbols
 * - Detailed display: Show orphan symbol info
 * - Empty state: Success message when no orphans
 * - Quality indicator: Helps identify dead code
 *
 * @decision Use SymbolRegistryManager for orphan detection
 * @rationale Registry already tracks all relationships
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Relationship data
 */
export class OrphansCommand extends BaseCommand {
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
    return 'orphans';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find orphaned symbols';
  }

  protected getUsage(): string {
    return `tsdoc-edge orphans [options]

  Options:
    --accurate       Use database relationships for accurate detection (recommended)
    --fast           Use registry for fast detection (may have false positives)
    --exclude-tests  Exclude test files from results
    --include-members Include class members (methods/properties) in results
    --classes-only   Show only class-level symbols (exclude members)

  Default: --accurate (members of used classes are automatically excluded)`;
  }

  /**
   * Find orphans using database relationships (accurate but slower)
   * @private
   */
  private findOrphansFromDatabase(
    excludeTests: boolean,
    includeMembers: boolean,
    classesOnly: boolean
  ): Array<{ id: string; name: string; filePath: string; type: string }> {
    const config = ConfigManager.getInstance().get();
    const dbPath = path.join(process.cwd(), config.paths.databasePath || '.tsdoc.db');

    if (!fs.existsSync(dbPath)) {
      throw new Error('Database not found. Run "tsdoc-edge build" first.');
    }

    const dbManager = new DatabaseManager(dbPath, '');
    const db = dbManager.db;

    // Find symbols with no incoming relationships
    let query = `
      SELECT DISTINCT s.id, s.name, s.file_path as filePath, s.type
      FROM symbols s
      WHERE s.id NOT IN (
        SELECT DISTINCT json_each.value
        FROM unified_relationships,
        json_each(unified_relationships.to_symbols)
      )`;

    if (excludeTests) {
      query += `
      AND s.type NOT IN ('test-suite', 'test-case')
      AND s.file_path NOT LIKE '%/__tests__/%'
      AND s.file_path NOT LIKE '%.test.ts'
      AND s.file_path NOT LIKE '%.spec.ts'`;
    }

    if (classesOnly) {
      query += `
      AND s.type IN ('class', 'interface', 'type', 'enum')`;
    }

    query += `
      ORDER BY s.file_path, s.name`;

    let orphans = db.prepare(query).all() as Array<{ id: string; name: string; filePath: string; type: string }>;

    // Filter out members of used classes (unless includeMembers is true)
    if (!includeMembers && !classesOnly) {
      // Get all class IDs that are NOT orphans (i.e., used classes)
      const usedClassIds = new Set(
        db.prepare(`
          SELECT DISTINCT s.id
          FROM symbols s
          WHERE s.type = 'class'
          AND s.id IN (
            SELECT DISTINCT json_each.value
            FROM unified_relationships,
            json_each(unified_relationships.to_symbols)
          )
        `).all().map((r: any) => r.id)
      );

      // Filter out members whose parent class is used
      orphans = orphans.filter(orphan => {
        // Check if this is a class member (method or property)
        if (orphan.type !== 'method' && orphan.type !== 'property') {
          return true; // Keep non-members
        }

        // Extract class name from member ID
        // ID format: "method-classname-methodname" or "property-classname-propname"
        const parts = orphan.id.split('-');
        if (parts.length < 3) {
          return true; // Keep if we can't determine parent class
        }

        const className = parts[1];
        const classId = `class-${className}`;

        // If parent class is used, filter out this member
        return !usedClassIds.has(classId);
      });
    }

    dbManager.close();

    return orphans;
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

      const useFast = args.includes('--fast');
      const useAccurate = args.includes('--accurate') || !useFast; // Default to accurate
      const excludeTests = args.includes('--exclude-tests');
      const includeMembers = args.includes('--include-members');
      const classesOnly = args.includes('--classes-only');

      this.printHeader('Orphaned Symbols');

      if (useFast) {
        this.printWarning('Using fast mode (registry-based) - may have false positives');
        this.printInfo('For accurate results, use --accurate or run without flags');
        console.log();

        const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');

        if (!this.manager && !fs.existsSync(registryPath)) {
          this.printError('No registry found.');
          console.log();
          return this.failure('Registry not found');
        }

        const manager = this.manager || new SymbolRegistryManager(registryPath);
        const orphanIds = manager.findOrphans();

        if (orphanIds.length === 0) {
          this.printSuccess('No orphaned symbols found');
          console.log();
        } else {
          console.log(`${colors.yellow}Found ${orphanIds.length} orphaned symbols:${colors.reset}`);
          console.log();

          for (const id of orphanIds) {
            const entry = manager.findById(id);
            if (entry) {
              if (excludeTests && (
                entry.sourceRef.filePath.includes('__tests__') ||
                entry.sourceRef.filePath.endsWith('.test.ts') ||
                entry.sourceRef.filePath.endsWith('.spec.ts')
              )) {
                continue;
              }

              console.log(`${colors.bold}${id}${colors.reset} → ${entry.sourceRef.symbolName}`);
              console.log(`  Location: ${entry.sourceRef.filePath}`);
              console.log();
            }
          }
        }
      } else {
        // Accurate mode (default)
        this.printSuccess('Using accurate mode (database-based)');
        if (excludeTests) {
          this.printInfo('Excluding test files from results');
        }
        if (classesOnly) {
          this.printInfo('Showing only class-level symbols');
        } else if (!includeMembers) {
          this.printInfo('Excluding members of used classes (use --include-members to show all)');
        }
        console.log();

        try {
          const orphans = this.findOrphansFromDatabase(excludeTests, includeMembers, classesOnly);

          if (orphans.length === 0) {
            this.printSuccess('No orphaned symbols found');
            console.log();
          } else {
            console.log(`${colors.yellow}Found ${orphans.length} orphaned symbols:${colors.reset}`);
            console.log();

            for (const orphan of orphans) {
              console.log(`${colors.bold}${orphan.id}${colors.reset} → ${orphan.name}`);
              console.log(`  Type: ${orphan.type}`);
              console.log(`  Location: ${orphan.filePath}`);
              console.log();
            }
          }
        } catch (error) {
          this.printError(`Error finding orphans: ${error}`);
          return this.failure(String(error));
        }
      }

      return this.success();
    });
  }
}

/**
 * Command for finding undocumented symbols
 *
 * @public
 * @responsibility Find symbols without documentation
 * @contract Loads database, builds graph, finds undocumented symbols
 * @doc [[UndocumentedCommand]]
 * @doc [[CLI Commands#undocumented]]
 *
 * @problem Need to identify symbols lacking documentation
 * @solves Searches for symbols without summary or TSDoc
 * @context Part of documentation quality assurance
 *
 * @functionality
 * - Database loading: Read all symbols from database
 * - Graph building: Construct symbol graph for analysis
 * - Search filtering: Use SymbolSearchEngine to find undocumented
 * - Detailed display: Show symbol type and location
 * - Quality metric: Helps improve documentation coverage
 *
 * @decision Use SymbolSearchEngine for undocumented search
 * @rationale SearchEngine has built-in undocumented filter
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager, SymbolGraphBuilder, SymbolSearchEngine
 * @depType internal
 * @depReason Symbol data and search capabilities
 */
