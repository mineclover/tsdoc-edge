/**
 * Type Dependency Analyzer
 *
 * @packageDocumentation
 * @responsibility Detect type-level dependencies between symbols
 *
 * @problem TypeScript type dependencies are not tracked explicitly
 * @solves Automatic detection of type references, generic constraints, and type aliases
 * @context Essential for understanding type-level architecture and refactoring
 *
 * @functionality
 * - Detect type references (A: TypeB)
 * - Extract generic constraints (T extends U)
 * - Track type alias dependencies
 * - Build type dependency graph
 */

import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Type reference information
 */
interface TypeReference {
  fromSymbol: string;
  fromFilePath: string;
  toType: string;
  line: number;
  context: 'parameter' | 'return-type' | 'property' | 'generic-constraint' | 'type-alias';
}

/**
 * Type Dependency Analyzer
 *
 * @public
 * @responsibility Detect and analyze type-level dependencies
 */
export class TypeDependencyAnalyzer {
  private graph: SymbolGraph;
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program || null;
    this.typeChecker = program ? program.getTypeChecker() : null;
  }

  /**
   * Set TypeScript program for AST analysis
   *
   * @param program - TypeScript program
   * @public
   */
  setProgram(program: ts.Program): void {
    this.program = program;
    this.typeChecker = program.getTypeChecker();
  }

  /**
   * Analyze type dependencies across all symbols
   *
   * @returns Array of type dependency relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    if (!this.program || !this.typeChecker) {
      console.warn('TypeDependencyAnalyzer: No program provided, cannot analyze type dependencies');
      return [];
    }

    const relationships: UnifiedRelationship[] = [];
    const typeReferences: TypeReference[] = [];

    // Extract type references from all source files
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');
      const refs = this.extractTypeReferences(sourceFile);
      typeReferences.push(...refs);
    }

    // Create relationships for each type reference
    for (const ref of typeReferences) {
      // Find the source symbol
      const fromSymbol = this.findSymbolByName(ref.fromSymbol);
      if (!fromSymbol) continue;

      // Find the target type symbol
      const toSymbol = this.findSymbolByName(ref.toType);
      if (!toSymbol) continue;

      // Create relationship
      const relationshipType = ref.context === 'generic-constraint' ? 'generic-constraint' : 'type-dependency';
      const relationship: UnifiedRelationship = {
        id: `${relationshipType}-${fromSymbol.id}-${toSymbol.id}`,
        type: relationshipType as any,
        category: 'structural',
        from: fromSymbol.id,
        to: toSymbol.id,
        direction: 'unidirectional',
        strength: 'medium',
        evidence: [
          {
            type: 'type-signature',
            source: ref.fromFilePath,
            lineNumber: ref.line,
            confidence: 0.95,
            context: ref.context,
          },
        ],
        discoveredBy: 'type-inference',
        confidence: 0.95,
        filePath: ref.fromFilePath,
        line: ref.line,
        description: `${ref.fromSymbol} uses type ${ref.toType} in ${ref.context}`,
        properties: {
          context: ref.context,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      relationships.push(relationship);
    }

    return relationships;
  }

  /**
   * Extract type references from a source file
   *
   * @param sourceFile - Source file to analyze
   * @returns Array of type references
   */
  private extractTypeReferences(sourceFile: ts.SourceFile): TypeReference[] {
    const references: TypeReference[] = [];
    const filePath = sourceFile.fileName.replace(/\\/g, '/');

    const visit = (node: ts.Node, parentSymbol?: string): void => {
      // Extract function/method parameter types
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        const funcName = node.name?.getText() || 'anonymous';
        const symbolName = parentSymbol ? `${parentSymbol}.${funcName}` : funcName;

        // Parameter types
        for (const param of node.parameters) {
          if (param.type) {
            const typeRefs = this.extractTypeNames(param.type);
            for (const typeRef of typeRefs) {
              references.push({
                fromSymbol: symbolName,
                fromFilePath: filePath,
                toType: typeRef,
                line: sourceFile.getLineAndCharacterOfPosition(param.getStart()).line + 1,
                context: 'parameter',
              });
            }
          }
        }

        // Return type
        if (node.type) {
          const typeRefs = this.extractTypeNames(node.type);
          for (const typeRef of typeRefs) {
            references.push({
              fromSymbol: symbolName,
              fromFilePath: filePath,
              toType: typeRef,
              line: sourceFile.getLineAndCharacterOfPosition(node.type.getStart()).line + 1,
              context: 'return-type',
            });
          }
        }
      }

      // Extract class property types
      if (ts.isPropertyDeclaration(node)) {
        const className = this.findParentClassName(node);
        if (className) {
          const propName = node.name.getText();
          const symbolName = `${className}.${propName}`;

          if (node.type) {
            const typeRefs = this.extractTypeNames(node.type);
            for (const typeRef of typeRefs) {
              references.push({
                fromSymbol: symbolName,
                fromFilePath: filePath,
                toType: typeRef,
                line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
                context: 'property',
              });
            }
          }
        }
      }

      // Extract type alias dependencies
      if (ts.isTypeAliasDeclaration(node)) {
        const typeName = node.name.text;
        const typeRefs = this.extractTypeNames(node.type);
        for (const typeRef of typeRefs) {
          references.push({
            fromSymbol: typeName,
            fromFilePath: filePath,
            toType: typeRef,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            context: 'type-alias',
          });
        }
      }

      // Extract generic constraints
      if ('typeParameters' in node && node.typeParameters) {
        const symbolName = this.getSymbolName(node);
        if (symbolName) {
          for (const typeParam of (node.typeParameters as ts.NodeArray<ts.TypeParameterDeclaration>)) {
            if (typeParam.constraint) {
              const typeRefs = this.extractTypeNames(typeParam.constraint);
              for (const typeRef of typeRefs) {
                references.push({
                  fromSymbol: symbolName,
                  fromFilePath: filePath,
                  toType: typeRef,
                  line: sourceFile.getLineAndCharacterOfPosition(typeParam.getStart()).line + 1,
                  context: 'generic-constraint',
                });
              }
            }
          }
        }
      }

      // Visit class members
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        for (const member of node.members) {
          visit(member, className);
        }
      }

      ts.forEachChild(node, (child) => visit(child, parentSymbol));
    };

    visit(sourceFile);
    return references;
  }

  /**
   * Extract type names from a type node
   *
   * @param typeNode - Type node to analyze
   * @returns Array of type names
   */
  private extractTypeNames(typeNode: ts.TypeNode): string[] {
    const types: string[] = [];

    const visit = (node: ts.TypeNode): void => {
      if (ts.isTypeReferenceNode(node)) {
        const typeName = node.typeName.getText();
        // Skip built-in types
        if (!this.isBuiltInType(typeName)) {
          types.push(typeName);
        }

        // Visit type arguments
        if (node.typeArguments) {
          for (const arg of node.typeArguments) {
            visit(arg);
          }
        }
      } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        for (const type of node.types) {
          visit(type);
        }
      } else if (ts.isArrayTypeNode(node)) {
        visit(node.elementType);
      } else if (ts.isTupleTypeNode(node)) {
        for (const element of node.elements) {
          visit(element as ts.TypeNode);
        }
      } else if (ts.isTypeLiteralNode(node)) {
        // Skip inline type literals
      } else if (ts.isFunctionTypeNode(node)) {
        // Visit parameter and return types
        for (const param of node.parameters) {
          if (param.type) {
            visit(param.type);
          }
        }
        if (node.type) {
          visit(node.type);
        }
      }
    };

    visit(typeNode);
    return types;
  }

  /**
   * Check if a type is a built-in TypeScript type
   *
   * @param typeName - Type name to check
   * @returns True if built-in type
   */
  private isBuiltInType(typeName: string): boolean {
    const builtInTypes = new Set([
      'string',
      'number',
      'boolean',
      'void',
      'undefined',
      'null',
      'any',
      'unknown',
      'never',
      'object',
      'Array',
      'Promise',
      'Map',
      'Set',
      'Record',
      'Partial',
      'Required',
      'Readonly',
      'Pick',
      'Omit',
      'Exclude',
      'Extract',
      'NonNullable',
      'Parameters',
      'ReturnType',
      'InstanceType',
    ]);

    return builtInTypes.has(typeName);
  }

  /**
   * Find parent class name for a node
   *
   * @param node - Node to find parent for
   * @returns Class name or undefined
   */
  private findParentClassName(node: ts.Node): string | undefined {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current) && current.name) {
        return current.name.text;
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * Get symbol name from a node
   *
   * @param node - Node to get name from
   * @returns Symbol name or undefined
   */
  private getSymbolName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isClassDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isInterfaceDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      return node.name.text;
    }
    return undefined;
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
}
