/**
 * Test Relationship Analyzer
 *
 * @packageDocumentation
 * @responsibility Detect test-coverage relationships between test files and source symbols
 *
 * @problem Test files test source symbols but no explicit relationship is tracked
 * @solves Automatic detection of test→source relationships via import analysis and naming conventions
 * @context Essential for understanding test coverage and code quality
 *
 * @functionality
 * - Detect test files (*.test.ts, *.spec.ts)
 * - Extract imports from test files
 * - Map test files to source symbols
 * - Build test-coverage relationships
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Test import information
 */
interface TestImport {
  testFilePath: string;
  importedSymbol: string;
  sourceFilePath: string;
}

/**
 * Test Relationship Analyzer
 *
 * @public
 * @responsibility Detect and analyze test-coverage relationships
 */
export class TestRelationshipAnalyzer {
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
   * Analyze test coverage relationships across all test files
   *
   * @returns Array of test-coverage relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    if (!this.program) {
      console.warn('TestRelationshipAnalyzer: No program provided, cannot analyze tests');
      return [];
    }

    const relationships: UnifiedRelationship[] = [];
    const testImports: TestImport[] = [];

    // Extract imports from all test files
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Check if this is a test file
      if (!this.isTestFile(filePath)) continue;

      // Extract imports from this test file
      const imports = this.extractImports(sourceFile);
      testImports.push(...imports);
    }

    // Create relationships for each import
    for (const testImport of testImports) {
      // Find the symbol ID for the imported symbol
      const targetSymbol = this.findSymbolByName(testImport.importedSymbol);
      if (!targetSymbol) continue;

      // Find or create a test symbol for the test file
      const testSymbolId = this.getTestFileSymbolId(testImport.testFilePath);

      // Create relationship
      const relationship: UnifiedRelationship = {
        id: `test-coverage-${testSymbolId}-${targetSymbol.id}`,
        type: 'test-coverage',
        category: 'verification',
        from: testSymbolId,
        to: targetSymbol.id,
        direction: 'unidirectional',
        strength: 'strong',
        evidence: [
          {
            type: 'code',
            source: testImport.testFilePath,
            confidence: 0.9,
            snippet: `import { ${testImport.importedSymbol} } from '...'`,
          },
        ],
        discoveredBy: 'static-analysis',
        confidence: 0.9,
        filePath: testImport.testFilePath,
        description: `Test file ${path.basename(testImport.testFilePath)} tests ${testImport.importedSymbol}`,
        properties: {
          sourceFile: testImport.sourceFilePath,
          testFile: testImport.testFilePath,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      relationships.push(relationship);
    }

    return relationships;
  }

  /**
   * Check if a file is a test file
   *
   * @param filePath - File path to check
   * @returns True if test file
   */
  private isTestFile(filePath: string): boolean {
    return /\.(test|spec)\.tsx?$/.test(filePath);
  }

  /**
   * Extract imports from a test file
   *
   * @param sourceFile - Test source file
   * @returns Array of test imports
   */
  private extractImports(sourceFile: ts.SourceFile): TestImport[] {
    const imports: TestImport[] = [];
    const testFilePath = sourceFile.fileName.replace(/\\/g, '/');

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (!ts.isStringLiteral(moduleSpecifier)) return;

        const modulePath = moduleSpecifier.text;

        // Skip external modules
        if (!modulePath.startsWith('.') && !modulePath.startsWith('/')) return;

        // Resolve source file path
        const sourceFilePath = this.resolveImportPath(testFilePath, modulePath);

        // Extract imported symbols
        if (node.importClause) {
          // Default import
          if (node.importClause.name) {
            imports.push({
              testFilePath,
              importedSymbol: node.importClause.name.text,
              sourceFilePath,
            });
          }

          // Named imports
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const element of node.importClause.namedBindings.elements) {
                imports.push({
                  testFilePath,
                  importedSymbol: element.name.text,
                  sourceFilePath,
                });
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Resolve import path to absolute file path
   *
   * @param testFilePath - Test file path
   * @param importPath - Import module path
   * @returns Resolved source file path
   */
  private resolveImportPath(testFilePath: string, importPath: string): string {
    const testDir = path.dirname(testFilePath);
    let resolved = path.resolve(testDir, importPath);

    // Try with .ts extension
    if (!resolved.endsWith('.ts')) {
      resolved += '.ts';
    }

    return resolved.replace(/\\/g, '/');
  }

  /**
   * Find symbol by name in the graph
   *
   * @param symbolName - Symbol name to find
   * @returns Symbol or undefined
   */
  private findSymbolByName(symbolName: string): { id: string; name: string } | undefined {
    for (const [symbolId, symbol] of Object.entries(this.graph.symbols)) {
      if (symbol.name === symbolName || symbol.name.endsWith(`.${symbolName}`)) {
        return { id: symbolId, name: symbol.name };
      }
    }
    return undefined;
  }

  /**
   * Get or create a symbol ID for a test file
   *
   * @param testFilePath - Test file path
   * @returns Symbol ID for the test file
   */
  private getTestFileSymbolId(testFilePath: string): string {
    const basename = path.basename(testFilePath, '.ts');
    return `test-file-${basename}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get test coverage statistics
   *
   * @param relationships - Test coverage relationships
   * @returns Coverage statistics
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalTests: number;
    testedSymbols: Set<string>;
    untestedSymbols: string[];
    coveragePercentage: number;
  } {
    const testedSymbols = new Set<string>();
    for (const rel of relationships) {
      if (rel.type === 'test-coverage') {
        testedSymbols.add(rel.to as string);
      }
    }

    const totalSymbols = Object.keys(this.graph.symbols).length;
    const untestedSymbols = Object.keys(this.graph.symbols).filter(
      (id) => !testedSymbols.has(id)
    );

    return {
      totalTests: relationships.length,
      testedSymbols,
      untestedSymbols,
      coveragePercentage: totalSymbols > 0 ? (testedSymbols.size / totalSymbols) * 100 : 0,
    };
  }
}
