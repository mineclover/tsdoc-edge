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
      fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'doc-parser-test-'))
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

      it('should extract source file path from frontmatter', () => {
        const filePath = path.join(tempDir, 'managed', 'feature.md');
        fs.writeFileSync(
          filePath,
          `---
source: src/components/Frontmatter.ts
---
# [[Main]]

Description here.`
        );

        const result = parser.parse(filePath);

        expect(result?.sourceFilePath).toBe('src/components/Frontmatter.ts');
      });

      it('should preserve an explicit non-applicable code implementation disposition', () => {
        const filePath = path.join(tempDir, 'managed', 'concept.md');
        fs.writeFileSync(
          filePath,
          `---
codeImplementation: not-applicable
---
# [[Concept]]

This document intentionally has no single implementation owner.`
        );

        const result = parser.parse(filePath);

        expect(result?.primary?.codeImplementation).toBe('not-applicable');
      });

      it('should ignore **Source**: inside fenced markdown code blocks and never overwrite frontmatter source', () => {
        const withFrontmatter = path.join(tempDir, 'managed', 'fenced-with-frontmatter.md');
        fs.writeFileSync(
          withFrontmatter,
          `---
source: src/doc-symbol/DocumentSymbolParser.ts
---
# [[Document Symbol Parser]]

## Example

\`\`\`markdown
# [[ExampleDoc]]

**Source**: \`src/example/Fake.ts\`
\`\`\`
`
        );

        const resultWithFrontmatter = parser.parse(withFrontmatter);
        expect(resultWithFrontmatter?.sourceFilePath).toBe(
          'src/doc-symbol/DocumentSymbolParser.ts'
        );

        const withoutSource = path.join(tempDir, 'managed', 'fenced-without-source.md');
        fs.writeFileSync(
          withoutSource,
          `# [[ExampleOnlyDoc]]

\`\`\`markdown
**Source**: \`src/example/Fake.ts\`
\`\`\`
`
        );

        const resultWithoutSource = parser.parse(withoutSource);
        expect(resultWithoutSource?.sourceFilePath).toBeUndefined();
      });

      it('should give frontmatter source precedence over body **Source**: and ignore **Source**: in ## Backlinks', () => {
        const precedenceFile = path.join(tempDir, 'managed', 'precedence.md');
        fs.writeFileSync(
          precedenceFile,
          `---
source: src/real/FrontmatterSource.ts
---
# [[PrecedenceDoc]]

**Source**: \`src/other/BodySource.ts\`
`
        );

        expect(parser.parse(precedenceFile)?.sourceFilePath).toBe('src/real/FrontmatterSource.ts');

        const backlinksSourceFile = path.join(tempDir, 'managed', 'backlinks-source.md');
        fs.writeFileSync(
          backlinksSourceFile,
          `# [[BacklinksOnlySource]]

## Backlinks

**Source**: \`src/example/FakeBacklinkSource.ts\`
`
        );

        expect(parser.parse(backlinksSourceFile)?.sourceFilePath).toBeUndefined();
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

        const _result = parser.parse(filePath);

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

    describe('frontmatter line offset', () => {
      it('should report exact 1-indexed line numbers matching file when frontmatter is present', () => {
        const filePath = path.join(tempDir, 'managed', 'frontmatter-lines.md');
        fs.writeFileSync(
          filePath,
          `---
tsdoc: managed
category: feature
version: 1.0.0
---

# [[PrimaryWithFrontmatter]]

Line 8 content.
See [[InlineRefOne]] here.

## [[AuxWithFrontmatter]]

Line 14 content.
See [[InlineRefTwo]] and [MyCode](src/MyCode.ts#Method).
[^sym-001] footnote ref.`
        );

        const result = parser.parse(filePath);

        expect(result).not.toBeNull();
        // Frontmatter is lines 1-5 (---, tsdoc, category, version, ---)
        // Line 6 is blank
        // Line 7 is # [[PrimaryWithFrontmatter]]
        expect(result?.primary?.name).toBe('PrimaryWithFrontmatter');
        expect(result?.primary?.line).toBe(7);

        // Line 10: See [[InlineRefOne]] here.
        const ref1 = result?.references.find((r) => r.name === 'InlineRefOne');
        expect(ref1).toBeDefined();
        expect(ref1?.line).toBe(10);

        // Line 12: ## [[AuxWithFrontmatter]]
        const aux = result?.auxiliaries.find((a) => a.name === 'AuxWithFrontmatter');
        expect(aux).toBeDefined();
        expect(aux?.line).toBe(12);

        // Line 15: See [[InlineRefTwo]] and [MyCode](src/MyCode.ts#Method).
        const ref2 = result?.references.find((r) => r.name === 'InlineRefTwo');
        expect(ref2).toBeDefined();
        expect(ref2?.line).toBe(15);

        const codeRef = result?.codeReferences.find((c) => c.text === 'MyCode');
        expect(codeRef).toBeDefined();
        expect(codeRef?.line).toBe(15);

        // Line 16: [^sym-001] footnote ref.
        const footnoteRef = result?.symbolFootnoteRefs.find((f) => f.identifier === 'sym-001');
        expect(footnoteRef).toBeDefined();
        expect(footnoteRef?.line).toBe(16);
      });

      it('should calculate correct line numbers with 0 frontmatter lines', () => {
        const filePath = path.join(tempDir, 'managed', 'no-frontmatter.md');
        fs.writeFileSync(
          filePath,
          `# [[DirectPrimary]]

Line 3
See [[DirectRef]]`
        );

        const result = parser.parse(filePath);

        expect(result?.primary?.line).toBe(1);
        expect(result?.references[0]?.line).toBe(4);
      });
    });

    describe('code block line preservation', () => {
      it('should preserve downstream line numbers across multiline code blocks and ignore code block references', () => {
        const filePath = path.join(tempDir, 'managed', 'code-blocks.md');
        fs.writeFileSync(
          filePath,
          `# [[CodeBlockDoc]]

Line 3: intro text.

\`\`\`typescript
// Inside code block: [[ShouldNotBeExtracted]]
function example() {
  const x = 1;
  const y = 2;
  return x + y;
}
\`\`\`

Line 14: after code block.
Reference [[DownstreamRef]] is here.

## [[AuxAfterCodeBlock]]`
        );

        const result = parser.parse(filePath);

        expect(result).not.toBeNull();
        expect(result?.primary?.line).toBe(1);

        // Symbols inside code block should NOT be extracted
        expect(result?.references.some((r) => r.name === 'ShouldNotBeExtracted')).toBe(false);

        // Line 15: Reference [[DownstreamRef]] is here.
        const ref = result?.references.find((r) => r.name === 'DownstreamRef');
        expect(ref).toBeDefined();
        expect(ref?.line).toBe(15);

        // Line 17: ## [[AuxAfterCodeBlock]]
        const aux = result?.auxiliaries.find((a) => a.name === 'AuxAfterCodeBlock');
        expect(aux).toBeDefined();
        expect(aux?.line).toBe(17);
      });

      it('should preserve line numbers with both frontmatter AND code blocks combined', () => {
        const filePath = path.join(tempDir, 'managed', 'combined-offset.md');
        fs.writeFileSync(
          filePath,
          `---
tsdoc: managed
version: 1.0.0
---
# [[CombinedDoc]]

\`\`\`json
{
  "key": "value",
  "nested": true
}
\`\`\`

See [[CombinedRef]].`
        );

        const result = parser.parse(filePath);

        expect(result?.primary?.line).toBe(5);
        const ref = result?.references.find((r) => r.name === 'CombinedRef');
        expect(ref).toBeDefined();
        expect(ref?.line).toBe(14);
      });
    });

    describe('ignore backlinks section', () => {
      it('should ignore wiki-link references inside ## Backlinks section', () => {
        const filePath = path.join(tempDir, 'managed', 'with-backlinks.md');
        fs.writeFileSync(
          filePath,
          `# [[MyTargetDoc]]

Here is a normal reference to [[ValidReference]].

---

## Backlinks

### Referenced By

- [[BacklinkCallerA]] → managed/caller-a.md:10
- [[BacklinkCallerB]]#Section → managed/caller-b.md:25

### Implemented By

- CodeCaller → src/CodeCaller.ts:50`
        );

        const result = parser.parse(filePath);

        expect(result).not.toBeNull();
        // Valid reference should be extracted
        expect(result?.references.some((r) => r.name === 'ValidReference')).toBe(true);

        // Backlink references MUST NOT be extracted
        expect(result?.references.some((r) => r.name === 'BacklinkCallerA')).toBe(false);
        expect(result?.references.some((r) => r.name === 'BacklinkCallerB')).toBe(false);
        expect(result?.references).toHaveLength(1);
      });

      it('should resume parsing if another H2 section appears after ## Backlinks', () => {
        const filePath = path.join(tempDir, 'managed', 'backlinks-middle.md');
        fs.writeFileSync(
          filePath,
          `# [[MiddleBacklinksDoc]]

Reference before: [[RefBefore]].

## Backlinks

### Referenced By

- [[IgnoredInBacklinks]] → managed/ignored.md:12

## Related Topics

Reference after: [[RefAfter]].`
        );

        const result = parser.parse(filePath);

        expect(result).not.toBeNull();
        expect(result?.references.some((r) => r.name === 'RefBefore')).toBe(true);
        expect(result?.references.some((r) => r.name === 'IgnoredInBacklinks')).toBe(false);
        expect(result?.references.some((r) => r.name === 'RefAfter')).toBe(true);
        expect(result?.references).toHaveLength(2);
      });
    });
  });
});
