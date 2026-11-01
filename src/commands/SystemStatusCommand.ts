/**
 * System Status Command - Comprehensive 3-Layer SSOT system overview
 * @packageDocumentation
 *
 * @responsibility Show complete system status across Enrichment DB, Canonical `@ttsc/graph`, SpecGraph, and Managed Docs
 * @problem Users need to run multiple commands to understand system state
 * @solves Single command providing comprehensive 3-plane SSOT system overview
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import {
  type CanonicalGraphPlaneSnapshot,
  readCanonicalGraphSnapshot,
  readSpecGraphSnapshot,
  type SpecGraphPlaneSnapshot,
} from './canonicalReadHelper';

/**
 * Command for displaying comprehensive system status across all 3 SSOT planes.
 *
 * @doc [[SystemStatusCommand]]
 * @public
 */
export class SystemStatusCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'system-status';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['status', 'ss'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show comprehensive 3-layer SSOT system status and health overview';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge system-status [options]

Options:
  --json               Output as JSON
  --compact            Compact single-line output
  --include-external   Include external/stdlib nodes in canonical graph totals`;
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
        '--json',
        '--compact',
        '--include-external',
      ]);
      if (flagError) return flagError;

      const jsonOutput = this.hasFlag(args, '--json');
      const compact = this.hasFlag(args, '--compact');
      const includeExternal = this.hasFlag(args, '--include-external');

      const canonicalSnapshot = readCanonicalGraphSnapshot({ includeExternal });
      const specSnapshot = readSpecGraphSnapshot();
      const dbPath = this.getDatabasePath();
      const hasLegacyDb = fs.existsSync(dbPath);

      if (!hasLegacyDb && !canonicalSnapshot) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbManager = hasLegacyDb ? new DatabaseManager(dbPath) : null;

      try {
        const status = this.gatherSystemStatus(dbManager, canonicalSnapshot, specSnapshot);

        if (jsonOutput) {
          console.log(JSON.stringify(status, null, 2));
        } else if (compact) {
          this.outputCompact(status);
        } else {
          this.outputFull(status);
        }

        return this.success();
      } finally {
        dbManager?.close();
      }
    });
  }

  private gatherSystemStatus(
    dbManager: DatabaseManager | null,
    canonicalSnapshot: CanonicalGraphPlaneSnapshot | null,
    specSnapshot: SpecGraphPlaneSnapshot | null
  ): SystemStatus {
    const symbolStats = dbManager
      ? this.getSymbolStats(dbManager)
      : this.getFallbackSymbolStats(canonicalSnapshot);
    const relationshipStats = dbManager
      ? this.getRelationshipStats(dbManager)
      : { total: 0, types: 0, categories: 0, density: 0, byType: {}, byCategory: {} };
    const canonicalStats = this.toCanonicalStatus(canonicalSnapshot);
    const specStats = this.toSpecStatus(specSnapshot);
    const documentStats = this.getDocumentStats();
    const validationStatus = this.getValidationStatus(canonicalStats);
    const health = this.calculateHealth(
      symbolStats,
      relationshipStats,
      canonicalStats,
      documentStats
    );

    return {
      timestamp: new Date().toISOString(),
      symbols: symbolStats,
      relationships: relationshipStats,
      canonicalGraph: canonicalStats,
      specGraph: specStats,
      documents: documentStats,
      validation: validationStatus,
      health,
    };
  }

  private getFallbackSymbolStats(
    canonicalSnapshot: CanonicalGraphPlaneSnapshot | null
  ): SymbolStats {
    if (!canonicalSnapshot) {
      return {
        total: 0,
        documented: 0,
        undocumented: 0,
        coverage: 0,
        sourceTotal: 0,
        sourceDocumented: 0,
        sourceCoverage: 0,
        testTotal: 0,
        byType: {},
      };
    }

    const byType: Record<string, number> = {};
    for (const node of canonicalSnapshot.filteredNodes) {
      byType[node.kind] = (byType[node.kind] ?? 0) + 1;
    }
    const total = canonicalSnapshot.filteredNodes.length;
    return {
      total,
      documented: 0,
      undocumented: total,
      coverage: 0,
      sourceTotal: total,
      sourceDocumented: 0,
      sourceCoverage: 0,
      testTotal: 0,
      byType,
    };
  }

  private toCanonicalStatus(snapshot: CanonicalGraphPlaneSnapshot | null): CanonicalGraphStatus {
    if (!snapshot) {
      return {
        available: false,
        retainedRevisions: 0,
        internalNodes: 0,
        internalEdges: 0,
        totalNodes: 0,
        totalEdges: 0,
        density: 0,
      };
    }

    const density =
      snapshot.internalNodes > 0
        ? Math.round((snapshot.internalEdges / snapshot.internalNodes) * 100) / 100
        : 0;

    return {
      available: true,
      databasePath: snapshot.displayPath,
      sizeBytes: snapshot.sizeBytes,
      activeRevisionId: snapshot.activeRevisionId,
      retainedRevisions: snapshot.retainedRevisions,
      storedAt: snapshot.storedAt,
      internalNodes: snapshot.internalNodes,
      internalEdges: snapshot.internalEdges,
      totalNodes: snapshot.totalNodes,
      totalEdges: snapshot.totalEdges,
      density,
    };
  }

  private toSpecStatus(snapshot: SpecGraphPlaneSnapshot | null): SpecGraphStatus {
    if (!snapshot) {
      return {
        available: false,
        retainedRevisions: 0,
        nodes: 0,
        edges: 0,
        bindings: 0,
      };
    }

    return {
      available: true,
      databasePath: snapshot.displayPath,
      sizeBytes: snapshot.sizeBytes,
      activeRevisionId: snapshot.activeRevisionId,
      retainedRevisions: snapshot.retainedRevisions,
      storedAt: snapshot.storedAt,
      nodes: snapshot.nodeCount,
      edges: snapshot.edgeCount,
      bindings: snapshot.bindingCount,
    };
  }

  private getSymbolStats(dbManager: DatabaseManager): SymbolStats {
    const allSymbols = dbManager.getAllSymbolRows();

    const total = allSymbols.length;
    const documented = allSymbols.filter((s) => s.summary && s.summary.trim() !== '').length;
    const testTotal = allSymbols.filter(
      (s) => s.type === 'test-case' || s.type === 'test-suite'
    ).length;
    const sourceTotal = total - testTotal;
    const sourceDocumented = allSymbols.filter(
      (s) =>
        s.type !== 'test-case' && s.type !== 'test-suite' && s.summary && s.summary.trim() !== ''
    ).length;

    const byTypeData = dbManager.countSymbolsByType();
    const byType: Record<string, number> = {};
    for (const row of byTypeData) {
      byType[row.type] = row.count;
    }

    return {
      total,
      documented,
      undocumented: total - documented,
      coverage: total > 0 ? Math.round((documented / total) * 1000) / 10 : 0,
      sourceTotal,
      sourceDocumented,
      sourceCoverage:
        sourceTotal > 0 ? Math.round((sourceDocumented / sourceTotal) * 1000) / 10 : 0,
      testTotal,
      byType,
    };
  }

  private getRelationshipStats(dbManager: DatabaseManager): RelationshipStats {
    const total = dbManager.countRelationships();

    const byTypeData = dbManager.countRelationshipsByType();
    const byType: Record<string, number> = {};
    for (const row of byTypeData) {
      byType[row.type] = row.count;
    }

    const byCategoryData = dbManager.countRelationshipsByCategory();
    const byCategory: Record<string, number> = {};
    for (const row of byCategoryData) {
      byCategory[row.category] = row.count;
    }

    const symbolCount = dbManager.countSymbols();
    const density = symbolCount > 0 ? Math.round((total / symbolCount) * 100) / 100 : 0;

    return {
      total,
      types: Object.keys(byType).length,
      categories: Object.keys(byCategory).length,
      density,
      byType,
      byCategory,
    };
  }

  private getDocumentStats(): DocumentStats {
    const managedDir = path.resolve(process.cwd(), 'managed');
    let total = 0;
    let withSymbols = 0;

    if (fs.existsSync(managedDir)) {
      const files = this.findMarkdownFiles(managedDir);
      total = files.length;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (/^#\s+\[\[.+\]\]/m.test(content)) {
          withSymbols++;
        }
      }
    }

    return {
      total,
      withSymbols,
      coverage: total > 0 ? Math.round((withSymbols / total) * 1000) / 10 : 0,
    };
  }

  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private getValidationStatus(canonicalGraph: CanonicalGraphStatus): ValidationStatus {
    const issues: string[] = [];

    const dbPath = this.getDatabasePath();
    if (!fs.existsSync(dbPath) && !canonicalGraph.available) {
      issues.push('No symbol or canonical graph database found');
    }

    const configPath = path.resolve(process.cwd(), '.tsdoc.config.json');
    if (!fs.existsSync(configPath)) {
      issues.push('Config file not found');
    }

    return {
      errors: issues.length,
      warnings: 0,
      issues,
    };
  }

  private calculateHealth(
    symbols: SymbolStats,
    relationships: RelationshipStats,
    canonicalGraph: CanonicalGraphStatus,
    documents: DocumentStats
  ): HealthStatus {
    let score = 100;
    const factors: string[] = [];

    const effectiveDocCoverage =
      symbols.sourceTotal > 0 ? symbols.sourceCoverage : symbols.coverage;
    if (symbols.total > 0) {
      if (effectiveDocCoverage < 50) {
        score -= 20;
        factors.push(`Low source doc coverage (${effectiveDocCoverage}%)`);
      } else if (effectiveDocCoverage < 75) {
        score -= 10;
        factors.push(`Medium source doc coverage (${effectiveDocCoverage}%)`);
      }
    }

    if (canonicalGraph.available) {
      if (canonicalGraph.density < 1.0 && relationships.density < 1.0) {
        score -= 15;
        factors.push(`Low canonical graph density (${canonicalGraph.density})`);
      }
    } else {
      score -= 5;
      factors.push('Canonical @ttsc/graph not built (run tsdoc-edge sync)');
      if (relationships.density < 1.5) {
        score -= 10;
        factors.push(`Low relationship density (${relationships.density})`);
      }
    }

    if (documents.total > 0 && documents.coverage < 80) {
      score -= 10;
      factors.push(`Document [[Symbol]] coverage (${documents.coverage}%)`);
    }

    let grade: string;
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return { score, grade, factors };
  }

  private outputCompact(status: SystemStatus): void {
    const { symbols, relationships, canonicalGraph, specGraph, documents, health } = status;
    const canonicalSegment = canonicalGraph.available
      ? `Canonical: ${colors.cyan}${canonicalGraph.internalNodes.toLocaleString()}${colors.reset}/${colors.cyan}${canonicalGraph.internalEdges.toLocaleString()}${colors.reset} | `
      : '';
    const specSegment = specGraph.available
      ? `Specs: ${colors.cyan}${specGraph.nodes}${colors.reset} (${specGraph.bindings} bindings) | `
      : '';
    console.log(
      `${colors.bold}TSDoc Edge${colors.reset} | ` +
        `Symbols: ${colors.cyan}${symbols.total.toLocaleString()}${colors.reset} | ` +
        canonicalSegment +
        `Enrichment Rels: ${colors.cyan}${relationships.total.toLocaleString()}${colors.reset} | ` +
        specSegment +
        `Docs: ${colors.cyan}${documents.total}${colors.reset} | ` +
        `Health: ${this.colorGrade(health.grade)} (${health.score}/100)`
    );
  }

  private outputFull(status: SystemStatus): void {
    const { symbols, relationships, canonicalGraph, specGraph, documents, health } = status;

    this.printHeader('TSDoc Edge - System Status');
    console.log(`${colors.dim}Generated: ${status.timestamp}${colors.reset}`);
    console.log();

    // Health Overview
    this.printSection(`Health: ${this.colorGrade(health.grade)} (${health.score}/100)`);
    if (health.factors.length > 0) {
      for (const factor of health.factors) {
        console.log(`  ${colors.yellow}•${colors.reset} ${factor}`);
      }
    } else {
      console.log(`  ${colors.green}✓${colors.reset} All health checks passed`);
    }
    console.log();

    // 3-Layer SSOT Planes
    this.printSection('SSOT Planes');
    if (canonicalGraph.available) {
      const sizeMB = ((canonicalGraph.sizeBytes ?? 0) / (1024 * 1024)).toFixed(1);
      const revShort = (canonicalGraph.activeRevisionId ?? '').slice(0, 12);
      console.log(
        `  Canonical @ttsc/graph: ${colors.green}active${colors.reset} (${revShort}…, ${canonicalGraph.retainedRevisions} retained, ${sizeMB} MB)`
      );
      console.log(
        `    Internal Graph:      ${colors.cyan}${canonicalGraph.internalNodes.toLocaleString()}${colors.reset} nodes / ${colors.cyan}${canonicalGraph.internalEdges.toLocaleString()}${colors.reset} edges (${canonicalGraph.density} edges/node)`
      );
      console.log(
        `    Total (w/ external): ${colors.dim}${canonicalGraph.totalNodes.toLocaleString()} nodes / ${canonicalGraph.totalEdges.toLocaleString()} edges${colors.reset}`
      );
    } else {
      console.log(
        `  Canonical @ttsc/graph: ${colors.yellow}not built${colors.reset} (run ${colors.cyan}tsdoc-edge sync${colors.reset})`
      );
    }

    if (specGraph.available) {
      const revShort = (specGraph.activeRevisionId ?? '').slice(0, 12);
      console.log(
        `  SpecGraph:             ${colors.green}active${colors.reset} (${revShort}…, ${specGraph.nodes} spec nodes, ${specGraph.bindings} bindings)`
      );
    } else {
      console.log(`  SpecGraph:             ${colors.dim}not compiled${colors.reset}`);
    }

    console.log(
      `  Enrichment Symbol DB:  ${colors.cyan}${symbols.total.toLocaleString()}${colors.reset} symbols / ${colors.cyan}${relationships.total.toLocaleString()}${colors.reset} domain+test relationships`
    );
    console.log();

    // Symbol Distribution
    this.printSection('Symbol Distribution');
    if (symbols.total > 0) {
      console.log(
        `  ${colors.bold}Overall:${colors.reset}        ${colors.green}${symbols.documented.toLocaleString()}${colors.reset} / ${symbols.total.toLocaleString()} (${symbols.coverage}%)`
      );
      console.log(
        `  ${colors.bold}Source Code:${colors.reset}    ${colors.green}${symbols.sourceDocumented.toLocaleString()}${colors.reset} / ${symbols.sourceTotal.toLocaleString()} (${symbols.sourceCoverage}%)`
      );
      console.log(
        `  ${colors.dim}Test Symbols:   ${symbols.testTotal.toLocaleString()} (${Math.round((symbols.testTotal / symbols.total) * 1000) / 10}% of total)${colors.reset}`
      );
      const topTypes = Object.entries(symbols.byType).slice(0, 5);
      if (topTypes.length > 0) {
        console.log(`  Top types:`);
        for (const [type, count] of topTypes) {
          const pct = Math.round((count / symbols.total) * 1000) / 10;
          console.log(
            `    ${type}: ${colors.cyan}${count.toLocaleString()}${colors.reset} (${pct}%)`
          );
        }
      }
    } else {
      console.log(`  ${colors.dim}No symbols indexed${colors.reset}`);
    }
    console.log();

    // Enrichment Relationship Distribution
    if (relationships.total > 0) {
      this.printSection('Domain & Test Relationship Distribution');
      const topCategories = Object.entries(relationships.byCategory).slice(0, 5);
      for (const [category, count] of topCategories) {
        const pct = Math.round((count / relationships.total) * 1000) / 10;
        const bar = this.progressBar(pct, 20);
        console.log(
          `  ${category.padEnd(15)} ${bar} ${colors.cyan}${count.toLocaleString()}${colors.reset} (${pct}%)`
        );
      }
      console.log();
    }

    // Document Status
    this.printSection('Document Status');
    console.log(`  Total docs:      ${colors.cyan}${documents.total}${colors.reset}`);
    console.log(
      `  With [[Symbol]]: ${colors.green}${documents.withSymbols}${colors.reset} (${documents.coverage}%)`
    );
    console.log();

    // Validation
    if (status.validation.errors > 0 || status.validation.issues.length > 0) {
      this.printSection('Validation Issues');
      for (const issue of status.validation.issues) {
        console.log(`  ${colors.red}✗${colors.reset} ${issue}`);
      }
      console.log();
    }

    // Quick Commands
    this.printSection('Quick Commands');
    console.log(
      `  ${colors.dim}tsdoc-edge sync${colors.reset}                             Sync symbol DB, canonical graph, specs, and backlinks`
    );
    console.log(
      `  ${colors.dim}tsdoc-edge wc <file> --llm${colors.reset}                  Full work context before editing a file`
    );
    console.log(
      `  ${colors.dim}tsdoc-edge dc <file>${colors.reset}                        Normative specs, contracts, and ADRs`
    );
    console.log(
      `  ${colors.dim}tsdoc-edge convention check --pack <file>${colors.reset}   Check revision-pinned conventions`
    );
  }

  private colorGrade(grade: string): string {
    switch (grade) {
      case 'A':
        return `${colors.green}${colors.bold}${grade}${colors.reset}`;
      case 'B':
        return `${colors.green}${grade}${colors.reset}`;
      case 'C':
        return `${colors.yellow}${grade}${colors.reset}`;
      case 'D':
        return `${colors.yellow}${grade}${colors.reset}`;
      default:
        return `${colors.red}${grade}${colors.reset}`;
    }
  }

  private progressBar(percentage: number, width: number): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `${colors.green}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset}`;
  }
}

/** Symbol statistics for system status */
interface SymbolStats {
  total: number;
  documented: number;
  undocumented: number;
  coverage: number;
  sourceTotal: number;
  sourceDocumented: number;
  sourceCoverage: number;
  testTotal: number;
  byType: Record<string, number>;
}

/** Relationship statistics for system status */
interface RelationshipStats {
  total: number;
  types: number;
  categories: number;
  density: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

/** Canonical `@ttsc/graph` status */
interface CanonicalGraphStatus {
  available: boolean;
  databasePath?: string;
  sizeBytes?: number;
  activeRevisionId?: string;
  retainedRevisions: number;
  storedAt?: string;
  internalNodes: number;
  internalEdges: number;
  totalNodes: number;
  totalEdges: number;
  density: number;
}

/** SpecGraph projection status */
interface SpecGraphStatus {
  available: boolean;
  databasePath?: string;
  sizeBytes?: number;
  activeRevisionId?: string;
  retainedRevisions: number;
  storedAt?: string;
  nodes: number;
  edges: number;
  bindings: number;
}

/** Document statistics for system status */
interface DocumentStats {
  total: number;
  withSymbols: number;
  coverage: number;
}

/** Validation status for system status */
interface ValidationStatus {
  errors: number;
  warnings: number;
  issues: string[];
}

/** Health status for system status */
interface HealthStatus {
  score: number;
  grade: string;
  factors: string[];
}

/** Complete system status */
interface SystemStatus {
  timestamp: string;
  symbols: SymbolStats;
  relationships: RelationshipStats;
  canonicalGraph: CanonicalGraphStatus;
  specGraph: SpecGraphStatus;
  documents: DocumentStats;
  validation: ValidationStatus;
  health: HealthStatus;
}
