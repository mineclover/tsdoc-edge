/**
 * Relationship Statistics Command
 *
 * @packageDocumentation
 * @doc [[RelationshipStatsCommand]]
 * @doc [[RelationshipCommands]]
 * @context Relationship distribution and density reporting via `tsdoc-edge relationship stats`
 * @functionality Aggregates edge counts by ontology category, relationship type, confidence, and discovery source across canonical `@ttsc/graph` and `.tsdoc.db`
 * @sideEffect console: Writes formatted relationship statistics or `--json` payloads to stdout
 * @sideEffect database: Reads canonical `@ttsc/graph` and `DatabaseManager` SQLite repositories (read)
 */

import * as fs from 'node:fs';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';
import {
  type CanonicalGraphPlaneSnapshot,
  projectCanonicalEdgeToOntology,
  readCanonicalGraphSnapshot,
} from './canonicalReadHelper';

/**
 * Command for showing relationship statistics across Canonical `@ttsc/graph` and Enrichment DB.
 * @doc [[RelationshipStatsCommand]]
 * @sideEffect console: Writes relationship statistics to stdout; reads SQLite repositories
 * @public
 */
export class RelationshipStatsCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-stats';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show 3-layer SSOT relationship statistics across Canonical @ttsc/graph and Enrichment DB';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge relationship-stats [options]

Options:
  --detailed           Show detailed breakdown of all relationship types
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
        '--detailed',
        '--json',
        '--include-external',
      ]);
      if (flagError) return flagError;

      const detailed = this.hasFlag(args, '--detailed');
      const isJson = this.hasFlag(args, '--json');
      const includeExternal = this.hasFlag(args, '--include-external');

      const canonicalSnapshot = readCanonicalGraphSnapshot({ includeExternal });
      const dbPath = this.getDatabasePath();
      let dbManager: DatabaseManager | null = null;

      if (!canonicalSnapshot) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
        dbManager = new DatabaseManager(dbPath);
      } else if (fs.existsSync(dbPath)) {
        dbManager = new DatabaseManager(dbPath);
      }

      try {
        const summary = this.collectStats(canonicalSnapshot, dbManager);

        if (isJson) {
          console.log(JSON.stringify(summary, null, 2));
          return this.success(
            `${summary.combined.totalRelationships} relationships across ${summary.combined.activeCategories} categories`
          );
        }

        this.renderHuman(summary, detailed);
        return this.success(
          `${summary.combined.totalRelationships} relationships across ${summary.combined.activeCategories} categories`
        );
      } finally {
        dbManager?.close();
      }
    });
  }

  private collectStats(
    canonicalSnapshot: CanonicalGraphPlaneSnapshot | null,
    dbManager: DatabaseManager | null
  ): RelationshipStatsSummary {
    const canonicalByKind: Record<string, number> = {};
    const canonicalByCategory: Record<string, number> = {};
    let canonicalEdges = 0;
    let canonicalNodes = 0;

    if (canonicalSnapshot) {
      canonicalNodes = canonicalSnapshot.filteredNodes.length;
      for (const edge of canonicalSnapshot.filteredEdges) {
        const projected = projectCanonicalEdgeToOntology(edge);
        canonicalByKind[projected.rawKind] = (canonicalByKind[projected.rawKind] ?? 0) + 1;
        canonicalByCategory[projected.category] =
          (canonicalByCategory[projected.category] ?? 0) + 1;
        canonicalEdges++;
      }
    }

    let legacySymbols = 0;
    let legacyTotal = 0;
    let legacyExplicit = 0;
    let legacyInferred = 0;
    const legacyByCategory: Record<string, number> = {};
    const legacyByType: Array<{ type: string; category: string; count: number }> = [];

    if (dbManager) {
      legacySymbols = dbManager.countSymbols();
      const byCategoryRows = dbManager.countRelationshipsByCategory();
      const byTypeRows = dbManager.countRelationshipsByType();
      const allRels = dbManager.getAllUnifiedRelationships();

      const typeToCategory = new Map<string, string>();
      for (const rel of allRels) {
        if (!typeToCategory.has(rel.type)) {
          typeToCategory.set(rel.type, rel.category);
        }
        if (rel.properties?.inferred === true) {
          legacyInferred++;
        } else {
          legacyExplicit++;
        }
      }

      for (const row of byCategoryRows) {
        legacyByCategory[row.category] = row.count;
      }
      for (const row of byTypeRows) {
        legacyByType.push({
          type: row.type,
          category: typeToCategory.get(row.type) ?? 'unknown',
          count: row.count,
        });
        legacyTotal += row.count;
      }
    }

    // Combined 3-Layer SSOT totals (skip duplicate legacy structural edges when canonical graph is active)
    const combinedByCategory: Record<string, number> = { ...canonicalByCategory };
    const combinedByType: Array<{
      type: string;
      category: string;
      count: number;
      plane: 'canonical-graph' | 'enrichment-db';
    }> = Object.entries(canonicalByKind).map(([kind, count]) => ({
      type: kind,
      category: projectCanonicalEdgeToOntology({ kind, from: '', to: '' }).category,
      count,
      plane: 'canonical-graph' as const,
    }));

    let combinedEnrichmentCount = 0;
    for (const [category, count] of Object.entries(legacyByCategory)) {
      if (canonicalSnapshot && category === 'structural') {
        continue;
      }
      combinedByCategory[category] = (combinedByCategory[category] ?? 0) + count;
    }
    for (const item of legacyByType) {
      if (canonicalSnapshot && item.category === 'structural') {
        continue;
      }
      combinedByType.push({
        type: item.type,
        category: item.category,
        count: item.count,
        plane: 'enrichment-db',
      });
      combinedEnrichmentCount += item.count;
    }

    combinedByType.sort((a, b) => b.count - a.count);
    const totalRelationships = canonicalEdges + combinedEnrichmentCount;
    const activeCategories = Object.values(combinedByCategory).filter((c) => c > 0).length;

    return {
      canonicalGraph: {
        available: Boolean(canonicalSnapshot),
        activeRevisionId: canonicalSnapshot?.activeRevisionId,
        nodes: canonicalNodes,
        edges: canonicalEdges,
        byKind: canonicalByKind,
        byCategory: canonicalByCategory,
      },
      enrichmentDb: {
        available: Boolean(dbManager),
        symbols: legacySymbols,
        totalRelationships: legacyTotal,
        explicit: legacyExplicit,
        inferred: legacyInferred,
        byCategory: legacyByCategory,
        byType: legacyByType,
      },
      combined: {
        totalRelationships,
        canonicalEdges,
        enrichmentRelationships: combinedEnrichmentCount,
        activeCategories,
        activeTypes: combinedByType.length,
        byCategory: combinedByCategory,
        byType: combinedByType,
      },
    };
  }

  private renderHuman(summary: RelationshipStatsSummary, detailed: boolean): void {
    this.printHeader('TSDoc Edge - Relationship Statistics');
    console.log();

    this.printSection('SSOT Plane Overview');
    if (summary.canonicalGraph.available) {
      const revShort = (summary.canonicalGraph.activeRevisionId ?? '').slice(0, 12);
      console.log(
        `  Canonical @ttsc/graph: ${this.colors.cyan}${summary.canonicalGraph.nodes.toLocaleString()}${this.colors.reset} nodes / ${this.colors.cyan}${summary.canonicalGraph.edges.toLocaleString()}${this.colors.reset} edges ${this.colors.dim}(${revShort}…)${this.colors.reset}`
      );
    } else {
      console.log(
        `  Canonical @ttsc/graph: ${this.colors.yellow}not built${this.colors.reset} (run ${this.colors.cyan}tsdoc-edge sync${this.colors.reset})`
      );
    }

    if (summary.enrichmentDb.available) {
      const inferredPct =
        summary.enrichmentDb.totalRelationships > 0
          ? (
              (summary.enrichmentDb.inferred / summary.enrichmentDb.totalRelationships) *
              100
            ).toFixed(1)
          : '0.0';
      console.log(
        `  Enrichment Symbol DB:  ${this.colors.cyan}${summary.enrichmentDb.symbols.toLocaleString()}${this.colors.reset} symbols / ${this.colors.cyan}${summary.enrichmentDb.totalRelationships.toLocaleString()}${this.colors.reset} relationships ${this.colors.dim}(explicit: ${summary.enrichmentDb.explicit.toLocaleString()}, inferred: ${summary.enrichmentDb.inferred.toLocaleString()} [${inferredPct}%])${this.colors.reset}`
      );
    }

    console.log(
      `  Active Combined Graph: ${this.colors.green}${summary.combined.totalRelationships.toLocaleString()}${this.colors.reset} relationships (${summary.combined.activeTypes} types across ${summary.combined.activeCategories} categories)`
    );
    console.log();

    if (summary.canonicalGraph.available) {
      this.printSection('Canonical @ttsc/graph Edge Kinds');
      const sortedKinds = Object.entries(summary.canonicalGraph.byKind).sort((a, b) => b[1] - a[1]);
      for (const [kind, count] of sortedKinds) {
        const pct =
          summary.canonicalGraph.edges > 0
            ? Math.round((count / summary.canonicalGraph.edges) * 1000) / 10
            : 0;
        const bar = this.createProgressBar(pct, 20);
        console.log(
          `  ${this.colors.green}✓${this.colors.reset} ${kind.padEnd(18)} ${bar} ${this.colors.cyan}${count.toLocaleString().padStart(7)}${this.colors.reset} (${pct}%)`
        );
      }
      console.log();
    }

    this.printSection('Combined Relationships by Category');
    const sortedCategories = Object.entries(summary.combined.byCategory).sort(
      (a, b) => b[1] - a[1]
    );
    for (const [category, count] of sortedCategories) {
      const pct =
        summary.combined.totalRelationships > 0
          ? Math.round((count / summary.combined.totalRelationships) * 1000) / 10
          : 0;
      const bar = this.createProgressBar(pct, 20);
      console.log(
        `  ${this.colors.green}✓${this.colors.reset} ${category.padEnd(18)} ${bar} ${this.colors.cyan}${count.toLocaleString().padStart(7)}${this.colors.reset} (${pct}%)`
      );
    }
    console.log();

    if (detailed) {
      this.printSection('Detailed Breakdown by Relationship Type');
      for (const item of summary.combined.byType) {
        const badge =
          item.plane === 'canonical-graph'
            ? `${this.colors.green}[ttsc/graph]${this.colors.reset}`
            : `${this.colors.blue}[enrichment]${this.colors.reset}`;
        console.log(
          `  ${badge} ${item.type.padEnd(26)} ${this.colors.dim}(${item.category})${this.colors.reset} ${this.colors.cyan}${item.count.toLocaleString()}${this.colors.reset}`
        );
      }
      console.log();
    } else {
      this.printSection('Quick Tips');
      console.log(
        `  ${this.colors.blue}ℹ${this.colors.reset} Run ${this.colors.cyan}tsdoc-edge relationship-stats --detailed${this.colors.reset} for full per-type breakdown`
      );
      console.log(
        `  ${this.colors.blue}ℹ${this.colors.reset} Run ${this.colors.cyan}tsdoc-edge relationship query <symbol>${this.colors.reset} to inspect symbol edges`
      );
      console.log();
    }
  }

  private createProgressBar(percentage: number, width: number): string {
    const filled = Math.min(width, Math.max(0, Math.round((percentage / 100) * width)));
    const empty = width - filled;
    return `${this.colors.green}${'█'.repeat(filled)}${this.colors.dim}${'░'.repeat(empty)}${this.colors.reset}`;
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

interface RelationshipStatsSummary {
  canonicalGraph: {
    available: boolean;
    activeRevisionId?: string;
    nodes: number;
    edges: number;
    byKind: Record<string, number>;
    byCategory: Record<string, number>;
  };
  enrichmentDb: {
    available: boolean;
    symbols: number;
    totalRelationships: number;
    explicit: number;
    inferred: number;
    byCategory: Record<string, number>;
    byType: Array<{ type: string; category: string; count: number }>;
  };
  combined: {
    totalRelationships: number;
    canonicalEdges: number;
    enrichmentRelationships: number;
    activeCategories: number;
    activeTypes: number;
    byCategory: Record<string, number>;
    byType: Array<{
      type: string;
      category: string;
      count: number;
      plane: 'canonical-graph' | 'enrichment-db';
    }>;
  };
}
