/**
 * TSDoc Edge Types - Re-organized for better domain separation
 *
 * All types are re-exported from their domain-specific modules for backward compatibility.
 *
 * @packageDocumentation
 */

// Analysis types - quality, coverage, health
export * from './analysis';
export type {
  AnalysisOptions,
  AnalysisReport,
  CodeHealthMetrics,
  DocQualityScore,
  ImprovementSuggestion,
  TestCoverageInfo,
} from './analysis/quality';
// Configuration types
export * from './config';
// Export TSDocEdgeConfig (duplicate name compatibility)
export type { TsdocEdgeConfig as TSDocEdgeConfig } from './config/config';
// Core types - parsing and validation
export * from './core';
// Legacy re-exports for backward compatibility
// These will be deprecated in future versions
export type {
  ParsedDocComment,
  ParseResult,
  ValidationResult,
} from './core/parse';
// Domain analysis types - interface analysis
export * from './domain';
// Feature documentation types
export * from './feature';
// Graph types - symbols, relationships, connectivity
export * from './graph';
// Registry types - symbol registration
export * from './registry';
// State management types - comment folding
export * from './state';
// TSDoc tag types - base and enhanced
export * from './tags';
// Specification types - spec management
export * from './spec';
