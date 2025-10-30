/**
 * Manages statistics history storage and retrieval
 * @packageDocumentation
 * @responsibility Persist and retrieve statistics history
 */

import * as fs from 'node:fs';
import type { Symbol } from '../types/graph';
import type { StatsHistory, StatsHistoryEntry, TrackableStatistics } from '../types/statistics';

/**
 * Manages statistics history persistence
 *
 * @public
 */
export class StatsHistoryManager {
  private readonly defaultPath = '.tsdoc-stats-history.json';
  private readonly maxEntries = 50; // Keep last 50 snapshots

  /**
   * Load history from file
   *
   * @param historyPath - Path to history file
   * @returns Statistics history or null if not found
   */
  load(historyPath?: string): StatsHistory | null {
    const filePath = historyPath || this.defaultPath;

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as StatsHistory;
    } catch (error) {
      console.warn(`Failed to load history from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Save statistics to history
   *
   * @param stats - Statistics to save
   * @param symbols - All symbols (for tracking IDs)
   * @param historyPath - Path to history file
   */
  save(stats: TrackableStatistics, symbols: Symbol[], historyPath?: string): void {
    const filePath = historyPath || this.defaultPath;
    const history = this.load(filePath) || this.createNewHistory(stats.projectPath);

    // Create new entry
    const entry = this.createEntry(stats, symbols);

    // Add to history (newest first)
    history.entries.unshift(entry);

    // Limit history size
    if (history.entries.length > this.maxEntries) {
      history.entries = history.entries.slice(0, this.maxEntries);
    }

    // Save to file
    try {
      const content = JSON.stringify(history, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      console.error(`Failed to save history to ${filePath}:`, error);
    }
  }

  /**
   * Get the latest history entry
   *
   * @param historyPath - Path to history file
   * @returns Latest entry or null
   */
  getLatest(historyPath?: string): StatsHistoryEntry | null {
    const history = this.load(historyPath);
    if (!history || history.entries.length === 0) {
      return null;
    }
    return history.entries[0];
  }

  /**
   * Get history entries within a time range
   *
   * @param days - Number of days to look back
   * @param historyPath - Path to history file
   * @returns History entries
   */
  getRecent(days: number, historyPath?: string): StatsHistoryEntry[] {
    const history = this.load(historyPath);
    if (!history) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return history.entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }

  /**
   * Create new history structure
   *
   * @param projectPath - Project path
   * @returns Empty history
   */
  private createNewHistory(projectPath: string): StatsHistory {
    return {
      version: '1.0.0',
      projectPath,
      entries: [],
    };
  }

  /**
   * Create history entry from statistics
   *
   * @param stats - Statistics snapshot
   * @param symbols - All symbols
   * @returns History entry
   */
  private createEntry(stats: TrackableStatistics, symbols: Symbol[]): StatsHistoryEntry {
    // Build symbol ID lists by importance
    const symbolIds = {
      critical: [] as string[],
      important: [] as string[],
      normal: [] as string[],
    };

    for (const symbol of symbols) {
      const importance = stats.symbolImportance[symbol.id];
      if (!importance) continue;

      switch (importance.level) {
        case 'critical':
          symbolIds.critical.push(symbol.id);
          break;
        case 'important':
          symbolIds.important.push(symbol.id);
          break;
        case 'normal':
          symbolIds.normal.push(symbol.id);
          break;
      }
    }

    return {
      timestamp: stats.timestamp,
      overall: stats.overall,
      critical: stats.byImportance.critical,
      important: stats.byImportance.important,
      normal: stats.byImportance.normal,
      symbolIds,
    };
  }

  /**
   * Clear history file
   *
   * @param historyPath - Path to history file
   */
  clear(historyPath?: string): void {
    const filePath = historyPath || this.defaultPath;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Export history to a specific file
   *
   * @param outputPath - Output file path
   * @param historyPath - Source history file path
   */
  export(outputPath: string, historyPath?: string): void {
    const history = this.load(historyPath);
    if (!history) {
      throw new Error('No history to export');
    }

    const content = JSON.stringify(history, null, 2);
    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  /**
   * Get statistics summary over time
   *
   * @param days - Number of days to analyze
   * @param historyPath - Path to history file
   * @returns Summary statistics
   */
  getSummary(
    days: number,
    historyPath?: string
  ): {
    count: number;
    avgCriticalRate: number;
    avgOverallRate: number;
    trend: 'improving' | 'declining' | 'stable';
  } {
    const entries = this.getRecent(days, historyPath);

    if (entries.length === 0) {
      return {
        count: 0,
        avgCriticalRate: 0,
        avgOverallRate: 0,
        trend: 'stable',
      };
    }

    // Calculate averages
    const totalCriticalRate = entries.reduce((sum, e) => sum + e.critical.rate, 0);
    const totalOverallRate = entries.reduce((sum, e) => sum + e.overall.rate, 0);

    const avgCriticalRate = totalCriticalRate / entries.length;
    const avgOverallRate = totalOverallRate / entries.length;

    // Determine trend (compare first half vs second half)
    const halfPoint = Math.floor(entries.length / 2);
    const recentAvg =
      entries.slice(0, halfPoint).reduce((sum, e) => sum + e.overall.rate, 0) / halfPoint;
    const olderAvg =
      entries.slice(halfPoint).reduce((sum, e) => sum + e.overall.rate, 0) /
      (entries.length - halfPoint);

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 2) {
      trend = 'improving';
    } else if (recentAvg < olderAvg - 2) {
      trend = 'declining';
    }

    return {
      count: entries.length,
      avgCriticalRate: Number.parseFloat(avgCriticalRate.toFixed(1)),
      avgOverallRate: Number.parseFloat(avgOverallRate.toFixed(1)),
      trend,
    };
  }
}
