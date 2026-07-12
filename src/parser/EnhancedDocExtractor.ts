/**
 * Enhanced documentation extractor from TypeScript AST
 * Automatically extracts EnhancedSymbolDoc from source code
 *
 * @packageDocumentation
 * @responsibility Extract EnhancedSymbolDoc from TypeScript files using AST + TSDoc
 */

import { type ParserContext, TSDocParser } from '@microsoft/tsdoc';
import * as ts from 'typescript';
import type { Symbol } from '../types/graph';
import type {
  DecisionRecord,
  DependencySpec,
  EnhancedSymbolDoc,
  ErrorExperience,
  FuturePlan,
} from '../types/tags';

/**
 * Extraction options
 * @doc [[EnhancedDocExtractor]]
 * @public
 */
export interface ExtractionOptions {
  /** Generate IDs automatically if not specified */
  autoGenerateIds?: boolean;
  /** Include partial documentation (even if incomplete) */
  includePartial?: boolean;
  /** Default version for new docs */
  defaultVersion?: string;
}

/**
 * Extraction result for a single symbol
 * @public
 */
export interface ExtractedEnhancedDoc {
  /** Base symbol information */
  symbol: Symbol;
  /** Enhanced documentation (may be partial) */
  doc: EnhancedSymbolDoc;
  /** Completeness score (0-100) */
  completeness: number;
  /** Missing fields */
  missing: string[];
}

/**
 * Enhanced documentation extractor
 *
 * @public
 * @responsibility
 * Extract EnhancedSymbolDoc from TypeScript source files automatically.
 * Parses TSDoc comments and combines with AST information.
 *
 * @problem Manual creation of EnhancedSymbolDoc is tedious and error-prone
 * @solves Automatically extract enhanced docs from TSDoc custom tags
 * @context 6-category documentation system requires structured metadata
 * @useCase Automate documentation generation from annotated source code
 *
 * @functionality AST traversal, Custom tag parsing, Completeness calculation, Symbol extraction
 *
 * @decision Parse custom TSDoc tags instead of natural language processing
 * @rationale Structured tags are more reliable than NLP for extracting metadata
 * @consequences Requires developers to use custom tags, More predictable results
 *
 * @depends typescript, @microsoft/tsdoc
 * @depType external
 * @depReason TypeScript Compiler API for AST, TSDoc for comment parsing
 *
 * @todo Add support for extracting from compiled .d.ts files
 * @priority low
 *
 * Usage:
 * ```typescript
 * const extractor = new EnhancedDocExtractor();
 * const results = extractor.extractFromFile('src/foo.ts', sourceCode);
 * ```
 */
export class EnhancedDocExtractor {
  private tsdocParser: TSDocParser;
  private options: Required<ExtractionOptions>;

  constructor(options: ExtractionOptions = {}) {
    this.tsdocParser = new TSDocParser();
    this.options = {
      autoGenerateIds: options.autoGenerateIds ?? true,
      includePartial: options.includePartial ?? true,
      defaultVersion: options.defaultVersion ?? '1.0.0',
    };
  }

  /**
   * Extract enhanced documentation from a TypeScript file
   *
   * @param filePath - Source file path
   * @param sourceCode - Source code content
   * @returns Array of extracted enhanced docs
   *
   * @example
   * ```typescript
   * const extractor = new EnhancedDocExtractor();
   * const docs = extractor.extractFromFile('src/foo.ts', code);
   * console.log(docs[0].completeness); // 85
   * ```
   */
  extractFromFile(filePath: string, sourceCode: string): ExtractedEnhancedDoc[] {
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

    const results: ExtractedEnhancedDoc[] = [];

    const visit = (node: ts.Node, isInsideClass = false) => {
      // Skip class members (methods, properties)
      if (isInsideClass && (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node))) {
        return;
      }

      // Extract from exportable symbols
      if (this.isExportableSymbol(node)) {
        const result = this.extractFromNode(node, sourceFile, filePath);
        if (result) {
          results.push(result);
        }
      }

      // Mark if we're inside a class
      const insideClass = ts.isClassDeclaration(node);
      ts.forEachChild(node, (child) => visit(child, insideClass));
    };

    visit(sourceFile);

    return results;
  }

  /**
   * Check if node is an exportable symbol
   */
  private isExportableSymbol(node: ts.Node): boolean {
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isVariableStatement(node) ||
      ts.isMethodDeclaration(node)
    );
  }

  /**
   * Extract enhanced doc from a single node
   */
  private extractFromNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): ExtractedEnhancedDoc | null {
    // Get symbol name
    const name = this.getSymbolName(node);
    if (!name) return null;

    // Get JSDoc comment
    const jsDocComment = this.getJSDocComment(node, sourceFile);
    if (!jsDocComment && !this.options.includePartial) {
      return null;
    }

    // Parse TSDoc
    const tsdocContext = jsDocComment ? this.tsdocParser.parseString(jsDocComment) : null;

    // Extract symbol info
    const symbol = this.extractSymbolInfo(node, sourceFile, filePath, name);

    // Extract enhanced doc
    const doc = this.extractEnhancedDoc(tsdocContext, symbol, jsDocComment || '');

    // Calculate completeness
    const { completeness, missing } = this.calculateCompleteness(doc);

    return {
      symbol,
      doc,
      completeness,
      missing,
    };
  }

  /**
   * Get symbol name from node
   */
  private getSymbolName(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isClassDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isInterfaceDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isTypeAliasDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (ts.isIdentifier(declaration.name)) {
        return declaration.name.text;
      }
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    return null;
  }

  /**
   * Get JSDoc comment text
   */
  private getJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    const jsDocTags = ts.getJSDocTags(node);
    if (jsDocTags.length === 0) return null;

    const fullText = sourceFile.getFullText();
    const commentRanges = ts.getLeadingCommentRanges(fullText, node.pos);

    if (!commentRanges || commentRanges.length === 0) return null;

    const lastComment = commentRanges[commentRanges.length - 1];
    return fullText.substring(lastComment.pos, lastComment.end);
  }

  /**
   * Extract basic symbol information
   */
  private extractSymbolInfo(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
    name: string
  ): Symbol {
    const { line, character: column } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    // Check for export keyword with type guards
    let hasExportKeyword = false;
    if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      hasExportKeyword =
        modifiers?.some((mod: ts.Modifier) => mod.kind === ts.SyntaxKind.ExportKeyword) || false;
    }

    let type: Symbol['type'] = 'function';
    if (ts.isFunctionDeclaration(node)) type = 'function';
    else if (ts.isClassDeclaration(node)) type = 'class';
    else if (ts.isInterfaceDeclaration(node)) type = 'interface';
    else if (ts.isTypeAliasDeclaration(node)) type = 'type';
    else if (ts.isVariableStatement(node)) type = 'variable';
    else if (ts.isMethodDeclaration(node)) type = 'method';

    const id = this.options.autoGenerateIds ? `${name.toLowerCase()}-${Date.now()}` : name;

    return {
      id,
      name,
      type,
      filePath,
      line: line + 1,
      column,
      isExported: hasExportKeyword || false,
      isPublic: hasExportKeyword || false,
      tests: [],
      designDecisions: [],
    };
  }

  /**
   * Extract enhanced documentation from TSDoc
   */
  private extractEnhancedDoc(
    _tsdocContext: ParserContext | null,
    symbol: Symbol,
    rawComment: string
  ): EnhancedSymbolDoc {
    const now = new Date().toISOString();

    const doc: EnhancedSymbolDoc = {
      symbolId: symbol.id,
      createdAt: now,
      updatedAt: now,
      version: this.options.defaultVersion,
    };

    // Parse custom tags from raw comment
    const customTags = this.parseCustomTags(rawComment);

    // Extract problem solving
    if (customTags.problem || customTags.solves) {
      doc.problemSolving = {
        description: customTags.problem || customTags.solves || '',
        context: customTags.context || '',
        targetUseCase: customTags.usecase,
        relatedProblem: customTags.relatedproblem,
      };
    }

    // Extract functionality
    if (customTags.functionality || customTags.features) {
      const features = this.parseList(customTags.features || customTags.functionality || '');
      doc.functionality = {
        mainFeatures: features,
        components: [],
      };
    }

    // Extract error experiences
    const errors = this.parseErrorExperiences(customTags);
    if (errors.length > 0) {
      doc.errorExperiences = errors;
    }

    // Extract decisions
    const decisions = this.parseDecisions(customTags);
    if (decisions.length > 0) {
      doc.decisions = decisions;
    }

    // Extract dependencies
    const deps = this.parseDependencies(customTags);
    if (deps.length > 0) {
      doc.dependencies = deps;
    }

    // Extract future plans
    const plans = this.parseFuturePlans(customTags);
    if (plans.length > 0) {
      doc.futurePlans = plans;
    }

    return doc;
  }

  /**
   * Parse custom tags from raw JSDoc comment
   */
  private parseCustomTags(comment: string): Record<string, string> {
    const tags: Record<string, string> = {};
    const lines = comment.split('\n');

    let currentTag = '';
    let currentValue = '';

    for (const line of lines) {
      // Remove leading *, whitespace, and trailing */
      const trimmed = line
        .trim()
        .replace(/^\*\s*/, '')
        .replace(/\*\/$/, '')
        .trim();

      // Check for @tag
      const tagMatch = trimmed.match(/^@(\w+)\s*(.*)/);
      if (tagMatch) {
        // Save previous tag
        if (currentTag) {
          tags[currentTag.toLowerCase()] = currentValue.trim();
        }

        currentTag = tagMatch[1];
        currentValue = tagMatch[2];
      } else if (currentTag && trimmed) {
        // Continue multiline tag
        currentValue += ` ${trimmed}`;
      }
    }

    // Save last tag
    if (currentTag) {
      tags[currentTag.toLowerCase()] = currentValue.trim();
    }

    // Clean up all tag values (remove trailing / from */)
    for (const key in tags) {
      tags[key] = tags[key].replace(/\s*\/\s*$/, '').trim();
    }

    return tags;
  }

  /**
   * Parse list from string
   */
  private parseList(str: string): string[] {
    return str
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Parse error experiences
   */
  private parseErrorExperiences(tags: Record<string, string>): ErrorExperience[] {
    const errors: ErrorExperience[] = [];

    if (tags.error || tags.errorexperience) {
      const errorText = tags.error || tags.errorexperience || '';
      errors.push({
        id: `ERR-${Date.now()}`,
        errorType: tags.errortype || 'Error',
        message: errorText,
        context: tags.errorcontext || '',
        solution: tags.errorsolution || tags.fix || '',
        prevention: tags.prevention,
        occurredAt: tags.errordate,
      });
    }

    return errors;
  }

  /**
   * Parse decisions (ADRs)
   */
  private parseDecisions(tags: Record<string, string>): DecisionRecord[] {
    const decisions: DecisionRecord[] = [];

    if (tags.decision || tags.adr) {
      const decisionText = tags.decision || tags.adr || '';
      decisions.push({
        id: tags.decisionid || `ADR-${Date.now()}`,
        title: tags.decisiontitle || decisionText.substring(0, 50),
        decision: decisionText,
        rationale: tags.rationale || tags.reason || '',
        alternatives: [],
        consequences: tags.consequences ? this.parseList(tags.consequences) : [],
        date: tags.decisiondate || new Date().toISOString().split('T')[0],
        status: (tags.decisionstatus as DecisionRecord['status']) || 'accepted',
      });
    }

    return decisions;
  }

  /**
   * Parse dependencies
   */
  private parseDependencies(tags: Record<string, string>): DependencySpec[] {
    const deps: DependencySpec[] = [];

    if (tags.depends || tags.dependson || tags.dependency) {
      const depText = tags.depends || tags.dependson || tags.dependency || '';
      const depList = this.parseList(depText);

      // Validate dependency type
      const depType = tags.deptype || 'module';
      const validTypes = ['module', 'file', 'symbol', 'external'];
      const type = validTypes.includes(depType)
        ? (depType as 'module' | 'file' | 'symbol' | 'external')
        : 'module';

      for (const dep of depList) {
        deps.push({
          target: dep,
          type,
          reason: tags.depreason || '',
        });
      }
    }

    return deps;
  }

  /**
   * Parse future plans
   */
  private parseFuturePlans(tags: Record<string, string>): FuturePlan[] {
    const plans: FuturePlan[] = [];

    if (tags.todo || tags.future || tags.plan) {
      const planText = tags.todo || tags.future || tags.plan || '';
      plans.push({
        id: `PLAN-${Date.now()}`,
        title: planText.substring(0, 50),
        description: planText,
        priority: (tags.priority as FuturePlan['priority']) || 'medium',
        status: 'planned',
        createdAt: new Date().toISOString(),
      });
    }

    return plans;
  }

  /**
   * Calculate documentation completeness
   */
  private calculateCompleteness(doc: EnhancedSymbolDoc): {
    completeness: number;
    missing: string[];
  } {
    const fields = [
      'problemSolving',
      'functionality',
      'errorExperiences',
      'decisions',
      'dependencies',
      'futurePlans',
    ] as const;

    let present = 0;
    const missing: string[] = [];

    for (const field of fields) {
      const value = doc[field];
      if (value !== undefined) {
        if (Array.isArray(value)) {
          if (value.length > 0) present++;
          else missing.push(field);
        } else {
          present++;
        }
      } else {
        missing.push(field);
      }
    }

    const completeness = Math.round((present / fields.length) * 100);

    return { completeness, missing };
  }
}
