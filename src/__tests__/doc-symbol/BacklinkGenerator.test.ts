/**
 * BacklinkGenerator tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BacklinkGenerator } from '../../doc-symbol/BacklinkGenerator';
import { DocumentSymbolRegistry } from '../../doc-symbol/DocumentSymbolRegistry';
import type { CodeConnection, DocumentSymbol } from '../../types/feature';

describe('BacklinkGenerator', () => {
  let tempDir: string;
  let registry: DocumentSymbolRegistry;
  let generator: BacklinkGenerator;

  const createDocSymbol = (overrides: Partial<DocumentSymbol> = {}): DocumentSymbol => ({
    name: 'TestSymbol',
    type: 'primary',
    filePath: path.join(tempDir, 'test.md'),
    line: 1,
    level: 1,
    ...overrides,
  });

  const createCodeConnection = (overrides: Partial<CodeConnection> = {}): CodeConnection => ({
    codeSymbol: 'TestClass',
    filePath: path.join(tempDir, 'test.ts'),
    line: 10,
    docSymbol: 'TestSymbol',
    ...overrides,
  });

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `backlink-test-${Math.random()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    registry = new DocumentSymbolRegistry();
    generator = new BacklinkGenerator(registry);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('generateBacklinks', () => {
    it('should return empty string for undefined symbol', () => {
      const markdown = generator.generateBacklinks('NonExistent');
      expect(markdown).toBe('');
    });

    it('should return empty string when no backlinks exist', () => {
      registry.registerDocument({
        filePath: path.join(tempDir, 'test.md'),
        primary: createDocSymbol({ name: 'TestSymbol' }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const markdown = generator.generateBacklinks('TestSymbol');
      expect(markdown).toBe('');
    });

    it('should generate backlinks for document references', () => {
      const primaryFile = path.join(tempDir, 'primary.md');
      const refFile = path.join(tempDir, 'ref.md');

      registry.registerDocument({
        filePath: primaryFile,
        primary: createDocSymbol({ name: 'TestSymbol', filePath: primaryFile }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerDocument({
        filePath: refFile,
        primary: createDocSymbol({ name: 'RefDoc', filePath: refFile }),
        auxiliaries: [],
        references: [
          createDocSymbol({
            name: 'TestSymbol',
            type: 'reference',
            filePath: refFile,
            line: 5,
            level: 0,
          }),
        ],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const markdown = generator.generateBacklinks('TestSymbol');
      expect(markdown).toContain('## Backlinks');
      expect(markdown).toContain('### Referenced By');
      const relativeRefFile = path.relative(process.cwd(), refFile);
      expect(markdown).toContain(`${relativeRefFile}:5`);
      expect(markdown).not.toContain(process.cwd());
    });

    it('should generate backlinks for code connections', () => {
      const primaryFile = path.join(tempDir, 'primary.md');

      registry.registerDocument({
        filePath: primaryFile,
        primary: createDocSymbol({ name: 'TestSymbol', filePath: primaryFile }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerCodeConnection(
        createCodeConnection({
          docSymbol: 'TestSymbol',
          codeSymbol: 'TestClass',
        })
      );

      const markdown = generator.generateBacklinks('TestSymbol');
      expect(markdown).toContain('## Backlinks');
      expect(markdown).toContain('### Implemented By');
      expect(markdown).toContain('TestClass');
    });

    it('should include section information in document backlinks', () => {
      const primaryFile = path.join(tempDir, 'primary.md');
      const refFile = path.join(tempDir, 'ref.md');

      registry.registerDocument({
        filePath: primaryFile,
        primary: createDocSymbol({ name: 'TestSymbol', filePath: primaryFile }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerDocument({
        filePath: refFile,
        primary: createDocSymbol({ name: 'RefDoc', filePath: refFile }),
        auxiliaries: [],
        references: [
          createDocSymbol({
            name: 'TestSymbol',
            type: 'reference',
            filePath: refFile,
            line: 5,
            level: 0,
            section: 'Usage',
          }),
        ],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const markdown = generator.generateBacklinks('TestSymbol');
      expect(markdown).toContain('#Usage');
    });

    it('should include section information in code backlinks', () => {
      const primaryFile = path.join(tempDir, 'primary.md');

      registry.registerDocument({
        filePath: primaryFile,
        primary: createDocSymbol({ name: 'TestSymbol', filePath: primaryFile }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerCodeConnection(
        createCodeConnection({
          docSymbol: 'TestSymbol',
          section: 'Implementation',
        })
      );

      const markdown = generator.generateBacklinks('TestSymbol');
      expect(markdown).toContain('(Implementation)');
    });

    it('should generate both document and code backlinks', () => {
      const primaryFile = path.join(tempDir, 'primary.md');
      const refFile = path.join(tempDir, 'ref.md');

      registry.registerDocument({
        filePath: primaryFile,
        primary: createDocSymbol({ name: 'TestSymbol', filePath: primaryFile }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerDocument({
        filePath: refFile,
        primary: createDocSymbol({ name: 'RefDoc', filePath: refFile }),
        auxiliaries: [],
        references: [
          createDocSymbol({
            name: 'TestSymbol',
            type: 'reference',
            filePath: refFile,
            line: 5,
            level: 0,
          }),
        ],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerCodeConnection(
        createCodeConnection({
          docSymbol: 'TestSymbol',
        })
      );

      const markdown = generator.generateBacklinks('TestSymbol');
      expect(markdown).toContain('### Referenced By');
      expect(markdown).toContain('### Implemented By');
    });

    it('should format relative paths relative to project root', () => {
      const primaryFile = path.join(tempDir, 'primary.md');
      const refFile = path.join(tempDir, 'nested', 'ref.md');
      fs.mkdirSync(path.dirname(refFile), { recursive: true });

      registry.registerDocument({
        filePath: primaryFile,
        primary: createDocSymbol({ name: 'TestSymbol', filePath: primaryFile }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerDocument({
        filePath: refFile,
        primary: createDocSymbol({ name: 'RefDoc', filePath: refFile }),
        auxiliaries: [],
        references: [
          createDocSymbol({
            name: 'TestSymbol',
            type: 'reference',
            filePath: refFile,
            line: 42,
            level: 0,
          }),
        ],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const markdown = generator.generateBacklinks('TestSymbol');
      const expectedRel = path.relative(process.cwd(), refFile).replace(/\\/g, '/');
      expect(markdown).toContain(`${expectedRel}:42`);
      expect(markdown).not.toContain(process.cwd());
    });

    it('should prevent self-references from appearing in backlinks', () => {
      const file = path.join(tempDir, 'self.md');
      registry.registerDocument({
        filePath: file,
        primary: createDocSymbol({ name: 'SelfSymbol', filePath: file }),
        auxiliaries: [],
        references: [
          createDocSymbol({
            name: 'SelfSymbol',
            type: 'reference',
            filePath: file,
            line: 12,
            level: 0,
          }),
        ],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const markdown = generator.generateBacklinks('SelfSymbol');
      expect(markdown).toBe('');
    });

    it('should deduplicate multiple references from the same source document', () => {
      const primaryFile = path.join(tempDir, 'primary.md');
      const refFile = path.join(tempDir, 'multi_ref.md');

      registry.registerDocument({
        filePath: primaryFile,
        primary: createDocSymbol({ name: 'TargetSymbol', filePath: primaryFile }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerDocument({
        filePath: refFile,
        primary: createDocSymbol({ name: 'SourceDoc', filePath: refFile }),
        auxiliaries: [],
        references: [
          createDocSymbol({
            name: 'TargetSymbol',
            type: 'reference',
            filePath: refFile,
            line: 10,
            level: 0,
          }),
          createDocSymbol({
            name: 'TargetSymbol',
            type: 'reference',
            filePath: refFile,
            line: 25,
            level: 0,
          }),
          createDocSymbol({
            name: 'TargetSymbol',
            type: 'reference',
            filePath: refFile,
            line: 50,
            level: 0,
          }),
        ],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const markdown = generator.generateBacklinks('TargetSymbol');
      const occurrences = (markdown.match(/\[\[SourceDoc\]\]/g) || []).length;
      expect(occurrences).toBe(1);
      expect(markdown).toContain(':10');
    });
  });

  describe('updateBacklinksSection', () => {
    it('should throw error if file does not exist', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.md');
      expect(() => {
        generator.updateBacklinksSection(nonExistentFile, 'TestSymbol');
      }).toThrow('File not found');
    });

    it('should append backlinks to file without existing section', () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = '# [[TestSymbol]]\n\nSome content.\n';
      fs.writeFileSync(filePath, content, 'utf-8');

      registry.registerDocument({
        filePath,
        primary: createDocSymbol({ name: 'TestSymbol', filePath }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerCodeConnection(
        createCodeConnection({
          docSymbol: 'TestSymbol',
          filePath: path.join(tempDir, 'test.ts'),
        })
      );

      generator.updateBacklinksSection(filePath, 'TestSymbol');

      const updated = fs.readFileSync(filePath, 'utf-8');
      expect(updated).toContain('---\n\n## Backlinks');
      expect(updated).toContain('### Implemented By');
    });

    it('should replace existing backlinks section', () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = `# [[TestSymbol]]

Some content.

---

## Backlinks

### Old Content

# New Section
`;
      fs.writeFileSync(filePath, content, 'utf-8');

      registry.registerDocument({
        filePath,
        primary: createDocSymbol({ name: 'TestSymbol', filePath }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerCodeConnection(
        createCodeConnection({
          docSymbol: 'TestSymbol',
        })
      );

      generator.updateBacklinksSection(filePath, 'TestSymbol');

      const updated = fs.readFileSync(filePath, 'utf-8');
      expect(updated).toContain('### Implemented By');
      expect(updated).not.toContain('### Old Content');
      expect(updated).toContain('# New Section');
    });

    it('should remove backlinks section when no backlinks exist', () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = `# [[TestSymbol]]

Some content.

---

## Backlinks

### Old Content
`;
      fs.writeFileSync(filePath, content, 'utf-8');

      registry.registerDocument({
        filePath,
        primary: createDocSymbol({ name: 'TestSymbol', filePath }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      generator.updateBacklinksSection(filePath, 'TestSymbol');

      const updated = fs.readFileSync(filePath, 'utf-8');
      expect(updated).not.toContain('## Backlinks');
      expect(updated).toContain('# [[TestSymbol]]');
    });

    it('should preserve trailing sections (e.g. ## References) when replacing backlinks', () => {
      const filePath = path.join(tempDir, 'trailing_ref.md');
      const content = `# [[TestSymbol]]

Some content.

---

## Backlinks

### Old Content

## References

- Reference 1
- Reference 2
`;
      fs.writeFileSync(filePath, content, 'utf-8');

      registry.registerDocument({
        filePath,
        primary: createDocSymbol({ name: 'TestSymbol', filePath }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerCodeConnection(
        createCodeConnection({
          docSymbol: 'TestSymbol',
        })
      );

      generator.updateBacklinksSection(filePath, 'TestSymbol');
      const updated = fs.readFileSync(filePath, 'utf-8');

      expect(updated).toContain('### Implemented By');
      expect(updated).not.toContain('### Old Content');
      expect(updated).toContain('## References\n\n- Reference 1\n- Reference 2');
    });

    it('should preserve trailing sections when removing backlinks', () => {
      const filePath = path.join(tempDir, 'remove_trailing.md');
      const content = `# [[TestSymbol]]

Some content.

---

## Backlinks

### Old Content

## Footnotes

Footnote text.
`;
      fs.writeFileSync(filePath, content, 'utf-8');

      registry.registerDocument({
        filePath,
        primary: createDocSymbol({ name: 'TestSymbol', filePath }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      generator.updateBacklinksSection(filePath, 'TestSymbol');
      const updated = fs.readFileSync(filePath, 'utf-8');

      expect(updated).not.toContain('## Backlinks');
      expect(updated).toContain('## Footnotes\n\nFootnote text.');
    });

    it('should be idempotent and not write to disk when content is unchanged', () => {
      const filePath = path.join(tempDir, 'idempotent.md');
      const content = '# [[TestSymbol]]\n\nSome content.\n';
      fs.writeFileSync(filePath, content, 'utf-8');

      registry.registerDocument({
        filePath,
        primary: createDocSymbol({ name: 'TestSymbol', filePath }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerCodeConnection(
        createCodeConnection({
          docSymbol: 'TestSymbol',
        })
      );

      // First update: modifies and writes
      const firstWrite = generator.updateBacklinksSection(filePath, 'TestSymbol');
      expect(firstWrite).toBe(true);
      const stat1 = fs.statSync(filePath);

      // Second update: no changes, disk write skipped
      const secondWrite = generator.updateBacklinksSection(filePath, 'TestSymbol');
      expect(secondWrite).toBe(false);
      const stat2 = fs.statSync(filePath);
      expect(stat2.mtimeMs).toBe(stat1.mtimeMs);
    });
  });

  describe('updateAllBacklinks', () => {
    it('should return empty array when no symbols exist', () => {
      const updated = generator.updateAllBacklinks();
      expect(updated).toEqual([]);
    });

    it('should update all defined symbols', () => {
      const file1 = path.join(tempDir, 'test1.md');
      const file2 = path.join(tempDir, 'test2.md');

      fs.writeFileSync(file1, '# [[Symbol1]]\n\nContent.\n', 'utf-8');
      fs.writeFileSync(file2, '# [[Symbol2]]\n\nContent.\n', 'utf-8');

      registry.registerDocument({
        filePath: file1,
        primary: createDocSymbol({ name: 'Symbol1', filePath: file1 }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerDocument({
        filePath: file2,
        primary: createDocSymbol({ name: 'Symbol2', filePath: file2 }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const updated = generator.updateAllBacklinks();
      expect(updated).toHaveLength(2);
      expect(updated).toContain(file1);
      expect(updated).toContain(file2);
    });

    it('should skip symbols without files', () => {
      const filePath = path.join(tempDir, 'test.md');
      fs.writeFileSync(filePath, '# [[TestSymbol]]\n', 'utf-8');

      registry.registerDocument({
        filePath,
        primary: createDocSymbol({ name: 'TestSymbol', filePath }),
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      // Delete the file to simulate missing file
      fs.unlinkSync(filePath);

      expect(() => {
        generator.updateAllBacklinks();
      }).toThrow();
    });
  });
});
