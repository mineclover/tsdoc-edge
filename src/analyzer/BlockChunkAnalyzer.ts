/**
 * BlockChunkAnalyzer - Analyzes code at block level
 *
 * Features:
 * - Splits functions/methods into logical blocks
 * - Infers block type (validation, transformation, query, etc.)
 * - Detects side effects (I/O, database, network)
 * - Tracks block-level dependencies
 * - Calculates cyclomatic complexity
 *
 * @packageDocumentation
 */

import * as ts from 'typescript';
import {
  type CodeBlock,
  BlockType,
  type BlockScope,
  type SideEffect,
  type SideEffectType,
  type BlockAnalysisResult,
  type BlockDependency,
  type ChunkingStrategy,
} from '../types/blocks';

/**
 * Block chunking analyzer
 */
export class BlockChunkAnalyzer {
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;
  private strategy: ChunkingStrategy;

  constructor(
    program: ts.Program,
    strategy: Partial<ChunkingStrategy> = {},
  ) {
    this.program = program;
    this.typeChecker = program.getTypeChecker();
    this.strategy = {
      minBlockSize: 1,
      maxBlockSize: 50,
      mergeSmallBlocks: true,
      splitLargeBlocks: false,
      detectionRules: [],
      ...strategy,
    };
  }

  /**
   * Analyze function for code blocks
   */
  analyzeFunction(
    functionNode: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    symbolId: string,
    filePath: string,
  ): BlockAnalysisResult {
    const blocks: CodeBlock[] = [];
    const warnings: string[] = [];

    if (!functionNode.body) {
      return {
        blocks: [],
        totalLines: 0,
        coveredLines: 0,
        coverage: 0,
        warnings: ['Function has no body'],
      };
    }

    // Get source file for line numbers
    const sourceFile = functionNode.getSourceFile();

    // Split body into blocks
    if (ts.isBlock(functionNode.body)) {
      const statements = functionNode.body.statements;
      const statementBlocks = this.groupStatements(Array.from(statements));

      for (let i = 0; i < statementBlocks.length; i++) {
        const stmtGroup = statementBlocks[i];
        if (stmtGroup.length === 0) continue;

        const startLine = sourceFile.getLineAndCharacterOfPosition(stmtGroup[0].getStart()).line + 1;
        const endLine = sourceFile.getLineAndCharacterOfPosition(
          stmtGroup[stmtGroup.length - 1].getEnd(),
        ).line + 1;

        const blockType = this.inferBlockType(stmtGroup);
        const dependencies = this.extractDependencies(stmtGroup);
        const sideEffects = this.detectSideEffects(stmtGroup);
        const scope = this.inferBlockScope(stmtGroup);
        const complexity = this.calculateComplexity(stmtGroup);

        const block: CodeBlock = {
          id: `${symbolId}::block-${i + 1}`,
          symbolId,
          type: blockType,
          startLine,
          endLine,
          purpose: this.generatePurpose(blockType, stmtGroup),
          dependencies,
          sideEffects,
          scope,
          complexity,
        };

        blocks.push(block);
      }
    } else {
      // Single expression body (arrow function)
      const startLine = sourceFile.getLineAndCharacterOfPosition(functionNode.body.getStart()).line + 1;
      const endLine = sourceFile.getLineAndCharacterOfPosition(functionNode.body.getEnd()).line + 1;

      const blockType = this.inferBlockType([functionNode.body as any]);
      const dependencies = this.extractDependencies([functionNode.body as any]);
      const sideEffects = this.detectSideEffects([functionNode.body as any]);

      blocks.push({
        id: `${symbolId}::block-1`,
        symbolId,
        type: blockType,
        startLine,
        endLine,
        purpose: 'Single expression',
        dependencies,
        sideEffects,
        scope: 'local',
        complexity: 1,
      });
    }

    // Calculate coverage
    const functionStart = sourceFile.getLineAndCharacterOfPosition(functionNode.getStart()).line + 1;
    const functionEnd = sourceFile.getLineAndCharacterOfPosition(functionNode.getEnd()).line + 1;
    const totalLines = functionEnd - functionStart + 1;
    const coveredLines = blocks.reduce((sum, b) => sum + (b.endLine - b.startLine + 1), 0);

    return {
      blocks,
      totalLines,
      coveredLines,
      coverage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      warnings,
    };
  }

  /**
   * Group statements into logical blocks
   */
  private groupStatements(statements: ts.Statement[]): ts.Statement[][] {
    const groups: ts.Statement[][] = [];
    let currentGroup: ts.Statement[] = [];
    let lastType: BlockType | null = null;

    for (const stmt of statements) {
      const stmtType = this.inferBlockType([stmt]);

      // Start new group if type changes or if we hit a boundary statement
      if (lastType && stmtType !== lastType) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
        }
      }

      currentGroup.push(stmt);
      lastType = stmtType;
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Infer block type from statements
   */
  private inferBlockType(statements: ts.Statement[]): BlockType {
    if (statements.length === 0) return BlockType.OTHER;

    // Check for validation patterns
    if (this.hasValidationPattern(statements)) {
      return BlockType.VALIDATION;
    }

    // Check for database patterns
    if (this.hasDatabasePattern(statements)) {
      return BlockType.QUERY;
    }

    // Check for mutation patterns
    if (this.hasMutationPattern(statements)) {
      return BlockType.MUTATION;
    }

    // Check for transformation patterns
    if (this.hasTransformationPattern(statements)) {
      return BlockType.TRANSFORMATION;
    }

    // Check for error handling
    if (this.hasErrorHandlingPattern(statements)) {
      return BlockType.ERROR_HANDLING;
    }

    // Check for logging
    if (this.hasLoggingPattern(statements)) {
      return BlockType.LOGGING;
    }

    // Check for HTTP patterns
    if (this.hasHttpPattern(statements)) {
      return BlockType.HTTP;
    }

    // Check for conditionals
    if (statements.some(s => ts.isIfStatement(s) || ts.isSwitchStatement(s))) {
      return BlockType.CONDITIONAL;
    }

    // Check for loops
    if (statements.some(s => ts.isForStatement(s) || ts.isWhileStatement(s) || ts.isForOfStatement(s))) {
      return BlockType.LOOP;
    }

    // Default
    return BlockType.BUSINESS_LOGIC;
  }

  /**
   * Check for validation pattern
   */
  private hasValidationPattern(statements: ts.Statement[]): boolean {
    for (const stmt of statements) {
      const text = stmt.getText();
      if (
        text.includes('validate') ||
        text.includes('check') ||
        text.includes('isValid') ||
        text.includes('throw new Error') ||
        text.includes('throw new') && text.includes('Error') ||
        (ts.isIfStatement(stmt) && text.includes('!')) ||
        text.includes('.test(') || // Regex test
        text.includes('.match(')
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for database pattern
   */
  private hasDatabasePattern(statements: ts.Statement[]): boolean {
    for (const stmt of statements) {
      const text = stmt.getText();
      if (
        text.includes('.find(') ||
        text.includes('.findOne(') ||
        text.includes('.findMany(') ||
        text.includes('.select(') ||
        text.includes('.where(') ||
        text.includes('.query(') ||
        text.includes('await db.') ||
        text.includes('.get()') ||
        text.includes('.all()') ||
        text.includes('SELECT ') ||
        text.includes('FROM ')
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for mutation pattern
   */
  private hasMutationPattern(statements: ts.Statement[]): boolean {
    for (const stmt of statements) {
      const text = stmt.getText();
      if (
        text.includes('.create(') ||
        text.includes('.update(') ||
        text.includes('.delete(') ||
        text.includes('.insert(') ||
        text.includes('.save(') ||
        text.includes('.remove(') ||
        text.includes('.push(') ||
        text.includes('.pop(') ||
        text.includes('.shift(') ||
        text.includes('.unshift(') ||
        text.includes('.splice(') ||
        text.includes('INSERT ') ||
        text.includes('UPDATE ') ||
        text.includes('DELETE ')
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for transformation pattern
   */
  private hasTransformationPattern(statements: ts.Statement[]): boolean {
    for (const stmt of statements) {
      const text = stmt.getText();
      if (
        text.includes('.map(') ||
        text.includes('.filter(') ||
        text.includes('.reduce(') ||
        text.includes('.transform(') ||
        text.includes('.convert(') ||
        text.includes('.parse(') ||
        text.includes('.stringify(') ||
        text.includes('JSON.parse') ||
        text.includes('JSON.stringify')
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for error handling pattern
   */
  private hasErrorHandlingPattern(statements: ts.Statement[]): boolean {
    return statements.some(s =>
      ts.isTryStatement(s) ||
      ts.isCatchClause(s) ||
      (ts.isIfStatement(s) && s.getText().includes('error'))
    );
  }

  /**
   * Check for logging pattern
   */
  private hasLoggingPattern(statements: ts.Statement[]): boolean {
    for (const stmt of statements) {
      const text = stmt.getText();
      if (
        text.includes('console.log') ||
        text.includes('console.error') ||
        text.includes('console.warn') ||
        text.includes('logger.') ||
        text.includes('.log(') ||
        text.includes('.error(') ||
        text.includes('.warn(') ||
        text.includes('.info(') ||
        text.includes('.debug(')
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for HTTP pattern
   */
  private hasHttpPattern(statements: ts.Statement[]): boolean {
    for (const stmt of statements) {
      const text = stmt.getText();
      if (
        text.includes('.get(') && (text.includes('http') || text.includes('fetch')) ||
        text.includes('.post(') ||
        text.includes('.put(') ||
        text.includes('.delete(') ||
        text.includes('fetch(') ||
        text.includes('axios.') ||
        text.includes('.send(') ||
        text.includes('.status(') ||
        text.includes('.json(')
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract dependencies from statements
   */
  private extractDependencies(statements: ts.Statement[]): string[] {
    const dependencies = new Set<string>();

    const visit = (node: ts.Node) => {
      // Look for identifiers that might be dependencies
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (ts.isIdentifier(expr)) {
          dependencies.add(expr.text);
        } else if (ts.isPropertyAccessExpression(expr)) {
          if (ts.isIdentifier(expr.expression)) {
            dependencies.add(expr.expression.text);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    for (const stmt of statements) {
      visit(stmt);
    }

    return Array.from(dependencies);
  }

  /**
   * Detect side effects
   */
  private detectSideEffects(statements: ts.Statement[]): SideEffect[] {
    const effects: SideEffect[] = [];

    for (const stmt of statements) {
      const text = stmt.getText();

      // Database operations
      if (this.hasDatabasePattern([stmt])) {
        effects.push({
          type: 'database',
          description: 'Database operation',
          intentional: true,
        });
      }

      // Network operations
      if (text.includes('fetch') || text.includes('axios') || text.includes('http')) {
        effects.push({
          type: 'network',
          description: 'Network request',
          intentional: true,
        });
      }

      // File system operations
      if (text.includes('fs.') || text.includes('readFile') || text.includes('writeFile')) {
        effects.push({
          type: 'filesystem',
          description: 'File system operation',
          intentional: true,
        });
      }

      // State mutations
      if (this.hasMutationPattern([stmt])) {
        effects.push({
          type: 'state-mutation',
          description: 'State modification',
          intentional: true,
        });
      }

      // Logging
      if (this.hasLoggingPattern([stmt])) {
        effects.push({
          type: 'logging',
          description: 'Logging operation',
          intentional: true,
        });
      }

      // Event emission
      if (text.includes('.emit(') || text.includes('.dispatch(') || text.includes('.trigger(')) {
        effects.push({
          type: 'event',
          description: 'Event emission',
          intentional: true,
        });
      }

      // Cache operations
      if (text.includes('cache.') || text.includes('.cache') || text.includes('redis.')) {
        effects.push({
          type: 'cache',
          description: 'Cache operation',
          intentional: true,
        });
      }
    }

    return effects;
  }

  /**
   * Infer block scope
   */
  private inferBlockScope(statements: ts.Statement[]): BlockScope {
    // Simplified - could be more sophisticated
    for (const stmt of statements) {
      const text = stmt.getText();
      if (text.includes('global.') || text.includes('window.')) {
        return 'global';
      }
      if (text.includes('module.') || text.includes('exports.')) {
        return 'module';
      }
    }
    return 'local';
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(statements: ts.Statement[]): number {
    let complexity = 1; // Base complexity

    const visit = (node: ts.Node) => {
      if (
        ts.isIfStatement(node) ||
        ts.isConditionalExpression(node) ||
        ts.isWhileStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isCaseClause(node) ||
        ts.isCatchClause(node)
      ) {
        complexity++;
      }

      // Logical operators
      if (ts.isBinaryExpression(node)) {
        if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
          complexity++;
        }
      }

      ts.forEachChild(node, visit);
    };

    for (const stmt of statements) {
      visit(stmt);
    }

    return complexity;
  }

  /**
   * Generate purpose description
   */
  private generatePurpose(blockType: BlockType, statements: ts.Statement[]): string {
    const text = statements.map(s => s.getText()).join(' ').substring(0, 100);

    switch (blockType) {
      case 'validation':
        return 'Input validation and constraint checking';
      case 'transformation':
        return 'Data transformation and mapping';
      case 'query':
        return 'Database query operation';
      case 'mutation':
        return 'State or data mutation';
      case 'logging':
        return 'Logging and debugging';
      case 'error-handling':
        return 'Error handling and recovery';
      case 'http':
        return 'HTTP request/response handling';
      case 'conditional':
        return 'Conditional branching logic';
      case 'loop':
        return 'Iteration and looping';
      case 'business-logic':
        return 'Core business logic';
      default:
        return text;
    }
  }
}
