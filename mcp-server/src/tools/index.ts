/**
 * MCP Tool implementations for TSDoc Edge
 *
 * @packageDocumentation
 * @doc [[MCP Integration]]
 * @context Request handlers formatting `TsDocService` query outputs into Markdown or structured JSON MCP tool responses with character-limit truncation
 * @functionality Implements all 9 read-only MCP tool handlers (`searchSymbolsTool`, `getOntologyStatsTool`, `listRelationshipsTool`, `getWorkContextTool`, `getDesignContextTool`, `queryRelationshipsTool`, `getImpactTool`, `getSpecBindingsTool`, `getSymbolDetailsTool`)
 */

import { CHARACTER_LIMIT } from '../constants.js';
import type {
  GetDesignContextInput,
  GetImpactInput,
  GetOntologyStatsInput,
  GetSpecBindingsInput,
  GetSymbolDetailsInput,
  GetWorkContextInput,
  ListRelationshipsInput,
  QueryRelationshipsInput,
  SearchSymbolsInput,
  TraceDataInput,
} from '../schemas/index.js';
import type { TsDocService } from '../services/tsdocService.js';

/**
 * Deterministically compact or trim a JSON object/value so that the serialized
 * string never exceeds `limit` characters while remaining 100% valid JSON.
 */
function fitJsonWithinLimit(
  rawJson: string,
  limit: number
): { text: string; structured: Record<string, unknown>; truncated: boolean } {
  const parsed: unknown = JSON.parse(rawJson);
  const asRecord =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { data: parsed };

  if (rawJson.length <= limit) {
    return { text: rawJson, structured: asRecord, truncated: false };
  }

  const compact = JSON.stringify(parsed);
  if (compact.length <= limit) {
    return { text: compact, structured: asRecord, truncated: false };
  }

  // Progressively trim top-level array fields while preserving schema keys
  const working: Record<string, unknown> = {
    ...asRecord,
    truncated: true,
    originalLength: rawJson.length,
  };
  const arrayKeys = Object.keys(working).filter((key) => Array.isArray(working[key]));

  while (JSON.stringify(working).length > limit && arrayKeys.length > 0) {
    let trimmedAny = false;
    for (const key of arrayKeys) {
      const current = working[key];
      if (Array.isArray(current) && current.length > 0) {
        const nextLen = current.length > 4 ? Math.floor(current.length / 2) : current.length - 1;
        working[key] = current.slice(0, nextLen);
        trimmedAny = true;
      }
    }
    if (!trimmedAny) {
      break;
    }
  }

  const serialized = JSON.stringify(working);
  if (serialized.length <= limit) {
    return { text: serialized, structured: working, truncated: true };
  }

  const fallback: Record<string, unknown> = {
    truncated: true,
    originalLength: rawJson.length,
    message: 'JSON payload exceeded character limit after array trimming; narrow query filters.',
  };
  return { text: JSON.stringify(fallback), structured: fallback, truncated: true };
}

/**
 * Format response with truncation if needed.
 * JSON responses are compacted or array-trimmed rather than substring-sliced
 * so `content[0].text` is always valid JSON.
 */
function formatResponse(content: string, format: 'markdown' | 'json') {
  if (format === 'json') {
    const fitted = fitJsonWithinLimit(content, CHARACTER_LIMIT);
    return {
      content: [{ type: 'text' as const, text: fitted.text }],
      structuredContent: fitted.structured,
      ...(fitted.truncated
        ? { isError: false, _meta: { truncated: true, originalLength: content.length } }
        : {}),
    };
  }

  const truncated = content.length > CHARACTER_LIMIT;
  const displayContent = truncated
    ? `${content.substring(0, CHARACTER_LIMIT)}\n\n[Response truncated due to size limit]`
    : content;

  return {
    content: [{ type: 'text' as const, text: displayContent }],
    ...(truncated
      ? { isError: false, _meta: { truncated: true, originalLength: content.length } }
      : {}),
  };
}

/**
 * Search for symbols in the codebase
 *
 * @doc [[MCP Integration]]
 * @public
 */
export async function searchSymbolsTool(params: SearchSymbolsInput, service: TsDocService) {
  try {
    const result = await service.searchSymbols({
      query: params.query,
      type: params.type,
      limit: params.limit,
      offset: params.offset,
      includeExternal: params.includeExternal,
    });

    if (params.format === 'json') {
      return formatResponse(JSON.stringify(result, null, 2), 'json');
    }

    // Markdown format
    let markdown = `# Symbol Search Results\n\n`;
    markdown += `Query: "${params.query}"\n`;
    markdown += `Total: ${result.total} symbols\n`;
    markdown += `Showing: ${result.nodes.length} (offset: ${params.offset})\n\n`;

    if (result.nodes.length === 0) {
      markdown += `No symbols found matching your query.\n`;
    } else {
      for (const node of result.nodes) {
        markdown += `## ${node.name}\n`;
        markdown += `- **ID**: \`${node.id}\`\n`;
        markdown += `- **Type**: ${node.type}\n`;
        if (node.kind) markdown += `- **Kind**: ${node.kind}\n`;
        if (node.filePath)
          markdown += `- **Location**: ${node.filePath}${node.line ? `:${node.line}` : ''}\n`;
        if (node.isExported) markdown += `- **Exported**: Yes\n`;
        if (node.isPublic) markdown += `- **Public**: Yes\n`;
        markdown += `\n`;
      }

      if (result.total > params.offset + result.nodes.length) {
        const nextOffset = params.offset + params.limit;
        markdown += `\n*More results available. Use offset=${nextOffset} to see next page.*\n`;
      }
    }

    return formatResponse(markdown, 'markdown');
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get ontology statistics
 *
 * @doc [[MCP Integration]]
 * @public
 */
export async function getOntologyStatsTool(params: GetOntologyStatsInput, service: TsDocService) {
  try {
    const stats = await service.getOntologyStats(params.detailed, params.includeExternal);

    if (params.format === 'json') {
      return formatResponse(JSON.stringify(stats, null, 2), 'json');
    }

    // Markdown format
    let markdown = `# Ontology Model Statistics\n\n`;
    markdown += `## Graph Overview\n\n`;
    markdown += `- **Total Nodes**: ${stats.nodes.total.toLocaleString()}\n`;
    markdown += `- **Total Relationships**: ${stats.relationships.total.toLocaleString()}\n`;
    markdown += `- **Graph Density**: ${stats.metrics.density.toFixed(2)} (relationships/node)\n`;
    markdown += `- **Average Degree**: ${stats.metrics.avgDegree.toFixed(2)}\n`;
    markdown += `- **Maximum Degree**: ${stats.metrics.maxDegree}\n`;
    markdown += `- **Coverage**: ${stats.metrics.coverage.toFixed(1)}% (nodes with ≥1 relationship)\n\n`;

    markdown += `## Relationship Composition\n\n`;
    markdown += `- **Explicit**: ${stats.relationships.explicit.toLocaleString()} (${((stats.relationships.explicit / stats.relationships.total) * 100).toFixed(1)}%)\n`;
    markdown += `- **Inferred**: ${stats.relationships.inferred.toLocaleString()} (${((stats.relationships.inferred / stats.relationships.total) * 100).toFixed(1)}%)\n\n`;

    markdown += `## Top Node Types\n\n`;
    const topNodes = Object.entries(stats.nodes.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [type, count] of topNodes) {
      const pct = ((count / stats.nodes.total) * 100).toFixed(1);
      markdown += `- **${type}**: ${count.toLocaleString()} (${pct}%)\n`;
    }

    markdown += `\n## Top Relationship Types\n\n`;
    const topRels = Object.entries(stats.relationships.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [type, count] of topRels) {
      const pct = ((count / stats.relationships.total) * 100).toFixed(1);
      markdown += `- **${type}**: ${count.toLocaleString()} (${pct}%)\n`;
    }

    return formatResponse(markdown, 'markdown');
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * List relationships
 *
 * @doc [[MCP Integration]]
 * @public
 */
export async function listRelationshipsTool(params: ListRelationshipsInput, service: TsDocService) {
  try {
    const result = await service.listRelationships({
      type: params.type,
      category: params.category,
      strength: params.strength,
      from: params.from,
      to: params.to,
      limit: params.limit,
      offset: params.offset,
      includeExternal: params.includeExternal,
    });

    if (params.format === 'json') {
      return formatResponse(JSON.stringify(result, null, 2), 'json');
    }

    // Markdown format
    let markdown = `# Relationships\n\n`;
    if (params.type) markdown += `Type: ${params.type}\n`;
    if (params.category) markdown += `Category: ${params.category}\n`;
    if (params.strength) markdown += `Strength: ${params.strength}\n`;
    markdown += `\nTotal: ${result.total}\n`;
    markdown += `Showing: ${result.relationships.length} (offset: ${params.offset})\n\n`;

    for (const rel of result.relationships) {
      const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
      const tos = Array.isArray(rel.to) ? rel.to : [rel.to];

      markdown += `## ${rel.type}\n`;
      markdown += `- **ID**: \`${rel.id}\`\n`;
      markdown += `- **Category**: ${rel.category}\n`;
      markdown += `- **Strength**: ${rel.strength}\n`;
      markdown += `- **Direction**: ${rel.direction}\n`;
      markdown += `- **From**: ${froms.join(', ')}\n`;
      markdown += `- **To**: ${tos.join(', ')}\n`;
      markdown += `- **Confidence**: ${(rel.confidence * 100).toFixed(0)}%\n`;
      if (rel.description) markdown += `- **Description**: ${rel.description}\n`;
      if (rel.properties?.inferred) markdown += `- **Inferred**: Yes\n`;
      markdown += `\n`;
    }

    if (result.total > params.offset + result.relationships.length) {
      const nextOffset = params.offset + params.limit;
      markdown += `\n*More results available. Use offset=${nextOffset} to see next page.*\n`;
    }

    return formatResponse(markdown, 'markdown');
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get work context for a file
 *
 * @doc [[MCP Integration]]
 * @public
 */
export async function getWorkContextTool(params: GetWorkContextInput, service: TsDocService) {
  try {
    const context = await service.getWorkContext(
      params.filePath,
      params.depth,
      params.includeExternal
    );
    return formatResponse(context, params.format);
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get design context for a file
 *
 * @doc [[MCP Integration]]
 * @public
 */
export async function getDesignContextTool(params: GetDesignContextInput, service: TsDocService) {
  try {
    const context = await service.getDesignContext(params.filePath, params.includeExternal);
    return formatResponse(context, params.format);
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Query relationships for a specific symbol
 *
 * @doc [[MCP Integration]]
 * @public
 */
export async function queryRelationshipsTool(
  params: QueryRelationshipsInput,
  service: TsDocService
) {
  try {
    const result = await service.queryRelationships({
      symbolId: params.symbolId,
      direction: params.direction,
      maxDepth: params.maxDepth,
      includeExternal: params.includeExternal,
    });
    return formatResponse(result, params.format);
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get multi-hop change impact for a symbol.
 * @param params - Validated impact query options.
 * @param service - TSDoc database service.
 * @returns MCP-formatted impact response.
 * @doc [[MCP Integration]]
 * @public
 */
export async function getImpactTool(params: GetImpactInput, service: TsDocService) {
  try {
    const result = await service.getImpact(params);
    const outputFormat = params.format ?? params.response_format ?? 'markdown';
    if (outputFormat === 'json') return formatResponse(JSON.stringify(result, null, 2), 'json');
    let markdown = `# Impact Analysis\n\n- **Symbol**: \`${result.symbolId}\`\n- **Direction**: ${result.direction}\n- **Maximum depth**: ${result.maxDepth}\n- **Risk**: ${result.riskLevel}\n- **Source**: ${result.source}\n\n`;
    for (const [depth, nodes] of Object.entries(result.byDepth)) {
      markdown += `## Depth ${depth}\n\n`;
      for (const node of nodes)
        markdown += `- \`${node.symbolId}\` via **${node.relationshipType}** (${node.direction})\n`;
      markdown += '\n';
    }
    if (result.impactedSymbols.length === 0) markdown += 'No impacted symbols found.\n';
    return formatResponse(markdown, 'markdown');
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Query normative specification nodes and conformance bindings.
 * @param params - Validated specification filters.
 * @param service - TSDoc database service.
 * @returns MCP-formatted specification response.
 * @doc [[MCP Integration]]
 * @public
 */
export async function getSpecBindingsTool(params: GetSpecBindingsInput, service: TsDocService) {
  try {
    const result = await service.getSpecBindings(params);
    const outputFormat = params.format ?? params.response_format ?? 'markdown';
    if (outputFormat === 'json') return formatResponse(JSON.stringify(result, null, 2), 'json');
    let markdown = `# Specification Bindings\n\nRevision: \`${result.revisionId ?? 'unavailable'}\`\n\n`;
    markdown += `Found ${result.nodes.length} specification nodes and ${result.bindings.length} bindings.\n\n`;
    for (const node of result.nodes)
      markdown += `## ${String(node.title)}\n- **ID**: \`${String(node.id)}\`\n- **Kind**: ${String(node.kind)}\n\n`;
    if (result.bindings.length > 0) {
      markdown += '## Code Conformance\n\n';
      for (const binding of result.bindings)
        markdown += `- **${String(binding.kind)}** \`${String(binding.specNodeId)}\`: ${JSON.stringify(binding.target ?? {})}\n`;
    }
    return formatResponse(markdown, 'markdown');
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get symbol details
 *
 * @doc [[MCP Integration]]
 * @public
 */
export async function getSymbolDetailsTool(params: GetSymbolDetailsInput, service: TsDocService) {
  try {
    const symbol = await service.getSymbolDetails(params.symbolId, params.includeExternal);

    if (!symbol) {
      return {
        content: [{ type: 'text' as const, text: `Symbol not found: ${params.symbolId}` }],
        isError: false,
      };
    }

    if (params.format === 'json') {
      return formatResponse(JSON.stringify(symbol, null, 2), 'json');
    }

    // Markdown format
    let markdown = `# Symbol Details\n\n`;
    markdown += `## ${symbol.name}\n\n`;
    markdown += `- **ID**: \`${symbol.id}\`\n`;
    markdown += `- **Type**: ${symbol.type}\n`;
    if (symbol.kind) markdown += `- **Kind**: ${symbol.kind}\n`;
    if (symbol.filePath)
      markdown += `- **Location**: ${symbol.filePath}${symbol.line ? `:${symbol.line}` : ''}\n`;
    if (symbol.isExported) markdown += `- **Exported**: Yes\n`;
    if (symbol.isPublic) markdown += `- **Public**: Yes\n`;

    if (params.includeRelationships) {
      markdown += `\n*Use tsdoc_query_relationships to see all relationships for this symbol.*\n`;
    }

    return formatResponse(markdown, 'markdown');
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute a 3-Tier Data Trace query (Type/Field Flow, Cross-Boundary Domain Lineage, and AST Dataflow Slice).
 *
 * @param params - Validated data trace arguments
 * @param service - TSDoc database service
 * @returns MCP-formatted 3-Tier Data Trace response
 * @doc [[MCP Integration]]
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export async function traceDataTool(params: TraceDataInput, service: TsDocService) {
  try {
    const { report, markdown } = await service.traceData({
      target: params.target,
      toTarget: params.toTarget,
      tier: params.tier,
      maxDepth: params.maxDepth,
      includeTests: params.includeTests,
      includeExternal: params.includeExternal,
    });
    const outputFormat = params.format ?? params.response_format ?? 'markdown';
    if (outputFormat === 'json') {
      return formatResponse(JSON.stringify(report, null, 2), 'json');
    }
    return formatResponse(markdown, 'markdown');
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
