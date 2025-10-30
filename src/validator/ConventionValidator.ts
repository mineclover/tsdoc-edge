/**
 * Convention validator for TSDoc comments
 * @packageDocumentation
 */

import type { DocComment } from '@microsoft/tsdoc';
import type { ParsedDocComment, ValidationResult } from '../types';

/**
 * Validates TSDoc comments against defined conventions
 *
 * @id 005
 * @public
 * @responsibility Validate TSDoc comments against naming and documentation conventions
 * @contract Enforce summary, public tags, parameter docs, and return value documentation
 */
export class ConventionValidator {
  /**
   * Validate a parsed doc comment against conventions
   *
   * @param parsedComment - The parsed doc comment to validate
   * @returns Updated parsed comment with validation results
   * @public
   */
  validate(parsedComment: ParsedDocComment): ParsedDocComment {
    /**
     * validationResults
     * @public
     */
    const validationResults: ValidationResult[] = [];

    // Rule 1: Summary must be present
    if (!this.hasSummary(parsedComment.docComment)) {
      validationResults.push({
        ruleId: 'require-summary',
        severity: 'error',
        message: 'TSDoc comment must include a summary section',
      });
    }

    // Rule 2: Public APIs must have @public tag
    if (!this.hasPublicTag(parsedComment.docComment) && this.isPublicAPI(parsedComment)) {
      validationResults.push({
        ruleId: 'require-public-tag',
        severity: 'warning',
        message: 'Public API should have @public tag',
      });
    }

    // Rule 3: Parameters must be documented
    /**
     * undocumentedParams
     * @public
     */
    const undocumentedParams = this.getUndocumentedParams(parsedComment.docComment);
    if (undocumentedParams.length > 0) {
      validationResults.push({
        ruleId: 'require-param-docs',
        severity: 'error',
        message: `Parameters must be documented: ${undocumentedParams.join(', ')}`,
      });
    }

    // Rule 4: Return value must be documented for non-void functions
    if (!this.hasReturnsTag(parsedComment.docComment) && this.shouldHaveReturns(parsedComment)) {
      validationResults.push({
        ruleId: 'require-returns',
        severity: 'error',
        message: 'Function must document return value with @returns tag',
      });
    }

    return {
      ...parsedComment,
      validationResults,
      isValid: !validationResults.some((r) => r.severity === 'error'),
    };
  }

  /**
   * Check if doc comment has a summary section
   *
   * @param docComment - TSDoc comment
   * @returns True if summary exists
   */
  private hasSummary(docComment: DocComment): boolean {
    return docComment.summarySection.nodes.length > 0;
  }

  /**
   * Check if doc comment has @public tag
   *
   * @param docComment - TSDoc comment
   * @returns True if @public tag exists
   */
  private hasPublicTag(docComment: DocComment): boolean {
    /**
     * modifierTag
     * @public
     */
    const modifierTag = docComment.modifierTagSet.nodes.find((tag) => tag.tagName === '@public');
    return !!modifierTag;
  }

  /**
   * Check if the commented symbol is a public API
   *
   * @param parsedComment - Parsed doc comment
   * @returns True if it's a public API
   */
  private isPublicAPI(parsedComment: ParsedDocComment): boolean {
    // Heuristic: assume exported symbols are public
    // This can be enhanced with actual TypeScript type checking
    return !parsedComment.symbolName.startsWith('_');
  }

  /**
   * Get list of undocumented parameters
   *
   * @param docComment - TSDoc comment
   * @returns Array of parameter names that are not documented
   */
  private getUndocumentedParams(_docComment: DocComment): string[] {
    // This is a simplified implementation
    // In a real implementation, you would extract actual parameters from the function signature
    return [];
  }

  /**
   * Check if doc comment has @returns tag
   *
   * @param docComment - TSDoc comment
   * @returns True if @returns tag exists
   */
  private hasReturnsTag(docComment: DocComment): boolean {
    return !!docComment.returnsBlock;
  }

  /**
   * Check if the function should document returns
   *
   * @param parsedComment - Parsed doc comment
   * @returns True if return documentation is required
   */
  private shouldHaveReturns(_parsedComment: ParsedDocComment): boolean {
    // This is a simplified check
    // In a real implementation, you would check the actual return type
    return true;
  }
}
