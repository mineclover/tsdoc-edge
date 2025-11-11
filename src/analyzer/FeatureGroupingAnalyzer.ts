/**
 * Feature Grouping Analyzer
 * @packageDocumentation
 * @responsibility Analyze feature grouping relationships
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Feature group
 * @private
 */
interface FeatureGroup {
  featureName: string;
  members: string[];
  filePath: string;
  line: number;
}

/**
 * Analyzes feature grouping relationships
 *
 * @public
 * @responsibility Detect symbols belonging to same feature
 *
 * Pattern: A, B, C belong to feature X
 * - Feature cohesion
 * - Logical grouping
 * - Domain boundaries
 *
 * Detection:
 * 1. Parse @feature tags in TSDoc
 * 2. Analyze directory structure (features/auth/*, features/billing/*)
 * 3. Detect shared feature prefix
 *
 * @example
 * ```typescript
 * /**
 *  * User login handler
 *  * @feature Authentication
 *  *\/
 * export class LoginHandler {}
 *
 * /**
 *  * Token manager
 *  * @feature Authentication
 *  *\/
 * export class TokenManager {}
 * // Both belong to Authentication feature
 * ```
 */
export class FeatureGroupingAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze feature grouping relationships
   *
   * @param rootDir - Root directory to analyze
   * @returns Array of feature grouping relationships
   */
  analyze(rootDir: string): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    // Collect feature groups from tags
    const tagGroups = this.collectFeatureGroups(rootDir);

    // Collect feature groups from directory structure
    const dirGroups = this.detectFeatureDirectories(rootDir);

    // Combine both sources
    const allGroups = [...tagGroups, ...dirGroups];

    // Create relationships for each group
    for (const group of allGroups) {
      const groupRelationships = this.createGroupRelationships(group);
      relationships.push(...groupRelationships);
    }

    return relationships;
  }

  /**
   * Collect feature groups from @feature tags
   *
   * @param rootDir - Root directory
   * @returns Array of feature groups
   * @private
   */
  private collectFeatureGroups(rootDir: string): FeatureGroup[] {
    const groups = new Map<string, FeatureGroup>();
    const files = this.findTypeScriptFiles(rootDir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
        this.extractFeatureTagsFromFile(sourceFile, file, groups);
      } catch (error) {
        // Skip files that cause errors
      }
    }

    return Array.from(groups.values());
  }

  /**
   * Extract @feature tags from source file
   *
   * @param sourceFile - Source file
   * @param filePath - File path
   * @param groups - Map to collect groups
   * @private
   */
  private extractFeatureTagsFromFile(
    sourceFile: ts.SourceFile,
    filePath: string,
    groups: Map<string, FeatureGroup>
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        const jsDocTags = ts.getJSDocTags(node);
        if (jsDocTags && jsDocTags.length > 0) {
          const symbolName = this.getSymbolName(node);

          if (symbolName) {
            // Find symbol ID
            const symbol = this.findSymbolByName(symbolName);
            if (symbol) {
              for (const tag of jsDocTags) {
                if (tag.tagName.text === 'feature') {
                  const featureName = this.getTagComment(tag);
                  if (featureName) {
                    const normalizedName = featureName.trim();
                    if (!groups.has(normalizedName)) {
                      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                      groups.set(normalizedName, {
                        featureName: normalizedName,
                        members: [],
                        filePath,
                        line,
                      });
                    }
                    groups.get(normalizedName)!.members.push(symbol.id);
                  }
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
   * Detect feature groups from directory structure
   *
   * @param rootDir - Root directory
   * @returns Array of feature groups
   * @private
   */
  private detectFeatureDirectories(rootDir: string): FeatureGroup[] {
    const groups: FeatureGroup[] = [];
    const featurePattern = /features?[\/\\]([^\/\\]+)/i;

    // Group symbols by feature directory
    const featureMap = new Map<string, string[]>();

    for (const symbol of this.graph.symbols.values()) {
      const match = symbol.filePath.match(featurePattern);
      if (match) {
        const featureName = match[1];
        if (!featureMap.has(featureName)) {
          featureMap.set(featureName, []);
        }
        featureMap.get(featureName)!.push(symbol.id);
      }
    }

    // Convert to feature groups
    for (const [featureName, members] of featureMap.entries()) {
      if (members.length >= 2) {
        // Get first symbol for metadata
        const firstSymbol = this.graph.symbols.get(members[0]);
        groups.push({
          featureName,
          members,
          filePath: firstSymbol?.filePath || '',
          line: firstSymbol?.line || 0,
        });
      }
    }

    return groups;
  }

  /**
   * Create relationships for feature group
   *
   * @param group - Feature group
   * @returns Array of relationships
   * @private
   */
  private createGroupRelationships(group: FeatureGroup): UnifiedRelationship[] {
    if (group.members.length < 2) {
      return [];
    }

    const relationships: UnifiedRelationship[] = [];
    const timestamp = new Date().toISOString();

    // Create pairwise relationships
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        relationships.push({
          id: `feature-grouping-${group.featureName}-${group.members[i]}-${group.members[j]}`,
          type: 'feature-grouping',
          from: group.members[i],
          to: group.members[j],
          direction: 'undirected',
          strength: 'medium',
          category: 'semantic',
          evidence: [
            {
              type: 'documentation',
              source: group.filePath,
              lineNumber: group.line,
              snippet: `@feature ${group.featureName}`,
              confidence: 0.8,
              context: `Both symbols belong to feature: ${group.featureName}`
            }
          ],
          discoveredBy: 'documentation',
          confidence: 0.8,
          filePath: group.filePath,
          line: group.line,
          properties: {
            featureName: group.featureName,
            groupSize: group.members.length,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
          description: `Feature ${group.featureName}: ${group.members[i]} ∈ ${group.members[j]}`
        });
      }
    }

    return relationships;
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
   * Get statistics
   *
   * @param relationships - Feature grouping relationships
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    uniqueFeatures: number;
    byFeature: Record<string, number>;
    avgGroupSize: number;
  } {
    const features = new Set<string>();
    const byFeature: Record<string, number> = {};
    let totalGroupSize = 0;

    for (const rel of relationships) {
      const featureName = rel.properties?.featureName;
      if (featureName) {
        features.add(featureName);
        byFeature[featureName] = (byFeature[featureName] || 0) + 1;

        if (rel.properties?.groupSize) {
          totalGroupSize += rel.properties.groupSize;
        }
      }
    }

    return {
      total: relationships.length,
      uniqueFeatures: features.size,
      byFeature,
      avgGroupSize: features.size > 0 ? totalGroupSize / features.size : 0,
    };
  }
}
