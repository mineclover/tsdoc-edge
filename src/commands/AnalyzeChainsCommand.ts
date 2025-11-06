/**
 * Analyze dependency chains command
 * @packageDocumentation
 */

import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { DependencyChainAnalyzer } from '../analyzer/DependencyChainAnalyzer';

/**
 * Command for analyzing dependency chains
 * @public
 */
export class AnalyzeChainsCommand extends BaseCommand {
  getName(): string {
    return 'analyze-chains';
  }

  getDescription(): string {
    return 'Analyze dependency chains, detect circular dependencies, and identify hotspots';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      this.printHeader('TSDoc Edge - Dependency Chain Analysis');

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const dbManager = new DatabaseManager(dbPath);

      // Load graph from database
      this.printInfo('Loading dependency graph...');
      const graphBuilder = new SymbolGraphBuilder();

      const symbolsQuery = dbManager.db.prepare('SELECT * FROM symbols').all() as any[];
      const relsQuery = dbManager.db.prepare('SELECT * FROM dependencies').all() as any[];

      for (const row of symbolsQuery) {
        graphBuilder.addSymbol({
          id: row.id,
          name: row.name,
          type: row.type,
          filePath: row.file_path,
          line: row.line,
          column: row.column,
          isExported: Boolean(row.is_exported),
          isPublic: Boolean(row.is_public),
          summary: row.summary,
          tests: [],
          designDecisions: [],
          metadata: {},
        });
      }

      for (const rel of relsQuery) {
        graphBuilder.addRelationship({
          from: rel.symbol_id,
          to: rel.target,
          type: rel.type || 'dependsOn',
          filePath: rel.import_path || '',
        });
      }

      const graph = graphBuilder.getGraph();
      const analyzer = new DependencyChainAnalyzer(graph);

      console.log();

      // Detect circular dependencies
      this.printSection('Circular Dependencies');
      const circulars = analyzer.detectCircularDependencies();

      if (circulars.length === 0) {
        this.printSuccess('No circular dependencies found! ✨');
      } else {
        this.printWarning(`Found ${circulars.length} circular dependencies:`);
        console.log();

        for (let i = 0; i < Math.min(circulars.length, 10); i++) {
          const circular = circulars[i];
          console.log(`  ${this.colors.yellow}${i + 1}.${this.colors.reset} Length: ${circular.length}`);
          console.log(`     Path: ${circular.path.join(' → ')}`);
          console.log();
        }

        if (circulars.length > 10) {
          console.log(`  ${this.colors.dim}... and ${circulars.length - 10} more${this.colors.reset}`);
          console.log();
        }
      }

      // Analyze hotspots
      this.printSection('Hotspot Analysis (Top 10)');
      const hotspots = analyzer.analyzeHotspots(10);

      console.log(`  ${'Symbol'.padEnd(40)} ${'Incoming'.padEnd(10)} ${'Outgoing'.padEnd(10)} ${'Score'.padEnd(8)} Rank`);
      console.log(`  ${'─'.repeat(40)} ${'─'.repeat(10)} ${'─'.repeat(10)} ${'─'.repeat(8)} ────`);

      for (const hotspot of hotspots) {
        const symbol = graph.symbols.get(hotspot.symbolId);
        const name = symbol?.name || hotspot.symbolId;
        const displayName = name.length > 38 ? name.substring(0, 35) + '...' : name;

        let rankColor = this.colors.reset;
        if (hotspot.rank === 'critical') rankColor = this.colors.red;
        else if (hotspot.rank === 'high') rankColor = this.colors.yellow;
        else if (hotspot.rank === 'medium') rankColor = this.colors.blue;

        console.log(
          `  ${displayName.padEnd(40)} ` +
          `${String(hotspot.incomingCount).padEnd(10)} ` +
          `${String(hotspot.outgoingCount).padEnd(10)} ` +
          `${String(hotspot.score).padEnd(8)} ` +
          `${rankColor}${hotspot.rank}${this.colors.reset}`
        );
      }

      console.log();

      // Statistics
      this.printSection('Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${graph.symbols.size}${this.colors.reset}`);
      console.log(`  Total relationships: ${this.colors.cyan}${relsQuery.length}${this.colors.reset}`);
      console.log(`  Circular dependencies: ${circulars.length > 0 ? this.colors.red : this.colors.green}${circulars.length}${this.colors.reset}`);
      console.log(`  Critical hotspots: ${this.colors.yellow}${hotspots.filter(h => h.rank === 'critical').length}${this.colors.reset}`);
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${graph.symbols.size} symbols`);
    });
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
