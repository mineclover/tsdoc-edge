/**
 * Statistics and tracking types
 * @packageDocumentation
 * @responsibility Define types for codebase statistics and tracking
 */

/**
 * Importance level for symbols
 * @public
 */
export type ImportanceLevel = 'critical' | 'important' | 'normal';

/**
 * Criteria for determining symbol importance
 * @public
 */
export interface ImportanceCriteria {
  /**
   * Importance level
   */
  level: ImportanceLevel;

  /**
   * Reasons for this classification
   * @example ['public API', 'has contract', 'exported']
   */
  reasons: string[];
}

/**
 * Statistics for detectable symbols
 * @public
 */
export interface DetectableStats {
  /**
   * Total number of symbols detected in code
   */
  total: number;

  /**
   * Number of symbols that are documented
   */
  documented: number;

  /**
   * Number of symbols that are not documented
   */
  undocumented: number;

  /**
   * Documentation rate as percentage (0-100)
   */
  rate: number;
}

/**
 * Statistics grouped by importance level
 * @public
 */
export interface ImportanceStats {
  /**
   * Critical symbols (must protect)
   */
  critical: DetectableStats;

  /**
   * Important symbols (should protect)
   */
  important: DetectableStats;

  /**
   * Normal symbols (optional)
   */
  normal: DetectableStats;
}

/**
 * Change delta between two statistics
 * @public
 */
export interface StatsDelta {
  /**
   * Change in total count
   */
  total: number;

  /**
   * Change in documented count
   */
  documented: number;

  /**
   * Change in undocumented count
   */
  undocumented: number;

  /**
   * Change in rate (percentage points)
   */
  rate: number;
}

/**
 * Comparison between two statistics
 * @public
 */
export interface StatsComparison {
  /**
   * Previous statistics
   */
  before: DetectableStats;

  /**
   * Current statistics
   */
  after: DetectableStats;

  /**
   * Change delta
   */
  delta: StatsDelta;

  /**
   * Whether there are warnings
   */
  hasWarning: boolean;

  /**
   * Warning messages
   */
  warnings: string[];
}

/**
 * Symbol documentation change
 * @public
 */
export interface SymbolChange {
  /**
   * Symbol ID
   */
  symbolId: string;

  /**
   * Symbol name
   */
  symbolName: string;

  /**
   * Symbol importance
   */
  importance: ImportanceLevel;

  /**
   * Change type
   */
  changeType: 'added' | 'removed' | 'doc-added' | 'doc-removed' | 'modified';

  /**
   * File path
   */
  filePath: string;
}

/**
 * Trackable statistics snapshot
 *
 * @doc [[TrackableStatistics]]
 * @public
 */
export interface TrackableStatistics {
  /**
   * Analysis timestamp
   */
  timestamp: string;

  /**
   * Project path
   */
  projectPath: string;

  /**
   * Overall statistics
   */
  overall: DetectableStats;

  /**
   * Statistics by importance level
   */
  byImportance: ImportanceStats;

  /**
   * Symbol importance map (symbolId -> criteria)
   */
  symbolImportance: Record<string, ImportanceCriteria>;

  /**
   * Comparison with previous run (if available)
   */
  comparison?: {
    /**
     * Previous snapshot timestamp
     */
    previousTimestamp: string;

    /**
     * Overall comparison
     */
    overall: StatsComparison;

    /**
     * Critical symbols comparison
     */
    critical: StatsComparison;

    /**
     * Important symbols comparison
     */
    important: StatsComparison;

    /**
     * Normal symbols comparison
     */
    normal: StatsComparison;

    /**
     * Detailed symbol changes
     */
    changes: SymbolChange[];
  };
}

/**
 * Statistics history entry
 * @public
 */
export interface StatsHistoryEntry {
  /**
   * Snapshot timestamp
   */
  timestamp: string;

  /**
   * Overall statistics
   */
  overall: DetectableStats;

  /**
   * Critical symbols statistics
   */
  critical: DetectableStats;

  /**
   * Important symbols statistics
   */
  important: DetectableStats;

  /**
   * Normal symbols statistics
   */
  normal: DetectableStats;

  /**
   * Symbol IDs by importance (for detailed tracking)
   */
  symbolIds: {
    critical: string[];
    important: string[];
    normal: string[];
  };
}

/**
 * Statistics history storage
 * @public
 */
export interface StatsHistory {
  /**
   * Format version
   */
  version: string;

  /**
   * Project path
   */
  projectPath: string;

  /**
   * History entries (newest first)
   */
  entries: StatsHistoryEntry[];
}

/**
 * Warning conditions for statistics comparison
 * @public
 */
export interface WarningConditions {
  /**
   * Critical symbols documentation decreased
   */
  criticalDocDecrease: boolean;

  /**
   * Critical symbols were removed
   */
  criticalSymbolLoss: boolean;

  /**
   * Overall documentation rate dropped significantly (>5%)
   */
  significantRateDropOverall: boolean;

  /**
   * Critical documentation rate dropped (>1%)
   */
  significantRateDropCritical: boolean;
}

/**
 * Statistics collection options
 * @public
 */
export interface StatsCollectionOptions {
  /**
   * Path to analyze
   */
  path: string;

  /**
   * Compare with previous snapshot
   */
  compare?: boolean;

  /**
   * Save to history
   */
  saveHistory?: boolean;

  /**
   * History file path
   * @defaultValue ".tsdoc-stats-history.json"
   */
  historyPath?: string;

  /**
   * Show warnings only
   */
  warningsOnly?: boolean;
}
