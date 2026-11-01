/**
 * Core parsing types for TSDoc Edge
 *
 * @packageDocumentation
 * @doc [[ParseTypes]]
 * @context Core TSDoc comment parsing and convention validation payload structures
 * @functionality Defines ParsedDocComment, ValidationResult, and ParseResult contracts
 */

import type { DocComment } from '@microsoft/tsdoc';

/**
 * Represents a parsed TSDoc comment with validation results
 * @doc [[ParseTypes]]
 * @public
 */
export interface ParsedDocComment {
  /**
   * The original TSDoc comment
   */
  docComment: DocComment;

  /**
   * Source file path
   */
  filePath: string;

  /**
   * Symbol name (function, class, interface, etc.)
   */
  symbolName: string;

  /**
   * Validation results
   */
  validationResults: ValidationResult[];

  /**
   * Whether the comment follows all conventions
   */
  isValid: boolean;
}

/**
 * Validation result for a single rule
 * @doc [[ParseTypes]]
 * @public
 */
export interface ValidationResult {
  /**
   * Rule identifier
   */
  ruleId: string;

  /**
   * Severity level
   */
  severity: 'error' | 'warning' | 'info';

  /**
   * Human-readable message
   */
  message: string;

  /**
   * Location in source code
   */
  location?: {
    line: number;
    column: number;
  };
}

/**
 * Result of parsing a source file
 * @doc [[ParseTypes]]
 * @public
 */
export interface ParseResult {
  /**
   * Source file path
   */
  filePath: string;

  /**
   * All parsed doc comments from the file
   */
  comments: ParsedDocComment[];

  /**
   * Any errors that occurred during parsing
   */
  errors: Error[];
}
