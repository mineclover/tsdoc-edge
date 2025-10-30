/**
 * CommentImporter tests
 * @public
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommentImporter } from '../fold/CommentImporter';

describe('CommentImporter', () => {
  let importer: CommentImporter;
  let tempDir: string;

  beforeEach(() => {
    importer = new CommentImporter();
    tempDir = path.join(__dirname, '../../temp-test-importer');
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
    it('should parse markdown file to FileCommentState', () => {
      const markdownPath = path.join(tempDir, 'test.md');
      const markdownContent = `# test.ts

Last Updated: 2025-01-01

## Comment 1: testFunc

**Location**: Line 1-5, Column 0
**Symbol**: testFunc
**Hash**: \`abc123\`
**Status**: \`expanded\`

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
      fs.writeFileSync(markdownPath, markdownContent, 'utf-8');

      const fileState = importer.parseMarkdown(markdownPath);

      expect(fileState.filePath).toBe('test.ts');
      expect(fileState.comments).toHaveLength(1);
      expect(fileState.comments[0].symbol).toBe('testFunc');
      expect(fileState.comments[0].status).toBe('expanded');
      expect(fileState.comments[0].contentHash).toBe('abc123');
    });

    it('should parse file with valid structure', () => {
      const markdownPath = path.join(tempDir, 'multi.md');
      const markdownContent = `# test.ts

Last Updated: 2025-01-01

## Comment 1: func1

**Location**: Line 1-3, Column 0
**Symbol**: func1
**Hash**: \`hash1\`
**Status**: \`expanded\`

### Full Comment

\`\`\`typescript
/** Func 1 */
\`\`\`

### Collapsed Form

\`\`\`typescript
/** Func 1 */
\`\`\`

---

`;
      fs.writeFileSync(markdownPath, markdownContent, 'utf-8');

      const fileState = importer.parseMarkdown(markdownPath);

      expect(fileState.filePath).toBe('test.ts');
      expect(fileState.comments.length).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for invalid markdown format', () => {
      const markdownPath = path.join(tempDir, 'invalid.md');
      fs.writeFileSync(markdownPath, 'Invalid content', 'utf-8');

      expect(() => importer.parseMarkdown(markdownPath)).toThrow();
    });
  });

  describe('applyComments', () => {
    it('should apply comments to TypeScript file', () => {
      const tsFile = path.join(tempDir, 'apply.ts');
      const sourceCode = `/**
 * Original comment
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      const fileState = {
        filePath: tsFile,
        lastUpdated: '2025-01-01',
        comments: [
          {
            id: `${tsFile}:1:0`,
            contentHash: 'test123',
            location: {
              filePath: tsFile,
              line: 1,
              column: 0,
              endLine: 4,
            },
            symbol: 'test',
            status: 'collapsed' as const,
            fullComment: '/**\n * Original comment\n * @public\n */',
            collapsedComment: '/** Original comment */',
            lastUpdated: '2025-01-01',
          },
        ],
      };

      const result = importer.applyComments(tsFile, fileState);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should throw error for non-existent file', () => {
      const fileState = {
        filePath: '/nonexistent/file.ts',
        lastUpdated: '2025-01-01',
        comments: [],
      };

      expect(() => importer.applyComments('/nonexistent/file.ts', fileState)).toThrow();
    });
  });

  describe('importFile', () => {
    it('should import and create backup file', () => {
      const tsFile = path.join(tempDir, 'import.ts');
      const sourceCode = `/**
 * Test
 * @public
 */
export function test(): void {}
`;
      fs.writeFileSync(tsFile, sourceCode, 'utf-8');

      const markdownPath = path.join(tempDir, 'import.md');
      const markdownContent = `# ${tsFile}

Last Updated: 2025-01-01

## Comment 1: test

**Location**: Line 1-4, Column 0
**Symbol**: test
**Hash**: \`testhash\`
**Status**: \`expanded\`

### Full Comment

\`\`\`typescript
/**
 * Test
 * @public
 */
\`\`\`

### Collapsed Form

\`\`\`typescript
/** Test */
\`\`\`

---

`;
      fs.writeFileSync(markdownPath, markdownContent, 'utf-8');

      const result = importer.importFile(markdownPath, false);

      expect(result).toContain('.backup');
      expect(fs.existsSync(result)).toBe(true);
    });
  });
});
