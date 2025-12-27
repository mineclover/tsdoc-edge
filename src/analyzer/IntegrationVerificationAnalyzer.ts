/**
 * Integration Verification Analyzer
 *
 * @doc [[IntegrationVerificationAnalyzer]]
 * @packageDocumentation
 * @responsibility Detect integration tests that verify connections between symbols
 *
 * @problem Test coverage only tracks single symbol testing
 * @solves Identify when tests verify integration between multiple symbols
 * @context Essential for understanding which symbol connections are tested
 *
 * @functionality
 * - Detect test files that test multiple production symbols
 * - Create integration-verification relationships between tested symbols
 * - Track which connections are verified by integration tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';
import { TestRelationshipExtractor } from './TestRelationshipExtractor';

/**
 * Integration Verification Analyzer
 *
 * @public
 * @responsibility Detect integration tests and create verification relationships
 */
export class IntegrationVerificationAnalyzer {
  private graph: SymbolGraph;
  private extractor: TestRelationshipExtractor;
  private projectRoot: string;

  constructor(graph: SymbolGraph, projectRoot?: string) {
    this.graph = graph;
    this.extractor = new TestRelationshipExtractor(graph);
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Analyze all integration verification relationships
   *
   * @returns Array of integration verification relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    // Find all test files
    const testFiles = this.findTestFiles();

    for (const testFile of testFiles) {
      try {
        const usage = this.extractor.extractFromFile(testFile);
        const verifiedRelationships = this.extractor.inferRelationships(usage);

        // Convert verified relationships to UnifiedRelationships
        for (const verified of verifiedRelationships) {
          const relationship = this.createIntegrationRelationship(
            verified.source,
            verified.target,
            testFile,
            verified.strength,
            verified.evidence[0]?.codeSnippet
          );
          if (relationship) {
            relationships.push(relationship);
          }
        }
      } catch (error) {
        // Skip files that can't be parsed
        continue;
      }
    }

    // Deduplicate relationships
    return this.deduplicateRelationships(relationships);
  }

  /**
   * Find all test files in the project
   */
  private findTestFiles(): string[] {
    const testFiles: string[] = [];
    const srcTestDir = path.join(this.projectRoot, 'src', '__tests__');

    const walkDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts'))) {
          testFiles.push(fullPath);
        }
      }
    };

    walkDir(srcTestDir);

    // Also check for test files in root
    const rootTestDir = path.join(this.projectRoot, '__tests__');
    walkDir(rootTestDir);

    return testFiles;
  }

  /**
   * Create an integration verification relationship
   */
  private createIntegrationRelationship(
    sourceId: string | null,
    targetId: string | null,
    testFile: string,
    strength: 'strong' | 'medium' | 'weak',
    codeSnippet?: string
  ): UnifiedRelationship | null {
    if (!sourceId || !targetId) return null;

    // Skip if same symbol
    if (sourceId === targetId) return null;

    // Skip if either symbol doesn't exist in graph
    if (!this.graph.symbols.has(sourceId) || !this.graph.symbols.has(targetId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const sourceInfo = this.graph.symbols.get(sourceId);
    const targetInfo = this.graph.symbols.get(targetId);

    const confidence = strength === 'strong' ? 0.95 : strength === 'medium' ? 0.8 : 0.6;

    return {
      id: `integration-verification-${sourceId}-${targetId}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100),
      type: 'integration-verification',
      category: 'verification',
      from: sourceId,
      to: targetId,
      direction: 'bidirectional',
      strength: strength === 'weak' ? 'weak' : strength === 'medium' ? 'medium' : 'strong',
      evidence: [
        {
          type: 'test',
          source: testFile,
          lineNumber: 0,
          snippet: codeSnippet,
          confidence,
          context: `Integration test verifies ${sourceInfo?.name || sourceId} and ${targetInfo?.name || targetId} work together`,
        },
      ],
      discoveredBy: 'test-analysis',
      confidence,
      filePath: testFile,
      properties: {
        testFile,
        sourceSymbol: sourceInfo?.name || sourceId,
        targetSymbol: targetInfo?.name || targetId,
        verificationStrength: strength,
      },
      description: `${sourceInfo?.name || sourceId} ↔ ${targetInfo?.name || targetId} verified by integration test`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * Deduplicate relationships (keep strongest verification)
   */
  private deduplicateRelationships(relationships: UnifiedRelationship[]): UnifiedRelationship[] {
    const byPair = new Map<string, UnifiedRelationship>();

    for (const rel of relationships) {
      // Create canonical pair key (sorted)
      const pairKey = [String(rel.from), String(rel.to)].sort().join('↔');

      const existing = byPair.get(pairKey);
      if (!existing || rel.confidence > existing.confidence) {
        byPair.set(pairKey, rel);
      }
    }

    return Array.from(byPair.values());
  }

  /**
   * Get statistics about integration verification
   *
   * @param relationships - Integration verification relationships
   * @returns Statistics object
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalVerifiedConnections: number;
    totalIntegrationTests: number;
    symbolsWithIntegrationTests: number;
    strongVerifications: number;
    mediumVerifications: number;
    weakVerifications: number;
  } {
    const testFiles = new Set<string>();
    const verifiedSymbols = new Set<string>();
    let strongCount = 0;
    let mediumCount = 0;
    let weakCount = 0;

    for (const rel of relationships) {
      const testFile = rel.properties?.testFile as string;
      if (testFile) {
        testFiles.add(testFile);
      }

      verifiedSymbols.add(String(rel.from));
      verifiedSymbols.add(String(rel.to));

      if (rel.strength === 'strong') {
        strongCount++;
      } else if (rel.strength === 'medium') {
        mediumCount++;
      } else {
        weakCount++;
      }
    }

    return {
      totalVerifiedConnections: relationships.length,
      totalIntegrationTests: testFiles.size,
      symbolsWithIntegrationTests: verifiedSymbols.size,
      strongVerifications: strongCount,
      mediumVerifications: mediumCount,
      weakVerifications: weakCount,
    };
  }
}
