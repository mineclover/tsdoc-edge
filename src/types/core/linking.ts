/**
 * Types for doc-code linking and validation
 * @packageDocumentation
 */

/**
 * Link from document to code
 * @public
 */
export interface CodeLink {
  /** Document file path */
  docPath: string;
  /** Line number in document */
  docLine: number;
  /** Link text */
  text: string;
  /** Target code file path */
  targetFile: string;
  /** Target symbol name (optional) */
  targetSymbol?: string;
  /** Target member (optional, Class#method) */
  targetMember?: string;
}

/**
 * Link from code to document
 * @public
 */
export interface DocLink {
  /** Code file path */
  codePath: string;
  /** Line number in code */
  codeLine: number;
  /** Symbol name */
  symbolName: string;
  /** Tag type (@see, @link) */
  tagType: string;
  /** Target document path */
  targetDoc: string;
  /** Document section (optional) */
  targetSection?: string;
}

/**
 * Bidirectional link index
 * @public
 */
export interface LinkIndex {
  /** Code to document mapping */
  codeToDoc: Map<string, DocLink[]>;
  /** Document to code mapping */
  docToCode: Map<string, CodeLink[]>;
  /** Symbol to document mapping */
  symbolToDoc: Map<string, string[]>;
  /** Document to symbol mapping */
  docToSymbol: Map<string, string[]>;
}

/**
 * Link validation result
 * @public
 */
export interface LinkValidationResult {
  type: 'broken' | 'valid' | 'outdated';
  link: CodeLink | DocLink;
  issue?: string;
  suggestion?: string;
}

/**
 * Validation report
 * @public
 */
export interface LinkValidationReport {
  totalLinks: number;
  brokenLinks: LinkValidationResult[];
  validLinks: number;
  fixableLinks: number;
}

/**
 * Link fix result
 * @public
 */
export interface FixResult {
  link: CodeLink | DocLink;
  originalText: string;
  fixedText: string;
  applied: boolean;
}
