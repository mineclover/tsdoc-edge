/**
 * Constants for TSDoc Edge MCP Server
 */

export const SERVER_NAME = 'tsdoc-edge-mcp-server';
export const SERVER_VERSION = '1.0.0';

export const CHARACTER_LIMIT = 25000;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

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

export const RELATIONSHIP_STRENGTHS = ['strong', 'medium', 'weak'] as const;

export const RELATIONSHIP_DIRECTIONS = [
  'unidirectional',
  'bidirectional',
  'undirected',
] as const;

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

export const ERROR_MESSAGES = {
  DATABASE_NOT_FOUND: 'TSDoc Edge database not found. Please run `tsdoc-edge build src` in your project directory first.',
  SYMBOL_NOT_FOUND: 'Symbol not found in database.',
  INVALID_PATH: 'Invalid file path provided.',
  INVALID_LIMIT: 'Limit must be between 1 and 100.',
  INVALID_OFFSET: 'Offset must be non-negative.',
  INVALID_FORMAT: 'Format must be either "markdown" or "json".',
  QUERY_FAILED: 'Database query failed. Please check your input parameters.',
} as const;
