/**
 * Explicit Semantic Relation Analyzer
 * @packageDocumentation
 * @responsibility Extract semantic relationships from @relatedTo tags
 *
 * @purpose Capture developer intent through explicit documentation
 * @input TypeScript files with @relatedTo TSDoc tags
 * @output explicit-semantic-relation relationships
 * @logic Parse JSDoc tags, extract related symbols
 * @scope Public API for relationship extraction
 *
 * @example
 * /**
 *  * User authentication service
 *  * @relatedTo UserRepository - Data access layer
 *  * @relatedTo TokenManager - JWT token handling
 *  *\/
 * export class UserService {}
 *
 * Output relationships:
 *   UserService ~ UserRepository (explicit-semantic, confidence: 1.0)
 *   UserService ~ TokenManager (explicit-semantic, confidence: 1.0)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Explicit relation site from @relatedTo tag
 * @private
 */
interface ExplicitRelationSite {
  sourceSymbol: string;
  targetSymbol: string;
  filePath: string;
  line: number;
  description?: string;
}

/**
 * Analyzes explicit semantic relationships
 *
 * @public
 * @responsibility Parse @relatedTo tags and create semantic relationships
 *
 * Algorithm:
 * 1. Traverse TypeScript source files
 * 2. Parse JSDoc comments for @relatedTo tags
 * 3. Extract source symbol and target symbol
 * 4. Create bidirectional semantic relationships
 *
 * @example
 * ```typescript
 * /**
 *  * Database connection manager
 *  * @relatedTo DatabaseConfig - Configuration
 *  * @relatedTo ConnectionPool - Resource management
 *  *\/
 * export class DatabaseManager {
 *   // ...
 * }
 * ```
 *
 * Creates relationships:
 * - DatabaseManager ~ DatabaseConfig (confidence: 1.0)
 * - DatabaseManager ~ ConnectionPool (confidence: 1.0)
 */
export class ExplicitSemanticRelationAnalyzer {
  /**
   * Analyze explicit semantic relationships
   *
   * @param rootDir - Root directory to scan
   * @returns Array of explicit-semantic-relation relationships
   * @public
   */
  analyze(rootDir: string): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const sites = this.collectRelatedToTags(rootDir);

    for (const site of sites) {
      const relationship = this.createRelationship(site);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect @relatedTo tags from TypeScript files
   *
   * @param rootDir - Root directory
   * @returns Array of explicit relation sites
   * @private
   */
  private collectRelatedToTags(rootDir: string): ExplicitRelationSite[] {
    const sites: ExplicitRelationSite[] = [];
    const files = this.findTypeScriptFiles(rootDir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
        this.extractRelationsFromFile(sourceFile, file, sites);
      } catch (error) {
        // Skip files that cause errors
        console.error(`Error processing ${file}:`, error);
      }
    }

    return sites;
  }

  /**
   * Extract @relatedTo relations from source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param sites - Array to collect sites
   * @private
   */
  private extractRelationsFromFile(
    sourceFile: ts.SourceFile,
    filePath: string,
    sites: ExplicitRelationSite[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        const jsDocTags = ts.getJSDocTags(node);
        if (jsDocTags && jsDocTags.length > 0) {
          const sourceSymbol = this.getSymbolName(node);

          if (sourceSymbol) {
            for (const tag of jsDocTags) {
              if (tag.tagName.text === 'relatedTo') {
                const relationInfo = this.parseRelatedToTag(tag);
                if (relationInfo) {
                  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                  sites.push({
                    sourceSymbol,
                    targetSymbol: relationInfo.target,
                    filePath,
                    line,
                    description: relationInfo.description,
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
   * Parse @relatedTo tag content
   *
   * @param tag - JSDoc tag
   * @returns Parsed relation info or null
   * @private
   *
   * @example
   * @relatedTo UserRepository - Data access
   * → { target: 'UserRepository', description: 'Data access' }
   *
   * @relatedTo TokenManager
   * → { target: 'TokenManager', description: undefined }
   */
  private parseRelatedToTag(tag: ts.JSDocTag): { target: string; description?: string } | null {
    const comment = this.getTagComment(tag);
    if (!comment) return null;

    // Format: "SymbolName - Description" or just "SymbolName"
    const match = comment.match(/^([A-Za-z0-9_]+)(?:\s*-\s*(.+))?$/);
    if (match) {
      return {
        target: match[1].trim(),
        description: match[2]?.trim(),
      };
    }

    // Fallback: treat entire comment as symbol name
    const symbolName = comment.split(/\s/)[0].trim();
    if (symbolName) {
      return {
        target: symbolName,
      };
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
    if (ts.isEnumDeclaration(node) && node.name) return node.name.text;
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration && ts.isIdentifier(declaration.name)) {
        return declaration.name.text;
      }
    }
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
   * Find TypeScript files recursively
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
          // Skip common build/dependency directories
          if (!['node_modules', 'dist', 'build', '.git', '.tsdoc', 'coverage'].includes(entry.name)) {
            traverse(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };
    traverse(dir);
    return files;
  }

  /**
   * Create explicit-semantic-relation relationship
   *
   * @param site - Explicit relation site
   * @returns Unified relationship
   * @private
   */
  private createRelationship(site: ExplicitRelationSite): UnifiedRelationship {
    const timestamp = new Date().toISOString();
    const relationshipId = `explicit-semantic-${site.sourceSymbol}-${site.targetSymbol}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    const description = site.description
      ? `${site.sourceSymbol} ~ ${site.targetSymbol} (${site.description})`
      : `${site.sourceSymbol} ~ ${site.targetSymbol} (explicitly related)`;

    return {
      id: relationshipId,
      type: 'explicit-semantic-relation',
      from: site.sourceSymbol,
      to: site.targetSymbol,
      direction: 'undirected',
      strength: 'medium',
      category: 'semantic',
      evidence: [
        {
          type: 'documentation',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `@relatedTo ${site.targetSymbol}${site.description ? ` - ${site.description}` : ''}`,
          confidence: 1.0,
          context: 'Explicit developer-declared relationship'
        }
      ],
      discoveredBy: 'documentation',
      confidence: 1.0, // Explicit tags have highest confidence
      filePath: site.filePath,
      line: site.line,
      properties: {
        relationDescription: site.description,
        detectionMethod: 'tsdoc-tag',
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description
    };
  }

  /**
   * Get statistics about explicit semantic relationships
   *
   * @param relationships - Explicit semantic relationships
   * @returns Statistics
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    withDescription: number;
    withoutDescription: number;
    uniqueSymbols: number;
    mostConnectedSymbols: Array<{ symbol: string; connections: number }>;
  } {
    const symbols = new Set<string>();
    const symbolConnections = new Map<string, number>();
    let withDescription = 0;
    let withoutDescription = 0;

    for (const rel of relationships) {
      const from = typeof rel.from === 'string' ? rel.from : rel.from[0];
      const to = typeof rel.to === 'string' ? rel.to : rel.to[0];

      symbols.add(from);
      symbols.add(to);

      symbolConnections.set(from, (symbolConnections.get(from) || 0) + 1);
      symbolConnections.set(to, (symbolConnections.get(to) || 0) + 1);

      if (rel.properties?.relationDescription) {
        withDescription++;
      } else {
        withoutDescription++;
      }
    }

    // Get most connected symbols
    const mostConnected = Array.from(symbolConnections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symbol, connections]) => ({ symbol, connections }));

    return {
      total: relationships.length,
      withDescription,
      withoutDescription,
      uniqueSymbols: symbols.size,
      mostConnectedSymbols: mostConnected,
    };
  }
}
