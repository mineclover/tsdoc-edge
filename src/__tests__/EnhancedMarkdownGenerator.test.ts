/**
 * EnhancedMarkdownGenerator tests
 * @public
 */

import { EnhancedMarkdownGenerator } from '../generator/EnhancedMarkdownGenerator';
import type { EnhancedSymbolDoc } from '../types/enhanced-tags';
import type { Symbol } from '../types/graph';

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
  });
});
