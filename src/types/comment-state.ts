/**
 * Type definitions for comment fold/unfold system
 * @packageDocumentation
 */

/**
 * Comment state (expanded or collapsed)
 *
 * @public
 */
export type CommentStatus = 'expanded' | 'collapsed';

/**
 * Location of a comment in source code
 *
 * @public
 */
export interface CommentLocation {
  /**
   * File path relative to project root
   */
  filePath: string;

  /**
   * Line number (1-based)
   */
  line: number;

  /**
   * Column number (0-based)
   */
  column: number;

  /**
   * End line number (1-based)
   */
  endLine: number;
}

/**
 * State of a single comment
 *
 * @public
 */
export interface CommentState {
  /**
   * Unique identifier for the comment
   */
  id: string;

  /**
   * Content hash for accurate matching
   * SHA-256 hash of fullComment content
   */
  contentHash: string;

  /**
   * Location in source code
   */
  location: CommentLocation;

  /**
   * Symbol name (function, class, method name)
   */
  symbol: string;

  /**
   * Current status (expanded or collapsed)
   */
  status: CommentStatus;

  /**
   * Full comment text (original)
   */
  fullComment: string;

  /**
   * Collapsed form (summary only)
   */
  collapsedComment: string;

  /**
   * Last updated timestamp
   */
  lastUpdated: string;
}

/**
 * State storage for a single file
 *
 * @public
 */
export interface FileCommentState {
  /**
   * File path relative to project root
   */
  filePath: string;

  /**
   * Last updated timestamp
   */
  lastUpdated: string;

  /**
   * Array of comment states in this file
   */
  comments: CommentState[];
}

/**
 * Complete state storage for all files
 *
 * @public
 */
export interface StateStorage {
  /**
   * Format version
   */
  version: string;

  /**
   * Last updated timestamp
   */
  lastUpdated: string;

  /**
   * Map of file path to file comment state
   */
  files: {
    [filePath: string]: FileCommentState;
  };
}

/**
 * Options for collapsing comments
 *
 * @public
 */
export interface CollapseOptions {
  /**
   * Pattern to match symbols (regex or glob)
   */
  pattern?: string;

  /**
   * Whether to collapse private members
   */
  privateOnly?: boolean;

  /**
   * Whether to collapse public members
   */
  publicOnly?: boolean;

  /**
   * Minimum comment length to collapse (lines)
   */
  minLines?: number;
}

/**
 * Options for expanding comments
 *
 * @public
 */
export interface ExpandOptions {
  /**
   * Pattern to match symbols (regex or glob)
   */
  pattern?: string;

  /**
   * Whether to expand all comments
   */
  all?: boolean;
}

/**
 * Result of export operation
 *
 * @public
 */
export interface ExportResult {
  /**
   * Number of files exported
   */
  filesExported: number;

  /**
   * Number of comments exported
   */
  commentsExported: number;

  /**
   * Output directory path
   */
  outputDir: string;

  /**
   * Array of exported file paths
   */
  exportedFiles: string[];
}

/**
 * Result of import operation
 *
 * @public
 */
export interface ImportResult {
  /**
   * Number of files updated
   */
  filesUpdated: number;

  /**
   * Number of comments updated
   */
  commentsUpdated: number;

  /**
   * Array of updated file paths
   */
  updatedFiles: string[];

  /**
   * Array of errors encountered
   */
  errors: string[];
}

/**
 * Status summary for a file
 *
 * @public
 */
export interface FileStatusSummary {
  /**
   * File path
   */
  filePath: string;

  /**
   * Total number of comments
   */
  totalComments: number;

  /**
   * Number of collapsed comments
   */
  collapsedComments: number;

  /**
   * Number of expanded comments
   */
  expandedComments: number;

  /**
   * Last updated timestamp
   */
  lastUpdated: string;
}
