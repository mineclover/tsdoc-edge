/**
 * Feature document types
 *
 * @packageDocumentation
 * @doc [[FeatureTypes]]
 * @responsibility Define structure for feature documentation
 * @context Authored feature document metadata, symbol reference positions, and feature index persistence
 * @functionality Defines FeatureDocument, SymbolReference, and FeatureIndex contracts
 */

/**
 * Feature document metadata
 * @doc [[FeatureTypes]]
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
 * Syntax: `{symbolId}` or `{@link SymbolName}` / `[[Checkpoint]]`
 * @doc [[FeatureTypes]]
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
 * @doc [[FeatureTypes]]
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
