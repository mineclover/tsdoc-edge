/**
 * SymbolReferenceUpdater tests
 * @testScenario Find H1 primary definitions
 * @testScenario Find H2 auxiliary definitions
 * @testScenario Find H3 sub-auxiliary definitions
 * @testScenario Find inline references
 * @testScenario Skip code blocks
 * @testScenario Update references with dry run
 * @testScenario Update references with actual changes
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  SymbolReferenceUpdater,
  type SymbolUpdateOptions,
} from '../../utilities/SymbolReferenceUpdater';

describe('SymbolReferenceUpdater', () => {
  let updater: SymbolReferenceUpdater;
  let tempDir: string;

  beforeEach(() => {
    updater = new SymbolReferenceUpdater();
    tempDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'symbol-ref-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('findReferences', () => {
    describe('H1 primary definitions', () => {
      it('should find H1 primary definition', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '# [[OldSymbol]]\n\nSome content');

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(1);
        expect(refs[0].type).toBe('h1-primary');
        expect(refs[0].line).toBe(1);
        expect(refs[0].oldText).toBe('# [[OldSymbol]]');
      });

      it('should not match partial symbol names in H1', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '# [[OldSymbolExtended]]');

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(0);
      });
    });

    describe('H2 auxiliary definitions', () => {
      it('should find H2 auxiliary definition', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '# Title\n\n## [[OldSymbol]]');

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(1);
        expect(refs[0].type).toBe('h2-auxiliary');
        expect(refs[0].line).toBe(3);
      });
    });

    describe('H3 sub-auxiliary definitions', () => {
      it('should find H3 sub-auxiliary definition', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '# Title\n\n### [[OldSymbol]]');

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(1);
        expect(refs[0].type).toBe('h3-sub-auxiliary');
        expect(refs[0].line).toBe(3);
      });
    });

    describe('inline references', () => {
      it('should find inline references', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, 'See [[OldSymbol]] for more info');

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(1);
        expect(refs[0].type).toBe('inline');
        expect(refs[0].oldText).toBe('[[OldSymbol]]');
      });

      it('should find multiple inline references on same line', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, 'See [[OldSymbol]] and [[OldSymbol]] here');

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(2);
        expect(refs.every((r) => r.type === 'inline')).toBe(true);
      });

      it('should find references across multiple lines', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, 'Line 1 [[OldSymbol]]\nLine 2\nLine 3 [[OldSymbol]]');

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(2);
        expect(refs[0].line).toBe(1);
        expect(refs[1].line).toBe(3);
      });
    });

    describe('code block handling', () => {
      it('should skip references inside code blocks', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(
          docPath,
          'Normal [[OldSymbol]]\n```\n[[OldSymbol]]\n```\nAfter [[OldSymbol]]'
        );

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(2);
        expect(refs[0].line).toBe(1);
        expect(refs[1].line).toBe(5);
      });

      it('should handle nested code blocks correctly', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(
          docPath,
          '[[OldSymbol]]\n```\ncode\n```\n[[OldSymbol]]\n```\nmore code\n```\n[[OldSymbol]]'
        );

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(3);
      });
    });

    describe('multiple files', () => {
      it('should find references across multiple files', async () => {
        const doc1 = path.join(tempDir, 'doc1.md');
        const doc2 = path.join(tempDir, 'doc2.md');
        fs.writeFileSync(doc1, '# [[OldSymbol]]');
        fs.writeFileSync(doc2, 'See [[OldSymbol]]');

        const refs = await updater.findReferences('OldSymbol', tempDir);

        expect(refs.length).toBe(2);
        expect(refs.map((r) => r.file).sort()).toEqual([doc1, doc2].sort());
      });
    });

    describe('with newSymbol provided', () => {
      it('should calculate newText for references', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '# [[OldSymbol]]');

        const refs = await updater.findReferences('OldSymbol', tempDir, 'NewSymbol');

        expect(refs[0].newSymbol).toBe('NewSymbol');
        expect(refs[0].newText).toBe('# [[NewSymbol]]');
      });
    });

    describe('edge cases', () => {
      it('should return empty array for non-existent directory', async () => {
        const refs = await updater.findReferences('Symbol', '/non/existent/path');
        expect(refs).toEqual([]);
      });

      it('should skip node_modules directory', async () => {
        const nodeModules = path.join(tempDir, 'node_modules');
        fs.mkdirSync(nodeModules, { recursive: true });
        fs.writeFileSync(path.join(nodeModules, 'doc.md'), '[[OldSymbol]]');

        const refs = await updater.findReferences('OldSymbol', tempDir);
        expect(refs.length).toBe(0);
      });

      it('should skip hidden directories', async () => {
        const hiddenDir = path.join(tempDir, '.hidden');
        fs.mkdirSync(hiddenDir, { recursive: true });
        fs.writeFileSync(path.join(hiddenDir, 'doc.md'), '[[OldSymbol]]');

        const refs = await updater.findReferences('OldSymbol', tempDir);
        expect(refs.length).toBe(0);
      });
    });
  });

  describe('updateReferences', () => {
    describe('dry run mode', () => {
      it('should count references without modifying files', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        const originalContent = '# [[OldSymbol]]\n\nSee [[OldSymbol]]';
        fs.writeFileSync(docPath, originalContent);

        const options: SymbolUpdateOptions = {
          baseDir: tempDir,
          dryRun: true,
        };

        const result = await updater.updateReferences('OldSymbol', 'NewSymbol', options);

        expect(result.totalReferences).toBe(2);
        expect(result.h1Count).toBe(1);
        expect(result.inlineCount).toBe(1);

        const content = fs.readFileSync(docPath, 'utf-8');
        expect(content).toBe(originalContent);
      });
    });

    describe('actual updates', () => {
      it('should update H1 primary definitions', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '# [[OldSymbol]]');

        const options: SymbolUpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
        };

        const result = await updater.updateReferences('OldSymbol', 'NewSymbol', options);

        expect(result.updated).toBe(1);

        const content = fs.readFileSync(docPath, 'utf-8');
        expect(content).toBe('# [[NewSymbol]]');
      });

      it('should update inline references', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, 'See [[OldSymbol]] for details');

        const options: SymbolUpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
        };

        await updater.updateReferences('OldSymbol', 'NewSymbol', options);

        const content = fs.readFileSync(docPath, 'utf-8');
        expect(content).toBe('See [[NewSymbol]] for details');
      });

      it('should update multiple reference types', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '# [[OldSymbol]]\n\nSee [[OldSymbol]] and [[OldSymbol]]');

        const options: SymbolUpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
        };

        const result = await updater.updateReferences('OldSymbol', 'NewSymbol', options);

        expect(result.updated).toBe(3);
        expect(result.filesModified).toContain(docPath);

        const content = fs.readFileSync(docPath, 'utf-8');
        expect(content).toBe('# [[NewSymbol]]\n\nSee [[NewSymbol]] and [[NewSymbol]]');
      });
    });

    describe('selective updates', () => {
      it('should skip H1 updates when updateH1 is false', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '# [[OldSymbol]]\n\n[[OldSymbol]]');

        const options: SymbolUpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
          updateH1: false,
        };

        await updater.updateReferences('OldSymbol', 'NewSymbol', options);

        const content = fs.readFileSync(docPath, 'utf-8');
        expect(content).toBe('# [[OldSymbol]]\n\n[[NewSymbol]]');
      });

      it('should skip inline updates when updateInline is false', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '# [[OldSymbol]]\n\n[[OldSymbol]]');

        const options: SymbolUpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
          updateInline: false,
        };

        await updater.updateReferences('OldSymbol', 'NewSymbol', options);

        const content = fs.readFileSync(docPath, 'utf-8');
        expect(content).toBe('# [[NewSymbol]]\n\n[[OldSymbol]]');
      });
    });

    describe('result counts', () => {
      it('should correctly count different reference types', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(
          docPath,
          '# [[OldSymbol]]\n## [[OldSymbol]]\n### [[OldSymbol]]\n[[OldSymbol]]'
        );

        const options: SymbolUpdateOptions = {
          baseDir: tempDir,
          dryRun: true,
        };

        const result = await updater.updateReferences('OldSymbol', 'NewSymbol', options);

        expect(result.h1Count).toBe(1);
        expect(result.h2Count).toBe(1);
        expect(result.h3Count).toBe(1);
        expect(result.inlineCount).toBe(1);
        expect(result.totalReferences).toBe(4);
      });
    });

    describe('error handling', () => {
      it('should collect errors when file operations fail', async () => {
        const docPath = path.join(tempDir, 'doc.md');
        fs.writeFileSync(docPath, '[[OldSymbol]]');
        fs.chmodSync(docPath, 0o444);

        const options: SymbolUpdateOptions = {
          baseDir: tempDir,
          dryRun: false,
        };

        const result = await updater.updateReferences('OldSymbol', 'NewSymbol', options);

        fs.chmodSync(docPath, 0o644);

        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});
