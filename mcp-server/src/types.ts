/**
 * Type definitions for TSDoc Edge MCP Server
 *
 * @packageDocumentation
 * @doc [[MCP Integration]]
 * @context Domain DTOs shared across `TsDocService` SQLite queries and MCP tool response formatters
 * @functionality Defines symbol, relationship, ontology statistics, work context, workspace configuration, and multi-hop impact types
 */

/**
 * Code or documentation symbol returned by MCP queries.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export interface Symbol {
  id: string;
  name: string;
  type: string;
  kind?: string;
  filePath?: string;
  line?: number;
  isExported?: boolean;
  isPublic?: boolean;
  canonicalId?: string;
  external?: boolean;
}

/**
 * Directed or undirected semantic/structural edge between symbols.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export interface Relationship {
  id: string;
  type: string;
  category: string;
  direction: 'unidirectional' | 'bidirectional' | 'undirected';
  strength: 'strong' | 'medium' | 'weak';
  from: string | string[];
  to: string | string[];
  confidence: number;
  description?: string;
  properties?: Record<string, unknown>;
}

/**
 * Aggregate node, relationship, and graph-density statistics for the knowledge graph.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export interface OntologyStats {
  nodes: {
    total: number;
    byType: Record<string, number>;
    byKind: Record<string, number>;
  };
  relationships: {
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byStrength: Record<string, number>;
    byDirection: Record<string, number>;
    explicit: number;
    inferred: number;
  };
  metrics: {
    density: number;
    avgDegree: number;
    maxDegree: number;
    coverage: number;
  };
}

/**
 * Aggregated file, symbol, or document work context payload.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export interface WorkContext {
  entryPoint: string;
  entryPointType: 'file' | 'symbol' | 'document';
  symbols: Symbol[];
  relationships: Relationship[];
  summary: {
    symbolCount: number;
    relationshipCount: number;
    density: number;
    testCoverage: number;
    documentationCoverage: number;
  };
  recommendations: string[];
}

/**
 * Resolved workspace and SQLite database paths for the MCP server.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export interface TsDocConfig {
  rootDir: string;
  dbPath: string;
  managedDir: string;
}

/**
 * One symbol reached during impact traversal.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export interface ImpactNode {
  symbolId: string;
  depth: number;
  path: string[];
  relationshipType: string;
  direction: 'downstream' | 'upstream';
  external?: boolean;
}

/**
 * Structured multi-hop impact analysis result.
 *
 * @doc [[MCP Integration]]
 * @public
 */
export interface ImpactResult {
  symbolId: string;
  direction: 'downstream' | 'upstream' | 'both';
  maxDepth: number;
  impactedSymbols: ImpactNode[];
  byDepth: Record<string, ImpactNode[]>;
  riskLevel: 'Low' | 'Medium' | 'High';
  source: 'canonical' | 'legacy' | 'combined';
}
