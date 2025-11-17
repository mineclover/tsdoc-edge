/**
 * Import Statement Analyzer
 *
 * Analyzes import statements in test files to determine which symbols are being tested.
 * This provides more accurate symbol resolution than variable name matching.
 *
 * @module ImportAnalyzer
 */

import * as ts from 'typescript';

/**
 * Represents an imported symbol in a test file
 */
export interface ImportedSymbol {
  /** The local name used in the test file */
  localName: string;
  /** The original exported name from the source module */
  exportedName: string;
  /** The source module path (e.g., '../storage/DatabaseManager') */
  modulePath: string;
  /** Whether this is a type-only import */
  isTypeOnly: boolean;
  /** Whether this is a namespace import (import * as foo) */
  isNamespaceImport: boolean;
}

/**
 * Result of import analysis
 */
export interface ImportAnalysisResult {
  /** All imported symbols from the test file */
  imports: ImportedSymbol[];
  /** Map of local names to imported symbols for quick lookup */
  importMap: Map<string, ImportedSymbol>;
}

/**
 * Analyzes import statements in TypeScript test files
 */
export class ImportAnalyzer {
  /**
   * Analyze imports from a TypeScript source file
   *
   * @param sourceCode - The source code to analyze
   * @returns Analysis result containing all imports
   */
  analyzeImports(sourceCode: string): ImportAnalysisResult {
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const imports: ImportedSymbol[] = [];
    const importMap = new Map<string, ImportedSymbol>();

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        this.processImportDeclaration(node, imports, importMap);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return { imports, importMap };
  }

  /**
   * Process a single import declaration node
   */
  private processImportDeclaration(
    node: ts.ImportDeclaration,
    imports: ImportedSymbol[],
    importMap: Map<string, ImportedSymbol>
  ): void {
    if (!node.importClause) return;

    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const modulePath = moduleSpecifier.text;
    const isTypeOnly = node.importClause.isTypeOnly || false;

    // Handle default import: import Foo from './foo'
    if (node.importClause.name) {
      const localName = node.importClause.name.text;
      const importedSymbol: ImportedSymbol = {
        localName,
        exportedName: 'default',
        modulePath,
        isTypeOnly,
        isNamespaceImport: false,
      };
      imports.push(importedSymbol);
      importMap.set(localName, importedSymbol);
    }

    // Handle named imports: import { Foo, Bar as Baz } from './foo'
    const namedBindings = node.importClause.namedBindings;
    if (namedBindings) {
      if (ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) {
          const localName = element.name.text;
          const exportedName = element.propertyName
            ? element.propertyName.text
            : localName;

          const importedSymbol: ImportedSymbol = {
            localName,
            exportedName,
            modulePath,
            isTypeOnly: isTypeOnly || element.isTypeOnly,
            isNamespaceImport: false,
          };
          imports.push(importedSymbol);
          importMap.set(localName, importedSymbol);
        }
      } else if (ts.isNamespaceImport(namedBindings)) {
        // Handle namespace import: import * as Foo from './foo'
        const localName = namedBindings.name.text;
        const importedSymbol: ImportedSymbol = {
          localName,
          exportedName: '*',
          modulePath,
          isTypeOnly,
          isNamespaceImport: true,
        };
        imports.push(importedSymbol);
        importMap.set(localName, importedSymbol);
      }
    }
  }

  /**
   * Extract the symbol name from a module path
   *
   * @param modulePath - Module path like '../storage/DatabaseManager'
   * @returns Symbol name like 'DatabaseManager' or null if cannot extract
   *
   * @example
   * extractSymbolFromPath('../storage/DatabaseManager') // 'DatabaseManager'
   * extractSymbolFromPath('../../types/graph') // 'graph'
   */
  extractSymbolFromPath(modulePath: string): string | null {
    // Skip node modules
    if (!modulePath.startsWith('.')) {
      return null;
    }

    // Get the last segment of the path
    const segments = modulePath.split('/');
    const lastSegment = segments[segments.length - 1];

    // Remove file extension if present
    const symbolName = lastSegment.replace(/\.(ts|tsx|js|jsx)$/, '');

    return symbolName;
  }

  /**
   * Resolve imported symbols to potential implementation symbol IDs
   *
   * This maps local names used in tests to the actual symbol IDs in the database.
   * For example, if a test imports `DatabaseManager`, this will return potential
   * symbol IDs like 'database-manager'.
   *
   * @param imports - Import analysis result
   * @returns Map of local names to potential symbol IDs
   */
  resolveImportedSymbols(imports: ImportedSymbol[]): Map<string, string[]> {
    const symbolMap = new Map<string, string[]>();

    for (const imp of imports) {
      // Skip type-only imports (they're not tested, just used for types)
      if (imp.isTypeOnly) {
        continue;
      }

      const potentialSymbols: string[] = [];

      // Use the exported name as the primary symbol name
      if (imp.exportedName !== 'default' && imp.exportedName !== '*') {
        potentialSymbols.push(this.toKebabCase(imp.exportedName));
      }

      // Also try extracting from module path
      const pathSymbol = this.extractSymbolFromPath(imp.modulePath);
      if (pathSymbol) {
        potentialSymbols.push(this.toKebabCase(pathSymbol));
      }

      // Use local name as fallback
      if (imp.localName !== imp.exportedName) {
        potentialSymbols.push(this.toKebabCase(imp.localName));
      }

      if (potentialSymbols.length > 0) {
        symbolMap.set(imp.localName, [...new Set(potentialSymbols)]); // Remove duplicates
      }
    }

    return symbolMap;
  }

  /**
   * Convert a symbol name to kebab-case
   *
   * @param name - Symbol name in any case
   * @returns kebab-case version
   */
  private toKebabCase(name: string): string {
    return name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}
