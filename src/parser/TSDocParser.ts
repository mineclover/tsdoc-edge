/**
 * TSDoc parser implementation
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  TSDocParser as MicrosoftTSDocParser,
  type ParserContext,
  TSDocConfiguration,
  TSDocTagDefinition,
  TSDocTagSyntaxKind,
} from '@microsoft/tsdoc';
import * as ts from 'typescript';
import type { ParsedDocComment, ParseResult } from '../types';

/**
 * Custom tag specification for TSDoc Edge
 */
export interface CustomTagSpec {
  tagName: string;
  syntaxKind?: TSDocTagSyntaxKind;
  allowMultiple?: boolean;
}

/**
 * Complete list of custom TSDoc tags used by TSDoc Edge
 */
export const TSDOC_EDGE_CUSTOM_TAGS: CustomTagSpec[] = [
  // Core & Link tags
  { tagName: '@doc', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@id', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@contract', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@precondition', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@postcondition', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@invariant', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@responsibility', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@problem', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@solves', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@context', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },

  // Dependency & Relationship tags
  { tagName: '@depends', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@dependsOn', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@uses', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@usedBy', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@relatedTo', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@implements', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@extends', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@depType', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@depReason', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },

  // Architecture & Design Decision tags
  { tagName: '@decision', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@designDecision', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@rationale', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@consequences', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@architecture', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@pattern', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@requirement', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@issue', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },

  // Module Specification Framework (7 aspects)
  { tagName: '@functionality', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@algorithm', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@complexity', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@sideEffect', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@mutates', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@io', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@scope', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@purpose', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@input', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@output', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@logic', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@reads', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@writes', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },

  // Testing tags
  { tagName: '@testedBy', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@testScenario', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@coverage', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@fixture', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },

  // Quality & Lifecycle tags
  { tagName: '@deadcode', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  {
    tagName: '@deprecatedInFavorOf',
    syntaxKind: TSDocTagSyntaxKind.BlockTag,
    allowMultiple: false,
  },
  { tagName: '@enhances', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@requires', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@feature', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@plan', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@overlay', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@ttsc', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },

  // Common documentation & JSDoc compatibility tags
  { tagName: '@private', syntaxKind: TSDocTagSyntaxKind.ModifierTag, allowMultiple: false },
  { tagName: '@description', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@template', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@module', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@todo', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@default', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@useCase', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@performance', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@priority', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@version', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@symbol', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@updated', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@changelog', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
];

/**
 * Generate standard tsdoc.json configuration object compliant with Microsoft schema
 * @returns JSON-serializable tsdoc.json object
 * @public
 */
export function generateTsdocJson(): {
  $schema: string;
  tagDefinitions: Array<{
    tagName: string;
    syntaxKind: 'block' | 'modifier';
    allowMultiple?: boolean;
  }>;
} {
  return {
    $schema: 'https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json',
    tagDefinitions: TSDOC_EDGE_CUSTOM_TAGS.map((tag) => ({
      tagName: tag.tagName,
      syntaxKind: tag.syntaxKind === TSDocTagSyntaxKind.ModifierTag ? 'modifier' : 'block',
      ...(tag.allowMultiple ? { allowMultiple: true } : {}),
    })),
  };
}

// TypeScript compiler API internal types
/**
 * NodeWithJSDoc interface
 * @doc [[TSDocParser]]
 * @public
 */
interface NodeWithJSDoc extends ts.Node {
  jsDoc?: ts.JSDoc[];
}

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
 *
 * @problem Standard TSDoc doesn't support custom tags needed for TSDoc Edge
 * @solves Extends Microsoft TSDoc parser with custom tag definitions
 * @context Need structured metadata beyond standard JSDoc tags
 *
 * @functionality Custom tag registration, AST traversal, Comment extraction, TSDoc parsing
 *
 * @decision Wrap Microsoft TSDoc parser instead of forking
 * @rationale Benefit from upstream improvements and standards compliance
 * @consequences Dependent on @microsoft/tsdoc API stability, Clean architecture
 *
 * @depends @microsoft/tsdoc, typescript
 * @depType external
 * @depReason TSDoc parsing engine and TypeScript AST
 */
export class TSDocParser {
  private parser: MicrosoftTSDocParser;
  private configuration: TSDocConfiguration;

  /**
   * Creates a new TSDocParser instance
   *
   * @public
   */
  constructor(customConfigPath?: string) {
    // Create TSDoc configuration with custom tags
    this.configuration = new TSDocConfiguration();

    // Register all standard TSDoc Edge custom tags
    for (const tagSpec of TSDOC_EDGE_CUSTOM_TAGS) {
      if (this.configuration.tryGetTagDefinition(tagSpec.tagName) === undefined) {
        this.configuration.addTagDefinition(
          new TSDocTagDefinition({
            tagName: tagSpec.tagName,
            syntaxKind: tagSpec.syntaxKind ?? TSDocTagSyntaxKind.BlockTag,
            allowMultiple: tagSpec.allowMultiple ?? false,
          })
        );
      }
    }

    // Load any custom tags from tsdoc.json if present
    this.loadFromTsdocConfigFile(customConfigPath);

    this.parser = new MicrosoftTSDocParser(this.configuration);
  }

  /**
   * Load custom tag definitions from tsdoc.json file if present
   */
  private loadFromTsdocConfigFile(customConfigPath?: string): void {
    const configPath = customConfigPath || path.join(process.cwd(), 'tsdoc.json');
    if (!fs.existsSync(configPath)) return;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (Array.isArray(config.tagDefinitions)) {
        for (const def of config.tagDefinitions) {
          if (!def.tagName) continue;
          const tagName = def.tagName.startsWith('@') ? def.tagName : `@${def.tagName}`;
          if (this.configuration.tryGetTagDefinition(tagName) !== undefined) continue;

          let syntaxKind = TSDocTagSyntaxKind.BlockTag;
          if (def.syntaxKind === 'modifier') {
            syntaxKind = TSDocTagSyntaxKind.ModifierTag;
          }

          this.configuration.addTagDefinition(
            new TSDocTagDefinition({
              tagName,
              syntaxKind,
              allowMultiple: Boolean(def.allowMultiple),
            })
          );
        }
      }
    } catch {
      // Ignore invalid tsdoc.json, defaults are already loaded
    }
  }

  /**
   * Get the underlying Microsoft TSDocConfiguration
   * @public
   */
  getConfiguration(): TSDocConfiguration {
    return this.configuration;
  }

  /**
   * Parse a TSDoc comment string
   *
   * @param text - TSDoc comment text including delimiters
   * @returns Parser context with parsed comment
   * @public
   */
  parseString(text: string): ParserContext {
    return this.parser.parseString(text);
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
      const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

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
    const jsDocComments = (node as NodeWithJSDoc).jsDoc;

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
