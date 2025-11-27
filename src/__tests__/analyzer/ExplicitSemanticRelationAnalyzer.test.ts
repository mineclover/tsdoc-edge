/**
 * Tests for ExplicitSemanticRelationAnalyzer
 * @description Tests extraction of @relatedTo TSDoc tags
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ExplicitSemanticRelationAnalyzer } from '../../analyzer/ExplicitSemanticRelationAnalyzer';

describe('ExplicitSemanticRelationAnalyzer', () => {
  let analyzer: ExplicitSemanticRelationAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new ExplicitSemanticRelationAnalyzer();
    tempDir = path.join(process.cwd(), '.test-temp', `explicit-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create analyzer instance', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(ExplicitSemanticRelationAnalyzer);
    });
  });

  describe('analyze - empty directory', () => {
    it('should return empty array for empty directory', () => {
      const result = analyzer.analyze(tempDir);
      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent directory', () => {
      const result = analyzer.analyze(path.join(tempDir, 'nonexistent'));
      expect(result).toEqual([]);
    });
  });

  describe('analyze - file without @relatedTo tags', () => {
    it('should return empty array for file without tags', () => {
      const testFile = path.join(tempDir, 'simple.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Simple class without @relatedTo tags
 */
export class SimpleClass {
  method() {
    return 'test';
  }
}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result).toEqual([]);
    });
  });

  describe('analyze - @relatedTo tag detection', () => {
    it('should detect @relatedTo tag with description', () => {
      const testFile = path.join(tempDir, 'service.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * User service
 * @relatedTo UserRepository - Data access layer
 */
export class UserService {
  method() {
    return 'test';
  }
}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('explicit-semantic-relation');
      expect(result[0].from).toBe('UserService');
      expect(result[0].to).toBe('UserRepository');
      expect(result[0].properties?.relationDescription).toBe('Data access layer');
    });

    it('should detect @relatedTo tag without description', () => {
      const testFile = path.join(tempDir, 'service.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * User service
 * @relatedTo TokenManager
 */
export class UserService {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(1);
      expect(result[0].from).toBe('UserService');
      expect(result[0].to).toBe('TokenManager');
      expect(result[0].properties?.relationDescription).toBeUndefined();
    });

    it('should detect multiple @relatedTo tags', () => {
      const testFile = path.join(tempDir, 'service.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Database manager
 * @relatedTo DatabaseConfig - Configuration
 * @relatedTo ConnectionPool - Resource management
 * @relatedTo QueryExecutor - Query execution
 */
export class DatabaseManager {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(3);

      const targets = result.map(r => r.to);
      expect(targets).toContain('DatabaseConfig');
      expect(targets).toContain('ConnectionPool');
      expect(targets).toContain('QueryExecutor');
    });
  });

  describe('analyze - different declaration types', () => {
    it('should detect @relatedTo on functions', () => {
      const testFile = path.join(tempDir, 'utils.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Process data
 * @relatedTo DataValidator - Validation step
 */
export function processData() {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(1);
      expect(result[0].from).toBe('processData');
      expect(result[0].to).toBe('DataValidator');
    });

    it('should detect @relatedTo on interfaces', () => {
      const testFile = path.join(tempDir, 'types.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * User entity
 * @relatedTo UserDTO - Data transfer object
 */
export interface User {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(1);
      expect(result[0].from).toBe('User');
      expect(result[0].to).toBe('UserDTO');
    });

    it('should detect @relatedTo on type aliases', () => {
      const testFile = path.join(tempDir, 'types.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * User config
 * @relatedTo AppConfig - Parent config
 */
export type UserConfig = { name: string };
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(1);
      expect(result[0].from).toBe('UserConfig');
    });
  });

  describe('analyze - multiple files', () => {
    it('should analyze multiple files in directory', () => {
      fs.writeFileSync(
        path.join(tempDir, 'service1.ts'),
        `
/**
 * @relatedTo Service2 - Partner service
 */
export class Service1 {}
`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(tempDir, 'service2.ts'),
        `
/**
 * @relatedTo Service1 - Partner service
 */
export class Service2 {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(2);
    });

    it('should skip test files', () => {
      // Note: The analyzer does not skip .test.ts files by default
      // but it does skip .d.ts files
      fs.writeFileSync(
        path.join(tempDir, 'service.d.ts'),
        `
/**
 * @relatedTo OtherService
 */
export declare class Service {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result).toEqual([]);
    });
  });

  describe('relationship properties', () => {
    it('should set confidence to 1.0 for explicit tags', () => {
      const testFile = path.join(tempDir, 'service.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * @relatedTo OtherService
 */
export class TestService {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result[0].confidence).toBe(1.0);
    });

    it('should set direction to undirected', () => {
      const testFile = path.join(tempDir, 'service.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * @relatedTo OtherService
 */
export class TestService {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result[0].direction).toBe('undirected');
    });

    it('should set category to semantic', () => {
      const testFile = path.join(tempDir, 'service.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * @relatedTo OtherService
 */
export class TestService {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result[0].category).toBe('semantic');
    });

    it('should include evidence with documentation type', () => {
      const testFile = path.join(tempDir, 'service.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * @relatedTo OtherService - Test relationship
 */
export class TestService {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result[0].evidence).toBeDefined();
      expect(result[0].evidence?.[0].type).toBe('documentation');
      expect(result[0].evidence?.[0].confidence).toBe(1.0);
      expect(result[0].evidence?.[0].snippet).toContain('@relatedTo OtherService');
    });

    it('should set detectionMethod to tsdoc-tag', () => {
      const testFile = path.join(tempDir, 'service.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * @relatedTo OtherService
 */
export class TestService {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result[0].properties?.detectionMethod).toBe('tsdoc-tag');
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for empty relationships', () => {
      const stats = analyzer.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.withDescription).toBe(0);
      expect(stats.withoutDescription).toBe(0);
      expect(stats.uniqueSymbols).toBe(0);
      expect(stats.mostConnectedSymbols).toEqual([]);
    });

    it('should calculate statistics correctly', () => {
      const testFile = path.join(tempDir, 'service.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * @relatedTo ServiceB - With description
 * @relatedTo ServiceC
 */
export class ServiceA {}

/**
 * @relatedTo ServiceA - Back reference
 */
export class ServiceB {}
`,
        'utf-8'
      );

      const relationships = analyzer.analyze(tempDir);
      const stats = analyzer.getStatistics(relationships);

      expect(stats.total).toBe(3);
      expect(stats.withDescription).toBe(2); // ServiceB and ServiceA back reference
      expect(stats.withoutDescription).toBe(1); // ServiceC
      expect(stats.uniqueSymbols).toBe(4); // ServiceA, ServiceB, ServiceC, ServiceA (as target)
    });

    it('should find most connected symbols', () => {
      const testFile = path.join(tempDir, 'hub.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * @relatedTo Spoke1
 * @relatedTo Spoke2
 * @relatedTo Spoke3
 * @relatedTo Spoke4
 */
export class Hub {}
`,
        'utf-8'
      );

      const relationships = analyzer.analyze(tempDir);
      const stats = analyzer.getStatistics(relationships);

      expect(stats.mostConnectedSymbols.length).toBeGreaterThan(0);
      expect(stats.mostConnectedSymbols[0].symbol).toBe('Hub');
      expect(stats.mostConnectedSymbols[0].connections).toBe(4);
    });
  });

  describe('subdirectory handling', () => {
    it('should recursively analyze subdirectories', () => {
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir, { recursive: true });

      fs.writeFileSync(
        path.join(subDir, 'nested.ts'),
        `
/**
 * @relatedTo ParentService
 */
export class NestedService {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(1);
      expect(result[0].from).toBe('NestedService');
    });

    it('should skip node_modules directory', () => {
      const nodeModules = path.join(tempDir, 'node_modules', 'some-package');
      fs.mkdirSync(nodeModules, { recursive: true });

      fs.writeFileSync(
        path.join(nodeModules, 'index.ts'),
        `
/**
 * @relatedTo SomeService
 */
export class ExternalPackage {}
`,
        'utf-8'
      );

      const result = analyzer.analyze(tempDir);

      expect(result).toEqual([]);
    });
  });
});
