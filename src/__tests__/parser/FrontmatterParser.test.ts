/**
 * Tests for FrontmatterParser
 */

import { FrontmatterParser } from '../../parser/FrontmatterParser';

describe('FrontmatterParser', () => {
  let parser: FrontmatterParser;

  beforeEach(() => {
    parser = new FrontmatterParser();
  });

  describe('parse', () => {
    it('should parse valid frontmatter', () => {
      const content = `---
tsdoc: managed
version: 1.0.0
status: active
primary: TestSymbol
category: feature
tags:
  - core
  - test
---

# Content

Body content here.`;

      const result = parser.parse(content);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.metadata.tsdoc).toBe('managed');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.status).toBe('active');
      expect(result.metadata.primary).toBe('TestSymbol');
      expect(result.metadata.category).toBe('feature');
      expect(result.body).toContain('# Content');
    });

    it('should handle content without frontmatter', () => {
      const content = `# Title

Content without frontmatter.`;

      const result = parser.parse(content);

      expect(result.hasFrontmatter).toBe(false);
      expect(result.metadata).toEqual({});
      expect(result.body).toBe(content);
    });

    it('should parse example frontmatter', () => {
      const content = `---
tsdoc: example
purpose: demonstration
---

# Example Content`;

      const result = parser.parse(content);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.metadata.tsdoc).toBe('example');
      expect(result.metadata.purpose).toBe('demonstration');
    });
  });

  describe('validate', () => {
    it('should pass validation for managed document', () => {
      const metadata = {
        tsdoc: 'managed' as const,
        version: '1.0.0',
      };

      const result = parser.validate(metadata, false);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail strict validation without tsdoc field', () => {
      const metadata = {
        version: '1.0.0',
      };

      const result = parser.validate(metadata, true);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: tsdoc');
    });

    it('should reject an invalid code implementation disposition', () => {
      const metadata = {
        tsdoc: 'managed' as const,
        codeImplementation: 'sometimes',
      } as never;

      const result = parser.validate(metadata, false);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Invalid codeImplementation value: sometimes (expected "required" or "not-applicable")'
      );
    });
  });

  describe('stringify', () => {
    it('should generate valid frontmatter', () => {
      const metadata = {
        tsdoc: 'managed' as const,
        version: '1.0.0',
        status: 'active' as const,
      };

      const result = parser.stringify(metadata);

      expect(result).toContain('---');
      expect(result).toContain('tsdoc: managed');
      expect(result).toContain('version: 1.0.0');
      expect(result).toContain('status: active');
    });

    it('should handle array values', () => {
      const metadata = {
        tsdoc: 'managed' as const,
        tags: ['core', 'test'],
      };

      const result = parser.stringify(metadata);

      expect(result).toContain('tags:');
      expect(result).toContain('  - core');
      expect(result).toContain('  - test');
    });
  });

  describe('addOrUpdate', () => {
    it('should add frontmatter to content without it', () => {
      const content = '# Title\n\nContent';
      const metadata = {
        tsdoc: 'managed' as const,
        version: '1.0.0',
      };

      const result = parser.addOrUpdate(content, metadata);

      expect(result).toContain('---');
      expect(result).toContain('tsdoc: managed');
      expect(result).toContain('# Title');
    });

    it('should update existing frontmatter', () => {
      const content = `---
tsdoc: managed
version: 1.0.0
---

# Title`;

      const metadata = {
        version: '2.0.0',
        status: 'active' as const,
      };

      const result = parser.addOrUpdate(content, metadata);

      expect(result).toContain('version: 2.0.0');
      expect(result).toContain('status: active');
      expect(result).toContain('tsdoc: managed');
    });
  });
});
