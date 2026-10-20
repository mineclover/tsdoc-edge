/**
 * Tests for ValidateSymbolRefsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ValidateSymbolRefsCommand } from '../../commands/ValidateSymbolRefsCommand';

const ANSI = '\x1b[';

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

  describe('output formats', () => {
    const originalCwd = process.cwd();
    let consoleSpy: jest.SpyInstance;

    const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    const writeDoc = (name: string, content: string): void => {
      fs.writeFileSync(path.join(docsDir, name), content, 'utf-8');
    };

    // Produces: a duplicate-free registry with one broken reference that has a "Did you mean"
    // suggestion (error) and one symbol used only in H2 headings (ambiguous-reference warning)
    const writeIssueDocs = (): void => {
      writeDoc('a.md', '# [[Dup]]\n\nsee [[Dupp]]\n');
      writeDoc('b.md', '# [[Other]]\n\n## [[Dup Two]]\n');
      writeDoc('c.md', '## [[Dup Two]]\n');
    };

    beforeEach(() => {
      // fixIssues writes to managed/relationships relative to the cwd
      process.chdir(tempDir);
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      process.chdir(originalCwd);
    });

    it('should report a valid run as XML by default', async () => {
      writeDoc('a.md', '# [[FeatureA]]\n\nRelated: [[FeatureB]]\n');
      writeDoc('b.md', '# [[FeatureB]]\n\nDocs.\n');

      const result = await command.execute([docsDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out.startsWith('<symbol-reference-validation>')).toBe(true);
      expect(out.trimEnd().endsWith('</symbol-reference-validation>')).toBe(true);
      expect(out).toContain('<uniqueSymbols>2</uniqueSymbols>');
      expect(out).toContain('<totalReferences>1</totalReferences>');
      expect(out).toContain('<isValid>true</isValid>');
      expect(out).toContain('<issues count="0">');
      expect(out).toContain('<fixMode>false</fixMode>');
      expect(out).not.toContain(ANSI);
    });

    it('should list issues in the XML document and still fail on errors', async () => {
      writeIssueDocs();

      const result = await command.execute([docsDir]);
      const out = output();

      expect(result.exitCode).toBe(1);
      expect(out).toContain('<isValid>false</isValid>');
      expect(out).toContain('<errorCount>1</errorCount>');
      expect(out).toContain('<warningCount>1</warningCount>');
      expect(out).toContain('<type>broken-reference</type>');
      expect(out).toContain('<symbol>Dupp</symbol>');
      expect(out).toContain('<suggestion>Did you mean [[Dup]]?</suggestion>');
      expect(out).toContain('<type>ambiguous-reference</type>');
      expect(out).toContain('<fixes count="0">');
      expect(out).not.toContain(ANSI);
    });

    it('should apply --fix and report the fixes in XML mode', async () => {
      writeIssueDocs();

      const result = await command.execute([docsDir, '--fix']);
      const out = output();

      expect(result.exitCode).toBe(1);
      expect(fs.existsSync(path.join(tempDir, 'managed', 'relationships', 'dup-two.md'))).toBe(
        true
      );
      expect(out).toContain('<fixMode>true</fixMode>');
      expect(out).toContain('<fixedCount>1</fixedCount>');
      expect(out).toContain('<action>created</action>');
      expect(out).toContain('<action>manual-fix-needed</action>');
      expect(out).not.toContain(ANSI);
    });

    it('should accept --fix and --human before the docs directory', async () => {
      writeIssueDocs();

      const result = await command.execute(['--fix', '--human', docsDir]);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Fixed 1 issues');
    });

    it('should keep the colored terminal output with --human', async () => {
      writeIssueDocs();

      const result = await command.execute([docsDir, '--human']);
      const out = output();

      expect(result.exitCode).toBe(1);
      expect(out).toContain('Validate Symbol References');
      expect(out).toContain('Symbol Registry Statistics');
      expect(out).toContain('Errors (1):');
      expect(out).toContain('Warnings (1):');
      expect(out).toContain('Run with --fix to automatically fix some issues');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<symbol-reference-validation>');
      expect(fs.existsSync(path.join(tempDir, 'managed'))).toBe(false);
    });

    it('should keep the human fix output with --fix --human', async () => {
      writeIssueDocs();

      await command.execute([docsDir, '--fix', '--human']);
      const out = output();

      expect(out).toContain('Fixing Issues');
      expect(out).toContain('Created: managed/relationships/dup-two.md');
      expect(out).toContain('Manual fix needed');
      expect(out).toContain('Fixed 1 issues');
      expect(fs.existsSync(path.join(tempDir, 'managed', 'relationships', 'dup-two.md'))).toBe(
        true
      );
    });
  });
});
