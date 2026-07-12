/**
 * Block-level chunking types
 * @packageDocumentation
 */

/**
 * Types of code blocks
 */
export enum BlockType {
  /** Input validation block */
  VALIDATION = 'validation',
  /** Data transformation block */
  TRANSFORMATION = 'transformation',
  /** Database query block */
  QUERY = 'query',
  /** State mutation block */
  MUTATION = 'mutation',
  /** Logging block */
  LOGGING = 'logging',
  /** Error handling block */
  ERROR_HANDLING = 'error-handling',
  /** Business logic block */
  BUSINESS_LOGIC = 'business-logic',
  /** Initialization/setup block */
  SETUP = 'setup',
  /** Cleanup/teardown block */
  CLEANUP = 'cleanup',
  /** HTTP request/response block */
  HTTP = 'http',
  /** Conditional branching block */
  CONDITIONAL = 'conditional',
  /** Loop/iteration block */
  LOOP = 'loop',
  /** Other/unclassified block */
  OTHER = 'other',
}

/**
 * Side effect types
 */
export type SideEffectType =
  | 'io' // File I/O
  | 'state-mutation' // In-memory state change
  | 'network' // Network call (HTTP, WebSocket, etc.)
  | 'filesystem' // File system operation
  | 'database' // Database operation
  | 'cache' // Cache operation
  | 'event' // Event emission
  | 'logging'; // Logging/tracing

/**
 * Side effect representation
 */
export interface SideEffect {
  /** Type of side effect */
  type: SideEffectType;

  /** Target of side effect (e.g., file path, table name, event name) */
  target?: string;

  /** Description of side effect */
  description: string;

  /** Whether side effect is intentional or unintended */
  intentional?: boolean;
}

/**
 * Block scope types
 */
export type BlockScope = 'local' | 'closure' | 'module' | 'global';

/**
 * Code block representation
 */
export interface CodeBlock {
  /** Unique block ID (e.g., symbol-id::block-1) */
  id: string;

  /** Parent symbol ID */
  symbolId: string;

  /** Block type */
  type: BlockType;

  /** Starting line number */
  startLine: number;

  /** Ending line number */
  endLine: number;

  /** Purpose/description of block */
  purpose?: string;

  /** Symbol IDs used in this block */
  dependencies: string[];

  /** Side effects produced by this block */
  sideEffects: SideEffect[];

  /** Scope of block */
  scope: BlockScope;

  /** Cyclomatic complexity (optional) */
  complexity?: number;
}

/**
 * Block analysis result
 */
export interface BlockAnalysisResult {
  /** Detected blocks */
  blocks: CodeBlock[];

  /** Total lines analyzed */
  totalLines: number;

  /** Lines covered by blocks */
  coveredLines: number;

  /** Coverage percentage */
  coverage: number;

  /** Warnings or issues */
  warnings: string[];
}

/**
 * Block dependency graph edge
 */
export interface BlockDependency {
  /** Source block ID */
  fromBlock: string;

  /** Target block ID */
  toBlock: string;

  /** Type of dependency */
  type: 'data-flow' | 'control-flow' | 'exception-flow';

  /** Strength of dependency */
  strength: 'strong' | 'weak';
}

/**
 * Block chunking strategy configuration
 */
export interface ChunkingStrategy {
  /** Minimum block size (lines) */
  minBlockSize: number;

  /** Maximum block size (lines) */
  maxBlockSize: number;

  /** Whether to merge small blocks */
  mergeSmallBlocks: boolean;

  /** Whether to split large blocks */
  splitLargeBlocks: boolean;

  /** Block type detection rules */
  detectionRules: BlockDetectionRule[];
}

/**
 * Block detection rule
 */
export interface BlockDetectionRule {
  /** Block type to detect */
  type: BlockType;

  /** AST patterns to match */
  patterns: string[];

  /** Confidence threshold (0-1) */
  threshold: number;
}
