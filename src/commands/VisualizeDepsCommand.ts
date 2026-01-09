/**
 * Visualize dependencies command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { MermaidGenerator } from '../visualization/MermaidGenerator';
import { DependencyChainAnalyzer } from '../analyzer/DependencyChainAnalyzer';
import { ConfigManager } from '../config/ConfigManager';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for visualizing dependencies with Mermaid diagrams
 * @doc [[VisualizeDepsCommand]]
 * @public
 */
export class VisualizeDepsCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'visualize';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Generate Mermaid diagrams for dependency visualization';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge visualize <subcommand> [symbol]

  Subcommands:
    tree <symbol>        Dependency tree for a symbol
    hotspots             Top hotspots diagram
    circular [index]     Circular dependency diagram
    hierarchy <class>    Class hierarchy diagram
    modules [max]        Module dependency diagram`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const subcommand = args[0] || 'help';
      const targetSymbol = args[1];

      this.printHeader('TSDoc Edge - Dependency Visualization');

      const config = ConfigManager.getInstance();
      const diagramsDir = config.get().paths?.diagramsDir || '.tsdoc/diagrams';

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Load graph from database
      this.printInfo('Loading dependency graph...');
      const graphBuilder = new SymbolGraphBuilder();
      const { symbols: symbolRows, dependencies: depRows } = dbManager.getGraphData();

      for (const row of symbolRows) {
        graphBuilder.addSymbol({
          id: row.id,
          name: row.name,
          type: row.type as SymbolType,
          filePath: row.file_path,
          line: row.line,
          column: row.column,
          isExported: Boolean(row.is_exported),
          isPublic: Boolean(row.is_public),
          summary: row.summary ?? undefined,
          tests: [],
          designDecisions: [],
          metadata: {},
        });
      }

      for (const rel of depRows) {
        graphBuilder.addRelationship({
          from: rel.symbol_id,
          to: rel.target,
          type: (rel.type || 'dependsOn') as SymbolRelationship['type'],
          filePath: rel.import_path || '',
        });
      }

      const graph = graphBuilder.getGraph();
      const generator = new MermaidGenerator(graph);

      console.log();

      switch (subcommand) {
        case 'tree': {
          if (!targetSymbol) {
            this.printError('Symbol ID required: visualize tree <symbol-id>');
            return this.failure('Missing symbol ID');
          }

          // Resolve symbol name to ID if needed
          let resolvedSymbol = targetSymbol;
          const resolved = this.resolveSymbol(dbManager, targetSymbol);
          if (resolved) {
            resolvedSymbol = resolved.id;
          } else if (!graph.symbols.has(targetSymbol)) {
            this.printError(`Symbol not found: ${targetSymbol}`);
            dbManager.close();
            return this.failure('Symbol not found');
          }

          this.printSection(`Dependency Tree: ${resolvedSymbol}`);
          const diagram = generator.generateDependencyTree(resolvedSymbol);
          console.log();
          console.log(diagram);
          console.log();

          // Save to file
          const outputPath = path.join(process.cwd(), diagramsDir, `tree-${resolvedSymbol}.mmd`);
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, diagram, 'utf-8');

          this.printSuccess(`Saved to ${outputPath}`);
          break;
        }

        case 'hotspots': {
          this.printSection('Hotspot Diagram');
          const analyzer = new DependencyChainAnalyzer(graph);
          const hotspots = analyzer.analyzeHotspots(10);
          const diagram = generator.generateHotspotDiagram(hotspots);
          console.log();
          console.log(diagram);
          console.log();

          // Save to file
          const outputPath = path.join(process.cwd(), diagramsDir, 'hotspots.mmd');
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, diagram, 'utf-8');

          this.printSuccess(`Saved to ${outputPath}`);
          break;
        }

        case 'circular': {
          this.printSection('Circular Dependencies');
          const analyzer = new DependencyChainAnalyzer(graph);
          const circulars = analyzer.detectCircularDependencies();

          if (circulars.length === 0) {
            this.printSuccess('No circular dependencies found!');
          } else {
            const circularIndex = targetSymbol ? parseInt(targetSymbol, 10) - 1 : 0;
            if (circularIndex >= circulars.length) {
              this.printError(`Circular dependency #${circularIndex + 1} not found`);
              return this.failure('Invalid circular index');
            }

            const circular = circulars[circularIndex];
            const diagram = generator.generateCircularDiagram(circular);
            console.log();
            console.log(diagram);
            console.log();

            // Save to file
            const outputPath = path.join(process.cwd(), diagramsDir, `circular-${circularIndex + 1}.mmd`);
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, diagram, 'utf-8');

            this.printSuccess(`Saved to ${outputPath}`);
          }
          break;
        }

        case 'hierarchy': {
          if (!targetSymbol) {
            this.printError('Class ID required: visualize hierarchy <class-id>');
            return this.failure('Missing class ID');
          }

          // Resolve symbol name to ID if needed
          let resolvedClass = targetSymbol;
          const resolvedHierarchy = this.resolveSymbol(dbManager, targetSymbol);
          if (resolvedHierarchy) {
            resolvedClass = resolvedHierarchy.id;
          } else if (!graph.symbols.has(targetSymbol)) {
            this.printError(`Symbol not found: ${targetSymbol}`);
            dbManager.close();
            return this.failure('Symbol not found');
          }

          this.printSection(`Class Hierarchy: ${resolvedClass}`);
          const diagram = generator.generateClassHierarchy(resolvedClass);
          console.log();
          console.log(diagram);
          console.log();

          // Save to file
          const outputPath = path.join(process.cwd(), diagramsDir, `hierarchy-${resolvedClass}.mmd`);
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, diagram, 'utf-8');

          this.printSuccess(`Saved to ${outputPath}`);
          break;
        }

        case 'modules': {
          this.printSection('Module Dependencies');
          const maxFiles = targetSymbol ? parseInt(targetSymbol, 10) : 10;
          const diagram = generator.generateModuleDiagram(maxFiles);
          console.log();
          console.log(diagram);
          console.log();

          // Save to file
          const outputPath = path.join(process.cwd(), diagramsDir, 'modules.mmd');
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, diagram, 'utf-8');

          this.printSuccess(`Saved to ${outputPath}`);
          break;
        }

        case 'help':
        default: {
          this.printSection('Available Visualizations');
          console.log('  visualize tree <symbol-id>       - Dependency tree for a symbol');
          console.log('  visualize hotspots               - Top hotspots diagram');
          console.log('  visualize circular [index]       - Circular dependency diagram');
          console.log('  visualize hierarchy <class-id>   - Class hierarchy diagram');
          console.log('  visualize modules [max]          - Module dependency diagram');
          console.log();
          console.log(`All diagrams are saved to ${diagramsDir}/`);
          console.log();
          break;
        }
      }

      dbManager.close();

      return this.success('Visualization complete');
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
