/**
 * Module Specification Template
 *
 * 7-part framework for comprehensive module documentation:
 * 1. Purpose - Why this module exists
 * 2. Input - What parameters it accepts
 * 3. Output - What it returns
 * 4. Context - What dependencies it needs
 * 5. Logic - How it works internally
 * 6. Effect - What side effects it produces
 * 7. Scope - What it exposes publicly
 *
 * @packageDocumentation
 * @doc [[ModuleSpecTypes]]
 */

/**
 * Parameter specification with constraints
 */
export interface ParamSpec {
  name: string;
  type: string;
  description?: string;
  optional: boolean;
  defaultValue?: string;
  constraints?: string[];
}

/**
 * Return value specification
 */
export interface ReturnSpec {
  type: string;
  description?: string;
}

/**
 * Error/failure case specification
 */
export interface FailureCase {
  condition: string;
  errorType?: string;
  description: string;
}

/**
 * Dependency specification
 */
export interface DependencySpec {
  name: string;
  type: 'module' | 'service' | 'external';
  purpose: string;
  critical: boolean;
}

/**
 * Import specification
 */
export interface ImportSpec {
  source: string;
  symbols: string[];
  isExternal: boolean;
}

/**
 * Side effect specification
 */
export interface SideEffectSpec {
  type: 'filesystem' | 'database' | 'network' | 'state' | 'process' | 'other';
  description: string;
  operation?: string;
}

/**
 * 1. Purpose - Why this module exists
 */
export interface ModulePurpose {
  /** The problem this module solves */
  problem: string;
  /** The responsibility this module has */
  responsibility: string;
  /** The solution approach */
  solution: string;
  /** Additional context about existence */
  context?: string;
}

/**
 * 2. Input - What parameters it accepts
 */
export interface ModuleInput {
  /** Function/method parameters */
  parameters: ParamSpec[];
  /** Conditions that must be true before execution */
  preconditions: string[];
  /** Constraints on input values */
  constraints: string[];
  /** Full type signature */
  typeSignature?: string;
}

/**
 * 3. Output - What it returns
 */
export interface ModuleOutput {
  /** Return type specification */
  returnType: ReturnSpec;
  /** Conditions guaranteed after successful execution */
  postconditions: string[];
  /** Successful execution scenarios */
  successCases: string[];
  /** Failure/error scenarios */
  failureCases: FailureCase[];
}

/**
 * 4. Context - What dependencies it needs
 */
export interface ModuleContext {
  /** Other modules/services this depends on */
  dependencies: DependencySpec[];
  /** Import declarations */
  imports: ImportSpec[];
  /** Environment requirements (env vars, config, etc.) */
  environment: string[];
  /** Additional requirements for execution */
  requirements: string[];
}

/**
 * 5. Logic - How it works internally
 */
export interface ModuleLogic {
  /** Main features/capabilities */
  features: string[];
  /** Algorithm or approach description */
  algorithm: string;
  /** Cyclomatic complexity or similar metric */
  complexity?: string;
  /** Internal operations summary */
  operations?: string[];
}

/**
 * 6. Effect - What side effects it produces
 */
export interface ModuleEffect {
  /** Side effects on external systems */
  sideEffects: SideEffectSpec[];
  /** State mutations */
  mutations: string[];
  /** I/O operations */
  io: string[];
  /** Observable effects (logs, events, metrics) */
  observable?: string[];
}

/**
 * 7. Scope - What it exposes publicly
 */
export interface ModuleScope {
  /** Public or private visibility */
  visibility: 'public' | 'private' | 'protected';
  /** Exported API surface */
  exposedAPI: string[];
  /** Access level modifiers */
  accessLevel: string;
  /** Whether this is part of public API */
  isPublicAPI: boolean;
  /** Exposed state/properties */
  exposedState?: string[];
}

/**
 * Complete module specification using 7-part framework
 */
export interface ModuleSpecTemplate {
  /** Symbol identifier */
  symbolId: string;
  /** Symbol name */
  symbolName: string;
  /** Symbol kind (function, class, method, etc.) */
  symbolKind: string;
  /** File path */
  filePath: string;

  /** 1. Purpose */
  purpose: ModulePurpose;
  /** 2. Input */
  input: ModuleInput;
  /** 3. Output */
  output: ModuleOutput;
  /** 4. Context */
  context: ModuleContext;
  /** 5. Logic */
  logic: ModuleLogic;
  /** 6. Effect */
  effect: ModuleEffect;
  /** 7. Scope */
  scope: ModuleScope;

  /** Auto-completion confidence (0-100) */
  completionConfidence: number;
  /** Sections that need manual review */
  manualReviewNeeded: string[];
  /** Timestamp of generation */
  generatedAt: string;
}

/**
 * Auto-completion result with metadata
 */
export interface ModuleSpecResult {
  spec: ModuleSpecTemplate;
  /** Which sections were auto-completed successfully */
  autoCompleted: string[];
  /** Which sections need manual input */
  manualRequired: string[];
  /** Extraction warnings */
  warnings: string[];
  /** Overall confidence score (0-100) */
  confidence: number;
}
