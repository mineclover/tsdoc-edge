/**
 * Convention validator for TSDoc comments
 * Enforces TSDoc minimum conventions as defined in TSDOC_CONVENTIONS.md
 *
 * @packageDocumentation
 * @doc [[Validator System]]
 * @context TSDoc minimum documentation convention validation by symbol kind
 * @functionality Enforces summary, release visibility modifiers, parameter docs, return tags, and symbol-kind conventions
 */

import type { DocComment } from '@microsoft/tsdoc';
import type { ParsedDocComment, ValidationResult } from '../types';

/**
 * Symbol type extracted from name or other heuristics
 */
type SymbolType = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'unknown';

/**
 * Validates TSDoc comments against defined conventions
 *
 * Enforces minimum documentation requirements based on symbol type:
 * - Functions: summary, `@param`, `@returns`, `@doc [[ConventionValidator]]`
 * - Classes: summary, constructor docs, method docs, `@public`
 * - Interfaces: summary, property docs, `@public`
 * - Types: summary, usage description, `@public`
 * - Enums: summary, member docs, `@public`
 * - Variables: summary, `@public` for exports
 *
 * @doc [[ConventionValidator]]
 * @doc [[Validator System]]
 * @public
 * @responsibility Validate TSDoc comments against naming and documentation conventions
 * @contract Enforce summary, public tags, parameter docs, and return value documentation
 */
export class ConventionValidator {
  /**
   * Validate a parsed doc comment against conventions
   *
   * @param parsedComment - The parsed doc comment to validate
   * @param symbolType - Optional symbol type for type-specific validation
   * @returns Updated parsed comment with validation results
   * @public
   */
  validate(parsedComment: ParsedDocComment, symbolType?: SymbolType): ParsedDocComment {
    const validationResults: ValidationResult[] = [...parsedComment.validationResults];
    const inferredType = symbolType || this.inferSymbolType(parsedComment.symbolName);

    // Rule 1: Summary must be present
    if (!this.hasSummary(parsedComment.docComment)) {
      validationResults.push({
        ruleId: 'require-summary',
        severity: 'error',
        message: 'TSDoc comment must include a summary section',
      });
    }

    // Rule 2: Exported APIs must declare a standard TSDoc release visibility modifier
    if (
      !this.hasReleaseVisibilityTag(parsedComment.docComment) &&
      this.isPublicAPI(parsedComment)
    ) {
      validationResults.push({
        ruleId: 'require-public-tag',
        severity: 'warning',
        message: 'Public API should have @public tag',
      });
    }

    // Rule 3: Parameters must be documented
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

    // Apply symbol type-specific validations
    this.validateBySymbolType(inferredType, parsedComment, validationResults);

    return {
      ...parsedComment,
      validationResults,
      isValid: !validationResults.some((r) => r.severity === 'error'),
    };
  }

  /**
   * Apply symbol type-specific validation rules
   *
   * @param symbolType - Symbol type
   * @param parsedComment - Parsed doc comment
   * @param validationResults - Array to accumulate validation results
   */
  private validateBySymbolType(
    symbolType: SymbolType,
    parsedComment: ParsedDocComment,
    validationResults: ValidationResult[]
  ): void {
    const docComment = parsedComment.docComment;

    switch (symbolType) {
      case 'function':
        // Functions should have @responsibility
        if (!this.hasCustomTag(docComment, '@responsibility')) {
          validationResults.push({
            ruleId: 'recommend-responsibility',
            severity: 'warning',
            message: 'Functions should document their responsibility with @responsibility tag',
          });
        }
        // Functions should have @contract for complex logic
        if (!this.hasCustomTag(docComment, '@contract')) {
          validationResults.push({
            ruleId: 'recommend-contract',
            severity: 'info',
            message: 'Functions with preconditions/postconditions should document contract',
          });
        }
        break;

      case 'class':
        // Classes should have @responsibility
        if (!this.hasCustomTag(docComment, '@responsibility')) {
          validationResults.push({
            ruleId: 'recommend-responsibility',
            severity: 'warning',
            message: 'Classes should document their responsibility with @responsibility tag',
          });
        }
        // Classes should have @contract for invariants
        if (!this.hasCustomTag(docComment, '@contract')) {
          validationResults.push({
            ruleId: 'recommend-contract',
            severity: 'info',
            message: 'Classes should document class invariants with @contract tag',
          });
        }
        break;

      case 'interface':
        // Interfaces should have clear property documentation
        if (!this.hasCustomTag(docComment, '@contract')) {
          validationResults.push({
            ruleId: 'recommend-contract',
            severity: 'info',
            message: 'Interfaces should document constraints with @contract tag',
          });
        }
        break;

      case 'type':
        // Type aliases should have usage examples
        if (!this.hasCustomTag(docComment, '@example')) {
          validationResults.push({
            ruleId: 'recommend-example',
            severity: 'info',
            message: 'Type aliases should include usage examples',
          });
        }
        break;

      case 'enum':
        // Enums should document each member
        validationResults.push({
          ruleId: 'recommend-enum-members',
          severity: 'info',
          message: 'Enum members should be individually documented',
        });
        break;

      case 'variable':
        // Constants should indicate if readonly
        if (parsedComment.symbolName === parsedComment.symbolName.toUpperCase()) {
          validationResults.push({
            ruleId: 'recommend-readonly',
            severity: 'info',
            message: 'Constants should have @readonly tag',
          });
        }
        break;

      case 'unknown':
        break;
    }
  }

  /**
   * Check if doc comment has a specific custom tag
   *
   * @param docComment - TSDoc comment
   * @param tagName - Tag name to check (e.g., `@responsibility`)
   * @returns True if tag exists
   */
  private hasCustomTag(docComment: DocComment, tagName: string): boolean {
    return docComment.customBlocks.some((block) => block.blockTag.tagName === tagName);
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
   * Check if doc comment declares any standard `@microsoft/tsdoc` release visibility modifier
   * (`@public`, `@beta`, `@alpha`, or `@internal`).
   *
   * @param docComment - TSDoc comment
   * @returns True if a standard release visibility modifier tag exists
   */
  private hasReleaseVisibilityTag(docComment: DocComment): boolean {
    const releaseTags = new Set(['@public', '@beta', '@alpha', '@internal']);
    return docComment.modifierTagSet.nodes.some((tag) => releaseTags.has(tag.tagName));
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
   * @param _docComment - TSDoc comment
   * @returns Array of parameter names that are not documented
   */
  private getUndocumentedParams(_docComment: DocComment): string[] {
    // This is a simplified implementation
    // In a real implementation, you would extract actual parameters from the function signature
    return [];
  }

  /**
   * Check if doc comment has `@returns` tag
   *
   * @param docComment - TSDoc comment
   * @returns True if `@returns` tag exists
   */
  private hasReturnsTag(docComment: DocComment): boolean {
    return !!docComment.returnsBlock;
  }

  /**
   * Check if the function should document returns
   *
   * @param _parsedComment - Parsed doc comment
   * @returns True if return documentation is required
   */
  private shouldHaveReturns(_parsedComment: ParsedDocComment): boolean {
    // This is a simplified check
    // In a real implementation, you would check the actual return type
    return true;
  }

  /**
   * Infer symbol type from symbol name and context
   *
   * @param symbolName - Name of the symbol
   * @returns Inferred symbol type
   */
  private inferSymbolType(symbolName: string): SymbolType {
    // Check for constant (all caps with underscores) - must be before other checks
    if (symbolName === symbolName.toUpperCase() && symbolName.includes('_')) {
      return 'variable';
    }

    // Check for enum (often all caps without underscore or PascalCase with 'Enum')
    if (
      symbolName.endsWith('Enum') ||
      (symbolName === symbolName.toUpperCase() && !symbolName.includes('_'))
    ) {
      return 'enum';
    }

    // Check for type alias (ends with Type)
    if (symbolName.endsWith('Type')) {
      return 'type';
    }

    // Check for interface (ends with Interface or Props)
    if (symbolName.endsWith('Interface') || symbolName.endsWith('Props')) {
      return 'interface';
    }

    // Check for class (PascalCase starting with capital letter)
    if (/^[A-Z][a-z]/.test(symbolName) && !symbolName.includes('_')) {
      return 'class';
    }

    // Check for function (camelCase)
    if (/^[a-z]/.test(symbolName)) {
      return 'function';
    }

    return 'unknown';
  }

  /**
   * Calculate documentation quality score (0-100)
   *
   * Based on TSDOC_CONVENTIONS.md scoring system:
   * - Base score: 40 points for having a summary
   * - +10 points: public tag (for public symbols)
   * - +10 points: All params documented
   * - +10 points: returns documented (for non-void)
   * - +10 points: responsibility defined
   * - +10 points: contract defined
   * - +5 points: example provided
   * - +5 points: testedBy link
   *
   * @param parsedComment - Parsed doc comment
   * @returns Quality score from 0-100
   * @public
   */
  calculateQualityScore(parsedComment: ParsedDocComment): number {
    let score = 0;

    // Base score for having a summary
    if (this.hasSummary(parsedComment.docComment)) {
      score += 40;
    }

    // Standard release visibility modifier (@public, @beta, @alpha, @internal)
    if (this.hasReleaseVisibilityTag(parsedComment.docComment)) {
      score += 10;
    }

    // @param documentation (simplified - assumes if params block exists, they're documented)
    const paramBlocks = parsedComment.docComment.params.blocks;
    if (paramBlocks.length > 0) {
      score += 10;
    }

    // @returns documentation
    if (this.hasReturnsTag(parsedComment.docComment)) {
      score += 10;
    }

    // Check for custom tags in doc comment custom blocks
    const hasResponsibility = parsedComment.docComment.customBlocks.some(
      (block) => block.blockTag.tagName === '@responsibility'
    );
    if (hasResponsibility) {
      score += 10;
    }

    const hasContract = parsedComment.docComment.customBlocks.some(
      (block) => block.blockTag.tagName === '@contract'
    );
    if (hasContract) {
      score += 10;
    }

    // Check for @example tag
    const hasExample = parsedComment.docComment.customBlocks.some(
      (block) => block.blockTag.tagName === '@example'
    );
    if (hasExample) {
      score += 5;
    }

    // Check for @testScenario, @doc, or standard @see connectivity tag
    const hasVerificationLink =
      (parsedComment.docComment.seeBlocks?.length ?? 0) > 0 ||
      parsedComment.docComment.customBlocks.some(
        (block) => block.blockTag.tagName === '@testScenario' || block.blockTag.tagName === '@doc'
      );
    if (hasVerificationLink) {
      score += 5;
    }

    return score;
  }

  /**
   * Get quality level description
   *
   * @param score - Quality score (0-100)
   * @returns Quality level description
   * @public
   */
  getQualityLevel(score: number): string {
    if (score <= 30) return 'Critical - Missing required documentation';
    if (score <= 60) return 'Poor - Has basic docs but missing important details';
    if (score <= 80) return 'Good - Well-documented with most recommended fields';
    return 'Excellent - Comprehensive documentation';
  }
}
