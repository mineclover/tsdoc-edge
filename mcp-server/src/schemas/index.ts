/**
 * Zod schemas for MCP tool input validation
 */

import { z } from 'zod';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  RELATIONSHIP_CATEGORIES,
  RELATIONSHIP_STRENGTHS,
  SYMBOL_TYPES,
} from '../constants.js';

// Search symbols schema
export const SearchSymbolsSchema = z.object({
  query: z.string().min(1).max(200).describe('Search query for symbol names'),
  type: z.enum(SYMBOL_TYPES).optional().describe('Filter by symbol type'),
  limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
    .describe('Maximum number of results to return'),
  offset: z.number().int().min(0).default(0)
    .describe('Number of results to skip for pagination'),
  format: z.enum(['markdown', 'json']).default('markdown')
    .describe('Response format'),
}).strict();

export type SearchSymbolsInput = z.infer<typeof SearchSymbolsSchema>;

// Get ontology stats schema
export const GetOntologyStatsSchema = z.object({
  detailed: z.boolean().default(false)
    .describe('Include detailed breakdown of all types'),
  format: z.enum(['markdown', 'json']).default('markdown')
    .describe('Response format'),
}).strict();

export type GetOntologyStatsInput = z.infer<typeof GetOntologyStatsSchema>;

// List relationships schema
export const ListRelationshipsSchema = z.object({
  type: z.string().optional().describe('Filter by relationship type'),
  category: z.enum(RELATIONSHIP_CATEGORIES).optional()
    .describe('Filter by relationship category'),
  strength: z.enum(RELATIONSHIP_STRENGTHS).optional()
    .describe('Filter by relationship strength'),
  from: z.string().optional().describe('Filter by source symbol ID'),
  to: z.string().optional().describe('Filter by target symbol ID'),
  limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
    .describe('Maximum number of results to return'),
  offset: z.number().int().min(0).default(0)
    .describe('Number of results to skip for pagination'),
  format: z.enum(['markdown', 'json']).default('markdown')
    .describe('Response format'),
}).strict();

export type ListRelationshipsInput = z.infer<typeof ListRelationshipsSchema>;

// Get work context schema
export const GetWorkContextSchema = z.object({
  filePath: z.string().min(1).max(500)
    .describe('Relative or absolute path to the file'),
  depth: z.number().int().min(1).max(5).default(2)
    .describe('Depth of context aggregation (1-5)'),
  format: z.enum(['markdown', 'json']).default('markdown')
    .describe('Response format'),
}).strict();

export type GetWorkContextInput = z.infer<typeof GetWorkContextSchema>;

// Get design context schema
export const GetDesignContextSchema = z.object({
  filePath: z.string().min(1).max(500)
    .describe('Relative or absolute path to the file'),
  format: z.enum(['markdown', 'json']).default('markdown')
    .describe('Response format'),
}).strict();

export type GetDesignContextInput = z.infer<typeof GetDesignContextSchema>;

// Query relationships schema
export const QueryRelationshipsSchema = z.object({
  symbolId: z.string().min(1).max(200).describe('Symbol ID to query relationships for'),
  direction: z.enum(['incoming', 'outgoing', 'both']).default('both')
    .describe('Direction of relationships to include'),
  maxDepth: z.number().int().min(1).max(3).default(1)
    .describe('Maximum depth to traverse (1-3)'),
  format: z.enum(['markdown', 'json']).default('markdown')
    .describe('Response format'),
}).strict();

export type QueryRelationshipsInput = z.infer<typeof QueryRelationshipsSchema>;

// Get symbol details schema
export const GetSymbolDetailsSchema = z.object({
  symbolId: z.string().min(1).max(200).describe('Symbol ID to retrieve details for'),
  includeRelationships: z.boolean().default(true)
    .describe('Include relationship information'),
  format: z.enum(['markdown', 'json']).default('markdown')
    .describe('Response format'),
}).strict();

export type GetSymbolDetailsInput = z.infer<typeof GetSymbolDetailsSchema>;
