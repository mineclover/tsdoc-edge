/**
 * Constants for TSDoc Edge MCP Server
 *
 * @packageDocumentation
 * @doc [[MCP Integration]]
 * @context Shared server identity, pagination limits, ontology vocabularies, and error message templates for the MCP server
 * @functionality Exports protocol constants, relationship/symbol enums, and user-facing diagnostic strings
 */

/**
 * Canonical MCP server identifier registered during handshake.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const SERVER_NAME = 'tsdoc-edge-mcp-server';

/**
 * Semantic version of the TSDoc Edge MCP server.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const SERVER_VERSION = '1.0.0';

/**
 * Maximum character threshold before MCP tool text responses are truncated.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const CHARACTER_LIMIT = 25000;

/**
 * Default page size for paginated MCP queries.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum permitted page size for paginated MCP queries.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const MAX_LIMIT = 100;

/**
 * Supported ontology relationship categories exposed to MCP clients.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const RELATIONSHIP_CATEGORIES = [
  'structural',
  'data-flow',
  'behavioral',
  'alternative',
  'constraint',
  'semantic',
  'verification',
  'testing',
  'type-system',
  'architectural',
  'quality',
] as const;

/**
 * Supported relationship strength tiers.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const RELATIONSHIP_STRENGTHS = ['strong', 'medium', 'weak'] as const;

/**
 * Supported relationship directionality modes.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const RELATIONSHIP_DIRECTIONS = ['unidirectional', 'bidirectional', 'undirected'] as const;

/**
 * Supported code and test symbol categories filterable via MCP search tools.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const SYMBOL_TYPES = [
  'class',
  'interface',
  'type',
  'function',
  'method',
  'property',
  'variable',
  'test-suite',
  'test-case',
  'test-scenario',
] as const;

/**
 * Standardized diagnostic error strings returned by MCP services and tools.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const ERROR_MESSAGES = {
  DATABASE_NOT_FOUND:
    'TSDoc Edge database not found. Please run `tsdoc-edge build src` in your project directory first.',
  SYMBOL_NOT_FOUND: 'Symbol not found in database.',
  INVALID_PATH: 'Invalid file path provided.',
  INVALID_LIMIT: 'Limit must be between 1 and 100.',
  INVALID_OFFSET: 'Offset must be non-negative.',
  INVALID_FORMAT: 'Format must be either "markdown" or "json".',
  QUERY_FAILED: 'Database query failed. Please check your input parameters.',
} as const;
