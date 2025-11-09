/**
 * CLI commands for type chain analysis
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { InterfaceAnalyzer } from '../analyzer/InterfaceAnalyzer';
import { InterfaceDependencyMapper } from '../analyzer/InterfaceDependencyMapper';
import { TypeChainTracer } from '../analyzer/TypeChainTracer';
import type { TypeChainOptions } from '../types/domain/type-chain';
import { BaseCommand, colors } from './BaseCommand';

/**
 * Command to analyze type dependency chains
 *
 * @public
 */
export class TypeChainCommand extends BaseCommand {
  getName(): string {
    return 'type-chain';
  }

  getDescription(): string {
    return 'Show type dependency chain between two types';
  }

  protected getUsage(): string {
    return `tsdoc-edge type-chain <source-type> [target-type] [options]

  Options:
    --max-depth=N         Maximum depth to traverse (default: 10)
    --include-external    Include external types from node_modules
    --include-primitives  Include primitive types
    --tree                Show as dependency tree`;
  }

  async execute(args: string[]): Promise<any> {
    // Check for help flag
    if (this.hasHelpFlag(args)) {
      return this.displayHelp();
    }

    if (args.length < 1) {
      console.error(`${colors.red}✗${colors.reset} Usage: type-chain <source-type> [target-type] [options]`);
      console.error('');
      console.error('Options:');
      console.error('  --max-depth <n>       Maximum depth to traverse (default: 10)');
      console.error('  --include-external    Include external types from node_modules');
      console.error('  --include-primitives  Include primitive types');
      console.error('  --tree                Show as dependency tree (default if no target)');
      console.error('');
      console.error('Examples:');
      console.error('  type-chain UserDTO User         # Find path from UserDTO to User');
      console.error('  type-chain UserService --tree   # Show UserService dependency tree');
      process.exit(1);
    }

    const sourceType = args[0];
    const targetType = args[1] && !args[1].startsWith('--') ? args[1] : undefined;

    // Parse options
    const maxDepthArg = args.find(a => a.startsWith('--max-depth'));
    const maxDepth = maxDepthArg ? parseInt(maxDepthArg.split('=')[1] || '10') : 10;

    const options: TypeChainOptions = {
      maxDepth,
      includeExternal: args.includes('--include-external'),
      includePrimitives: args.includes('--include-primitives'),
      findAllPaths: true,
    };

    const showTree = args.includes('--tree') || !targetType;

    console.log(`${colors.blue}${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}${colors.bold}Type Chain Analysis${colors.reset}`);
    console.log(`${colors.blue}${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log('');

    // Build interface graph
    const cwd = process.cwd();
    const srcDir = path.join(cwd, 'src');

    if (!fs.existsSync(srcDir)) {
      console.error(`${colors.red}✗${colors.reset} Source directory not found: ${srcDir}`);
      process.exit(1);
    }

    console.log(`${colors.cyan}ℹ${colors.reset} Analyzing interfaces in: ${srcDir}`);

    const analyzer = new InterfaceAnalyzer();
    const mapper = new InterfaceDependencyMapper();

    const files = this.findTypeScriptFiles(srcDir);
    const allInterfaces: any[] = [];

    for (const file of files) {
      const sourceCode = fs.readFileSync(file, 'utf-8');
      const interfaces = analyzer.analyzeFile(file, sourceCode);
      allInterfaces.push(...interfaces);
    }

    const graph = mapper.buildDependencyGraph(allInterfaces);
    const tracer = new TypeChainTracer(graph);

    console.log(`${colors.green}✓${colors.reset} Analyzed ${graph.interfaces.size} interfaces`);
    console.log('');

    // Show statistics
    const stats = tracer.getGraphStatistics(options);
    console.log(`${colors.blue}${colors.bold}Statistics:${colors.reset}`);
    console.log(`  - Total Types: ${stats.totalTypes}`);
    console.log(`  - Composites: ${stats.composites} (${stats.compositesPercentage.toFixed(1)}%)`);
    console.log(`  - Complete: ${stats.complete} (${stats.completePercentage.toFixed(1)}%)`);
    if (stats.hasCircularDependencies) {
      console.log(`  - ${colors.yellow}Circular Dependencies: ${stats.circularDependencies}${colors.reset}`);
    } else {
      console.log(`  - ${colors.green}No Circular Dependencies${colors.reset}`);
    }
    console.log(`  - Average Dependencies: ${stats.averageDependencies}`);
    console.log('');

    // Check if source type exists
    if (!graph.interfaces.has(sourceType)) {
      console.error(`${colors.red}✗${colors.reset} Type not found: ${sourceType}`);
      console.log('');
      console.log('Available types:');
      const types = Array.from(graph.interfaces.keys()).slice(0, 10);
      for (const type of types) {
        console.log(`  - ${type}`);
      }
      if (graph.interfaces.size > 10) {
        console.log(`  ... and ${graph.interfaces.size - 10} more`);
      }
      process.exit(1);
    }

    if (showTree) {
      // Show dependency tree
      const result = tracer.buildDependencyTree(sourceType, options);
      this.displayDependencyTree(result);
    } else {
      // Check if target exists
      if (!graph.interfaces.has(targetType!)) {
        console.error(`${colors.red}✗${colors.reset} Target type not found: ${targetType}`);
        process.exit(1);
      }

      // Find chain
      const result = tracer.findChain(sourceType, targetType!, options);
      this.displayTypeChains(result);
    }

    return this.success();
  }

  /**
   * Display dependency tree
   */
  private displayDependencyTree(result: any): void {
    console.log(`${colors.cyan}${colors.bold}Dependency Tree: ${result.source}${colors.reset}`);
    console.log(`${colors.blue}────────────────────────────────────────────────────────────────────${colors.reset}`);
    console.log('');

    if (result.tree) {
      this.printTree(result.tree, '', true);
    }

    console.log('');
    console.log(`${colors.cyan}${colors.bold}Statistics${colors.reset}`);
    console.log(`${colors.blue}────────────────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`  Total Types: ${colors.cyan}${result.totalTypes}${colors.reset}`);
    console.log(`  Max Depth: ${colors.cyan}${result.maxDepth}${colors.reset}`);

    if (result.cycles.length > 0) {
      console.log('');
      console.log(`${colors.yellow}⚠${colors.reset} Circular Dependencies Detected: ${colors.yellow}${result.cycles.length}${colors.reset}`);
      console.log('');
      for (const cycle of result.cycles) {
        console.log(`  ${colors.yellow}○${colors.reset} ${cycle.join(' → ')}`);
      }
    }
  }

  /**
   * Display type chains
   */
  private displayTypeChains(result: any): void {
    console.log(`${colors.cyan}${colors.bold}Type Chain: ${result.source} → ${result.target}${colors.reset}`);
    console.log(`${colors.blue}────────────────────────────────────────────────────────────────────${colors.reset}`);
    console.log('');

    if (result.chains.length === 0) {
      console.log(`${colors.yellow}⚠${colors.reset} No path found between ${result.source} and ${result.target}`);
    } else {
      console.log(`${colors.green}✓${colors.reset} Found ${colors.cyan}${result.chains.length}${colors.reset} path(s)`);
      console.log('');

      for (let i = 0; i < result.chains.length; i++) {
        const chain = result.chains[i];
        console.log(`${colors.bold}Path ${i + 1}:${colors.reset} ${chain.length} step(s)`);
        console.log('');

        console.log(`  ${colors.cyan}${chain.source}${colors.reset}`);

        for (const step of chain.steps) {
          const dep = step.dependency;
          const relation = this.formatRelation(dep);
          const via = dep.via ? ` via '${colors.yellow}${dep.via}${colors.reset}'` : '';

          console.log(`  ${colors.dim}│${colors.reset}`);
          console.log(`  ${colors.dim}└─${colors.reset} [${relation}${via}] → ${colors.cyan}${step.to}${colors.reset}`);
        }

        if (i < result.chains.length - 1) {
          console.log('');
        }
      }
    }

    if (result.cycles.length > 0) {
      console.log('');
      console.log(`${colors.yellow}⚠${colors.reset} Circular dependencies detected in paths: ${colors.yellow}${result.cycles.length}${colors.reset}`);
      console.log('');
      for (const cycle of result.cycles) {
        console.log(`  ${colors.yellow}○${colors.reset} ${cycle.join(' → ')}`);
      }
    }
  }

  /**
   * Print tree recursively
   */
  private printTree(node: any, prefix: string, isLast: boolean, visited = new Set<string>()): void {
    const connector = isLast ? '└─' : '├─';
    const typeColor = node.visited ? colors.yellow : colors.cyan;
    const cycleMarker = node.visited ? ` ${colors.yellow}(cycle)${colors.reset}` : '';

    if (node.dependency) {
      const relation = this.formatRelation(node.dependency);
      const via = node.dependency.via ? ` via '${colors.yellow}${node.dependency.via}${colors.reset}'` : '';
      console.log(`${prefix}${connector} [${relation}${via}] → ${typeColor}${node.typeName}${colors.reset}${cycleMarker}`);
    } else {
      console.log(`${prefix}${typeColor}${node.typeName}${colors.reset}`);
    }

    // Prevent infinite recursion
    if (visited.has(node.typeName) || node.visited) {
      return;
    }

    visited.add(node.typeName);

    const newPrefix = prefix + (isLast ? '   ' : '│  ');
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      this.printTree(child, newPrefix, i === node.children.length - 1, visited);
    }
  }

  /**
   * Format dependency relation for display
   */
  private formatRelation(dep: any): string {
    let relation = dep.dependencyType;

    if (dep.typeRelation && dep.typeRelation !== 'direct') {
      relation += ` (${dep.typeRelation})`;
    }

    return `${colors.green}${relation}${colors.reset}`;
  }

  /**
   * Find all TypeScript files recursively
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    const walk = (directory: string) => {
      const entries = fs.readdirSync(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, dist, etc.
          if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }
}

/**
 * Command to find root types (types with no incoming dependencies)
 *
 * @public
 */
export class FindRootTypesCommand extends BaseCommand {
  getName(): string {
    return 'find-roots';
  }

  getDescription(): string {
    return 'Find root types (types with no incoming dependencies)';
  }

  async execute(args: string[]): Promise<any> {
    const options: TypeChainOptions = {
      includeExternal: args.includes('--include-external'),
    };

    console.log(`${colors.blue}${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}${colors.bold}Root Types Analysis${colors.reset}`);
    console.log(`${colors.blue}${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log('');

    const { tracer, graph } = this.buildGraph();

    // Show statistics
    const stats = tracer.getGraphStatistics(options);
    console.log(`${colors.blue}${colors.bold}Statistics:${colors.reset}`);
    console.log(`  - Total Types: ${stats.totalTypes}`);
    console.log(`  - Composites: ${stats.composites} (${stats.compositesPercentage.toFixed(1)}%)`);
    console.log(`  - Complete: ${stats.complete} (${stats.completePercentage.toFixed(1)}%)`);
    if (stats.hasCircularDependencies) {
      console.log(`  - ${colors.yellow}Circular Dependencies: ${stats.circularDependencies}${colors.reset}`);
    } else {
      console.log(`  - ${colors.green}No Circular Dependencies${colors.reset}`);
    }
    console.log(`  - Average Dependencies: ${stats.averageDependencies}`);
    console.log('');

    const rootTypes = tracer.findRootTypes(options);
    const leafTypes = tracer.findLeafTypes(options);

    console.log(`${colors.cyan}${colors.bold}Root Types${colors.reset} (no incoming dependencies):`);
    console.log(`${colors.blue}────────────────────────────────────────────────────────────────────${colors.reset}`);
    console.log('');

    if (rootTypes.length === 0) {
      console.log(`  ${colors.dim}No root types found${colors.reset}`);
    } else {
      for (const type of rootTypes) {
        const deps = tracer.getDirectDependencies(type);
        console.log(`  ${colors.cyan}${type}${colors.reset} ${colors.dim}(${deps.length} dependencies)${colors.reset}`);
      }
    }

    console.log('');
    console.log(`${colors.cyan}${colors.bold}Leaf Types${colors.reset} (no outgoing dependencies):`);
    console.log(`${colors.blue}────────────────────────────────────────────────────────────────────${colors.reset}`);
    console.log('');

    if (leafTypes.length === 0) {
      console.log(`  ${colors.dim}No leaf types found${colors.reset}`);
    } else {
      for (const type of leafTypes) {
        const reverseDeps = tracer.getReverseDependencies(type);
        console.log(`  ${colors.cyan}${type}${colors.reset} ${colors.dim}(used by ${reverseDeps.length} types)${colors.reset}`);
      }
    }

    console.log('');
    console.log(`${colors.cyan}${colors.bold}Statistics${colors.reset}`);
    console.log(`${colors.blue}────────────────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`  Total Types: ${colors.cyan}${graph.interfaces.size}${colors.reset}`);
    console.log(`  Root Types: ${colors.cyan}${rootTypes.length}${colors.reset}`);
    console.log(`  Leaf Types: ${colors.cyan}${leafTypes.length}${colors.reset}`);

    return this.success();
  }

  private buildGraph(): any {
    const cwd = process.cwd();
    const srcDir = path.join(cwd, 'src');

    const analyzer = new InterfaceAnalyzer();
    const mapper = new InterfaceDependencyMapper();

    const files = this.findTypeScriptFiles(srcDir);
    const allInterfaces: any[] = [];

    for (const file of files) {
      const sourceCode = fs.readFileSync(file, 'utf-8');
      const interfaces = analyzer.analyzeFile(file, sourceCode);
      allInterfaces.push(...interfaces);
    }

    const graph = mapper.buildDependencyGraph(allInterfaces);
    const tracer = new TypeChainTracer(graph);

    return { tracer, graph };
  }

  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    const walk = (directory: string) => {
      const entries = fs.readdirSync(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }
}

/**
 * Command to detect circular type dependencies
 *
 * @public
 */
export class DetectCircularTypesCommand extends BaseCommand {
  getName(): string {
    return 'detect-cycles';
  }

  getDescription(): string {
    return 'Detect circular type dependencies';
  }

  async execute(args: string[]): Promise<any> {
    const options: TypeChainOptions = {
      includeExternal: args.includes('--include-external'),
    };

    console.log(`${colors.blue}${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}${colors.bold}Circular Dependency Detection${colors.reset}`);
    console.log(`${colors.blue}${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log('');

    const { tracer, graph } = this.buildGraph();

    // Show statistics
    const stats = tracer.getGraphStatistics(options);
    console.log(`${colors.blue}${colors.bold}Statistics:${colors.reset}`);
    console.log(`  - Total Types: ${stats.totalTypes}`);
    console.log(`  - Composites: ${stats.composites} (${stats.compositesPercentage.toFixed(1)}%)`);
    console.log(`  - Complete: ${stats.complete} (${stats.completePercentage.toFixed(1)}%)`);
    if (stats.hasCircularDependencies) {
      console.log(`  - ${colors.yellow}Circular Dependencies: ${stats.circularDependencies}${colors.reset}`);
    } else {
      console.log(`  - ${colors.green}No Circular Dependencies${colors.reset}`);
    }
    console.log(`  - Average Dependencies: ${stats.averageDependencies}`);
    console.log('');

    console.log(`${colors.cyan}ℹ${colors.reset} Detecting circular dependencies...`);
    console.log('');

    const cycles = tracer.detectCircularDependencies(options);

    if (cycles.length === 0) {
      console.log(`${colors.green}✓${colors.reset} No circular dependencies detected`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} Found ${colors.yellow}${cycles.length}${colors.reset} circular dependencies:`);
      console.log('');

      for (let i = 0; i < cycles.length; i++) {
        const cycle = cycles[i];
        console.log(`${colors.yellow}${i + 1}.${colors.reset} ${cycle.join(' → ')}`);
      }

      console.log('');
      console.log(`${colors.yellow}⚠ Recommendation:${colors.reset} Refactor to remove circular dependencies`);
      console.log(`   - Extract common types to a separate file`);
      console.log(`   - Use dependency inversion principle`);
      console.log(`   - Consider using interfaces to break cycles`);
    }

    return this.success();
  }

  private buildGraph(): any {
    const cwd = process.cwd();
    const srcDir = path.join(cwd, 'src');

    const analyzer = new InterfaceAnalyzer();
    const mapper = new InterfaceDependencyMapper();

    const files: string[] = [];
    const walk = (directory: string) => {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };
    walk(srcDir);

    const allInterfaces: any[] = [];
    for (const file of files) {
      const sourceCode = fs.readFileSync(file, 'utf-8');
      const interfaces = analyzer.analyzeFile(file, sourceCode);
      allInterfaces.push(...interfaces);
    }

    const graph = mapper.buildDependencyGraph(allInterfaces);
    const tracer = new TypeChainTracer(graph);

    return { tracer, graph };
  }
}
