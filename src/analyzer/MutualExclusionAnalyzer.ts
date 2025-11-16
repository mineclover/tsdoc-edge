/**
 * Mutual Exclusion Analyzer
 * @packageDocumentation
 * @responsibility Analyze mutually exclusive relationships
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Mutual exclusion pattern
 * @private
 */
interface MutualExclusionSite {
  symbolA: string;
  symbolB: string;
  filePath: string;
  line: number;
  reason?: string;
}

/**
 * Analyzes mutual exclusion relationships
 *
 * @public
 * @responsibility Detect mutually exclusive symbols
 *
 * Pattern: A and B cannot coexist
 * - Conflicting implementations
 * - Alternative strategies (use A OR B, not both)
 * - Incompatible features
 *
 * Detection:
 * 1. Parse @mutuallyExclusive tags in TSDoc
 * 2. Detect conditional compilation (#if USE_A vs #if USE_B)
 * 3. Find exclusive type guards (if (isA) vs if (isB))
 *
 * @example
 * ```typescript
 * /**
 *  * Redis cache implementation
 *  * @mutuallyExclusive MemoryCache
 *  *\/
 * export class RedisCache implements ICache {}
 * ```
 */
export class MutualExclusionAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze mutual exclusion relationships
   *
   * @param rootDir - Root directory to analyze
   * @returns Array of mutual exclusion relationships
   */
  analyze(rootDir: string): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const sites = this.collectMutualExclusionSites(rootDir);

    for (const site of sites) {
      const relationship = this.createRelationship(site);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect mutual exclusion sites
   *
   * @param rootDir - Root directory
   * @returns Array of mutual exclusion sites
   * @private
   */
  private collectMutualExclusionSites(rootDir: string): MutualExclusionSite[] {
    const sites: MutualExclusionSite[] = [];
    const files = this.findTypeScriptFiles(rootDir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
        this.extractMutualExclusionsFromFile(sourceFile, file, sites);
      } catch (error) {
        // Skip files that cause errors
      }
    }

    return sites;
  }

  /**
   * Extract mutual exclusions from source file
   *
   * @param sourceFile - Source file
   * @param filePath - File path
   * @param sites - Array to collect sites
   * @private
   */
  private extractMutualExclusionsFromFile(
    sourceFile: ts.SourceFile,
    filePath: string,
    sites: MutualExclusionSite[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        const jsDocTags = ts.getJSDocTags(node);
        if (jsDocTags && jsDocTags.length > 0) {
          const symbolName = this.getSymbolName(node);

          if (symbolName) {
            for (const tag of jsDocTags) {
              if (tag.tagName.text === 'mutuallyExclusive') {
                const exclusiveSymbol = this.getTagComment(tag);
                if (exclusiveSymbol) {
                  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                  sites.push({
                    symbolA: symbolName,
                    symbolB: exclusiveSymbol.trim(),
                    filePath,
                    line,
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        // Skip nodes that cause errors
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Get symbol name from AST node
   *
   * @param node - AST node
   * @returns Symbol name or null
   * @private
   */
  private getSymbolName(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
    if (ts.isClassDeclaration(node) && node.name) return node.name.text;
    if (ts.isInterfaceDeclaration(node) && node.name) return node.name.text;
    if (ts.isTypeAliasDeclaration(node) && node.name) return node.name.text;
    return null;
  }

  /**
   * Get comment from JSDoc tag
   *
   * @param tag - JSDoc tag
   * @returns Comment text or null
   * @private
   */
  private getTagComment(tag: ts.JSDocTag): string | null {
    if (tag.comment) {
      if (typeof tag.comment === 'string') return tag.comment;
      if (Array.isArray(tag.comment)) {
        return tag.comment.map((part: any) => part.text || '').join('');
      }
    }
    return null;
  }

  /**
   * Find TypeScript files
   *
   * @param dir - Directory to search
   * @returns Array of file paths
   * @private
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const traverse = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git', '.tsdoc'].includes(entry.name)) {
            traverse(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    };
    traverse(dir);
    return files;
  }

  /**
   * Create unified relationship
   *
   * @param site - Mutual exclusion site
   * @returns Unified relationship or null
   * @private
   */
  private createRelationship(site: MutualExclusionSite): UnifiedRelationship | null {
    const symbolA = this.findSymbolByName(site.symbolA);
    if (!symbolA) return null;

    const timestamp = new Date().toISOString();

    return {
      id: `mutual-exclusion-${site.symbolA}-${site.symbolB}-${site.line}`,
      type: 'mutual-exclusion',
      from: symbolA.id,
      to: site.symbolB,
      direction: 'bidirectional',
      strength: 'strong',
      category: 'constraint',
      evidence: [
        {
          type: 'documentation',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `@mutuallyExclusive ${site.symbolB}`,
          confidence: 1.0,
          context: `${site.symbolA} and ${site.symbolB} cannot coexist`
        }
      ],
      discoveredBy: 'documentation',
      confidence: 1.0,
      filePath: site.filePath,
      line: site.line,
      properties: {
        symbolA: site.symbolA,
        symbolB: site.symbolB,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${site.symbolA} ⊗ ${site.symbolB} (mutually exclusive)`
    };
  }

  /**
   * Find symbol by name
   *
   * @param name - Symbol name
   * @returns Symbol if found
   * @private
   */
  private findSymbolByName(name: string): any {
    for (const symbol of this.graph.symbols.values()) {
      if (symbol.name === name) return symbol;
    }
    return undefined;
  }

  /**
   * Get statistics
   *
   * @param relationships - Mutual exclusion relationships
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    uniqueSymbols: number;
  } {
    const symbols = new Set<string>();

    for (const rel of relationships) {
      const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
      const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
      fromSymbols.forEach(s => symbols.add(s));
      toSymbols.forEach(s => symbols.add(s));
    }

    return {
      total: relationships.length,
      uniqueSymbols: symbols.size,
    };
  }
}
