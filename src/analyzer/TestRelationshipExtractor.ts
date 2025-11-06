/**
 * Test Relationship Extractor
 *
 * @packageDocumentation
 * @responsibility Extract symbol usage and relationships from test files
 *
 * @problem 테스트가 어떤 모듈들의 연결을 검증하는지 알 수 없음
 * @solves AST 분석으로 테스트에서 사용된 심볼과 관계를 추출
 * @context 통합 테스트 커버리지 분석을 위한 데이터 수집
 *
 * @functionality
 * - 테스트 파일에서 import 추출
 * - 생성자 호출 패턴 감지 (new A(b))
 * - 의존성 주입 패턴 감지 (new A(new B()))
 * - 메서드 호출 체인 감지 (a.method(b))
 */

import * as ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  TestSymbolUsage,
  ImportedSymbol,
  UsagePattern,
  VerifiedRelationship,
} from '../types/analysis/test-relationships';
import type { SymbolGraph } from '../types/graph';

/**
 * Test Relationship Extractor
 *
 * @public
 * @responsibility 테스트 파일 분석 및 심볼 관계 추출
 */
export class TestRelationshipExtractor {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Extract symbol usage from a test file
   *
   * @param testFilePath - Path to test file
   * @returns Test symbol usage information
   * @public
   */
  extractFromFile(testFilePath: string): TestSymbolUsage {
    const sourceCode = fs.readFileSync(testFilePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      testFilePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const importedSymbols = this.extractImports(sourceFile, testFilePath);
    const usagePatterns = this.extractUsagePatterns(sourceFile, importedSymbols);

    return {
      testFilePath,
      importedSymbols,
      usagePatterns,
    };
  }

  /**
   * Extract imports from test file
   *
   * @param sourceFile - TypeScript source file
   * @param testFilePath - Test file path
   * @returns Array of imported symbols
   */
  private extractImports(sourceFile: ts.SourceFile, testFilePath: string): ImportedSymbol[] {
    const imports: ImportedSymbol[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;

        // Skip test framework imports
        if (this.isTestFrameworkImport(moduleSpecifier)) {
          ts.forEachChild(node, visit);
          return;
        }

        // Skip node_modules (unless configured otherwise)
        if (moduleSpecifier.startsWith('@') || !moduleSpecifier.startsWith('.')) {
          ts.forEachChild(node, visit);
          return;
        }

        const namedBindings = node.importClause?.namedBindings;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
          for (const element of namedBindings.elements) {
            const symbolName = element.name.text;
            const symbolId = this.resolveSymbolId(symbolName, moduleSpecifier, testFilePath);

            imports.push({
              symbolName,
              symbolId,
              fromModule: moduleSpecifier,
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            });
          }
        }

        // Handle default imports
        if (node.importClause?.name) {
          const symbolName = node.importClause.name.text;
          const symbolId = this.resolveSymbolId(symbolName, moduleSpecifier, testFilePath);

          imports.push({
            symbolName,
            symbolId,
            fromModule: moduleSpecifier,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Extract usage patterns from test file
   *
   * @param sourceFile - TypeScript source file
   * @param importedSymbols - Imported symbols
   * @returns Array of usage patterns
   */
  private extractUsagePatterns(
    sourceFile: ts.SourceFile,
    importedSymbols: ImportedSymbol[]
  ): UsagePattern[] {
    const patterns: UsagePattern[] = [];
    const symbolNames = new Set(importedSymbols.map(s => s.symbolName));

    const visit = (node: ts.Node) => {
      // Pattern 1: Constructor calls (new SymbolName())
      if (ts.isNewExpression(node)) {
        const constructorName = node.expression.getText(sourceFile);

        if (symbolNames.has(constructorName)) {
          const symbolId = importedSymbols.find(s => s.symbolName === constructorName)?.symbolId;
          if (symbolId) {
            const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            const codeSnippet = node.getText(sourceFile).substring(0, 100);

            patterns.push({
              symbolId,
              lineNumber,
              usageType: 'instantiation',
              codeSnippet,
            });

            // Pattern 2: Dependency injection (new A(new B()))
            if (node.arguments && node.arguments.length > 0) {
              const relatedSymbols: string[] = [];

              for (const arg of node.arguments) {
                if (ts.isNewExpression(arg)) {
                  const argConstructor = arg.expression.getText(sourceFile);
                  const argSymbolId = importedSymbols.find(s => s.symbolName === argConstructor)?.symbolId;
                  if (argSymbolId) {
                    relatedSymbols.push(argSymbolId);
                  }
                } else if (ts.isIdentifier(arg)) {
                  const argName = arg.text;
                  const argSymbolId = importedSymbols.find(s => s.symbolName === argName)?.symbolId;
                  if (argSymbolId) {
                    relatedSymbols.push(argSymbolId);
                  }
                }
              }

              if (relatedSymbols.length > 0) {
                patterns.push({
                  symbolId,
                  lineNumber,
                  usageType: 'dependency-injection',
                  codeSnippet,
                  relatedSymbols,
                });
              }
            }
          }
        }
      }

      // Pattern 3: Method calls (object.method())
      if (ts.isCallExpression(node)) {
        if (ts.isPropertyAccessExpression(node.expression)) {
          const objectName = node.expression.expression.getText(sourceFile);
          const methodName = node.expression.name.text;

          // Try to find the symbol for this object
          const symbolId = importedSymbols.find(s => s.symbolName === objectName)?.symbolId;

          if (symbolId) {
            const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            const codeSnippet = node.getText(sourceFile).substring(0, 100);

            patterns.push({
              symbolId,
              lineNumber,
              usageType: 'method-call',
              codeSnippet,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return patterns;
  }

  /**
   * Infer relationships from usage patterns
   *
   * @param usage - Test symbol usage
   * @returns Array of verified relationships
   * @public
   */
  inferRelationships(usage: TestSymbolUsage): VerifiedRelationship[] {
    const relationships: VerifiedRelationship[] = [];
    const seenPairs = new Set<string>();

    // Strong relationships: Dependency injection
    for (const pattern of usage.usagePatterns) {
      if (pattern.usageType === 'dependency-injection' && pattern.relatedSymbols) {
        for (const targetId of pattern.relatedSymbols) {
          const pairKey = `${pattern.symbolId}->${targetId}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);

          relationships.push({
            source: pattern.symbolId,
            target: targetId,
            verifiedBy: usage.testFilePath,
            strength: 'strong',
            evidence: [{
              lineNumber: pattern.lineNumber,
              codeSnippet: pattern.codeSnippet || '',
              pattern: 'dependency-injection',
            }],
          });
        }
      }
    }

    // Medium relationships: Same test case co-occurrence
    const testCaseGroups = this.groupByTestCase(usage.usagePatterns);

    for (const group of testCaseGroups) {
      if (group.length > 1) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const source = group[i].symbolId;
            const target = group[j].symbolId;
            const pairKey = `${source}->${target}`;

            if (seenPairs.has(pairKey)) continue;
            seenPairs.add(pairKey);

            relationships.push({
              source,
              target,
              verifiedBy: usage.testFilePath,
              strength: 'medium',
              evidence: [{
                lineNumber: group[i].lineNumber,
                codeSnippet: `${group[i].codeSnippet || ''} ... ${group[j].codeSnippet || ''}`.substring(0, 100),
                pattern: 'co-occurrence',
              }],
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Group usage patterns by test case (approximate)
   * Uses line proximity as heuristic
   */
  private groupByTestCase(patterns: UsagePattern[]): UsagePattern[][] {
    if (patterns.length === 0) return [];

    const sorted = [...patterns].sort((a, b) => a.lineNumber - b.lineNumber);
    const groups: UsagePattern[][] = [];
    let currentGroup: UsagePattern[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      // If within 20 lines, consider same test case
      if (curr.lineNumber - prev.lineNumber <= 20) {
        currentGroup.push(curr);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [curr];
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Resolve symbol ID from name and module path
   *
   * @param symbolName - Symbol name
   * @param moduleSpecifier - Module path
   * @param testFilePath - Test file path
   * @returns Symbol ID or null
   */
  private resolveSymbolId(
    symbolName: string,
    moduleSpecifier: string,
    testFilePath: string
  ): string | null {
    // Resolve relative path
    const testDir = path.dirname(testFilePath);
    const absolutePath = path.resolve(testDir, moduleSpecifier);
    const possiblePaths = [
      absolutePath + '.ts',
      absolutePath + '.tsx',
      absolutePath + '/index.ts',
      absolutePath + '/index.tsx',
    ];

    // Try to find symbol in graph by name and file path
    for (const [id, symbol] of this.graph.symbols.entries()) {
      if (symbol.name === symbolName) {
        for (const possiblePath of possiblePaths) {
          if (symbol.filePath.endsWith(possiblePath.replace(process.cwd(), ''))) {
            return id;
          }
        }
      }
    }

    // Fallback: find by name only
    const symbolIds = this.graph.nameIndex.get(symbolName);
    if (symbolIds && symbolIds.length > 0) {
      return symbolIds[0];
    }

    return null;
  }

  /**
   * Check if import is from a test framework
   */
  private isTestFrameworkImport(moduleSpecifier: string): boolean {
    const testFrameworks = ['jest', 'vitest', '@testing-library', 'mocha', 'chai', 'sinon'];
    return testFrameworks.some(framework => moduleSpecifier.includes(framework));
  }
}
