/**
 * Relationship Visualization Command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager, type UnifiedRelationshipRow } from '../storage/DatabaseManager';

/**
 * Command for visualizing relationships as diagrams
 * @doc [[RelationshipVisualizeCommand]]
 * @public
 */
export class RelationshipVisualizeCommand extends BaseCommand {
  getName(): string {
    return 'relationship-visualize';
  }

  getDescription(): string {
    return 'Visualize relationships as Mermaid diagrams';
  }

  protected getUsage(): string {
    return `tsdoc-edge relationship-visualize <symbol-id> [options]

Options:
  --format <format>     Output format: mermaid, dot (default: mermaid)
  --type <type>         Filter by relationship type
  --category <category> Filter by category
  --depth <n>           Max relationship depth (default: 2)
  --direction <dir>     Direction: from, to, both (default: both)
  --output <file>       Save to file (default: stdout)
  --style <style>       Diagram style: graph, flowchart (default: graph)

Examples:
  tsdoc-edge relationship-visualize class-databasemanager
  tsdoc-edge relationship-visualize class-buildcommand --depth=3 --category=structural
  tsdoc-edge relationship-visualize class-configmanager --output=config.mmd
  tsdoc-edge relationship-visualize class-databasemanager --style=flowchart --type=composition`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      if (args.length === 0) {
        this.printError('Symbol ID required');
        console.log();
        return this.displayHelp();
      }

      const symbolId = args[0];

      // Parse options
      const options = {
        format: this.getOption(args, '--format') || 'mermaid',
        type: this.getOption(args, '--type'),
        category: this.getOption(args, '--category'),
        depth: Number.parseInt(this.getOption(args, '--depth') || '2', 10),
        direction: this.getOption(args, '--direction') || 'both',
        output: this.getOption(args, '--output'),
        style: this.getOption(args, '--style') || 'graph',
      };

      this.printHeader(`Relationship Visualization: ${symbolId}`);

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Get symbol info
      const symbol = dbManager.getSymbol(symbolId);

      if (!symbol) {
        this.printError(`Symbol not found: ${symbolId}`);
        dbManager.close();
        return this.failure('Symbol not found');
      }

      console.log(`Symbol: ${symbol.name} (${symbol.type})`);
      console.log(`Format: ${options.format}, Style: ${options.style}, Depth: ${options.depth}\n`);

      // Collect relationships
      const visited = new Set<string>();
      const relationships: any[] = [];

      this.collectRelationships(
        dbManager,
        symbolId,
        options,
        0,
        visited,
        relationships
      );

      console.log(`Collected ${relationships.length} relationships\n`);

      // Generate diagram
      let diagram = '';
      if (options.format === 'mermaid') {
        diagram = this.generateMermaidDiagram(symbol, relationships, options);
      } else if (options.format === 'dot') {
        diagram = this.generateDotDiagram(symbol, relationships, options);
      } else {
        this.printError(`Unsupported format: ${options.format}`);
        dbManager.close();
        return this.failure('Unsupported format');
      }

      // Output
      if (options.output) {
        fs.writeFileSync(options.output, diagram, 'utf-8');
        this.printSuccess(`Diagram saved to: ${options.output}`);
      } else {
        console.log(diagram);
      }

      dbManager.close();
      return this.success();
    });
  }

  /**
   * Collect relationships recursively
   */
  private collectRelationships(
    dbManager: DatabaseManager,
    symbolId: string,
    options: any,
    depth: number,
    visited: Set<string>,
    relationships: any[]
  ): void {
    if (depth >= options.depth || visited.has(symbolId)) {
      return;
    }

    visited.add(symbolId);

    // Use Drizzle ORM method and filter in JavaScript
    let rels = dbManager.getUnifiedRelationshipsBySymbol(symbolId);

    // Apply filters
    if (options.type) {
      rels = rels.filter(r => r.type === options.type);
    }
    if (options.category) {
      rels = rels.filter(r => r.category === options.category);
    }

    // Convert to row format for compatibility
    const relRows = rels.map(r => ({
      id: r.id,
      type: r.type,
      category: r.category,
      from_symbols: JSON.stringify(Array.isArray(r.from) ? r.from : [r.from]),
      to_symbols: JSON.stringify(Array.isArray(r.to) ? r.to : [r.to]),
      direction: r.direction,
      strength: r.strength,
      evidence: JSON.stringify(r.evidence),
      discovered_by: r.discoveredBy,
      confidence: r.confidence,
      file_path: r.filePath ?? null,
      line: r.line ?? null,
      properties: r.properties ? JSON.stringify(r.properties) : null,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      description: r.description ?? null,
    })) as UnifiedRelationshipRow[];

    for (let i = 0; i < rels.length; i++) {
      const rel = rels[i];
      const relRow = relRows[i];

      // Check if already added
      if (relationships.some(r => r.id === rel.id)) {
        continue;
      }

      relationships.push(relRow);

      // Recurse to connected symbols
      const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
      const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];

      if (options.direction === 'both' || options.direction === 'from') {
        for (const toId of toSymbols) {
          if (toId && toId !== symbolId) {
            this.collectRelationships(dbManager, toId, options, depth + 1, visited, relationships);
          }
        }
      }

      if (options.direction === 'both' || options.direction === 'to') {
        for (const fromId of fromSymbols) {
          if (fromId && fromId !== symbolId) {
            this.collectRelationships(dbManager, fromId, options, depth + 1, visited, relationships);
          }
        }
      }
    }
  }

  /**
   * Generate Mermaid diagram
   */
  private generateMermaidDiagram(symbol: any, relationships: any[], options: any): string {
    const lines: string[] = [];

    // Header
    if (options.style === 'flowchart') {
      lines.push('flowchart TD');
    } else {
      lines.push('graph TD');
    }

    lines.push('');

    // Collect all unique symbols
    const symbols = new Map<string, { name: string; type: string }>();
    symbols.set(symbol.id, { name: symbol.name, type: symbol.type });

    for (const rel of relationships) {
      const fromSymbols = JSON.parse(rel.from_symbols || '[]');
      const toSymbols = JSON.parse(rel.to_symbols || '[]');

      for (const fromId of fromSymbols) {
        if (fromId && !symbols.has(fromId)) {
          // Get symbol name from description
          const fromName = this.extractSymbolName(fromId);
          symbols.set(fromId, { name: fromName, type: 'unknown' });
        }
      }

      for (const toId of toSymbols) {
        if (toId && !symbols.has(toId)) {
          const toName = this.extractSymbolName(toId);
          symbols.set(toId, { name: toName, type: 'unknown' });
        }
      }
    }

    // Define nodes with styling
    for (const [id, info] of symbols.entries()) {
      const nodeId = this.sanitizeId(id);
      const nodeName = this.sanitizeName(info.name);
      const style = this.getNodeStyle(info.type);
      lines.push(`    ${nodeId}${style}["${nodeName}"]`);
    }

    lines.push('');

    // Add relationships
    for (const rel of relationships) {
      const fromSymbols = JSON.parse(rel.from_symbols || '[]');
      const toSymbols = JSON.parse(rel.to_symbols || '[]');

      for (const fromId of fromSymbols) {
        for (const toId of toSymbols) {
          if (fromId && toId) {
            const fromNode = this.sanitizeId(fromId);
            const toNode = this.sanitizeId(toId);
            const arrow = this.getArrow(rel.type, rel.direction);
            const label = this.getEdgeLabel(rel.type);

            lines.push(`    ${fromNode} ${arrow}|"${label}"| ${toNode}`);
          }
        }
      }
    }

    lines.push('');

    // Add styling
    lines.push('    %% Styling');
    lines.push('    classDef primary fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff');
    lines.push('    classDef secondary fill:#7ED321,stroke:#5FA319,stroke-width:2px');
    lines.push('    classDef tertiary fill:#F5A623,stroke:#C17E1A,stroke-width:2px');
    lines.push(`    class ${this.sanitizeId(symbol.id)} primary`);

    return lines.join('\n');
  }

  /**
   * Generate DOT diagram (GraphViz)
   */
  private generateDotDiagram(symbol: any, relationships: any[], options: any): string {
    const lines: string[] = [];

    lines.push('digraph G {');
    lines.push('  rankdir=TD;');
    lines.push('  node [shape=box, style=rounded];');
    lines.push('');

    // Collect unique symbols
    const symbols = new Set<string>();
    symbols.add(symbol.id);

    for (const rel of relationships) {
      const fromSymbols = JSON.parse(rel.from_symbols || '[]');
      const toSymbols = JSON.parse(rel.to_symbols || '[]');
      fromSymbols.forEach((id: string) => id && symbols.add(id));
      toSymbols.forEach((id: string) => id && symbols.add(id));
    }

    // Define nodes
    for (const id of symbols) {
      const name = this.extractSymbolName(id);
      const sanitized = this.sanitizeId(id);
      const style = id === symbol.id ? ', fillcolor=lightblue, style=filled' : '';
      lines.push(`  ${sanitized} [label="${name}"${style}];`);
    }

    lines.push('');

    // Add edges
    for (const rel of relationships) {
      const fromSymbols = JSON.parse(rel.from_symbols || '[]');
      const toSymbols = JSON.parse(rel.to_symbols || '[]');

      for (const fromId of fromSymbols) {
        for (const toId of toSymbols) {
          if (fromId && toId) {
            const from = this.sanitizeId(fromId);
            const to = this.sanitizeId(toId);
            const label = rel.type;
            lines.push(`  ${from} -> ${to} [label="${label}"];`);
          }
        }
      }
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Get node style for Mermaid
   */
  private getNodeStyle(type: string): string {
    switch (type) {
      case 'class':
        return ':::class';
      case 'function':
        return ':::function';
      case 'interface':
        return ':::interface';
      default:
        return '';
    }
  }

  /**
   * Get arrow style for relationship type
   */
  private getArrow(type: string, direction: string): string {
    if (direction === 'bidirectional') {
      return '<-->';
    }

    switch (type) {
      case 'inheritance':
      case 'composition':
        return '-->';
      case 'calls':
      case 'io-dependency':
        return '==>';
      default:
        return '-->';
    }
  }

  /**
   * Get edge label
   */
  private getEdgeLabel(type: string): string {
    const labels: Record<string, string> = {
      'code-dependency': 'imports',
      'calls': 'calls',
      'composition': 'has-a',
      'inheritance': 'extends',
      'io-dependency': 'produces/consumes',
      'test-coverage': 'tested by',
      'collaboration': 'collaborates',
    };

    return labels[type] || type;
  }

  /**
   * Extract symbol name from ID
   */
  private extractSymbolName(id: string): string {
    // Convert class-databasemanager to DatabaseManager
    const parts = id.split('-');
    if (parts.length > 1) {
      return parts
        .slice(1)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join('');
    }
    return id;
  }

  /**
   * Sanitize ID for Mermaid/DOT
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Sanitize name for display
   */
  private sanitizeName(name: string): string {
    return name.replace(/"/g, '\\"');
  }

  /**
   * Get option value
   */
  private getOption(args: string[], flag: string): string | undefined {
    const index = args.findIndex(arg => arg.startsWith(flag));
    if (index === -1) return undefined;

    const arg = args[index];
    if (arg.includes('=')) {
      return arg.split('=')[1];
    }

    return args[index + 1];
  }
}
