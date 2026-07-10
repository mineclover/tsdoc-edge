/**
 * EndpointDetectionAnalyzer - Detects HTTP endpoints from framework code
 *
 * Supports:
 * - Express (app.get, app.post, router.get, etc.)
 * - Fastify (fastify.get, fastify.post, etc.)
 * - Hono (app.get, app.post, etc.)
 *
 * @packageDocumentation
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import type {
  HTTPEndpoint,
  HTTPMethod,
  EndpointScope,
  DetectedEndpoint,
  RoutePattern,
} from '../types/endpoints';

/**
 * Configuration for endpoint detection
 */
export interface EndpointDetectionConfig {
  /** Frameworks to detect */
  frameworks: ('express' | 'fastify' | 'hono')[];
  /** Minimum confidence threshold (0-1) */
  minConfidence: number;
}

/**
 * Detects HTTP endpoints from source files
 */
export class EndpointDetectionAnalyzer {
  private program: ts.Program;
  private config: EndpointDetectionConfig;

  constructor(
    program: ts.Program,
    config: Partial<EndpointDetectionConfig> = {},
  ) {
    this.program = program;
    this.config = {
      frameworks: ['express', 'fastify', 'hono'],
      minConfidence: 0.7,
      ...config,
    };
  }

  /**
   * Analyze file for endpoints
   */
  analyzeFile(filePath: string): DetectedEndpoint[] {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      return [];
    }

    const endpoints: DetectedEndpoint[] = [];

    // Detect framework
    const framework = this.detectFramework(sourceFile);
    if (!framework || !this.config.frameworks.includes(framework)) {
      return [];
    }

    // Parse routes based on framework
    switch (framework) {
      case 'express':
        endpoints.push(...this.detectExpressRoutes(sourceFile));
        break;
      case 'fastify':
        endpoints.push(...this.detectFastifyRoutes(sourceFile));
        break;
      case 'hono':
        endpoints.push(...this.detectHonoRoutes(sourceFile));
        break;
    }

    return endpoints.filter(e => e.confidence >= this.config.minConfidence);
  }

  /**
   * Detect framework from imports
   */
  private detectFramework(sourceFile: ts.SourceFile): 'express' | 'fastify' | 'hono' | null {
    let hasExpress = false;
    let hasFastify = false;
    let hasHono = false;

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier.getText().replace(/['"]/g, '');
        if (moduleSpecifier === 'express' || moduleSpecifier.startsWith('express/')) {
          hasExpress = true;
        } else if (moduleSpecifier === 'fastify' || moduleSpecifier.startsWith('fastify/')) {
          hasFastify = true;
        } else if (moduleSpecifier === 'hono' || moduleSpecifier.startsWith('hono/')) {
          hasHono = true;
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Prioritize in order
    if (hasExpress) return 'express';
    if (hasFastify) return 'fastify';
    if (hasHono) return 'hono';
    return null;
  }

  /**
   * Detect Express routes
   * Pattern: app.get('/path', handler)
   *          router.post('/path', middleware, handler)
   */
  private detectExpressRoutes(sourceFile: ts.SourceFile): DetectedEndpoint[] {
    const endpoints: DetectedEndpoint[] = [];

    const visit = (node: ts.Node) => {
      // Look for call expressions: app.get(...), router.post(...)
      if (ts.isCallExpression(node)) {
        const endpoint = this.parseExpressCall(node, sourceFile);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return endpoints;
  }

  /**
   * Parse Express route call
   */
  private parseExpressCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
  ): DetectedEndpoint | null {
    // Check if it's a method call on app or router
    if (!ts.isPropertyAccessExpression(node.expression)) {
      return null;
    }

    const method = node.expression.name.getText();
    const httpMethod = this.normalizeHTTPMethod(method);
    if (!httpMethod) {
      return null;
    }

    // Get arguments
    const args = node.arguments;
    if (args.length < 2) {
      return null;
    }

    // First argument should be path (string literal)
    const pathArg = args[0];
    let routePath: string | null = null;

    if (ts.isStringLiteral(pathArg)) {
      routePath = pathArg.text;
    } else if (ts.isTemplateExpression(pathArg) || ts.isNoSubstitutionTemplateLiteral(pathArg)) {
      // Template literal - try to extract static parts
      routePath = this.extractTemplatePath(pathArg);
    }

    if (!routePath) {
      return null;
    }

    // Extract path parameters
    const pathParams = this.extractPathParams(routePath);

    // Last argument is usually the handler
    const handlerArg = args[args.length - 1];
    const handlerSymbolId = this.extractHandlerSymbolId(handlerArg, sourceFile);

    // Middle arguments are middlewares
    const middlewares: string[] = [];
    for (let i = 1; i < args.length - 1; i++) {
      const middlewareId = this.extractHandlerSymbolId(args[i], sourceFile);
      if (middlewareId) {
        middlewares.push(middlewareId);
      }
    }

    // Infer scope from path or JSDoc
    const scope = this.inferEndpointScope(routePath, sourceFile, node);

    // Create endpoint
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const id = this.generateEndpointId(httpMethod, routePath);

    return {
      id,
      method: httpMethod,
      path: routePath,
      pathParams,
      queryParams: undefined,
      handlerSymbolId: handlerSymbolId || 'unknown',
      controllerSymbolId: undefined,
      requestType: undefined,
      responseType: undefined,
      scope,
      middlewares,
      filePath: sourceFile.fileName,
      line: position.line + 1,
      framework: 'express',
      confidence: handlerSymbolId ? 0.9 : 0.6,
      routePattern: routePath,
    };
  }

  /**
   * Detect Fastify routes
   * Pattern: fastify.get('/path', { schema }, handler)
   */
  private detectFastifyRoutes(sourceFile: ts.SourceFile): DetectedEndpoint[] {
    const endpoints: DetectedEndpoint[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const endpoint = this.parseFastifyCall(node, sourceFile);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return endpoints;
  }

  /**
   * Parse Fastify route call
   */
  private parseFastifyCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
  ): DetectedEndpoint | null {
    if (!ts.isPropertyAccessExpression(node.expression)) {
      return null;
    }

    const method = node.expression.name.getText();
    const httpMethod = this.normalizeHTTPMethod(method);
    if (!httpMethod) {
      return null;
    }

    const args = node.arguments;
    if (args.length < 2) {
      return null;
    }

    // First argument: path
    const pathArg = args[0];
    let routePath: string | null = null;

    if (ts.isStringLiteral(pathArg)) {
      routePath = pathArg.text;
    }

    if (!routePath) {
      return null;
    }

    const pathParams = this.extractPathParams(routePath);

    // Second argument could be options object or handler
    let handlerArg: ts.Expression;
    let requestType: string | undefined;
    let responseType: string | undefined;

    if (args.length === 2) {
      handlerArg = args[1];
    } else {
      // Third argument is handler, second is options
      handlerArg = args[2];

      // Try to extract schema from options
      const optionsArg = args[1];
      if (ts.isObjectLiteralExpression(optionsArg)) {
        for (const prop of optionsArg.properties) {
          if (ts.isPropertyAssignment(prop) &&
              ts.isIdentifier(prop.name) &&
              prop.name.text === 'schema') {
            // Schema object - could extract request/response types
            // Simplified for now
          }
        }
      }
    }

    const handlerSymbolId = this.extractHandlerSymbolId(handlerArg, sourceFile);
    const scope = this.inferEndpointScope(routePath, sourceFile, node);

    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const id = this.generateEndpointId(httpMethod, routePath);

    return {
      id,
      method: httpMethod,
      path: routePath,
      pathParams,
      queryParams: undefined,
      handlerSymbolId: handlerSymbolId || 'unknown',
      controllerSymbolId: undefined,
      requestType,
      responseType,
      scope,
      middlewares: [],
      filePath: sourceFile.fileName,
      line: position.line + 1,
      framework: 'fastify',
      confidence: handlerSymbolId ? 0.9 : 0.6,
      routePattern: routePath,
    };
  }

  /**
   * Detect Hono routes
   * Pattern: app.get('/path', (c) => { ... })
   */
  private detectHonoRoutes(sourceFile: ts.SourceFile): DetectedEndpoint[] {
    const endpoints: DetectedEndpoint[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const endpoint = this.parseHonoCall(node, sourceFile);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return endpoints;
  }

  /**
   * Parse Hono route call
   */
  private parseHonoCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
  ): DetectedEndpoint | null {
    if (!ts.isPropertyAccessExpression(node.expression)) {
      return null;
    }

    const method = node.expression.name.getText();
    const httpMethod = this.normalizeHTTPMethod(method);
    if (!httpMethod) {
      return null;
    }

    const args = node.arguments;
    if (args.length < 2) {
      return null;
    }

    // First argument: path
    const pathArg = args[0];
    let routePath: string | null = null;

    if (ts.isStringLiteral(pathArg)) {
      routePath = pathArg.text;
    }

    if (!routePath) {
      return null;
    }

    const pathParams = this.extractPathParams(routePath);

    // Second argument: handler (often inline arrow function)
    const handlerArg = args[args.length - 1];
    const handlerSymbolId = this.extractHandlerSymbolId(handlerArg, sourceFile);

    // Middlewares
    const middlewares: string[] = [];
    for (let i = 1; i < args.length - 1; i++) {
      const middlewareId = this.extractHandlerSymbolId(args[i], sourceFile);
      if (middlewareId) {
        middlewares.push(middlewareId);
      }
    }

    const scope = this.inferEndpointScope(routePath, sourceFile, node);

    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const id = this.generateEndpointId(httpMethod, routePath);

    return {
      id,
      method: httpMethod,
      path: routePath,
      pathParams,
      queryParams: undefined,
      handlerSymbolId: handlerSymbolId || 'inline',
      controllerSymbolId: undefined,
      requestType: undefined,
      responseType: undefined,
      scope,
      middlewares,
      filePath: sourceFile.fileName,
      line: position.line + 1,
      framework: 'hono',
      confidence: handlerSymbolId ? 0.9 : 0.7,
      routePattern: routePath,
    };
  }

  /**
   * Normalize HTTP method name
   */
  private normalizeHTTPMethod(methodName: string): HTTPMethod | null {
    const normalized = methodName.toUpperCase();
    const validMethods: HTTPMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    return validMethods.includes(normalized as HTTPMethod) ? (normalized as HTTPMethod) : null;
  }

  /**
   * Extract path parameters from route
   * Example: /api/users/:id -> ['id']
   *          /api/users/:userId/posts/:postId -> ['userId', 'postId']
   */
  private extractPathParams(routePath: string): string[] {
    const params: string[] = [];
    const paramRegex = /:(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = paramRegex.exec(routePath)) !== null) {
      params.push(match[1]);
    }

    return params;
  }

  /**
   * Extract template literal path (best effort)
   */
  private extractTemplatePath(node: ts.Node): string | null {
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    if (ts.isTemplateExpression(node)) {
      // Try to construct path from static parts
      let path = node.head.text;
      for (const span of node.templateSpans) {
        path += ':param'; // Placeholder for dynamic parts
        path += span.literal.text;
      }
      return path;
    }
    return null;
  }

  /**
   * Extract handler symbol ID
   */
  private extractHandlerSymbolId(
    handlerNode: ts.Expression,
    sourceFile: ts.SourceFile,
  ): string | null {
    // If it's an identifier, use its name
    if (ts.isIdentifier(handlerNode)) {
      return this.symbolIdFromName(handlerNode.text, sourceFile.fileName);
    }

    // If it's a property access, use the property name
    if (ts.isPropertyAccessExpression(handlerNode)) {
      return this.symbolIdFromName(handlerNode.name.text, sourceFile.fileName);
    }

    // If it's an arrow function or function expression, it's inline
    if (ts.isArrowFunction(handlerNode) || ts.isFunctionExpression(handlerNode)) {
      const position = sourceFile.getLineAndCharacterOfPosition(handlerNode.getStart());
      return `inline-handler-${path.basename(sourceFile.fileName)}-${position.line + 1}`;
    }

    return null;
  }

  /**
   * Generate symbol ID from name (simplified)
   */
  private symbolIdFromName(name: string, filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    return `${fileName}-function-${name.toLowerCase()}`;
  }

  /**
   * Infer endpoint scope from path or JSDoc
   */
  private inferEndpointScope(
    routePath: string,
    sourceFile: ts.SourceFile,
    node: ts.Node,
  ): EndpointScope {
    // Check path patterns
    if (routePath.startsWith('/api/admin') || routePath.includes('/admin/')) {
      return 'admin' as EndpointScope;
    }

    if (routePath.startsWith('/api/internal') || routePath.includes('/internal/')) {
      return 'internal' as EndpointScope;
    }

    if (routePath.startsWith('/api/private') || routePath.includes('/private/')) {
      return 'private' as EndpointScope;
    }

    // Check JSDoc for @scope tag
    const jsDoc = this.getJSDoc(node, sourceFile);
    if (jsDoc) {
      const scopeMatch = jsDoc.match(/@scope\s+(public|internal|private|admin)/);
      if (scopeMatch) {
        return scopeMatch[1] as EndpointScope;
      }
    }

    // Default: public
    return 'public' as EndpointScope;
  }

  /**
   * Get JSDoc comment for node
   */
  private getJSDoc(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    const fullText = sourceFile.getFullText();
    const commentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart());

    if (!commentRanges || commentRanges.length === 0) {
      return null;
    }

    const lastComment = commentRanges[commentRanges.length - 1];
    return fullText.substring(lastComment.pos, lastComment.end);
  }

  /**
   * Generate endpoint ID
   */
  private generateEndpointId(method: HTTPMethod, path: string): string {
    const normalized = path
      .toLowerCase()
      .replace(/[/:]/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `endpoint-${method.toLowerCase()}${normalized}`;
  }
}
