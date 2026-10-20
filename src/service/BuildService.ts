/**
 * Build Service - Coordinates symbol extraction and database population
 * @packageDocumentation
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { ASTSymbolExtractor, type ExtractedSymbol } from '../analyzer/ASTSymbolExtractor';
import { BlockChunkAnalyzer } from '../analyzer/BlockChunkAnalyzer';
import { DependencyChainAnalyzer } from '../analyzer/DependencyChainAnalyzer';
import { EndpointDetectionAnalyzer } from '../analyzer/EndpointDetectionAnalyzer';
import { EntryPointDetector } from '../analyzer/EntryPointDetector';
import { ExplicitSemanticRelationAnalyzer } from '../analyzer/ExplicitSemanticRelationAnalyzer';
import { ExposureAnalyzer } from '../analyzer/ExposureAnalyzer';
import { FeatureGroupingAnalyzer } from '../analyzer/FeatureGroupingAnalyzer';
import { LayerDependencyAnalyzer } from '../analyzer/LayerDependencyAnalyzer';
import { RelationshipInferenceEngine } from '../analyzer/RelationshipInferenceEngine';
import { SymbolIdentifierGenerator } from '../analyzer/SymbolIdentifierGenerator';
import { TestCoverageAnalyzer } from '../analyzer/TestCoverageAnalyzer';
import { TestSymbolParser } from '../parser/TestSymbolParser';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { Symbol, SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';
import type { TestSymbol } from '../types/test-symbols';

/** Counters and diagnostics of one build */
export interface BuildCounters {
  filesScanned: number;
  symbolsFound: number;
  symbolsInserted: number;
  symbolsCollisions: number;
  relationshipsFound: number;
  relationshipsInserted: number;
  /** Relationships to external symbols (not errors) */
  relationshipsSkipped: number;
  docRelationships: number;
  semanticRelationships: number;
  inferredRelationships: number;
  inheritanceRelationships: number;
  endpointHandlerRelationships: number;
  endpointsFound: number;
  endpointsInserted: number;
  blocksFound: number;
  blocksInserted: number;
  blockDependenciesFound: number;
  entryPointsFound: number;
  entryPointsInserted: number;
  exposureAnalyzed: number;
  errors: string[];
}

/** Outcome of {@link BuildService.build} */
export type BuildResult =
  | {
      /** Every candidate file was unchanged since the last build. */
      status: 'up-to-date';
    }
  | (BuildCounters & {
      status: 'built';
      durationMs: number;
      /** Registry JSONL written for the processed symbols. */
      registryPath: string;
    });

/** Progress severity, mirroring the command print helpers */
export type BuildProgressLevel = 'info' | 'success' | 'warning';

/** Options for a build */
export interface BuildOptions {
  /** Directory scanned for TypeScript files. Must exist. */
  targetPath: string;
  /** SQLite database to populate. */
  databasePath: string;
  /** Directory for the JSONL export (created when missing). */
  jsonlPath: string;
  /** Directory receiving registry.jsonl. Defaults to `<cwd>/.tsdoc`. */
  registryDir?: string;
  /** Reprocess every file instead of only the changed ones. */
  forceRebuild?: boolean;
  /** Skip `.test.ts` and `.spec.ts` files. */
  excludeTests?: boolean;
  /** Receives human-oriented progress messages. */
  onProgress?: (message: string, level: BuildProgressLevel) => void;
}

interface ExplicitSemanticResolution {
  relationship?: UnifiedRelationship;
  diagnostic?: string;
}

interface PendingRelationship {
  type: string;
  from: string;
  to: string;
  filePath: string;
  description?: string;
  line?: number;
}

interface PendingDocRelationship {
  symbolId: string;
  symbolName: string;
  docRef: string;
  filePath: string;
  line: number;
}

/** Everything the per-file passes share while one build runs. */
interface BuildContext {
  readonly dbManager: DatabaseManager;
  readonly targetPath: string;
  readonly counters: BuildCounters;
  readonly extractor: ASTSymbolExtractor;
  readonly testParser: TestSymbolParser;
  readonly idGenerator: SymbolIdentifierGenerator;
  readonly program: ts.Program;
  readonly endpointAnalyzer: EndpointDetectionAnalyzer;
  readonly blockAnalyzer: BlockChunkAnalyzer;
  readonly exposureAnalyzer: ExposureAnalyzer;
  readonly entryPointDetector: EntryPointDetector;
  /** id -> first file path, to detect collisions */
  readonly seenIds: Map<string, string>;
  /** Global symbol name -> id mapping for relationship insertion */
  readonly symbolIdMap: Map<string, string>;
  /** Relationships inserted after every symbol is known */
  readonly allRelationships: PendingRelationship[];
  /** Symbol -> document relationships */
  readonly allDocRelationships: PendingDocRelationship[];
  /** Test symbols collected for coverage relationships */
  readonly allTestSymbols: TestSymbol[];
  /** JSONL registry lines; the first line is the required metadata header */
  readonly registryLines: string[];
  readonly progress: (message: string, level: BuildProgressLevel) => void;
}

/**
 * Service for building and populating the symbol database
 *
 * @doc [[BuildService]]
 * @public
 * @responsibility Scan TypeScript sources and populate the symbol, relationship and registry stores
 * @contract Given paths and flags, return counters; never print and never parse CLI arguments
 *
 * @problem BuildCommand mixed argument parsing, a 1,100-line workflow and output formatting
 * @solves The database construction workflow lives in one testable service
 * @context Used by BuildCommand after the canonical graph refresh
 *
 * @functionality
 * - File selection: recursive scan, optional test exclusion, hash-based incremental filter
 * - Symbol pass: symbols, endpoints, entry points, code blocks and exposure per file
 * - Relationship passes: static, test coverage, doc references, semantic, inferred, endpoint handlers
 * - Persistence: SQLite rows, JSONL registry and sync metadata
 *
 * @decision Move the existing workflow without changing what it writes
 * @rationale A refactor must leave the database content for a given source tree identical
 * @consequences Progress is reported through a callback; the command decides whether to show it
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason Persistence of every extracted fact
 */
export class BuildService {
  /**
   * Run the build process.
   *
   * Opens (and always closes) the database, so a failure while scanning cannot leak the handle.
   *
   * @param options - Paths and flags of this build
   * @returns Counters of a finished build, or `up-to-date` when nothing changed
   */
  async build(options: BuildOptions): Promise<BuildResult> {
    // Ensure jsonl directory exists
    if (!fs.existsSync(options.jsonlPath)) {
      fs.mkdirSync(options.jsonlPath, { recursive: true });
    }

    // Initialize database
    const dbManager = new DatabaseManager(options.databasePath, options.jsonlPath);
    try {
      return await this.populate(dbManager, options);
    } finally {
      dbManager.close();
    }
  }

  private async populate(dbManager: DatabaseManager, options: BuildOptions): Promise<BuildResult> {
    const progress = options.onProgress ?? (() => {});
    const { targetPath } = options;

    // Find TypeScript files
    progress('Scanning TypeScript files...', 'info');
    const startTime = Date.now();

    let allFiles = this.findTypeScriptFiles(targetPath);

    // Filter out test files if requested
    if (options.excludeTests) {
      const originalCount = allFiles.length;
      allFiles = allFiles.filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.spec.ts'));
      const excluded = originalCount - allFiles.length;
      if (excluded > 0) {
        progress(`Excluded ${excluded} test files`, 'info');
      }
    }

    // Filter files based on incremental build
    let files = allFiles;
    if (!options.forceRebuild) {
      const changedFiles: string[] = [];
      let skippedFiles = 0;

      for (const file of allFiles) {
        if (this.isFileChanged(dbManager, file)) {
          changedFiles.push(file);
        } else {
          skippedFiles++;
        }
      }

      files = changedFiles;

      if (skippedFiles > 0) {
        progress(`Skipped ${skippedFiles} unchanged files (incremental build)`, 'success');
      }
    }

    if (files.length === 0) {
      progress('No files to process - all files are up to date', 'success');
      return { status: 'up-to-date' };
    }

    progress(`Processing ${files.length} file(s)...`, 'info');

    // Initialize TypeScript program for advanced analyzers
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      allowJs: true,
      checkJs: false,
      noEmit: true,
    };
    const program = ts.createProgram(allFiles, compilerOptions);

    // Prepare JSONL registry (use .tsdoc directly for consistency with other commands)
    const registryDir = options.registryDir ?? path.join(process.cwd(), '.tsdoc');
    const registryPath = path.join(registryDir, 'registry.jsonl');

    const counters: BuildCounters = {
      filesScanned: 0,
      symbolsFound: 0,
      symbolsInserted: 0,
      symbolsCollisions: 0,
      relationshipsFound: 0,
      relationshipsInserted: 0,
      relationshipsSkipped: 0,
      docRelationships: 0,
      semanticRelationships: 0,
      inferredRelationships: 0,
      inheritanceRelationships: 0,
      endpointHandlerRelationships: 0,
      endpointsFound: 0,
      endpointsInserted: 0,
      blocksFound: 0,
      blocksInserted: 0,
      blockDependenciesFound: 0,
      entryPointsFound: 0,
      entryPointsInserted: 0,
      exposureAnalyzed: 0,
      errors: [],
    };

    const context: BuildContext = {
      dbManager,
      targetPath,
      counters,
      extractor: new ASTSymbolExtractor(),
      testParser: new TestSymbolParser(),
      idGenerator: new SymbolIdentifierGenerator(process.cwd()),
      program,
      endpointAnalyzer: new EndpointDetectionAnalyzer(program),
      blockAnalyzer: new BlockChunkAnalyzer(program),
      exposureAnalyzer: new ExposureAnalyzer(process.cwd()),
      entryPointDetector: new EntryPointDetector(program, process.cwd()),
      seenIds: new Map(),
      symbolIdMap: new Map(),
      allRelationships: [],
      allDocRelationships: [],
      allTestSymbols: [],
      // First line is metadata (required by SymbolRegistryManager)
      registryLines: [JSON.stringify({ version: '1.0.0', idGeneratorMode: 'sequential' })],
      progress,
    };

    for (const filePath of files) {
      this.processFile(context, filePath);
    }

    // Insert all relationships after all symbols are collected
    progress('Inserting relationships...', 'info');
    this.insertStaticRelationships(context);
    this.insertTestRelationships(context);
    this.insertDocRelationships(context);
    await this.insertSemanticRelationships(context);
    this.insertEndpointHandlerRelationships(context);

    const durationMs = Date.now() - startTime;

    // Write JSONL registry (ensure directory exists)
    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }
    fs.writeFileSync(registryPath, context.registryLines.join('\n'), 'utf-8');

    // Update sync metadata for processed files (for incremental builds)
    for (const filePath of files) {
      this.updateSyncMetadata(dbManager, filePath);
    }

    return { ...counters, status: 'built', durationMs, registryPath };
  }

  /** Extract and store the symbols (and the facts derived from them) of one file. */
  private processFile(context: BuildContext, filePath: string): void {
    const { counters } = context;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const isTestFile = filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts');

      counters.filesScanned++;

      if (isTestFile) {
        this.processTestFile(context, filePath, content);
      } else {
        this.processImplementationFile(context, filePath, content);
      }
    } catch (error) {
      counters.errors.push(`Error scanning ${filePath}: ${error}`);
    }
  }

  /** Process a test file with TestSymbolParser. */
  private processTestFile(context: BuildContext, filePath: string, content: string): void {
    const {
      dbManager,
      counters,
      testParser,
      idGenerator,
      allTestSymbols,
      seenIds,
      symbolIdMap,
      registryLines,
    } = context;

    const testResult = testParser.extract(filePath, content);
    counters.symbolsFound += testResult.testSymbols.length;

    // Collect test symbols for relationship extraction
    allTestSymbols.push(...testResult.testSymbols);

    // Insert test symbols
    for (const testSymbol of testResult.testSymbols) {
      // Generate stable identifiers for test symbols
      const identifiers = idGenerator.generateIdentifiers(
        filePath,
        testSymbol.name,
        testSymbol.type,
        false, // test symbols are typically not exported
        undefined
      );

      // Use testSymbol.id if already generated, otherwise use identifiers.legacyId
      const id = testSymbol.id || identifiers.legacyId;

      // Check for ID collision
      if (seenIds.has(id)) {
        counters.symbolsCollisions++;
        counters.errors.push(`ID collision: ${id} (${filePath} vs ${seenIds.get(id)})`);
        continue; // Skip duplicate
      }
      seenIds.set(id, filePath);

      const fullSymbol = {
        ...testSymbol,
        id,
        uuid: identifiers.uuid,
        localPath: identifiers.localPath,
        globalPath: identifiers.globalPath,
        scope: identifiers.scope,
        tests: [],
        designDecisions: [],
      };

      const success = dbManager.insertSymbol(fullSymbol, 0);
      if (success) {
        counters.symbolsInserted++;

        // Store mapping for relationship insertion
        symbolIdMap.set(testSymbol.name, testSymbol.id);

        // Add to JSONL registry
        registryLines.push(
          JSON.stringify({
            id: testSymbol.id,
            sourceRef: {
              filePath: testSymbol.filePath,
              line: testSymbol.line,
              column: testSymbol.column,
              symbolName: testSymbol.name,
              type: testSymbol.type,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      } else {
        counters.errors.push(`Failed to insert test symbol: ${testSymbol.name} in ${filePath}`);
      }
    }

    // Handle test extraction errors
    if (testResult.errors.length > 0) {
      counters.errors.push(...testResult.errors.map((e) => `${e.file}:${e.line} ${e.message}`));
    }
  }

  /** Process an implementation file with ASTSymbolExtractor. */
  private processImplementationFile(
    context: BuildContext,
    filePath: string,
    content: string
  ): void {
    const { counters, extractor, allRelationships } = context;

    const extractResult = extractor.extract(filePath, content);

    counters.symbolsFound += extractResult.symbols.length;
    counters.relationshipsFound += extractResult.relationships.length;

    // Collect relationships for later insertion
    allRelationships.push(...extractResult.relationships);

    this.insertFileSymbols(context, filePath, content, extractResult.symbols);
    this.insertFileEndpoints(context, filePath);
    this.insertFileEntryPoints(context, filePath);
    this.insertFileCodeBlocks(context, filePath, extractResult.symbols);
  }

  /** Insert symbols, their registry entries, doc tags and exposure. */
  private insertFileSymbols(
    context: BuildContext,
    filePath: string,
    content: string,
    symbols: ExtractedSymbol[]
  ): void {
    const {
      dbManager,
      counters,
      idGenerator,
      exposureAnalyzer,
      seenIds,
      symbolIdMap,
      allDocRelationships,
      registryLines,
    } = context;

    for (const symbol of symbols) {
      // Generate stable identifiers using SymbolIdentifierGenerator
      const identifiers = idGenerator.generateIdentifiers(
        filePath,
        symbol.name,
        symbol.type,
        symbol.isExported,
        symbol.parentSymbol
      );

      // Use legacy ID for backwards compatibility and primary key
      let id = identifiers.legacyId;

      // If ID collision within same build, add line number for uniqueness
      if (seenIds.has(id)) {
        id = `${id}-L${symbol.line}`;
      }

      // Check for ID collision (shouldn't happen after adding line number)
      if (seenIds.has(id)) {
        counters.symbolsCollisions++;
        counters.errors.push(`ID collision: ${id} (${filePath} vs ${seenIds.get(id)})`);
        continue;
      }
      seenIds.set(id, filePath);

      const fullSymbol = {
        ...symbol,
        id,
        uuid: identifiers.uuid,
        localPath: identifiers.localPath,
        globalPath: identifiers.globalPath,
        scope: identifiers.scope,
        tests: [],
        designDecisions: [],
      };

      const success = dbManager.insertSymbol(fullSymbol, 0);
      if (success) {
        counters.symbolsInserted++;

        // Store mapping for relationship insertion
        symbolIdMap.set(symbol.name, id);

        // Add to JSONL registry (SymbolRegistryEntry format)
        registryLines.push(
          JSON.stringify({
            id,
            sourceRef: {
              filePath: symbol.filePath,
              line: symbol.line,
              column: symbol.column,
              symbolName: symbol.name,
              type: symbol.type,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );

        // Extract @doc tags for this symbol
        const docTags = this.extractDocTags(content, symbol.line);
        for (const docRef of docTags) {
          allDocRelationships.push({
            symbolId: id,
            symbolName: symbol.name,
            docRef,
            filePath: symbol.filePath,
            line: symbol.line,
          });
        }
      } else {
        counters.errors.push(`Failed to insert: ${symbol.name} in ${filePath}`);
      }

      // Analyze exposure for exported symbols
      if (symbol.isExported) {
        try {
          const exposure = exposureAnalyzer.analyzeSymbol(fullSymbol);
          const exposureStored = dbManager.updateSymbolExposure(id, {
            exposureScope: exposure.exposureScope,
            exportPath: exposure.exportPath,
            accessibility: exposure.accessibility,
            visibilityBoundaries: exposure.visibilityBoundary,
          });
          if (exposureStored) {
            counters.exposureAnalyzed++;
          }
        } catch (_expError) {
          // Non-critical, continue
        }
      }
    }
  }

  /** Detect and store HTTP endpoints in a file. */
  private insertFileEndpoints(context: BuildContext, filePath: string): void {
    const { dbManager, counters, endpointAnalyzer } = context;

    try {
      const endpoints = endpointAnalyzer.analyzeFile(filePath);
      counters.endpointsFound += endpoints.length;

      for (const endpoint of endpoints) {
        const success = dbManager.insertEndpoint({
          id: endpoint.id,
          method: endpoint.method,
          path: endpoint.path,
          pathParams: endpoint.pathParams.length > 0 ? JSON.stringify(endpoint.pathParams) : null,
          queryParams: endpoint.queryParams ? JSON.stringify(endpoint.queryParams) : null,
          handlerSymbolId: endpoint.handlerSymbolId,
          controllerSymbolId: endpoint.controllerSymbolId ?? null,
          requestType: endpoint.requestType ?? null,
          responseType: endpoint.responseType ?? null,
          scope: endpoint.scope,
          middlewares:
            endpoint.middlewares.length > 0 ? JSON.stringify(endpoint.middlewares) : null,
          filePath: endpoint.filePath,
          line: endpoint.line ?? null,
          description: endpoint.description ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        if (success) {
          counters.endpointsInserted++;
        }
      }
    } catch (_endpointError) {
      // Non-critical, continue
    }
  }

  /** Detect and store entry points in a file. */
  private insertFileEntryPoints(context: BuildContext, filePath: string): void {
    const { dbManager, counters, entryPointDetector } = context;

    try {
      const entryPoints = entryPointDetector.analyzeFile(filePath);
      counters.entryPointsFound += entryPoints.length;

      for (const ep of entryPoints) {
        const success = dbManager.insertEntryPoint({
          id: ep.id,
          type: ep.type,
          filePath: ep.filePath,
          symbolId: ep.symbolId ?? null,
          functionName: ep.functionName ?? null,
          line: ep.line,
          description: ep.description ?? null,
          isAsync: ep.isAsync,
          bootstrapOrder: ep.bootstrapOrder ?? null,
          dependencies: ep.dependencies.length > 0 ? JSON.stringify(ep.dependencies) : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        if (success) {
          counters.entryPointsInserted++;
        }
      }
    } catch (_entryPointError) {
      // Non-critical, continue
    }
  }

  /** Analyze code blocks for the functions and methods of a file. */
  private insertFileCodeBlocks(
    context: BuildContext,
    filePath: string,
    symbols: ExtractedSymbol[]
  ): void {
    const { dbManager, counters, program, blockAnalyzer, symbolIdMap } = context;

    for (const symbol of symbols) {
      if (symbol.type === 'function' || symbol.type === 'method') {
        try {
          const sourceFile = program.getSourceFile(filePath);
          if (sourceFile) {
            // Find the function/method node
            const findNode = (
              node: ts.Node
            ): ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | null => {
              if (
                ts.isFunctionDeclaration(node) ||
                ts.isMethodDeclaration(node) ||
                ts.isArrowFunction(node)
              ) {
                const nodePos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                if (nodePos.line + 1 === symbol.line) {
                  return node;
                }
              }
              let found: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | null =
                null;
              ts.forEachChild(node, (child) => {
                if (!found) {
                  found = findNode(child);
                }
              });
              return found;
            };

            const functionNode = findNode(sourceFile);
            if (functionNode) {
              const symbolId = symbolIdMap.get(symbol.name);
              if (symbolId) {
                const blockResult = blockAnalyzer.analyzeFunction(functionNode, symbolId, filePath);
                counters.blocksFound += blockResult.blocks.length;

                for (const block of blockResult.blocks) {
                  const success = dbManager.insertCodeBlock({
                    id: block.id,
                    symbolId: block.symbolId,
                    type: block.type,
                    startLine: block.startLine,
                    endLine: block.endLine,
                    purpose: block.purpose ?? null,
                    dependencies:
                      block.dependencies.length > 0 ? JSON.stringify(block.dependencies) : null,
                    sideEffects:
                      block.sideEffects.length > 0 ? JSON.stringify(block.sideEffects) : null,
                    scope: block.scope ?? null,
                    complexity: block.complexity ?? null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });

                  if (success) {
                    counters.blocksInserted++;

                    // Create relationships for block dependencies
                    counters.blockDependenciesFound += block.dependencies.length;
                    for (const depName of block.dependencies) {
                      const depSymbolId = symbolIdMap.get(depName);
                      if (depSymbolId) {
                        const relId = `block-dep-${block.id}-${depSymbolId}`;
                        dbManager.insertUnifiedRelationship({
                          id: relId,
                          type: 'calls',
                          category: 'behavioral',
                          fromSymbols: [block.id],
                          toSymbols: [depSymbolId],
                          direction: 'unidirectional',
                          strength: 'medium',
                          evidence: [
                            {
                              type: 'code',
                              source: filePath,
                              lineNumber: block.startLine,
                              confidence: 0.8,
                            },
                          ],
                          discoveredBy: 'block-analyzer',
                          confidence: 0.8,
                          filePath,
                          line: block.startLine,
                          properties: {
                            relationshipContext: 'block-dependency',
                            blockType: block.type,
                          },
                          description: `Block ${block.id} uses ${depName}`,
                        });
                        // Don't count these in main relationships stats
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (_blockError) {
          // Non-critical, continue
        }
      }
    }
  }

  /** Insert the relationships extracted from source (calls, extends, implements, re-exports). */
  private insertStaticRelationships(context: BuildContext): void {
    const { dbManager, counters, allRelationships, symbolIdMap } = context;

    for (const relationship of allRelationships) {
      try {
        // Handle re-export relationships specially
        if (relationship.type === 're-exports') {
          const toId = symbolIdMap.get(relationship.to);
          if (toId) {
            const unifiedId =
              `re-export-${relationship.from.replace(/[^a-z0-9]+/gi, '-')}-${toId}`.toLowerCase();
            dbManager.insertUnifiedRelationship({
              id: unifiedId,
              type: 're-export',
              category: 'structural',
              fromSymbols: [relationship.from],
              toSymbols: [toId],
              direction: 'unidirectional',
              strength: 'medium',
              evidence: [
                {
                  type: 'code',
                  source: relationship.filePath,
                  confidence: 1.0,
                },
              ],
              discoveredBy: 'static-analysis',
              confidence: 1.0,
              filePath: relationship.filePath,
              line: relationship.line,
              description: relationship.description,
            });
            counters.relationshipsInserted++;
          }
          continue;
        }

        // Get symbol IDs from the map
        const fromId = symbolIdMap.get(relationship.from);
        const toId = symbolIdMap.get(relationship.to);

        if (fromId && toId) {
          // Insert into legacy dependencies table
          const success = dbManager.insertDependency({
            symbolId: fromId,
            target: toId,
            type: relationship.type,
            reason: relationship.description || `${relationship.type} relationship`,
            importPath: relationship.filePath,
          });

          // Map relationship type to unified relationship type and category
          let unifiedType = 'code-dependency';
          const category = 'structural';

          if (relationship.type === 'extends') {
            unifiedType = 'inheritance';
          } else if (relationship.type === 'implements') {
            unifiedType = 'implementation';
          } else if (relationship.type === 'dependsOn') {
            unifiedType = 'code-dependency';
          }

          // Also insert into unified_relationships table
          const unifiedId = `${unifiedType}-${fromId}-${toId}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
          dbManager.insertUnifiedRelationship({
            id: unifiedId,
            type: unifiedType,
            category: category,
            fromSymbols: [fromId],
            toSymbols: [toId],
            direction: 'unidirectional',
            strength: 'strong',
            evidence: [
              {
                type: 'code',
                source: relationship.filePath,
                confidence: 1.0,
              },
            ],
            discoveredBy: 'static-analysis',
            confidence: 1.0,
            filePath: relationship.filePath,
            description:
              relationship.description ||
              `${relationship.from} ${relationship.type} ${relationship.to}`,
          });

          if (success) {
            counters.relationshipsInserted++;
            if (relationship.type === 'extends' || relationship.type === 'implements') {
              counters.inheritanceRelationships++;
            }
          }
        } else {
          // Symbol not found in map - likely an external type (e.g., EventEmitter, Promise)
          // This is expected behavior, not an error
          counters.relationshipsSkipped++;
        }
      } catch (_error) {
        counters.errors.push(
          `Failed to insert relationship: ${relationship.from} -> ${relationship.to}`
        );
      }
    }
  }

  /** Extract and insert test coverage, hierarchy and scenario relationships. */
  private insertTestRelationships(context: BuildContext): void {
    const { dbManager, counters, allTestSymbols, progress } = context;

    if (allTestSymbols.length === 0) return;

    progress(`Extracting test relationships (${allTestSymbols.length} test symbols)...`, 'info');
    const coverageAnalyzer = new TestCoverageAnalyzer(dbManager);
    const testRelationships = coverageAnalyzer.analyzeTestCoverage(allTestSymbols);

    // Insert test-coverage relationships
    for (const testRel of testRelationships.testCoverageRelations) {
      try {
        dbManager.insertUnifiedRelationship({
          id: testRel.id,
          type: testRel.type,
          category: testRel.category,
          fromSymbols: testRel.fromSymbols,
          toSymbols: testRel.toSymbols,
          direction: 'unidirectional',
          strength: testRel.confidence > 0.7 ? 'strong' : 'medium',
          evidence: [
            {
              type: 'test',
              source: 'test-code-analysis',
              confidence: testRel.confidence,
            },
          ],
          discoveredBy: 'test-parser',
          confidence: testRel.confidence,
          description: `Test coverage: ${testRel.metadata.testedMethods?.join(', ') || 'unknown'} (${testRel.metadata.assertionCount || 0} assertions)`,
        });
        counters.relationshipsInserted++;
      } catch (_error) {
        counters.errors.push(`Failed to insert test-coverage relationship: ${testRel.id}`);
      }
    }

    // Insert contains relationships (test hierarchy)
    for (const containsRel of testRelationships.containsRelations) {
      try {
        dbManager.insertUnifiedRelationship({
          id: containsRel.id,
          type: containsRel.type,
          category: containsRel.category,
          fromSymbols: containsRel.fromSymbols,
          toSymbols: containsRel.toSymbols,
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [
            {
              type: 'structural',
              source: 'test-suite-hierarchy',
              confidence: 1.0,
            },
          ],
          discoveredBy: 'test-parser',
          confidence: 1.0,
          description: `Test hierarchy (nesting level: ${containsRel.metadata.nestingLevel})`,
        });
        counters.relationshipsInserted++;
      } catch (_error) {
        counters.errors.push(`Failed to insert contains relationship: ${containsRel.id}`);
      }
    }

    // Insert covers-scenario relationships
    for (const scenarioRel of testRelationships.coversScenarioRelations) {
      try {
        dbManager.insertUnifiedRelationship({
          id: scenarioRel.id,
          type: scenarioRel.type,
          category: scenarioRel.category,
          fromSymbols: scenarioRel.fromSymbols,
          toSymbols: scenarioRel.toSymbols,
          direction: 'unidirectional',
          strength: scenarioRel.confidence > 0.7 ? 'medium' : 'weak',
          evidence: [
            {
              type: 'semantic',
              source: 'scenario-matching',
              confidence: scenarioRel.confidence,
            },
          ],
          discoveredBy: 'test-parser',
          confidence: scenarioRel.confidence,
          description: `Test case covers scenario`,
        });
        counters.relationshipsInserted++;
      } catch (_error) {
        counters.errors.push(`Failed to insert covers-scenario relationship: ${scenarioRel.id}`);
      }
    }

    // Log coverage stats
    const stats = testRelationships.coverageStats;
    progress(
      `Test coverage: ${stats.testCasesWithCoverage}/${stats.totalTestCases} test cases cover ${stats.totalTestedSymbols} symbols`,
      'success'
    );
    progress(`Average assertions per test: ${stats.averageAssertions.toFixed(1)}`, 'info');
    if (stats.totalScenarios > 0) {
      progress(
        `Scenario coverage: ${stats.scenariosWithCoverage}/${stats.totalScenarios} scenarios covered`,
        'info'
      );
    }
  }

  /** Insert symbol -> document relationships from `@doc [[Ref]]` tags. */
  private insertDocRelationships(context: BuildContext): void {
    const { dbManager, counters, allDocRelationships, progress } = context;

    progress('Inserting document relationships...', 'info');

    for (const docRel of allDocRelationships) {
      try {
        const relationshipId = `doc-${docRel.symbolId}-${docRel.docRef}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const success = dbManager.insertUnifiedRelationship({
          id: relationshipId,
          type: 'doc-reference',
          category: 'semantic',
          fromSymbols: [docRel.symbolId],
          toSymbols: [`doc:${docRel.docRef}`],
          direction: 'bidirectional',
          strength: 'strong', // Doc references are explicit, so strong
          evidence: [
            {
              type: 'documentation',
              source: docRel.filePath,
              lineNumber: docRel.line,
              confidence: 1.0,
            },
          ],
          discoveredBy: 'documentation',
          confidence: 1.0,
          filePath: docRel.filePath,
          line: docRel.line,
          properties: {
            docTag: true,
            sourceType: 'tsdoc-tag',
          },
          description: `${docRel.symbolName} documented in [[${docRel.docRef}]]`,
        });

        if (success) {
          counters.docRelationships++;
        }
      } catch (_error) {
        counters.errors.push(
          `Failed to insert doc relationship: ${docRel.symbolName} -> ${docRel.docRef}`
        );
      }
    }
  }

  /** Analyze, resolve and insert semantic, inferred and test-example relationships. */
  private async insertSemanticRelationships(context: BuildContext): Promise<void> {
    const { dbManager, counters, targetPath, progress } = context;

    progress('Analyzing semantic relationships...', 'info');

    try {
      // Build SymbolGraph from database for analyzers
      const allSymbols = dbManager.getAllSymbols();
      const symbolMap = new Map(allSymbols.map((s) => [s.id, s]));

      // Build indexes for SymbolGraph
      const nameIndex = new Map<string, string[]>();
      const fileIndex = new Map<string, string[]>();

      for (const symbol of allSymbols) {
        // Name index
        if (!nameIndex.has(symbol.name)) {
          nameIndex.set(symbol.name, []);
        }
        nameIndex.get(symbol.name)?.push(symbol.id);

        // File index
        if (!fileIndex.has(symbol.filePath)) {
          fileIndex.set(symbol.filePath, []);
        }
        fileIndex.get(symbol.filePath)?.push(symbol.id);
      }

      // Get existing relationships from database to populate the graph
      const existingRels = dbManager.getAllUnifiedRelationships();
      const relationships = existingRels.map((rel) => ({
        from: typeof rel.from === 'string' ? rel.from : rel.from[0],
        to: typeof rel.to === 'string' ? rel.to : rel.to[0],
        type: rel.type as 'relatedTo' | 'dependsOn' | 'usedBy' | 'implements' | 'extends',
        filePath: rel.filePath || '',
        line: rel.line,
      }));

      // Build adjacency lists
      const adjacencyList = new Map<string, string[]>();
      const reverseAdjacencyList = new Map<string, string[]>();
      for (const rel of relationships) {
        if (!adjacencyList.has(rel.from)) adjacencyList.set(rel.from, []);
        adjacencyList.get(rel.from)?.push(rel.to);
        if (!reverseAdjacencyList.has(rel.to)) reverseAdjacencyList.set(rel.to, []);
        reverseAdjacencyList.get(rel.to)?.push(rel.from);
      }

      const symbolGraph: SymbolGraph = {
        symbols: symbolMap,
        relationships,
        nameIndex,
        fileIndex,
        adjacencyList,
        reverseAdjacencyList,
      };

      // Helper to transform UnifiedRelationship to batch insert format
      const toBatchFormat = (rel: UnifiedRelationship) => ({
        id: rel.id,
        type: rel.type,
        category: rel.category,
        fromSymbols: Array.isArray(rel.from) ? rel.from : [rel.from],
        toSymbols: Array.isArray(rel.to) ? rel.to : [rel.to],
        direction: rel.direction,
        strength: rel.strength,
        evidence: rel.evidence,
        discoveredBy: rel.discoveredBy,
        confidence: rel.confidence,
        filePath: rel.filePath,
        line: rel.line,
        properties: rel.properties,
        description: rel.description,
      });

      // 1. Naming Pattern Relations - DISABLED (produces noise based on name similarity)

      // 2. Explicit Semantic Relations (@relatedTo tags)
      const explicitAnalyzer = new ExplicitSemanticRelationAnalyzer();
      const explicitRelations = explicitAnalyzer.analyze(targetPath);
      const resolvedExplicitRelations: UnifiedRelationship[] = [];

      for (const relation of explicitRelations) {
        const resolution = this.resolveExplicitSemanticRelation(relation, symbolGraph);
        if (resolution.relationship) {
          resolvedExplicitRelations.push(resolution.relationship);
          continue;
        }

        // Remove a previously persisted raw-name relation with the same stable ID.
        // Otherwise an unresolved tag would remain in the database after a later rebuild.
        dbManager.deleteRelationship(relation.id);
        counters.relationshipsSkipped++;
        counters.errors.push(
          `[explicit-semantic-resolution] ${resolution.diagnostic ?? `Unable to resolve ${relation.id}`}`
        );
      }

      const explicitInserted = dbManager.batchInsertUnifiedRelationships(
        resolvedExplicitRelations.map(toBatchFormat)
      );
      counters.semanticRelationships += explicitInserted;

      const explicitStats = explicitAnalyzer.getStatistics(explicitRelations);
      progress(
        `Explicit semantic: ${explicitInserted} relationships (${explicitStats.withDescription} with descriptions)`,
        'success'
      );

      // 3. Feature Grouping Relations
      const featureAnalyzer = new FeatureGroupingAnalyzer(symbolGraph);
      const featureRelations = featureAnalyzer.analyze(targetPath);
      const featureInserted = dbManager.batchInsertUnifiedRelationships(
        featureRelations.map(toBatchFormat)
      );
      counters.semanticRelationships += featureInserted;

      const featureStats = featureAnalyzer.getStatistics(featureRelations);
      progress(
        `Feature grouping: ${featureInserted} relationships across ${featureStats.uniqueFeatures} features`,
        'success'
      );

      // 4. Layer Dependency Analysis (architectural layer violations)
      const layerAnalyzer = new LayerDependencyAnalyzer(symbolGraph);
      const layerRelations = layerAnalyzer.analyze();
      const layerInserted = dbManager.batchInsertUnifiedRelationships(
        layerRelations.map(toBatchFormat)
      );
      counters.semanticRelationships += layerInserted;
      progress(`Layer dependencies: ${layerInserted} relationships`, 'success');

      // 5. Circular Dependency Detection
      const chainAnalyzer = new DependencyChainAnalyzer(symbolGraph);
      const circularRelations = chainAnalyzer.analyzeCircularDependencies();
      const circularInserted = dbManager.batchInsertUnifiedRelationships(
        circularRelations.map(toBatchFormat)
      );
      counters.semanticRelationships += circularInserted;
      progress(`Circular dependencies: ${circularInserted} detected`, 'success');

      // 6. Relationship Inference (generate new relationships from existing ones)
      progress('Inferring relationships from existing patterns...', 'info');
      const inferenceEngine = new RelationshipInferenceEngine();
      const allRelationships = dbManager.getAllUnifiedRelationships();
      const inferredRelationships = inferenceEngine.infer(allRelationships);
      counters.inferredRelationships = dbManager.batchInsertUnifiedRelationships(
        inferredRelationships.map(toBatchFormat)
      );

      const inferenceStats = inferenceEngine.getStatistics(allRelationships);
      progress(
        `Inferred relationships: ${counters.inferredRelationships} total (${inferenceStats.byRule['naming-transitivity'] || 0} naming, ${inferenceStats.byRule['feature-closure'] || 0} feature, ${inferenceStats.byRule['test-coverage-inheritance'] || 0} test)`,
        'success'
      );

      // 7. Test Example Extraction (extract test cases as documentation examples)
      progress('Extracting test examples for documentation...', 'info');
      const { TestExampleExtractor } = await import('../analyzer/TestExampleExtractor.js');
      const exampleExtractor = new TestExampleExtractor(dbManager);
      const testExamples = exampleExtractor.extractAllExamples();
      const exampleRelationships = exampleExtractor.createRelationships(testExamples);
      const testExamplesInserted = dbManager.batchInsertUnifiedRelationships(
        exampleRelationships.map(toBatchFormat)
      );

      const highQualityExamples = testExamples.filter((ex) => ex.quality >= 8);
      progress(
        `Test examples: ${testExamples.length} total (${highQualityExamples.length} high-quality, ${testExamplesInserted} relationships)`,
        'success'
      );
    } catch (error) {
      progress(
        `Failed to analyze semantic relationships: ${error instanceof Error ? error.message : String(error)}`,
        'warning'
      );
    }
  }

  /** Create endpoint -> handler call relationships. */
  private insertEndpointHandlerRelationships(context: BuildContext): void {
    const { dbManager, counters, progress } = context;

    progress('Creating endpoint-handler relationships...', 'info');

    try {
      const endpoints = dbManager.getAllEndpoints();
      for (const endpoint of endpoints) {
        if (endpoint.handlerSymbolId) {
          const relId = `endpoint-handler-${endpoint.id}`;
          const success = dbManager.insertUnifiedRelationship({
            id: relId,
            type: 'calls', // Endpoint calls/invokes handler
            category: 'behavioral',
            fromSymbols: [endpoint.id],
            toSymbols: [endpoint.handlerSymbolId],
            direction: 'unidirectional',
            strength: 'strong',
            evidence: [
              {
                type: 'code',
                source: endpoint.filePath,
                lineNumber: endpoint.line || 0,
                confidence: 1.0,
              },
            ],
            discoveredBy: 'endpoint-analyzer',
            confidence: 1.0,
            filePath: endpoint.filePath,
            line: endpoint.line || undefined,
            properties: {
              relationshipContext: 'endpoint-handler',
              method: endpoint.method,
              path: endpoint.path,
              scope: endpoint.scope,
            },
            description: `${endpoint.method} ${endpoint.path} → ${endpoint.handlerSymbolId}`,
          });

          if (success) {
            counters.endpointHandlerRelationships++;
          }
        }
      }

      if (counters.endpointHandlerRelationships > 0) {
        progress(
          `Endpoint-handler: ${counters.endpointHandlerRelationships} relationships`,
          'success'
        );
      }
    } catch (error) {
      progress(
        `Failed to create endpoint-handler relationships: ${error instanceof Error ? error.message : String(error)}`,
        'warning'
      );
    }
  }

  /** Resolve raw @relatedTo names into safe, materialized symbol IDs before persistence. */
  private resolveExplicitSemanticRelation(
    relationship: UnifiedRelationship,
    graph: SymbolGraph
  ): ExplicitSemanticResolution {
    const sourceName = Array.isArray(relationship.from) ? relationship.from[0] : relationship.from;
    const targetName = Array.isArray(relationship.to) ? relationship.to[0] : relationship.to;

    if (!sourceName || !targetName || !relationship.filePath) {
      return {
        diagnostic: `Relationship ${relationship.id} is missing a source, target, or file path`,
      };
    }

    const source = this.resolveExplicitSemanticEndpoint(
      sourceName,
      relationship.filePath,
      graph,
      false
    );
    if (!source.symbol) {
      return { diagnostic: `${relationship.id}: ${source.diagnostic}` };
    }

    const target = this.resolveExplicitSemanticEndpoint(
      targetName,
      relationship.filePath,
      graph,
      true
    );
    if (!target.symbol) {
      return { diagnostic: `${relationship.id}: ${target.diagnostic}` };
    }

    return {
      relationship: {
        ...relationship,
        from: source.symbol.id,
        to: target.symbol.id,
        properties: {
          ...relationship.properties,
          endpointResolution: {
            source: source.scope,
            target: target.scope,
          },
        },
      },
    };
  }

  /** Resolve a @relatedTo endpoint by local declaration first, then a unique exported symbol. */
  private resolveExplicitSemanticEndpoint(
    name: string,
    sourceFilePath: string,
    graph: SymbolGraph,
    allowGlobalPublic: boolean
  ): { symbol?: Symbol; scope?: 'same-file' | 'global-public'; diagnostic?: string } {
    const localCandidates = Array.from(graph.symbols.values()).filter(
      (symbol) =>
        symbol.name === name && symbol.filePath === sourceFilePath && !this.isTestSymbol(symbol)
    );
    if (localCandidates.length === 1) {
      return { symbol: localCandidates[0], scope: 'same-file' };
    }
    if (localCandidates.length > 1) {
      return { diagnostic: `ambiguous same-file symbol "${name}" in ${sourceFilePath}` };
    }
    if (!allowGlobalPublic) {
      return { diagnostic: `unresolved source symbol "${name}" in ${sourceFilePath}` };
    }

    const globalCandidates = (graph.nameIndex.get(name) ?? [])
      .map((id) => graph.symbols.get(id))
      .filter((symbol): symbol is Symbol => {
        if (!symbol) return false;
        return symbol.isExported && !this.isTestSymbol(symbol);
      });
    if (globalCandidates.length === 1) {
      return { symbol: globalCandidates[0], scope: 'global-public' };
    }
    if (globalCandidates.length > 1) {
      return { diagnostic: `ambiguous exported symbol "${name}"` };
    }

    return { diagnostic: `unresolved target symbol "${name}"` };
  }

  private isTestSymbol(symbol: Symbol): boolean {
    return ['test-suite', 'test-case', 'test-scenario'].includes(symbol.type);
  }

  /**
   * Recursively find TypeScript files
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        files.push(...this.findTypeScriptFiles(fullPath));
      } else if (entry.isFile()) {
        // Include all .ts files (including test files)
        if (fullPath.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Extract @doc tags from file content near a specific line
   * @param content - File content
   * @param symbolLine - Line number where symbol is defined
   * @returns Array of document references
   */
  private extractDocTags(content: string, symbolLine: number): string[] {
    const docTags: string[] = [];
    const lines = content.split('\n');

    // Search backwards from symbol line to find TSDoc comment block
    // Typically comments are within 50 lines before the symbol
    const searchStart = Math.max(0, symbolLine - 50);
    const searchEnd = symbolLine;

    for (let i = searchStart; i < searchEnd && i < lines.length; i++) {
      const line = lines[i];

      // Match @doc [[Symbol]] pattern
      const docTagRegex = /@doc\s+\[\[([^\]]+)\]\]/g;
      for (const match of line.matchAll(docTagRegex)) {
        const docRef = match[1].trim();
        if (docRef && !docTags.includes(docRef)) {
          docTags.push(docRef);
        }
      }
    }

    return docTags;
  }

  /**
   * Calculate SHA-256 hash of file content
   */
  private calculateFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if file has changed since last sync (incremental build)
   */
  private isFileChanged(dbManager: DatabaseManager, filePath: string): boolean {
    try {
      const currentHash = this.calculateFileHash(filePath);
      const storedHash = dbManager.getSyncMetadataHash(filePath);

      if (!storedHash) {
        // File not in metadata - needs processing
        return true;
      }

      // Compare hashes
      return storedHash !== currentHash;
    } catch {
      // If error, assume file changed
      return true;
    }
  }

  /**
   * Update sync metadata after processing file
   */
  private updateSyncMetadata(dbManager: DatabaseManager, filePath: string): void {
    try {
      const hash = this.calculateFileHash(filePath);
      dbManager.upsertSyncMetadata(filePath, hash, 'synced');
    } catch {
      // Silently ignore metadata update errors (non-critical)
    }
  }
}
