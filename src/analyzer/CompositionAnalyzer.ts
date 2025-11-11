/**
 * Composition Analyzer
 *
 * @packageDocumentation
 * @responsibility Detect composition relationships (has-a) via AST analysis
 *
 * @problem Classes compose other classes as members but relationship not tracked
 * @solves Automatic detection of composition via property type analysis
 * @context Essential for understanding object structure and ownership
 *
 * @functionality
 * - Detect class properties with type references
 * - Handle array types (Item[])
 * - Handle optional types (Member?)
 * - Handle union types (A | B)
 * - Build composition relationships
 */

import * as ts from 'typescript';
import type { SymbolGraph, Symbol } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Composition site information
 */
interface CompositionSite {
  composerSymbolId: string;
  composerName: string;
  propertyName: string;
  composedTypeName: string;
  composedSymbolId?: string;
  filePath: string;
  line: number;
  isArray: boolean;
  isOptional: boolean;
  isUnion: boolean;
}

/**
 * Composition Analyzer
 *
 * @public
 * @responsibility Detect and analyze composition relationships
 */
export class CompositionAnalyzer {
  private graph: SymbolGraph;
  private program: ts.Program | null = null;
  private sourceFiles: Map<string, ts.SourceFile> = new Map();

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program || null;

    // Cache source files if program is provided
    if (this.program) {
      for (const sourceFile of this.program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
          const normalized = sourceFile.fileName.replace(/\\/g, '/');
          this.sourceFiles.set(normalized, sourceFile);
          this.sourceFiles.set(sourceFile.fileName, sourceFile);
        }
      }
    }
  }

  /**
   * Set TypeScript program for AST analysis
   *
   * @param program - TypeScript program
   * @public
   */
  setProgram(program: ts.Program): void {
    this.program = program;

    // Cache source files
    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        const normalized = sourceFile.fileName.replace(/\\/g, '/');
        this.sourceFiles.set(normalized, sourceFile);
        this.sourceFiles.set(sourceFile.fileName, sourceFile);
      }
    }
  }

  /**
   * Analyze composition relationships across all symbols
   *
   * @returns Array of composition relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    if (!this.program) {
      console.warn('CompositionAnalyzer: No program provided, cannot analyze composition');
      return [];
    }

    const relationships: UnifiedRelationship[] = [];
    const compositionSites: CompositionSite[] = [];

    // Extract all composition sites
    for (const sourceFile of this.sourceFiles.values()) {
      const sites = this.extractCompositionSites(sourceFile);
      compositionSites.push(...sites);
    }

    // Resolve symbols and build relationships
    for (const site of compositionSites) {
      const composedSymbol = this.findSymbolByName(site.composedTypeName);
      if (composedSymbol) {
        site.composedSymbolId = composedSymbol.id;

        const relationship = this.createRelationship(site);
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Extract composition sites from a source file
   *
   * @param sourceFile - Source file to analyze
   * @returns Array of composition sites
   * @private
   */
  private extractCompositionSites(sourceFile: ts.SourceFile): CompositionSite[] {
    const sites: CompositionSite[] = [];
    const filePath = sourceFile.fileName;

    const visit = (node: ts.Node) => {
      // Find class declarations
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        const composerSymbol = this.findSymbolByName(className);

        if (composerSymbol) {
          // Analyze class members
          for (const member of node.members) {
            try {
              if (ts.isPropertyDeclaration(member) && member.name && member.type) {
                // Skip computed property names
                if (!ts.isIdentifier(member.name)) {
                  continue;
                }

                const propertyName = member.name.text;
                const typeInfo = this.extractTypeInfo(member.type, sourceFile);

                if (typeInfo.typeName && typeInfo.typeName !== 'any' && typeInfo.typeName !== 'unknown') {
                  // Skip primitive types
                  if (!this.isPrimitiveType(typeInfo.typeName)) {
                    const line = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile)).line + 1;

                    sites.push({
                      composerSymbolId: composerSymbol.id,
                      composerName: className,
                      propertyName,
                      composedTypeName: typeInfo.typeName,
                      filePath,
                      line,
                      isArray: typeInfo.isArray,
                      isOptional: typeInfo.isOptional,
                      isUnion: typeInfo.isUnion
                    });
                  }
                }
              }
            } catch (error) {
              // Skip members that cause errors (e.g., synthetic nodes)
              continue;
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return sites;
  }

  /**
   * Extract type information from type node
   *
   * @param typeNode - Type node to analyze
   * @param sourceFile - Source file for context
   * @returns Type information
   * @private
   */
  private extractTypeInfo(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): {
    typeName: string | null;
    isArray: boolean;
    isOptional: boolean;
    isUnion: boolean;
  } {
    let typeName: string | null = null;
    let isArray = false;
    let isOptional = false;
    let isUnion = false;

    // Handle array types: T[]
    if (ts.isArrayTypeNode(typeNode)) {
      isArray = true;
      return {
        ...this.extractTypeInfo(typeNode.elementType, sourceFile),
        isArray: true
      };
    }

    // Handle type references: ClassName, ClassName<T>
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeRefName = typeNode.typeName.getText(sourceFile);

      // Handle Array<T>
      if (typeRefName === 'Array' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        isArray = true;
        return {
          ...this.extractTypeInfo(typeNode.typeArguments[0], sourceFile),
          isArray: true
        };
      }

      typeName = typeRefName;
    }

    // Handle union types: A | B
    if (ts.isUnionTypeNode(typeNode)) {
      isUnion = true;
      // Take first non-undefined type
      for (const type of typeNode.types) {
        if (type.kind !== ts.SyntaxKind.UndefinedKeyword) {
          const result = this.extractTypeInfo(type, sourceFile);
          if (result.typeName) {
            return {
              ...result,
              isUnion: true,
              isOptional: typeNode.types.some(t => t.kind === ts.SyntaxKind.UndefinedKeyword)
            };
          }
        }
      }
    }

    // Handle intersection types: A & B (treat as composition of first type)
    if (ts.isIntersectionTypeNode(typeNode)) {
      if (typeNode.types.length > 0) {
        return this.extractTypeInfo(typeNode.types[0], sourceFile);
      }
    }

    return { typeName, isArray, isOptional, isUnion };
  }

  /**
   * Check if type is primitive
   *
   * @param typeName - Type name to check
   * @returns True if primitive
   * @private
   */
  private isPrimitiveType(typeName: string): boolean {
    const primitives = [
      'string', 'number', 'boolean', 'null', 'undefined', 'void',
      'String', 'Number', 'Boolean', 'Object', 'Function',
      'Date', 'RegExp', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet',
      'Promise', 'Symbol', 'BigInt'
    ];
    return primitives.includes(typeName);
  }

  /**
   * Find symbol by name
   *
   * @param name - Symbol name
   * @returns Symbol if found
   * @private
   */
  private findSymbolByName(name: string): Symbol | undefined {
    for (const symbol of this.graph.symbols.values()) {
      if (symbol.name === name) {
        return symbol;
      }
    }
    return undefined;
  }

  /**
   * Create unified relationship from composition site
   *
   * @param site - Composition site
   * @returns Unified relationship
   * @private
   */
  private createRelationship(site: CompositionSite): UnifiedRelationship {
    const timestamp = new Date().toISOString();

    return {
      id: `composition-${site.composerSymbolId}-${site.composedSymbolId}-${site.propertyName}`,
      type: 'composition',
      from: site.composerSymbolId,
      to: site.composedSymbolId!,
      direction: 'unidirectional',
      strength: 'strong',
      category: 'behavioral',
      evidence: [
        {
          type: 'code',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `${site.propertyName}: ${site.composedTypeName}${site.isArray ? '[]' : ''}`,
          confidence: 1.0,
          context: `Property declaration in ${site.composerName}`
        }
      ],
      discoveredBy: 'ast-parsing',
      confidence: 1.0,
      filePath: site.filePath,
      line: site.line,
      properties: {
        propertyName: site.propertyName,
        composedType: site.composedTypeName,
        isArray: site.isArray,
        isOptional: site.isOptional,
        isUnion: site.isUnion,
        composerName: site.composerName
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${site.composerName} has-a ${site.isArray ? 'collection of ' : ''}${site.composedTypeName}`
    };
  }
}
