/**
 * Interface analyzer for extracting and analyzing TypeScript interfaces
 * @packageDocumentation
 */

import * as ts from 'typescript';
import type {
  DomainRole,
  InterfaceAnalysisOptions,
  InterfaceInfo,
  InterfaceMethod,
  InterfaceProperty,
  MethodParameter,
} from '../types/domain';
import type { Symbol } from '../types/graph';

/**
 * Import information for tracking external types
 */
interface ImportInfo {
  /**
   * Imported type name
   */
  typeName: string;

  /**
   * Module source path
   */
  source: string;

  /**
   * Whether it's a type-only import
   */
  isTypeOnly: boolean;
}

/**
 * Analyzes TypeScript interfaces for domain-driven development
 *
 * @public
 * @responsibility Extract and analyze interface structures from TypeScript code
 * @contract Provide detailed interface information including properties, methods, and dependencies
 */
export class InterfaceAnalyzer {
  private options: Required<InterfaceAnalysisOptions>;
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private importMap: Map<string, ImportInfo> = new Map();

  /**
   * Creates a new InterfaceAnalyzer
   *
   * @param options - Analysis options
   * @public
   */
  constructor(options: InterfaceAnalysisOptions = {}) {
    this.options = {
      includePrivate: options.includePrivate ?? false,
      inferDomainFromPath: options.inferDomainFromPath ?? true,
      inferDomainRole: options.inferDomainRole ?? true,
      domainPathPatterns: options.domainPathPatterns ?? ['src/domain/*', 'src/entities/*'],
    };
  }

  /**
   * Analyze interfaces from a TypeScript source file
   *
   * @param filePath - Path to TypeScript file
   * @param sourceCode - Source code content
   * @param existingSymbols - Existing symbol information from symbol graph
   * @returns Array of interface information
   * @public
   */
  analyzeFile(filePath: string, sourceCode: string, existingSymbols?: Symbol[]): InterfaceInfo[] {
    // Create a program with TypeChecker for accurate type analysis
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

    // Create minimal program for type checking
    const compilerHost = ts.createCompilerHost({});
    compilerHost.getSourceFile = (fileName) => {
      if (fileName === filePath) {
        return sourceFile;
      }
      return undefined;
    };

    this.program = ts.createProgram([filePath], {}, compilerHost);
    this.typeChecker = this.program.getTypeChecker();

    // Extract imports
    this.importMap.clear();
    this.extractImports(sourceFile);

    const interfaces: InterfaceInfo[] = [];
    this.visitNode(sourceFile, sourceFile, interfaces, existingSymbols);

    return interfaces;
  }

  /**
   * Extract import information from source file
   *
   * @param sourceFile - Source file to analyze
   */
  private extractImports(sourceFile: ts.SourceFile): void {
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const source = moduleSpecifier.text;
          const isTypeOnly = node.importClause?.isTypeOnly ?? false;

          // Extract named imports
          if (
            node.importClause?.namedBindings &&
            ts.isNamedImports(node.importClause.namedBindings)
          ) {
            for (const element of node.importClause.namedBindings.elements) {
              const typeName = element.name.text;
              this.importMap.set(typeName, {
                typeName,
                source,
                isTypeOnly: isTypeOnly || element.isTypeOnly,
              });
            }
          }
        }
      }
    });
  }

  /**
   * Get import information for a type name
   *
   * @param typeName - Type name to look up
   * @returns Import info if found
   */
  getImportInfo(typeName: string): ImportInfo | undefined {
    return this.importMap.get(typeName);
  }

  /**
   * Get TypeChecker instance
   *
   * @returns TypeChecker if available
   */
  getTypeChecker(): ts.TypeChecker | null {
    return this.typeChecker;
  }

  /**
   * Visit TypeScript AST node
   *
   * @param node - AST node
   * @param sourceFile - Source file
   * @param interfaces - Array to accumulate interface information
   * @param existingSymbols - Existing symbols
   */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    interfaces: InterfaceInfo[],
    existingSymbols?: Symbol[]
  ): void {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceInfo = this.analyzeInterface(node, sourceFile, existingSymbols);
      if (interfaceInfo) {
        interfaces.push(interfaceInfo);
      }
    }

    ts.forEachChild(node, (child) =>
      this.visitNode(child, sourceFile, interfaces, existingSymbols)
    );
  }

  /**
   * Analyze a specific interface declaration
   *
   * @param node - Interface declaration node
   * @param sourceFile - Source file
   * @param existingSymbols - Existing symbols
   * @returns Interface information
   */
  private analyzeInterface(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile,
    existingSymbols?: Symbol[]
  ): InterfaceInfo | null {
    const name = node.name.text;

    // Check if private and should be excluded
    if (!this.options.includePrivate && name.startsWith('_')) {
      return null;
    }

    // Check for export
    const isExported = this.hasExportModifier(node);
    if (!this.options.includePrivate && !isExported) {
      return null;
    }

    // Get position
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    // Find existing symbol info
    const existingSymbol = existingSymbols?.find(
      (s) => s.name === name && s.type === 'interface' && s.filePath === sourceFile.fileName
    );

    // Create base symbol
    const symbol: Symbol = existingSymbol || {
      id: `${sourceFile.fileName}:${line}:${name}`,
      name,
      type: 'interface',
      filePath: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
      isExported,
      isPublic: isExported && !name.startsWith('_'),
      tests: [],
      designDecisions: [],
    };

    // Extract properties
    const properties = this.extractProperties(node, sourceFile);

    // Extract methods
    const methods = this.extractMethods(node, sourceFile);

    // Extract extends clause
    const extendsClause = this.extractExtends(node);

    // Extract type parameters
    const typeParameters = this.extractTypeParameters(node);

    // Infer domain
    const domain = this.options.inferDomainFromPath
      ? this.inferDomain(sourceFile.fileName)
      : undefined;

    // Infer domain role
    const domainRole = this.options.inferDomainRole
      ? this.inferDomainRole(name, properties)
      : undefined;

    return {
      symbol,
      properties,
      methods,
      extends: extendsClause,
      typeParameters,
      domain,
      domainRole,
    };
  }

  /**
   * Extract properties from interface
   *
   * @param node - Interface declaration
   * @param sourceFile - Source file
   * @returns Array of properties
   */
  private extractProperties(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile
  ): InterfaceProperty[] {
    const properties: InterfaceProperty[] = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const name = member.name.getText(sourceFile);
        const type = member.type ? member.type.getText(sourceFile) : 'any';
        const isOptional = !!member.questionToken;
        const isReadonly =
          member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;

        // Extract JSDoc comment
        const documentation = this.extractJSDocComment(member, sourceFile);

        properties.push({
          name,
          type,
          isOptional,
          isReadonly,
          documentation,
        });
      }
    }

    return properties;
  }

  /**
   * Extract methods from interface
   *
   * @param node - Interface declaration
   * @param sourceFile - Source file
   * @returns Array of methods
   */
  private extractMethods(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile
  ): InterfaceMethod[] {
    const methods: InterfaceMethod[] = [];

    for (const member of node.members) {
      if (ts.isMethodSignature(member) && member.name) {
        const name = member.name.getText(sourceFile);

        // Extract parameters
        const parameters: MethodParameter[] = member.parameters.map((param) => ({
          name: param.name.getText(sourceFile),
          type: param.type ? param.type.getText(sourceFile) : 'any',
          isOptional: !!param.questionToken,
        }));

        // Extract return type
        const returnType = member.type ? member.type.getText(sourceFile) : 'void';

        // Extract JSDoc comment
        const documentation = this.extractJSDocComment(member, sourceFile);

        methods.push({
          name,
          parameters,
          returnType,
          documentation,
        });
      }
    }

    return methods;
  }

  /**
   * Extract extends clause
   *
   * @param node - Interface declaration
   * @returns Array of extended interface names
   */
  private extractExtends(node: ts.InterfaceDeclaration): string[] {
    if (!node.heritageClauses) {
      return [];
    }

    const extendsClause = node.heritageClauses.find(
      (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
    );

    if (!extendsClause) {
      return [];
    }

    return extendsClause.types.map((type) => type.expression.getText());
  }

  /**
   * Extract type parameters
   *
   * @param node - Interface declaration
   * @returns Array of type parameter names
   */
  private extractTypeParameters(node: ts.InterfaceDeclaration): string[] {
    if (!node.typeParameters) {
      return [];
    }

    return node.typeParameters.map((param) => param.name.text);
  }

  /**
   * Extract JSDoc comment from node
   *
   * @param node - AST node
   * @param sourceFile - Source file
   * @returns Documentation string
   */
  private extractJSDocComment(node: ts.Node, _sourceFile: ts.SourceFile): string | undefined {
    const jsDocTags = (node as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc;
    if (!jsDocTags || jsDocTags.length === 0) {
      return undefined;
    }

    const jsDoc = jsDocTags[jsDocTags.length - 1];
    const comment = jsDoc.comment;

    if (typeof comment === 'string') {
      return comment;
    }

    return undefined;
  }

  /**
   * Check if node has export modifier
   *
   * @param node - Interface declaration
   * @returns True if exported
   */
  private hasExportModifier(node: ts.InterfaceDeclaration): boolean {
    if (!ts.canHaveModifiers(node)) {
      return false;
    }

    const modifiers = ts.getModifiers(node);
    if (!modifiers) {
      return false;
    }

    return modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
  }

  /**
   * Infer domain from file path
   *
   * @param filePath - File path
   * @returns Domain name
   */
  private inferDomain(filePath: string): string | undefined {
    // Extract domain from path patterns
    // e.g., src/domain/user/UserEntity.ts -> user
    // e.g., src/entities/order/Order.ts -> order

    const parts = filePath.split('/');

    // Look for domain indicators
    const domainIndex = parts.findIndex(
      (part) => part === 'domain' || part === 'domains' || part === 'entities' || part === 'models'
    );

    if (domainIndex !== -1 && domainIndex + 1 < parts.length) {
      return parts[domainIndex + 1];
    }

    // Fallback: use parent directory name
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }

    return undefined;
  }

  /**
   * Infer domain role from interface name and structure
   *
   * @param name - Interface name
   * @param properties - Interface properties
   * @returns Domain role
   */
  private inferDomainRole(name: string, properties: InterfaceProperty[]): DomainRole {
    const nameLower = name.toLowerCase();

    // Check naming patterns
    if (nameLower.includes('entity') || nameLower.endsWith('entity')) {
      return 'Entity';
    }
    if (nameLower.includes('valueobject') || nameLower.includes('value')) {
      return 'ValueObject';
    }
    if (nameLower.includes('service')) {
      return 'Service';
    }
    if (nameLower.includes('repository') || nameLower.includes('repo')) {
      return 'Repository';
    }
    if (nameLower.includes('factory')) {
      return 'Factory';
    }
    if (nameLower.includes('aggregate')) {
      return 'Aggregate';
    }
    if (nameLower.includes('event') || nameLower.endsWith('event')) {
      return 'DomainEvent';
    }
    if (nameLower.includes('dto') || nameLower.endsWith('dto')) {
      return 'DTO';
    }

    // Check structure patterns
    const hasIdProperty = properties.some((p) => p.name === 'id' || p.name.endsWith('Id'));
    const hasOnlyData = properties.length > 0 && properties.every((p) => !p.type.includes('()'));

    if (hasIdProperty && hasOnlyData) {
      return 'Entity';
    }

    if (hasOnlyData && properties.length > 0) {
      return 'ValueObject';
    }

    return 'Unknown';
  }
}
