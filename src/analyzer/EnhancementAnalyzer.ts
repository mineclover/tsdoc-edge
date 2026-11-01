/**
 * Enhancement Analyzer
 * @packageDocumentation
 * @responsibility Analyze `@enhances` tags in TSDoc comments
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { extractLeadingJsDocText, readTsdocComment, TSDocParser } from '../parser/TSDocParser';
import type { Symbol, SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Enhancement relationship data
 * @internal
 */
interface EnhancementSite {
  enhancerSymbol: string;
  enhancedSymbol: string;
  filePath: string;
  line: number;
  context?: string;
}

/**
 * Analyzes enhancement relationships (`@enhances` tags)
 *
 * @doc [[EnhancementAnalyzer]]
 * @public
 * @responsibility Detect code enhancements via `@enhances` tags
 *
 * Pattern: A enhances B
 * - A extends B's functionality
 * - A adds new features to B
 * - A improves B's performance or capability
 *
 * Detection:
 * 1. Parse all TypeScript files for `@enhances` tags in TSDoc comments
 * 2. Extract symbol names from `@enhances` tags
 * 3. Create relationships from enhancer to enhanced
 *
 * Evidence:
 * - File path, line number
 * - JSDoc comment text
 * - Symbol names
 *
 * @example
 * ```typescript
 * /**
 *  * Advanced caching mechanism
 *  * @enhances DatabaseManager
 *  *\/
 * export class CachedDatabase extends DatabaseManager {
 *   // Enhances DatabaseManager with caching
 * }
 * ```
 */
export class EnhancementAnalyzer {
  private graph: SymbolGraph;
  private readonly tsdocParser = new TSDocParser();

  /**
   * Creates an EnhancementAnalyzer instance
   *
   * @param graph - Symbol graph
   */
  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze enhancement relationships
   *
   * @param rootDir - Root directory to analyze
   * @returns Array of enhancement relationships
   */
  analyze(rootDir: string): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const sites = this.collectEnhancementSites(rootDir);

    for (const site of sites) {
      const relationship = this.createRelationship(site);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect all `@enhances` tags from TypeScript files
   *
   * @param rootDir - Root directory
   * @returns Array of enhancement sites
   */
  private collectEnhancementSites(rootDir: string): EnhancementSite[] {
    const sites: EnhancementSite[] = [];
    const files = this.findTypeScriptFiles(rootDir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

        this.extractEnhancementsFromFile(sourceFile, file, sites);
      } catch (_error) {
        // Skip files that cause parsing errors
      }
    }

    return sites;
  }

  /**
   * Extract `@enhances` tags from a source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param sites - Array to collect sites
   */
  private extractEnhancementsFromFile(
    sourceFile: ts.SourceFile,
    filePath: string,
    sites: EnhancementSite[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        const symbolName = this.getSymbolName(node);
        if (symbolName) {
          const jsDoc = extractLeadingJsDocText(node, sourceFile);
          if (jsDoc) {
            const structured = readTsdocComment(this.tsdocParser.parseString(jsDoc).docComment);
            for (const rawTarget of structured.getTagValues('@enhances')) {
              const enhancedSymbol = rawTarget.trim();
              if (enhancedSymbol) {
                const line =
                  sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                sites.push({
                  enhancerSymbol: symbolName,
                  enhancedSymbol,
                  filePath,
                  line,
                });
              }
            }
          }
        }
      } catch (_error) {
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
   */
  private getSymbolName(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isClassDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isInterfaceDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isTypeAliasDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0] as
        | ts.VariableDeclaration
        | undefined;
      if (declaration && ts.isIdentifier(declaration.name)) {
        return declaration.name.text;
      }
    }
    return null;
  }

  /**
   * Find all TypeScript files in directory
   *
   * @param dir - Directory to search
   * @returns Array of file paths
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    const traverse = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, dist, build, etc.
          if (['node_modules', 'dist', 'build', '.git', '.tsdoc'].includes(entry.name)) {
            continue;
          }
          traverse(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    };

    traverse(dir);
    return files;
  }

  /**
   * Create unified relationship from enhancement site
   *
   * @param site - Enhancement site
   * @returns Unified relationship or null
   */
  private createRelationship(site: EnhancementSite): UnifiedRelationship | null {
    // Check if enhancer symbol exists in graph
    const enhancerSymbol = this.findSymbolByName(site.enhancerSymbol);
    if (!enhancerSymbol) {
      return null;
    }

    const timestamp = new Date().toISOString();

    return {
      id: `enhancement-${enhancerSymbol.id}-${site.enhancedSymbol}-${site.line}`,
      type: 'enhancement',
      from: enhancerSymbol.id,
      to: site.enhancedSymbol,
      direction: 'unidirectional',
      strength: 'medium',
      category: 'semantic',
      evidence: [
        {
          type: 'documentation',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `@enhances ${site.enhancedSymbol}`,
          confidence: 1.0,
          context: `TSDoc @enhances tag in ${site.enhancerSymbol}`,
        },
      ],
      discoveredBy: 'documentation',
      confidence: 1.0,
      filePath: site.filePath,
      line: site.line,
      properties: {
        enhancerSymbol: site.enhancerSymbol,
        enhancedSymbol: site.enhancedSymbol,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${site.enhancerSymbol} enhances ${site.enhancedSymbol}`,
    };
  }

  /**
   * Find symbol by name
   *
   * @param name - Symbol name
   * @returns Symbol if found
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
   * Get statistics for enhancement relationships
   *
   * @param relationships - Enhancement relationships
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    uniqueEnhancers: number;
    uniqueEnhanced: number;
    byFile: Record<string, number>;
  } {
    const enhancers = new Set<string>();
    const enhanced = new Set<string>();
    const byFile: Record<string, number> = {};

    for (const rel of relationships) {
      const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
      const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];

      fromSymbols.forEach((s) => enhancers.add(s));
      toSymbols.forEach((s) => enhanced.add(s));

      if (rel.filePath) {
        byFile[rel.filePath] = (byFile[rel.filePath] || 0) + 1;
      }
    }

    return {
      total: relationships.length,
      uniqueEnhancers: enhancers.size,
      uniqueEnhanced: enhanced.size,
      byFile,
    };
  }
}
