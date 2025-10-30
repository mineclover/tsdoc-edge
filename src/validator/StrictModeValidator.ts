/**
 * Strict mode validator for enhanced documentation
 * @packageDocumentation
 * @responsibility Validate compliance with 6-category strict mode requirements
 * @architecture Validation Layer - Strict Mode Enforcement
 */

import type {
  DecisionRecord,
  DependencySpec,
  EnhancedSymbolDoc,
  ErrorExperience,
  Functionality,
  FuturePlan,
  ProblemSolving,
  StrictModeValidation,
} from '../types/enhanced-tags';

/**
 * Validator for strict mode documentation requirements
 *
 * @id 003
 * @public
 * @responsibility Validate compliance with 6-category strict mode requirements
 * @contract Enforce all 6 categories for public APIs
 * @testScenario Complete documentation passes
 * @testScenario Missing category fails
 * @testScenario Incomplete fields detected
 * @testScenario Public API stricter validation
 */
export class StrictModeValidator {
  /**
   * Validate enhanced symbol documentation
   * @param doc - Enhanced documentation to validate
   * @param isPublicAPI - Whether this is a public API (stricter requirements)
   * @returns Validation result
   * @contract Check all 6 required categories
   * @testScenario Complete documentation passes
   * @testScenario Missing category fails
   * @testScenario Incomplete fields detected
   */
  validate(doc: EnhancedSymbolDoc, isPublicAPI: boolean = true): StrictModeValidation {
    /**
     * missingCategories
     * @public
     */
    const missingCategories: StrictModeValidation['missingCategories'] = [];
    /**
     * incompleteCategories
     * @public
     */
    const incompleteCategories: StrictModeValidation['incompleteCategories'] = [];
    /**
     * errors
     * @public
     */
    const errors: StrictModeValidation['errors'] = [];

    // 1. Validate Problem Solving
    if (!doc.problemSolving) {
      missingCategories.push('problemSolving');
    } else {
      /**
       * psErrors
       * @public
       */
      const psErrors = this.validateProblemSolving(doc.problemSolving);
      if (psErrors.length > 0) {
        incompleteCategories.push({
          category: 'problemSolving',
          missingFields: psErrors,
        });
        psErrors.forEach((field) =>
          errors.push({
            category: 'problemSolving',
            field,
            message: `Missing or invalid field: ${field}`,
          })
        );
      }
    }

    // 2. Validate Functionality
    if (!doc.functionality) {
      missingCategories.push('functionality');
    } else {
      /**
       * funcErrors
       * @public
       */
      const funcErrors = this.validateFunctionality(doc.functionality);
      if (funcErrors.length > 0) {
        incompleteCategories.push({
          category: 'functionality',
          missingFields: funcErrors,
        });
        funcErrors.forEach((field) =>
          errors.push({
            category: 'functionality',
            field,
            message: `Missing or invalid field: ${field}`,
          })
        );
      }
    }

    // 3. Validate Error Experiences
    if (!doc.errorExperiences || doc.errorExperiences.length === 0) {
      if (isPublicAPI) {
        // Public APIs should document error experiences
        errors.push({
          category: 'errorExperiences',
          field: 'errorExperiences',
          message: 'Public API should document error experiences',
        });
      }
    } else {
      /**
       * errorErrors
       * @public
       */
      const errorErrors = this.validateErrorExperiences(doc.errorExperiences);
      if (errorErrors.length > 0) {
        incompleteCategories.push({
          category: 'errorExperiences',
          missingFields: errorErrors,
        });
      }
    }

    // 4. Validate Decisions
    if (!doc.decisions || doc.decisions.length === 0) {
      if (isPublicAPI) {
        errors.push({
          category: 'decisions',
          field: 'decisions',
          message: 'Public API should document design decisions',
        });
      }
    } else {
      /**
       * decisionErrors
       * @public
       */
      const decisionErrors = this.validateDecisions(doc.decisions);
      if (decisionErrors.length > 0) {
        incompleteCategories.push({
          category: 'decisions',
          missingFields: decisionErrors,
        });
      }
    }

    // 5. Validate Dependencies
    if (!doc.dependencies) {
      missingCategories.push('dependencies');
    } else {
      /**
       * depErrors
       * @public
       */
      const depErrors = this.validateDependencies(doc.dependencies);
      if (depErrors.length > 0) {
        incompleteCategories.push({
          category: 'dependencies',
          missingFields: depErrors,
        });
      }
    }

    // 6. Validate Future Plans
    if (!doc.futurePlans) {
      missingCategories.push('futurePlans');
    } else {
      /**
       * planErrors
       * @public
       */
      const planErrors = this.validateFuturePlans(doc.futurePlans);
      if (planErrors.length > 0) {
        incompleteCategories.push({
          category: 'futurePlans',
          missingFields: planErrors,
        });
      }
    }

    /**
     * complianceScore
     * @public
     */
    const complianceScore = this.calculateComplianceScore(
      missingCategories,
      incompleteCategories,
      errors
    );

    /**
     * isCompliant
     * @public
     */
    const isCompliant =
      missingCategories.length === 0 && incompleteCategories.length === 0 && errors.length === 0;

    return {
      symbolId: doc.symbolId,
      isCompliant,
      missingCategories,
      incompleteCategories,
      errors,
      complianceScore,
    };
  }

  /**
   * Validate problem solving section
   * @param ps - Problem solving data
   * @returns Array of missing fields
   */
  private validateProblemSolving(ps: ProblemSolving): string[] {
    /**
     * missing
     * @public
     */
    const missing: string[] = [];

    if (!ps.description || ps.description.trim() === '') {
      missing.push('description');
    }

    if (!ps.context || ps.context.trim() === '') {
      missing.push('context');
    }

    return missing;
  }

  /**
   * Validate functionality section
   * @param func - Functionality data
   * @returns Array of missing fields
   */
  private validateFunctionality(func: Functionality): string[] {
    /**
     * missing
     * @public
     */
    const missing: string[] = [];

    if (!func.mainFeatures || func.mainFeatures.length === 0) {
      missing.push('mainFeatures');
    }

    if (!func.components || func.components.length === 0) {
      missing.push('components');
    }

    return missing;
  }

  /**
   * Validate error experiences
   * @param errors - Error experiences
   * @returns Array of error messages
   */
  private validateErrorExperiences(errors: ErrorExperience[]): string[] {
    /**
     * issues
     * @public
     */
    const issues: string[] = [];

    errors.forEach((err, index) => {
      if (!err.id) issues.push(`errorExperiences[${index}].id`);
      if (!err.errorType) issues.push(`errorExperiences[${index}].errorType`);
      if (!err.message) issues.push(`errorExperiences[${index}].message`);
      if (!err.solution) issues.push(`errorExperiences[${index}].solution`);
    });

    return issues;
  }

  /**
   * Validate decisions
   * @param decisions - Decision records
   * @returns Array of error messages
   */
  private validateDecisions(decisions: DecisionRecord[]): string[] {
    /**
     * issues
     * @public
     */
    const issues: string[] = [];

    decisions.forEach((dec, index) => {
      if (!dec.id) issues.push(`decisions[${index}].id`);
      if (!dec.title) issues.push(`decisions[${index}].title`);
      if (!dec.decision) issues.push(`decisions[${index}].decision`);
      if (!dec.rationale) issues.push(`decisions[${index}].rationale`);
      if (!dec.date) issues.push(`decisions[${index}].date`);
      if (!dec.status) issues.push(`decisions[${index}].status`);
    });

    return issues;
  }

  /**
   * Validate dependencies
   * @param deps - Dependencies
   * @returns Array of error messages
   */
  private validateDependencies(deps: DependencySpec[]): string[] {
    /**
     * issues
     * @public
     */
    const issues: string[] = [];

    deps.forEach((dep, index) => {
      if (!dep.target) issues.push(`dependencies[${index}].target`);
      if (!dep.type) issues.push(`dependencies[${index}].type`);
      if (!dep.reason) issues.push(`dependencies[${index}].reason`);
    });

    return issues;
  }

  /**
   * Validate future plans
   * @param plans - Future plans
   * @returns Array of error messages
   */
  private validateFuturePlans(plans: FuturePlan[]): string[] {
    /**
     * issues
     * @public
     */
    const issues: string[] = [];

    plans.forEach((plan, index) => {
      if (!plan.id) issues.push(`futurePlans[${index}].id`);
      if (!plan.title) issues.push(`futurePlans[${index}].title`);
      if (!plan.description) issues.push(`futurePlans[${index}].description`);
      if (!plan.priority) issues.push(`futurePlans[${index}].priority`);
      if (!plan.status) issues.push(`futurePlans[${index}].status`);
    });

    return issues;
  }

  /**
   * Calculate compliance score (0-100)
   * @param missing - Missing categories
   * @param incomplete - Incomplete categories
   * @param errors - Validation errors
   * @returns Compliance score
   */
  private calculateComplianceScore(
    missing: string[],
    incomplete: Array<{ category: string; missingFields: string[] }>,
    errors: Array<{ category: string; field: string; message: string }>
  ): number {
    /**
     * totalCategories
     * @public
     */
    const totalCategories = 6;

    // Each missing category costs 100/6 points
    /**
     * missingPenalty
     * @public
     */
    const missingPenalty = (missing.length / totalCategories) * 100;

    // Incomplete categories cost less (half penalty)
    /**
     * incompletePenalty
     * @public
     */
    const incompletePenalty = (incomplete.length / totalCategories) * 50;

    // Additional errors cost less
    /**
     * errorPenalty
     * @public
     */
    const errorPenalty = Math.min(errors.length * 2, 20);

    /**
     * score
     * @public
     */
    const score = 100 - missingPenalty - incompletePenalty - errorPenalty;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate compliance report
   * @param validation - Validation result
   * @returns Human-readable report
   */
  generateReport(validation: StrictModeValidation): string {
    /**
     * report
     * @public
     */
    let report = `# Strict Mode Validation Report\n\n`;
    report += `**Symbol**: ${validation.symbolId}\n`;
    report += `**Compliance Score**: ${validation.complianceScore.toFixed(2)}/100\n`;
    report += `**Status**: ${validation.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n\n`;

    if (validation.missingCategories.length > 0) {
      report += `## ❌ Missing Categories (${validation.missingCategories.length})\n\n`;
      validation.missingCategories.forEach((cat) => {
        report += `- ${this.getCategoryName(cat)}\n`;
      });
      report += '\n';
    }

    if (validation.incompleteCategories.length > 0) {
      report += `## ⚠️ Incomplete Categories (${validation.incompleteCategories.length})\n\n`;
      validation.incompleteCategories.forEach((item) => {
        report += `### ${this.getCategoryName(item.category)}\n`;
        report += `Missing fields:\n`;
        item.missingFields.forEach((field) => {
          report += `  - ${field}\n`;
        });
        report += '\n';
      });
    }

    if (validation.errors.length > 0) {
      report += `## 🔴 Validation Errors (${validation.errors.length})\n\n`;
      validation.errors.forEach((err) => {
        report += `- **[${err.category}]** ${err.field}: ${err.message}\n`;
      });
      report += '\n';
    }

    if (validation.isCompliant) {
      report += `## ✅ All Requirements Met\n\n`;
      report += `This symbol meets all strict mode requirements.\n`;
    }

    return report;
  }

  /**
   * Get human-readable category name
   * @param category - Category identifier
   * @returns Display name
   */
  private getCategoryName(
    category:
      | 'problemSolving'
      | 'functionality'
      | 'errorExperiences'
      | 'decisions'
      | 'dependencies'
      | 'futurePlans'
      | string
  ): string {
    /**
     * names
     * @public
     */
    const names: Record<string, string> = {
      problemSolving: '1. Problem Solving',
      functionality: '2. Functionality',
      errorExperiences: '3. Error Experiences',
      decisions: '4. Decisions',
      dependencies: '5. Dependencies',
      futurePlans: '6. Future Plans',
    };

    return names[category] || category;
  }
}
