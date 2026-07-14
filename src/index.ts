/**
 * TSDoc Edge - TSDoc-based specification documentation tool
 *
 * This library provides utilities for parsing TSDoc comments,
 * validating them against conventions, and generating documentation.
 *
 * @packageDocumentation
 */

import { MarkdownGenerator } from './generator/MarkdownGenerator';
import { TSDocParser } from './parser/TSDocParser';
import { ConventionValidator } from './validator/ConventionValidator';

export { CallGraphAnalyzer } from './analyzer/CallGraphAnalyzer';
// Analyzer exports
export { CodeHealthChecker } from './analyzer/CodeHealthChecker';
export { type CoverageParseResult, CoverageParser } from './analyzer/CoverageParser';
export { DependencyChainAnalyzer } from './analyzer/DependencyChainAnalyzer';
export { DocumentationAnalyzer } from './analyzer/DocumentationAnalyzer';
export { ImportanceClassifier } from './analyzer/ImportanceClassifier';
export { InterfaceAnalyzer } from './analyzer/InterfaceAnalyzer';
export { InterfaceDependencyMapper } from './analyzer/InterfaceDependencyMapper';
export { IODependencyAnalyzer } from './analyzer/IODependencyAnalyzer';
export type {
  BrokenLink,
  LinkType,
  MissingLinkReport,
} from './analyzer/MissingLinkDetector';
export { MissingLinkDetector } from './analyzer/MissingLinkDetector';
export type {
  FileCheckResult,
  PreCommitReport,
} from './analyzer/PreCommitChecker';
export { PreCommitChecker } from './analyzer/PreCommitChecker';
export { StatsHistoryManager } from './analyzer/StatsHistoryManager';
export { TestCoverageAnalyzer } from './analyzer/TestCoverageAnalyzer';
export { TrackableStatsCollector } from './analyzer/TrackableStatsCollector';
export { TypeChainTracer } from './analyzer/TypeChainTracer';
// Config exports
export { ConfigManager } from './config/ConfigManager';
// Versioned convention-pack composition and checking
export * from './convention';
// Document symbol exports ([[]] notation)
export { BacklinkGenerator } from './doc-symbol/BacklinkGenerator';
export { DocumentSymbolParser } from './doc-symbol/DocumentSymbolParser';
export { DocumentSymbolRegistry } from './doc-symbol/DocumentSymbolRegistry';
export { TSDocSymbolParser } from './doc-symbol/TSDocSymbolParser';
// Fixer exports
export { DocumentationFixer } from './fixer/DocumentationFixer';
export { RecursiveImprover } from './fixer/RecursiveImprover';
// Fold/Unfold exports
export { CommentExporter } from './fold/CommentExporter';
export { CommentImporter } from './fold/CommentImporter';
export { CommentStateManager } from './fold/CommentStateManager';
// Generator exports
export { EnhancedMarkdownGenerator } from './generator/EnhancedMarkdownGenerator';
export { InsightDocGenerator } from './generator/InsightDocGenerator';
export { MarkdownGenerator } from './generator/MarkdownGenerator';
// Module Specification Generator
export { ModuleSpecGenerator } from './generator/ModuleSpecGenerator';
export { ModuleSpecMarkdownFormatter } from './generator/ModuleSpecMarkdownFormatter';
export { RelatedDocsGenerator } from './generator/RelatedDocsGenerator';
// Graph and search exports
export { DepthTraverser } from './graph/DepthTraverser';
export { SymbolGraphBuilder } from './graph/SymbolGraphBuilder';
export { SymbolSearchEngine } from './graph/SymbolSearchEngine';
// Canonical graph analysis exports
export * from './graph-analysis';
// Canonical project indexing exports
export * from './indexer';
// Linking exports
export { DocCodeLinker } from './linking/DocCodeLinker';
export { LinkValidator } from './linking/LinkValidator';
export * from './metrics/CanonicalCoverageProjection';
export * from './metrics/CoverageMetricBaseline';
export * from './metrics/CoverageMetricContract';
export * from './metrics/CoverageMetricGate';
export type {
  ExtractedEnhancedDoc,
  ExtractionOptions,
} from './parser/EnhancedDocExtractor';
// Parser exports
export { EnhancedDocExtractor } from './parser/EnhancedDocExtractor';
// Core exports
export { TSDocParser } from './parser/TSDocParser';
// Semantic graph provider extension boundary
export * from './provider';
// Cross-plane effective analysis boundary
export * from './semantic-graph';
// Versioned specification graph contracts
export * from './spec-graph';
export * from './storage/AnalysisInputRevisionRepository';
export * from './storage/CoverageMetricBaselineRepository';
export * from './storage/CoverageMetricReportRepository';
// Storage exports
export { DatabaseManager } from './storage/DatabaseManager';
export * from './storage/GraphRepository';
export * from './storage/SpecGraphRepository';
// Type exports
export type {
  ParsedDocComment,
  ParseResult,
  TSDocEdgeConfig,
  ValidationResult,
} from './types';
// Analysis type exports
export type * from './types/analysis';
// Config type exports
export type * from './types/config';
// Interface analysis type exports
export type * from './types/domain';
// Graph type exports
export type * from './types/graph';
export type {
  DependencySpec,
  FailureCase,
  ImportSpec,
  ModuleContext,
  ModuleEffect,
  ModuleInput,
  ModuleLogic,
  ModuleOutput,
  ModulePurpose,
  ModuleScope,
  ModuleSpecResult,
  ModuleSpecTemplate,
  ParamSpec,
  ReturnSpec,
  SideEffectSpec,
} from './types/spec/module-spec';
// Comment state type exports
export type * from './types/state';
// Enhanced type exports
export type * from './types/tags';
// Validation exports
export { ConnectivityValidator } from './validator/ConnectivityValidator';
export { ConventionValidator } from './validator/ConventionValidator';
export type {
  ModuleSpecValidationResult,
  ValidationIssue,
  ValidationOptions,
  ValidationSeverity,
} from './validator/ModuleSpecValidator';
export { ModuleSpecValidator } from './validator/ModuleSpecValidator';
export { StrictModeValidator } from './validator/StrictModeValidator';

/**
 * Main entry point for TSDoc Edge
 *
 * @doc [[CoreWorkflow]]
 * @doc [[TSDocEdge]]
 * @doc [[Core Architecture#TSDocEdge]]
 * @public
 */
export class TSDocEdge {
  private parser: TSDocParser;
  private validator: ConventionValidator;
  private generator: MarkdownGenerator;

  /**
   * Creates a new TSDocEdge instance
   *
   * @public
   */
  constructor() {
    this.parser = new TSDocParser();
    this.validator = new ConventionValidator();
    this.generator = new MarkdownGenerator();
  }

  /**
   * Process a source file: parse, validate, and generate documentation
   *
   * @param filePath - Path to the source file
   * @param sourceCode - Source code content
   * @returns Markdown documentation string
   * @public
   */
  processFile(filePath: string, sourceCode: string): string {
    // Parse the file
    const parseResult = this.parser.parseFile(filePath, sourceCode);

    // Validate each comment
    const validatedComments = parseResult.comments.map((comment) =>
      this.validator.validate(comment)
    );

    // Generate documentation
    return this.generator.generateForComments(validatedComments);
  }

  /**
   * Get the parser instance
   *
   * @returns TSDocParser instance
   * @public
   */
  getParser(): TSDocParser {
    return this.parser;
  }

  /**
   * Get the validator instance
   *
   * @returns ConventionValidator instance
   * @public
   */
  getValidator(): ConventionValidator {
    return this.validator;
  }

  /**
   * Get the generator instance
   *
   * @returns MarkdownGenerator instance
   * @public
   */
  getGenerator(): MarkdownGenerator {
    return this.generator;
  }
}
