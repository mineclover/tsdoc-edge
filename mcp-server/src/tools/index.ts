/**
 * MCP Tool implementations for TSDoc Edge
 */

import type { TsDocService } from '../services/tsdocService.js';
import type {
  SearchSymbolsInput,
  GetOntologyStatsInput,
  ListRelationshipsInput,
  GetWorkContextInput,
  GetDesignContextInput,
  QueryRelationshipsInput,
  GetSymbolDetailsInput,
} from '../schemas/index.js';
import { CHARACTER_LIMIT } from '../constants.js';

/**
 * Format response with truncation if needed
 */
function formatResponse(content: string, format: 'markdown' | 'json') {
  const truncated = content.length > CHARACTER_LIMIT;
  const displayContent = truncated
    ? content.substring(0, CHARACTER_LIMIT) + '\n\n[Response truncated due to size limit]'
    : content;

  return {
    content: [{ type: 'text' as const, text: displayContent }],
    ...(format === 'json' && !truncated ? { structuredContent: JSON.parse(content) } : {}),
    ...(truncated ? { isError: false, _meta: { truncated: true, originalLength: content.length } } : {}),
  };
}

/**
 * Search for symbols in the codebase
 */
export async function searchSymbolsTool(
  params: SearchSymbolsInput,
  service: TsDocService
) {
  try {
    const result = await service.searchSymbols({
      query: params.query,
      type: params.type,
      limit: params.limit,
      offset: params.offset,
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
        if (node.filePath) markdown += `- **Location**: ${node.filePath}${node.line ? `:${node.line}` : ''}\n`;
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
      content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
}

/**
 * Get ontology statistics
 */
export async function getOntologyStatsTool(
  params: GetOntologyStatsInput,
  service: TsDocService
) {
  try {
    const stats = await service.getOntologyStats(params.detailed);

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
      content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
}

/**
 * List relationships
 */
export async function listRelationshipsTool(
  params: ListRelationshipsInput,
  service: TsDocService
) {
  try {
    const result = await service.listRelationships({
      type: params.type,
      category: params.category,
      strength: params.strength,
      from: params.from,
      to: params.to,
      limit: params.limit,
      offset: params.offset,
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
      content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
}

/**
 * Get work context for a file
 */
export async function getWorkContextTool(
  params: GetWorkContextInput,
  service: TsDocService
) {
  try {
    const context = await service.getWorkContext(params.filePath, params.depth);
    return formatResponse(context, params.format);
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
}

/**
 * Get design context for a file
 */
export async function getDesignContextTool(
  params: GetDesignContextInput,
  service: TsDocService
) {
  try {
    const context = await service.getDesignContext(params.filePath);
    return formatResponse(context, params.format);
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
}

/**
 * Query relationships for a specific symbol
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
    });
    return formatResponse(result, params.format);
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
}

/**
 * Get symbol details
 */
export async function getSymbolDetailsTool(
  params: GetSymbolDetailsInput,
  service: TsDocService
) {
  try {
    const symbol = await service.getSymbolDetails(params.symbolId);

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
    if (symbol.filePath) markdown += `- **Location**: ${symbol.filePath}${symbol.line ? `:${symbol.line}` : ''}\n`;
    if (symbol.isExported) markdown += `- **Exported**: Yes\n`;
    if (symbol.isPublic) markdown += `- **Public**: Yes\n`;

    if (params.includeRelationships) {
      markdown += `\n*Use tsdoc_query_relationships to see all relationships for this symbol.*\n`;
    }

    return formatResponse(markdown, 'markdown');
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
}
