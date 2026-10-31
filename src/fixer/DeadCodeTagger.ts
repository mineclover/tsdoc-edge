/**
 * Dead Code Tagger - Automatically annotates and explores dead code in TypeScript sources
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

/**
 * Options for dead code tagging
 */
export interface DeadCodeTagOptions {
  /** Dry run - preview changes without modifying files */
  dryRun?: boolean;
  /** Reason for marking dead code */
  reason?: string;
  /** Confidence level */
  confidence?: 'high' | 'medium' | 'low';
  /** Whether to add standard @deprecated tag (default: true) */
  addDeprecated?: boolean;
  /** Whether to add custom @deadcode tag (default: true) */
  addDeadcode?: boolean;
}

/**
 * Result of tagging or untagging an individual symbol
 */
export interface TagResult {
  filePath: string;
  symbolName: string;
  line: number;
  action: 'tagged' | 'already-tagged' | 'untagged' | 'skipped';
  reason?: string;
  confidence?: string;
  error?: string;
}

/**
 * Information on an existing tagged dead code symbol
 */
export interface TaggedDeadCodeSymbol {
  name: string;
  type: string;
  filePath: string;
  line: number;
  tags: Array<{
    name: string;
    text: string;
  }>;
  reason?: string;
  confidence?: string;
}

/**
 * Internal representation of a target node in TypeScript AST
 */
interface TargetNodeInfo {
  node: ts.Node;
  statementNode: ts.Node;
  startLine: number;
  jsDoc?: ts.JSDoc;
}

/**
 * Dead Code Tagger implementation
 *
 * @public
 * @responsibility Annotate detected dead code with TSDoc tags and explore existing tagged symbols
 */
export class DeadCodeTagger {
  /**
   * Tag a list of dead code symbols across files
   */
  tagSymbols(
    symbols: Array<{
      name: string;
      line: number;
      filePath: string;
      type?: string;
      reason?: string;
      confidence?: 'high' | 'medium' | 'low';
    }>,
    options: DeadCodeTagOptions = {}
  ): TagResult[] {
    const results: TagResult[] = [];
    const byFile = new Map<string, typeof symbols>();

    for (const sym of symbols) {
      const list = byFile.get(sym.filePath) || [];
      list.push(sym);
      byFile.set(sym.filePath, list);
    }

    for (const [filePath, fileSymbols] of byFile.entries()) {
      const fileResults = this.tagSymbolsInFile(filePath, fileSymbols, options);
      results.push(...fileResults);
    }

    return results;
  }

  /**
   * Tag dead code symbols in a single file
   */
  tagSymbolsInFile(
    filePath: string,
    symbols: Array<{
      name: string;
      line: number;
      type?: string;
      reason?: string;
      confidence?: 'high' | 'medium' | 'low';
    }>,
    options: DeadCodeTagOptions = {}
  ): TagResult[] {
    const {
      dryRun = false,
      reason = 'no incoming calls or dependencies',
      confidence = 'high',
      addDeprecated = true,
      addDeadcode = true,
    } = options;

    if (!fs.existsSync(filePath)) {
      return symbols.map((s) => ({
        filePath,
        symbolName: s.name,
        line: s.line,
        action: 'skipped',
        error: `File not found: ${filePath}`,
      }));
    }

    try {
      let sourceText = fs.readFileSync(filePath, 'utf-8');
      const results: TagResult[] = [];

      // Sort symbols by line descending to preserve line positions on edits
      const sortedSymbols = [...symbols].sort((a, b) => b.line - a.line);

      for (const sym of sortedSymbols) {
        const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

        const target = this.findTargetNode(sourceFile, sym.name, sym.line);
        if (!target) {
          results.push({
            filePath,
            symbolName: sym.name,
            line: sym.line,
            action: 'skipped',
            error: `AST node for symbol ${sym.name} not found near line ${sym.line}`,
          });
          continue;
        }

        const symReason = sym.reason || reason;
        const symConfidence = sym.confidence || confidence;

        // Check if already tagged
        const existingTags = this.extractNodeTags(target.jsDoc, sourceFile);
        const hasDeprecated = existingTags.some((t) => t.name === '@deprecated');
        const hasDeadcode = existingTags.some((t) => t.name === '@deadcode');

        if (hasDeadcode || (hasDeprecated && existingTags.some((t) => /dead/i.test(t.text)))) {
          results.push({
            filePath,
            symbolName: sym.name,
            line: sym.line,
            action: 'already-tagged',
            reason: symReason,
            confidence: symConfidence,
          });
          continue;
        }

        const tagsToAdd: string[] = [];
        if (addDeprecated && !hasDeprecated) {
          tagsToAdd.push(`@deprecated Unused dead code: ${symReason}.`);
        }
        if (addDeadcode && !hasDeadcode) {
          tagsToAdd.push(`@deadcode reason="${symReason}" confidence="${symConfidence}"`);
        }

        if (tagsToAdd.length === 0) {
          results.push({
            filePath,
            symbolName: sym.name,
            line: sym.line,
            action: 'already-tagged',
          });
          continue;
        }

        // Apply edit to sourceText
        sourceText = this.applyTagToSource(sourceText, target, tagsToAdd);
        results.push({
          filePath,
          symbolName: sym.name,
          line: sym.line,
          action: 'tagged',
          reason: symReason,
          confidence: symConfidence,
        });
      }

      if (!dryRun && results.some((r) => r.action === 'tagged')) {
        fs.writeFileSync(filePath, sourceText, 'utf-8');
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return symbols.map((s) => ({
        filePath,
        symbolName: s.name,
        line: s.line,
        action: 'skipped',
        error: errorMessage,
      }));
    }
  }

  /**
   * Untag dead code annotations from symbols
   */
  untagSymbols(
    symbols: Array<{
      name: string;
      line: number;
      filePath: string;
    }>,
    options: { dryRun?: boolean } = {}
  ): TagResult[] {
    const results: TagResult[] = [];
    const byFile = new Map<string, typeof symbols>();

    for (const sym of symbols) {
      const list = byFile.get(sym.filePath) || [];
      list.push(sym);
      byFile.set(sym.filePath, list);
    }

    for (const [filePath, fileSymbols] of byFile.entries()) {
      const fileResults = this.untagSymbolsInFile(filePath, fileSymbols, options);
      results.push(...fileResults);
    }

    return results;
  }

  /**
   * Untag dead code symbols in a single file
   */
  untagSymbolsInFile(
    filePath: string,
    symbols: Array<{ name: string; line: number }>,
    options: { dryRun?: boolean } = {}
  ): TagResult[] {
    const { dryRun = false } = options;

    if (!fs.existsSync(filePath)) {
      return symbols.map((s) => ({
        filePath,
        symbolName: s.name,
        line: s.line,
        action: 'skipped',
        error: `File not found: ${filePath}`,
      }));
    }

    try {
      let sourceText = fs.readFileSync(filePath, 'utf-8');
      const results: TagResult[] = [];

      const sortedSymbols = [...symbols].sort((a, b) => b.line - a.line);

      for (const sym of sortedSymbols) {
        const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

        const target = this.findTargetNode(sourceFile, sym.name, sym.line);
        if (!target || !target.jsDoc) {
          results.push({
            filePath,
            symbolName: sym.name,
            line: sym.line,
            action: 'skipped',
          });
          continue;
        }

        const lines = sourceText.split('\n');
        const jsDocText = target.jsDoc.getText();
        if (!/@deadcode|@deprecated.*dead/i.test(jsDocText)) {
          results.push({
            filePath,
            symbolName: sym.name,
            line: sym.line,
            action: 'skipped',
          });
          continue;
        }

        const docStart = sourceFile.getLineAndCharacterOfPosition(target.jsDoc.getStart()).line;
        const docEnd = sourceFile.getLineAndCharacterOfPosition(target.jsDoc.getEnd()).line;

        const filteredDocLines: string[] = [];
        let modified = false;

        for (let i = docStart; i <= docEnd; i++) {
          const line = lines[i];
          if (/@deadcode/i.test(line) || /@deprecated\s+.*[Dd]ead\s*[Cc]ode/i.test(line)) {
            modified = true;
          } else {
            filteredDocLines.push(line);
          }
        }

        if (!modified) {
          results.push({
            filePath,
            symbolName: sym.name,
            line: sym.line,
            action: 'skipped',
          });
          continue;
        }

        // Check if filtered doc is now basically empty (only /** and */)
        const contentLines = filteredDocLines.filter(
          (l) => !/^\s*\/\*\*|\*\/\s*$/.test(l) && !/^\s*\*\s*$/.test(l)
        );

        if (contentLines.length === 0) {
          // Remove entire doc comment block
          lines.splice(docStart, docEnd - docStart + 1);
        } else {
          // Replace comment lines with filtered lines
          lines.splice(docStart, docEnd - docStart + 1, ...filteredDocLines);
        }

        sourceText = lines.join('\n');
        results.push({
          filePath,
          symbolName: sym.name,
          line: sym.line,
          action: 'untagged',
        });
      }

      if (!dryRun && results.some((r) => r.action === 'untagged')) {
        fs.writeFileSync(filePath, sourceText, 'utf-8');
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return symbols.map((s) => ({
        filePath,
        symbolName: s.name,
        line: s.line,
        action: 'skipped',
        error: errorMessage,
      }));
    }
  }

  /**
   * Find all tagged dead code / deprecated symbols in given files or directories
   */
  findTaggedSymbols(targets: string[]): TaggedDeadCodeSymbol[] {
    const files = this.collectSourceFiles(targets);
    const results: TaggedDeadCodeSymbol[] = [];

    for (const file of files) {
      results.push(...this.findTaggedSymbolsInFile(file));
    }

    return results;
  }

  /**
   * Find tagged dead code / deprecated symbols in a single file
   */
  findTaggedSymbolsInFile(filePath: string): TaggedDeadCodeSymbol[] {
    if (!fs.existsSync(filePath)) return [];

    try {
      const sourceText = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
      const tagged: TaggedDeadCodeSymbol[] = [];

      const visitor = (node: ts.Node): void => {
        let name = '';
        let type = '';
        let targetStatement: ts.Node = node;

        if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              name = decl.name.text;
              type = node.declarationList.flags & ts.NodeFlags.Const ? 'constant' : 'variable';
              targetStatement = node;
              break;
            }
          }
        } else if (ts.isFunctionDeclaration(node) && node.name) {
          name = node.name.text;
          type = 'function';
        } else if (ts.isClassDeclaration(node) && node.name) {
          name = node.name.text;
          type = 'class';
        } else if (ts.isInterfaceDeclaration(node) && node.name) {
          name = node.name.text;
          type = 'interface';
        } else if (ts.isTypeAliasDeclaration(node) && node.name) {
          name = node.name.text;
          type = 'type';
        } else if (ts.isEnumDeclaration(node) && node.name) {
          name = node.name.text;
          type = 'enum';
        } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
          name = node.name.text;
          type = 'method';
        } else if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
          name = node.name.text;
          type = 'property';
        }

        if (name && type) {
          const jsDoc = this.getNodeJSDoc(targetStatement);
          if (jsDoc) {
            const tags = this.extractNodeTags(jsDoc, sourceFile);
            const deadcodeTag = tags.find((t) => t.name === '@deadcode');
            const deprecatedTag = tags.find((t) => t.name === '@deprecated');

            if (deadcodeTag || deprecatedTag) {
              const pos = sourceFile.getLineAndCharacterOfPosition(targetStatement.getStart());
              let reason: string | undefined;
              let confidence: string | undefined;

              if (deadcodeTag) {
                const rMatch = deadcodeTag.text.match(/reason="([^"]+)"/);
                const cMatch = deadcodeTag.text.match(/confidence="([^"]+)"/);
                if (rMatch) reason = rMatch[1];
                if (cMatch) confidence = cMatch[1];
              }

              if (!reason && deprecatedTag) {
                reason = deprecatedTag.text;
              }

              tagged.push({
                name,
                type,
                filePath,
                line: pos.line + 1,
                tags: tags.filter((t) => t.name === '@deadcode' || t.name === '@deprecated'),
                reason,
                confidence,
              });
            }
          }
        }

        ts.forEachChild(node, visitor);
      };

      ts.forEachChild(sourceFile, visitor);
      return tagged;
    } catch {
      return [];
    }
  }

  /**
   * Collect TypeScript source files from paths (files or directories)
   */
  private collectSourceFiles(targets: string[]): string[] {
    const files: string[] = [];

    const walk = (itemPath: string): void => {
      if (!fs.existsSync(itemPath)) return;
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        if (
          itemPath.includes('node_modules') ||
          itemPath.includes('dist') ||
          itemPath.includes('.git')
        ) {
          return;
        }
        const entries = fs.readdirSync(itemPath);
        for (const entry of entries) {
          walk(path.join(itemPath, entry));
        }
      } else if (stat.isFile()) {
        if (
          (itemPath.endsWith('.ts') || itemPath.endsWith('.tsx')) &&
          !itemPath.endsWith('.d.ts')
        ) {
          files.push(itemPath);
        }
      }
    };

    for (const target of targets) {
      walk(target);
    }

    return files;
  }

  /**
   * Find matching target AST node by symbol name and approximate line
   */
  private findTargetNode(
    sourceFile: ts.SourceFile,
    name: string,
    targetLine: number
  ): TargetNodeInfo | null {
    let closestNode: TargetNodeInfo | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    const checkNode = (node: ts.Node, statementNode: ts.Node): void => {
      const pos = sourceFile.getLineAndCharacterOfPosition(statementNode.getStart());
      const nodeLine = pos.line + 1;
      const distance = Math.abs(nodeLine - targetLine);

      if (distance < minDistance) {
        minDistance = distance;
        closestNode = {
          node,
          statementNode,
          startLine: nodeLine,
          jsDoc: this.getNodeJSDoc(statementNode),
        };
      }
    };

    const visitor = (node: ts.Node): void => {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.name.text === name) {
            checkNode(decl, node);
          }
        }
      } else if (
        (ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isEnumDeclaration(node)) &&
        node.name?.text === name
      ) {
        checkNode(node, node);
      } else if (
        (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) &&
        ts.isIdentifier(node.name) &&
        node.name.text === name
      ) {
        checkNode(node, node);
      }

      ts.forEachChild(node, visitor);
    };

    ts.forEachChild(sourceFile, visitor);

    // Only accept matches within reasonable line proximity (e.g. within 15 lines due to comments/edits)
    if (closestNode && minDistance <= 15) {
      return closestNode;
    }

    return null;
  }

  /**
   * Get JSDoc node directly attached to the statement
   */
  private getNodeJSDoc(node: ts.Node): ts.JSDoc | undefined {
    const jsDocs = (node as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc;
    if (jsDocs && jsDocs.length > 0) {
      return jsDocs[jsDocs.length - 1];
    }
    return undefined;
  }

  /**
   * Extract tag names and text from JSDoc node
   */
  private extractNodeTags(
    jsDoc?: ts.JSDoc,
    sourceFile?: ts.SourceFile
  ): Array<{ name: string; text: string }> {
    if (!jsDoc || !jsDoc.tags) return [];
    const tags: Array<{ name: string; text: string }> = [];

    const lines = sourceFile ? sourceFile.getFullText().split('\n') : null;

    for (const tag of jsDoc.tags) {
      const tagName = `@${tag.tagName.text}`;

      // Verify that this tag is an actual line-starting tag in the JSDoc, not prose text mentioning @tag
      if (lines && sourceFile) {
        const lineNum = sourceFile.getLineAndCharacterOfPosition(tag.getStart()).line;
        const lineText = lines[lineNum] || '';
        const isActualTagLine =
          new RegExp(`^\\s*\\*\\s*@${tag.tagName.text}\\b`).test(lineText) ||
          new RegExp(`^\\s*\\/\\*\\*\\s*@${tag.tagName.text}\\b`).test(lineText);
        if (!isActualTagLine) {
          continue;
        }
      }

      let comment = '';
      if (tag.comment) {
        if (typeof tag.comment === 'string') {
          comment = tag.comment;
        } else if (Array.isArray(tag.comment)) {
          comment = tag.comment.map((c) => ('text' in c ? c.text : '')).join('');
        }
      }
      tags.push({ name: tagName, text: comment.trim() });
    }

    return tags;
  }

  /**
   * Apply tag insertions to source text
   */
  private applyTagToSource(
    sourceText: string,
    target: TargetNodeInfo,
    tagsToAdd: string[]
  ): string {
    const lines = sourceText.split('\n');

    if (target.jsDoc) {
      const sourceFile = ts.createSourceFile('temp.ts', sourceText, ts.ScriptTarget.Latest, true);
      const endLine = sourceFile.getLineAndCharacterOfPosition(target.jsDoc.getEnd()).line;
      const lineText = lines[endLine];
      const closeIdx = lineText.indexOf('*/');

      if (closeIdx !== -1) {
        // Line ends with */
        const indentBeforeAsterisk = lineText.substring(0, closeIdx);
        const prefix = indentBeforeAsterisk.endsWith(' ')
          ? `${indentBeforeAsterisk}* `
          : `${indentBeforeAsterisk} * `;

        const tagLines = tagsToAdd.map((t) => `${prefix}${t}`);
        lines.splice(endLine, 0, ...tagLines);
      } else {
        // Multi-line fallback: insert before line
        const tagLines = tagsToAdd.map((t) => ` * ${t}`);
        lines.splice(endLine, 0, ...tagLines);
      }
    } else {
      // Create a brand new JSDoc comment
      const sourceFile = ts.createSourceFile('temp.ts', sourceText, ts.ScriptTarget.Latest, true);
      const startLine = sourceFile.getLineAndCharacterOfPosition(
        target.statementNode.getStart()
      ).line;
      const lineText = lines[startLine];
      const indent = lineText.substring(0, lineText.search(/\S|$/));

      const newDocLines = [
        `${indent}/**`,
        ...tagsToAdd.map((t) => `${indent} * ${t}`),
        `${indent} */`,
      ];
      lines.splice(startLine, 0, ...newDocLines);
    }

    return lines.join('\n');
  }
}
