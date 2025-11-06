/**
 * Symbol registry types for JSONL storage
 * @packageDocumentation
 * @responsibility Define minimal schema for symbol identification
 */

/**
 * Source reference pointing to code location
 * @public
 */
export interface SourceRef {
  /**
   * File path relative to project root
   */
  filePath: string;

  /**
   * Symbol name in the source code
   */
  symbolName: string;

  /**
   * Symbol type (for quick lookup)
   */
  type?: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'constant' | 'method' | 'property';

  /**
   * Approximate line number (may change)
   */
  line?: number;

  /**
   * Parent symbol ID (for methods, properties, nested functions)
   * Example: If this is a method of class with ID "005", memberOf = "005"
   */
  memberOf?: string;

  /**
   * Member type indicating the relationship to parent
   * - instance: instance method/property (ClassName#method)
   * - static: static method/property (ClassName.method)
   * - inner: nested/private function (ClassName~helper)
   */
  memberType?: 'instance' | 'static' | 'inner';

  /**
   * Qualified name using JSDoc convention
   * Examples:
   * - "DataProcessor#loadCSV" (instance method)
   * - "DataProcessor.createDefault" (static method)
   * - "DataProcessor~helper" (inner function)
   * - "processData" (top-level function)
   */
  qualifiedName?: string;

  /**
   * Hierarchy depth in the symbol tree
   * - 0: Top-level (class, function, interface)
   * - 1: Method, property of a class
   * - 2: Nested function inside a method
   * - 3+: Deeper nesting
   */
  depth?: number;

  /**
   * Source file hash for change detection
   */
  sourceHash?: string;
}

/**
 * Dependency relationship
 * @public
 */
export interface DependencyRelation {
  /**
   * Target symbol ID
   */
  targetId: string;

  /**
   * Why this dependency exists (from TSDoc @uses)
   */
  reason: string;

  /**
   * Dependency type
   */
  type?: 'runtime' | 'type-only' | 'dev';
}

/**
 * Symbol registry entry (stored in JSONL)
 * This is the minimal data needed to map IDs to source locations
 * @public
 */
export interface SymbolRegistryEntry {
  /**
   * Unique permanent ID (3-5 chars, 0-9a-z)
   */
  id: string;

  /**
   * Where to find this symbol in source code
   */
  sourceRef: SourceRef;

  /**
   * When this entry was created
   */
  createdAt: string;

  /**
   * Last time the mapping was updated
   */
  updatedAt: string;

  /**
   * Optional tags for organization
   */
  tags?: string[];

  /**
   * Optional notes (not parsed from code)
   */
  notes?: string;

  /**
   * Dependencies (from @uses tags in TSDoc)
   */
  uses?: DependencyRelation[];

  /**
   * Reverse dependencies (from @usedBy tags in TSDoc)
   */
  usedBy?: DependencyRelation[];
}

/**
 * Symbol registry managing ID-to-source mappings
 * @public
 */
export interface SymbolRegistry {
  /**
   * Registry format version
   */
  version: string;

  /**
   * All registered symbols
   */
  entries: SymbolRegistryEntry[];

  /**
   * ID generation mode
   */
  idGeneratorMode: 'random' | 'sequential';

  /**
   * Next sequential ID (if using sequential mode)
   */
  nextSequentialId?: number;
}
