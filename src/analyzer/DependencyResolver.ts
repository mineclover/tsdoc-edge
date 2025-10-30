/**
 * Dependency resolver
 * Resolves import paths to symbol relationships
 *
 * @packageDocumentation
 */

import * as path from 'node:path';
import type { SymbolRelationship } from '../types/graph';
import type { ExtractedSymbol } from './ASTSymbolExtractor';

/**
 * Import information
 */
export interface ImportInfo {
  from: string;
  imported: string[];
  modulePath: string;
}

/**
 * Dependency resolver
 *
 * @public
 * @responsibility Resolve import paths to actual symbol relationships
 */
export class DependencyResolver {
  private symbolsByFile: Map<string, ExtractedSymbol[]> = new Map();
  private symbolsByName: Map<string, ExtractedSymbol[]> = new Map();

  /**
   * Index symbols for quick lookup
   *
   * @param symbols - All extracted symbols
   */
  indexSymbols(symbols: ExtractedSymbol[]): void {
    this.symbolsByFile.clear();
    this.symbolsByName.clear();

    for (const symbol of symbols) {
      // Index by file
      const fileSymbols = this.symbolsByFile.get(symbol.filePath) || [];
      fileSymbols.push(symbol);
      this.symbolsByFile.set(symbol.filePath, fileSymbols);

      // Index by name
      const nameSymbols = this.symbolsByName.get(symbol.name) || [];
      nameSymbols.push(symbol);
      this.symbolsByName.set(symbol.name, nameSymbols);
    }
  }

  /**
   * Resolve imports to symbol relationships
   *
   * @param imports - Import information
   * @param projectRoot - Project root directory
   * @returns Array of symbol relationships
   */
  resolveImports(imports: ImportInfo[], projectRoot: string): SymbolRelationship[] {
    const relationships: SymbolRelationship[] = [];

    for (const importInfo of imports) {
      // Get top-level exported symbols from source file
      // If no exported symbols, use the first symbol in file (for entry points like cli.ts)
      const allSourceSymbols = this.symbolsByFile.get(importInfo.from) || [];
      const exportedSymbols = allSourceSymbols.filter((s) => s.isExported && !s.parentSymbol);

      const sourceSymbols = exportedSymbols.length > 0
        ? exportedSymbols
        : allSourceSymbols.filter((s) => !s.parentSymbol).slice(0, 1); // Take first top-level symbol

      if (sourceSymbols.length === 0) continue;

      // Resolve module path to file path
      const targetFilePath = this.resolveModulePath(
        importInfo.from,
        importInfo.modulePath,
        projectRoot
      );

      if (!targetFilePath) continue;

      const targetSymbols = this.symbolsByFile.get(targetFilePath) || [];

      // Create relationships for each imported symbol
      for (const importedName of importInfo.imported) {
        const targetSymbol = targetSymbols.find(
          (s) => s.name === importedName && s.isExported
        );

        if (!targetSymbol) continue;

        // Each symbol in source file depends on the imported symbol
        for (const sourceSymbol of sourceSymbols) {
          relationships.push({
            type: 'dependsOn',
            from: sourceSymbol.name,
            to: targetSymbol.name,
            description: `${importInfo.from} imports ${importedName} from ${importInfo.modulePath}`,
            filePath: importInfo.from,
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Resolve module path to absolute file path
   *
   * @param fromFile - Source file path
   * @param modulePath - Module path from import statement
   * @param projectRoot - Project root directory
   * @returns Resolved file path or undefined
   */
  private resolveModulePath(
    fromFile: string,
    modulePath: string,
    projectRoot: string
  ): string | undefined {
    // Skip external modules
    if (!modulePath.startsWith('.') && !modulePath.startsWith('/')) {
      return undefined;
    }

    // fromFile is relative path, resolve relative to it
    const fromDir = path.dirname(fromFile);

    // Resolve the module path relative to fromDir
    let resolved = path.join(fromDir, modulePath);

    // Normalize path separators
    resolved = resolved.replace(/\\/g, '/');

    // Try common extensions
    const extensions = ['.ts', '.tsx', '/index.ts', '/index.tsx', ''];
    for (const ext of extensions) {
      const candidate = resolved + ext;
      if (this.symbolsByFile.has(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  /**
   * Find symbol by name
   *
   * @param name - Symbol name
   * @returns Matching symbols
   */
  findSymbolByName(name: string): ExtractedSymbol[] {
    return this.symbolsByName.get(name) || [];
  }

  /**
   * Get all symbols in a file
   *
   * @param filePath - File path
   * @returns Symbols in the file
   */
  getSymbolsInFile(filePath: string): ExtractedSymbol[] {
    return this.symbolsByFile.get(filePath) || [];
  }
}
