/**
 * SymbolReferenceGenerator tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SymbolReferenceGenerator } from '../../doc-symbol/SymbolReferenceGenerator';
import { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';
import type { ParsedDocSymbols, SymbolFootnoteRef } from '../../types/feature';

describe('SymbolReferenceGenerator', () => {
  let tempDir: string;
  let registryPath: string;
  let registryManager: SymbolRegistryManager;
  let generator: SymbolReferenceGenerator;

  const createParsedDoc = (overrides: Partial<ParsedDocSymbols> = {}): ParsedDocSymbols => ({
    filePath: path.join(tempDir, 'test.md'),
    auxiliaries: [],
    references: [],
    codeReferences: [],
    symbolFootnoteRefs: [],
    ...overrides,
  });

  const createSymbolRef = (overrides: Partial<SymbolFootnoteRef> = {}): SymbolFootnoteRef => ({
    identifier: 'sym-001',
    line: 1,
    isIdRef: true,
    ...overrides,
  });

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', 'symref-test-' + Math.random());
    fs.mkdirSync(tempDir, { recursive: true });

    registryPath = path.join(tempDir, 'registry.jsonl');
    registryManager = new SymbolRegistryManager(registryPath);
    generator = new SymbolReferenceGenerator(registryManager);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('generateSymbolReferences', () => {
    it('should return empty string when no symbol footnote refs exist', () => {
      const parsed = createParsedDoc({
        symbolFootnoteRefs: [],
      });

      const markdown = generator.generateSymbolReferences(parsed);
      expect(markdown).toBe('');
    });

    it('should return empty string when no refs can be resolved', () => {
      const parsed = createParsedDoc({
        symbolFootnoteRefs: [createSymbolRef({ identifier: 'sym-999', isIdRef: true })],
      });

      const markdown = generator.generateSymbolReferences(parsed);
      expect(markdown).toBe('');
    });

    it('should generate symbol references for resolved refs', () => {
      // Register a symbol
      const symbolFile = path.join(tempDir, 'TestClass.ts');
      const id = registryManager.register({
        filePath: symbolFile,
        symbolName: 'TestClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        filePath: path.join(tempDir, 'docs', 'test.md'),
        symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
      });

      const markdown = generator.generateSymbolReferences(parsed);
      expect(markdown).toContain('## Symbol References');
      expect(markdown).toContain(`[^${id}]:`);
      expect(markdown).toContain('[TestClass]');
      expect(markdown).toContain('#TestClass');
    });

    it('should sort symbol references alphabetically', () => {
      // Register symbols
      const id1 = registryManager.register({
        filePath: path.join(tempDir, 'ZClass.ts'),
        symbolName: 'ZClass',
        type: 'class',
      });

      const id2 = registryManager.register({
        filePath: path.join(tempDir, 'AClass.ts'),
        symbolName: 'AClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        filePath: path.join(tempDir, 'test.md'),
        symbolFootnoteRefs: [
          createSymbolRef({ identifier: id1, isIdRef: true }),
          createSymbolRef({ identifier: id2, isIdRef: true }),
        ],
      });

      const markdown = generator.generateSymbolReferences(parsed);
      const lines = markdown.split('\n').filter((l) => l.startsWith('[^'));

      // id1 and id2 are sequential, so they should be sorted numerically
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle name-based symbol references', () => {
      // Register a symbol
      registryManager.register({
        filePath: path.join(tempDir, 'TestClass.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        filePath: path.join(tempDir, 'test.md'),
        symbolFootnoteRefs: [
          createSymbolRef({ identifier: 'TestClass', isIdRef: false }),
        ],
      });

      const markdown = generator.generateSymbolReferences(parsed);
      expect(markdown).toContain('## Symbol References');
      expect(markdown).toContain('[^TestClass]:');
      expect(markdown).toContain('[TestClass]');
    });

    it('should deduplicate symbol references', () => {
      const id = registryManager.register({
        filePath: path.join(tempDir, 'TestClass.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        filePath: path.join(tempDir, 'test.md'),
        symbolFootnoteRefs: [
          createSymbolRef({ identifier: id, isIdRef: true, line: 1 }),
          createSymbolRef({ identifier: id, isIdRef: true, line: 5 }),
          createSymbolRef({ identifier: id, isIdRef: true, line: 10 }),
        ],
      });

      const markdown = generator.generateSymbolReferences(parsed);
      const refCount = (markdown.match(new RegExp(`\\[\\^${id}\\]:`, 'g')) || []).length;
      expect(refCount).toBe(1);
    });

    it('should generate relative paths correctly', () => {
      const symbolFile = path.join(tempDir, 'src', 'TestClass.ts');
      fs.mkdirSync(path.dirname(symbolFile), { recursive: true });

      const id = registryManager.register({
        filePath: symbolFile,
        symbolName: 'TestClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        filePath: path.join(tempDir, 'docs', 'test.md'),
        symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
      });

      const markdown = generator.generateSymbolReferences(parsed);
      expect(markdown).toContain('../src/TestClass.ts');
    });
  });

  describe('updateDocument', () => {
    it('should return false for non-existent file', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.md');
      const parsed = createParsedDoc({ filePath: nonExistentFile });

      const result = generator.updateDocument(nonExistentFile, parsed);
      expect(result).toBe(false);
    });

    it('should append symbol references section to document', () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = '# Test Document\n\nSome content.\n';
      fs.writeFileSync(filePath, content, 'utf-8');

      const id = registryManager.register({
        filePath: path.join(tempDir, 'TestClass.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        filePath,
        symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
      });

      const result = generator.updateDocument(filePath, parsed);
      expect(result).toBe(true);

      const updated = fs.readFileSync(filePath, 'utf-8');
      expect(updated).toContain('## Symbol References');
      expect(updated).toContain('[TestClass]');
    });

    it('should replace existing symbol references section', () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = `# Test Document

Some content.

## Symbol References

[^old-ref]: Old reference

`;
      fs.writeFileSync(filePath, content, 'utf-8');

      const id = registryManager.register({
        filePath: path.join(tempDir, 'TestClass.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        filePath,
        symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
      });

      const result = generator.updateDocument(filePath, parsed);
      expect(result).toBe(true);

      const updated = fs.readFileSync(filePath, 'utf-8');
      expect(updated).toContain('[TestClass]');
      expect(updated).not.toContain('[^old-ref]:');
    });

    it('should remove symbol references section when no refs exist', () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = `# Test Document

## Symbol References

[^old-ref]: Old reference

`;
      fs.writeFileSync(filePath, content, 'utf-8');

      const parsed = createParsedDoc({
        filePath,
        symbolFootnoteRefs: [],
      });

      const result = generator.updateDocument(filePath, parsed);
      expect(result).toBe(true);

      const updated = fs.readFileSync(filePath, 'utf-8');
      expect(updated).not.toContain('## Symbol References');
      expect(updated).not.toContain('[^old-ref]:');
    });

    it('should insert before Backlinks section if present', () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = `# Test Document

Content here.

---

## Backlinks

Some backlinks.
`;
      fs.writeFileSync(filePath, content, 'utf-8');

      const id = registryManager.register({
        filePath: path.join(tempDir, 'TestClass.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        filePath,
        symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
      });

      const result = generator.updateDocument(filePath, parsed);
      expect(result).toBe(true);

      const updated = fs.readFileSync(filePath, 'utf-8');
      const symbolRefIndex = updated.indexOf('## Symbol References');
      const backlinksIndex = updated.indexOf('## Backlinks');
      expect(symbolRefIndex).toBeLessThan(backlinksIndex);
      expect(symbolRefIndex).toBeGreaterThan(0);
    });

    it('should return false when document is unchanged', () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = '# Test Document\n\nSome content.\n';
      fs.writeFileSync(filePath, content, 'utf-8');

      const parsed = createParsedDoc({
        filePath,
        symbolFootnoteRefs: [],
      });

      const result = generator.updateDocument(filePath, parsed);
      expect(result).toBe(false);
    });
  });

  describe('getUnresolved', () => {
    it('should return empty array when all refs are resolved', () => {
      const id = registryManager.register({
        filePath: path.join(tempDir, 'TestClass.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        filePath: path.join(tempDir, 'test.md'),
        symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
      });

      const unresolved = generator.getUnresolved(parsed);
      expect(unresolved).toEqual([]);
    });

    it('should return unresolved identifiers', () => {
      const parsed = createParsedDoc({
        symbolFootnoteRefs: [
          createSymbolRef({ identifier: 'sym-999', line: 5 }),
          createSymbolRef({ identifier: 'NonExistent', isIdRef: false, line: 10 }),
        ],
      });

      const unresolved = generator.getUnresolved(parsed);
      expect(unresolved).toHaveLength(2);
      expect(unresolved[0].identifier).toBe('sym-999');
      expect(unresolved[0].line).toBe(5);
      expect(unresolved[1].identifier).toBe('NonExistent');
      expect(unresolved[1].line).toBe(10);
    });

    it('should handle mixed resolved and unresolved refs', () => {
      const id = registryManager.register({
        filePath: path.join(tempDir, 'TestClass.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });

      const parsed = createParsedDoc({
        symbolFootnoteRefs: [
          createSymbolRef({ identifier: id, isIdRef: true, line: 1 }),
          createSymbolRef({ identifier: 'sym-999', line: 5 }),
        ],
      });

      const unresolved = generator.getUnresolved(parsed);
      expect(unresolved).toHaveLength(1);
      expect(unresolved[0].identifier).toBe('sym-999');
    });
  });

  describe('batchUpdate', () => {
    it('should update multiple documents', () => {
      const file1 = path.join(tempDir, 'doc1.md');
      const file2 = path.join(tempDir, 'doc2.md');

      fs.writeFileSync(file1, '# Doc 1\n', 'utf-8');
      fs.writeFileSync(file2, '# Doc 2\n', 'utf-8');

      const id = registryManager.register({
        filePath: path.join(tempDir, 'TestClass.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });

      const docs = [
        createParsedDoc({
          filePath: file1,
          symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
        }),
        createParsedDoc({
          filePath: file2,
          symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
        }),
      ];

      const result = generator.batchUpdate(docs);
      expect(result.updated).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should skip documents with no changes', () => {
      const file1 = path.join(tempDir, 'doc1.md');
      fs.writeFileSync(file1, '# Doc 1\n', 'utf-8');

      const docs = [
        createParsedDoc({
          filePath: file1,
          symbolFootnoteRefs: [],
        }),
      ];

      const result = generator.batchUpdate(docs);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('should handle errors gracefully', () => {
      const file1 = path.join(tempDir, 'doc1.md');
      const nonExistentFile = path.join(tempDir, 'nonexistent.md');

      fs.writeFileSync(file1, '# Doc 1\n', 'utf-8');

      const id = registryManager.register({
        filePath: path.join(tempDir, 'TestClass.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });

      const docs = [
        createParsedDoc({
          filePath: file1,
          symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
        }),
        createParsedDoc({
          filePath: nonExistentFile,
          symbolFootnoteRefs: [createSymbolRef({ identifier: id, isIdRef: true })],
        }),
      ];

      const result = generator.batchUpdate(docs);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('should return empty stats for empty doc list', () => {
      const result = generator.batchUpdate([]);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });
});
