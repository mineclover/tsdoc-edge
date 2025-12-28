/**
 * Test symbol parser
 * Extracts test suites, test cases, and test scenarios from test files
 *
 * @packageDocumentation
 * @see [[TEST_SYMBOL_EXTRACTION]] for extraction strategy
 */

import * as ts from 'typescript';
import type {
  TestCase,
  TestExtractionOptions,
  TestExtractionResult,
  TestScenario,
  TestSuite,
  TestSymbol,
} from '../types/test-symbols';
import type { TestCoverageMetadata } from '../types/test-symbols';

/**
 * Context for tracking nested describe blocks
 */
interface SuiteContext {
  id: string;
  name: string;
  nestingLevel: number;
  parentId: string | null;
  childSuites: string[];
  testCases: string[];
}

/**
 * Test symbol parser
 * Extracts test symbols from TypeScript test files
 *
 * @doc [[TestSymbolParser]]
 * @public
 * @responsibility Parse test files and extract test suites, cases, and scenarios
 */
export class TestSymbolParser {
  private testSuites: TestSuite[] = [];
  private testCases: TestCase[] = [];
  private testScenarios: TestScenario[] = [];
  private coverageRelationships: TestCoverageMetadata[] = [];
  private errors: TestExtractionResult['errors'] = [];

  private currentFilePath: string = '';
  private fileBaseName: string = '';
  private suiteStack: SuiteContext[] = [];

  /**
   * Extract all test symbols from a test file
   *
   * @param filePath - Test file path
   * @param sourceCode - Source code content
   * @param options - Extraction options
   * @returns Test extraction result
   */
  extract(
    filePath: string,
    sourceCode: string,
    options: TestExtractionOptions = {}
  ): TestExtractionResult {
    // Reset state
    this.testSuites = [];
    this.testCases = [];
    this.testScenarios = [];
    this.coverageRelationships = [];
    this.errors = [];
    this.suiteStack = [];

    this.currentFilePath = filePath;
    this.fileBaseName = this.extractFileBaseName(filePath);

    // Set default options
    const opts: Required<TestExtractionOptions> = {
      extractCoverage: options.extractCoverage ?? true,
      extractScenarios: options.extractScenarios ?? true,
      maxNestingLevel: options.maxNestingLevel ?? Infinity,
      includeSkipped: options.includeSkipped ?? false,
    };

    try {
      // Parse source file
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      // Extract test scenarios from JSDoc
      if (opts.extractScenarios) {
        this.extractTestScenarios(sourceFile, sourceCode);
      }

      // Extract test suites and cases
      this.visitNode(sourceFile, opts);

      // Build test symbols array
      const testSymbols: TestSymbol[] = [
        ...this.testSuites,
        ...this.testCases,
        ...this.testScenarios,
      ];

      return {
        testSymbols,
        testSuites: this.testSuites,
        testCases: this.testCases,
        testScenarios: this.testScenarios,
        coverageRelationships: this.coverageRelationships,
        errors: this.errors,
      };
    } catch (error) {
      this.errors.push({
        file: filePath,
        line: 0,
        message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
      });

      return {
        testSymbols: [],
        testSuites: [],
        testCases: [],
        testScenarios: [],
        coverageRelationships: [],
        errors: this.errors,
      };
    }
  }

  /**
   * Visit AST node recursively
   */
  private visitNode(node: ts.Node, options: Required<TestExtractionOptions>): void {
    // Check for describe() calls (test suites)
    if (this.isDescribeCall(node, options.includeSkipped)) {
      this.extractTestSuite(node as ts.CallExpression, options);
      return; // Don't visit children, extractTestSuite handles them
    }

    // Check for it() or test() calls (test cases)
    if (this.isTestCaseCall(node, options.includeSkipped)) {
      this.extractTestCase(node as ts.CallExpression, options);
      return;
    }

    // Continue visiting children
    ts.forEachChild(node, (child) => this.visitNode(child, options));
  }

  /**
   * Check if node is a describe() call
   */
  private isDescribeCall(node: ts.Node, includeSkipped: boolean): boolean {
    if (!ts.isCallExpression(node)) return false;

    const expression = node.expression;

    // describe()
    if (ts.isIdentifier(expression) && expression.text === 'describe') {
      return true;
    }

    // describe.skip()
    if (
      includeSkipped &&
      ts.isPropertyAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === 'describe' &&
      expression.name.text === 'skip'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if node is an it() or test() call
   */
  private isTestCaseCall(node: ts.Node, includeSkipped: boolean): boolean {
    if (!ts.isCallExpression(node)) return false;

    const expression = node.expression;

    // it() or test()
    if (ts.isIdentifier(expression)) {
      const name = expression.text;
      if (name === 'it' || name === 'test') {
        return true;
      }
    }

    // it.skip() or test.skip()
    if (
      includeSkipped &&
      ts.isPropertyAccessExpression(expression) &&
      ts.isIdentifier(expression.expression)
    ) {
      const baseName = expression.expression.text;
      if ((baseName === 'it' || baseName === 'test') && expression.name.text === 'skip') {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract test suite from describe() call
   */
  private extractTestSuite(
    node: ts.CallExpression,
    options: Required<TestExtractionOptions>
  ): void {
    // Get suite name from first argument
    const suiteName = this.extractStringArgument(node, 0);
    if (!suiteName) {
      this.errors.push({
        file: this.currentFilePath,
        line: this.getLineNumber(node),
        message: 'describe() call missing suite name',
      });
      return;
    }

    const nestingLevel = this.suiteStack.length;

    // Check max nesting level
    if (nestingLevel >= options.maxNestingLevel) {
      return;
    }

    const parentId = this.suiteStack.length > 0 ? this.suiteStack[this.suiteStack.length - 1].id : null;

    // Generate suite ID
    const suiteId = this.generateTestId(suiteName, parentId, 'test-suite');

    // Create suite context
    const suiteContext: SuiteContext = {
      id: suiteId,
      name: suiteName,
      nestingLevel,
      parentId,
      childSuites: [],
      testCases: [],
    };

    // Add to parent's child suites
    if (this.suiteStack.length > 0) {
      const parent = this.suiteStack[this.suiteStack.length - 1];
      parent.childSuites.push(suiteId);
    }

    // Push context to stack
    this.suiteStack.push(suiteContext);

    // Get the function body (second argument)
    const bodyArg = node.arguments[1];
    if (bodyArg && (ts.isArrowFunction(bodyArg) || ts.isFunctionExpression(bodyArg))) {
      // Visit children within this suite
      if (ts.isFunctionExpression(bodyArg) || ts.isArrowFunction(bodyArg)) {
        const body = bodyArg.body;
        if (ts.isBlock(body)) {
          ts.forEachChild(body, (child) => this.visitNode(child, options));
        }
      }
    }

    // Pop context from stack
    this.suiteStack.pop();

    // Create test suite symbol
    const testSuite: TestSuite = {
      id: suiteId,
      name: suiteName,
      type: 'test-suite',
      filePath: this.currentFilePath,
      line: this.getLineNumber(node),
      column: this.getColumnNumber(node),
      isExported: false,
      isPublic: false,
      tests: [],
      designDecisions: [],
      parentSymbol: parentId,
      childSuites: suiteContext.childSuites,
      testCases: suiteContext.testCases,
      nestingLevel,
    };

    this.testSuites.push(testSuite);
  }

  /**
   * Extract test case from it() or test() call
   */
  private extractTestCase(
    node: ts.CallExpression,
    options: Required<TestExtractionOptions>
  ): void {
    // Get test name from first argument
    const testName = this.extractStringArgument(node, 0);
    if (!testName) {
      this.errors.push({
        file: this.currentFilePath,
        line: this.getLineNumber(node),
        message: 'it()/test() call missing test name',
      });
      return;
    }

    const parentId = this.suiteStack.length > 0 ? this.suiteStack[this.suiteStack.length - 1].id : null;

    // Generate test case ID
    const testCaseId = this.generateTestId(testName, parentId, 'test-case');

    // Add to parent's test cases
    if (this.suiteStack.length > 0) {
      const parent = this.suiteStack[this.suiteStack.length - 1];
      parent.testCases.push(testCaseId);
    }

    // Extract tested symbols (if coverage extraction enabled)
    let testedSymbols: string[] = [];
    let testedMethods: string[] = [];
    let assertionCount: number | undefined;

    if (options.extractCoverage) {
      const coverageInfo = this.extractTestCoverage(node);
      testedSymbols = coverageInfo.testedSymbols;
      testedMethods = coverageInfo.testedMethods;
      assertionCount = coverageInfo.assertionCount;
    }

    // Create test case symbol
    const testCase: TestCase = {
      id: testCaseId,
      name: testName,
      type: 'test-case',
      filePath: this.currentFilePath,
      line: this.getLineNumber(node),
      column: this.getColumnNumber(node),
      isExported: false,
      isPublic: false,
      summary: testName,
      tests: [],
      designDecisions: [],
      parentSymbol: parentId,
      testedSymbols,
      testedMethods,
      assertionCount,
    };

    this.testCases.push(testCase);
  }

  /**
   * Extract test scenarios from JSDoc @testScenario tags
   */
  private extractTestScenarios(sourceFile: ts.SourceFile, sourceCode: string): void {
    // Find JSDoc comments at the top of the file
    const firstStatement = sourceFile.statements[0];
    if (!firstStatement) return;

    const fullText = sourceFile.getFullText();
    const commentRanges = ts.getLeadingCommentRanges(fullText, 0);

    if (!commentRanges) return;

    for (const range of commentRanges) {
      const commentText = fullText.substring(range.pos, range.end);

      // Check if it's a JSDoc comment
      if (!commentText.startsWith('/**')) continue;

      // Extract @testScenario tags
      const scenarioRegex = /@testScenario\s+(.+)/g;
      let match;

      while ((match = scenarioRegex.exec(commentText)) !== null) {
        const scenarioDescription = match[1].trim();

        // Generate scenario ID
        const scenarioId = this.generateTestId(
          scenarioDescription,
          null,
          'test-scenario'
        );

        // Get line number
        const line = sourceFile.getLineAndCharacterOfPosition(range.pos).line + 1;

        // Create test scenario symbol
        const testScenario: TestScenario = {
          id: scenarioId,
          name: scenarioDescription,
          type: 'test-scenario',
          filePath: this.currentFilePath,
          line,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: scenarioDescription,
          tests: [],
          designDecisions: [],
          parentSymbol: null,
          coveredBy: [], // Will be populated later if needed
          description: scenarioDescription,
        };

        this.testScenarios.push(testScenario);
      }
    }
  }

  /**
   * Extract test coverage information from test case body
   * Returns tested symbols, methods, and assertion count
   */
  private extractTestCoverage(node: ts.CallExpression): {
    testedSymbols: string[];
    testedMethods: string[];
    assertionCount: number;
  } {
    const testedSymbols: Set<string> = new Set();
    const testedMethods: Set<string> = new Set();
    let assertionCount = 0;

    // Get the function body (second argument)
    const bodyArg = node.arguments[1];
    if (!bodyArg || (!ts.isArrowFunction(bodyArg) && !ts.isFunctionExpression(bodyArg))) {
      return { testedSymbols: [], testedMethods: [], assertionCount: 0 };
    }

    const body = bodyArg.body;
    if (!ts.isBlock(body)) {
      return { testedSymbols: [], testedMethods: [], assertionCount: 0 };
    }

    // Visit all nodes in the test body
    const visit = (n: ts.Node): void => {
      // Count expect() calls as assertions
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        n.expression.text === 'expect'
      ) {
        assertionCount++;
      }

      // Track method calls (e.g., dbManager.insertSymbol())
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const methodName = n.expression.name.text;
        testedMethods.add(methodName);

        // Get the object being called (e.g., dbManager)
        const object = n.expression.expression;
        if (ts.isIdentifier(object)) {
          testedSymbols.add(object.text);
        }
      }

      ts.forEachChild(n, visit);
    };

    ts.forEachChild(body, visit);

    return {
      testedSymbols: Array.from(testedSymbols),
      testedMethods: Array.from(testedMethods),
      assertionCount,
    };
  }

  /**
   * Generate test symbol ID
   *
   * Format: {file-base}-{suite-chain}-{name}-{type}
   */
  private generateTestId(
    name: string,
    parentId: string | null,
    type: 'test-suite' | 'test-case' | 'test-scenario'
  ): string {
    const kebabName = this.toKebabCase(name);

    if (type === 'test-scenario') {
      return `${this.fileBaseName}-${kebabName}-scenario`;
    }

    if (parentId) {
      // Remove type suffix from parent ID
      const parentBase = parentId.replace(/-test-suite$/, '').replace(/-test-case$/, '');
      return `${parentBase}-${kebabName}-${type}`;
    }

    // Root suite: include file base name for uniqueness
    // If suite name matches file base name, don't duplicate
    if (kebabName === this.fileBaseName) {
      return `${kebabName}-${type}`;
    } else {
      return `${this.fileBaseName}-${kebabName}-${type}`;
    }
  }

  /**
   * Extract file base name from file path including parent directory for uniqueness
   * Example: "src/__tests__/lsp/IncrementalBuilder.test.ts" → "lsp-incremental-builder"
   */
  private extractFileBaseName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts.pop() || '';
    const parentDir = parts.pop() || '';
    const baseName = fileName
      .replace(/\.test\.ts$/, '')
      .replace(/\.spec\.ts$/, '')
      .replace(/\.ts$/, '');

    // Include parent directory if not __tests__ to avoid collisions
    const prefix = parentDir && parentDir !== '__tests__'
      ? this.toKebabCase(parentDir) + '-'
      : '';
    return prefix + this.toKebabCase(baseName);
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/\.\.\//g, 'parent-') // preserve ../ as "parent-"
      .replace(/\.\//g, 'current-') // preserve ./ as "current-"
      .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase to kebab-case
      .replace(/[\s_]+/g, '-') // spaces and underscores to hyphens
      .replace(/[^\w-]/g, '') // remove non-word chars except hyphens
      .replace(/-+/g, '-') // collapse multiple hyphens
      .toLowerCase()
      .replace(/^-+|-+$/g, ''); // trim hyphens
  }

  /**
   * Extract string argument from call expression
   */
  private extractStringArgument(node: ts.CallExpression, index: number): string | null {
    const arg = node.arguments[index];
    if (!arg) return null;

    if (ts.isStringLiteral(arg)) {
      return arg.text;
    }

    if (ts.isNoSubstitutionTemplateLiteral(arg)) {
      return arg.text;
    }

    return null;
  }

  /**
   * Get line number of node
   */
  private getLineNumber(node: ts.Node): number {
    const sourceFile = node.getSourceFile();
    return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  }

  /**
   * Get column number of node
   */
  private getColumnNumber(node: ts.Node): number {
    const sourceFile = node.getSourceFile();
    return sourceFile.getLineAndCharacterOfPosition(node.getStart()).character;
  }
}
