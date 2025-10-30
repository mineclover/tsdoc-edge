#!/usr/bin/env node

/**
 * TSDoc Edge CLI
 * Command-line interface for TSDoc Edge operations
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CodeHealthChecker } from './analyzer/CodeHealthChecker';
import { DocumentationAnalyzer } from './analyzer/DocumentationAnalyzer';
import { ConfigManager } from './config/ConfigManager';
import { RecursiveImprover } from './fixer/RecursiveImprover';
import { SymbolGraphBuilder } from './graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from './graph/SymbolSearchEngine';
import { DatabaseManager } from './storage/DatabaseManager';
import { SymbolRegistryManager } from './storage/SymbolRegistryManager';
import type { AnalysisReport, CodeHealthMetrics, ImprovementSuggestion } from './types/analysis';
import type { FuturePlan } from './types/enhanced-tags';
import type { Symbol } from './types/graph';
import { ConnectivityValidator } from './validator/ConnectivityValidator';

// Database row types
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

interface RelationshipRow {
  type: string;
  from_id: string;
  to_id: string;
  file_path: string;
  line: number;
  description: string;
}

// Registry entry types (from SymbolRegistryManager)
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
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function printHeader(title: string) {
  console.log(colors.bold + colors.blue + '='.repeat(80) + colors.reset);
  console.log(colors.bold + colors.blue + title + colors.reset);
  console.log(colors.bold + colors.blue + '='.repeat(80) + colors.reset);
  console.log();
}

function printSection(title: string) {
  console.log(colors.bold + colors.cyan + title + colors.reset);
  console.log(colors.cyan + '-'.repeat(80) + colors.reset);
}

function printTodos() {
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
  } catch (error) {
    console.error(`${colors.red}❌ Error reading database:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

function printIdCommands() {
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

function printInit() {
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
  } catch (error) {
    console.error(`${colors.red}❌ Failed to initialize configuration:${colors.reset}`, error);
    process.exit(1);
  }
}

function printHelp() {
  printHeader('TSDoc Edge CLI - Help');

  console.log('Usage:');
  console.log('  tsdoc-edge <command>');
  console.log();
  console.log('Commands:');
  console.log('  init [options]          Initialize project configuration');
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
  console.log('  help                    Show this help message');
  console.log();
  console.log('Init Options:');
  console.log('  --name=<name>           Project name (default: current directory name)');
  console.log('  --version=<version>     Project version (default: 1.0.0)');
  console.log('  --force                 Overwrite existing configuration');
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
  console.log('  tsdoc-edge fix src/myFile.ts --min-score=80');
  console.log('  tsdoc-edge improve --target=90 --verbose');
  console.log('  tsdoc-edge improve --target=80 --max-iterations=5 --dry-run');
  console.log('  tsdoc-edge help');
  console.log();
}

function printDependencies() {
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

function printUsedBy() {
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

function printOrphans() {
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

function printUndocumented() {
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

      for (const symbol of undocumented) {
        console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
        console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
        console.log();
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

function printUntested() {
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

      for (const symbol of untested) {
        console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
        console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
        console.log();
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

function printWithoutResponsibility() {
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

      for (const symbol of withoutResponsibility) {
        console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
        console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
        console.log();
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

function printWithoutContract() {
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

      for (const symbol of withoutContract) {
        console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
        console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
        console.log();
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

function printFindMethod() {
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
      for (const child of children) {
        console.log(`  ${child.id} → ${child.sourceRef.qualifiedName}`);
      }
      console.log();
    }
  }
}

function printTree() {
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

function printPlans() {
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
      console.log(`${colors.green}✅ No future plans found${colors.reset}`);
      console.log();
    } else {
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
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

function printValidate() {
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
  } catch (error) {
    console.error(`${colors.red}❌ Error generating validation report:${colors.reset}`, error);
  } finally {
    dbManager.close();
  }
}

/**
 * Analyze code health for a directory
 */
function printAnalyze() {
  const args = process.argv.slice(3);
  let targetPath = args[0] || 'src';
  let includeChildren = true;
  let includePrivate = false;
  let minQualityScore = 70;

  // Parse options
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
 */
function printHealth() {
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
 */
function printSuggest() {
  const args = process.argv.slice(3);
  let targetPath = args[0] || 'src';
  let minQualityScore = 70;
  let limit = 20;

  // Parse options
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
    for (const suggestion of critical.slice(0, limit - shown)) {
      printSuggestion(suggestion);
      shown++;
    }
  }

  if (high.length > 0 && shown < limit) {
    console.log(`${colors.yellow}${colors.bold}🟡 High Priority${colors.reset}`);
    console.log();
    for (const suggestion of high.slice(0, limit - shown)) {
      printSuggestion(suggestion);
      shown++;
    }
  }

  if (medium.length > 0 && shown < limit) {
    console.log(`${colors.blue}${colors.bold}🔵 Medium Priority${colors.reset}`);
    console.log();
    for (const suggestion of medium.slice(0, limit - shown)) {
      printSuggestion(suggestion);
      shown++;
    }
  }

  if (low.length > 0 && shown < limit) {
    console.log(`${colors.cyan}${colors.bold}⚪ Low Priority${colors.reset}`);
    console.log();
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
 */
function getScoreColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.yellow;
  return colors.red;
}

/**
 * Get health grade
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
 */
function getHealthEmoji(score: number): string {
  if (score >= 80) return '🌟';
  if (score >= 60) return '✅';
  if (score >= 40) return '⚠️';
  return '❌';
}

/**
 * Get health focus area
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
 */
function printFix() {
  const args = process.argv.slice(3);
  let targetPath = args[0] || 'src';
  let dryRun = false;
  let minScore = 70;

  // Parse options
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
 */
function printImprove() {
  const args = process.argv.slice(3);
  let targetScore = 80;
  let maxIterations = 10;
  let dryRun = false;
  let verbose = false;

  // Parse options
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

// Main CLI logic
const args = process.argv.slice(2);
const command = args[0] || 'help';

switch (command) {
  case 'init':
    printInit();
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
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  default:
    console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
    console.log();
    printHelp();
    process.exit(1);
}
