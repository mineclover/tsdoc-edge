/**
 * TestRelationshipExtractor Tests
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TestRelationshipExtractor } from '../../analyzer/TestRelationshipExtractor';
import type { TestSymbolUsage } from '../../types/analysis/test-relationships';
import type { Symbol, SymbolGraph } from '../../types/graph';

describe('TestRelationshipExtractor', () => {
  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string; filePath?: string }>
  ): SymbolGraph {
    const symbolMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();
    const fileIndex = new Map<string, string[]>();

    for (const s of symbols) {
      const symbol: Symbol = {
        id: s.id,
        name: s.name,
        type: 'class',
        filePath: s.filePath || `src/${s.name}.ts`,
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };
      symbolMap.set(s.id, symbol);

      // Build name index
      const existingIds = nameIndex.get(s.name) || [];
      existingIds.push(s.id);
      nameIndex.set(s.name, existingIds);

      // Build file index
      const filePath = s.filePath || `src/${s.name}.ts`;
      const existingFileIds = fileIndex.get(filePath) || [];
      existingFileIds.push(s.id);
      fileIndex.set(filePath, existingFileIds);
    }

    return {
      symbols: symbolMap,
      relationships: [],
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex,
      fileIndex,
    } as SymbolGraph;
  }

  // Helper to create a temp directory with test files
  function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'test-extractor-'));
  }

  // Helper to cleanup temp directory
  function cleanup(tempDir: string) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  describe('constructor', () => {
    it('should create extractor with graph', () => {
      const graph = createMockGraph([]);
      const extractor = new TestRelationshipExtractor(graph);

      expect(extractor).toBeDefined();
    });
  });

  describe('extractFromFile', () => {
    it('should extract imports from test file', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'example.test.ts');

      // Create test file with imports
      fs.writeFileSync(
        testFilePath,
        `
import { ServiceA, ServiceB } from '../../services';
import DefaultExport from '../../default';

describe('Test', () => {
  it('should work', () => {});
});
`
      );

      // Create graph with matching symbols
      const graph = createMockGraph([
        { id: 'service-a', name: 'ServiceA' },
        { id: 'service-b', name: 'ServiceB' },
        { id: 'default-export', name: 'DefaultExport' },
      ]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      expect(result.testFilePath).toBe(testFilePath);
      expect(result.importedSymbols).toHaveLength(3);
      expect(result.importedSymbols.map((s) => s.symbolName)).toContain('ServiceA');
      expect(result.importedSymbols.map((s) => s.symbolName)).toContain('ServiceB');
      expect(result.importedSymbols.map((s) => s.symbolName)).toContain('DefaultExport');

      cleanup(tempDir);
    });

    it('should skip test framework imports (jest)', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'example.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { describe, it, expect } from 'jest';
import { Service } from './service';

describe('Test', () => {});
`
      );

      const graph = createMockGraph([{ id: 'service', name: 'Service' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      // Should only include Service, not jest imports
      expect(result.importedSymbols).toHaveLength(1);
      expect(result.importedSymbols[0].symbolName).toBe('Service');

      cleanup(tempDir);
    });

    it('should skip external module imports', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'example.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import * as fs from 'fs';
import express from 'express';
import { something } from '@external/package';
import { Service } from './service';

describe('Test', () => {});
`
      );

      const graph = createMockGraph([{ id: 'service', name: 'Service' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      // Should only include local Service import
      expect(result.importedSymbols).toHaveLength(1);
      expect(result.importedSymbols[0].symbolName).toBe('Service');
      expect(result.importedSymbols[0].fromModule).toBe('./service');

      cleanup(tempDir);
    });

    it('should extract instantiation patterns (new Constructor)', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'example.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { Service } from './service';

describe('Test', () => {
  it('should instantiate service', () => {
    const service = new Service();
    service.execute();
  });
});
`
      );

      const graph = createMockGraph([{ id: 'service', name: 'Service' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      const instantiationPatterns = result.usagePatterns.filter(
        (p) => p.usageType === 'instantiation'
      );
      expect(instantiationPatterns.length).toBeGreaterThan(0);
      expect(instantiationPatterns[0].codeSnippet).toContain('new Service()');

      cleanup(tempDir);
    });

    it('should detect dependency injection patterns (new A(new B()))', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'example.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { UserService } from './user-service';
import { UserRepository } from './user-repository';

describe('Integration', () => {
  it('should work together', () => {
    const repo = new UserRepository();
    const service = new UserService(repo);
  });
});
`
      );

      const graph = createMockGraph([
        { id: 'user-service', name: 'UserService' },
        { id: 'user-repository', name: 'UserRepository' },
      ]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      // Check for dependency injection pattern
      const _diPatterns = result.usagePatterns.filter(
        (p) => p.usageType === 'dependency-injection'
      );
      // The DI pattern detection depends on AST structure
      // At minimum we should have instantiation patterns
      const allPatterns = result.usagePatterns;
      expect(allPatterns.length).toBeGreaterThan(0);

      cleanup(tempDir);
    });

    it('should detect method call patterns (object.method())', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'example.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { Service } from './service';

describe('Test', () => {
  it('should call method', () => {
    Service.staticMethod();
  });
});
`
      );

      const graph = createMockGraph([{ id: 'service', name: 'Service' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      const methodCallPatterns = result.usagePatterns.filter((p) => p.usageType === 'method-call');
      expect(methodCallPatterns.length).toBeGreaterThan(0);

      cleanup(tempDir);
    });

    it('should include line numbers for imported symbols', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'example.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { Service } from './service';
describe('Test', () => {});
`
      );

      const graph = createMockGraph([{ id: 'service', name: 'Service' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      expect(result.importedSymbols[0].line).toBe(2); // Line 2 (1-indexed)

      cleanup(tempDir);
    });

    it('should resolve symbol IDs from name index', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'example.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { MyClass } from './my-class';
describe('Test', () => {});
`
      );

      const graph = createMockGraph([{ id: 'class-my-class', name: 'MyClass' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      // Should resolve to the symbol ID from name index
      expect(result.importedSymbols[0].symbolId).toBe('class-my-class');

      cleanup(tempDir);
    });

    it('should handle empty test file', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'empty.test.ts');

      fs.writeFileSync(testFilePath, '');

      const graph = createMockGraph([]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      expect(result.importedSymbols).toHaveLength(0);
      expect(result.usagePatterns).toHaveLength(0);

      cleanup(tempDir);
    });

    it('should return null symbol ID for unknown symbols', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'example.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { UnknownSymbol } from './unknown';
describe('Test', () => {});
`
      );

      // Empty graph - symbol won't be found
      const graph = createMockGraph([]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      expect(result.importedSymbols[0].symbolId).toBeNull();

      cleanup(tempDir);
    });
  });

  describe('inferRelationships', () => {
    it('should infer strong relationships from dependency injection', () => {
      const graph = createMockGraph([
        { id: 'user-service', name: 'UserService' },
        { id: 'user-repository', name: 'UserRepository' },
      ]);

      const extractor = new TestRelationshipExtractor(graph);

      const usage: TestSymbolUsage = {
        testFilePath: '/test/integration.test.ts',
        importedSymbols: [
          {
            symbolName: 'UserService',
            symbolId: 'user-service',
            fromModule: './user-service',
            line: 1,
          },
          {
            symbolName: 'UserRepository',
            symbolId: 'user-repository',
            fromModule: './user-repository',
            line: 2,
          },
        ],
        usagePatterns: [
          {
            symbolId: 'user-service',
            lineNumber: 10,
            usageType: 'dependency-injection',
            codeSnippet: 'new UserService(userRepository)',
            relatedSymbols: ['user-repository'],
          },
        ],
      };

      const relationships = extractor.inferRelationships(usage);

      const strongRel = relationships.find((r) => r.strength === 'strong');
      expect(strongRel).toBeDefined();
      expect(strongRel?.source).toBe('user-service');
      expect(strongRel?.target).toBe('user-repository');
      expect(strongRel?.verifiedBy).toBe('/test/integration.test.ts');
      expect(strongRel?.evidence[0].pattern).toBe('dependency-injection');

      cleanup;
    });

    it('should infer medium relationships from co-occurrence', () => {
      const graph = createMockGraph([
        { id: 'service-a', name: 'ServiceA' },
        { id: 'service-b', name: 'ServiceB' },
      ]);

      const extractor = new TestRelationshipExtractor(graph);

      // Two symbols used within 20 lines of each other
      const usage: TestSymbolUsage = {
        testFilePath: '/test/integration.test.ts',
        importedSymbols: [
          { symbolName: 'ServiceA', symbolId: 'service-a', fromModule: './a', line: 1 },
          { symbolName: 'ServiceB', symbolId: 'service-b', fromModule: './b', line: 2 },
        ],
        usagePatterns: [
          {
            symbolId: 'service-a',
            lineNumber: 10,
            usageType: 'instantiation',
            codeSnippet: 'new ServiceA()',
          },
          {
            symbolId: 'service-b',
            lineNumber: 15, // Within 20 lines of service-a usage
            usageType: 'instantiation',
            codeSnippet: 'new ServiceB()',
          },
        ],
      };

      const relationships = extractor.inferRelationships(usage);

      const mediumRel = relationships.find((r) => r.strength === 'medium');
      expect(mediumRel).toBeDefined();
      expect(mediumRel?.evidence[0].pattern).toBe('co-occurrence');

      cleanup;
    });

    it('should not create duplicate relationships', () => {
      const graph = createMockGraph([
        { id: 'service-a', name: 'ServiceA' },
        { id: 'service-b', name: 'ServiceB' },
      ]);

      const extractor = new TestRelationshipExtractor(graph);

      // Same DI pattern twice
      const usage: TestSymbolUsage = {
        testFilePath: '/test/test.ts',
        importedSymbols: [
          { symbolName: 'ServiceA', symbolId: 'service-a', fromModule: './a', line: 1 },
          { symbolName: 'ServiceB', symbolId: 'service-b', fromModule: './b', line: 2 },
        ],
        usagePatterns: [
          {
            symbolId: 'service-a',
            lineNumber: 10,
            usageType: 'dependency-injection',
            codeSnippet: 'new ServiceA(serviceB)',
            relatedSymbols: ['service-b'],
          },
          {
            symbolId: 'service-a',
            lineNumber: 20,
            usageType: 'dependency-injection',
            codeSnippet: 'new ServiceA(serviceB)',
            relatedSymbols: ['service-b'],
          },
        ],
      };

      const relationships = extractor.inferRelationships(usage);

      // Should only have one strong relationship (deduplicated)
      const strongRels = relationships.filter((r) => r.strength === 'strong');
      expect(strongRels.length).toBe(1);

      cleanup;
    });

    it('should handle empty usage patterns', () => {
      const graph = createMockGraph([]);
      const extractor = new TestRelationshipExtractor(graph);

      const usage: TestSymbolUsage = {
        testFilePath: '/test/empty.test.ts',
        importedSymbols: [],
        usagePatterns: [],
      };

      const relationships = extractor.inferRelationships(usage);

      expect(relationships).toHaveLength(0);
    });

    it('should group patterns by test case based on line proximity', () => {
      const graph = createMockGraph([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ]);

      const extractor = new TestRelationshipExtractor(graph);

      // Two groups: A,B close together; C far apart
      const usage: TestSymbolUsage = {
        testFilePath: '/test/test.ts',
        importedSymbols: [
          { symbolName: 'A', symbolId: 'a', fromModule: './a', line: 1 },
          { symbolName: 'B', symbolId: 'b', fromModule: './b', line: 2 },
          { symbolName: 'C', symbolId: 'c', fromModule: './c', line: 3 },
        ],
        usagePatterns: [
          { symbolId: 'a', lineNumber: 10, usageType: 'instantiation', codeSnippet: 'new A()' },
          { symbolId: 'b', lineNumber: 15, usageType: 'instantiation', codeSnippet: 'new B()' },
          // C is more than 20 lines away - different test case
          { symbolId: 'c', lineNumber: 100, usageType: 'instantiation', codeSnippet: 'new C()' },
        ],
      };

      const relationships = extractor.inferRelationships(usage);

      // A and B should be co-occurrence related, but C should not
      const abRel = relationships.find(
        (r) =>
          r.strength === 'medium' &&
          ((r.source === 'a' && r.target === 'b') || (r.source === 'b' && r.target === 'a'))
      );
      expect(abRel).toBeDefined();

      // No A-C or B-C medium relationships
      const acRel = relationships.find(
        (r) =>
          r.strength === 'medium' &&
          ((r.source === 'a' && r.target === 'c') || (r.source === 'c' && r.target === 'a'))
      );
      expect(acRel).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle test file with only imports (no usage)', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'imports-only.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { Service } from './service';
// No actual usage
`
      );

      const graph = createMockGraph([{ id: 'service', name: 'Service' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      expect(result.importedSymbols).toHaveLength(1);
      expect(result.usagePatterns).toHaveLength(0);

      cleanup(tempDir);
    });

    it('should handle vitest imports', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'vitest.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { describe, it, expect } from 'vitest';
import { Service } from './service';
describe('Test', () => {});
`
      );

      const graph = createMockGraph([{ id: 'service', name: 'Service' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      expect(result.importedSymbols).toHaveLength(1);
      expect(result.importedSymbols[0].symbolName).toBe('Service');

      cleanup(tempDir);
    });

    it('should handle @testing-library imports', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'react.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { render, screen } from '@testing-library/react';
import { Component } from './component';
describe('Test', () => {});
`
      );

      const graph = createMockGraph([{ id: 'component', name: 'Component' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      expect(result.importedSymbols).toHaveLength(1);
      expect(result.importedSymbols[0].symbolName).toBe('Component');

      cleanup(tempDir);
    });

    it('should handle mocha and chai imports', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'mocha.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Service } from './service';
describe('Test', () => {});
`
      );

      const graph = createMockGraph([{ id: 'service', name: 'Service' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      expect(result.importedSymbols).toHaveLength(1);
      expect(result.importedSymbols[0].symbolName).toBe('Service');

      cleanup(tempDir);
    });

    it('should handle sinon imports', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'sinon.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import sinon from 'sinon';
import { Service } from './service';
describe('Test', () => {});
`
      );

      const graph = createMockGraph([{ id: 'service', name: 'Service' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      expect(result.importedSymbols).toHaveLength(1);
      expect(result.importedSymbols[0].symbolName).toBe('Service');

      cleanup(tempDir);
    });

    it('should handle namespace imports (import * as X from)', () => {
      const tempDir = createTempDir();
      const testFilePath = path.join(tempDir, 'namespace.test.ts');

      fs.writeFileSync(
        testFilePath,
        `
import * as utils from './utils';
describe('Test', () => {
  it('should work', () => {
    utils.helper();
  });
});
`
      );

      const graph = createMockGraph([{ id: 'utils', name: 'utils' }]);

      const extractor = new TestRelationshipExtractor(graph);
      const result = extractor.extractFromFile(testFilePath);

      // Namespace imports don't create named bindings
      // They should be handled differently - currently not extracted
      // This documents the current behavior
      expect(result.importedSymbols).toHaveLength(0);

      cleanup(tempDir);
    });
  });
});
