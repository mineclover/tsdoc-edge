/**
 * Tests for canonical `@microsoft/tsdoc` `DocComment` AST reader (`TsdocCommentReader`).
 */

import * as ts from 'typescript';
import {
  extractDocCheckpointsFromSource,
  extractLeadingJsDocText,
  readTsdocComment,
  renderDocNodeText,
  TSDocParser,
} from '../../parser/TSDocParser';

describe('TsdocCommentReader', () => {
  let parser: TSDocParser;

  beforeEach(() => {
    parser = new TSDocParser();
  });

  describe('readTsdocComment', () => {
    it('extracts standard summary, @remarks, @privateRemarks, @param, @typeParam, @returns, @throws, @see, {@link}, and modifiers', () => {
      const comment = `/**
       * Transforms an input payload using {@link PayloadMapper | canonical mapper}.
       *
       * @typeParam TInput - Source payload shape
       * @param input - Input payload with \`id\` field
       * @returns Normalized output object
       * @throws ValidationError - When the payload violates schema invariants
       * @throws TimeoutError - When upstream validation exceeds deadline
       * @remarks
       * Executes deterministic two-pass AST normalization without regex heuristics.
       * @privateRemarks PLAN [high]: Add streaming batch mode
       * @see https://tsdoc.org/
       * @defaultValue \`{}\`
       * @doc [[TSDocStandardSpecification#AST]]
       * @public
       */`;

      const context = parser.parseString(comment);
      expect(context.log.messages).toHaveLength(0);

      const structured = readTsdocComment(context.docComment);
      expect(structured.summary).toBe('Transforms an input payload using canonical mapper.');
      expect(structured.remarks).toBe(
        'Executes deterministic two-pass AST normalization without regex heuristics.'
      );
      expect(structured.privateRemarks).toBe('PLAN [high]: Add streaming batch mode');
      expect(structured.typeParams).toEqual([
        { name: 'TInput', description: 'Source payload shape' },
      ]);
      expect(structured.params).toEqual([
        { name: 'input', description: 'Input payload with id field' },
      ]);
      expect(structured.returns).toBe('Normalized output object');
      expect(structured.throws).toEqual([
        'ValidationError - When the payload violates schema invariants',
        'TimeoutError - When upstream validation exceeds deadline',
      ]);
      expect(structured.see).toEqual(['https://tsdoc.org/']);
      expect(structured.defaultValue).toBe('{}');
      expect(structured.links).toEqual(['PayloadMapper']);
      expect(structured.releaseVisibility).toBe('public');
      expect(structured.hasModifier('@public')).toBe(true);
      expect(structured.hasBlockTag('@throws')).toBe(true);
      expect(structured.docReferences).toEqual([
        {
          docSymbol: 'TSDocStandardSpecification',
          section: 'AST',
          rawReference: 'TSDocStandardSpecification#AST',
        },
      ]);
    });

    it('preserves multiple occurrences of repeatable custom ADR tags without overwriting', () => {
      const comment = `/**
       * Core service.
       *
       * @decision Use \`@microsoft/tsdoc\` AST
       * @rationale Standards-compliant tokenization
       * @consequences Zero regex drift, Strong escaping
       *
       * @decision Delegate structural edges to \`@ttsc/graph\`
       * @rationale Compiler type-checker accuracy
       * @consequences Single canonical graph projection
       * @internal
       */`;

      const structured = readTsdocComment(parser.parseString(comment).docComment);
      expect(structured.getTagValues('@decision')).toEqual([
        'Use @microsoft/tsdoc AST',
        'Delegate structural edges to @ttsc/graph',
      ]);
      expect(structured.getTagValues('@rationale')).toEqual([
        'Standards-compliant tokenization',
        'Compiler type-checker accuracy',
      ]);
      expect(structured.releaseVisibility).toBe('internal');
    });

    it('renders Markdown formatting cleanly when preserveMarkdown is enabled', () => {
      const comment = `/**
       * Invoke \`parseString\` via {@link TSDocParser}.
       */`;
      const docComment = parser.parseString(comment).docComment;

      expect(renderDocNodeText(docComment.summarySection, { preserveMarkdown: true })).toBe(
        'Invoke `parseString` via `TSDocParser`.'
      );
    });
  });

  describe('extractLeadingJsDocText', () => {
    it('ignores trailing single-line comments and @packageDocumentation headers', () => {
      const source = `/**
 * File-level header
 * @packageDocumentation
 */

/**
 * Symbol summary
 * @public
 */
// inline note that must not shadow JSDoc
export function computeValue(): number {
  return 42;
}
`;
      const sourceFile = ts.createSourceFile('sample.ts', source, ts.ScriptTarget.Latest, true);
      const fnNode = sourceFile.statements.find(ts.isFunctionDeclaration);
      expect(fnNode).toBeDefined();

      const jsDoc = extractLeadingJsDocText(fnNode as ts.FunctionDeclaration, sourceFile);
      expect(jsDoc).toContain('Symbol summary');
      expect(jsDoc).not.toContain('File-level header');
    });
  });

  describe('extractDocCheckpointsFromSource', () => {
    it('extracts real JSDoc @doc checkpoints while ignoring string literals and line comments', () => {
      const source = `/**
 * File overview
 * @doc [[FileSpec]]
 * @packageDocumentation
 */

import * as path from 'node:path';

// @doc [[LineCommentFake]]
const literal = '@doc [[StringLiteralFake]]';
const template = \`@doc [[TemplateLiteralFake]] \${path.sep}\`;

/**
 * Exported service
 * @doc [[ServiceSpec#Overview]]
 */
export class SampleService {
  /**
   * Member operation
   * @doc [[OperationSpec]]
   */
  run(): string {
    return literal + template;
  }
}
`;

      const allRefs = extractDocCheckpointsFromSource('src/SampleService.ts', source, {
        requireDeclaration: false,
        parser,
      });
      expect(allRefs.map((r) => r.rawReference)).toEqual([
        'FileSpec',
        'ServiceSpec#Overview',
        'OperationSpec',
      ]);
      expect(allRefs[0]?.isPackageDocumentation).toBe(true);
      expect(allRefs[1]?.codeSymbol).toBe('SampleService');
      expect(allRefs[2]?.codeSymbol).toBe('run');
      expect(allRefs[2]?.qualifiedSymbol).toBe('SampleService.run');

      const declarationOnly = extractDocCheckpointsFromSource('src/SampleService.ts', source, {
        requireDeclaration: true,
        parser,
      });
      expect(declarationOnly.map((r) => r.rawReference)).toEqual([
        'ServiceSpec#Overview',
        'OperationSpec',
      ]);
    });
  });
});
