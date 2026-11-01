/**
 * Markdown documentation generator
 * @packageDocumentation
 */

import type { DocNode } from '@microsoft/tsdoc';
import { renderDocNodesText } from '../parser/TSDocParser';
import type { ParsedDocComment } from '../types';

/**
 * Generates markdown documentation from parsed `@microsoft/tsdoc` comments
 *
 * @doc [[MarkdownGenerator]]
 * @doc [[TSDocStandardSpecification]]
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
      if (summary) {
        markdown += `${summary}\n\n`;
      }
    }

    // Add parameters
    if (comment.docComment.params.blocks.length > 0) {
      markdown += `### Parameters\n\n`;
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

    // Add custom blocks (responsibility, contract, decision, throws, example, etc.)
    if (comment.docComment.customBlocks && comment.docComment.customBlocks.length > 0) {
      for (const block of comment.docComment.customBlocks) {
        const tagName = block.blockTag.tagName;
        const title = tagName.replace(/^@/, '').replace(/^[a-z]/, (c) => c.toUpperCase());
        const content = this.renderDocNodes(block.content.nodes);
        if (content.trim()) {
          markdown += `### ${title}\n\n${content}\n\n`;
        }
      }
    }

    // Add validation issues if any
    if (comment.validationResults.length > 0) {
      markdown += `### Validation Issues\n\n`;
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

    for (const comment of comments) {
      markdown += this.generateForComment(comment);
      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Render an array of `@microsoft/tsdoc` `DocNode` items into Markdown text.
   *
   * @param nodes - Array of DocNodes
   * @returns Rendered Markdown text
   */
  private renderDocNodes(nodes: ReadonlyArray<DocNode>): string {
    return renderDocNodesText(nodes, { preserveMarkdown: true });
  }
}
