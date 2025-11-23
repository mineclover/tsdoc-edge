/**
 * Enhanced Work Context Analyzer
 * @packageDocumentation
 * @responsibility Provide comprehensive work context using relationship graph
 *
 * @problem Need all context before editing a file
 * @solves Analyzes file through relationship graph to provide complete context
 * @context SSOT principle: Relationship-based context discovery
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DatabaseManager } from '../storage/DatabaseManager';
import { RelationshipQueryEngine } from '../query/RelationshipQueryEngine';
import type { Symbol } from '../types/graph';

/**
 * Enhanced work context for a file
 * @public
 */
export interface EnhancedWorkContext {
  /** File path being analyzed */
  filePath: string;

  /** All symbols defined in this file */
  symbols: Symbol[];

  /** Aggregated relationship context for all symbols */
  relationships: {
    /** Total direct relationships */
    total: number;

    /** Documentation references (code → docs) */
    documentation: Array<{ symbolId: string; symbolName: string; docRef: string }>;

    /** Test coverage (tests → implementation) */
    tests: Array<{ symbolId: string; symbolName: string; testId: string; testName: string }>;

    /** Code dependencies (this → others) */
    dependencies: Array<{ symbolId: string; symbolName: string; depId: string; depName: string }>;

    /** Dependents (others → this) */
    dependents: Array<{ symbolId: string; symbolName: string; depId: string; depName: string }>;

    /** Semantic neighbors (same domain/feature) */
    semanticNeighbors: Array<{ symbolId: string; symbolName: string; neighborId: string; neighborName: string }>;
  };

  /** Summary statistics */
  summary: {
    /** Total symbols in file */
    symbolCount: number;

    /** Total relationships */
    relationshipCount: number;

    /** Test coverage percentage */
    testCoverage: number;

    /** Documentation coverage */
    documentationCoverage: number;

    /** Relationship density */
    density: number;
  };

  /** Impact analysis */
  impact: {
    /** Files that depend on this file */
    dependentFiles: Set<string>;

    /** Files this file depends on */
    dependencyFiles: Set<string>;

    /** Test files covering this file */
    testFiles: Set<string>;

    /** Documentation referencing this file */
    documentationFiles: Set<string>;
  };
}

/**
 * Enhanced Work Context Analyzer
 *
 * Analyzes a file and provides comprehensive context using relationship graph.
 *
 * @public
 * @example
 * ```typescript
 * const analyzer = new EnhancedWorkContextAnalyzer(dbManager);
 * const context = analyzer.analyze('/path/to/file.ts');
 *
 * console.log(`Symbols: ${context.summary.symbolCount}`);
 * console.log(`Tests: ${context.relationships.tests.length}`);
 * console.log(`Dependencies: ${context.relationships.dependencies.length}`);
 * ```
 */
export class EnhancedWorkContextAnalyzer {
  private db: DatabaseManager;
  private queryEngine: RelationshipQueryEngine;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.queryEngine = new RelationshipQueryEngine(db);
  }

  /**
   * Analyze a file and provide comprehensive work context
   *
   * @param filePath - Absolute path to the file
   * @returns Enhanced work context
   *
   * @example
   * ```typescript
   * const context = analyzer.analyze('/src/DatabaseManager.ts');
   *
   * // Documentation
   * context.relationships.documentation.forEach(doc => {
   *   console.log(`${doc.symbolName} → [[${doc.docRef}]]`);
   * });
   *
   * // Test coverage
   * console.log(`Test coverage: ${context.summary.testCoverage}%`);
   * ```
   */
  analyze(filePath: string): EnhancedWorkContext {
    // Get all symbols in this file
    const allSymbols = this.db.getAllSymbols();

    // Normalize path: try both absolute and relative
    const cwd = process.cwd();
    const relativePath = path.relative(cwd, filePath);

    // Try both absolute and relative paths
    const fileSymbols = allSymbols.filter(s =>
      s.filePath === filePath || s.filePath === relativePath
    );

    // Initialize context
    const context: EnhancedWorkContext = {
      filePath,
      symbols: fileSymbols,
      relationships: {
        total: 0,
        documentation: [],
        tests: [],
        dependencies: [],
        dependents: [],
        semanticNeighbors: [],
      },
      summary: {
        symbolCount: fileSymbols.length,
        relationshipCount: 0,
        testCoverage: 0,
        documentationCoverage: 0,
        density: 0,
      },
      impact: {
        dependentFiles: new Set(),
        dependencyFiles: new Set(),
        testFiles: new Set(),
        documentationFiles: new Set(),
      },
    };

    if (fileSymbols.length === 0) {
      return context;
    }

    // Analyze each symbol's relationships
    for (const symbol of fileSymbols) {
      const symbolContext = this.queryEngine.getContext(symbol.id);

      context.relationships.total += symbolContext.direct.length;

      // Documentation
      for (const docRef of symbolContext.documentation) {
        context.relationships.documentation.push({
          symbolId: symbol.id,
          symbolName: symbol.name,
          docRef: docRef.replace('doc:', ''),
        });

        // Track documentation files
        const docPath = this.resolveDocPath(docRef);
        if (docPath) {
          context.impact.documentationFiles.add(docPath);
        }
      }

      // Tests
      for (const testId of symbolContext.tests) {
        const testSymbol = this.db.getSymbol(testId);
        if (testSymbol) {
          context.relationships.tests.push({
            symbolId: symbol.id,
            symbolName: symbol.name,
            testId,
            testName: testSymbol.name,
          });

          // Track test files
          context.impact.testFiles.add(testSymbol.filePath);
        }
      }

      // Dependencies
      for (const depId of symbolContext.dependencies) {
        const depSymbol = this.db.getSymbol(depId);
        if (depSymbol) {
          context.relationships.dependencies.push({
            symbolId: symbol.id,
            symbolName: symbol.name,
            depId,
            depName: depSymbol.name,
          });

          // Track dependency files
          if (depSymbol.filePath !== filePath) {
            context.impact.dependencyFiles.add(depSymbol.filePath);
          }
        }
      }

      // Find dependents (symbols that depend on this symbol)
      const dependents = this.findDependents(symbol.id);
      for (const depId of dependents) {
        const depSymbol = this.db.getSymbol(depId);
        if (depSymbol) {
          context.relationships.dependents.push({
            symbolId: symbol.id,
            symbolName: symbol.name,
            depId,
            depName: depSymbol.name,
          });

          // Track dependent files
          if (depSymbol.filePath !== filePath) {
            context.impact.dependentFiles.add(depSymbol.filePath);
          }
        }
      }

      // Semantic neighbors
      for (const neighborId of symbolContext.semanticNeighbors) {
        const neighborSymbol = this.db.getSymbol(neighborId);
        if (neighborSymbol) {
          context.relationships.semanticNeighbors.push({
            symbolId: symbol.id,
            symbolName: symbol.name,
            neighborId,
            neighborName: neighborSymbol.name,
          });
        }
      }
    }

    // Calculate summary statistics
    context.summary.relationshipCount = context.relationships.total;
    context.summary.density = fileSymbols.length > 0
      ? context.relationships.total / fileSymbols.length
      : 0;

    // Test coverage: percentage of symbols with tests
    const symbolsWithTests = new Set(context.relationships.tests.map(t => t.symbolId));
    context.summary.testCoverage = fileSymbols.length > 0
      ? (symbolsWithTests.size / fileSymbols.length) * 100
      : 0;

    // Documentation coverage: percentage of symbols with docs
    const symbolsWithDocs = new Set(context.relationships.documentation.map(d => d.symbolId));
    context.summary.documentationCoverage = fileSymbols.length > 0
      ? (symbolsWithDocs.size / fileSymbols.length) * 100
      : 0;

    return context;
  }

  /**
   * Find symbols that depend on the given symbol
   * @private
   */
  private findDependents(symbolId: string): string[] {
    const allRels = this.db.getAllUnifiedRelationships();
    const dependents: string[] = [];

    for (const rel of allRels) {
      if (rel.type !== 'code-dependency') continue;

      const from = Array.isArray(rel.from) ? rel.from : [rel.from];
      const to = Array.isArray(rel.to) ? rel.to : [rel.to];

      // If this symbol is in 'to', then 'from' symbols depend on it
      if (to.includes(symbolId)) {
        dependents.push(...from.filter(f => f !== symbolId));
      }
    }

    return dependents;
  }

  /**
   * Resolve document reference to file path
   * @private
   */
  private resolveDocPath(docRef: string): string | null {
    // Remove 'doc:' prefix if present
    const cleanRef = docRef.replace(/^doc:/, '');

    // Try common documentation directories
    const docDirs = ['managed', 'docs', 'documentation'];
    const extensions = ['.md', '.mdx'];

    for (const dir of docDirs) {
      for (const ext of extensions) {
        const tryPath = path.join(process.cwd(), dir, cleanRef + ext);
        if (fs.existsSync(tryPath)) {
          return tryPath;
        }

        // Try with lowercase
        const tryPathLower = path.join(process.cwd(), dir, cleanRef.toLowerCase() + ext);
        if (fs.existsSync(tryPathLower)) {
          return tryPathLower;
        }
      }
    }

    return null;
  }
}
