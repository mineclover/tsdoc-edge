/**
 * Ontology Statistics Command
 * @packageDocumentation
 * @doc [[OntologyStatsCommand]]
 * @doc [[Relationship Ontology]]
 *
 * @responsibility Show comprehensive 3-layer SSOT ontology model statistics
 * @problem Need to understand the complete knowledge graph structure
 * @solves Combines Canonical `@ttsc/graph` code facts with Enrichment domain/test relationships
 * @context Knowledge-graph ontology statistics reporting via `tsdoc-edge ontology stats`
 * @functionality Aggregates node types, relationship categories, strengths, directions, and graph density across canonical `@ttsc/graph` and `.tsdoc.db`
 * @sideEffect console: Writes ontology statistics dashboards or `--json` payloads to stdout
 * @sideEffect database: Reads canonical `@ttsc/graph` and `DatabaseManager` SQLite repositories (read)
 */

import * as fs from 'node:fs';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import {
  type CanonicalGraphPlaneSnapshot,
  projectCanonicalEdgeToOntology,
  readCanonicalGraphSnapshot,
} from './canonicalReadHelper';

/** Statistics about the ontology knowledge graph */
interface OntologyStats {
  source: 'canonical-graph+enrichment' | 'canonical-graph' | 'legacy-db';
  activeRevisionId?: string;
  nodes: {
    total: number;
    byType: Map<string, number>;
  };
  relationships: {
    total: number;
    canonicalEdges: number;
    enrichmentRelationships: number;
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
 * Command for displaying ontology model statistics across Canonical `@ttsc/graph` and Enrichment DB.
 *
 * @doc [[OntologyStatsCommand]]
 * @sideEffect console: Writes ontology model statistics to stdout; reads SQLite repositories
 * @public
 */
export class OntologyStatsCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'ontology-stats';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['onto-stats', 'os'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show comprehensive ontology model statistics and structure';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge ontology-stats [options]

Options:
  --mermaid            Generate Mermaid diagram of ontology model
  --detailed           Show detailed breakdown of all types
  --json               Output as JSON
  --include-external   Include external/stdlib nodes from canonical graph`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(args, [
        '--mermaid',
        '--detailed',
        '--json',
        '--include-external',
      ]);
      if (flagError) return flagError;

      const showMermaid = this.hasFlag(args, '--mermaid');
      const detailed = this.hasFlag(args, '--detailed');
      const jsonOutput = this.hasFlag(args, '--json');
      const includeExternal = this.hasFlag(args, '--include-external');

      const canonicalSnapshot = readCanonicalGraphSnapshot({ includeExternal });
      const dbPath = this.getDatabasePath();
      const hasLegacyDb = fs.existsSync(dbPath);

      if (!canonicalSnapshot && !hasLegacyDb) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbManager = hasLegacyDb ? new DatabaseManager(dbPath) : null;
      try {
        const stats = this.gatherOntologyStats(canonicalSnapshot, dbManager);

        if (jsonOutput) {
          this.outputJSON(stats);
        } else {
          this.outputText(stats, detailed);

          if (showMermaid) {
            console.log();
            this.outputMermaid(stats);
          }
        }

        return this.success();
      } finally {
        dbManager?.close();
      }
    });
  }

  private gatherOntologyStats(
    canonicalSnapshot: CanonicalGraphPlaneSnapshot | null,
    dbManager: DatabaseManager | null
  ): OntologyStats {
    const nodesByType = new Map<string, number>();
    const relsByType = new Map<string, number>();
    const relsByCategory = new Map<string, number>();
    const relsByStrength = new Map<string, number>();
    const relsByDirection = new Map<string, number>();
    const degrees = new Map<string, number>();

    let totalNodes = 0;
    let canonicalEdgeCount = 0;
    let enrichmentRelCount = 0;
    let explicitCount = 0;
    let inferredCount = 0;

    if (canonicalSnapshot) {
      for (const node of canonicalSnapshot.filteredNodes) {
        nodesByType.set(node.kind, (nodesByType.get(node.kind) ?? 0) + 1);
        totalNodes++;
      }

      for (const edge of canonicalSnapshot.filteredEdges) {
        const projected = projectCanonicalEdgeToOntology(edge);
        relsByType.set(projected.rawKind, (relsByType.get(projected.rawKind) ?? 0) + 1);
        relsByCategory.set(projected.category, (relsByCategory.get(projected.category) ?? 0) + 1);
        relsByStrength.set(projected.strength, (relsByStrength.get(projected.strength) ?? 0) + 1);
        relsByDirection.set(
          projected.direction,
          (relsByDirection.get(projected.direction) ?? 0) + 1
        );
        degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1);
        degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1);
        canonicalEdgeCount++;
        explicitCount++;
      }
    }

    if (dbManager) {
      const legacySymbols = dbManager.getAllSymbolRows();
      const legacyToCanonical = new Map<string, string>();
      if (canonicalSnapshot) {
        for (const alias of canonicalSnapshot.aliases) {
          legacyToCanonical.set(alias.legacyId, alias.canonicalId);
        }
        // Add test-case / test-suite symbols not modeled in canonical code graph
        for (const symbol of legacySymbols) {
          if (symbol.type === 'test-case' || symbol.type === 'test-suite') {
            nodesByType.set(symbol.type, (nodesByType.get(symbol.type) ?? 0) + 1);
            totalNodes++;
          }
        }
      } else {
        for (const symbol of legacySymbols) {
          nodesByType.set(symbol.type, (nodesByType.get(symbol.type) ?? 0) + 1);
          totalNodes++;
        }
      }

      const legacyRelationships = dbManager.getAllUnifiedRelationships();
      for (const rel of legacyRelationships) {
        // When canonical @ttsc/graph is active, skip legacy structural edges to avoid double-counting
        if (canonicalSnapshot && rel.category === 'structural') {
          continue;
        }
        relsByType.set(rel.type, (relsByType.get(rel.type) ?? 0) + 1);
        relsByCategory.set(rel.category, (relsByCategory.get(rel.category) ?? 0) + 1);
        relsByStrength.set(rel.strength, (relsByStrength.get(rel.strength) ?? 0) + 1);
        relsByDirection.set(rel.direction, (relsByDirection.get(rel.direction) ?? 0) + 1);

        if (rel.properties?.inferred === true) {
          inferredCount++;
        } else {
          explicitCount++;
        }
        enrichmentRelCount++;

        const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
        const tos = Array.isArray(rel.to) ? rel.to : [rel.to];
        for (const from of froms) {
          const key = legacyToCanonical.get(from) ?? from;
          degrees.set(key, (degrees.get(key) ?? 0) + 1);
        }
        for (const to of tos) {
          const key = legacyToCanonical.get(to) ?? to;
          degrees.set(key, (degrees.get(key) ?? 0) + 1);
        }
      }
    }

    const totalRels = canonicalEdgeCount + enrichmentRelCount;
    const density = totalNodes > 0 ? totalRels / totalNodes : 0;
    const degreeValues = Array.from(degrees.values());
    const avgDegree =
      degreeValues.length > 0 ? degreeValues.reduce((a, b) => a + b, 0) / degreeValues.length : 0;
    const maxDegree = degreeValues.length > 0 ? Math.max(...degreeValues) : 0;
    const coverage = totalNodes > 0 ? Math.min(100, (degrees.size / totalNodes) * 100) : 0;

    const source: OntologyStats['source'] =
      canonicalSnapshot && dbManager
        ? 'canonical-graph+enrichment'
        : canonicalSnapshot
          ? 'canonical-graph'
          : 'legacy-db';

    return {
      source,
      activeRevisionId: canonicalSnapshot?.activeRevisionId,
      nodes: {
        total: totalNodes,
        byType: nodesByType,
      },
      relationships: {
        total: totalRels,
        canonicalEdges: canonicalEdgeCount,
        enrichmentRelationships: enrichmentRelCount,
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

    console.log(`${colors.bold}${colors.cyan}Graph Overview${colors.reset}`);
    console.log(
      `  Data Source:               ${colors.green}${stats.source}${colors.reset}${stats.activeRevisionId ? ` ${colors.dim}(${stats.activeRevisionId.slice(0, 12)}…)${colors.reset}` : ''}`
    );
    console.log(
      `  Total Nodes (Symbols):     ${colors.yellow}${stats.nodes.total.toLocaleString()}${colors.reset}`
    );
    console.log(
      `  Total Relationships:       ${colors.yellow}${stats.relationships.total.toLocaleString()}${colors.reset} ${colors.dim}(canonical: ${stats.relationships.canonicalEdges.toLocaleString()}, enrichment: ${stats.relationships.enrichmentRelationships.toLocaleString()})${colors.reset}`
    );
    console.log(
      `  Graph Density:             ${colors.yellow}${stats.metrics.density.toFixed(2)}${colors.reset} (relationships/node)`
    );
    console.log(
      `  Average Node Degree:       ${colors.yellow}${stats.metrics.avgDegree.toFixed(2)}${colors.reset}`
    );
    console.log(
      `  Maximum Node Degree:       ${colors.yellow}${stats.metrics.maxDegree}${colors.reset}`
    );
    console.log(
      `  Coverage:                  ${colors.yellow}${stats.metrics.coverage.toFixed(1)}%${colors.reset} (nodes with ≥1 relationship)`
    );
    console.log();

    const explicitPct =
      stats.relationships.total > 0
        ? ((stats.relationships.explicit / stats.relationships.total) * 100).toFixed(1)
        : '0.0';
    const inferredPct =
      stats.relationships.total > 0
        ? ((stats.relationships.inferred / stats.relationships.total) * 100).toFixed(1)
        : '0.0';

    console.log(`${colors.bold}${colors.cyan}Relationship Composition${colors.reset}`);
    console.log(
      `  Explicit:                  ${colors.green}${stats.relationships.explicit.toLocaleString()}${colors.reset} (${explicitPct}%)`
    );
    console.log(
      `  Inferred:                  ${colors.yellow}${stats.relationships.inferred.toLocaleString()}${colors.reset} (${inferredPct}%)`
    );
    console.log();

    console.log(`${colors.bold}${colors.cyan}Node Distribution by Type${colors.reset}`);
    const sortedNodeTypes = Array.from(stats.nodes.byType.entries()).sort((a, b) => b[1] - a[1]);
    const topNodeTypes = detailed ? sortedNodeTypes : sortedNodeTypes.slice(0, 10);
    for (const [type, count] of topNodeTypes) {
      const percentage =
        stats.nodes.total > 0 ? ((count / stats.nodes.total) * 100).toFixed(1) : '0.0';
      const bar = this.createBar(count, stats.nodes.total, 30);
      console.log(
        `  ${type.padEnd(25)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`
      );
    }
    if (!detailed && sortedNodeTypes.length > 10) {
      console.log(
        `  ${colors.dim}... and ${sortedNodeTypes.length - 10} more types${colors.reset}`
      );
    }
    console.log();

    console.log(`${colors.bold}${colors.cyan}Relationships by Category${colors.reset}`);
    const sortedCategories = Array.from(stats.relationships.byCategory.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    for (const [category, count] of sortedCategories) {
      const percentage =
        stats.relationships.total > 0
          ? ((count / stats.relationships.total) * 100).toFixed(1)
          : '0.0';
      const bar = this.createBar(count, stats.relationships.total, 30);
      const icon = this.getCategoryIcon(category);
      console.log(
        `  ${icon} ${category.padEnd(20)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`
      );
    }
    console.log();

    console.log(`${colors.bold}${colors.cyan}Relationships by Type${colors.reset}`);
    const sortedRelTypes = Array.from(stats.relationships.byType.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const topRelTypes = detailed ? sortedRelTypes : sortedRelTypes.slice(0, 15);
    for (const [type, count] of topRelTypes) {
      const percentage =
        stats.relationships.total > 0
          ? ((count / stats.relationships.total) * 100).toFixed(1)
          : '0.0';
      const bar = this.createBar(count, stats.relationships.total, 30);
      console.log(
        `  ${type.padEnd(30)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`
      );
    }
    if (!detailed && sortedRelTypes.length > 15) {
      console.log(`  ${colors.dim}... and ${sortedRelTypes.length - 15} more types${colors.reset}`);
    }
    console.log();

    console.log(`${colors.bold}${colors.cyan}Relationships by Strength${colors.reset}`);
    const strengthOrder = ['strong', 'medium', 'weak'];
    for (const strength of strengthOrder) {
      const count = stats.relationships.byStrength.get(strength) ?? 0;
      const percentage =
        stats.relationships.total > 0
          ? ((count / stats.relationships.total) * 100).toFixed(1)
          : '0.0';
      const bar = this.createBar(count, stats.relationships.total, 30);
      const icon = strength === 'strong' ? '💪' : strength === 'medium' ? '👍' : '👌';
      console.log(
        `  ${icon} ${strength.padEnd(20)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`
      );
    }
    console.log();

    console.log(`${colors.bold}${colors.cyan}Relationships by Direction${colors.reset}`);
    const directionOrder = ['unidirectional', 'bidirectional', 'undirected'];
    for (const direction of directionOrder) {
      const count = stats.relationships.byDirection.get(direction) ?? 0;
      const percentage =
        stats.relationships.total > 0
          ? ((count / stats.relationships.total) * 100).toFixed(1)
          : '0.0';
      const bar = this.createBar(count, stats.relationships.total, 30);
      const icon = direction === 'unidirectional' ? '→' : direction === 'bidirectional' ? '↔' : '—';
      console.log(
        `  ${icon} ${direction.padEnd(20)} ${bar} ${colors.cyan}${count.toLocaleString().padStart(6)}${colors.reset} (${percentage}%)`
      );
    }
  }

  private outputJSON(stats: OntologyStats): void {
    const output = {
      source: stats.source,
      ...(stats.activeRevisionId ? { activeRevisionId: stats.activeRevisionId } : {}),
      nodes: {
        total: stats.nodes.total,
        byType: Object.fromEntries(stats.nodes.byType),
      },
      relationships: {
        total: stats.relationships.total,
        canonicalEdges: stats.relationships.canonicalEdges,
        enrichmentRelationships: stats.relationships.enrichmentRelationships,
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

    console.log('    subgraph Rels["Relationship Categories"]');
    const categories = Array.from(stats.relationships.byCategory.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    for (const [category, count] of categories) {
      const catId = `C_${category.replace(/[^a-zA-Z0-9]/g, '_')}`;
      console.log(`      ${catId}["${category}<br/>${count.toLocaleString()} rels"]`);
    }
    console.log('    end');
    console.log();

    console.log('    subgraph Metrics["Graph Metrics"]');
    console.log(`      M_density["Density: ${stats.metrics.density.toFixed(2)}"]`);
    console.log(`      M_coverage["Coverage: ${stats.metrics.coverage.toFixed(1)}%"]`);
    console.log(`      M_degree["Avg Degree: ${stats.metrics.avgDegree.toFixed(2)}"]`);
    console.log('    end');

    console.log('  end');
    console.log();

    console.log('  classDef nodeClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px;');
    console.log('  classDef relClass fill:#fff3e0,stroke:#e65100,stroke-width:2px;');
    console.log('  classDef metricClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;');
    console.log();
    if (topNodeTypes.length > 0) {
      console.log(
        `  class ${topNodeTypes.map(([type]) => `N_${type.replace(/[^a-zA-Z0-9]/g, '_')}`).join(',')} nodeClass;`
      );
    }
    if (categories.length > 0) {
      console.log(
        `  class ${categories.map(([cat]) => `C_${cat.replace(/[^a-zA-Z0-9]/g, '_')}`).join(',')} relClass;`
      );
    }
    console.log('  class M_density,M_coverage,M_degree metricClass;');

    console.log('```');
    console.log();
    console.log(
      `${colors.dim}Tip: Copy the Mermaid diagram to https://mermaid.live for interactive visualization${colors.reset}`
    );
  }

  private createBar(value: number, max: number, width: number): string {
    if (max <= 0) {
      return `${colors.dim}${'░'.repeat(width)}${colors.reset}`;
    }
    const filled = Math.min(width, Math.max(0, Math.round((value / max) * width)));
    const empty = width - filled;
    return colors.green + '█'.repeat(filled) + colors.dim + '░'.repeat(empty) + colors.reset;
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      structural: '🏗️',
      'type-system': '🧬',
      'data-flow': '📊',
      behavioral: '⚙️',
      temporal: '⏱️',
      semantic: '💡',
      quality: '✨',
      verification: '✅',
      organizational: '📁',
      testing: '🧪',
      alternative: '🔀',
      constraint: '🔒',
    };
    return icons[category] || '🔗';
  }
}
