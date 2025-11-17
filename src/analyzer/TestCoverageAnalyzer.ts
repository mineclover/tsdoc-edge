/**
 * Test coverage analyzer
 * Creates relationships between tests and implementation symbols
 *
 * @packageDocumentation
 * @see [[TEST_SYMBOL_EXTRACTION]] Phase 5
 */

import * as fs from 'node:fs';
import type { DatabaseManager } from '../storage/DatabaseManager';
import type { TestCase, TestSuite, TestSymbol } from '../types/test-symbols';
import type { Symbol } from '../types/graph/graph';
import { ImportAnalyzer, type ImportAnalysisResult } from './ImportAnalyzer';

/**
 * Test relationship types
 */
export type TestRelationType =
  | 'test-coverage'    // test-case → implementation symbol
  | 'contains'         // test-suite → child suite/case
  | 'covers-scenario'; // test-case → test-scenario

/**
 * Test relationship
 */
export interface TestRelationship {
  id: string;
  type: TestRelationType;
  fromSymbols: string[];
  toSymbols: string[];
  category: 'testing';
  confidence: number;
  metadata: {
    testedMethods?: string[];
    assertionCount?: number;
    nestingLevel?: number;
  };
}

/**
 * Relationship extraction result
 */
export interface RelationshipExtractionResult {
  testCoverageRelations: TestRelationship[];
  containsRelations: TestRelationship[];
  coverageStats: {
    totalTestCases: number;
    testCasesWithCoverage: number;
    totalTestedSymbols: number;
    averageAssertions: number;
  };
}

/**
 * Test coverage analyzer
 * Extracts relationships between test symbols and implementation symbols
 *
 * @public
 * @responsibility Create test-coverage, contains, and covers-scenario relationships
 */
export class TestCoverageAnalyzer {
  private db: DatabaseManager;
  private importAnalyzer: ImportAnalyzer;
  private importCache: Map<string, ImportAnalysisResult>;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.importAnalyzer = new ImportAnalyzer();
    this.importCache = new Map();
  }

  /**
   * Analyze test coverage and create relationships
   *
   * @param testSymbols - All test symbols from TestSymbolParser
   * @returns Relationship extraction result
   */
  analyzeTestCoverage(testSymbols: TestSymbol[]): RelationshipExtractionResult {
    const testCoverageRelations: TestRelationship[] = [];
    const containsRelations: TestRelationship[] = [];

    const testCases = testSymbols.filter((s): s is TestCase => s.type === 'test-case');
    const testSuites = testSymbols.filter((s): s is TestSuite => s.type === 'test-suite');

    let testCasesWithCoverage = 0;
    const testedSymbolsSet = new Set<string>();
    let totalAssertions = 0;
    let casesWithAssertions = 0;

    // 1. Create test-coverage relationships (test-case → implementation)
    for (const testCase of testCases) {
      const matchedSymbols: Symbol[] = [];

      // Strategy 1: Use testedSymbols from test code (variable names)
      if (testCase.testedSymbols.length > 0) {
        const symbolMatches = this.matchTestedSymbols(
          testCase.testedSymbols,
          testCase.filePath
        );
        matchedSymbols.push(...symbolMatches);
      }

      // Strategy 2: Use file-level imports (more reliable)
      const importedSymbols = this.matchImportedSymbols(testCase.filePath);
      matchedSymbols.push(...importedSymbols);

      // Remove duplicates
      const uniqueMatched = Array.from(
        new Map(matchedSymbols.map(s => [s.id, s])).values()
      );

      if (uniqueMatched.length > 0) {
        testCasesWithCoverage++;

        for (const implSymbol of uniqueMatched) {
          testedSymbolsSet.add(implSymbol.id);

          const relationId = 'test-coverage-' + testCase.id + '-' + implSymbol.id
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-');

          testCoverageRelations.push({
            id: relationId,
            type: 'test-coverage',
            fromSymbols: [testCase.id],
            toSymbols: [implSymbol.id],
            category: 'testing',
            confidence: this.calculateCoverageConfidence(testCase, implSymbol),
            metadata: {
              testedMethods: testCase.testedMethods,
              assertionCount: testCase.assertionCount,
            },
          });
        }
      }

      if (testCase.assertionCount) {
        totalAssertions += testCase.assertionCount;
        casesWithAssertions++;
      }
    }

    // 2. Create contains relationships (test-suite → children)
    for (const testSuite of testSuites) {
      // Suite → Child Suites
      for (const childSuiteId of testSuite.childSuites) {
        const relationId = ('contains-' + testSuite.id + '-' + childSuiteId)
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-');

        containsRelations.push({
          id: relationId,
          type: 'contains',
          fromSymbols: [testSuite.id],
          toSymbols: [childSuiteId],
          category: 'testing',
          confidence: 1.0,
          metadata: {
            nestingLevel: testSuite.nestingLevel + 1,
          },
        });
      }

      // Suite → Test Cases
      for (const testCaseId of testSuite.testCases) {
        const relationId = ('contains-' + testSuite.id + '-' + testCaseId)
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-');

        containsRelations.push({
          id: relationId,
          type: 'contains',
          fromSymbols: [testSuite.id],
          toSymbols: [testCaseId],
          category: 'testing',
          confidence: 1.0,
          metadata: {
            nestingLevel: testSuite.nestingLevel,
          },
        });
      }
    }

    // Calculate stats
    const averageAssertions = casesWithAssertions > 0
      ? totalAssertions / casesWithAssertions
      : 0;

    return {
      testCoverageRelations,
      containsRelations,
      coverageStats: {
        totalTestCases: testCases.length,
        testCasesWithCoverage,
        totalTestedSymbols: testedSymbolsSet.size,
        averageAssertions,
      },
    };
  }

  /**
   * Match imported symbols from a test file to implementation symbols
   *
   * This extracts all non-type-only imports from a test file and matches them
   * to implementation symbols in the database.
   *
   * @param testFilePath - Test file path
   * @returns Matched implementation symbols
   */
  private matchImportedSymbols(testFilePath: string): Symbol[] {
    const matched: Symbol[] = [];
    const importInfo = this.getImportAnalysis(testFilePath);

    if (!importInfo) {
      return matched;
    }

    // Get all non-type-only imports
    const nonTypeImports = importInfo.imports.filter(imp => !imp.isTypeOnly);

    for (const imp of nonTypeImports) {
      // Skip node modules
      if (!imp.modulePath.startsWith('.')) {
        continue;
      }

      // Use the local name to find the symbol
      const symbol = this.matchByImport(imp.localName, importInfo);
      if (symbol) {
        matched.push(symbol);
      }
    }

    return matched;
  }

  /**
   * Match tested symbol names to actual implementation symbols in database
   *
   * Uses a two-strategy approach:
   * 1. Import analysis - most accurate (e.g., `import { DatabaseManager } from '../storage/DatabaseManager'`)
   * 2. Variable name patterns - fallback (e.g., 'dbManager' → 'DatabaseManager')
   *
   * @param testedSymbols - Symbol names from test code (e.g., 'dbManager', 'extractor')
   * @param testFilePath - Test file path for context
   * @returns Matched implementation symbols
   */
  private matchTestedSymbols(
    testedSymbols: string[],
    testFilePath: string
  ): Symbol[] {
    const matched: Symbol[] = [];
    const matchedIds = new Set<string>(); // Prevent duplicates

    // Get import analysis for this test file
    const importInfo = this.getImportAnalysis(testFilePath);

    // Derive implementation file path from test file path
    // e.g., "src/__tests__/DatabaseManager.test.ts" → "src/storage/DatabaseManager.ts"
    const implFileName = this.deriveImplementationFileName(testFilePath);

    for (const symbolName of testedSymbols) {
      let symbol: Symbol | null = null;

      // Strategy 1: Match using import analysis (most accurate)
      if (importInfo) {
        symbol = this.matchByImport(symbolName, importInfo);
      }

      // Strategy 2: Fallback to variable name pattern matching
      if (!symbol) {
        const possibleNames = this.generatePossibleSymbolNames(symbolName);
        for (const name of possibleNames) {
          symbol = this.findSymbolByName(name, implFileName);
          if (symbol) break;
        }
      }

      // Add if found and not already matched
      if (symbol && !matchedIds.has(symbol.id)) {
        matched.push(symbol);
        matchedIds.add(symbol.id);
      }
    }

    return matched;
  }

  /**
   * Get import analysis for a test file (with caching)
   *
   * @param testFilePath - Path to test file
   * @returns Import analysis result or null if file not found
   */
  private getImportAnalysis(testFilePath: string): ImportAnalysisResult | null {
    // Check cache first
    if (this.importCache.has(testFilePath)) {
      return this.importCache.get(testFilePath)!;
    }

    // Read and analyze file
    try {
      if (!fs.existsSync(testFilePath)) {
        return null;
      }

      const sourceCode = fs.readFileSync(testFilePath, 'utf-8');
      const result = this.importAnalyzer.analyzeImports(sourceCode);

      // Cache result
      this.importCache.set(testFilePath, result);

      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Match symbol by import analysis
   *
   * @param localName - Local variable name in test (e.g., 'dbManager')
   * @param importInfo - Import analysis result
   * @returns Matched symbol or null
   */
  private matchByImport(localName: string, importInfo: ImportAnalysisResult): Symbol | null {
    // Check if this local name is in the import map
    const importedSymbol = importInfo.importMap.get(localName);
    if (!importedSymbol) {
      return null;
    }

    // Resolve to potential symbol IDs
    const symbolIds = this.importAnalyzer.resolveImportedSymbols([importedSymbol]);
    const potentialIds = symbolIds.get(localName);

    if (!potentialIds || potentialIds.length === 0) {
      return null;
    }

    // Try to find symbol by ID in database
    for (const symbolId of potentialIds) {
      // Try with class- prefix (e.g., 'class-filescanner')
      let symbol = this.findSymbolById('class-' + symbolId);
      if (symbol) {
        return symbol;
      }

      // Try with interface- prefix
      symbol = this.findSymbolById('interface-' + symbolId);
      if (symbol) {
        return symbol;
      }

      // Try with function- prefix
      symbol = this.findSymbolById('function-' + symbolId);
      if (symbol) {
        return symbol;
      }

      // Try plain kebab-case ID (for backwards compatibility)
      symbol = this.findSymbolById(symbolId);
      if (symbol) {
        return symbol;
      }

      // Try by name (PascalCase)
      const pascalName = symbolId
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      symbol = this.findSymbolByName(pascalName, null);
      if (symbol) {
        return symbol;
      }
    }

    return null;
  }

  /**
   * Find symbol by ID in database
   *
   * @param symbolId - Symbol ID to search
   * @returns Found symbol or null
   */
  private findSymbolById(symbolId: string): Symbol | null {
    try {
      const query = 'SELECT * FROM symbols WHERE id = ? AND type IN (\'class\', \'interface\', \'function\') LIMIT 1';
      const result = this.db['db'].prepare(query).get(symbolId);

      if (result) {
        return this.rowToSymbol(result);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Derive implementation file name from test file path
   *
   * @param testFilePath - Test file path
   * @returns Possible implementation file path pattern
   */
  private deriveImplementationFileName(testFilePath: string): string | null {
    // Extract base name from test file
    // "src/__tests__/DatabaseManager.test.ts" → "DatabaseManager"
    const match = testFilePath.match(/([^/]+)\.test\.ts$/);
    if (!match) return null;

    return match[1]; // Return base name for pattern matching
  }

  /**
   * Generate possible symbol names from variable name
   *
   * @param variableName - Variable name from test (e.g., 'dbManager')
   * @returns Possible class/interface names
   */
  private generatePossibleSymbolNames(variableName: string): string[] {
    const names: string[] = [];

    // Add original name
    names.push(variableName);

    // Convert camelCase to PascalCase
    // 'dbManager' → 'DbManager'
    const pascalCase = variableName.charAt(0).toUpperCase() + variableName.slice(1);
    names.push(pascalCase);

    // Expand common abbreviations
    // 'dbManager' → 'DatabaseManager'
    const expanded = this.expandAbbreviations(variableName);
    if (expanded !== variableName) {
      names.push(expanded);
      const expandedPascal = expanded.charAt(0).toUpperCase() + expanded.slice(1);
      names.push(expandedPascal);
    }

    return names;
  }

  /**
   * Expand common abbreviations in variable names
   *
   * @param name - Variable name
   * @returns Expanded name
   */
  private expandAbbreviations(name: string): string {
    const abbreviations: Record<string, string> = {
      'db': 'database',
      'mgr': 'manager',
      'cfg': 'config',
      'ctx': 'context',
      'repo': 'repository',
      'svc': 'service',
      'util': 'utility',
      'validator': 'validator',
      'parser': 'parser',
      'extractor': 'extractor',
    };

    let expanded = name;
    for (const [abbr, full] of Object.entries(abbreviations)) {
      const regex = new RegExp('^' + abbr + '([A-Z]|$)', 'i');
      if (regex.test(expanded)) {
        expanded = expanded.replace(regex, full + '$1');
        break;
      }
    }

    return expanded;
  }

  /**
   * Find symbol by name in database
   *
   * @param symbolName - Symbol name to search
   * @param filePattern - File name pattern (optional)
   * @returns Found symbol or null
   */
  private findSymbolByName(symbolName: string, filePattern: string | null): Symbol | null {
    try {
      let query = 'SELECT * FROM symbols WHERE name = ? AND type IN (\'class\', \'interface\', \'function\') LIMIT 1';
      const params: any[] = [symbolName];

      if (filePattern) {
        query = 'SELECT * FROM symbols WHERE name = ? AND type IN (\'class\', \'interface\', \'function\') AND file_path LIKE ? LIMIT 1';
        params.push('%' + filePattern + '%');
      }

      const result = this.db['db'].prepare(query).get(...params);

      if (result) {
        return this.rowToSymbol(result);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert database row to Symbol object
   */
  private rowToSymbol(row: any): Symbol {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      filePath: row.file_path,
      line: row.line,
      column: row.column,
      isExported: row.is_exported === 1,
      isPublic: row.is_public === 1,
      summary: row.summary || undefined,
      tests: [],
      designDecisions: [],
    };
  }

  /**
   * Calculate coverage confidence score
   *
   * @param testCase - Test case symbol
   * @param implSymbol - Implementation symbol
   * @returns Confidence score (0-1)
   */
  private calculateCoverageConfidence(testCase: TestCase, implSymbol: Symbol): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if methods are tested
    if (testCase.testedMethods.length > 0) {
      confidence += 0.2;
    }

    // Increase confidence if assertions exist
    if (testCase.assertionCount && testCase.assertionCount > 0) {
      confidence += 0.1;

      // More assertions = higher confidence
      if (testCase.assertionCount >= 3) {
        confidence += 0.1;
      }
    }

    // Increase confidence if file paths match
    const testFileBase = testCase.filePath.split('/').pop()?.replace('.test.ts', '');
    const implFileBase = implSymbol.filePath.split('/').pop()?.replace('.ts', '');
    if (testFileBase && implFileBase && testFileBase === implFileBase) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}
