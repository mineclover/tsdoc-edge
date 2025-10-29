/**
 * Symbol graph and connectivity types
 * @packageDocumentation
 */

import { ContractSpec, ResponsibilitySpec, SymbolRelationship, TestMapping } from './tags';

// Re-export types from tags that are used in graph
export type { SymbolRelationship, ContractSpec, TestMapping, ResponsibilitySpec };

/**
 * Represents a symbol in the codebase
 * @public
 */
export interface Symbol {
  /**
   * Unique identifier for the symbol
   */
  id: string;

  /**
   * Symbol name
   */
  name: string;

  /**
   * Symbol type (function, class, interface, etc.)
   */
  type: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'method' | 'property';

  /**
   * File path where symbol is defined
   */
  filePath: string;

  /**
   * Line number
   */
  line: number;

  /**
   * Column number
   */
  column: number;

  /**
   * Is this symbol exported?
   */
  isExported: boolean;

  /**
   * Is this a public API?
   */
  isPublic: boolean;

  /**
   * Symbol documentation summary
   */
  summary?: string;

  /**
   * Contract specification
   */
  contract?: ContractSpec;

  /**
   * Responsibility specification
   */
  responsibility?: ResponsibilitySpec;

  /**
   * Test mappings
   */
  tests: TestMapping[];

  /**
   * Related design decisions
   */
  designDecisions: string[];
}

/**
 * Symbol graph representing the entire codebase structure
 * @public
 */
export interface SymbolGraph {
  /**
   * All symbols indexed by ID
   */
  symbols: Map<string, Symbol>;

  /**
   * All relationships between symbols
   */
  relationships: SymbolRelationship[];

  /**
   * Index: symbol name -> symbol IDs
   */
  nameIndex: Map<string, string[]>;

  /**
   * Index: file path -> symbol IDs
   */
  fileIndex: Map<string, string[]>;

  /**
   * Adjacency list for quick relationship lookup
   */
  adjacencyList: Map<string, string[]>;

  /**
   * Reverse adjacency list (who depends on this symbol)
   */
  reverseAdjacencyList: Map<string, string[]>;
}

/**
 * Connectivity analysis result
 * @public
 */
export interface ConnectivityAnalysis {
  /**
   * Symbols with no documentation
   */
  undocumented: Symbol[];

  /**
   * Symbols with no tests
   */
  untested: Symbol[];

  /**
   * Symbols with no defined responsibility
   */
  noResponsibility: Symbol[];

  /**
   * Symbols with no contract
   */
  noContract: Symbol[];

  /**
   * Orphaned symbols (no relationships)
   */
  orphaned: Symbol[];

  /**
   * Broken links (references to non-existent symbols)
   */
  brokenLinks: Array<{
    from: string;
    to: string;
    type: string;
    filePath: string;
  }>;

  /**
   * Circular dependencies
   */
  circularDependencies: string[][];

  /**
   * Overall connectivity score (0-100)
   */
  connectivityScore: number;
}

/**
 * Query interface for symbol search
 * @public
 */
export interface SymbolQuery {
  /**
   * Symbol name pattern (supports regex)
   */
  name?: string;

  /**
   * Symbol type
   */
  type?: Symbol['type'];

  /**
   * File path pattern
   */
  filePath?: string;

  /**
   * Has contract?
   */
  hasContract?: boolean;

  /**
   * Has tests?
   */
  hasTesting?: boolean;

  /**
   * Is public API?
   */
  isPublic?: boolean;

  /**
   * Related to symbol
   */
  relatedTo?: string;

  /**
   * Depends on symbol
   */
  dependsOn?: string;

  /**
   * Used by symbol
   */
  usedBy?: string;
}

/**
 * Result of a symbol search query
 * @public
 */
export interface SymbolQueryResult {
  /**
   * Matching symbols
   */
  symbols: Symbol[];

  /**
   * Total number of matches
   */
  totalCount: number;

  /**
   * Query execution time in milliseconds
   */
  executionTime: number;
}

/**
 * Detailed validation issue for a specific symbol
 * @public
 */
export interface DetailedValidationIssue {
  /**
   * Symbol identifier
   */
  symbolId: string;

  /**
   * Symbol name
   */
  symbolName: string;

  /**
   * Symbol type
   */
  symbolType: Symbol['type'];

  /**
   * File path
   */
  filePath: string;

  /**
   * Line number
   */
  line: number;

  /**
   * Issue type
   */
  issueType:
    | 'missing-documentation'
    | 'missing-tests'
    | 'missing-responsibility'
    | 'missing-contract'
    | 'missing-precondition'
    | 'missing-postcondition'
    | 'missing-param-docs'
    | 'missing-returns-docs'
    | 'orphaned'
    | 'broken-link';

  /**
   * Severity level
   */
  severity: 'error' | 'warning' | 'info';

  /**
   * Human-readable message
   */
  message: string;

  /**
   * List of missing items (for granular reporting)
   */
  missingItems?: string[];

  /**
   * Suggested fix
   */
  suggestedFix?: string;
}

/**
 * Detailed validation report with actionable items
 * @public
 */
export interface DetailedValidationReport {
  /**
   * Report generation timestamp
   */
  timestamp: string;

  /**
   * Total symbols analyzed
   */
  totalSymbols: number;

  /**
   * Total issues found
   */
  totalIssues: number;

  /**
   * Issues by severity
   */
  issuesBySeverity: {
    error: number;
    warning: number;
    info: number;
  };

  /**
   * Issues grouped by file
   */
  issuesByFile: Map<
    string,
    {
      filePath: string;
      issueCount: number;
      issues: DetailedValidationIssue[];
    }
  >;

  /**
   * Issues grouped by type
   */
  issuesByType: Map<string, DetailedValidationIssue[]>;

  /**
   * All issues (flat list)
   */
  allIssues: DetailedValidationIssue[];

  /**
   * Overall completion percentage
   */
  completionPercentage: number;

  /**
   * Summary statistics
   */
  summary: {
    documented: number;
    undocumented: number;
    tested: number;
    untested: number;
    withResponsibility: number;
    withoutResponsibility: number;
    withContract: number;
    withoutContract: number;
  };
}
