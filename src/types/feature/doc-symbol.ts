/**
 * Document symbol types for [[]] notation
 * @packageDocumentation
 */

/**
 * Document symbol type
 * @public
 */
export type DocumentSymbolType = 'primary' | 'auxiliary' | 'reference';

/** Explicit disposition for a document's code implementation connection. */
export type CodeImplementationDisposition = 'required' | 'not-applicable';

/**
 * Document symbol definition
 * @public
 */
export interface DocumentSymbol {
  /** Symbol name (without [[]]) */
  name: string;

  /** Definition type */
  type: DocumentSymbolType;

  /** File path */
  filePath: string;

  /** Line number */
  line: number;

  /** Heading level (1-6 for headings, 0 for inline) */
  level: number;

  /** Content/description (optional) */
  content?: string;

  /** Section name (for #Section references) */
  section?: string;

  /** Explicit frontmatter disposition for code implementation validation. */
  codeImplementation?: CodeImplementationDisposition;
}

/**
 * Parsed document symbols from a single file
 * @public
 */
export interface ParsedDocSymbols {
  /** File path */
  filePath: string;

  /** Primary definition (H1 [[Symbol]]) */
  primary?: DocumentSymbol;

  /** Auxiliary definitions (H2+ [[Symbol]]) */
  auxiliaries: DocumentSymbol[];

  /** Inline references */
  references: DocumentSymbol[];

  /** Code references in this doc */
  codeReferences: CodeReference[];

  /** Symbol footnote references ([^sym-XXX] or [^SymbolName]) */
  symbolFootnoteRefs: SymbolFootnoteRef[];

  /** Source file path from frontmatter `source` or a **Source**: pattern */
  sourceFilePath?: string;
}

/**
 * Code reference from document
 * @public
 */
export interface CodeReference {
  /** Link text */
  text: string;

  /** Target file path */
  targetFile: string;

  /** Target symbol name */
  targetSymbol?: string;

  /** Target member */
  targetMember?: string;

  /** Line in document */
  line: number;
}

/**
 * Symbol footnote reference
 * Syntax: [^sym-XXX] or [^SymbolName]
 * @public
 */
export interface SymbolFootnoteRef {
  /** Footnote identifier (e.g., "sym-001", "ConventionValidator") */
  identifier: string;

  /** Line in document where used */
  line: number;

  /** Is this an ID reference (sym-XXX) or name reference */
  isIdRef: boolean;
}

/**
 * Code connection to document symbol
 * @public
 */
export interface CodeConnection {
  /** Code symbol name */
  codeSymbol: string;

  /** Code file path */
  filePath: string;

  /** Line number in code */
  line: number;

  /** Target document symbol */
  docSymbol: string;

  /** Section (optional, from [[Symbol#Section]]) */
  section?: string;
}

/**
 * Document symbol registry
 * @public
 */
export interface DocumentSymbolRegistry {
  /** Primary definitions (symbol name → definition) */
  definitions: Map<string, DocumentSymbol>;

  /** Auxiliary definitions (symbol name → definitions[]) */
  auxiliaries: Map<string, DocumentSymbol[]>;

  /** All references (symbol name → references[]) */
  references: Map<string, DocumentSymbol[]>;

  /** Code connections (doc symbol → code connections[]) */
  codeConnections: Map<string, CodeConnection[]>;
}

/**
 * Backlink entry
 * @public
 */
export interface Backlink {
  /** Type of backlink */
  type: 'document' | 'code';

  /** Source (symbol name or code symbol) */
  source: string;

  /** File path */
  filePath: string;

  /** Line number */
  line: number;

  /** Section (optional) */
  section?: string;
}

/**
 * Document symbol validation result
 * @public
 */
export interface DocSymbolValidation {
  /** Is valid */
  valid: boolean;

  /** Validation errors */
  errors: DocSymbolError[];

  /** Warnings */
  warnings: DocSymbolWarning[];
}

/**
 * Document symbol error
 * @public
 */
export interface DocSymbolError {
  /** Error type */
  type: 'duplicate_definition' | 'orphaned_auxiliary' | 'missing_primary' | 'multiple_primaries';

  /** Symbol name */
  symbolName: string;

  /** File path */
  filePath: string;

  /** Line number */
  line: number;

  /** Error message */
  message: string;

  /** Conflicting location (for duplicates) */
  conflictWith?: {
    filePath: string;
    line: number;
  };
}

/**
 * Document symbol warning
 * @public
 */
export interface DocSymbolWarning {
  /** Warning type */
  type: 'unused_definition' | 'many_references' | 'no_code_impl';

  /** Symbol name */
  symbolName: string;

  /** File path */
  filePath: string;

  /** Warning message */
  message: string;

  /** Count (for statistics) */
  count?: number;
}
