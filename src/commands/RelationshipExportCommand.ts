/**
 * Relationship Export Command
 * @packageDocumentation
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

type ExportFormat = 'json' | 'graphml' | 'dot' | 'csv' | 'cypher';

/**
 * Command for exporting relationships to various formats
 * @public
 */
export class RelationshipExportCommand extends BaseCommand {
  getName(): string {
    return 'relationship-export';
  }

  getDescription(): string {
    return 'Export relationships to various formats (JSON, GraphML, DOT, CSV, Cypher)';
  }

  protected getUsage(): string {
    return `tsdoc-edge relationship-export [options]

Export relationships to various formats for analysis with external tools.

Options:
  --format <format>     Output format: json, graphml, dot, csv, cypher (default: json)
  --output <file>       Output file path (default: stdout)
  --category <cat>      Filter by category
  --type <type>         Filter by relationship type
  --min-confidence <n>  Minimum confidence level (0-1)

Formats:
  json     - JSON format (for programmatic processing)
  graphml  - GraphML format (for Gephi, yEd, Cytoscape)
  dot      - Graphviz DOT format (for visualization)
  csv      - CSV format (for spreadsheet analysis)
  cypher   - Neo4j Cypher statements (for graph database import)

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
      };

      // Validate format
      const validFormats: ExportFormat[] = ['json', 'graphml', 'dot', 'csv', 'cypher'];
      if (!validFormats.includes(options.format)) {
        this.printError(`Invalid format: ${options.format}`);
        this.printInfo(`Valid formats: ${validFormats.join(', ')}`);
        return { success: false, message: 'Invalid format', exitCode: 1 };
      }

      this.printHeader(`Export Relationships (${options.format.toUpperCase()})`);

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
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

      const relationships = dbManager.db.prepare(sql).all(...params) as any[];

      this.printInfo(`Found ${relationships.length} relationships`);
      console.log();

      // Get symbols for context
      const symbols = dbManager.db.prepare('SELECT * FROM symbols').all() as any[];
      const symbolMap = new Map(symbols.map((s: any) => [s.id, s]));

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
