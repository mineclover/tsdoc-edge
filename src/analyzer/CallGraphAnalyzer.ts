/**
 * Call Graph Analyzer
 *
 * @packageDocumentation
 * @responsibility Detect function call relationships via AST analysis
 *
 * @problem Functions call each other but no explicit relationship documented
 * @solves Automatic detection of function invocations via ts.isCallExpression
 * @context Essential for understanding execution flow and impact analysis
 *
 * @functionality
 * - Detect function calls using ts.isCallExpression
 * - Resolve call targets (direct calls, property access, etc.)
 * - Handle method calls (obj.method())
 * - Calculate call frequency
 * - Build call graph relationships
 */

import * as ts from 'typescript';
import type { SymbolGraph, Symbol } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Call site information
 */
interface CallSite {
  callerSymbolId: string;
  callerName: string;
  targetName: string;
  targetSymbolId?: string;
  filePath: string;
  line: number;
  callType: 'direct' | 'method' | 'constructor' | 'unknown';
}

/**
 * Call Graph Analyzer
 *
 * @public
 * @responsibility Detect and analyze function call relationships
 */
export class CallGraphAnalyzer {
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
          // Also store with just the filename
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

    // Cache source files (use normalized paths for better matching)
    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        const normalized = sourceFile.fileName.replace(/\\/g, '/');
        this.sourceFiles.set(normalized, sourceFile);
        // Also store with just the filename
        this.sourceFiles.set(sourceFile.fileName, sourceFile);
      }
    }
  }

  /**
   * Analyze call graph across all symbols
   *
   * @returns Array of call relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    if (!this.program) {
      console.warn('CallGraphAnalyzer: No program provided, cannot analyze calls');
      return [];
    }

    const relationships: UnifiedRelationship[] = [];
    const callSites: CallSite[] = [];

    // Extract all call sites
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      if (symbol.type === 'function' || symbol.type === 'method') {
        const sites = this.extractCallSites(symbol);
        callSites.push(...sites);
      }
    }


    // Build call frequency map
    const callFrequency = new Map<string, number>();
    for (const site of callSites) {
      const key = `${site.callerSymbolId}->${site.targetName}`;
      callFrequency.set(key, (callFrequency.get(key) || 0) + 1);
    }

    // Resolve call targets and create relationships
    for (const site of callSites) {
      const targetSymbol = this.resolveCallTarget(site.targetName, site.filePath);

      if (targetSymbol) {
        const key = `${site.callerSymbolId}->${site.targetName}`;
        const frequency = callFrequency.get(key) || 1;

        const relationship = this.createCallRelationship(site, targetSymbol, frequency);
        relationships.push(relationship);
      }
    }

    // Deduplicate relationships (same caller -> callee might appear multiple times)
    const uniqueRels = this.deduplicateRelationships(relationships);

    return uniqueRels;
  }

  /**
   * Extract call sites from a symbol's implementation
   */
  private extractCallSites(symbol: Symbol): CallSite[] {
    const callSites: CallSite[] = [];

    // Try multiple path formats
    const normalized = symbol.filePath.replace(/\\/g, '/');
    let sourceFile = this.sourceFiles.get(symbol.filePath) || this.sourceFiles.get(normalized);

    // If not found, try to find by matching the end of the path
    if (!sourceFile) {
      for (const [key, file] of this.sourceFiles.entries()) {
        if (key.endsWith(normalized) || normalized.endsWith(key)) {
          sourceFile = file;
          break;
        }
      }
    }

    if (!sourceFile) {
      return callSites;
    }

    // Find the symbol's node in the AST
    const symbolNode = this.findSymbolNode(sourceFile, symbol);

    if (!symbolNode) {
      return callSites;
    }

    // Traverse the symbol's body and find all call expressions
    const visitor = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const callSite = this.extractCallSite(node, symbol);
        if (callSite) {
          callSites.push(callSite);
        }
      }

      ts.forEachChild(node, visitor);
    };

    visitor(symbolNode);

    return callSites;
  }

  /**
   * Find the AST node for a symbol
   */
  private findSymbolNode(sourceFile: ts.SourceFile, symbol: Symbol): ts.Node | null {
    let foundNode: ts.Node | null = null;

    const visitor = (node: ts.Node): void => {
      if (!node || foundNode) return;

      try {
        const nodePos = sourceFile.getLineAndCharacterOfPosition(node.getStart());

        if (nodePos.line + 1 === symbol.line) {
          // Check if this is the right kind of node
          if (
            (symbol.type === 'function' && ts.isFunctionDeclaration(node)) ||
            (symbol.type === 'method' && ts.isMethodDeclaration(node)) ||
            (symbol.type === 'class' && ts.isClassDeclaration(node))
          ) {
            foundNode = node;
            return;
          }
        }

        ts.forEachChild(node, visitor);
      } catch (error) {
        // Skip problematic nodes
      }
    };

    visitor(sourceFile);
    return foundNode;
  }

  /**
   * Extract call site information from a call expression
   */
  private extractCallSite(node: ts.CallExpression, caller: Symbol): CallSite | null {
    try {
      const normalized = caller.filePath.replace(/\\/g, '/');
      const sourceFile = this.sourceFiles.get(caller.filePath) || this.sourceFiles.get(normalized);

      if (!sourceFile) {
        // Try to find by endsWith
        for (const [key, file] of this.sourceFiles.entries()) {
          if (key.endsWith(normalized) || normalized.endsWith(key)) {
            const pos = file.getLineAndCharacterOfPosition(node.getStart());
            const targetInfo = this.extractTargetName(node);
            if (!targetInfo) return null;

            return {
              callerSymbolId: caller.id,
              callerName: caller.name,
              targetName: targetInfo.name,
              filePath: caller.filePath,
              line: pos.line + 1,
              callType: targetInfo.callType
            };
          }
        }
        return null;
      }

      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const targetInfo = this.extractTargetName(node);

      if (!targetInfo) {
        return null;
      }

      return {
        callerSymbolId: caller.id,
        callerName: caller.name,
        targetName: targetInfo.name,
        filePath: caller.filePath,
        line: pos.line + 1,
        callType: targetInfo.callType
      };
    } catch (error) {
      // Silently skip problematic call sites
      return null;
    }
  }

  /**
   * Extract target name from call expression
   */
  private extractTargetName(node: ts.CallExpression): { name: string; callType: 'direct' | 'method' | 'constructor' | 'unknown' } | null {
    try {
      if (ts.isIdentifier(node.expression)) {
        // Direct call: foo()
        return {
          name: node.expression.text,
          callType: 'direct'
        };
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        // Method call: obj.method()
        if (ts.isIdentifier(node.expression.name)) {
          return {
            name: node.expression.name.text,
            callType: 'method'
          };
        }
      }
    } catch (error) {
      // Skip problematic expressions
    }

    return null;
  }

  /**
   * Resolve call target to a symbol
   */
  private resolveCallTarget(targetName: string, callerFilePath: string): Symbol | undefined {
    // Try to find the target symbol by name
    // Priority: same file > imported symbols > any symbol with that name

    // 1. Check symbols in the same file
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      if (symbol.filePath === callerFilePath && symbol.name === targetName) {
        return symbol;
      }
    }

    // 2. Check all symbols with matching name (could be imported)
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      if (symbol.name === targetName && symbol.isExported) {
        return symbol;
      }
    }

    // 3. Fallback: any symbol with that name
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      if (symbol.name === targetName) {
        return symbol;
      }
    }

    return undefined;
  }

  /**
   * Create a call relationship
   */
  private createCallRelationship(
    site: CallSite,
    targetSymbol: Symbol,
    frequency: number
  ): UnifiedRelationship {
    const callerSymbol = this.graph.symbols.get(site.callerSymbolId);

    const confidence = this.calculateConfidence(site, targetSymbol, callerSymbol);
    const strength = frequency >= 5 ? 'strong' : frequency >= 2 ? 'medium' : 'weak';

    return {
      id: `call-${site.callerSymbolId}-${targetSymbol.id}`,
      type: 'calls',
      category: 'behavioral',
      from: site.callerSymbolId,
      to: targetSymbol.id,
      direction: 'unidirectional',
      strength,
      evidence: [{
        type: 'code',
        source: site.filePath,
        lineNumber: site.line,
        snippet: `${site.callerName}() calls ${targetSymbol.name}()`,
        confidence,
        context: `Call type: ${site.callType}, Frequency: ${frequency}`
      }],
      discoveredBy: 'static-analysis',
      confidence,
      filePath: site.filePath,
      line: site.line,
      properties: {
        callType: site.callType,
        frequency,
        targetName: targetSymbol.name,
        callerName: site.callerName
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: `${site.callerName} calls ${targetSymbol.name} (${frequency}x)`
    };
  }

  /**
   * Calculate confidence for a call relationship
   */
  private calculateConfidence(
    site: CallSite,
    targetSymbol: Symbol,
    callerSymbol?: Symbol
  ): number {
    let confidence = 0.9; // Base confidence (direct AST analysis)

    // Higher confidence if in same file
    if (targetSymbol.filePath === site.filePath) {
      confidence += 0.1;
    }

    // Lower confidence for 'unknown' call types
    if (site.callType === 'unknown') {
      confidence -= 0.2;
    }

    // Higher confidence if target is exported (more stable API)
    if (targetSymbol.isExported) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Deduplicate relationships (keep highest frequency)
   */
  private deduplicateRelationships(relationships: UnifiedRelationship[]): UnifiedRelationship[] {
    const map = new Map<string, UnifiedRelationship>();

    for (const rel of relationships) {
      const key = `${rel.from}->${rel.to}`;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, rel);
      } else {
        // Keep the one with higher frequency
        const existingFreq = (existing.properties?.frequency as number) || 0;
        const newFreq = (rel.properties?.frequency as number) || 0;

        if (newFreq > existingFreq) {
          map.set(key, rel);
        }
      }
    }

    return Array.from(map.values());
  }

  /**
   * Get call statistics
   *
   * @returns Call statistics
   * @public
   */
  getCallStatistics(relationships: UnifiedRelationship[]): {
    totalCalls: number;
    uniqueCallers: number;
    uniqueCallees: number;
    avgCallsPerFunction: number;
    mostCalledFunctions: Array<{ symbolId: string; count: number }>;
  } {
    const callers = new Set<string>();
    const callees = new Set<string>();
    const calleeCount = new Map<string, number>();

    for (const rel of relationships) {
      const from = typeof rel.from === 'string' ? rel.from : rel.from[0];
      const to = typeof rel.to === 'string' ? rel.to : rel.to[0];

      callers.add(from);
      callees.add(to);

      calleeCount.set(to, (calleeCount.get(to) || 0) + 1);
    }

    const mostCalled = Array.from(calleeCount.entries())
      .map(([symbolId, count]) => ({ symbolId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCalls: relationships.length,
      uniqueCallers: callers.size,
      uniqueCallees: callees.size,
      avgCallsPerFunction: callers.size > 0 ? relationships.length / callers.size : 0,
      mostCalledFunctions: mostCalled
    };
  }
}
