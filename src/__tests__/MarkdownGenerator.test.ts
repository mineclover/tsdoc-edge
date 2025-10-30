/**
 * MarkdownGenerator tests
 * @public
 */

import type { DocComment } from '@microsoft/tsdoc';
import { MarkdownGenerator } from '../generator/MarkdownGenerator';
import type { ParsedDocComment } from '../types';

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
  });
});
