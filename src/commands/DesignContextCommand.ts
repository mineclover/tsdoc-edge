/**
 * Design Context Command - 설계 의사결정 추적 컨텍스트 제공
 *
 * @remarks
 * 설계 결정을 추적하고 계약(Contract) 기반 개발을 위한 컨텍스트 제공:
 * - 계약 명세 (preconditions, postconditions, invariants)
 * - 설계 결정 (ADR, Architecture Decision Records)
 * - 오류 패턴 (known pitfalls, common mistakes)
 * - 관계 통계 (relationship density, explicit/inferred)
 *
 * @doc [[DesignContextCommand]]
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { CanonicalAliasContext } from '../indexer/CanonicalAliasContext';
import { extractDocCheckpointsFromSource } from '../parser/TSDocParser';
import { SpecMetricsAggregator } from '../spec/SpecMetricsAggregator';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { SymbolType } from '../types/graph';
import type { Symbol } from '../types/graph/graph';
import { BaseCommand, type CommandResult } from './BaseCommand';

/** Context information for a file being worked on */
interface WorkContext {
  /** Path to the file */
  filePath: string;
  symbols: Symbol[];
  relatedDocs: Array<{
    title: string;
    path: string;
    symbolRef: string;
    sourceFile?: string;
    sourceLine?: number;
    specScore?: number;
    specStatus?: string;
  }>;
  dependencies: Array<{
    name: string;
    type: string;
    filePath: string;
  }>;
  typeFlows: Array<{
    from: string;
    to: string;
    chain: string[];
  }>;
  tests: Array<{
    path: string;
    coverage?: number;
    type: 'unit' | 'integration';
  }>;
  usedBy: Array<{
    name: string;
    filePath: string;
    type: string;
  }>;
  contracts: Array<{
    symbolId: string;
    symbolName: string;
    description: string;
    preconditions: string[];
    postconditions: string[];
    invariants: string[];
  }>;
  decisions: Array<{
    title: string;
    decision: string;
    rationale: string;
    status: string;
    date: string;
    symbolName?: string;
  }>;
  errorPatterns: Array<{
    symbolName: string;
    errorType: string;
    message: string;
    solution: string;
    prevention?: string;
  }>;
  relationships: Array<{
    id: string;
    type: string;
    category: string;
    direction: 'unidirectional' | 'bidirectional' | 'undirected';
    strength: 'strong' | 'medium' | 'weak';
    fromSymbols: string[];
    toSymbols: string[];
    confidence: number;
    description?: string;
    properties?: Record<string, unknown>;
  }>;
  canonicalGraph?: {
    revisionId: string;
    nodeCount: number;
    internalDependencies: number;
    internalDependents: number;
  };
}

/**
 * Design Context Command - 설계 의사결정 추적을 위한 컨텍스트 제공
 *
 * @doc [[DesignContextCommand]]
 * @requires DatabaseManager
 * @requires SymbolGraphBuilder
 * @requires TSDocParser
 * @requires DocumentSymbolParser
 * @public
 */
export class DesignContextCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'design-context';
  }

  /**
   * getAlias method
   * @returns Returns `string[]`
   * @public
   */
  getAlias(): string[] {
    return ['dc'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show design decisions, contracts, and error patterns for a file';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge design-context <file-path> [--llm | --json]';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns `Promise<CommandResult>`
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagValidationError = this.validateAllowedFlags(args, ['--llm', '--json']);
      if (flagValidationError) {
        return flagValidationError;
      }

      const useLlmFormat = this.hasFlag(args, '--llm');
      const useJsonFormat = this.hasFlag(args, '--json');
      const targetFile = this.getPositionalArgs(args)[0];

      if (!targetFile) {
        this.printError('File path required');
        console.log();
        console.log('Options:');
        console.log('  --llm     Generate LLM-friendly output (LLMs.txt format)');
        console.log('  --json    Output design context as JSON');
        console.log();
        console.log('Examples:');
        console.log('  tsdoc-edge design-context src/services/UserService.ts');
        console.log('  tsdoc-edge design-context src/controllers/AuthController.ts --llm');
        console.log('  tsdoc-edge design-context src/controllers/AuthController.ts --json');
        console.log();
        console.log('Tip: Run with --help for more information');
        return this.failure('Missing file path');
      }

      // Resolve absolute path
      const absolutePath = path.resolve(process.cwd(), targetFile);

      if (!fs.existsSync(absolutePath)) {
        this.printError(`File not found: ${targetFile}`);
        return this.failure('File not found');
      }

      if (!useLlmFormat && !useJsonFormat) {
        this.printHeader(`Design Context: ${path.basename(targetFile)}`);
        console.log(`📄 ${targetFile}`);
        console.log();
      }

      // Load database
      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);
      try {
        const context = await this.gatherContext(absolutePath, targetFile, dbManager);

        if (useJsonFormat) {
          console.log(JSON.stringify(context, null, 2));
          return this.success('Context generated in JSON format');
        }

        // Branch: LLM format vs Human-readable format
        if (useLlmFormat) {
          const output = this.generateLlmOutput(context);
          console.log(output);
          return this.success('Context generated in LLM format');
        }

        // Display context
        this.displayContext(context);

        return this.success('Context gathered successfully');
      } finally {
        dbManager.close();
      }
    });
  }

  private gatherContext(
    absolutePath: string,
    relativePath: string,
    dbManager: DatabaseManager
  ): Promise<WorkContext> {
    const context: WorkContext = {
      filePath: relativePath,
      symbols: [],
      relatedDocs: [],
      dependencies: [],
      typeFlows: [],
      tests: [],
      usedBy: [],
      contracts: [],
      decisions: [],
      errorPatterns: [],
      relationships: [],
    };

    // 1. Get symbols from this file (using Drizzle ORM)
    const allSymbols = dbManager.querySymbols({ filePath: relativePath });

    context.symbols = allSymbols.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as SymbolType,
      filePath: row.file_path,
      line: row.line,
      column: row.column,
      isExported: Boolean(row.is_exported),
      isPublic: Boolean(row.is_public),
      summary: row.summary ?? undefined,
      tests: [],
      designDecisions: [],
      metadata: {},
    }));

    // Extract symbol IDs for batch queries
    const symbolIds = context.symbols.map((s) => s.id);

    // 2. Parse file for AST-verified @doc tags (related documents) via @microsoft/tsdoc
    try {
      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      const checkpoints = extractDocCheckpointsFromSource(absolutePath, fileContent, {
        requireDeclaration: false,
      });
      const specAggregator = new SpecMetricsAggregator();
      const seenDocRefs = new Set<string>();

      for (const checkpoint of checkpoints) {
        const symbolRef = checkpoint.rawReference;
        if (seenDocRefs.has(symbolRef)) {
          continue;
        }
        seenDocRefs.add(symbolRef);
        const docPath = this.findDocumentPath(checkpoint.docSymbol);
        let specScore: number | undefined;
        let specStatus: string | undefined;

        if (docPath && docPath !== '(not found)' && fs.existsSync(docPath)) {
          try {
            const specMetrics = specAggregator.getSpecMetricsForFile(docPath);
            specScore = specMetrics.score;
            specStatus = specMetrics.status;
          } catch {
            // Ignore
          }
        }

        context.relatedDocs.push({
          title: symbolRef,
          path: docPath,
          symbolRef,
          sourceFile: relativePath,
          sourceLine: checkpoint.commentLine,
          specScore,
          specStatus,
        });
      }
    } catch (_error) {
      // Continue even if parsing fails
    }

    // 2b. Attach canonical @ttsc/graph structural facts when active canonical revision exists
    const canonicalContext = CanonicalAliasContext.tryOpen(process.cwd());
    if (canonicalContext) {
      try {
        const fileNodes = canonicalContext.nodesInFile(absolutePath);
        if (fileNodes.length > 0) {
          let internalDependencies = 0;
          let internalDependents = 0;
          for (const node of fileNodes) {
            const counts = canonicalContext.structuralCounts(node.id);
            if (counts) {
              internalDependencies += counts.dependencies;
              internalDependents += counts.dependents;
            }
          }
          context.canonicalGraph = {
            revisionId: canonicalContext.revisionId,
            nodeCount: fileNodes.length,
            internalDependencies,
            internalDependents,
          };
        }
      } finally {
        canonicalContext.close();
      }
    }

    // 3. Get dependencies (what this file uses) - Use unified_relationships via Drizzle
    if (symbolIds.length > 0) {
      const symbolIdSet = new Set(symbolIds);

      // Query unified_relationships for structural/behavioral relationships
      const allRels = dbManager.getAllUnifiedRelationships();
      const dependencyRels = allRels.filter((rel) => {
        if (rel.category !== 'structural' && rel.category !== 'behavioral') return false;
        const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
        return fromSymbols.some((s) => symbolIdSet.has(s));
      });

      // Extract target symbol IDs
      const targetIds = new Set<string>();
      for (const rel of dependencyRels) {
        const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
        for (const target of toSymbols) {
          if (target) targetIds.add(target);
        }
      }

      if (targetIds.size > 0) {
        const dependencyRows = dbManager
          .getSymbolsByIds(Array.from(targetIds))
          .filter((row) => row.file_path !== relativePath);

        context.dependencies = dependencyRows.map((row) => ({
          name: row.name,
          type: row.type,
          filePath: row.file_path,
        }));
      }
    }

    // 4. Get test files (test_mappings + unified test-coverage relationships + conventional mirror test paths)
    const testPaths = new Set<string>();
    if (symbolIds.length > 0) {
      const symbolIdSet = new Set(symbolIds);
      const allTestMappings = dbManager.getAllTestMappings();
      for (const mapping of allTestMappings) {
        if (symbolIdSet.has(mapping.symbolId)) {
          testPaths.add(mapping.testFilePath);
        }
      }

      const allRels = dbManager.getAllUnifiedRelationships();
      for (const rel of allRels) {
        if (rel.type !== 'test-coverage') continue;
        const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
        if (!toSymbols.some((target) => symbolIdSet.has(target))) continue;
        if (rel.filePath) {
          testPaths.add(path.relative(process.cwd(), path.resolve(process.cwd(), rel.filePath)));
        }
      }
    }

    for (const candidateTestPath of this.findMirrorTestFiles(relativePath)) {
      testPaths.add(candidateTestPath);
    }

    context.tests = Array.from(testPaths).map((testPath) => ({
      path: testPath,
      type: testPath.includes('integration') ? 'integration' : 'unit',
    }));

    // 5. Get usedBy (what uses this file) - Use unified_relationships via Drizzle
    if (symbolIds.length > 0) {
      const symbolIdSet = new Set(symbolIds);

      // Query unified_relationships where this file's symbols are targets
      const allRels = dbManager.getAllUnifiedRelationships();
      const usedByRels = allRels.filter((rel) => {
        if (rel.category !== 'structural' && rel.category !== 'behavioral') return false;
        const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
        return toSymbols.some((s) => symbolIdSet.has(s));
      });

      // Extract source symbol IDs
      const sourceIds = new Set<string>();
      for (const rel of usedByRels) {
        const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
        for (const source of fromSymbols) {
          if (source) sourceIds.add(source);
        }
      }

      if (sourceIds.size > 0) {
        const usedByRows = dbManager
          .getSymbolsByIds(Array.from(sourceIds))
          .filter((row) => row.file_path !== relativePath);

        context.usedBy = usedByRows.map((row) => ({
          name: row.name,
          filePath: row.file_path,
          type: row.type,
        }));
      }
    }

    // 6-8. Get contracts, decisions, and error patterns (using Drizzle ORM)
    if (symbolIds.length > 0) {
      // Create symbol lookup map for O(1) access
      const symbolMap = new Map(context.symbols.map((s) => [s.id, s]));
      const symbolIdSet = new Set(symbolIds);

      // 6. Get contracts (preconditions, postconditions, invariants)
      try {
        const allContracts = dbManager.getAllContracts();
        const contracts = allContracts.filter((c) => symbolIdSet.has(c.symbolId));

        for (const contract of contracts) {
          const symbol = symbolMap.get(contract.symbolId);
          context.contracts.push({
            symbolId: contract.symbolId,
            symbolName: symbol?.name || 'Unknown',
            description: contract.description,
            preconditions: contract.preconditions,
            postconditions: contract.postconditions,
            invariants: contract.invariants,
          });
        }
      } catch (dbError) {
        // Continue even if contracts query fails
        console.warn('Failed to fetch contracts:', dbError);
      }

      // 7. Get design decisions
      try {
        const allDecisions = dbManager.getAllDecisionRecords();
        const decisions = allDecisions
          .filter((d) => d.symbolId && symbolIdSet.has(d.symbolId))
          .sort((a, b) => b.date.localeCompare(a.date));

        for (const decision of decisions) {
          const symbol = decision.symbolId ? symbolMap.get(decision.symbolId) : undefined;
          context.decisions.push({
            title: decision.title,
            decision: decision.decision,
            rationale: decision.rationale,
            status: decision.status,
            date: decision.date,
            symbolName: symbol?.name,
          });
        }
      } catch (dbError) {
        console.warn('Failed to fetch design decisions:', dbError);
      }

      // 8. Get error patterns
      try {
        const allErrors = dbManager.getAllErrorExperiences();
        const errors = allErrors.filter((e) => symbolIdSet.has(e.symbolId));

        for (const error of errors) {
          const symbol = symbolMap.get(error.symbolId);
          context.errorPatterns.push({
            symbolName: symbol?.name || 'Unknown',
            errorType: error.errorType,
            message: error.message,
            solution: error.solution,
            prevention: error.prevention || undefined,
          });
        }
      } catch (dbError) {
        console.warn('Failed to fetch error patterns:', dbError);
      }

      // 9. Get unified relationships (17 relationship types) - Using Drizzle ORM
      try {
        const allRels = dbManager.getAllUnifiedRelationships();
        const relevantRels = allRels.filter((rel) => {
          const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
          const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
          return (
            fromSymbols.some((s) => symbolIdSet.has(s)) || toSymbols.some((s) => symbolIdSet.has(s))
          );
        });

        // Process relationships
        for (const rel of relevantRels) {
          context.relationships.push({
            id: rel.id,
            type: rel.type,
            category: rel.category,
            direction: rel.direction,
            strength: rel.strength,
            fromSymbols: Array.isArray(rel.from) ? rel.from : [rel.from],
            toSymbols: Array.isArray(rel.to) ? rel.to : [rel.to],
            confidence: rel.confidence,
            description: rel.description || undefined,
            properties: rel.properties as Record<string, unknown> | undefined,
          });
        }
      } catch (dbError) {
        console.warn('Failed to fetch unified relationships:', dbError);
      }
    }

    return Promise.resolve(context);
  }

  /**
   * Discover conventional mirror/colocated unit test files (`src/__tests__/<dir>/<Base>.test.ts`, etc.).
   */
  private findMirrorTestFiles(relativePath: string): string[] {
    const normalized = relativePath.replace(/\\/g, '/');
    const ext = path.posix.extname(normalized);
    if (!ext || normalized.endsWith(`.test${ext}`) || normalized.endsWith(`.spec${ext}`)) {
      return [];
    }
    const baseWithoutExt = normalized.slice(0, -ext.length);
    const dir = path.posix.dirname(baseWithoutExt);
    const base = path.posix.basename(baseWithoutExt);
    const candidates = new Set<string>([
      `${baseWithoutExt}.test${ext}`,
      `${baseWithoutExt}.spec${ext}`,
      path.posix.join(dir, '__tests__', `${base}.test${ext}`),
      path.posix.join(dir, '__tests__', `${base}.spec${ext}`),
    ]);

    if (normalized.startsWith('src/')) {
      const subPath = baseWithoutExt.slice('src/'.length);
      candidates.add(path.posix.join('src/__tests__', `${subPath}.test${ext}`));
      candidates.add(path.posix.join('src/__tests__', `${subPath}.spec${ext}`));
    }

    const found: string[] = [];
    for (const candidate of candidates) {
      const absCandidate = path.resolve(process.cwd(), candidate);
      if (fs.existsSync(absCandidate)) {
        found.push(path.relative(process.cwd(), absCandidate));
      }
    }
    return found;
  }

  private findDocumentPath(symbolRef: string): string {
    // Search in all managed subdirectories
    const managedPath = path.join(process.cwd(), 'managed');
    if (!fs.existsSync(managedPath)) {
      return '(not found)';
    }

    // Get all subdirectories in managed/
    const entries = fs.readdirSync(managedPath, { withFileTypes: true });
    const managedDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => path.join('managed', e.name));

    // Also check root managed/ directory
    managedDirs.unshift('managed');

    for (const dir of managedDirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) continue;

      const files = this.getAllMarkdownFiles(dirPath);
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          // Check for H1 definition: # [[SymbolRef]]
          const h1Match = content.match(/^#\s+\[\[([^\]]+)\]\]/m);
          if (h1Match && h1Match[1] === symbolRef) {
            return path.relative(process.cwd(), file);
          }
        } catch {}
      }
    }

    return '(not found)';
  }

  private getAllMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...this.getAllMarkdownFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }

    return files;
  }

  /**
   * Generate LLM-friendly output from work context
   */
  private generateLlmOutput(context: WorkContext): string {
    let output = '';

    // Header
    output += `# Design Context: ${context.filePath}\n\n`;
    output += `> **File**: ${context.filePath}\n`;
    output += `> **Generated**: ${new Date().toISOString()}\n`;
    output += `> **Type**: Design Context (Contracts, Decisions, Error Patterns)\n\n`;
    output += `---\n\n`;

    // Summary
    output += `## Summary\n\n`;
    output += `This file contains **${context.symbols.length}** symbol(s) with the following design context:\n\n`;
    output += `- **Contracts**: ${context.contracts.length}\n`;
    output += `- **Design Decisions**: ${context.decisions.length}\n`;
    output += `- **Error Patterns**: ${context.errorPatterns.length}\n`;
    output += `- **Tests**: ${context.tests.length}\n`;
    output += `- **Dependencies**: ${context.dependencies.length}\n`;
    output += `- **Used By**: ${context.usedBy.length} files\n`;
    output += `- **Relationships**: ${context.relationships.length}\n`;
    if (context.canonicalGraph) {
      output += `- **Canonical @ttsc/graph**: ${context.canonicalGraph.nodeCount} nodes, ${context.canonicalGraph.internalDependencies} deps, ${context.canonicalGraph.internalDependents} dependents (${context.canonicalGraph.revisionId})\n`;
    }
    output += '\n';

    // Symbols
    if (context.symbols.length > 0) {
      output += `## Symbols\n\n`;
      for (const symbol of context.symbols) {
        const badges = [];
        if (symbol.isExported) badges.push('exported');
        if (symbol.isPublic) badges.push('public');
        const badgeStr = badges.length > 0 ? ` [${badges.join(', ')}]` : '';

        output += `- **${symbol.name}** (\`${symbol.type}\`)${badgeStr}\n`;
        if (symbol.summary) {
          output += `  - ${symbol.summary}\n`;
        }
        output += `  - Location: \`${symbol.filePath}:${symbol.line}\`\n`;
      }
      output += `\n`;
    }

    // Related Documentation
    if (context.relatedDocs.length > 0) {
      output += `## Related Documentation\n\n`;
      output += `This file references the following documentation:\n\n`;
      for (const doc of context.relatedDocs) {
        const isFound = doc.path !== '(not found)';
        const status = isFound ? '✓' : '✗';
        const badge = isFound ? this.formatRelatedDocBadge(doc) : '';
        output += `- ${status} [[${doc.symbolRef}]]`;
        if (isFound) {
          output += `${badge ? ` ${badge}` : ''} → \`${doc.path}\``;
        } else {
          output += ` (not found)`;
        }
        if (doc.sourceFile && doc.sourceLine) {
          output += ` (referenced at ${doc.sourceFile}:${doc.sourceLine})`;
        }
        output += `\n`;
      }
      output += `\n`;
    }

    // Contracts
    if (context.contracts.length > 0) {
      output += `## Contracts\n\n`;
      output += `Design by contract specifications for this file's symbols:\n\n`;

      for (const contract of context.contracts) {
        output += `### ${contract.symbolName}\n\n`;
        output += `${contract.description}\n\n`;

        if (contract.preconditions.length > 0) {
          output += `**Preconditions** (must be true before calling):\n\n`;
          for (const pre of contract.preconditions) {
            output += `- ${pre}\n`;
          }
          output += `\n`;
        }

        if (contract.postconditions.length > 0) {
          output += `**Postconditions** (must be true after execution):\n\n`;
          for (const post of contract.postconditions) {
            output += `- ${post}\n`;
          }
          output += `\n`;
        }

        if (contract.invariants.length > 0) {
          output += `**Invariants** (must always be true):\n\n`;
          for (const inv of contract.invariants) {
            output += `- ${inv}\n`;
          }
          output += `\n`;
        }
      }
    }

    // Design Decisions
    if (context.decisions.length > 0) {
      output += `## Design Decisions\n\n`;
      output += `Architecture Decision Records (ADRs) for this file:\n\n`;

      for (const decision of context.decisions) {
        output += `### ${decision.title}\n\n`;
        if (decision.symbolName) {
          output += `**Symbol**: ${decision.symbolName}\n\n`;
        }
        output += `**Status**: ${decision.status}\n\n`;
        output += `**Date**: ${decision.date}\n\n`;
        output += `**Decision**: ${decision.decision}\n\n`;
        output += `**Rationale**: ${decision.rationale}\n\n`;
      }
    }

    // Error Patterns
    if (context.errorPatterns.length > 0) {
      output += `## Common Pitfalls\n\n`;
      output += `Known error patterns and how to avoid them:\n\n`;

      for (const error of context.errorPatterns) {
        output += `### ${error.errorType} (${error.symbolName})\n\n`;
        output += `**Error**: ${error.message}\n\n`;
        output += `**Solution**: ${error.solution}\n\n`;
        if (error.prevention) {
          output += `**Prevention**: ${error.prevention}\n\n`;
        }
      }
    }

    // Dependencies
    if (context.dependencies.length > 0) {
      output += `## Dependencies\n\n`;
      output += `This file depends on:\n\n`;
      const deps = context.dependencies.slice(0, 30);
      for (const dep of deps) {
        output += `- **${dep.name}** (\`${dep.type}\`) - \`${dep.filePath}\`\n`;
      }
      if (context.dependencies.length > 30) {
        output += `\n_... and ${context.dependencies.length - 30} more dependencies_\n`;
      }
      output += `\n`;
    }

    // Test Coverage
    if (context.tests.length > 0) {
      output += `## Test Coverage\n\n`;
      output += `This file is tested by:\n\n`;
      for (const test of context.tests) {
        const testType = test.type === 'integration' ? '🔗 Integration' : '✅ Unit';
        output += `- ${testType}: \`${test.path}\`\n`;
        if (test.coverage !== undefined) {
          output += `  - Coverage: ${test.coverage}%\n`;
        }
      }
      output += `\n`;
    } else {
      output += `## Test Coverage\n\n`;
      output += `⚠️ **No tests found for this file**. Consider adding tests in \`src/__tests__/\`.\n\n`;
    }

    // Impact Analysis
    if (context.usedBy.length > 0) {
      output += `## Impact Analysis\n\n`;
      output += `⚠️ **${context.usedBy.length} files** depend on this file. Changes here will impact:\n\n`;
      const usedBy = context.usedBy.slice(0, 20);
      for (const usage of usedBy) {
        output += `- **${usage.name}** (\`${usage.type}\`) - \`${usage.filePath}\`\n`;
      }
      if (context.usedBy.length > 20) {
        output += `\n_... and ${context.usedBy.length - 20} more files_\n`;
      }
      output += `\n`;
    } else {
      output += `## Impact Analysis\n\n`;
      output += `✓ No other files depend on this file. Changes are isolated.\n\n`;
    }

    // Relationship Statistics
    if (context.relationships.length > 0) {
      output += `## Relationship Statistics\n\n`;

      const explicitRels = context.relationships.filter((r) => !r.properties?.inferred);
      const inferredRels = context.relationships.filter((r) => r.properties?.inferred === true);
      const density =
        context.symbols.length > 0
          ? (context.relationships.length / context.symbols.length).toFixed(2)
          : '0.00';

      output += `- **Total Relationships**: ${context.relationships.length}\n`;
      output += `- **Relationship Density**: ${density} (relationships per symbol)\n`;
      output += `- **Explicit**: ${explicitRels.length} (${((explicitRels.length / context.relationships.length) * 100).toFixed(1)}%)\n`;
      output += `- **Inferred**: ${inferredRels.length} (${((inferredRels.length / context.relationships.length) * 100).toFixed(1)}%)\n\n`;

      // Group by category
      const byCategory = this.groupBy(context.relationships, 'category');
      output += `**By Category**:\n\n`;
      const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length);
      for (const [category, rels] of sortedCategories) {
        const percentage = ((rels.length / context.relationships.length) * 100).toFixed(1);
        output += `- **${category}**: ${rels.length} (${percentage}%)\n`;
      }
      output += `\n`;

      // Group by strength
      const strongCount = context.relationships.filter((r) => r.strength === 'strong').length;
      const mediumCount = context.relationships.filter((r) => r.strength === 'medium').length;
      const weakCount = context.relationships.filter((r) => r.strength === 'weak').length;

      output += `**By Strength**:\n\n`;
      output += `- **Strong**: ${strongCount} (${((strongCount / context.relationships.length) * 100).toFixed(1)}%)\n`;
      output += `- **Medium**: ${mediumCount} (${((mediumCount / context.relationships.length) * 100).toFixed(1)}%)\n`;
      output += `- **Weak**: ${weakCount} (${((weakCount / context.relationships.length) * 100).toFixed(1)}%)\n\n`;
    }

    // Recommendations
    output += `## Recommendations\n\n`;
    const recommendations: string[] = [];

    const density =
      context.symbols.length > 0 ? context.relationships.length / context.symbols.length : 0;

    if (density >= 5.0) {
      recommendations.push(
        `✓ High relationship density (${density.toFixed(2)}) - code is well connected`
      );
    } else if (density < 2.0) {
      recommendations.push(
        `• Low relationship density (${density.toFixed(2)}) - consider adding more relationships`
      );
    }

    if (context.tests.length === 0) {
      recommendations.push(`• No test coverage - add tests in \`src/__tests__/\``);
    }

    const inferredCount = context.relationships.filter(
      (r) => r.properties?.inferred === true
    ).length;
    if (inferredCount > 0 && inferredCount > context.relationships.length * 0.3) {
      recommendations.push(
        `• ${inferredCount} inferred relationships (${((inferredCount / context.relationships.length) * 100).toFixed(1)}%) - consider explicit documentation`
      );
    }

    if (context.contracts.length === 0 && context.symbols.some((s) => s.isPublic)) {
      recommendations.push(
        `• No contract specifications - consider adding @precondition/@postcondition tags`
      );
    }

    if (context.decisions.length === 0 && context.relationships.length > 10) {
      recommendations.push(`• No design decisions recorded - consider creating ADRs`);
    }

    if (context.usedBy.length > 10) {
      recommendations.push(
        `⚠️ High impact (${context.usedBy.length} files) - test carefully when making changes`
      );
    }

    if (context.errorPatterns.length > 0) {
      recommendations.push(
        `✓ ${context.errorPatterns.length} known pitfalls documented - review before working on this file`
      );
    }

    if (recommendations.length > 0) {
      for (const rec of recommendations) {
        output += `- ${rec}\n`;
      }
    } else {
      output += `✓ No recommendations - code is in good shape\n`;
    }
    output += `\n`;

    // Footer
    output += `---\n\n`;
    output += `_Generated by TSDoc Edge design-context command with --llm flag_\n`;

    return output;
  }

  private isAuthoredNormativeSpec(docPath: string): boolean {
    if (!docPath || docPath === '(not found)') {
      return false;
    }
    const normalizedDoc = docPath.replace(/\\/g, '/').replace(/^\.\//, '');
    const configuredDirs = ConfigManager.getInstance().get().specGovernance?.authoredSpecDirs;
    const authoredDirs =
      configuredDirs && configuredDirs.length > 0 ? configuredDirs : ['managed/specs'];

    for (const rawDir of authoredDirs) {
      const cleanDir = rawDir.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
      if (
        cleanDir.length > 0 &&
        (normalizedDoc === cleanDir || normalizedDoc.startsWith(`${cleanDir}/`))
      ) {
        return true;
      }
    }

    return /(^|\/)specs\//.test(normalizedDoc);
  }

  private formatRelatedDocBadge(doc: WorkContext['relatedDocs'][number]): string {
    if (!doc.path || doc.path === '(not found)') {
      return '';
    }

    if (this.isAuthoredNormativeSpec(doc.path)) {
      if (doc.specStatus && doc.specScore !== undefined) {
        return `[${doc.specStatus.toUpperCase()}, Spec Score: ${doc.specScore}%]`;
      }
      if (doc.specStatus) {
        return `[${doc.specStatus.toUpperCase()}]`;
      }
      if (doc.specScore !== undefined) {
        return `[Spec Score: ${doc.specScore}%]`;
      }
      return '[Spec]';
    }

    return `[Checkpoint${doc.specStatus ? `, ${doc.specStatus.toUpperCase()}` : ''}]`;
  }

  private displayContext(context: WorkContext): void {
    const colors = {
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
    };

    // Section divider
    const divider = '━'.repeat(80);

    // 1. Related Specifications & Checkpoints
    console.log(colors.bold + divider + colors.reset);
    console.log(
      colors.blue +
        '📚 관련 명세 및 체크포인트' +
        colors.reset +
        colors.dim +
        ` (${context.relatedDocs.length}개)` +
        colors.reset
    );
    console.log(colors.bold + divider + colors.reset);

    if (context.relatedDocs.length > 0) {
      for (const doc of context.relatedDocs) {
        const isFound = doc.path !== '(not found)';
        const statusIcon = isFound ? `${colors.green}✅` : `${colors.yellow}❌`;
        const badge = isFound ? this.formatRelatedDocBadge(doc) : '';
        const specMeta = badge ? ` ${colors.dim}${badge}${colors.reset}` : '';

        console.log(
          `  ${colors.cyan}•${colors.reset} ${colors.bold}[[${doc.symbolRef}]]${colors.reset} ${statusIcon}${colors.reset}${specMeta}`
        );

        if (isFound) {
          console.log(`    ${colors.dim}→ ${doc.path}${colors.reset}`);
        } else {
          console.log(`    ${colors.yellow}→ Not found${colors.reset}`);
          console.log(`    ${colors.dim}   Searched in: managed/*/${colors.reset}`);
          if (doc.sourceFile && doc.sourceLine) {
            console.log(
              `    ${colors.dim}   Referenced in: ${doc.sourceFile}:${doc.sourceLine}${colors.reset}`
            );
          }
          console.log(`    ${colors.blue}   💡 Create document or remove @doc tag${colors.reset}`);
        }
        console.log();
      }
    } else {
      console.log(`  ${colors.dim}No @doc tags found in file${colors.reset}`);
      console.log();
    }

    // 2. Contracts (Preconditions, Postconditions, Invariants)
    console.log(colors.bold + divider + colors.reset);
    console.log(
      colors.blue +
        '📜 계약 명세' +
        colors.reset +
        colors.dim +
        ` (${context.contracts.length}개)` +
        colors.reset
    );
    console.log(colors.bold + divider + colors.reset);

    if (context.contracts.length > 0) {
      for (const contract of context.contracts) {
        console.log(`  ${colors.bold}${contract.symbolName}${colors.reset}`);
        console.log(`    ${colors.dim}${contract.description}${colors.reset}`);
        console.log();

        if (contract.preconditions.length > 0) {
          console.log(`    ${colors.green}사전조건 (Preconditions):${colors.reset}`);
          for (const pre of contract.preconditions) {
            console.log(`      ${colors.cyan}•${colors.reset} ${pre}`);
          }
          console.log();
        }

        if (contract.postconditions.length > 0) {
          console.log(`    ${colors.green}사후조건 (Postconditions):${colors.reset}`);
          for (const post of contract.postconditions) {
            console.log(`      ${colors.cyan}•${colors.reset} ${post}`);
          }
          console.log();
        }

        if (contract.invariants.length > 0) {
          console.log(`    ${colors.green}불변식 (Invariants):${colors.reset}`);
          for (const inv of contract.invariants) {
            console.log(`      ${colors.cyan}•${colors.reset} ${inv}`);
          }
          console.log();
        }
      }
    } else {
      console.log(
        `  ${colors.dim}등록된 계약 명세 없음 (@contract / @precondition / @postcondition / @invariant)${colors.reset}`
      );
      console.log();
    }

    // 3. Design Decisions / ADRs
    console.log(colors.bold + divider + colors.reset);
    console.log(
      colors.blue +
        '🧭 설계 의사결정 / ADR' +
        colors.reset +
        colors.dim +
        ` (${context.decisions.length}개)` +
        colors.reset
    );
    console.log(colors.bold + divider + colors.reset);

    if (context.decisions.length > 0) {
      for (const decision of context.decisions) {
        const statusIcon =
          decision.status === 'active'
            ? `${colors.green}✅`
            : decision.status === 'deprecated'
              ? `${colors.yellow}⚠️`
              : `${colors.dim}📋`;

        console.log(
          `  ${statusIcon}${colors.reset} ${colors.bold}${decision.title}${colors.reset}`
        );
        if (decision.symbolName) {
          console.log(`    ${colors.dim}Symbol: ${decision.symbolName}${colors.reset}`);
        }
        console.log(`    ${colors.dim}Date: ${decision.date}${colors.reset}`);
        console.log(`    ${colors.cyan}Decision:${colors.reset} ${decision.decision}`);
        console.log(`    ${colors.cyan}Rationale:${colors.reset} ${decision.rationale}`);
        console.log();
      }
    } else {
      console.log(
        `  ${colors.dim}기록된 설계 의사결정(ADR) 없음 (@decision / @rationale / @consequences)${colors.reset}`
      );
      console.log();
    }

    // 4. Error Patterns & Exception Contracts
    console.log(colors.bold + divider + colors.reset);
    console.log(
      colors.blue +
        '⚠️ 오류 패턴 및 예외 계약' +
        colors.reset +
        colors.dim +
        ` (${context.errorPatterns.length}개)` +
        colors.reset
    );
    console.log(colors.bold + divider + colors.reset);

    if (context.errorPatterns.length > 0) {
      for (const error of context.errorPatterns) {
        console.log(
          `  ${colors.yellow}❌${colors.reset} ${colors.bold}${error.errorType}${colors.reset} ${colors.dim}(${error.symbolName})${colors.reset}`
        );
        console.log(`    ${colors.yellow}Error:${colors.reset} ${error.message}`);
        console.log(`    ${colors.green}Solution:${colors.reset} ${error.solution}`);
        if (error.prevention) {
          console.log(`    ${colors.cyan}Prevention:${colors.reset} ${error.prevention}`);
        }
        console.log();
      }
    } else {
      console.log(`  ${colors.dim}문서화된 오류 패턴 없음${colors.reset}`);
      console.log();
    }

    // 5. Canonical Structural Summary
    console.log(colors.bold + divider + colors.reset);
    console.log(`${colors.blue}🕸️ 정본 구조 요약${colors.reset}`);
    console.log(colors.bold + divider + colors.reset);

    if (context.canonicalGraph) {
      console.log(
        `  ${colors.bold}Canonical @ttsc/graph:${colors.reset} ` +
          `${colors.cyan}${context.canonicalGraph.nodeCount}개 노드${colors.reset} | ` +
          `내부 의존: ${colors.cyan}${context.canonicalGraph.internalDependencies}${colors.reset} | ` +
          `내부 역의존: ${colors.cyan}${context.canonicalGraph.internalDependents}${colors.reset} ` +
          `${colors.dim}(${context.canonicalGraph.revisionId})${colors.reset}`
      );
    }

    console.log(
      `  ${colors.bold}구조 요약:${colors.reset} ` +
        `심볼 ${colors.cyan}${context.symbols.length}개${colors.reset} | ` +
        `의존 ${colors.cyan}${context.dependencies.length}개${colors.reset} | ` +
        `역의존(영향) ${colors.cyan}${context.usedBy.length}개${colors.reset} | ` +
        `통합 관계 ${colors.cyan}${context.relationships.length}개${colors.reset}`
    );

    const topItemsLimit = 5;
    if (context.dependencies.length > 0) {
      console.log(`  ${colors.bold}주요 의존 (${context.dependencies.length}개):${colors.reset}`);
      for (const dep of context.dependencies.slice(0, topItemsLimit)) {
        console.log(
          `    ${colors.cyan}• ${dep.name}${colors.reset} ${colors.dim}(${dep.type}) → ${dep.filePath}${colors.reset}`
        );
      }
      if (context.dependencies.length > topItemsLimit) {
        console.log(
          `    ${colors.dim}... 외 ${context.dependencies.length - topItemsLimit}개${colors.reset}`
        );
      }
    }

    if (context.usedBy.length > 0) {
      console.log(
        `  ${colors.bold}주요 역의존 / 영향 (${context.usedBy.length}개):${colors.reset}`
      );
      for (const usage of context.usedBy.slice(0, topItemsLimit)) {
        console.log(
          `    ${colors.cyan}• ${usage.name}${colors.reset} ${colors.dim}(${usage.type}) → ${usage.filePath}${colors.reset}`
        );
      }
      if (context.usedBy.length > topItemsLimit) {
        console.log(
          `    ${colors.dim}... 외 ${context.usedBy.length - topItemsLimit}개${colors.reset}`
        );
      }
    }

    if (context.relationships.length > 0) {
      const explicitRels = context.relationships.filter((r) => !r.properties?.inferred);
      const inferredRels = context.relationships.filter((r) => r.properties?.inferred === true);
      const relDensity =
        context.symbols.length > 0
          ? (context.relationships.length / context.symbols.length).toFixed(2)
          : '0.00';
      const topCategories = Object.entries(this.groupBy(context.relationships, 'category'))
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 4)
        .map(([category, rels]) => `${this.getCategoryIcon(category)} ${category} ${rels.length}`)
        .join(', ');

      console.log(
        `  ${colors.bold}관계 밀도:${colors.reset} ${colors.cyan}${relDensity}${colors.reset} ` +
          `${colors.dim}(명시적 ${explicitRels.length}개 / 추론 ${inferredRels.length}개)${colors.reset}`
      );
      if (topCategories) {
        console.log(
          `  ${colors.bold}카테고리:${colors.reset} ${colors.dim}${topCategories}${colors.reset}`
        );
      }
    }
    console.log();

    // 6. Verification Tests
    console.log(colors.bold + divider + colors.reset);
    console.log(
      colors.blue +
        '🧪 검증 테스트' +
        colors.reset +
        colors.dim +
        ` (${context.tests.length}개)` +
        colors.reset
    );
    console.log(colors.bold + divider + colors.reset);

    if (context.tests.length > 0) {
      let missingTests = 0;

      for (const test of context.tests) {
        const absoluteTestPath = path.resolve(process.cwd(), test.path);
        const exists = fs.existsSync(absoluteTestPath);
        const icon = exists ? (test.type === 'integration' ? '🔗' : '✅') : '❌';

        console.log(`  ${icon} ${test.path}`);

        if (!exists) {
          missingTests++;
          console.log(
            `    ${colors.yellow}   File missing - test mapping exists but file deleted${colors.reset}`
          );
          console.log(
            `    ${colors.blue}   💡 Run: tsdoc-edge build src to update test mappings${colors.reset}`
          );
        } else if (test.coverage !== undefined) {
          console.log(`     ${colors.dim}→ 커버리지: ${test.coverage}%${colors.reset}`);
        }
        console.log();
      }

      if (missingTests > 0) {
        console.log(`  ${colors.yellow}⚠️  ${missingTests} test files missing${colors.reset}`);
        console.log();
      }
    } else {
      console.log(`  ${colors.yellow}❌ No tests found for this file${colors.reset}`);
      console.log(`  ${colors.blue}   💡 Create test file in src/__tests__/${colors.reset}`);
      console.log(
        `  ${colors.blue}   💡 Run: tsdoc-edge untested to see all untested symbols${colors.reset}`
      );
      console.log();
    }

    // Actionable recommendations
    console.log(colors.bold + divider + colors.reset);
    console.log(`${colors.bold}💡 권장사항${colors.reset}`);
    console.log(colors.bold + divider + colors.reset);

    const recommendations: string[] = [];

    // Calculate relationship density
    const density =
      context.symbols.length > 0 ? context.relationships.length / context.symbols.length : 0;

    // Relationship density recommendation
    if (density >= 5.0) {
      recommendations.push(
        `${colors.green}✓${colors.reset} 관계 밀도 높음 (${density.toFixed(2)}) - 코드가 잘 연결됨`
      );
    } else if (density < 2.0) {
      recommendations.push(
        `${colors.yellow}•${colors.reset} 관계 밀도 낮음 (${density.toFixed(2)}) - 관계 추가 권장`
      );
    }

    // Test coverage recommendation
    if (context.tests.length === 0) {
      recommendations.push(
        `${colors.yellow}•${colors.reset} 테스트 커버리지 0% - 테스트 추가 필요`
      );
    }

    // Inferred relationships recommendation
    const inferredCount = context.relationships.filter(
      (r) => r.properties?.inferred === true
    ).length;
    if (inferredCount > 0 && inferredCount > context.relationships.length * 0.3) {
      recommendations.push(
        `${colors.yellow}•${colors.reset} 추론 관계 ${inferredCount}개 (${((inferredCount / context.relationships.length) * 100).toFixed(1)}%) - 명시적 문서화 권장`
      );
    }

    // Contracts recommendation
    if (context.contracts.length === 0 && context.symbols.some((s) => s.isPublic)) {
      recommendations.push(
        `${colors.yellow}•${colors.reset} 계약 명세 없음 - @precondition/@postcondition 추가 고려`
      );
    }

    // Design decisions recommendation
    if (context.decisions.length === 0 && context.relationships.length > 10) {
      recommendations.push(`${colors.yellow}•${colors.reset} 설계 결정 기록 없음 - ADR 작성 권장`);
    }

    // High impact warning
    if (context.usedBy.length > 10) {
      recommendations.push(
        `${colors.yellow}⚠${colors.reset}  높은 영향도 (${context.usedBy.length}개 파일) - 변경 시 신중히 테스트`
      );
    }

    // Error patterns recommendation
    if (context.errorPatterns.length > 0) {
      recommendations.push(
        `${colors.green}✓${colors.reset} ${context.errorPatterns.length}개 알려진 함정 문서화됨 - 참고하여 작업`
      );
    }

    if (recommendations.length > 0) {
      recommendations.forEach((rec) => console.log(`  ${rec}`));
    } else {
      console.log(
        `  ${colors.green}✓${colors.reset} ${colors.dim}권장사항 없음 - 코드 상태 양호${colors.reset}`
      );
    }
    console.log();
  }

  private formatGroupKey(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      value === null ||
      value === undefined
    ) {
      return String(value);
    }
    return JSON.stringify(value) ?? '';
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    for (const item of array) {
      const groupKey = this.formatGroupKey(item[key]);
      if (Object.hasOwn(groups, groupKey)) {
        groups[groupKey].push(item);
      } else {
        groups[groupKey] = [item];
      }
    }
    return groups;
  }

  private getCategoryIcon(category: string): string {
    const categoryIcons: Record<string, string> = {
      structural: '🏗️',
      'data-flow': '📊',
      behavioral: '⚙️',
      temporal: '⏱️',
      semantic: '💡',
      quality: '✨',
      verification: '✅',
      organizational: '📁',
    };
    return categoryIcons[category] || '🔗';
  }
}
