/**
 * Zod schemas for MCP tool input validation
 *
 * @packageDocumentation
 * @doc [[MCP Integration]]
 * @context Strict Zod input contracts validating arguments for all 9 `tsdoc-edge` MCP tools
 * @functionality Exports runtime Zod object schemas and inferred TypeScript input types for symbol, ontology, relationship, context, impact, and spec-binding tools
 */

import { z } from 'zod';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  RELATIONSHIP_CATEGORIES,
  RELATIONSHIP_STRENGTHS,
  SYMBOL_TYPES,
} from '../constants.js';

/**
 * Input schema for `tsdoc_search_symbols`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const SearchSymbolsSchema = z
  .object({
    query: z.string().min(1).max(200).describe('Search query for symbol names'),
    type: z.enum(SYMBOL_TYPES).optional().describe('Filter by symbol type'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .default(DEFAULT_LIMIT)
      .describe('Maximum number of results to return'),
    offset: z.number().int().min(0).default(0).describe('Number of results to skip for pagination'),
    format: z.enum(['markdown', 'json']).default('markdown').describe('Response format'),
    includeExternal: z
      .boolean()
      .default(false)
      .describe('Include external and standard library symbols'),
  })
  .strict();

/**
 * Inferred input payload for `tsdoc_search_symbols`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export type SearchSymbolsInput = z.infer<typeof SearchSymbolsSchema>;

/**
 * Input schema for `tsdoc_get_ontology_stats`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const GetOntologyStatsSchema = z
  .object({
    detailed: z.boolean().default(false).describe('Include detailed breakdown of all types'),
    format: z.enum(['markdown', 'json']).default('markdown').describe('Response format'),
    includeExternal: z
      .boolean()
      .default(false)
      .describe('Include external and standard library nodes'),
  })
  .strict();

/**
 * Inferred input payload for `tsdoc_get_ontology_stats`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export type GetOntologyStatsInput = z.infer<typeof GetOntologyStatsSchema>;

/**
 * Input schema for `tsdoc_list_relationships`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const ListRelationshipsSchema = z
  .object({
    type: z.string().optional().describe('Filter by relationship type'),
    category: z
      .enum(RELATIONSHIP_CATEGORIES)
      .optional()
      .describe('Filter by relationship category'),
    strength: z.enum(RELATIONSHIP_STRENGTHS).optional().describe('Filter by relationship strength'),
    from: z.string().optional().describe('Filter by source symbol ID'),
    to: z.string().optional().describe('Filter by target symbol ID'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .default(DEFAULT_LIMIT)
      .describe('Maximum number of results to return'),
    offset: z.number().int().min(0).default(0).describe('Number of results to skip for pagination'),
    format: z.enum(['markdown', 'json']).default('markdown').describe('Response format'),
    includeExternal: z
      .boolean()
      .default(false)
      .describe('Include external and standard library relationships'),
  })
  .strict();

/**
 * Inferred input payload for `tsdoc_list_relationships`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export type ListRelationshipsInput = z.infer<typeof ListRelationshipsSchema>;

/**
 * Input schema for `tsdoc_get_work_context`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const GetWorkContextSchema = z
  .object({
    filePath: z.string().min(1).max(500).describe('Relative or absolute path to the file'),
    depth: z.number().int().min(1).max(5).default(2).describe('Depth of context aggregation (1-5)'),
    format: z.enum(['markdown', 'json']).default('markdown').describe('Response format'),
    includeExternal: z
      .boolean()
      .default(false)
      .describe('Include external and standard library symbols'),
  })
  .strict();

/**
 * Inferred input payload for `tsdoc_get_work_context`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export type GetWorkContextInput = z.infer<typeof GetWorkContextSchema>;

/**
 * Input schema for `tsdoc_get_design_context`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const GetDesignContextSchema = z
  .object({
    filePath: z.string().min(1).max(500).describe('Relative or absolute path to the file'),
    format: z.enum(['markdown', 'json']).default('markdown').describe('Response format'),
    includeExternal: z
      .boolean()
      .default(false)
      .describe('Include external and standard library symbols'),
  })
  .strict();

/**
 * Inferred input payload for `tsdoc_get_design_context`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export type GetDesignContextInput = z.infer<typeof GetDesignContextSchema>;

/**
 * Input schema for `tsdoc_query_relationships`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const QueryRelationshipsSchema = z
  .object({
    symbolId: z.string().min(1).max(200).describe('Symbol ID to query relationships for'),
    direction: z
      .enum(['incoming', 'outgoing', 'both'])
      .default('both')
      .describe('Direction of relationships to include'),
    maxDepth: z.number().int().min(1).max(3).default(1).describe('Maximum depth to traverse (1-3)'),
    format: z.enum(['markdown', 'json']).default('markdown').describe('Response format'),
    includeExternal: z
      .boolean()
      .default(false)
      .describe('Include external and standard library relationships'),
  })
  .strict();

/**
 * Inferred input payload for `tsdoc_query_relationships`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export type QueryRelationshipsInput = z.infer<typeof QueryRelationshipsSchema>;

/**
 * Input schema for `tsdoc_get_symbol_details`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const GetSymbolDetailsSchema = z
  .object({
    symbolId: z.string().min(1).max(200).describe('Symbol ID to retrieve details for'),
    includeRelationships: z.boolean().default(true).describe('Include relationship information'),
    format: z.enum(['markdown', 'json']).default('markdown').describe('Response format'),
    includeExternal: z
      .boolean()
      .default(false)
      .describe('Include external and standard library symbols'),
  })
  .strict();

/**
 * Inferred input payload for `tsdoc_get_symbol_details`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export type GetSymbolDetailsInput = z.infer<typeof GetSymbolDetailsSchema>;

/**
 * Input schema for `tsdoc_get_impact`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const GetImpactSchema = z
  .object({
    symbol: z.string().min(1).max(300).describe('Canonical, legacy, or named symbol identifier'),
    direction: z.enum(['downstream', 'upstream', 'both']).default('downstream'),
    maxDepth: z.number().int().min(1).max(10).default(3),
    includeExternal: z.boolean().default(false),
    format: z.enum(['markdown', 'json']).optional().describe('Response format (default: markdown)'),
    response_format: z
      .enum(['markdown', 'json'])
      .optional()
      .describe('Backward-compatible alias for format'),
  })
  .strict();

/**
 * Inferred input payload for `tsdoc_get_impact`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export type GetImpactInput = z.infer<typeof GetImpactSchema>;

/**
 * Input schema for `tsdoc_get_spec_bindings`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export const GetSpecBindingsSchema = z
  .object({
    filePath: z.string().min(1).max(500).optional(),
    specId: z.string().min(1).max(300).optional(),
    query: z.string().min(1).max(300).optional(),
    format: z.enum(['markdown', 'json']).optional().describe('Response format (default: markdown)'),
    response_format: z
      .enum(['markdown', 'json'])
      .optional()
      .describe('Backward-compatible alias for format'),
  })
  .strict();

/**
 * Inferred input payload for `tsdoc_get_spec_bindings`.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export type GetSpecBindingsInput = z.infer<typeof GetSpecBindingsSchema>;
