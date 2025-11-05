#!/usr/bin/env node

/**
 * TSDoc Edge CLI
 * Command-line interface for TSDoc Edge operations
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CodeHealthChecker } from './analyzer/CodeHealthChecker';
import { DocumentationAnalyzer } from './analyzer/DocumentationAnalyzer';
import { StatsComparator } from './analyzer/StatsComparator';
import { StatsHistoryManager } from './analyzer/StatsHistoryManager';
import { TrackableStatsCollector } from './analyzer/TrackableStatsCollector';
import { ConfigManager } from './config/ConfigManager';
import { RecursiveImprover } from './fixer/RecursiveImprover';
import { InsightDocGenerator } from './generator/InsightDocGenerator';
import { DepthTraverser } from './graph/DepthTraverser';
import { SymbolGraphBuilder } from './graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from './graph/SymbolSearchEngine';
import { FileScanner } from './scanner/FileScanner';
import { DatabaseManager } from './storage/DatabaseManager';
import { SymbolRegistryManager } from './storage/SymbolRegistryManager';
import type { AnalysisReport, CodeHealthMetrics, ImprovementSuggestion } from './types/analysis';
import type { Symbol, SymbolRelationship } from './types/graph';
import type { FuturePlan } from './types/tags';
import type { SymbolCoverage } from './analyzer/CoverageSyncAdapter';
import { ConnectivityValidator } from './validator/ConnectivityValidator';
import { BacklinkGenerator } from './doc-symbol/BacklinkGenerator';
import { DocumentSymbolParser } from './doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from './doc-symbol/DocumentSymbolRegistry';
import { TSDocSymbolParser } from './doc-symbol/TSDocSymbolParser';
import { SymbolReferenceGenerator } from './doc-symbol/SymbolReferenceGenerator';
import type { ParsedDocSymbols } from './types/feature';
import { SpecCompletenessValidator } from './spec/SpecCompletenessValidator';
import { SpecContentSimilarityChecker } from './spec/SpecContentSimilarityChecker';
import { SpecStatusManager } from './spec/SpecStatusManager';
import { SpecVersionManager } from './spec/SpecVersionManager';
import { UnusedDocumentDetector } from './spec/UnusedDocumentDetector';
import { ModuleSpecGenerator } from './generator/ModuleSpecGenerator';
import { ModuleSpecMarkdownFormatter } from './generator/ModuleSpecMarkdownFormatter';
import type { ModuleSpecResult } from './types/spec/module-spec';
import { UsageTracker } from './analytics/UsageTracker';
import type { CommandUsageEvent } from './types/analytics';

// Database row types
/**
 * SymbolRow interface
 * @public
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
 * RelationshipRow interface
 * @public
 */
interface RelationshipRow {
  type: string;
  from_id: string;
  to_id: string;
  file_path: string;
  line: number;
  description: string;
}

// Registry entry types (from SymbolRegistryManager)
/**
 * RegistryEntryNode interface
 * @public
 */
interface RegistryEntryNode {
  id: string;
  sourceRef: {
    type?: string;
    qualifiedName?: string;
  };
  children?: RegistryEntryNode[];
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

/**
 * printHeader function
 * @param title - title parameter
 * @returns void
 * @public
 */
function printHeader(title: string): void {
  console.log(colors.bold + colors.blue + '='.repeat(80) + colors.reset);
  console.log(colors.bold + colors.blue + title + colors.reset);
  console.log(colors.bold + colors.blue + '='.repeat(80) + colors.reset);
  console.log();
}

/**
 * printUsageAnalytics function
 * Display CLI usage analytics
 * @public
 */
function printUsageAnalytics(): void {
  printHeader('TSDoc Edge - Usage Analytics');

  const tracker = new UsageTracker();
  const subCommand = args[1];

  try {
    switch (subCommand) {
      case 'report':
      case undefined:
        // Show full report
        console.log(tracker.formatReport());
        break;

      case 'export': {
        const outputPath = args[2] || path.join(process.cwd(), 'usage-analytics.json');
        const success = tracker.exportToJSON(outputPath);
        if (success) {
          console.log(`${colors.green}✓ Analytics exported to: ${colors.cyan}${outputPath}${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ Failed to export analytics${colors.reset}`);
          process.exit(1);
        }
        break;
      }

      case 'clear': {
        const success = tracker.clear();
        if (success) {
          console.log(`${colors.green}✓ Analytics data cleared${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ Failed to clear analytics${colors.reset}`);
          process.exit(1);
        }
        break;
      }

      case 'errors': {
        const errors = tracker.getRecentErrors(20);
        if (errors.length === 0) {
          console.log(`${colors.green}No recent errors!${colors.reset}\n`);
        } else {
          console.log(`${colors.bold}Recent Errors (${errors.length}):${colors.reset}\n`);
          for (const error of errors) {
            const date = new Date(error.timestamp).toLocaleString();
            console.log(`${colors.red}✗${colors.reset} ${colors.bold}${error.command}${colors.reset} (${date})`);
            console.log(`  ${colors.dim}${error.cwd}${colors.reset}`);
            if (error.error) {
              console.log(`  ${colors.red}${error.error.split('\n')[0]}${colors.reset}`);
            }
            console.log();
          }
        }
        break;
      }

      case 'help':
        console.log('Usage: tsdoc-edge usage [command]\n');
        console.log('Commands:');
        console.log('  report (default)  Show full usage analytics report');
        console.log('  export [path]     Export analytics to JSON file');
        console.log('  clear             Clear all analytics data');
        console.log('  errors            Show recent command errors');
        console.log('  help              Show this help message');
        console.log();
        break;

      default:
        console.log(`${colors.red}Unknown subcommand: ${subCommand}${colors.reset}\n`);
        console.log('Run "tsdoc-edge usage help" for available commands\n');
        process.exit(1);
    }
  } catch (error) {
    console.log(`${colors.red}Error: ${error instanceof Error ? error.message : 'Unknown error'}${colors.reset}\n`);
    process.exit(1);
  }
}

/**
 * printSection function
 * @param title - title parameter
 * @returns void
 * @public
 */
function printSection(title: string): void {
  console.log(colors.bold + colors.cyan + title + colors.reset);
  console.log(colors.cyan + '-'.repeat(80) + colors.reset);
}

/**
 * printTodos function
 * @returns void
 * @public
 */
function printTodos(): void {
  printHeader('TSDoc Edge - TODO List');

  const dbPath = path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');

  if (!fs.existsSync(dbPath)) {
    console.log(
      `${colors.yellow}⚠️  Database not found. Run demo first: npm run demo${colors.reset}`
    );
    console.log();
    console.log('To create the database, run:');
    console.log(`${colors.cyan}  npm run demo${colors.reset}`);
    console.log();
    return;
  }

  const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');
  const dbManager = new DatabaseManager(dbPath, jsonlPath);

  try {
    printSection('📊 Database Statistics');
    const stats = dbManager.getStatistics();
    console.log(`   Total Symbols: ${colors.green}${stats.totalSymbols}${colors.reset}`);
    console.log(`   Total Enhanced Docs: ${colors.green}${stats.totalEnhancedDocs}${colors.reset}`);
    console.log(`   DB Size: ${colors.green}${(stats.dbSize / 1024).toFixed(2)} KB${colors.reset}`);
    console.log();

    // Query future plans (TODO items)
    printSection('📋 Future Plans (TODO)');

    const query = `
      SELECT
        future_plans as plans,
        symbol_id as symbolId
      FROM enhanced_docs
    `;

    const stmt = dbManager.db.prepare(query);
    const results = stmt.all() as Array<{ plans: string; symbolId: string }>;

    let totalTodos = 0;
    /**
     * row
     * @public
     */
    for (const row of results) {
      const plans = JSON.parse(row.plans || '[]');
      if (plans.length > 0) {
        console.log();
        console.log(`${colors.bold}Symbol: ${row.symbolId}${colors.reset}`);
        console.log();

        /**
         * plan
         * @public
         */
        for (const plan of plans) {
          totalTodos++;
          const statusIcon =
            plan.status === 'completed'
              ? `${colors.green}✅`
              : plan.status === 'in-progress'
                ? `${colors.yellow}🔄`
                : `${colors.blue}📌`;

          const priorityColor =
            plan.priority === 'high'
              ? colors.red
              : plan.priority === 'medium'
                ? colors.yellow
                : colors.cyan;

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
    printSection('📈 Summary');
    console.log(`   Total TODO items: ${colors.green}${totalTodos}${colors.reset}`);
    console.log();
    /**
     * error
     * @public
     */
  } catch (error) {
    console.error(`${colors.red}❌ Error reading database:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

/**
 * printIdCommands function
 * @returns void
 * @public
 */
function printIdCommands(): void {
  const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
  const manager = new SymbolRegistryManager(registryPath);

  const subcommand = process.argv[3] || 'help';

  switch (subcommand) {
    case 'new':
      {
        const filePath = process.argv[4];
        const symbolName = process.argv[5];

        if (!filePath || !symbolName) {
          console.log(
            `${colors.red}Usage: tsdoc-edge id new <file> <symbol> [options]${colors.reset}`
          );
          console.log();
          console.log('Options:');
          console.log('  --type=<type>           Symbol type (class, function, method, property)');
          console.log('  --parent=<id>           Parent symbol ID (for methods)');
          console.log('  --member-type=<type>    Member type (instance, static, inner)');
          console.log();
          console.log('Examples:');
          console.log('  tsdoc-edge id new src/processor.ts CSVDataProcessor');
          console.log(
            '  tsdoc-edge id new src/processor.ts loadCSV --type=method --parent=005 --member-type=instance'
          );
          console.log(
            '  tsdoc-edge id new src/processor.ts createDefault --type=method --parent=005 --member-type=static'
          );
          process.exit(1);
        }

        // Parse options
        const args = process.argv.slice(6);
        let type: string | undefined;
        let parent: string | undefined;
        let memberType: 'instance' | 'static' | 'inner' | undefined;

        /**
         * arg
         * @public
         */
        for (const arg of args) {
          if (arg.startsWith('--type=')) {
            type = arg.split('=')[1];
          } else if (arg.startsWith('--parent=')) {
            parent = arg.split('=')[1];
          } else if (arg.startsWith('--member-type=')) {
            memberType = arg.split('=')[1] as 'instance' | 'static' | 'inner';
          }
        }

        // Validate parent if provided
        if (parent) {
          const parentEntry = manager.findById(parent);
          if (!parentEntry) {
            console.log(`${colors.red}❌ Parent symbol not found: ${parent}${colors.reset}`);
            console.log();
            console.log('Use "tsdoc-edge id list" to see available symbols');
            process.exit(1);
          }
        }

        const id = manager.register({
          filePath,
          symbolName,
          type: type as Symbol['type'],
          memberOf: parent,
          memberType,
        });
        manager.save();

        const entry = manager.findById(id);

        console.log(`${colors.green}✅ ID generated:${colors.reset}`);
        console.log();
        console.log(`  ID: ${colors.bold}${id}${colors.reset}`);
        console.log(
          `  Qualified Name: ${colors.bold}${entry?.sourceRef.qualifiedName}${colors.reset}`
        );
        console.log(`  File: ${filePath}`);
        console.log(`  Symbol: ${symbolName}`);
        if (type) {
          console.log(`  Type: ${type}`);
        }
        if (parent) {
          console.log(`  Parent: ${parent}`);
        }
        if (memberType) {
          console.log(`  Member Type: ${memberType}`);
        }
        if (entry?.sourceRef.depth !== undefined) {
          console.log(`  Depth: ${entry.sourceRef.depth}`);
        }
        console.log();
        console.log('Add this to your TSDoc comment:');
        console.log(`${colors.cyan}  @id ${id}${colors.reset}`);
        if (parent) {
          console.log(
            colors.cyan +
              `  @memberof ${entry?.sourceRef.qualifiedName?.split(/[#.~]/)[0]}` +
              colors.reset
          );
        }
        console.log();
      }
      break;

    case 'list':
      {
        const entries = manager.getAll();

        printHeader('Symbol Registry');
        console.log(`Total entries: ${colors.green}${entries.length}${colors.reset}`);
        console.log();

        if (entries.length === 0) {
          console.log(
            `${colors.yellow}No entries yet. Use "tsdoc-edge id new" to create one.${colors.reset}`
          );
          console.log();
        } else {
          /**
           * entry
           * @public
           */
          for (const entry of entries) {
            console.log(
              `${colors.bold}${entry.id}${colors.reset} → ${entry.sourceRef.filePath}:${entry.sourceRef.symbolName}`
            );
            if (entry.tags && entry.tags.length > 0) {
              console.log(`  Tags: ${entry.tags.join(', ')}`);
            }
            if (entry.notes) {
              console.log(`  Notes: ${entry.notes}`);
            }
            console.log();
          }
        }
      }
      break;

    case 'find':
      {
        const id = process.argv[4];
        if (!id) {
          console.log(`${colors.red}Usage: tsdoc-edge id find <id>${colors.reset}`);
          process.exit(1);
        }

        const entry = manager.findById(id);
        if (!entry) {
          console.log(`${colors.red}❌ ID not found: ${id}${colors.reset}`);
          process.exit(1);
        }

        printHeader(`Symbol: ${id}`);
        console.log(`ID: ${colors.bold}${entry.id}${colors.reset}`);
        console.log(`File: ${entry.sourceRef.filePath}`);
        console.log(`Symbol: ${entry.sourceRef.symbolName}`);
        if (entry.sourceRef.type) {
          console.log(`Type: ${entry.sourceRef.type}`);
        }
        if (entry.sourceRef.line) {
          console.log(`Line: ${entry.sourceRef.line}`);
        }
        console.log(`Created: ${entry.createdAt}`);
        console.log(`Updated: ${entry.updatedAt}`);
        if (entry.tags && entry.tags.length > 0) {
          console.log(`Tags: ${entry.tags.join(', ')}`);
        }
        if (entry.notes) {
          console.log(`Notes: ${entry.notes}`);
        }
        console.log();
      }
      break;

    case 'stats':
      {
        const stats = manager.getStats();

        printHeader('Registry Statistics');
        console.log(`Total Entries: ${colors.green}${stats.totalEntries}${colors.reset}`);
        console.log(`Files: ${colors.cyan}${stats.fileCount}${colors.reset}`);
        console.log(`Tags: ${colors.cyan}${stats.tagCount}${colors.reset}`);
        console.log();
        console.log(`${colors.bold}ID Generator Stats:${colors.reset}`);
        console.log(`  Mode: ${stats.idStats.mode}`);
        console.log(`  Length: ${stats.idStats.length} chars`);
        console.log(`  Used: ${stats.idStats.used}`);
        console.log(`  Capacity: ${stats.idStats.capacity}`);
        console.log(`  Utilization: ${stats.idStats.utilization.toFixed(2)}%`);
        console.log();
      }
      break;
    default:
      printHeader('ID Management Commands');
      console.log('Usage:');
      console.log('  tsdoc-edge id <subcommand>');
      console.log();
      console.log('Subcommands:');
      console.log('  new <file> <symbol>  Generate new ID for a symbol');
      console.log('  list                 List all registered IDs');
      console.log('  find <id>            Find source location by ID');
      console.log('  stats                Show registry statistics');
      console.log();
      console.log('Examples:');
      console.log('  tsdoc-edge id new src/utils.ts parseData');
      console.log('  tsdoc-edge id list');
      console.log('  tsdoc-edge id find a3f');
      console.log();
      break;
  }
}

/**
 * printInit function
 * @returns void
 * @public
 */
function printInit(): void {
  printHeader('TSDoc Edge - Initialize Project');

  const hasForce = process.argv.includes('--force');
  const nameArg = process.argv.find((arg) => arg.startsWith('--name='));
  const versionArg = process.argv.find((arg) => arg.startsWith('--version='));

  const configManager = ConfigManager.getInstance();

  if (configManager.exists() && !hasForce) {
    console.log(`${colors.yellow}⚠️  Configuration file already exists at:${colors.reset}`);
    console.log(`${colors.cyan}   ${configManager.getConfigPath()}${colors.reset}`);
    console.log();
    console.log('Use --force to overwrite the existing configuration.');
    console.log();
    return;
  }

  const projectName = nameArg ? nameArg.split('=')[1] : path.basename(process.cwd());
  const projectVersion = versionArg ? versionArg.split('=')[1] : '1.0.0';

  try {
    configManager.init(
      {
        project: {
          name: projectName,
          version: projectVersion,
        },
      },
      hasForce
    );

    console.log(`${colors.green}✅ Configuration file created successfully!${colors.reset}`);
    console.log();
    console.log('Configuration file:');
    console.log(`${colors.cyan}   ${configManager.getConfigPath()}${colors.reset}`);
    console.log();

    const config = configManager.get();
    console.log('Project Settings:');
    console.log(`   Name: ${colors.bold}${config.project.name}${colors.reset}`);
    console.log(`   Version: ${colors.bold}${config.project.version}${colors.reset}`);
    console.log();

    console.log('Storage Paths:');
    console.log(`   Comments: ${colors.cyan}${config.paths.commentsDir}${colors.reset}`);
    console.log(`   Database: ${colors.cyan}${config.paths.databasePath}${colors.reset}`);
    console.log(`   JSONL: ${colors.cyan}${config.paths.jsonlDir}${colors.reset}`);
    console.log(`   Output: ${colors.cyan}${config.paths.outputDir}${colors.reset}`);
    console.log();

    console.log('Creating directories...');
    configManager.ensureDirectories();
    console.log(`${colors.green}✅ Directories created successfully!${colors.reset}`);
    console.log();

    console.log('Next steps:');
    console.log('  1. Customize your configuration in .tsdoc.config.json');
    console.log('  2. Generate symbol IDs: tsdoc-edge id new <file> <symbol>');
    console.log('  3. Validate your project: tsdoc-edge validate');
    console.log();
    /**
     * error
     * @public
     */
  } catch (error) {
    console.error(`${colors.red}❌ Failed to initialize configuration:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * Build database from source files
 * @returns void
 * @public
 */
function printBuild(): void {
  const args = process.argv.slice(3);
  const targetPath = args[0] || 'src';

  printHeader('TSDoc Edge - Build Database');

  if (!fs.existsSync(targetPath)) {
    console.log(`${colors.red}❌ Path not found: ${targetPath}${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.cyan}Building database from: ${targetPath}${colors.reset}`);
  console.log();

  // Setup paths
  const config = ConfigManager.getInstance();
  const dbPath = path.join(process.cwd(), config.get().paths.databasePath || '.tsdoc.db');
  const jsonlPath = path.join(process.cwd(), config.get().paths.jsonlDir || 'docs/data');
  const registryPath = path.join(jsonlPath, 'registry.jsonl');

  // Ensure jsonl directory exists
  if (!fs.existsSync(jsonlPath)) {
    fs.mkdirSync(jsonlPath, { recursive: true });
  }

  // Initialize managers
  const dbManager = new DatabaseManager(dbPath, jsonlPath);
  const registryManager = new SymbolRegistryManager(registryPath);

  // Create scanner
  const scanner = new FileScanner(registryManager, dbManager, {
    rootDir: targetPath,
    include: ['**/*.ts', '**/*.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts'],
  });

  // Run scan
  console.log(`${colors.cyan}Scanning TypeScript files...${colors.reset}`);

  const startTime = Date.now();
  scanner.scan().then((result) => {
    const duration = Date.now() - startTime;

    console.log();
    console.log(`${colors.green}✅ Database build complete${colors.reset}`);
    console.log();
    console.log(`${colors.bold}Statistics:${colors.reset}`);
    console.log(`  Files scanned: ${colors.cyan}${result.filesScanned}${colors.reset}`);
    console.log(`  Symbols found: ${colors.cyan}${result.symbolsFound}${colors.reset}`);
    console.log(`  Symbols inserted: ${colors.green}${result.symbolsInserted}${colors.reset}`);
    console.log(`  Duration: ${colors.cyan}${duration}ms${colors.reset}`);
    console.log();
    console.log(`${colors.dim}Database: ${dbPath}${colors.reset}`);

    if (result.errors.length > 0) {
      console.log();
      console.log(`${colors.yellow}⚠️  Errors (${result.errors.length}):${colors.reset}`);
      result.errors.slice(0, 10).forEach(err => {
        console.log(`  ${colors.dim}${err}${colors.reset}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ${colors.dim}... and ${result.errors.length - 10} more${colors.reset}`);
      }
    }

    console.log();
  }).catch((error) => {
    console.log();
    console.log(`${colors.red}❌ Build failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

/**
 * printHelp function
 * @returns void
 * @public
 */
function printHelp(): void {
  printHeader('TSDoc Edge CLI - Help');

  console.log('Usage:');
  console.log('  tsdoc-edge <command>');
  console.log();
  console.log('Commands:');
  console.log('  init [options]          Initialize project configuration');
  console.log('  build [path]            Build symbol database from source files (default: src)');
  console.log('  id                      Manage symbol IDs (new, list, find, stats)');
  console.log('  find-method <name>      Search symbol by qualified name (e.g., Class#method)');
  console.log('  tree                    Show symbol hierarchy tree');
  console.log('  deps <id>               Show dependencies of a symbol');
  console.log('  used-by <id>            Show what uses this symbol');
  console.log('  orphans                 Find orphaned symbols');
  console.log('  undocumented            Find symbols without documentation');
  console.log('  untested                Find symbols without tests');
  console.log('  without-responsibility  Find symbols without responsibility definitions');
  console.log('  without-contract        Find symbols without contract specifications');
  console.log(
    '  plans [--status=X]      Show future plans (filter by status: planned/in-progress/completed)'
  );
  console.log('  todo, todos             Show future plans (TODO list) from the database');
  console.log(
    '  validate                Generate detailed validation report with actionable items'
  );
  console.log('  analyze [path]          Analyze code quality and documentation (default: src)');
  console.log('  health [path]           Check overall code health (default: src)');
  console.log('  suggest [path]          Generate improvement suggestions (default: src)');
  console.log('  fix [path]              Fix documentation issues (default: src)');
  console.log('  improve                 Recursively improve documentation to target score');
  console.log(
    '  stats [path]            Show documentation statistics with tracking (default: src)'
  );
  console.log('  core-api                Show core API surface (exported + 1 depth dependencies)');
  console.log('  scan [options]          Scan and document symbol graph by depth');
  console.log('  index-docs [dir]        Index [[]] document symbols (default: docs)');
  console.log('    --file=<path>         Update index for a single file (incremental)');
  console.log('  validate-docs [dir]     Validate document symbol SSOT (default: docs)');
  console.log('  update-backlinks [path] Update backlinks in documents');
  console.log('  find-doc <symbol>       Find document symbol and show references');
  console.log('  sync-coverage [path]    Sync test coverage to symbols (default: coverage/coverage-final.json)');
  console.log('  check-links [path]      Check for broken links in enhanced docs (default: src)');
  console.log('  parse <path>            Parse enhanced documentation from TypeScript files');
  console.log('  generate-docs <path> [outdir]  Generate markdown from enhanced docs (default output: ./docs/generated)');
  console.log('  generate-spec <file> <symbol> [outdir]  Generate 7-part module specification (default output: ./docs/specs)');
  console.log('  generate-specs-batch <dir> [options]  Generate specs for all public symbols in directory');
  console.log('    --min-confidence=N    Only generate specs with confidence >= N% (default: 0)');
  console.log('    --include-private     Include private symbols (default: false)');
  console.log('    --recursive           Process subdirectories (default: true)');
  console.log('  install-hook            Install git pre-commit hook for documentation checks');
  console.log('  uninstall-hook          Uninstall git pre-commit hook');
  console.log('  help                    Show this help message');
  console.log();
  console.log('Specification Management:');
  console.log('  validate-spec [dir]     Validate specification completeness (default: managed)');
  console.log('  check-duplicates [dir]  Check for duplicate content across specs (default: managed)');
  console.log('  spec-status             Manage specification status workflow');
  console.log('    show <file>           Show current status and allowed transitions');
  console.log('    promote <file> <status>  Promote document to new status');
  console.log('    list-ready [dir]      List documents ready for promotion');
  console.log('    stats [dir]           Show status distribution');
  console.log('  find-unused-docs [dir]  Find unused and stale documents (default: managed)');
  console.log('  spec-history <file>     Show version history of a specification');
  console.log('  spec-diff <file> <v1> <v2>  Compare two versions of a specification');
  console.log('  spec-bump <file> <type> Bump specification version (major|minor|patch)');
  console.log();
  console.log('Init Options:');
  console.log('  --name=<name>           Project name (default: current directory name)');
  console.log('  --version=<version>     Project version (default: 1.0.0)');
  console.log('  --force                 Overwrite existing configuration');
  console.log();
  console.log('Scan Options:');
  console.log('  --depth=<N>             Maximum depth to traverse (default: 2)');
  console.log('  --entry=<name>          Entry point symbol name or ID');
  console.log('  --direction=<dir>       Traversal direction: dependencies, dependents, or both (default: dependencies)');
  console.log('  --output=<file>         Output file path');
  console.log('  --save, -s              Save to default generated directory');
  console.log('  --group-by-category     Group symbols by category');
  console.log();
  console.log('Stats Options:');
  console.log('  --compare, -c           Compare with previous stats');
  console.log('  --save, -s              Save statistics history');
  console.log('  --history=<file>        Custom history file path');
  console.log('  --warnings-only, -w     Show only warnings');
  console.log();
  console.log('Examples:');
  console.log('  tsdoc-edge init');
  console.log('  tsdoc-edge init --name=my-project --version=2.0.0');
  console.log('  tsdoc-edge init --force');
  console.log('  tsdoc-edge id new src/utils.ts parseData');
  console.log(
    '  tsdoc-edge id new src/Service.ts createUser --type=method --parent=005 --member-type=instance'
  );
  console.log('  tsdoc-edge id list');
  console.log('  tsdoc-edge tree');
  console.log('  tsdoc-edge find-method UserService#createUser');
  console.log('  tsdoc-edge deps 001');
  console.log('  tsdoc-edge used-by 000');
  console.log('  tsdoc-edge orphans');
  console.log('  tsdoc-edge undocumented');
  console.log('  tsdoc-edge plans');
  console.log('  tsdoc-edge plans --status=planned');
  console.log('  tsdoc-edge validate');
  console.log('  tsdoc-edge analyze src');
  console.log('  tsdoc-edge analyze src --include-children --min-score=80');
  console.log('  tsdoc-edge health');
  console.log('  tsdoc-edge suggest src --limit=30');
  console.log('  tsdoc-edge fix src --dry-run');
  console.log('  tsdoc-edge stats');
  console.log('  tsdoc-edge stats --save');
  console.log('  tsdoc-edge stats --compare');
  console.log('  tsdoc-edge core-api');
  console.log('  tsdoc-edge scan --depth=2 --output=docs/INSIGHTS.md');
  console.log('  tsdoc-edge scan --save --group-by-category');
  console.log('  tsdoc-edge scan --entry=TSDocEdge --depth=3 --save');
  console.log('  tsdoc-edge scan --entry=UserService --direction=dependencies --depth=5');
  console.log('  tsdoc-edge scan --entry=UserService --direction=dependents --depth=3');
  console.log('  tsdoc-edge scan --direction=both --depth=2');
  console.log('  tsdoc-edge scan --group-by-category --output=docs/FEATURES.md');
  console.log('  tsdoc-edge fix src/myFile.ts --min-score=80');
  console.log('  tsdoc-edge improve --target=90 --verbose');
  console.log('  tsdoc-edge improve --target=80 --max-iterations=5 --dry-run');
  console.log('  tsdoc-edge index-docs docs');
  console.log('  tsdoc-edge index-docs --file=docs/API.md');
  console.log('  tsdoc-edge validate-docs');
  console.log('  tsdoc-edge update-backlinks docs/API.md');
  console.log('  tsdoc-edge find-doc UserService');
  console.log('  tsdoc-edge sync-coverage');
  console.log('  tsdoc-edge sync-coverage coverage/coverage-final.json');
  console.log('  tsdoc-edge check-links');
  console.log('  tsdoc-edge check-links src');
  console.log('  tsdoc-edge generate-spec src/analyzer/CodeHealthChecker.ts CodeHealthChecker');
  console.log('  tsdoc-edge generate-spec src/parser/TSDocParser.ts parseComment ./managed/specs');
  console.log('  tsdoc-edge help');
  console.log();
}

/**
 * printDependencies function
 * @returns void
 * @public
 */
function printDependencies(): void {
  const id = process.argv[3];
  if (!id) {
    console.log(`${colors.red}Usage: tsdoc-edge deps <id>${colors.reset}`);
    process.exit(1);
  }

  const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
  if (!fs.existsSync(registryPath)) {
    console.log(
      `${colors.yellow}⚠️  No registry found. Run "tsdoc-edge id new" first.${colors.reset}`
    );
    process.exit(1);
  }

  const manager = new SymbolRegistryManager(registryPath);
  const entry = manager.findById(id);

  if (!entry) {
    console.log(`${colors.red}❌ Symbol not found: ${id}${colors.reset}`);
    process.exit(1);
  }

  printHeader(`Dependencies of ${id} (${entry.sourceRef.symbolName})`);

  const deps = manager.getDependencies(id);

  if (deps.length === 0) {
    console.log(`${colors.yellow}No dependencies${colors.reset}`);
    console.log();
  } else {
    /**
     * dep
     * @public
     */
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
}

/**
 * printUsedBy function
 * @returns void
 * @public
 */
function printUsedBy(): void {
  const id = process.argv[3];
  if (!id) {
    console.log(`${colors.red}Usage: tsdoc-edge used-by <id>${colors.reset}`);
    process.exit(1);
  }

  const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
  if (!fs.existsSync(registryPath)) {
    console.log(`${colors.yellow}⚠️  No registry found.${colors.reset}`);
    process.exit(1);
  }

  const manager = new SymbolRegistryManager(registryPath);
  const entry = manager.findById(id);

  if (!entry) {
    console.log(`${colors.red}❌ Symbol not found: ${id}${colors.reset}`);
    process.exit(1);
  }

  printHeader(`Used By ${id} (${entry.sourceRef.symbolName})`);

  const usedBy = manager.getUsedBy(id);

  if (usedBy.length === 0) {
    console.log(`${colors.yellow}Not used by any symbol${colors.reset}`);
    console.log();
  } else {
    /**
     * user
     * @public
     */
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
}

/**
 * Print reverse dependencies (who uses this symbol)
 * Uses DatabaseManager with AST-extracted dependencies
 * @returns void
 * @public
 */
function printWhoUses(): void {
  const symbolName = process.argv[3];
  if (!symbolName) {
    console.log(`${colors.red}Usage: tsdoc-edge who-uses <symbol-name>${colors.reset}`);
    console.log();
    console.log('Examples:');
    console.log('  tsdoc-edge who-uses DocumentationAnalyzer');
    console.log('  tsdoc-edge who-uses TSDocParser');
    console.log('  tsdoc-edge who-uses DatabaseManager');
    console.log();
    process.exit(1);
  }

  const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
  if (!fs.existsSync(dbPath)) {
    console.log(`${colors.yellow}⚠️  Database not found. Run: npx ts-node demo/analyze-self.ts${colors.reset}`);
    console.log();
    process.exit(1);
  }

  const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
  const dbManager = new DatabaseManager(dbPath, jsonlPath);

  try {
    // Find symbols matching the name
    const symbols = dbManager.db.prepare(
      'SELECT * FROM symbols WHERE name = ? OR name LIKE ?'
    ).all(symbolName, `${symbolName}.%`) as SymbolRow[];

    if (symbols.length === 0) {
      console.log(`${colors.red}❌ Symbol not found: ${symbolName}${colors.reset}`);
      console.log();
      console.log('Tip: Try searching for the symbol first:');
      console.log(`  sqlite3 .tsdoc/symbols.db "SELECT name, file_path FROM symbols WHERE name LIKE '%${symbolName}%'"`);
      console.log();
      dbManager.close();
      process.exit(1);
    }

    // Show all matching symbols
    if (symbols.length > 1) {
      console.log(`${colors.cyan}Found ${symbols.length} symbols matching "${symbolName}":${colors.reset}`);
      console.log();
      for (const sym of symbols) {
        console.log(`  • ${sym.name} (${sym.type}) in ${sym.file_path}`);
      }
      console.log();
    }

    // Analyze each symbol
    for (const symbol of symbols) {
      printHeader(`Who Uses: ${symbol.name}`);

      console.log(`${colors.cyan}Symbol Info:${colors.reset}`);
      console.log(`  Name: ${symbol.name}`);
      console.log(`  Type: ${symbol.type}`);
      console.log(`  File: ${symbol.file_path}:${symbol.line}`);
      console.log(`  Exported: ${symbol.is_exported ? '✅ Yes' : '❌ No'}`);
      if (symbol.summary) {
        console.log(`  Summary: ${symbol.summary.substring(0, 80)}${symbol.summary.length > 80 ? '...' : ''}`);
      }
      console.log();

      const dependents = dbManager.getDependents(symbol.id);

      if (dependents.length === 0) {
        console.log(`${colors.yellow}⚠️  Not used by any symbol${colors.reset}`);
        console.log();

        if (!symbol.is_exported) {
          console.log(`${colors.dim}Note: This symbol is not exported, so it can only be used within its own file.${colors.reset}`);
          console.log();
        }
      } else {
        console.log(`${colors.green}✅ Used by ${dependents.length} symbol(s):${colors.reset}`);
        console.log();

        // Group by file
        const byFile = new Map<string, SymbolRow[]>();
        for (const depId of dependents) {
          const depSymbol = dbManager.getSymbol(depId);
          if (depSymbol) {
            const depRow = dbManager.db.prepare('SELECT * FROM symbols WHERE id = ?').get(depId) as SymbolRow;
            const fileSymbols = byFile.get(depSymbol.filePath) || [];
            fileSymbols.push(depRow);
            byFile.set(depSymbol.filePath, fileSymbols);
          }
        }

        // Print grouped by file
        for (const [filePath, fileSymbols] of byFile.entries()) {
          console.log(`${colors.bold}📄 ${filePath}${colors.reset}`);
          for (const depSymbol of fileSymbols) {
            console.log(`   ← ${depSymbol.name} (${depSymbol.type})`);
            if (depSymbol.summary) {
              console.log(`      ${colors.dim}${depSymbol.summary.substring(0, 60)}${depSymbol.summary.length > 60 ? '...' : ''}${colors.reset}`);
            }
          }
          console.log();
        }

        console.log(`${colors.cyan}Total: ${dependents.length} usage(s) across ${byFile.size} file(s)${colors.reset}`);
        console.log();
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

/**
 * printOrphans function
 * @returns void
 * @public
 */
function printOrphans(): void {
  const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
  if (!fs.existsSync(registryPath)) {
    console.log(`${colors.yellow}⚠️  No registry found.${colors.reset}`);
    process.exit(1);
  }

  const manager = new SymbolRegistryManager(registryPath);
  const orphans = manager.findOrphans();

  printHeader('Orphaned Symbols');

  if (orphans.length === 0) {
    console.log(`${colors.green}✅ No orphaned symbols found${colors.reset}`);
    console.log();
  } else {
    console.log(`${colors.yellow}Found ${orphans.length} orphaned symbols:${colors.reset}`);
    console.log();

    /**
     * id
     * @public
     */
    for (const id of orphans) {
      const entry = manager.findById(id);
      if (entry) {
        console.log(`${colors.bold}${id}${colors.reset} → ${entry.sourceRef.symbolName}`);
        console.log(`  Location: ${entry.sourceRef.filePath}`);
        console.log();
      }
    }
  }
}

/**
 * printUndocumented function
 * @returns void
 * @public
 */
function printUndocumented(): void {
  printHeader('Undocumented Symbols');

  const dbPath = path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');

  if (!fs.existsSync(dbPath)) {
    console.log(
      `${colors.yellow}⚠️  Database not found. Run demo first: npm run demo${colors.reset}`
    );
    console.log();
    return;
  }

  const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');
  const dbManager = new DatabaseManager(dbPath, jsonlPath);

  try {
    // Get all symbols from database
    const query = 'SELECT * FROM symbols';
    const stmt = dbManager.db.prepare(query);
    const rows = stmt.all() as SymbolRow[];

    // Build symbol graph
    const graphBuilder = new SymbolGraphBuilder();

    /**
     * row
     * @public
     */
    for (const row of rows) {
      const symbol: Symbol = {
        id: row.id,
        name: row.name,
        type: row.type as Symbol['type'],
        filePath: row.file_path,
        line: row.line,
        column: row.column,
        isExported: row.is_exported === 1,
        isPublic: row.is_public === 1,
        summary: row.summary ?? undefined,
        tests: [],
        designDecisions: [],
      };
      graphBuilder.addSymbol(symbol);
    }

    // Search for undocumented symbols
    const searchEngine = new SymbolSearchEngine(graphBuilder);
    const undocumented = searchEngine.findUndocumented();

    if (undocumented.length === 0) {
      console.log(`${colors.green}✅ All symbols are documented!${colors.reset}`);
      console.log();
    } else {
      console.log(
        `${colors.yellow}Found ${undocumented.length} undocumented symbols:${colors.reset}`
      );
      console.log();

      /**
       * symbol
       * @public
       */
      for (const symbol of undocumented) {
        console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
        console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
        console.log();
      }
    }
    /**
     * error
     * @public
     */
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

/**
 * printUntested function
 * @returns void
 * @public
 */
function printUntested(): void {
  printHeader('Untested Symbols');

  const dbPath = path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');

  if (!fs.existsSync(dbPath)) {
    console.log(
      `${colors.yellow}⚠️  Database not found. Run demo first: npm run demo${colors.reset}`
    );
    console.log();
    return;
  }

  const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');
  const dbManager = new DatabaseManager(dbPath, jsonlPath);

  try {
    const query = 'SELECT * FROM symbols';
    const stmt = dbManager.db.prepare(query);
    const rows = stmt.all() as SymbolRow[];

    const graphBuilder = new SymbolGraphBuilder();

    /**
     * row
     * @public
     */
    for (const row of rows) {
      const symbol: Symbol = {
        id: row.id,
        name: row.name,
        type: row.type as Symbol['type'],
        filePath: row.file_path,
        line: row.line,
        column: row.column,
        isExported: row.is_exported === 1,
        isPublic: row.is_public === 1,
        summary: row.summary ?? undefined,
        tests: [],
        designDecisions: [],
      };
      graphBuilder.addSymbol(symbol);
    }

    const searchEngine = new SymbolSearchEngine(graphBuilder);
    const untested = searchEngine.findUntested();

    if (untested.length === 0) {
      console.log(`${colors.green}✅ All symbols have tests!${colors.reset}`);
      console.log();
    } else {
      console.log(`${colors.yellow}Found ${untested.length} untested symbols:${colors.reset}`);
      console.log();

      /**
       * symbol
       * @public
       */
      for (const symbol of untested) {
        console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
        console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
        console.log();
      }
    }
    /**
     * error
     * @public
     */
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

/**
 * printWithoutResponsibility function
 * @returns void
 * @public
 */
function printWithoutResponsibility(): void {
  printHeader('Symbols Without Responsibility');

  const dbPath = path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');

  if (!fs.existsSync(dbPath)) {
    console.log(
      `${colors.yellow}⚠️  Database not found. Run demo first: npm run demo${colors.reset}`
    );
    console.log();
    return;
  }

  const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');
  const dbManager = new DatabaseManager(dbPath, jsonlPath);

  try {
    const query = 'SELECT * FROM symbols';
    const stmt = dbManager.db.prepare(query);
    const rows = stmt.all() as SymbolRow[];

    const graphBuilder = new SymbolGraphBuilder();

    /**
     * row
     * @public
     */
    for (const row of rows) {
      const symbol: Symbol = {
        id: row.id,
        name: row.name,
        type: row.type as Symbol['type'],
        filePath: row.file_path,
        line: row.line,
        column: row.column,
        isExported: row.is_exported === 1,
        isPublic: row.is_public === 1,
        summary: row.summary ?? undefined,
        tests: [],
        designDecisions: [],
      };
      graphBuilder.addSymbol(symbol);
    }

    const searchEngine = new SymbolSearchEngine(graphBuilder);
    const withoutResponsibility = searchEngine.findWithoutResponsibility();

    if (withoutResponsibility.length === 0) {
      console.log(`${colors.green}✅ All symbols have responsibility definitions!${colors.reset}`);
      console.log();
    } else {
      console.log(
        colors.yellow +
          `Found ${withoutResponsibility.length} symbols without responsibility:` +
          colors.reset
      );
      console.log();

      /**
       * symbol
       * @public
       */
      for (const symbol of withoutResponsibility) {
        console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
        console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
        console.log();
      }
    }
    /**
     * error
     * @public
     */
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

/**
 * printWithoutContract function
 * @returns void
 * @public
 */
function printWithoutContract(): void {
  printHeader('Symbols Without Contract');

  const dbPath = path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');

  if (!fs.existsSync(dbPath)) {
    console.log(
      `${colors.yellow}⚠️  Database not found. Run demo first: npm run demo${colors.reset}`
    );
    console.log();
    return;
  }

  const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');
  const dbManager = new DatabaseManager(dbPath, jsonlPath);

  try {
    const query = 'SELECT * FROM symbols';
    const stmt = dbManager.db.prepare(query);
    const rows = stmt.all() as SymbolRow[];

    const graphBuilder = new SymbolGraphBuilder();

    /**
     * row
     * @public
     */
    for (const row of rows) {
      const symbol: Symbol = {
        id: row.id,
        name: row.name,
        type: row.type as Symbol['type'],
        filePath: row.file_path,
        line: row.line,
        column: row.column,
        isExported: row.is_exported === 1,
        isPublic: row.is_public === 1,
        summary: row.summary ?? undefined,
        tests: [],
        designDecisions: [],
      };
      graphBuilder.addSymbol(symbol);
    }

    const searchEngine = new SymbolSearchEngine(graphBuilder);
    const withoutContract = searchEngine.findWithoutContract();

    if (withoutContract.length === 0) {
      console.log(`${colors.green}✅ All symbols have contract specifications!${colors.reset}`);
      console.log();
    } else {
      console.log(
        `${colors.yellow}Found ${withoutContract.length} symbols without contract:${colors.reset}`
      );
      console.log();

      /**
       * symbol
       * @public
       */
      for (const symbol of withoutContract) {
        console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
        console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
        console.log();
      }
    }
    /**
     * error
     * @public
     */
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

/**
 * printFindMethod function
 * @returns void
 * @public
 */
function printFindMethod(): void {
  const query = process.argv[3];

  if (!query) {
    console.log(`${colors.red}Usage: tsdoc-edge find-method <qualified-name>${colors.reset}`);
    console.log();
    console.log('Examples:');
    console.log('  tsdoc-edge find-method DataProcessor#loadCSV');
    console.log('  tsdoc-edge find-method UserService.validateEmail');
    console.log('  tsdoc-edge find-method processData');
    process.exit(1);
  }

  const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
  if (!fs.existsSync(registryPath)) {
    console.log(`${colors.yellow}⚠️  No registry found.${colors.reset}`);
    process.exit(1);
  }

  const manager = new SymbolRegistryManager(registryPath);

  printHeader(`Search: ${query}`);

  // Try exact match first
  let entry = manager.findByQualifiedName(query);

  if (!entry) {
    // Try partial search
    const results = manager.search(query);

    if (results.length === 0) {
      console.log(`${colors.yellow}No symbols found${colors.reset}`);
      console.log();
    } else if (results.length === 1) {
      entry = results[0];
    } else {
      console.log(`Found ${colors.bold}${results.length}${colors.reset} matching symbols:`);
      console.log();

      /**
       * result
       * @public
       */
      for (const result of results) {
        console.log(
          `${colors.bold}${result.id}${colors.reset} → ${result.sourceRef.qualifiedName}`
        );
        console.log(`  File: ${result.sourceRef.filePath}:${result.sourceRef.line || '?'}`);
        console.log(`  Type: ${result.sourceRef.type}`);
        console.log();
      }
      return;
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
      /**
       * child
       * @public
       */
      for (const child of children) {
        console.log(`  ${child.id} → ${child.sourceRef.qualifiedName}`);
      }
      console.log();
    }
  }
}

/**
 * printTree function
 * @returns void
 * @public
 */
function printTree(): void {
  const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
  if (!fs.existsSync(registryPath)) {
    console.log(`${colors.yellow}⚠️  No registry found.${colors.reset}`);
    process.exit(1);
  }

  const manager = new SymbolRegistryManager(registryPath);
  const hierarchy = manager.buildHierarchy();

  printHeader('Symbol Hierarchy Tree');

  if (hierarchy.length === 0) {
    console.log(`${colors.yellow}No symbols registered${colors.reset}`);
    console.log();
    return;
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
}

/**
 * printPlans function
 * @returns void
 * @public
 */
function printPlans(): void {
  const status = process.argv[3]; // Optional: --status=planned

  printHeader('Future Plans');

  const dbPath = path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');

  if (!fs.existsSync(dbPath)) {
    console.log(
      `${colors.yellow}⚠️  Database not found. Run demo first: npm run demo${colors.reset}`
    );
    console.log();
    return;
  }

  const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');
  const dbManager = new DatabaseManager(dbPath, jsonlPath);

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

    /**
     * row
     * @public
     */
    for (const row of results) {
      const plans = JSON.parse(row.plans || '[]');
      /**
       * plan
       * @public
       */
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
      console.log(`${colors.green}✅ No future plans found${colors.reset}`);
      console.log();
    } else {
      console.log(`Total plans: ${colors.bold}${filteredPlans.length}${colors.reset}`);
      console.log();

      /**
       * { plan, symbolId }
       * @public
       */
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
          plan.priority === 'high'
            ? colors.red
            : plan.priority === 'medium'
              ? colors.yellow
              : colors.cyan;

        console.log(`${statusIcon} ${colors.bold}${plan.id}${colors.reset} - ${plan.title}`);
        console.log(`   Symbol: ${symbolId}`);
        console.log(`   Status: ${colors.bold}${plan.status}${colors.reset}`);

        if (plan.priority) {
          console.log(`   Priority: ${priorityColor}${plan.priority}${colors.reset}`);
        }

        if (plan.targetSymbol) {
          console.log(
            `   Target: ${plan.targetSymbol}${plan.targetMethod ? `#${plan.targetMethod}` : ''}`
          );
        }

        if (plan.implementedBy) {
          console.log(`   Implemented by: ${colors.green}${plan.implementedBy}${colors.reset}`);
        }

        if (plan.targetMilestone) {
          console.log(`   Milestone: ${colors.cyan}${plan.targetMilestone}${colors.reset}`);
        }

        console.log(
          `   ${plan.description.substring(0, 100)}${plan.description.length > 100 ? '...' : ''}`
        );
        console.log();
      }
    }
    /**
     * error
     * @public
     */
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

/**
 * printValidate function
 * @returns void
 * @public
 */
function printValidate(): void {
  printHeader('Detailed Validation Report');

  const dbPath = path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');

  if (!fs.existsSync(dbPath)) {
    console.log(
      `${colors.yellow}⚠️  Database not found. Run demo first: npm run demo${colors.reset}`
    );
    console.log();
    console.log('To create the database, run:');
    console.log(`${colors.cyan}  npm run demo${colors.reset}`);
    console.log();
    return;
  }

  const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');
  const dbManager = new DatabaseManager(dbPath, jsonlPath);

  try {
    // Get all symbols from database
    const symbolQuery = 'SELECT * FROM symbols';
    const symbolStmt = dbManager.db.prepare(symbolQuery);
    const symbolRows = symbolStmt.all() as SymbolRow[];

    // Build symbol graph
    const graphBuilder = new SymbolGraphBuilder();

    /**
     * row
     * @public
     */
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
        summary: row.summary ?? undefined,
        tests: [],
        designDecisions: [],
      };
      graphBuilder.addSymbol(symbol);
    }

    // Get relationships from database if they exist
    try {
      const relQuery = 'SELECT * FROM relationships';
      const relStmt = dbManager.db.prepare(relQuery);
      const relRows = relStmt.all() as RelationshipRow[];

      /**
       * row
       * @public
       */
      for (const row of relRows) {
        graphBuilder.addRelationship({
          type: row.type as 'dependsOn' | 'usedBy' | 'implements' | 'extends' | 'relatedTo',
          from: row.from_id,
          to: row.to_id,
          filePath: row.file_path || '',
          line: row.line,
          description: row.description,
        });
      }
    } catch (_error) {
      // Relationships table might not exist, that's okay
      console.log(
        `${colors.yellow}Note: Relationships table not found, skipping...${colors.reset}`
      );
    }

    // Create validator and generate detailed report
    const validator = new ConnectivityValidator(graphBuilder);
    const report = validator.generateDetailedReport();
    const formattedReport = validator.formatDetailedReport(report);

    console.log(formattedReport);
    /**
     * error
     * @public
     */
  } catch (error) {
    console.error(`${colors.red}❌ Error generating validation report:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

/**
 * Analyze code health for a directory
 * @returns void
 */
function printAnalyze(): void {
  const args = process.argv.slice(3);
  let targetPath = args[0] || 'src';
  let includeChildren = true;
  let includePrivate = false;
  let minQualityScore = 70;

  // Parse options
  /**
   * arg
   * @public
   */
  for (const arg of args) {
    if (arg.startsWith('--no-children')) {
      includeChildren = false;
    } else if (arg.startsWith('--include-private')) {
      includePrivate = true;
    } else if (arg.startsWith('--min-score=')) {
      minQualityScore = parseInt(arg.split('=')[1], 10);
    } else if (!arg.startsWith('--')) {
      targetPath = arg;
    }
  }

  printHeader('TSDoc Edge - Code Analysis');

  if (!fs.existsSync(targetPath)) {
    console.log(`${colors.red}❌ Path not found: ${targetPath}${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}Analyzing: ${targetPath}${colors.reset}`);
  console.log(`${colors.cyan}Include children: ${includeChildren}${colors.reset}`);
  console.log(`${colors.cyan}Include private: ${includePrivate}${colors.reset}`);
  console.log(`${colors.cyan}Min quality score: ${minQualityScore}${colors.reset}`);
  console.log();

  const checker = new CodeHealthChecker();
  const report = checker.analyze({
    path: targetPath,
    includeChildren,
    includePrivate,
    minQualityScore,
    generateSuggestions: false,
  });

  printAnalysisReport(report);
}

/**
 * Check code health and generate report
 * @returns void
 */
function printHealth(): void {
  const args = process.argv.slice(3);
  const targetPath = args[0] || 'src';

  printHeader('TSDoc Edge - Health Check');

  if (!fs.existsSync(targetPath)) {
    console.log(`${colors.red}❌ Path not found: ${targetPath}${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}Checking health: ${targetPath}${colors.reset}`);
  console.log();

  const checker = new CodeHealthChecker();
  const report = checker.analyze({
    path: targetPath,
    includeChildren: true,
    includePrivate: false,
    minQualityScore: 70,
    generateSuggestions: false,
  });

  printHealthReport(report);
}

/**
 * Generate improvement suggestions
 * @returns void
 */
function printSuggest(): void {
  const args = process.argv.slice(3);
  let targetPath = args[0] || 'src';
  let minQualityScore = 70;
  let limit = 20;

  // Parse options
  /**
   * arg
   * @public
   */
  for (const arg of args) {
    if (arg.startsWith('--min-score=')) {
      minQualityScore = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (!arg.startsWith('--')) {
      targetPath = arg;
    }
  }

  printHeader('TSDoc Edge - Improvement Suggestions');

  if (!fs.existsSync(targetPath)) {
    console.log(`${colors.red}❌ Path not found: ${targetPath}${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}Analyzing: ${targetPath}${colors.reset}`);
  console.log(`${colors.cyan}Min quality score: ${minQualityScore}${colors.reset}`);
  console.log();

  const checker = new CodeHealthChecker();
  const report = checker.analyze({
    path: targetPath,
    includeChildren: true,
    includePrivate: false,
    minQualityScore,
    generateSuggestions: true,
  });

  printSuggestionsReport(report, limit);
}

/**
 * Print analysis report
 * @param report - report parameter
 * @returns void
 */
function printAnalysisReport(report: AnalysisReport) {
  const { metrics } = report;

  printSection('📊 Overall Metrics');
  console.log(`   Total Files: ${colors.green}${metrics.totalFiles}${colors.reset}`);
  console.log(`   Total Symbols: ${colors.green}${metrics.totalSymbols}${colors.reset}`);
  console.log(`   Public Symbols: ${colors.green}${metrics.publicSymbols}${colors.reset}`);
  console.log(
    `   Documented Symbols: ${colors.green}${metrics.documentedSymbols}${colors.reset} (${Math.round((metrics.documentedSymbols / metrics.totalSymbols) * 100)}%)`
  );
  console.log(
    `   Fully Documented: ${colors.green}${metrics.fullyDocumentedSymbols}${colors.reset} (${Math.round((metrics.fullyDocumentedSymbols / metrics.totalSymbols) * 100)}%)`
  );
  console.log();

  printSection('🧪 Test Coverage');
  console.log(`   Files with Tests: ${colors.green}${metrics.filesWithTests}${colors.reset}`);
  console.log(
    `   Files without Tests: ${colors.yellow}${metrics.filesWithoutTests}${colors.reset}`
  );
  console.log(
    `   Coverage: ${getScoreColor(Math.round((metrics.filesWithTests / metrics.totalFiles) * 100))}${Math.round((metrics.filesWithTests / metrics.totalFiles) * 100)}%${colors.reset}`
  );
  console.log();

  printSection('📈 Quality Scores');
  console.log(
    `   Average Doc Quality: ${getScoreColor(metrics.avgQualityScore)}${metrics.avgQualityScore}/100${colors.reset}`
  );
  console.log(
    `   Overall Health Score: ${getScoreColor(metrics.healthScore)}${metrics.healthScore}/100${colors.reset}`
  );
  console.log();

  // Top issues
  if (report.topIssues.length > 0) {
    printSection('⚠️  Top Issues (Lowest Quality Scores)');
    /**
     * i
     * @public
     */
    for (let i = 0; i < Math.min(10, report.topIssues.length); i++) {
      const issue = report.topIssues[i];
      console.log(
        `   ${i + 1}. ${colors.yellow}${issue.symbolName}${colors.reset} (${getScoreColor(issue.qualityScore)}${issue.qualityScore}/100${colors.reset}) - ${issue.filePath}:${issue.line}`
      );
      if (issue.missing.length > 0) {
        console.log(`      Missing: ${colors.red}${issue.missing.join(', ')}${colors.reset}`);
      }
    }
    console.log();
  }

  // Files needing attention
  if (report.filesNeedingAttention.length > 0) {
    printSection('📁 Files Needing Attention');
    /**
     * file
     * @public
     */
    for (const file of report.filesNeedingAttention.slice(0, 10)) {
      console.log(`   • ${file}`);
    }
    if (report.filesNeedingAttention.length > 10) {
      console.log(`   ... and ${report.filesNeedingAttention.length - 10} more`);
    }
    console.log();
  }
}

/**
 * Print health report
 * @param report - report parameter
 * @returns void
 */
function printHealthReport(report: AnalysisReport) {
  const { metrics } = report;

  const healthScore = metrics.healthScore;
  const healthGrade = getHealthGrade(healthScore);
  const healthEmoji = getHealthEmoji(healthScore);

  printSection(`${healthEmoji} Overall Health: ${healthGrade} (${healthScore}/100)`);
  console.log();

  // Show health breakdown
  const docScore = metrics.avgQualityScore;
  const testScore = Math.round((metrics.filesWithTests / metrics.totalFiles) * 100);

  console.log(
    `   📝 Documentation Quality: ${getScoreColor(docScore)}${docScore}/100${colors.reset}`
  );
  console.log(`   🧪 Test Coverage: ${getScoreColor(testScore)}${testScore}/100${colors.reset}`);
  console.log();

  // Health recommendations
  printSection('💡 Recommendations');
  if (healthScore >= 80) {
    console.log(`   ${colors.green}✓${colors.reset} Your codebase health is excellent!`);
    console.log(`   ${colors.green}✓${colors.reset} Keep maintaining this quality standard.`);
  } else if (healthScore >= 60) {
    console.log(
      `   ${colors.yellow}!${colors.reset} Your codebase health is good but can be improved.`
    );
    console.log(`   ${colors.yellow}!${colors.reset} Focus on: ${getHealthFocus(metrics)}`);
  } else if (healthScore >= 40) {
    console.log(`   ${colors.yellow}⚠${colors.reset} Your codebase health needs attention.`);
    console.log(`   ${colors.yellow}⚠${colors.reset} Priority: ${getHealthFocus(metrics)}`);
  } else {
    console.log(`   ${colors.red}❌${colors.reset} Your codebase health is critical.`);
    console.log(
      `   ${colors.red}❌${colors.reset} Urgent action required: ${getHealthFocus(metrics)}`
    );
  }
  console.log();

  // Quick stats
  printSection('📊 Quick Stats');
  console.log(`   Total Symbols: ${metrics.totalSymbols}`);
  console.log(
    `   Documented: ${metrics.documentedSymbols} (${Math.round((metrics.documentedSymbols / metrics.totalSymbols) * 100)}%)`
  );
  console.log(`   Files with Tests: ${metrics.filesWithTests}/${metrics.totalFiles}`);
  console.log(`   Files Needing Attention: ${report.filesNeedingAttention.length}`);
  console.log();

  console.log(
    `${colors.cyan}💡 Tip: Run 'tsdoc-edge suggest' for detailed improvement suggestions${colors.reset}`
  );
  console.log();
}

/**
 * Print suggestions report
 * @param report - report parameter
 * @param limit - limit parameter
 * @returns void
 */
function printSuggestionsReport(report: AnalysisReport, limit: number) {
  const { suggestions } = report;

  if (suggestions.length === 0) {
    console.log(`${colors.green}✓ No issues found! Your codebase looks great.${colors.reset}`);
    return;
  }

  printSection(`🎯 Improvement Suggestions (${suggestions.length} total)`);
  console.log();

  // Group by priority
  const critical = suggestions.filter((s) => s.priority === 'critical');
  const high = suggestions.filter((s) => s.priority === 'high');
  const medium = suggestions.filter((s) => s.priority === 'medium');
  const low = suggestions.filter((s) => s.priority === 'low');

  let shown = 0;

  if (critical.length > 0) {
    console.log(`${colors.red}${colors.bold}🔴 Critical Priority${colors.reset}`);
    console.log();
    /**
     * suggestion
     * @public
     */
    for (const suggestion of critical.slice(0, limit - shown)) {
      printSuggestion(suggestion);
      shown++;
    }
  }

  if (high.length > 0 && shown < limit) {
    console.log(`${colors.yellow}${colors.bold}🟡 High Priority${colors.reset}`);
    console.log();
    /**
     * suggestion
     * @public
     */
    for (const suggestion of high.slice(0, limit - shown)) {
      printSuggestion(suggestion);
      shown++;
    }
  }

  if (medium.length > 0 && shown < limit) {
    console.log(`${colors.blue}${colors.bold}🔵 Medium Priority${colors.reset}`);
    console.log();
    /**
     * suggestion
     * @public
     */
    for (const suggestion of medium.slice(0, limit - shown)) {
      printSuggestion(suggestion);
      shown++;
    }
  }

  if (low.length > 0 && shown < limit) {
    console.log(`${colors.cyan}${colors.bold}⚪ Low Priority${colors.reset}`);
    console.log();
    /**
     * suggestion
     * @public
     */
    for (const suggestion of low.slice(0, limit - shown)) {
      printSuggestion(suggestion);
      shown++;
    }
  }

  if (suggestions.length > limit) {
    console.log();
    console.log(
      `${colors.cyan}... and ${suggestions.length - shown} more suggestions${colors.reset}`
    );
    console.log(`${colors.cyan}Use --limit=N to show more results${colors.reset}`);
  }

  console.log();
}

/**
 * Print a single suggestion
 * @param suggestion - suggestion parameter
 * @returns void
 */
function printSuggestion(suggestion: ImprovementSuggestion) {
  const { category, filePath, symbolName, issue, suggestion: action, effort } = suggestion;

  const categoryIcon = category === 'documentation' ? '📝' : category === 'testing' ? '🧪' : '🏗️';
  const effortBadge =
    effort === 'small' ? '⚡ Small' : effort === 'medium' ? '🔧 Medium' : '🔨 Large';

  console.log(
    `   ${categoryIcon} ${colors.bold}${symbolName || path.basename(filePath)}${colors.reset}`
  );
  console.log(`      Location: ${colors.cyan}${filePath}${colors.reset}`);
  console.log(`      Issue: ${colors.yellow}${issue}${colors.reset}`);
  console.log(`      Action: ${colors.green}${action}${colors.reset}`);
  console.log(`      Effort: ${effortBadge}`);
  console.log();
}

/**
 * Get color for score
 * @param score - score parameter
 * @returns Returns string
 */
function getScoreColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.yellow;
  return colors.red;
}

/**
 * Get health grade
 * @param score - score parameter
 * @returns Returns string
 */
function getHealthGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * Get health emoji
 * @param score - score parameter
 * @returns Returns string
 */
function getHealthEmoji(score: number): string {
  if (score >= 80) return '🌟';
  if (score >= 60) return '✅';
  if (score >= 40) return '⚠️';
  return '❌';
}

/**
 * Get health focus area
 * @param metrics - metrics parameter
 * @returns Returns string
 */
function getHealthFocus(metrics: CodeHealthMetrics): string {
  const docScore = metrics.avgQualityScore;
  const testScore = Math.round((metrics.filesWithTests / metrics.totalFiles) * 100);

  if (docScore < testScore) {
    return 'Improve documentation quality';
  } else if (testScore < docScore) {
    return 'Add more test coverage';
  } else {
    return 'Improve both documentation and tests';
  }
}

/**
 * Fix documentation for a specific file or directory
 * @returns void
 */
function printFix(): void {
  const args = process.argv.slice(3);
  let targetPath = args[0] || 'src';
  let dryRun = false;
  let minScore = 70;

  // Parse options
  /**
   * arg
   * @public
   */
  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--min-score=')) {
      minScore = parseInt(arg.split('=')[1], 10);
    } else if (!arg.startsWith('--')) {
      targetPath = arg;
    }
  }

  printHeader('TSDoc Edge - Fix Documentation');

  if (!fs.existsSync(targetPath)) {
    console.log(`${colors.red}❌ Path not found: ${targetPath}${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}Fixing: ${targetPath}${colors.reset}`);
  console.log(`${colors.cyan}Min score: ${minScore}${colors.reset}`);
  console.log(`${colors.cyan}Dry run: ${dryRun}${colors.reset}`);
  console.log();

  // Analyze first
  printSection('📊 Analyzing...');
  const _analyzer = new DocumentationAnalyzer();
  const checker = new CodeHealthChecker();

  const report = checker.analyze({
    path: targetPath,
    includeChildren: true,
    includePrivate: false,
    minQualityScore: minScore,
    generateSuggestions: false,
  });

  console.log(`   Found ${report.docScores.length} symbols`);
  const needsFixing = report.docScores.filter((s) => s.qualityScore < minScore && s.isPublic);
  console.log(`   ${needsFixing.length} need fixing (quality < ${minScore})`);
  console.log();

  if (needsFixing.length === 0) {
    console.log(`${colors.green}✓ All documentation meets quality standards!${colors.reset}`);
    return;
  }

  // Group by file
  const byFile = new Map<string, typeof needsFixing>();
  /**
   * score
   * @public
   */
  for (const score of needsFixing) {
    if (!byFile.has(score.filePath)) {
      byFile.set(score.filePath, []);
    }
    byFile.get(score.filePath)?.push(score);
  }

  printSection('🔧 Fixing Files...');
  const { DocumentationFixer } = require('./fixer/DocumentationFixer');
  const fixer = new DocumentationFixer();

  let totalFixed = 0;
  /**
   * [filePath, scores]
   * @public
   */
  for (const [filePath, scores] of byFile.entries()) {
    console.log(`   ${path.basename(filePath)} (${scores.length} symbols)...`);

    const result = fixer.fixFile(filePath, scores, {
      addSummary: true,
      addParams: true,
      addReturns: true,
      addExamples: false,
      addCustomTags: true,
      dryRun,
      minScore,
    });

    if (result.error) {
      console.log(`      ${colors.red}✗ Error: ${result.error}${colors.reset}`);
    } else if (result.modified) {
      console.log(`      ${colors.green}✓ Fixed ${result.symbolsFixed} symbols${colors.reset}`);
      totalFixed += result.symbolsFixed;
    } else {
      console.log(`      ${colors.yellow}- No changes needed${colors.reset}`);
    }
  }

  console.log();
  if (dryRun) {
    console.log(`${colors.cyan}Dry run complete. No files were modified.${colors.reset}`);
  } else {
    console.log(
      `${colors.green}✓ Fixed ${totalFixed} symbols in ${byFile.size} files${colors.reset}`
    );
  }
  console.log();
}

/**
 * Recursively improve documentation until target score is reached
 * @returns void
 */
function printImprove(): void {
  const args = process.argv.slice(3);
  let targetScore = 80;
  let maxIterations = 10;
  let dryRun = false;
  let verbose = false;

  // Parse options
  /**
   * arg
   * @public
   */
  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      targetScore = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--max-iterations=')) {
      maxIterations = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    }
  }

  printHeader('TSDoc Edge - Recursive Improvement');

  console.log(`${colors.cyan}Target score: ${targetScore}/100${colors.reset}`);
  console.log(`${colors.cyan}Max iterations: ${maxIterations}${colors.reset}`);
  console.log(`${colors.cyan}Dry run: ${dryRun}${colors.reset}`);
  console.log();

  const improver = new RecursiveImprover();

  printSection('🚀 Starting Recursive Improvement...');
  console.log();

  const result = improver.improve({
    targetScore,
    maxIterations,
    dryRun,
    verbose,
    fixOptions: {
      addSummary: true,
      addParams: true,
      addReturns: true,
      addExamples: false,
      addCustomTags: true,
    },
  });

  console.log();
  printSection('📊 Results');
  console.log(
    `   Initial Score: ${getScoreColor(result.initialScore)}${result.initialScore}/100${colors.reset}`
  );
  console.log(
    `   Final Score: ${getScoreColor(result.finalScore)}${result.finalScore}/100${colors.reset}`
  );
  console.log(
    `   Improvement: ${colors.green}+${result.finalScore - result.initialScore}${colors.reset} points`
  );
  console.log(`   Iterations: ${result.iterations}`);
  console.log(`   Files Modified: ${result.filesModified}`);
  console.log(`   Symbols Fixed: ${result.symbolsFixed}`);
  console.log();

  if (result.improvedFiles.length > 0) {
    printSection('📁 Modified Files');
    /**
     * file
     * @public
     */
    for (const file of result.improvedFiles.slice(0, 20)) {
      console.log(`   • ${file}`);
    }
    if (result.improvedFiles.length > 20) {
      console.log(`   ... and ${result.improvedFiles.length - 20} more`);
    }
    console.log();
  }

  if (result.finalScore >= targetScore) {
    console.log(`${colors.green}🎉 Target score reached!${colors.reset}`);
  } else {
    console.log(
      `${colors.yellow}⚠️  Target score not reached after ${result.iterations} iterations${colors.reset}`
    );
    console.log(
      `${colors.cyan}💡 Try increasing --max-iterations or lowering --target${colors.reset}`
    );
  }
  console.log();
}

/**
 * Print documentation statistics
 * @returns void
 */
function printStats(): void {
  const args = process.argv.slice(3);
  let targetPath = 'src';
  let compare = false;
  let save = false;
  let historyPath: string | undefined;
  let warningsOnly = false;

  // Parse options
  for (const arg of args) {
    if (arg === '--compare' || arg === '-c') {
      compare = true;
    } else if (arg === '--save' || arg === '-s') {
      save = true;
    } else if (arg.startsWith('--history=')) {
      historyPath = arg.split('=')[1];
    } else if (arg === '--warnings-only' || arg === '-w') {
      warningsOnly = true;
    } else if (!arg.startsWith('--')) {
      targetPath = arg;
    }
  }

  // Set default history path if not specified
  if (!historyPath) {
    const config = ConfigManager.getInstance();
    const reportsDir = config.get().paths.reportsDir || '.tsdoc/reports';
    historyPath = path.join(reportsDir, 'stats-history.json');
  }

  printHeader('TSDoc Edge - Documentation Statistics');

  if (!fs.existsSync(targetPath)) {
    console.log(`${colors.red}❌ Path not found: ${targetPath}${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}Analyzing: ${targetPath}${colors.reset}`);
  console.log();

  // Load from database
  const dbPath = path.join(process.cwd(), '.tsdoc.db');
  const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');
  const dbManager = new DatabaseManager(dbPath, jsonlPath);

  const query = 'SELECT * FROM symbols';
  const stmt = dbManager.db.prepare(query);
  const rows = stmt.all() as SymbolRow[];

  // Build symbol graph
  const graphBuilder = new SymbolGraphBuilder();

  for (const row of rows) {
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

  // Load relationships
  const relQuery = 'SELECT * FROM relationships';
  const relStmt = dbManager.db.prepare(relQuery);
  const relRows = relStmt.all() as RelationshipRow[];

  for (const row of relRows) {
    const relationship: SymbolRelationship = {
      type: row.type as SymbolRelationship['type'],
      from: row.from_id,
      to: row.to_id,
      filePath: row.file_path,
      line: row.line,
      description: row.description,
    };
    graphBuilder.addRelationship(relationship);
  }

  const symbols = graphBuilder.getAllSymbols();

  // Calculate connection counts
  const connectionCounts = new Map<string, number>();
  for (const symbol of symbols) {
    const deps = graphBuilder.getDependencies(symbol.id);
    const users = graphBuilder.getDependents(symbol.id);
    connectionCounts.set(symbol.id, deps.length + users.length);
  }

  // Collect statistics
  const collector = new TrackableStatsCollector();
  let stats = collector.collect(process.cwd(), symbols, connectionCounts);

  // Compare with history if requested
  if (compare) {
    const historyManager = new StatsHistoryManager();
    const latestEntry = historyManager.getLatest(historyPath);

    if (latestEntry) {
      const comparator = new StatsComparator();
      stats = comparator.compareWithHistory(stats, latestEntry, symbols, latestEntry.symbolIds);
    } else {
      console.log(`${colors.yellow}⚠️  No history found for comparison${colors.reset}`);
      console.log();
    }
  }

  // Print results
  if (stats.comparison && compare) {
    const comparator = new StatsComparator();
    console.log(comparator.summarizeComparison(stats));
  } else if (warningsOnly) {
    if (stats.comparison) {
      const hasWarnings =
        stats.comparison.overall.hasWarning ||
        stats.comparison.critical.hasWarning ||
        stats.comparison.important.hasWarning ||
        stats.comparison.normal.hasWarning;

      if (hasWarnings) {
        const comparator = new StatsComparator();
        console.log(comparator.summarizeComparison(stats));
      } else {
        console.log(`${colors.green}✅ No warnings detected${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}⚠️  No comparison data available${colors.reset}`);
    }
  } else {
    console.log(collector.summarize(stats));
  }

  // Save to history if requested
  if (save) {
    // Ensure directory exists
    const historyDir = path.dirname(historyPath);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    const historyManager = new StatsHistoryManager();
    historyManager.save(stats, symbols, historyPath);
    console.log();
    console.log(`${colors.green}✅ Statistics saved to ${historyPath}${colors.reset}`);
  }

  console.log();
}

/**
 * printCoreApi function
 * @returns void
 * @public
 */
function printCoreApi(): void {
  const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
  const jsonlPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');

  if (!fs.existsSync(dbPath)) {
    console.log(`${colors.yellow}⚠️  No database found. Run analysis first.${colors.reset}`);
    process.exit(1);
  }

  // Load symbols from database
  const dbManager = new DatabaseManager(dbPath, jsonlPath);
  const symbolStmt = dbManager.db.prepare('SELECT * FROM symbols');
  const symbolRows = symbolStmt.all() as SymbolRow[];
  const relationshipStmt = dbManager.db.prepare('SELECT * FROM relationships');
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
      type: row.type as SymbolRelationship['type'],
      from: row.from_id,
      to: row.to_id,
      filePath: row.file_path,
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

  // Get actual symbol objects
  const coreSymbols = allSymbols.filter((s) => coreSymbolIds.has(s.id));

  // Group by type
  const byType = new Map<string, Symbol[]>();
  for (const symbol of coreSymbols) {
    const list = byType.get(symbol.type) || [];
    list.push(symbol);
    byType.set(symbol.type, list);
  }

  // Print results
  printHeader('Core API (Exported + 1 Depth Dependencies)');
  console.log(
    `Total: ${colors.bold}${coreSymbols.length}${colors.reset} symbols (${colors.green}${exportedSymbols.length}${colors.reset} exported + ${colors.cyan}${coreSymbols.length - exportedSymbols.length}${colors.reset} dependencies)`
  );
  console.log();

  // Print by type
  const typeOrder: Symbol['type'][] = [
    'class',
    'interface',
    'type',
    'function',
    'enum',
    'variable',
    'method',
    'property',
  ];

  for (const type of typeOrder) {
    const symbols = byType.get(type);
    if (!symbols || symbols.length === 0) continue;

    console.log(`${colors.bold}${type.toUpperCase()}${colors.reset} (${symbols.length})`);

    for (const symbol of symbols) {
      const isExported = symbol.isExported;
      const badge = isExported
        ? `${colors.green}[exported]${colors.reset}`
        : `${colors.cyan}[dep]${colors.reset}`;
      const docBadge = symbol.summary
        ? `${colors.green}✓${colors.reset}`
        : `${colors.red}✗${colors.reset}`;

      console.log(`  ${badge} ${docBadge} ${colors.bold}${symbol.name}${colors.reset}`);
      console.log(`    ${colors.cyan}${symbol.filePath}:${symbol.line}${colors.reset}`);

      if (symbol.summary) {
        const shortSummary =
          symbol.summary.length > 80 ? `${symbol.summary.substring(0, 77)}...` : symbol.summary;
        console.log(`    ${shortSummary}`);
      }

      console.log();
    }
  }

  console.log('─'.repeat(80));
  console.log(
    `Documentation coverage: ${coreSymbols.filter((s) => s.summary).length}/${coreSymbols.length} (${((coreSymbols.filter((s) => s.summary).length / coreSymbols.length) * 100).toFixed(1)}%)`
  );
  console.log();
}

/**
 * printScan function
 * @returns void
 * @public
 */
function printScan(): void {
  // Parse options
  let depth = 2;
  let entry: string | undefined;
  let output: string | undefined;
  let save = false;
  let groupByCategory = false;
  let direction: 'dependencies' | 'dependents' | 'both' = 'dependencies';

  for (const arg of process.argv.slice(3)) {
    if (arg.startsWith('--depth=')) {
      depth = Number.parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--entry=')) {
      entry = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      output = arg.split('=')[1];
    } else if (arg === '--save' || arg === '-s') {
      save = true;
    } else if (arg === '--group-by-category') {
      groupByCategory = true;
    } else if (arg.startsWith('--direction=')) {
      const dirValue = arg.split('=')[1];
      if (dirValue === 'dependencies' || dirValue === 'dependents' || dirValue === 'both') {
        direction = dirValue;
      } else {
        console.log(
          `${colors.red}Invalid direction: ${dirValue}. Use: dependencies, dependents, or both${colors.reset}`
        );
        process.exit(1);
      }
    }
  }

  const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
  const jsonlPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');

  // Fallback to demo database if .tsdoc doesn't exist
  const finalDbPath = fs.existsSync(dbPath)
    ? dbPath
    : path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');
  const finalJsonlPath = fs.existsSync(jsonlPath)
    ? jsonlPath
    : path.join(process.cwd(), 'demo', 'output', 'data');

  if (!fs.existsSync(finalDbPath)) {
    console.log(`${colors.yellow}⚠️  No database found. Run analysis first.${colors.reset}`);
    process.exit(1);
  }

  // Load symbols from database
  const dbManager = new DatabaseManager(finalDbPath, finalJsonlPath);
  const symbolStmt = dbManager.db.prepare('SELECT * FROM symbols');
  const symbolRows = symbolStmt.all() as SymbolRow[];
  const relationshipStmt = dbManager.db.prepare('SELECT * FROM relationships');
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
      type: row.type as SymbolRelationship['type'],
      from: row.from_id,
      to: row.to_id,
      filePath: row.file_path,
      line: row.line,
      description: row.description,
    };
    graphBuilder.addRelationship(relationship);
  }

  // Create traverser
  const traverser = new DepthTraverser(graphBuilder);

  // Determine entry points
  let entryPoints: string[];
  if (entry) {
    // Try to find by name first
    const symbolId = traverser.findSymbolByName(entry);
    if (symbolId) {
      entryPoints = [symbolId];
    } else {
      // Assume it's an ID
      entryPoints = [entry];
    }
  } else {
    // Default: all exported symbols
    entryPoints = traverser.getExportedSymbols();
  }

  if (entryPoints.length === 0) {
    console.log(`${colors.red}❌ No entry points found${colors.reset}`);
    process.exit(1);
  }

  printHeader('Scanning Symbol Graph');
  console.log(`Entry points: ${colors.green}${entryPoints.length}${colors.reset}`);
  console.log(`Max depth: ${colors.green}${depth}${colors.reset}`);
  console.log(`Direction: ${colors.cyan}${direction}${colors.reset}`);
  console.log();

  // Traverse
  const result = traverser.traverse(entryPoints, {
    maxDepth: depth,
    direction: direction,
  });

  console.log(
    `Found ${colors.bold}${result.totalSymbols}${colors.reset} symbols across ${colors.bold}${result.maxDepthReached + 1}${colors.reset} levels`
  );
  console.log();

  // Generate document
  const generator = new InsightDocGenerator(graphBuilder);
  const doc = generator.generate(result.symbolsByDepth, {
    title: groupByCategory ? 'TSDoc Edge - Core Features' : 'TSDoc Edge - Code Insights',
    entryDescription: entry
      ? `Entry Point: ${entry}`
      : `Entry Points: All exported symbols (${entryPoints.length})`,
    includeTypeBadges: true,
    includeDependencyCounts: false,
    groupByCategory,
  });

  // Output
  if (output || save) {
    let outputPath: string;

    if (output) {
      // Use explicit output path
      outputPath = path.resolve(process.cwd(), output);
    } else {
      // Auto-generate filename in configured generatedDir
      const config = ConfigManager.getInstance();
      const generatedDir = path.resolve(
        process.cwd(),
        config.get().paths.generatedDir || 'docs/generated'
      );

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = groupByCategory
        ? `FEATURES_${timestamp}.md`
        : entry
          ? `SCAN_${entry.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.md`
          : `SCAN_${timestamp}.md`;

      outputPath = path.join(generatedDir, filename);
    }

    const outputDir = path.dirname(outputPath);

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, doc, 'utf-8');
    console.log(`${colors.green}✅ Document written to ${outputPath}${colors.reset}`);
  } else {
    console.log(doc);
  }

  console.log();
}

/**
 * Index documents for [[]] symbols
 */
function printIndexDocs(): void {
  // Parse options
  let targetFile: string | undefined;
  let docsDir = 'docs';

  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--file=')) {
      targetFile = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      docsDir = arg;
    }
  }

  // Define output paths once
  const outputDir = path.join(process.cwd(), '.tsdoc');
  const outputPath = path.join(outputDir, 'doc-symbols.json');

  // Check if incremental update (single file)
  if (targetFile) {
    const targetPath = path.resolve(process.cwd(), targetFile);

    if (!fs.existsSync(targetPath)) {
      console.log(`${colors.red}❌ File not found: ${targetPath}${colors.reset}`);
      process.exit(1);
    }

    printHeader(`Updating Index for ${path.basename(targetPath)}`);

    // Load existing index
    const registry = new DocumentSymbolRegistry();
    if (fs.existsSync(outputPath)) {
      try {
        const indexData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
        if (indexData.registryData) {
          registry.import(indexData.registryData);
          console.log(`${colors.cyan}Loaded existing index${colors.reset}`);
        }
      } catch (error) {
        console.log(
          `${colors.yellow}⚠ Could not load existing index, creating new one${colors.reset}`
        );
      }
    }

    // Unregister old data from this file
    registry.unregisterFile(targetPath);
    console.log(`${colors.cyan}Removed old symbols from ${path.basename(targetPath)}${colors.reset}`);

    // Parse and register new data
    const parser = new DocumentSymbolParser();
    try {
      const parsed = parser.parse(targetPath);

      if (!parsed) {
        console.log(
          `${colors.yellow}⚠ Skipped ${path.basename(targetPath)} (not a managed document)${colors.reset}`
        );
        return;
      }

      registry.registerDocument(parsed);
      console.log(
        `${colors.green}✅ Updated symbols from ${path.basename(targetPath)}${colors.reset}`
      );

      if (parsed.primary) {
        console.log(`  Primary: ${colors.green}[[${parsed.primary.name}]]${colors.reset}`);
      }
      if (parsed.auxiliaries.length > 0) {
        console.log(`  Auxiliaries: ${colors.cyan}${parsed.auxiliaries.length}${colors.reset}`);
      }
      if (parsed.references.length > 0) {
        console.log(`  References: ${colors.cyan}${parsed.references.length}${colors.reset}`);
      }
    } catch (error) {
      console.log(
        `${colors.red}Error parsing ${targetPath}: ${error instanceof Error ? error.message : String(error)}${colors.reset}`
      );
      process.exit(1);
    }

    // Save updated index
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const stats = registry.getStatistics();
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          statistics: stats,
          symbols: Array.from(registry.getAllSymbolNames()),
          registryData: registry.export(),
        },
        null,
        2
      ),
      'utf-8'
    );

    console.log();
    console.log(`${colors.green}✅ Index updated: ${outputPath}${colors.reset}`);
    return;
  }

  // Full scan mode
  const docsPath = path.resolve(process.cwd(), docsDir);

  if (!fs.existsSync(docsPath)) {
    console.log(`${colors.red}❌ Directory not found: ${docsPath}${colors.reset}`);
    process.exit(1);
  }

  printHeader('Indexing Document Symbols');

  // Find all markdown files
  const findMarkdownFiles = (dir: string): string[] => {
    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const markdownFiles = findMarkdownFiles(docsPath);
  console.log(`Found ${colors.green}${markdownFiles.length}${colors.reset} markdown files`);
  console.log();

  // Parse documents
  const parser = new DocumentSymbolParser();
  const registry = new DocumentSymbolRegistry();

  let totalPrimary = 0;
  let totalAux = 0;
  let totalRefs = 0;

  for (const filePath of markdownFiles) {
    try {
      const parsed = parser.parse(filePath);

      if (!parsed) {
        // Skip non-managed documents
        continue;
      }

      registry.registerDocument(parsed);

      if (parsed.primary) totalPrimary++;
      totalAux += parsed.auxiliaries.length;
      totalRefs += parsed.references.length;
    } catch (error) {
      console.log(
        `${colors.red}Error parsing ${filePath}: ${error instanceof Error ? error.message : String(error)}${colors.reset}`
      );
    }
  }

  // Find code files for @doc tags
  const srcDir = path.resolve(process.cwd(), 'src');
  const findCodeFiles = (dir: string): string[] => {
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
        files.push(...findCodeFiles(fullPath));
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const codeFiles = findCodeFiles(srcDir);
  const tsdocParser = new TSDocSymbolParser();
  let totalCodeConns = 0;

  for (const filePath of codeFiles) {
    const connections = tsdocParser.parseCodeFile(filePath);
    for (const conn of connections) {
      registry.registerCodeConnection(conn);
      totalCodeConns++;
    }
  }

  // Print summary
  printSection('Summary');
  console.log(`Documents scanned: ${colors.green}${markdownFiles.length}${colors.reset}`);
  console.log(`Primary definitions: ${colors.green}${totalPrimary}${colors.reset}`);
  console.log(`Auxiliary definitions: ${colors.cyan}${totalAux}${colors.reset}`);
  console.log(`References: ${colors.cyan}${totalRefs}${colors.reset}`);
  console.log(`Code connections: ${colors.cyan}${totalCodeConns}${colors.reset}`);
  console.log();

  // Save to file
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stats = registry.getStatistics();

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        statistics: stats,
        symbols: Array.from(registry.getAllSymbolNames()),
        registryData: registry.export(),
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`${colors.green}✅ Index created: ${outputPath}${colors.reset}`);
  console.log();
}

/**
 * Validate document symbols (SSOT)
 */
function printValidateDocs(): void {
  const docsDir = process.argv[3] || 'docs';
  const docsPath = path.resolve(process.cwd(), docsDir);

  if (!fs.existsSync(docsPath)) {
    console.log(`${colors.red}❌ Directory not found: ${docsPath}${colors.reset}`);
    process.exit(1);
  }

  printHeader('Validating Document Symbols');

  // Find and parse documents
  const findMarkdownFiles = (dir: string): string[] => {
    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const markdownFiles = findMarkdownFiles(docsPath);
  const parser = new DocumentSymbolParser();
  const registry = new DocumentSymbolRegistry();

  for (const filePath of markdownFiles) {
    try {
      const parsed = parser.parse(filePath);
      if (parsed) {
        registry.registerDocument(parsed);
      }
    } catch (error) {
      // Errors will be shown in validation
    }
  }

  // Validate
  const validation = registry.validate();

  // Print errors
  if (validation.errors.length > 0) {
    printSection('Errors');
    for (const error of validation.errors) {
      console.log(`${colors.red}❌ ${error.type}${colors.reset}`);
      console.log(`   Symbol: [[${error.symbolName}]]`);
      console.log(`   File: ${error.filePath}:${error.line}`);
      console.log(`   ${error.message}`);
      if (error.conflictWith) {
        console.log(
          `   Conflicts with: ${error.conflictWith.filePath}:${error.conflictWith.line}`
        );
      }
      console.log();
    }
  }

  // Print warnings
  if (validation.warnings.length > 0) {
    printSection('Warnings');
    for (const warning of validation.warnings) {
      console.log(`${colors.yellow}⚠️  ${warning.type}${colors.reset}`);
      console.log(`   Symbol: [[${warning.symbolName}]]`);
      console.log(`   File: ${warning.filePath}`);
      console.log(`   ${warning.message}`);
      if (warning.count !== undefined) {
        console.log(`   Count: ${warning.count}`);
      }
      console.log();
    }
  }

  // Summary
  printSection('Summary');
  const stats = registry.getStatistics();
  console.log(`Total definitions: ${colors.green}${stats.totalDefinitions}${colors.reset}`);
  console.log(`Errors: ${validation.errors.length > 0 ? colors.red : colors.green}${validation.errors.length}${colors.reset}`);
  console.log(`Warnings: ${validation.warnings.length > 0 ? colors.yellow : colors.green}${validation.warnings.length}${colors.reset}`);
  console.log();

  if (validation.valid) {
    console.log(`${colors.green}✅ All document symbols are valid${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Validation failed${colors.reset}`);
    process.exit(1);
  }

  console.log();
}

/**
 * Update backlinks in documents
 */
function printUpdateBacklinks(): void {
  const target = process.argv[3]; // Optional: specific file or directory
  const docsDir = target || 'docs';
  const docsPath = path.resolve(process.cwd(), docsDir);

  if (!fs.existsSync(docsPath)) {
    console.log(`${colors.red}❌ Path not found: ${docsPath}${colors.reset}`);
    process.exit(1);
  }

  printHeader('Updating Backlinks');

  // Find all markdown files
  const findMarkdownFiles = (dir: string): string[] => {
    const files: string[] = [];
    const stat = fs.statSync(dir);

    if (stat.isFile()) {
      return [dir];
    }

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const markdownFiles = findMarkdownFiles(docsPath);
  const parser = new DocumentSymbolParser();
  const registry = new DocumentSymbolRegistry();

  // Parse all documents
  for (const filePath of markdownFiles) {
    try {
      const parsed = parser.parse(filePath);
      if (parsed) {
        registry.registerDocument(parsed);
      }
    } catch (error) {
      console.log(
        `${colors.red}Error parsing ${filePath}: ${error instanceof Error ? error.message : String(error)}${colors.reset}`
      );
    }
  }

  // Parse code connections
  const srcDir = path.resolve(process.cwd(), 'src');
  const findCodeFiles = (dir: string): string[] => {
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
        files.push(...findCodeFiles(fullPath));
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const codeFiles = findCodeFiles(srcDir);
  const tsdocParser = new TSDocSymbolParser();

  for (const filePath of codeFiles) {
    const connections = tsdocParser.parseCodeFile(filePath);
    for (const conn of connections) {
      registry.registerCodeConnection(conn);
    }
  }

  // Update backlinks
  const generator = new BacklinkGenerator(registry);
  const updated = generator.updateAllBacklinks();

  printSection('Updated');
  for (const filePath of updated) {
    const symbolName = registry
      .getAllSymbolNames()
      .find((name) => registry.getDefinition(name)?.filePath === filePath);

    if (symbolName) {
      const refs = registry.getReferences(symbolName);
      const conns = registry.getCodeConnections(symbolName);
      const total = refs.length + conns.length;

      console.log(
        `${colors.green}✅${colors.reset} ${filePath} (${colors.cyan}${total}${colors.reset} backlinks)`
      );
    }
  }

  console.log();
  console.log(`${colors.green}Total: ${updated.length} documents updated${colors.reset}`);
  console.log();
}

/**
 * Update symbol references in documents
 */
function printUpdateSymbolRefs(): void {
  const target = process.argv[3]; // Optional: specific file or directory
  const docsDir = target || 'managed';
  const docsPath = path.resolve(process.cwd(), docsDir);

  if (!fs.existsSync(docsPath)) {
    console.log(`${colors.red}❌ Path not found: ${docsPath}${colors.reset}`);
    process.exit(1);
  }

  printHeader('Updating Symbol References');

  // Check if symbol registry exists
  const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
  if (!fs.existsSync(registryPath)) {
    console.log(
      `${colors.yellow}⚠️  No symbol registry found. Run "tsdoc-edge id new" first.${colors.reset}`
    );
    console.log();
    process.exit(1);
  }

  // Find all markdown files
  const findMarkdownFiles = (dir: string): string[] => {
    const files: string[] = [];
    const stat = fs.statSync(dir);

    if (stat.isFile()) {
      return [dir];
    }

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const markdownFiles = findMarkdownFiles(docsPath);
  const parser = new DocumentSymbolParser();
  const registryManager = new SymbolRegistryManager(registryPath);
  const generator = new SymbolReferenceGenerator(registryManager);

  // Parse all documents
  const parsedDocs: ParsedDocSymbols[] = [];
  for (const filePath of markdownFiles) {
    try {
      const parsed = parser.parse(filePath);
      if (parsed && parsed.symbolFootnoteRefs.length > 0) {
        parsedDocs.push(parsed);
      }
    } catch (error) {
      console.log(
        `${colors.red}Error parsing ${filePath}: ${error instanceof Error ? error.message : String(error)}${colors.reset}`
      );
    }
  }

  if (parsedDocs.length === 0) {
    console.log(`${colors.yellow}No symbol footnote references found${colors.reset}`);
    console.log();
    return;
  }

  // Update documents
  const result = generator.batchUpdate(parsedDocs);

  // Print results
  if (result.updated > 0) {
    printSection('Updated');
    for (const parsed of parsedDocs) {
      const refCount = parsed.symbolFootnoteRefs.length;
      const uniqueRefs = new Set(parsed.symbolFootnoteRefs.map((r) => r.identifier)).size;
      console.log(
        `${colors.green}✅${colors.reset} ${parsed.filePath} (${colors.cyan}${uniqueRefs}${colors.reset} refs)`
      );
    }
    console.log();
  }

  if (result.errors.length > 0) {
    printSection('Errors');
    for (const error of result.errors) {
      console.log(`${colors.red}❌ ${error.file}${colors.reset}`);
      console.log(`   ${error.error}`);
    }
    console.log();
  }

  // Check for unresolved references
  let totalUnresolved = 0;
  for (const parsed of parsedDocs) {
    const unresolved = generator.getUnresolved(parsed);
    if (unresolved.length > 0) {
      if (totalUnresolved === 0) {
        printSection('Unresolved References');
      }
      console.log(`${colors.yellow}⚠️  ${parsed.filePath}${colors.reset}`);
      for (const u of unresolved) {
        console.log(`   Line ${u.line}: [^${u.identifier}]`);
      }
      totalUnresolved += unresolved.length;
    }
  }

  if (totalUnresolved > 0) {
    console.log();
  }

  // Summary
  console.log(
    `${colors.green}Total: ${result.updated} documents updated${colors.reset}`
  );
  if (result.skipped > 0) {
    console.log(`${colors.yellow}Skipped: ${result.skipped}${colors.reset}`);
  }
  if (totalUnresolved > 0) {
    console.log(
      `${colors.yellow}Unresolved: ${totalUnresolved} references${colors.reset}`
    );
  }
  console.log();
}

/**
 * Check for duplicate content across specifications
 */
function printCheckDuplicates(): void {
  const target = process.argv[3]; // Optional: specific file or directory
  const docsDir = target || 'managed';
  const docsPath = path.resolve(process.cwd(), docsDir);

  if (!fs.existsSync(docsPath)) {
    console.log(`${colors.red}❌ Path not found: ${docsPath}${colors.reset}`);
    process.exit(1);
  }

  printHeader('Checking Content Similarity');

  // Find all markdown files
  const findMarkdownFiles = (dir: string): string[] => {
    const files: string[] = [];
    const stat = fs.statSync(dir);

    if (stat.isFile()) {
      return [dir];
    }

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const markdownFiles = findMarkdownFiles(docsPath);

  if (markdownFiles.length === 0) {
    console.log(`${colors.yellow}No markdown files found${colors.reset}`);
    console.log();
    return;
  }

  if (markdownFiles.length < 2) {
    console.log(`${colors.yellow}Need at least 2 files to check for duplicates${colors.reset}`);
    console.log();
    return;
  }

  const checker = new SpecContentSimilarityChecker();
  const results = checker.checkMultiple(markdownFiles);
  const summary = checker.getSummary(results);

  // Print summary
  printSection('Summary');
  console.log(`Total documents: ${colors.cyan}${markdownFiles.length}${colors.reset}`);
  console.log(`Pairs analyzed: ${colors.cyan}${(markdownFiles.length * (markdownFiles.length - 1)) / 2}${colors.reset}`);
  console.log(`Similar pairs found: ${colors.cyan}${summary.totalPairs}${colors.reset}`);
  console.log(`Average similarity: ${colors.cyan}${(summary.averageSimilarity * 100).toFixed(1)}%${colors.reset}`);
  console.log();
  console.log(`${colors.bold}Suggestions:${colors.reset}`);
  console.log(`  Merge: ${colors.red}${summary.mergeSuggestions}${colors.reset}`);
  console.log(`  Cross-reference: ${colors.yellow}${summary.crossRefSuggestions}${colors.reset}`);
  console.log(`  Keep separate: ${colors.green}${summary.keepSeparate}${colors.reset}`);
  console.log();

  if (results.length === 0) {
    console.log(`${colors.green}✅ No significant content similarity detected${colors.reset}`);
    console.log();
    return;
  }

  // Print merge suggestions
  const mergeSuggestions = results.filter((r) => r.suggestion === 'merge');
  if (mergeSuggestions.length > 0) {
    printSection('Merge Suggestions (High Similarity)');
    for (const result of mergeSuggestions) {
      console.log(`${colors.red}🔴${colors.reset} ${colors.bold}Similarity: ${(result.similarity * 100).toFixed(1)}%${colors.reset}`);
      console.log(`   File 1: ${result.file1}`);
      console.log(`   File 2: ${result.file2}`);
      console.log(`   ${colors.dim}${result.reason}${colors.reset}`);

      if (result.overlappingSections.length > 0) {
        console.log(`   ${colors.bold}Overlapping sections:${colors.reset}`);
        for (const section of result.overlappingSections) {
          console.log(`     - ${section.section} (${(section.similarity * 100).toFixed(1)}%)`);
        }
      }
      console.log();
    }
  }

  // Print cross-reference suggestions
  const crossRefSuggestions = results.filter((r) => r.suggestion === 'cross-reference');
  if (crossRefSuggestions.length > 0) {
    printSection('Cross-Reference Suggestions (Moderate Similarity)');
    for (const result of crossRefSuggestions) {
      console.log(`${colors.yellow}🟡${colors.reset} ${colors.bold}Similarity: ${(result.similarity * 100).toFixed(1)}%${colors.reset}`);
      console.log(`   File 1: ${result.file1}`);
      console.log(`   File 2: ${result.file2}`);
      console.log(`   ${colors.dim}${result.reason}${colors.reset}`);

      if (result.overlappingSections.length > 0) {
        console.log(`   ${colors.bold}Overlapping sections:${colors.reset}`);
        for (const section of result.overlappingSections) {
          console.log(`     - ${section.section} (${(section.similarity * 100).toFixed(1)}%)`);
        }
      }
      console.log();
    }
  }

  // Print keep-separate
  const keepSeparate = results.filter((r) => r.suggestion === 'keep-separate');
  if (keepSeparate.length > 0) {
    printSection('Keep Separate (Low Similarity)');
    for (const result of keepSeparate) {
      console.log(`${colors.green}🟢${colors.reset} ${colors.bold}Similarity: ${(result.similarity * 100).toFixed(1)}%${colors.reset}`);
      console.log(`   File 1: ${result.file1}`);
      console.log(`   File 2: ${result.file2}`);
      console.log(`   ${colors.dim}${result.reason}${colors.reset}`);
      console.log();
    }
  }

  // Exit with warning if merge suggestions exist
  if (mergeSuggestions.length > 0) {
    console.log(`${colors.yellow}⚠️  Found ${mergeSuggestions.length} pair(s) with high similarity that should be merged${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Find unused and stale documents
 */
function printFindUnusedDocs(): void {
  const target = process.argv[3];
  const dir = target || 'managed';
  const dirPath = path.resolve(process.cwd(), dir);

  if (!fs.existsSync(dirPath)) {
    console.log(`${colors.red}❌ Directory not found: ${dirPath}${colors.reset}`);
    process.exit(1);
  }

  printHeader('Finding Unused Documents');

  const detector = new UnusedDocumentDetector();
  const results = detector.detect(dirPath);
  const summary = detector.getSummary(results);

  // Print summary
  printSection('Summary');
  console.log(`Total unused/stale documents: ${colors.cyan}${summary.total}${colors.reset}`);

  if (summary.total === 0) {
    console.log(`${colors.green}✅ No unused or stale documents found${colors.reset}`);
    console.log();
    return;
  }

  console.log(`Average days since modified: ${colors.cyan}${summary.averageDaysSinceModified}${colors.reset}`);
  console.log();

  console.log(`${colors.bold}By Reason:${colors.reset}`);
  for (const [reason, count] of Object.entries(summary.byReason)) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log();

  console.log(`${colors.bold}By Suggested Action:${colors.reset}`);
  for (const [action, count] of Object.entries(summary.byAction)) {
    const actionColor =
      action === 'delete'
        ? colors.red
        : action === 'archive'
        ? colors.yellow
        : colors.blue;
    console.log(`  ${actionColor}${action}${colors.reset}: ${count}`);
  }
  console.log();

  // Group by suggested action
  const byAction: Record<string, typeof results> = {
    delete: [],
    archive: [],
    review: [],
    complete: [],
  };

  for (const result of results) {
    byAction[result.suggestedAction].push(result);
  }

  // Print delete suggestions
  if (byAction.delete.length > 0) {
    printSection('Suggested: Delete');
    console.log(`${colors.dim}These documents are stale drafts with no references${colors.reset}`);
    console.log();

    for (const doc of byAction.delete) {
      console.log(`${colors.red}🗑️  ${colors.reset}${doc.filePath}`);
      console.log(`   Last modified: ${doc.lastModified} (${doc.daysSinceModified} days ago)`);
      console.log(`   References: ${doc.referenceCount} | Code connections: ${doc.codeConnectionCount}`);
      console.log(`   ${colors.dim}Reason: ${doc.reason}${colors.reset}`);
      console.log();
    }
  }

  // Print archive suggestions
  if (byAction.archive.length > 0) {
    printSection('Suggested: Archive');
    console.log(`${colors.dim}These documents should be moved to archive/${colors.reset}`);
    console.log();

    for (const doc of byAction.archive) {
      console.log(`${colors.yellow}📦${colors.reset} ${doc.filePath}`);
      console.log(`   Last modified: ${doc.lastModified} (${doc.daysSinceModified} days ago)`);
      console.log(`   References: ${doc.referenceCount} | Code connections: ${doc.codeConnectionCount}`);
      console.log(`   ${colors.dim}Reason: ${doc.reason}${colors.reset}`);
      console.log();
    }
  }

  // Print review suggestions
  if (byAction.review.length > 0) {
    printSection('Suggested: Review');
    console.log(`${colors.dim}These documents need attention${colors.reset}`);
    console.log();

    for (const doc of byAction.review) {
      console.log(`${colors.blue}🔍${colors.reset} ${doc.filePath}`);
      console.log(`   Last modified: ${doc.lastModified} (${doc.daysSinceModified} days ago)`);
      console.log(`   References: ${doc.referenceCount} | Code connections: ${doc.codeConnectionCount}`);
      console.log(`   ${colors.dim}Reason: ${doc.reason}${colors.reset}`);
      console.log();
    }
  }

  // Print complete suggestions
  if (byAction.complete.length > 0) {
    printSection('Suggested: Complete');
    console.log(`${colors.dim}These documents should add code connections${colors.reset}`);
    console.log();

    for (const doc of byAction.complete) {
      console.log(`${colors.cyan}✏️${colors.reset}  ${doc.filePath}`);
      console.log(`   Last modified: ${doc.lastModified} (${doc.daysSinceModified} days ago)`);
      console.log(`   References: ${doc.referenceCount} | Code connections: ${doc.codeConnectionCount}`);
      console.log(`   ${colors.dim}Reason: ${doc.reason}${colors.reset}`);
      console.log();
    }
  }

  // Print action recommendations
  printSection('Recommended Actions');
  console.log(`1. ${colors.red}Delete${colors.reset} stale drafts:`);
  console.log(`   ${colors.dim}rm ${byAction.delete.map((d) => d.filePath).join(' ')}${colors.reset}`);
  console.log();

  if (byAction.archive.length > 0) {
    console.log(`2. ${colors.yellow}Archive${colors.reset} deprecated documents:`);
    console.log(`   ${colors.dim}mkdir -p archive/ && mv <file> archive/${colors.reset}`);
    console.log();
  }

  if (byAction.review.length > 0) {
    console.log(`3. ${colors.blue}Review${colors.reset} and complete or delete stale documents`);
    console.log();
  }

  // Exit with warning if there are unused docs
  if (summary.total > 0) {
    process.exit(1);
  }
}

/**
 * Manage specification status workflow
 */
function printSpecStatus(): void {
  const subcommand = process.argv[3]; // show, promote, list-ready
  const target = process.argv[4];

  if (!subcommand) {
    console.log(`${colors.red}Usage:${colors.reset}`);
    console.log(`  tsdoc-edge spec-status show <file>           - Show current status and allowed transitions`);
    console.log(`  tsdoc-edge spec-status promote <file> <status> - Promote document to new status`);
    console.log(`  tsdoc-edge spec-status list-ready [dir]      - List documents ready for promotion`);
    console.log(`  tsdoc-edge spec-status stats [dir]           - Show status distribution`);
    process.exit(1);
  }

  const manager = new SpecStatusManager();

  // show: Show current status
  if (subcommand === 'show') {
    if (!target) {
      console.log(`${colors.red}Usage: tsdoc-edge spec-status show <file>${colors.reset}`);
      process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), target);

    if (!fs.existsSync(filePath)) {
      console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
      process.exit(1);
    }

    printHeader('Specification Status');

    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    let currentStatus: string = 'draft';
    if (frontmatterMatch) {
      const statusMatch = frontmatterMatch[1].match(/status:\s*["']?(\w+)["']?/);
      currentStatus = statusMatch ? statusMatch[1] : 'draft';
    }

    console.log(`File: ${colors.cyan}${filePath}${colors.reset}`);
    console.log(`Current status: ${colors.bold}${currentStatus}${colors.reset}`);
    console.log();

    const allowed = manager.getAllowedTransitions(filePath);
    console.log(`${colors.bold}Allowed transitions:${colors.reset}`);
    if (allowed.length === 0) {
      console.log(`  ${colors.dim}(none - terminal status)${colors.reset}`);
    } else {
      for (const status of allowed) {
        const validation = manager.validateTransition(filePath, status);
        const icon = validation.valid ? colors.green + '✅' : colors.yellow + '⚠️';
        console.log(`  ${icon} ${status}${colors.reset}`);

        if (!validation.valid) {
          for (const check of validation.checks.filter((c) => !c.passed)) {
            console.log(`     ${colors.dim}${check.message}${colors.reset}`);
          }
        }
      }
    }
    console.log();
  }

  // promote: Promote to new status
  else if (subcommand === 'promote') {
    const newStatus = process.argv[5];

    if (!target || !newStatus) {
      console.log(`${colors.red}Usage: tsdoc-edge spec-status promote <file> <status>${colors.reset}`);
      console.log(`Valid statuses: draft, review, approved, active, deprecated, archived`);
      process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), target);

    if (!fs.existsSync(filePath)) {
      console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
      process.exit(1);
    }

    printHeader('Promoting Specification');

    console.log(`File: ${colors.cyan}${filePath}${colors.reset}`);
    console.log(`Target status: ${colors.bold}${newStatus}${colors.reset}`);
    console.log();

    const validation = manager.validateTransition(filePath, newStatus as any);

    printSection('Validation Checks');
    for (const check of validation.checks) {
      const icon = check.passed ? colors.green + '✅' : colors.red + '❌';
      console.log(`${icon} ${check.name}${colors.reset}`);
      console.log(`   ${colors.dim}${check.message}${colors.reset}`);
    }
    console.log();

    if (!validation.valid) {
      console.log(`${colors.red}❌ Cannot promote: validation failed${colors.reset}`);
      process.exit(1);
    }

    // Apply transition
    try {
      manager.applyTransition(filePath, newStatus as any);
      console.log(`${colors.green}✅ Successfully promoted to "${newStatus}"${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Error: ${(error as Error).message}${colors.reset}`);
      process.exit(1);
    }
  }

  // list-ready: List documents ready for promotion
  else if (subcommand === 'list-ready') {
    const dir = target || 'managed';
    const dirPath = path.resolve(process.cwd(), dir);

    if (!fs.existsSync(dirPath)) {
      console.log(`${colors.red}❌ Directory not found: ${dirPath}${colors.reset}`);
      process.exit(1);
    }

    printHeader('Documents Ready for Promotion');

    // Find all markdown files
    const findMarkdownFiles = (dir: string): string[] => {
      const files: string[] = [];
      const stat = fs.statSync(dir);

      if (stat.isFile()) {
        return [dir];
      }

      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const entryStat = fs.statSync(fullPath);

        if (entryStat.isDirectory()) {
          files.push(...findMarkdownFiles(fullPath));
        } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const markdownFiles = findMarkdownFiles(dirPath);
    const promotable = manager.getPromotableDocs(markdownFiles);

    const ready = promotable.filter((p) => p.canPromote);
    const notReady = promotable.filter((p) => !p.canPromote);

    printSection('Ready for Promotion');
    if (ready.length === 0) {
      console.log(`${colors.dim}(no documents ready)${colors.reset}`);
    } else {
      for (const doc of ready) {
        console.log(`${colors.green}✅${colors.reset} ${doc.filePath}`);
        console.log(`   ${doc.currentStatus} → ${doc.targetStatus}`);
        console.log(`   ${colors.dim}${doc.reason}${colors.reset}`);
        console.log();
      }
    }

    if (notReady.length > 0) {
      printSection('Not Ready');
      for (const doc of notReady) {
        console.log(`${colors.yellow}⚠️${colors.reset} ${doc.filePath}`);
        console.log(`   ${doc.currentStatus} → ${doc.targetStatus}`);
        console.log(`   ${colors.dim}${doc.reason}${colors.reset}`);
        console.log();
      }
    }
  }

  // stats: Show status distribution
  else if (subcommand === 'stats') {
    const dir = target || 'managed';
    const dirPath = path.resolve(process.cwd(), dir);

    if (!fs.existsSync(dirPath)) {
      console.log(`${colors.red}❌ Directory not found: ${dirPath}${colors.reset}`);
      process.exit(1);
    }

    printHeader('Specification Status Distribution');

    // Find all markdown files
    const findMarkdownFiles = (dir: string): string[] => {
      const files: string[] = [];
      const stat = fs.statSync(dir);

      if (stat.isFile()) {
        return [dir];
      }

      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const entryStat = fs.statSync(fullPath);

        if (entryStat.isDirectory()) {
          files.push(...findMarkdownFiles(fullPath));
        } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const markdownFiles = findMarkdownFiles(dirPath);
    const distribution = manager.getStatusDistribution(markdownFiles);

    printSection('Status Distribution');
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

    console.log(`Total documents: ${colors.cyan}${total}${colors.reset}`);
    console.log();

    for (const [status, count] of Object.entries(distribution)) {
      if (count > 0) {
        const percentage = ((count / total) * 100).toFixed(1);
        console.log(`  ${colors.bold}${status}${colors.reset}: ${count} (${percentage}%)`);
      }
    }
    console.log();
  }

  else {
    console.log(`${colors.red}Unknown subcommand: ${subcommand}${colors.reset}`);
    console.log(`Valid subcommands: show, promote, list-ready, stats`);
    process.exit(1);
  }
}

/**
 * Validate specification completeness
 */
function printValidateSpec(): void {
  const target = process.argv[3]; // Optional: specific file or directory
  const docsDir = target || 'managed';
  const docsPath = path.resolve(process.cwd(), docsDir);

  if (!fs.existsSync(docsPath)) {
    console.log(`${colors.red}❌ Path not found: ${docsPath}${colors.reset}`);
    process.exit(1);
  }

  printHeader('Validating Specification Completeness');

  // Find all markdown files
  const findMarkdownFiles = (dir: string): string[] => {
    const files: string[] = [];
    const stat = fs.statSync(dir);

    if (stat.isFile()) {
      return [dir];
    }

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const markdownFiles = findMarkdownFiles(docsPath);

  if (markdownFiles.length === 0) {
    console.log(`${colors.yellow}No markdown files found${colors.reset}`);
    console.log();
    return;
  }

  const validator = new SpecCompletenessValidator();
  const results = validator.validateMultiple(markdownFiles);
  const summary = validator.getSummary(results);

  // Print summary
  printSection('Summary');
  console.log(`Total specifications: ${colors.cyan}${summary.total}${colors.reset}`);
  console.log(`Complete: ${colors.green}${summary.complete}${colors.reset}`);
  console.log(`Incomplete: ${colors.yellow}${summary.incomplete}${colors.reset}`);
  console.log(`Average score: ${colors.cyan}${summary.averageScore}%${colors.reset}`);
  console.log(`Total issues: ${summary.totalIssues > 0 ? colors.yellow : colors.green}${summary.totalIssues}${colors.reset}`);
  console.log();

  // Print complete specs
  const completeSpecs = results.filter((r) => r.isComplete);
  if (completeSpecs.length > 0) {
    printSection('Complete Specifications');
    for (const result of completeSpecs) {
      console.log(
        `${colors.green}✅${colors.reset} ${result.filePath} (${colors.green}${result.score}%${colors.reset})`
      );
    }
    console.log();
  }

  // Print incomplete specs
  const incompleteSpecs = results.filter((r) => !r.isComplete);
  if (incompleteSpecs.length > 0) {
    printSection('Incomplete Specifications');
    for (const result of incompleteSpecs) {
      console.log(
        `${colors.yellow}⚠️${colors.reset} ${result.filePath} (${colors.yellow}${result.score}%${colors.reset})`
      );

      // Show breakdown
      console.log(`   Required sections: ${result.breakdown.requiredSections.score}%`);
      if (result.breakdown.requiredSections.missing.length > 0) {
        console.log(
          `     Missing: ${result.breakdown.requiredSections.missing.join(', ')}`
        );
      }

      if (result.breakdown.scenarios.count < result.breakdown.scenarios.required) {
        console.log(
          `   Scenarios: ${result.breakdown.scenarios.count}/${result.breakdown.scenarios.required}`
        );
      }

      if (result.breakdown.codeReferences.count < result.breakdown.codeReferences.required) {
        console.log(
          `   Code references: ${result.breakdown.codeReferences.count}/${result.breakdown.codeReferences.required}`
        );
      }

      if (result.breakdown.examples.count < result.breakdown.examples.required) {
        console.log(
          `   Examples: ${result.breakdown.examples.count}/${result.breakdown.examples.required}`
        );
      }

      console.log();
    }
  }

  // Print detailed issues
  const specsWithIssues = results.filter((r) => r.issues.length > 0);
  if (specsWithIssues.length > 0) {
    printSection('Issues');
    for (const result of specsWithIssues) {
      if (result.issues.length > 0) {
        console.log(`${colors.yellow}${result.filePath}${colors.reset}`);
        for (const issue of result.issues) {
          const icon = issue.severity === 'error' ? colors.red + '❌' : colors.yellow + '⚠️';
          console.log(`  ${icon} ${issue.message}${colors.reset}`);
        }
        console.log();
      }
    }
  }

  // Exit with error if any spec is incomplete
  if (summary.incomplete > 0) {
    process.exit(1);
  }
}

/**
 * Show specification version history
 */
function printSpecHistory(): void {
  const target = process.argv[3];

  if (!target) {
    console.log(`${colors.red}Usage: tsdoc-edge spec-history <file>${colors.reset}`);
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), target);

  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
    process.exit(1);
  }

  const manager = new SpecVersionManager();
  const history = manager.getHistory(filePath);

  if (history.length === 0) {
    console.log(`${colors.yellow}No version history found${colors.reset}`);
    console.log();
    return;
  }

  printHeader('Specification Version History');
  console.log(`File: ${colors.cyan}${path.relative(process.cwd(), filePath)}${colors.reset}`);
  console.log();

  printSection(`${history.length} versions found`);

  for (const entry of history) {
    console.log(`${colors.green}v${entry.version}${colors.reset} (${entry.date})`);
    console.log(`  ${colors.dim}Commit:  ${entry.commit}${colors.reset}`);
    console.log(`  ${colors.dim}Author:  ${entry.author}${colors.reset}`);
    console.log(`  ${colors.dim}Message: ${entry.message}${colors.reset}`);
    console.log();
  }
}

/**
 * Compare specification versions
 */
function printSpecDiff(): void {
  const target = process.argv[3];
  const fromVersion = process.argv[4];
  const toVersion = process.argv[5];

  if (!target || !fromVersion || !toVersion) {
    console.log(`${colors.red}Usage: tsdoc-edge spec-diff <file> <from-version> <to-version>${colors.reset}`);
    console.log(`Example: tsdoc-edge spec-diff managed/features/validation.md 1.0.0 2.0.0`);
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), target);

  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
    process.exit(1);
  }

  const manager = new SpecVersionManager();

  try {
    const diff = manager.diff(filePath, fromVersion, toVersion);

    printHeader('Specification Version Comparison');
    console.log(`File: ${colors.cyan}${path.relative(process.cwd(), filePath)}${colors.reset}`);
    console.log(`From: ${colors.yellow}v${diff.from}${colors.reset}`);
    console.log(`To:   ${colors.green}v${diff.to}${colors.reset}`);
    console.log();

    printSection('Summary');
    console.log(diff.summary);
    console.log();

    if (diff.changes.added.length > 0) {
      printSection('Added Sections');
      for (const section of diff.changes.added) {
        console.log(`${colors.green}+ ${section}${colors.reset}`);
      }
      console.log();
    }

    if (diff.changes.removed.length > 0) {
      printSection('Removed Sections');
      for (const section of diff.changes.removed) {
        console.log(`${colors.red}- ${section}${colors.reset}`);
      }
      console.log();
    }

    if (diff.changes.modified.length > 0) {
      printSection('Modified Content');
      for (const section of diff.changes.modified) {
        console.log(`${colors.yellow}~ ${section}${colors.reset}`);
      }
      console.log();
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Bump specification version
 */
function printSpecBump(): void {
  const target = process.argv[3];
  const bumpType = process.argv[4] as 'major' | 'minor' | 'patch' | undefined;

  if (!target) {
    console.log(`${colors.red}Usage: tsdoc-edge spec-bump <file> <bump-type>${colors.reset}`);
    console.log(`Bump types: major, minor, patch`);
    console.log(`Example: tsdoc-edge spec-bump managed/features/validation.md minor`);
    process.exit(1);
  }

  if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
    console.log(`${colors.red}Invalid bump type. Use: major, minor, or patch${colors.reset}`);
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), target);

  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
    process.exit(1);
  }

  const manager = new SpecVersionManager();

  try {
    const oldVersion = manager.getCurrentVersion(filePath);
    const newVersion = manager.bump(filePath, bumpType);

    printHeader('Version Bumped');
    console.log(`File: ${colors.cyan}${path.relative(process.cwd(), filePath)}${colors.reset}`);
    console.log(`Old version: ${colors.yellow}${oldVersion}${colors.reset}`);
    console.log(`New version: ${colors.green}${newVersion}${colors.reset}`);
    console.log(`Bump type:   ${colors.blue}${bumpType}${colors.reset}`);
    console.log();
    console.log(`${colors.green}✓${colors.reset} Version updated successfully`);
    console.log();
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Find document symbol
 */
function printFindDocSymbol(): void {
  const symbolName = process.argv[3];

  if (!symbolName) {
    console.log(`${colors.red}Usage: tsdoc-edge find-doc <symbol-name>${colors.reset}`);
    process.exit(1);
  }

  const docsDir = 'docs';
  const docsPath = path.resolve(process.cwd(), docsDir);

  if (!fs.existsSync(docsPath)) {
    console.log(`${colors.red}❌ Directory not found: ${docsPath}${colors.reset}`);
    process.exit(1);
  }

  // Find and parse documents
  const findMarkdownFiles = (dir: string): string[] => {
    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const markdownFiles = findMarkdownFiles(docsPath);
  const parser = new DocumentSymbolParser();
  const registry = new DocumentSymbolRegistry();

  for (const filePath of markdownFiles) {
    try {
      const parsed = parser.parse(filePath);
      if (parsed) {
        registry.registerDocument(parsed);
      }
    } catch (error) {
      // Silent
    }
  }

  // Parse code connections
  const srcDir = path.resolve(process.cwd(), 'src');
  const findCodeFiles = (dir: string): string[] => {
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
        files.push(...findCodeFiles(fullPath));
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }

    return files;
  };

  const codeFiles = findCodeFiles(srcDir);
  const tsdocParser = new TSDocSymbolParser();

  for (const filePath of codeFiles) {
    const connections = tsdocParser.parseCodeFile(filePath);
    for (const conn of connections) {
      registry.registerCodeConnection(conn);
    }
  }

  // Find symbol
  const definition = registry.getDefinition(symbolName);

  if (!definition) {
    console.log(`${colors.red}❌ Symbol not found: [[${symbolName}]]${colors.reset}`);
    console.log();
    console.log('Available symbols:');
    const allSymbols = registry.getAllSymbolNames();
    for (const name of allSymbols.slice(0, 10)) {
      console.log(`  - [[${name}]]`);
    }
    if (allSymbols.length > 10) {
      console.log(`  ... and ${allSymbols.length - 10} more`);
    }
    process.exit(1);
  }

  printHeader(`[[${symbolName}]]`);

  console.log(`${colors.bold}Defined in:${colors.reset} ${definition.filePath}:${definition.line}`);
  console.log();

  const refs = registry.getReferences(symbolName);
  if (refs.length > 0) {
    printSection(`Referenced by (${refs.length})`);
    for (const ref of refs.slice(0, 10)) {
      const sectionPart = ref.section ? `#${ref.section}` : '';
      console.log(`  - ${ref.filePath}:${ref.line}${sectionPart}`);
    }
    if (refs.length > 10) {
      console.log(`  ... and ${refs.length - 10} more`);
    }
    console.log();
  }

  const conns = registry.getCodeConnections(symbolName);
  if (conns.length > 0) {
    printSection(`Implemented by (${conns.length})`);
    for (const conn of conns.slice(0, 10)) {
      const sectionPart = conn.section ? ` (${conn.section})` : '';
      console.log(`  - ${conn.codeSymbol}${sectionPart} → ${conn.filePath}:${conn.line}`);
    }
    if (conns.length > 10) {
      console.log(`  ... and ${conns.length - 10} more`);
    }
    console.log();
  }
}

/**
 * Sync coverage data to symbols
 * @returns void
 * @public
 */
function printSyncCoverage(): void {
  printHeader('TSDoc Edge - Sync Coverage');

  const coveragePath = process.argv[3] || 'coverage/coverage-final.json';
  const dbPath = path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');
  const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');

  if (!fs.existsSync(coveragePath)) {
    console.log(
      `${colors.red}✗ Coverage file not found: ${coveragePath}${colors.reset}`
    );
    console.log();
    console.log('Expected Istanbul coverage format (coverage-final.json)');
    console.log('Generated by: Jest, Vitest, NYC, c8, or other Istanbul-compatible tools');
    console.log();
    console.log('To generate coverage:');
    console.log(`${colors.cyan}  jest --coverage${colors.reset}`);
    console.log(`${colors.cyan}  vitest run --coverage${colors.reset}`);
    console.log();
    return;
  }

  if (!fs.existsSync(dbPath)) {
    console.log(
      `${colors.yellow}⚠️  Database not found. Run build first:${colors.reset}`
    );
    console.log(`${colors.cyan}  tsdoc-edge build${colors.reset}`);
    console.log();
    return;
  }

  console.log(`Reading coverage from: ${colors.cyan}${coveragePath}${colors.reset}`);
  console.log();

  try {
    // Import coverage modules
    const { CoverageSyncer } = require('./analyzer/CoverageSyncAdapter');
    const { IstanbulCoverageAdapter } = require('./analyzer/IstanbulCoverageAdapter');
    const { updateSymbolWithCoverage } = require('./analyzer/CoverageSyncAdapter');

    // Create syncer with Istanbul adapter
    const adapter = new IstanbulCoverageAdapter();
    const syncer = new CoverageSyncer(adapter);

    // Parse coverage
    printSection('📊 Parsing Coverage Data');
    const summary = syncer.parseCoverage(coveragePath);

    console.log(`   Files: ${colors.green}${summary.totalFiles}${colors.reset}`);
    console.log(`   Statements: ${colors.green}${summary.statements.toFixed(2)}%${colors.reset}`);
    console.log(`   Functions: ${colors.green}${summary.functions.toFixed(2)}%${colors.reset}`);
    console.log(`   Branches: ${colors.green}${summary.branches.toFixed(2)}%${colors.reset}`);
    console.log(`   Lines: ${colors.green}${summary.lines.toFixed(2)}%${colors.reset}`);
    console.log();

    // Load symbols from database
    printSection('🔄 Syncing Coverage to Symbols');
    const dbManager = new DatabaseManager(dbPath, jsonlPath);

    // Get all symbols
    const query = 'SELECT * FROM symbols';
    const rows = dbManager.db.prepare(query).all() as SymbolRow[];

    const symbols: Symbol[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as any,
      filePath: row.file_path,
      line: row.line,
      column: row.column,
      isExported: row.is_exported === 1,
      isPublic: row.is_public === 1,
      summary: row.summary || undefined,
      tests: [],
      designDecisions: [],
    }));

    console.log(`   Total Symbols: ${colors.green}${symbols.length}${colors.reset}`);
    console.log();

    // Sync coverage
    const result = syncer.syncToSymbols(symbols, summary);

    // Print results
    printSection('📈 Coverage Sync Results');
    console.log(`   Total Symbols: ${result.totalSymbols}`);
    console.log(`   Covered Symbols: ${colors.green}${result.coveredSymbols}${colors.reset}`);
    console.log(`   Uncovered Symbols: ${colors.red}${result.uncoveredSymbols}${colors.reset}`);
    console.log(`   Overall Coverage: ${colors.green}${result.overallCoverage.toFixed(2)}%${colors.reset}`);
    console.log();

    // Show top covered symbols
    printSection('✅ Top Covered Symbols');
    const covered = result.symbolCoverages
      .filter((s: SymbolCoverage) => s.covered)
      .sort((a: SymbolCoverage, b: SymbolCoverage) => (b.executionCount || 0) - (a.executionCount || 0))
      .slice(0, 10);

    for (const cov of covered) {
      const execCount = cov.executionCount !== undefined ? ` (${cov.executionCount}x)` : '';
      console.log(`   ${colors.green}✓${colors.reset} ${cov.symbolName}${execCount}`);
      console.log(`     ${colors.dim}${cov.filePath}:${cov.line}${colors.reset}`);
    }
    console.log();

    // Show uncovered symbols
    printSection('❌ Uncovered Symbols');
    const uncovered = result.symbolCoverages
      .filter((s: SymbolCoverage) => !s.covered)
      .slice(0, 10);

    for (const cov of uncovered) {
      console.log(`   ${colors.red}✗${colors.reset} ${cov.symbolName}`);
      console.log(`     ${colors.dim}${cov.filePath}:${cov.line}${colors.reset}`);
    }

    if (result.uncoveredSymbols > 10) {
      console.log(`   ${colors.dim}... and ${result.uncoveredSymbols - 10} more${colors.reset}`);
    }
    console.log();

    // Update symbols in database with coverage metadata
    printSection('💾 Updating Database');
    let updatedCount = 0;

    for (const cov of result.symbolCoverages) {
      const symbol = symbols.find((s) => s.id === cov.symbolId);
      if (symbol) {
        const updated = updateSymbolWithCoverage(symbol, cov);

        // Update metadata in database (store as JSON)
        const metadataJson = JSON.stringify(updated.metadata || {});
        dbManager.db
          .prepare('UPDATE symbols SET summary = ? WHERE id = ?')
          .run(metadataJson, symbol.id);

        updatedCount++;
      }
    }

    console.log(`   Updated ${colors.green}${updatedCount}${colors.reset} symbols with coverage metadata`);
    console.log();

    console.log(`${colors.green}✓ Coverage sync completed successfully!${colors.reset}`);
    console.log();
  } catch (error) {
    console.log(`${colors.red}✗ Error syncing coverage:${colors.reset}`);
    console.log(`  ${(error as Error).message}`);
    console.log();
    process.exit(1);
  }
}

/**
 * Parse enhanced documentation from TypeScript files
 * @returns void
 * @public
 */
function printParse(): void {
  printHeader('TSDoc Edge - Parse Enhanced Docs');

  const sourcePath = process.argv[3];

  if (!sourcePath) {
    console.log(`${colors.red}✗ Source path required${colors.reset}`);
    console.log();
    console.log('Usage:');
    console.log(`${colors.cyan}  tsdoc-edge parse <file|directory>${colors.reset}`);
    console.log();
    console.log('Examples:');
    console.log(`  tsdoc-edge parse src/analyzer/CodeHealthChecker.ts`);
    console.log(`  tsdoc-edge parse src`);
    console.log();
    return;
  }

  if (!fs.existsSync(sourcePath)) {
    console.log(
      `${colors.red}✗ Source path not found: ${sourcePath}${colors.reset}`
    );
    console.log();
    return;
  }

  console.log(`Parsing: ${colors.cyan}${sourcePath}${colors.reset}`);
  console.log();

  try {
    // Import enhanced doc extractor
    const { EnhancedDocExtractor } = require('./parser/EnhancedDocExtractor');

    const extractor = new EnhancedDocExtractor({
      includePartial: true,
      autoGenerateIds: true,
    });

    const stats = fs.statSync(sourcePath);
    let allResults: any[] = [];

    if (stats.isDirectory()) {
      // Recursively parse all .ts files
      const parseDirectory = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const fileStat = fs.statSync(filePath);

          if (fileStat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
              parseDirectory(filePath);
            }
          } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
            const sourceCode = fs.readFileSync(filePath, 'utf-8');
            const results = extractor.extractFromFile(filePath, sourceCode);
            allResults.push(...results);
          }
        }
      };

      parseDirectory(sourcePath);
    } else {
      // Parse single file
      const sourceCode = fs.readFileSync(sourcePath, 'utf-8');
      allResults = extractor.extractFromFile(sourcePath, sourceCode);
    }

    if (allResults.length === 0) {
      console.log(`${colors.yellow}⚠  No enhanced documentation found${colors.reset}`);
      console.log();
      console.log('Add custom TSDoc tags to your code:');
      console.log(`  ${colors.dim}@problem, @functionality, @errorExp, @decision, @dependency, @plan${colors.reset}`);
      console.log();
      return;
    }

    printSection('📊 Extraction Results');
    console.log(`   Total Symbols: ${colors.cyan}${allResults.length}${colors.reset}`);
    console.log();

    // Show symbols by completeness
    const byCompleteness = allResults.sort((a, b) => b.completeness - a.completeness);

    printSection('📋 Symbols by Completeness');
    byCompleteness.forEach(result => {
      const relPath = path.relative(process.cwd(), result.symbol.filePath);
      const completenessColor = result.completeness >= 70 ? colors.green :
                                 result.completeness >= 40 ? colors.yellow : colors.red;
      console.log(`   ${colors.cyan}${result.symbol.name}${colors.reset}`);
      console.log(`     ${relPath}:${result.symbol.line}`);
      console.log(`     Completeness: ${completenessColor}${result.completeness}%${colors.reset}`);
      if (result.missing.length > 0) {
        console.log(`     Missing: ${colors.dim}${result.missing.join(', ')}${colors.reset}`);
      }
      console.log();
    });

    // Calculate average completeness
    const avgCompleteness = Math.round(
      allResults.reduce((sum, r) => sum + r.completeness, 0) / allResults.length
    );

    console.log(`${colors.green}✓ Average Completeness: ${avgCompleteness}%${colors.reset}`);
    console.log();
  } catch (error) {
    console.log(`${colors.red}✗ Error parsing enhanced docs:${colors.reset}`);
    console.log(`  ${(error as Error).message}`);
    console.log();
    process.exit(1);
  }
}

/**
 * Generate markdown documentation from enhanced docs
 * @returns void
 * @public
 */
function printGenerateDocs(): void {
  printHeader('TSDoc Edge - Generate Docs');

  const sourcePath = process.argv[3];
  const outputDir = process.argv[4] || './docs/generated';

  if (!sourcePath) {
    console.log(`${colors.red}✗ Source path required${colors.reset}`);
    console.log();
    console.log('Usage:');
    console.log(`${colors.cyan}  tsdoc-edge generate-docs <file|directory> [output-dir]${colors.reset}`);
    console.log();
    console.log('Examples:');
    console.log(`  tsdoc-edge generate-docs src/analyzer/CodeHealthChecker.ts`);
    console.log(`  tsdoc-edge generate-docs src ./docs`);
    console.log();
    return;
  }

  if (!fs.existsSync(sourcePath)) {
    console.log(
      `${colors.red}✗ Source path not found: ${sourcePath}${colors.reset}`
    );
    console.log();
    return;
  }

  console.log(`Generating docs from: ${colors.cyan}${sourcePath}${colors.reset}`);
  console.log(`Output directory: ${colors.cyan}${outputDir}${colors.reset}`);
  console.log();

  try {
    // Import dependencies
    const { EnhancedDocExtractor } = require('./parser/EnhancedDocExtractor');
    const { EnhancedMarkdownGenerator } = require('./generator/EnhancedMarkdownGenerator');

    const extractor = new EnhancedDocExtractor({
      includePartial: true,
      autoGenerateIds: true,
    });
    const generator = new EnhancedMarkdownGenerator();

    const stats = fs.statSync(sourcePath);
    let allResults: any[] = [];

    if (stats.isDirectory()) {
      // Recursively parse all .ts files
      const parseDirectory = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const fileStat = fs.statSync(filePath);

          if (fileStat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
              parseDirectory(filePath);
            }
          } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
            const sourceCode = fs.readFileSync(filePath, 'utf-8');
            const results = extractor.extractFromFile(filePath, sourceCode);
            allResults.push(...results);
          }
        }
      };

      parseDirectory(sourcePath);
    } else {
      // Parse single file
      const sourceCode = fs.readFileSync(sourcePath, 'utf-8');
      allResults = extractor.extractFromFile(sourcePath, sourceCode);
    }

    if (allResults.length === 0) {
      console.log(`${colors.yellow}⚠  No enhanced documentation found${colors.reset}`);
      console.log();
      console.log('Add custom TSDoc tags to your code:');
      console.log(`  ${colors.dim}@problem, @functionality, @errorExp, @decision, @dependency, @plan${colors.reset}`);
      console.log();
      return;
    }

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    printSection('📝 Generating Markdown Files');

    let generated = 0;
    for (const result of allResults) {
      // Only generate docs for symbols with reasonable completeness
      if (result.completeness < 10) {
        console.log(`   ${colors.dim}Skipping ${result.symbol.name} (${result.completeness}% completeness)${colors.reset}`);
        continue;
      }

      const markdown = generator.generateDocument(result.symbol, result.doc);
      const fileName = `${result.symbol.name}.md`;
      const outputPath = path.join(outputDir, fileName);

      fs.writeFileSync(outputPath, markdown, 'utf-8');
      generated++;

      const relPath = path.relative(process.cwd(), outputPath);
      console.log(`   ${colors.green}✓${colors.reset} ${result.symbol.name}`);
      console.log(`     ${colors.dim}→ ${relPath}${colors.reset}`);
    }

    console.log();
    console.log(`${colors.green}✓ Generated ${generated} markdown file(s)${colors.reset}`);
    console.log();
  } catch (error) {
    console.log(`${colors.red}✗ Error generating docs:${colors.reset}`);
    console.log(`  ${(error as Error).message}`);
    console.log();
    process.exit(1);
  }
}

/**
 * Check for missing/broken links in enhanced documentation
 * @returns void
 * @public
 */
function printCheckLinks(): void {
  printHeader('TSDoc Edge - Check Links');

  const sourcePath = process.argv[3] || 'src';

  if (!fs.existsSync(sourcePath)) {
    console.log(
      `${colors.red}✗ Source path not found: ${sourcePath}${colors.reset}`
    );
    console.log();
    console.log('Usage:');
    console.log(`${colors.cyan}  tsdoc-edge check-links [path]${colors.reset}`);
    console.log();
    return;
  }

  console.log(`Analyzing links in: ${colors.cyan}${sourcePath}${colors.reset}`);
  console.log();

  try {
    // Import missing link detector and config loader
    const { MissingLinkDetector } = require('./analyzer/MissingLinkDetector');
    const { ConfigLoader } = require('./utils/ConfigLoader');

    // Load configuration
    const configLoader = new ConfigLoader();
    const linkCheckConfig = configLoader.getLinkCheckConfig();

    // Show config info if using a config file
    if (configLoader.hasConfigFile()) {
      console.log(
        `${colors.dim}Using config: ${configLoader.getConfigPath()}${colors.reset}`
      );
      console.log();
    }

    // Create detector and analyze
    printSection('🔍 Scanning Documentation');
    const detector = new MissingLinkDetector(configLoader);
    const report = detector.analyze(sourcePath);

    console.log(`   Total Links Checked: ${colors.green}${report.totalLinks}${colors.reset}`);
    console.log(`   Broken Links: ${report.brokenLinks > 0 ? colors.red : colors.green}${report.brokenLinks}${colors.reset}`);
    console.log();

    if (report.brokenLinks === 0) {
      console.log(`${colors.green}✓ All links are valid!${colors.reset}`);
      console.log();
      return;
    }

    // Show broken links by type
    printSection('❌ Broken Links by Type');
    for (const [type, links] of report.byType.entries()) {
      console.log(`   ${type}: ${colors.red}${links.length}${colors.reset}`);
    }
    console.log();

    // Show broken links by file
    printSection('📁 Broken Links by File');
    for (const [file, links] of report.byFile.entries()) {
      const relPath = path.relative(process.cwd(), file);
      console.log(`   ${relPath}: ${colors.red}${links.length}${colors.reset}`);
    }
    console.log();

    // Show detailed broken links
    printSection('🔗 Broken Link Details');
    for (const link of report.links.slice(0, 20)) {
      const relPath = path.relative(process.cwd(), link.sourceFile);
      console.log(`   ${colors.yellow}${link.linkType}${colors.reset}: ${link.target}`);
      console.log(`     in ${relPath}:${link.line} (${link.sourceSymbol})`);
      console.log(`     ${colors.dim}${link.reason}${colors.reset}`);
      if (link.suggestedFix) {
        console.log(`     ${colors.cyan}💡 ${link.suggestedFix}${colors.reset}`);
      }
      console.log();
    }

    if (report.links.length > 20) {
      console.log(`   ... and ${report.links.length - 20} more broken links`);
      console.log();
    }

    console.log(`${colors.red}✗ Found ${report.brokenLinks} broken link(s)${colors.reset}`);
    console.log();

    // Exit with error code if configured
    if (linkCheckConfig.failOnBroken) {
      process.exit(1);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error checking links:${colors.reset}`);
    console.log(`  ${(error as Error).message}`);
    console.log();
    process.exit(1);
  }
}

/**
 * Install pre-commit hook
 * @returns void
 * @public
 */
function printInstallHook(): void {
  printHeader('TSDoc Edge - Install Pre-commit Hook');

  const gitDir = path.join(process.cwd(), '.git');
  if (!fs.existsSync(gitDir)) {
    console.log(`${colors.red}✗ Not a git repository${colors.reset}`);
    console.log();
    console.log('Initialize a git repository first:');
    console.log(`  ${colors.cyan}git init${colors.reset}`);
    console.log();
    return;
  }

  const hooksDir = path.join(gitDir, 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');

  // Create hooks directory if it doesn't exist
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Check if hook already exists
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf-8');
    if (existing.includes('tsdoc-edge pre-commit-run')) {
      console.log(`${colors.yellow}⚠  Pre-commit hook already installed${colors.reset}`);
      console.log();
      return;
    }

    console.log(`${colors.yellow}⚠  Pre-commit hook already exists${colors.reset}`);
    console.log();
    console.log('To preserve existing hook, add this to your pre-commit script:');
    console.log(`  ${colors.cyan}tsdoc-edge pre-commit-run${colors.reset}`);
    console.log();
    return;
  }

  // Create hook script
  const hookScript = `#!/bin/sh
# TSDoc Edge pre-commit hook
# Auto-generated - do not edit manually

npx tsdoc-edge pre-commit-run
exit $?
`;

  try {
    fs.writeFileSync(hookPath, hookScript, 'utf-8');
    fs.chmodSync(hookPath, 0o755); // Make executable

    console.log(`${colors.green}✓ Pre-commit hook installed successfully${colors.reset}`);
    console.log();
    console.log('Hook installed at:');
    console.log(`  ${colors.cyan}${hookPath}${colors.reset}`);
    console.log();
    console.log('Configure thresholds in .tsdoc.config.json:');
    console.log(`  ${colors.dim}"preCommit": {`);
    console.log(`    "enabled": true,`);
    console.log(`    "threshold": 50,`);
    console.log(`    "warningThreshold": 30`);
    console.log(`  }${colors.reset}`);
    console.log();
  } catch (error) {
    console.log(`${colors.red}✗ Failed to install hook:${colors.reset}`);
    console.log(`  ${(error as Error).message}`);
    console.log();
    process.exit(1);
  }
}

/**
 * Uninstall pre-commit hook
 * @returns void
 * @public
 */
function printUninstallHook(): void {
  printHeader('TSDoc Edge - Uninstall Pre-commit Hook');

  const gitDir = path.join(process.cwd(), '.git');
  if (!fs.existsSync(gitDir)) {
    console.log(`${colors.red}✗ Not a git repository${colors.reset}`);
    console.log();
    return;
  }

  const hookPath = path.join(gitDir, 'hooks', 'pre-commit');

  if (!fs.existsSync(hookPath)) {
    console.log(`${colors.yellow}⚠  Pre-commit hook not found${colors.reset}`);
    console.log();
    return;
  }

  const existing = fs.readFileSync(hookPath, 'utf-8');
  if (!existing.includes('tsdoc-edge pre-commit-run')) {
    console.log(`${colors.yellow}⚠  Hook exists but was not installed by tsdoc-edge${colors.reset}`);
    console.log();
    console.log('Remove manually if needed:');
    console.log(`  ${colors.cyan}rm ${hookPath}${colors.reset}`);
    console.log();
    return;
  }

  try {
    fs.unlinkSync(hookPath);

    console.log(`${colors.green}✓ Pre-commit hook uninstalled successfully${colors.reset}`);
    console.log();
  } catch (error) {
    console.log(`${colors.red}✗ Failed to uninstall hook:${colors.reset}`);
    console.log(`  ${(error as Error).message}`);
    console.log();
    process.exit(1);
  }
}

/**
 * Run pre-commit check (called by git hook)
 * @returns void
 * @public
 */
function printPreCommitRun(): void {
  const config = ConfigManager.getInstance().get();

  // Check if pre-commit is enabled
  if (!config.preCommit?.enabled) {
    // Silently pass if not enabled
    process.exit(0);
  }

  // Import PreCommitChecker
  const { PreCommitChecker } = require('./analyzer/PreCommitChecker');

  const checker = new PreCommitChecker(config.preCommit);
  const report = checker.check();

  // No files to check
  if (report.totalFiles === 0) {
    process.exit(0);
  }

  // Print results
  console.log();
  console.log(`${colors.cyan}TSDoc Edge Pre-commit Check${colors.reset}`);
  console.log();

  if (report.passed) {
    console.log(`${colors.green}✓ All files passed documentation check${colors.reset}`);
    console.log(`  Files checked: ${report.totalFiles}`);
    if (report.warningFiles > 0) {
      console.log(`  ${colors.yellow}⚠  Files with warnings: ${report.warningFiles}${colors.reset}`);
    }
    console.log();

    // Show warnings
    for (const result of report.fileResults) {
      if (result.warningSymbols.length > 0) {
        console.log(`${colors.yellow}⚠  ${result.filePath}${colors.reset}`);
        for (const symbol of result.warningSymbols.slice(0, 3)) {
          console.log(`   ${symbol.name}:${symbol.line} - ${symbol.completeness}% completeness`);
        }
        if (result.warningSymbols.length > 3) {
          console.log(`   ... and ${result.warningSymbols.length - 3} more`);
        }
        console.log();
      }
    }

    process.exit(0);
  }

  // Failed
  console.log(`${colors.red}✗ Documentation check failed${colors.reset}`);
  console.log(`  Files checked: ${report.totalFiles}`);
  console.log(`  Files failed: ${report.failedFiles}`);
  console.log();

  // Show failures
  for (const result of report.fileResults) {
    if (!result.passed) {
      console.log(`${colors.red}✗ ${result.filePath}${colors.reset}`);

      if (result.missingDocs) {
        console.log(`   No enhanced documentation found`);
      } else {
        for (const symbol of result.failedSymbols.slice(0, 3)) {
          console.log(`   ${symbol.name}:${symbol.line} - ${colors.red}${symbol.completeness}%${colors.reset} (threshold: ${report.config.threshold}%)`);
        }
        if (result.failedSymbols.length > 3) {
          console.log(`   ... and ${result.failedSymbols.length - 3} more`);
        }
      }
      console.log();
    }
  }

  console.log('Improve documentation or adjust threshold in .tsdoc.config.json');
  console.log();
  process.exit(1);
}

// Main CLI logic
const args = process.argv.slice(2);

// Parse --config option
let configPath: string | undefined;
const configArgIndex = args.findIndex(arg => arg.startsWith('--config=') || arg === '--config');
if (configArgIndex !== -1) {
  const configArg = args[configArgIndex];
  if (configArg.startsWith('--config=')) {
    configPath = configArg.split('=')[1];
  } else if (args[configArgIndex + 1] && !args[configArgIndex + 1].startsWith('-')) {
    configPath = args[configArgIndex + 1];
    args.splice(configArgIndex + 1, 1);
  }
  args.splice(configArgIndex, 1);

  // Convert to absolute path if relative
  if (configPath && !path.isAbsolute(configPath)) {
    configPath = path.resolve(process.cwd(), configPath);
  }
}

/**
 * printGenerateSpec function - Generate 7-part module specification
 */
function printGenerateSpec(): void {
  printHeader('TSDoc Edge - Generate Module Specification');

  const filePath = process.argv[3];
  const symbolName = process.argv[4];
  const outputDir = process.argv[5] || './docs/specs';

  if (!filePath || !symbolName) {
    console.log(`${colors.red}✗ File path and symbol name required${colors.reset}`);
    console.log();
    console.log('Usage:');
    console.log(`${colors.cyan}  tsdoc-edge generate-spec <file> <symbol> [output-dir]${colors.reset}`);
    console.log();
    console.log('Arguments:');
    console.log('  <file>       Path to TypeScript file');
    console.log('  <symbol>     Name of function/class/interface to document');
    console.log('  [output-dir] Output directory (default: ./docs/specs)');
    console.log();
    console.log('Examples:');
    console.log(`  tsdoc-edge generate-spec src/analyzer/CodeHealthChecker.ts CodeHealthChecker`);
    console.log(`  tsdoc-edge generate-spec src/parser/TSDocParser.ts parseComment ./managed/specs`);
    console.log();
    console.log('The 7-part specification framework:');
    console.log('  1. Purpose    - Why this module exists');
    console.log('  2. Input      - What parameters it accepts');
    console.log('  3. Output     - What it returns');
    console.log('  4. Context    - What dependencies it needs');
    console.log('  5. Logic      - How it works internally');
    console.log('  6. Effect     - What side effects it produces');
    console.log('  7. Scope      - What it exposes publicly');
    console.log();
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.log(`${colors.red}✗ File not found: ${filePath}${colors.reset}`);
    console.log();
    return;
  }

  console.log(`File: ${colors.cyan}${filePath}${colors.reset}`);
  console.log(`Symbol: ${colors.cyan}${symbolName}${colors.reset}`);
  console.log(`Output: ${colors.cyan}${outputDir}${colors.reset}`);
  console.log();

  try {
    const generator = new ModuleSpecGenerator({
      analyzeLogic: true,
      analyzeSideEffects: true,
      includeTodos: true,
    });

    console.log(`${colors.blue}Generating specification...${colors.reset}`);
    const result: ModuleSpecResult = generator.generateSpec(resolvedPath, symbolName);

    // Show extraction results
    console.log();
    console.log(`${colors.green}✓ Specification generated${colors.reset}`);
    console.log();
    console.log('Auto-completed sections:');
    for (const section of result.autoCompleted) {
      console.log(`  ${colors.green}✓${colors.reset} ${section}`);
    }

    if (result.manualRequired.length > 0) {
      console.log();
      console.log('Manual review needed:');
      for (const section of result.manualRequired) {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${section}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log();
      console.log('Warnings:');
      for (const warning of result.warnings) {
        console.log(`  ${colors.yellow}!${colors.reset} ${warning}`);
      }
    }

    console.log();
    console.log(`${colors.bold}Completion Confidence: ${result.confidence}%${colors.reset}`);
    console.log();

    // Format as markdown
    const formatter = new ModuleSpecMarkdownFormatter({
      includeMetadata: true,
      includeConfidence: true,
      includeTodos: true,
      includeToc: true,
    });

    const markdown = formatter.format(result.spec);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename
    const outputFileName = `${result.spec.symbolId}.md`;
    const outputPath = path.join(outputDir, outputFileName);

    // Write to file
    fs.writeFileSync(outputPath, markdown, 'utf-8');

    console.log(`${colors.green}✓ Specification saved to: ${colors.cyan}${outputPath}${colors.reset}`);
    console.log();

    // Show preview
    console.log(`${colors.dim}Preview:${colors.reset}`);
    console.log(`${colors.dim}${'='.repeat(60)}${colors.reset}`);
    const lines = markdown.split('\n');
    for (let i = 0; i < Math.min(30, lines.length); i++) {
      console.log(`${colors.dim}${lines[i]}${colors.reset}`);
    }
    if (lines.length > 30) {
      console.log(`${colors.dim}... (${lines.length - 30} more lines)${colors.reset}`);
    }
    console.log(`${colors.dim}${'='.repeat(60)}${colors.reset}`);
    console.log();

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Unknown error occurred${colors.reset}`);
    }
    console.log();
    process.exit(1);
  }
}

/**
 * printGenerateSpecsBatch function - Batch generate module specifications
 */
function printGenerateSpecsBatch(): void {
  printHeader('TSDoc Edge - Batch Generate Module Specifications');

  // Parse arguments
  let dirPath = '';
  let outputDir = './docs/specs';
  let minConfidence = 0;
  let includePrivate = false;
  let recursive = true;

  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg.startsWith('--min-confidence=')) {
      minConfidence = Number.parseInt(arg.split('=')[1], 10);
    } else if (arg === '--include-private') {
      includePrivate = true;
    } else if (arg === '--no-recursive') {
      recursive = false;
    } else if (!dirPath) {
      dirPath = arg;
    } else if (!arg.startsWith('--')) {
      outputDir = arg;
    }
  }

  if (!dirPath || dirPath.startsWith('--')) {
    console.log(`${colors.red}✗ Directory path required${colors.reset}`);
    console.log();
    console.log('Usage:');
    console.log(`${colors.cyan}  tsdoc-edge generate-specs-batch <dir> [output-dir] [options]${colors.reset}`);
    console.log();
    console.log('Arguments:');
    console.log('  <dir>        Path to source directory');
    console.log('  [output-dir] Output directory (default: ./docs/specs)');
    console.log();
    console.log('Options:');
    console.log('  --min-confidence=N    Only generate specs with confidence >= N%');
    console.log('  --include-private     Include private symbols');
    console.log('  --no-recursive        Do not process subdirectories');
    console.log();
    console.log('Examples:');
    console.log(`  tsdoc-edge generate-specs-batch src`);
    console.log(`  tsdoc-edge generate-specs-batch src/analyzer --min-confidence=70`);
    console.log(`  tsdoc-edge generate-specs-batch src --include-private --no-recursive`);
    console.log();
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(resolvedPath)) {
    console.log(`${colors.red}✗ Directory not found: ${dirPath}${colors.reset}`);
    console.log();
    return;
  }

  if (!fs.statSync(resolvedPath).isDirectory()) {
    console.log(`${colors.red}✗ Path is not a directory: ${dirPath}${colors.reset}`);
    console.log();
    return;
  }

  console.log(`Directory: ${colors.cyan}${dirPath}${colors.reset}`);
  console.log(`Output: ${colors.cyan}${outputDir}${colors.reset}`);
  console.log(`Min Confidence: ${colors.cyan}${minConfidence}%${colors.reset}`);
  console.log(`Include Private: ${colors.cyan}${includePrivate}${colors.reset}`);
  console.log(`Recursive: ${colors.cyan}${recursive}${colors.reset}`);
  console.log();

  try {
    const generator = new ModuleSpecGenerator({
      analyzeLogic: true,
      analyzeSideEffects: true,
      includeTodos: true,
    });

    console.log(`${colors.blue}Scanning directory...${colors.reset}`);
    const batchResults = generator.generateSpecsForDirectory(resolvedPath, {
      recursive,
      minConfidence,
      includePrivate,
    });

    if (batchResults.length === 0) {
      console.log(`${colors.yellow}⚠ No symbols found matching criteria${colors.reset}`);
      console.log();
      return;
    }

    console.log(`${colors.green}✓ Found ${batchResults.length} files with documentable symbols${colors.reset}`);
    console.log();

    const formatter = new ModuleSpecMarkdownFormatter({
      includeMetadata: true,
      includeConfidence: true,
      includeTodos: true,
      includeToc: true,
    });

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let totalSpecs = 0;
    let totalHighConfidence = 0;
    let totalMediumConfidence = 0;
    let totalLowConfidence = 0;

    for (const { filePath: srcPath, results } of batchResults) {
      const relativePath = path.relative(process.cwd(), srcPath);
      console.log(`${colors.dim}Processing: ${relativePath}${colors.reset}`);

      for (const result of results) {
        const markdown = formatter.format(result.spec);
        const outputFileName = `${result.spec.symbolId}.md`;
        const outputPath = path.join(outputDir, outputFileName);

        fs.writeFileSync(outputPath, markdown, 'utf-8');

        totalSpecs++;
        if (result.confidence >= 80) totalHighConfidence++;
        else if (result.confidence >= 60) totalMediumConfidence++;
        else totalLowConfidence++;

        const confColor = result.confidence >= 80 ? colors.green : result.confidence >= 60 ? colors.yellow : colors.red;
        console.log(`  ${colors.green}✓${colors.reset} ${result.spec.symbolName} ${confColor}(${result.confidence}%)${colors.reset}`);
      }
    }

    console.log();
    console.log(`${colors.bold}Summary:${colors.reset}`);
    console.log(`  Total specifications: ${colors.cyan}${totalSpecs}${colors.reset}`);
    console.log(`  High confidence (≥80%): ${colors.green}${totalHighConfidence}${colors.reset}`);
    console.log(`  Medium confidence (60-79%): ${colors.yellow}${totalMediumConfidence}${colors.reset}`);
    console.log(`  Low confidence (<60%): ${colors.red}${totalLowConfidence}${colors.reset}`);
    console.log();
    console.log(`${colors.green}✓ All specifications saved to: ${colors.cyan}${outputDir}${colors.reset}`);
    console.log();

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Unknown error occurred${colors.reset}`);
    }
    console.log();
    process.exit(1);
  }
}

// Initialize ConfigManager with custom config path if provided
if (configPath) {
  ConfigManager.getInstance(process.cwd(), configPath);
}

// Initialize usage tracker
const usageTracker = new UsageTracker();
const command = args[0] || 'help';
const startTime = performance.now();
let commandSuccess = true;
let commandError: string | undefined;

// Wrap command execution for analytics
try {
switch (command) {
  case 'init':
    printInit();
    break;
  case 'build':
    printBuild();
    break;
  case 'id':
    printIdCommands();
    break;
  case 'deps':
    printDependencies();
    break;
  case 'used-by':
    printUsedBy();
    break;
  case 'who-uses':
    printWhoUses();
    break;
  case 'orphans':
    printOrphans();
    break;
  case 'undocumented':
    printUndocumented();
    break;
  case 'untested':
    printUntested();
    break;
  case 'without-responsibility':
    printWithoutResponsibility();
    break;
  case 'without-contract':
    printWithoutContract();
    break;
  case 'plans':
    printPlans();
    break;
  case 'find-method':
    printFindMethod();
    break;
  case 'tree':
    printTree();
    break;
  case 'todo':
  case 'todos':
    printTodos();
    break;
  case 'validate':
    printValidate();
    break;
  case 'analyze':
    printAnalyze();
    break;
  case 'health':
    printHealth();
    break;
  case 'suggest':
    printSuggest();
    break;
  case 'fix':
    printFix();
    break;
  case 'improve':
    printImprove();
    break;
  case 'stats':
    printStats();
    break;
  case 'core-api':
    printCoreApi();
    break;
  case 'scan':
    printScan();
    break;
  case 'index-docs':
    printIndexDocs();
    break;
  case 'validate-docs':
    printValidateDocs();
    break;
  case 'update-backlinks':
    printUpdateBacklinks();
    break;
  case 'update-symbol-refs':
    printUpdateSymbolRefs();
    break;
  case 'validate-spec':
    printValidateSpec();
    break;
  case 'check-duplicates':
    printCheckDuplicates();
    break;
  case 'spec-status':
    printSpecStatus();
    break;
  case 'find-unused-docs':
    printFindUnusedDocs();
    break;
  case 'spec-history':
    printSpecHistory();
    break;
  case 'spec-diff':
    printSpecDiff();
    break;
  case 'spec-bump':
    printSpecBump();
    break;
  case 'find-doc':
    printFindDocSymbol();
    break;
  case 'sync-coverage':
    printSyncCoverage();
    break;
  case 'check-links':
    printCheckLinks();
    break;
  case 'parse':
    printParse();
    break;
  case 'generate-docs':
    printGenerateDocs();
    break;
  case 'generate-spec':
    printGenerateSpec();
    break;
  case 'generate-specs-batch':
    printGenerateSpecsBatch();
    break;
  case 'install-hook':
    printInstallHook();
    break;
  case 'uninstall-hook':
    printUninstallHook();
    break;
  case 'pre-commit-run':
    printPreCommitRun();
    break;
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  case 'usage':
    printUsageAnalytics();
    break;
  default:
    console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
    console.log();
    printHelp();
    commandSuccess = false;
    commandError = `Unknown command: ${command}`;
    process.exit(1);
}
} catch (error) {
  commandSuccess = false;
  commandError = error instanceof Error ? error.message : 'Unknown error';
  throw error;
} finally {
  // Record usage event
  const endTime = performance.now();
  const duration = endTime - startTime;

  const event: CommandUsageEvent = {
    command,
    args: args.slice(1),
    timestamp: new Date().toISOString(),
    duration,
    success: commandSuccess,
    error: commandError,
    cwd: process.cwd(),
    nodeVersion: process.version,
    version: require('../package.json').version,
  };

  usageTracker.recordEvent(event);
}
