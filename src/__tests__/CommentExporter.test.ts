/**
 * CommentExporter tests
 * @public
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommentExporter } from '../fold/CommentExporter';

describe('CommentExporter', () => {
  let exporter: CommentExporter;
  let tempDir: string;

  beforeEach(() => {
    exporter = new CommentExporter();
    tempDir = path.join(__dirname, '../../temp-test-exporter');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('extractComments', () => {
    it('should extract comments from a TypeScript file', () => {
      const sourceCode = `/**
 * Test function
 * @param x - Number parameter
 * @returns Result
 * @public
 */
export function test(x: number): number {
  return x * 2;
}
`;

      const comments = exporter.extractComments('test.ts', sourceCode);

      expect(comments).toHaveLength(1);
      expect(comments[0].symbol).toBe('test');
      expect(comments[0].status).toBe('expanded');
      expect(comments[0].fullComment).toContain('Test function');
      expect(comments[0].collapsedComment).toContain('Test function');
    });

    it('should extract multiple comments', () => {
      const sourceCode = `/**
 * First function
 * @public
 */
export function first(): void {}

/**
 * Second function
 * @public
 */
export function second(): void {}
`;

      const comments = exporter.extractComments('test.ts', sourceCode);

      expect(comments).toHaveLength(2);
      expect(comments[0].symbol).toBe('first');
      expect(comments[1].symbol).toBe('second');
    });

    it('should handle files without comments', () => {
      const sourceCode = `export function noComment(): void {
  console.log('test');
}
`;

      const comments = exporter.extractComments('test.ts', sourceCode);

      expect(comments).toHaveLength(0);
    });

    it('should extract comments from classes', () => {
      const sourceCode = `/**
 * Test class
 * @public
 */
export class TestClass {
  /**
   * Test method
   * @public
   */
  testMethod(): void {}
}
`;

      const comments = exporter.extractComments('test.ts', sourceCode);

      expect(comments.length).toBeGreaterThanOrEqual(1);
      const classComment = comments.find((c) => c.symbol === 'TestClass');
      expect(classComment).toBeDefined();
    });
  });

  describe('exportFile', () => {
    it('should export comments to markdown file', () => {
      const testFile = path.join(tempDir, 'source.ts');
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(testFile, sourceCode, 'utf-8');

      const markdownPath = exporter.exportFile(testFile, sourceCode, tempDir);

      expect(fs.existsSync(markdownPath)).toBe(true);
      const markdown = fs.readFileSync(markdownPath, 'utf-8');
      expect(markdown).toContain(`# ${testFile}`);
      expect(markdown).toContain('test');
    });
  });

  describe('exportToMarkdown', () => {
    it('should generate markdown from file state', () => {
      const fileState = {
        filePath: 'test.ts',
        lastUpdated: '2025-01-01',
        comments: [
          {
            id: 'test.ts:1:0',
            contentHash: 'abc123',
            location: {
              filePath: 'test.ts',
              line: 1,
              column: 0,
              endLine: 5,
            },
            symbol: 'testFunc',
            status: 'expanded' as const,
            fullComment: '/** Test */\n',
            collapsedComment: '/** Test */',
            lastUpdated: '2025-01-01',
          },
        ],
      };

      const markdown = exporter.exportToMarkdown(fileState);

      expect(markdown).toContain('# test.ts');
      expect(markdown).toContain('testFunc');
      expect(markdown).toContain('Full Comment');
      expect(markdown).toContain('Collapsed Form');
    });
  });
});
