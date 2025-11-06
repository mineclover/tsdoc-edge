/**
 * Phase 10 Command Implementations
 *
 * Commands for ID management, quality improvement, and Git hooks:
 * - id: Complete symbol ID management (new, list, find, stats)
 * - improve: Recursive documentation quality improvement
 * - install-hook: Install Git pre-commit hook
 * - uninstall-hook: Remove Git pre-commit hook
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, colors, type CommandResult } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { RecursiveImprover } from '../fixer/RecursiveImprover';
import type { Symbol } from '../types/graph/graph';

/**
 * IdCommand - Complete symbol ID management
 *
 * Subcommands:
 * - new: Generate new symbol ID
 * - list: List all registered IDs
 * - find: Find symbol by ID
 * - stats: Show registry statistics
 */
export class IdCommand extends BaseCommand {
  private manager?: SymbolRegistryManager;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'id';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Manage symbol IDs (new, list, find, stats)';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      const manager = this.manager || new SymbolRegistryManager(registryPath);

      const subcommand = args[0] || 'help';

      switch (subcommand) {
        case 'new':
          return await this.handleNew(manager, args.slice(1));
        case 'list':
          return await this.handleList(manager);
        case 'find':
          return await this.handleFind(manager, args.slice(1));
        case 'stats':
          return await this.handleStats(manager);
        default:
          return this.showHelp();
      }
    });
  }

  private async handleNew(manager: SymbolRegistryManager, args: string[]): Promise<CommandResult> {
    const filePath = args[0];
    const symbolName = args[1];

    if (!filePath || !symbolName) {
      console.log(`${colors.red}Usage: tsdoc-edge id new <file> <symbol> [options]${colors.reset}`);
      console.log();
      console.log('Options:');
      console.log('  --type=<type>           Symbol type (class, function, method, property)');
      console.log('  --parent=<id>           Parent symbol ID (for methods)');
      console.log('  --member-type=<type>    Member type (instance, static, inner)');
      console.log();
      return { exitCode: 1, message: 'Missing required arguments' };
    }

    // Parse options
    let type: string | undefined;
    let parent: string | undefined;
    let memberType: 'instance' | 'static' | 'inner' | undefined;

    for (const arg of args.slice(2)) {
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
        return { exitCode: 1, message: `Parent symbol not found: ${parent}` };
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
    console.log(`  Qualified Name: ${colors.bold}${entry?.sourceRef.qualifiedName}${colors.reset}`);
    console.log(`  File: ${filePath}`);
    console.log();
    console.log('Add this to your TSDoc comment:');
    console.log(`${colors.cyan}  @id ${id}${colors.reset}`);
    console.log();

    return { exitCode: 0, message: `ID generated: ${id}` };
  }

  private async handleList(manager: SymbolRegistryManager): Promise<CommandResult> {
    const entries = manager.getAll();

    console.log(`${colors.bold}Symbol Registry${colors.reset}`);
    console.log(`Total entries: ${colors.green}${entries.length}${colors.reset}`);
    console.log();

    if (entries.length === 0) {
      console.log(`${colors.yellow}No entries yet. Use "tsdoc-edge id new" to create one.${colors.reset}`);
      console.log();
    } else {
      for (const entry of entries) {
        console.log(`${colors.bold}${entry.id}${colors.reset} → ${entry.sourceRef.filePath}:${entry.sourceRef.symbolName}`);
        if (entry.tags && entry.tags.length > 0) {
          console.log(`  Tags: ${entry.tags.join(', ')}`);
        }
        console.log();
      }
    }

    return { exitCode: 0, message: `Listed ${entries.length} entries` };
  }

  private async handleFind(manager: SymbolRegistryManager, args: string[]): Promise<CommandResult> {
    const id = args[0];
    if (!id) {
      console.log(`${colors.red}Usage: tsdoc-edge id find <id>${colors.reset}`);
      return { exitCode: 1, message: 'Missing ID argument' };
    }

    const entry = manager.findById(id);
    if (!entry) {
      console.log(`${colors.red}❌ ID not found: ${id}${colors.reset}`);
      return { exitCode: 1, message: `ID not found: ${id}` };
    }

    console.log(`${colors.bold}Symbol: ${id}${colors.reset}`);
    console.log();
    console.log(`ID: ${colors.bold}${entry.id}${colors.reset}`);
    console.log(`File: ${entry.sourceRef.filePath}`);
    console.log(`Symbol: ${entry.sourceRef.symbolName}`);
    if (entry.sourceRef.type) {
      console.log(`Type: ${entry.sourceRef.type}`);
    }
    console.log(`Created: ${entry.createdAt}`);
    console.log(`Updated: ${entry.updatedAt}`);
    console.log();

    return { exitCode: 0, message: `Found ID: ${id}` };
  }

  private async handleStats(manager: SymbolRegistryManager): Promise<CommandResult> {
    const stats = manager.getStats();

    console.log(`${colors.bold}Registry Statistics${colors.reset}`);
    console.log();
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

    return { exitCode: 0, message: 'Statistics displayed' };
  }

  private showHelp(): CommandResult {
    console.log(`${colors.bold}ID Management Commands${colors.reset}`);
    console.log();
    console.log('Usage:');
    console.log('  tsdoc-edge id <subcommand>');
    console.log();
    console.log('Subcommands:');
    console.log('  new <file> <symbol>  Generate new ID for a symbol');
    console.log('  list                 List all registered IDs');
    console.log('  find <id>            Find source location by ID');
    console.log('  stats                Show registry statistics');
    console.log();

    return { exitCode: 0, message: 'Help displayed' };
  }
}

/**
 * ImproveCommand - Recursive documentation quality improvement
 *
 * Recursively improves documentation until target score is reached.
 * Uses RecursiveImprover to iteratively fix documentation issues.
 */
export class ImproveCommand extends BaseCommand {
  private improver?: RecursiveImprover;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'improve';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Recursively improve documentation to target score';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      let targetScore = 80;
      let maxIterations = 10;
      let dryRun = false;
      let verbose = false;

      // Parse options
      for (const arg of args) {
        if (arg.startsWith('--target=')) {
          targetScore = Number.parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--max-iterations=')) {
          maxIterations = Number.parseInt(arg.split('=')[1], 10);
        } else if (arg === '--dry-run') {
          dryRun = true;
        } else if (arg === '--verbose' || arg === '-v') {
          verbose = true;
        }
      }

      console.log(`${colors.bold}TSDoc Edge - Recursive Improvement${colors.reset}`);
      console.log();
      console.log(`${colors.cyan}Target score: ${targetScore}/100${colors.reset}`);
      console.log(`${colors.cyan}Max iterations: ${maxIterations}${colors.reset}`);
      console.log(`${colors.cyan}Dry run: ${dryRun}${colors.reset}`);
      console.log();

      const improver = this.improver || new RecursiveImprover();

      console.log(`${colors.bold}🚀 Starting Recursive Improvement...${colors.reset}`);
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
      console.log(`${colors.bold}📊 Results${colors.reset}`);
      console.log();
      console.log(`   Initial Score: ${colors.cyan}${result.initialScore}/100${colors.reset}`);
      console.log(`   Final Score: ${colors.green}${result.finalScore}/100${colors.reset}`);
      console.log(`   Improvement: ${colors.green}+${result.finalScore - result.initialScore}${colors.reset} points`);
      console.log(`   Iterations: ${result.iterations}`);
      console.log(`   Files Modified: ${result.filesModified}`);
      console.log(`   Symbols Fixed: ${result.symbolsFixed}`);
      console.log();

      if (result.finalScore >= targetScore) {
        console.log(`${colors.green}🎉 Target score reached!${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  Target score not reached after ${result.iterations} iterations${colors.reset}`);
      }
      console.log();

      return {
        exitCode: result.finalScore >= targetScore ? 0 : 1,
        message: `Improved from ${result.initialScore} to ${result.finalScore}`,
      };
    });
  }
}

/**
 * InstallHookCommand - Install Git pre-commit hook
 *
 * Creates a pre-commit hook script that runs tsdoc-edge checks
 * before allowing commits.
 */
export class InstallHookCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'install-hook';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Install Git pre-commit hook for documentation checks';
  }

  /**
   * execute method
   * @param _args - _args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(_args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      console.log(`${colors.bold}TSDoc Edge - Install Pre-commit Hook${colors.reset}`);
      console.log();

      const gitDir = path.join(process.cwd(), '.git');
      if (!fs.existsSync(gitDir)) {
        console.log(`${colors.red}✗ Not a git repository${colors.reset}`);
        console.log();
        console.log('Initialize a git repository first:');
        console.log(`  ${colors.cyan}git init${colors.reset}`);
        console.log();
        return {
          exitCode: 1,
          message: 'Not a git repository',
          error: new Error('Not a git repository'),
        };
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
          return { exitCode: 0, message: 'Hook already installed' };
        }

        console.log(`${colors.yellow}⚠  Pre-commit hook already exists${colors.reset}`);
        console.log();
        console.log('To preserve existing hook, add this to your pre-commit script:');
        console.log(`  ${colors.cyan}tsdoc-edge pre-commit-run${colors.reset}`);
        console.log();
        return { exitCode: 1, message: 'Hook already exists' };
      }

      // Create hook script
      const hookScript = `#!/bin/sh
# TSDoc Edge pre-commit hook
# Auto-generated - do not edit manually

npx tsdoc-edge pre-commit-run
exit $?
`;

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

      return { exitCode: 0, message: 'Hook installed successfully' };
    });
  }
}

/**
 * UninstallHookCommand - Remove Git pre-commit hook
 *
 * Removes the pre-commit hook script if it was installed by tsdoc-edge.
 */
export class UninstallHookCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'uninstall-hook';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Uninstall Git pre-commit hook';
  }

  /**
   * execute method
   * @param _args - _args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(_args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      console.log(`${colors.bold}TSDoc Edge - Uninstall Pre-commit Hook${colors.reset}`);
      console.log();

      const gitDir = path.join(process.cwd(), '.git');
      if (!fs.existsSync(gitDir)) {
        console.log(`${colors.red}✗ Not a git repository${colors.reset}`);
        console.log();
        return { exitCode: 1, message: 'Not a git repository' };
      }

      const hookPath = path.join(gitDir, 'hooks', 'pre-commit');

      if (!fs.existsSync(hookPath)) {
        console.log(`${colors.yellow}⚠  Pre-commit hook not found${colors.reset}`);
        console.log();
        return { exitCode: 0, message: 'Hook not found' };
      }

      const existing = fs.readFileSync(hookPath, 'utf-8');
      if (!existing.includes('tsdoc-edge pre-commit-run')) {
        console.log(`${colors.yellow}⚠  Hook exists but was not installed by tsdoc-edge${colors.reset}`);
        console.log();
        console.log('Remove manually if needed:');
        console.log(`  ${colors.cyan}rm ${hookPath}${colors.reset}`);
        console.log();
        return { exitCode: 1, message: 'Hook not installed by tsdoc-edge' };
      }

      fs.unlinkSync(hookPath);

      console.log(`${colors.green}✓ Pre-commit hook uninstalled successfully${colors.reset}`);
      console.log();

      return { exitCode: 0, message: 'Hook uninstalled successfully' };
    });
  }
}
