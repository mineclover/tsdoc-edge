/**
 * Doc Reference Analyzer
 * @packageDocumentation
 * @responsibility Analyze @doc [[Symbol]] references in TSDoc comments
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';
import { TSDocSymbolParser } from '../doc-symbol/TSDocSymbolParser';
import type { CodeConnection } from '../types/feature';

/**
 * Analyzes doc reference relationships (@doc [[Symbol]])
 *
 * @public
 * @responsibility Detect code-to-documentation references via @doc tags
 *
 * Pattern: Code symbol references documentation symbol
 * - @doc [[FeatureName]]: Code points to feature documentation
 * - @doc [[ComponentName]]: Code points to component documentation
 * - @doc [[ConceptName]]: Code points to concept documentation
 *
 * Detection:
 * 1. Parse all TypeScript files for @doc tags in TSDoc comments
 * 2. Extract [[Symbol]] references from @doc tags
 * 3. Create relationships from code symbol to doc symbol
 * 4. Track section references (e.g., @doc [[Symbol#Section]])
 *
 * Evidence:
 * - File path, line number
 * - JSDoc comment text
 * - Symbol name, doc symbol name
 * - Optional section reference
 *
 * @example
 * ```typescript
 * /**
 *  * User authentication service
 *  * @doc [[Authentication]]
 *  * @doc [[User Management#Login]]
 *  *\/
 * export class AuthService {
 *   // Creates 2 doc-reference relationships
 * }
 * ```
 */
export class DocReferenceAnalyzer {
  private graph: SymbolGraph;
  private parser: TSDocSymbolParser;

  /**
   * Creates a DocReferenceAnalyzer instance
   *
   * @param graph - Symbol graph
   */
  constructor(graph: SymbolGraph) {
    this.graph = graph;
    this.parser = new TSDocSymbolParser();
  }

  /**
   * Analyze doc reference relationships
   *
   * @param rootDir - Root directory to analyze
   * @returns Array of doc reference relationships
   */
  analyze(rootDir: string): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const connections = this.collectDocConnections(rootDir);

    for (const connection of connections) {
      const relationship = this.createRelationship(connection);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect all @doc connections from TypeScript files
   *
   * @param rootDir - Root directory
   * @returns Array of code connections
   * @private
   */
  private collectDocConnections(rootDir: string): CodeConnection[] {
    const connections: CodeConnection[] = [];
    const files = this.findTypeScriptFiles(rootDir);

    for (const file of files) {
      try {
        const fileConnections = this.parser.parseCodeFile(file);
        connections.push(...fileConnections);
      } catch (error) {
        // Skip files that cause parsing errors
      }
    }

    return connections;
  }

  /**
   * Find all TypeScript files in directory
   *
   * @param dir - Directory to search
   * @returns Array of file paths
   * @private
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    const traverse = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, dist, build, etc.
          if (['node_modules', 'dist', 'build', '.git', '.tsdoc'].includes(entry.name)) {
            continue;
          }
          traverse(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    };

    traverse(dir);
    return files;
  }

  /**
   * Create unified relationship from code connection
   *
   * @param connection - Code connection
   * @returns Unified relationship or null
   * @private
   */
  private createRelationship(connection: CodeConnection): UnifiedRelationship | null {
    // Check if code symbol exists in graph
    const codeSymbol = this.graph.symbols.get(connection.codeSymbol);
    if (!codeSymbol) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const sectionPart = connection.section ? `#${connection.section}` : '';

    return {
      id: `doc-reference-${connection.codeSymbol}-${connection.docSymbol}-${connection.line}`,
      type: 'doc-reference',
      from: connection.codeSymbol,
      to: connection.docSymbol,
      direction: 'unidirectional',
      strength: 'strong',
      category: 'semantic',
      evidence: [
        {
          type: 'documentation',
          source: connection.filePath,
          lineNumber: connection.line,
          snippet: `@doc [[${connection.docSymbol}${sectionPart}]]`,
          confidence: 1.0,
          context: `TSDoc @doc tag in ${connection.codeSymbol}`
        }
      ],
      discoveredBy: 'documentation',
      confidence: 1.0,
      filePath: connection.filePath,
      line: connection.line,
      properties: {
        codeSymbol: connection.codeSymbol,
        docSymbol: connection.docSymbol,
        section: connection.section,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${connection.codeSymbol} → [[${connection.docSymbol}${sectionPart}]]`
    };
  }

  /**
   * Get statistics for doc reference relationships
   *
   * @param relationships - Doc reference relationships
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    withSection: number;
    uniqueCodeSymbols: number;
    uniqueDocSymbols: number;
    byFile: Record<string, number>;
  } {
    const codeSymbols = new Set<string>();
    const docSymbols = new Set<string>();
    const byFile: Record<string, number> = {};
    let withSection = 0;

    for (const rel of relationships) {
      // Handle from/to as string or string[]
      const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
      const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];

      fromSymbols.forEach(s => codeSymbols.add(s));
      toSymbols.forEach(s => docSymbols.add(s));

      if (rel.properties?.section) {
        withSection++;
      }

      if (rel.filePath) {
        byFile[rel.filePath] = (byFile[rel.filePath] || 0) + 1;
      }
    }

    return {
      total: relationships.length,
      withSection,
      uniqueCodeSymbols: codeSymbols.size,
      uniqueDocSymbols: docSymbols.size,
      byFile,
    };
  }
}
