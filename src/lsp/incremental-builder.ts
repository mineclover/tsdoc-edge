/**
 * Incremental Builder for LSP
 *
 * Provides incremental symbol extraction and database updates
 * when files are modified, created, or deleted.
 *
 * @packageDocumentation
 * @module lsp/incremental-builder
 * @doc [[LSP Integration]]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

/**
 * Extracted symbol from a single file
 */
export interface ExtractedSymbol {
  id: string;
  name: string;
  type: string;
  filePath: string;
  line: number;
  column: number;
  isExported: boolean;
  isPublic: boolean;
  summary: string | null;
  declaredType: string | null;
}

/**
 * Extracted relationship from a single file
 */
export interface ExtractedRelationship {
  fromSymbol: string;
  toSymbol: string;
  type: string;
  category: string;
  strength: number;
}

/**
 * Result of incremental extraction
 */
export interface IncrementalExtractResult {
  filePath: string;
  symbols: ExtractedSymbol[];
  relationships: ExtractedRelationship[];
  errors: string[];
  timestamp: number;
}

/**
 * Callback for build events
 */
export type BuildEventCallback = (event: {
  type: 'update' | 'delete';
  filePath: string;
  symbolCount: number;
  duration: number;
}) => void;

/**
 * IncrementalBuilder - Extracts symbols and relationships from a single file
 *
 * Designed for LSP integration to provide real-time symbol updates
 * as files are modified in the IDE.
 *
 * @public
 */
export class IncrementalBuilder {
  private workspaceRoot: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;
  private onBuildEvent: BuildEventCallback | null = null;

  constructor(workspaceRoot: string, db: any) {
    this.workspaceRoot = workspaceRoot;
    this.db = db;
  }

  /**
   * Set callback for build events
   * @param callback - Function to call on build events
   */
  setEventCallback(callback: BuildEventCallback): void {
    this.onBuildEvent = callback;
  }

  /**
   * Extract symbols from a single file
   * @param filePath - Path to the file
   * @returns Extraction result with symbols and relationships
   */
  extractFile(filePath: string): IncrementalExtractResult {
    const result: IncrementalExtractResult = {
      filePath,
      symbols: [],
      relationships: [],
      errors: [],
      timestamp: Date.now(),
    };

    if (!fs.existsSync(filePath)) {
      result.errors.push(`File not found: ${filePath}`);
      return result;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      this.visitNode(sourceFile, sourceFile, result, filePath);
    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  /**
   * Visit AST node and extract symbols
   */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    result: IncrementalExtractResult,
    filePath: string
  ): void {
    // Extract classes
    if (ts.isClassDeclaration(node) && node.name) {
      result.symbols.push(this.createSymbol(node, node.name, 'class', sourceFile, filePath));

      // Extract methods and properties
      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member) && member.name) {
          result.symbols.push(this.createSymbol(member, member.name, 'method', sourceFile, filePath));
        } else if (ts.isPropertyDeclaration(member) && member.name) {
          result.symbols.push(this.createSymbol(member, member.name, 'property', sourceFile, filePath));
        }
      });
    }

    // Extract interfaces
    if (ts.isInterfaceDeclaration(node) && node.name) {
      result.symbols.push(this.createSymbol(node, node.name, 'interface', sourceFile, filePath));
    }

    // Extract functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      result.symbols.push(this.createSymbol(node, node.name, 'function', sourceFile, filePath));
    }

    // Extract type aliases
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      result.symbols.push(this.createSymbol(node, node.name, 'type', sourceFile, filePath));
    }

    // Extract variables (const/let)
    if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      node.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
          const isConst = (node.declarationList.flags & ts.NodeFlags.Const) !== 0;
          result.symbols.push(this.createSymbol(
            decl,
            decl.name,
            isConst ? 'constant' : 'variable',
            sourceFile,
            filePath
          ));
        }
      });
    }

    // Recurse into children
    ts.forEachChild(node, child => this.visitNode(child, sourceFile, result, filePath));
  }

  /**
   * Create a symbol object from AST node
   */
  private createSymbol(
    node: ts.Node,
    name: ts.Identifier | ts.PropertyName,
    type: string,
    sourceFile: ts.SourceFile,
    filePath: string
  ): ExtractedSymbol {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const nameText = ts.isIdentifier(name) ? name.text : name.getText();

    // Check export status
    const isExported = this.hasModifier(node, ts.SyntaxKind.ExportKeyword) ||
                       this.hasModifier(node.parent, ts.SyntaxKind.ExportKeyword);

    // Check public status (not private/protected)
    const isPublic = !this.hasModifier(node, ts.SyntaxKind.PrivateKeyword) &&
                     !this.hasModifier(node, ts.SyntaxKind.ProtectedKeyword);

    // Extract JSDoc summary
    const summary = this.extractJsDocSummary(node, sourceFile);

    // Generate symbol ID
    const relativePath = path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/');
    const id = `${type}-${nameText.toLowerCase()}`.replace(/[^a-z0-9-]/g, '-');

    return {
      id,
      name: nameText,
      type,
      filePath: relativePath,
      line: line + 1,
      column: character + 1,
      isExported,
      isPublic,
      summary,
      declaredType: null,
    };
  }

  /**
   * Check if node has a specific modifier
   */
  private hasModifier(node: ts.Node | undefined, kind: ts.SyntaxKind): boolean {
    if (!node) return false;
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return modifiers?.some(m => m.kind === kind) ?? false;
  }

  /**
   * Extract JSDoc summary from node
   */
  private extractJsDocSummary(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    const jsDocTags = ts.getJSDocTags(node);
    const fullText = sourceFile.getFullText();
    const nodeStart = node.getFullStart();

    // Look for JSDoc comment before the node
    const leadingComments = ts.getLeadingCommentRanges(fullText, nodeStart);
    if (!leadingComments) return null;

    for (const comment of leadingComments) {
      const text = fullText.slice(comment.pos, comment.end);
      if (text.startsWith('/**')) {
        // Extract first line/paragraph as summary
        const lines = text.replace(/^\/\*\*/, '').replace(/\*\/$/, '')
          .split('\n')
          .map(l => l.replace(/^\s*\*\s?/, '').trim())
          .filter(l => l && !l.startsWith('@'));

        if (lines.length > 0) {
          return lines[0];
        }
      }
    }

    return null;
  }

  /**
   * Update database with extracted symbols (incremental)
   * @param result - Extraction result to persist
   * @returns Count of inserted and deleted symbols
   */
  updateDatabase(result: IncrementalExtractResult): { inserted: number; deleted: number } {
    if (!this.db) {
      return { inserted: 0, deleted: 0 };
    }

    const startTime = Date.now();
    const relativePath = path.relative(this.workspaceRoot, result.filePath).replace(/\\/g, '/');

    // Start transaction
    const transaction = this.db.transaction(() => {
      // Delete existing symbols for this file
      const deleteStmt = this.db.prepare('DELETE FROM symbols WHERE file_path = ?');
      const deleteResult = deleteStmt.run(relativePath);

      // Insert new symbols with all required fields
      const insertStmt = this.db.prepare(`
        INSERT OR REPLACE INTO symbols (
          id, name, type, file_path, line, column,
          is_exported, is_public, summary, declared_type,
          created_at, updated_at, version, jsonl_line
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      let inserted = 0;
      for (const symbol of result.symbols) {
        insertStmt.run(
          symbol.id,
          symbol.name,
          symbol.type,
          symbol.filePath,
          symbol.line,
          symbol.column,
          symbol.isExported ? 1 : 0,
          symbol.isPublic ? 1 : 0,
          symbol.summary,
          symbol.declaredType,
          now,           // created_at
          now,           // updated_at
          '0.12.1',      // version
          -1             // jsonl_line (-1 indicates incremental build)
        );
        inserted++;
      }

      return { inserted, deleted: deleteResult.changes };
    });

    const dbResult = transaction();

    // Emit event
    if (this.onBuildEvent) {
      this.onBuildEvent({
        type: 'update',
        filePath: result.filePath,
        symbolCount: dbResult.inserted,
        duration: Date.now() - startTime,
      });
    }

    return dbResult;
  }

  /**
   * Remove all symbols for a deleted file
   * @param filePath - Path to the deleted file
   * @returns Number of deleted symbols
   */
  removeFile(filePath: string): number {
    if (!this.db) return 0;

    const startTime = Date.now();
    const relativePath = path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/');
    const deleteStmt = this.db.prepare('DELETE FROM symbols WHERE file_path = ?');
    const result = deleteStmt.run(relativePath);

    // Emit event
    if (this.onBuildEvent) {
      this.onBuildEvent({
        type: 'delete',
        filePath,
        symbolCount: result.changes,
        duration: Date.now() - startTime,
      });
    }

    return result.changes;
  }

  /**
   * Process a file change (extract and update)
   * @param filePath - Path to the changed file
   * @returns Extraction result
   */
  processFileChange(filePath: string): IncrementalExtractResult {
    const result = this.extractFile(filePath);
    if (result.errors.length === 0) {
      this.updateDatabase(result);
    }
    return result;
  }

  /**
   * Process file content directly (for unsaved buffer)
   * @param filePath - Path to the file
   * @param content - File content
   * @returns Extraction result
   */
  processContent(filePath: string, content: string): IncrementalExtractResult {
    const result: IncrementalExtractResult = {
      filePath,
      symbols: [],
      relationships: [],
      errors: [],
      timestamp: Date.now(),
    };

    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      this.visitNode(sourceFile, sourceFile, result, filePath);
      this.updateDatabase(result);
    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }
}
