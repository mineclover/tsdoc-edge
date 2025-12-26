/**
 * System Status Command - Comprehensive system overview
 * @packageDocumentation
 *
 * @responsibility Show complete system status in one view
 * @problem Users need to run multiple commands to understand system state
 * @solves Single command providing comprehensive system overview
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command for displaying comprehensive system status
 *
 * Shows all important metrics in one view:
 * - Symbol statistics
 * - Relationship statistics
 * - Document statistics
 * - Validation status
 * - System health
 *
 * @doc [[SystemStatusCommand]]
 * @public
 */
export class SystemStatusCommand extends BaseCommand {
  getName(): string {
    return 'system-status';
  }

  getAlias(): string[] {
    return ['status', 'ss'];
  }

  getDescription(): string {
    return 'Show comprehensive system status and health overview';
  }

  protected getUsage(): string {
    return `tsdoc-edge system-status [options]

Options:
  --json    Output as JSON
  --compact Compact single-line output`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const jsonOutput = args.includes('--json');
      const compact = args.includes('--compact');

      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbManager = new DatabaseManager(this.getDatabasePath());

      try {
        const status = this.gatherSystemStatus(dbManager);

        if (jsonOutput) {
          console.log(JSON.stringify(status, null, 2));
        } else if (compact) {
          this.outputCompact(status);
        } else {
          this.outputFull(status);
        }

        return this.success();
      } finally {
        dbManager.close();
      }
    });
  }

  private gatherSystemStatus(dbManager: DatabaseManager): SystemStatus {
    // Symbol stats
    const symbolStats = this.getSymbolStats(dbManager);

    // Relationship stats
    const relationshipStats = this.getRelationshipStats(dbManager);

    // Document stats
    const documentStats = this.getDocumentStats();

    // Validation status
    const validationStatus = this.getValidationStatus();

    // System health
    const health = this.calculateHealth(symbolStats, relationshipStats, documentStats);

    return {
      timestamp: new Date().toISOString(),
      symbols: symbolStats,
      relationships: relationshipStats,
      documents: documentStats,
      validation: validationStatus,
      health,
    };
  }

  private getSymbolStats(dbManager: DatabaseManager): SymbolStats {
    const totalQuery = 'SELECT COUNT(*) as count FROM symbols';
    const total = (dbManager.db.prepare(totalQuery).get() as { count: number }).count;

    const documentedQuery = "SELECT COUNT(*) as count FROM symbols WHERE summary IS NOT NULL AND summary != ''";
    const documented = (dbManager.db.prepare(documentedQuery).get() as { count: number }).count;

    const byTypeQuery = 'SELECT type, COUNT(*) as count FROM symbols GROUP BY type ORDER BY count DESC';
    const byType: Record<string, number> = {};
    for (const row of dbManager.db.prepare(byTypeQuery).all() as { type: string; count: number }[]) {
      byType[row.type] = row.count;
    }

    return {
      total,
      documented,
      undocumented: total - documented,
      coverage: total > 0 ? Math.round((documented / total) * 1000) / 10 : 0,
      byType,
    };
  }

  private getRelationshipStats(dbManager: DatabaseManager): RelationshipStats {
    const totalQuery = 'SELECT COUNT(*) as count FROM unified_relationships';
    const total = (dbManager.db.prepare(totalQuery).get() as { count: number }).count;

    const byTypeQuery = 'SELECT type, COUNT(*) as count FROM unified_relationships GROUP BY type ORDER BY count DESC';
    const byType: Record<string, number> = {};
    for (const row of dbManager.db.prepare(byTypeQuery).all() as { type: string; count: number }[]) {
      byType[row.type] = row.count;
    }

    const byCategoryQuery = 'SELECT category, COUNT(*) as count FROM unified_relationships GROUP BY category ORDER BY count DESC';
    const byCategory: Record<string, number> = {};
    for (const row of dbManager.db.prepare(byCategoryQuery).all() as { category: string; count: number }[]) {
      byCategory[row.category] = row.count;
    }

    const symbolCount = (dbManager.db.prepare('SELECT COUNT(*) as count FROM symbols').get() as { count: number }).count;
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

  private getValidationStatus(): ValidationStatus {
    // Check for common issues
    const issues: string[] = [];

    const dbPath = this.getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      issues.push('Database not found');
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
    documents: DocumentStats
  ): HealthStatus {
    let score = 100;
    const factors: string[] = [];

    // Documentation coverage
    if (symbols.coverage < 50) {
      score -= 20;
      factors.push(`Low doc coverage (${symbols.coverage}%)`);
    } else if (symbols.coverage < 75) {
      score -= 10;
      factors.push(`Medium doc coverage (${symbols.coverage}%)`);
    }

    // Relationship density
    if (relationships.density < 5) {
      score -= 15;
      factors.push(`Low relationship density (${relationships.density})`);
    }

    // Document symbols
    if (documents.coverage < 80) {
      score -= 10;
      factors.push(`Document symbol coverage (${documents.coverage}%)`);
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
    const { symbols, relationships, documents, health } = status;
    console.log(
      `${colors.bold}TSDoc Edge${colors.reset} | ` +
      `Symbols: ${colors.cyan}${symbols.total.toLocaleString()}${colors.reset} | ` +
      `Relationships: ${colors.cyan}${relationships.total.toLocaleString()}${colors.reset} | ` +
      `Types: ${colors.cyan}${relationships.types}${colors.reset} | ` +
      `Docs: ${colors.cyan}${documents.total}${colors.reset} | ` +
      `Health: ${this.colorGrade(health.grade)}`
    );
  }

  private outputFull(status: SystemStatus): void {
    const { symbols, relationships, documents, health } = status;

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

    // Quick Stats
    this.printSection('Quick Stats');
    console.log(`  Symbols:        ${colors.cyan}${symbols.total.toLocaleString()}${colors.reset}`);
    console.log(`  Relationships:  ${colors.cyan}${relationships.total.toLocaleString()}${colors.reset}`);
    console.log(`  Types:          ${colors.cyan}${relationships.types}${colors.reset} (${relationships.categories} categories)`);
    console.log(`  Documents:      ${colors.cyan}${documents.total}${colors.reset}`);
    console.log(`  Graph Density:  ${colors.cyan}${relationships.density}${colors.reset} rels/symbol`);
    console.log();

    // Symbol Distribution
    this.printSection('Symbol Distribution');
    console.log(`  Documented:     ${colors.green}${symbols.documented.toLocaleString()}${colors.reset} (${symbols.coverage}%)`);
    console.log(`  Undocumented:   ${colors.yellow}${symbols.undocumented.toLocaleString()}${colors.reset}`);
    const topTypes = Object.entries(symbols.byType).slice(0, 5);
    if (topTypes.length > 0) {
      console.log(`  Top types:`);
      for (const [type, count] of topTypes) {
        const pct = Math.round((count / symbols.total) * 1000) / 10;
        console.log(`    ${type}: ${colors.cyan}${count.toLocaleString()}${colors.reset} (${pct}%)`);
      }
    }
    console.log();

    // Relationship Distribution
    this.printSection('Relationship Distribution');
    const topCategories = Object.entries(relationships.byCategory).slice(0, 5);
    for (const [category, count] of topCategories) {
      const pct = Math.round((count / relationships.total) * 1000) / 10;
      const bar = this.progressBar(pct, 20);
      console.log(`  ${category.padEnd(15)} ${bar} ${colors.cyan}${count.toLocaleString()}${colors.reset} (${pct}%)`);
    }
    console.log();

    // Document Status
    this.printSection('Document Status');
    console.log(`  Total docs:     ${colors.cyan}${documents.total}${colors.reset}`);
    console.log(`  With [[Symbol]]: ${colors.green}${documents.withSymbols}${colors.reset} (${documents.coverage}%)`);
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
    console.log(`  ${colors.dim}tsdoc-edge wc <file>${colors.reset}     Work context for a file`);
    console.log(`  ${colors.dim}tsdoc-edge health <path>${colors.reset}  Health report`);
    console.log(`  ${colors.dim}tsdoc-edge validate-docs${colors.reset}  Validate documents`);
  }

  private colorGrade(grade: string): string {
    switch (grade) {
      case 'A': return `${colors.green}${colors.bold}${grade}${colors.reset}`;
      case 'B': return `${colors.green}${grade}${colors.reset}`;
      case 'C': return `${colors.yellow}${grade}${colors.reset}`;
      case 'D': return `${colors.yellow}${grade}${colors.reset}`;
      default: return `${colors.red}${grade}${colors.reset}`;
    }
  }

  private progressBar(percentage: number, width: number): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `${colors.green}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset}`;
  }
}

interface SymbolStats {
  total: number;
  documented: number;
  undocumented: number;
  coverage: number;
  byType: Record<string, number>;
}

interface RelationshipStats {
  total: number;
  types: number;
  categories: number;
  density: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

interface DocumentStats {
  total: number;
  withSymbols: number;
  coverage: number;
}

interface ValidationStatus {
  errors: number;
  warnings: number;
  issues: string[];
}

interface HealthStatus {
  score: number;
  grade: string;
  factors: string[];
}

interface SystemStatus {
  timestamp: string;
  symbols: SymbolStats;
  relationships: RelationshipStats;
  documents: DocumentStats;
  validation: ValidationStatus;
  health: HealthStatus;
}
