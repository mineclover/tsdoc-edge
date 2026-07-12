/**
 * TSDoc Edge Configuration Types
 *
 * @remarks
 * Defines the structure of .tsdoc.config.json and related configuration types.
 *
 * @public
 */

/**
 * Main configuration interface for tsdoc-edge project
 *
 * @doc [[TsdocEdgeConfig]]
 * @public
 */
export interface TsdocEdgeConfig {
  /**
   * Project metadata
   */
  project: ProjectConfig;

  /**
   * Storage paths configuration
   */
  paths: PathsConfig;

  /**
   * Fold/unfold system configuration
   */
  fold?: FoldConfig;

  /**
   * Validation rules configuration
   */
  validation?: ValidationConfig;

  /**
   * Generator options
   */
  generator?: GeneratorConfig;

  /**
   * Pre-commit hook configuration
   */
  preCommit?: PreCommitConfig;

  /**
   * Link checking configuration
   */
  linkCheck?: LinkCheckConfig;

  /**
   * Document management configuration
   */
  documentManagement?: DocumentManagementConfig;

  /**
   * Authored project-spec roots and location-aware naming policy.
   * @remarks P4.2 consumes the naming policy; P4.4 makes the roots executable spec input.
   */
  specGovernance?: SpecGovernanceConfig;
}

/**
 * Project metadata configuration
 *
 * @public
 */
export interface ProjectConfig {
  /**
   * Project name
   */
  name: string;

  /**
   * Project version
   */
  version: string;

  /**
   * Root directory (relative to config file)
   * @defaultValue "."
   */
  rootDir?: string;

  /**
   * Source directories to scan
   * @defaultValue ["src"]
   */
  srcDirs?: string[];

  /**
   * Entry points for analysis and documentation
   * These are the main files to start analysis from
   * @defaultValue ["src/index.ts"]
   */
  entryPoints?: string[];
}

/**
 * Storage paths configuration
 *
 * @public
 */
export interface PathsConfig {
  /**
   * Directory for storing folded comments (Markdown files)
   * @defaultValue ".tsdoc-comments"
   */
  commentsDir: string;

  /**
   * SQLite database file path
   * @defaultValue ".tsdoc.db"
   */
  databasePath: string;

  /**
   * JSONL data export directory
   * @defaultValue "docs/data"
   */
  jsonlDir: string;

  /**
   * Output directory for generated documentation
   * @defaultValue "docs/output"
   */
  outputDir?: string;

  /**
   * Directory for auto-generated documents (scan command)
   * @defaultValue "docs/generated"
   */
  generatedDir?: string;

  /**
   * Directory for analysis reports (stats, health, etc.)
   * @defaultValue ".tsdoc/reports"
   */
  reportsDir?: string;

  /**
   * Directory for generated Mermaid diagrams
   * @defaultValue ".tsdoc/diagrams"
   */
  diagramsDir?: string;
}

/**
 * Fold/unfold system configuration
 *
 * @public
 */
export interface FoldConfig {
  /**
   * Enable fold/unfold system
   * @defaultValue true
   */
  enabled?: boolean;

  /**
   * Auto-export on parse
   * @defaultValue false
   */
  autoExport?: boolean;

  /**
   * Patterns to exclude from folding (glob patterns)
   * @defaultValue []
   */
  excludePatterns?: string[];
}

/**
 * Validation rules configuration
 *
 * @public
 */
export interface ValidationConfig {
  /**
   * Enable strict mode validation
   * @defaultValue false
   */
  strictMode?: boolean;

  /**
   * Minimum connectivity score (0-100)
   * @defaultValue 70
   */
  minConnectivityScore?: number;

  /**
   * Rules to enable/disable
   */
  rules?: {
    [ruleName: string]: 'error' | 'warning' | 'info' | 'off';
  };

  /**
   * Directories to exclude from validation (e.g., examples, architecture)
   * These directories are still indexed but not validated
   */
  excludeDirs?: string[];

  /**
   * Directories to skip no_code_impl check (e.g., concepts, guides, workflows)
   * Documents in these directories won't trigger "no code implementation" warnings
   * @defaultValue ["concepts", "guides", "workflows", "relationships"]
   */
  skipCodeImplDirs?: string[];
}

/**
 * Generator options configuration
 *
 * @public
 */
export interface GeneratorConfig {
  /**
   * Markdown template type
   * @defaultValue "enhanced"
   */
  template?: 'basic' | 'enhanced' | 'strict';

  /**
   * Include private symbols in output
   * @defaultValue false
   */
  includePrivate?: boolean;

  /**
   * Include internal symbols in output
   * @defaultValue false
   */
  includeInternal?: boolean;
}

/**
 * Pre-commit hook configuration
 *
 * @public
 */
export interface PreCommitConfig {
  /**
   * Enable pre-commit hook
   * @defaultValue false
   */
  enabled?: boolean;

  /**
   * Minimum completeness threshold (0-100)
   * Files below this threshold will fail the commit
   * @defaultValue 50
   */
  threshold?: number;

  /**
   * Warning threshold (0-100)
   * Files below this threshold will show warnings but allow commit
   * @defaultValue 30
   */
  warningThreshold?: number;

  /**
   * Fail on missing enhanced docs
   * If true, commits will fail if changed files have no enhanced docs
   * @defaultValue false
   */
  failOnMissing?: boolean;

  /**
   * Check only modified symbols
   * If true, only checks symbols in modified lines (requires git)
   * @defaultValue false
   */
  modifiedOnly?: boolean;
}

/**
 * Link checking configuration
 *
 * @public
 */
export interface LinkCheckConfig {
  /**
   * Link types to check
   * @defaultValue ["dependency", "relatedProblem", "symbol", "file"]
   */
  checkTypes?: Array<'dependency' | 'relatedProblem' | 'symbol' | 'file'>;

  /**
   * External dependencies to exclude from validation
   * These are known external modules that should not be treated as broken links
   * @defaultValue ["fs", "path", "typescript", "node:*"]
   */
  externalModules?: string[];

  /**
   * Custom patterns to exclude from validation (glob patterns)
   * @defaultValue []
   */
  excludePatterns?: string[];

  /**
   * Enable typo suggestions
   * @defaultValue true
   */
  enableSuggestions?: boolean;

  /**
   * Maximum suggestion distance (Levenshtein distance)
   * @defaultValue 3
   */
  maxSuggestionDistance?: number;

  /**
   * Fail on broken links (exit with non-zero code)
   * @defaultValue false
   */
  failOnBroken?: boolean;
}

/**
 * Document management configuration
 *
 * @public
 */
export interface DocumentManagementConfig {
  /**
   * Enable document management system
   * @defaultValue false
   */
  enabled?: boolean;

  /**
   * Directories containing TSDoc Edge managed documents
   * Only files in these directories will be indexed and validated
   * @defaultValue ["docs/managed"]
   */
  managedDirs?: string[];

  /**
   * Directories to explicitly exclude from document management
   * Useful for examples, templates, and reference materials
   * @defaultValue ["docs/examples", "docs/templates"]
   */
  excludeDirs?: string[];

  /**
   * Require YAML frontmatter for managed documents
   * If true, only files with "tsdoc: managed" frontmatter will be processed
   * @defaultValue false
   */
  requireFrontmatter?: boolean;

  /**
   * Strict mode: fail if managed documents lack required frontmatter
   * @defaultValue false
   */
  strictMode?: boolean;

  /**
   * Ignore code blocks when parsing document symbols
   * Prevents example code from being treated as actual references
   * @defaultValue true
   */
  ignoreCodeBlocks?: boolean;
}

/** Canonical locations and naming policy for authored project specifications. */
export interface SpecGovernanceConfig {
  /** Workspace-relative Markdown roots reserved for authored project specifications. */
  authoredSpecDirs?: string[];
  /** Ordered naming rules. The first matching rule wins. */
  naming?: NamingConventionConfig;
  /** Ordered TSDoc requirements evaluated against loader-produced enrichment. */
  tsdoc?: TsdocConventionConfig;
  /** Exact retained convention check selected for saved LSP diagnostics. */
  lspSavedHistory?: SavedConventionHistoryConfig;
}

/** LSP never infers a latest record; it opens this exact retained history ID. */
export interface SavedConventionHistoryConfig {
  readonly databasePath: string;
  readonly historyId: string;
}

export interface NamingConventionConfig {
  readonly contractVersion: '1.0';
  readonly rules: readonly NamingConventionRule[];
}

/** A location-aware convention for a filename or canonical graph symbol. */
export interface NamingConventionRule {
  readonly id: string;
  /** Workspace-relative POSIX glob, evaluated against the source file location. */
  readonly path: string;
  /** Whether path matching treats ASCII case as significant. */
  readonly pathCase?: 'sensitive' | 'insensitive';
  readonly target: 'file' | 'symbol';
  /** Optional canonical node kinds for symbol rules. */
  readonly kinds?: readonly string[];
  /** Optional exported/non-exported filter for symbol rules. */
  readonly exported?: boolean;
  readonly style: 'pascal' | 'camel' | 'snake' | 'kebab';
  /** Severity used when this rule produces a convention gate finding. */
  readonly severity?: 'error' | 'warning' | 'info';
  /** Preserve acronym runs (for example HTTPServer) or require normalized word casing. */
  readonly acronym?: 'preserve' | 'normalize';
  /** Permit one leading underscore before applying the selected case style. */
  readonly allowLeadingUnderscore?: boolean;
}

/** A deliberately small first consumer of the immutable TSDoc enrichment plane. */
export interface TsdocConventionConfig {
  readonly contractVersion: '1.0';
  readonly rules: readonly TsdocConventionRule[];
}

/** Require one or more exact TSDoc block tags for matching canonical symbols. */
export interface TsdocConventionRule {
  readonly id: string;
  /** Workspace-relative POSIX glob, evaluated against the canonical node file. */
  readonly path: string;
  readonly pathCase?: 'sensitive' | 'insensitive';
  readonly kinds?: readonly string[];
  readonly exported?: boolean;
  readonly requiredTags: readonly string[];
  readonly severity?: 'error' | 'warning' | 'info';
}

/**
 * Default configuration values
 *
 * @public
 */
export const DEFAULT_CONFIG: TsdocEdgeConfig = {
  project: {
    name: 'my-project',
    version: '1.0.0',
    rootDir: '.',
    srcDirs: ['src'],
  },
  paths: {
    commentsDir: '.tsdoc-comments',
    databasePath: '.tsdoc.db',
    jsonlDir: 'docs/data',
    outputDir: 'docs/output',
    generatedDir: 'docs/generated',
    reportsDir: '.tsdoc/reports',
  },
  fold: {
    enabled: true,
    autoExport: false,
    excludePatterns: [],
  },
  validation: {
    strictMode: false,
    minConnectivityScore: 70,
    rules: {},
    skipCodeImplDirs: ['concepts', 'guides', 'workflows', 'relationships'],
  },
  generator: {
    template: 'enhanced',
    includePrivate: false,
    includeInternal: false,
  },
  preCommit: {
    enabled: false,
    threshold: 50,
    warningThreshold: 30,
    failOnMissing: false,
    modifiedOnly: false,
  },
  linkCheck: {
    checkTypes: ['dependency', 'relatedProblem', 'symbol', 'file'],
    externalModules: ['fs', 'path', 'typescript', 'node:*', '@types/*'],
    excludePatterns: [],
    enableSuggestions: true,
    maxSuggestionDistance: 3,
    failOnBroken: false,
  },
  documentManagement: {
    enabled: false,
    managedDirs: ['docs/managed'],
    excludeDirs: ['docs/examples', 'docs/templates'],
    requireFrontmatter: false,
    strictMode: false,
    ignoreCodeBlocks: true,
  },
  specGovernance: {
    authoredSpecDirs: ['managed/specs'],
    naming: {
      contractVersion: '1.0',
      rules: [],
    },
  },
};

/**
 * Config file name
 *
 * @public
 */
export const CONFIG_FILE_NAME = '.tsdoc.config.json';
