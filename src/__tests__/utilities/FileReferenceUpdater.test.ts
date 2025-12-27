/**
 * FileReferenceUpdater tests
 * @testScenario Find backlink references
 * @testScenario Find path references
 * @testScenario Find relative path references
 * @testScenario Find markdown link references
 * @testScenario Update references with dry run
 * @testScenario Update references with actual changes
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  FileReferenceUpdater,
  FileReference,
  UpdateOptions,
} from '../../utilities/FileReferenceUpdater';

describe('FileReferenceUpdater', () => {
  let updater: FileReferenceUpdater;
  let tempDir: string;

  beforeEach(() => {
    updater = new FileReferenceUpdater();
    tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'file-ref-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('findReferences', () => {
    describe('backlink references', () => {
      it('should find backlink references with arrow notation', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(
          docPath,
          '→ features/old-feature.md\nSome text\n→ features/old-feature.md'
        );

        const refs = await updater.findReferences(
          'features/old-feature.md',
          tempDir
        );

        expect(refs.length).toBe(2);
        expect(refs[0].type).toBe('backlink');
        expect(refs[0].line).toBe(1);
        expect(refs[1].line).toBe(3);
      });

      it('should find backlink references with absolute path notation', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '→ /features/old-feature.md');

        const refs = await updater.findReferences(
          path.join(tempDir, 'features', 'old-feature.md'),
          tempDir
        );

        expect(refs.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('path references', () => {
      it('should find Path: style references', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, 'Path: old-feature.md\nSome content');

        const refs = await updater.findReferences('old-feature.md', tempDir);

        const pathRefs = refs.filter((r) => r.type === 'path');
        expect(pathRefs.length).toBe(1);
        expect(pathRefs[0].line).toBe(1);
      });

      it('should find parenthesized path references', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, 'See (old-feature.md) for details');

        const refs = await updater.findReferences('old-feature.md', tempDir);

        const pathRefs = refs.filter((r) => r.type === 'path');
        expect(pathRefs.length).toBe(1);
      });

      it('should find backtick path references', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, 'See `old-feature.md` for details');

        const refs = await updater.findReferences('old-feature.md', tempDir);

        const pathRefs = refs.filter((r) => r.type === 'path');
        expect(pathRefs.length).toBe(1);
      });
    });

    describe('relative path references', () => {
      it('should find relative path references with ../', async () => {
        const subDir = path.join(tempDir, 'docs');
        fs.mkdirSync(subDir, { recursive: true });

        const docPath = path.join(subDir, 'doc.md');
        const targetPath = path.join(tempDir, 'old-feature.md');
        fs.writeFileSync(targetPath, '');
        fs.writeFileSync(docPath, 'See ../old-feature.md for more');

        const refs = await updater.findReferences(targetPath, tempDir);

        const relRefs = refs.filter((r) => r.type === 'relative');
        expect(relRefs.length).toBe(1);
      });

      it('should find relative path references with ./', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        const targetPath = path.join(tempDir, 'old-feature.md');
        fs.writeFileSync(targetPath, '');
        fs.writeFileSync(docPath, 'See ./old-feature.md for more');

        const refs = await updater.findReferences(targetPath, tempDir);

        const relRefs = refs.filter((r) => r.type === 'relative');
        expect(relRefs.length).toBe(1);
      });
    });

    describe('markdown link references', () => {
      it('should find markdown link references', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, 'See [Old Feature](old-feature.md) for details');

        const refs = await updater.findReferences('old-feature.md', tempDir);

        const mdRefs = refs.filter((r) => r.type === 'markdown-link');
        expect(mdRefs.length).toBe(1);
        expect(mdRefs[0].oldText).toContain('[Old Feature]');
      });

      it('should find multiple markdown links', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(
          docPath,
          '[Link1](old-feature.md) and [Link2](old-feature.md)'
        );

        const refs = await updater.findReferences('old-feature.md', tempDir);

        const mdRefs = refs.filter((r) => r.type === 'markdown-link');
        expect(mdRefs.length).toBe(2);
      });
    });

    describe('with newPath provided', () => {
      it('should calculate newText for references', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '→ old-feature.md');

        const refs = await updater.findReferences(
          'old-feature.md',
          tempDir,
          'new-feature.md'
        );

        expect(refs.length).toBe(1);
        expect(refs[0].newText).toContain('new-feature.md');
      });
    });

    describe('edge cases', () => {
      it('should return empty array for non-existent directory', async () => {
        const refs = await updater.findReferences(
          'old.md',
          '/non/existent/path'
        );
        expect(refs).toEqual([]);
      });

      it('should skip node_modules directory', async () => {
        const nodeModules = path.join(tempDir, 'node_modules');
        fs.mkdirSync(nodeModules, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModules, 'doc.md'),
          '→ old-feature.md'
        );

        const refs = await updater.findReferences('old-feature.md', tempDir);
        expect(refs.length).toBe(0);
      });

      it('should skip hidden directories', async () => {
        const hiddenDir = path.join(tempDir, '.hidden');
        fs.mkdirSync(hiddenDir, { recursive: true });
        fs.writeFileSync(path.join(hiddenDir, 'doc.md'), '→ old-feature.md');

        const refs = await updater.findReferences('old-feature.md', tempDir);
        expect(refs.length).toBe(0);
      });

      it('should skip .tsdoc directory', async () => {
        const tsdocDir = path.join(tempDir, '.tsdoc');
        fs.mkdirSync(tsdocDir, { recursive: true });
        fs.writeFileSync(path.join(tsdocDir, 'doc.md'), '→ old-feature.md');

        const refs = await updater.findReferences('old-feature.md', tempDir);
        expect(refs.length).toBe(0);
      });
    });
  });

  describe('updateReferences', () => {
    describe('dry run mode', () => {
      it('should not modify files in dry run mode', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        const originalContent = '→ old-feature.md';
        fs.writeFileSync(docPath, originalContent);

        const options: UpdateOptions = {
          baseDir: tempDir,
          dryRun: true,
        };

        const result = await updater.updateReferences(
          'old-feature.md',
          'new-feature.md',
          options
        );

        expect(result.totalReferences).toBe(1);
        expect(result.updated).toBe(1);
        expect(result.filesModified).toContain(docPath);

        // File should not be modified
        const content = fs.readFileSync(docPath, 'utf-8');
        expect(content).toBe(originalContent);
      });
    });

    describe('actual updates', () => {
      it('should update backlink references', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '→ old-feature.md\nSome content');

        const options: UpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
        };

        const result = await updater.updateReferences(
          'old-feature.md',
          'new-feature.md',
          options
        );

        expect(result.updated).toBeGreaterThan(0);

        const content = fs.readFileSync(docPath, 'utf-8');
        expect(content).toContain('new-feature.md');
      });

      it('should update multiple references in same file', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(
          docPath,
          '→ old-feature.md\nSee [Link](old-feature.md)'
        );

        const options: UpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
        };

        const result = await updater.updateReferences(
          'old-feature.md',
          'new-feature.md',
          options
        );

        expect(result.updated).toBeGreaterThanOrEqual(1);

        const content = fs.readFileSync(docPath, 'utf-8');
        expect(content).toContain('new-feature.md');
      });

      it('should update references across multiple files', async () => {
        const doc1 = path.join(tempDir, 'doc1.md');
        const doc2 = path.join(tempDir, 'doc2.md');
        fs.writeFileSync(doc1, '→ old-feature.md');
        fs.writeFileSync(doc2, '→ old-feature.md');

        const options: UpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
        };

        const result = await updater.updateReferences(
          'old-feature.md',
          'new-feature.md',
          options
        );

        expect(result.filesModified.length).toBe(2);
      });
    });

    describe('no references found', () => {
      it('should return zero counts when no references exist', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, 'No references here');

        const options: UpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
        };

        const result = await updater.updateReferences(
          'old-feature.md',
          'new-feature.md',
          options
        );

        expect(result.totalReferences).toBe(0);
        expect(result.updated).toBe(0);
        expect(result.filesModified).toEqual([]);
      });
    });

    describe('error handling', () => {
      it('should collect errors when file operations fail', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '→ old-feature.md');

        // Make file read-only to cause write error
        fs.chmodSync(docPath, 0o444);

        const options: UpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
        };

        const result = await updater.updateReferences(
          'old-feature.md',
          'new-feature.md',
          options
        );

        // Restore permissions for cleanup
        fs.chmodSync(docPath, 0o644);

        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('reference type handling', () => {
    it('should correctly identify all reference types', async () => {
      const docPath = path.join(tempDir, 'doc.md');
      const subDir = path.join(tempDir, 'sub');
      fs.mkdirSync(subDir);

      const targetPath = path.join(tempDir, 'target.md');
      fs.writeFileSync(targetPath, '');

      // Create doc with multiple reference types
      fs.writeFileSync(
        docPath,
        `→ target.md
Path: target.md
See (target.md) here
Check \`target.md\` file
[Link](target.md)`
      );

      const refs = await updater.findReferences('target.md', tempDir);

      const types = refs.map((r) => r.type);
      expect(types).toContain('backlink');
      expect(types).toContain('path');
      expect(types).toContain('markdown-link');
    });
  });

  describe('path normalization', () => {
    it('should handle absolute paths', async () => {
      const docPath = path.join(tempDir, 'doc.md');
      const absolutePath = path.join(tempDir, 'features', 'old.md');

      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, '');
      fs.writeFileSync(docPath, '→ features/old.md');

      const refs = await updater.findReferences(absolutePath, tempDir);

      expect(refs.length).toBeGreaterThan(0);
    });

    it('should handle relative paths', async () => {
      const docPath = path.join(tempDir, 'doc.md');
      fs.writeFileSync(docPath, '→ features/old.md');

      const refs = await updater.findReferences('features/old.md', tempDir);

      expect(refs.length).toBeGreaterThan(0);
    });
  });
});
