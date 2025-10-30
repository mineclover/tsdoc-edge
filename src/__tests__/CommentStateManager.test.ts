/**
 * CommentStateManager tests
 * @public
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommentStateManager } from '../fold/CommentStateManager';

describe('CommentStateManager', () => {
  let manager: CommentStateManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '../../temp-test-state-manager');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    manager = new CommentStateManager(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('exportFile', () => {
    it('should export a TypeScript file to markdown', () => {
      const tsFile = path.join(tempDir, 'test.ts');
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      const markdownPath = manager.exportFile(tsFile);

      expect(fs.existsSync(markdownPath)).toBe(true);
      expect(markdownPath).toContain('.md');
    });
  });

  describe('getStatus', () => {
    it('should return status for non-existent file', () => {
      const status = manager.getStatus('/nonexistent/file.ts');

      expect(status.totalComments).toBe(0);
      expect(status.lastUpdated).toBe('never');
    });

    it('should return status for exported file', () => {
      const tsFile = path.join(tempDir, 'status.ts');
      const sourceCode = `/**
 * Test
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);
      const status = manager.getStatus(tsFile);

      expect(status.totalComments).toBeGreaterThan(0);
      expect(status.lastUpdated).not.toBe('never');
    });
  });

  describe('getAllStatus', () => {
    it('should return empty array when no files exported', () => {
      const statuses = manager.getAllStatus();

      expect(statuses).toEqual([]);
    });

    it('should return statuses for all exported files', () => {
      const tsFile1 = path.join(tempDir, 'file1.ts');
      const tsFile2 = path.join(tempDir, 'file2.ts');

      fs.writeFileSync(tsFile1, '/** Test 1 */\nexport function test1(): void {}', 'utf-8');
      fs.writeFileSync(tsFile2, '/** Test 2 */\nexport function test2(): void {}', 'utf-8');

      manager.exportFile(tsFile1);
      manager.exportFile(tsFile2);

      const statuses = manager.getAllStatus();

      expect(statuses).toHaveLength(2);
    });
  });

  describe('collapse', () => {
    it('should collapse comments in a file', () => {
      const tsFile = path.join(tempDir, 'collapse.ts');
      const sourceCode = `/**
 * Long comment with multiple lines
 * This is a detailed description
 * @param x - Parameter
 * @returns Result
 * @public
 */
export function test(x: number): number {
  return x;
}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);
      manager.collapse(tsFile, { minLines: 2 });

      const status = manager.getStatus(tsFile);
      expect(status.collapsedComments).toBeGreaterThan(0);
    });
  });

  describe('expand', () => {
    it('should expand comments in a file', () => {
      const tsFile = path.join(tempDir, 'expand.ts');
      const sourceCode = `/**
 * Test
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);
      manager.collapse(tsFile);
      manager.expand(tsFile, { all: true });

      const status = manager.getStatus(tsFile);
      expect(status.expandedComments).toBe(status.totalComments);
    });

    it('should throw error for non-exported file', () => {
      expect(() => manager.expand('/nonexistent.ts')).toThrow();
    });
  });

  describe('exportAll', () => {
    it('should export all TypeScript files in a directory', () => {
      const file1 = path.join(tempDir, 'src', 'file1.ts');
      const file2 = path.join(tempDir, 'src', 'file2.ts');

      fs.mkdirSync(path.dirname(file1), { recursive: true });
      fs.writeFileSync(file1, '/** Test 1 */\nexport function test1(): void {}', 'utf-8');
      fs.writeFileSync(file2, '/** Test 2 */\nexport function test2(): void {}', 'utf-8');

      const result = manager.exportAll(path.join(tempDir, 'src'));

      expect(result.filesExported).toBe(2);
      expect(result.commentsExported).toBeGreaterThan(0);
    });
  });

  describe('importFile', () => {
    it('should throw error when markdown file not found', () => {
      expect(() => manager.importFile('/nonexistent.ts')).toThrow();
    });
  });
});
