/**
 * Collaboration Analyzer
 *
 * @packageDocumentation
 * @responsibility Detect collaboration relationships (mutual dependencies)
 *
 * @problem Collaborative patterns are implicit in code structure
 * @solves Identifies bidirectional relationships and cooperation patterns
 * @context Essential for understanding component cooperation and coupling
 *
 * @functionality
 * - Detect bidirectional code dependencies
 * - Detect mutual call relationships
 * - Detect shared context patterns
 * - Build collaboration relationships
 */

import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Collaboration pattern
 */
interface CollaborationPattern {
  symbolA: string;
  symbolB: string;
  nameA: string;
  nameB: string;
  evidenceType: 'bidirectional-dependency' | 'mutual-calls' | 'mutual-composition' | 'shared-context';
  filePathA: string;
  filePathB: string;
  lineA: number;
  lineB: number;
}

/**
 * Collaboration Analyzer
 *
 * @public
 * @responsibility Detect and analyze collaboration relationships
 */
export class CollaborationAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze collaboration relationships
   * Detects bidirectional relationships between symbols
   *
   * @returns Array of collaboration relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const patterns: CollaborationPattern[] = [];

    // Pattern 1: Bidirectional dependencies (A imports B, B imports A)
    this.detectBidirectionalDependencies(patterns);

    // Pattern 2: Mutual calls (A calls B, B calls A)
    this.detectMutualCalls(patterns);

    // Pattern 3: Mutual composition (A has B, B has A)
    this.detectMutualComposition(patterns);

    // Create relationships
    const relationships: UnifiedRelationship[] = [];
    const seenPairs = new Set<string>();

    for (const pattern of patterns) {
      // Create canonical pair key (sorted to avoid duplicates)
      const [id1, id2] = [pattern.symbolA, pattern.symbolB].sort();
      const pairKey = `${id1}<->${id2}`;

      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const relationship = this.createRelationship(pattern);
      relationships.push(relationship);
    }

    return relationships;
  }

  /**
   * Detect bidirectional code dependencies
   *
   * @param patterns - Array to collect patterns
   * @private
   */
  private detectBidirectionalDependencies(patterns: CollaborationPattern[]): void {
    const dependencies = new Map<string, Set<string>>();

    // Build dependency map
    for (const rel of this.graph.relationships) {
      if (rel.type === 'dependsOn') {
        if (!dependencies.has(rel.from)) {
          dependencies.set(rel.from, new Set());
        }
        dependencies.get(rel.from)!.add(rel.to);
      }
    }

    // Find bidirectional dependencies
    for (const [symbolA, depsA] of dependencies.entries()) {
      for (const symbolB of depsA) {
        const depsB = dependencies.get(symbolB);
        if (depsB && depsB.has(symbolA)) {
          // Bidirectional dependency found
          const symA = this.graph.symbols.get(symbolA);
          const symB = this.graph.symbols.get(symbolB);

          if (symA && symB) {
            patterns.push({
              symbolA,
              symbolB,
              nameA: symA.name,
              nameB: symB.name,
              evidenceType: 'bidirectional-dependency',
              filePathA: symA.filePath,
              filePathB: symB.filePath,
              lineA: symA.line,
              lineB: symB.line
            });
          }
        }
      }
    }
  }

  /**
   * Detect mutual call relationships
   *
   * @param patterns - Array to collect patterns
   * @private
   */
  private detectMutualCalls(patterns: CollaborationPattern[]): void {
    const calls = new Map<string, Set<string>>();

    // Build call map from relationships (relatedTo is the closest we have)
    const callRels = this.graph.relationships.filter(r => r.type === 'relatedTo');

    for (const rel of callRels) {
      if (!calls.has(rel.from)) {
        calls.set(rel.from, new Set());
      }
      calls.get(rel.from)!.add(rel.to);
    }

    // Find mutual calls
    for (const [symbolA, callsFromA] of calls.entries()) {
      for (const symbolB of callsFromA) {
        const callsFromB = calls.get(symbolB);
        if (callsFromB && callsFromB.has(symbolA)) {
          // Mutual calls found
          const symA = this.graph.symbols.get(symbolA);
          const symB = this.graph.symbols.get(symbolB);

          if (symA && symB) {
            patterns.push({
              symbolA,
              symbolB,
              nameA: symA.name,
              nameB: symB.name,
              evidenceType: 'mutual-calls',
              filePathA: symA.filePath,
              filePathB: symB.filePath,
              lineA: symA.line,
              lineB: symB.line
            });
          }
        }
      }
    }
  }

  /**
   * Detect mutual composition
   *
   * @param patterns - Array to collect patterns
   * @private
   */
  private detectMutualComposition(patterns: CollaborationPattern[]): void {
    const compositions = new Map<string, Set<string>>();

    // Build composition map (could also check unified_relationships for composition type)
    // For now, we look for any relationships that might indicate composition
    for (const rel of this.graph.relationships) {
      // This is a simplified approach - in reality we'd check composition relationships
      if (rel.type === 'dependsOn' || rel.type === 'usedBy') {
        if (!compositions.has(rel.from)) {
          compositions.set(rel.from, new Set());
        }
        compositions.get(rel.from)!.add(rel.to);
      }
    }

    // Find mutual composition patterns (rare but possible in complex designs)
    for (const [symbolA, compsA] of compositions.entries()) {
      for (const symbolB of compsA) {
        const compsB = compositions.get(symbolB);
        if (compsB && compsB.has(symbolA)) {
          const symA = this.graph.symbols.get(symbolA);
          const symB = this.graph.symbols.get(symbolB);

          if (symA && symB) {
            patterns.push({
              symbolA,
              symbolB,
              nameA: symA.name,
              nameB: symB.name,
              evidenceType: 'mutual-composition',
              filePathA: symA.filePath,
              filePathB: symB.filePath,
              lineA: symA.line,
              lineB: symB.line
            });
          }
        }
      }
    }
  }

  /**
   * Create relationship from collaboration pattern
   *
   * @param pattern - Collaboration pattern
   * @returns Unified relationship
   * @private
   */
  private createRelationship(pattern: CollaborationPattern): UnifiedRelationship {
    const timestamp = new Date().toISOString();

    // Confidence varies by evidence type
    const confidenceMap: Record<CollaborationPattern['evidenceType'], number> = {
      'bidirectional-dependency': 0.9,
      'mutual-calls': 0.85,
      'mutual-composition': 0.8,
      'shared-context': 0.7
    };

    const confidence = confidenceMap[pattern.evidenceType];

    return {
      id: `collaboration-${pattern.symbolA}-${pattern.symbolB}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'collaboration',
      from: [pattern.symbolA, pattern.symbolB],
      to: [pattern.symbolA, pattern.symbolB],
      direction: 'bidirectional',
      strength: 'medium',
      category: 'behavioral',
      evidence: [
        {
          type: 'code',
          source: pattern.filePathA,
          lineNumber: pattern.lineA,
          snippet: `${pattern.nameA} ↔ ${pattern.nameB}`,
          confidence,
          context: `Collaboration via ${pattern.evidenceType}`
        },
        {
          type: 'code',
          source: pattern.filePathB,
          lineNumber: pattern.lineB,
          snippet: `${pattern.nameB} ↔ ${pattern.nameA}`,
          confidence,
          context: `Mutual relationship`
        }
      ],
      discoveredBy: 'static-analysis',
      confidence,
      filePath: pattern.filePathA,
      line: pattern.lineA,
      properties: {
        evidenceType: pattern.evidenceType,
        participantA: pattern.nameA,
        participantB: pattern.nameB,
        bidirectional: true
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${pattern.nameA} and ${pattern.nameB} collaborate (${pattern.evidenceType})`
    };
  }

  /**
   * Get collaboration statistics
   *
   * @param relationships - Array of collaboration relationships
   * @returns Statistics
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalCollaborations: number;
    byEvidenceType: Record<string, number>;
    uniqueCollaborators: number;
  } {
    const byEvidenceType: Record<string, number> = {
      'bidirectional-dependency': 0,
      'mutual-calls': 0,
      'mutual-composition': 0,
      'shared-context': 0
    };

    const collaborators = new Set<string>();

    for (const rel of relationships) {
      const evidenceType = rel.properties?.evidenceType;
      if (evidenceType && evidenceType in byEvidenceType) {
        byEvidenceType[evidenceType]++;
      }

      // Count unique collaborators
      if (Array.isArray(rel.from)) {
        rel.from.forEach(id => collaborators.add(id));
      }
    }

    return {
      totalCollaborations: relationships.length,
      byEvidenceType,
      uniqueCollaborators: collaborators.size
    };
  }
}
