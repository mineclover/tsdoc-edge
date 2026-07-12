/**
 * Specification document types
 * @packageDocumentation
 * @responsibility Define types for specification management
 */

/**
 * Specification document status
 * @public
 */
export type SpecStatus = 'draft' | 'review' | 'approved' | 'active' | 'deprecated' | 'archived';

/**
 * Specification document metadata
 * @public
 */
export interface SpecMetadata {
  /** Document symbol name */
  primary: string;

  /** Document version */
  version: string;

  /** Current status */
  status: SpecStatus;

  /** Document category */
  category: string;

  /** Tags for classification */
  tags: string[];

  /** Last updated timestamp */
  lastUpdated: string;

  /** Authors (optional) */
  authors?: string[];

  /** Reviewers (optional) */
  reviewers?: string[];
}

/**
 * Required sections for specification documents
 * @public
 */
export interface SpecRequirements {
  /** Required section headings */
  requiredSections: string[];

  /** Recommended section headings */
  recommendedSections: string[];

  /** Minimum number of usage scenarios */
  minScenarios: number;

  /** Minimum number of code references */
  minCodeReferences: number;

  /** Minimum number of examples */
  minExamples: number;
}

/**
 * Specification completeness validation result
 * @public
 */
export interface SpecCompletenessResult {
  /** File path */
  filePath: string;

  /** Overall completeness score (0-100) - DEPRECATED: Use designScore/implementationScore instead */
  score: number;

  /** Design quality score (0-100) - Measured without code */
  designScore: number;

  /** Implementation quality score (0-100) - Requires code connections */
  implementationScore: number;

  /** Is spec complete */
  isComplete: boolean;

  /** Breakdown by category */
  breakdown: {
    /** Design-related metrics (measured without code) */
    design: {
      structure: {
        score: number;
        requiredSections: {
          found: string[];
          missing: string[];
        };
        recommendedSections: {
          found: string[];
          missing: string[];
        };
      };
      scenarios: {
        score: number;
        count: number;
        required: number;
      };
      conceptReferences: {
        score: number;
        count: number;
      };
    };
    /** Implementation-related metrics (requires code) */
    implementation: {
      codeReferences: {
        score: number;
        count: number;
        required: number;
      };
      examples: {
        score: number;
        count: number;
        required: number;
      };
    };
  };

  /** Issues found */
  issues: Array<{
    type:
      | 'missing_section'
      | 'insufficient_scenarios'
      | 'insufficient_refs'
      | 'insufficient_examples';
    message: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * Content similarity detection result
 * @public
 */
export interface ContentSimilarity {
  /** First file */
  file1: string;

  /** Second file */
  file2: string;

  /** Similarity score (0-1) */
  similarity: number;

  /** Overlapping sections */
  overlappingSections: Array<{
    section: string;
    similarity: number;
  }>;

  /** Suggestion */
  suggestion: 'merge' | 'cross-reference' | 'keep-separate';

  /** Reason for suggestion */
  reason: string;
}

/**
 * Unused document detection result
 * @public
 */
export interface UnusedDocument {
  /** File path */
  filePath: string;

  /** Reason for being unused */
  reason: 'no-references' | 'no-code-connections' | 'deprecated' | 'stale-draft';

  /** Last modified date */
  lastModified: string;

  /** Number of days since last modification */
  daysSinceModified: number;

  /** Reference count */
  referenceCount: number;

  /** Code connection count */
  codeConnectionCount: number;

  /** Suggested action */
  suggestedAction: 'archive' | 'delete' | 'review' | 'complete';
}

/**
 * Specification status transition
 * @public
 */
export interface SpecStatusTransition {
  /** Current status */
  from: SpecStatus;

  /** Target status */
  to: SpecStatus;

  /** Is transition valid */
  valid: boolean;

  /** Validation checks required */
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}
