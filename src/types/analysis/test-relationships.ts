/**
 * Test relationship analysis types
 *
 * @packageDocumentation
 * @doc [[TestRelationships]]
 * @context Integration and unit test traceability across symbol usages and verified code relationships
 * @functionality Defines TestSymbolUsage, ImportedSymbol, UsagePattern, VerifiedRelationship, RelationshipEvidence, RelationshipCoverage, UnverifiedRelationship, and TestRelationshipAnalysis contracts
 */

/**
 * Symbol usage in a test file
 * @doc [[TestRelationships]]
 * @public
 */
export interface TestSymbolUsage {
  /** Test file path */
  testFilePath: string;
  /** Imported symbols from production code */
  importedSymbols: ImportedSymbol[];
  /** Usage patterns found in test */
  usagePatterns: UsagePattern[];
}

/**
 * Imported symbol information
 * @doc [[TestRelationships]]
 * @public
 */
export interface ImportedSymbol {
  /** Symbol name as imported */
  symbolName: string;
  /** Resolved symbol ID */
  symbolId: string | null;
  /** Module path */
  fromModule: string;
  /** Import line number */
  line: number;
}

/**
 * Usage pattern in test code
 * @doc [[TestRelationships]]
 * @public
 */
export interface UsagePattern {
  /** Symbol ID being used */
  symbolId: string;
  /** Line number of usage */
  lineNumber: number;
  /** Type of usage */
  usageType:
    | 'import'
    | 'instantiation'
    | 'method-call'
    | 'dependency-injection'
    | 'property-access';
  /** Code snippet */
  codeSnippet?: string;
  /** Related symbols (for dependency injection, method calls) */
  relatedSymbols?: string[];
}

/**
 * Verified relationship between symbols
 * @doc [[TestRelationships]]
 * @public
 */
export interface VerifiedRelationship {
  /** Source symbol ID */
  source: string;
  /** Target symbol ID */
  target: string;
  /** Test file that verified this relationship */
  verifiedBy: string;
  /** Verification strength */
  strength: 'weak' | 'medium' | 'strong';
  /** Evidence of verification */
  evidence: RelationshipEvidence[];
}

/**
 * Evidence of relationship verification
 * @doc [[TestRelationships]]
 * @public
 */
export interface RelationshipEvidence {
  /** Line number in test file */
  lineNumber: number;
  /** Code snippet showing the relationship */
  codeSnippet: string;
  /** Pattern that was detected */
  pattern: 'dependency-injection' | 'method-call' | 'property-access' | 'co-occurrence';
}

/**
 * Relationship coverage analysis result
 * @doc [[TestRelationships]]
 * @public
 */
export interface RelationshipCoverage {
  /** Total relationships in codebase */
  totalRelationships: number;
  /** Relationships verified by tests */
  verifiedRelationships: number;
  /** Relationships not verified */
  unverifiedRelationships: UnverifiedRelationship[];
  /** Overall coverage percentage */
  coveragePercentage: number;
  /** Matrix of verified relationships */
  verificationMatrix: Map<string, Map<string, VerifiedRelationship[]>>;
  /** Verification by strength */
  byStrength: {
    strong: number;
    medium: number;
    weak: number;
  };
}

/**
 * Unverified relationship
 * @doc [[TestRelationships]]
 * @public
 */
export interface UnverifiedRelationship {
  /** Source symbol ID */
  source: string;
  /** Target symbol ID */
  target: string;
  /** Source symbol name */
  sourceName: string;
  /** Target symbol name */
  targetName: string;
  /** Reason for not being verified */
  reason: 'no-test' | 'test-exists-but-no-integration' | 'symbols-mocked';
  /** Suggestion for adding test */
  suggestion?: string;
}

/**
 * Test relationship analysis result
 * @doc [[TestRelationships]]
 * @public
 */
export interface TestRelationshipAnalysis {
  /** Total test files analyzed */
  totalTestFiles: number;
  /** Test files with integrations */
  testFilesWithIntegrations: number;
  /** All verified relationships */
  verifiedRelationships: VerifiedRelationship[];
  /** Coverage information */
  coverage: RelationshipCoverage;
  /** Top unverified relationships */
  topUnverified: UnverifiedRelationship[];
}
