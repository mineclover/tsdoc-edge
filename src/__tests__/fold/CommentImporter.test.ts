/**
 * Comprehensive tests for CommentImporter
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommentImporter } from '../../fold/CommentImporter';

describe('CommentImporter', () => {
  let importer: CommentImporter;
  let tempDir: string;

  beforeEach(() => {
    importer = new CommentImporter();
    tempDir = path.join(__dirname, '../../../temp-test-importer');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parseMarkdown', () => {
    it('should parse valid markdown file', () => {
      // Use exporter to create valid markdown
      const tempExporter = new (require('../../fold/CommentExporter').CommentExporter)();
      const fileState = {
        filePath: 'test.ts',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        comments: [
          {
            id: 'test.ts:1:0',
            contentHash: 'abc123def456',
            location: { filePath: 'test.ts', line: 1, column: 0, endLine: 5 },
            symbol: 'testFunc',
            status: 'expanded' as const,
            fullComment: `/**
 * Test function
 * @public
 */`,
            collapsedComment: '/** Test function */',
            lastUpdated: '2025-01-01T00:00:00.000Z',
          },
        ],
      };
      const markdown = tempExporter.exportToMarkdown(fileState);

      const markdownPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      const parsed = importer.parseMarkdown(markdownPath);

      expect(parsed.filePath).toBe('test.ts');
      expect(parsed.lastUpdated).toBe('2025-01-01T00:00:00.000Z');
      expect(parsed.comments).toHaveLength(1);
      expect(parsed.comments[0].symbol).toBe('testFunc');
      expect(parsed.comments[0].contentHash).toBe('abc123def456');
      expect(parsed.comments[0].status).toBe('expanded');
      expect(parsed.comments[0].location.line).toBe(1);
      expect(parsed.comments[0].location.endLine).toBe(5);
    });

    it('should parse multiple comments', () => {
      // Use the exporter to create valid markdown format
      const tempExporter = new (require('../../fold/CommentExporter').CommentExporter)();
      const fileState = {
        filePath: 'test.ts',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        comments: [
          {
            id: 'test.ts:1:0',
            contentHash: 'abc123def456',
            location: { filePath: 'test.ts', line: 1, column: 0, endLine: 3 },
            symbol: 'first',
            status: 'expanded' as const,
            fullComment: '/** First */',
            collapsedComment: '/** First */',
            lastUpdated: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'test.ts:5:0',
            contentHash: 'deadbeef1234',
            location: { filePath: 'test.ts', line: 5, column: 0, endLine: 7 },
            symbol: 'second',
            status: 'collapsed' as const,
            fullComment: '/** Second full */',
            collapsedComment: '/** Second */',
            lastUpdated: '2025-01-01T00:00:00.000Z',
          },
        ],
      };
      const markdown = tempExporter.exportToMarkdown(fileState);

      const markdownPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      const parsed = importer.parseMarkdown(markdownPath);

      expect(parsed.comments).toHaveLength(2);
      expect(parsed.comments[0].symbol).toBe('first');
      expect(parsed.comments[0].status).toBe('expanded');
      expect(parsed.comments[1].symbol).toBe('second');
      expect(parsed.comments[1].status).toBe('collapsed');
    });

    it('should handle old format without endLine', () => {
      const markdown = `# test.ts

Last Updated: 2025-01-01T00:00:00.000Z

## Comment 1: testFunc

**Location**: Line 1, Column 0
**Symbol**: testFunc
**Hash**: \`abc123\`
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
      const markdownPath = path.join(tempDir, 'old-format.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      const fileState = importer.parseMarkdown(markdownPath);

      expect(fileState.comments).toHaveLength(1);
      expect(fileState.comments[0].location.line).toBe(1);
      expect(fileState.comments[0].location.endLine).toBe(1); // Fallback to same line
    });

    it('should throw error for invalid markdown format', () => {
      const markdown = 'Invalid markdown content';
      const markdownPath = path.join(tempDir, 'invalid.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      expect(() => importer.parseMarkdown(markdownPath)).toThrow(
        'Invalid markdown format: missing file path header'
      );
    });

    it('should generate comment IDs from location', () => {
      const markdown = `# test.ts

Last Updated: 2025-01-01T00:00:00.000Z

## Comment 1: testFunc

**Location**: Line 10-15, Column 2
**Symbol**: testFunc
**Hash**: \`abc123\`
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
      const markdownPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      const fileState = importer.parseMarkdown(markdownPath);

      expect(fileState.comments[0].id).toBe('test.ts:10:2');
    });

    it('should preserve lastUpdated timestamp', () => {
      const markdown = `# test.ts

Last Updated: 2025-11-06T12:34:56.789Z

## Comment 1: test

**Location**: Line 1-3, Column 0
**Symbol**: test
**Hash**: \`abc\`
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
      const markdownPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      const fileState = importer.parseMarkdown(markdownPath);

      expect(fileState.lastUpdated).toBe('2025-11-06T12:34:56.789Z');
      expect(fileState.comments[0].lastUpdated).toBe('2025-11-06T12:34:56.789Z');
    });

    it('should handle multiline comment content', () => {
      // Use exporter to create valid markdown
      const tempExporter = new (require('../../fold/CommentExporter').CommentExporter)();
      const fileState = {
        filePath: 'test.ts',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        comments: [
          {
            id: 'test.ts:1:0',
            contentHash: 'cafe123babe456',
            location: { filePath: 'test.ts', line: 1, column: 0, endLine: 10 },
            symbol: 'multiline',
            status: 'expanded' as const,
            fullComment: `/**
 * This is a multiline comment
 * with multiple lines
 * @param x - Parameter
 * @returns Result
 * @public
 */`,
            collapsedComment: '/** This is a multiline comment */',
            lastUpdated: '2025-01-01T00:00:00.000Z',
          },
        ],
      };
      const markdown = tempExporter.exportToMarkdown(fileState);

      const markdownPath = path.join(tempDir, 'multiline.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      const parsed = importer.parseMarkdown(markdownPath);

      expect(parsed.comments[0].fullComment).toContain('multiline comment');
      expect(parsed.comments[0].fullComment).toContain('@param');
      // Parser includes empty line from markdown, trim it
      expect(parsed.comments[0].collapsedComment.trim()).toBe('/** This is a multiline comment */');
    });
  });

  describe('applyComments', () => {
    it('should apply collapsed comments to source file', () => {
      const sourceCode = `/**
 * Test function with long comment
 * @param x - Parameter
 * @returns Result
 * @public
 */
export function test(x: number): number {
  return x * 2;
}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      // Create importer and parse to get hash
      const tempExporter = new (require('../../fold/CommentExporter').CommentExporter)();
      const comments = tempExporter.extractComments(filePath, sourceCode);
      const _hash = comments[0].contentHash;

      const fileState = {
        filePath,
        lastUpdated: '2025-01-01T00:00:00.000Z',
        comments: [
          {
            ...comments[0],
            status: 'collapsed' as const,
            collapsedComment: '/** Test function with long comment */',
          },
        ],
      };

      const updatedCode = importer.applyComments(filePath, fileState);

      expect(updatedCode).toContain('/** Test function with long comment */');
      expect(updatedCode).not.toContain('@param');
      expect(updatedCode).toContain('export function test(x: number): number {');
    });

    it('should apply expanded comments to source file', () => {
      const sourceCode = `/** Short */
export function test(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      const tempExporter = new (require('../../fold/CommentExporter').CommentExporter)();
      const comments = tempExporter.extractComments(filePath, sourceCode);

      const fileState = {
        filePath,
        lastUpdated: '2025-01-01T00:00:00.000Z',
        comments: [
          {
            ...comments[0],
            status: 'expanded' as const,
            fullComment: `/**
 * Expanded comment
 * @public
 */`,
          },
        ],
      };

      const updatedCode = importer.applyComments(filePath, fileState);

      expect(updatedCode).toContain('Expanded comment');
      expect(updatedCode).toContain('@public');
    });

    it('should handle multiple comments in the same file', () => {
      const sourceCode = `/**
 * First function
 */
export function first(): void {}

/**
 * Second function
 */
export function second(): void {}
`;
      const filePath = path.join(tempDir, 'multi.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      const tempExporter = new (require('../../fold/CommentExporter').CommentExporter)();
      const comments = tempExporter.extractComments(filePath, sourceCode);

      const fileState = {
        filePath,
        lastUpdated: '2025-01-01T00:00:00.000Z',
        comments: comments.map((c: { status: string }) => ({
          ...c,
          status: 'collapsed' as const,
        })),
      };

      const updatedCode = importer.applyComments(filePath, fileState);

      expect(updatedCode).toContain('/** First function */');
      expect(updatedCode).toContain('/** Second function */');
      expect(updatedCode).toContain('export function first()');
      expect(updatedCode).toContain('export function second()');
    });

    it('should throw error for non-existent file', () => {
      const filePath = path.join(tempDir, 'nonexistent.ts');
      const fileState = {
        filePath,
        lastUpdated: '2025-01-01T00:00:00.000Z',
        comments: [],
      };

      expect(() => importer.applyComments(filePath, fileState)).toThrow(
        `File not found: ${filePath}`
      );
    });

    it('should preserve code that is not commented', () => {
      const sourceCode = `/**
 * Test
 */
export function test(): void {}

// Regular comment
const x = 42;

export function noComment(): void {
  console.log('test');
}
`;
      const filePath = path.join(tempDir, 'mixed.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      const tempExporter = new (require('../../fold/CommentExporter').CommentExporter)();
      const comments = tempExporter.extractComments(filePath, sourceCode);

      const fileState = {
        filePath,
        lastUpdated: '2025-01-01T00:00:00.000Z',
        comments,
      };

      const updatedCode = importer.applyComments(filePath, fileState);

      expect(updatedCode).toContain('const x = 42');
      expect(updatedCode).toContain('// Regular comment');
      expect(updatedCode).toContain('export function noComment()');
    });
  });

  describe('importFile', () => {
    it('should import and create backup file by default', () => {
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');

      const markdown = `# ${filePath}

Last Updated: 2025-01-01T00:00:00.000Z

## Comment 1: test

**Location**: Line 1-4, Column 0
**Symbol**: test
**Hash**: \`abc123\`
**Status**: \`collapsed\`

### Full Comment

\`\`\`typescript
/**
 * Test function
 * @public
 */
\`\`\`

### Collapsed Form

\`\`\`typescript
/** Test function */
\`\`\`

---

`;
      const markdownPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      const resultPath = importer.importFile(markdownPath, false);

      expect(resultPath).toBe(`${filePath}.backup`);
      expect(fs.existsSync(resultPath)).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true); // Original preserved
    });

    it('should import and overwrite original file when requested', () => {
      const sourceCode = `/**
 * Test function
 * @public
 */
export function test(): void {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, sourceCode, 'utf-8');
      const originalContent = fs.readFileSync(filePath, 'utf-8');

      const tempExporter = new (require('../../fold/CommentExporter').CommentExporter)();
      const comments = tempExporter.extractComments(filePath, sourceCode);

      const markdown = `# ${filePath}

Last Updated: 2025-01-01T00:00:00.000Z

## Comment 1: test

**Location**: Line ${comments[0].location.line}-${comments[0].location.endLine}, Column ${comments[0].location.column}
**Symbol**: test
**Hash**: \`${comments[0].contentHash}\`
**Status**: \`collapsed\`

### Full Comment

\`\`\`typescript
${comments[0].fullComment}
\`\`\`

### Collapsed Form

\`\`\`typescript
/** Test function */
\`\`\`

---

`;
      const markdownPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(markdownPath, markdown, 'utf-8');

      const resultPath = importer.importFile(markdownPath, true);

      expect(resultPath).toBe(filePath);
      const updatedContent = fs.readFileSync(filePath, 'utf-8');
      expect(updatedContent).not.toBe(originalContent);
      expect(updatedContent).toContain('/** Test function */');
    });
  });
});
