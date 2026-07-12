/**
 * ReferenceUpdater tests
 * @testScenario Find backlink references
 * @testScenario Find path references
 * @testScenario Find markdown link references
 * @testScenario Find relative path references
 * @testScenario Update references with new path
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ReferenceUpdater } from '../../utilities/ReferenceUpdater';

describe('ReferenceUpdater', () => {
  let tempDir: string;
  let managedDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ref-updater-test-'));
    managedDir = path.join(tempDir, 'managed');
    fs.mkdirSync(managedDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('findReferences', () => {
    describe('backlink references', () => {
      it('should find backlink references with arrow notation', () => {
        const updater = new ReferenceUpdater(managedDir);
        const docPath = path.join(managedDir, 'doc.md');
        const targetPath = path.join(managedDir, 'features', 'old-feature.md');

        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, '');
        fs.writeFileSync(docPath, '→ features/old-feature.md\nSome text');

        const refs = updater.findReferences('features/old-feature.md');

        const backlinkRefs = refs.filter((r) => r.type === 'backlink');
        expect(backlinkRefs.length).toBeGreaterThan(0);
      });
    });

    describe('path references', () => {
      it('should find Path: style references', () => {
        const updater = new ReferenceUpdater(managedDir);
        const docPath = path.join(managedDir, 'doc.md');

        fs.writeFileSync(docPath, 'Path: old-feature.md\nContent');

        const refs = updater.findReferences('old-feature.md');

        const pathRefs = refs.filter((r) => r.type === 'path');
        expect(pathRefs.length).toBe(1);
      });

      it('should find backtick path references', () => {
        const updater = new ReferenceUpdater(managedDir);
        const docPath = path.join(managedDir, 'doc.md');

        fs.writeFileSync(docPath, 'See `old-feature.md` for details');

        const refs = updater.findReferences('old-feature.md');

        const pathRefs = refs.filter((r) => r.type === 'path');
        expect(pathRefs.length).toBe(1);
      });

      it('should find parenthesized path references', () => {
        const updater = new ReferenceUpdater(managedDir);
        const docPath = path.join(managedDir, 'doc.md');

        fs.writeFileSync(docPath, 'See (old-feature.md) for more');

        const refs = updater.findReferences('old-feature.md');

        const pathRefs = refs.filter((r) => r.type === 'path');
        expect(pathRefs.length).toBe(1);
      });
    });

    describe('markdown link references', () => {
      it('should find markdown link references', () => {
        const updater = new ReferenceUpdater(managedDir);
        const docPath = path.join(managedDir, 'doc.md');
        const targetPath = path.join(managedDir, 'old-feature.md');

        fs.writeFileSync(targetPath, '');
        fs.writeFileSync(docPath, 'See [Feature](./old-feature.md) here');

        const refs = updater.findReferences('old-feature.md');

        const mdRefs = refs.filter((r) => r.type === 'markdown-link');
        expect(mdRefs.length).toBe(1);
      });

      it('should find multiple markdown links', () => {
        const updater = new ReferenceUpdater(managedDir);
        const docPath = path.join(managedDir, 'doc.md');
        const targetPath = path.join(managedDir, 'old-feature.md');

        fs.writeFileSync(targetPath, '');
        fs.writeFileSync(docPath, '[Link1](./old-feature.md) and [Link2](./old-feature.md)');

        const refs = updater.findReferences('old-feature.md');

        const mdRefs = refs.filter((r) => r.type === 'markdown-link');
        expect(mdRefs.length).toBe(2);
      });
    });

    describe('relative path references', () => {
      it('should find relative path references with ../', () => {
        const updater = new ReferenceUpdater(managedDir);
        const subDir = path.join(managedDir, 'sub');
        fs.mkdirSync(subDir, { recursive: true });

        const docPath = path.join(subDir, 'doc.md');
        const targetPath = path.join(managedDir, 'old-feature.md');

        fs.writeFileSync(targetPath, '');
        fs.writeFileSync(docPath, 'See ../old-feature.md here');

        const refs = updater.findReferences('old-feature.md');

        const relRefs = refs.filter((r) => r.type === 'relative');
        expect(relRefs.length).toBe(1);
      });

      it('should find relative path references with ./', () => {
        const updater = new ReferenceUpdater(managedDir);
        const docPath = path.join(managedDir, 'doc.md');
        const targetPath = path.join(managedDir, 'old-feature.md');

        fs.writeFileSync(targetPath, '');
        fs.writeFileSync(docPath, 'See ./old-feature.md here');

        const refs = updater.findReferences('old-feature.md');

        const relRefs = refs.filter((r) => r.type === 'relative');
        expect(relRefs.length).toBe(1);
      });
    });

    describe('path matching', () => {
      it('should match by basename', () => {
        const updater = new ReferenceUpdater(managedDir);
        const docPath = path.join(managedDir, 'doc.md');
        const targetPath = path.join(managedDir, 'features', 'old-feature.md');

        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, '');
        fs.writeFileSync(docPath, 'Path: old-feature.md');

        const refs = updater.findReferences('features/old-feature.md');

        expect(refs.length).toBeGreaterThan(0);
      });

      it('should match absolute paths', () => {
        const updater = new ReferenceUpdater(managedDir);
        const docPath = path.join(managedDir, 'doc.md');
        const targetPath = path.join(managedDir, 'old-feature.md');

        fs.writeFileSync(targetPath, '');
        fs.writeFileSync(docPath, `→ ${targetPath}`);

        const refs = updater.findReferences(targetPath);

        expect(refs.length).toBeGreaterThan(0);
      });
    });

    describe('subdirectories', () => {
      it('should find references in subdirectories', () => {
        const updater = new ReferenceUpdater(managedDir);
        const subDir = path.join(managedDir, 'sub1', 'sub2');
        fs.mkdirSync(subDir, { recursive: true });

        const docPath = path.join(subDir, 'doc.md');
        fs.writeFileSync(docPath, '→ old-feature.md');

        const refs = updater.findReferences('old-feature.md');

        expect(refs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('updateReferences', () => {
    it('should update backlink references', () => {
      const updater = new ReferenceUpdater(managedDir);
      const docPath = path.join(managedDir, 'doc.md');

      fs.writeFileSync(docPath, '→ old-feature.md');

      const refs = updater.findReferences('old-feature.md');
      updater.updateReferences(refs, 'new-feature.md');

      const content = fs.readFileSync(docPath, 'utf-8');
      expect(content).toContain('new-feature.md');
    });

    it('should update path references', () => {
      const updater = new ReferenceUpdater(managedDir);
      const docPath = path.join(managedDir, 'doc.md');

      fs.writeFileSync(docPath, 'Path: old-feature.md');

      const refs = updater.findReferences('old-feature.md');
      updater.updateReferences(refs, 'new-feature.md');

      const content = fs.readFileSync(docPath, 'utf-8');
      expect(content).toContain('new-feature.md');
    });

    it('should update markdown link references', () => {
      const updater = new ReferenceUpdater(managedDir);
      const docPath = path.join(managedDir, 'doc.md');
      const targetPath = path.join(managedDir, 'old-feature.md');

      fs.writeFileSync(targetPath, '');
      fs.writeFileSync(docPath, '[Link](./old-feature.md)');

      const refs = updater.findReferences('old-feature.md');
      updater.updateReferences(refs, 'new-feature.md');

      const content = fs.readFileSync(docPath, 'utf-8');
      expect(content).toContain('new-feature.md');
    });

    it('should update multiple references in same file', () => {
      const updater = new ReferenceUpdater(managedDir);
      const docPath = path.join(managedDir, 'doc.md');

      fs.writeFileSync(docPath, '→ old-feature.md\nPath: old-feature.md\n`old-feature.md`');

      const refs = updater.findReferences('old-feature.md');
      updater.updateReferences(refs, 'new-feature.md');

      const content = fs.readFileSync(docPath, 'utf-8');
      const matches = content.match(/new-feature\.md/g);
      expect(matches?.length).toBeGreaterThanOrEqual(2);
    });

    it('should update references across multiple files', () => {
      const updater = new ReferenceUpdater(managedDir);
      const doc1 = path.join(managedDir, 'doc1.md');
      const doc2 = path.join(managedDir, 'doc2.md');

      fs.writeFileSync(doc1, '→ old-feature.md');
      fs.writeFileSync(doc2, '→ old-feature.md');

      const refs = updater.findReferences('old-feature.md');
      updater.updateReferences(refs, 'new-feature.md');

      const content1 = fs.readFileSync(doc1, 'utf-8');
      const content2 = fs.readFileSync(doc2, 'utf-8');

      expect(content1).toContain('new-feature.md');
      expect(content2).toContain('new-feature.md');
    });

    it('should calculate correct relative paths for markdown links', () => {
      const updater = new ReferenceUpdater(managedDir);
      const subDir = path.join(managedDir, 'sub');
      fs.mkdirSync(subDir, { recursive: true });

      const docPath = path.join(subDir, 'doc.md');
      const targetPath = path.join(managedDir, 'old-feature.md');

      fs.writeFileSync(targetPath, '');
      fs.writeFileSync(docPath, '[Link](../old-feature.md)');

      const refs = updater.findReferences('old-feature.md');

      const newDir = path.join(managedDir, 'features');
      fs.mkdirSync(newDir, { recursive: true });

      updater.updateReferences(refs, 'features/new-feature.md');

      const content = fs.readFileSync(docPath, 'utf-8');
      expect(content).toContain('new-feature.md');
    });
  });

  describe('constructor', () => {
    it('should use default managed directory', () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      fs.mkdirSync(path.join(tempDir, 'managed'), { recursive: true });
      const updater = new ReferenceUpdater();

      // Should not throw
      const refs = updater.findReferences('nonexistent.md');
      expect(refs).toEqual([]);

      process.chdir(originalCwd);
    });

    it('should use custom managed directory', () => {
      const customDir = path.join(tempDir, 'custom');
      fs.mkdirSync(customDir, { recursive: true });

      const updater = new ReferenceUpdater(customDir);
      const docPath = path.join(customDir, 'doc.md');
      fs.writeFileSync(docPath, '→ test.md');

      const refs = updater.findReferences('test.md');
      expect(refs.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty files', () => {
      const updater = new ReferenceUpdater(managedDir);
      const docPath = path.join(managedDir, 'empty.md');
      fs.writeFileSync(docPath, '');

      const refs = updater.findReferences('test.md');
      expect(refs).toEqual([]);
    });

    it('should handle files with no matches', () => {
      const updater = new ReferenceUpdater(managedDir);
      const docPath = path.join(managedDir, 'doc.md');
      fs.writeFileSync(docPath, 'No references here');

      const refs = updater.findReferences('test.md');
      expect(refs).toEqual([]);
    });

    it('should preserve other content when updating', () => {
      const updater = new ReferenceUpdater(managedDir);
      const docPath = path.join(managedDir, 'doc.md');
      const originalContent = 'Header\n\n→ old-feature.md\n\nFooter';
      fs.writeFileSync(docPath, originalContent);

      const refs = updater.findReferences('old-feature.md');
      updater.updateReferences(refs, 'new-feature.md');

      const content = fs.readFileSync(docPath, 'utf-8');
      expect(content).toContain('Header');
      expect(content).toContain('Footer');
      expect(content).toContain('new-feature.md');
    });
  });
});
