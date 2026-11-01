/**
 * Unified Analyzer Types
 * Common interfaces for all relationship analyzers
 *
 * @packageDocumentation
 * @doc [[Analyzer System]]
 * @context Shared plugin contract (`AnalyzerContext`, `RelationshipAnalyzer`, `AnalyzerMetadata`, `AnalyzerType`) unifying all relationship analyzers
 * @functionality Defines execution context dependencies, analyzer interface, registration metadata, and the union of supported analyzer keys
 */

import type { Database } from 'better-sqlite3';
import type * as ts from 'typescript';
import type { GraphAnalysisService } from '../graph-analysis';
import type { DatabaseManager } from '../storage/DatabaseManager';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Context provided to all analyzers
 * Contains all possible dependencies an analyzer might need
 *
 * @doc [[Analyzer System]]
 * @public
 */
export interface AnalyzerContext {
  /** Legacy DB-backed symbol graph (optional during canonical graph cutover) */
  graph?: SymbolGraph;
  /** Canonical compiler graph analysis (optional - required by migrated analyzers) */
  graphAnalysis?: GraphAnalysisService;
  /** TypeScript program (optional - for AST analysis) */
  program?: ts.Program;
  /** Database manager (optional - for DB queries) */
  dbManager?: DatabaseManager;
  /** Raw database (optional - for direct DB access) */
  db?: Database;
  /** Project root path */
  projectRoot?: string;
}

/**
 * Common interface for all relationship analyzers
 *
 * @doc [[Analyzer System]]
 * @public
 */
export interface RelationshipAnalyzer {
  /** Analyzer name for display */
  readonly name: string;
  /** Analyzer type key */
  readonly type: string;
  /** Category for grouping */
  readonly category: string;
  /** Description */
  readonly description: string;

  /**
   * Analyze and return relationships
   * @param context - Analyzer context with dependencies
   * @returns Array of unified relationships
   */
  analyze(context: AnalyzerContext): UnifiedRelationship[];
}

/**
 * Analyzer metadata for registration
 *
 * @doc [[Analyzer System]]
 * @public
 */
export interface AnalyzerMetadata {
  type: string;
  name: string;
  description: string;
  category:
    | 'structural'
    | 'behavioral'
    | 'data-flow'
    | 'alternative'
    | 'constraint'
    | 'semantic'
    | 'verification'
    | 'type-system'
    | 'architectural';
  /** Required context fields */
  requires: Array<'graph' | 'graphAnalysis' | 'program' | 'dbManager' | 'db' | 'projectRoot'>;
  /** Canonical IDs stay read-only until canonical node persistence is atomic. */
  persistence?: 'legacy-db' | 'read-only';
}

/**
 * All analyzer types supported
 *
 * @doc [[Analyzer System]]
 * @public
 */
export type AnalyzerType =
  | 'alternatives'
  | 'behavioral'
  | 'callbacks'
  | 'calls'
  | 'chains'
  | 'collaboration'
  | 'composition'
  | 'constraints'
  | 'doc-reference'
  | 'enhancement'
  | 'events'
  | 'fallback'
  | 'integration-verification'
  | 'io'
  | 'layer-dependency'
  | 'module-boundary'
  | 'structural'
  | 'substitution'
  | 'temporal-order'
  | 'tests'
  | 'types';
