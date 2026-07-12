/**
 * Tests for GeneratedDocsValidator
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GeneratedDocsValidator } from '../../validator/GeneratedDocsValidator';

describe('GeneratedDocsValidator', () => {
  let validator: GeneratedDocsValidator;
  let tempDir: string;

  beforeEach(() => {
    validator = new GeneratedDocsValidator();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-docs-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('validate', () => {
    it('should validate a well-formed document', () => {
      const docPath = path.join(tempDir, 'TestSymbol.md');
      fs.writeFileSync(
        docPath,
        `# TestSymbol

## Problem Solving
This is a test.

## Functionality
Does stuff.
`
      );

      const result = validator.validate(docPath);

      expect(result.errors).toHaveLength(0);
    });

    it('should extract symbol name from H1', () => {
      const docPath = path.join(tempDir, 'MySymbol.md');
      fs.writeFileSync(
        docPath,
        `# MySymbol

Some content.
`
      );

      const result = validator.validate(docPath);

      expect(result.symbolName).toBe('MySymbol');
    });

    it('should detect document sections', () => {
      const docPath = path.join(tempDir, 'Symbol.md');
      fs.writeFileSync(
        docPath,
        `# Symbol

## Problem Solving
Problem here.

## Functionality
Function here.

## Decisions
Decision here.
`
      );

      const result = validator.validate(docPath);

      expect(result.sections).toContain('Problem Solving');
      expect(result.sections).toContain('Functionality');
      expect(result.sections).toContain('Decisions');
    });

    it('should handle non-existent file', () => {
      const result = validator.validate('/nonexistent/file.md');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateDirectory', () => {
    it('should validate all markdown files in directory', () => {
      fs.writeFileSync(path.join(tempDir, 'doc1.md'), '# [[Symbol1]]\nContent.');
      fs.writeFileSync(path.join(tempDir, 'doc2.md'), '# [[Symbol2]]\nContent.');

      const results = validator.validateDirectory(tempDir);

      expect(results.length).toBe(2);
    });

    it('should return empty array for empty directory', () => {
      const results = validator.validateDirectory(tempDir);

      expect(results).toEqual([]);
    });
  });
});
