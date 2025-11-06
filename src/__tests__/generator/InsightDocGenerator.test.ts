/**
 * InsightDocGenerator tests
 * @public
 */

import { InsightDocGenerator } from '../../generator/InsightDocGenerator';
import { SymbolGraphBuilder } from '../../graph/SymbolGraphBuilder';
import type { Symbol } from '../../types/graph';

describe('InsightDocGenerator', () => {
  let generator: InsightDocGenerator;
  let mockGraphBuilder: jest.Mocked<SymbolGraphBuilder>;

  const createMockSymbol = (overrides?: Partial<Symbol>): Symbol => ({
    id: 'test-id',
    name: 'TestSymbol',
    type: 'function',
    filePath: '/src/test.ts',
    line: 1,
    column: 0,
    isPublic: true,
    isExported: true,
    // summary omitted (undefined),
    // responsibility omitted (undefined),
    // contract omitted (undefined),
    tests: [],
    designDecisions: [],
    ...overrides,
  });

  beforeEach(() => {
    mockGraphBuilder = {
      getDependencies: jest.fn().mockReturnValue([]),
      getDependents: jest.fn().mockReturnValue([]),
    } as any;

    generator = new InsightDocGenerator(mockGraphBuilder);
  });

  describe('constructor', () => {
    it('should create generator with graph builder', () => {
      expect(generator).toBeInstanceOf(InsightDocGenerator);
    });
  });

  describe('generate', () => {
    it('should generate markdown with default title', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [createMockSymbol({ name: 'Entry' })]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('# TSDoc Edge - Code Insights');
    });

    it('should use custom title when provided', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      const result = generator.generate(symbolsByDepth, {
        title: 'Custom Title',
      });

      expect(result).toContain('# Custom Title');
    });

    it('should include entry description when provided', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      const result = generator.generate(symbolsByDepth, {
        entryDescription: 'This is a test description',
      });

      expect(result).toContain('> This is a test description');
    });

    it('should include generated date', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('> Generated:');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should organize symbols by depth levels', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [createMockSymbol({ name: 'Level0' })]);
      symbolsByDepth.set(1, [createMockSymbol({ name: 'Level1' })]);
      symbolsByDepth.set(2, [createMockSymbol({ name: 'Level2' })]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('## Level 0: Entry Points');
      expect(result).toContain('## Level 1: Direct Dependencies');
      expect(result).toContain('## Level 2: Indirect Dependencies');
    });

    it('should group symbols by type within depth', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Func1', type: 'function' }),
        createMockSymbol({ name: 'Class1', type: 'class' }),
        createMockSymbol({ name: 'Func2', type: 'function' }),
      ]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('### Function (2)');
      expect(result).toContain('### Class (1)');
    });

    it('should render symbol information', () => {
      const symbol = createMockSymbol({
        name: 'TestSymbol',
        type: 'class',
        filePath: '/src/test.ts',
        line: 10,
        summary: 'Test summary',
      });

      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('**TestSymbol**');
      expect(result).toContain('**Location:** `/src/test.ts:10`');
      expect(result).toContain('**Summary:** Test summary');
    });

    it('should include type badges when enabled', () => {
      const symbol = createMockSymbol({ name: 'Test', type: 'function' });
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth, {
        includeTypeBadges: true,
      });

      expect(result).toContain('`function`');
    });

    it('should include dependency counts when enabled', () => {
      const symbol = createMockSymbol({ name: 'Test', id: 'test-id' });
      mockGraphBuilder.getDependencies.mockReturnValue([
        'dep1',
        'dep2',
      ]);
      mockGraphBuilder.getDependents.mockReturnValue([
        'user1',
      ]);

      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth, {
        includeDependencyCounts: true,
      });

      expect(result).toContain('- Dependencies: 2 symbols');
      expect(result).toContain('- Used by: 1 symbols');
    });

    it('should skip empty depth levels', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [createMockSymbol({ name: 'Level0' })]);
      symbolsByDepth.set(1, []);
      symbolsByDepth.set(2, [createMockSymbol({ name: 'Level2' })]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('## Level 0:');
      expect(result).not.toContain('## Level 1:');
      expect(result).toContain('## Level 2:');
    });

    it('should render responsibility when present', () => {
      const symbol = createMockSymbol({
        name: 'Test',
        responsibility: {
          symbolName: 'Test',
          description: 'Manages user authentication',
          shouldDo: ['Authenticate users'],
          shouldNotDo: ['Store passwords'],
        },
      });

      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('- Manages user authentication');
    });

    it('should render contract when present', () => {
      const symbol = createMockSymbol({
        name: 'Test',
        contract: {
          symbolName: 'Test',
          description: 'Test contract',
          filePath: '/test.ts',
          preconditions: ['Input must be valid'],
          postconditions: ['Output is sanitized'],
          invariants: [],
        },
      });

      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('- Contract: Input must be valid');
    });

    it('should separate depth levels with horizontal rules', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [createMockSymbol({ name: 'L0' })]);
      symbolsByDepth.set(1, [createMockSymbol({ name: 'L1' })]);

      const result = generator.generate(symbolsByDepth);

      const hrCount = (result.match(/---/g) || []).length;
      expect(hrCount).toBeGreaterThan(0);
    });

    it('should handle very deep hierarchies', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      for (let i = 0; i < 10; i++) {
        symbolsByDepth.set(i, [createMockSymbol({ name: `Level${i}` })]);
      }

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('## Level 0:');
      expect(result).toContain('## Level 9:');
    });
  });

  describe('generate with groupByCategory', () => {
    it('should group symbols by category instead of depth', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Parser', filePath: '/src/parser/Parser.ts' }),
        createMockSymbol({ name: 'Validator', filePath: '/src/validator/Validator.ts' }),
        createMockSymbol({ name: 'Generator', filePath: '/src/generator/Generator.ts' }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('## 1. Core Workflow');
      expect(result).toContain('## 2. Validation');
      expect(result).toContain('## 3. Generators');
    });

    it('should use custom title for category view', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [createMockSymbol()]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
        title: 'My Features',
      });

      expect(result).toContain('# My Features');
    });

    it('should categorize analyzer symbols', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Analyzer', filePath: '/src/analyzer/CodeAnalyzer.ts' }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('Analysis');
    });

    it('should categorize graph symbols', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Graph', filePath: '/src/graph/SymbolGraph.ts' }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('Symbol Graph');
    });

    it('should categorize validator symbols', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Validator', filePath: '/src/validator/Validator.ts' }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('Validation');
    });

    it('should categorize fixer symbols', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Fixer', filePath: '/src/fixer/DocFixer.ts' }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('Fixers');
    });

    it('should categorize generator symbols', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Generator', filePath: '/src/generator/MarkdownGenerator.ts' }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('Generators');
    });

    it('should categorize storage symbols', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Storage', filePath: '/src/storage/Database.ts' }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('Storage');
    });

    it('should categorize config symbols', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Config', filePath: '/src/config/ConfigManager.ts' }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('Configuration');
    });

    it('should categorize unknown symbols as Utilities', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Helper', filePath: '/src/utils/helper.ts' }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('Utilities');
    });

    it('should show symbol summary in category view', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({
          name: 'Parser',
          filePath: '/src/parser/Parser.ts',
          summary: 'Parses TSDoc comments',
        }),
      ]);

      const result = generator.generate(symbolsByDepth, {
        groupByCategory: true,
      });

      expect(result).toContain('Parses TSDoc comments');
    });
  });

  describe('edge cases', () => {
    it('should handle empty symbol map', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('# TSDoc Edge - Code Insights');
    });

    it('should handle symbols with no summary', () => {
      const symbol = createMockSymbol({ summary: undefined });
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth);

      expect(result).not.toContain('**Summary:**');
    });

    it('should handle symbols with no responsibility', () => {
      const symbol = createMockSymbol({ responsibility: undefined });
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('TestSymbol');
    });

    it('should handle symbols with no contract', () => {
      const symbol = createMockSymbol({ contract: undefined });
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('TestSymbol');
    });

    it('should handle symbols with zero dependencies', () => {
      const symbol = createMockSymbol({ id: 'test' });
      mockGraphBuilder.getDependencies.mockReturnValue([]);
      mockGraphBuilder.getDependents.mockReturnValue([]);

      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth, {
        includeDependencyCounts: true,
      });

      expect(result).toContain('TestSymbol');
    });

    it('should handle very long file paths', () => {
      const symbol = createMockSymbol({
        filePath: '/very/long/path/to/some/deeply/nested/file/in/src/component.ts',
      });
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('/very/long/path');
    });

    it('should handle symbols with special characters in names', () => {
      const symbol = createMockSymbol({ name: '$_special_Name123' });
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [symbol]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('$_special_Name123');
    });

    it('should handle multiple symbols with same type', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(0, [
        createMockSymbol({ name: 'Func1', type: 'function' }),
        createMockSymbol({ name: 'Func2', type: 'function' }),
        createMockSymbol({ name: 'Func3', type: 'function' }),
      ]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('### Function (3)');
    });

    it('should handle symbols at very high depth levels', () => {
      const symbolsByDepth = new Map<number, Symbol[]>();
      symbolsByDepth.set(99, [createMockSymbol({ name: 'DeepSymbol' })]);

      const result = generator.generate(symbolsByDepth);

      expect(result).toContain('## Level 99:');
    });
  });
});
