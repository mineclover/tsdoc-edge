/**
 * Type chain and dependency path tracking types
 * @packageDocumentation
 */

import type { InterfaceDependency } from './interface';

/**
 * Single step in a type dependency chain
 * @public
 */
export interface TypeChainStep {
  /**
   * Source type name
   */
  from: string;

  /**
   * Target type name
   */
  to: string;

  /**
   * Dependency that creates this link
   */
  dependency: InterfaceDependency;

  /**
   * Step number in the chain (0-indexed)
   */
  stepNumber: number;

  /**
   * Distance from the root (0 for direct dependencies)
   */
  depth: number;
}

/**
 * Complete type dependency chain from source to target
 * @public
 */
export interface TypeChain {
  /**
   * Source type (starting point)
   */
  source: string;

  /**
   * Target type (end point)
   */
  target: string;

  /**
   * All steps in the chain
   */
  steps: TypeChainStep[];

  /**
   * Total length of the chain
   */
  length: number;

  /**
   * Whether a path exists
   */
  exists: boolean;

  /**
   * All type names in the path (including source and target)
   */
  path: string[];
}

/**
 * Tree node representing type dependencies
 * @public
 */
export interface TypeDependencyNode {
  /**
   * Type name
   */
  typeName: string;

  /**
   * Depth in the tree (0 for root)
   */
  depth: number;

  /**
   * Children nodes (types this type depends on)
   */
  children: TypeDependencyNode[];

  /**
   * Dependency that led to this node
   */
  dependency?: InterfaceDependency;

  /**
   * Whether this node was visited (for cycle detection)
   */
  visited?: boolean;

  /**
   * Number of direct dependencies
   */
  childCount: number;
}

/**
 * Type chain analysis result
 * @public
 */
export interface TypeChainAnalysisResult {
  /**
   * Source type name
   */
  source: string;

  /**
   * Target type name (if searching for specific target)
   */
  target?: string;

  /**
   * All paths found (if target specified)
   */
  chains: TypeChain[];

  /**
   * Dependency tree (if no target specified)
   */
  tree?: TypeDependencyNode;

  /**
   * Total types in the analysis
   */
  totalTypes: number;

  /**
   * Maximum depth reached
   */
  maxDepth: number;

  /**
   * Circular dependencies detected
   */
  cycles: string[][];

  /**
   * Analysis timestamp
   */
  timestamp: string;
}

/**
 * Options for type chain analysis
 * @public
 */
export interface TypeChainOptions {
  /**
   * Maximum depth to traverse (default: 10)
   */
  maxDepth?: number;

  /**
   * Include external types (from node_modules)
   */
  includeExternal?: boolean;

  /**
   * Filter by dependency type
   */
  dependencyTypes?: Array<'extends' | 'composition' | 'parameter' | 'return' | 'generic'>;

  /**
   * Filter by data flow direction
   */
  dataFlow?: 'input' | 'output' | 'bidirectional';

  /**
   * Find all paths or stop at first (default: false - find all)
   */
  findAllPaths?: boolean;

  /**
   * Include primitive types (string, number, etc.)
   */
  includePrimitives?: boolean;
}
