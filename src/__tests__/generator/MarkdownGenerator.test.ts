/**
 * MarkdownGenerator tests
 * @public
 */

import { type DocComment, type DocNode, DocNodeKind } from '@microsoft/tsdoc';
import { MarkdownGenerator } from '../../generator/MarkdownGenerator';
import type { ParsedDocComment } from '../../types';

describe('MarkdownGenerator', () => {
  let generator: MarkdownGenerator;

  beforeEach(() => {
    generator = new MarkdownGenerator();
  });

  describe('generateForComment', () => {
    it('should generate markdown with symbol name header', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'testFunction',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('## testFunction');
    });

    it('should include validation issues if present', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'badFunction',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [
          {
            ruleId: 'test-rule',
            severity: 'error',
            message: 'Test error message',
          },
        ],
        isValid: false,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('Validation Issues');
      expect(result).toContain('Test error message');
      expect(result).toContain('ERROR');
    });

    it('should handle comments with no validation issues', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'goodFunction',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).not.toContain('Validation Issues');
    });
  });

  describe('generateForComments', () => {
    it('should generate markdown for multiple comments', () => {
      const mockComments: ParsedDocComment[] = [
        {
          symbolName: 'function1',
          filePath: '/test/file.ts',
          docComment: {
            summarySection: { nodes: [] },
            params: { blocks: [] },
            returnsBlock: null,
            remarksBlock: null,
            modifierTagSet: { nodes: [] },
            customBlocks: [],
          } as unknown as DocComment,
          validationResults: [],
          isValid: true,
        },
        {
          symbolName: 'function2',
          filePath: '/test/file.ts',
          docComment: {
            summarySection: { nodes: [] },
            params: { blocks: [] },
            returnsBlock: null,
            remarksBlock: null,
            modifierTagSet: { nodes: [] },
            customBlocks: [],
          } as unknown as DocComment,
          validationResults: [],
          isValid: true,
        },
      ];

      const result = generator.generateForComments(mockComments);

      expect(result).toContain('# API Documentation');
      expect(result).toContain('## function1');
      expect(result).toContain('## function2');
      expect(result).toContain('---');
    });

    it('should handle empty array', () => {
      const result = generator.generateForComments([]);

      expect(result).toContain('# API Documentation');
    });

    it('should separate multiple comments with horizontal rules', () => {
      const mockComments: ParsedDocComment[] = [
        {
          symbolName: 'func1',
          filePath: '/test/file.ts',
          docComment: {
            summarySection: { nodes: [] },
            params: { blocks: [] },
            returnsBlock: null,
            remarksBlock: null,
            modifierTagSet: { nodes: [] },
            customBlocks: [],
          } as unknown as DocComment,
          validationResults: [],
          isValid: true,
        },
        {
          symbolName: 'func2',
          filePath: '/test/file.ts',
          docComment: {
            summarySection: { nodes: [] },
            params: { blocks: [] },
            returnsBlock: null,
            remarksBlock: null,
            modifierTagSet: { nodes: [] },
            customBlocks: [],
          } as unknown as DocComment,
          validationResults: [],
          isValid: true,
        },
      ];

      const result = generator.generateForComments(mockComments);

      const hrCount = (result.match(/---/g) || []).length;
      expect(hrCount).toBeGreaterThan(0);
    });
  });

  describe('rendering different DocNode types', () => {
    it('should render comments with parameters', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'testFunc',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: {
            blocks: [
              {
                parameterName: 'x',
                content: { nodes: [] },
              } as any,
              {
                parameterName: 'y',
                content: { nodes: [] },
              } as any,
            ],
          },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('### Parameters');
      expect(result).toContain('**x**');
      expect(result).toContain('**y**');
    });

    it('should render comments with returns block', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'testFunc',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: {
            content: { nodes: [] },
          } as any,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('### Returns');
    });

    it('should render comments with remarks block', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'testFunc',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: {
            content: { nodes: [] },
          } as any,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('### Remarks');
    });

    it('should render validation warnings differently from errors', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'testFunc',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [
          {
            ruleId: 'test-warning',
            severity: 'warning',
            message: 'This is a warning',
          },
          {
            ruleId: 'test-error',
            severity: 'error',
            message: 'This is an error',
          },
        ],
        isValid: false,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('Validation Issues');
      expect(result).toContain('WARNING');
      expect(result).toContain('ERROR');
      expect(result).toContain('This is a warning');
      expect(result).toContain('This is an error');
    });

    it('should handle comments with all sections', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'complexFunc',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: {
            blocks: [
              {
                parameterName: 'param1',
                content: { nodes: [] },
              } as any,
            ],
          },
          returnsBlock: {
            content: { nodes: [] },
          } as any,
          remarksBlock: {
            content: { nodes: [] },
          } as any,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [
          {
            ruleId: 'test-info',
            severity: 'info',
            message: 'Info message',
          },
        ],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('## complexFunc');
      expect(result).toContain('### Parameters');
      expect(result).toContain('### Returns');
      expect(result).toContain('### Remarks');
      expect(result).toContain('### Validation Issues');
    });

    it('should handle comments with no parameters', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'noParams',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).not.toContain('### Parameters');
    });

    it('should handle comments with no returns', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'noReturns',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).not.toContain('### Returns');
    });

    it('should handle comments with no remarks', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'noRemarks',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).not.toContain('### Remarks');
    });
  });

  describe('rendering specific DocNode types', () => {
    it('should render PlainText nodes', () => {
      const plainTextNode: DocNode = {
        kind: DocNodeKind.PlainText,
        text: 'Plain text content',
      } as any;

      const mockComment: ParsedDocComment = {
        symbolName: 'testPlainText',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [plainTextNode] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('Plain text content');
    });

    it('should render SoftBreak nodes as spaces', () => {
      const softBreakNode: DocNode = {
        kind: DocNodeKind.SoftBreak,
      } as any;

      const mockComment: ParsedDocComment = {
        symbolName: 'testSoftBreak',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [softBreakNode] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('## testSoftBreak');
    });

    it('should render Paragraph nodes', () => {
      const plainTextNode: DocNode = {
        kind: DocNodeKind.PlainText,
        text: 'Text in paragraph',
      } as any;

      const paragraphNode: DocNode = {
        kind: DocNodeKind.Paragraph,
        nodes: [plainTextNode],
      } as any;

      const mockComment: ParsedDocComment = {
        symbolName: 'testParagraph',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [paragraphNode] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('Text in paragraph');
    });

    it('should render CodeSpan nodes with backticks', () => {
      const codeSpanNode: DocNode = {
        kind: DocNodeKind.CodeSpan,
        code: 'console.log("test")',
      } as any;

      const mockComment: ParsedDocComment = {
        symbolName: 'testCodeSpan',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [codeSpanNode] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('`console.log("test")`');
    });

    it('should handle unknown node types with default case', () => {
      const unknownNode: DocNode = {
        kind: 'UnknownNodeType' as any,
        toString: () => 'Unknown node content',
      } as any;

      const mockComment: ParsedDocComment = {
        symbolName: 'testUnknown',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [unknownNode] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('## testUnknown');
    });

    it('should render complex node structures', () => {
      const plainTextNode1: DocNode = {
        kind: DocNodeKind.PlainText,
        text: 'This is ',
      } as any;

      const codeSpanNode: DocNode = {
        kind: DocNodeKind.CodeSpan,
        code: 'code',
      } as any;

      const plainTextNode2: DocNode = {
        kind: DocNodeKind.PlainText,
        text: ' in a paragraph',
      } as any;

      const paragraphNode: DocNode = {
        kind: DocNodeKind.Paragraph,
        nodes: [plainTextNode1, codeSpanNode, plainTextNode2],
      } as any;

      const mockComment: ParsedDocComment = {
        symbolName: 'testComplex',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [paragraphNode] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('This is ');
      expect(result).toContain('`code`');
      expect(result).toContain(' in a paragraph');
    });

    it('should render nested paragraph nodes', () => {
      const innerText: DocNode = {
        kind: DocNodeKind.PlainText,
        text: 'Nested text',
      } as any;

      const innerParagraph: DocNode = {
        kind: DocNodeKind.Paragraph,
        nodes: [innerText],
      } as any;

      const outerParagraph: DocNode = {
        kind: DocNodeKind.Paragraph,
        nodes: [innerParagraph],
      } as any;

      const mockComment: ParsedDocComment = {
        symbolName: 'nestedTest',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [outerParagraph] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('Nested text');
    });

    it('should handle empty node arrays', () => {
      const emptyParagraph: DocNode = {
        kind: DocNodeKind.Paragraph,
        nodes: [],
      } as any;

      const mockComment: ParsedDocComment = {
        symbolName: 'emptyTest',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [emptyParagraph] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('## emptyTest');
    });

    it('should handle multiple validation severities', () => {
      const mockComment: ParsedDocComment = {
        symbolName: 'multiSeverity',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: [] },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [
          {
            ruleId: 'info-rule',
            severity: 'info',
            message: 'Information',
          },
          {
            ruleId: 'warning-rule',
            severity: 'warning',
            message: 'Warning',
          },
          {
            ruleId: 'error-rule',
            severity: 'error',
            message: 'Error',
          },
        ],
        isValid: false,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('INFO');
      expect(result).toContain('WARNING');
      expect(result).toContain('ERROR');
    });

    it('should handle very long parameter lists', () => {
      const params = Array.from({ length: 10 }, (_, i) => ({
        parameterName: `param${i}`,
        content: { nodes: [] },
      })) as any[];

      const mockComment: ParsedDocComment = {
        symbolName: 'manyParams',
        filePath: '/test/file.ts',
        docComment: {
          summarySection: { nodes: [] },
          params: { blocks: params },
          returnsBlock: null,
          remarksBlock: null,
          modifierTagSet: { nodes: [] },
          customBlocks: [],
        } as unknown as DocComment,
        validationResults: [],
        isValid: true,
      };

      const result = generator.generateForComment(mockComment);

      expect(result).toContain('### Parameters');
      expect(result).toContain('**param0**');
      expect(result).toContain('**param9**');
    });
  });
});
