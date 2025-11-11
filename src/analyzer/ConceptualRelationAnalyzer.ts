/**
 * Conceptual Relation Analyzer
 * @packageDocumentation
 * @responsibility Analyze conceptual relationships between symbols
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Conceptual relation pattern
 * @private
 */
interface ConceptualRelationSite {
  symbolA: string;
  symbolB: string;
  filePath: string;
  line: number;
  relationshipType?: string;
}

/**
 * Analyzes conceptual relationships between symbols
 *
 * @public
 * @responsibility Detect semantic/conceptual connections
 *
 * Pattern: A and B are conceptually related
 * - Related concepts (User and Authentication)
 * - Domain connections (Order and Payment)
 * - Semantic similarity
 *
 * Detection:
 * 1. Parse @relatedTo tags in TSDoc
 * 2. Analyze naming patterns (UserService, UserRepository)
 * 3. Detect shared domain prefixes
 *
 * @example
 * ```typescript
 * /**
 *  * User authentication service
 *  * @relatedTo UserRepository
 *  * @relatedTo AuthenticationToken
 *  *\/
 * export class UserService {}
 * ```
 */
export class ConceptualRelationAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze conceptual relationships
   *
   * @param rootDir - Root directory to analyze
   * @returns Array of conceptual relationships
   */
  analyze(rootDir: string): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    // Collect from @relatedTo tags
    const taggedSites = this.collectTaggedRelations(rootDir);
    for (const site of taggedSites) {
      const relationship = this.createRelationship(site);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    // Collect from naming patterns
    const patternSites = this.detectNamingPatterns();
    for (const site of patternSites) {
      const relationship = this.createRelationship(site);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect @relatedTo tags
   *
   * @param rootDir - Root directory
   * @returns Array of relation sites
   * @private
   */
  private collectTaggedRelations(rootDir: string): ConceptualRelationSite[] {
    const sites: ConceptualRelationSite[] = [];
    const files = this.findTypeScriptFiles(rootDir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
        this.extractRelationsFromFile(sourceFile, file, sites);
      } catch (error) {
        // Skip files that cause errors
      }
    }

    return sites;
  }

  /**
   * Extract relations from source file
   *
   * @param sourceFile - Source file
   * @param filePath - File path
   * @param sites - Array to collect sites
   * @private
   */
  private extractRelationsFromFile(
    sourceFile: ts.SourceFile,
    filePath: string,
    sites: ConceptualRelationSite[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        const jsDocTags = ts.getJSDocTags(node);
        if (jsDocTags && jsDocTags.length > 0) {
          const symbolName = this.getSymbolName(node);

          if (symbolName) {
            for (const tag of jsDocTags) {
              if (tag.tagName.text === 'relatedTo') {
                const relatedSymbol = this.getTagComment(tag);
                if (relatedSymbol) {
                  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                  sites.push({
                    symbolA: symbolName,
                    symbolB: relatedSymbol.trim(),
                    filePath,
                    line,
                    relationshipType: 'explicit-tag',
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
   * Detect naming pattern relationships
   *
   * @returns Array of relation sites
   * @private
   */
  private detectNamingPatterns(): ConceptualRelationSite[] {
    const sites: ConceptualRelationSite[] = [];
    const symbolsByPrefix = new Map<string, any[]>();

    // Group symbols by common prefix
    for (const symbol of this.graph.symbols.values()) {
      const prefix = this.extractPrefix(symbol.name);
      if (prefix) {
        if (!symbolsByPrefix.has(prefix)) {
          symbolsByPrefix.set(prefix, []);
        }
        symbolsByPrefix.get(prefix)!.push(symbol);
      }
    }

    // Create relationships for symbols with same prefix
    for (const [prefix, symbols] of symbolsByPrefix.entries()) {
      if (symbols.length >= 2) {
        // Create pairwise relationships
        for (let i = 0; i < symbols.length; i++) {
          for (let j = i + 1; j < symbols.length; j++) {
            sites.push({
              symbolA: symbols[i].id,
              symbolB: symbols[j].id,
              filePath: symbols[i].filePath,
              line: symbols[i].line,
              relationshipType: 'naming-pattern',
            });
          }
        }
      }
    }

    return sites;
  }

  /**
   * Extract prefix from symbol name
   *
   * @param name - Symbol name
   * @returns Prefix or null
   * @private
   */
  private extractPrefix(name: string): string | null {
    // Remove common suffixes
    const withoutSuffix = name
      .replace(/Service$/, '')
      .replace(/Controller$/, '')
      .replace(/Repository$/, '')
      .replace(/Manager$/, '')
      .replace(/Handler$/, '')
      .replace(/Helper$/, '')
      .replace(/Util$/, '');

    // Need at least 3 characters for prefix
    if (withoutSuffix.length >= 3) {
      return withoutSuffix;
    }

    return null;
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
   * @param site - Conceptual relation site
   * @returns Unified relationship or null
   * @private
   */
  private createRelationship(site: ConceptualRelationSite): UnifiedRelationship | null {
    const timestamp = new Date().toISOString();
    const confidence = site.relationshipType === 'explicit-tag' ? 1.0 : 0.6;

    return {
      id: `conceptual-relation-${site.symbolA}-${site.symbolB}`,
      type: 'conceptual-relation',
      from: site.symbolA,
      to: site.symbolB,
      direction: 'undirected',
      strength: 'weak',
      category: 'semantic',
      evidence: [
        {
          type: site.relationshipType === 'explicit-tag' ? 'documentation' : 'code',
          source: site.filePath,
          lineNumber: site.line,
          snippet: site.relationshipType === 'explicit-tag'
            ? `@relatedTo ${site.symbolB}`
            : 'naming pattern',
          confidence,
          context: `Conceptual relation (${site.relationshipType})`
        }
      ],
      discoveredBy: site.relationshipType === 'explicit-tag' ? 'documentation' : 'static-analysis',
      confidence,
      filePath: site.filePath,
      line: site.line,
      properties: {
        relationshipType: site.relationshipType,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${site.symbolA} ~ ${site.symbolB} (conceptually related)`
    };
  }

  /**
   * Get statistics
   *
   * @param relationships - Conceptual relationships
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    byType: Record<string, number>;
    uniqueSymbols: number;
  } {
    const symbols = new Set<string>();
    const byType: Record<string, number> = {};

    for (const rel of relationships) {
      const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
      const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
      fromSymbols.forEach(s => symbols.add(s));
      toSymbols.forEach(s => symbols.add(s));

      const relType = rel.properties?.relationshipType || 'unknown';
      byType[relType] = (byType[relType] || 0) + 1;
    }

    return {
      total: relationships.length,
      byType,
      uniqueSymbols: symbols.size,
    };
  }
}
