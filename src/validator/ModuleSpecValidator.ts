/**
 * Module Specification Validator
 *
 * @packageDocumentation
 * @responsibility Validate module specifications for completeness and quality
 * @doc [[ModuleSpecValidator]]
 */

import type { ModuleSpecTemplate } from '../types/spec/module-spec';

/**
 * Validation rule severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation issue
 */
export interface ValidationIssue {
  section: string;
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ModuleSpecValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  passed: string[];
  failed: string[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Minimum required confidence */
  minConfidence?: number;
  /** Require Purpose section to be filled */
  requirePurpose?: boolean;
  /** Require at least one parameter description */
  requireParamDescriptions?: boolean;
  /** Require return description */
  requireReturnDescription?: boolean;
  /** Require at least one dependency */
  requireDependencies?: boolean;
  /** Require logic description (not TODO) */
  requireLogicDescription?: boolean;
  /** Strict mode: all TODO markers are errors */
  strictMode?: boolean;
}

/**
 * Module specification validator
 *
 * @doc [[ModuleSpecValidator]]
 * @public
 * @responsibility Validate module specifications against quality criteria
 */
export class ModuleSpecValidator {
  private options: Required<ValidationOptions>;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      minConfidence: options.minConfidence ?? 70,
      requirePurpose: options.requirePurpose ?? true,
      requireParamDescriptions: options.requireParamDescriptions ?? true,
      requireReturnDescription: options.requireReturnDescription ?? true,
      requireDependencies: options.requireDependencies ?? false,
      requireLogicDescription: options.requireLogicDescription ?? true,
      strictMode: options.strictMode ?? false,
    };
  }

  /**
   * Validate a module specification
   *
   * @param spec - Module specification to validate
   * @returns Validation result
   * @public
   */
  validate(spec: ModuleSpecTemplate): ModuleSpecValidationResult {
    const issues: ValidationIssue[] = [];
    const passed: string[] = [];
    const failed: string[] = [];

    // 1. Validate Purpose
    this.validatePurpose(spec, issues, passed, failed);

    // 2. Validate Input
    this.validateInput(spec, issues, passed, failed);

    // 3. Validate Output
    this.validateOutput(spec, issues, passed, failed);

    // 4. Validate Context
    this.validateContext(spec, issues, passed, failed);

    // 5. Validate Logic
    this.validateLogic(spec, issues, passed, failed);

    // 6. Validate Effect
    this.validateEffect(spec, issues, passed, failed);

    // 7. Validate Scope
    this.validateScope(spec, issues, passed, failed);

    // 8. Validate Metadata
    this.validateMetadata(spec, issues, passed, failed);

    // Calculate score
    const totalChecks = passed.length + failed.length;
    const score = totalChecks > 0 ? Math.round((passed.length / totalChecks) * 100) : 0;

    // Determine if valid
    const hasErrors = issues.some(i => i.severity === 'error');
    const meetsConfidence = spec.completionConfidence >= this.options.minConfidence;
    const isValid = !hasErrors && meetsConfidence && score >= this.options.minConfidence;

    return {
      isValid,
      score,
      issues,
      passed,
      failed,
    };
  }

  /**
   * Validate Purpose section
   */
  private validatePurpose(
    spec: ModuleSpecTemplate,
    issues: ValidationIssue[],
    passed: string[],
    failed: string[]
  ): void {
    const { purpose } = spec;

    // Check problem
    if (purpose.problem && !purpose.problem.startsWith('TODO:')) {
      passed.push('Purpose has problem description');
    } else if (this.options.requirePurpose) {
      failed.push('Purpose missing problem');
      issues.push({
        section: 'Purpose',
        severity: 'error',
        message: 'Problem description is missing or is a TODO',
        suggestion: 'Add @problem tag to describe the problem this module solves',
      });
    }

    // Check responsibility
    if (purpose.responsibility && !purpose.responsibility.includes('TODO:')) {
      passed.push('Purpose has responsibility');
    } else if (this.options.requirePurpose) {
      failed.push('Purpose missing responsibility');
      issues.push({
        section: 'Purpose',
        severity: 'error',
        message: 'Responsibility is missing or is a TODO',
        suggestion: 'Add @responsibility tag or ensure summary exists',
      });
    }

    // Check solution
    if (purpose.solution) {
      passed.push('Purpose has solution approach');
    } else {
      issues.push({
        section: 'Purpose',
        severity: 'info',
        message: 'Solution approach not specified',
        suggestion: 'Add @solves tag to describe the solution',
      });
    }
  }

  /**
   * Validate Input section
   */
  private validateInput(
    spec: ModuleSpecTemplate,
    issues: ValidationIssue[],
    passed: string[],
    failed: string[]
  ): void {
    const { input } = spec;

    if (input.parameters.length === 0) {
      passed.push('Input has no parameters (not applicable)');
      return;
    }

    // Check parameter descriptions
    const paramsWithDescriptions = input.parameters.filter(
      p => p.description && p.description !== '-' && !p.description.includes('parameter')
    );

    if (paramsWithDescriptions.length === input.parameters.length) {
      passed.push('All parameters have descriptions');
    } else if (this.options.requireParamDescriptions) {
      failed.push('Some parameters lack descriptions');
      issues.push({
        section: 'Input',
        severity: 'warning',
        message: `${input.parameters.length - paramsWithDescriptions.length} parameters missing descriptions`,
        suggestion: 'Add @param tags with meaningful descriptions',
      });
    }

    // Check type signature
    if (input.typeSignature) {
      passed.push('Input has type signature');
    }
  }

  /**
   * Validate Output section
   */
  private validateOutput(
    spec: ModuleSpecTemplate,
    issues: ValidationIssue[],
    passed: string[],
    failed: string[]
  ): void {
    const { output } = spec;

    // Check return description
    if (output.returnType.type === 'void') {
      passed.push('Output is void (not applicable)');
    } else if (output.returnType.description && !output.returnType.description.startsWith('Returns ')) {
      passed.push('Output has return description');
    } else if (this.options.requireReturnDescription) {
      failed.push('Output missing return description');
      issues.push({
        section: 'Output',
        severity: 'warning',
        message: 'Return value lacks meaningful description',
        suggestion: 'Add @returns tag with description',
      });
    }

    // Check postconditions
    if (output.postconditions.length > 0) {
      passed.push('Output has postconditions');
    }

    // Check failure cases
    if (output.failureCases.length > 0) {
      passed.push('Output documents failure cases');
    }
  }

  /**
   * Validate Context section
   */
  private validateContext(
    spec: ModuleSpecTemplate,
    issues: ValidationIssue[],
    passed: string[],
    failed: string[]
  ): void {
    const { context } = spec;

    // Check dependencies
    if (context.dependencies.length > 0 || context.imports.length > 0) {
      passed.push('Context has dependencies');
    } else if (this.options.requireDependencies) {
      failed.push('Context has no dependencies');
      issues.push({
        section: 'Context',
        severity: 'info',
        message: 'No dependencies documented',
        suggestion: 'Add @depends tags for external dependencies',
      });
    } else {
      passed.push('Context has no dependencies (standalone)');
    }
  }

  /**
   * Validate Logic section
   */
  private validateLogic(
    spec: ModuleSpecTemplate,
    issues: ValidationIssue[],
    passed: string[],
    failed: string[]
  ): void {
    const { logic } = spec;

    // Check features
    if (logic.features.length > 0) {
      passed.push('Logic has features listed');
    } else {
      issues.push({
        section: 'Logic',
        severity: 'warning',
        message: 'No features listed',
        suggestion: 'Add @functionality tag with main features',
      });
    }

    // Check algorithm description
    if (logic.algorithm && !logic.algorithm.startsWith('TODO:')) {
      passed.push('Logic has algorithm description');
    } else if (this.options.requireLogicDescription) {
      failed.push('Logic missing algorithm');
      issues.push({
        section: 'Logic',
        severity: this.options.strictMode ? 'error' : 'warning',
        message: 'Algorithm description is missing or is a TODO',
        suggestion: 'Manually describe the algorithm or processing steps',
      });
    }
  }

  /**
   * Validate Effect section
   */
  private validateEffect(
    spec: ModuleSpecTemplate,
    issues: ValidationIssue[],
    passed: string[],
    failed: string[]
  ): void {
    const { effect } = spec;

    // Side effects documented
    if (effect.sideEffects.length > 0) {
      passed.push('Effect has side effects documented');
    } else {
      passed.push('Effect has no side effects (pure function)');
    }
  }

  /**
   * Validate Scope section
   */
  private validateScope(
    spec: ModuleSpecTemplate,
    issues: ValidationIssue[],
    passed: string[],
    failed: string[]
  ): void {
    const { scope } = spec;

    // Public API marker
    if (scope.isPublicAPI) {
      passed.push('Scope is marked as public API');
    } else {
      issues.push({
        section: 'Scope',
        severity: 'info',
        message: 'Not marked as public API',
        suggestion: 'Add @public tag if this should be part of public API',
      });
    }

    // Exposed interface
    if (scope.exposedAPI.length > 0) {
      passed.push('Scope has exposed API');
    }
  }

  /**
   * Validate metadata
   */
  private validateMetadata(
    spec: ModuleSpecTemplate,
    issues: ValidationIssue[],
    passed: string[],
    failed: string[]
  ): void {
    // Check completion confidence
    if (spec.completionConfidence >= this.options.minConfidence) {
      passed.push(`Completion confidence meets threshold (${spec.completionConfidence}%)`);
    } else {
      failed.push(`Low completion confidence (${spec.completionConfidence}%)`);
      issues.push({
        section: 'Metadata',
        severity: 'error',
        message: `Completion confidence (${spec.completionConfidence}%) below minimum (${this.options.minConfidence}%)`,
        suggestion: 'Improve source documentation with TSDoc tags',
      });
    }

    // Check manual review needed
    if (spec.manualReviewNeeded.length === 0) {
      passed.push('No manual review needed');
    } else {
      issues.push({
        section: 'Metadata',
        severity: this.options.strictMode ? 'warning' : 'info',
        message: `Manual review needed for: ${spec.manualReviewNeeded.join(', ')}`,
      });
    }
  }
}
