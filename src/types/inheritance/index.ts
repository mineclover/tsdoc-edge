/**
 * Enhanced inheritance tracking types
 * @packageDocumentation
 */

/**
 * Inheritance direction
 */
export enum InheritanceDirection {
  /** Child → Parent (default) */
  SUBCLASS_TO_BASE = 'subclass-to-base',
  /** Parent → Children (reverse lookup) */
  BASE_TO_SUBCLASS = 'base-to-subclass',
}

/**
 * Abstraction level of class/interface
 */
export enum AbstractionLevel {
  /** Concrete class (can be instantiated) */
  CONCRETE = 'concrete',
  /** Abstract class (cannot be instantiated) */
  ABSTRACT = 'abstract',
  /** Interface (pure contract) */
  INTERFACE = 'interface',
  /** Mixin (partial implementation) */
  MIXIN = 'mixin',
}

/**
 * Inheritance relationship type
 */
export type InheritanceType = 'extends' | 'implements' | 'mixins';

/**
 * Enhanced inheritance relationship
 */
export interface InheritanceRelationship {
  /** Relationship ID */
  id: string;

  /** Relationship type */
  type: InheritanceType;

  /** Child symbol ID */
  from: string;

  /** Parent symbol ID */
  to: string;

  /** Explicit directionality */
  direction: InheritanceDirection;

  /** Abstraction levels */
  abstractionLevel: {
    /** Child abstraction level */
    from: AbstractionLevel;
    /** Parent abstraction level */
    to: AbstractionLevel;
  };

  /** Hierarchy depth (0 = direct, 1+ = transitive) */
  hierarchyDepth: number;

  /** Full inheritance chain */
  inheritanceChain: string[];

  /** Overridden members */
  overriddenMembers: OverriddenMember[];

  /** File where inheritance is declared */
  filePath: string;

  /** Line number */
  line: number;
}

/**
 * Overridden member information
 */
export interface OverriddenMember {
  /** Member name */
  name: string;

  /** Member type (method, property, accessor) */
  type: 'method' | 'property' | 'getter' | 'setter';

  /** Parent symbol ID */
  parentSymbolId: string;

  /** Child symbol ID */
  childSymbolId: string;

  /** Whether override is explicit (has 'override' keyword) */
  isExplicit: boolean;

  /** Changes in signature */
  signatureChanges?: SignatureChange[];
}

/**
 * Signature change details
 */
export interface SignatureChange {
  /** Change type */
  type: 'parameter-added' | 'parameter-removed' | 'parameter-type-changed' | 'return-type-changed';

  /** Description */
  description: string;

  /** Old signature */
  oldSignature?: string;

  /** New signature */
  newSignature?: string;
}

/**
 * Inheritance chain analysis
 */
export interface InheritanceChain {
  /** Root symbol ID (most derived class) */
  root: string;

  /** Chain of parent symbols (bottom-up) */
  chain: ChainNode[];

  /** Total depth */
  depth: number;

  /** Whether chain is valid (no circular dependencies) */
  isValid: boolean;

  /** Issues detected in chain */
  issues: ChainIssue[];
}

/**
 * Chain node
 */
export interface ChainNode {
  /** Symbol ID */
  symbolId: string;

  /** Symbol name */
  symbolName: string;

  /** Abstraction level */
  abstractionLevel: AbstractionLevel;

  /** Depth from root (0 = root) */
  depth: number;

  /** Relationship type to parent */
  relationshipType?: InheritanceType;
}

/**
 * Chain issue
 */
export interface ChainIssue {
  /** Issue type */
  type: 'circular-dependency' | 'missing-parent' | 'invalid-inheritance';

  /** Description */
  description: string;

  /** Affected symbol IDs */
  affectedSymbols: string[];

  /** Severity */
  severity: 'error' | 'warning';
}

/**
 * Inheritance hierarchy (all subclasses)
 */
export interface InheritanceHierarchy {
  /** Root symbol ID (base class) */
  root: string;

  /** Root symbol name */
  rootName: string;

  /** Root abstraction level */
  rootAbstraction: AbstractionLevel;

  /** Direct children */
  children: HierarchyNode[];

  /** Total descendants count */
  totalDescendants: number;

  /** Maximum depth in tree */
  maxDepth: number;
}

/**
 * Hierarchy node (subclass)
 */
export interface HierarchyNode {
  /** Symbol ID */
  symbolId: string;

  /** Symbol name */
  symbolName: string;

  /** Abstraction level */
  abstractionLevel: AbstractionLevel;

  /** Depth from root */
  depth: number;

  /** Direct children */
  children: HierarchyNode[];

  /** Overridden members from parent */
  overrides: string[];
}

/**
 * Abstraction level detection result
 */
export interface AbstractionDetection {
  /** Symbol ID */
  symbolId: string;

  /** Detected abstraction level */
  level: AbstractionLevel;

  /** Confidence (0-1) */
  confidence: number;

  /** Reasons for detection */
  reasons: string[];

  /** Evidence from AST */
  evidence: {
    /** Has abstract keyword */
    hasAbstractKeyword?: boolean;
    /** Is interface */
    isInterface?: boolean;
    /** Has abstract methods */
    hasAbstractMethods?: boolean;
    /** Can be instantiated */
    canInstantiate?: boolean;
  };
}
