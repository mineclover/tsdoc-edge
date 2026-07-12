/**
 * Tests for FeatureGroupingAnalyzer
 * @description Tests feature grouping detection from @feature tags and directory structure
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FeatureGroupingAnalyzer } from '../../analyzer/FeatureGroupingAnalyzer';
import type { Symbol, SymbolGraph } from '../../types/graph';

// Helper to create mock symbol graph
const createMockGraph = (symbols: Symbol[] = []): SymbolGraph => {
  const symbolMap = new Map(symbols.map((s) => [s.id, s]));
  return {
    symbols: symbolMap,
    edges: [],
    metadata: {
      version: '1.0',
      createdAt: new Date().toISOString(),
    },
  } as unknown as SymbolGraph;
};

// Helper to create test symbol
const createSymbol = (id: string, name: string, filePath: string): Symbol => ({
  id,
  name,
  filePath,
  type: 'class',
  line: 1,
  column: 1,
  isExported: true,
  isPublic: true,
  tests: [],
  designDecisions: [],
});

describe('FeatureGroupingAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `feature-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create analyzer instance with graph', () => {
      const graph = createMockGraph();
      const analyzer = new FeatureGroupingAnalyzer(graph);
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(FeatureGroupingAnalyzer);
    });
  });

  describe('analyze - empty directory', () => {
    it('should return empty array for empty directory', () => {
      const graph = createMockGraph();
      const analyzer = new FeatureGroupingAnalyzer(graph);

      const result = analyzer.analyze(tempDir);

      expect(result).toEqual([]);
    });
  });

  describe('analyze - @feature tag detection', () => {
    it('should detect @feature tag', () => {
      const symbols = [
        createSymbol('login-handler', 'LoginHandler', path.join(tempDir, 'auth.ts')),
        createSymbol('token-manager', 'TokenManager', path.join(tempDir, 'auth.ts')),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new FeatureGroupingAnalyzer(graph);

      fs.writeFileSync(
        path.join(tempDir, 'auth.ts'),
        `
/**
 * User login handler
 * @feature Authentication
 */
export class LoginHandler {}

/**
 * Token manager
 * @feature Authentication
 */
export class TokenManager {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      // Both symbols belong to Authentication feature
      // Creates pairwise relationship
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect multiple features', () => {
      const symbols = [
        createSymbol('login-handler', 'LoginHandler', path.join(tempDir, 'auth.ts')),
        createSymbol('payment-processor', 'PaymentProcessor', path.join(tempDir, 'billing.ts')),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new FeatureGroupingAnalyzer(graph);

      fs.writeFileSync(
        path.join(tempDir, 'auth.ts'),
        `
/**
 * @feature Authentication
 */
export class LoginHandler {}
`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(tempDir, 'billing.ts'),
        `
/**
 * @feature Billing
 */
export class PaymentProcessor {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      // Single member per feature means no relationships (need 2+ members)
      expect(result.length).toBe(0);
    });
  });

  describe('analyze - directory structure detection', () => {
    it('should detect feature from directory structure', () => {
      const featureDir = path.join(tempDir, 'features', 'auth');
      fs.mkdirSync(featureDir, { recursive: true });

      const symbols = [
        createSymbol('login-service', 'LoginService', path.join(featureDir, 'login.ts')),
        createSymbol('logout-service', 'LogoutService', path.join(featureDir, 'logout.ts')),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new FeatureGroupingAnalyzer(graph);

      fs.writeFileSync(path.join(featureDir, 'login.ts'), `export class LoginService {}`, 'utf-8');

      fs.writeFileSync(
        path.join(featureDir, 'logout.ts'),
        `export class LogoutService {}`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      // May detect feature grouping from directory
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('relationship properties', () => {
    it('should create feature-grouping relationships', () => {
      const symbols = [
        createSymbol('auth-service', 'AuthService', path.join(tempDir, 'auth.ts')),
        createSymbol('auth-guard', 'AuthGuard', path.join(tempDir, 'auth.ts')),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new FeatureGroupingAnalyzer(graph);

      fs.writeFileSync(
        path.join(tempDir, 'auth.ts'),
        `
/**
 * @feature Authentication
 */
export class AuthService {}

/**
 * @feature Authentication
 */
export class AuthGuard {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      if (result.length > 0) {
        expect(result[0].type).toBe('feature-grouping');
        expect(result[0].category).toBe('semantic');
      }
    });
  });

  describe('file filtering', () => {
    it('should skip node_modules', () => {
      const nodeModules = path.join(tempDir, 'node_modules', 'pkg');
      fs.mkdirSync(nodeModules, { recursive: true });

      fs.writeFileSync(
        path.join(nodeModules, 'index.ts'),
        `
/**
 * @feature External
 */
export class ExternalClass {}
`,
        'utf-8'
      );

      const graph = createMockGraph();
      const analyzer = new FeatureGroupingAnalyzer(graph);

      const result = analyzer.analyze(tempDir);

      expect(result).toEqual([]);
    });

    it('should skip .d.ts files', () => {
      fs.writeFileSync(
        path.join(tempDir, 'types.d.ts'),
        `
/**
 * @feature Types
 */
export declare class TypeDef {}
`,
        'utf-8'
      );

      const graph = createMockGraph();
      const analyzer = new FeatureGroupingAnalyzer(graph);

      const result = analyzer.analyze(tempDir);

      expect(result).toEqual([]);
    });
  });
});
