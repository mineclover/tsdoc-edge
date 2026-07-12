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
import type { Symbol, SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Call site information
 */
interface CallSite {
  callerSymbolId: string;
  callerName: string;
  targetName: string;
  objectName?: string;
  targetSymbolId?: string;
  filePath: string;
  line: number;
  callType: 'direct' | 'method' | 'constructor' | 'unknown';
}

/**
 * Call Graph Analyzer
 *
 * @doc [[CallGraphAnalyzer]]
 * @public
 * @responsibility Detect and analyze function call relationships
 * @requires SymbolGraph
 */
export class CallGraphAnalyzer {
  private graph: SymbolGraph;
  private program: ts.Program | null = null;
  private sourceFiles: Map<string, ts.SourceFile> = new Map();

  // Symbol lookup indexes for O(1) access instead of O(n) iteration
  private symbolsByName: Map<string, Symbol[]> = new Map();
  private symbolsByFile: Map<string, Symbol[]> = new Map();
  private exportedSymbols: Symbol[] = [];
  private indexesBuilt: boolean = false;

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program || null;

    // Cache source files if program is provided
    if (this.program) {
      this.cacheSourceFiles(this.program);
    }
  }

  /**
   * Cache source files from program with multiple lookup keys
   */
  private cacheSourceFiles(program: ts.Program): void {
    this.sourceFiles.clear();
    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        const normalized = sourceFile.fileName.replace(/\\/g, '/');
        this.sourceFiles.set(normalized, sourceFile);
        // Also index by filename for faster lookup
        const fileName = normalized.split('/').pop();
        if (fileName) {
          // Store with filename key only if not already set (avoid collisions)
          if (!this.sourceFiles.has(fileName)) {
            this.sourceFiles.set(fileName, sourceFile);
          }
        }
      }
    }
  }

  /**
   * Get source file with fallback path matching
   */
  private getSourceFile(filePath: string): ts.SourceFile | undefined {
    const normalized = filePath.replace(/\\/g, '/');

    // Try direct lookup first
    let sourceFile = this.sourceFiles.get(normalized);
    if (sourceFile) return sourceFile;

    // Try filename only
    const fileName = normalized.split('/').pop();
    if (fileName) {
      sourceFile = this.sourceFiles.get(fileName);
      if (sourceFile) return sourceFile;
    }

    // Fallback: check path suffixes (rare case)
    for (const [key, file] of this.sourceFiles.entries()) {
      if (key.endsWith(normalized) || normalized.endsWith(key)) {
        return file;
      }
    }

    return undefined;
  }

  /**
   * Build symbol lookup indexes for fast resolution
   */
  private buildSymbolIndexes(): void {
    if (this.indexesBuilt) return;

    this.symbolsByName.clear();
    this.symbolsByFile.clear();
    this.exportedSymbols = [];

    for (const symbol of this.graph.symbols.values()) {
      // Index by name
      const byName = this.symbolsByName.get(symbol.name) || [];
      byName.push(symbol);
      this.symbolsByName.set(symbol.name, byName);

      // Index by method suffix (e.g., "methodName" from "ClassName.methodName")
      if (symbol.name.includes('.')) {
        const methodName = symbol.name.split('.').pop()!;
        const byMethodName = this.symbolsByName.get(methodName) || [];
        byMethodName.push(symbol);
        this.symbolsByName.set(methodName, byMethodName);
      }

      // Index by file
      const normalized = symbol.filePath.replace(/\\/g, '/');
      const byFile = this.symbolsByFile.get(normalized) || [];
      byFile.push(symbol);
      this.symbolsByFile.set(normalized, byFile);

      // Track exported symbols
      if (symbol.isExported) {
        this.exportedSymbols.push(symbol);
      }
    }

    this.indexesBuilt = true;
  }

  /**
   * Set TypeScript program for AST analysis
   *
   * @param program - TypeScript program
   * @returns void - No return value
   * @public
   */
  setProgram(program: ts.Program): void {
    this.program = program;
    this.cacheSourceFiles(program);
    // Invalidate indexes so they get rebuilt on next analyze()
    this.indexesBuilt = false;
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

    // Build indexes once before resolution
    this.buildSymbolIndexes();

    const relationships: UnifiedRelationship[] = [];
    const callSites: CallSite[] = [];

    // Extract all call sites
    for (const [_symbolId, symbol] of this.graph.symbols.entries()) {
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
      const targetSymbol = this.resolveCallTarget(site.targetName, site.filePath, site.objectName);

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

    // Use optimized source file lookup
    const sourceFile = this.getSourceFile(symbol.filePath);
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
   * Uses name-based matching with line number as fallback
   */
  private findSymbolNode(sourceFile: ts.SourceFile, symbol: Symbol): ts.Node | null {
    let foundNode: ts.Node | null = null;
    const candidatesByName: ts.Node[] = [];

    // Extract method name from "ClassName.methodName" format
    const symbolMethodName = symbol.name.includes('.')
      ? symbol.name.split('.').pop() || symbol.name
      : symbol.name;

    const visitor = (node: ts.Node): void => {
      if (!node || foundNode) return;

      try {
        // Check node type first
        const isCorrectType =
          (symbol.type === 'function' && ts.isFunctionDeclaration(node)) ||
          (symbol.type === 'method' && ts.isMethodDeclaration(node)) ||
          (symbol.type === 'class' && ts.isClassDeclaration(node));

        if (isCorrectType) {
          // Try to get the node's name
          const nodeName = this.getNodeName(node);

          if (nodeName === symbolMethodName) {
            try {
              // Name matches - check if line also matches (exact match)
              const nodePos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
              const lineDiff = Math.abs(nodePos.line + 1 - symbol.line);

              if (lineDiff === 0) {
                // Perfect match
                foundNode = node;
                return;
              } else {
                // Any name match is a candidate
                candidatesByName.push(node);
              }
            } catch (_error) {
              // Skip problematic nodes
            }
          }
        }

        // Recursively visit children (important for class members!)
        node.forEachChild(visitor);
      } catch (_error) {
        // Skip problematic nodes
      }
    };

    visitor(sourceFile);

    // If no perfect match, use first candidate
    if (!foundNode && candidatesByName.length > 0) {
      foundNode = candidatesByName[0];
    }

    return foundNode;
  }

  /**
   * Get the name of a node
   */
  private getNodeName(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    if (ts.isClassDeclaration(node) && node.name) {
      return node.name.text;
    }
    return null;
  }

  /**
   * Extract call site information from a call expression
   */
  private extractCallSite(node: ts.CallExpression, caller: Symbol): CallSite | null {
    try {
      // Use optimized source file lookup
      const sourceFile = this.getSourceFile(caller.filePath);
      if (!sourceFile) {
        return null;
      }

      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const targetInfo = this.extractTargetName(node);

      if (!targetInfo) {
        return null;
      }

      return {
        callerSymbolId: caller.id,
        callerName: caller.name,
        targetName: targetInfo.name,
        objectName: targetInfo.objectName,
        filePath: caller.filePath,
        line: pos.line + 1,
        callType: targetInfo.callType,
      };
    } catch (_error) {
      // Silently skip problematic call sites
      return null;
    }
  }

  /**
   * Extract target name from call expression
   */
  private extractTargetName(node: ts.CallExpression): {
    name: string;
    callType: 'direct' | 'method' | 'constructor' | 'unknown';
    objectName?: string;
  } | null {
    try {
      if (ts.isIdentifier(node.expression)) {
        // Direct call: foo()
        const name = node.expression.text;

        // Skip built-in global functions
        if (this.isBuiltInGlobal(name)) {
          return null;
        }

        return {
          name,
          callType: 'direct',
        };
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        // Method call: obj.method()
        const methodName = ts.isIdentifier(node.expression.name) ? node.expression.name.text : null;
        const objectName = ts.isIdentifier(node.expression.expression)
          ? node.expression.expression.text
          : null;

        if (!methodName) return null;

        // Skip built-in object methods (Object.entries, Array.from, etc.)
        if (objectName && this.isBuiltInObject(objectName)) {
          return null;
        }

        return {
          name: methodName,
          callType: 'method',
          objectName: objectName || undefined,
        };
      }
    } catch (_error) {
      // Skip problematic expressions
    }

    return null;
  }

  /**
   * Check if name is a built-in global function
   */
  private isBuiltInGlobal(name: string): boolean {
    const builtins = [
      'require',
      'import',
      'export',
      'parseInt',
      'parseFloat',
      'isNaN',
      'isFinite',
      'encodeURI',
      'decodeURI',
      'encodeURIComponent',
      'decodeURIComponent',
      'eval',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
    ];
    return builtins.includes(name);
  }

  /**
   * Check if name is a built-in object
   */
  private isBuiltInObject(name: string): boolean {
    const builtins = [
      'Object',
      'Array',
      'String',
      'Number',
      'Boolean',
      'Date',
      'RegExp',
      'Math',
      'JSON',
      'Promise',
      'Set',
      'Map',
      'WeakSet',
      'WeakMap',
      'Symbol',
      'Proxy',
      'Reflect',
      'console',
      'process',
      'Buffer',
      'Error',
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'Intl',
      'globalThis',
      'window',
      'document',
    ];
    return builtins.includes(name);
  }

  /**
   * Resolve call target to a symbol using indexed lookups (O(1) instead of O(n))
   */
  private resolveCallTarget(
    targetName: string,
    callerFilePath: string,
    objectName?: string
  ): Symbol | undefined {
    const normalizedPath = callerFilePath.replace(/\\/g, '/');

    // 1. Check symbols in the same file first (highest priority)
    const fileSymbols = this.symbolsByFile.get(normalizedPath);
    if (fileSymbols) {
      // For methods, try to match ClassName.methodName
      if (objectName) {
        const fullName = `${objectName}.${targetName}`;
        const match = fileSymbols.find((s) => s.name === fullName);
        if (match) return match;
      }

      // Direct name match in same file
      const directMatch = fileSymbols.find((s) => s.name === targetName);
      if (directMatch) return directMatch;

      // Method name without class prefix
      const methodMatch = fileSymbols.find((s) => s.name.endsWith(`.${targetName}`));
      if (methodMatch) return methodMatch;
    }

    // 2. Get candidates by name from index
    const candidates = this.symbolsByName.get(targetName) || [];

    // Check exported symbols first (likely imports)
    for (const symbol of candidates) {
      if (symbol.isExported) {
        if (objectName && symbol.name === `${objectName}.${targetName}`) {
          return symbol;
        }
        if (symbol.name === targetName) {
          return symbol;
        }
      }
    }

    // 3. Fallback: any symbol with that name (prefer functions/methods)
    let bestMatch: Symbol | undefined;
    for (const symbol of candidates) {
      if (symbol.type === 'function' || symbol.type === 'method') {
        return symbol;
      }
      if (!bestMatch) {
        bestMatch = symbol;
      }
    }

    // Also check method suffix matches if no direct match found
    if (!bestMatch) {
      for (const symbol of candidates) {
        if (symbol.name.endsWith(`.${targetName}`) && symbol.type === 'method') {
          return symbol;
        }
      }
    }

    return bestMatch;
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
      evidence: [
        {
          type: 'code',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `${site.callerName}() calls ${targetSymbol.name}()`,
          confidence,
          context: `Call type: ${site.callType}, Frequency: ${frequency}`,
        },
      ],
      discoveredBy: 'static-analysis',
      confidence,
      filePath: site.filePath,
      line: site.line,
      properties: {
        callType: site.callType,
        frequency,
        targetName: targetSymbol.name,
        callerName: site.callerName,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: `${site.callerName} calls ${targetSymbol.name} (${frequency}x)`,
    };
  }

  /**
   * Calculate confidence for a call relationship
   */
  private calculateConfidence(
    site: CallSite,
    targetSymbol: Symbol,
    _callerSymbol?: Symbol
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
   * @param relationships - Unified relationships to analyze
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
      mostCalledFunctions: mostCalled,
    };
  }
}
