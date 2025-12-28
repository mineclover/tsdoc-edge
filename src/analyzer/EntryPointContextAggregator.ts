/**
 * Entry Point Context Aggregator
 * @packageDocumentation
 * @responsibility Aggregate all context for a given entry point (file/symbol/doc)
 */

import * as path from 'node:path';
import type { Symbol, SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';
import type { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Unified context for an entry point
 */
export interface UnifiedContext {
  /** Entry point identifier */
  entryPoint: string;

  /** Entry point type */
  entryPointType: 'file' | 'symbol' | 'document';

  /** Primary symbol information */
  primarySymbol?: Symbol;

  /** All symbols in file (if file entry point) */
  fileSymbols?: Symbol[];

  /** Direct dependencies (imports) */
  dependencies: Array<{
    symbolId: string;
    symbolName: string;
    type: string;
    relationship: 'import' | 'inheritance' | 'implementation' | 'calls';
  }>;

  /** Reverse dependencies (who uses this) */
  usedBy: Array<{
    symbolId: string;
    symbolName: string;
    type: string;
    relationship: string;
  }>;

  /** Documentation references (Code → Doc) */
  docReferences: Array<{
    docSymbol: string;
    section?: string;
    filePath: string;
    line: number;
  }>;

  /** Reverse doc references (Doc → Code, inferred) */
  referencedByDocs: Array<{
    docSymbol: string;
    isInferred: boolean;
  }>;

  /** Related symbols (naming patterns, collaborators) */
  relatedSymbols: Array<{
    symbolId: string;
    symbolName: string;
    relationshipType: string;
    strength: 'strong' | 'medium' | 'weak';
  }>;

  /** Test coverage information */
  testCoverage: Array<{
    testSymbol: string;
    testFile: string;
    coverageType: 'unit' | 'integration' | 'example';
  }>;

  /** Change impact analysis */
  impact: {
    directImpact: number;
    transitiveImpact: number;
    affectedFiles: string[];
    affectedTests: string[];
    affectedDocs: string[];
  };

  /** Metadata */
  metadata: {
    generatedAt: string;
    depth: number;
    totalRelationships: number;
    explicitCount: number;
    inferredCount: number;
  };
}

/**
 * Aggregates all context for a given entry point
 *
 * @doc [[EntryPointContextAggregator]]
 * @public
 * @responsibility Provide unified view of all relationships and context
 * @contract Combine symbol graph, relationships, docs, tests
 *
 * @problem Context is fragmented across multiple systems
 * @solves Single aggregator that combines all context sources
 * @context Part of LLM context generation workflow
 *
 * @functionality
 * - Resolve entry point (file → symbols, symbol → details, doc → refs)
 * - Gather all relationship types
 * - Include both explicit and inferred relationships
 * - Calculate impact radius
 * - Provide confidence scores
 *
 * @decision Aggregate at query time, don't cache
 * @rationale Always get fresh data, avoid stale cache
 * @consequences Slower but accurate
 */
export class EntryPointContextAggregator {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Gather complete context for an entry point
   *
   * @param entryPoint - File path, symbol ID, or doc symbol
   * @param depth - How many relationship levels to traverse (default: 2)
   * @returns Unified context
   */
  gatherContext(entryPoint: string, depth: number = 2): UnifiedContext {
    const entryPointType = this.detectEntryPointType(entryPoint);

    const context: UnifiedContext = {
      entryPoint,
      entryPointType,
      dependencies: [],
      usedBy: [],
      docReferences: [],
      referencedByDocs: [],
      relatedSymbols: [],
      testCoverage: [],
      impact: {
        directImpact: 0,
        transitiveImpact: 0,
        affectedFiles: [],
        affectedTests: [],
        affectedDocs: [],
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        depth,
        totalRelationships: 0,
        explicitCount: 0,
        inferredCount: 0,
      },
    };

    switch (entryPointType) {
      case 'file':
        this.gatherFileContext(entryPoint, context, depth);
        break;
      case 'symbol':
        this.gatherSymbolContext(entryPoint, context, depth);
        break;
      case 'document':
        this.gatherDocumentContext(entryPoint, context, depth);
        break;
    }

    return context;
  }

  /**
   * Detect entry point type
   *
   * @param entryPoint - Entry point string
   * @returns Entry point type
   * @private
   */
  private detectEntryPointType(entryPoint: string): 'file' | 'symbol' | 'document' {
    // File path pattern: contains / or \ and ends with .ts
    if (entryPoint.includes('/') || entryPoint.includes('\\') || entryPoint.endsWith('.ts')) {
      return 'file';
    }

    // Document pattern: starts with [[ or contains spaces
    if (entryPoint.startsWith('[[') || entryPoint.includes(' ')) {
      return 'document';
    }

    // Otherwise assume symbol ID (kebab-case)
    return 'symbol';
  }

  /**
   * Gather context for file entry point
   *
   * @param filePath - File path (absolute or relative)
   * @param context - Context to populate
   * @param depth - Traversal depth
   * @private
   */
  private gatherFileContext(filePath: string, context: UnifiedContext, depth: number): void {
    // Normalize to relative path if absolute (database stores relative paths)
    let normalizedPath = filePath;
    if (path.isAbsolute(filePath)) {
      normalizedPath = path.relative(process.cwd(), filePath);
    }

    // Get all symbols in file
    const symbols = this.dbManager.getSymbolsByFile(normalizedPath);
    context.fileSymbols = symbols;

    if (symbols.length > 0) {
      // Use first exported symbol as primary
      context.primarySymbol = symbols.find((s: Symbol) => s.isExported) || symbols[0];

      // Gather relationships for all symbols in file
      for (const symbol of symbols) {
        this.gatherSymbolContext(symbol.id, context, depth);
      }
    }
  }

  /**
   * Gather context for symbol entry point
   *
   * @param symbolId - Symbol ID
   * @param context - Context to populate
   * @param depth - Traversal depth
   * @private
   */
  private gatherSymbolContext(symbolId: string, context: UnifiedContext, depth: number): void {
    // Get symbol details
    if (!context.primarySymbol) {
      const symbol = this.dbManager.getSymbol(symbolId);
      if (symbol) {
        context.primarySymbol = symbol;
      }
    }

    // Get relationships for this symbol (optimized query)
    const relevantRels = this.dbManager.getUnifiedRelationshipsBySymbol(symbolId);

    // Process relationships by type
    for (const rel of relevantRels) {
      const from = Array.isArray(rel.from) ? rel.from[0] : rel.from;
      const to = Array.isArray(rel.to) ? rel.to[0] : rel.to;

      // Count explicit vs inferred
      if (rel.properties?.inferred) {
        context.metadata.inferredCount++;
      } else {
        context.metadata.explicitCount++;
      }
      context.metadata.totalRelationships++;

      // Categorize relationship
      if (rel.type === 'doc-reference') {
        if (from === symbolId) {
          // This symbol references a doc
          context.docReferences.push({
            docSymbol: to,
            section: rel.properties?.section,
            filePath: rel.filePath || '',
            line: rel.line || 0,
          });
        } else if (rel.properties?.inferred && rel.properties?.direction === 'doc-to-code') {
          // Doc references this symbol (inferred)
          context.referencedByDocs.push({
            docSymbol: from,
            isInferred: true,
          });
        }
      } else if (rel.type === 'code-dependency' && from === symbolId) {
        // This symbol depends on another
        context.dependencies.push({
          symbolId: to,
          symbolName: to,
          type: rel.type,
          relationship: 'import',
        });
      } else if (rel.type === 'code-dependency' && to === symbolId) {
        // Another symbol depends on this
        context.usedBy.push({
          symbolId: from,
          symbolName: from,
          type: rel.type,
          relationship: 'import',
        });
      } else if (rel.type === 'test-coverage' && to === symbolId) {
        // Test covers this symbol
        context.testCoverage.push({
          testSymbol: from,
          testFile: rel.filePath || '',
          coverageType: 'unit',
        });
      } else if (['naming-pattern-relation', 'collaboration'].includes(rel.type)) {
        // Related symbols
        const relatedId = from === symbolId ? to : from;
        context.relatedSymbols.push({
          symbolId: relatedId,
          symbolName: relatedId,
          relationshipType: rel.type,
          strength: rel.strength || 'medium',
        });
      }
    }

    // Calculate impact
    context.impact.directImpact = context.usedBy.length;
    context.impact.transitiveImpact = this.calculateTransitiveImpact(symbolId, depth);
    context.impact.affectedFiles = this.getAffectedFiles(context);
    context.impact.affectedTests = context.testCoverage.map(t => t.testFile);
    context.impact.affectedDocs = [
      ...context.docReferences.map(d => d.docSymbol),
      ...context.referencedByDocs.map(d => d.docSymbol),
    ];
  }

  /**
   * Gather context for document entry point
   *
   * @param docSymbol - Document symbol
   * @param context - Context to populate
   * @param depth - Traversal depth
   * @private
   */
  private gatherDocumentContext(docSymbol: string, context: UnifiedContext, depth: number): void {
    // Remove [[ ]] if present
    const cleanSymbol = docSymbol.replace(/^\[\[|\]\]$/g, '').trim();

    // Get relationships for this doc symbol (optimized query)
    const allRels = this.dbManager.getUnifiedRelationshipsBySymbol(cleanSymbol);

    // Find all code symbols that reference this doc
    const docRels = allRels.filter(rel => rel.type === 'doc-reference');

    for (const rel of docRels) {
      const from = Array.isArray(rel.from) ? rel.from[0] : rel.from;
      const to = Array.isArray(rel.to) ? rel.to[0] : rel.to;

      if (rel.properties?.direction === 'doc-to-code') {
        // Doc → Code (inferred)
        context.usedBy.push({
          symbolId: to,
          symbolName: to,
          type: 'doc-reference',
          relationship: 'documented-in',
        });
      } else {
        // Code → Doc (explicit)
        context.docReferences.push({
          docSymbol: to,
          section: rel.properties?.section,
          filePath: rel.filePath || '',
          line: rel.line || 0,
        });
      }
    }

    context.metadata.totalRelationships = docRels.length;
    context.metadata.explicitCount = docRels.filter(r => !r.properties?.inferred).length;
    context.metadata.inferredCount = docRels.filter(r => r.properties?.inferred).length;
  }

  /**
   * Calculate transitive impact (how many symbols are affected indirectly)
   *
   * @param symbolId - Starting symbol
   * @param depth - How deep to traverse
   * @returns Number of transitively affected symbols
   * @private
   */
  private calculateTransitiveImpact(
    symbolId: string,
    depth: number
  ): number {
    if (depth === 0) return 0;

    const affected = new Set<string>();
    const visited = new Set<string>();
    const queue: Array<{ id: string; level: number }> = [{ id: symbolId, level: 0 }];

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;

      if (visited.has(id) || level >= depth) continue;
      visited.add(id);

      // Find all symbols that depend on this one (using optimized query)
      const rels = this.dbManager.getUnifiedRelationshipsBySymbol(id);
      const dependents = rels.filter(rel => {
        const to = Array.isArray(rel.to) ? rel.to : [rel.to];
        return to.includes(id) && ['code-dependency', 'calls', 'inheritance'].includes(rel.type);
      });

      for (const rel of dependents) {
        const from = Array.isArray(rel.from) ? rel.from[0] : rel.from;
        affected.add(from);
        queue.push({ id: from, level: level + 1 });
      }
    }

    return affected.size;
  }

  /**
   * Get all affected files from context
   *
   * @param context - Context object
   * @returns Array of file paths
   * @private
   */
  private getAffectedFiles(context: UnifiedContext): string[] {
    const files = new Set<string>();

    if (context.primarySymbol?.filePath) {
      files.add(context.primarySymbol.filePath);
    }

    context.dependencies.forEach(d => {
      const symbol = this.dbManager.getSymbol(d.symbolId);
      if (symbol?.filePath) files.add(symbol.filePath);
    });

    context.usedBy.forEach(u => {
      const symbol = this.dbManager.getSymbol(u.symbolId);
      if (symbol?.filePath) files.add(symbol.filePath);
    });

    return Array.from(files);
  }
}
