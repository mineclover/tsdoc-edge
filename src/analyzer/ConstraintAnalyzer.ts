/**
 * Constraint Analyzer
 *
 * @doc [[ConstraintAnalyzer]]
 * @packageDocumentation
 * @responsibility Detect co-requirement relationships
 *
 * @problem Features may have implicit constraints that aren't documented
 * @solves Static analysis of configuration, imports, and usage patterns
 * @context Essential for preventing invalid configurations and feature combinations
 *
 * @functionality
 * - Detect co-requirements through complementary imports
 * - Detect paired features that always appear together
 */

import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';
import { CoRequirementAnalyzer } from './CoRequirementAnalyzer';

/**
 * Co-requirement constraint
 */
interface CoRequirement {
  symbolA: string;
  symbolB: string;
  reason: string;
  evidence: Array<{ file: string; line: number }>;
  confidence: number;
}

/**
 * Constraint Analyzer
 *
 * @public
 * @responsibility Detect and analyze constraint relationships
 */
export class ConstraintAnalyzer {
  private graph: SymbolGraph;
  private program: ts.Program | null = null;
  private projectRoot: string;

  constructor(graph: SymbolGraph, projectRoot: string, program?: ts.Program) {
    this.graph = graph;
    this.projectRoot = projectRoot;
    this.program = program || null;
  }

  /**
   * Set TypeScript program for AST analysis
   *
   * @param program - TypeScript program
   * @returns void - No return value
   * @public
   */
  setProgram(program: ts.Program): void {
    this.program = program;
  }

  /**
   * Analyze all constraint relationships
   *
   * @returns Array of constraint relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    // Detect co-requirements from @requires tags (primary method)
    const coReqAnalyzer = new CoRequirementAnalyzer(this.graph);
    const coReqFromTags = coReqAnalyzer.analyze(this.projectRoot);
    relationships.push(...coReqFromTags);

    // Also detect co-requirements from code patterns (secondary method)
    if (this.program) {
      const coRequirements = this.detectCoRequirements();
      relationships.push(...this.createCoRequirementRelationships(coRequirements));
    }

    return relationships;
  }

  /**
   * Detect co-requirement constraints from code patterns
   *
   * @returns Array of co-requirement constraints
   * @private
   */
  private detectCoRequirements(): CoRequirement[] {
    if (!this.program) return [];

    const coRequirements: CoRequirement[] = [];
    const importPairs = new Map<string, Map<string, Array<{ file: string; line: number }>>>();

    // Analyze import patterns across all source files
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      // Extract imports from this file
      const imports = this.extractImports(sourceFile, filePath);

      // Track co-occurrences of imports
      for (let i = 0; i < imports.length; i++) {
        for (let j = i + 1; j < imports.length; j++) {
          const symbolA = imports[i].symbol;
          const symbolB = imports[j].symbol;

          // Sort to create consistent key
          const [first, second] = symbolA < symbolB ? [symbolA, symbolB] : [symbolB, symbolA];

          if (!importPairs.has(first)) {
            importPairs.set(first, new Map());
          }

          const secondMap = importPairs.get(first)!;
          if (!secondMap.has(second)) {
            secondMap.set(second, []);
          }

          secondMap.get(second)?.push({
            file: filePath,
            line: Math.min(imports[i].line, imports[j].line),
          });
        }
      }
    }

    // Convert frequent co-occurrences to co-requirements
    for (const [symbolA, pairMap] of importPairs.entries()) {
      for (const [symbolB, evidence] of pairMap.entries()) {
        // If symbols appear together in 3+ files, consider it a co-requirement
        if (evidence.length >= 3) {
          coRequirements.push({
            symbolA,
            symbolB,
            reason: `Always imported together in ${evidence.length} files`,
            evidence,
            confidence: Math.min(0.95, 0.5 + evidence.length * 0.1),
          });
        }
      }
    }

    // Detect specific known co-requirement patterns
    coRequirements.push(...this.detectKnownCoRequirements());

    return coRequirements;
  }

  /**
   * Extract imports from a source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @returns Array of imported symbols
   * @private
   */
  private extractImports(
    sourceFile: ts.SourceFile,
    _filePath: string
  ): Array<{ symbol: string; line: number }> {
    const imports: Array<{ symbol: string; line: number }> = [];

    const visit = (node: ts.Node): void => {
      try {
        // import { A, B } from 'module'
        if (ts.isImportDeclaration(node)) {
          const clause = node.importClause;
          if (clause?.namedBindings) {
            if (ts.isNamedImports(clause.namedBindings)) {
              for (const element of clause.namedBindings.elements) {
                try {
                  if (!element || !element.name) continue;

                  const symbolName = element.name.text;
                  if (!symbolName) continue;

                  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

                  // Try to find symbol in graph
                  const symbolId = this.findSymbolByName(symbolName);
                  if (symbolId) {
                    imports.push({ symbol: symbolId, line });
                  }
                } catch (_error) {}
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      } catch (_error) {
        // Skip this node on error
        return;
      }
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Detect known co-requirement patterns
   *
   * @returns Array of co-requirement constraints
   * @private
   */
  private detectKnownCoRequirements(): CoRequirement[] {
    const coRequirements: CoRequirement[] = [];

    // Check for React + ReactDOM pattern
    const react = this.findSymbolByName('React');
    const reactDOM = this.findSymbolByName('ReactDOM');

    if (react && reactDOM) {
      coRequirements.push({
        symbolA: react,
        symbolB: reactDOM,
        reason: 'React requires ReactDOM for rendering',
        evidence: [{ file: 'package.json', line: 0 }],
        confidence: 0.95,
      });
    }

    // Check for Express + body-parser pattern
    const express = this.findSymbolByName('express');
    const bodyParser = this.findSymbolByName('body-parser');

    if (express && bodyParser) {
      coRequirements.push({
        symbolA: express,
        symbolB: bodyParser,
        reason: 'Express typically requires body-parser for JSON requests',
        evidence: [{ file: 'package.json', line: 0 }],
        confidence: 0.7,
      });
    }

    return coRequirements;
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
   * Create relationships from co-requirement constraints
   *
   * @param coRequirements - Co-requirement constraints
   * @returns Array of relationships
   * @private
   */
  private createCoRequirementRelationships(coRequirements: CoRequirement[]): UnifiedRelationship[] {
    return coRequirements.map((req) => ({
      id: `co-requirement-${req.symbolA}-${req.symbolB}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'co-requirement',
      category: 'constraint',
      from: req.symbolA,
      to: req.symbolB,
      direction: 'bidirectional',
      strength: 'medium',
      evidence: req.evidence.map((e) => ({
        type: 'code',
        source: e.file,
        lineNumber: e.line,
        confidence: req.confidence,
      })),
      discoveredBy: 'ast-parsing',
      confidence: req.confidence,
      properties: {
        reason: req.reason,
        occurrences: req.evidence.length,
      },
      description: req.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Get statistics about constraints
   *
   * @param relationships - Constraint relationships
   * @returns Statistics object
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalConstraints: number;
    coRequirements: number;
    bySource: Record<string, number>;
  } {
    const stats = {
      totalConstraints: relationships.length,
      coRequirements: 0,
      bySource: {} as Record<string, number>,
    };

    for (const rel of relationships) {
      if (rel.type === 'co-requirement') {
        stats.coRequirements++;
      }

      const source = rel.discoveredBy || 'unknown';
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
    }

    return stats;
  }
}
