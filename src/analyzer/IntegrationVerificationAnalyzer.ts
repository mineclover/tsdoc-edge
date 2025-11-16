/**
 * Integration Verification Analyzer
 * @packageDocumentation
 * @responsibility Analyze integration verification relationships
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Integration verification site
 * @private
 */
interface IntegrationSite {
  testSymbol: string;
  symbolA: string;
  symbolB: string;
  filePath: string;
  line: number;
  verificationType: string;
}

/**
 * Analyzes integration verification relationships
 *
 * @public
 * @responsibility Detect integration tests verifying A↔B connections
 *
 * Pattern: Test verifies A works with B
 * - Integration test coverage
 * - Component interaction verification
 * - End-to-end test validation
 *
 * Detection:
 * 1. Find integration/e2e test files
 * 2. Parse test descriptions for "A and B", "A with B"
 * 3. Analyze test code for multi-component usage
 *
 * @example
 * ```typescript
 * // Integration test verifies UserService works with UserRepository
 * describe('UserService integration', () => {
 *   it('should fetch user from repository', async () => {
 *     const repo = new UserRepository();
 *     const service = new UserService(repo);
 *     // Test verifies integration
 *   });
 * });
 * ```
 */
export class IntegrationVerificationAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze integration verification relationships
   *
   * @param rootDir - Root directory to analyze
   * @returns Array of integration verification relationships
   */
  analyze(rootDir: string): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const sites = this.collectIntegrationSites(rootDir);

    for (const site of sites) {
      const relationship = this.createRelationship(site);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect integration verification sites
   *
   * @param rootDir - Root directory
   * @returns Array of integration sites
   * @private
   */
  private collectIntegrationSites(rootDir: string): IntegrationSite[] {
    const sites: IntegrationSite[] = [];
    const files = this.findIntegrationTestFiles(rootDir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
        this.extractIntegrationsFromFile(sourceFile, file, sites);
      } catch (error) {
        // Skip files that cause errors
      }
    }

    return sites;
  }

  /**
   * Find integration test files
   *
   * @param dir - Directory to search
   * @returns Array of file paths
   * @private
   */
  private findIntegrationTestFiles(dir: string): string[] {
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
        } else if (entry.isFile()) {
          const name = entry.name.toLowerCase();
          // Integration test patterns
          if (
            name.includes('integration') ||
            name.includes('e2e') ||
            name.includes('.spec.') ||
            name.includes('.test.')
          ) {
            files.push(fullPath);
          }
        }
      }
    };
    traverse(dir);
    return files;
  }

  /**
   * Extract integrations from test file
   *
   * @param sourceFile - Source file
   * @param filePath - File path
   * @param sites - Array to collect sites
   * @private
   */
  private extractIntegrationsFromFile(
    sourceFile: ts.SourceFile,
    filePath: string,
    sites: IntegrationSite[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        // Look for describe/it blocks
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          if (ts.isIdentifier(expression)) {
            const funcName = expression.text;
            if (funcName === 'describe' || funcName === 'it' || funcName === 'test') {
              // Extract test description
              if (node.arguments.length > 0) {
                const firstArg = node.arguments[0];
                if (ts.isStringLiteral(firstArg)) {
                  const description = firstArg.text;
                  const integration = this.parseIntegrationDescription(description);

                  if (integration) {
                    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                    sites.push({
                      testSymbol: `test-${line}`,
                      symbolA: integration.symbolA,
                      symbolB: integration.symbolB,
                      filePath,
                      line,
                      verificationType: 'test-description',
                    });
                  }
                }
              }

              // Analyze test body for multi-component usage
              if (node.arguments.length > 1) {
                const testBody = node.arguments[1];
                const components = this.extractComponentsFromTestBody(testBody, sourceFile);

                if (components.length >= 2) {
                  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                  // Create integrations between all component pairs
                  for (let i = 0; i < components.length; i++) {
                    for (let j = i + 1; j < components.length; j++) {
                      sites.push({
                        testSymbol: `test-${line}`,
                        symbolA: components[i],
                        symbolB: components[j],
                        filePath,
                        line,
                        verificationType: 'multi-component-test',
                      });
                    }
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
   * Parse integration description for component names
   *
   * @param description - Test description
   * @returns Integration components or null
   * @private
   */
  private parseIntegrationDescription(description: string): { symbolA: string; symbolB: string } | null {
    // Patterns: "A and B", "A with B", "A works with B"
    const patterns = [
      /(\w+)\s+(?:and|with|works\s+with)\s+(\w+)/i,
      /integration\s+between\s+(\w+)\s+and\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1] && match[2]) {
        return {
          symbolA: match[1],
          symbolB: match[2],
        };
      }
    }

    return null;
  }

  /**
   * Extract component names from test body
   *
   * @param testBody - Test body node
   * @param sourceFile - Source file
   * @returns Array of component names
   * @private
   */
  private extractComponentsFromTestBody(testBody: ts.Node, sourceFile: ts.SourceFile): string[] {
    const components = new Set<string>();

    const visit = (node: ts.Node): void => {
      // Look for new ClassName() patterns
      if (ts.isNewExpression(node)) {
        const className = node.expression.getText(sourceFile);
        if (className && /^[A-Z]/.test(className)) {
          components.add(className);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(testBody);
    return Array.from(components);
  }

  /**
   * Create unified relationship
   *
   * @param site - Integration site
   * @returns Unified relationship or null
   * @private
   */
  private createRelationship(site: IntegrationSite): UnifiedRelationship | null {
    const timestamp = new Date().toISOString();

    return {
      id: `integration-verification-${site.symbolA}-${site.symbolB}-${site.line}`,
      type: 'integration-verification',
      from: site.symbolA,
      to: site.symbolB,
      direction: 'bidirectional',
      strength: 'medium',
      category: 'verification',
      evidence: [
        {
          type: 'test',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `Integration test verifies ${site.symbolA} ↔ ${site.symbolB}`,
          confidence: 0.7,
          context: `Verification type: ${site.verificationType}`
        }
      ],
      discoveredBy: 'test-analysis',
      confidence: 0.7,
      filePath: site.filePath,
      line: site.line,
      properties: {
        testSymbol: site.testSymbol,
        verificationType: site.verificationType,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `Test verifies ${site.symbolA} ↔ ${site.symbolB} integration`
    };
  }

  /**
   * Get statistics
   *
   * @param relationships - Integration verification relationships
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    byType: Record<string, number>;
    uniqueComponents: number;
    testFiles: number;
  } {
    const components = new Set<string>();
    const testFiles = new Set<string>();
    const byType: Record<string, number> = {};

    for (const rel of relationships) {
      const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
      const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
      fromSymbols.forEach(s => components.add(s));
      toSymbols.forEach(s => components.add(s));

      if (rel.filePath) {
        testFiles.add(rel.filePath);
      }

      const verType = rel.properties?.verificationType || 'unknown';
      byType[verType] = (byType[verType] || 0) + 1;
    }

    return {
      total: relationships.length,
      byType,
      uniqueComponents: components.size,
      testFiles: testFiles.size,
    };
  }
}
