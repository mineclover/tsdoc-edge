/**
 * Interface analysis and domain structure types
 * @packageDocumentation
 */

import type { Symbol } from '../graph';

/**
 * Interface-specific information
 * @public
 */
export interface InterfaceInfo {
  /**
   * Base symbol information
   */
  symbol: Symbol;

  /**
   * Properties defined in the interface
   */
  properties: InterfaceProperty[];

  /**
   * Methods defined in the interface
   */
  methods: InterfaceMethod[];

  /**
   * Interfaces this interface extends
   */
  extends: string[];

  /**
   * Type parameters (generics)
   */
  typeParameters: string[];

  /**
   * Domain this interface belongs to (inferred from path/name)
   */
  domain?: string;

  /**
   * Role in the domain (Entity, ValueObject, Service, Repository, etc.)
   */
  domainRole?: DomainRole;
}

/**
 * Interface property information
 * @public
 */
export interface InterfaceProperty {
  /**
   * Property name
   */
  name: string;

  /**
   * Property type
   */
  type: string;

  /**
   * Is property optional?
   */
  isOptional: boolean;

  /**
   * Is property readonly?
   */
  isReadonly: boolean;

  /**
   * Property documentation
   */
  documentation?: string;
}

/**
 * Interface method information
 * @public
 */
export interface InterfaceMethod {
  /**
   * Method name
   */
  name: string;

  /**
   * Method parameters
   */
  parameters: MethodParameter[];

  /**
   * Return type
   */
  returnType: string;

  /**
   * Method documentation
   */
  documentation?: string;
}

/**
 * Method parameter information
 * @public
 */
export interface MethodParameter {
  /**
   * Parameter name
   */
  name: string;

  /**
   * Parameter type
   */
  type: string;

  /**
   * Is parameter optional?
   */
  isOptional: boolean;
}

/**
 * Domain role classification
 * @public
 */
export type DomainRole =
  | 'Entity'
  | 'ValueObject'
  | 'Service'
  | 'Repository'
  | 'Factory'
  | 'Aggregate'
  | 'DomainEvent'
  | 'DTO'
  | 'Unknown';

/**
 * Interface dependency information
 * @public
 */
export interface InterfaceDependency {
  /**
   * Source interface
   */
  from: string;

  /**
   * Target interface
   */
  to: string;

  /**
   * Dependency type
   */
  dependencyType: DependencyType;

  /**
   * Property or method that creates the dependency
   */
  via?: string;

  /**
   * Location of dependency (property type, method parameter, return type, etc.)
   */
  location: DependencyLocation;

  /**
   * Type relationship context
   * - direct: Direct reference (e.g., user: User)
   * - generic-param: Inside generic parameter (e.g., Promise<User>)
   * - union: Part of union type (e.g., User | Admin)
   * - intersection: Part of intersection type (e.g., User & Permissions)
   * - array: Array element type (e.g., User[])
   */
  typeRelation?: 'direct' | 'generic-param' | 'union' | 'intersection' | 'array';

  /**
   * Generic context information
   * e.g., "Promise<T>" where T=User, "Map<K,V>" where V=User
   */
  genericContext?: string;

  /**
   * Whether this is an external type (from node_modules or external library)
   */
  isExternal?: boolean;

  /**
   * Import source for external types
   * e.g., "typescript", "@types/node"
   */
  importSource?: string;

  /**
   * Data flow direction
   * - input: Type flows into the interface (e.g., method parameter)
   * - output: Type flows out of the interface (e.g., return type, property)
   * - bidirectional: Both directions (e.g., getter/setter)
   */
  dataFlow?: 'input' | 'output' | 'bidirectional';

  /**
   * Category of the target type
   */
  typeCategory?: 'interface' | 'type-alias' | 'class' | 'enum' | 'unknown';
}

/**
 * Type of dependency between interfaces
 * @public
 */
export type DependencyType =
  | 'extends' // Interface extends another
  | 'composition' // Interface has property of another interface type
  | 'parameter' // Method parameter uses another interface
  | 'return' // Method returns another interface
  | 'generic'; // Generic type parameter

/**
 * Location where dependency occurs
 * @public
 */
export type DependencyLocation = 'property' | 'method' | 'extends' | 'typeParameter';

/**
 * Domain structure analysis result
 * @public
 */
export interface DomainStructure {
  /**
   * Domain name
   */
  domainName: string;

  /**
   * Interfaces in this domain
   */
  interfaces: InterfaceInfo[];

  /**
   * Dependencies within this domain
   */
  internalDependencies: InterfaceDependency[];

  /**
   * Dependencies to other domains
   */
  externalDependencies: InterfaceDependency[];

  /**
   * Domain cohesion score (0-1)
   * Higher means more cohesive domain
   */
  cohesionScore: number;

  /**
   * Domain coupling score (0-1)
   * Lower means less coupling to other domains
   */
  couplingScore: number;
}

/**
 * Interface dependency graph
 * @public
 */
export interface InterfaceDependencyGraph {
  /**
   * All analyzed interfaces
   */
  interfaces: Map<string, InterfaceInfo>;

  /**
   * All dependencies between interfaces
   */
  dependencies: InterfaceDependency[];

  /**
   * Domain structures
   */
  domains: Map<string, DomainStructure>;
}

/**
 * Interface analysis options
 * @public
 */
export interface InterfaceAnalysisOptions {
  /**
   * Include private interfaces?
   */
  includePrivate?: boolean;

  /**
   * Infer domain from file path?
   */
  inferDomainFromPath?: boolean;

  /**
   * Infer domain role from naming conventions?
   */
  inferDomainRole?: boolean;

  /**
   * Domain path patterns (e.g., ["src/domain/*", "src/entities/*"])
   */
  domainPathPatterns?: string[];
}
