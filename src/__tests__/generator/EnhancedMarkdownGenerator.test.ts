/**
 * EnhancedMarkdownGenerator tests
 * @public
 */

import { EnhancedMarkdownGenerator } from '../../generator/EnhancedMarkdownGenerator';
import type { Symbol } from '../../types/graph';
import type { EnhancedSymbolDoc } from '../../types/tags';

describe('EnhancedMarkdownGenerator', () => {
  let generator: EnhancedMarkdownGenerator;

  beforeEach(() => {
    generator = new EnhancedMarkdownGenerator();
  });

  describe('generateDocument', () => {
    it('should generate complete markdown document with all sections', () => {
      const mockSymbol: Symbol = {
        id: 'test-1',
        name: 'TestClass',
        type: 'class',
        filePath: '/src/test.ts',
        line: 10,
        isPublic: true,
        isExported: true,
        summary: 'A test class',
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'test-1',
        problemSolving: {
          description: 'Solves test problems',
          context: 'Testing context',
        },
        functionality: {
          mainFeatures: ['Feature 1', 'Feature 2'],
          components: [
            {
              name: 'testMethod',
              description: 'A test method',
            },
          ],
        },
        dependencies: [],
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-02',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('# TestClass');
      expect(result).toContain('**Type**: `class`');
      expect(result).toContain('**Location**: `/src/test.ts:10`');
      expect(result).toContain('Public API');
      expect(result).toContain('🎯 Problem Solving');
      expect(result).toContain('⚙️ Functionality');
      expect(result).toContain('🔗 Dependencies');
      expect(result).toContain('📊 Metadata');
      expect(result).toContain('Feature 1');
      expect(result).toContain('Feature 2');
    });

    it('should handle symbols with summary in header', () => {
      const mockSymbol: Symbol = {
        id: 'test-2',
        name: 'TestFunc',
        type: 'function',
        filePath: '/src/func.ts',
        line: 5,
        isPublic: true,
        isExported: true,
        summary: 'This is a summary',
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'test-2',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('> This is a summary');
    });

    it('should render internal symbols correctly', () => {
      const mockSymbol: Symbol = {
        id: 'internal-1',
        name: 'InternalFunc',
        type: 'function',
        filePath: '/src/internal.ts',
        line: 1,
        isPublic: false,
        isExported: false,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'internal-1',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('**Visibility**: Internal');
      expect(result).toContain('**Exported**: No');
    });

    it('should include error experiences section when present', () => {
      const mockSymbol: Symbol = {
        id: 'error-test',
        name: 'ErrorTest',
        type: 'function',
        filePath: '/src/error.ts',
        line: 5,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'error-test',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [
          {
            id: 'ERR-001',
            errorType: 'TypeError',
            message: 'Null reference error',
            context: 'When input is null',
            solution: 'Add null check',
          },
        ],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🐛 Error Experiences');
      expect(result).toContain('TypeError');
      expect(result).toContain('Null reference error');
      expect(result).toContain('Add null check');
    });

    it('should render error experiences with optional fields', () => {
      const mockSymbol: Symbol = {
        id: 'error-full',
        name: 'ErrorFull',
        type: 'function',
        filePath: '/src/error.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'error-full',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [
          {
            id: 'ERR-002',
            errorType: 'Error',
            message: 'Error message',
            context: 'Error context',
            solution: 'Solution here',
            prevention: 'Prevention strategy here',
            occurredAt: '2025-01-01T10:00:00Z',
          },
        ],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('**Prevention**');
      expect(result).toContain('Prevention strategy here');
      expect(result).toContain('*Occurred: 2025-01-01T10:00:00Z*');
    });

    it('should include design decisions section when present', () => {
      const mockSymbol: Symbol = {
        id: 'decision-test',
        name: 'DecisionTest',
        type: 'class',
        filePath: '/src/decision.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'decision-test',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [
          {
            id: 'ADR-001',
            title: 'Use TypeScript',
            status: 'accepted',
            date: '2025-01-01',
            decision: 'We will use TypeScript',
            rationale: 'Type safety and better tooling',
            alternatives: [],
            consequences: [],
          },
        ],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🔍 Design Decisions');
      expect(result).toContain('ADR-001');
      expect(result).toContain('Use TypeScript');
      expect(result).toContain('🟢 Accepted');
    });

    it('should render decisions with alternatives and consequences', () => {
      const mockSymbol: Symbol = {
        id: 'decision-full',
        name: 'DecisionFull',
        type: 'function',
        filePath: '/src/decision.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'decision-full',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [
          {
            id: 'ADR-002',
            title: 'Architecture Decision',
            status: 'proposed',
            date: '2025-01-15',
            decision: 'Use microservices',
            rationale: 'Better scalability',
            alternatives: [
              {
                option: 'Monolithic architecture',
                reason: 'Simpler deployment but less scalable',
              },
              {
                option: 'Serverless',
                reason: 'Cost-effective but vendor lock-in',
              },
            ],
            consequences: ['Higher operational complexity', 'Better fault isolation'],
            supersededBy: 'ADR-003',
          },
        ],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('Alternatives Considered');
      expect(result).toContain('Monolithic architecture');
      expect(result).toContain('Consequences');
      expect(result).toContain('Higher operational complexity');
      expect(result).toContain('*Superseded by: ADR-003*');
    });

    it('should include future plans section when present', () => {
      const mockSymbol: Symbol = {
        id: 'plan-test',
        name: 'PlanTest',
        type: 'interface',
        filePath: '/src/plan.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'plan-test',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [
          {
            id: 'PLAN-001',
            title: 'Add caching',
            description: 'Implement caching layer for better performance',
            status: 'planned',
            createdAt: '2025-01-01',
          },
        ],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🚀 Future Plans');
      expect(result).toContain('PLAN-001');
      expect(result).toContain('Add caching');
      expect(result).toContain('📋 Planned');
    });

    it('should render future plans with all optional fields', () => {
      const mockSymbol: Symbol = {
        id: 'plan-full',
        name: 'PlanFull',
        type: 'function',
        filePath: '/src/plan.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'plan-full',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [
          {
            id: 'PLAN-002',
            title: 'Performance optimization',
            description: 'Optimize database queries',
            status: 'in-progress',
            createdAt: '2025-01-01',
            priority: 'high',
            targetMilestone: 'v2.0',
            estimatedEffort: '2 weeks',
            blockedBy: ['PLAN-001'],
            relatedIssues: ['#123', '#456'],
          },
        ],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🏗️ In-progress');
      expect(result).toContain('**Priority**: 🔴 High');
      expect(result).toContain('**Target**: v2.0');
      expect(result).toContain('**Effort**: 2 weeks');
      expect(result).toContain('**Blocked by**: PLAN-001');
      expect(result).toContain('**Related**: #123, #456');
    });

    it('should handle dependencies correctly', () => {
      const mockSymbol: Symbol = {
        id: 'deps-test',
        name: 'DepsTest',
        type: 'function',
        filePath: '/src/deps.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'deps-test',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [
          {
            type: 'symbol',
            target: 'UtilityClass',
            reason: 'For utility functions',
            importPath: './utils',
          },
          {
            type: 'external',
            target: 'lodash',
            reason: 'For array operations',
            version: '^4.17.0',
          },
        ],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🔗 Dependencies');
      expect(result).toContain('Symbol Dependencies');
      expect(result).toContain('External Dependencies');
      expect(result).toContain('UtilityClass');
      expect(result).toContain('lodash');
    });

    it('should show no dependencies message when array is empty', () => {
      const mockSymbol: Symbol = {
        id: 'no-deps',
        name: 'NoDeps',
        type: 'function',
        filePath: '/src/nodeps.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'no-deps',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('*No dependencies*');
    });

    it('should render problem solving with all optional fields', () => {
      const mockSymbol: Symbol = {
        id: 'prob-full',
        name: 'ProblemFull',
        type: 'function',
        filePath: '/src/problem.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'prob-full',
        problemSolving: {
          description: 'Manages user authentication',
          context: 'Web application security',
          targetUseCase: 'Multi-tenant SaaS platform',
          relatedProblem: 'Session management and token refresh',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('### Target Use Case');
      expect(result).toContain('Multi-tenant SaaS platform');
      expect(result).toContain('### Related Problem');
      expect(result).toContain('Session management and token refresh');
    });

    it('should render functionality with IO section', () => {
      const mockSymbol: Symbol = {
        id: 'func-io',
        name: 'FuncIO',
        type: 'function',
        filePath: '/src/func.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'func-io',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
          io: {
            inputs: [
              {
                name: 'userId',
                type: 'string',
                description: 'User identifier',
              },
              {
                name: 'options',
                type: 'object',
                description: 'Configuration options',
              },
            ],
            outputs: [
              {
                name: 'result',
                type: 'Promise<User>',
                description: 'User object',
              },
            ],
          },
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('### Input/Output');
      expect(result).toContain('**Inputs**');
      expect(result).toContain('userId');
      expect(result).toContain('**Outputs**');
      expect(result).toContain('Promise<User>');
    });

    it('should render functionality with examples', () => {
      const mockSymbol: Symbol = {
        id: 'func-examples',
        name: 'FuncExamples',
        type: 'function',
        filePath: '/src/func.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'func-examples',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
          examples: [
            'const user = await getUser("123");',
            'const users = await getUsers({ limit: 10 });',
          ],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('### Usage Examples');
      expect(result).toContain('#### Example 1');
      expect(result).toContain('#### Example 2');
      expect(result).toContain('const user = await getUser("123");');
    });

    it('should render components with signatures', () => {
      const mockSymbol: Symbol = {
        id: 'comp-sig',
        name: 'CompSig',
        type: 'class',
        filePath: '/src/comp.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'comp-sig',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [
            {
              name: 'processData',
              description: 'Processes input data',
              signature: '(data: string) => Promise<Result>',
            },
          ],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('**Signature**: `(data: string) => Promise<Result>`');
    });

    it('should group dependencies by type', () => {
      const mockSymbol: Symbol = {
        id: 'deps-grouped',
        name: 'DepsGrouped',
        type: 'class',
        filePath: '/src/deps.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'deps-grouped',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [
          {
            type: 'symbol',
            target: 'Symbol1',
            reason: 'Reason 1',
          },
          {
            type: 'symbol',
            target: 'Symbol2',
            reason: 'Reason 2',
          },
          {
            type: 'external',
            target: 'Package1',
            reason: 'Reason 3',
          },
        ],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('### Symbol Dependencies');
      expect(result).toContain('### External Dependencies');
      expect(result).toContain('Symbol1');
      expect(result).toContain('Symbol2');
      expect(result).toContain('Package1');
    });

    it('should render optional dependency flag', () => {
      const mockSymbol: Symbol = {
        id: 'opt-dep',
        name: 'OptDep',
        type: 'function',
        filePath: '/src/opt.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'opt-dep',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [
          {
            type: 'external',
            target: 'optional-package',
            reason: 'Optional feature',
            version: '1.0.0',
            importPath: 'optional-package',
            isOptional: true,
          },
        ],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('*Optional dependency*');
    });

    it('should group future plans by status', () => {
      const mockSymbol: Symbol = {
        id: 'plans-grouped',
        name: 'PlansGrouped',
        type: 'class',
        filePath: '/src/plans.ts',
        line: 1,
        isPublic: true,
        isExported: true,
        // summary omitted (undefined),
        // responsibility omitted (undefined),
        // contract omitted (undefined),
        tests: [],
        designDecisions: [],
      };

      const mockDoc: EnhancedSymbolDoc = {
        symbolId: 'plans-grouped',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Test'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [
          {
            id: 'P1',
            title: 'Plan 1',
            description: 'Description 1',
            status: 'planned',
            createdAt: '2025-01-01',
          },
          {
            id: 'P2',
            title: 'Plan 2',
            description: 'Description 2',
            status: 'in-progress',
            createdAt: '2025-01-01',
          },
          {
            id: 'P3',
            title: 'Plan 3',
            description: 'Description 3',
            status: 'completed',
            createdAt: '2025-01-01',
            completedAt: '2025-01-15',
          },
        ],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      };

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('### 🏗️ In-progress');
      expect(result).toContain('### 📋 Planned');
      expect(result).toContain('### ✅ Completed');
      expect(result).toContain('*Completed: 2025-01-15*');
    });
  });
});
