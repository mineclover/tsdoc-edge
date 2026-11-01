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
 * Irreducible custom TSDoc tags owned exclusively by `tsdoc-edge`.
 *
 * Overlapping JSDoc compatibility tags and code-space dependency tags are retired in favor
 * of `@microsoft/tsdoc` v0 standard tags (29 tags) and `ttsc` (`@ttsc/graph` + TypeScript AST);
 * see `CANONICAL_TTSC_RELATIONSHIP_BRIDGE` and `CANONICAL_TSDOC_STANDARD_BRIDGE`.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @doc [[CrossSpecIntegrationContract]]
 * @public
 */
export const TSDOC_EDGE_CUSTOM_TAGS: CustomTagSpec[] = [
  // 1. SSOT Document Checkpoint Routing (1)
  { tagName: '@doc', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },

  // 2. Design-by-Contract & Purpose Ontology (8)
  { tagName: '@responsibility', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@problem', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@solves', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@context', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@contract', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@precondition', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@postcondition', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@invariant', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },

  // 3. Module Specification Logic & Side-Effect Semantics (4)
  { tagName: '@functionality', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@algorithm', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@complexity', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
  { tagName: '@sideEffect', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },

  // 4. Inline Architecture Decision Record (ADR) Triad (3)
  { tagName: '@decision', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@rationale', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@consequences', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },

  // 5. Non-AST Semantic Relationships & Governance (6)
  { tagName: '@relatedTo', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@enhances', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@requires', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@feature', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@testScenario', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: true },
  { tagName: '@deadcode', syntaxKind: TSDocTagSyntaxKind.BlockTag, allowMultiple: false },
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
function getNodeJsDocs(node: ts.Node): readonly ts.JSDoc[] {
  if ('jsDoc' in node && Array.isArray(node.jsDoc)) {
    return node.jsDoc.filter(ts.isJSDoc);
  }
  return [];
}

function isObjectRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/**
 * Parser for extracting and parsing TSDoc comments from TypeScript source files
 *
 * @doc [[TSDocParser]]
 * @doc [[TSDocStandardSpecification]]
 * @public
 * @responsibility Parse TypeScript files and extract TSDoc comments with custom tag support
 * @contract Initialize TSDoc parser with custom tags and provide file parsing capability
 * @testScenario Parse file with valid TSDoc comments
 * @testScenario Extract custom tags (`@doc`, `@contract`, `@responsibility`)
 * @testScenario Handle files with no comments
 * @testScenario Handle malformed TSDoc
 *
 * @problem Standard TSDoc doesn't support custom tags needed for TSDoc Edge
 * @solves Extends Microsoft TSDoc parser with custom tag definitions
 * @context Need structured metadata beyond standard TSDoc tags
 *
 * @functionality Custom tag registration, AST traversal, Comment extraction, TSDoc parsing
 *
 * @decision Wrap Microsoft TSDoc parser instead of forking
 * @rationale Benefit from upstream improvements and standards compliance
 * @consequences Dependent on `@microsoft/tsdoc` API stability, Clean architecture
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
      const config: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (isObjectRecord(config) && isUnknownArray(config.tagDefinitions)) {
        for (const def of config.tagDefinitions) {
          if (!isObjectRecord(def) || typeof def.tagName !== 'string' || !def.tagName) continue;
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
    const jsDocComments = getNodeJsDocs(node);

    if (jsDocComments.length > 0) {
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
    if (ts.isInterfaceDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node)) {
      return node.name.getText();
    }
    if (ts.isVariableDeclaration(node)) {
      return node.name.getText();
    }
    return 'unknown';
  }
}

export {
  type ExtractDocCheckpointsOptions,
  extractDocCheckpointsFromSource,
  extractLeadingJsDocText,
  getDirectJsDocs,
  readTsdocComment,
  renderDocNodesText,
  renderDocNodeText,
  type SourceDocCheckpointReference,
  type StructuredTsdocComment,
  type TsdocDocCheckpointEntry,
  type TsdocParameterEntry,
  type TsdocReleaseVisibility,
  type TsdocRenderOptions,
  type TsdocTypeParameterEntry,
} from './TsdocCommentReader';
