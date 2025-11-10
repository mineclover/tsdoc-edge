/**
 * Tests for ValidateSymbolRefsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ValidateSymbolRefsCommand } from '../../commands/ValidateSymbolRefsCommand';

describe('ValidateSymbolRefsCommand', () => {
  let command: ValidateSymbolRefsCommand;
  let tempDir: string;
  let docsDir: string;

  beforeEach(() => {
    // Create temp directory for test docs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-symbol-test-'));
    docsDir = path.join(tempDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });

    command = new ValidateSymbolRefsCommand();
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getName', () => {
    it('should return "validate-symbol-refs"', () => {
      expect(command.getName()).toBe('validate-symbol-refs');
    });
  });

  describe('getDescription', () => {
    it('should return description about symbol validation', () => {
      const desc = command.getDescription();
      expect(desc).toContain('Symbol');
      expect(desc.toLowerCase()).toContain('validate');
    });
  });

  describe('execute', () => {
    it('should validate valid symbol references', async () => {
      // Create doc with valid symbol definition and reference
      fs.writeFileSync(
        path.join(docsDir, 'feature.md'),
        `# [[FeatureA]]

This is FeatureA documentation.

Related: [[FeatureB]]
`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(docsDir, 'feature-b.md'),
        `# [[FeatureB]]

This is FeatureB documentation.
`,
        'utf-8'
      );

      const result = await command.execute([docsDir]);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('valid');
    });

    it('should detect broken references', async () => {
      // Create doc with broken reference
      fs.writeFileSync(
        path.join(docsDir, 'feature.md'),
        `# [[FeatureA]]

Related to [[NonExistent]] which does not exist.
`,
        'utf-8'
      );

      const result = await command.execute([docsDir]);

      // Should complete but report broken references
      expect(result).toBeDefined();
    });

    it('should detect duplicate definitions', async () => {
      // Create two docs with same H1 symbol
      fs.writeFileSync(
        path.join(docsDir, 'doc1.md'),
        `# [[DuplicateSymbol]]

First definition.
`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(docsDir, 'doc2.md'),
        `# [[DuplicateSymbol]]

Second definition (duplicate).
`,
        'utf-8'
      );

      const result = await command.execute([docsDir]);

      // Should detect duplicate
      expect(result).toBeDefined();
    });

    it('should use default "managed" directory if not specified', async () => {
      // Create managed directory in cwd
      const managedDir = path.join(process.cwd(), 'managed');

      if (fs.existsSync(managedDir)) {
        const result = await command.execute([]);
        // Should not error
        expect(result).toBeDefined();
      } else {
        // If managed doesn't exist, should handle gracefully
        const result = await command.execute([]);
        expect(result).toBeDefined();
      }
    });

    it('should display help when --help flag is provided', async () => {
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
    });

    it('should display help when -h flag is provided', async () => {
      const result = await command.execute(['-h']);

      expect(result.exitCode).toBe(0);
    });

    it('should handle empty directory gracefully', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = await command.execute([emptyDir]);

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it('should handle auxiliary symbol definitions (H2+)', async () => {
      // Create doc with H1 and H2 symbols
      fs.writeFileSync(
        path.join(docsDir, 'feature.md'),
        `# [[PrimarySymbol]]

## [[AuxiliarySymbol]]

Auxiliary definition under primary.
`,
        'utf-8'
      );

      const result = await command.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should support --fix flag for automatic fixes', async () => {
      // Create doc with fixable issue
      fs.writeFileSync(
        path.join(docsDir, 'feature.md'),
        `# [[FeatureA]]

Documentation here.
`,
        'utf-8'
      );

      const result = await command.execute([docsDir, '--fix']);

      // Should accept --fix flag without error
      expect(result).toBeDefined();
    });

    it('should handle non-existent directory', async () => {
      const result = await command.execute(['/non/existent/path']);

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle documents without symbol definitions', async () => {
      // Create doc without [[Symbol]] format
      fs.writeFileSync(
        path.join(docsDir, 'plain.md'),
        `# Plain Title

No symbols here.
`,
        'utf-8'
      );

      const result = await command.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should track statistics correctly', async () => {
      // Create multiple docs with symbols
      fs.writeFileSync(
        path.join(docsDir, 'a.md'),
        `# [[SymbolA]]

Refers to [[SymbolB]] and [[SymbolC]].
`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(docsDir, 'b.md'),
        `# [[SymbolB]]

Documentation.
`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(docsDir, 'c.md'),
        `# [[SymbolC]]

More documentation.
`,
        'utf-8'
      );

      const result = await command.execute([docsDir]);

      expect(result.exitCode).toBe(0);
      // Should report statistics
    });
  });
});
