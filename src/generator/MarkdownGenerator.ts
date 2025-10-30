/**
 * Markdown documentation generator
 * @packageDocumentation
 */

import { type DocNode, DocNodeKind } from '@microsoft/tsdoc';
import type { ParsedDocComment } from '../types';

// TSDoc internal node types (not exposed in public API)
/**
 * DocPlainText interface
 * @public
 */
interface DocPlainText extends DocNode {
  text: string;
}

/**
 * DocParagraph interface
 * @public
 */
interface DocParagraph extends DocNode {
  nodes: ReadonlyArray<DocNode>;
}

/**
 * DocCodeSpan interface
 * @public
 */
interface DocCodeSpan extends DocNode {
  code: string;
}

/**
 * Generates markdown documentation from parsed TSDoc comments
 * @public
 */
export class MarkdownGenerator {
  /**
   * Generate markdown documentation for a single comment
   *
   * @param comment - Parsed doc comment
   * @returns Markdown string
   * @public
   */
  generateForComment(comment: ParsedDocComment): string {
    let markdown = '';

    // Add header with symbol name
    markdown += `## ${comment.symbolName}\n\n`;

    // Add summary
    if (comment.docComment.summarySection) {
      const summary = this.renderDocNodes(comment.docComment.summarySection.nodes);
      markdown += `${summary}\n\n`;
    }

    // Add parameters
    if (comment.docComment.params.blocks.length > 0) {
      markdown += `### Parameters\n\n`;
      /**
       * param
       * @public
       */
      for (const param of comment.docComment.params.blocks) {
        const paramName = param.parameterName;
        const paramDesc = this.renderDocNodes(param.content.nodes);
        markdown += `- **${paramName}**: ${paramDesc}\n`;
      }
      markdown += '\n';
    }

    // Add returns
    if (comment.docComment.returnsBlock) {
      markdown += `### Returns\n\n`;
      const returnsDesc = this.renderDocNodes(comment.docComment.returnsBlock.content.nodes);
      markdown += `${returnsDesc}\n\n`;
    }

    // Add remarks
    if (comment.docComment.remarksBlock) {
      markdown += `### Remarks\n\n`;
      const remarks = this.renderDocNodes(comment.docComment.remarksBlock.content.nodes);
      markdown += `${remarks}\n\n`;
    }

    // Add validation issues if any
    if (comment.validationResults.length > 0) {
      markdown += `### Validation Issues\n\n`;
      /**
       * result
       * @public
       */
      for (const result of comment.validationResults) {
        const icon = result.severity === 'error' ? '❌' : '⚠️';
        markdown += `${icon} **${result.severity.toUpperCase()}**: ${result.message}\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Generate markdown documentation for multiple comments
   *
   * @param comments - Array of parsed doc comments
   * @returns Markdown string
   * @public
   */
  generateForComments(comments: ParsedDocComment[]): string {
    let markdown = '# API Documentation\n\n';

    /**
     * comment
     * @public
     */
    for (const comment of comments) {
      markdown += this.generateForComment(comment);
      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Render an array of DocNodes to plain text
   *
   * @param nodes - Array of DocNodes
   * @returns Rendered text
   */
  private renderDocNodes(nodes: ReadonlyArray<DocNode>): string {
    let result = '';

    /**
     * node
     * @public
     */
    for (const node of nodes) {
      switch (node.kind) {
        case DocNodeKind.PlainText:
          result += (node as DocPlainText).text;
          break;
        case DocNodeKind.SoftBreak:
          result += ' ';
          break;
        case DocNodeKind.Paragraph:
          result += this.renderDocNodes((node as DocParagraph).nodes);
          result += '\n\n';
          break;
        case DocNodeKind.CodeSpan:
          result += `\`${(node as DocCodeSpan).code}\``;
          break;
        default:
          // Handle other node types as needed
          result += node.toString();
      }
    }

    return result.trim();
  }
}
