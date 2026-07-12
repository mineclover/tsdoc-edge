/**
 * SpecCompletenessValidator tests
 * @testScenario Validate specification document completeness
 * @testScenario Check required sections
 * @testScenario Calculate quality scores
 * @testScenario Handle missing files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SpecCompletenessValidator } from '../../spec/SpecCompletenessValidator';

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(() => ({
        paths: { managedDir: 'managed' },
        documentManagement: { ignoreCodeBlocks: true },
      })),
    })),
  },
}));

describe('SpecCompletenessValidator', () => {
  let validator: SpecCompletenessValidator;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'spec-validator-test-'))
    );

    // Create managed directory
    const managedDir = path.join(tempDir, 'managed');
    fs.mkdirSync(managedDir, { recursive: true });

    validator = new SpecCompletenessValidator();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('validate', () => {
    it('should throw for non-existent file', () => {
      expect(() => validator.validate('/nonexistent/file.md')).toThrow('File not found');
    });

    it('should validate document and return result', () => {
      const filePath = path.join(tempDir, 'managed', 'complete.md');
      fs.writeFileSync(
        filePath,
        `# [[Complete Spec]]

## 개요
Overview content here.

## 핵심 개념
Core concepts explained.

## 핵심 산출물
Main deliverables listed.

## 사용 시나리오
- Scenario 1
- Scenario 2
- Scenario 3

\`\`\`typescript
// Example code
const example = true;
\`\`\`
`
      );

      const result = validator.validate(filePath);

      expect(result).toBeDefined();
      expect(result.filePath).toBe(filePath);
      expect(typeof result.score).toBe('number');
      expect(typeof result.isComplete).toBe('boolean');
    });

    it('should detect missing required sections', () => {
      const filePath = path.join(tempDir, 'managed', 'incomplete.md');
      fs.writeFileSync(
        filePath,
        `# [[Incomplete Spec]]

## 개요
Just overview.
`
      );

      const result = validator.validate(filePath);

      expect(result.breakdown.design.structure.requiredSections.missing.length).toBeGreaterThan(0);
    });

    it('should calculate quality score', () => {
      const filePath = path.join(tempDir, 'managed', 'scored.md');
      fs.writeFileSync(
        filePath,
        `# [[Scored Spec]]

## Overview
Some content.
`
      );

      const result = validator.validate(filePath);

      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should count code references', () => {
      const filePath = path.join(tempDir, 'managed', 'code-refs.md');
      fs.writeFileSync(
        filePath,
        `# [[Code Refs]]

See [[Symbol1]] and [[Symbol2]] for details.

**Source**: \`src/path/File.ts\`

\`\`\`typescript
import { Something } from './module';
\`\`\`
`
      );

      const result = validator.validate(filePath);

      expect(result.breakdown.implementation.codeReferences.count).toBeGreaterThanOrEqual(0);
    });

    it('should accept custom requirements', () => {
      const customValidator = new SpecCompletenessValidator({
        requiredSections: ['Custom Section'],
        minScenarios: 1,
      });

      const filePath = path.join(tempDir, 'managed', 'custom.md');
      fs.writeFileSync(
        filePath,
        `# [[Custom Spec]]

## Custom Section
Content here.
`
      );

      const result = customValidator.validate(filePath);

      expect(result).toBeDefined();
    });
  });
});
