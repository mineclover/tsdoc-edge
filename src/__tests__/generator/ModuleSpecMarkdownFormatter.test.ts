/**
 * ModuleSpecMarkdownFormatter tests
 * @public
 */

import { ModuleSpecMarkdownFormatter } from '../../generator/ModuleSpecMarkdownFormatter';
import type { ModuleSpecTemplate } from '../../types/spec/module-spec';

describe('ModuleSpecMarkdownFormatter', () => {
  let formatter: ModuleSpecMarkdownFormatter;

  const createMockSpec = (overrides?: Partial<ModuleSpecTemplate>): ModuleSpecTemplate => ({
    symbolId: 'test-symbol',
    symbolName: 'TestSymbol',
    symbolKind: 'function',
    filePath: '/src/test.ts',
    purpose: {
      problem: 'Test problem',
      responsibility: 'Test responsibility',
      solution: 'Test solution',
    },
    input: {
      parameters: [],
      preconditions: [],
      constraints: [],
    },
    output: {
      returnType: { type: 'void' },
      postconditions: [],
      successCases: [],
      failureCases: [],
    },
    context: {
      dependencies: [],
      imports: [],
      environment: [],
      requirements: [],
    },
    logic: {
      features: [],
      algorithm: '',
      complexity: 'Simple',
      operations: [],
    },
    effect: {
      sideEffects: [],
      mutations: [],
      io: [],
      observable: [],
    },
    scope: {
      visibility: 'public',
      exposedAPI: [],
      accessLevel: 'public',
      isPublicAPI: true,
    },
    completionConfidence: 85,
    manualReviewNeeded: [],
    generatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    formatter = new ModuleSpecMarkdownFormatter();
  });

  describe('constructor', () => {
    it('should create formatter with default options', () => {
      const fmt = new ModuleSpecMarkdownFormatter();
      expect(fmt).toBeInstanceOf(ModuleSpecMarkdownFormatter);
    });

    it('should create formatter with custom options', () => {
      const fmt = new ModuleSpecMarkdownFormatter({
        includeMetadata: false,
        includeConfidence: false,
        includeTodos: false,
        includeToc: false,
      });
      expect(fmt).toBeInstanceOf(ModuleSpecMarkdownFormatter);
    });
  });

  describe('format', () => {
    it('should generate complete markdown document', () => {
      const spec = createMockSpec();
      const result = formatter.format(spec);

      expect(result).toContain('# Module Specification: TestSymbol');
      expect(result).toContain('## 1. Purpose');
      expect(result).toContain('## 2. Input');
      expect(result).toContain('## 3. Output');
      expect(result).toContain('## 4. Context');
      expect(result).toContain('## 5. Logic');
      expect(result).toContain('## 6. Effect');
      expect(result).toContain('## 7. Scope');
    });

    it('should include header with file path and symbol info', () => {
      const spec = createMockSpec();
      const result = formatter.format(spec);

      expect(result).toContain('**Kind:** function');
      expect(result).toContain('**File:** `/src/test.ts`');
      expect(result).toContain('**Symbol ID:** `test-symbol`');
    });

    it('should include metadata when enabled', () => {
      const spec = createMockSpec();
      const result = formatter.format(spec);

      expect(result).toContain('**Completion Confidence:** 85%');
    });

    it('should exclude metadata when disabled', () => {
      const spec = createMockSpec();
      const fmt = new ModuleSpecMarkdownFormatter({ includeMetadata: false, includeConfidence: false });
      const result = fmt.format(spec);

      expect(result).not.toContain('**Generated:**');
      expect(result).not.toContain('## Metadata');
    });

    it('should include table of contents when enabled', () => {
      const spec = createMockSpec();
      const result = formatter.format(spec);

      expect(result).toContain('## Table of Contents');
      expect(result).toContain('[Purpose](#1-purpose)');
      expect(result).toContain('[Input](#2-input)');
    });

    it('should exclude table of contents when disabled', () => {
      const spec = createMockSpec();
      const fmt = new ModuleSpecMarkdownFormatter({ includeToc: false });
      const result = fmt.format(spec);

      expect(result).not.toContain('## Table of Contents');
    });
  });

  describe('Purpose section formatting', () => {
    it('should render all purpose fields', () => {
      const spec = createMockSpec({
        purpose: {
          problem: 'Data validation is hard',
          responsibility: 'Validate user input',
          solution: 'Use schema-based validation',
          context: 'Web API security',
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('**Problem:**');
      expect(result).toContain('Data validation is hard');
      expect(result).toContain('**Responsibility:**');
      expect(result).toContain('Validate user input');
      expect(result).toContain('**Solution:**');
      expect(result).toContain('Use schema-based validation');
      expect(result).toContain('**Context:**');
      expect(result).toContain('Web API security');
    });

    it('should show TODO when problem is missing', () => {
      const spec = createMockSpec({
        purpose: {
          problem: '',
          responsibility: 'Test',
          solution: 'Test',
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('TODO: Describe the problem');
    });

    it('should not show TODO when includeTodos is false', () => {
      const spec = createMockSpec({
        purpose: {
          problem: '',
          responsibility: 'Test',
          solution: 'Test',
        },
      });
      const fmt = new ModuleSpecMarkdownFormatter({ includeTodos: false });
      const result = fmt.format(spec);

      expect(result).not.toContain('TODO');
    });
  });

  describe('Input section formatting', () => {
    it('should render parameter table', () => {
      const spec = createMockSpec({
        input: {
          parameters: [
            {
              name: 'userId',
              type: 'string',
              description: 'User identifier',
              optional: false,
            },
            {
              name: 'options',
              type: 'object',
              description: 'Config options',
              optional: true,
              defaultValue: '{}',
            },
          ],
          preconditions: [],
          constraints: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('| Name | Type | Optional | Default | Description |');
      expect(result).toContain('| `userId` | `string` | No |');
      expect(result).toContain('| `options` | `object` | Yes | `{}` |');
    });

    it('should show "No parameters" when empty', () => {
      const spec = createMockSpec({
        input: {
          parameters: [],
          preconditions: [],
          constraints: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('*No parameters*');
    });

    it('should render type signature', () => {
      const spec = createMockSpec({
        input: {
          parameters: [],
          preconditions: [],
          constraints: [],
          typeSignature: '(x: number, y: number) => number',
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Type Signature');
      expect(result).toContain('(x: number, y: number) => number');
    });

    it('should render preconditions', () => {
      const spec = createMockSpec({
        input: {
          parameters: [],
          preconditions: ['User must be authenticated', 'Database must be connected'],
          constraints: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Preconditions');
      expect(result).toContain('- User must be authenticated');
      expect(result).toContain('- Database must be connected');
    });

    it('should render constraints', () => {
      const spec = createMockSpec({
        input: {
          parameters: [],
          preconditions: [],
          constraints: ['x > 0', 'y < 100'],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Constraints');
      expect(result).toContain('- x > 0');
      expect(result).toContain('- y < 100');
    });
  });

  describe('Output section formatting', () => {
    it('should render return type with description', () => {
      const spec = createMockSpec({
        output: {
          returnType: {
            type: 'Promise<User>',
            description: 'Resolves with user object',
          },
          postconditions: [],
          successCases: [],
          failureCases: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('**Type:** `Promise<User>`');
      expect(result).toContain('**Description:** Resolves with user object');
    });

    it('should render failure cases table', () => {
      const spec = createMockSpec({
        output: {
          returnType: { type: 'void' },
          postconditions: [],
          successCases: [],
          failureCases: [
            {
              condition: 'Invalid input',
              errorType: 'ValidationError',
              description: 'Throws when input is invalid',
            },
            {
              condition: 'Not found',
              errorType: 'NotFoundError',
              description: 'Throws when resource not found',
            },
          ],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Failure Cases');
      expect(result).toContain('| Condition | Error Type | Description |');
      expect(result).toContain('| Invalid input | `ValidationError` |');
    });

    it('should render success cases', () => {
      const spec = createMockSpec({
        output: {
          returnType: { type: 'boolean' },
          postconditions: [],
          successCases: ['Returns true on valid input', 'Returns false otherwise'],
          failureCases: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Success Cases');
      expect(result).toContain('- Returns true on valid input');
    });

    it('should render postconditions', () => {
      const spec = createMockSpec({
        output: {
          returnType: { type: 'void' },
          postconditions: ['Database is updated', 'Event is emitted'],
          successCases: [],
          failureCases: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Postconditions');
      expect(result).toContain('- Database is updated');
    });
  });

  describe('Context section formatting', () => {
    it('should render dependencies table', () => {
      const spec = createMockSpec({
        context: {
          dependencies: [
            {
              name: 'UserService',
              type: 'module',
              purpose: 'Manage users',
              critical: true,
            },
            {
              name: 'lodash',
              type: 'external',
              purpose: 'Utility functions',
              critical: false,
            },
          ],
          imports: [],
          environment: [],
          requirements: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Dependencies');
      expect(result).toContain('| Name | Type | Purpose | Critical |');
      expect(result).toContain('| `UserService` | module | Manage users | Yes |');
      expect(result).toContain('| `lodash` | external | Utility functions | No |');
    });

    it('should render imports', () => {
      const spec = createMockSpec({
        context: {
          dependencies: [],
          imports: [
            {
              source: './utils',
              symbols: ['parse', 'format'],
              isExternal: false,
            },
            {
              source: 'express',
              symbols: ['Request', 'Response'],
              isExternal: true,
            },
          ],
          environment: [],
          requirements: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Imports');
      expect(result).toContain('- **From** `./utils`');
      expect(result).toContain('parse, format');
      expect(result).toContain('- **From** `express` (external)');
    });

    it('should render environment requirements', () => {
      const spec = createMockSpec({
        context: {
          dependencies: [],
          imports: [],
          environment: ['Node.js >= 16', 'Environment variables required'],
          requirements: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Environment Requirements');
      expect(result).toContain('- Node.js >= 16');
    });
  });

  describe('Logic section formatting', () => {
    it('should render main features', () => {
      const spec = createMockSpec({
        logic: {
          features: ['Parse input', 'Validate schema', 'Transform output'],
          algorithm: '',
          complexity: 'Simple',
          operations: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Main Features');
      expect(result).toContain('- Parse input');
      expect(result).toContain('- Validate schema');
    });

    it('should render algorithm description', () => {
      const spec = createMockSpec({
        logic: {
          features: [],
          algorithm: 'Uses binary search to find element in sorted array',
          complexity: 'O(log n)',
          operations: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Algorithm');
      expect(result).toContain('Uses binary search');
    });

    it('should render TODO for missing algorithm', () => {
      const spec = createMockSpec({
        logic: {
          features: [],
          algorithm: '',
          complexity: 'Simple',
          operations: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('TODO: Describe the algorithm');
    });

    it('should render complexity', () => {
      const spec = createMockSpec({
        logic: {
          features: [],
          algorithm: 'Test',
          complexity: 'O(n^2)',
          operations: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('**Complexity:** O(n^2)');
    });
  });

  describe('Effect section formatting', () => {
    it('should render side effects table', () => {
      const spec = createMockSpec({
        effect: {
          sideEffects: [
            {
              type: 'filesystem',
              description: 'Writes to log file',
              operation: 'write',
            },
            {
              type: 'database',
              description: 'Updates user table',
            },
          ],
          mutations: [],
          io: [],
          observable: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Side Effects');
      expect(result).toContain('| Type | Description | Operation |');
      expect(result).toContain('| filesystem | Writes to log file | write |');
    });

    it('should show "No side effects" when empty', () => {
      const spec = createMockSpec({
        effect: {
          sideEffects: [],
          mutations: [],
          io: [],
          observable: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('*No side effects detected*');
    });

    it('should render mutations', () => {
      const spec = createMockSpec({
        effect: {
          sideEffects: [],
          mutations: ['Modifies instance state', 'Updates cache'],
          io: [],
          observable: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Context Mutations');
      expect(result).toContain('- Modifies instance state');
    });

    it('should render IO operations', () => {
      const spec = createMockSpec({
        effect: {
          sideEffects: [],
          mutations: [],
          io: ['File read', 'Network request'],
          observable: [],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### External I/O');
      expect(result).toContain('- File read');
    });

    it('should render observable effects', () => {
      const spec = createMockSpec({
        effect: {
          sideEffects: [],
          mutations: [],
          io: [],
          observable: ['Console output', 'Event emission'],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Observable Effects');
      expect(result).toContain('- Console output');
    });
  });

  describe('Scope section formatting', () => {
    it('should render visibility information', () => {
      const spec = createMockSpec({
        scope: {
          visibility: 'public',
          exposedAPI: [],
          accessLevel: 'public',
          isPublicAPI: true,
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('**Visibility:** public');
      expect(result).toContain('**Access Level:** public');
      expect(result).toContain('**Public API:** Yes');
    });

    it('should render exposed API methods', () => {
      const spec = createMockSpec({
        scope: {
          visibility: 'public',
          exposedAPI: ['calculate()', 'validate()', 'format()'],
          accessLevel: 'public',
          isPublicAPI: true,
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Public Interface');
      expect(result).toContain('- `calculate()`');
      expect(result).toContain('- `validate()`');
    });

    it('should render exposed state', () => {
      const spec = createMockSpec({
        scope: {
          visibility: 'public',
          exposedAPI: [],
          accessLevel: 'public',
          isPublicAPI: true,
          exposedState: ['status', 'config'],
        },
      });
      const result = formatter.format(spec);

      expect(result).toContain('### Exposed State');
      expect(result).toContain('- `status`');
      expect(result).toContain('- `config`');
    });
  });

  describe('Footer section', () => {
    it('should render confidence and manual review needed', () => {
      const spec = createMockSpec({
        completionConfidence: 65,
        manualReviewNeeded: ['Purpose', 'Logic'],
      });
      const result = formatter.format(spec);

      expect(result).toContain('**Completion Confidence:** 65%');
      expect(result).toContain('**Manual Review Needed:**');
      expect(result).toContain('- Purpose');
      expect(result).toContain('- Logic');
    });

    it('should hide footer when includeConfidence is false', () => {
      const spec = createMockSpec();
      const fmt = new ModuleSpecMarkdownFormatter({ includeConfidence: false });
      const result = fmt.format(spec);

      expect(result).not.toContain('## Metadata');
    });
  });
});
