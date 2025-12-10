/**
 * Build command for creating symbol database
 * @doc [[BuildCommand]]
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { ConfigManager } from '../config/ConfigManager';
import { ASTSymbolExtractor } from '../analyzer/ASTSymbolExtractor';
import { TestSymbolParser } from '../parser/TestSymbolParser';
import { TestCoverageAnalyzer } from '../analyzer/TestCoverageAnalyzer';
import { NamingPatternRelationAnalyzer } from '../analyzer/NamingPatternRelationAnalyzer';
import { ExplicitSemanticRelationAnalyzer } from '../analyzer/ExplicitSemanticRelationAnalyzer';
import { FeatureGroupingAnalyzer } from '../analyzer/FeatureGroupingAnalyzer';
import { RelationshipInferenceEngine } from '../analyzer/RelationshipInferenceEngine';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';
import type { TestSymbol } from '../types/test-symbols';
import type { SymbolGraph } from '../types/graph';

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
 * @depends FileScanner, DatabaseManager, SymbolRegistryManager, ConfigManager
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

  constructor(configManager?: ConfigManager) {
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
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Build symbol database from source files';
  }

  protected getUsage(): string {
    return `tsdoc-edge build [source-directory] [options]

  Default: src
  Options:
    --force          Force full rebuild (ignore file hashes)
    --incremental    Incremental build (only changed files, default)`;
  }

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
      const targetPath = args.find(arg => !arg.startsWith('--')) || 'src';

      this.printHeader('TSDoc Edge - Build Database');

      if (forceRebuild) {
        this.printWarning('Force rebuild enabled - all files will be reprocessed');
      } else {
        this.printInfo('Incremental build enabled - only changed files will be processed');
      }

      // Validate path
      if (!fs.existsSync(targetPath)) {
        this.printError(`Path not found: ${targetPath}`);
        return this.failure(`Path not found: ${targetPath}`);
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
      const extractor = new ASTSymbolExtractor();
      const testParser = new TestSymbolParser();

      // Find TypeScript files
      this.printInfo('Scanning TypeScript files...');
      const startTime = Date.now();

      const allFiles = this.findTypeScriptFiles(targetPath);

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
        dbManager.close();
        return this.success('No changes detected');
      }

      this.printInfo(`Processing ${files.length} file(s)...`);

      const result = {
        filesScanned: 0,
        symbolsFound: 0,
        symbolsInserted: 0,
        relationshipsFound: 0,
        relationshipsInserted: 0,
        errors: [] as string[],
      };

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
      const allRelationships: Array<{ type: string; from: string; to: string; filePath: string; description?: string }> = [];

      // Store doc relationships (symbol -> document)
      const allDocRelationships: Array<{ symbolId: string; symbolName: string; docRef: string; filePath: string; line: number }> = [];

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
              const fullSymbol = {
                ...testSymbol,
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
                    symbolType: testSymbol.type,
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                registryLines.push(JSON.stringify(registryEntry));
              } else {
                result.errors.push(`Failed to insert test symbol: ${testSymbol.name} in ${filePath}`);
              }
            }

            // Handle test extraction errors
            if (testResult.errors.length > 0) {
              result.errors.push(...testResult.errors.map(e => `${e.file}:${e.line} ${e.message}`));
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
            // Generate simple kebab-case ID
            const id = `${symbol.type}-${symbol.name}`
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');

            const fullSymbol = {
              id,
              ...symbol,
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
                  symbolType: symbol.type,
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
            }
          }
        } catch (error) {
          result.errors.push(`Error scanning ${filePath}: ${error}`);
        }
      }

      // Insert all relationships after all symbols are collected
      this.printInfo('Inserting relationships...');
      for (const relationship of allRelationships) {
        try {
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
            const unifiedId = `${unifiedType}-${fromId}-${toId}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            dbManager.insertUnifiedRelationship({
              id: unifiedId,
              type: unifiedType,
              category: category,
              fromSymbols: [fromId],
              toSymbols: [toId],
              direction: 'unidirectional',
              strength: 'strong',
              evidence: [{
                type: 'code',
                source: relationship.filePath,
                confidence: 1.0,
              }],
              discoveredBy: 'static-analysis',
              confidence: 1.0,
              filePath: relationship.filePath,
              description: relationship.description || `${relationship.from} ${relationship.type} ${relationship.to}`,
            });

            if (success) {
              result.relationshipsInserted++;
            }
          } else {
            // Symbol not found in map, try to find by name in database
            // This handles cross-file dependencies
            result.errors.push(`Relationship skipped: ${relationship.from} -> ${relationship.to} (symbols not found)`);
          }
        } catch (error) {
          result.errors.push(`Failed to insert relationship: ${relationship.from} -> ${relationship.to}`);
        }
      }

      // Extract and insert test relationships
      if (allTestSymbols.length > 0) {
        this.printInfo(`Extracting test relationships (${allTestSymbols.length} test symbols)...`);
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
              evidence: [{
                type: 'test',
                source: 'test-code-analysis',
                confidence: testRel.confidence,
              }],
              discoveredBy: 'test-parser',
              confidence: testRel.confidence,
              description: `Test coverage: ${testRel.metadata.testedMethods?.join(', ') || 'unknown'} (${testRel.metadata.assertionCount || 0} assertions)`,
            });
            result.relationshipsInserted++;
          } catch (error) {
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
              evidence: [{
                type: 'structural',
                source: 'test-suite-hierarchy',
                confidence: 1.0,
              }],
              discoveredBy: 'test-parser',
              confidence: 1.0,
              description: `Test hierarchy (nesting level: ${containsRel.metadata.nestingLevel})`,
            });
            result.relationshipsInserted++;
          } catch (error) {
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
              evidence: [{
                type: 'semantic',
                source: 'scenario-matching',
                confidence: scenarioRel.confidence,
              }],
              discoveredBy: 'test-parser',
              confidence: scenarioRel.confidence,
              description: `Test case covers scenario`,
            });
            result.relationshipsInserted++;
          } catch (error) {
            result.errors.push(`Failed to insert covers-scenario relationship: ${scenarioRel.id}`);
          }
        }

        // Log coverage stats
        const stats = testRelationships.coverageStats;
        this.printSuccess(`Test coverage: ${stats.testCasesWithCoverage}/${stats.totalTestCases} test cases cover ${stats.totalTestedSymbols} symbols`);
        this.printInfo(`Average assertions per test: ${stats.averageAssertions.toFixed(1)}`);
        if (stats.totalScenarios > 0) {
          this.printInfo(`Scenario coverage: ${stats.scenariosWithCoverage}/${stats.totalScenarios} scenarios covered`);
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
            strength: 'strong',  // Doc references are explicit, so strong
            evidence: [{
              type: 'documentation',
              source: docRel.filePath,
              lineNumber: docRel.line,
              confidence: 1.0,
            }],
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
        } catch (error) {
          result.errors.push(`Failed to insert doc relationship: ${docRel.symbolName} -> ${docRel.docRef}`);
        }
      }

      // Extract semantic relationships
      this.printInfo('Analyzing semantic relationships...');
      let semanticRelationshipsInserted = 0;
      let inferredRelationshipsInserted = 0;

      try {
        // Build SymbolGraph from database for analyzers
        const allSymbols = dbManager.getAllSymbols();
        const symbolMap = new Map(allSymbols.map(s => [s.id, s]));

        // Build indexes for SymbolGraph
        const nameIndex = new Map<string, string[]>();
        const fileIndex = new Map<string, string[]>();

        for (const symbol of allSymbols) {
          // Name index
          if (!nameIndex.has(symbol.name)) {
            nameIndex.set(symbol.name, []);
          }
          nameIndex.get(symbol.name)!.push(symbol.id);

          // File index
          if (!fileIndex.has(symbol.filePath)) {
            fileIndex.set(symbol.filePath, []);
          }
          fileIndex.get(symbol.filePath)!.push(symbol.id);
        }

        const symbolGraph: SymbolGraph = {
          symbols: symbolMap,
          relationships: [],
          nameIndex,
          fileIndex,
          adjacencyList: new Map(),
          reverseAdjacencyList: new Map(),
        };

        // 1. Naming Pattern Relations
        const namingAnalyzer = new NamingPatternRelationAnalyzer(symbolGraph);
        const namingRelations = namingAnalyzer.analyze();

        for (const rel of namingRelations) {
          try {
            dbManager.insertUnifiedRelationship({
              id: rel.id,
              type: rel.type,
              category: rel.category,
              fromSymbols: [typeof rel.from === 'string' ? rel.from : rel.from[0]],
              toSymbols: [typeof rel.to === 'string' ? rel.to : rel.to[0]],
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
            semanticRelationshipsInserted++;
          } catch (error) {
            // Skip duplicate relationships
          }
        }

        const namingStats = namingAnalyzer.getStatistics(namingRelations);
        this.printSuccess(`Naming patterns: ${namingRelations.length} relationships across ${namingStats.uniqueDomains} domains`);

        // 2. Explicit Semantic Relations (@relatedTo tags)
        const explicitAnalyzer = new ExplicitSemanticRelationAnalyzer();
        const explicitRelations = explicitAnalyzer.analyze(targetPath);

        for (const rel of explicitRelations) {
          try {
            dbManager.insertUnifiedRelationship({
              id: rel.id,
              type: rel.type,
              category: rel.category,
              fromSymbols: [typeof rel.from === 'string' ? rel.from : rel.from[0]],
              toSymbols: [typeof rel.to === 'string' ? rel.to : rel.to[0]],
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
            semanticRelationshipsInserted++;
          } catch (error) {
            // Skip duplicate relationships
          }
        }

        const explicitStats = explicitAnalyzer.getStatistics(explicitRelations);
        this.printSuccess(`Explicit semantic: ${explicitRelations.length} relationships (${explicitStats.withDescription} with descriptions)`);

        // 3. Feature Grouping Relations
        const featureAnalyzer = new FeatureGroupingAnalyzer(symbolGraph);
        const featureRelations = featureAnalyzer.analyze(targetPath);

        for (const rel of featureRelations) {
          try {
            dbManager.insertUnifiedRelationship({
              id: rel.id,
              type: rel.type,
              category: rel.category,
              fromSymbols: [typeof rel.from === 'string' ? rel.from : rel.from[0]],
              toSymbols: [typeof rel.to === 'string' ? rel.to : rel.to[0]],
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
            semanticRelationshipsInserted++;
          } catch (error) {
            // Skip duplicate relationships
          }
        }

        const featureStats = featureAnalyzer.getStatistics(featureRelations);
        this.printSuccess(`Feature grouping: ${featureRelations.length} relationships across ${featureStats.uniqueFeatures} features`);

        // 4. Relationship Inference (generate new relationships from existing ones)
        this.printInfo('Inferring relationships from existing patterns...');
        const inferenceEngine = new RelationshipInferenceEngine();
        const allRelationships = dbManager.getAllUnifiedRelationships();
        const inferredRelationships = inferenceEngine.infer(allRelationships);

        for (const rel of inferredRelationships) {
          try {
            dbManager.insertUnifiedRelationship({
              id: rel.id,
              type: rel.type,
              category: rel.category,
              fromSymbols: [typeof rel.from === 'string' ? rel.from : rel.from[0]],
              toSymbols: [typeof rel.to === 'string' ? rel.to : rel.to[0]],
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
            inferredRelationshipsInserted++;
          } catch (error) {
            // Skip duplicate relationships
          }
        }

        const inferenceStats = inferenceEngine.getStatistics(allRelationships);
        this.printSuccess(`Inferred relationships: ${inferredRelationships.length} total (${inferenceStats.byRule['naming-transitivity'] || 0} naming, ${inferenceStats.byRule['feature-closure'] || 0} feature, ${inferenceStats.byRule['test-coverage-inheritance'] || 0} test)`);

        // 5. Test Example Extraction (extract test cases as documentation examples)
        this.printInfo('Extracting test examples for documentation...');
        const { TestExampleExtractor } = await import('../analyzer/TestExampleExtractor');
        const exampleExtractor = new TestExampleExtractor(dbManager);
        const testExamples = exampleExtractor.extractAllExamples();
        const exampleRelationships = exampleExtractor.createRelationships(testExamples);

        let testExamplesInserted = 0;
        for (const rel of exampleRelationships) {
          try {
            dbManager.insertUnifiedRelationship({
              id: rel.id,
              type: rel.type,
              category: rel.category,
              fromSymbols: [typeof rel.from === 'string' ? rel.from : rel.from[0]],
              toSymbols: [typeof rel.to === 'string' ? rel.to : rel.to[0]],
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
            testExamplesInserted++;
          } catch (error) {
            // Skip duplicate relationships
          }
        }

        const highQualityExamples = testExamples.filter(ex => ex.quality >= 8);
        this.printSuccess(`Test examples: ${testExamples.length} total (${highQualityExamples.length} high-quality, ${testExamplesInserted} relationships)`);

      } catch (error) {
        this.printWarning(`Failed to analyze semantic relationships: ${error instanceof Error ? error.message : String(error)}`);
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

      dbManager.close();

      console.log();
      this.printSuccess('Database build complete');
      console.log();

      // Print statistics
      this.printSection('Statistics');
      console.log(`  Files scanned: ${this.colors.cyan}${result.filesScanned}${this.colors.reset}`);
      console.log(`  Symbols found: ${this.colors.cyan}${result.symbolsFound}${this.colors.reset}`);
      console.log(`  Symbols inserted: ${this.colors.green}${result.symbolsInserted}${this.colors.reset}`);
      console.log(`  Relationships found: ${this.colors.cyan}${result.relationshipsFound}${this.colors.reset}`);
      console.log(`  Relationships inserted: ${this.colors.green}${result.relationshipsInserted}${this.colors.reset}`);
      console.log(`  Doc relationships: ${this.colors.green}${docRelationshipsInserted}${this.colors.reset}`);
      console.log(`  Semantic relationships: ${this.colors.green}${semanticRelationshipsInserted}${this.colors.reset}`);
      console.log(`  Inferred relationships: ${this.colors.green}${inferredRelationshipsInserted}${this.colors.reset}`);
      console.log(`  Duration: ${this.colors.cyan}${duration}ms${this.colors.reset}`);
      console.log();
      console.log(`${this.colors.dim}Database: ${dbPath}${this.colors.reset}`);
      console.log(`${this.colors.dim}Registry: ${registryPath}${this.colors.reset}`);

      // Show errors if any
      if (result.errors.length > 0) {
        console.log();
        this.printWarning(`Errors (${result.errors.length}):`);
        result.errors.slice(0, 10).forEach((err) => {
          console.log(`  ${this.colors.dim}${err}${this.colors.reset}`);
        });
        if (result.errors.length > 10) {
          console.log(`  ${this.colors.dim}... and ${result.errors.length - 10} more${this.colors.reset}`);
        }
      }

      console.log();

      return this.success(`Built database with ${result.symbolsInserted} symbols`);
    });
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
      let match;

      while ((match = docTagRegex.exec(line)) !== null) {
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

      // Query sync_metadata table
      const row = dbManager.db.prepare(
        'SELECT hash FROM sync_metadata WHERE file_path = ?'
      ).get(filePath) as { hash: string } | undefined;

      if (!row) {
        // File not in metadata - needs processing
        return true;
      }

      // Compare hashes
      return row.hash !== currentHash;
    } catch (error) {
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
      const now = new Date().toISOString();

      // Upsert into sync_metadata
      dbManager.db.prepare(`
        INSERT INTO sync_metadata (file_path, last_sync, total_records, hash, status)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(file_path) DO UPDATE SET
          last_sync = excluded.last_sync,
          hash = excluded.hash,
          status = excluded.status
      `).run(filePath, now, 1, hash, 'synced');
    } catch (error) {
      // Silently ignore metadata update errors (non-critical)
    }
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
