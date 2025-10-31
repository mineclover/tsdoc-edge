/**
 * Enhanced documentation tags for Strict Mode
 * @packageDocumentation
 * @responsibility Define extended documentation structure for comprehensive symbol documentation
 */

/**
 * Problem solving documentation
 * @public
 */
export interface ProblemSolving {
  /**
   * Problem description
   */
  description: string;

  /**
   * What problem does this code solve?
   */
  context: string;

  /**
   * Target use case or scenario
   */
  targetUseCase?: string;

  /**
   * Related problem or parent problem
   */
  relatedProblem?: string;
}

/**
 * Functionality documentation
 * @public
 */
export interface Functionality {
  /**
   * Main features provided by this symbol
   */
  mainFeatures: string[];

  /**
   * Components or sub-functions
   */
  components: Array<{
    name: string;
    description: string;
    signature?: string;
  }>;

  /**
   * Input/Output specification
   */
  io?: {
    inputs: Array<{ name: string; type: string; description: string }>;
    outputs: Array<{ name: string; type: string; description: string }>;
  };

  /**
   * Usage examples
   */
  examples?: string[];
}

/**
 * Error experience documentation
 * @public
 */
export interface ErrorExperience {
  /**
   * Error identifier
   */
  id: string;

  /**
   * Error type or name
   */
  errorType: string;

  /**
   * Error message
   */
  message: string;

  /**
   * How the error was encountered
   */
  context: string;

  /**
   * Solution applied
   */
  solution: string;

  /**
   * When this error occurred
   */
  occurredAt?: string;

  /**
   * Prevention measures
   */
  prevention?: string;
}

/**
 * Decision record
 * @public
 */
export interface DecisionRecord {
  /**
   * Decision identifier
   */
  id: string;

  /**
   * Decision title
   */
  title: string;

  /**
   * What was decided
   */
  decision: string;

  /**
   * Why this decision was made
   */
  rationale: string;

  /**
   * Alternatives that were considered
   */
  alternatives: Array<{
    option: string;
    reason: string; // Why it was rejected
  }>;

  /**
   * Consequences of this decision
   */
  consequences: string[];

  /**
   * Date of decision
   */
  date: string;

  /**
   * Status: proposed, accepted, deprecated, superseded
   */
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';

  /**
   * If superseded, what superseded it
   */
  supersededBy?: string;
}

/**
 * Dependency specification (enhanced)
 * @public
 */
export interface DependencySpec {
  /**
   * Dependency target (module, file, symbol)
   */
  target: string;

  /**
   * Type of dependency
   */
  type: 'module' | 'file' | 'symbol' | 'external';

  /**
   * Why this dependency exists
   */
  reason: string;

  /**
   * Version requirement (for external dependencies)
   */
  version?: string;

  /**
   * Is this dependency optional?
   */
  isOptional?: boolean;

  /**
   * Import path
   */
  importPath?: string;
}

/**
 * Future plan documentation
 * @public
 */
export interface FuturePlan {
  /**
   * Plan identifier (e.g., PLAN-001)
   */
  id: string;

  /**
   * Plan title
   */
  title: string;

  /**
   * Detailed description of what needs to be implemented
   */
  description: string;

  /**
   * Priority: high, medium, low
   */
  priority?: 'high' | 'medium' | 'low';

  /**
   * Status: planned, in-progress, completed, cancelled
   */
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';

  /**
   * Target symbol where this feature will be added
   * (e.g., "DataProcessor" for class, "processData" for function)
   */
  targetSymbol?: string;

  /**
   * Target method/property name to be added
   * (e.g., "loadCSV" for method to be added to class)
   */
  targetMethod?: string;

  /**
   * Type of the implementation target
   */
  targetType?: 'method' | 'function' | 'property' | 'class';

  /**
   * Symbol ID of the actual implementation (set when completed)
   * Links the plan to the real implementation
   */
  implementedBy?: string;

  /**
   * Target milestone or version
   */
  targetMilestone?: string;

  /**
   * Estimated effort (in story points or hours)
   */
  estimatedEffort?: string;

  /**
   * Dependencies that need to be completed first
   */
  blockedBy?: string[];

  /**
   * Related issues or tickets
   */
  relatedIssues?: string[];

  /**
   * Created date
   */
  createdAt: string;

  /**
   * Completed date
   */
  completedAt?: string;
}

/**
 * Base symbol documentation
 * Contains minimal required fields for any symbol documentation
 * @public
 */
export interface BaseSymbolDoc {
  /**
   * Symbol identifier
   */
  symbolId: string;

  /**
   * When this documentation was created
   */
  createdAt: string;

  /**
   * Last update timestamp
   */
  updatedAt: string;

  /**
   * Documentation version
   */
  version: string;
}

/**
 * Enhanced symbol documentation (Strict Mode)
 * Extends BaseSymbolDoc with optional 6-category documentation system
 *
 * For Strict Mode compliance on public APIs, all 6 categories should be present.
 * For incremental documentation, categories can be added progressively.
 *
 * @public
 */
export interface EnhancedSymbolDoc extends BaseSymbolDoc {
  /**
   * 1. Problem Solving (optional)
   * Describes what problem this symbol solves
   */
  problemSolving?: ProblemSolving;

  /**
   * 2. Functionality (optional)
   * Describes what this symbol does
   */
  functionality?: Functionality;

  /**
   * 3. Error Experiences (optional)
   * Documents errors encountered and solutions
   */
  errorExperiences?: ErrorExperience[];

  /**
   * 4. Decisions (optional)
   * Records architectural decisions (ADRs)
   */
  decisions?: DecisionRecord[];

  /**
   * 5. Dependencies (optional)
   * Lists dependencies and their reasons
   */
  dependencies?: DependencySpec[];

  /**
   * 6. Future Plans (optional)
   * Documents planned improvements (TODOs)
   */
  futurePlans?: FuturePlan[];
}

/**
 * Strict mode validation result
 * @public
 */
export interface StrictModeValidation {
  /**
   * Symbol identifier
   */
  symbolId: string;

  /**
   * Is compliant with strict mode?
   */
  isCompliant: boolean;

  /**
   * Missing categories
   */
  missingCategories: Array<
    | 'problemSolving'
    | 'functionality'
    | 'errorExperiences'
    | 'decisions'
    | 'dependencies'
    | 'futurePlans'
  >;

  /**
   * Incomplete categories (present but lacking required fields)
   */
  incompleteCategories: Array<{
    category: string;
    missingFields: string[];
  }>;

  /**
   * Validation errors
   */
  errors: Array<{
    category: string;
    field: string;
    message: string;
  }>;

  /**
   * Compliance score (0-100)
   */
  complianceScore: number;
}
