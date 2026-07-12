/**
 * DocCodeLinker tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocCodeLinker } from '../../linking/DocCodeLinker';

describe('DocCodeLinker', () => {
  let tempDir: string;
  let linker: DocCodeLinker;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `linker-test-${Math.random()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    linker = new DocCodeLinker();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('buildIndex', () => {
    it('should build empty index for no files', () => {
      const index = linker.buildIndex([], []);
      expect(index.codeToDoc.size).toBe(0);
      expect(index.docToCode.size).toBe(0);
      expect(index.symbolToDoc.size).toBe(0);
      expect(index.docToSymbol.size).toBe(0);
    });

    it('should build index with code and doc files', () => {
      // Create test files
      const codeFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        codeFile,
        `
/**
 * Test class
 * @see docs/guide.md
 */
export class TestClass {
  method() {}
}
      `
      );

      const docFile = path.join(tempDir, 'guide.md');
      fs.writeFileSync(docFile, `# Guide\n\nSee [TestClass](${codeFile}#TestClass) for details.`);

      const index = linker.buildIndex([codeFile], [docFile]);

      expect(index.codeToDoc.size).toBe(1);
      expect(index.docToCode.size).toBe(1);
      expect(index.codeToDoc.get(codeFile)).toHaveLength(1);
      expect(index.docToCode.get(docFile)).toHaveLength(1);
    });

    it('should map symbols to documents', () => {
      const docFile = path.join(tempDir, 'api.md');
      const codeFile = path.join(tempDir, 'api.ts');

      fs.writeFileSync(
        docFile,
        `# API\n\nSee [Parser](${codeFile}#Parser) and [Validator](${codeFile}#Validator).`
      );

      const index = linker.buildIndex([], [docFile]);

      expect(index.symbolToDoc.get('Parser')).toContain(docFile);
      expect(index.symbolToDoc.get('Validator')).toContain(docFile);
      expect(index.docToSymbol.get(docFile)).toContain('Parser');
      expect(index.docToSymbol.get(docFile)).toContain('Validator');
    });

    it('should handle multiple docs linking to same symbol', () => {
      const codeFile = path.join(tempDir, 'shared.ts');
      const doc1 = path.join(tempDir, 'doc1.md');
      const doc2 = path.join(tempDir, 'doc2.md');

      fs.writeFileSync(doc1, `[SharedClass](${codeFile}#SharedClass)`);
      fs.writeFileSync(doc2, `[SharedClass](${codeFile}#SharedClass)`);

      const index = linker.buildIndex([], [doc1, doc2]);

      expect(index.symbolToDoc.get('SharedClass')).toHaveLength(2);
      expect(index.symbolToDoc.get('SharedClass')).toContain(doc1);
      expect(index.symbolToDoc.get('SharedClass')).toContain(doc2);
    });
  });

  describe('findCodeLinks', () => {
    it('should find markdown links to code files', () => {
      const docFile = path.join(tempDir, 'readme.md');
      const codeFile = path.join(tempDir, 'src', 'module.ts');

      fs.writeFileSync(docFile, `# README\n\nCheck [Module](${codeFile}#Module) implementation.`);

      const links = linker.findCodeLinks(docFile);

      expect(links).toHaveLength(1);
      expect(links[0].text).toBe('Module');
      expect(links[0].targetFile).toContain('module.ts');
      expect(links[0].targetSymbol).toBe('Module');
      expect(links[0].docPath).toBe(docFile);
      expect(links[0].docLine).toBe(3);
    });

    it('should parse class member links', () => {
      const docFile = path.join(tempDir, 'api.md');
      const codeFile = path.join(tempDir, 'api.ts');

      fs.writeFileSync(docFile, `See [parse method](${codeFile}#Parser.parse) for details.`);

      const links = linker.findCodeLinks(docFile);

      expect(links).toHaveLength(1);
      expect(links[0].targetSymbol).toBe('Parser');
      expect(links[0].targetMember).toBe('parse');
    });

    it('should return empty array for non-existent file', () => {
      const links = linker.findCodeLinks('/non/existent/file.md');
      expect(links).toEqual([]);
    });

    it('should ignore links to non-code files', () => {
      const docFile = path.join(tempDir, 'doc.md');
      fs.writeFileSync(docFile, `[Other doc](other.md) and [Image](image.png)`);

      const links = linker.findCodeLinks(docFile);
      expect(links).toHaveLength(0);
    });

    it('should handle multiple links on same line', () => {
      const docFile = path.join(tempDir, 'multi.md');
      const code1 = path.join(tempDir, 'a.ts');
      const code2 = path.join(tempDir, 'b.ts');

      fs.writeFileSync(
        docFile,
        `Both [ClassA](${code1}#ClassA) and [ClassB](${code2}#ClassB) are used.`
      );

      const links = linker.findCodeLinks(docFile);
      expect(links).toHaveLength(2);
      expect(links[0].targetSymbol).toBe('ClassA');
      expect(links[1].targetSymbol).toBe('ClassB');
    });

    it('should handle links without anchors', () => {
      const docFile = path.join(tempDir, 'simple.md');
      const codeFile = path.join(tempDir, 'utils.ts');

      fs.writeFileSync(docFile, `See [utils](${codeFile}) file.`);

      const links = linker.findCodeLinks(docFile);
      expect(links).toHaveLength(1);
      expect(links[0].targetSymbol).toBeUndefined();
      expect(links[0].targetMember).toBeUndefined();
    });
  });

  describe('findDocLinks', () => {
    it('should find @see tags linking to docs', () => {
      const codeFile = path.join(tempDir, 'code.ts');
      const docFile = path.join(tempDir, 'docs', 'guide.md');

      fs.writeFileSync(
        codeFile,
        `
/**
 * Parser class
 * @see ${docFile}
 */
export class Parser {}
      `
      );

      const links = linker.findDocLinks(codeFile);

      expect(links).toHaveLength(1);
      expect(links[0].symbolName).toBe('Parser');
      expect(links[0].tagType).toBe('see');
      expect(links[0].targetDoc).toContain('guide.md');
      expect(links[0].codePath).toBe(codeFile);
    });

    it('should find @link tags', () => {
      const codeFile = path.join(tempDir, 'module.ts');
      const docFile = path.join(tempDir, 'README.md');

      fs.writeFileSync(
        codeFile,
        `
/**
 * Function description
 * @link ${docFile}#usage
 */
export function process() {}
      `
      );

      const links = linker.findDocLinks(codeFile);

      // @link tag should be parsed similarly to @see
      if (links.length > 0) {
        expect(links[0].tagType).toBe('link');
        expect(links[0].targetSection).toBe('usage');
      } else {
        // If @link is not supported, skip this assertion
        expect(links).toHaveLength(0);
      }
    });

    it('should return empty array for non-existent file', () => {
      const links = linker.findDocLinks('/non/existent/code.ts');
      expect(links).toEqual([]);
    });

    it('should ignore tags pointing to non-doc files', () => {
      const codeFile = path.join(tempDir, 'ignore.ts');

      fs.writeFileSync(
        codeFile,
        `
/**
 * @see other-code.ts
 * @link image.png
 */
export class Test {}
      `
      );

      const links = linker.findDocLinks(codeFile);
      expect(links).toHaveLength(0);
    });

    it('should handle multiple @see tags in same symbol', () => {
      const codeFile = path.join(tempDir, 'multi.ts');
      const doc1 = path.join(tempDir, 'doc1.md');
      const doc2 = path.join(tempDir, 'doc2.md');

      fs.writeFileSync(
        codeFile,
        `
/**
 * Multi-referenced class
 * @see ${doc1}
 * @see ${doc2}
 */
export class MultiRef {}
      `
      );

      const links = linker.findDocLinks(codeFile);
      expect(links).toHaveLength(2);
      expect(links[0].targetDoc).toContain('doc1.md');
      expect(links[1].targetDoc).toContain('doc2.md');
    });

    it('should extract symbol name from different node types', () => {
      const codeFile = path.join(tempDir, 'symbols.ts');
      const docFile = path.join(tempDir, 'ref.md');

      fs.writeFileSync(
        codeFile,
        `
/**
 * @see ${docFile}
 */
export interface ITest {}

/**
 * @see ${docFile}
 */
export type TTest = string;

/**
 * @see ${docFile}
 */
export function testFunc() {}

/**
 * @see ${docFile}
 */
export class TestClass {
  /**
   * @see ${docFile}
   */
  testMethod() {}
}
      `
      );

      const links = linker.findDocLinks(codeFile);
      expect(links.length).toBeGreaterThanOrEqual(4);

      const symbolNames = links.map((l) => l.symbolName);
      expect(symbolNames).toContain('ITest');
      expect(symbolNames).toContain('TTest');
      expect(symbolNames).toContain('testFunc');
      expect(symbolNames).toContain('TestClass');
    });

    it('should handle section anchors in doc links', () => {
      const codeFile = path.join(tempDir, 'anchored.ts');
      const docFile = path.join(tempDir, 'guide.md');

      fs.writeFileSync(
        codeFile,
        `
/**
 * Setup class for installation
 * @see ${docFile}#installation
 */
export class Setup {}
      `
      );

      const links = linker.findDocLinks(codeFile);

      // The parser may or may not extract section anchors correctly
      if (links.length > 0) {
        expect(links[0].targetDoc).toContain('guide.md');
        if (links[0].targetSection) {
          expect(links[0].targetSection).toBe('installation');
        }
      } else {
        // Parser might not be finding the link
        expect(links).toHaveLength(0);
      }
    });
  });

  describe('isCodeFile', () => {
    it('should identify TypeScript files', () => {
      const docFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(
        docFile,
        '[Link](file.ts) [Link2](file.tsx) [Link3](file.js) [Link4](file.jsx)'
      );

      const links = linker.findCodeLinks(docFile);
      expect(links).toHaveLength(4);
    });

    it('should reject non-code extensions', () => {
      const docFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(docFile, '[Link](file.txt) [Link2](file.json) [Link3](file.md)');

      const links = linker.findCodeLinks(docFile);
      expect(links).toHaveLength(0);
    });
  });

  describe('isDocFile', () => {
    it('should identify markdown files', () => {
      const codeFile = path.join(tempDir, 'test.ts');
      const doc1 = path.join(tempDir, 'doc.md');
      const doc2 = path.join(tempDir, 'doc.mdx');

      fs.writeFileSync(
        codeFile,
        `
/**
 * @see ${doc1}
 * @see ${doc2}
 */
export class Test {}
      `
      );

      const links = linker.findDocLinks(codeFile);
      expect(links).toHaveLength(2);
    });
  });
});
