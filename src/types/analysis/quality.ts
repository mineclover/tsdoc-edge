/**
 * Types for code analysis and health checking
 * @packageDocumentation
 */

/**
 * Symbol documentation quality score
 */
export interface DocQualityScore {
  /** Symbol identifier */
  symbolId: string;
  /** Symbol name */
  symbolName: string;
  /** Symbol type (class, function, method, etc.) */
  symbolType: string;
  /** File path */
  filePath: string;
  /** Line number */
  line: number;
  /** Is public API */
  isPublic: boolean;
  /** Has any documentation */
  hasDoc: boolean;
  /** Has summary */
  hasSummary: boolean;
  /** Has @param tags for all parameters */
  hasCompleteParams: boolean;
  /** Has @returns tag */
  hasReturns: boolean;
  /** Has examples */
  hasExamples: boolean;
  /** Has custom tags (@responsibility, @contract, etc.) */
  hasCustomTags: boolean;
  /** Overall quality score (0-100) */
  qualityScore: number;
  /** Missing documentation items */
  missing: string[];
  /** Parent symbol (for nested symbols) */
  parentSymbol?: string;
  /** Child symbols */
  children: DocQualityScore[];
}

/**
 * Test coverage information
 */
export interface TestCoverageInfo {
  /** Source file path */
  sourceFile: string;
  /** Test file path (if exists) */
  testFile?: string;
  /** Has test file */
  hasTest: boolean;
  /** Number of symbols in source */
  symbolCount: number;
  /** Estimated test coverage percentage */
  estimatedCoverage: number;
}

/**
 * Code health metrics
 */
export interface CodeHealthMetrics {
  /** Total files analyzed */
  totalFiles: number;
  /** Total symbols analyzed */
  totalSymbols: number;
  /** Public symbols count */
  publicSymbols: number;
  /** Documented symbols count */
  documentedSymbols: number;
  /** Fully documented symbols (with params, returns, examples) */
  fullyDocumentedSymbols: number;
  /** Files with tests */
  filesWithTests: number;
  /** Files without tests */
  filesWithoutTests: number;
  /** Average documentation quality score */
  avgQualityScore: number;
  /** Overall health score (0-100) */
  healthScore: number;
}

/**
 * Improvement suggestion
 */
export interface ImprovementSuggestion {
  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Category */
  category: 'documentation' | 'testing' | 'architecture';
  /** File path */
  filePath: string;
  /** Symbol name (optional) */
  symbolName?: string;
  /** Issue description */
  issue: string;
  /** Suggested action */
  suggestion: string;
  /** Estimated effort */
  effort: 'small' | 'medium' | 'large';
}

/**
 * Analysis report
 *
 * @doc [[AnalysisReport]]
 */
export interface AnalysisReport {
  /** Analysis timestamp */
  timestamp: string;
  /** Project path */
  projectPath: string;
  /** Health metrics */
  metrics: CodeHealthMetrics;
  /** Documentation quality scores */
  docScores: DocQualityScore[];
  /** Test coverage information */
  testCoverage: TestCoverageInfo[];
  /** Improvement suggestions */
  suggestions: ImprovementSuggestion[];
  /** Top issues (worst quality scores) */
  topIssues: DocQualityScore[];
  /** Files needing attention */
  filesNeedingAttention: string[];
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  /** Path to analyze */
  path: string;
  /** Include child symbols (methods, properties) */
  includeChildren?: boolean;
  /** Minimum quality score threshold */
  minQualityScore?: number;
  /** Include private symbols */
  includePrivate?: boolean;
  /** Generate suggestions */
  generateSuggestions?: boolean;
}
