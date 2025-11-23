#!/usr/bin/env node
/**
 * TSDoc Edge MCP Server
 *
 * Provides LLM access to codebase knowledge graph through Model Context Protocol
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TsDocService } from './services/tsdocService.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';

// Import tool schemas
import {
  SearchSymbolsSchema,
  GetOntologyStatsSchema,
  ListRelationshipsSchema,
  GetWorkContextSchema,
  GetDesignContextSchema,
  QueryRelationshipsSchema,
  GetSymbolDetailsSchema,
} from './schemas/index.js';

// Import tool implementations
import {
  searchSymbolsTool,
  getOntologyStatsTool,
  listRelationshipsTool,
  getWorkContextTool,
  getDesignContextTool,
  queryRelationshipsTool,
  getSymbolDetailsTool,
} from './tools/index.js';

async function main() {
  // Initialize TSDoc service
  const workspaceRoot = process.env.TSDOC_WORKSPACE || process.cwd();
  const tsdocService = new TsDocService(workspaceRoot);

  // Check if database is available
  if (!tsdocService.isDatabaseAvailable()) {
    console.error('Error: TSDoc Edge database not found.');
    console.error('Please run `tsdoc-edge build src` in your project directory first.');
    process.exit(1);
  }

  // Create MCP server
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register tools

  // 1. Search Symbols Tool
  server.registerTool(
    'tsdoc_search_symbols',
    {
      title: 'Search Symbols',
      description: 'Search for code symbols (classes, functions, methods, etc.) in the codebase',
      inputSchema: SearchSymbolsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: unknown) => searchSymbolsTool(SearchSymbolsSchema.parse(params), tsdocService)
  );

  // 2. Get Ontology Stats Tool
  server.registerTool(
    'tsdoc_get_ontology_stats',
    {
      title: 'Get Ontology Statistics',
      description: 'Get comprehensive statistics about the codebase knowledge graph structure',
      inputSchema: GetOntologyStatsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: unknown) => getOntologyStatsTool(GetOntologyStatsSchema.parse(params), tsdocService)
  );

  // 3. List Relationships Tool
  server.registerTool(
    'tsdoc_list_relationships',
    {
      title: 'List Relationships',
      description: 'List relationships between code symbols with filtering and pagination',
      inputSchema: ListRelationshipsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: unknown) => listRelationshipsTool(ListRelationshipsSchema.parse(params), tsdocService)
  );

  // 4. Get Work Context Tool
  server.registerTool(
    'tsdoc_get_work_context',
    {
      title: 'Get Work Context',
      description: 'Get comprehensive work context for a file including relationships, tests, and documentation',
      inputSchema: GetWorkContextSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: unknown) => getWorkContextTool(GetWorkContextSchema.parse(params), tsdocService)
  );

  // 5. Get Design Context Tool
  server.registerTool(
    'tsdoc_get_design_context',
    {
      title: 'Get Design Context',
      description: 'Get design decisions, contracts, and error patterns for a file',
      inputSchema: GetDesignContextSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: unknown) => getDesignContextTool(GetDesignContextSchema.parse(params), tsdocService)
  );

  // 6. Query Relationships Tool
  server.registerTool(
    'tsdoc_query_relationships',
    {
      title: 'Query Symbol Relationships',
      description: 'Query all relationships for a specific symbol with depth control',
      inputSchema: QueryRelationshipsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: unknown) => queryRelationshipsTool(QueryRelationshipsSchema.parse(params), tsdocService)
  );

  // 7. Get Symbol Details Tool
  server.registerTool(
    'tsdoc_get_symbol_details',
    {
      title: 'Get Symbol Details',
      description: 'Get detailed information about a specific symbol',
      inputSchema: GetSymbolDetailsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: unknown) => getSymbolDetailsTool(GetSymbolDetailsSchema.parse(params), tsdocService)
  );

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('TSDoc Edge MCP Server running on stdio');
  console.error(`Workspace: ${workspaceRoot}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
