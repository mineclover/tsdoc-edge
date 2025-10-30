/**
 * Custom TSDoc tags for enhanced connectivity and traceability
 * @packageDocumentation
 */

/**
 * Custom tag definitions for TSDoc Edge
 * These tags enable symbol relationships, contracts, and traceability
 */
export const CUSTOM_TAGS = {
  // Relationship tags
  RELATED_TO: '@relatedTo',
  DEPENDS_ON: '@dependsOn',
  USED_BY: '@usedBy',
  IMPLEMENTS: '@implements',
  EXTENDS: '@extends',

  // Contract tags
  CONTRACT: '@contract',
  PRECONDITION: '@precondition',
  POSTCONDITION: '@postcondition',
  INVARIANT: '@invariant',

  // Testing tags
  TESTED_BY: '@testedBy',
  TEST_SCENARIO: '@testScenario',
  COVERAGE: '@coverage',

  // Design and Architecture
  RESPONSIBILITY: '@responsibility',
  DESIGN_DECISION: '@designDecision',
  ARCHITECTURE: '@architecture',
  PATTERN: '@pattern',

  // Traceability
  REQUIREMENT: '@requirement',
  ISSUE: '@issue',
  VERSION: '@version',
  SINCE: '@since',
  DEPRECATED_IN_FAVOR_OF: '@deprecatedInFavorOf',
} as const;

/**
 * Represents a relationship between two symbols
 * @public
 */
export interface SymbolRelationship {
  /**
   * Type of relationship
   */
  type: 'relatedTo' | 'dependsOn' | 'usedBy' | 'implements' | 'extends';

  /**
   * Source symbol identifier
   */
  from: string;

  /**
   * Target symbol identifier
   */
  to: string;

  /**
   * Optional description of the relationship
   */
  description?: string;

  /**
   * File path where the relationship is defined
   */
  filePath: string;

  /**
   * Line number where the relationship is defined
   */
  line?: number;
}

/**
 * Represents a contract specification for a symbol
 * @public
 */
export interface ContractSpec {
  /**
   * Symbol name
   */
  symbolName: string;

  /**
   * Contract description
   */
  description: string;

  /**
   * Preconditions that must be true before execution
   */
  preconditions: string[];

  /**
   * Postconditions that must be true after execution
   */
  postconditions: string[];

  /**
   * Invariants that must always hold
   */
  invariants: string[];

  /**
   * File path
   */
  filePath: string;
}

/**
 * Represents a test mapping for a symbol
 * @public
 */
export interface TestMapping {
  /**
   * Symbol being tested
   */
  symbolName: string;

  /**
   * Test file path
   */
  testFilePath: string;

  /**
   * Test function/suite name
   */
  testName: string;

  /**
   * Test scenarios covered
   */
  scenarios: string[];

  /**
   * Coverage information
   */
  coverage?: {
    branches?: number;
    lines?: number;
    functions?: number;
  };
}

/**
 * Represents design responsibility of a symbol
 * @public
 */
export interface ResponsibilitySpec {
  /**
   * Symbol name
   */
  symbolName: string;

  /**
   * Primary responsibility description
   */
  description: string;

  /**
   * What this symbol should do
   */
  shouldDo: string[];

  /**
   * What this symbol should NOT do
   */
  shouldNotDo: string[];

  /**
   * Design pattern applied (if any)
   */
  pattern?: string;

  /**
   * Architectural layer/component
   */
  architecture?: string;
}

/**
 * Represents a design decision record
 * @public
 */
export interface DesignDecision {
  /**
   * Decision ID
   */
  id: string;

  /**
   * Title of the decision
   */
  title: string;

  /**
   * Context and problem statement
   */
  context: string;

  /**
   * Decision made
   */
  decision: string;

  /**
   * Rationale for the decision
   */
  rationale: string;

  /**
   * Consequences of the decision
   */
  consequences: string[];

  /**
   * Related symbols
   */
  relatedSymbols: string[];

  /**
   * Date of decision
   */
  date: string;

  /**
   * Status: proposed, accepted, deprecated, superseded
   */
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
}
