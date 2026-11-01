/**
 * Module Specification Generator
 *
 * @packageDocumentation
 * @responsibility Generate module specifications using 7-part framework
 * @problem Manual module specification creation is time-consuming
 * @solves Automatically extract module specs from TypeScript source code and `@microsoft/tsdoc` AST
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import {
  ASTSymbolExtractor,
  type ExtractedSymbol,
  type ExtractionResult,
} from '../analyzer/ASTSymbolExtractor';
import { EnhancedDocExtractor, type ExtractedEnhancedDoc } from '../parser/EnhancedDocExtractor';
import { ModuleSpecTagParser } from '../parser/ModuleSpecTagParser';
import {
  extractLeadingJsDocText,
  readTsdocComment,
  type StructuredTsdocComment,
  TSDocParser,
} from '../parser/TSDocParser';
import type {
  DependencySpec,
  FailureCase,
  ImportSpec,
  ModuleContext,
  ModuleEffect,
  ModuleInput,
  ModuleLogic,
  ModuleOutput,
  ModulePurpose,
  ModuleScope,
  ModuleSpecResult,
  ModuleSpecTemplate,
  ParamSpec,
  ReturnSpec,
  SideEffectSpec,
} from '../types/spec/module-spec';
import type { ModuleSpecTags } from '../types/tags/module-spec-tags';

/**
 * Generator options
 * @public
 */
export interface GeneratorOptions {
  /** Include heuristic analysis for Logic section */
  analyzeLogic?: boolean;
  /** Include side effect detection for Effect section */
  analyzeSideEffects?: boolean;
  /** Minimum confidence threshold (0-100) */
  minConfidence?: number;
  /** Include TODO markers for manual sections */
  includeTodos?: boolean;
}

/**
 * Module specification generator
 *
 * @doc [[ModuleSpecGenerator]]
 * @doc [[CrossSpecIntegrationContract]]
 * @public
 * @responsibility Extract and generate 7-part module specifications from TypeScript AST and `@microsoft/tsdoc` `DocComment` AST
 * @functionality
 * - Purpose extraction from `@problem`, `@responsibility`, `@solves`, and standard TSDoc summary
 * - Input extraction from function parameters, `@param`, `@defaultValue`, `@contract`, and `@precondition`
 * - Output extraction from return types, `@returns`, `@throws`, and `@postcondition`
 * - Context extraction from TypeScript AST imports, `@see`, `{@link}`, and semantic relation tags
 * - Logic extraction from `@algorithm`, standard `@remarks`, `@functionality`, `@invariant`, and AST complexity
 * - Effect detection from `@sideEffect` tags and side-effect AST patterns
 * - Scope extraction from export/access modifiers and standard `@public`/`@internal`/`@beta`/`@alpha` tags
 */
export class ModuleSpecGenerator {
  private tsdocParser: TSDocParser;
  private astExtractor: ASTSymbolExtractor;
  private enhancedExtractor: EnhancedDocExtractor;
  private specTagParser: ModuleSpecTagParser;
  private options: Required<GeneratorOptions>;

  constructor(options: GeneratorOptions = {}) {
    this.tsdocParser = new TSDocParser();
    this.astExtractor = new ASTSymbolExtractor();
    this.enhancedExtractor = new EnhancedDocExtractor();
    this.specTagParser = new ModuleSpecTagParser();
    this.options = {
      analyzeLogic: options.analyzeLogic ?? true,
      analyzeSideEffects: options.analyzeSideEffects ?? true,
      minConfidence: options.minConfidence ?? 50,
      includeTodos: options.includeTodos ?? true,
    };
  }

  /**
   * Generate module specification for a symbol in a file
   *
   * @param filePath - Path to TypeScript file
   * @param symbolName - Name of the symbol (function, class, etc.)
   * @returns Module specification result
   * @public
   */
  generateSpec(filePath: string, symbolName: string): ModuleSpecResult {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

    const node = this.findSymbolNode(sourceFile, symbolName);
    if (!node) {
      throw new Error(`Symbol "${symbolName}" not found in ${filePath}`);
    }

    const spec = this.generateSpecFromNode(node, sourceFile, filePath, symbolName);
    const metadata = this.analyzeCompletion(spec);

    return {
      spec,
      ...metadata,
    };
  }

  /**
   * Generate specifications for all public symbols in a file
   *
   * @param filePath - Path to TypeScript file
   * @returns Array of module specification results
   * @public
   */
  generateSpecsForFile(filePath: string): ModuleSpecResult[] {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

    const results: ModuleSpecResult[] = [];
    const symbols = this.findAllPublicSymbols(sourceFile);

    for (const { node, name } of symbols) {
      try {
        const spec = this.generateSpecFromNode(node, sourceFile, filePath, name);
        const metadata = this.analyzeCompletion(spec);
        results.push({ spec, ...metadata });
      } catch (_error) {}
    }

    return results;
  }

  /**
   * Generate specifications for all TypeScript files in a directory
   *
   * @param dirPath - Path to directory
   * @param options - Batch generation options
   * @returns Array of module specification results
   * @public
   */
  generateSpecsForDirectory(
    dirPath: string,
    options: {
      recursive?: boolean;
      minConfidence?: number;
      includePrivate?: boolean;
    } = {}
  ): Array<{ filePath: string; results: ModuleSpecResult[] }> {
    const { recursive = true, minConfidence = 0, includePrivate = false } = options;
    const allResults: Array<{ filePath: string; results: ModuleSpecResult[] }> = [];

    const processDirectory = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (recursive && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            processDirectory(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          try {
            let results = this.generateSpecsForFile(fullPath);

            if (minConfidence > 0) {
              results = results.filter((r) => r.confidence >= minConfidence);
            }

            if (!includePrivate) {
              results = results.filter((r) => r.spec.scope.isPublicAPI);
            }

            if (results.length > 0) {
              allResults.push({ filePath: fullPath, results });
            }
          } catch (_error) {}
        }
      }
    };

    processDirectory(dirPath);
    return allResults;
  }

  /**
   * Find all public symbols in a source file
   */
  private findAllPublicSymbols(sourceFile: ts.SourceFile): Array<{ node: ts.Node; name: string }> {
    const symbols: Array<{ node: ts.Node; name: string }> = [];

    const visit = (node: ts.Node) => {
      const name = this.getNodeName(node);

      if (name && this.hasExportModifier(node)) {
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node)
        ) {
          symbols.push({ node, name });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return symbols;
  }

  /**
   * Find AST node for a symbol
   */
  private findSymbolNode(sourceFile: ts.SourceFile, symbolName: string): ts.Node | null {
    let result: ts.Node | null = null;

    const visit = (node: ts.Node) => {
      const name = this.getNodeName(node);
      if (name === symbolName) {
        result = node;
        return;
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return result;
  }

  /**
   * Get name from AST node
   */
  private getNodeName(node: ts.Node): string | null {
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
      return node.name.text;
    }
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
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
    return null;
  }

  /**
   * Generate complete specification from AST node
   */
  private generateSpecFromNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
    symbolName: string
  ): ModuleSpecTemplate {
    const jsDoc = extractLeadingJsDocText(node, sourceFile);
    const tsdocContext = jsDoc ? this.tsdocParser.parseString(jsDoc) : null;
    const structured = tsdocContext ? readTsdocComment(tsdocContext.docComment) : null;
    const specTags = this.specTagParser.parseModuleSpecTags(tsdocContext, jsDoc || '');

    const sourceCode = sourceFile.getFullText();
    const enhancedDocs = this.enhancedExtractor.extractFromFile(filePath, sourceCode);
    const enhancedDoc = enhancedDocs.find((d) => d.symbol.name === symbolName);

    const astResult = this.astExtractor.extract(filePath, sourceCode);
    const astSymbol = astResult.symbols.find((s) => s.name === symbolName);

    return {
      symbolId: this.generateSymbolId(symbolName),
      symbolName,
      symbolKind: this.getSymbolKind(node),
      filePath,
      purpose: this.extractPurpose(structured, enhancedDoc),
      input: this.extractInput(node, structured),
      output: this.extractOutput(node, structured, enhancedDoc),
      context: this.extractContext(sourceCode, structured, astResult.imports, enhancedDoc),
      logic: this.extractLogic(node, structured, enhancedDoc, specTags),
      effect: this.extractEffect(node, sourceFile, specTags),
      scope: this.extractScope(node, astSymbol, structured, specTags),
      completionConfidence: 0,
      manualReviewNeeded: [],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract Purpose section (1/7)
   */
  private extractPurpose(
    structured: StructuredTsdocComment | null,
    enhancedDoc?: ExtractedEnhancedDoc
  ): ModulePurpose {
    const problem =
      structured?.getFirstTagValue('@problem') ??
      enhancedDoc?.doc.problemSolving?.description ??
      '';
    const responsibility =
      structured?.getFirstTagValue('@responsibility') || structured?.summary || '';
    const solution = structured?.getFirstTagValue('@solves') ?? '';
    const context = structured?.getFirstTagValue('@context');

    return {
      problem,
      responsibility,
      solution,
      context,
    };
  }

  /**
   * Extract Input section (2/7)
   */
  private extractInput(node: ts.Node, structured: StructuredTsdocComment | null): ModuleInput {
    const parameters: ParamSpec[] = [];
    const preconditions: string[] = [
      ...(structured?.getTagValues('@precondition').filter((v) => v.length > 0) ?? []),
    ];
    const contractText = structured?.getFirstTagValue('@contract');
    const constraints: string[] = contractText ? [contractText] : [];

    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      const paramDocs = new Map<string, string>();
      for (const paramEntry of structured?.params ?? []) {
        if (paramEntry.description) {
          paramDocs.set(paramEntry.name, paramEntry.description);
        }
      }

      for (const param of node.parameters) {
        const paramSpec: ParamSpec = {
          name: param.name.getText(),
          type: param.type ? param.type.getText() : 'any',
          optional: Boolean(param.questionToken || param.initializer),
          constraints: [],
        };

        if (param.initializer) {
          paramSpec.defaultValue = param.initializer.getText();
        } else if (node.parameters.length === 1 && structured?.defaultValue) {
          paramSpec.defaultValue = structured.defaultValue;
        }

        const description = paramDocs.get(paramSpec.name);
        if (description) {
          paramSpec.description = description;
        }

        parameters.push(paramSpec);
      }

      const typeSignature = this.generateTypeSignature(node);
      return {
        parameters,
        preconditions,
        constraints,
        typeSignature,
      };
    }

    return {
      parameters,
      preconditions,
      constraints,
    };
  }

  /**
   * Extract Output section (3/7)
   */
  private extractOutput(
    node: ts.Node,
    structured: StructuredTsdocComment | null,
    enhancedDoc?: ExtractedEnhancedDoc
  ): ModuleOutput {
    const returnType: ReturnSpec = {
      type: 'void',
    };
    const postconditions: string[] = [
      ...(structured?.getTagValues('@postcondition').filter((v) => v.length > 0) ?? []),
    ];
    const successCases: string[] = [];
    const failureCases: FailureCase[] = [];

    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      if (node.type) {
        returnType.type = node.type.getText();
      }
      if (structured?.returns) {
        returnType.description = structured.returns;
      }
    }

    if (enhancedDoc?.doc.errorExperiences?.length) {
      for (const error of enhancedDoc.doc.errorExperiences) {
        failureCases.push({
          condition: error.context || error.message || 'Unknown condition',
          errorType: error.errorType,
          description: error.solution || error.message || '',
        });
      }
    } else if (structured && structured.throws.length > 0) {
      for (const throwsEntry of structured.throws) {
        const typeMatch = throwsEntry.match(
          /^([A-Z][A-Za-z0-9_.]*(?:Error|Exception))\s*(?:[-:]\s*)(.+)$/
        );
        failureCases.push({
          condition: typeMatch ? typeMatch[2].trim() : throwsEntry,
          errorType: typeMatch ? typeMatch[1] : 'Error',
          description: typeMatch ? typeMatch[2].trim() : throwsEntry,
        });
      }
    }

    return {
      returnType,
      postconditions,
      successCases,
      failureCases,
    };
  }

  /**
   * Extract Context section (4/7)
   */
  private extractContext(
    sourceCode: string,
    structured: StructuredTsdocComment | null,
    imports: ExtractionResult['imports'],
    enhancedDoc?: ExtractedEnhancedDoc
  ): ModuleContext {
    const dependencies: DependencySpec[] = [];
    const importSpecs: ImportSpec[] = [];
    const environment: string[] = [];
    const requirements: string[] = [...(structured?.see ?? [])];

    if (enhancedDoc?.doc.dependencies?.length) {
      for (const dep of enhancedDoc.doc.dependencies) {
        dependencies.push({
          name: dep.target || 'Unknown',
          type: dep.type === 'external' ? 'external' : 'module',
          purpose: dep.reason || 'Dependency',
          critical: !dep.isOptional,
        });
      }
    }

    for (const imp of imports) {
      importSpecs.push({
        source: imp.modulePath,
        symbols: imp.imported,
        isExternal: !imp.modulePath.startsWith('.'),
      });
    }

    if (sourceCode.includes('process.env')) {
      environment.push('Environment variables required');
    }
    if (sourceCode.includes('fs.')) {
      environment.push('File system access required');
    }

    return {
      dependencies,
      imports: importSpecs,
      environment,
      requirements,
    };
  }

  /**
   * Extract Logic section (5/7)
   */
  private extractLogic(
    node: ts.Node,
    structured: StructuredTsdocComment | null,
    enhancedDoc: ExtractedEnhancedDoc | undefined,
    specTags: ModuleSpecTags
  ): ModuleLogic {
    const features: string[] = [];
    let algorithm = '';
    const operations: string[] = [
      ...(structured?.getTagValues('@invariant').filter((v) => v.length > 0) ?? []),
    ];

    const functionalityValues = structured
      ?.getTagValues('@functionality')
      .filter((v) => v.length > 0);
    if (functionalityValues && functionalityValues.length > 0) {
      features.push(...functionalityValues);
    } else if (enhancedDoc?.doc.functionality?.mainFeatures) {
      features.push(...enhancedDoc.doc.functionality.mainFeatures);
    }

    if (specTags.algorithm) {
      algorithm = specTags.algorithm.description;
      if (specTags.algorithm.steps) {
        algorithm += `\n\nSteps:\n${specTags.algorithm.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      }
    } else if (structured?.remarks) {
      algorithm = structured.remarks;
    } else if (this.options.includeTodos) {
      algorithm = 'Add @algorithm tag to describe the processing logic';
    }

    let complexity = 'Simple';
    if (specTags.complexity) {
      complexity = specTags.complexity.notation;
      if (specTags.complexity.explanation) {
        complexity += ` - ${specTags.complexity.explanation}`;
      }
    } else if (this.options.analyzeLogic) {
      const complexityScore = this.calculateComplexity(node);
      if (complexityScore > 10) complexity = 'High';
      else if (complexityScore > 5) complexity = 'Medium';
    }

    return {
      features,
      algorithm,
      complexity,
      operations,
    };
  }

  /**
   * Extract Effect section (6/7)
   */
  private extractEffect(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    specTags: ModuleSpecTags
  ): ModuleEffect {
    const sideEffects: SideEffectSpec[] = [];
    const mutations: string[] = [];
    const io: string[] = [];
    const observable: string[] = [];

    if (specTags.sideEffects && specTags.sideEffects.length > 0) {
      sideEffects.push(...specTags.sideEffects);
    }

    if (specTags.mutations && specTags.mutations.length > 0) {
      mutations.push(...specTags.mutations.map((m) => `${m.target} - ${m.description}`));
    }

    if (specTags.io && specTags.io.length > 0) {
      io.push(...specTags.io.map((i) => `${i.type}: ${i.description}`));
    }

    if (sideEffects.length === 0 && io.length === 0 && mutations.length === 0) {
      if (this.options.analyzeSideEffects) {
        const nodeText = node.getText(sourceFile);

        if (nodeText.includes('fs.writeFile') || nodeText.includes('fs.writeFileSync')) {
          sideEffects.push({
            type: 'filesystem',
            description: 'Writes to file system',
            operation: 'write',
          });
          io.push('File write operations');
        }
        if (nodeText.includes('fs.readFile') || nodeText.includes('fs.readFileSync')) {
          io.push('File read operations');
        }

        if (nodeText.includes('db.prepare') || nodeText.includes('db.run')) {
          sideEffects.push({
            type: 'database',
            description: 'Database operations',
          });
          io.push('Database queries');
        }

        if (nodeText.includes('fetch') || nodeText.includes('http.request')) {
          sideEffects.push({
            type: 'network',
            description: 'Network requests',
          });
          io.push('Network calls');
        }

        if (nodeText.includes('this.') && nodeText.includes(' = ')) {
          mutations.push('Mutates instance state');
        }

        if (nodeText.includes('console.log') || nodeText.includes('console.error')) {
          observable.push('Console output');
        }
      }
    }

    return {
      sideEffects,
      mutations,
      io,
      observable,
    };
  }

  /**
   * Extract Scope section (7/7)
   */
  private extractScope(
    node: ts.Node,
    _astSymbol: ExtractedSymbol | undefined,
    structured: StructuredTsdocComment | null,
    specTags: ModuleSpecTags
  ): ModuleScope {
    const hasExport = this.hasExportModifier(node);
    const releaseVisibility = structured?.releaseVisibility;
    const hasPublicReleaseTag =
      releaseVisibility === 'public' ||
      releaseVisibility === 'beta' ||
      releaseVisibility === 'alpha';

    let visibility = this.getVisibility(node);
    if (specTags.scope?.accessLevel && specTags.scope.accessLevel !== 'internal') {
      visibility = specTags.scope.accessLevel;
    }

    const exposedAPI: string[] = [];
    const exposedState: string[] = [];

    if (ts.isClassDeclaration(node)) {
      for (const member of node.members) {
        const memberName = this.getNodeName(member);
        if (!memberName) continue;

        const isPublicMember = !this.hasModifier(member, ts.SyntaxKind.PrivateKeyword);
        if (isPublicMember && hasExport) {
          if (ts.isMethodDeclaration(member)) {
            exposedAPI.push(`${memberName}()`);
          } else if (ts.isPropertyDeclaration(member)) {
            exposedState.push(memberName);
          }
        }
      }
    }

    if (hasExport && (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node))) {
      const name = this.getNodeName(node);
      if (name) {
        exposedAPI.push(`${name}()`);
      }
    }

    return {
      visibility,
      exposedAPI,
      accessLevel: releaseVisibility ?? visibility,
      isPublicAPI: hasExport && hasPublicReleaseTag,
      exposedState: exposedState.length > 0 ? exposedState : undefined,
    };
  }

  /**
   * Analyze completion metadata
   */
  private analyzeCompletion(spec: ModuleSpecTemplate): Omit<ModuleSpecResult, 'spec'> {
    const autoCompleted: string[] = [];
    const manualRequired: string[] = [];
    const warnings: string[] = [];

    if (spec.purpose.problem || spec.purpose.responsibility) {
      autoCompleted.push('Purpose');
    } else {
      manualRequired.push('Purpose');
      warnings.push('Purpose section is empty - add @problem and @responsibility tags');
    }

    if (spec.input.parameters.length > 0 || spec.input.preconditions.length > 0) {
      autoCompleted.push('Input');
    }

    if (
      spec.output.returnType.type !== 'void' ||
      spec.output.postconditions.length > 0 ||
      spec.output.failureCases.length > 0
    ) {
      autoCompleted.push('Output');
    }

    if (
      spec.context.imports.length > 0 ||
      spec.context.dependencies.length > 0 ||
      spec.context.requirements.length > 0
    ) {
      autoCompleted.push('Context');
    }

    const hasAlgorithmDescription =
      Boolean(spec.logic.algorithm) && !spec.logic.algorithm.startsWith('Add @algorithm');
    if (hasAlgorithmDescription) {
      autoCompleted.push('Logic');
    } else if (spec.logic.features.length > 0) {
      autoCompleted.push('Logic (partial)');
      manualRequired.push('Logic (algorithm description)');
    } else {
      manualRequired.push('Logic');
      warnings.push('Logic section needs manual description - add @algorithm or @remarks tag');
    }

    if (spec.effect.sideEffects.length > 0) {
      autoCompleted.push('Effect (detected)');
    } else {
      autoCompleted.push('Effect (none detected)');
    }

    autoCompleted.push('Scope');

    const totalSections = 7;
    const completedSections = autoCompleted.filter((s) => !s.includes('partial')).length;
    const confidence = Math.round((completedSections / totalSections) * 100);

    spec.completionConfidence = confidence;
    spec.manualReviewNeeded = manualRequired;

    return {
      autoCompleted,
      manualRequired,
      warnings,
      confidence,
    };
  }

  /**
   * Generate symbol ID
   */
  private generateSymbolId(symbolName: string): string {
    return symbolName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Get symbol kind
   */
  private getSymbolKind(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node)) return 'function';
    if (ts.isClassDeclaration(node)) return 'class';
    if (ts.isInterfaceDeclaration(node)) return 'interface';
    if (ts.isTypeAliasDeclaration(node)) return 'type';
    if (ts.isMethodDeclaration(node)) return 'method';
    if (ts.isPropertyDeclaration(node)) return 'property';
    return 'unknown';
  }

  /**
   * Check if node has export modifier
   */
  private hasExportModifier(node: ts.Node): boolean {
    return this.hasModifier(node, ts.SyntaxKind.ExportKeyword);
  }

  /**
   * Check if node has specific modifier
   */
  private hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    if (!ts.canHaveModifiers(node)) return false;
    const modifiers = ts.getModifiers(node);
    return modifiers?.some((m: ts.Modifier) => m.kind === kind) ?? false;
  }

  /**
   * Get visibility level
   */
  private getVisibility(node: ts.Node): 'public' | 'private' | 'protected' {
    if (this.hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return 'private';
    if (this.hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  /**
   * Generate type signature
   */
  private generateTypeSignature(node: ts.FunctionDeclaration | ts.MethodDeclaration): string {
    const params = node.parameters
      .map((p) => {
        const name = p.name.getText();
        const type = p.type ? p.type.getText() : 'any';
        const optional = p.questionToken ? '?' : '';
        return `${name}${optional}: ${type}`;
      })
      .join(', ');

    const returnType = node.type ? node.type.getText() : 'void';
    return `(${params}) => ${returnType}`;
  }

  /**
   * Calculate cyclomatic complexity (simplified)
   */
  private calculateComplexity(node: ts.Node): number {
    let complexity = 1;

    const visit = (n: ts.Node) => {
      if (
        ts.isIfStatement(n) ||
        ts.isForStatement(n) ||
        ts.isWhileStatement(n) ||
        ts.isDoStatement(n) ||
        ts.isCaseClause(n) ||
        ts.isConditionalExpression(n)
      ) {
        complexity++;
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }
}
