/**
 * Document symbol registry with SSOT validation
 * @packageDocumentation
 * @responsibility Manage document symbols and enforce SSOT
 */

import type {
  CodeConnection,
  DocSymbolError,
  DocSymbolValidation,
  DocSymbolWarning,
  DocumentSymbol,
  ParsedDocSymbols,
} from '../types/feature';

/**
 * Registry for document symbols with SSOT enforcement
 *
 * @doc [[DocumentSymbolSystem#Registry]]
 * @public
 * @responsibility Store and validate document symbols
 */
export class DocumentSymbolRegistry {
  private definitions: Map<string, DocumentSymbol> = new Map();
  private auxiliaries: Map<string, DocumentSymbol[]> = new Map();
  private references: Map<string, DocumentSymbol[]> = new Map();
  private codeConnections: Map<string, CodeConnection[]> = new Map();

  /**
   * Register a parsed document
   *
   * @param symbols - Parsed document symbols
   * @throws {Error} If duplicate primary definition in same file
   */
  registerDocument(symbols: ParsedDocSymbols): void {
    // Register primary definition
    if (symbols.primary) {
      this.registerPrimary(symbols.primary);
    }

    // Register auxiliary definitions
    for (const aux of symbols.auxiliaries) {
      this.registerAuxiliary(aux);
    }

    // Register references
    for (const ref of symbols.references) {
      this.registerReference(ref);
    }
  }

  /**
   * Register primary definition
   */
  private registerPrimary(symbol: DocumentSymbol): void {
    // Check for duplicate
    const existing = this.definitions.get(symbol.name);
    if (existing) {
      throw new Error(
        `Duplicate primary definition for [[${symbol.name}]]:\n` +
          `  1. ${existing.filePath}:${existing.line}\n` +
          `  2. ${symbol.filePath}:${symbol.line}`
      );
    }

    this.definitions.set(symbol.name, symbol);
  }

  /**
   * Register auxiliary definition
   */
  private registerAuxiliary(symbol: DocumentSymbol): void {
    const existing = this.auxiliaries.get(symbol.name) || [];
    existing.push(symbol);
    this.auxiliaries.set(symbol.name, existing);
  }

  /**
   * Register reference
   */
  private registerReference(symbol: DocumentSymbol): void {
    const existing = this.references.get(symbol.name) || [];
    existing.push(symbol);
    this.references.set(symbol.name, existing);
  }

  /**
   * Register code connection
   *
   * @param connection - Code connection
   */
  registerCodeConnection(connection: CodeConnection): void {
    const existing = this.codeConnections.get(connection.docSymbol) || [];
    existing.push(connection);
    this.codeConnections.set(connection.docSymbol, existing);
  }

  /**
   * Get primary definition for symbol
   *
   * @param name - Symbol name
   * @returns Definition or undefined
   */
  getDefinition(name: string): DocumentSymbol | undefined {
    return this.definitions.get(name);
  }

  /**
   * Get auxiliary definitions for symbol
   *
   * @param name - Symbol name
   * @returns Auxiliary definitions
   */
  getAuxiliaries(name: string): DocumentSymbol[] {
    return this.auxiliaries.get(name) || [];
  }

  /**
   * Get all references to symbol
   *
   * @param name - Symbol name
   * @returns References
   */
  getReferences(name: string): DocumentSymbol[] {
    return this.references.get(name) || [];
  }

  /**
   * Get code connections for symbol
   *
   * @param name - Symbol name
   * @returns Code connections
   */
  getCodeConnections(name: string): CodeConnection[] {
    return this.codeConnections.get(name) || [];
  }

  /**
   * Get all defined symbol names
   *
   * @returns Symbol names
   */
  getAllSymbolNames(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Validate SSOT rules
   *
   * @returns Validation result
   */
  validate(): DocSymbolValidation {
    const errors: DocSymbolError[] = [];
    const warnings: DocSymbolWarning[] = [];

    // Check for orphaned auxiliaries
    for (const [name, auxList] of this.auxiliaries.entries()) {
      const primary = this.definitions.get(name);

      if (!primary) {
        for (const aux of auxList) {
          errors.push({
            type: 'orphaned_auxiliary',
            symbolName: name,
            filePath: aux.filePath,
            line: aux.line,
            message: `Auxiliary definition [[${name}]] has no primary (H1) definition`,
          });
        }
      }
    }

    // Check for references to undefined symbols
    for (const [name, refList] of this.references.entries()) {
      const primary = this.definitions.get(name);

      if (!primary) {
        for (const ref of refList) {
          errors.push({
            type: 'missing_primary',
            symbolName: name,
            filePath: ref.filePath,
            line: ref.line,
            message: `Reference to undefined symbol [[${name}]]`,
          });
        }
      }
    }

    // Check for unused definitions
    for (const [name, definition] of this.definitions.entries()) {
      const refs = this.references.get(name) || [];
      const codeConns = this.codeConnections.get(name) || [];

      if (refs.length === 0 && codeConns.length === 0) {
        warnings.push({
          type: 'unused_definition',
          symbolName: name,
          filePath: definition.filePath,
          message: `Symbol [[${name}]] is defined but never referenced`,
        });
      }
    }

    // Check for symbols with many references (might need splitting)
    for (const [name, refList] of this.references.entries()) {
      if (refList.length > 20) {
        const definition = this.definitions.get(name);
        if (definition) {
          warnings.push({
            type: 'many_references',
            symbolName: name,
            filePath: definition.filePath,
            message: `Symbol [[${name}]] has ${refList.length} references (consider splitting)`,
            count: refList.length,
          });
        }
      }
    }

    // Check for definitions without code implementation
    for (const [name, definition] of this.definitions.entries()) {
      const codeConns = this.codeConnections.get(name) || [];

      if (codeConns.length === 0) {
        warnings.push({
          type: 'no_code_impl',
          symbolName: name,
          filePath: definition.filePath,
          message: `Symbol [[${name}]] has no code implementation`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get statistics
   *
   * @returns Registry statistics
   */
  getStatistics(): {
    totalDefinitions: number;
    totalAuxiliaries: number;
    totalReferences: number;
    totalCodeConnections: number;
    avgReferencesPerSymbol: number;
  } {
    let totalAux = 0;
    for (const auxList of this.auxiliaries.values()) {
      totalAux += auxList.length;
    }

    let totalRefs = 0;
    for (const refList of this.references.values()) {
      totalRefs += refList.length;
    }

    let totalConns = 0;
    for (const connList of this.codeConnections.values()) {
      totalConns += connList.length;
    }

    return {
      totalDefinitions: this.definitions.size,
      totalAuxiliaries: totalAux,
      totalReferences: totalRefs,
      totalCodeConnections: totalConns,
      avgReferencesPerSymbol: this.definitions.size > 0 ? totalRefs / this.definitions.size : 0,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.definitions.clear();
    this.auxiliaries.clear();
    this.references.clear();
    this.codeConnections.clear();
  }

  /**
   * Unregister all symbols from a specific file
   *
   * @param filePath - File path to unregister
   */
  unregisterFile(filePath: string): void {
    // Remove primary definitions from this file
    for (const [name, symbol] of this.definitions.entries()) {
      if (symbol.filePath === filePath) {
        this.definitions.delete(name);
      }
    }

    // Remove auxiliary definitions from this file
    for (const [name, auxList] of this.auxiliaries.entries()) {
      const filtered = auxList.filter((aux) => aux.filePath !== filePath);
      if (filtered.length === 0) {
        this.auxiliaries.delete(name);
      } else {
        this.auxiliaries.set(name, filtered);
      }
    }

    // Remove references from this file
    for (const [name, refList] of this.references.entries()) {
      const filtered = refList.filter((ref) => ref.filePath !== filePath);
      if (filtered.length === 0) {
        this.references.delete(name);
      } else {
        this.references.set(name, filtered);
      }
    }

    // Remove code connections from this file
    for (const [name, connList] of this.codeConnections.entries()) {
      const filtered = connList.filter((conn) => conn.filePath !== filePath);
      if (filtered.length === 0) {
        this.codeConnections.delete(name);
      } else {
        this.codeConnections.set(name, filtered);
      }
    }
  }

  /**
   * Export registry state
   *
   * @returns Serialized state
   */
  export(): {
    definitions: Array<[string, DocumentSymbol]>;
    auxiliaries: Array<[string, DocumentSymbol[]]>;
    references: Array<[string, DocumentSymbol[]]>;
    codeConnections: Array<[string, CodeConnection[]]>;
  } {
    return {
      definitions: Array.from(this.definitions.entries()),
      auxiliaries: Array.from(this.auxiliaries.entries()),
      references: Array.from(this.references.entries()),
      codeConnections: Array.from(this.codeConnections.entries()),
    };
  }

  /**
   * Import registry state
   *
   * @param data - Serialized state
   */
  import(data: {
    definitions: Array<[string, DocumentSymbol]>;
    auxiliaries: Array<[string, DocumentSymbol[]]>;
    references: Array<[string, DocumentSymbol[]]>;
    codeConnections: Array<[string, CodeConnection[]]>;
  }): void {
    this.clear();
    this.definitions = new Map(data.definitions);
    this.auxiliaries = new Map(data.auxiliaries);
    this.references = new Map(data.references);
    this.codeConnections = new Map(data.codeConnections);
  }
}
