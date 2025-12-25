/**
 * Ontology Statistics Command
 * @packageDocumentation
 *
 * @responsibility Show comprehensive ontology model statistics
 * @problem Need to understand the complete knowledge graph structure
 * @solves Provides hierarchical view of nodes, relationships, and their distribution
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

interface OntologyStats {
  nodes: {
    total: number;
    byType: Map<string, number>;
  };
  relationships: {
    total: number;
    byType: Map<string, number>;
    byCategory: Map<string, number>;
    byStrength: Map<string, number>;
    byDirection: Map<string, number>;
    explicit: number;
    inferred: number;
  };
  metrics: {
    density: number;
    avgDegree: number;
    maxDegree: number;
    coverage: number;
  };
}

/**
 * Command for displaying ontology model statistics
 *
 * Shows comprehensive statistics about the knowledge graph:
 * - Node (symbol) distribution by type and kind
 * - Relationship distribution by type, category, strength
 * - Graph metrics (density, degree distribution)
 * - Ontology model visualization
 *
 * @doc [[OntologyStatsCommand]]
 * @public
 */
export class OntologyStatsCommand extends BaseCommand {
  getName(): string {
    return 'ontology-stats';
  }

  getAlias(): string[] {
    return ['onto-stats', 'os'];
  }

  getDescription(): string {
    return 'Show comprehensive ontology model statistics and structure';
  }

  protected getUsage(): string {
    return `tsdoc-edge ontology-stats [options]

Options:
  --mermaid         Generate Mermaid diagram of ontology model
  --detailed        Show detailed breakdown of all types
  --json            Output as JSON`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const showMermaid = args.includes('--mermaid');
      const detailed = args.includes('--detailed');
      const jsonOutput = args.includes('--json');

      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbManager = new DatabaseManager(this.getDatabasePath());
      const stats = this.gatherOntologyStats(dbManager);

      if (jsonOutput) {
        this.outputJSON(stats);
      } else {
        this.outputText(stats, detailed);

        if (showMermaid) {
          console.log();
          this.outputMermaid(stats);
        }
      }

      dbManager.close();

      return this.success();
    });
  }

  private gatherOntologyStats(dbManager: DatabaseManager): OntologyStats {
    // Get all symbols
    const symbols = dbManager.getAllSymbolRows();

    // Get all relationships
    const relationships = dbManager.getAllUnifiedRelationships();

    // Calculate node statistics
    const nodesByType = new Map<string, number>();

    for (const symbol of symbols) {
      nodesByType.set(symbol.type, (nodesByType.get(symbol.type) || 0) + 1);
    }

    // Calculate relationship statistics
    const relsByType = new Map<string, number>();
    const relsByCategory = new Map<string, number>();
    const relsByStrength = new Map<string, number>();
    const relsByDirection = new Map<string, number>();
    let explicitCount = 0;
    let inferredCount = 0;

    for (const rel of relationships) {
      relsByType.set(rel.type, (relsByType.get(rel.type) || 0) + 1);
      relsByCategory.set(rel.category, (relsByCategory.get(rel.category) || 0) + 1);
      relsByStrength.set(rel.strength, (relsByStrength.get(rel.strength) || 0) + 1);
      relsByDirection.set(rel.direction, (relsByDirection.get(rel.direction) || 0) + 1);

      if (rel.properties?.inferred === true) {
        inferredCount++;
      } else {
        explicitCount++;
      }
    }

    // Calculate graph metrics
    const totalNodes = symbols.length;
    const totalRels = relationships.length;
    const density = totalNodes > 0 ? totalRels / totalNodes : 0;

    // Calculate degree distribution
    const degrees = new Map<string, number>();
    for (const rel of relationships) {
      const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
      const tos = Array.isArray(rel.to) ? rel.to : [rel.to];

      for (const from of froms) {
        degrees.set(from, (degrees.get(from) || 0) + 1);
      }
      for (const to of tos) {
        degrees.set(to, (degrees.get(to) || 0) + 1);
      }
    }

    const degreeValues = Array.from(degrees.values());
    const avgDegree = degreeValues.length > 0
      ? degreeValues.reduce((a, b) => a + b, 0) / degreeValues.length
      : 0;
    const maxDegree = degreeValues.length > 0 ? Math.max(...degreeValues) : 0;

    // Calculate coverage (percentage of nodes with at least one relationship)
    const coverage = totalNodes > 0 ? (degrees.size / totalNodes) * 100 : 0;

    return {
      nodes: {
        total: totalNodes,
        byType: nodesByType,
      },
      relationships: {
        total: totalRels,
        byType: relsByType,
        byCategory: relsByCategory,
        byStrength: relsByStrength,
        byDirection: relsByDirection,
        explicit: explicitCount,
        inferred: inferredCount,
      },
      metrics: {
        density,
        avgDegree,
        maxDegree,
        coverage,
      },
    };
  }

  private outputText(stats: OntologyStats, detailed: boolean): void {
    this.printHeader('Ontology Model Statistics');

    // Overall metrics
    console.log(`${colors.bold}${colors.cyan}Graph Overview${colors.reset}`);
    console.log(`  Total Nodes (Symbols):     ${colors.yellow}${stats.nodes.total.toLocaleString()}${colors.reset}`);
    console.log(`  Total Relationships:       ${colors.yellow}${stats.relationships.total.toLocaleString()}${colors.reset}`);
    console.log(`  Graph Density:             ${colors.yellow}${stats.metrics.density.toFixed(2)}${colors.reset} (relationships/node)`);
    console.log(`  Average Node Degree:       ${colors.yellow}${stats.metrics.avgDegree.toFixed(2)}${colors.reset}`);
    console.log(`  Maximum Node Degree:       ${colors.yellow}${stats.metrics.maxDegree}${colors.reset}`);
    console.log(`  Coverage:                  ${colors.yellow}${stats.metrics.coverage.toFixed(1)}%${colors.reset} (nodes with ≥1 relationship)`);
    console.log();

    // Relationship breakdown
    console.log(`${colors.bold}${colors.cyan}Relationship Composition${colors.reset}`);
    console.log(`  Explicit:                  ${colors.green}${stats.relationships.explicit.toLocaleString()}${colors.reset} (${((stats.relationships.explicit / stats.relationships.total) * 100).toFixed(1)}%)`);
    console.log(`  Inferred:                  ${colors.yellow}${stats.relationships.inferred.toLocaleString()}${colors.reset} (${((stats.relationships.inferred / stats.relationships.total) * 100).toFixed(1)}%)`);
    console.log();

    // Nodes by type
    console.log(`${colors.bold}${colors.cyan}Node Distribution by Type${colors.reset}`);
    const sortedNodeTypes = Array.from(stats.nodes.byType.entries())
      .sort((a, b) => b[1] - a[1]);

    const topNodeTypes = detailed ? sortedNodeTypes : sortedNodeTypes.slice(0, 10);
    for (const [type, count] of topNodeTypes) {
      const percentage = ((count / stats.nodes.total) * 100).toFixed(1);
      const bar = this.createBar(count, stats.nodes.total, 30);
      console.log(`  ${type.padEnd(25)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`);
    }
    if (!detailed && sortedNodeTypes.length > 10) {
      console.log(`  ${colors.dim}... and ${sortedNodeTypes.length - 10} more types${colors.reset}`);
    }
    console.log();

    // Relationships by category
    console.log(`${colors.bold}${colors.cyan}Relationships by Category${colors.reset}`);
    const sortedCategories = Array.from(stats.relationships.byCategory.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [category, count] of sortedCategories) {
      const percentage = ((count / stats.relationships.total) * 100).toFixed(1);
      const bar = this.createBar(count, stats.relationships.total, 30);
      const icon = this.getCategoryIcon(category);
      console.log(`  ${icon} ${category.padEnd(20)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`);
    }
    console.log();

    // Relationships by type
    console.log(`${colors.bold}${colors.cyan}Relationships by Type${colors.reset}`);
    const sortedRelTypes = Array.from(stats.relationships.byType.entries())
      .sort((a, b) => b[1] - a[1]);

    const topRelTypes = detailed ? sortedRelTypes : sortedRelTypes.slice(0, 15);
    for (const [type, count] of topRelTypes) {
      const percentage = ((count / stats.relationships.total) * 100).toFixed(1);
      const bar = this.createBar(count, stats.relationships.total, 30);
      console.log(`  ${type.padEnd(30)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`);
    }
    if (!detailed && sortedRelTypes.length > 15) {
      console.log(`  ${colors.dim}... and ${sortedRelTypes.length - 15} more types${colors.reset}`);
    }
    console.log();

    // Relationships by strength
    console.log(`${colors.bold}${colors.cyan}Relationships by Strength${colors.reset}`);
    const strengthOrder = ['strong', 'medium', 'weak'];
    for (const strength of strengthOrder) {
      const count = stats.relationships.byStrength.get(strength) || 0;
      const percentage = stats.relationships.total > 0 ? ((count / stats.relationships.total) * 100).toFixed(1) : '0.0';
      const bar = this.createBar(count, stats.relationships.total, 30);
      const icon = strength === 'strong' ? '💪' : strength === 'medium' ? '👍' : '👌';
      console.log(`  ${icon} ${strength.padEnd(20)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`);
    }
    console.log();

    // Relationships by direction
    console.log(`${colors.bold}${colors.cyan}Relationships by Direction${colors.reset}`);
    const directionOrder = ['unidirectional', 'bidirectional', 'undirected'];
    for (const direction of directionOrder) {
      const count = stats.relationships.byDirection.get(direction) || 0;
      const percentage = stats.relationships.total > 0 ? ((count / stats.relationships.total) * 100).toFixed(1) : '0.0';
      const bar = this.createBar(count, stats.relationships.total, 30);
      const icon = direction === 'unidirectional' ? '→' : direction === 'bidirectional' ? '↔' : '—';
      console.log(`  ${icon} ${direction.padEnd(20)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`);
    }
  }

  private outputJSON(stats: OntologyStats): void {
    const output = {
      nodes: {
        total: stats.nodes.total,
        byType: Object.fromEntries(stats.nodes.byType),
      },
      relationships: {
        total: stats.relationships.total,
        byType: Object.fromEntries(stats.relationships.byType),
        byCategory: Object.fromEntries(stats.relationships.byCategory),
        byStrength: Object.fromEntries(stats.relationships.byStrength),
        byDirection: Object.fromEntries(stats.relationships.byDirection),
        explicit: stats.relationships.explicit,
        inferred: stats.relationships.inferred,
      },
      metrics: stats.metrics,
    };

    console.log(JSON.stringify(output, null, 2));
  }

  private outputMermaid(stats: OntologyStats): void {
    console.log(`${colors.bold}${colors.cyan}Ontology Model Diagram${colors.reset}`);
    console.log();
    console.log('```mermaid');
    console.log('graph TB');
    console.log('  subgraph Ontology["TSDoc Edge Ontology Model"]');
    console.log();

    // Node types subgraph
    console.log('    subgraph Nodes["Node Types"]');
    const topNodeTypes = Array.from(stats.nodes.byType.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    for (const [type, count] of topNodeTypes) {
      const nodeId = `N_${type.replace(/[^a-zA-Z0-9]/g, '_')}`;
      console.log(`      ${nodeId}["${type}<br/>${count.toLocaleString()} nodes"]`);
    }
    console.log('    end');
    console.log();

    // Relationship categories subgraph
    console.log('    subgraph Rels["Relationship Categories"]');
    const categories = Array.from(stats.relationships.byCategory.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [category, count] of categories) {
      const catId = `C_${category.replace(/[^a-zA-Z0-9]/g, '_')}`;
      console.log(`      ${catId}["${category}<br/>${count.toLocaleString()} rels"]`);
    }
    console.log('    end');
    console.log();

    // Metrics subgraph
    console.log('    subgraph Metrics["Graph Metrics"]');
    console.log(`      M_density["Density: ${stats.metrics.density.toFixed(2)}"]`);
    console.log(`      M_coverage["Coverage: ${stats.metrics.coverage.toFixed(1)}%"]`);
    console.log(`      M_degree["Avg Degree: ${stats.metrics.avgDegree.toFixed(2)}"]`);
    console.log('    end');

    console.log('  end');
    console.log();

    // Styling
    console.log('  classDef nodeClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px;');
    console.log('  classDef relClass fill:#fff3e0,stroke:#e65100,stroke-width:2px;');
    console.log('  classDef metricClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;');
    console.log();
    console.log('  class ' + topNodeTypes.map(([type]) => `N_${type.replace(/[^a-zA-Z0-9]/g, '_')}`).join(',') + ' nodeClass;');
    console.log('  class ' + categories.map(([cat]) => `C_${cat.replace(/[^a-zA-Z0-9]/g, '_')}`).join(',') + ' relClass;');
    console.log('  class M_density,M_coverage,M_degree metricClass;');

    console.log('```');
    console.log();
    console.log(`${colors.dim}Tip: Copy the Mermaid diagram to https://mermaid.live for interactive visualization${colors.reset}`);
  }

  private createBar(value: number, max: number, width: number): string {
    const filled = Math.round((value / max) * width);
    const empty = width - filled;
    return colors.green + '█'.repeat(filled) + colors.dim + '░'.repeat(empty) + colors.reset;
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'structural': '🏗️',
      'data-flow': '📊',
      'behavioral': '⚙️',
      'temporal': '⏱️',
      'semantic': '💡',
      'quality': '✨',
      'verification': '✅',
      'organizational': '📁',
      'testing': '🧪',
      'alternative': '🔀',
      'constraint': '🔒',
    };
    return icons[category] || '🔗';
  }
}
