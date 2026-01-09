/**
 * Co-Requirement Analyzer
 * @packageDocumentation
 * @responsibility Analyze co-requirement relationships
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { SymbolGraph, Symbol } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Co-requirement pattern
 * @private
 */
interface CoRequirementSite {
  requirer: string;
  required: string;
  filePath: string;
  line: number;
}

/**
 * Analyzes co-requirement relationships
 *
 * @doc [[CoRequirementAnalyzer]]
 * @public
 * @responsibility Detect co-requirement dependencies
 *
 * Pattern: A requires B to be present
 * - A cannot function without B
 * - B must be imported/configured when A is used
 * - Missing B causes runtime error
 *
 * Detection:
 * 1. Parse @requires tags in TSDoc
 * 2. Detect constructor dependencies (A depends on B in constructor)
 * 3. Find required peer dependencies
 *
 * @example
 * ```typescript
 * /**
 *  * Database manager
 *  * @requires ConnectionPool
 *  * @requires Logger
 *  *\/
 * export class DatabaseManager {
 *   constructor(
 *     private pool: ConnectionPool,
 *     private logger: Logger
 *   ) {}
 * }
 * ```
 */
export class CoRequirementAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze co-requirement relationships
   *
   * @param rootDir - Root directory to analyze
   * @returns Array of co-requirement relationships
   */
  analyze(rootDir: string): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const sites = this.collectCoRequirementSites(rootDir);

    for (const site of sites) {
      const relationship = this.createRelationship(site);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect co-requirement sites
   *
   * @param rootDir - Root directory
   * @returns Array of co-requirement sites
   * @private
   */
  private collectCoRequirementSites(rootDir: string): CoRequirementSite[] {
    const sites: CoRequirementSite[] = [];
    const files = this.findTypeScriptFiles(rootDir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
        this.extractCoRequirementsFromFile(sourceFile, file, sites);
      } catch (error) {
        // Skip files that cause errors
      }
    }

    return sites;
  }

  /**
   * Extract co-requirements from source file
   *
   * @param sourceFile - Source file
   * @param filePath - File path
   * @param sites - Array to collect sites
   * @private
   */
  private extractCoRequirementsFromFile(
    sourceFile: ts.SourceFile,
    filePath: string,
    sites: CoRequirementSite[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        const jsDocTags = ts.getJSDocTags(node);
        if (jsDocTags && jsDocTags.length > 0) {
          const symbolName = this.getSymbolName(node);

          if (symbolName) {
            for (const tag of jsDocTags) {
              if (tag.tagName.text === 'requires') {
                const requiredSymbol = this.getTagComment(tag);
                if (requiredSymbol) {
                  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                  sites.push({
                    requirer: symbolName,
                    required: requiredSymbol.trim(),
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
        return tag.comment
          .map((part: ts.JSDocText | ts.JSDocLink) =>
            'text' in part ? part.text : ''
          )
          .join('');
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
   * @param site - Co-requirement site
   * @returns Unified relationship or null
   * @private
   */
  private createRelationship(site: CoRequirementSite): UnifiedRelationship | null {
    const requirer = this.findSymbolByName(site.requirer);
    if (!requirer) return null;

    const timestamp = new Date().toISOString();

    return {
      id: `co-requirement-${site.requirer}-${site.required}-${site.line}`,
      type: 'co-requirement',
      from: requirer.id,
      to: site.required,
      direction: 'unidirectional',
      strength: 'strong',
      category: 'constraint',
      evidence: [
        {
          type: 'documentation',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `@requires ${site.required}`,
          confidence: 1.0,
          context: `${site.requirer} requires ${site.required}`
        }
      ],
      discoveredBy: 'documentation',
      confidence: 1.0,
      filePath: site.filePath,
      line: site.line,
      properties: {
        requirer: site.requirer,
        required: site.required,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${site.requirer} requires ${site.required}`
    };
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
      if (symbol.name === name) return symbol;
    }
    return undefined;
  }

  /**
   * Get statistics
   *
   * @param relationships - Co-requirement relationships
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    uniqueRequirers: number;
    uniqueRequired: number;
  } {
    const requirers = new Set<string>();
    const required = new Set<string>();

    for (const rel of relationships) {
      const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
      const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
      fromSymbols.forEach(s => requirers.add(s));
      toSymbols.forEach(s => required.add(s));
    }

    return {
      total: relationships.length,
      uniqueRequirers: requirers.size,
      uniqueRequired: required.size,
    };
  }
}
