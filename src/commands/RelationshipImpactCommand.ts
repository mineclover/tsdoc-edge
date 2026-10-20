/**
 * Relationship Impact Analysis Command
 * @packageDocumentation
 */

import { GraphService, type ImpactNode, type ImpactOptions } from '../graph/GraphService';
import { CanonicalAliasContext } from '../indexer';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';

/**
 * Command for analyzing change impact through relationships
 * @doc [[RelationshipImpactCommand]]
 * @public
 */
export class RelationshipImpactCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-impact';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Analyze impact of changing a symbol (what would be affected)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
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

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
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
      const options: ImpactOptions = {
        depth: Number.parseInt(this.getOption(args, '--depth') || '3', 10),
        direction: this.getOption(args, '--direction') || 'downstream',
        category: this.getOption(args, '--category'),
        minConfidence: Number.parseFloat(this.getOption(args, '--min-confidence') || '0.5'),
      };

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);
      const graph = new GraphService(dbManager);
      const canonicalContext = CanonicalAliasContext.tryOpen(process.cwd());

      // Resolve through both the legacy DB and the canonical graph. Canonical
      // ids remain valid query inputs during the migration away from TS5 data.
      const resolved = this.resolveSymbol(dbManager, symbolId);
      const canonicalId =
        canonicalContext?.resolveCanonicalId(resolved?.id ?? symbolId) ??
        canonicalContext?.resolveCanonicalId(symbolId) ??
        null;

      if (!resolved && !canonicalId) {
        this.printError(`Symbol not found: ${symbolId}`);
        dbManager.close();
        canonicalContext?.close();
        return { success: false, message: 'Symbol not found', exitCode: 1 };
      }

      const resolvedId = resolved?.id;
      const canonicalNode = canonicalId
        ? canonicalContext?.analysis.index.getNode(canonicalId)
        : undefined;
      const symbolName =
        resolved?.symbol.name ?? canonicalNode?.qualifiedName ?? canonicalNode?.name ?? symbolId;
      const symbolType = resolved?.symbol.type ?? canonicalNode?.kind ?? 'canonical';
      this.printHeader(`Impact Analysis: ${symbolName}`);

      console.log();
      this.printInfo(`Analyzing impact for: ${symbolName} (${symbolType})`);
      this.printInfo(`Direction: ${options.direction}, Max depth: ${options.depth}`);
      console.log();

      // Perform impact analysis
      const impactedSymbols = resolvedId ? graph.analyzeImpact(resolvedId, options) : [];
      const canonicalImpact =
        canonicalId && canonicalContext
          ? graph.analyzeCanonicalImpact(canonicalContext, canonicalId, options)
          : [];

      if (impactedSymbols.length === 0 && canonicalImpact.length === 0) {
        this.printSuccess('No impact found (symbol is isolated)');
        console.log();
        dbManager.close();
        canonicalContext?.close();
        return this.success('Analysis complete');
      }

      if (impactedSymbols.length === 0) {
        this.printCanonicalImpact(canonicalImpact, options.direction);
        const canonicalDepth = Math.max(...canonicalImpact.map((node) => node.depth));
        const riskLevel = graph.assessRisk(canonicalImpact.length, canonicalDepth);
        this.printInfo(`Canonical change risk: ${riskLevel}`);
        console.log();
        dbManager.close();
        canonicalContext?.close();
        return this.success(
          `Impact analysis complete: ${canonicalImpact.length} canonical symbols affected`
        );
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
        byDepth.get(node.depth)?.push(node);
      }

      // Display by depth level
      for (const depth of Array.from(byDepth.keys()).sort((a, b) => a - b)) {
        const nodes = byDepth.get(depth)!;
        console.log(
          `  ${this.colors.bold}Depth ${depth}${this.colors.reset} (${nodes.length} symbols)`
        );
        console.log();

        // Group by category
        const byCategory = new Map<string, ImpactNode[]>();
        for (const node of nodes) {
          if (!byCategory.has(node.category)) {
            byCategory.set(node.category, []);
          }
          byCategory.get(node.category)?.push(node);
        }

        for (const [category, categoryNodes] of byCategory.entries()) {
          console.log(
            `    ${this.colors.cyan}${category}${this.colors.reset} (${categoryNodes.length})`
          );

          const samplesToShow = Math.min(5, categoryNodes.length);
          for (let i = 0; i < samplesToShow; i++) {
            const node = categoryNodes[i];
            const arrow = options.direction === 'upstream' ? '←' : '→';
            console.log(
              `      ${arrow} ${node.symbolId} ${this.colors.dim}(via ${node.relationshipType})${this.colors.reset}`
            );
            console.log(
              `        ${this.colors.dim}Path: ${node.path.join(' → ')}${this.colors.reset}`
            );
          }

          if (categoryNodes.length > samplesToShow) {
            console.log(
              `      ${this.colors.dim}... and ${categoryNodes.length - samplesToShow} more${this.colors.reset}`
            );
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

      console.log(
        `  Total affected symbols: ${this.colors.cyan}${impactedSymbols.length}${this.colors.reset}`
      );
      console.log(
        `  Maximum depth reached: ${this.colors.cyan}${Math.max(...Array.from(byDepth.keys()))}${this.colors.reset}`
      );
      console.log();

      console.log(`  ${this.colors.dim}By category:${this.colors.reset}`);
      for (const [category, count] of Array.from(byCategory.entries()).sort(
        (a, b) => b[1] - a[1]
      )) {
        const percentage = ((count / impactedSymbols.length) * 100).toFixed(1);
        console.log(
          `    ${category}: ${this.colors.cyan}${count}${this.colors.reset} (${percentage}%)`
        );
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

      if (canonicalImpact.length > 0) this.printCanonicalImpact(canonicalImpact, options.direction);

      // Risk assessment
      this.printSection('Change Risk Assessment');

      const riskLevel = graph.assessRisk(
        impactedSymbols.length,
        Math.max(...Array.from(byDepth.keys()))
      );
      const riskColor =
        riskLevel === 'High'
          ? this.colors.red
          : riskLevel === 'Medium'
            ? this.colors.yellow
            : this.colors.green;

      console.log(`  Impact Level: ${riskColor}${riskLevel}${this.colors.reset}`);
      console.log();

      if (riskLevel === 'High') {
        console.log(
          `  ${this.colors.yellow}⚠${this.colors.reset}  ${this.colors.bold}High-risk change${this.colors.reset}`
        );
        console.log(`     This symbol has wide-reaching impact.`);
        console.log(`     Consider: comprehensive testing, gradual rollout, feature flags`);
      } else if (riskLevel === 'Medium') {
        console.log(
          `  ${this.colors.yellow}ℹ${this.colors.reset}  ${this.colors.bold}Medium-risk change${this.colors.reset}`
        );
        console.log(`     Moderate impact. Ensure affected areas are tested.`);
      } else {
        console.log(
          `  ${this.colors.green}✓${this.colors.reset}  ${this.colors.bold}Low-risk change${this.colors.reset}`
        );
        console.log(`     Limited impact. Standard testing should suffice.`);
      }

      console.log();

      dbManager.close();
      canonicalContext?.close();

      return this.success(`Impact analysis complete: ${impactedSymbols.length} symbols affected`);
    });
  }

  private printCanonicalImpact(nodes: readonly ImpactNode[], direction: string): void {
    this.printSection('Canonical Structural Impact');
    this.printInfo(`${nodes.length} affected canonical nodes`);
    const arrow = direction === 'upstream' ? '←' : direction === 'both' ? '↔' : '→';
    for (const node of nodes.slice(0, 10)) {
      console.log(
        `  ${arrow} ${node.symbolId} ${this.colors.dim}(depth ${node.depth}, via ${node.relationshipType})${this.colors.reset}`
      );
    }
    if (nodes.length > 10) {
      console.log(`  ${this.colors.dim}... and ${nodes.length - 10} more${this.colors.reset}`);
    }
    console.log();
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
