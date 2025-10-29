/**
 * Feature document types
 * @packageDocumentation
 * @responsibility Define structure for feature documentation
 */

/**
 * Feature document metadata
 * @public
 */
export interface FeatureDocument {
  /**
   * Unique feature ID
   */
  id: string;

  /**
   * Feature title
   */
  title: string;

  /**
   * Feature description
   */
  description: string;

  /**
   * Path to markdown file
   */
  filePath: string;

  /**
   * Related symbols (referenced in the document)
   */
  relatedSymbols: string[];

  /**
   * Tags for categorization
   */
  tags: string[];

  /**
   * Author
   */
  author?: string;

  /**
   * Created date
   */
  createdAt: string;

  /**
   * Last updated
   */
  updatedAt: string;

  /**
   * Status
   */
  status: 'draft' | 'review' | 'approved' | 'deprecated';
}

/**
 * Symbol reference in feature document
 * Syntax: {symbolId} or {@symbol symbolId}
 * @public
 */
export interface SymbolReference {
  /**
   * Symbol ID being referenced
   */
  symbolId: string;

  /**
   * Position in document (line number)
   */
  line: number;

  /**
   * Context (surrounding text)
   */
  context: string;
}

/**
 * Feature document index
 * @public
 */
export interface FeatureIndex {
  /**
   * Index version
   */
  version: string;

  /**
   * All feature documents
   */
  features: FeatureDocument[];

  /**
   * Last updated
   */
  lastUpdated: string;
}
