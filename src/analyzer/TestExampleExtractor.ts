/**
 * Test Example Extractor
 * @packageDocumentation
 * @responsibility Extract test cases as documentation examples
 *
 * @problem Documentation examples become stale and disconnected from tests
 * @solves Automatically extracts test cases as living examples
 * @context SSOT principle: Tests are single source of truth for examples
 *
 * Philosophy: **Test Code > Generic Examples**
 */

import * as ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DatabaseManager } from '../storage/DatabaseManager';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Test example metadata
 * @public
 */
export interface TestExample {
  /** Test case ID */
  id: string;

  /** Test description */
  description: string;

  /** File path */
  filePath: string;

  /** Line number */
  line: number;

  /** Test code snippet */
  code: string;

  /** Symbols tested (implementation) */
  testedSymbols: string[];

  /** Example complexity */
  complexity: 'simple' | 'medium' | 'complex';

  /** Example category */
  category: 'basic-usage' | 'advanced-usage' | 'integration' | 'edge-case';

  /** Example quality score (0-10) */
  quality: number;
}

/**
 * Test Example Extractor
 *
 * Analyzes test files to extract reusable examples for documentation.
 *
 * @public
 * @example
 * ```typescript
 * const extractor = new TestExampleExtractor(dbManager);
 * const examples = extractor.extractExamples('src/__tests__/DatabaseManager.test.ts');
 *
 * console.log(`Found ${examples.length} examples`);
 * examples.forEach(ex => {
 *   console.log(`${ex.description}: ${ex.complexity} (quality: ${ex.quality})`);
 * });
 * ```
 */
export class TestExampleExtractor {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Extract examples from all test files
   *
   * @param testFilePattern - Glob pattern for test files (default: "**\/*.test.ts")
   * @returns Array of test examples
   */
  extractAllExamples(testFilePattern = '**/*.test.ts'): TestExample[] {
    const allSymbols = this.db.getAllSymbols();
    const testFiles = allSymbols
      .filter(s => s.filePath.includes('.test.ts') || s.filePath.includes('__tests__'))
      .map(s => s.filePath);

    const uniqueTestFiles = Array.from(new Set(testFiles));
    const examples: TestExample[] = [];

    for (const testFile of uniqueTestFiles) {
      const fileExamples = this.extractExamples(testFile);
      examples.push(...fileExamples);
    }

    return examples;
  }

  /**
   * Extract examples from a single test file
   *
   * @param testFilePath - Path to test file
   * @returns Array of test examples
   */
  extractExamples(testFilePath: string): TestExample[] {
    if (!fs.existsSync(testFilePath)) {
      return [];
    }

    const sourceCode = fs.readFileSync(testFilePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      testFilePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const examples: TestExample[] = [];
    const testedModuleName = this.inferTestedModule(testFilePath);

    const visit = (node: ts.Node) => {
      // Look for "it" or "test" function calls
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (node.expression.text === 'it' || node.expression.text === 'test')
      ) {
        const example = this.extractTestExample(node, sourceFile, testFilePath, testedModuleName);
        if (example) {
          examples.push(example);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return examples;
  }

  /**
   * Create test-as-example relationships
   *
   * @param examples - Test examples to create relationships for
   * @returns Array of test-as-example relationships
   */
  createRelationships(examples: TestExample[]): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const now = new Date().toISOString();

    for (const example of examples) {
      for (const testedSymbol of example.testedSymbols) {
        // Check if symbol exists in database
        const symbol = this.db.getSymbol(testedSymbol);
        if (!symbol) continue;

        const relationship: UnifiedRelationship = {
          id: `test-example-${example.id}-${testedSymbol}`,
          type: 'test-as-example',
          from: example.id,
          to: testedSymbol,
          direction: 'unidirectional',
          strength: this.getRelationshipStrength(example.quality),
          category: 'testing',
          evidence: [
            {
              type: 'test',
              source: example.filePath,
              lineNumber: example.line,
              snippet: example.code.slice(0, 200),
              confidence: example.quality / 10,
              context: example.description,
            },
          ],
          discoveredBy: 'test-analysis',
          confidence: example.quality / 10,
          filePath: example.filePath,
          line: example.line,
          properties: {
            exampleCategory: example.category,
            complexity: example.complexity,
            quality: example.quality,
            description: example.description,
          },
          createdAt: now,
          updatedAt: now,
          description: `Test example: ${example.description}`,
        };

        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Extract test example from a test case node
   * @private
   */
  private extractTestExample(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string,
    testedModuleName: string
  ): TestExample | null {
    // Get test description (first argument)
    const args = node.arguments;
    if (args.length < 2) return null;

    const descriptionArg = args[0];
    if (!ts.isStringLiteral(descriptionArg)) return null;

    const description = descriptionArg.text;

    // Get test function (second argument)
    const testFunctionArg = args[1];
    if (!ts.isFunctionExpression(testFunctionArg) && !ts.isArrowFunction(testFunctionArg)) {
      return null;
    }

    // Extract code
    const start = testFunctionArg.getStart(sourceFile);
    const end = testFunctionArg.getEnd();
    const code = sourceFile.text.substring(start, end);

    // Get line number
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

    // Analyze test case
    const testedSymbols = this.identifyTestedSymbols(code, testedModuleName);
    const complexity = this.assessComplexity(code);
    const category = this.categorizeExample(description, code);
    const quality = this.assessQuality(code, description, complexity);

    // Generate ID
    const id = `test-case-${testedModuleName}-${line}`;

    return {
      id,
      description,
      filePath,
      line: line + 1,
      code,
      testedSymbols,
      complexity,
      category,
      quality,
    };
  }

  /**
   * Infer tested module name from test file path
   * @private
   */
  private inferTestedModule(testFilePath: string): string {
    const basename = path.basename(testFilePath, '.test.ts');
    return basename.replace(/\.test$/, '');
  }

  /**
   * Identify symbols being tested in the code
   * @private
   */
  private identifyTestedSymbols(code: string, moduleName: string): string[] {
    const symbols: string[] = [];

    // Look for "new ClassName()" patterns
    const newPattern = /new\s+([A-Z][a-zA-Z0-9_]+)/g;
    let match;
    while ((match = newPattern.exec(code)) !== null) {
      const className = match[1];
      symbols.push(`class-${this.toKebabCase(className)}`);
    }

    // Look for direct function/method calls
    const callPattern = /(\w+)\s*\(/g;
    const methodNames = new Set<string>();
    while ((match = callPattern.exec(code)) !== null) {
      const methodName = match[1];
      if (methodName && !this.isCommonTestKeyword(methodName)) {
        methodNames.add(methodName);
      }
    }

    // Add method symbols
    for (const methodName of methodNames) {
      symbols.push(`method-${moduleName.toLowerCase()}-${this.toKebabCase(methodName)}`);
    }

    return symbols;
  }

  /**
   * Assess code complexity
   * @private
   */
  private assessComplexity(code: string): 'simple' | 'medium' | 'complex' {
    const lines = code.split('\n').length;
    const hasAsync = code.includes('async') || code.includes('await');
    const hasMocking = code.includes('mock') || code.includes('spy');
    const hasNesting = (code.match(/\{/g) || []).length > 3;

    if (lines > 30 || (hasAsync && hasMocking) || hasNesting) {
      return 'complex';
    } else if (lines > 10 || hasAsync || hasMocking) {
      return 'medium';
    } else {
      return 'simple';
    }
  }

  /**
   * Categorize example by purpose
   * @private
   */
  private categorizeExample(
    description: string,
    code: string
  ): 'basic-usage' | 'advanced-usage' | 'integration' | 'edge-case' {
    const lowerDesc = description.toLowerCase();
    const lowerCode = code.toLowerCase();

    if (
      lowerDesc.includes('edge') ||
      lowerDesc.includes('invalid') ||
      lowerDesc.includes('error') ||
      lowerDesc.includes('should not') ||
      lowerDesc.includes('should throw')
    ) {
      return 'edge-case';
    }

    if (
      lowerDesc.includes('integration') ||
      lowerDesc.includes('end-to-end') ||
      lowerCode.includes('mock')
    ) {
      return 'integration';
    }

    if (
      lowerDesc.includes('advanced') ||
      lowerDesc.includes('complex') ||
      lowerCode.includes('async')
    ) {
      return 'advanced-usage';
    }

    return 'basic-usage';
  }

  /**
   * Assess example quality (0-10)
   * @private
   */
  private assessQuality(code: string, description: string, complexity: string): number {
    let score = 5; // Base score

    // Good description
    if (description.length > 20 && description.split(' ').length > 3) {
      score += 1;
    }

    // Clear setup
    if (code.includes('// Arrange') || code.includes('// Setup')) {
      score += 1;
    }

    // Has assertions
    const assertionCount = (code.match(/expect\(/g) || []).length;
    if (assertionCount > 0) {
      score += Math.min(assertionCount, 2);
    }

    // Not too complex
    if (complexity === 'simple') {
      score += 1;
    } else if (complexity === 'complex') {
      score -= 1;
    }

    // Has comments
    if (code.includes('//') || code.includes('/*')) {
      score += 1;
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Get relationship strength based on quality
   * @private
   */
  private getRelationshipStrength(quality: number): 'strong' | 'medium' | 'weak' {
    if (quality >= 8) return 'strong';
    if (quality >= 5) return 'medium';
    return 'weak';
  }

  /**
   * Check if keyword is a common test framework keyword
   * @private
   */
  private isCommonTestKeyword(name: string): boolean {
    const keywords = [
      'describe',
      'it',
      'test',
      'expect',
      'beforeEach',
      'afterEach',
      'beforeAll',
      'afterAll',
      'jest',
      'toBe',
      'toEqual',
      'toHaveBeenCalled',
      'mock',
      'spy',
    ];
    return keywords.includes(name);
  }

  /**
   * Convert to kebab-case
   * @private
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}
