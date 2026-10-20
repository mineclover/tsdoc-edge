/**
 * Visualize dependencies command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DependencyChainAnalyzer } from '../analyzer/DependencyChainAnalyzer';
import { ConfigManager } from '../config/ConfigManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';
import { MermaidGenerator } from '../visualization/MermaidGenerator';
import { BaseCommand, type CommandResult } from './BaseCommand';

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
    return `tsdoc-edge visualize <subcommand> [symbol] [options]

  Subcommands:
    tree <symbol>        Dependency tree for a symbol
    hotspots             Top hotspots diagram
    circular [index]     Circular dependency diagram
    hierarchy <class>    Class hierarchy diagram
    modules [max]        Module dependency diagram

  Options:
    --human              Output in human-readable format (default: XML)`;
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

      const isHuman = this.hasFlag(args, '--human');
      // The --human flag is not a subcommand or a target
      const positionalArgs = args.filter((arg) => arg !== '--human');
      const subcommand = positionalArgs[0] || 'help';
      const targetSymbol = positionalArgs[1];

      if (isHuman) {
        this.printHeader('TSDoc Edge - Dependency Visualization');
      }

      const config = ConfigManager.getInstance();
      const diagramsDir = config.get().paths?.diagramsDir || '.tsdoc/diagrams';

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Load graph from database
      if (isHuman) this.printInfo('Loading dependency graph...');
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

      if (isHuman) console.log();

      switch (subcommand) {
        case 'tree': {
          if (!targetSymbol) {
            this.printError('Symbol ID required: visualize tree <symbol-id>');
            return this.failure('Missing symbol ID');
          }

          // Resolve symbol name to ID if needed
          let resolvedSymbol = targetSymbol;
          const resolved = this.resolveSymbol(dbManager, targetSymbol, { quiet: !isHuman });
          if (resolved) {
            resolvedSymbol = resolved.id;
          } else if (!graph.symbols.has(targetSymbol)) {
            this.printError(`Symbol not found: ${targetSymbol}`);
            dbManager.close();
            return this.failure('Symbol not found');
          }

          if (isHuman) this.printSection(`Dependency Tree: ${resolvedSymbol}`);
          const diagram = generator.generateDependencyTree(resolvedSymbol);
          this.saveDiagram({
            diagram,
            outputPath: path.join(process.cwd(), diagramsDir, `tree-${resolvedSymbol}.mmd`),
            subcommand,
            target: resolvedSymbol,
            isHuman,
            args,
          });
          break;
        }

        case 'hotspots': {
          if (isHuman) this.printSection('Hotspot Diagram');
          const analyzer = new DependencyChainAnalyzer(graph);
          const hotspots = analyzer.analyzeHotspots(10);
          const diagram = generator.generateHotspotDiagram(hotspots);
          this.saveDiagram({
            diagram,
            outputPath: path.join(process.cwd(), diagramsDir, 'hotspots.mmd'),
            subcommand,
            isHuman,
            args,
          });
          break;
        }

        case 'circular': {
          if (isHuman) this.printSection('Circular Dependencies');
          const analyzer = new DependencyChainAnalyzer(graph);
          const circulars = analyzer.detectCircularDependencies();

          if (circulars.length === 0) {
            if (isHuman) {
              this.printSuccess('No circular dependencies found!');
            } else {
              this.printOutput(
                'dependency-visualization',
                { summary: { subcommand, circularCount: 0 } },
                args
              );
            }
          } else {
            const circularIndex = targetSymbol ? parseInt(targetSymbol, 10) - 1 : 0;
            if (circularIndex >= circulars.length) {
              this.printError(`Circular dependency #${circularIndex + 1} not found`);
              return this.failure('Invalid circular index');
            }

            const circular = circulars[circularIndex];
            const diagram = generator.generateCircularDiagram(circular);
            this.saveDiagram({
              diagram,
              outputPath: path.join(
                process.cwd(),
                diagramsDir,
                `circular-${circularIndex + 1}.mmd`
              ),
              subcommand,
              target: String(circularIndex + 1),
              extra: { circularCount: circulars.length },
              isHuman,
              args,
            });
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
          const resolvedHierarchy = this.resolveSymbol(dbManager, targetSymbol, {
            quiet: !isHuman,
          });
          if (resolvedHierarchy) {
            resolvedClass = resolvedHierarchy.id;
          } else if (!graph.symbols.has(targetSymbol)) {
            this.printError(`Symbol not found: ${targetSymbol}`);
            dbManager.close();
            return this.failure('Symbol not found');
          }

          if (isHuman) this.printSection(`Class Hierarchy: ${resolvedClass}`);
          const diagram = generator.generateClassHierarchy(resolvedClass);
          this.saveDiagram({
            diagram,
            outputPath: path.join(process.cwd(), diagramsDir, `hierarchy-${resolvedClass}.mmd`),
            subcommand,
            target: resolvedClass,
            isHuman,
            args,
          });
          break;
        }

        case 'modules': {
          if (isHuman) this.printSection('Module Dependencies');
          const maxFiles = targetSymbol ? parseInt(targetSymbol, 10) : 10;
          const diagram = generator.generateModuleDiagram(maxFiles);
          this.saveDiagram({
            diagram,
            outputPath: path.join(process.cwd(), diagramsDir, 'modules.mmd'),
            subcommand,
            target: String(maxFiles),
            isHuman,
            args,
          });
          break;
        }
        default: {
          if (isHuman) {
            this.printSection('Available Visualizations');
            console.log('  visualize tree <symbol-id>       - Dependency tree for a symbol');
            console.log('  visualize hotspots               - Top hotspots diagram');
            console.log('  visualize circular [index]       - Circular dependency diagram');
            console.log('  visualize hierarchy <class-id>   - Class hierarchy diagram');
            console.log('  visualize modules [max]          - Module dependency diagram');
            console.log();
            console.log(`All diagrams are saved to ${diagramsDir}/`);
            console.log();
          } else {
            this.printOutput(
              'available-visualizations',
              {
                summary: { diagramsDir },
                visualizations: [
                  {
                    command: 'visualize tree <symbol-id>',
                    description: 'Dependency tree for a symbol',
                  },
                  { command: 'visualize hotspots', description: 'Top hotspots diagram' },
                  {
                    command: 'visualize circular [index]',
                    description: 'Circular dependency diagram',
                  },
                  {
                    command: 'visualize hierarchy <class-id>',
                    description: 'Class hierarchy diagram',
                  },
                  { command: 'visualize modules [max]', description: 'Module dependency diagram' },
                ],
              },
              args
            );
          }
          break;
        }
      }

      dbManager.close();

      return this.success('Visualization complete');
    });
  }

  /**
   * Save a generated diagram under the diagrams directory and report it.
   * Human mode prints the diagram and the saved path; the default mode prints an XML document
   * carrying the diagram text. The file is written in both modes.
   */
  private saveDiagram(options: {
    diagram: string;
    outputPath: string;
    subcommand: string;
    target?: string;
    extra?: Record<string, unknown>;
    isHuman: boolean;
    args: string[];
  }): void {
    const { diagram, outputPath, subcommand, target, extra, isHuman, args } = options;

    if (isHuman) {
      console.log();
      console.log(diagram);
      console.log();
    }

    // Save to file
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, diagram, 'utf-8');

    if (isHuman) {
      this.printSuccess(`Saved to ${outputPath}`);
      return;
    }

    this.printOutput(
      'dependency-visualization',
      {
        summary: {
          subcommand,
          ...(target !== undefined ? { target } : {}),
          ...extra,
          outputPath: path.relative(process.cwd(), outputPath),
        },
        diagram: { format: 'mermaid', code: diagram },
      },
      args
    );
  }
}
