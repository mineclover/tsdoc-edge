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

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { DatabaseManager } from '../storage/DatabaseManager';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Test example metadata
 * @doc [[TestExampleExtractor]]
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
  private symbolsCache: ReturnType<DatabaseManager['getAllSymbols']> | null = null;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Get all symbols with caching
   * @private
   */
  private getAllSymbolsCached(): ReturnType<DatabaseManager['getAllSymbols']> {
    if (!this.symbolsCache) {
      this.symbolsCache = this.db.getAllSymbols();
    }
    return this.symbolsCache;
  }

  /**
   * Extract examples from all test files
   *
   * @param testFilePattern - Glob pattern for test files (default: "**\/*.test.ts")
   * @returns Array of test examples
   */
  extractAllExamples(_testFilePattern = '**/*.test.ts'): TestExample[] {
    const allSymbols = this.getAllSymbolsCached();
    const testFiles = allSymbols
      .filter((s) => s.filePath.includes('.test.ts') || s.filePath.includes('__tests__'))
      .map((s) => s.filePath);

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
    const sourceFile = ts.createSourceFile(testFilePath, sourceCode, ts.ScriptTarget.Latest, true);

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

    // Analyze test case - pass full source and description for better symbol identification
    const fullSource = sourceFile.text;
    const testedSymbols = this.identifyTestedSymbols(
      fullSource,
      testedModuleName,
      code,
      description
    );
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
   * Uses intelligent matching to find relevant symbols without over-linking
   * @private
   */
  private identifyTestedSymbols(
    fullSource: string,
    moduleName: string,
    testCode: string,
    description: string
  ): string[] {
    const symbols: string[] = [];

    // Get all symbols from database (cached)
    const allSymbols = this.getAllSymbolsCached();

    // Create kebab-case version of module name for matching
    const moduleKebab = this.toKebabCase(moduleName);

    // Get all symbols from the tested module (for reference)
    const moduleSymbols = allSymbols.filter((s) => {
      const fileName = path.basename(s.filePath, path.extname(s.filePath));
      const fileKebab = this.toKebabCase(fileName);
      return fileKebab === moduleKebab;
    });

    // Strategy 1: ALWAYS include the main class/interface being tested
    // Try multiple variations because symbol IDs might have inconsistent formats
    const moduleKebabNoHyphen = moduleKebab.replace(/-/g, '');
    const mainClass = moduleSymbols.find(
      (s) =>
        s.type === 'class' &&
        (s.id === `class-${moduleKebab}` || // class-database-manager
          s.id === `class-${moduleKebabNoHyphen}` || // class-databasemanager
          (s.id.startsWith('class-') && s.id.includes(moduleName.toLowerCase())))
    );

    if (mainClass) {
      symbols.push(mainClass.id);
    } else {
      // Try to find main interface
      const mainInterface = moduleSymbols.find(
        (s) =>
          s.type === 'interface' &&
          (s.id === `interface-${moduleKebab}` ||
            s.id === `interface-${moduleKebabNoHyphen}` ||
            (s.id.startsWith('interface-') && s.id.includes(moduleName.toLowerCase())))
      );
      if (mainInterface) {
        symbols.push(mainInterface.id);
      }
    }

    // Strategy 2: Parse test description to identify specific methods being tested
    // Pattern: "should insertSymbol successfully" → method insertSymbol
    const descWords = description.toLowerCase().split(/\s+/);
    for (const word of descWords) {
      if (word.length < 3) continue; // Skip short words

      // Try to find method by name
      const methodKebab = this.toKebabCase(word);
      const methodSymbol = moduleSymbols.find(
        (s) => s.type === 'method' && s.id.includes(`-${methodKebab}`)
      );

      if (methodSymbol && !symbols.includes(methodSymbol.id)) {
        symbols.push(methodSymbol.id);
      }
    }

    // Strategy 3: Parse imports to find what's actually being tested
    // Pattern: import { ClassName } from '...'
    const importPattern = /import\s+\{([^}]+)\}\s+from/g;
    let match;
    while ((match = importPattern.exec(fullSource)) !== null) {
      const imports = match[1].split(',').map((s) => s.trim());
      for (const importName of imports) {
        // Clean up "type X as Y" patterns
        const cleanName = importName
          .split(' as ')[0]
          .replace(/^type\s+/, '')
          .trim();
        const kebab = this.toKebabCase(cleanName);

        // Find matching class or interface
        const matchingSymbol = allSymbols.find(
          (s) =>
            (s.type === 'class' || s.type === 'interface' || s.type === 'type') &&
            s.id.includes(kebab)
        );

        if (matchingSymbol && !symbols.includes(matchingSymbol.id)) {
          symbols.push(matchingSymbol.id);
        }
      }
    }

    // Strategy 4: Identify methods actually called in the test code
    // Pattern: obj.methodName( or instance.methodName(
    const methodCallPattern = /\.([a-z][a-zA-Z0-9_]*)\s*\(/g;
    const calledMethods = new Set<string>();

    while ((match = methodCallPattern.exec(testCode)) !== null) {
      const methodName = match[1];
      if (!this.isCommonTestKeyword(methodName)) {
        calledMethods.add(methodName);
      }
    }

    // Find actual method symbols from the module for called methods
    for (const methodName of calledMethods) {
      const methodKebab = this.toKebabCase(methodName);

      // Look for method in the module
      const methodSymbol = moduleSymbols.find(
        (s) => s.type === 'method' && s.id.endsWith(`-${methodKebab}`)
      );

      if (methodSymbol && !symbols.includes(methodSymbol.id)) {
        symbols.push(methodSymbol.id);
      }
    }

    // Fallback: If only 1 symbol (main class) found, this is probably fine
    // Most tests will test the class as a whole

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
