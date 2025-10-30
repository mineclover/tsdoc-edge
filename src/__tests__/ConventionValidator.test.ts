/**
 * ConventionValidator tests
 * @public
 */

import { TSDocParser } from '@microsoft/tsdoc';
import { ConventionValidator } from '../validator/ConventionValidator';
import type { ParsedDocComment } from '../types';

describe('ConventionValidator', () => {
  let validator: ConventionValidator;
  let parser: TSDocParser;

  beforeEach(() => {
    validator = new ConventionValidator();
    parser = new TSDocParser();
  });

  describe('validate', () => {
    it('should validate a TSDoc comment with correct format', () => {
      const comment = `/**
 * This is a summary
 * @param name - Parameter description
 * @returns Return value description
 * @public
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: 'testFunc',
        validationResults: [],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      expect(result.isValid).toBe(true);
      expect(result.validationResults.length).toBe(0);
    });

    it('should detect missing summary', () => {
      const comment = `/**
 * @param name - Parameter description
 * @returns Return value description
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: 'testFunc',
        validationResults: [],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      expect(result.isValid).toBe(false);
      expect(result.validationResults.length).toBeGreaterThan(0);
      expect(result.validationResults.some((r) => r.ruleId === 'require-summary')).toBe(true);
    });

    it('should allow valid TSDoc tags', () => {
      const comment = `/**
 * Summary text
 * @param name - Name parameter
 * @returns Result
 * @throws Error on invalid input
 * @public
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: 'testFunc',
        validationResults: [],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      expect(result.isValid).toBe(true);
    });

    it('should warn about missing @public tag for public APIs', () => {
      const comment = `/**
 * Summary text
 * @param name - Name parameter
 * @returns Result
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: 'publicFunction', // Public symbol (no underscore)
        validationResults: [],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      // Should have a warning about missing @public tag
      const hasPublicWarning = result.validationResults.some(
        (r) => r.ruleId === 'require-public-tag'
      );
      expect(hasPublicWarning).toBe(true);
    });

    it('should not warn about @public tag for private symbols', () => {
      const comment = `/**
 * Summary text
 * @param name - Name parameter
 * @returns Result
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: '_privateFunction', // Private symbol (underscore)
        validationResults: [],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      // Should not have a warning about missing @public tag for private symbols
      const hasPublicWarning = result.validationResults.some(
        (r) => r.ruleId === 'require-public-tag'
      );
      expect(hasPublicWarning).toBe(false);
    });

    it('should handle comments with @public tag', () => {
      const comment = `/**
 * Summary text
 * @public
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: 'testFunc',
        validationResults: [],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      // Should not have warning about missing @public tag
      const hasPublicWarning = result.validationResults.some(
        (r) => r.ruleId === 'require-public-tag'
      );
      expect(hasPublicWarning).toBe(false);
    });

    it('should preserve existing validation results', () => {
      const comment = `/**
 * Summary text
 * @public
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: 'testFunc',
        validationResults: [
          {
            ruleId: 'existing-rule',
            severity: 'info',
            message: 'Existing message',
          },
        ],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      // Should preserve existing validation results
      expect(result.validationResults.some((r) => r.ruleId === 'existing-rule')).toBe(true);
    });

    it('should handle empty comments', () => {
      const comment = `/**
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: 'testFunc',
        validationResults: [],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      expect(result.isValid).toBe(false);
      expect(result.validationResults.some((r) => r.ruleId === 'require-summary')).toBe(true);
    });

    it('should set isValid to false when there are errors', () => {
      const comment = `/**
 * @param name - Parameter
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: 'testFunc',
        validationResults: [],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      // Missing summary is an error
      expect(result.isValid).toBe(false);
      const errorCount = result.validationResults.filter((r) => r.severity === 'error').length;
      expect(errorCount).toBeGreaterThan(0);
    });

    it('should set isValid to true when only warnings exist', () => {
      const comment = `/**
 * Summary text
 * @returns Result
 */`;

      const parserContext = parser.parseString(comment);
      const parsedComment: ParsedDocComment = {
        docComment: parserContext.docComment,
        filePath: 'test.ts',
        symbolName: 'publicFunc', // Public symbol
        validationResults: [],
        isValid: true,
      };

      const result = validator.validate(parsedComment);

      // Should have warnings but no errors
      const hasWarnings = result.validationResults.some((r) => r.severity === 'warning');
      const hasErrors = result.validationResults.some((r) => r.severity === 'error');

      if (hasWarnings && !hasErrors) {
        expect(result.isValid).toBe(true);
      }
    });
  });
});
