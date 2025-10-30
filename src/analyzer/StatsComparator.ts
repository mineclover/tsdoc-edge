/**
 * Compares statistics between two snapshots
 * @packageDocumentation
 * @responsibility Compare statistics and detect warnings
 */

import type { Symbol } from '../types/graph';
import type {
  DetectableStats,
  ImportanceCriteria,
  StatsComparison,
  StatsDelta,
  StatsHistoryEntry,
  SymbolChange,
  TrackableStatistics,
} from '../types/statistics';

/**
 * Compares statistics between snapshots and detects issues
 *
 * @public
 */
export class StatsComparator {
  /**
   * Compare two detectable stats
   *
   * @param before - Previous stats
   * @param after - Current stats
   * @param criticalLevel - Whether this is critical level comparison
   * @returns Comparison result with warnings
   */
  compare(
    before: DetectableStats,
    after: DetectableStats,
    criticalLevel: boolean = false
  ): StatsComparison {
    const delta = this.calculateDelta(before, after);
    const warnings = this.detectWarnings(before, after, delta, criticalLevel);

    return {
      before,
      after,
      delta,
      hasWarning: warnings.length > 0,
      warnings,
    };
  }

  /**
   * Calculate delta between two stats
   *
   * @param before - Previous stats
   * @param after - Current stats
   * @returns Delta values
   */
  private calculateDelta(before: DetectableStats, after: DetectableStats): StatsDelta {
    return {
      total: after.total - before.total,
      documented: after.documented - before.documented,
      undocumented: after.undocumented - before.undocumented,
      rate: Number.parseFloat((after.rate - before.rate).toFixed(1)),
    };
  }

  /**
   * Detect warnings based on comparison
   *
   * @param before - Previous stats
   * @param after - Current stats
   * @param delta - Change delta
   * @param criticalLevel - Whether this is critical level
   * @returns Warning messages
   */
  private detectWarnings(
    _before: DetectableStats,
    _after: DetectableStats,
    delta: StatsDelta,
    criticalLevel: boolean
  ): string[] {
    const warnings: string[] = [];

    // Critical symbols documentation decreased
    if (criticalLevel && delta.documented < 0) {
      warnings.push(`⚠️  Critical 심볼 문서 감소: ${Math.abs(delta.documented)}개 감소`);
    }

    // Critical symbols removed
    if (criticalLevel && delta.total < 0) {
      warnings.push(`⚠️  Critical 심볼 삭제: ${Math.abs(delta.total)}개 삭제됨`);
    }

    // Significant rate drop for critical (>1%)
    if (criticalLevel && delta.rate < -1) {
      warnings.push(`⚠️  Critical 문서화율 하락: ${Math.abs(delta.rate)}% 감소`);
    }

    // Significant rate drop for overall (>5%)
    if (!criticalLevel && delta.rate < -5) {
      warnings.push(`⚠️  전체 문서화율 급락: ${Math.abs(delta.rate)}% 감소`);
    }

    return warnings;
  }

  /**
   * Compare current stats with history entry
   *
   * @param current - Current statistics
   * @param history - Previous history entry
   * @param currentSymbols - Current symbols
   * @param previousSymbolIds - Previous symbol IDs by importance
   * @returns Updated statistics with comparison
   */
  compareWithHistory(
    current: TrackableStatistics,
    history: StatsHistoryEntry,
    currentSymbols: Symbol[],
    previousSymbolIds: StatsHistoryEntry['symbolIds']
  ): TrackableStatistics {
    // Compare each level
    const overallComparison = this.compare(history.overall, current.overall);
    const criticalComparison = this.compare(history.critical, current.byImportance.critical, true);
    const importantComparison = this.compare(history.important, current.byImportance.important);
    const normalComparison = this.compare(history.normal, current.byImportance.normal);

    // Detect symbol changes
    const changes = this.detectSymbolChanges(
      currentSymbols,
      current.symbolImportance,
      previousSymbolIds
    );

    return {
      ...current,
      comparison: {
        previousTimestamp: history.timestamp,
        overall: overallComparison,
        critical: criticalComparison,
        important: importantComparison,
        normal: normalComparison,
        changes,
      },
    };
  }

  /**
   * Detect detailed symbol changes
   *
   * @param currentSymbols - Current symbols
   * @param currentImportance - Current symbol importance map
   * @param previousSymbolIds - Previous symbol IDs by importance
   * @returns List of symbol changes
   */
  private detectSymbolChanges(
    currentSymbols: Symbol[],
    currentImportance: Record<string, ImportanceCriteria>,
    previousSymbolIds: StatsHistoryEntry['symbolIds']
  ): SymbolChange[] {
    const changes: SymbolChange[] = [];

    // Build current symbol ID sets by importance
    const currentCriticalIds = new Set<string>();
    const currentImportantIds = new Set<string>();
    const currentNormalIds = new Set<string>();

    for (const symbol of currentSymbols) {
      const importance = currentImportance[symbol.id];
      if (!importance) continue;

      switch (importance.level) {
        case 'critical':
          currentCriticalIds.add(symbol.id);
          break;
        case 'important':
          currentImportantIds.add(symbol.id);
          break;
        case 'normal':
          currentNormalIds.add(symbol.id);
          break;
      }
    }

    // Check for removed critical symbols
    for (const symbolId of previousSymbolIds.critical) {
      if (!currentCriticalIds.has(symbolId)) {
        const symbol = currentSymbols.find((s) => s.id === symbolId);
        if (!symbol) {
          // Symbol completely removed
          changes.push({
            symbolId,
            symbolName: symbolId,
            importance: 'critical',
            changeType: 'removed',
            filePath: 'unknown',
          });
        }
      }
    }

    return changes;
  }

  /**
   * Format comparison result as string
   *
   * @param comparison - Comparison result
   * @param level - Importance level name
   * @returns Formatted string
   */
  formatComparison(comparison: StatsComparison, _level: string): string {
    const lines: string[] = [];
    const { after, delta } = comparison;

    lines.push(`  감지 대상        ${after.total} symbols ${this.formatDelta(delta.total)}`);
    lines.push(
      `  문서화됨         ${after.documented} symbols (${after.rate}%) ${this.formatDelta(delta.documented)}`
    );
    lines.push(
      `  미문서화         ${after.undocumented} symbols ${this.formatDelta(delta.undocumented)}`
    );

    if (comparison.hasWarning) {
      lines.push('');
      for (const warning of comparison.warnings) {
        lines.push(warning);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format delta value with arrow
   *
   * @param delta - Delta value
   * @returns Formatted string
   */
  private formatDelta(delta: number): string {
    if (delta === 0) return '→ 0';
    if (delta > 0) return `↑ +${delta}`;
    return `↓ ${delta}`;
  }

  /**
   * Format full comparison summary
   *
   * @param stats - Statistics with comparison
   * @returns Formatted string
   */
  summarizeComparison(stats: TrackableStatistics): string {
    if (!stats.comparison) {
      return '비교 데이터 없음';
    }

    const lines: string[] = [];
    const prevDate = new Date(stats.comparison.previousTimestamp).toLocaleString('ko-KR');

    lines.push(`📊 Documentation Tracking (vs. ${prevDate})`);
    lines.push('═'.repeat(50));
    lines.push('');

    // Overall
    lines.push(this.formatComparison(stats.comparison.overall, 'Overall'));
    lines.push('');
    lines.push('─'.repeat(50));
    lines.push('');

    // Critical
    lines.push('🔴 Critical');
    lines.push(this.formatComparison(stats.comparison.critical, 'Critical'));
    lines.push('');

    // Important
    lines.push('🟡 Important');
    lines.push(this.formatComparison(stats.comparison.important, 'Important'));
    lines.push('');

    // Normal
    lines.push('⚪ Normal');
    lines.push(this.formatComparison(stats.comparison.normal, 'Normal'));

    // Symbol changes
    if (stats.comparison.changes.length > 0) {
      lines.push('');
      lines.push('─'.repeat(50));
      lines.push('');
      lines.push('📝 Detailed Changes:');
      for (const change of stats.comparison.changes) {
        lines.push(`  - [${change.importance}] ${change.symbolName}: ${change.changeType}`);
      }
    }

    return lines.join('\n');
  }
}
