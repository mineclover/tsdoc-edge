/**
 * Implementation Analyzer
 *
 * @doc [[ImplementationAnalyzer]]
 * @packageDocumentation
 * @responsibility Detect implementation relationships (class implements interface)
 *
 * @problem Interface implementation relationships are not tracked in unified system
 * @solves Static analysis of implements clauses in TypeScript classes
 * @context Essential for understanding polymorphism and abstraction
 *
 * @functionality
 * - Detect class implements interface relationships
 * - Track inheritance hierarchies
 * - Support multiple interface implementation
 */

import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Implementation relationship
 */
interface Implementation {
  class: string;
  interface: string;
  filePath: string;
  line: number;
  confidence: number;
}

/**
 * Implementation Analyzer
 *
 * @public
 * @responsibility Detect and analyze implementation relationships
 */
export class ImplementationAnalyzer {
  private graph: SymbolGraph;
  private program: ts.Program | null = null;

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program || null;
  }

  /**
   * Set TypeScript program for AST analysis
   *
   * @param program - TypeScript program
   * @public
   */
  setProgram(program: ts.Program): void {
    this.program = program;
  }

  /**
   * Analyze all implementation relationships
   *
   * @returns Array of implementation relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    if (!this.program) {
      console.warn('ImplementationAnalyzer: No program provided, cannot analyze implementations');
      return [];
    }

    const implementations = this.detectImplementations();
    relationships.push(...this.createImplementationRelationships(implementations));

    return relationships;
  }

  /**
   * Detect implementation relationships
   *
   * @returns Array of implementations
   * @private
   */
  private detectImplementations(): Implementation[] {
    if (!this.program) return [];

    const implementations: Implementation[] = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      this.extractImplementations(sourceFile, filePath, implementations);
    }

    return implementations;
  }

  /**
   * Extract implementations from source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param implementations - Array to collect implementations
   * @private
   */
  private extractImplementations(
    sourceFile: ts.SourceFile,
    filePath: string,
    implementations: Implementation[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        // class MyClass implements IInterface
        if (ts.isClassDeclaration(node) && node.name && node.heritageClauses) {
          const className = node.name.text;
          const classSymbol = this.findSymbolByName(className);

          if (classSymbol) {
            for (const clause of node.heritageClauses) {
              // Only process implements clauses (not extends)
              if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                for (const type of clause.types) {
                  const interfaceName = type.expression.getText(sourceFile);
                  const interfaceSymbol = this.findSymbolByName(interfaceName);

                  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

                  implementations.push({
                    class: classSymbol,
                    interface: interfaceSymbol || `interface:${interfaceName}`,
                    filePath,
                    line,
                    confidence: interfaceSymbol ? 1.0 : 0.8,
                  });
                }
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      } catch (error) {
        // Skip this node on error
        return;
      }
    };

    visit(sourceFile);
  }

  /**
   * Find symbol ID by name
   *
   * @param name - Symbol name
   * @returns Symbol ID or null
   * @private
   */
  private findSymbolByName(name: string): string | null {
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      if (symbol.name === name) {
        return symbolId;
      }
    }
    return null;
  }

  /**
   * Create relationships from implementations
   *
   * @param implementations - Implementation patterns
   * @returns Array of relationships
   * @private
   */
  private createImplementationRelationships(implementations: Implementation[]): UnifiedRelationship[] {
    return implementations.map((impl) => ({
      id: `implementation-${impl.class}-${impl.interface}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'implementation',
      category: 'structural',
      from: impl.class,
      to: impl.interface,
      direction: 'unidirectional',
      strength: 'strong',
      evidence: [
        {
          type: 'code',
          source: impl.filePath,
          lineNumber: impl.line,
          confidence: impl.confidence,
        },
      ],
      discoveredBy: 'ast-parsing',
      confidence: impl.confidence,
      properties: {
        className: impl.class,
        interfaceName: impl.interface,
      },
      description: `${impl.class} implements ${impl.interface}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Get statistics about implementations
   *
   * @param relationships - Implementation relationships
   * @returns Statistics object
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalImplementations: number;
    byInterface: Record<string, number>;
    averageImplementationsPerInterface: number;
  } {
    const stats = {
      totalImplementations: relationships.length,
      byInterface: {} as Record<string, number>,
      averageImplementationsPerInterface: 0,
    };

    for (const rel of relationships) {
      const interfaceName = String(rel.to);
      stats.byInterface[interfaceName] = (stats.byInterface[interfaceName] || 0) + 1;
    }

    const interfaceCount = Object.keys(stats.byInterface).length;
    if (interfaceCount > 0) {
      stats.averageImplementationsPerInterface =
        stats.totalImplementations / interfaceCount;
    }

    return stats;
  }
}
