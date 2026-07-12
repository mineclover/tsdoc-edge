/**
 * Type definitions for TSDoc Edge MCP Server
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
}

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

export interface TsDocConfig {
  rootDir: string;
  dbPath: string;
  managedDir: string;
}
