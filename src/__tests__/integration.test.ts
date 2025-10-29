/**
 * Integration tests for TSDoc Edge
 * @testScenario End-to-end workflow testing
 */

import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from '../graph/SymbolSearchEngine';
import type { Symbol } from '../types/graph';
import type { ContractSpec, ResponsibilitySpec } from '../types/tags';
import { ConnectivityValidator } from '../validator/ConnectivityValidator';

describe('TSDoc Edge Integration', () => {
  describe('Complete Workflow: Build -> Search -> Validate', () => {
    it('should handle a complete documentation workflow', () => {
      // Step 1: Build symbol graph
      const builder = new SymbolGraphBuilder();

      const contract: ContractSpec = {
        symbolName: 'Calculator',
        description: 'Perform calculations',
        preconditions: ['inputs must be numbers'],
        postconditions: ['result is a number'],
        invariants: ['precision maintained'],
        filePath: '/app/calculator.ts',
      };

      const responsibility: ResponsibilitySpec = {
        symbolName: 'Calculator',
        description: 'Mathematical operations',
        shouldDo: ['add numbers', 'subtract numbers', 'validate inputs'],
        shouldNotDo: ['make API calls', 'store state'],
        pattern: 'Utility',
        architecture: 'Domain Layer',
      };

      const symbols: Symbol[] = [
        {
          id: 'calc',
          name: 'Calculator',
          type: 'class',
          filePath: '/app/calculator.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'A calculator class for basic math operations',
          contract,
          responsibility,
          tests: [
            {
              symbolName: 'Calculator',
              testFilePath: '/app/calculator.test.ts',
              testName: 'Calculator tests',
              scenarios: ['addition', 'subtraction', 'edge cases'],
            },
          ],
          designDecisions: ['ADR-001'],
        },
        {
          id: 'add',
          name: 'add',
          type: 'method',
          filePath: '/app/calculator.ts',
          line: 10,
          column: 2,
          isExported: false,
          isPublic: true,
          summary: 'Add two numbers',
          contract: {
            symbolName: 'add',
            description: 'Addition operation',
            preconditions: ['a is number', 'b is number'],
            postconditions: ['result = a + b'],
            invariants: [],
            filePath: '/app/calculator.ts',
          },
          tests: [
            {
              symbolName: 'add',
              testFilePath: '/app/calculator.test.ts',
              testName: 'add method tests',
              scenarios: ['positive numbers', 'negative numbers', 'zero'],
            },
          ],
          designDecisions: [],
        },
        {
          id: 'validator',
          name: 'InputValidator',
          type: 'class',
          filePath: '/app/validator.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Validates calculator inputs',
          responsibility: {
            symbolName: 'InputValidator',
            description: 'Input validation',
            shouldDo: ['validate number inputs', 'throw errors on invalid input'],
            shouldNotDo: ['perform calculations'],
          },
          tests: [
            {
              symbolName: 'InputValidator',
              testFilePath: '/app/validator.test.ts',
              testName: 'validator tests',
              scenarios: ['valid input', 'invalid input'],
            },
          ],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      // Define relationships
      builder.addRelationship({
        type: 'dependsOn',
        from: 'calc',
        to: 'validator',
        description: 'Calculator uses validator for input validation',
        filePath: '/app/calculator.ts',
      });

      builder.addRelationship({
        type: 'implements',
        from: 'add',
        to: 'calc',
        description: 'add is a method of Calculator',
        filePath: '/app/calculator.ts',
      });

      // Step 2: Search for symbols
      const searchEngine = new SymbolSearchEngine(builder);

      const publicAPIs = searchEngine.search({ isPublic: true });
      expect(publicAPIs.symbols.length).toBeGreaterThan(0);

      const testedSymbols = searchEngine.search({ hasTesting: true });
      expect(testedSymbols.symbols).toHaveLength(3);

      const calculatorSymbols = searchEngine.search({ name: 'Calculator' });
      expect(calculatorSymbols.symbols.length).toBeGreaterThan(0);

      // Step 3: Validate connectivity
      const validator = new ConnectivityValidator(builder);
      const analysis = validator.analyze();

      expect(analysis.connectivityScore).toBeGreaterThan(80);
      expect(analysis.undocumented).toHaveLength(0);
      expect(analysis.untested).toHaveLength(0);
      expect(analysis.circularDependencies).toHaveLength(0);

      // Step 4: Generate report
      const report = validator.generateReport();
      expect(report).toContain('Connectivity Analysis Report');
      expect(report).toContain('Overall Score');

      // Step 5: Get statistics
      const stats = builder.getStatistics();
      expect(stats.totalSymbols).toBe(3);
      expect(stats.totalRelationships).toBe(2);
    });
  });

  describe('SSOT Compliance Scenarios', () => {
    it('should enforce SSOT for well-connected codebase', () => {
      const builder = new SymbolGraphBuilder();

      // Create a fully connected, documented codebase
      const symbols: Symbol[] = [
        {
          id: 'service',
          name: 'UserService',
          type: 'class',
          filePath: '/services/user.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'User management service',
          contract: {
            symbolName: 'UserService',
            description: 'Manage users',
            preconditions: [],
            postconditions: [],
            invariants: [],
            filePath: '/services/user.ts',
          },
          responsibility: {
            symbolName: 'UserService',
            description: 'User CRUD operations',
            shouldDo: ['create users', 'read users', 'update users', 'delete users'],
            shouldNotDo: ['handle authentication', 'send emails'],
          },
          tests: [
            {
              symbolName: 'UserService',
              testFilePath: '/services/user.test.ts',
              testName: 'UserService tests',
              scenarios: ['create', 'read', 'update', 'delete'],
            },
          ],
          designDecisions: [],
        },
        {
          id: 'repo',
          name: 'UserRepository',
          type: 'class',
          filePath: '/repositories/user.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'User data access layer',
          contract: {
            symbolName: 'UserRepository',
            description: 'Data access',
            preconditions: [],
            postconditions: [],
            invariants: [],
            filePath: '/repositories/user.ts',
          },
          responsibility: {
            symbolName: 'UserRepository',
            description: 'Database operations',
            shouldDo: ['query database', 'persist data'],
            shouldNotDo: ['business logic', 'validation'],
            architecture: 'Data Layer',
          },
          tests: [
            {
              symbolName: 'UserRepository',
              testFilePath: '/repositories/user.test.ts',
              testName: 'UserRepository tests',
              scenarios: ['save', 'find', 'delete'],
            },
          ],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      builder.addRelationship({
        type: 'dependsOn',
        from: 'service',
        to: 'repo',
        description: 'Service uses repository',
        filePath: '/services/user.ts',
      });

      const validator = new ConnectivityValidator(builder);
      const analysis = validator.analyze();

      // Perfect SSOT compliance
      expect(analysis.connectivityScore).toBe(100);
      expect(analysis.undocumented).toHaveLength(0);
      expect(analysis.untested).toHaveLength(0);
      expect(analysis.noContract).toHaveLength(0);
      expect(analysis.noResponsibility).toHaveLength(0);
      expect(analysis.brokenLinks).toHaveLength(0);
      expect(analysis.orphaned).toHaveLength(0);
    });

    it('should detect SSOT violations', () => {
      const builder = new SymbolGraphBuilder();

      // Create symbols with various violations
      const symbols: Symbol[] = [
        {
          id: 'bad1',
          name: 'UndocumentedFunction',
          type: 'function',
          filePath: '/bad/func.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'bad2',
          name: 'UntestedClass',
          type: 'class',
          filePath: '/bad/class.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Has summary but no tests',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'orphan',
          name: 'OrphanedUtil',
          type: 'function',
          filePath: '/bad/orphan.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      // Add broken link
      builder.addRelationship({
        type: 'dependsOn',
        from: 'bad1',
        to: 'nonexistent',
        filePath: '/bad/func.ts',
      });

      const validator = new ConnectivityValidator(builder);
      const analysis = validator.analyze();

      // Should have low score due to violations
      expect(analysis.connectivityScore).toBeLessThan(50);
      expect(analysis.undocumented.length).toBeGreaterThan(0);
      expect(analysis.untested.length).toBeGreaterThan(0);
      expect(analysis.brokenLinks.length).toBeGreaterThan(0);
      expect(analysis.orphaned.length).toBeGreaterThan(0);
    });
  });

  describe('Symbol Relationship Tracing', () => {
    it('should trace dependencies across multiple layers', () => {
      const builder = new SymbolGraphBuilder();

      // Create a layered architecture
      const symbols: Symbol[] = [
        {
          id: 'controller',
          name: 'UserController',
          type: 'class',
          filePath: '/api/controller.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'API controller',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'service',
          name: 'UserService',
          type: 'class',
          filePath: '/services/user.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Business logic',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'repo',
          name: 'UserRepository',
          type: 'class',
          filePath: '/data/repo.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Data access',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'model',
          name: 'User',
          type: 'interface',
          filePath: '/models/user.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'User model',
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      // Build dependency chain
      builder.addRelationship({
        type: 'dependsOn',
        from: 'controller',
        to: 'service',
        filePath: '/api/controller.ts',
      });

      builder.addRelationship({
        type: 'dependsOn',
        from: 'service',
        to: 'repo',
        filePath: '/services/user.ts',
      });

      builder.addRelationship({
        type: 'dependsOn',
        from: 'repo',
        to: 'model',
        filePath: '/data/repo.ts',
      });

      // Verify we can trace dependencies
      const deps = builder.getDependencies('controller');
      expect(deps).toContain('service');

      const serviceDeps = builder.getDependencies('service');
      expect(serviceDeps).toContain('repo');

      // Verify reverse dependencies
      const modelDependents = builder.getDependents('model');
      expect(modelDependents).toContain('repo');
    });
  });
});
