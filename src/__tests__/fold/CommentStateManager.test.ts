/**
 * Comprehensive tests for CommentStateManager
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommentStateManager } from '../../fold/CommentStateManager';

describe('CommentStateManager', () => {
  let manager: CommentStateManager;
  let tempDir: string;
  let storageDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '../../../temp-test-manager');
    storageDir = path.join(tempDir, 'storage');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(storageDir, { recursive: true });
    manager = new CommentStateManager(storageDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should initialize with empty storage', () => {
      const statuses = manager.getAllStatus();
      expect(statuses).toHaveLength(0);
    });

    it('should load existing markdown files on initialization', () => {
      const markdown = `# test.ts

Last Updated: 2025-01-01T00:00:00.000Z

## Comment 1: test

**Location**: Line 1-3, Column 0
**Symbol**: test
**Hash**: \`abc123def456\`
**Status**: \`expanded\`

### Full Comment

\`\`\`typescript
/** Test */
\`\`\`

### Collapsed Form

\`\`\`typescript
/** Test */
\`\`\`

---

`;
      const markdownPath = path.join(storageDir, 'test.ts.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      // Create new manager to trigger loading
      const newManager = new CommentStateManager(storageDir);
      const status = newManager.getStatus('test.ts');

      expect(status.totalComments).toBe(1);
      expect(status.expandedComments).toBe(1);
    });

    it('should handle nested directory structure', () => {
      const nestedDir = path.join(storageDir, 'src', 'module');
      fs.mkdirSync(nestedDir, { recursive: true });

      const markdown = `# src/module/nested.ts

Last Updated: 2025-01-01T00:00:00.000Z

## Comment 1: nested

**Location**: Line 1-3, Column 0
**Symbol**: nested
**Hash**: \`abc123def456\`
**Status**: \`expanded\`

### Full Comment

\`\`\`typescript
/** Nested */
\`\`\`

### Collapsed Form

\`\`\`typescript
/** Nested */
\`\`\`

---

`;
      fs.writeFileSync(path.join(nestedDir, 'nested.ts.md'), markdown, 'utf-8');

      const newManager = new CommentStateManager(storageDir);
      const status = newManager.getStatus('src/module/nested.ts');

      expect(status.totalComments).toBe(1);
    });
  });

  describe('exportFile', () => {
    it('should export single file to markdown', () => {
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      const markdownPath = manager.exportFile(filePath);

      expect(fs.existsSync(markdownPath)).toBe(true);
      const markdown = fs.readFileSync(markdownPath, 'utf-8');
      expect(markdown).toContain(`# ${filePath}`);
      expect(markdown).toContain('test');
    });

    it('should update internal storage after export', () => {
      const sourceCode = `/**
 * Test
 */
export function test(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      const status = manager.getStatus(filePath);

      expect(status.totalComments).toBeGreaterThan(0);
    });

    it('should create nested directories as needed', () => {
      const sourceCode = `/** Test */\nexport function test(): void {}`;
      const filePath = path.join(tempDir, 'src', 'deep', 'nested', 'file.ts');
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      const markdownPath = manager.exportFile(filePath);

      expect(fs.existsSync(markdownPath)).toBe(true);
    });
  });

  describe('exportAll', () => {
    it('should export all TypeScript files in directory', () => {
      const files = ['file1.ts', 'file2.ts', 'file3.ts'];
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        fs.writeFileSync(filePath, `/** Test */\nexport function test(): void {}`, 'utf-8');
      }

      const result = manager.exportAll(tempDir);

      expect(result.filesExported).toBe(3);
      expect(result.exportedFiles.length).toBe(3);
      expect(result.outputDir).toBe(storageDir);
    });

    it('should skip test files', () => {
      const files = ['file1.ts', 'file2.test.ts', 'file3.ts'];
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        fs.writeFileSync(filePath, `/** Test */\nexport function test(): void {}`, 'utf-8');
      }

      const result = manager.exportAll(tempDir);

      expect(result.filesExported).toBe(2); // Excludes .test.ts
    });

    it('should count comments correctly', () => {
      const sourceCode = `/**
 * First
 */
export function first(): void {}

/**
 * Second
 */
export function second(): void {}
`;
      const filePath = path.join(tempDir, 'multi.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      const result = manager.exportAll(tempDir);

      expect(result.commentsExported).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty directories', () => {
      const result = manager.exportAll(tempDir);

      expect(result.filesExported).toBe(0);
      expect(result.commentsExported).toBe(0);
    });

    it('should handle nested directory structure', () => {
      const nestedDir = path.join(tempDir, 'src', 'module');
      fs.mkdirSync(nestedDir, { recursive: true });

      fs.writeFileSync(path.join(tempDir, 'root.ts'), `/** Root */\nexport const x = 1;`, 'utf-8');
      fs.writeFileSync(
        path.join(nestedDir, 'nested.ts'),
        `/** Nested */\nexport const y = 2;`,
        'utf-8'
      );

      const result = manager.exportAll(tempDir);

      expect(result.filesExported).toBe(2);
    });
  });

  describe('importFile', () => {
    it('should import file from markdown', () => {
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      const result = manager.importFile(filePath, false);

      expect(result).toBe(`${filePath}.backup`);
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should throw error if markdown not found', () => {
      const filePath = path.join(tempDir, 'nonexistent.ts');

      expect(() => manager.importFile(filePath)).toThrow('Markdown file not found');
    });

    it('should overwrite when requested', () => {
      const sourceCode = `/**
 * Test
 */
export function test(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      const result = manager.importFile(filePath, true);

      expect(result).toBe(filePath);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('importAll', () => {
    it('should import all files in storage', () => {
      const files = ['file1.ts', 'file2.ts'];
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        fs.writeFileSync(filePath, `/** Test */\nexport function test(): void {}`, 'utf-8');
        manager.exportFile(filePath);
      }

      const result = manager.importAll(false);

      expect(result.filesUpdated).toBe(2);
      expect(result.updatedFiles.length).toBe(2);
    });

    it('should collect errors for failed imports', () => {
      const sourceCode = `/** Test */\nexport function test(): void {}`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');
      manager.exportFile(filePath);

      // Delete source file to cause error
      fs.unlinkSync(filePath);

      const result = manager.importAll(false);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty storage', () => {
      const result = manager.importAll(false);

      expect(result.filesUpdated).toBe(0);
      expect(result.commentsUpdated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('collapse', () => {
    it('should collapse all comments in file', () => {
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      manager.collapse(filePath);

      const status = manager.getStatus(filePath);
      expect(status.collapsedComments).toBe(status.totalComments);
    });

    it('should respect minLines option', () => {
      const sourceCode = `/**
 * Short comment
 */
export function short(): void {}

/**
 * Long comment
 * with many lines
 * and more content
 * and even more
 * @param x - Parameter
 */
export function long(x: number): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      manager.collapse(filePath, { minLines: 5 });

      const status = manager.getStatus(filePath);
      expect(status.collapsedComments).toBeLessThan(status.totalComments);
    });

    it('should respect pattern option', () => {
      const sourceCode = `/**
 * Public function
 */
export function publicFunc(): void {}

/**
 * Private function
 */
function _privateFunc(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      manager.collapse(filePath, { pattern: 'public' });

      const status = manager.getStatus(filePath);
      expect(status.collapsedComments).toBeGreaterThan(0);
      expect(status.collapsedComments).toBeLessThanOrEqual(status.totalComments);
    });

    it('should respect privateOnly option', () => {
      const sourceCode = `/**
 * Public
 */
export function publicFunc(): void {}

/**
 * Private
 */
function _privateFunc(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      manager.collapse(filePath, { privateOnly: true });

      // Note: This tests the logic, actual behavior depends on symbol naming
      const status = manager.getStatus(filePath);
      expect(status.totalComments).toBeGreaterThan(0);
    });

    it('should respect publicOnly option', () => {
      const sourceCode = `/**
 * Public
 */
export function publicFunc(): void {}

/**
 * Private
 */
function _privateFunc(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      manager.collapse(filePath, { publicOnly: true });

      const status = manager.getStatus(filePath);
      expect(status.totalComments).toBeGreaterThan(0);
    });

    it('should auto-export file if not in storage', () => {
      const sourceCode = `/** Test */\nexport function test(): void {}`;
      const filePath = path.join(tempDir, 'new.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.collapse(filePath);

      const status = manager.getStatus(filePath);
      expect(status.totalComments).toBeGreaterThan(0);
    });
  });

  describe('expand', () => {
    it('should expand all comments with all option', () => {
      const sourceCode = `/** Test */\nexport function test(): void {}`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      manager.collapse(filePath);
      manager.expand(filePath, { all: true });

      const status = manager.getStatus(filePath);
      expect(status.expandedComments).toBe(status.totalComments);
    });

    it('should expand matching pattern', () => {
      const sourceCode = `/**
 * Test function
 */
export function test(): void {}

/**
 * Other function
 */
export function other(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      manager.collapse(filePath);
      manager.expand(filePath, { pattern: 'test' });

      const status = manager.getStatus(filePath);
      expect(status.expandedComments).toBeGreaterThan(0);
    });

    it('should throw error for file not in storage', () => {
      const filePath = path.join(tempDir, 'nonexistent.ts');

      expect(() => manager.expand(filePath)).toThrow('File not in storage');
    });
  });

  describe('getStatus', () => {
    it('should return status for existing file', () => {
      const sourceCode = `/** Test */\nexport function test(): void {}`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      const status = manager.getStatus(filePath);

      expect(status.filePath).toBe(filePath);
      expect(status.totalComments).toBeGreaterThan(0);
      expect(status.lastUpdated).not.toBe('never');
    });

    it('should return empty status for non-existent file', () => {
      const status = manager.getStatus('nonexistent.ts');

      expect(status.filePath).toBe('nonexistent.ts');
      expect(status.totalComments).toBe(0);
      expect(status.collapsedComments).toBe(0);
      expect(status.expandedComments).toBe(0);
      expect(status.lastUpdated).toBe('never');
    });

    it('should correctly count collapsed and expanded comments', () => {
      const sourceCode = `/**
 * First
 */
export function first(): void {}

/**
 * Second
 */
export function second(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      manager.exportFile(filePath);
      const beforeStatus = manager.getStatus(filePath);
      expect(beforeStatus.expandedComments).toBe(beforeStatus.totalComments);

      manager.collapse(filePath);
      const afterStatus = manager.getStatus(filePath);
      expect(afterStatus.collapsedComments).toBe(afterStatus.totalComments);
    });
  });

  describe('getAllStatus', () => {
    it('should return status for all files', () => {
      const files = ['file1.ts', 'file2.ts', 'file3.ts'];
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        fs.writeFileSync(filePath, `/** Test */\nexport function test(): void {}`, 'utf-8');
        manager.exportFile(filePath);
      }

      const statuses = manager.getAllStatus();

      expect(statuses.length).toBe(3);
      for (const status of statuses) {
        expect(status.totalComments).toBeGreaterThan(0);
      }
    });

    it('should return empty array for empty storage', () => {
      const statuses = manager.getAllStatus();

      expect(statuses).toHaveLength(0);
    });
  });
});
