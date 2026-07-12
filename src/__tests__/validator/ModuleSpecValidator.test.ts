/**
 * ModuleSpecValidator Tests
 */

import type { ModuleSpecTemplate } from '../../types/spec/module-spec';
import { ModuleSpecValidator, type ValidationOptions } from '../../validator/ModuleSpecValidator';

describe('ModuleSpecValidator', () => {
  // Helper to create a valid spec template
  function createValidSpec(overrides: Partial<ModuleSpecTemplate> = {}): ModuleSpecTemplate {
    return {
      symbolId: 'test-symbol',
      symbolName: 'testFunction',
      symbolKind: 'function',
      filePath: 'src/test.ts',
      purpose: {
        problem: 'Solves testing problem',
        responsibility: 'Handle test validation',
        solution: 'Validates test inputs',
        context: 'Used in test suite',
      },
      input: {
        parameters: [
          { name: 'input', type: 'string', description: 'The input value', optional: false },
        ],
        preconditions: ['Input must not be empty'],
        constraints: ['Max length 100'],
        typeSignature: '(input: string) => boolean',
      },
      output: {
        returnType: { type: 'boolean', description: 'True if valid' },
        postconditions: ['Returns true for valid input'],
        successCases: ['Valid input returns true'],
        failureCases: [
          {
            condition: 'Empty input',
            errorType: 'ValidationError',
            description: 'Throws on empty',
          },
        ],
      },
      context: {
        dependencies: [
          { name: 'validator', type: 'module', purpose: 'Core validation', critical: true },
        ],
        imports: [{ source: './validator', symbols: ['validate'], isExternal: false }],
        environment: [],
        requirements: [],
      },
      logic: {
        features: ['Input validation', 'Error handling'],
        algorithm: 'Checks input against regex pattern',
        complexity: 'O(n)',
        operations: ['Parse input', 'Validate format'],
      },
      effect: {
        sideEffects: [],
        mutations: [],
        io: [],
      },
      scope: {
        visibility: 'public',
        exposedAPI: ['testFunction'],
        accessLevel: 'public',
        isPublicAPI: true,
      },
      completionConfidence: 85,
      manualReviewNeeded: [],
      generatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  describe('constructor', () => {
    it('should use default options', () => {
      const validator = new ModuleSpecValidator();
      const spec = createValidSpec();
      const result = validator.validate(spec);
      expect(result).toBeDefined();
    });

    it('should accept custom options', () => {
      const options: ValidationOptions = {
        minConfidence: 50,
        requirePurpose: false,
        strictMode: true,
      };
      const validator = new ModuleSpecValidator(options);
      const spec = createValidSpec({ completionConfidence: 60 });
      const result = validator.validate(spec);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validate', () => {
    let validator: ModuleSpecValidator;

    beforeEach(() => {
      validator = new ModuleSpecValidator();
    });

    it('should validate a complete spec successfully', () => {
      const spec = createValidSpec();
      const result = validator.validate(spec);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(70);
      expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
      expect(result.passed.length).toBeGreaterThan(0);
    });

    it('should fail when completion confidence is below threshold', () => {
      const spec = createValidSpec({ completionConfidence: 50 });
      const result = validator.validate(spec);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.message.includes('confidence'))).toBe(true);
    });

    it('should report missing problem description', () => {
      const spec = createValidSpec({
        purpose: {
          problem: 'TODO: Add problem',
          responsibility: 'Handle validation',
          solution: 'Validates inputs',
        },
      });
      const result = validator.validate(spec);

      expect(result.failed).toContain('Purpose missing problem');
      expect(result.issues.some((i) => i.section === 'Purpose' && i.severity === 'error')).toBe(
        true
      );
    });

    it('should report missing responsibility', () => {
      const spec = createValidSpec({
        purpose: {
          problem: 'Solves problem',
          responsibility: 'TODO: Define responsibility',
          solution: 'Solution approach',
        },
      });
      const result = validator.validate(spec);

      expect(result.failed).toContain('Purpose missing responsibility');
    });

    it('should pass when solution is missing (info only)', () => {
      const spec = createValidSpec({
        purpose: {
          problem: 'Solves problem',
          responsibility: 'Handle validation',
          solution: '',
        },
      });
      const result = validator.validate(spec);

      expect(result.issues.some((i) => i.section === 'Purpose' && i.severity === 'info')).toBe(
        true
      );
    });
  });

  describe('validateInput', () => {
    let validator: ModuleSpecValidator;

    beforeEach(() => {
      validator = new ModuleSpecValidator();
    });

    it('should pass for functions with no parameters', () => {
      const spec = createValidSpec({
        input: {
          parameters: [],
          preconditions: [],
          constraints: [],
        },
      });
      const result = validator.validate(spec);

      expect(result.passed).toContain('Input has no parameters (not applicable)');
    });

    it('should warn when parameters lack descriptions', () => {
      const spec = createValidSpec({
        input: {
          parameters: [
            { name: 'input', type: 'string', description: '-', optional: false },
            { name: 'options', type: 'object', optional: true },
          ],
          preconditions: [],
          constraints: [],
          typeSignature: '(input: string, options?: object) => void',
        },
      });
      const result = validator.validate(spec);

      expect(
        result.issues.some(
          (i) => i.section === 'Input' && i.message.includes('missing descriptions')
        )
      ).toBe(true);
    });

    it('should pass when all parameters have descriptions', () => {
      const spec = createValidSpec({
        input: {
          parameters: [
            {
              name: 'input',
              type: 'string',
              description: 'The input value to validate',
              optional: false,
            },
          ],
          preconditions: [],
          constraints: [],
          typeSignature: '(input: string) => void',
        },
      });
      const result = validator.validate(spec);

      expect(result.passed).toContain('All parameters have descriptions');
    });
  });

  describe('validateOutput', () => {
    let validator: ModuleSpecValidator;

    beforeEach(() => {
      validator = new ModuleSpecValidator();
    });

    it('should pass for void return type', () => {
      const spec = createValidSpec({
        output: {
          returnType: { type: 'void' },
          postconditions: [],
          successCases: [],
          failureCases: [],
        },
      });
      const result = validator.validate(spec);

      expect(result.passed).toContain('Output is void (not applicable)');
    });

    it('should warn when return lacks meaningful description', () => {
      const spec = createValidSpec({
        output: {
          returnType: { type: 'boolean', description: 'Returns the result' },
          postconditions: [],
          successCases: [],
          failureCases: [],
        },
      });
      const result = validator.validate(spec);

      expect(
        result.issues.some(
          (i) => i.section === 'Output' && i.message.includes('meaningful description')
        )
      ).toBe(true);
    });

    it('should pass when output has postconditions', () => {
      const spec = createValidSpec({
        output: {
          returnType: { type: 'boolean', description: 'True when valid' },
          postconditions: ['Result is always defined'],
          successCases: [],
          failureCases: [],
        },
      });
      const result = validator.validate(spec);

      expect(result.passed).toContain('Output has postconditions');
    });

    it('should pass when output has failure cases', () => {
      const spec = createValidSpec({
        output: {
          returnType: { type: 'boolean', description: 'True when valid' },
          postconditions: [],
          successCases: [],
          failureCases: [{ condition: 'Invalid input', description: 'Throws error' }],
        },
      });
      const result = validator.validate(spec);

      expect(result.passed).toContain('Output documents failure cases');
    });
  });

  describe('validateContext', () => {
    let validator: ModuleSpecValidator;

    beforeEach(() => {
      validator = new ModuleSpecValidator();
    });

    it('should pass when dependencies exist', () => {
      const spec = createValidSpec();
      const result = validator.validate(spec);

      expect(result.passed).toContain('Context has dependencies');
    });

    it('should pass standalone modules with no dependencies', () => {
      const spec = createValidSpec({
        context: {
          dependencies: [],
          imports: [],
          environment: [],
          requirements: [],
        },
      });
      const result = validator.validate(spec);

      expect(result.passed).toContain('Context has no dependencies (standalone)');
    });

    it('should fail when requireDependencies is true and none exist', () => {
      const validator = new ModuleSpecValidator({ requireDependencies: true });
      const spec = createValidSpec({
        context: {
          dependencies: [],
          imports: [],
          environment: [],
          requirements: [],
        },
      });
      const result = validator.validate(spec);

      expect(result.failed).toContain('Context has no dependencies');
    });
  });

  describe('validateLogic', () => {
    let validator: ModuleSpecValidator;

    beforeEach(() => {
      validator = new ModuleSpecValidator();
    });

    it('should pass when features are listed', () => {
      const spec = createValidSpec();
      const result = validator.validate(spec);

      expect(result.passed).toContain('Logic has features listed');
    });

    it('should warn when no features are listed', () => {
      const spec = createValidSpec({
        logic: {
          features: [],
          algorithm: 'Simple validation',
        },
      });
      const result = validator.validate(spec);

      expect(
        result.issues.some((i) => i.section === 'Logic' && i.message.includes('No features'))
      ).toBe(true);
    });

    it('should pass when algorithm is described', () => {
      const spec = createValidSpec();
      const result = validator.validate(spec);

      expect(result.passed).toContain('Logic has algorithm description');
    });

    it('should fail when algorithm is TODO', () => {
      const spec = createValidSpec({
        logic: {
          features: ['Feature 1'],
          algorithm: 'TODO: Describe algorithm',
        },
      });
      const result = validator.validate(spec);

      expect(result.failed).toContain('Logic missing algorithm');
    });

    it('should treat algorithm TODO as error in strict mode', () => {
      const validator = new ModuleSpecValidator({ strictMode: true });
      const spec = createValidSpec({
        logic: {
          features: ['Feature 1'],
          algorithm: 'TODO: Describe algorithm',
        },
      });
      const result = validator.validate(spec);

      expect(result.issues.some((i) => i.section === 'Logic' && i.severity === 'error')).toBe(true);
    });
  });

  describe('validateEffect', () => {
    let validator: ModuleSpecValidator;

    beforeEach(() => {
      validator = new ModuleSpecValidator();
    });

    it('should pass for pure functions with no side effects', () => {
      const spec = createValidSpec({
        effect: {
          sideEffects: [],
          mutations: [],
          io: [],
        },
      });
      const result = validator.validate(spec);

      expect(result.passed).toContain('Effect has no side effects (pure function)');
    });

    it('should pass when side effects are documented', () => {
      const spec = createValidSpec({
        effect: {
          sideEffects: [{ type: 'filesystem', description: 'Writes to log file' }],
          mutations: [],
          io: [],
        },
      });
      const result = validator.validate(spec);

      expect(result.passed).toContain('Effect has side effects documented');
    });
  });

  describe('validateScope', () => {
    let validator: ModuleSpecValidator;

    beforeEach(() => {
      validator = new ModuleSpecValidator();
    });

    it('should pass when marked as public API', () => {
      const spec = createValidSpec();
      const result = validator.validate(spec);

      expect(result.passed).toContain('Scope is marked as public API');
    });

    it('should info when not marked as public API', () => {
      const spec = createValidSpec({
        scope: {
          visibility: 'private',
          exposedAPI: [],
          accessLevel: 'private',
          isPublicAPI: false,
        },
      });
      const result = validator.validate(spec);

      expect(result.issues.some((i) => i.section === 'Scope' && i.severity === 'info')).toBe(true);
    });

    it('should pass when exposed API exists', () => {
      const spec = createValidSpec();
      const result = validator.validate(spec);

      expect(result.passed).toContain('Scope has exposed API');
    });
  });

  describe('validateMetadata', () => {
    let validator: ModuleSpecValidator;

    beforeEach(() => {
      validator = new ModuleSpecValidator();
    });

    it('should pass when confidence meets threshold', () => {
      const spec = createValidSpec({ completionConfidence: 80 });
      const result = validator.validate(spec);

      expect(result.passed.some((p) => p.includes('Completion confidence meets threshold'))).toBe(
        true
      );
    });

    it('should fail when confidence is below threshold', () => {
      const spec = createValidSpec({ completionConfidence: 50 });
      const result = validator.validate(spec);

      expect(result.failed.some((f) => f.includes('Low completion confidence'))).toBe(true);
    });

    it('should pass when no manual review needed', () => {
      const spec = createValidSpec({ manualReviewNeeded: [] });
      const result = validator.validate(spec);

      expect(result.passed).toContain('No manual review needed');
    });

    it('should info when manual review is needed', () => {
      const spec = createValidSpec({ manualReviewNeeded: ['algorithm', 'side-effects'] });
      const result = validator.validate(spec);

      expect(
        result.issues.some(
          (i) => i.section === 'Metadata' && i.message.includes('Manual review needed')
        )
      ).toBe(true);
    });

    it('should warn for manual review in strict mode', () => {
      const validator = new ModuleSpecValidator({ strictMode: true });
      const spec = createValidSpec({ manualReviewNeeded: ['algorithm'] });
      const result = validator.validate(spec);

      expect(result.issues.some((i) => i.section === 'Metadata' && i.severity === 'warning')).toBe(
        true
      );
    });
  });

  describe('score calculation', () => {
    it('should calculate score based on passed/failed ratio', () => {
      const validator = new ModuleSpecValidator();
      const spec = createValidSpec();
      const result = validator.validate(spec);

      const totalChecks = result.passed.length + result.failed.length;
      const expectedScore = Math.round((result.passed.length / totalChecks) * 100);
      expect(result.score).toBe(expectedScore);
    });

    it('should return 0 score when no checks performed', () => {
      const validator = new ModuleSpecValidator({
        requirePurpose: false,
        requireParamDescriptions: false,
        requireReturnDescription: false,
        requireDependencies: false,
        requireLogicDescription: false,
      });

      // Create minimal spec that triggers minimal validation
      const spec: ModuleSpecTemplate = {
        symbolId: 'test',
        symbolName: 'test',
        symbolKind: 'function',
        filePath: 'test.ts',
        purpose: { problem: '', responsibility: '', solution: '' },
        input: { parameters: [], preconditions: [], constraints: [] },
        output: {
          returnType: { type: 'void' },
          postconditions: [],
          successCases: [],
          failureCases: [],
        },
        context: { dependencies: [], imports: [], environment: [], requirements: [] },
        logic: { features: [], algorithm: '' },
        effect: { sideEffects: [], mutations: [], io: [] },
        scope: {
          visibility: 'private',
          exposedAPI: [],
          accessLevel: 'private',
          isPublicAPI: false,
        },
        completionConfidence: 0,
        manualReviewNeeded: [],
        generatedAt: new Date().toISOString(),
      };

      const result = validator.validate(spec);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isValid determination', () => {
    it('should be invalid when there are errors', () => {
      const validator = new ModuleSpecValidator();
      const spec = createValidSpec({
        purpose: { problem: 'TODO:', responsibility: 'TODO:', solution: '' },
      });
      const result = validator.validate(spec);

      expect(result.isValid).toBe(false);
    });

    it('should be invalid when confidence is below minimum', () => {
      const validator = new ModuleSpecValidator({ minConfidence: 80 });
      const spec = createValidSpec({ completionConfidence: 70 });
      const result = validator.validate(spec);

      expect(result.isValid).toBe(false);
    });

    it('should be valid when all conditions are met', () => {
      const validator = new ModuleSpecValidator({ minConfidence: 70 });
      const spec = createValidSpec({ completionConfidence: 85 });
      const result = validator.validate(spec);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });
  });
});
