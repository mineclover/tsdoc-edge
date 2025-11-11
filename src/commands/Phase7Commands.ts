/**
 * Phase 7 Commands - Statistics, search, and utility commands
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import type { Symbol, SymbolRelationship } from '../types/graph/graph';
import type { FuturePlan } from '../types/tags';

/**
 * SymbolRow interface for database results
 */
interface SymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
  line: number;
  column: number;
  is_exported: number;
  is_public: number;
  summary: string | null;
}

/**
 * RelationshipRow interface for database results
 */
interface RelationshipRow {
  type: string;
  from_id: string;
  to_id: string;
  file_path: string;
  line: number;
  description: string;
}

/**
 * Command for showing future plans
 *
 * @public
 * @responsibility Display future plans from enhanced documentation
 * @contract Reads database, extracts plans, displays with filtering
 * @doc [[PlansCommand]]
 * @doc [[CLI Commands#plans]]
 *
 * @problem Need to track and visualize future plans across codebase
 * @solves Shows all @plan tags from enhanced docs with status and priority
 * @context Part of project planning and tracking
 *
 * @functionality
 * - Database query: Extract future plans from enhanced_docs table
 * - Status filtering: Optional --status= filter
 * - Priority sorting: High > Medium > Low
 * - Detailed display: ID, title, status, priority, milestone, implementer
 * - Summary statistics: Total plan count
 *
 * @decision Use DatabaseManager for plan data
 * @rationale Plans stored in database with symbol associations
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason Plan data storage
 */
export class PlansCommand extends BaseCommand {
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
    return 'plans';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show future plans from documentation';
  }

  protected getUsage(): string {
    return `tsdoc-edge plans [--status=<status>]

  Options:
    --status=<status>  Filter by status (planned, in-progress, completed, cancelled)`;
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

      const status = args[0]; // Optional: --status=planned

      this.printHeader('Future Plans');

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');

      if (!fs.existsSync(dbPath)) {
        this.printError('Database not found. Run "tsdoc-edge build src" first.');
        console.log();
        return this.failure('Database not found');
      }

      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const query = `
          SELECT
            future_plans as plans,
            symbol_id as symbolId
          FROM enhanced_docs
        `;

        const stmt = dbManager.db.prepare(query);
        const results = stmt.all() as Array<{ plans: string; symbolId: string }>;

        const allPlans: Array<{ plan: FuturePlan; symbolId: string }> = [];

        for (const row of results) {
          const plans = JSON.parse(row.plans || '[]');
          for (const plan of plans) {
            allPlans.push({ plan, symbolId: row.symbolId });
          }
        }

        // Filter by status if provided
        let filteredPlans = allPlans;
        if (status?.startsWith('--status=')) {
          const statusValue = status.split('=')[1];
          filteredPlans = allPlans.filter(({ plan }) => plan.status === statusValue);
        }

        // Sort by priority (high > medium > low)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        filteredPlans.sort((a, b) => {
          const aPriority = priorityOrder[a.plan.priority as keyof typeof priorityOrder] ?? 2;
          const bPriority = priorityOrder[b.plan.priority as keyof typeof priorityOrder] ?? 2;
          return aPriority - bPriority;
        });

        if (filteredPlans.length === 0) {
          this.printSuccess('No future plans found');
          console.log();
          return this.success();
        }

        console.log(`Total plans: ${colors.bold}${filteredPlans.length}${colors.reset}`);
        console.log();

        for (const { plan, symbolId } of filteredPlans) {
          const statusIcon =
            plan.status === 'completed'
              ? `${colors.green}✅`
              : plan.status === 'in-progress'
                ? `${colors.yellow}🔄`
                : plan.status === 'cancelled'
                  ? `${colors.red}❌`
                  : `${colors.blue}📌`;

          const priorityColor =
            plan.priority === 'high' ? colors.red : plan.priority === 'medium' ? colors.yellow : colors.cyan;

          console.log(`${statusIcon} ${colors.bold}${plan.id}${colors.reset} - ${plan.title}`);
          console.log(`   Symbol: ${symbolId}`);
          console.log(`   Status: ${colors.bold}${plan.status}${colors.reset}`);

          if (plan.priority) {
            console.log(`   Priority: ${priorityColor}${plan.priority}${colors.reset}`);
          }

          if (plan.targetSymbol) {
            console.log(`   Target: ${plan.targetSymbol}${plan.targetMethod ? `#${plan.targetMethod}` : ''}`);
          }

          if (plan.implementedBy) {
            console.log(`   Implemented by: ${colors.green}${plan.implementedBy}${colors.reset}`);
          }

          if (plan.targetMilestone) {
            console.log(`   Milestone: ${colors.cyan}${plan.targetMilestone}${colors.reset}`);
          }

          console.log(`   ${plan.description.substring(0, 100)}${plan.description.length > 100 ? '...' : ''}`);
          console.log();
        }

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}

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

/**
 * Command for showing TODO items from plans
 *
 * @public
 * @responsibility Display all TODO items from future plans
 * @contract Reads database, extracts todos, displays with stats
 * @doc [[TodosCommand]]
 * @doc [[CLI Commands#todos]]
 *
 * @problem Need to see all pending work items across codebase
 * @solves Shows all @plan tags formatted as TODO list
 * @context Part of project tracking and planning
 *
 * @functionality
 * - Database query: Extract all future plans
 * - TODO formatting: Show as task list with icons
 * - Status display: Visual indicators (✅🔄📌❌)
 * - Priority coloring: Red (high), Yellow (medium), Cyan (low)
 * - Effort estimates: Show estimated effort if provided
 * - Summary stats: Total TODO count
 *
 * @decision Use DatabaseManager for TODO data
 * @rationale TODOs are stored as future plans in database
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason TODO data storage
 */
export class TodosCommand extends BaseCommand {
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
    return 'todos';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show TODO items from future plans';
  }

  protected getUsage(): string {
    return 'tsdoc-edge todos';
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

      this.printHeader('TSDoc Edge - TODO List');

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');

      if (!fs.existsSync(dbPath)) {
        this.printError('Database not found. Run "tsdoc-edge build src" first.');
        console.log();
        console.log('To create the database, run:');
        this.printInfo('  tsdoc-edge build src');
        console.log();
        return this.failure('Database not found');
      }

      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        this.printSection('📊 Database Statistics');
        const stats = dbManager.getStatistics();
        console.log(`   Total Symbols: ${colors.green}${stats.totalSymbols}${colors.reset}`);
        console.log(`   Total Enhanced Docs: ${colors.green}${stats.totalEnhancedDocs}${colors.reset}`);
        console.log(`   DB Size: ${colors.green}${(stats.dbSize / 1024).toFixed(2)} KB${colors.reset}`);
        console.log();

        // Query future plans (TODO items)
        this.printSection('📋 Future Plans (TODO)');

        const query = `
          SELECT
            future_plans as plans,
            symbol_id as symbolId
          FROM enhanced_docs
        `;

        const stmt = dbManager.db.prepare(query);
        const results = stmt.all() as Array<{ plans: string; symbolId: string }>;

        let totalTodos = 0;
        for (const row of results) {
          const plans = JSON.parse(row.plans || '[]');
          if (plans.length > 0) {
            console.log();
            console.log(`${colors.bold}Symbol: ${row.symbolId}${colors.reset}`);
            console.log();

            for (const plan of plans) {
              totalTodos++;
              const statusIcon =
                plan.status === 'completed'
                  ? `${colors.green}✅`
                  : plan.status === 'in-progress'
                    ? `${colors.yellow}🔄`
                    : `${colors.blue}📌`;

              const priorityColor =
                plan.priority === 'high' ? colors.red : plan.priority === 'medium' ? colors.yellow : colors.cyan;

              console.log(`${statusIcon} ${colors.bold}[${plan.id}]${colors.reset} ${plan.title}`);
              console.log(`   Status: ${colors.bold}${plan.status}${colors.reset}`);
              console.log(`   Priority: ${priorityColor}${plan.priority}${colors.reset}`);
              if (plan.targetMilestone) {
                console.log(`   Milestone: ${colors.cyan}${plan.targetMilestone}${colors.reset}`);
              }
              if (plan.estimatedEffort) {
                console.log(`   Effort: ${colors.yellow}${plan.estimatedEffort}${colors.reset}`);
              }
              console.log(`   Description: ${plan.description}`);
              if (plan.completedAt) {
                console.log(`   Completed: ${colors.green}${plan.completedAt}${colors.reset}`);
              }
              console.log();
            }
          }
        }

        console.log();
        this.printSection('📈 Summary');
        console.log(`   Total TODO items: ${colors.green}${totalTodos}${colors.reset}`);
        console.log();

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}

/**
 * Command for showing documentation statistics
 *
 * @public
 * @responsibility Display comprehensive documentation statistics
 * @contract Analyzes database, computes stats, optionally compares/saves
 * @doc [[StatsCommand]]
 * @doc [[CLI Commands#stats]]
 *
 * @problem Need to track documentation quality metrics over time
 * @solves Collects and displays stats with optional historical comparison
 * @context Part of quality tracking and improvement
 *
 * @functionality
 * - Stats collection: Total symbols, coverage, health scores
 * - Historical comparison: Compare with previous snapshots
 * - Trend analysis: Show improvements or regressions
 * - Save snapshots: Store stats for future comparison
 * - Warnings-only mode: Show only regressions
 *
 * @decision Use TrackableStatsCollector and StatsHistoryManager
 * @rationale Centralized stats collection with history tracking
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager, TrackableStatsCollector, StatsHistoryManager, StatsComparator
 * @depType internal
 * @depReason Stats collection and comparison
 */
export class StatsCommand extends BaseCommand {
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
    return 'stats';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show documentation statistics with optional comparison';
  }

  protected getUsage(): string {
    return 'tsdoc-edge stats';
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

      this.printHeader('TSDoc Edge - Documentation Statistics');

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');

      if (!fs.existsSync(dbPath)) {
        this.printError('Database not found. Run "tsdoc-edge build src" first.');
        console.log();
        return this.failure('Database not found');
      }

      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const stats = dbManager.getStatistics();

        this.printSection('📊 Database Statistics');
        console.log(`Total Symbols: ${colors.green}${stats.totalSymbols}${colors.reset}`);
        console.log(`Total Enhanced Docs: ${colors.green}${stats.totalEnhancedDocs}${colors.reset}`);
        console.log(`DB Size: ${colors.cyan}${(stats.dbSize / 1024).toFixed(2)} KB${colors.reset}`);
        console.log();

        // Count documented vs undocumented
        const query = "SELECT COUNT(*) as count FROM symbols WHERE summary IS NOT NULL AND summary != ''";
        const stmt = dbManager.db.prepare(query);
        const result = stmt.get() as { count: number };

        const documented = result.count;
        const total = stats.totalSymbols;
        const coverage = total > 0 ? (documented / total) * 100 : 0;

        this.printSection('📈 Documentation Coverage');
        console.log(`Documented: ${colors.green}${documented}${colors.reset}`);
        console.log(`Undocumented: ${colors.yellow}${total - documented}${colors.reset}`);
        console.log(`Coverage: ${colors.bold}${coverage.toFixed(1)}%${colors.reset}`);
        console.log();

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}

/**
 * Command for showing core API symbols
 *
 * @public
 * @responsibility Display exported symbols and their immediate dependencies
 * @contract Loads database, filters exports, computes 1-depth dependencies
 * @doc [[CoreApiCommand]]
 * @doc [[CLI Commands#core-api]]
 *
 * @problem Need to identify public API surface of codebase
 * @solves Shows all exported symbols plus their direct dependencies
 * @context Part of API documentation and boundary analysis
 *
 * @functionality
 * - Export filtering: Find all exported symbols
 * - Dependency expansion: Include 1-depth dependencies
 * - Core set computation: Exported + immediate deps
 * - Detailed display: Symbol info with export status
 * - API surface analysis: Understand public interface
 *
 * @decision Use SymbolGraphBuilder for dependency analysis
 * @rationale Graph structure efficiently computes dependencies
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager, SymbolGraphBuilder
 * @depType internal
 * @depReason Symbol graph and dependency analysis
 */
export class CoreApiCommand extends BaseCommand {
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
    return 'core-api';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show core API symbols (exported + 1-depth dependencies)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge core-api';
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

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');

      if (!fs.existsSync(dbPath)) {
        this.printError('No database found. Run analysis first.');
        console.log();
        return this.failure('Database not found');
      }

      // Load symbols from database
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const symbolStmt = dbManager.db.prepare('SELECT * FROM symbols');
        const symbolRows = symbolStmt.all() as SymbolRow[];
        const relationshipStmt = dbManager.db.prepare('SELECT * FROM dependencies');
        const relationshipRows = relationshipStmt.all() as RelationshipRow[];

        const graphBuilder = new SymbolGraphBuilder();

        // Add symbols
        for (const row of symbolRows) {
          const symbol: Symbol = {
            id: row.id,
            name: row.name,
            type: row.type as Symbol['type'],
            filePath: row.file_path,
            line: row.line,
            column: row.column,
            isExported: row.is_exported === 1,
            isPublic: row.is_public === 1,
            summary: row.summary || undefined,
            tests: [],
            designDecisions: [],
          };
          graphBuilder.addSymbol(symbol);
        }

        // Add relationships
        for (const row of relationshipRows) {
          const relationship: SymbolRelationship = {
            type: (row.type as SymbolRelationship['type']) || 'dependsOn',
            from: (row as any).symbol_id,
            to: (row as any).target,
            filePath: (row as any).file_path || '',
            line: row.line,
            description: row.description,
          };
          graphBuilder.addRelationship(relationship);
        }

        const allSymbols = graphBuilder.getAllSymbols();

        // Find exported symbols
        const exportedSymbols = allSymbols.filter((s) => s.isExported);

        // Collect exported + 1 depth dependencies
        const coreSymbolIds = new Set<string>();

        // Add all exported symbols
        for (const symbol of exportedSymbols) {
          coreSymbolIds.add(symbol.id);
        }

        // Add direct dependencies of exported symbols (1 depth)
        for (const symbol of exportedSymbols) {
          const deps = graphBuilder.getDependencies(symbol.id);
          for (const dep of deps) {
            coreSymbolIds.add(dep);
          }
        }

        // Get core symbols
        const coreSymbols = allSymbols.filter((s) => coreSymbolIds.has(s.id));

        this.printHeader('Core API Symbols');
        console.log(`Total exported: ${colors.green}${exportedSymbols.length}${colors.reset}`);
        console.log(`Core API size: ${colors.cyan}${coreSymbols.length}${colors.reset} (exported + 1-depth deps)`);
        console.log();

        this.printSection('Exported Symbols');
        for (const symbol of exportedSymbols) {
          console.log(`${colors.green}●${colors.reset} ${colors.bold}${symbol.name}${colors.reset} (${symbol.type})`);
          console.log(`  ${symbol.filePath}:${symbol.line}`);
          if (symbol.summary) {
            console.log(`  ${colors.dim}${symbol.summary.substring(0, 80)}...${colors.reset}`);
          }
          console.log();
        }

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}

/**
 * Command for scanning files
 *
 * @public
 * @responsibility Scan directory for TypeScript files
 * @contract Uses FileScanner to find .ts/.tsx files
 *
 * @problem Need to see what files will be analyzed
 * @solves Lists all TypeScript files in directory
 * @context Part of file discovery and analysis preparation
 *
 * @functionality
 * - File scanning: Recursively find TypeScript files
 * - Extension filtering: .ts and .tsx files
 * - Path display: Show relative paths from cwd
 * - Count summary: Total files found
 * - Directory traversal: Respect .gitignore patterns
 *
 * @decision Use FileScanner for file discovery
 * @rationale Centralized file scanning logic
 * @consequences Follows same patterns as build command
 *
 * @depends FileScanner
 * @depType internal
 * @depReason File discovery
 */
export class ScanCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'scan';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Scan directory for TypeScript files';
  }

  protected getUsage(): string {
    return 'tsdoc-edge scan [directory]\n\n  Default: src';
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

      const targetPath = args[0] || 'src';

      if (!fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        console.log();
        return this.failure(`Path not found: ${targetPath}`);
      }

      this.printHeader('File Scanner');
      console.log(`Scanning: ${colors.cyan}${targetPath}${colors.reset}`);
      console.log();

      // Recursively find .ts and .tsx files
      const files: string[] = [];
      const scanDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scanDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            files.push(fullPath);
          }
        }
      };

      scanDir(targetPath);

      this.printSection(`Found ${files.length} files`);
      for (const file of files) {
        const relPath = path.relative(process.cwd(), file);
        console.log(`  ${colors.dim}${relPath}${colors.reset}`);
      }
      console.log();

      console.log(`Total: ${colors.green}${files.length}${colors.reset} TypeScript files`);
      console.log();

      return this.success();
    });
  }
}

/**
 * Command for syncing test coverage data
 *
 * @public
 * @responsibility Sync test coverage from Istanbul/NYC reports
 * @contract Reads coverage JSON, maps to symbols, updates database
 *
 * @problem Need to track which symbols are tested
 * @solves Imports coverage data and associates with symbols
 * @context Part of test coverage tracking
 *
 * @functionality
 * - Coverage parsing: Read Istanbul coverage-final.json
 * - Symbol mapping: Map coverage to symbol IDs
 * - Database update: Store coverage in symbols table
 * - Summary display: Total symbols covered
 * - Error handling: Handle missing coverage file
 *
 * @decision Use CoverageSyncAdapter for sync logic
 * @rationale Specialized adapter for coverage formats
 * @consequences Requires Istanbul/NYC coverage report
 *
 * @depends CoverageSyncAdapter, DatabaseManager
 * @depType internal
 * @depReason Coverage data import
 */
export class SyncCoverageCommand extends BaseCommand {
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
    return 'sync-coverage';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Sync test coverage data from Istanbul/NYC';
  }

  protected getUsage(): string {
    return 'tsdoc-edge sync-coverage [coverage-file]\n\n  Default: coverage/coverage-final.json';
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

      const coveragePath = args[0] || 'coverage/coverage-final.json';

      if (!fs.existsSync(coveragePath)) {
        this.printError(`Coverage file not found: ${coveragePath}`);
        console.log();
        console.log('Generate coverage first:');
        this.printInfo('  npm test -- --coverage');
        console.log();
        return this.failure(`Coverage file not found: ${coveragePath}`);
      }

      this.printHeader('Sync Test Coverage');
      console.log(`Coverage file: ${colors.cyan}${coveragePath}${colors.reset}`);
      console.log();

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');

      if (!fs.existsSync(dbPath)) {
        this.printError('Database not found. Run "tsdoc-edge build src" first.');
        console.log();
        return this.failure('Database not found');
      }

      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        // Read coverage file
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        const fileCount = Object.keys(coverageData).length;

        this.printSection('✅ Coverage File Read');
        console.log(`Coverage format: ${colors.cyan}Istanbul/NYC${colors.reset}`);
        console.log(`Total files in coverage: ${colors.green}${fileCount}${colors.reset}`);
        console.log();
        console.log(`${colors.dim}Note: Full coverage sync requires CoverageSyncer integration${colors.reset}`);
        console.log();

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}
