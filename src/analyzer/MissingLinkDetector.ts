/**
 * Missing link detector for enhanced documentation
 *
 * @packageDocumentation
 * @responsibility Detect broken references in enhanced documentation
 *
 * @problem Enhanced docs reference other symbols/files that may not exist
 * @solves Validates all references and reports missing links
 * @context Documentation quality requires valid cross-references
 * @useCase Find broken dependency links, Validate symbol references
 *
 * @functionality Link validation, Reference checking, Broken link reporting
 *
 * @decision Check references at analysis time, not write time
 * @rationale Symbols may be added/removed over time
 * @consequences Requires periodic validation, Catches issues early
 *
 * @depends EnhancedDocExtractor
 * @depType module
 * @depReason Need to extract docs before validating
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EnhancedDocExtractor, type ExtractedEnhancedDoc } from '../parser/EnhancedDocExtractor';
import type { EnhancedSymbolDoc } from '../types/tags';
import { ConfigLoader } from '../utils/ConfigLoader';
import type { LinkCheckConfig } from '../types/config';

/**
 * Types of links that can be broken
 * @public
 */
export type LinkType =
  | 'dependency' // @depends references
  | 'relatedProblem' // @relatedProblem references
  | 'symbol' // Symbol name references
  | 'file'; // File path references

/**
 * A broken link in documentation
 * @public
 */
export interface BrokenLink {
  /** Source symbol that has the broken link */
  sourceSymbol: string;
  /** Source file path */
  sourceFile: string;
  /** Line number */
  line: number;
  /** Type of link */
  linkType: LinkType;
  /** Target that was referenced */
  target: string;
  /** Reason why link is broken */
  reason: string;
  /** Suggested fix (if available) */
  suggestedFix?: string;
}

/**
 * Missing link detection result
 * @public
 */
export interface MissingLinkReport {
  /** Total links checked */
  totalLinks: number;
  /** Number of broken links found */
  brokenLinks: number;
  /** List of broken links */
  links: BrokenLink[];
  /** Broken links grouped by type */
  byType: Map<LinkType, BrokenLink[]>;
  /** Broken links grouped by file */
  byFile: Map<string, BrokenLink[]>;
}

/**
 * Missing link detector
 *
 * @public
 * @responsibility
 * Validates all references in enhanced documentation and reports broken links.
 * Checks dependencies, symbol references, and file paths.
 *
 * @problem Documentation can reference non-existent symbols or files
 * @solves Automatically validates all references and generates report
 * @context Need to maintain documentation quality as codebase evolves
 *
 * @functionality Reference validation, Symbol existence checking, File existence checking, Report generation
 *
 * @decision Check multiple reference types (dependencies, symbols, files)
 * @rationale Comprehensive validation catches more issues
 * @consequences More thorough, Longer analysis time
 *
 * @example
 * ```typescript
 * const detector = new MissingLinkDetector();
 * const report = detector.analyze('src');
 * console.log(`Found ${report.brokenLinks} broken links`);
 * ```
 */
export class MissingLinkDetector {
  private extractor: EnhancedDocExtractor;
  private symbolRegistry: Map<string, ExtractedEnhancedDoc>;
  private fileRegistry: Set<string>;
  private config: LinkCheckConfig;

  /**
   * Create a new MissingLinkDetector
   *
   * @param configLoader - Optional configuration loader
   */
  constructor(configLoader?: ConfigLoader) {
    this.extractor = new EnhancedDocExtractor();
    this.symbolRegistry = new Map();
    this.fileRegistry = new Set();
    this.config = configLoader?.getLinkCheckConfig() ?? {
      checkTypes: ['dependency', 'relatedProblem', 'symbol', 'file'],
      externalModules: ['fs', 'path', 'typescript', 'node:fs', 'node:path', 'node:util'],
      excludePatterns: [],
      enableSuggestions: true,
      maxSuggestionDistance: 3,
      failOnBroken: false,
    };
  }

  /**
   * Analyze a directory for missing links
   *
   * @param rootPath - Root directory to analyze
   * @returns Missing link report
   *
   * @public
   */
  analyze(rootPath: string): MissingLinkReport {
    // Step 1: Build symbol and file registry
    this.buildRegistry(rootPath);

    // Step 2: Check all links
    const brokenLinks: BrokenLink[] = [];
    let totalLinks = 0;

    // Only check qualified keys (name@file) to avoid duplicate checks
    for (const [key, doc] of this.symbolRegistry) {
      if (!key.includes('@')) {
        continue; // Skip name-only keys (used for fuzzy matching)
      }
      const links = this.checkDocumentLinks(doc);
      brokenLinks.push(...links.brokenLinks);
      totalLinks += links.totalLinks;
    }

    // Step 3: Group by type and file
    const byType = new Map<LinkType, BrokenLink[]>();
    const byFile = new Map<string, BrokenLink[]>();

    for (const link of brokenLinks) {
      // Group by type
      if (!byType.has(link.linkType)) {
        byType.set(link.linkType, []);
      }
      byType.get(link.linkType)!.push(link);

      // Group by file
      if (!byFile.has(link.sourceFile)) {
        byFile.set(link.sourceFile, []);
      }
      byFile.get(link.sourceFile)!.push(link);
    }

    return {
      totalLinks,
      brokenLinks: brokenLinks.length,
      links: brokenLinks,
      byType,
      byFile,
    };
  }

  /**
   * Build registry of all symbols and files
   */
  private buildRegistry(rootPath: string): void {
    this.symbolRegistry.clear();
    this.fileRegistry.clear();

    const files = this.getAllTsFiles(rootPath);

    for (const file of files) {
      this.fileRegistry.add(file);

      const sourceCode = fs.readFileSync(file, 'utf-8');
      const results = this.extractor.extractFromFile(file, sourceCode);

      for (const result of results) {
        const key = `${result.symbol.name}@${file}`;
        this.symbolRegistry.set(key, result);
        // Also register by name only for fuzzy matching
        this.symbolRegistry.set(result.symbol.name, result);
      }
    }
  }

  /**
   * Check all links in a document
   */
  private checkDocumentLinks(doc: ExtractedEnhancedDoc): {
    totalLinks: number;
    brokenLinks: BrokenLink[];
  } {
    const brokenLinks: BrokenLink[] = [];
    let totalLinks = 0;

    // Get check types from config
    const checkTypes = this.config.checkTypes || ['dependency', 'relatedProblem', 'symbol', 'file'];
    const shouldCheckDependencies = checkTypes.includes('dependency');
    const shouldCheckRelatedProblems = checkTypes.includes('relatedProblem');

    // Check dependencies
    if (shouldCheckDependencies && doc.doc.dependencies) {
      for (const dep of doc.doc.dependencies) {
        // Skip external dependencies (npm packages, Node.js built-ins)
        if (dep.type === 'external') {
          continue;
        }

        // Skip if module is in external modules list
        if (this.isExternalModule(dep.target)) {
          continue;
        }

        totalLinks++;

        if (dep.type === 'symbol' || dep.type === 'module') {
          // Check if symbol exists
          if (!this.symbolRegistry.has(dep.target)) {
            const similar = this.config.enableSuggestions ? this.findSimilarSymbols(dep.target) : [];

            brokenLinks.push({
              sourceSymbol: doc.symbol.name,
              sourceFile: doc.symbol.filePath,
              line: doc.symbol.line,
              linkType: 'dependency',
              target: dep.target,
              reason: `Dependency '${dep.target}' not found`,
              suggestedFix: similar.length > 0 ? `Did you mean: ${similar.join(', ')}?` : undefined,
            });
          }
        } else if (dep.type === 'file') {
          // Check if file exists
          if (!this.fileExists(dep.target, doc.symbol.filePath)) {
            brokenLinks.push({
              sourceSymbol: doc.symbol.name,
              sourceFile: doc.symbol.filePath,
              line: doc.symbol.line,
              linkType: 'file',
              target: dep.target,
              reason: `File '${dep.target}' not found`,
            });
          }
        }
      }
    }

    // Check related problems
    if (shouldCheckRelatedProblems && doc.doc.problemSolving?.relatedProblem) {
      totalLinks++;
      const related = doc.doc.problemSolving.relatedProblem;

      if (!this.symbolRegistry.has(related)) {
        const similar = this.config.enableSuggestions ? this.findSimilarSymbols(related) : [];

        brokenLinks.push({
          sourceSymbol: doc.symbol.name,
          sourceFile: doc.symbol.filePath,
          line: doc.symbol.line,
          linkType: 'relatedProblem',
          target: related,
          reason: `Related problem '${related}' not found`,
          suggestedFix: similar.length > 0 ? `Did you mean: ${similar.join(', ')}?` : undefined,
        });
      }
    }

    return { totalLinks, brokenLinks };
  }

  /**
   * Check if a module is marked as external in configuration
   */
  private isExternalModule(moduleName: string): boolean {
    const externalModules = this.config.externalModules || [];

    for (const pattern of externalModules) {
      if (pattern.endsWith('*')) {
        // Wildcard pattern (e.g., "node:*")
        const prefix = pattern.slice(0, -1);
        if (moduleName.startsWith(prefix)) {
          return true;
        }
      } else if (moduleName === pattern) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find similar symbol names (for suggestions)
   */
  private findSimilarSymbols(target: string, maxResults: number = 3): string[] {
    const similar: string[] = [];

    for (const key of this.symbolRegistry.keys()) {
      if (key.includes('@')) continue; // Skip qualified names

      // Simple similarity: check if target is substring or vice versa
      if (
        key.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(key.toLowerCase())
      ) {
        similar.push(key);
        if (similar.length >= maxResults) break;
      }
    }

    return similar;
  }

  /**
   * Check if file exists (try multiple path resolutions)
   */
  private fileExists(filePath: string, sourceFile: string): boolean {
    // Try absolute path
    if (this.fileRegistry.has(filePath)) {
      return true;
    }

    // Try relative to source file
    const sourceDir = path.dirname(sourceFile);
    const resolved = path.resolve(sourceDir, filePath);
    if (this.fileRegistry.has(resolved)) {
      return true;
    }

    // Try as module path (src/...)
    for (const registeredFile of this.fileRegistry) {
      if (registeredFile.endsWith(filePath) || registeredFile.includes(filePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all TypeScript files recursively
   */
  private getAllTsFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === '__tests__' ||
          entry.name === '.git'
        ) {
          continue;
        }
        files.push(...this.getAllTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Get symbol registry for testing/debugging
   * @internal
   * @returns Returns Map<string, ExtractedEnhancedDoc>
   */
  getSymbolRegistry(): Map<string, ExtractedEnhancedDoc> {
    return this.symbolRegistry;
  }
}
