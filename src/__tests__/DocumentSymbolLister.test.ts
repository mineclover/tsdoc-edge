/**
 * DocumentSymbolLister Tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DocumentSymbolLister } from '../utilities/DocumentSymbolLister';

describe('DocumentSymbolLister', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-symbol-lister-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Helper to create a managed directory structure
  function createManagedFile(relativePath: string, content: string): void {
    const fullPath = path.join(tempDir, relativePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  describe('constructor', () => {
    it('should create instance with managed directory', () => {
      const lister = new DocumentSymbolLister(tempDir);
      expect(lister).toBeInstanceOf(DocumentSymbolLister);
    });
  });

  describe('listAllSymbols', () => {
    it('should return empty array for non-existent directory', () => {
      const lister = new DocumentSymbolLister('/non-existent-path-12345');
      const symbols = lister.listAllSymbols();
      expect(symbols).toEqual([]);
    });

    it('should return empty array for empty directory', () => {
      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();
      expect(symbols).toEqual([]);
    });

    it('should find document symbol with [[Name]] in H1', () => {
      createManagedFile('test.md', '# [[TestSymbol]]\n\nThis is a test document.');

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('TestSymbol');
      expect(symbols[0].filePath).toBe('test.md');
      expect(symbols[0].category).toBe('root');
    });

    it('should find symbols in subdirectories', () => {
      createManagedFile('features/auth.md', '# [[Authentication]]\n\nUser authentication feature.');
      createManagedFile('concepts/ssot.md', '# [[SSOT]]\n\nSingle Source of Truth principle.');

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols).toHaveLength(2);
      const names = symbols.map(s => s.name);
      expect(names).toContain('Authentication');
      expect(names).toContain('SSOT');
    });

    it('should extract category from directory name', () => {
      createManagedFile('features/my-feature.md', '# [[MyFeature]]\n\nDescription.');

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].category).toBe('features');
    });

    it('should sort symbols alphabetically', () => {
      createManagedFile('z.md', '# [[Zebra]]\n\nZ animal.');
      createManagedFile('a.md', '# [[Apple]]\n\nA fruit.');
      createManagedFile('m.md', '# [[Mango]]\n\nM fruit.');

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].name).toBe('Apple');
      expect(symbols[1].name).toBe('Mango');
      expect(symbols[2].name).toBe('Zebra');
    });

    it('should skip files without H1 [[Symbol]] pattern', () => {
      createManagedFile('no-symbol.md', '# Regular Heading\n\nNo symbol here.');
      createManagedFile('has-symbol.md', '# [[HasSymbol]]\n\nHas symbol.');

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('HasSymbol');
    });

    it('should only process .md files', () => {
      createManagedFile('doc.md', '# [[MarkdownDoc]]\n\nMarkdown file.');
      createManagedFile('other.txt', '# [[TextFile]]\n\nNot markdown.');

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('MarkdownDoc');
    });
  });

  describe('summary extraction', () => {
    it('should extract first paragraph as summary', () => {
      createManagedFile('test.md', `# [[TestSymbol]]

This is the first paragraph of the summary.

This is the second paragraph.`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].summary).toBe('This is the first paragraph of the summary.');
    });

    it('should extract multi-line first paragraph', () => {
      createManagedFile('test.md', `# [[TestSymbol]]

First line of summary.
Second line of summary.
Third line of summary.

Next paragraph.`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].summary).toContain('First line');
      expect(symbols[0].summary).toContain('Second line');
      expect(symbols[0].summary).toContain('Third line');
    });

    it('should limit summary to 3 lines', () => {
      createManagedFile('test.md', `# [[TestSymbol]]

Line 1
Line 2
Line 3
Line 4
Line 5`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].summary).not.toContain('Line 4');
      expect(symbols[0].summary).not.toContain('Line 5');
    });

    it('should stop at next heading', () => {
      createManagedFile('test.md', `# [[TestSymbol]]

Summary before heading.

## Section Heading

Not in summary.`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].summary).toBe('Summary before heading.');
      expect(symbols[0].summary).not.toContain('Section Heading');
    });

    it('should stop at horizontal rule', () => {
      createManagedFile('test.md', `# [[TestSymbol]]

Summary before rule.

---

After rule.`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].summary).toBe('Summary before rule.');
    });

    it('should skip metadata blocks but keep regular blockquotes', () => {
      createManagedFile('test.md', `# [[TestSymbol]]

> **Status**: Draft
> **Category**: Test

> This is the actual summary blockquote.`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].summary).toBe('This is the actual summary blockquote.');
    });

    it('should return default message when no summary', () => {
      createManagedFile('test.md', `# [[TestSymbol]]

## Immediate Section`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].summary).toBe('(No summary available)');
    });
  });

  describe('reference counting', () => {
    it('should count [[Symbol]] references', () => {
      createManagedFile('test.md', `# [[MainSymbol]]

This references [[OtherSymbol]] and [[AnotherSymbol]].

See also [[OtherSymbol]] again.`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      // 4 references: MainSymbol, OtherSymbol (x2), AnotherSymbol
      expect(symbols[0].referenceCount).toBe(4);
    });

    it('should return 0 for files with only H1 symbol', () => {
      createManagedFile('test.md', `# [[OnlySymbol]]

No other references here.`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].referenceCount).toBe(1); // The H1 itself counts
    });
  });

  describe('h1Line', () => {
    it('should record line number of H1', () => {
      createManagedFile('test.md', `---
frontmatter: here
---

# [[TestSymbol]]

Content.`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].h1Line).toBe(5);
    });
  });

  describe('getSymbolsByCategory', () => {
    it('should group symbols by category', () => {
      createManagedFile('features/f1.md', '# [[Feature1]]\n\nA feature.');
      createManagedFile('features/f2.md', '# [[Feature2]]\n\nAnother feature.');
      createManagedFile('concepts/c1.md', '# [[Concept1]]\n\nA concept.');

      const lister = new DocumentSymbolLister(tempDir);
      const byCategory = lister.getSymbolsByCategory();

      expect(byCategory.get('features')).toHaveLength(2);
      expect(byCategory.get('concepts')).toHaveLength(1);
    });

    it('should return empty map for empty directory', () => {
      const lister = new DocumentSymbolLister(tempDir);
      const byCategory = lister.getSymbolsByCategory();

      expect(byCategory.size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle deeply nested directories', () => {
      createManagedFile('a/b/c/d/deep.md', '# [[DeepSymbol]]\n\nVery deep.');

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].name).toBe('DeepSymbol');
      expect(symbols[0].category).toBe('a');
    });

    it('should handle special characters in symbol names', () => {
      createManagedFile('test.md', '# [[My Symbol Name]]\n\nWith spaces.');

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols[0].name).toBe('My Symbol Name');
    });

    it('should handle multiple H1 headers - use first one', () => {
      createManagedFile('test.md', `# [[FirstSymbol]]

Content.

# [[SecondSymbol]]

More content.`);

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('FirstSymbol');
    });

    it('should handle empty file', () => {
      createManagedFile('empty.md', '');

      const lister = new DocumentSymbolLister(tempDir);
      const symbols = lister.listAllSymbols();

      expect(symbols).toHaveLength(0);
    });
  });
});
