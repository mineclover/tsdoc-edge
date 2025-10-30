/**
 * EnhancedMarkdownGenerator tests
 * @public
 */

import { EnhancedMarkdownGenerator } from '../generator/EnhancedMarkdownGenerator';
import type { Symbol } from '../types/graph';
import type { EnhancedSymbolDoc } from '../types/tags';

describe('EnhancedMarkdownGenerator', () => {
  let generator: EnhancedMarkdownGenerator;

  beforeEach(() => {
    generator = new EnhancedMarkdownGenerator();
  });

  describe('generateDocument', () => {
    it('should generate complete markdown document with all sections', () => {
      const mockSymbol = {
        id: 'test-1',
        name: 'TestClass',
        type: 'class',
        filePath: '/src/test.ts',
        line: 10,
        isPublic: true,
        isExported: true,
        summary: 'A test class',
      } as Symbol;

      const mockDoc = {
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
      } as EnhancedSymbolDoc;

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

    it('should include error experiences if present', () => {
      const mockSymbol = {
        id: 'test-2',
        name: 'ErrorTest',
        type: 'function',
        filePath: '/src/error.ts',
        line: 5,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-2',
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
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🐛 Error Experiences');
      expect(result).toContain('TypeError');
      expect(result).toContain('Null reference error');
      expect(result).toContain('Add null check');
    });

    it('should include decisions if present', () => {
      const mockSymbol = {
        id: 'test-3',
        name: 'DecisionTest',
        type: 'class',
        filePath: '/src/decision.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-3',
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
            rationale: 'Type safety',
            alternatives: [],
            consequences: [],
          },
        ],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🔍 Design Decisions');
      expect(result).toContain('ADR-001');
      expect(result).toContain('Use TypeScript');
      expect(result).toContain('Accepted');
    });

    it('should include future plans if present', () => {
      const mockSymbol = {
        id: 'test-4',
        name: 'PlanTest',
        type: 'interface',
        filePath: '/src/plan.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-4',
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
            description: 'Implement caching layer',
            status: 'planned',
            createdAt: '2025-01-01',
          },
        ],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🚀 Future Plans');
      expect(result).toContain('PLAN-001');
      expect(result).toContain('Add caching');
      expect(result).toContain('Planned');
    });

    it('should handle dependencies correctly', () => {
      const mockSymbol = {
        id: 'test-5',
        name: 'DependencyTest',
        type: 'function',
        filePath: '/src/deps.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-5',
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
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🔗 Dependencies');
      expect(result).toContain('Symbol');
      expect(result).toContain('External');
      expect(result).toContain('UtilityClass');
      expect(result).toContain('lodash');
    });

    it('should show "No dependencies" when dependencies array is empty', () => {
      const mockSymbol = {
        id: 'test-6',
        name: 'NoDeps',
        type: 'function',
        filePath: '/src/nodeps.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-6',
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
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('*No dependencies*');
    });

    it('should render optional fields in problem solving section', () => {
      const mockSymbol = {
        id: 'test-7',
        name: 'TestFunc',
        type: 'function',
        filePath: '/src/test.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-7',
        problemSolving: {
          description: 'Test description',
          context: 'Test context',
          targetUseCase: 'Target use case here',
          relatedProblem: 'Related problem here',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('Target Use Case');
      expect(result).toContain('Target use case here');
      expect(result).toContain('Related Problem');
      expect(result).toContain('Related problem here');
    });

    it('should render functionality with IO section', () => {
      const mockSymbol = {
        id: 'test-8',
        name: 'TestFunc',
        type: 'function',
        filePath: '/src/test.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-8',
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
                name: 'input1',
                type: 'string',
                description: 'Input description',
              },
            ],
            outputs: [
              {
                name: 'output1',
                type: 'number',
                description: 'Output description',
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
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('Input/Output');
      expect(result).toContain('**Inputs**');
      expect(result).toContain('input1');
      expect(result).toContain('**Outputs**');
      expect(result).toContain('output1');
    });

    it('should render functionality with examples', () => {
      const mockSymbol = {
        id: 'test-9',
        name: 'TestFunc',
        type: 'function',
        filePath: '/src/test.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-9',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
          examples: ['const x = test();', 'test(1, 2, 3);'],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('Usage Examples');
      expect(result).toContain('Example 1');
      expect(result).toContain('Example 2');
      expect(result).toContain('const x = test();');
    });

    it('should render error experiences with optional fields', () => {
      const mockSymbol = {
        id: 'test-10',
        name: 'TestFunc',
        type: 'function',
        filePath: '/src/test.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-10',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [
          {
            id: 'ERR-001',
            errorType: 'Error',
            message: 'Error message',
            context: 'Error context',
            solution: 'Solution here',
            prevention: 'Prevention here',
            occurredAt: '2025-01-01',
          },
        ],
        decisions: [],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('Prevention');
      expect(result).toContain('Prevention here');
      expect(result).toContain('Occurred: 2025-01-01');
    });

    it('should render decisions with alternatives and consequences', () => {
      const mockSymbol = {
        id: 'test-11',
        name: 'TestFunc',
        type: 'function',
        filePath: '/src/test.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-11',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [
          {
            id: 'ADR-001',
            title: 'Decision',
            status: 'accepted',
            date: '2025-01-01',
            decision: 'We decided',
            rationale: 'Because',
            alternatives: [
              {
                option: 'Option A',
                reason: 'Reason A',
              },
            ],
            consequences: ['Consequence 1', 'Consequence 2'],
            supersededBy: 'ADR-002',
          },
        ],
        futurePlans: [],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('Alternatives Considered');
      expect(result).toContain('Option A');
      expect(result).toContain('Consequences');
      expect(result).toContain('Consequence 1');
      expect(result).toContain('Superseded by: ADR-002');
    });

    it('should render future plans with all optional fields', () => {
      const mockSymbol = {
        id: 'test-12',
        name: 'TestFunc',
        type: 'function',
        filePath: '/src/test.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-12',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [
          {
            id: 'PLAN-001',
            title: 'Plan title',
            description: 'Plan description',
            status: 'in-progress',
            createdAt: '2025-01-01',
            priority: 'high',
            targetMilestone: 'v2.0',
            estimatedEffort: '2 weeks',
            blockedBy: ['PLAN-000'],
            relatedIssues: ['#123', '#456'],
          },
        ],
        dependencies: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('🚀 Future Plans');
      expect(result).toContain('Priority');
      expect(result).toContain('High');
      expect(result).toContain('Target');
      expect(result).toContain('v2.0');
      expect(result).toContain('Effort');
      expect(result).toContain('2 weeks');
      expect(result).toContain('Blocked by');
      expect(result).toContain('PLAN-000');
      expect(result).toContain('Related');
      expect(result).toContain('#123');
    });

    it('should render dependencies with optional fields', () => {
      const mockSymbol = {
        id: 'test-13',
        name: 'TestFunc',
        type: 'function',
        filePath: '/src/test.ts',
        line: 1,
        isPublic: true,
        isExported: true,
      } as Symbol;

      const mockDoc = {
        symbolId: 'test-13',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        dependencies: [
          {
            type: 'external',
            target: 'lodash',
            reason: 'Utility functions',
            version: '^4.17.0',
            importPath: 'lodash',
            isOptional: true,
          },
        ],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        version: '1.0.0',
      } as EnhancedSymbolDoc;

      const result = generator.generateDocument(mockSymbol, mockDoc);

      expect(result).toContain('**Version**: ^4.17.0');
      expect(result).toContain('**Import**: `lodash`');
      expect(result).toContain('*Optional dependency*');
    });
  });
});
