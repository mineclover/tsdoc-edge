/**
 * Module Specification TSDoc Tags
 *
 * Custom TSDoc tags for 7-part module specification framework
 *
 * @packageDocumentation
 * @doc [[ModuleSpecTagTypes]]
 */

/**
 * Algorithm description from @algorithm tag
 */
export interface AlgorithmDoc {
  /** Algorithm or approach description */
  description: string;
  /** Optional steps or pseudocode */
  steps?: string[];
}

/**
 * Complexity information from @complexity tag
 */
export interface ComplexityDoc {
  /** Complexity notation (e.g., "O(n)", "High", "Low") */
  notation: string;
  /** Optional explanation */
  explanation?: string;
}

/**
 * Side effect from @sideEffect tag
 */
export interface SideEffectDoc {
  /** Type of side effect */
  type: 'filesystem' | 'database' | 'network' | 'state' | 'process' | 'other';
  /** Description of the side effect */
  description: string;
  /** Operation (e.g., "read", "write", "delete") */
  operation?: string;
}

/**
 * State mutation from @mutates tag
 */
export interface MutationDoc {
  /** What state is being mutated */
  target: string;
  /** Description of the mutation */
  description: string;
}

/**
 * I/O operation from @io tag
 */
export interface IODoc {
  /** Type of I/O */
  type: 'file' | 'network' | 'database' | 'console' | 'other';
  /** Description */
  description: string;
}

/**
 * Scope information from @scope tag
 */
export interface ScopeDoc {
  /** Scope description */
  description: string;
  /** Access level */
  accessLevel?: 'public' | 'private' | 'protected' | 'internal';
}

/**
 * Complete module specification from TSDoc tags
 *
 * This extends the existing EnhancedSymbolDoc with
 * 7-part framework specific tags
 */
export interface ModuleSpecTags {
  /** Algorithm description (@algorithm) */
  algorithm?: AlgorithmDoc;

  /** Complexity information (@complexity) */
  complexity?: ComplexityDoc;

  /** Side effects (@sideEffect, can have multiple) */
  sideEffects?: SideEffectDoc[];

  /** State mutations (@mutates, can have multiple) */
  mutations?: MutationDoc[];

  /** I/O operations (@io, can have multiple) */
  io?: IODoc[];

  /** Scope description (@scope) */
  scope?: ScopeDoc;
}

/**
 * Tag names for module specification
 */
export const MODULE_SPEC_TAG_NAMES = {
  ALGORITHM: 'algorithm',
  COMPLEXITY: 'complexity',
  SIDE_EFFECT: 'sideEffect',
  MUTATES: 'mutates',
  IO: 'io',
  SCOPE: 'scope',
} as const;

/**
 * Example usage template
 */
export const MODULE_SPEC_TAG_TEMPLATE = `/**
 * Brief description
 *
 * @public
 * @responsibility Main responsibility of this module
 * @problem Problem this module solves
 * @solves Solution approach
 *
 * @param paramName - Parameter description
 * @returns Return value description
 *
 * @precondition Input constraints
 * @postcondition Output guarantees
 *
 * @depends DependencyName
 * @context Execution context requirements
 *
 * @functionality Feature 1, Feature 2, Feature 3
 * @algorithm Describe the algorithm or processing steps in detail
 * @complexity O(n) or High/Medium/Low with explanation
 *
 * @sideEffect filesystem: Writes configuration file
 * @sideEffect database: Updates user table
 * @mutates this.cache - Updates internal cache
 * @io file: Reads config.json
 *
 * @scope Public API, exported from main module
 *
 * @example
 * \`\`\`typescript
 * const result = myFunction(input);
 * \`\`\`
 */`;
