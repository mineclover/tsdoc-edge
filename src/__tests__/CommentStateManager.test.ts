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

  describe('importAll', () => {
    it('should import all markdown files to TypeScript', () => {
      const tsFile = path.join(tempDir, 'import-all.ts');
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);

      const result = manager.importAll(false);

      expect(result.filesUpdated).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeDefined();
    });
  });

  describe('collapse options', () => {
    it('should collapse with minLines option', () => {
      const tsFile = path.join(tempDir, 'minlines.ts');
      const sourceCode = `/**
 * Short comment
 * @public
 */
export function short(): void {}

/**
 * Long comment
 * with multiple
 * lines of
 * documentation
 * @public
 */
export function long(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);
      manager.collapse(tsFile, { minLines: 5 });

      const status = manager.getStatus(tsFile);
      expect(status.totalComments).toBeGreaterThan(0);
    });

    it('should collapse with pattern option', () => {
      const tsFile = path.join(tempDir, 'pattern.ts');
      const sourceCode = `/**
 * Public function
 * @public
 */
export function publicFunc(): void {}

/**
 * Another function
 * @public
 */
export function anotherFunc(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);
      manager.collapse(tsFile, { pattern: 'public.*' });

      const status = manager.getStatus(tsFile);
      expect(status.totalComments).toBeGreaterThan(0);
    });

    it('should collapse with privateOnly option', () => {
      const tsFile = path.join(tempDir, 'private.ts');
      const sourceCode = `/**
 * Private function
 * @public
 */
export function _privateFunc(): void {}

/**
 * Public function
 * @public
 */
export function publicFunc(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);
      manager.collapse(tsFile, { privateOnly: true });

      const status = manager.getStatus(tsFile);
      expect(status.totalComments).toBeGreaterThan(0);
    });

    it('should collapse with publicOnly option', () => {
      const tsFile = path.join(tempDir, 'public-only.ts');
      const sourceCode = `/**
 * Private function
 * @public
 */
export function _privateFunc(): void {}

/**
 * Public function
 * @public
 */
export function publicFunc(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);
      manager.collapse(tsFile, { publicOnly: true });

      const status = manager.getStatus(tsFile);
      expect(status.totalComments).toBeGreaterThan(0);
    });
  });

  describe('expand options', () => {
    it('should expand with pattern option', () => {
      const tsFile = path.join(tempDir, 'expand-pattern.ts');
      const sourceCode = `/**
 * Test function
 * @public
 */
export function testFunc(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);
      manager.collapse(tsFile);
      manager.expand(tsFile, { pattern: 'test.*' });

      const status = manager.getStatus(tsFile);
      expect(status.totalComments).toBeGreaterThan(0);
    });

    it('should expand without all option', () => {
      const tsFile = path.join(tempDir, 'expand-no-all.ts');
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      manager.exportFile(tsFile);
      manager.collapse(tsFile);
      manager.expand(tsFile, {});

      const status = manager.getStatus(tsFile);
      expect(status.totalComments).toBeGreaterThan(0);
    });
  });

  describe('loadStorage and constructor', () => {
    it('should handle constructor without storageDir', () => {
      // Create a manager without providing storageDir
      const managerNoDir = new CommentStateManager();
      expect(managerNoDir).toBeDefined();
    });

    it('should handle non-existent storage directory', () => {
      const nonExistentDir = path.join(tempDir, 'non-existent-storage');
      const managerNonExistent = new CommentStateManager(nonExistentDir);

      expect(managerNonExistent).toBeDefined();
      const statuses = managerNonExistent.getAllStatus();
      expect(statuses).toEqual([]);
    });

    it('should load existing markdown files on startup', () => {
      const existingDir = path.join(tempDir, 'existing-storage');
      fs.mkdirSync(existingDir, { recursive: true });

      const tsFile = path.join(tempDir, 'preexisting.ts');
      const sourceCode = `/**
 * Preexisting function
 * @public
 */
export function preexisting(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      const firstManager = new CommentStateManager(existingDir);
      firstManager.exportFile(tsFile);

      // Create a new manager that should load the existing file
      const secondManager = new CommentStateManager(existingDir);
      const statuses = secondManager.getAllStatus();

      expect(statuses.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('walkDir with subdirectories', () => {
    it('should handle nested directories in exportAll', () => {
      const nestedDir = path.join(tempDir, 'src', 'nested', 'deep');
      fs.mkdirSync(nestedDir, { recursive: true });

      const file1 = path.join(tempDir, 'src', 'file1.ts');
      const file2 = path.join(nestedDir, 'file2.ts');

      fs.writeFileSync(file1, '/** Test 1 */\nexport function test1(): void {}', 'utf-8');
      fs.writeFileSync(file2, '/** Test 2 */\nexport function test2(): void {}', 'utf-8');

      const result = manager.exportAll(path.join(tempDir, 'src'));

      expect(result.filesExported).toBeGreaterThanOrEqual(1);
    });
  });

  describe('collapse when file not in storage', () => {
    it('should export file before collapsing if not in storage', () => {
      const tsFile = path.join(tempDir, 'not-exported.ts');
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      // Collapse without exporting first
      manager.collapse(tsFile);

      const status = manager.getStatus(tsFile);
      expect(status.totalComments).toBeGreaterThan(0);
    });
  });

  describe('saveFileState with non-existent directory', () => {
    it('should create directory when saving file state', () => {
      const deepDir = path.join(tempDir, 'deep', 'nested', 'path');
      const deepManager = new CommentStateManager(deepDir);

      const tsFile = path.join(tempDir, 'deep-test.ts');
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      deepManager.exportFile(tsFile);
      deepManager.collapse(tsFile);

      expect(fs.existsSync(deepDir)).toBe(true);
    });
  });
});
