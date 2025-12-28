/**
 * Relationship Impact Analysis Command
 * @packageDocumentation
 */

import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager, type UnifiedRelationshipRow } from '../storage/DatabaseManager';

/** A symbol affected by a change at a given depth */
interface ImpactNode {
  symbolId: string;
  depth: number;
  path: string[];
  relationshipType: string;
  category: string;
}

/**
 * Command for analyzing change impact through relationships
 * @doc [[RelationshipImpactCommand]]
 * @public
 */
export class RelationshipImpactCommand extends BaseCommand {
  getName(): string {
    return 'relationship-impact';
  }

  getDescription(): string {
    return 'Analyze impact of changing a symbol (what would be affected)';
  }

  protected getUsage(): string {
    return `tsdoc-edge relationship-impact <symbol-id> [options]

Analyzes what symbols would be affected if you change the given symbol.

Options:
  --depth <n>           Maximum depth to traverse (default: 3)
  --direction <dir>     Impact direction: downstream (who depends on this),
                        upstream (what this depends on), both (default: downstream)
  --category <cat>      Filter by relationship category
  --min-confidence <n>  Minimum confidence level (0-1, default: 0.5)

Examples:
  # See what depends on BuildCommand
  tsdoc-edge relationship-impact class-buildcommand

  # See what BuildCommand depends on
  tsdoc-edge relationship-impact class-buildcommand --direction upstream

  # Deep impact analysis
  tsdoc-edge relationship-impact class-buildcommand --depth 5

  # Only structural dependencies
  tsdoc-edge relationship-impact class-buildcommand --category structural`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      if (args.length === 0) {
        this.printError('Symbol ID required');
        console.log();
        return this.displayHelp();
      }

      const symbolId = args[0];
      const options = {
        depth: Number.parseInt(this.getOption(args, '--depth') || '3', 10),
        direction: this.getOption(args, '--direction') || 'downstream',
        category: this.getOption(args, '--category'),
        minConfidence: Number.parseFloat(this.getOption(args, '--min-confidence') || '0.5'),
      };

      this.printHeader(`Impact Analysis: ${symbolId}`);

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Verify symbol exists
      const symbol = dbManager.getSymbol(symbolId);

      if (!symbol) {
        this.printError(`Symbol not found: ${symbolId}`);
        dbManager.close();
        return { success: false, message: 'Symbol not found', exitCode: 1 };
      }

      console.log();
      this.printInfo(`Analyzing impact for: ${symbol.name} (${symbol.type})`);
      this.printInfo(`Direction: ${options.direction}, Max depth: ${options.depth}`);
      console.log();

      // Perform impact analysis
      const impactedSymbols = this.analyzeImpact(
        dbManager,
        symbolId,
        options.depth,
        options.direction,
        options.category,
        options.minConfidence
      );

      if (impactedSymbols.length === 0) {
        this.printSuccess('No impact found (symbol is isolated)');
        console.log();
        dbManager.close();
        return this.success('Analysis complete');
      }

      // Display results
      this.printSection('Impact Analysis Results');
      this.printInfo(`Found ${impactedSymbols.length} affected symbols`);
      console.log();

      // Group by depth
      const byDepth = new Map<number, ImpactNode[]>();
      for (const node of impactedSymbols) {
        if (!byDepth.has(node.depth)) {
          byDepth.set(node.depth, []);
        }
        byDepth.get(node.depth)!.push(node);
      }

      // Display by depth level
      for (const depth of Array.from(byDepth.keys()).sort((a, b) => a - b)) {
        const nodes = byDepth.get(depth)!;
        console.log(`  ${this.colors.bold}Depth ${depth}${this.colors.reset} (${nodes.length} symbols)`);
        console.log();

        // Group by category
        const byCategory = new Map<string, ImpactNode[]>();
        for (const node of nodes) {
          if (!byCategory.has(node.category)) {
            byCategory.set(node.category, []);
          }
          byCategory.get(node.category)!.push(node);
        }

        for (const [category, categoryNodes] of byCategory.entries()) {
          console.log(`    ${this.colors.cyan}${category}${this.colors.reset} (${categoryNodes.length})`);

          const samplesToShow = Math.min(5, categoryNodes.length);
          for (let i = 0; i < samplesToShow; i++) {
            const node = categoryNodes[i];
            const arrow = options.direction === 'upstream' ? '←' : '→';
            console.log(`      ${arrow} ${node.symbolId} ${this.colors.dim}(via ${node.relationshipType})${this.colors.reset}`);
            console.log(`        ${this.colors.dim}Path: ${node.path.join(' → ')}${this.colors.reset}`);
          }

          if (categoryNodes.length > samplesToShow) {
            console.log(`      ${this.colors.dim}... and ${categoryNodes.length - samplesToShow} more${this.colors.reset}`);
          }
          console.log();
        }
      }

      // Statistics
      console.log();
      this.printSection('Impact Statistics');

      const byCategory = new Map<string, number>();
      const byType = new Map<string, number>();

      for (const node of impactedSymbols) {
        byCategory.set(node.category, (byCategory.get(node.category) || 0) + 1);
        byType.set(node.relationshipType, (byType.get(node.relationshipType) || 0) + 1);
      }

      console.log(`  Total affected symbols: ${this.colors.cyan}${impactedSymbols.length}${this.colors.reset}`);
      console.log(`  Maximum depth reached: ${this.colors.cyan}${Math.max(...Array.from(byDepth.keys()))}${this.colors.reset}`);
      console.log();

      console.log(`  ${this.colors.dim}By category:${this.colors.reset}`);
      for (const [category, count] of Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])) {
        const percentage = ((count / impactedSymbols.length) * 100).toFixed(1);
        console.log(`    ${category}: ${this.colors.cyan}${count}${this.colors.reset} (${percentage}%)`);
      }
      console.log();

      console.log(`  ${this.colors.dim}Top relationship types:${this.colors.reset}`);
      const topTypes = Array.from(byType.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      for (const [type, count] of topTypes) {
        console.log(`    ${type}: ${this.colors.cyan}${count}${this.colors.reset}`);
      }
      console.log();

      // Risk assessment
      this.printSection('Change Risk Assessment');

      const riskLevel = this.assessRisk(impactedSymbols.length, Math.max(...Array.from(byDepth.keys())));
      const riskColor = riskLevel === 'High' ? this.colors.red
        : riskLevel === 'Medium' ? this.colors.yellow
        : this.colors.green;

      console.log(`  Impact Level: ${riskColor}${riskLevel}${this.colors.reset}`);
      console.log();

      if (riskLevel === 'High') {
        console.log(`  ${this.colors.yellow}⚠${this.colors.reset}  ${this.colors.bold}High-risk change${this.colors.reset}`);
        console.log(`     This symbol has wide-reaching impact.`);
        console.log(`     Consider: comprehensive testing, gradual rollout, feature flags`);
      } else if (riskLevel === 'Medium') {
        console.log(`  ${this.colors.yellow}ℹ${this.colors.reset}  ${this.colors.bold}Medium-risk change${this.colors.reset}`);
        console.log(`     Moderate impact. Ensure affected areas are tested.`);
      } else {
        console.log(`  ${this.colors.green}✓${this.colors.reset}  ${this.colors.bold}Low-risk change${this.colors.reset}`);
        console.log(`     Limited impact. Standard testing should suffice.`);
      }

      console.log();

      dbManager.close();

      return this.success(`Impact analysis complete: ${impactedSymbols.length} symbols affected`);
    });
  }

  /**
   * Analyze impact using BFS traversal
   */
  private analyzeImpact(
    dbManager: DatabaseManager,
    startSymbol: string,
    maxDepth: number,
    direction: string,
    category?: string,
    minConfidence?: number
  ): ImpactNode[] {
    const visited = new Set<string>();
    const impactNodes: ImpactNode[] = [];
    const queue: Array<{ symbolId: string; depth: number; path: string[] }> = [
      { symbolId: startSymbol, depth: 0, path: [startSymbol] },
    ];

    visited.add(startSymbol);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= maxDepth) continue;

      // Use Drizzle ORM to query relationships
      let relationships = dbManager.getUnifiedRelationshipsBySymbol(current.symbolId);

      // Filter by category and confidence
      if (category) {
        relationships = relationships.filter(r => r.category === category);
      }
      if (minConfidence !== undefined) {
        relationships = relationships.filter(r => r.confidence >= minConfidence);
      }

      for (const rel of relationships) {
        const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
        const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];

        // Find the next symbol in the chain
        let nextSymbols: string[] = [];

        if (direction === 'downstream') {
          // Who uses current symbol
          if (fromSymbols.includes(current.symbolId)) {
            nextSymbols = toSymbols;
          }
        } else if (direction === 'upstream') {
          // What current symbol uses
          if (toSymbols.includes(current.symbolId)) {
            nextSymbols = fromSymbols;
          }
        } else {
          // Both directions
          if (fromSymbols.includes(current.symbolId)) {
            nextSymbols.push(...toSymbols);
          }
          if (toSymbols.includes(current.symbolId)) {
            nextSymbols.push(...fromSymbols);
          }
        }

        for (const nextSymbol of nextSymbols) {
          if (!visited.has(nextSymbol) && nextSymbol !== startSymbol) {
            visited.add(nextSymbol);

            const newPath = [...current.path, nextSymbol];

            impactNodes.push({
              symbolId: nextSymbol,
              depth: current.depth + 1,
              path: newPath,
              relationshipType: rel.type,
              category: rel.category,
            });

            queue.push({
              symbolId: nextSymbol,
              depth: current.depth + 1,
              path: newPath,
            });
          }
        }
      }
    }

    return impactNodes;
  }

  /**
   * Assess risk level based on impact
   */
  private assessRisk(impactCount: number, maxDepth: number): 'Low' | 'Medium' | 'High' {
    if (impactCount === 0) return 'Low';
    if (impactCount >= 20 || maxDepth >= 4) return 'High';
    if (impactCount >= 5 || maxDepth >= 2) return 'Medium';
    return 'Low';
  }

  private getOption(args: string[], flag: string): string | undefined {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
    return undefined;
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
