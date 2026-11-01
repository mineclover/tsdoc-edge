/**
 * Enhanced documentation extractor from TypeScript AST
 * Automatically extracts EnhancedSymbolDoc from source code
 *
 * @packageDocumentation
 * @responsibility Extract EnhancedSymbolDoc from TypeScript files using AST + TSDoc
 */

import type { ParserContext } from '@microsoft/tsdoc';
import * as ts from 'typescript';
import type { Symbol } from '../types/graph';
import type {
  ContractSpec,
  DecisionRecord,
  DependencySpec,
  EnhancedSymbolDoc,
  ErrorExperience,
  FuturePlan,
} from '../types/tags';
import {
  extractLeadingJsDocText,
  readTsdocComment,
  type StructuredTsdocComment,
  TSDocParser,
} from './TSDocParser';

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
 * @doc [[TSDocStandardSpecification]]
 * @public
 * @responsibility
 * Extract EnhancedSymbolDoc from TypeScript source files automatically.
 * Parses TSDoc comments via `@microsoft/tsdoc` `DocComment` AST and combines with TypeScript AST information.
 *
 * @problem Manual creation of EnhancedSymbolDoc is tedious and error-prone
 * @solves Automatically extract enhanced docs from `@microsoft/tsdoc` AST nodes and TypeScript AST imports
 * @context 6-category documentation system requires structured metadata
 *
 * @functionality AST traversal, Standard and custom TSDoc AST extraction, Completeness calculation, Symbol extraction
 *
 * @decision Delegate comment tokenization directly to `@microsoft/tsdoc` `DocComment` AST and TypeScript AST imports
 * @rationale Upstream standard AST avoids regex drift, supports multiline blocks and repeated ADR tags, and trusts `@throws`/`@remarks`/`@privateRemarks`
 * @consequences Deterministic extraction aligned with `@microsoft/tsdoc` and `ttsc`
 *
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
   * @public
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

    const visit = (node: ts.Node) => {
      // Extract declarations at source/module scope and public members of declarations.
      if (this.isExportableSymbol(node)) {
        const result = this.extractFromNode(node, sourceFile, filePath);
        if (result) {
          results.push(result);
        }
      }

      // Declaration files commonly place exports in ambient namespaces/modules. Traverse
      // declaration members, but never function bodies or ordinary implementation blocks.
      if (
        ts.isSourceFile(node) ||
        ts.isModuleDeclaration(node) ||
        ts.isModuleBlock(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isClassDeclaration(node)
      ) {
        ts.forEachChild(node, visit);
      }
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
      ts.isEnumDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isMethodSignature(node) ||
      ts.isPropertySignature(node) ||
      ts.isPropertyDeclaration(node)
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
    const name = this.getSymbolName(node);
    if (!name) return null;

    const jsDocComment = extractLeadingJsDocText(node, sourceFile);
    if (!jsDocComment && !this.options.includePartial) {
      return null;
    }

    const tsdocContext: ParserContext | null = jsDocComment
      ? this.tsdocParser.parseString(jsDocComment)
      : null;
    const structured = tsdocContext ? readTsdocComment(tsdocContext.docComment) : null;

    const symbol = this.extractSymbolInfo(node, sourceFile, filePath, name, structured);
    const doc = this.extractEnhancedDoc(structured, symbol, sourceFile);
    if (!this.options.includePartial && !this.hasEnhancedMetadata(doc, symbol)) {
      return null;
    }
    const { completeness, missing } = this.calculateCompleteness(doc);

    return {
      symbol,
      doc,
      completeness,
      missing,
    };
  }

  /**
   * Check whether an extracted symbol carries explicit enhanced TSDoc metadata
   * beyond file-level AST imports.
   */
  private hasEnhancedMetadata(doc: EnhancedSymbolDoc, symbol: Symbol): boolean {
    return Boolean(
      doc.problemSolving ||
        doc.functionality ||
        (doc.errorExperiences && doc.errorExperiences.length > 0) ||
        (doc.decisions && doc.decisions.length > 0) ||
        (doc.futurePlans && doc.futurePlans.length > 0) ||
        doc.dependencies?.some((dep) => dep.reason !== 'TypeScript AST import') ||
        symbol.contract
    );
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
    if (ts.isEnumDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isVariableStatement(node)) {
      if (
        node.declarationList.declarations.length > 0 &&
        ts.isIdentifier(node.declarationList.declarations[0].name)
      ) {
        return node.declarationList.declarations[0].name.text;
      }
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    if (
      (ts.isMethodSignature(node) ||
        ts.isPropertySignature(node) ||
        ts.isPropertyDeclaration(node)) &&
      (ts.isIdentifier(node.name) ||
        ts.isStringLiteral(node.name) ||
        ts.isNumericLiteral(node.name))
    ) {
      return node.name.text;
    }
    return null;
  }

  private hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    return ts.canHaveModifiers(node)
      ? (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false)
      : false;
  }

  /**
   * Declaration files have two useful export modes: script-style ambient declarations
   * (where top-level declarations are visible globally) and external modules (where an
   * explicit `export` is required). Ambient namespace/module members are visible through
   * their container, while class/interface members are public unless marked private/protected.
   */
  private isDeclarationExported(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    hasExportKeyword: boolean
  ): boolean {
    if (hasExportKeyword) return true;

    const parent = node.parent;
    if (ts.isClassDeclaration(parent) || ts.isInterfaceDeclaration(parent)) {
      const parentExported = this.isDeclarationExported(
        parent,
        sourceFile,
        this.hasModifier(parent, ts.SyntaxKind.ExportKeyword)
      );
      return (
        parentExported &&
        !this.hasModifier(node, ts.SyntaxKind.PrivateKeyword) &&
        !this.hasModifier(node, ts.SyntaxKind.ProtectedKeyword)
      );
    }

    const isDeclarationFile = sourceFile.isDeclarationFile || sourceFile.fileName.endsWith('.d.ts');
    if (!isDeclarationFile) return false;

    // `declare module` / `declare namespace` bodies are ambient containers. Their
    // declarations are part of the declaration surface even when `export` is omitted.
    let ancestor: ts.Node = parent;
    while (!ts.isSourceFile(ancestor)) {
      if (ts.isModuleDeclaration(ancestor)) return true;
      ancestor = ancestor.parent;
    }

    // A declaration-file script has implicit global exports. An external module created
    // by imports/exports requires an explicit export modifier.
    return !ts.isExternalModule(sourceFile);
  }

  /**
   * Extract basic symbol information
   */
  private extractSymbolInfo(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
    name: string,
    structured: StructuredTsdocComment | null
  ): Symbol {
    const { line, character: column } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    const hasExportKeyword = this.hasModifier(node, ts.SyntaxKind.ExportKeyword);

    let type: Symbol['type'] = 'function';
    if (ts.isFunctionDeclaration(node)) type = 'function';
    else if (ts.isClassDeclaration(node)) type = 'class';
    else if (ts.isInterfaceDeclaration(node)) type = 'interface';
    else if (ts.isTypeAliasDeclaration(node)) type = 'type';
    else if (ts.isEnumDeclaration(node)) type = 'enum';
    else if (ts.isVariableStatement(node)) type = 'variable';
    else if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) type = 'method';
    else if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) type = 'property';

    const id = this.options.autoGenerateIds ? `${name.toLowerCase()}-${Date.now()}` : name;
    const isExported = this.isDeclarationExported(node, sourceFile, hasExportKeyword);
    const isInternal = structured?.releaseVisibility === 'internal';
    const isPublic =
      isExported &&
      !isInternal &&
      !this.hasModifier(node, ts.SyntaxKind.PrivateKeyword) &&
      !this.hasModifier(node, ts.SyntaxKind.ProtectedKeyword);
    const contract = this.extractContractSpec(structured, name, filePath);

    return {
      id,
      name,
      type,
      filePath,
      line: line + 1,
      column,
      isExported,
      isPublic,
      ...(structured?.summary ? { summary: structured.summary } : {}),
      ...(contract ? { contract } : {}),
      tests: [],
      designDecisions: [],
    };
  }

  /**
   * Extract `@contract`, `@precondition`, `@postcondition`, and `@invariant` specifications from structured TSDoc.
   */
  private extractContractSpec(
    structured: StructuredTsdocComment | null,
    symbolName: string,
    filePath: string
  ): ContractSpec | undefined {
    if (!structured) {
      return undefined;
    }

    const contractDescription = structured.getFirstTagValue('@contract')?.trim() ?? '';
    const preconditions = structured
      .getTagValues('@precondition')
      .flatMap((value) => this.parseList(value));
    const postconditions = structured
      .getTagValues('@postcondition')
      .flatMap((value) => this.parseList(value));
    const invariants = structured
      .getTagValues('@invariant')
      .flatMap((value) => this.parseList(value));

    if (
      !contractDescription &&
      preconditions.length === 0 &&
      postconditions.length === 0 &&
      invariants.length === 0
    ) {
      return undefined;
    }

    return {
      symbolName,
      description: contractDescription || structured.summary || `${symbolName} contract`,
      preconditions,
      postconditions,
      invariants,
      filePath,
    };
  }

  /**
   * Extract enhanced documentation from `@microsoft/tsdoc` `StructuredTsdocComment` and TypeScript AST
   */
  private extractEnhancedDoc(
    structured: StructuredTsdocComment | null,
    symbol: Symbol,
    sourceFile: ts.SourceFile
  ): EnhancedSymbolDoc {
    const now = new Date().toISOString();

    const doc: EnhancedSymbolDoc = {
      symbolId: symbol.id,
      createdAt: now,
      updatedAt: now,
      version: this.options.defaultVersion,
    };

    const problem = structured?.getFirstTagValue('@problem');
    const solves = structured?.getFirstTagValue('@solves');
    const contextText = structured?.getFirstTagValue('@context');

    if (problem || solves) {
      doc.problemSolving = {
        description: problem || solves || '',
        context: contextText || '',
      };
    }

    const functionalityText = structured?.getFirstTagValue('@functionality') ?? structured?.remarks;
    if (functionalityText) {
      const features = this.parseList(functionalityText);
      if (features.length > 0) {
        doc.functionality = {
          mainFeatures: features,
          components: [],
        };
      }
    }

    const errors = this.parseErrorExperiences(structured);
    if (errors.length > 0) {
      doc.errorExperiences = errors;
    }

    const decisions = this.parseDecisions(structured);
    if (decisions.length > 0) {
      doc.decisions = decisions;
    }

    const deps = this.parseDependencies(structured, sourceFile);
    if (deps.length > 0) {
      doc.dependencies = deps;
    }

    const plans = this.parseFuturePlans(structured);
    if (plans.length > 0) {
      doc.futurePlans = plans;
    }

    return doc;
  }

  /**
   * Parse bullet list or comma/semicolon-separated items
   */
  private parseList(str: string): string[] {
    const trimmed = str.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith('- ') || trimmed.includes('\n- ')) {
      return trimmed
        .split(/(?:^|\n)\s*-\s+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    return trimmed
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Parse error experiences from standard `@microsoft/tsdoc` `@throws` blocks
   */
  private parseErrorExperiences(structured: StructuredTsdocComment | null): ErrorExperience[] {
    if (!structured || structured.throws.length === 0) {
      return [];
    }

    const now = Date.now();
    return structured.throws.map((throwsEntry, index) => {
      const typePrefixMatch = throwsEntry.match(
        /^([A-Z][A-Za-z0-9_.]*(?:Error|Exception))\s*(?:[-:]\s*)(.+)$/
      );
      const errorType = typePrefixMatch ? typePrefixMatch[1] : 'Error';
      const body = typePrefixMatch ? typePrefixMatch[2].trim() : throwsEntry.trim();
      const [messagePart, ...solutionParts] = body.split(/\s+-\s+/);
      const message = messagePart.trim();
      const solution = solutionParts.join(' - ').trim();

      return {
        id: `ERR-${now}-${index + 1}`,
        errorType,
        message,
        context: message,
        solution,
      };
    });
  }

  /**
   * Parse inline ADRs from `@decision`, `@rationale`, and `@consequences` blocks,
   * preserving multiple ADR triads on the same symbol by index.
   */
  private parseDecisions(structured: StructuredTsdocComment | null): DecisionRecord[] {
    if (!structured) {
      return [];
    }

    const decisionValues = structured
      .getTagValues('@decision')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (decisionValues.length === 0) {
      return [];
    }

    const rationales = structured.getTagValues('@rationale');
    const consequences = structured.getTagValues('@consequences');
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();

    return decisionValues.map((decisionText, index) => {
      const rationale = rationales[index]?.trim() ?? '';
      const consequenceText = consequences[index]?.trim() ?? '';
      return {
        id: `ADR-${now}-${index + 1}`,
        title: decisionText.substring(0, 50),
        decision: decisionText,
        rationale,
        alternatives: [],
        consequences: consequenceText ? this.parseList(consequenceText) : [],
        date: today,
        status: 'accepted',
      };
    });
  }

  /**
   * Extract dependencies from TypeScript AST `ImportDeclaration`s (canonical `ttsc`/AST SSOT),
   * non-AST semantic relation tags (`@relatedTo`, `@requires`, `@enhances`), and inline `{@link}` targets.
   */
  private parseDependencies(
    structured: StructuredTsdocComment | null,
    sourceFile: ts.SourceFile
  ): DependencySpec[] {
    const deps: DependencySpec[] = [];
    const seen = new Set<string>();

    // 1. Canonical TypeScript AST imports and declaration re-exports. This includes
    // `import type` and both `export { ... } from` / `export * from` forms used by .d.ts files.
    const addModuleDependency = (specifier: string, reason: string): void => {
      const target = specifier.trim();
      if (!target) return;
      const isRelative = target.startsWith('./') || target.startsWith('../');
      const type: DependencySpec['type'] = isRelative ? 'file' : 'external';
      const key = `${type}:${target}`;
      if (seen.has(key)) return;
      seen.add(key);
      deps.push({ target, type, reason });
    };

    const visitModuleStatements = (container: ts.Node): void => {
      for (const stmt of ts.isSourceFile(container) || ts.isModuleBlock(container)
        ? container.statements
        : []) {
        if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
          addModuleDependency(stmt.moduleSpecifier.text, 'TypeScript AST import');
        } else if (
          ts.isExportDeclaration(stmt) &&
          stmt.moduleSpecifier &&
          ts.isStringLiteral(stmt.moduleSpecifier)
        ) {
          addModuleDependency(stmt.moduleSpecifier.text, 'TypeScript AST re-export');
        }
        if (ts.isModuleDeclaration(stmt)) {
          let body: ts.ModuleBody | undefined = stmt.body;
          while (body && ts.isModuleDeclaration(body)) body = body.body;
          if (body && ts.isModuleBlock(body)) visitModuleStatements(body);
        }
      }
    };
    visitModuleStatements(sourceFile);

    if (!structured) {
      return deps;
    }

    // 2. Non-AST semantic relationship tags (@relatedTo, @requires, @enhances)
    const semanticTags = ['relatedTo', 'requires', 'enhances'] as const;
    for (const tagKind of semanticTags) {
      for (const rawPayload of structured.getTagValues(`@${tagKind}`)) {
        const payload = rawPayload.trim();
        if (!payload) continue;
        const [rawTarget, ...reasonParts] = payload.split(/\s+-\s+/);
        const target = rawTarget.trim().split(/[\s,]+/)[0];
        if (!target) continue;
        const key = `symbol:${target}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deps.push({
          target,
          type: 'symbol',
          reason: reasonParts.join(' - ').trim() || `@${tagKind} semantic relation`,
        });
      }
    }

    // 3. Standard inline {@link} symbol references
    for (const linkTarget of structured.links) {
      if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
        continue;
      }
      const key = `symbol:${linkTarget}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deps.push({
        target: linkTarget,
        type: 'symbol',
        reason: 'TSDoc {@link} reference',
      });
    }

    return deps;
  }

  /**
   * Parse future plans from standard `@privateRemarks` (`TODO:` / `PLAN:` lines).
   */
  private parseFuturePlans(structured: StructuredTsdocComment | null): FuturePlan[] {
    const remark = structured?.privateRemarks;
    if (!remark) {
      return [];
    }

    const lines = remark
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const now = Date.now();
    const createdAt = new Date().toISOString();
    const plans: FuturePlan[] = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const planMatch = line.match(/^(?:TODO|PLAN)(?:\s*\[(high|medium|low)\])?:\s*(.+)$/i);
      const planText = planMatch ? planMatch[2].trim() : index === 0 ? line : '';
      if (!planText) {
        continue;
      }
      const priority = (planMatch?.[1]?.toLowerCase() as FuturePlan['priority']) || 'medium';
      plans.push({
        id: `PLAN-${now}-${index + 1}`,
        title: planText.substring(0, 50),
        description: planText,
        priority,
        status: 'planned',
        createdAt,
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
