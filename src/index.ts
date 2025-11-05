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

// Analyzer exports
export { CodeHealthChecker } from './analyzer/CodeHealthChecker';
export { CoverageParser } from './analyzer/CoverageParser';
export {
  CoverageSyncer,
  CoverageAdapter,
  updateSymbolWithCoverage,
} from './analyzer/CoverageSyncAdapter';
export type {
  SymbolCoverage,
  CoverageSyncResult,
} from './analyzer/CoverageSyncAdapter';
export { IstanbulCoverageAdapter } from './analyzer/IstanbulCoverageAdapter';
export { MissingLinkDetector } from './analyzer/MissingLinkDetector';
export type {
  BrokenLink,
  MissingLinkReport,
  LinkType,
} from './analyzer/MissingLinkDetector';
export { PreCommitChecker } from './analyzer/PreCommitChecker';
export type {
  FileCheckResult,
  PreCommitReport,
} from './analyzer/PreCommitChecker';
export { DocumentationAnalyzer } from './analyzer/DocumentationAnalyzer';
export { DomainStructureAnalyzer } from './analyzer/DomainStructureAnalyzer';
export { ImportanceClassifier } from './analyzer/ImportanceClassifier';
export { InterfaceAnalyzer } from './analyzer/InterfaceAnalyzer';
export { InterfaceDependencyMapper } from './analyzer/InterfaceDependencyMapper';
export { StatsComparator } from './analyzer/StatsComparator';
export { StatsHistoryManager } from './analyzer/StatsHistoryManager';
export { TestCoverageAnalyzer } from './analyzer/TestCoverageAnalyzer';
export { TrackableStatsCollector } from './analyzer/TrackableStatsCollector';
// Parser exports
export { EnhancedDocExtractor } from './parser/EnhancedDocExtractor';
export type {
  ExtractionOptions,
  ExtractedEnhancedDoc,
} from './parser/EnhancedDocExtractor';
// Config exports
export { ConfigManager } from './config/ConfigManager';
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
export { RelatedDocsGenerator } from './generator/RelatedDocsGenerator';
// Graph and search exports
export { DepthTraverser } from './graph/DepthTraverser';
export { SymbolGraphBuilder } from './graph/SymbolGraphBuilder';
export { SymbolSearchEngine } from './graph/SymbolSearchEngine';
// Core exports
export { TSDocParser } from './parser/TSDocParser';
// Storage exports
export { DatabaseManager } from './storage/DatabaseManager';
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
// Comment state type exports
export type * from './types/state';
// Enhanced type exports
export type * from './types/tags';
// Validation exports
export { ConnectivityValidator } from './validator/ConnectivityValidator';
export { ConventionValidator } from './validator/ConventionValidator';
export { StrictModeValidator } from './validator/StrictModeValidator';
export { ModuleSpecValidator } from './validator/ModuleSpecValidator';
export type {
  ValidationIssue,
  ValidationSeverity,
  ModuleSpecValidationResult,
  ValidationOptions,
} from './validator/ModuleSpecValidator';
// Linking exports
export { DocCodeLinker } from './linking/DocCodeLinker';
export { LinkValidator } from './linking/LinkValidator';
// Document symbol exports ([[]] notation)
export { BacklinkGenerator } from './doc-symbol/BacklinkGenerator';
export { DocumentSymbolParser } from './doc-symbol/DocumentSymbolParser';
export { DocumentSymbolRegistry } from './doc-symbol/DocumentSymbolRegistry';
export { TSDocSymbolParser } from './doc-symbol/TSDocSymbolParser';
// Module Specification Generator
export { ModuleSpecGenerator } from './generator/ModuleSpecGenerator';
export { ModuleSpecMarkdownFormatter } from './generator/ModuleSpecMarkdownFormatter';
export type {
  ModuleSpecTemplate,
  ModuleSpecResult,
  ModulePurpose,
  ModuleInput,
  ModuleOutput,
  ModuleContext,
  ModuleLogic,
  ModuleEffect,
  ModuleScope,
  ParamSpec,
  ReturnSpec,
  FailureCase,
  DependencySpec,
  ImportSpec,
  SideEffectSpec,
} from './types/spec/module-spec';

/**
 * Main entry point for TSDoc Edge
 *
 * @doc [[CoreWorkflow]]
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
