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
  /** Type information */
  declaredType?: string;
  inferredType?: string;
  genericParams?: string[];
  parameterTypes?: Array<{ name: string; type?: string }>;
  /** Constant information */
  isConstant?: boolean;
  literalValue?: string;
  valueType?: string;
}

/**
 * Extraction result
 *
 * @doc [[ExtractionResult]]
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
  private exportedClasses: Set<string> = new Set();
  private exportedInterfaces: Set<string> = new Set();

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
    this.exportedClasses = new Set();
    this.exportedInterfaces = new Set();

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    this.visitNode(sourceFile, undefined);

    // Build relationships from imports
    this.buildRelationshipsFromImports();

    return {
      symbols: this.symbols,
      relationships: this.relationships,
      imports: this.imports,
    };
  }

  /**
   * Build relationships from collected imports
   * Creates relationships from each symbol in the file to the imported symbols
   */
  private buildRelationshipsFromImports(): void {
    // Relationships are now built during symbol extraction by tracking type references
    // This method is kept for compatibility but does nothing
    // See extractTypeReferences() called during class/interface/function extraction
  }

  /**
   * Collect all type references from a node and its children
   */
  private collectTypeReferences(node: ts.Node, importedNames: Set<string>): Set<string> {
    const refs = new Set<string>();

    const visit = (n: ts.Node) => {
      // Type reference (e.g., Foo, Promise<Bar>)
      if (ts.isTypeReferenceNode(n)) {
        const typeName = n.typeName.getText();
        const baseName = typeName.split('<')[0].split('.')[0];
        if (importedNames.has(baseName)) {
          refs.add(baseName);
        }
      }
      // Identifier in expressions (e.g., new Foo(), Foo.bar)
      if (ts.isIdentifier(n) && importedNames.has(n.text)) {
        // Check if it's actually used as a type/value, not just a property name
        const parent = n.parent;
        if (parent && (
          ts.isNewExpression(parent) ||
          ts.isCallExpression(parent) ||
          ts.isPropertyAccessExpression(parent) && parent.expression === n ||
          ts.isTypeReferenceNode(parent)
        )) {
          refs.add(n.text);
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return refs;
  }

  /**
   * Extract type references for a symbol and create dependencies
   */
  private extractTypeReferences(symbolName: string, node: ts.Node): void {
    const importedNames = new Set<string>();
    for (const imp of this.imports) {
      for (const name of imp.imported) {
        if (name !== '*') importedNames.add(name);
      }
    }

    const refs = this.collectTypeReferences(node, importedNames);
    for (const ref of refs) {
      this.relationships.push({
        type: 'dependsOn',
        from: symbolName,
        to: ref,
        filePath: this.currentFilePath,
        description: `${symbolName} uses ${ref}`,
      });
    }
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

    // Extract variable declarations (including constants)
    // Only extract top-level variables (not inside functions/methods)
    if (ts.isVariableStatement(node) && !parentSymbol) {
      this.extractVariableStatement(node);
      return;
    }

    // Extract class
    if (ts.isClassDeclaration(node) && node.name) {
      const symbol = this.extractClassSymbol(node);
      this.symbols.push(symbol);

      // Track exported classes
      if (symbol.isExported) {
        this.exportedClasses.add(symbol.name);
      }

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

      // Track exported interfaces
      if (symbol.isExported) {
        this.exportedInterfaces.add(symbol.name);
      }

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
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

    if (node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        // export { Foo, Bar } from './foo'
        for (const element of node.exportClause.elements) {
          const exportedName = element.name.text;
          imported.push(exportedName);

          // Create re-export relationship: this barrel file re-exports the symbol
          this.relationships.push({
            type: 're-exports',
            from: this.currentFilePath,
            to: exportedName,
            filePath: this.currentFilePath,
            line: pos.line + 1,
            description: `${this.currentFilePath} re-exports ${exportedName} from ${modulePath}`,
          });
        }
      }
    } else {
      // export * from './foo'
      // We can't know what's exported, so mark it as wildcard
      imported.push('*');

      // Create wildcard re-export relationship
      this.relationships.push({
        type: 're-exports',
        from: this.currentFilePath,
        to: `* from ${modulePath}`,
        filePath: this.currentFilePath,
        line: pos.line + 1,
        description: `${this.currentFilePath} re-exports all from ${modulePath}`,
      });
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

    // Extract inheritance (extends)
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          for (const type of clause.types) {
            const baseClassName = type.expression.getText();
            this.relationships.push({
              type: 'extends',
              from: name,
              to: baseClassName,
              filePath: this.currentFilePath,
              description: `${name} extends ${baseClassName}`,
            });
          }
        }
        // Extract implementation (implements)
        if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          for (const type of clause.types) {
            const interfaceName = type.expression.getText();
            this.relationships.push({
              type: 'implements',
              from: name,
              to: interfaceName,
              filePath: this.currentFilePath,
              description: `${name} implements ${interfaceName}`,
            });
          }
        }
      }
    }

    // Extract type references used within the class
    this.extractTypeReferences(name, node);

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

    // Extract interface inheritance (extends)
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          for (const type of clause.types) {
            const baseInterfaceName = type.expression.getText();
            this.relationships.push({
              type: 'extends',
              from: name,
              to: baseInterfaceName,
              filePath: this.currentFilePath,
              description: `${name} extends ${baseInterfaceName}`,
            });
          }
        }
      }
    }

    // Extract type references used within the interface
    this.extractTypeReferences(name, node);

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

    // Extract function type information
    const funcTypeInfo = this.extractFunctionTypeInfo(node);

    // Extract type references used within the function
    this.extractTypeReferences(name, node);

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
      declaredType: funcTypeInfo.returnType,
      parameterTypes: funcTypeInfo.parameters,
    };
  }

  /**
   * Extract method symbol
   */
  private extractMethodSymbol(node: ts.MethodDeclaration, parentSymbol: string): ExtractedSymbol {
    const name = node.name.getText();
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
    const fullName = `${parentSymbol}.${name}`;

    // Extract method type information
    const funcTypeInfo = this.extractFunctionTypeInfo(node);

    // Method is exported if parent class/interface is exported and method is public
    const isPublic = !this.hasPrivateModifier(node);
    const parentIsExported = this.exportedClasses.has(parentSymbol) || this.exportedInterfaces.has(parentSymbol);
    const isExported = parentIsExported && isPublic;

    return {
      name: fullName,
      type: 'method',
      filePath: this.currentFilePath,
      line: pos.line + 1,
      column: pos.character,
      isExported,
      isPublic,
      summary: this.extractJSDocSummary(node),
      parentSymbol,
      declaredType: funcTypeInfo.returnType,
      parameterTypes: funcTypeInfo.parameters,
    };
  }

  /**
   * Extract property symbol
   */
  private extractPropertySymbol(node: ts.PropertyDeclaration, parentSymbol: string): ExtractedSymbol {
    const name = node.name.getText();
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
    const fullName = `${parentSymbol}.${name}`;

    // Extract type information
    const typeInfo = this.extractTypeInfo(node.type);

    // Extract value if initialized
    const valueInfo = node.initializer ? this.extractLiteralValue(node.initializer) : null;

    // Property is exported if parent class/interface is exported and property is public
    const isPublic = !this.hasPrivateModifier(node);
    const parentIsExported = this.exportedClasses.has(parentSymbol) || this.exportedInterfaces.has(parentSymbol);
    const isExported = parentIsExported && isPublic;

    return {
      name: fullName,
      type: 'property',
      filePath: this.currentFilePath,
      line: pos.line + 1,
      column: pos.character,
      isExported,
      isPublic,
      summary: this.extractJSDocSummary(node),
      parentSymbol,
      declaredType: typeInfo?.declaredType,
      genericParams: typeInfo?.genericParams,
      literalValue: valueInfo?.value,
      valueType: valueInfo?.type,
    };
  }

  /**
   * Extract type alias symbol
   */
  private extractTypeSymbol(node: ts.TypeAliasDeclaration): ExtractedSymbol {
    const name = node.name.text;
    const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

    // Extract type references used within the type alias
    this.extractTypeReferences(name, node);

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

  /**
   * Extract variable statement (including constants)
   */
  private extractVariableStatement(node: ts.VariableStatement): void {
    const declarationList = node.declarationList;
    const isConst = (declarationList.flags & ts.NodeFlags.Const) !== 0;

    for (const declaration of declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;

      const name = declaration.name.text;
      const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

      // Extract type information
      const typeInfo = this.extractTypeInfo(declaration.type);

      // Extract constant value
      const valueInfo = declaration.initializer ? this.extractLiteralValue(declaration.initializer) : null;

      // Detect if it's a constant (const keyword + UPPER_SNAKE_CASE pattern)
      const isConstantPattern = /^[A-Z][A-Z0-9_]*$/.test(name);
      const isConstantValue = isConst && (isConstantPattern || valueInfo?.isPrimitive);

      this.symbols.push({
        name,
        type: isConstantValue ? 'constant' : 'variable',
        filePath: this.currentFilePath,
        line: pos.line + 1,
        column: pos.character,
        isExported: this.hasExportModifier(node),
        isPublic: true,
        summary: this.extractJSDocSummary(node),
        declaredType: typeInfo?.declaredType,
        genericParams: typeInfo?.genericParams,
        isConstant: isConst,
        literalValue: valueInfo?.value,
        valueType: valueInfo?.type,
      });
    }
  }

  /**
   * Extract type information from type node
   */
  private extractTypeInfo(typeNode?: ts.TypeNode): { declaredType?: string; genericParams?: string[] } | null {
    if (!typeNode) return null;

    const declaredType = typeNode.getText();
    const genericParams: string[] = [];

    // Extract generic parameters if present
    if (ts.isTypeReferenceNode(typeNode) && typeNode.typeArguments) {
      for (const arg of typeNode.typeArguments) {
        genericParams.push(arg.getText());
      }
    }

    return {
      declaredType,
      genericParams: genericParams.length > 0 ? genericParams : undefined,
    };
  }

  /**
   * Extract literal value from initializer
   */
  private extractLiteralValue(node: ts.Expression): { value: string; type: string; isPrimitive: boolean } | null {
    if (ts.isStringLiteral(node)) {
      return { value: node.text, type: 'string', isPrimitive: true };
    }
    if (ts.isNumericLiteral(node)) {
      return { value: node.text, type: 'number', isPrimitive: true };
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
      return { value: node.getText(), type: 'boolean', isPrimitive: true };
    }
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return { value: 'null', type: 'null', isPrimitive: true };
    }
    if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
      return { value: 'undefined', type: 'undefined', isPrimitive: true };
    }
    if (ts.isArrayLiteralExpression(node)) {
      return { value: node.getText(), type: 'array', isPrimitive: false };
    }
    if (ts.isObjectLiteralExpression(node)) {
      return { value: node.getText(), type: 'object', isPrimitive: false };
    }

    return null;
  }

  /**
   * Extract type information for methods and functions
   */
  private extractFunctionTypeInfo(node: ts.FunctionDeclaration | ts.MethodDeclaration): {
    returnType?: string;
    parameters?: Array<{ name: string; type?: string }>;
  } {
    const returnType = node.type?.getText();
    const parameters: Array<{ name: string; type?: string }> = [];

    for (const param of node.parameters) {
      if (ts.isIdentifier(param.name)) {
        parameters.push({
          name: param.name.text,
          type: param.type?.getText(),
        });
      }
    }

    return { returnType, parameters: parameters.length > 0 ? parameters : undefined };
  }
}
