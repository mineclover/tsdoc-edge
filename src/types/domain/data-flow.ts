/**
 * Data flow and transformation tracking types
 * @packageDocumentation
 */

import type { InterfaceDependency } from './interface';

/**
 * DTO naming pattern
 * @public
 */
export type DTOPattern =
  | 'suffix-dto' // UserDTO
  | 'suffix-request' // UserRequest
  | 'suffix-response' // UserResponse
  | 'suffix-payload' // UserPayload
  | 'suffix-input' // CreateUserInput
  | 'suffix-output' // GetUserOutput
  | 'suffix-data' // UserData
  | 'unknown';

/**
 * DTO classification result
 * @public
 */
export interface DTOClassification {
  /**
   * Interface name
   */
  interfaceName: string;

  /**
   * Detected pattern
   */
  pattern: DTOPattern;

  /**
   * Is this a DTO?
   */
  isDTO: boolean;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * DTO role (input/output/transfer)
   */
  role?: 'input' | 'output' | 'transfer';
}

/**
 * Transformation step in a chain
 * @public
 */
export interface TransformationStep {
  /**
   * Source type name
   */
  from: string;

  /**
   * Target type name
   */
  to: string;

  /**
   * Method or function performing transformation
   */
  transformer?: string;

  /**
   * Dependency that represents this transformation
   */
  dependency: InterfaceDependency;

  /**
   * Step number in chain
   */
  stepNumber: number;
}

/**
 * Complete transformation chain
 * @public
 */
export interface DataTransformationChain {
  /**
   * Chain identifier
   */
  id: string;

  /**
   * Source type (starting point)
   */
  source: string;

  /**
   * Destination type (end point)
   */
  destination: string;

  /**
   * Intermediate transformation steps
   */
  steps: TransformationStep[];

  /**
   * Total chain length
   */
  length: number;

  /**
   * Chain type classification
   */
  chainType: 'dto-to-entity' | 'entity-to-dto' | 'dto-to-dto' | 'entity-to-entity' | 'unknown';

  /**
   * Is this a valid transformation pattern?
   */
  isValid: boolean;

  /**
   * Issues detected in this chain
   */
  issues: string[];
}

/**
 * Transformation path between two types
 * @public
 */
export interface TransformationPath {
  /**
   * Start type
   */
  from: string;

  /**
   * End type
   */
  to: string;

  /**
   * Path through interfaces
   */
  path: string[];

  /**
   * Dependencies along the path
   */
  dependencies: InterfaceDependency[];

  /**
   * Path length
   */
  length: number;

  /**
   * Whether path exists
   */
  exists: boolean;
}

/**
 * Data flow analysis result
 * @public
 */
export interface DataFlowAnalysisResult {
  /**
   * Analysis timestamp
   */
  timestamp: string;

  /**
   * Total interfaces analyzed
   */
  totalInterfaces: number;

  /**
   * Detected DTOs
   */
  dtos: DTOClassification[];

  /**
   * Detected transformation chains
   */
  transformationChains: DataTransformationChain[];

  /**
   * Orphaned DTOs (no transformation chain)
   */
  orphanedDTOs: string[];

  /**
   * Bidirectional transformations (potential issues)
   */
  bidirectionalTransformations: Array<{
    typeA: string;
    typeB: string;
    issue: string;
  }>;

  /**
   * Summary statistics
   */
  summary: {
    totalDTOs: number;
    totalChains: number;
    averageChainLength: number;
    validChains: number;
    invalidChains: number;
    dtoToEntityChains: number;
    entityToDTOChains: number;
  };
}
