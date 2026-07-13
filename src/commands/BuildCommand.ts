/**
 * Build command for creating symbol database
 * @doc [[BuildCommand]]
 * @packageDocumentation
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { ASTSymbolExtractor } from '../analyzer/ASTSymbolExtractor';
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
import { ConfigManager } from '../config/ConfigManager';
import {
  CanonicalGraphCoordinator,
  type CanonicalGraphCoordinatorOptions,
  DEFAULT_GRAPH_TSCONFIG,
} from '../indexer';
import { BuildResultSchema } from '../output/schemas';
import { XmlBuilder } from '../output/XmlBuilder';
import { TestSymbolParser } from '../parser/TestSymbolParser';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { Symbol, SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';
import type { TestSymbol } from '../types/test-symbols';
import { BaseCommand, type CommandResult } from './BaseCommand';

export interface BuildCommandDependencies {
  readonly canonicalCoordinatorFactory?: (
    options: CanonicalGraphCoordinatorOptions
  ) => CanonicalGraphCoordinator;
}

interface ExplicitSemanticResolution {
  relationship?: UnifiedRelationship;
  diagnostic?: string;
}

/**
 * Command for building symbol database from source files
 *
 * @public
 * @responsibility Build and populate symbol database from TypeScript files
 * @contract Scan source files, extract symbols, and store in database
 *
 * @problem Need to extract all symbols from TypeScript codebase and make them searchable
 * @solves Scans TypeScript files, parses TSDoc, builds symbol graph, stores in SQLite + JSONL
 * @context Foundation for all other CLI commands that query symbol data
 *
 * @functionality
 * - Path validation: Check target directory exists
 * - File scanning: Find all TypeScript files (exclude tests, node_modules)
 * - Symbol extraction: Parse TSDoc and extract metadata
 * - Database storage: Insert into SQLite with indexes
 * - JSONL export: Git-friendly version control
 * - Statistics reporting: Files scanned, symbols found, duration
 *
 * @decision Use async scan with promise-based result
 * @rationale Large codebases require non-blocking I/O, better UX with progress
 * @consequences Slightly more complex error handling, but better performance
 *
 * @depends DatabaseManager, ConfigManager, ASTSymbolExtractor
 * @depType internal
 * @depReason Core infrastructure for symbol extraction and storage
 * @requires DatabaseManager
 * @requires ConfigManager
 * @requires ASTSymbolExtractor
 *
 * @doc [[BuildCommand]]
 */
export class BuildCommand extends BaseCommand {
  private configManager: ConfigManager;

  constructor(
    configManager?: ConfigManager,
    private readonly dependencies: BuildCommandDependencies = {}
  ) {
    super();
    this.configManager = configManager || ConfigManager.getInstance();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'build';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['b'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Build symbol database from source files';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge build [source-directory] [options]

  Default: src
  Options:
    --force          Force full rebuild (ignore file hashes)
    --incremental    Incremental build (only changed files, default)
    --exclude-tests  Exclude test files (.test.ts, .spec.ts) from indexing
    --canonical-graph  Explicitly refresh and persist the canonical ttsc graph revision
    --canonical-only   Skip the legacy symbol DB pass after the canonical refresh
    --router-module=<path>  Built graph-router artifact-source entrypoint
    --router-config=<path>  Router config (default: ttsc-graph-router.config.json)
    --router-repo=<id>      Router repo id (default: project directory name)
    --graph-workspace=<id>  Convention/spec workspace id (default: router repo id)
    --graph-namespace=<id>  Graph namespace (default: ttsc:<router repo id>)
    --graph-tsconfig=<path> Project graph tsconfig (default: tsconfig.ttsc.json)
    --canonical-graph-db=<path> Canonical revision database`;
  }

  // Override print methods to suppress console output (use XML output instead)
  protected printHeader(_title: string): void {}
  protected printSection(_title: string): void {}
  protected printSuccess(_message: string): void {}
  protected printError(_message: string): void {}
  protected printWarning(_message: string): void {}
  protected printInfo(_message: string): void {}

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      // Parse arguments
      const forceRebuild = args.includes('--force');
      const excludeTests = args.includes('--exclude-tests');
      const canonicalOnly = args.includes('--canonical-only');
      const targetPath = this.firstPositionalArgument(args) || 'src';

      if (
        canonicalOnly &&
        !args.includes('--canonical-graph') &&
        process.env.TSDOC_EDGE_CANONICAL_GRAPH !== '1'
      ) {
        return this.failure('--canonical-only requires --canonical-graph', 1);
      }

      this.printHeader('TSDoc Edge - Build Database');

      if (forceRebuild) {
        this.printWarning('Force rebuild enabled - all files will be reprocessed');
      } else {
        this.printInfo('Incremental build enabled - only changed files will be processed');
      }

      if (excludeTests) {
        this.printInfo('Excluding test files from indexing');
      }

      // Canonical-only refresh does not consume the legacy source-directory argument.
      if (!canonicalOnly && !fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        return this.failure(`Path not found: ${targetPath}`);
      }

      const canonicalGraph = await this.refreshCanonicalGraph(args);

      if (canonicalOnly) {
        if (!canonicalGraph) {
          throw new Error('--canonical-only did not produce a canonical graph revision');
        }
        new XmlBuilder(BuildResultSchema)
          .section('statistics', {
            canonicalGraphNodes: canonicalGraph.nodeCount,
            canonicalGraphEdges: canonicalGraph.edgeCount,
          })
          .section('paths', { canonicalGraphDatabase: canonicalGraph.databasePath })
          .section('errors', [])
          .print();
        return this.success(
          `Canonical graph ${canonicalGraph.fingerprint.slice(0, 12)} persisted without legacy enrichment`
        );
      }

      this.printInfo(`Building database from: ${targetPath}`);
      console.log();

      // Setup paths
      const config = this.configManager.get();
      const dbPathConfig = config.paths.databasePath || '.tsdoc.db';
      const jsonlPathConfig = config.paths.jsonlDir || 'docs/data';

      // Use path as-is if absolute, otherwise join with cwd
      const dbPath = path.isAbsolute(dbPathConfig)
        ? dbPathConfig
        : path.join(process.cwd(), dbPathConfig);
      const jsonlPath = path.isAbsolute(jsonlPathConfig)
        ? jsonlPathConfig
        : path.join(process.cwd(), jsonlPathConfig);

      // Ensure jsonl directory exists
      if (!fs.existsSync(jsonlPath)) {
        fs.mkdirSync(jsonlPath, { recursive: true });
      }

      // Initialize database
      const dbManager = new DatabaseManager(dbPath, jsonlPath);
      try {
        const extractor = new ASTSymbolExtractor();
        const testParser = new TestSymbolParser();
        const idGenerator = new SymbolIdentifierGenerator(process.cwd());

        // Find TypeScript files
        this.printInfo('Scanning TypeScript files...');
        const startTime = Date.now();

        let allFiles = this.findTypeScriptFiles(targetPath);

        // Filter out test files if --exclude-tests is set
        if (excludeTests) {
          const originalCount = allFiles.length;
          allFiles = allFiles.filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.spec.ts'));
          const excluded = originalCount - allFiles.length;
          if (excluded > 0) {
            this.printInfo(`Excluded ${excluded} test files`);
          }
        }

        // Filter files based on incremental build
        let files = allFiles;
        let skippedFiles = 0;

        if (!forceRebuild) {
          const changedFiles: string[] = [];

          for (const file of allFiles) {
            if (this.isFileChanged(dbManager, file)) {
              changedFiles.push(file);
            } else {
              skippedFiles++;
            }
          }

          files = changedFiles;

          if (skippedFiles > 0) {
            this.printSuccess(`Skipped ${skippedFiles} unchanged files (incremental build)`);
          }
        }

        if (files.length === 0) {
          this.printSuccess('No files to process - all files are up to date');
          return this.success(
            canonicalGraph
              ? `Canonical graph ${canonicalGraph.fingerprint.slice(0, 12)} persisted; no legacy changes detected`
              : 'No changes detected'
          );
        }

        this.printInfo(`Processing ${files.length} file(s)...`);

        // Initialize TypeScript program for advanced analyzers
        const compilerOptions: ts.CompilerOptions = {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          allowJs: true,
          checkJs: false,
          noEmit: true,
        };
        const program = ts.createProgram(allFiles, compilerOptions);

        // Initialize new analyzers
        const endpointAnalyzer = new EndpointDetectionAnalyzer(program);
        const blockAnalyzer = new BlockChunkAnalyzer(program);
        const exposureAnalyzer = new ExposureAnalyzer(process.cwd());
        const entryPointDetector = new EntryPointDetector(program, process.cwd());

        const result = {
          filesScanned: 0,
          symbolsFound: 0,
          symbolsInserted: 0,
          symbolsCollisions: 0,
          relationshipsFound: 0,
          relationshipsInserted: 0,
          relationshipsSkipped: 0, // Relationships to external symbols (not errors)
          endpointsFound: 0,
          endpointsInserted: 0,
          blocksFound: 0,
          blocksInserted: 0,
          entryPointsFound: 0,
          entryPointsInserted: 0,
          exposureAnalyzed: 0,
          blockDependenciesFound: 0,
          errors: [] as string[],
        };

        // Track seen IDs to detect collisions
        const seenIds = new Map<string, string>(); // id -> first file path

        // Prepare JSONL registry (use .tsdoc directly for consistency with other commands)
        const registryDir = path.join(process.cwd(), '.tsdoc');
        const registryPath = path.join(registryDir, 'registry.jsonl');
        // First line is metadata (required by SymbolRegistryManager)
        const registryLines: string[] = [
          JSON.stringify({ version: '1.0.0', idGeneratorMode: 'sequential' }),
        ];

        // Global symbol ID mapping for relationship insertion
        const symbolIdMap = new Map<string, string>();

        // Store all relationships to insert after all symbols are collected
        const allRelationships: Array<{
          type: string;
          from: string;
          to: string;
          filePath: string;
          description?: string;
          line?: number;
        }> = [];

        // Store doc relationships (symbol -> document)
        const allDocRelationships: Array<{
          symbolId: string;
          symbolName: string;
          docRef: string;
          filePath: string;
          line: number;
        }> = [];

        // Collect all test symbols for relationship extraction
        const allTestSymbols: TestSymbol[] = [];

        // Process each file
        for (const filePath of files) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const isTestFile = filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts');

            result.filesScanned++;

            if (isTestFile) {
              // Process test file with TestSymbolParser
              const testResult = testParser.extract(filePath, content);
              result.symbolsFound += testResult.testSymbols.length;

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
                  result.symbolsCollisions++;
                  result.errors.push(`ID collision: ${id} (${filePath} vs ${seenIds.get(id)})`);
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
                  result.symbolsInserted++;

                  // Store mapping for relationship insertion
                  symbolIdMap.set(testSymbol.name, testSymbol.id);

                  // Add to JSONL registry
                  const registryEntry = {
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
                  };
                  registryLines.push(JSON.stringify(registryEntry));
                } else {
                  result.errors.push(
                    `Failed to insert test symbol: ${testSymbol.name} in ${filePath}`
                  );
                }
              }

              // Handle test extraction errors
              if (testResult.errors.length > 0) {
                result.errors.push(
                  ...testResult.errors.map((e) => `${e.file}:${e.line} ${e.message}`)
                );
              }
            } else {
              // Process implementation file with ASTSymbolExtractor
              const extractResult = extractor.extract(filePath, content);

              result.symbolsFound += extractResult.symbols.length;
              result.relationshipsFound += extractResult.relationships.length;

              // Collect relationships for later insertion
              allRelationships.push(...extractResult.relationships);

              // Insert symbols
              for (const symbol of extractResult.symbols) {
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
                  result.symbolsCollisions++;
                  result.errors.push(`ID collision: ${id} (${filePath} vs ${seenIds.get(id)})`);
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
                  result.symbolsInserted++;

                  // Store mapping for relationship insertion
                  symbolIdMap.set(symbol.name, id);

                  // Add to JSONL registry (SymbolRegistryEntry format)
                  const registryEntry = {
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
                  };
                  registryLines.push(JSON.stringify(registryEntry));

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
                  result.errors.push(`Failed to insert: ${symbol.name} in ${filePath}`);
                }

                // Analyze exposure for exported symbols
                if (symbol.isExported) {
                  try {
                    const exposure = exposureAnalyzer.analyzeSymbol(fullSymbol);
                    const success = dbManager.updateSymbolExposure(id, {
                      exposureScope: exposure.exposureScope,
                      exportPath: exposure.exportPath,
                      accessibility: exposure.accessibility,
                      visibilityBoundaries: exposure.visibilityBoundary,
                    });
                    if (success) {
                      result.exposureAnalyzed++;
                    }
                  } catch (_expError) {
                    // Non-critical, continue
                  }
                }
              }

              // Detect HTTP endpoints in this file
              try {
                const endpoints = endpointAnalyzer.analyzeFile(filePath);
                result.endpointsFound += endpoints.length;

                for (const endpoint of endpoints) {
                  const success = dbManager.insertEndpoint({
                    id: endpoint.id,
                    method: endpoint.method,
                    path: endpoint.path,
                    pathParams:
                      endpoint.pathParams.length > 0 ? JSON.stringify(endpoint.pathParams) : null,
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
                    result.endpointsInserted++;
                  }
                }
              } catch (_endpointError) {
                // Non-critical, continue
              }

              // Detect entry points in this file
              try {
                const entryPoints = entryPointDetector.analyzeFile(filePath);
                result.entryPointsFound += entryPoints.length;

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
                    dependencies:
                      ep.dependencies.length > 0 ? JSON.stringify(ep.dependencies) : null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });

                  if (success) {
                    result.entryPointsInserted++;
                  }
                }
              } catch (_entryPointError) {
                // Non-critical, continue
              }

              // Analyze code blocks for functions/methods
              for (const symbol of extractResult.symbols) {
                if (symbol.type === 'function' || symbol.type === 'method') {
                  try {
                    const sourceFile = program.getSourceFile(filePath);
                    if (sourceFile) {
                      // Find the function/method node
                      const findNode = (
                        node: ts.Node
                      ):
                        | ts.FunctionDeclaration
                        | ts.MethodDeclaration
                        | ts.ArrowFunction
                        | null => {
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
                        let found:
                          | ts.FunctionDeclaration
                          | ts.MethodDeclaration
                          | ts.ArrowFunction
                          | null = null;
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
                          const blockResult = blockAnalyzer.analyzeFunction(
                            functionNode,
                            symbolId,
                            filePath
                          );
                          result.blocksFound += blockResult.blocks.length;

                          for (const block of blockResult.blocks) {
                            const success = dbManager.insertCodeBlock({
                              id: block.id,
                              symbolId: block.symbolId,
                              type: block.type,
                              startLine: block.startLine,
                              endLine: block.endLine,
                              purpose: block.purpose ?? null,
                              dependencies:
                                block.dependencies.length > 0
                                  ? JSON.stringify(block.dependencies)
                                  : null,
                              sideEffects:
                                block.sideEffects.length > 0
                                  ? JSON.stringify(block.sideEffects)
                                  : null,
                              scope: block.scope ?? null,
                              complexity: block.complexity ?? null,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            });

                            if (success) {
                              result.blocksInserted++;

                              // Create relationships for block dependencies
                              result.blockDependenciesFound += block.dependencies.length;
                              for (const depName of block.dependencies) {
                                const depSymbolId = symbolIdMap.get(depName);
                                if (depSymbolId) {
                                  const relId = `block-dep-${block.id}-${depSymbolId}`;
                                  const _relSuccess = dbManager.insertUnifiedRelationship({
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
          } catch (error) {
            result.errors.push(`Error scanning ${filePath}: ${error}`);
          }
        }

        // Insert all relationships after all symbols are collected
        this.printInfo('Inserting relationships...');
        let inheritanceRelationshipsInserted = 0;
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
                result.relationshipsInserted++;
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
              let category = 'structural';

              if (relationship.type === 'extends') {
                unifiedType = 'inheritance';
                category = 'structural';
              } else if (relationship.type === 'implements') {
                unifiedType = 'implementation';
                category = 'structural';
              } else if (relationship.type === 'dependsOn') {
                unifiedType = 'code-dependency';
                category = 'structural';
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
                result.relationshipsInserted++;
                if (relationship.type === 'extends' || relationship.type === 'implements') {
                  inheritanceRelationshipsInserted++;
                }
              }
            } else {
              // Symbol not found in map - likely an external type (e.g., EventEmitter, Promise)
              // This is expected behavior, not an error
              result.relationshipsSkipped++;
            }
          } catch (_error) {
            result.errors.push(
              `Failed to insert relationship: ${relationship.from} -> ${relationship.to}`
            );
          }
        }

        // Extract and insert test relationships
        if (allTestSymbols.length > 0) {
          this.printInfo(
            `Extracting test relationships (${allTestSymbols.length} test symbols)...`
          );
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
              result.relationshipsInserted++;
            } catch (_error) {
              result.errors.push(`Failed to insert test-coverage relationship: ${testRel.id}`);
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
              result.relationshipsInserted++;
            } catch (_error) {
              result.errors.push(`Failed to insert contains relationship: ${containsRel.id}`);
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
              result.relationshipsInserted++;
            } catch (_error) {
              result.errors.push(
                `Failed to insert covers-scenario relationship: ${scenarioRel.id}`
              );
            }
          }

          // Log coverage stats
          const stats = testRelationships.coverageStats;
          this.printSuccess(
            `Test coverage: ${stats.testCasesWithCoverage}/${stats.totalTestCases} test cases cover ${stats.totalTestedSymbols} symbols`
          );
          this.printInfo(`Average assertions per test: ${stats.averageAssertions.toFixed(1)}`);
          if (stats.totalScenarios > 0) {
            this.printInfo(
              `Scenario coverage: ${stats.scenariosWithCoverage}/${stats.totalScenarios} scenarios covered`
            );
          }
        }

        // Insert doc relationships
        this.printInfo('Inserting document relationships...');
        let docRelationshipsInserted = 0;

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
              docRelationshipsInserted++;
            }
          } catch (_error) {
            result.errors.push(
              `Failed to insert doc relationship: ${docRel.symbolName} -> ${docRel.docRef}`
            );
          }
        }

        // Extract semantic relationships
        this.printInfo('Analyzing semantic relationships...');
        let semanticRelationshipsInserted = 0;
        let inferredRelationshipsInserted = 0;

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
          // const namingAnalyzer = new NamingPatternRelationAnalyzer(symbolGraph);
          // const namingRelations = namingAnalyzer.analyze();
          // const namingInserted = dbManager.batchInsertUnifiedRelationships(namingRelations.map(toBatchFormat));
          // semanticRelationshipsInserted += namingInserted;
          // const namingStats = namingAnalyzer.getStatistics(namingRelations);
          // this.printSuccess(`Naming patterns: ${namingInserted} relationships across ${namingStats.uniqueDomains} domains`);

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
            result.relationshipsSkipped++;
            result.errors.push(
              `[explicit-semantic-resolution] ${resolution.diagnostic ?? `Unable to resolve ${relation.id}`}`
            );
          }

          const explicitInserted = dbManager.batchInsertUnifiedRelationships(
            resolvedExplicitRelations.map(toBatchFormat)
          );
          semanticRelationshipsInserted += explicitInserted;

          const explicitStats = explicitAnalyzer.getStatistics(explicitRelations);
          this.printSuccess(
            `Explicit semantic: ${explicitInserted} relationships (${explicitStats.withDescription} with descriptions)`
          );

          // 3. Feature Grouping Relations
          const featureAnalyzer = new FeatureGroupingAnalyzer(symbolGraph);
          const featureRelations = featureAnalyzer.analyze(targetPath);
          const featureInserted = dbManager.batchInsertUnifiedRelationships(
            featureRelations.map(toBatchFormat)
          );
          semanticRelationshipsInserted += featureInserted;

          const featureStats = featureAnalyzer.getStatistics(featureRelations);
          this.printSuccess(
            `Feature grouping: ${featureInserted} relationships across ${featureStats.uniqueFeatures} features`
          );

          // 4. Layer Dependency Analysis (architectural layer violations)
          const layerAnalyzer = new LayerDependencyAnalyzer(symbolGraph);
          const layerRelations = layerAnalyzer.analyze();
          const layerInserted = dbManager.batchInsertUnifiedRelationships(
            layerRelations.map(toBatchFormat)
          );
          semanticRelationshipsInserted += layerInserted;
          this.printSuccess(`Layer dependencies: ${layerInserted} relationships`);

          // 5. Circular Dependency Detection
          const chainAnalyzer = new DependencyChainAnalyzer(symbolGraph);
          const circularRelations = chainAnalyzer.analyzeCircularDependencies();
          const circularInserted = dbManager.batchInsertUnifiedRelationships(
            circularRelations.map(toBatchFormat)
          );
          semanticRelationshipsInserted += circularInserted;
          this.printSuccess(`Circular dependencies: ${circularInserted} detected`);

          // 6. Relationship Inference (generate new relationships from existing ones)
          this.printInfo('Inferring relationships from existing patterns...');
          const inferenceEngine = new RelationshipInferenceEngine();
          const allRelationships = dbManager.getAllUnifiedRelationships();
          const inferredRelationships = inferenceEngine.infer(allRelationships);
          inferredRelationshipsInserted = dbManager.batchInsertUnifiedRelationships(
            inferredRelationships.map(toBatchFormat)
          );

          const inferenceStats = inferenceEngine.getStatistics(allRelationships);
          this.printSuccess(
            `Inferred relationships: ${inferredRelationshipsInserted} total (${inferenceStats.byRule['naming-transitivity'] || 0} naming, ${inferenceStats.byRule['feature-closure'] || 0} feature, ${inferenceStats.byRule['test-coverage-inheritance'] || 0} test)`
          );

          // 7. Test Example Extraction (extract test cases as documentation examples)
          this.printInfo('Extracting test examples for documentation...');
          const { TestExampleExtractor } = await import('../analyzer/TestExampleExtractor.js');
          const exampleExtractor = new TestExampleExtractor(dbManager);
          const testExamples = exampleExtractor.extractAllExamples();
          const exampleRelationships = exampleExtractor.createRelationships(testExamples);
          const testExamplesInserted = dbManager.batchInsertUnifiedRelationships(
            exampleRelationships.map(toBatchFormat)
          );

          const highQualityExamples = testExamples.filter((ex) => ex.quality >= 8);
          this.printSuccess(
            `Test examples: ${testExamples.length} total (${highQualityExamples.length} high-quality, ${testExamplesInserted} relationships)`
          );
        } catch (error) {
          this.printWarning(
            `Failed to analyze semantic relationships: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        // Create endpoint-handler relationships
        this.printInfo('Creating endpoint-handler relationships...');
        let endpointHandlerRelsInserted = 0;

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
                endpointHandlerRelsInserted++;
              }
            }
          }

          if (endpointHandlerRelsInserted > 0) {
            this.printSuccess(`Endpoint-handler: ${endpointHandlerRelsInserted} relationships`);
          }
        } catch (error) {
          this.printWarning(
            `Failed to create endpoint-handler relationships: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        const duration = Date.now() - startTime;

        // Write JSONL registry (ensure directory exists)
        if (!fs.existsSync(registryDir)) {
          fs.mkdirSync(registryDir, { recursive: true });
        }
        fs.writeFileSync(registryPath, registryLines.join('\n'), 'utf-8');

        // Update sync metadata for processed files (for incremental builds)
        for (const filePath of files) {
          this.updateSyncMetadata(dbManager, filePath);
        }

        // Output build result as XML
        new XmlBuilder(BuildResultSchema)
          .section('statistics', {
            filesScanned: result.filesScanned,
            symbolsFound: result.symbolsFound,
            symbolsInserted: result.symbolsInserted,
            symbolsCollisions: result.symbolsCollisions,
            relationshipsFound: result.relationshipsFound,
            relationshipsInserted: result.relationshipsInserted,
            relationshipsSkipped: result.relationshipsSkipped,
            docRelationships: docRelationshipsInserted,
            semanticRelationships: semanticRelationshipsInserted,
            inferredRelationships: inferredRelationshipsInserted,
            inheritanceRelationships: inheritanceRelationshipsInserted,
            endpointHandlerRelationships: endpointHandlerRelsInserted,
            endpointsFound: result.endpointsFound,
            endpointsInserted: result.endpointsInserted,
            blocksFound: result.blocksFound,
            blocksInserted: result.blocksInserted,
            blockDependenciesFound: result.blockDependenciesFound,
            entryPointsFound: result.entryPointsFound,
            entryPointsInserted: result.entryPointsInserted,
            exposureAnalyzed: result.exposureAnalyzed,
            durationMs: duration,
            ...(canonicalGraph
              ? {
                  canonicalGraphNodes: canonicalGraph.nodeCount,
                  canonicalGraphEdges: canonicalGraph.edgeCount,
                }
              : {}),
          })
          .section('paths', {
            database: dbPath,
            registry: registryPath,
            ...(canonicalGraph ? { canonicalGraphDatabase: canonicalGraph.databasePath } : {}),
          })
          .section(
            'errors',
            result.errors.map((err) => ({ message: err }))
          )
          .print();

        return this.success(
          `Built database with ${result.symbolsInserted} symbols${canonicalGraph ? ` and canonical graph ${canonicalGraph.fingerprint.slice(0, 12)}` : ''}`
        );
      } finally {
        dbManager.close();
      }
    });
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

  /** Refresh the canonical graph before legacy per-file hash short-circuiting. */
  private async refreshCanonicalGraph(args: string[]): Promise<{
    fingerprint: string;
    nodeCount: number;
    edgeCount: number;
    databasePath: string;
  } | null> {
    const enabled =
      args.includes('--canonical-graph') || process.env.TSDOC_EDGE_CANONICAL_GRAPH === '1';
    if (!enabled) return null;

    const moduleSpecifier =
      this.getOption(args, '--router-module') ?? process.env.TSDOC_EDGE_GRAPH_ROUTER_MODULE;
    if (!moduleSpecifier) {
      throw new Error(
        '--canonical-graph requires --router-module or TSDOC_EDGE_GRAPH_ROUTER_MODULE'
      );
    }

    const rootDir = this.configManager.getProjectRoot();
    const coordinatorOptions: CanonicalGraphCoordinatorOptions = {
      rootDir,
      moduleSpecifier,
      workspaceId:
        this.getOption(args, '--graph-workspace') ?? process.env.TSDOC_EDGE_GRAPH_WORKSPACE,
      graphNamespace:
        this.getOption(args, '--graph-namespace') ?? process.env.TSDOC_EDGE_GRAPH_NAMESPACE,
      typescript: {
        tsconfigPath:
          this.getOption(args, '--graph-tsconfig') ??
          process.env.TSDOC_EDGE_GRAPH_TSCONFIG ??
          DEFAULT_GRAPH_TSCONFIG,
        ...((this.getOption(args, '--router-config') ?? process.env.TSDOC_EDGE_GRAPH_ROUTER_CONFIG)
          ? {
              routerConfigPath:
                this.getOption(args, '--router-config') ??
                process.env.TSDOC_EDGE_GRAPH_ROUTER_CONFIG,
            }
          : {}),
        ...((this.getOption(args, '--router-repo') ?? process.env.TSDOC_EDGE_GRAPH_ROUTER_REPO)
          ? {
              routerRepoId:
                this.getOption(args, '--router-repo') ?? process.env.TSDOC_EDGE_GRAPH_ROUTER_REPO,
            }
          : {}),
      },
      repositoryPath:
        this.getOption(args, '--canonical-graph-db') ?? process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB,
    };
    const coordinator = this.dependencies.canonicalCoordinatorFactory
      ? this.dependencies.canonicalCoordinatorFactory(coordinatorOptions)
      : new CanonicalGraphCoordinator(coordinatorOptions);

    try {
      const refreshed = await coordinator.refresh();
      if (refreshed.status !== 'committed') {
        throw new Error('Canonical graph refresh was superseded unexpectedly');
      }
      return {
        fingerprint: refreshed.graph.fingerprint,
        nodeCount: refreshed.graph.nodes.length,
        edgeCount: refreshed.graph.edges.length,
        databasePath: coordinator.repositoryPath,
      };
    } finally {
      coordinator.close();
    }
  }

  /** Find the source-directory positional argument without consuming option values. */
  private firstPositionalArgument(args: readonly string[]): string | undefined {
    const valuedOptions = new Set([
      '--router-module',
      '--router-config',
      '--router-repo',
      '--graph-workspace',
      '--graph-namespace',
      '--graph-tsconfig',
      '--canonical-graph-db',
    ]);
    for (let index = 0; index < args.length; index++) {
      const argument = args[index];
      if (valuedOptions.has(argument)) {
        index++;
        continue;
      }
      if (!argument.startsWith('-')) return argument;
    }
    return undefined;
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
