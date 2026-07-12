/**
 * EntryPointDetector - Detects application entry points
 *
 * Features:
 * - CLI entry points (shebang, bin files)
 * - Main functions (main, bootstrap, start)
 * - Application bootstrappers
 * - Framework-specific entry points
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

export enum EntryPointType {
  CLI = 'cli',
  MAIN_FUNCTION = 'main-function',
  APPLICATION = 'application',
  SERVER = 'server',
  WORKER = 'worker',
  TEST_RUNNER = 'test-runner',
  SCRIPT = 'script',
}

export interface EntryPoint {
  id: string;
  type: EntryPointType;
  filePath: string;
  symbolId?: string;
  functionName?: string;
  line: number;
  description?: string;
  isAsync: boolean;
  bootstrapOrder?: number;
  dependencies: string[];
}

export interface EntryPointDetectionConfig {
  detectCLI: boolean;
  detectMainFunctions: boolean;
  detectServers: boolean;
  mainFunctionPatterns: string[];
}

const DEFAULT_CONFIG: EntryPointDetectionConfig = {
  detectCLI: true,
  detectMainFunctions: true,
  detectServers: true,
  mainFunctionPatterns: ['main', 'bootstrap', 'start', 'run', 'init', 'setup'],
};

/**
 * Entry point detector
 */
export class EntryPointDetector {
  private program: ts.Program;
  private config: EntryPointDetectionConfig;
  private projectRoot: string;

  constructor(
    program: ts.Program,
    projectRoot: string,
    config: Partial<EntryPointDetectionConfig> = {}
  ) {
    this.program = program;
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze file for entry points
   */
  analyzeFile(filePath: string): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) return entryPoints;

    // Check for CLI entry point (shebang)
    if (this.config.detectCLI && this.hasCLIShebang(filePath)) {
      entryPoints.push(this.createCLIEntryPoint(filePath, sourceFile));
    }

    // Detect main functions
    if (this.config.detectMainFunctions) {
      const mainFunctions = this.detectMainFunctions(sourceFile, filePath);
      entryPoints.push(...mainFunctions);
    }

    // Detect server bootstrappers
    if (this.config.detectServers) {
      const servers = this.detectServerBootstrap(sourceFile, filePath);
      entryPoints.push(...servers);
    }

    return entryPoints;
  }

  /**
   * Check if file has CLI shebang
   */
  private hasCLIShebang(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const firstLine = content.split('\n')[0];
      return firstLine.startsWith('#!/usr/bin/env node') || firstLine.startsWith('#!/usr/bin/node');
    } catch {
      return false;
    }
  }

  /**
   * Create CLI entry point
   */
  private createCLIEntryPoint(filePath: string, sourceFile: ts.SourceFile): EntryPoint {
    return {
      id: this.generateId(filePath, 'cli'),
      type: EntryPointType.CLI,
      filePath,
      line: 1,
      description: 'CLI entry point',
      isAsync: false,
      dependencies: this.extractTopLevelImports(sourceFile),
    };
  }

  /**
   * Detect main functions
   */
  private detectMainFunctions(sourceFile: ts.SourceFile, filePath: string): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];

    const visit = (node: ts.Node) => {
      // Function declarations: function main() {}
      if (ts.isFunctionDeclaration(node) && node.name) {
        const functionName = node.name.text;
        if (this.isMainFunctionName(functionName)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          const isAsync =
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;

          entryPoints.push({
            id: this.generateId(filePath, functionName),
            type: this.inferEntryPointType(functionName),
            filePath,
            functionName,
            line,
            description: this.generateDescription(functionName),
            isAsync,
            dependencies: this.extractFunctionDependencies(node),
          });
        }
      }

      // Variable declarations: const main = async () => {}
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            const varName = declaration.name.text;
            if (this.isMainFunctionName(varName) && declaration.initializer) {
              if (
                ts.isArrowFunction(declaration.initializer) ||
                ts.isFunctionExpression(declaration.initializer)
              ) {
                const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
                const isAsync =
                  (ts.isArrowFunction(declaration.initializer) &&
                    declaration.initializer.modifiers?.some(
                      (m) => m.kind === ts.SyntaxKind.AsyncKeyword
                    )) ??
                  false;

                entryPoints.push({
                  id: this.generateId(filePath, varName),
                  type: this.inferEntryPointType(varName),
                  filePath,
                  functionName: varName,
                  line,
                  description: this.generateDescription(varName),
                  isAsync,
                  dependencies: this.extractFunctionDependencies(declaration.initializer),
                });
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return entryPoints;
  }

  /**
   * Detect server bootstrap code
   */
  private detectServerBootstrap(sourceFile: ts.SourceFile, filePath: string): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];
    const text = sourceFile.getFullText();

    // Patterns for server bootstrap
    const serverPatterns = [
      /app\.listen\s*\(/,
      /server\.listen\s*\(/,
      /fastify\.listen\s*\(/,
      /\.serve\s*\(/,
    ];

    for (const pattern of serverPatterns) {
      if (pattern.test(text)) {
        // Find the specific line
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            entryPoints.push({
              id: this.generateId(filePath, `server-${i + 1}`),
              type: EntryPointType.SERVER,
              filePath,
              line: i + 1,
              description: 'Server bootstrap',
              isAsync: false,
              dependencies: this.extractTopLevelImports(sourceFile),
            });
            break; // Only first occurrence
          }
        }
      }
    }

    return entryPoints;
  }

  /**
   * Check if function name matches main function pattern
   */
  private isMainFunctionName(name: string): boolean {
    return this.config.mainFunctionPatterns.some(
      (pattern) =>
        name.toLowerCase() === pattern.toLowerCase() ||
        name.toLowerCase().startsWith(pattern.toLowerCase())
    );
  }

  /**
   * Infer entry point type from function name
   */
  private inferEntryPointType(functionName: string): EntryPointType {
    const lower = functionName.toLowerCase();

    if (lower.includes('server') || lower.includes('listen')) {
      return EntryPointType.SERVER;
    }
    if (lower.includes('worker')) {
      return EntryPointType.WORKER;
    }
    if (lower.includes('test') || lower.includes('spec')) {
      return EntryPointType.TEST_RUNNER;
    }
    if (lower.includes('bootstrap') || lower.includes('init')) {
      return EntryPointType.APPLICATION;
    }

    return EntryPointType.MAIN_FUNCTION;
  }

  /**
   * Generate description
   */
  private generateDescription(functionName: string): string {
    const type = this.inferEntryPointType(functionName);

    switch (type) {
      case EntryPointType.SERVER:
        return 'Server bootstrap function';
      case EntryPointType.WORKER:
        return 'Worker entry point';
      case EntryPointType.APPLICATION:
        return 'Application initialization';
      case EntryPointType.TEST_RUNNER:
        return 'Test runner entry point';
      default:
        return 'Main entry point';
    }
  }

  /**
   * Extract top-level imports
   */
  private extractTopLevelImports(sourceFile: ts.SourceFile): string[] {
    const imports: string[] = [];

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        const moduleSpecifier = statement.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          imports.push(moduleSpecifier.text);
        }
      }
    }

    return imports;
  }

  /**
   * Extract function dependencies (calls within function)
   */
  private extractFunctionDependencies(node: ts.FunctionLikeDeclaration): string[] {
    const dependencies: string[] = [];

    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const expr = n.expression;
        if (ts.isIdentifier(expr)) {
          dependencies.push(expr.text);
        } else if (ts.isPropertyAccessExpression(expr)) {
          if (ts.isIdentifier(expr.expression)) {
            dependencies.push(`${expr.expression.text}.${expr.name.text}`);
          }
        }
      }
      ts.forEachChild(n, visit);
    };

    if (node.body) {
      visit(node.body);
    }

    return Array.from(new Set(dependencies));
  }

  /**
   * Generate entry point ID
   */
  private generateId(filePath: string, identifier: string): string {
    const relativePath = path.relative(this.projectRoot, filePath);
    const normalized = relativePath
      .replace(/\\/g, '/')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase();

    return `entrypoint-${normalized}-${identifier}`;
  }

  /**
   * Analyze all files in project
   */
  analyzeProject(): EntryPoint[] {
    const allEntryPoints: EntryPoint[] = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;
      const filePath = sourceFile.fileName;

      // Skip node_modules
      if (filePath.includes('node_modules')) continue;

      const entryPoints = this.analyzeFile(filePath);
      allEntryPoints.push(...entryPoints);
    }

    return allEntryPoints;
  }
}
