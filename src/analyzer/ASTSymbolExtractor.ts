/**
 * AST-based symbol extractor
 * Extracts all symbols from TypeScript source code using AST,
 * independent of JSDoc presence
 *
 * @packageDocumentation
 */

import * as ts from 'typescript';
import type { Symbol, SymbolRelationship } from '../types/graph';

/**
 * Extracted symbol with metadata
 */
export interface ExtractedSymbol extends Omit<Symbol, 'id' | 'tests' | 'designDecisions'> {
  /** Parent symbol name (for methods/properties) */
  parentSymbol?: string;
  /** Extracted JSDoc summary if available */
  summary?: string;
}

/**
 * Extraction result
 */
export interface ExtractionResult {
  /** All extracted symbols */
  symbols: ExtractedSymbol[];
  /** Relationships between symbols */
  relationships: SymbolRelationship[];
  /** Import-based dependencies */
  imports: Array<{
    from: string;
    imported: string[];
    modulePath: string;
  }>;
}

/**
 * AST-based symbol extractor
 *
 * @public
 * @responsibility Extract all symbols from TypeScript AST regardless of JSDoc presence
 */
export class ASTSymbolExtractor {
  private symbols: ExtractedSymbol[] = [];
  private relationships: SymbolRelationship[] = [];
  private imports: ExtractionResult['imports'] = [];
  private currentFilePath: string = '';

  /**
   * Extract all symbols and relationships from a TypeScript file
   *
   * @param filePath - Source file path
   * @param sourceCode - Source code content
   * @returns Extraction result
   */
  extract(filePath: string, sourceCode: string): ExtractionResult {
    this.symbols = [];
    this.relationships = [];
    this.imports = [];
    this.currentFilePath = filePath;

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    this.visitNode(sourceFile, undefined);

    return {
      symbols: this.symbols,
      relationships: this.relationships,
      imports: this.imports,
    };
  }

  /**
   * Visit an AST node recursively
   */
  private visitNode(node: ts.Node, parentSymbol?: string): void {
    // Extract imports
    if (ts.isImportDeclaration(node)) {
      this.extractImport(node);
    }

    // Extract re-exports (export { Foo } from './foo')
    if (ts.isExportDeclaration(node)) {
      this.extractReExport(node);
    }

    // Extract class
    if (ts.isClassDeclaration(node) && node.name) {
      const symbol = this.extractClassSymbol(node);
      this.symbols.push(symbol);

      // Visit class members with class as parent
      for (const member of node.members) {
        this.visitNode(member, symbol.name);
      }
      return;
    }

    // Extract interface
    if (ts.isInterfaceDeclaration(node) && node.name) {
      const symbol = this.extractInterfaceSymbol(node);
      this.symbols.push(symbol);

      // Visit interface members
      for (const member of node.members) {
        this.visitNode(member, symbol.name);
      }
      return;
    }

    // Extract function
    if (ts.isFunctionDeclaration(node) && node.name) {
      const symbol = this.extractFunctionSymbol(node, parentSymbol);
      this.symbols.push(symbol);
    }

    // Extract method
    if (ts.isMethodDeclaration(node) && parentSymbol) {
      const symbol = this.extractMethodSymbol(node, parentSymbol);
      this.symbols.push(symbol);
    }

    // Extract property
    if (ts.isPropertyDeclaration(node) && parentSymbol) {
      const symbol = this.extractPropertySymbol(node, parentSymbol);
      this.symbols.push(symbol);
    }

    // Extract type alias
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      const symbol = this.extractTypeSymbol(node);
      this.symbols.push(symbol);
    }

    // Extract enum
    if (ts.isEnumDeclaration(node) && node.name) {
      const symbol = this.extractEnumSymbol(node);
      this.symbols.push(symbol);
    }

    // Continue visiting children
    ts.forEachChild(node, (child) => this.visitNode(child, parentSymbol));
  }

  /**
   * Extract import declaration
   */
  private extractImport(node: ts.ImportDeclaration): void {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const modulePath = moduleSpecifier.text;
    const imported: string[] = [];

    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        imported.push(node.importClause.name.text);
      }

      // Named imports
      if (node.importClause.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            imported.push(element.name.text);
          }
        } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          imported.push(node.importClause.namedBindings.name.text);
        }
      }
    }

    this.imports.push({
      from: this.currentFilePath,
      imported,
      modulePath,
    });
  }

  /**
   * Extract re-export declaration
   * Handles: export { Foo } from './foo' and export * from './foo'
   */
  private extractReExport(node: ts.ExportDeclaration): void {
    if (!node.moduleSpecifier) return; // Skip export { Foo } without from
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;

    const modulePath = node.moduleSpecifier.text;
    const imported: string[] = [];

    if (node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        // export { Foo, Bar } from './foo'
        for (const element of node.exportClause.elements) {
          imported.push(element.name.text);
        }
      }
    } else {
      // export * from './foo'
      // We can't know what's exported, so mark it as wildcard
      imported.push('*');
    }

    this.imports.push({
      from: this.currentFilePath,
      imported,
      modulePath,
    });
  }

  /**
   * Extract class symbol
   */
  private extractClassSymbol(node: ts.ClassDeclaration): ExtractedSymbol {
    const name = node.name!.text;
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

    return {
      name,
      type: 'class',
      filePath: this.currentFilePath,
      line: pos.line + 1,
      column: pos.character,
      isExported: this.hasExportModifier(node),
      isPublic: this.hasPublicModifier(node) || !this.hasPrivateModifier(node),
      summary: this.extractJSDocSummary(node),
    };
  }

  /**
   * Extract interface symbol
   */
  private extractInterfaceSymbol(node: ts.InterfaceDeclaration): ExtractedSymbol {
    const name = node.name.text;
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

    return {
      name,
      type: 'interface',
      filePath: this.currentFilePath,
      line: pos.line + 1,
      column: pos.character,
      isExported: this.hasExportModifier(node),
      isPublic: true, // Interfaces are always public
      summary: this.extractJSDocSummary(node),
    };
  }

  /**
   * Extract function symbol
   */
  private extractFunctionSymbol(node: ts.FunctionDeclaration, parentSymbol?: string): ExtractedSymbol {
    const name = node.name!.text;
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

    return {
      name,
      type: 'function',
      filePath: this.currentFilePath,
      line: pos.line + 1,
      column: pos.character,
      isExported: this.hasExportModifier(node),
      isPublic: !this.hasPrivateModifier(node),
      summary: this.extractJSDocSummary(node),
      parentSymbol,
    };
  }

  /**
   * Extract method symbol
   */
  private extractMethodSymbol(node: ts.MethodDeclaration, parentSymbol: string): ExtractedSymbol {
    const name = node.name.getText();
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
    const fullName = `${parentSymbol}.${name}`;

    return {
      name: fullName,
      type: 'method',
      filePath: this.currentFilePath,
      line: pos.line + 1,
      column: pos.character,
      isExported: false, // Methods inherit parent export
      isPublic: !this.hasPrivateModifier(node),
      summary: this.extractJSDocSummary(node),
      parentSymbol,
    };
  }

  /**
   * Extract property symbol
   */
  private extractPropertySymbol(node: ts.PropertyDeclaration, parentSymbol: string): ExtractedSymbol {
    const name = node.name.getText();
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
    const fullName = `${parentSymbol}.${name}`;

    return {
      name: fullName,
      type: 'property',
      filePath: this.currentFilePath,
      line: pos.line + 1,
      column: pos.character,
      isExported: false,
      isPublic: !this.hasPrivateModifier(node),
      summary: this.extractJSDocSummary(node),
      parentSymbol,
    };
  }

  /**
   * Extract type alias symbol
   */
  private extractTypeSymbol(node: ts.TypeAliasDeclaration): ExtractedSymbol {
    const name = node.name.text;
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

    return {
      name,
      type: 'type',
      filePath: this.currentFilePath,
      line: pos.line + 1,
      column: pos.character,
      isExported: this.hasExportModifier(node),
      isPublic: true,
      summary: this.extractJSDocSummary(node),
    };
  }

  /**
   * Extract enum symbol
   */
  private extractEnumSymbol(node: ts.EnumDeclaration): ExtractedSymbol {
    const name = node.name.text;
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

    return {
      name,
      type: 'enum',
      filePath: this.currentFilePath,
      line: pos.line + 1,
      column: pos.character,
      isExported: this.hasExportModifier(node),
      isPublic: true,
      summary: this.extractJSDocSummary(node),
    };
  }

  /**
   * Check if node has export modifier
   */
  private hasExportModifier(node: ts.Node): boolean {
    const modifiers = (node as any).modifiers;
    if (!modifiers) return false;
    return modifiers.some(
      (mod: ts.Modifier) => mod.kind === ts.SyntaxKind.ExportKeyword
    );
  }

  /**
   * Check if node has private modifier
   */
  private hasPrivateModifier(node: ts.Node): boolean {
    const modifiers = (node as any).modifiers;
    if (!modifiers) return false;
    return modifiers.some(
      (mod: ts.Modifier) => mod.kind === ts.SyntaxKind.PrivateKeyword
    );
  }

  /**
   * Check if node has public modifier
   */
  private hasPublicModifier(node: ts.Node): boolean {
    const modifiers = (node as any).modifiers;
    if (!modifiers) return false;
    return modifiers.some(
      (mod: ts.Modifier) => mod.kind === ts.SyntaxKind.PublicKeyword
    );
  }

  /**
   * Extract JSDoc summary if available
   */
  private extractJSDocSummary(node: ts.Node): string | undefined {
    const jsDocComments = (node as any).jsDoc;
    if (!jsDocComments || jsDocComments.length === 0) return undefined;

    const firstJsDoc = jsDocComments[0];
    if (firstJsDoc.comment) {
      if (typeof firstJsDoc.comment === 'string') {
        return firstJsDoc.comment;
      }
      // Handle complex JSDoc comment structures
      return firstJsDoc.comment
        .map((part: any) => part.text || '')
        .join('')
        .trim();
    }

    return undefined;
  }
}
