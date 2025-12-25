/**
 * Module Specification Generator
 *
 * @packageDocumentation
 * @responsibility Generate module specifications using 7-part framework
 * @problem Manual module specification creation is time-consuming
 * @solves Automatically extract module specs from TypeScript source code
 */

import * as ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ParserContext } from '@microsoft/tsdoc';
import { TSDocParser } from '../parser/TSDocParser';
import { ASTSymbolExtractor } from '../analyzer/ASTSymbolExtractor';
import { EnhancedDocExtractor } from '../parser/EnhancedDocExtractor';
import { ModuleSpecTagParser } from '../parser/ModuleSpecTagParser';
import type { ModuleSpecTags } from '../types/tags/module-spec-tags';
import type {
  ModuleSpecTemplate,
  ModuleSpecResult,
  ModulePurpose,
  ModuleInput,
  ModuleOutput,
  ModuleContext,
  ModuleLogic,
  ModuleEffect,
  ModuleScope,
  ParamSpec,
  ReturnSpec,
  FailureCase,
  DependencySpec,
  ImportSpec,
  SideEffectSpec,
} from '../types/spec/module-spec';

/**
 * Generator options
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
 * @public
 * @responsibility Extract and generate 7-part module specifications from TypeScript code
 * @functionality
 * - Purpose extraction from @problem, @responsibility tags
 * - Input extraction from function parameters and @precondition
 * - Output extraction from return types and @postcondition
 * - Context extraction from imports and @depends
 * - Logic extraction from @functionality and code analysis
 * - Effect detection from side effect patterns
 * - Scope extraction from export modifiers
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
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

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
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const results: ModuleSpecResult[] = [];
    const symbols = this.findAllPublicSymbols(sourceFile);

    for (const { node, name } of symbols) {
      try {
        const spec = this.generateSpecFromNode(node, sourceFile, filePath, name);
        const metadata = this.analyzeCompletion(spec);
        results.push({ spec, ...metadata });
      } catch (error) {
        // Skip symbols that fail to generate
        continue;
      }
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

            // Filter by confidence
            if (minConfidence > 0) {
              results = results.filter(r => r.confidence >= minConfidence);
            }

            // Filter private symbols
            if (!includePrivate) {
              results = results.filter(r => r.spec.scope.isPublicAPI);
            }

            if (results.length > 0) {
              allResults.push({ filePath: fullPath, results });
            }
          } catch (error) {
            // Skip files that fail to process
            continue;
          }
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

      // Only include exported symbols
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
      const decl = node.declarationList.declarations[0];
      if (ts.isIdentifier(decl.name)) {
        return decl.name.text;
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
    const jsDoc = this.getJSDocComment(node, sourceFile);
    const tsdocContext = jsDoc ? this.tsdocParser.parseString(jsDoc) : null;
    const customTags = this.parseCustomTags(jsDoc || '');

    // Parse module spec tags (NEW!)
    const specTags = this.specTagParser.parseModuleSpecTags(tsdocContext, jsDoc || '');

    // Extract enhanced documentation
    const sourceCode = sourceFile.getFullText();
    const enhancedDocs = this.enhancedExtractor.extractFromFile(filePath, sourceCode);
    const enhancedDoc = enhancedDocs.find((d) => d.symbol.name === symbolName);

    // Extract AST information
    const astResult = this.astExtractor.extract(filePath, sourceCode);
    const astSymbol = astResult.symbols.find((s) => s.name === symbolName);

    return {
      symbolId: this.generateSymbolId(symbolName),
      symbolName,
      symbolKind: this.getSymbolKind(node),
      filePath,
      purpose: this.extractPurpose(tsdocContext, customTags, enhancedDoc),
      input: this.extractInput(node, tsdocContext, customTags),
      output: this.extractOutput(node, tsdocContext, customTags, enhancedDoc),
      context: this.extractContext(filePath, sourceCode, customTags, astResult.imports, enhancedDoc),
      logic: this.extractLogic(node, sourceFile, customTags, enhancedDoc, specTags),
      effect: this.extractEffect(node, sourceFile, customTags, specTags),
      scope: this.extractScope(node, astSymbol, customTags, specTags),
      completionConfidence: 0, // Will be calculated
      manualReviewNeeded: [], // Will be populated
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract Purpose section (1/7)
   * Confidence: 95%
   */
  private extractPurpose(
    tsdocContext: ParserContext | null,
    customTags: Map<string, string[]>,
    enhancedDoc?: any
  ): ModulePurpose {
    const purpose: ModulePurpose = {
      problem: '',
      responsibility: '',
      solution: '',
      context: undefined,
    };

    // From @problem tag
    if (customTags.has('problem')) {
      purpose.problem = customTags.get('problem')![0] || '';
    } else if (enhancedDoc?.doc.problemSolving?.description) {
      purpose.problem = enhancedDoc.doc.problemSolving.description;
    }

    // From @responsibility tag
    if (customTags.has('responsibility')) {
      purpose.responsibility = customTags.get('responsibility')![0] || '';
    }

    // From @solves tag
    if (customTags.has('solves')) {
      purpose.solution = customTags.get('solves')![0] || '';
    }

    // From @context tag
    if (customTags.has('context')) {
      purpose.context = customTags.get('context')![0];
    }

    // Fallback: use summary
    if (!purpose.problem && !purpose.responsibility && tsdocContext) {
      const summary = this.extractTextFromDocNode(tsdocContext.docComment.summarySection);
      if (summary) {
        purpose.responsibility = summary;
      }
    }

    return purpose;
  }

  /**
   * Extract Input section (2/7)
   * Confidence: 90%
   */
  private extractInput(
    node: ts.Node,
    tsdocContext: ParserContext | null,
    customTags: Map<string, string[]>
  ): ModuleInput {
    const parameters: ParamSpec[] = [];
    const preconditions: string[] = customTags.get('precondition') || [];
    const constraints: string[] = [];

    // Extract parameters from AST
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      for (const param of node.parameters) {
        const paramSpec: ParamSpec = {
          name: param.name.getText(),
          type: param.type ? param.type.getText() : 'any',
          optional: !!param.questionToken,
          constraints: [],
        };

        // Add default value
        if (param.initializer) {
          paramSpec.defaultValue = param.initializer.getText();
        }

        // Get description from @param tag
        if (tsdocContext) {
          const paramBlocks = tsdocContext.docComment.params.blocks;
          for (const block of paramBlocks) {
            if (block.parameterName === paramSpec.name) {
              // Extract text content from DocNode
              const contentText = this.extractTextFromDocNode(block.content);
              if (contentText) {
                paramSpec.description = contentText;
              }
            }
          }
        }

        parameters.push(paramSpec);
      }

      // Generate type signature
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
   * Confidence: 90%
   */
  private extractOutput(
    node: ts.Node,
    tsdocContext: ParserContext | null,
    customTags: Map<string, string[]>,
    enhancedDoc?: any
  ): ModuleOutput {
    const returnType: ReturnSpec = {
      type: 'void',
    };
    const postconditions: string[] = customTags.get('postcondition') || [];
    const successCases: string[] = [];
    const failureCases: FailureCase[] = [];

    // Extract return type from AST
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      if (node.type) {
        returnType.type = node.type.getText();
      }

      // Get @returns description
      if (tsdocContext) {
        const returnsBlock = tsdocContext.docComment.returnsBlock;
        if (returnsBlock) {
          const contentText = this.extractTextFromDocNode(returnsBlock.content);
          if (contentText) {
            // Trim content before custom module spec tags
            returnType.description = this.trimBeforeModuleSpecTags(contentText);
          }
        }
      }
    }

    // Extract failure cases from @errorExp or enhancedDoc
    if (enhancedDoc?.doc.errorExperiences?.errors) {
      for (const error of enhancedDoc.doc.errorExperiences.errors) {
        failureCases.push({
          condition: error.situation || 'Unknown condition',
          errorType: error.errorType,
          description: error.lesson || error.situation || '',
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
   * Confidence: 85%
   */
  private extractContext(
    filePath: string,
    sourceCode: string,
    customTags: Map<string, string[]>,
    imports: any[],
    enhancedDoc?: any
  ): ModuleContext {
    const dependencies: DependencySpec[] = [];
    const importSpecs: ImportSpec[] = [];
    const environment: string[] = [];
    const requirements: string[] = customTags.get('requirement') || [];

    // Extract from @depends tags
    if (customTags.has('depends')) {
      for (const dep of customTags.get('depends')!) {
        dependencies.push({
          name: dep,
          type: 'module',
          purpose: 'Dependency',
          critical: false,
        });
      }
    }

    // Extract from enhancedDoc dependencies
    if (enhancedDoc?.doc.dependencies?.deps) {
      for (const dep of enhancedDoc.doc.dependencies.deps) {
        dependencies.push({
          name: dep.name || 'Unknown',
          type: dep.type === 'external' ? 'external' : 'module',
          purpose: dep.reason || 'Dependency',
          critical: dep.critical || false,
        });
      }
    }

    // Extract imports
    for (const imp of imports) {
      importSpecs.push({
        source: imp.modulePath,
        symbols: imp.imported,
        isExternal: !imp.modulePath.startsWith('.'),
      });
    }

    // Detect environment requirements (basic heuristics)
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
   * Confidence: 60% (partial automation) → 95% with @algorithm tag
   */
  private extractLogic(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    customTags: Map<string, string[]>,
    enhancedDoc: any,
    specTags: ModuleSpecTags
  ): ModuleLogic {
    const features: string[] = [];
    let algorithm = '';
    const operations: string[] = [];

    // Extract from @functionality tag
    if (customTags.has('functionality')) {
      features.push(...customTags.get('functionality')!);
    } else if (enhancedDoc?.doc.functionality?.mainFeatures) {
      features.push(...enhancedDoc.doc.functionality.mainFeatures);
    }

    // PRIORITY: Use @algorithm tag if available
    if (specTags.algorithm) {
      algorithm = specTags.algorithm.description;
      if (specTags.algorithm.steps) {
        algorithm += '\n\nSteps:\n' + specTags.algorithm.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      }
    } else if (this.options.includeTodos) {
      // Provide more helpful default based on symbol kind
      algorithm = 'Add @algorithm tag to describe the processing logic';
    }

    // PRIORITY: Use @complexity tag if available
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
   * Confidence: 50% (heuristic detection) → 95% with tags
   */
  private extractEffect(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    customTags: Map<string, string[]>,
    specTags: ModuleSpecTags
  ): ModuleEffect {
    const sideEffects: SideEffectSpec[] = [];
    const mutations: string[] = [];
    const io: string[] = [];
    const observable: string[] = [];

    // PRIORITY 1: Use explicit tags if available
    if (specTags.sideEffects && specTags.sideEffects.length > 0) {
      sideEffects.push(...specTags.sideEffects);
    }

    if (specTags.mutations && specTags.mutations.length > 0) {
      mutations.push(...specTags.mutations.map(m => `${m.target} - ${m.description}`));
    }

    if (specTags.io && specTags.io.length > 0) {
      io.push(...specTags.io.map(i => `${i.type}: ${i.description}`));
    }

    // PRIORITY 2: Fallback to heuristic detection if no tags
    if (sideEffects.length === 0 && io.length === 0 && mutations.length === 0) {
      if (this.options.analyzeSideEffects) {
        const nodeText = node.getText(sourceFile);

        // Detect file system operations
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

        // Detect database operations
        if (nodeText.includes('db.prepare') || nodeText.includes('db.run')) {
          sideEffects.push({
            type: 'database',
            description: 'Database operations',
          });
          io.push('Database queries');
        }

        // Detect network operations
        if (nodeText.includes('fetch') || nodeText.includes('http.request')) {
          sideEffects.push({
            type: 'network',
            description: 'Network requests',
          });
          io.push('Network calls');
        }

        // Detect state mutations
        if (nodeText.includes('this.') && nodeText.includes(' = ')) {
          mutations.push('Mutates instance state');
        }

        // Detect console logging
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
   * Confidence: 95% → 98% with @scope tag
   */
  private extractScope(
    node: ts.Node,
    astSymbol: any,
    customTags: Map<string, string[]>,
    specTags: ModuleSpecTags
  ): ModuleScope {
    const hasExport = this.hasExportModifier(node);
    const hasPublicTag = customTags.has('public');

    // PRIORITY: Use @scope tag if available
    let visibility = this.getVisibility(node);
    if (specTags.scope?.accessLevel && specTags.scope.accessLevel !== 'internal') {
      visibility = specTags.scope.accessLevel as 'public' | 'private' | 'protected';
    }

    const exposedAPI: string[] = [];
    const exposedState: string[] = [];

    // Extract public members for classes
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

    // Add function/method to exposed API if exported
    if (hasExport && (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node))) {
      const name = this.getNodeName(node);
      if (name) {
        exposedAPI.push(`${name}()`);
      }
    }

    return {
      visibility,
      exposedAPI,
      accessLevel: hasPublicTag ? 'public' : visibility,
      isPublicAPI: hasExport && hasPublicTag,
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

    // Check each section
    if (spec.purpose.problem || spec.purpose.responsibility) {
      autoCompleted.push('Purpose');
    } else {
      manualRequired.push('Purpose');
      warnings.push('Purpose section is empty - add @problem and @responsibility tags');
    }

    if (spec.input.parameters.length > 0) {
      autoCompleted.push('Input');
    }

    if (spec.output.returnType.type !== 'void') {
      autoCompleted.push('Output');
    }

    if (spec.context.imports.length > 0 || spec.context.dependencies.length > 0) {
      autoCompleted.push('Context');
    }

    if (spec.logic.features.length > 0) {
      autoCompleted.push('Logic (partial)');
      manualRequired.push('Logic (algorithm description)');
    } else {
      manualRequired.push('Logic');
      warnings.push('Logic section needs manual description - add @functionality tag');
    }

    if (spec.effect.sideEffects.length > 0) {
      autoCompleted.push('Effect (detected)');
    } else {
      autoCompleted.push('Effect (none detected)');
    }

    autoCompleted.push('Scope');

    // Calculate confidence
    const totalSections = 7;
    const completedSections = autoCompleted.filter(s => !s.includes('partial')).length;
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

  // ========== Helper Methods ==========

  /**
   * Extract plain text from TSDoc DocNode
   */
  private extractTextFromDocNode(node: any): string {
    if (!node) return '';

    // Handle DocSection or DocNodeContainer
    if (node.nodes) {
      return node.nodes.map((n: any) => this.extractTextFromDocNode(n)).join('');
    }

    // Handle DocPlainText
    if (node.text) {
      return node.text;
    }

    // Handle DocParagraph or other containers
    if (node.getChildNodes) {
      const children = node.getChildNodes();
      return children.map((n: any) => this.extractTextFromDocNode(n)).join('');
    }

    return '';
  }

  /**
   * Trim content before custom module spec tags
   * TSDoc doesn't recognize custom tags so they leak into previous block content
   */
  private trimBeforeModuleSpecTags(text: string): string {
    const moduleSpecTags = [
      '@functionality',
      '@algorithm',
      '@complexity',
      '@sideEffect',
      '@mutates',
      '@io',
      '@scope',
    ];

    let minIndex = text.length;
    for (const tag of moduleSpecTags) {
      const index = text.indexOf(tag);
      if (index !== -1 && index < minIndex) {
        minIndex = index;
      }
    }

    return text.substring(0, minIndex).trim();
  }

  /**
   * Get JSDoc comment text
   */
  private getJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    const fullText = sourceFile.getFullText();
    const commentRanges = ts.getLeadingCommentRanges(fullText, node.pos);

    if (!commentRanges || commentRanges.length === 0) return null;

    const lastComment = commentRanges[commentRanges.length - 1];
    return fullText.substring(lastComment.pos, lastComment.end);
  }

  /**
   * Parse custom tags from JSDoc
   */
  private parseCustomTags(jsDoc: string): Map<string, string[]> {
    const tags = new Map<string, string[]>();
    const lines = jsDoc.split('\n');

    for (const line of lines) {
      // Match tags with values: @tagName value
      const matchWithValue = line.match(/\*\s*@(\w+)\s+(.+)/);
      if (matchWithValue) {
        const [, tagName, tagValue] = matchWithValue;
        if (!tags.has(tagName)) {
          tags.set(tagName, []);
        }
        tags.get(tagName)!.push(tagValue.trim());
        continue;
      }

      // Match tags without values: @tagName
      const matchWithoutValue = line.match(/\*\s*@(\w+)\s*$/);
      if (matchWithoutValue) {
        const [, tagName] = matchWithoutValue;
        if (!tags.has(tagName)) {
          tags.set(tagName, []);
        }
        // Add empty string to indicate tag presence
        tags.get(tagName)!.push('');
      }
    }

    return tags;
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
    if (!('modifiers' in node) || !node.modifiers) return false;
    const modifiers = node.modifiers as ts.NodeArray<ts.Modifier>;
    return modifiers.some((m: ts.Modifier) => m.kind === kind);
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
    const params = node.parameters.map(p => {
      const name = p.name.getText();
      const type = p.type ? p.type.getText() : 'any';
      const optional = p.questionToken ? '?' : '';
      return `${name}${optional}: ${type}`;
    }).join(', ');

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
