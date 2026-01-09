/**
 * Endpoint detection types
 * @packageDocumentation
 */

/**
 * HTTP method types
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Endpoint scope (visibility/access level)
 */
export enum EndpointScope {
  /** External public API */
  PUBLIC = 'public',
  /** Internal services only */
  INTERNAL = 'internal',
  /** Same module only */
  PRIVATE = 'private',
  /** Admin/privileged access */
  ADMIN = 'admin',
}

/**
 * HTTP endpoint representation
 */
export interface HTTPEndpoint {
  /** Unique endpoint ID (e.g., endpoint-get-api-users-id) */
  id: string;

  /** HTTP method */
  method: HTTPMethod;

  /** Route path (e.g., /api/users/:id) */
  path: string;

  /** Path parameters extracted from route (e.g., ["id"]) */
  pathParams: string[];

  /** Query parameters (e.g., ["limit", "offset"]) */
  queryParams?: string[];

  /** Handler function symbol ID */
  handlerSymbolId: string;

  /** Controller class symbol ID (if applicable) */
  controllerSymbolId?: string;

  /** Request DTO type name */
  requestType?: string;

  /** Response DTO type name */
  responseType?: string;

  /** Endpoint visibility scope */
  scope: EndpointScope;

  /** Middleware symbol IDs applied to this endpoint */
  middlewares: string[];

  /** File where route is defined */
  filePath: string;

  /** Line number where route is defined */
  line: number;

  /** Optional description */
  description?: string;
}

/**
 * Detected endpoint with metadata
 */
export interface DetectedEndpoint extends HTTPEndpoint {
  /** Framework used (express, fastify, hono, etc.) */
  framework: string;

  /** Confidence level of detection (0-1) */
  confidence: number;

  /** Route pattern (raw framework-specific pattern) */
  routePattern?: string;
}

/**
 * Framework-specific route pattern
 */
export interface RoutePattern {
  /** Framework name */
  framework: 'express' | 'fastify' | 'hono' | 'koa' | 'custom';

  /** Original pattern string */
  pattern: string;

  /** Extracted HTTP method */
  method: HTTPMethod;

  /** Normalized path */
  normalizedPath: string;

  /** Handler node in AST */
  handlerNode: unknown; // ts.Node
}
