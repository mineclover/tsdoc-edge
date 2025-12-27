/**
 * Mermaid diagram generator
 * Generates Mermaid diagrams for dependency visualization
 * @packageDocumentation
 */

import type { CircularDependency, Hotspot } from '../analyzer/DependencyChainAnalyzer';
import type { SymbolGraph } from '../types/graph';

/**
 * Mermaid diagram generator
 * @public
 */
export class MermaidGenerator {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Generate dependency tree diagram for a symbol
   * @param symbolId - Root symbol ID
   * @param maxDepth - Maximum depth (default: 3)
   * @returns Mermaid diagram
   */
  generateDependencyTree(symbolId: string, maxDepth: number = 3): string {
    const visited = new Set<string>();
    const lines: string[] = ['graph TD'];

    const traverse = (currentId: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentId)) return;
      visited.add(currentId);

      const symbol = this.graph.symbols.get(currentId);
      if (!symbol) return;

      const deps = this.graph.adjacencyList.get(currentId) || [];

      for (const depId of deps) {
        const depSymbol = this.graph.symbols.get(depId);
        if (!depSymbol) continue;

        // Add edge
        lines.push(`  ${this.sanitizeId(currentId)}["${this.formatLabel(symbol.name)}"] --> ${this.sanitizeId(depId)}["${this.formatLabel(depSymbol.name)}"]`);

        traverse(depId, depth + 1);
      }
    };

    traverse(symbolId, 0);

    if (lines.length === 1) {
      lines.push(`  ${this.sanitizeId(symbolId)}["${this.formatLabel(this.graph.symbols.get(symbolId)?.name || symbolId)}"]`);
    }

    return lines.join('\n');
  }

  /**
   * Generate hotspot diagram
   * @param hotspots - Array of hotspots
   * @param limit - Limit number of hotspots (default: 10)
   * @returns Mermaid diagram
   */
  generateHotspotDiagram(hotspots: Hotspot[], limit: number = 10): string {
    const lines: string[] = ['graph LR'];
    const topHotspots = hotspots.slice(0, limit);

    for (const hotspot of topHotspots) {
      const symbol = this.graph.symbols.get(hotspot.symbolId);
      if (!symbol) continue;

      // Color by rank
      const style = this.getRankStyle(hotspot.rank);
      const label = `${this.formatLabel(symbol.name)}<br/>In:${hotspot.incomingCount} Out:${hotspot.outgoingCount}<br/>Score:${hotspot.score}`;

      lines.push(`  ${this.sanitizeId(hotspot.symbolId)}["${label}"]:::${style}`);

      // Show some incoming dependencies
      const incoming: string[] = [];
      for (const [depId, deps] of this.graph.adjacencyList.entries()) {
        if (deps.includes(hotspot.symbolId)) {
          incoming.push(depId);
          if (incoming.length >= 3) break;
        }
      }

      for (const depId of incoming) {
        const depSymbol = this.graph.symbols.get(depId);
        if (!depSymbol) continue;
        lines.push(`  ${this.sanitizeId(depId)}["${this.formatLabel(depSymbol.name)}"] --> ${this.sanitizeId(hotspot.symbolId)}`);
      }

      // Show some outgoing dependencies
      const outgoing = (this.graph.adjacencyList.get(hotspot.symbolId) || []).slice(0, 3);
      for (const depId of outgoing) {
        const depSymbol = this.graph.symbols.get(depId);
        if (!depSymbol) continue;
        lines.push(`  ${this.sanitizeId(hotspot.symbolId)} --> ${this.sanitizeId(depId)}["${this.formatLabel(depSymbol.name)}"]`);
      }
    }

    // Add style definitions
    lines.push('');
    lines.push('  classDef critical fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff');
    lines.push('  classDef high fill:#ffa94d,stroke:#fd7e14,stroke-width:2px');
    lines.push('  classDef medium fill:#74c0fc,stroke:#339af0,stroke-width:2px');
    lines.push('  classDef low fill:#b2f2bb,stroke:#51cf66,stroke-width:2px');

    return lines.join('\n');
  }

  /**
   * Generate circular dependency diagram
   * @param circular - Circular dependency
   * @returns Mermaid diagram
   */
  generateCircularDiagram(circular: CircularDependency): string {
    const lines: string[] = ['graph LR'];

    for (let i = 0; i < circular.path.length - 1; i++) {
      const fromId = circular.path[i];
      const toId = circular.path[i + 1];

      const fromSymbol = this.graph.symbols.get(fromId);
      const toSymbol = this.graph.symbols.get(toId);

      if (!fromSymbol || !toSymbol) continue;

      const fromLabel = this.formatLabel(fromSymbol.name);
      const toLabel = this.formatLabel(toSymbol.name);

      lines.push(`  ${this.sanitizeId(fromId)}["${fromLabel}"] -->|"${i + 1}"| ${this.sanitizeId(toId)}["${toLabel}"]`);
    }

    // Style circular nodes
    lines.push('');
    for (const symbolId of circular.symbols) {
      lines.push(`  ${this.sanitizeId(symbolId)}:::circular`);
    }

    lines.push('');
    lines.push('  classDef circular fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px,color:#fff');

    return lines.join('\n');
  }

  /**
   * Generate class hierarchy diagram
   * @param classId - Root class ID
   * @returns Mermaid diagram
   */
  generateClassHierarchy(classId: string): string {
    const lines: string[] = ['graph BT'];
    const visited = new Set<string>();

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const symbol = this.graph.symbols.get(currentId);
      if (!symbol) return;

      // Find inheritance relationships
      for (const [relId, relTargets] of this.graph.adjacencyList.entries()) {
        if (relTargets.includes(currentId)) {
          const relSymbol = this.graph.symbols.get(relId);
          if (!relSymbol) continue;

          // Check if it's an inheritance relationship
          // This is simplified - in production, check relationship type
          if (relSymbol.type === 'class' || relSymbol.type === 'interface') {
            lines.push(`  ${this.sanitizeId(relId)}["${this.formatLabel(relSymbol.name)}"] -.->|extends| ${this.sanitizeId(currentId)}["${this.formatLabel(symbol.name)}"]`);
            traverse(relId);
          }
        }
      }
    };

    traverse(classId);

    if (lines.length === 1) {
      const symbol = this.graph.symbols.get(classId);
      lines.push(`  ${this.sanitizeId(classId)}["${this.formatLabel(symbol?.name || classId)}"]`);
    }

    return lines.join('\n');
  }

  /**
   * Generate module dependency diagram
   * Groups symbols by file path
   * @param maxFiles - Maximum files to show (default: 10)
   * @returns Mermaid diagram
   */
  generateModuleDiagram(maxFiles: number = 10): string {
    const lines: string[] = ['graph TD'];

    // Group symbols by file
    const fileMap = new Map<string, string[]>();
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      const file = symbol.filePath;
      const existing = fileMap.get(file);
      if (existing) {
        existing.push(symbolId);
      } else {
        fileMap.set(file, [symbolId]);
      }
    }

    // Count dependencies between files
    const fileDeps = new Map<string, Set<string>>();
    for (const [symbolId, deps] of this.graph.adjacencyList.entries()) {
      const symbol = this.graph.symbols.get(symbolId);
      if (!symbol) continue;

      const fromFile = symbol.filePath;
      let fromDeps = fileDeps.get(fromFile);
      if (!fromDeps) {
        fromDeps = new Set();
        fileDeps.set(fromFile, fromDeps);
      }

      for (const depId of deps) {
        const depSymbol = this.graph.symbols.get(depId);
        if (!depSymbol) continue;

        const toFile = depSymbol.filePath;
        if (fromFile !== toFile) {
          fromDeps.add(toFile);
        }
      }
    }

    // Take top files by dependency count
    const sortedFiles = Array.from(fileDeps.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, maxFiles);

    for (const [fromFile, toFiles] of sortedFiles) {
      const fromLabel = this.formatFilePath(fromFile);
      const fromId = this.sanitizeId(fromFile);

      for (const toFile of toFiles) {
        if (!fileDeps.has(toFile)) continue;

        const toLabel = this.formatFilePath(toFile);
        const toId = this.sanitizeId(toFile);

        lines.push(`  ${fromId}["${fromLabel}"] --> ${toId}["${toLabel}"]`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Sanitize ID for Mermaid
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Format label for display
   */
  private formatLabel(name: string): string {
    // Truncate long names
    if (name.length > 30) {
      return `${name.substring(0, 27)}...`;
    }
    return name;
  }

  /**
   * Format file path for display
   */
  private formatFilePath(filePath: string): string {
    // Show only filename
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Get style class for rank
   */
  private getRankStyle(rank: 'critical' | 'high' | 'medium' | 'low'): string {
    return rank;
  }
}
