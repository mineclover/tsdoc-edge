/**
 * Orphans Command - Find orphaned symbols
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CanonicalGraphNode } from '../indexer/contracts';
import { DatabaseManager } from '../storage/DatabaseManager';
import { GraphRepository } from '../storage/GraphRepository';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge orphans [options]

  Options:
    --accurate       Use database relationships for accurate detection (recommended)
    --fast           Use registry for fast detection (may have false positives)
    --exclude-tests  Exclude test files from results
    --include-members Include class members (methods/properties) in results
    --classes-only   Show only class-level symbols (exclude members)
    --include-external Include external and standard-library symbols

  Default: --accurate (members of used classes are automatically excluded)`;
  }

  /**
   * Find orphans using database relationships (accurate but slower)
   */
  private findOrphansFromDatabase(
    excludeTests: boolean,
    includeMembers: boolean,
    classesOnly: boolean,
    includeExternal: boolean
  ): Array<{ id: string; name: string; filePath: string; type: string }> {
    const dbPath = this.getDatabasePath();

    if (!fs.existsSync(dbPath)) {
      throw new Error('Database not found. Run: tsdoc-edge build src');
    }

    const dbManager = new DatabaseManager(dbPath, this.getJsonlPath());

    try {
      // Build set of all "to" symbol IDs from relationships using Drizzle ORM
      const allRels = dbManager.getAllUnifiedRelationships();
      const usedSymbolIds = new Set<string>();
      for (const rel of allRels) {
        const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
        for (const to of toSymbols) {
          if (to) usedSymbolIds.add(to);
        }
      }

      // Get all symbols and filter to find orphans
      const allSymbols = dbManager.getAllSymbolRows();
      let orphans = allSymbols
        .filter((s) => !usedSymbolIds.has(s.id))
        .filter((s) => includeExternal || !this.isExternal({ file: s.file_path, external: false }))
        .map((s) => ({
          id: s.id,
          name: s.name,
          filePath: s.file_path,
          type: s.type,
        }));

      // Apply filters
      if (excludeTests) {
        orphans = orphans.filter(
          (s) =>
            s.type !== 'test-suite' &&
            s.type !== 'test-case' &&
            !s.filePath.includes('/__tests__/') &&
            !s.filePath.endsWith('.test.ts') &&
            !s.filePath.endsWith('.spec.ts')
        );
      }

      if (classesOnly) {
        orphans = orphans.filter(
          (s) =>
            s.type === 'class' || s.type === 'interface' || s.type === 'type' || s.type === 'enum'
        );
      }

      // Sort by file path and name
      orphans.sort((a, b) => {
        const fileCompare = a.filePath.localeCompare(b.filePath);
        return fileCompare !== 0 ? fileCompare : a.name.localeCompare(b.name);
      });

      // Filter out members of used classes (unless includeMembers is true)
      if (!includeMembers && !classesOnly) {
        // Get all class IDs that are NOT orphans (i.e., used classes)
        const usedClassIds = new Set(
          allSymbols.filter((s) => s.type === 'class' && usedSymbolIds.has(s.id)).map((s) => s.id)
        );

        // Filter out members whose parent class is used
        orphans = orphans.filter((orphan) => {
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

      return orphans;
    } finally {
      dbManager.close();
    }
  }

  private findCanonicalOrphans(
    nodes: readonly CanonicalGraphNode[],
    edges: readonly { from: string; to: string }[],
    excludeTests: boolean,
    includeMembers: boolean,
    classesOnly: boolean,
    includeExternal: boolean
  ): Array<{ id: string; name: string; filePath: string; type: string }> {
    const incoming = new Set(edges.map((edge) => edge.to));
    const usedClasses = new Set(
      nodes
        .filter((node) => node.kind === 'class' && incoming.has(node.id))
        .map((node) => node.name)
    );
    return nodes
      .filter((node) => !incoming.has(node.id) && (includeExternal || !this.isExternal(node)))
      .filter((node) => !excludeTests || !/(?:__tests__|\.test\.|\.spec\.)/.test(node.file ?? ''))
      .filter((node) => !classesOnly || ['class', 'interface', 'type', 'enum'].includes(node.kind))
      .filter(
        (node) =>
          includeMembers ||
          !['method', 'property', 'variable'].includes(node.kind) ||
          !usedClasses.has(node.qualifiedName?.split('.').slice(-2, -1)[0] ?? '')
      )
      .map((node) => ({
        id: node.id,
        name: node.name ?? node.qualifiedName ?? node.id,
        filePath: node.file ?? '',
        type: node.kind,
      }))
      .sort((a, b) => a.filePath.localeCompare(b.filePath) || a.name.localeCompare(b.name));
  }
  private tryCanonical(): {
    repository: GraphRepository;
    revision: NonNullable<ReturnType<GraphRepository['readActiveRevision']>>;
  } | null {
    let configured: string | undefined;
    try {
      const parsed: unknown = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), '.tsdoc.config.json'), 'utf8')
      );
      const config = parsed as { canonicalGraph?: { databasePath?: string } };
      configured = config.canonicalGraph?.databasePath;
    } catch {
      /* defaults */
    }
    const db = path.resolve(
      process.cwd(),
      process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB ?? configured ?? '.tsdoc/canonical-graph.db'
    );
    if (!fs.existsSync(db)) return null;
    let repository: GraphRepository | undefined;
    try {
      repository = new GraphRepository(db, { readOnly: true });
      const revision = repository.readActiveRevision();
      if (!revision) {
        repository.close();
        return null;
      }
      return { repository, revision };
    } catch {
      return null;
    }
  }

  private isExternal(node: Pick<CanonicalGraphNode, 'external' | 'file'>): boolean {
    return (
      node.external === true ||
      /(?:bundled:|(?:^|[\\/])libs[\\/]|(?:^|[\\/])node_modules[\\/])/.test(node.file ?? '')
    );
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const invalid = this.validateAllowedFlags(args, [
        '--accurate',
        '--fast',
        '--exclude-tests',
        '--include-members',
        '--classes-only',
        '--include-external',
        '--json',
        '--xml',
      ]);
      if (invalid) return invalid;
      const useJson = this.hasFlag(args, '--json');
      const useXml = this.hasFlag(args, '--xml');
      const canonical = this.tryCanonical();
      if (canonical) {
        try {
          const orphans = this.findCanonicalOrphans(
            canonical.revision.graph.nodes,
            canonical.revision.graph.edges,
            args.includes('--exclude-tests'),
            args.includes('--include-members'),
            args.includes('--classes-only'),
            args.includes('--include-external')
          );
          if (useJson) console.log(JSON.stringify({ orphans }, null, 2));
          else if (useXml)
            console.log(
              `<orphans count="${orphans.length}">${orphans.map((item) => `<item><id>${item.id}</id><name>${item.name}</name><type>${item.type}</type><file>${item.filePath}</file></item>`).join('')}</orphans>`
            );
          else {
            this.printHeader('Orphaned Symbols');
            if (orphans.length === 0) console.log('No orphaned symbols found');
            else
              for (const orphan of orphans)
                console.log(`${orphan.id} → ${orphan.name} (${orphan.type}) ${orphan.filePath}`);
          }
          return this.success();
        } finally {
          canonical.repository.close();
        }
      }

      if (useXml) {
        try {
          const orphans = this.findOrphansFromDatabase(
            args.includes('--exclude-tests'),
            args.includes('--include-members'),
            args.includes('--classes-only'),
            args.includes('--include-external')
          );
          console.log(
            `<orphans count="${orphans.length}">${orphans.map((item) => `<item><id>${item.id}</id><name>${item.name}</name><type>${item.type}</type><file>${item.filePath}</file></item>`).join('')}</orphans>`
          );
          return this.success();
        } catch (error) {
          return this.failure(String(error));
        }
      }

      if (useJson) {
        try {
          const orphans = this.findOrphansFromDatabase(
            args.includes('--exclude-tests'),
            args.includes('--include-members'),
            args.includes('--classes-only'),
            args.includes('--include-external')
          );
          console.log(JSON.stringify({ orphans }, null, 2));
          return this.success();
        } catch (error) {
          return this.failure(String(error));
        }
      }

      const useFast = args.includes('--fast');
      const _useAccurate = args.includes('--accurate') || !useFast; // Default to accurate
      const excludeTests = args.includes('--exclude-tests');
      const includeMembers = args.includes('--include-members');
      const classesOnly = args.includes('--classes-only');
      const includeExternal = args.includes('--include-external');

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
              if (
                excludeTests &&
                (entry.sourceRef.filePath.includes('__tests__') ||
                  entry.sourceRef.filePath.endsWith('.test.ts') ||
                  entry.sourceRef.filePath.endsWith('.spec.ts'))
              ) {
                continue;
              }
              if (
                !includeExternal &&
                this.isExternal({ external: false, file: entry.sourceRef.filePath })
              ) {
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
          const orphans = this.findOrphansFromDatabase(
            excludeTests,
            includeMembers,
            classesOnly,
            includeExternal
          );

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
 */
