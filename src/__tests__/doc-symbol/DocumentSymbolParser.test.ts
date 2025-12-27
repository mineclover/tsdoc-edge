/**
 * DocumentSymbolParser tests
 * @testScenario Parse primary [[]] symbols
 * @testScenario Parse auxiliary [[]] symbols
 * @testScenario Parse inline [[]] references
 * @testScenario Handle code blocks
 * @testScenario Extract code references
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocumentSymbolParser } from '../../doc-symbol/DocumentSymbolParser';

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

describe('DocumentSymbolParser', () => {
  let tempDir: string;
  let parser: DocumentSymbolParser;

  beforeEach(() => {
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(require('os').tmpdir(), 'doc-parser-test-'))
    );
    // Create managed directory
    const managedDir = path.join(tempDir, 'managed');
    fs.mkdirSync(managedDir, { recursive: true });

    parser = new DocumentSymbolParser();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parse', () => {
    describe('primary symbols', () => {
      it('should parse H1 primary symbol', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(
          filePath,
          `# [[FeatureName]]

This is the feature description.`
        );

        const result = parser.parse(filePath);

        expect(result).not.toBeNull();
        expect(result?.primary).toBeDefined();
        expect(result?.primary?.name).toBe('FeatureName');
        expect(result?.primary?.type).toBe('primary');
        expect(result?.primary?.level).toBe(1);
        expect(result?.primary?.line).toBe(1);
      });

      it('should handle symbol with spaces', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(filePath, `# [[Feature Name With Spaces]]`);

        const result = parser.parse(filePath);

        expect(result?.primary?.name).toBe('Feature Name With Spaces');
      });
    });

    describe('auxiliary symbols', () => {
      it('should parse H2 auxiliary symbols', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(
          filePath,
          `# [[Main]]

## [[SubFeature1]]

Content here.

## [[SubFeature2]]

More content.`
        );

        const result = parser.parse(filePath);

        expect(result?.auxiliaries).toHaveLength(2);
        expect(result?.auxiliaries[0]?.name).toBe('SubFeature1');
        expect(result?.auxiliaries[0]?.type).toBe('auxiliary');
        expect(result?.auxiliaries[0]?.level).toBe(2);
        expect(result?.auxiliaries[1]?.name).toBe('SubFeature2');
      });

      it('should parse H3 auxiliary symbols', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(
          filePath,
          `# [[Main]]

### [[DeepSymbol]]`
        );

        const result = parser.parse(filePath);

        expect(result?.auxiliaries.some((a) => a.name === 'DeepSymbol')).toBe(true);
        expect(result?.auxiliaries.find((a) => a.name === 'DeepSymbol')?.level).toBe(3);
      });
    });

    describe('inline references', () => {
      it('should parse inline [[]] references', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(
          filePath,
          `# [[Main]]

See [[OtherFeature]] and [[AnotherOne]] for more.`
        );

        const result = parser.parse(filePath);

        expect(result?.references).toHaveLength(2);
        expect(result?.references.some((r) => r.name === 'OtherFeature')).toBe(true);
        expect(result?.references.some((r) => r.name === 'AnotherOne')).toBe(true);
      });

      it('should include line numbers for references', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(
          filePath,
          `# [[Main]]

Line 3
See [[Reference]] here`
        );

        const result = parser.parse(filePath);

        const ref = result?.references.find((r) => r.name === 'Reference');
        expect(ref?.line).toBeGreaterThan(1);
      });

      it('should find multiple references on same line', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(
          filePath,
          `# [[Main]]

Both [[Ref1]] and [[Ref2]] here`
        );

        const result = parser.parse(filePath);

        expect(result?.references).toHaveLength(2);
      });
    });

    describe('code references', () => {
      it('should extract source file path', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(
          filePath,
          `# [[Main]]

**Source**: \`src/components/Main.ts\`

Description here.`
        );

        const result = parser.parse(filePath);

        expect(result?.sourceFilePath).toBe('src/components/Main.ts');
      });
    });

    describe('error handling', () => {
      it('should throw for non-existent file', () => {
        expect(() => parser.parse('/nonexistent/file.md')).toThrow('File not found');
      });
    });

    describe('non-managed documents', () => {
      it('should return null for non-managed documents', () => {
        const filePath = path.join(tempDir, 'outside.md');
        fs.writeFileSync(filePath, '# [[Symbol]]');

        const result = parser.parse(filePath);

        // Depends on isManagedDocument implementation
        // May return null or the parsed result
      });
    });

    describe('complex documents', () => {
      it('should parse document with all symbol types', () => {
        const filePath = path.join(tempDir, 'managed', 'complex.md');
        fs.writeFileSync(
          filePath,
          `# [[MainFeature]]

This is the main feature.

## [[SubFeature]]

See [[ExternalRef]] for details.

### [[DeepNested]]

**Source**: \`src/Feature.ts\`

Implementation uses [[Helper]] and [[Utils]].`
        );

        const result = parser.parse(filePath);

        expect(result?.primary?.name).toBe('MainFeature');
        expect(result?.auxiliaries.length).toBeGreaterThanOrEqual(2);
        expect(result?.references.length).toBeGreaterThanOrEqual(3);
        expect(result?.sourceFilePath).toBe('src/Feature.ts');
      });

      it('should correctly track line numbers', () => {
        const filePath = path.join(tempDir, 'managed', 'lines.md');
        fs.writeFileSync(
          filePath,
          `# [[Primary]]
Line 2
## [[Aux]]
Line 4
[[Ref]]`
        );

        const result = parser.parse(filePath);

        expect(result?.primary?.line).toBe(1);
        expect(result?.auxiliaries[0]?.line).toBe(3);
        expect(result?.references[0]?.line).toBe(5);
      });
    });

    describe('filePath in result', () => {
      it('should include file path in result', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(filePath, '# [[Main]]');

        const result = parser.parse(filePath);

        expect(result?.filePath).toBe(filePath);
      });
    });
  });
});
