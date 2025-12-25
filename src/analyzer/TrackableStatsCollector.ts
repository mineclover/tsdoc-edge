/**
 * Collects trackable statistics from codebase
 * @packageDocumentation
 * @responsibility Collect and organize statistics for tracking
 */

import type { Symbol } from '../types/graph';
import type { DetectableStats, ImportanceCriteria, TrackableStatistics } from '../types/analysis';
import { ImportanceClassifier } from './ImportanceClassifier';

/**
 * Collects statistics that can be tracked over time
 *
 * @doc [[TrackableStatsCollector]]
 * @public
 */
export class TrackableStatsCollector {
  private classifier: ImportanceClassifier;

  constructor() {
    this.classifier = new ImportanceClassifier();
  }

  /**
   * Collect statistics from symbols
   *
   * @param projectPath - Project path
   * @param symbols - All symbols in the codebase
   * @param connectionCounts - Map of symbol ID to connection count
   * @returns Trackable statistics snapshot
   */
  collect(
    projectPath: string,
    symbols: Symbol[],
    connectionCounts: Map<string, number> = new Map()
  ): TrackableStatistics {
    // Classify all symbols
    const importanceMap = this.classifier.classifyAll(symbols, connectionCounts);

    // Group by importance
    const grouped = this.classifier.groupByImportance(symbols, importanceMap);

    // Calculate statistics for each group
    const overall = this.calculateStats(symbols);
    const critical = this.calculateStats(grouped.critical);
    const important = this.calculateStats(grouped.important);
    const normal = this.calculateStats(grouped.normal);

    // Convert map to record for JSON serialization
    const symbolImportance: Record<string, ImportanceCriteria> = {};
    for (const [id, criteria] of importanceMap.entries()) {
      symbolImportance[id] = criteria;
    }

    return {
      timestamp: new Date().toISOString(),
      projectPath,
      overall,
      byImportance: {
        critical,
        important,
        normal,
      },
      symbolImportance,
    };
  }

  /**
   * Calculate statistics for a group of symbols
   *
   * @param symbols - Symbols to analyze
   * @returns Detectable statistics
   */
  private calculateStats(symbols: Symbol[]): DetectableStats {
    const total = symbols.length;
    const documented = symbols.filter((s) => this.isDocumented(s)).length;
    const undocumented = total - documented;
    const rate = total > 0 ? (documented / total) * 100 : 0;

    return {
      total,
      documented,
      undocumented,
      rate: Number.parseFloat(rate.toFixed(1)),
    };
  }

  /**
   * Check if a symbol is documented
   *
   * @param symbol - Symbol to check
   * @returns True if documented
   */
  private isDocumented(symbol: Symbol): boolean {
    // Has summary
    if (symbol.summary && symbol.summary.trim().length > 0) {
      return true;
    }

    // Has contract
    if (symbol.contract) {
      return true;
    }

    // Has responsibility
    if (symbol.responsibility) {
      return true;
    }

    return false;
  }

  /**
   * Get symbols by importance level
   *
   * @param symbols - All symbols
   * @param connectionCounts - Connection counts
   * @param level - Importance level
   * @returns Filtered symbols
   */
  getSymbolsByImportance(
    symbols: Symbol[],
    connectionCounts: Map<string, number>,
    level: 'critical' | 'important' | 'normal'
  ): Symbol[] {
    const importanceMap = this.classifier.classifyAll(symbols, connectionCounts);
    return this.classifier.filterByLevel(symbols, importanceMap, level);
  }

  /**
   * Calculate overall statistics summary
   *
   * @param stats - Trackable statistics
   * @returns Summary string
   */
  summarize(stats: TrackableStatistics): string {
    const lines: string[] = [];

    lines.push('📊 Documentation Tracking');
    lines.push('═'.repeat(50));
    lines.push('');

    // Overall
    lines.push(`전체 감지 대상     ${stats.overall.total} symbols`);
    lines.push(`  문서화됨         ${stats.overall.documented} symbols (${stats.overall.rate}%)`);
    lines.push(
      `  미문서화         ${stats.overall.undocumented} symbols (${(100 - stats.overall.rate).toFixed(1)}%)`
    );
    lines.push('');
    lines.push('─'.repeat(50));
    lines.push('');

    // Critical
    const { critical, important, normal } = stats.byImportance;

    lines.push('🔴 Critical (절대 보호)');
    lines.push(`  감지 대상        ${critical.total} symbols (Public API, Exported)`);
    lines.push(
      `  문서화됨         ${critical.documented} symbols (${critical.rate}%) ${critical.rate >= 95 ? '✅' : critical.rate >= 80 ? '⚠️' : '❌'}`
    );
    lines.push(`  미문서화         ${critical.undocumented} symbols`);
    lines.push('');

    // Important
    lines.push('🟡 Important (권장 보호)');
    lines.push(`  감지 대상        ${important.total} symbols (Structures, High connectivity)`);
    lines.push(`  문서화됨         ${important.documented} symbols (${important.rate}%)`);
    lines.push(`  미문서화         ${important.undocumented} symbols`);
    lines.push('');

    // Normal
    lines.push('⚪ Normal (선택적)');
    lines.push(`  감지 대상        ${normal.total} symbols (Private, Helpers)`);
    lines.push(`  문서화됨         ${normal.documented} symbols (${normal.rate}%)`);
    lines.push(`  미문서화         ${normal.undocumented} symbols`);

    return lines.join('\n');
  }
}
