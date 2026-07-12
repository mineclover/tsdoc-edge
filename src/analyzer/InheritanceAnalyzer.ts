/**
 * InheritanceAnalyzer - Enhanced inheritance relationship tracking
 *
 * Features:
 * - Explicit directionality (subclass-to-base vs base-to-subclass)
 * - Abstraction level detection (concrete, abstract, interface, mixin)
 * - Inheritance chain tracking
 * - Override member detection
 *
 * @packageDocumentation
 */

import * as ts from 'typescript';
import type { Symbol } from '../types/graph/graph';
import type {
  AbstractionDetection,
  AbstractionLevel,
  ChainIssue,
  ChainNode,
  HierarchyNode,
  InheritanceChain,
  InheritanceDirection,
  InheritanceHierarchy,
  InheritanceRelationship,
  InheritanceType,
  OverriddenMember,
} from '../types/inheritance';

/**
 * Analyzes inheritance relationships with enhanced metadata
 */
export class InheritanceAnalyzer {
  private program: ts.Program;
  private symbolMap: Map<string, Symbol>;
  private inheritanceCache: Map<string, InheritanceRelationship[]> = new Map();

  constructor(program: ts.Program, symbolMap: Map<string, Symbol>) {
    this.program = program;
    this.symbolMap = symbolMap;
  }

  /**
   * Analyze inheritance for a symbol
   */
  analyzeSymbol(symbol: Symbol): InheritanceRelationship[] {
    // Check cache
    if (this.inheritanceCache.has(symbol.id)) {
      return this.inheritanceCache.get(symbol.id)!;
    }

    const relationships: InheritanceRelationship[] = [];

    // Get source file
    const sourceFile = this.program.getSourceFile(symbol.filePath);
    if (!sourceFile) {
      return relationships;
    }

    // Find the node for this symbol
    const node = this.findSymbolNode(sourceFile, symbol);
    if (!node) {
      return relationships;
    }

    // Analyze based on symbol type
    if (ts.isClassDeclaration(node)) {
      relationships.push(...this.analyzeClassInheritance(node, symbol));
    } else if (ts.isInterfaceDeclaration(node)) {
      relationships.push(...this.analyzeInterfaceInheritance(node, symbol));
    }

    this.inheritanceCache.set(symbol.id, relationships);
    return relationships;
  }

  /**
   * Analyze class inheritance
   */
  private analyzeClassInheritance(
    node: ts.ClassDeclaration,
    symbol: Symbol
  ): InheritanceRelationship[] {
    const relationships: InheritanceRelationship[] = [];

    if (!node.heritageClauses) {
      return relationships;
    }

    for (const clause of node.heritageClauses) {
      if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
        // Class extends base class
        for (const type of clause.types) {
          const baseClass = this.resolveTypeReference(type);
          if (baseClass) {
            const rel = this.createInheritanceRelationship(symbol, baseClass, 'extends', node);
            relationships.push(rel);
          }
        }
      } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
        // Class implements interface
        for (const type of clause.types) {
          const iface = this.resolveTypeReference(type);
          if (iface) {
            const rel = this.createInheritanceRelationship(symbol, iface, 'implements', node);
            relationships.push(rel);
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Analyze interface inheritance
   */
  private analyzeInterfaceInheritance(
    node: ts.InterfaceDeclaration,
    symbol: Symbol
  ): InheritanceRelationship[] {
    const relationships: InheritanceRelationship[] = [];

    if (!node.heritageClauses) {
      return relationships;
    }

    for (const clause of node.heritageClauses) {
      if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
        for (const type of clause.types) {
          const parentInterface = this.resolveTypeReference(type);
          if (parentInterface) {
            const rel = this.createInheritanceRelationship(
              symbol,
              parentInterface,
              'extends',
              node
            );
            relationships.push(rel);
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Create inheritance relationship with metadata
   */
  private createInheritanceRelationship(
    childSymbol: Symbol,
    parentSymbol: Symbol,
    type: InheritanceType,
    _node: ts.Node
  ): InheritanceRelationship {
    const childAbstraction = this.detectAbstractionLevel(childSymbol);
    const parentAbstraction = this.detectAbstractionLevel(parentSymbol);

    const chain = this.buildInheritanceChain(childSymbol.id, parentSymbol.id);
    const overriddenMembers = this.detectOverriddenMembers(childSymbol, parentSymbol);

    return {
      id: `${childSymbol.id}-${type}-${parentSymbol.id}`,
      type,
      from: childSymbol.id,
      to: parentSymbol.id,
      direction: 'subclass-to-base' as InheritanceDirection,
      abstractionLevel: {
        from: childAbstraction.level,
        to: parentAbstraction.level,
      },
      hierarchyDepth: 0, // Direct inheritance
      inheritanceChain: chain.chain.map((n) => n.symbolName),
      overriddenMembers,
      filePath: childSymbol.filePath,
      line: childSymbol.line,
    };
  }

  /**
   * Detect abstraction level of symbol
   */
  detectAbstractionLevel(symbol: Symbol): AbstractionDetection {
    const reasons: string[] = [];
    let level: AbstractionLevel = 'concrete' as AbstractionLevel;
    let confidence = 0.9;

    // Interface
    if (symbol.type === 'interface') {
      level = 'interface' as AbstractionLevel;
      reasons.push('TypeScript interface declaration');
      confidence = 1.0;
      return { symbolId: symbol.id, level, confidence, reasons, evidence: { isInterface: true } };
    }

    // Check for abstract keyword (from name or summary)
    const hasAbstractKeyword =
      symbol.name.includes('Abstract') || symbol.summary?.includes('abstract') || false;

    if (hasAbstractKeyword) {
      level = 'abstract' as AbstractionLevel;
      reasons.push('Has abstract keyword or prefix');
      confidence = 0.8;
      return {
        symbolId: symbol.id,
        level,
        confidence,
        reasons,
        evidence: { hasAbstractKeyword: true },
      };
    }

    // Mixin detection (heuristic)
    const isMixin =
      symbol.name.endsWith('Mixin') ||
      symbol.name.startsWith('with') ||
      symbol.summary?.includes('mixin');

    if (isMixin) {
      level = 'mixin' as AbstractionLevel;
      reasons.push('Naming pattern suggests mixin');
      confidence = 0.7;
      return { symbolId: symbol.id, level, confidence, reasons, evidence: {} };
    }

    // Default: concrete
    reasons.push('No abstract indicators, assuming concrete');
    return {
      symbolId: symbol.id,
      level: 'concrete' as AbstractionLevel,
      confidence,
      reasons,
      evidence: { canInstantiate: true },
    };
  }

  /**
   * Build inheritance chain
   */
  buildInheritanceChain(childId: string, parentId: string): InheritanceChain {
    const chain: ChainNode[] = [];
    const visited = new Set<string>();
    const issues: ChainIssue[] = [];

    let currentId = childId;
    let depth = 0;

    while (currentId) {
      // Circular dependency detection
      if (visited.has(currentId)) {
        issues.push({
          type: 'circular-dependency',
          description: `Circular inheritance detected at ${currentId}`,
          affectedSymbols: Array.from(visited),
          severity: 'error',
        });
        break;
      }

      visited.add(currentId);

      const symbol = this.symbolMap.get(currentId);
      if (!symbol) {
        issues.push({
          type: 'missing-parent',
          description: `Symbol ${currentId} not found`,
          affectedSymbols: [currentId],
          severity: 'warning',
        });
        break;
      }

      const abstraction = this.detectAbstractionLevel(symbol);
      chain.push({
        symbolId: currentId,
        symbolName: symbol.name,
        abstractionLevel: abstraction.level,
        depth,
      });

      // Stop at parent
      if (currentId === parentId) {
        break;
      }

      // Find next parent
      // This is simplified - in production, parse AST to find actual parent
      currentId = ''; // Will be resolved from relationships
      depth++;
    }

    return {
      root: childId,
      chain,
      depth,
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Detect overridden members
   */
  private detectOverriddenMembers(_childSymbol: Symbol, _parentSymbol: Symbol): OverriddenMember[] {
    const overridden: OverriddenMember[] = [];

    // Simplified - in production, use TypeScript API to compare members
    // For now, return empty array
    // TODO: Implement actual member comparison using ts.TypeChecker

    return overridden;
  }

  /**
   * Build inheritance hierarchy (all descendants)
   */
  buildHierarchy(rootSymbolId: string): InheritanceHierarchy | null {
    const rootSymbol = this.symbolMap.get(rootSymbolId);
    if (!rootSymbol) {
      return null;
    }

    const abstraction = this.detectAbstractionLevel(rootSymbol);
    const _children = this.findDirectChildren(rootSymbolId);

    let totalDescendants = 0;
    let maxDepth = 0;

    const buildTree = (symbolId: string, depth: number): HierarchyNode[] => {
      const directChildren = this.findDirectChildren(symbolId);
      const nodes: HierarchyNode[] = [];

      for (const childId of directChildren) {
        const childSymbol = this.symbolMap.get(childId);
        if (!childSymbol) continue;

        totalDescendants++;
        maxDepth = Math.max(maxDepth, depth + 1);

        const childAbstraction = this.detectAbstractionLevel(childSymbol);
        const grandChildren = buildTree(childId, depth + 1);

        nodes.push({
          symbolId: childId,
          symbolName: childSymbol.name,
          abstractionLevel: childAbstraction.level,
          depth: depth + 1,
          children: grandChildren,
          overrides: [], // TODO: Implement override detection
        });
      }

      return nodes;
    };

    const childNodes = buildTree(rootSymbolId, 0);

    return {
      root: rootSymbolId,
      rootName: rootSymbol.name,
      rootAbstraction: abstraction.level,
      children: childNodes,
      totalDescendants,
      maxDepth,
    };
  }

  /**
   * Find direct children (subclasses) of a symbol
   */
  private findDirectChildren(symbolId: string): string[] {
    const children: string[] = [];

    // Search all symbols for those that extend/implement this symbol
    for (const [id, symbol] of this.symbolMap.entries()) {
      const relationships = this.analyzeSymbol(symbol);
      for (const rel of relationships) {
        if (rel.to === symbolId && rel.hierarchyDepth === 0) {
          children.push(id);
        }
      }
    }

    return children;
  }

  /**
   * Resolve type reference to symbol
   */
  private resolveTypeReference(typeNode: ts.ExpressionWithTypeArguments): Symbol | null {
    const typeName = typeNode.expression.getText();

    // Find symbol by name (simplified)
    for (const symbol of this.symbolMap.values()) {
      if (symbol.name === typeName) {
        return symbol;
      }
    }

    return null;
  }

  /**
   * Find symbol node in source file
   */
  private findSymbolNode(sourceFile: ts.SourceFile, symbol: Symbol): ts.Node | null {
    let found: ts.Node | null = null;

    const visit = (node: ts.Node) => {
      if (found) return;

      // Check if this node matches the symbol
      if (
        (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        node.name?.getText() === symbol.name
      ) {
        const nodePos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        if (nodePos.line + 1 === symbol.line) {
          found = node;
          return;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return found;
  }
}
