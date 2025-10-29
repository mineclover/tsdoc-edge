/**
 * TSDoc parser implementation
 * @packageDocumentation
 */

import * as ts from 'typescript';
import {
  TSDocParser as MicrosoftTSDocParser,
  ParserContext,
  TSDocConfiguration,
  TSDocTagDefinition,
  TSDocTagSyntaxKind,
} from '@microsoft/tsdoc';
import { ParsedDocComment, ParseResult } from '../types';

/**
 * Parser for extracting and parsing TSDoc comments from TypeScript source files
 *
 * @id 000
 * @public
 * @responsibility Parse TypeScript files and extract TSDoc comments with custom tag support
 * @contract Initialize TSDoc parser with custom tags and provide file parsing capability
 * @testScenario Parse file with valid TSDoc comments
 * @testScenario Extract custom tags (@id, @contract, @responsibility)
 * @testScenario Handle files with no comments
 * @testScenario Handle malformed TSDoc
 */
export class TSDocParser {
  private parser: MicrosoftTSDocParser;
  private configuration: TSDocConfiguration;

  /**
   * Creates a new TSDocParser instance
   *
   * @public
   */
  constructor() {
    // Create TSDoc configuration with custom tags
    this.configuration = new TSDocConfiguration();

    // Define custom tags
    this.configuration.addTagDefinition(
      new TSDocTagDefinition({
        tagName: '@id',
        syntaxKind: TSDocTagSyntaxKind.BlockTag,
        allowMultiple: false,
      })
    );

    this.configuration.addTagDefinition(
      new TSDocTagDefinition({
        tagName: '@contract',
        syntaxKind: TSDocTagSyntaxKind.BlockTag,
        allowMultiple: false,
      })
    );

    this.configuration.addTagDefinition(
      new TSDocTagDefinition({
        tagName: '@precondition',
        syntaxKind: TSDocTagSyntaxKind.BlockTag,
        allowMultiple: true,
      })
    );

    this.configuration.addTagDefinition(
      new TSDocTagDefinition({
        tagName: '@postcondition',
        syntaxKind: TSDocTagSyntaxKind.BlockTag,
        allowMultiple: true,
      })
    );

    this.configuration.addTagDefinition(
      new TSDocTagDefinition({
        tagName: '@responsibility',
        syntaxKind: TSDocTagSyntaxKind.BlockTag,
        allowMultiple: false,
      })
    );

    // Dependency tags
    this.configuration.addTagDefinition(
      new TSDocTagDefinition({
        tagName: '@uses',
        syntaxKind: TSDocTagSyntaxKind.BlockTag,
        allowMultiple: true,
      })
    );

    this.configuration.addTagDefinition(
      new TSDocTagDefinition({
        tagName: '@usedBy',
        syntaxKind: TSDocTagSyntaxKind.BlockTag,
        allowMultiple: true,
      })
    );

    this.parser = new MicrosoftTSDocParser(this.configuration);
  }

  /**
   * Parse a TypeScript source file and extract all TSDoc comments
   *
   * @param filePath - Path to the source file
   * @param sourceCode - Source code content
   * @returns Parse result containing all doc comments
   * @public
   */
  parseFile(filePath: string, sourceCode: string): ParseResult {
    const comments: ParsedDocComment[] = [];
    const errors: Error[] = [];

    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      this.visitNode(sourceFile, filePath, comments, errors);
    } catch (error) {
      errors.push(error as Error);
    }

    return {
      filePath,
      comments,
      errors,
    };
  }

  /**
   * Visit a TypeScript AST node and extract TSDoc comments
   *
   * @param node - TypeScript AST node
   * @param filePath - Source file path
   * @param comments - Array to collect parsed comments
   * @param errors - Array to collect errors
   */
  private visitNode(
    node: ts.Node,
    filePath: string,
    comments: ParsedDocComment[],
    errors: Error[]
  ): void {
    // Check if node has JSDoc comments
    const jsDocComments = (node as any).jsDoc;

    if (jsDocComments && jsDocComments.length > 0) {
      for (const jsDoc of jsDocComments) {
        try {
          // Get the full JSDoc text including /** and */
          const fullText = jsDoc.getFullText();
          const parserContext: ParserContext = this.parser.parseString(fullText);

          const symbolName = this.getSymbolName(node);

          comments.push({
            docComment: parserContext.docComment,
            filePath,
            symbolName,
            validationResults: [], // Will be filled by validator
            isValid: true, // Will be updated by validator
          });
        } catch (error) {
          errors.push(error as Error);
        }
      }
    }

    // Recursively visit child nodes
    ts.forEachChild(node, (child) => this.visitNode(child, filePath, comments, errors));
  }

  /**
   * Extract symbol name from TypeScript node
   *
   * @param node - TypeScript AST node
   * @returns Symbol name or 'unknown'
   */
  private getSymbolName(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isClassDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isInterfaceDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && node.name) {
      return node.name.getText();
    }
    if (ts.isVariableDeclaration(node) && node.name) {
      return node.name.getText();
    }
    return 'unknown';
  }
}
