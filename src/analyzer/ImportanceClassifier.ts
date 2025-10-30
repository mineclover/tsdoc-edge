/**
 * Classifies symbols by importance level
 * @packageDocumentation
 * @responsibility Determine importance level of symbols for tracking
 */

import type { Symbol } from '../types/graph';
import type { ImportanceCriteria, ImportanceLevel } from '../types/statistics';

/**
 * Classifies symbols by their importance level
 *
 * Critical: Public API, exported symbols, symbols with contracts
 * Important: Structural types, highly connected symbols
 * Normal: Private utilities, helpers
 *
 * @public
 */
export class ImportanceClassifier {
  /**
   * Classify a symbol's importance level
   *
   * @param symbol - Symbol to classify
   * @param connectionCount - Number of relationships this symbol has
   * @returns Importance criteria with level and reasons
   */
  classify(symbol: Symbol, connectionCount: number = 0): ImportanceCriteria {
    const reasons: string[] = [];

    // Critical conditions
    if (symbol.isPublic) {
      reasons.push('public API');
    }

    if (symbol.isExported) {
      reasons.push('exported');
    }

    if (symbol.contract) {
      reasons.push('has contract');
    }

    if (symbol.responsibility) {
      reasons.push('has responsibility');
    }

    // If any critical condition is met, it's critical
    if (reasons.length > 0) {
      return {
        level: 'critical',
        reasons,
      };
    }

    // Important conditions
    if (this.isStructuralType(symbol.type)) {
      reasons.push('structural type');
    }

    if (connectionCount >= 5) {
      reasons.push(`high connectivity (${connectionCount})`);
    }

    if (symbol.tests.length > 0) {
      reasons.push(`tested (${symbol.tests.length} tests)`);
    }

    if (symbol.type === 'class' || symbol.type === 'interface') {
      reasons.push('core structure');
    }

    // If any important condition is met, it's important
    if (reasons.length > 0) {
      return {
        level: 'important',
        reasons,
      };
    }

    // Normal (everything else)
    reasons.push('private helper');

    return {
      level: 'normal',
      reasons,
    };
  }

  /**
   * Check if symbol type is structural
   *
   * @param type - Symbol type
   * @returns True if structural type
   */
  private isStructuralType(type: Symbol['type']): boolean {
    return type === 'class' || type === 'interface' || type === 'type' || type === 'enum';
  }

  /**
   * Classify multiple symbols
   *
   * @param symbols - Symbols to classify
   * @param connectionCounts - Map of symbol ID to connection count
   * @returns Map of symbol ID to importance criteria
   */
  classifyAll(
    symbols: Symbol[],
    connectionCounts: Map<string, number> = new Map()
  ): Map<string, ImportanceCriteria> {
    const result = new Map<string, ImportanceCriteria>();

    for (const symbol of symbols) {
      const connectionCount = connectionCounts.get(symbol.id) || 0;
      result.set(symbol.id, this.classify(symbol, connectionCount));
    }

    return result;
  }

  /**
   * Group symbols by importance level
   *
   * @param symbols - Symbols to group
   * @param importanceMap - Map of symbol ID to importance criteria
   * @returns Grouped symbols by importance level
   */
  groupByImportance(
    symbols: Symbol[],
    importanceMap: Map<string, ImportanceCriteria>
  ): {
    critical: Symbol[];
    important: Symbol[];
    normal: Symbol[];
  } {
    const critical: Symbol[] = [];
    const important: Symbol[] = [];
    const normal: Symbol[] = [];

    for (const symbol of symbols) {
      const criteria = importanceMap.get(symbol.id);
      if (!criteria) continue;

      switch (criteria.level) {
        case 'critical':
          critical.push(symbol);
          break;
        case 'important':
          important.push(symbol);
          break;
        case 'normal':
          normal.push(symbol);
          break;
      }
    }

    return { critical, important, normal };
  }

  /**
   * Filter symbols by importance level
   *
   * @param symbols - Symbols to filter
   * @param importanceMap - Map of symbol ID to importance criteria
   * @param level - Importance level to filter by
   * @returns Filtered symbols
   */
  filterByLevel(
    symbols: Symbol[],
    importanceMap: Map<string, ImportanceCriteria>,
    level: ImportanceLevel
  ): Symbol[] {
    return symbols.filter((symbol) => {
      const criteria = importanceMap.get(symbol.id);
      return criteria?.level === level;
    });
  }
}
