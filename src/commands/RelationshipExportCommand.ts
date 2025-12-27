/**
 * Relationship Export Command
 *
 * @doc [[Gephi Export]]
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager, type UnifiedRelationshipRow } from '../storage/DatabaseManager';

/** Supported export formats for relationship data */
type ExportFormat = 'json' | 'graphml' | 'dot' | 'csv' | 'cypher' | 'gephi';

/**
 * Command for exporting relationships to various formats
 * @public
 */
export class RelationshipExportCommand extends BaseCommand {
  getName(): string {
    return 'relationship-export';
  }

  getDescription(): string {
    return 'Export relationships to various formats (JSON, GraphML, DOT, CSV, Cypher, Gephi)';
  }

  protected getUsage(): string {
    return `tsdoc-edge relationship-export [options]

Export relationships to various formats for analysis with external tools.

Options:
  --format <format>     Output format: json, graphml, dot, csv, cypher, gephi (default: json)
  --output <file>       Output file path (default: stdout)
  --category <cat>      Filter by category
  --type <type>         Filter by relationship type
  --min-confidence <n>  Minimum confidence level (0-1)
  --layout <layout>     Layout algorithm for gephi: circle, grid, random (default: circle)

Formats:
  json     - JSON format (for programmatic processing)
  graphml  - GraphML format (for Gephi, yEd, Cytoscape)
  dot      - Graphviz DOT format (for visualization)
  csv      - CSV format (for spreadsheet analysis)
  cypher   - Neo4j Cypher statements (for graph database import)
  gephi    - Gephi Lite SDK format (optimized for Gephi Lite web app)

Examples:
  # Export to JSON
  tsdoc-edge relationship-export --format json --output relationships.json

  # Export to GraphML for Gephi
  tsdoc-edge relationship-export --format graphml --output graph.graphml

  # Export to DOT for Graphviz
  tsdoc-edge relationship-export --format dot --output graph.dot

  # Filter and export
  tsdoc-edge relationship-export --format json --category structural --output structural.json

  # Export high-confidence only
  tsdoc-edge relationship-export --format json --min-confidence 0.8 --output high-conf.json`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const options = {
        format: (this.getOption(args, '--format') || 'json') as ExportFormat,
        output: this.getOption(args, '--output'),
        category: this.getOption(args, '--category'),
        type: this.getOption(args, '--type'),
        minConfidence: this.getOption(args, '--min-confidence')
          ? Number.parseFloat(this.getOption(args, '--min-confidence')!)
          : undefined,
        layout: this.getOption(args, '--layout') || 'circle',
      };

      // Validate format
      const validFormats: ExportFormat[] = ['json', 'graphml', 'dot', 'csv', 'cypher', 'gephi'];
      if (!validFormats.includes(options.format)) {
        this.printError(`Invalid format: ${options.format}`);
        this.printInfo(`Valid formats: ${validFormats.join(', ')}`);
        return { success: false, message: 'Invalid format', exitCode: 1 };
      }

      this.printHeader(`Export Relationships (${options.format.toUpperCase()})`);

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Build query
      let sql = 'SELECT * FROM unified_relationships WHERE 1=1';
      const params: any[] = [];

      if (options.category) {
        sql += ' AND category = ?';
        params.push(options.category);
      }

      if (options.type) {
        sql += ' AND type = ?';
        params.push(options.type);
      }

      if (options.minConfidence !== undefined) {
        sql += ' AND confidence >= ?';
        params.push(options.minConfidence);
      }

      console.log();
      this.printInfo('Querying relationships...');

      const relationships = dbManager.db.prepare(sql).all(...params) as UnifiedRelationshipRow[];

      this.printInfo(`Found ${relationships.length} relationships`);
      console.log();

      // Get symbols for context
      const symbols = dbManager.getAllSymbolRows();
      const symbolMap = new Map(symbols.map((s) => [s.id, s]));

      // Export based on format
      let content: string;
      switch (options.format) {
        case 'json':
          content = this.exportJSON(relationships, symbolMap);
          break;
        case 'graphml':
          content = this.exportGraphML(relationships, symbolMap);
          break;
        case 'dot':
          content = this.exportDOT(relationships, symbolMap);
          break;
        case 'csv':
          content = this.exportCSV(relationships);
          break;
        case 'cypher':
          content = this.exportCypher(relationships, symbolMap);
          break;
        case 'gephi':
          content = this.exportGephi(relationships, symbolMap, options.layout);
          break;
      }

      // Output
      if (options.output) {
        fs.writeFileSync(options.output, content, 'utf-8');
        this.printSuccess(`Exported to: ${options.output}`);
        this.printInfo(`Size: ${(content.length / 1024).toFixed(2)} KB`);
      } else {
        console.log(content);
      }

      console.log();

      dbManager.close();

      return this.success(`Exported ${relationships.length} relationships in ${options.format} format`);
    });
  }

  /**
   * Export to JSON format
   */
  private exportJSON(relationships: any[], symbolMap: Map<string, any>): string {
    const data = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRelationships: relationships.length,
        totalSymbols: symbolMap.size,
      },
      symbols: Array.from(symbolMap.values()).map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        filePath: s.file_path,
      })),
      relationships: relationships.map((r) => ({
        id: r.id,
        type: r.type,
        category: r.category,
        from: JSON.parse(r.from_symbols),
        to: JSON.parse(r.to_symbols),
        direction: r.direction,
        strength: r.strength,
        confidence: r.confidence,
        description: r.description,
        evidence: r.evidence ? JSON.parse(r.evidence) : [],
      })),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export to GraphML format
   */
  private exportGraphML(relationships: any[], symbolMap: Map<string, any>): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">

  <!-- Node attributes -->
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="filePath" for="node" attr.name="filePath" attr.type="string"/>

  <!-- Edge attributes -->
  <key id="relType" for="edge" attr.name="relType" attr.type="string"/>
  <key id="category" for="edge" attr.name="category" attr.type="string"/>
  <key id="strength" for="edge" attr.name="strength" attr.type="string"/>
  <key id="confidence" for="edge" attr.name="confidence" attr.type="double"/>
  <key id="description" for="edge" attr.name="description" attr.type="string"/>

  <graph id="G" edgedefault="directed">

    <!-- Nodes -->
`;

    // Add nodes
    for (const [id, symbol] of symbolMap.entries()) {
      const escapedName = this.escapeXML(symbol.name);
      const escapedPath = this.escapeXML(symbol.file_path);
      xml += `    <node id="${this.escapeXML(id)}">
      <data key="name">${escapedName}</data>
      <data key="type">${this.escapeXML(symbol.type)}</data>
      <data key="filePath">${escapedPath}</data>
    </node>
`;
    }

    xml += `
    <!-- Edges -->
`;

    // Add edges
    for (const rel of relationships) {
      const fromSymbols = JSON.parse(rel.from_symbols);
      const toSymbols = JSON.parse(rel.to_symbols);

      for (const from of fromSymbols) {
        for (const to of toSymbols) {
          const edgeId = `${rel.id}-${from}-${to}`;
          xml += `    <edge id="${this.escapeXML(edgeId)}" source="${this.escapeXML(from)}" target="${this.escapeXML(to)}">
      <data key="relType">${this.escapeXML(rel.type)}</data>
      <data key="category">${this.escapeXML(rel.category)}</data>
      <data key="strength">${this.escapeXML(rel.strength)}</data>
      <data key="confidence">${rel.confidence}</data>
      <data key="description">${this.escapeXML(rel.description || '')}</data>
    </edge>
`;
        }
      }
    }

    xml += `  </graph>
</graphml>`;

    return xml;
  }

  /**
   * Export to Graphviz DOT format
   */
  private exportDOT(relationships: any[], symbolMap: Map<string, any>): string {
    let dot = `digraph relationships {
  // Graph settings
  rankdir=LR;
  node [shape=box, style=rounded];

  // Nodes
`;

    // Add nodes with labels
    for (const [id, symbol] of symbolMap.entries()) {
      const label = `${symbol.name}\\n(${symbol.type})`;
      dot += `  "${id}" [label="${label}"];\n`;
    }

    dot += `
  // Edges
`;

    // Add edges
    const categoryColors: Record<string, string> = {
      structural: 'blue',
      'data-flow': 'green',
      behavioral: 'purple',
      semantic: 'orange',
      verification: 'red',
      constraint: 'brown',
      alternative: 'pink',
    };

    for (const rel of relationships) {
      const fromSymbols = JSON.parse(rel.from_symbols);
      const toSymbols = JSON.parse(rel.to_symbols);

      const color = categoryColors[rel.category] || 'black';
      const style = rel.direction === 'bidirectional' ? 'dir=both' : '';

      for (const from of fromSymbols) {
        for (const to of toSymbols) {
          dot += `  "${from}" -> "${to}" [label="${rel.type}", color="${color}", ${style}];\n`;
        }
      }
    }

    dot += `}\n`;

    return dot;
  }

  /**
   * Export to CSV format
   */
  private exportCSV(relationships: any[]): string {
    const header = 'id,type,category,from_symbols,to_symbols,direction,strength,confidence,description\n';

    const rows = relationships.map((r) => {
      const from = JSON.parse(r.from_symbols).join('|');
      const to = JSON.parse(r.to_symbols).join('|');
      const desc = (r.description || '').replace(/"/g, '""');

      return `"${r.id}","${r.type}","${r.category}","${from}","${to}","${r.direction}","${r.strength}",${r.confidence},"${desc}"`;
    });

    return header + rows.join('\n');
  }

  /**
   * Export to Neo4j Cypher statements
   */
  private exportCypher(relationships: any[], symbolMap: Map<string, any>): string {
    let cypher = `// TSDoc Edge Relationship Export - Neo4j Cypher
// Generated: ${new Date().toISOString()}

// Create symbol nodes
`;

    // Create nodes
    for (const [id, symbol] of symbolMap.entries()) {
      const props = {
        id,
        name: symbol.name,
        type: symbol.type,
        filePath: symbol.file_path,
      };

      cypher += `CREATE (:Symbol ${this.cypherProps(props)});\n`;
    }

    cypher += `
// Create relationships
`;

    // Create relationships
    for (const rel of relationships) {
      const fromSymbols = JSON.parse(rel.from_symbols);
      const toSymbols = JSON.parse(rel.to_symbols);

      for (const from of fromSymbols) {
        for (const to of toSymbols) {
          const props = {
            type: rel.type,
            category: rel.category,
            strength: rel.strength,
            confidence: rel.confidence,
            description: rel.description || '',
          };

          cypher += `MATCH (from:Symbol {id: "${from}"}), (to:Symbol {id: "${to}"})
CREATE (from)-[:RELATES ${this.cypherProps(props)}]->(to);
`;
        }
      }
    }

    cypher += `\n// Create indexes for performance
CREATE INDEX symbol_id IF NOT EXISTS FOR (s:Symbol) ON (s.id);
CREATE INDEX symbol_type IF NOT EXISTS FOR (s:Symbol) ON (s.type);
`;

    return cypher;
  }

  /**
   * Format properties for Cypher
   */
  private cypherProps(props: Record<string, any>): string {
    const entries = Object.entries(props).map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: "${value.replace(/"/g, '\\"')}"`;
      }
      return `${key}: ${value}`;
    });

    return `{${entries.join(', ')}}`;
  }

  /**
   * Export to Gephi Lite SDK format
   * Based on @gephi/gephi-lite-sdk GraphDataset structure
   */
  private exportGephi(relationships: any[], symbolMap: Map<string, any>, layout: string): string {
    // Build node data
    const nodeData: Record<string, Record<string, any>> = {};
    const nodeLayout: Record<string, { x: number; y: number }> = {};
    const symbolsArray = Array.from(symbolMap.values());

    for (let i = 0; i < symbolsArray.length; i++) {
      const symbol = symbolsArray[i];
      nodeData[symbol.id] = {
        label: symbol.name,
        type: symbol.type,
        filePath: symbol.file_path,
        isPublic: symbol.is_public ? 1 : 0,
        hasTests: symbol.has_tests ? 1 : 0,
      };

      // Calculate layout position
      nodeLayout[symbol.id] = this.calculateNodePosition(i, symbolsArray.length, layout);
    }

    // Build edge data
    const edgeData: Record<string, Record<string, any>> = {};
    const edges: Array<{
      key: string;
      source: string;
      target: string;
      attributes: Record<string, any>;
    }> = [];

    let edgeCounter = 0;
    for (const rel of relationships) {
      try {
        const fromSymbols = JSON.parse(rel.from_symbols);
        const toSymbols = JSON.parse(rel.to_symbols);

        for (const from of fromSymbols) {
          for (const to of toSymbols) {
            if (from && to) {
              const edgeKey = `edge_${edgeCounter++}`;

              edgeData[edgeKey] = {
                type: rel.type,
                category: rel.category,
                confidence: rel.confidence,
                direction: rel.direction,
                strength: rel.strength,
                weight: rel.weight || 1,
              };

              edges.push({
                key: edgeKey,
                source: from,
                target: to,
                attributes: edgeData[edgeKey],
              });
            }
          }
        }
      } catch (error) {
        // Skip invalid relationships
      }
    }

    // Build nodes array
    const nodes = symbolsArray.map((symbol) => ({
      key: symbol.id,
      attributes: nodeData[symbol.id],
    }));

    // Define field models (schema)
    const nodeFields = [
      { id: 'label', itemType: 'nodes', type: 'text', label: 'Name' },
      { id: 'type', itemType: 'nodes', type: 'category', label: 'Type' },
      { id: 'filePath', itemType: 'nodes', type: 'text', label: 'File Path' },
      { id: 'isPublic', itemType: 'nodes', type: 'number', label: 'Public' },
      { id: 'hasTests', itemType: 'nodes', type: 'number', label: 'Has Tests' },
    ];

    const edgeFields = [
      { id: 'type', itemType: 'edges', type: 'category', label: 'Type' },
      { id: 'category', itemType: 'edges', type: 'category', label: 'Category' },
      { id: 'confidence', itemType: 'edges', type: 'number', label: 'Confidence' },
      { id: 'direction', itemType: 'edges', type: 'category', label: 'Direction' },
      { id: 'strength', itemType: 'edges', type: 'category', label: 'Strength' },
      { id: 'weight', itemType: 'edges', type: 'number', label: 'Weight' },
    ];

    // Build Gephi GraphDataset structure
    const dataset = {
      nodeData,
      edgeData,
      layout: nodeLayout,
      metadata: {
        title: 'TSDoc Edge Relationships',
        description: `Exported ${symbolsArray.length} symbols and ${relationships.length} relationships`,
      },
      nodeFields,
      edgeFields,
      fullGraph: {
        attributes: {
          name: 'TSDoc Edge Graph',
        },
        options: {
          type: 'directed',
          multi: true,
          allowSelfLoops: false,
        },
        nodes,
        edges,
      },
    };

    return JSON.stringify(dataset, null, 2);
  }

  /**
   * Calculate node position based on layout algorithm
   *
   * @todo Implement semantic layout using relationship categories and symbol types
   * - X axis: Map to 6 relationship categories (structural, behavioral, data-flow, semantic, verification, alternative)
   * - Y axis: Map to 9 symbol types (class, interface, function, method, property, etc.)
   * - Clustering: Group by file path/directory
   * - Distance: Consider relationship strength and frequency
   */
  private calculateNodePosition(
    index: number,
    total: number,
    layout: string
  ): { x: number; y: number } {
    if (layout === 'circle') {
      const angle = (index / total) * 2 * Math.PI;
      const radius = 500;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    }

    if (layout === 'random') {
      return {
        x: Math.random() * 1000 - 500,
        y: Math.random() * 1000 - 500,
      };
    }

    // Grid layout as default
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      x: col * 100 - (cols * 50),
      y: row * 100 - (Math.ceil(total / cols) * 50),
    };
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
