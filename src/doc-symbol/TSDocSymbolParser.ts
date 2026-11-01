/**
 * TSDoc `@doc` tag parser for code-to-document connections
 * @packageDocumentation
 * @responsibility Parse `@doc [[]]` tags from TypeScript code via `@microsoft/tsdoc` AST
 */

import * as fs from 'node:fs';
import {
  extractDocCheckpointsFromSource,
  type SourceDocCheckpointReference,
  TSDocParser,
} from '../parser/TSDocParser';
import type { CodeConnection } from '../types/feature';

/**
 * Parses `@doc` tags from TypeScript JSDoc comments using the canonical
 * `@microsoft/tsdoc` `DocComment` AST reader.
 *
 * @doc [[TsdocEdgePlatformSpecification]]
 * @public
 * @responsibility Extract `@doc [[Symbol]]` tags from TypeScript declarations and module headers
 */
export class TSDocSymbolParser {
  private readonly tsdocParser = new TSDocParser();

  /**
   * Parse declaration-attached `@doc` tags from a TypeScript code file.
   *
   * @param filePath - Code file path
   * @returns Declaration-bound code connections
   * @public
   */
  parseCodeFile(filePath: string): CodeConnection[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const entries = extractDocCheckpointsFromSource(filePath, sourceCode, {
      requireDeclaration: true,
      parser: this.tsdocParser,
    });

    return entries
      .filter((entry): entry is SourceDocCheckpointReference & { codeSymbol: string } =>
        Boolean(entry.codeSymbol)
      )
      .map((entry) => ({
        codeSymbol: entry.codeSymbol,
        filePath,
        line: entry.declarationLine ?? entry.commentLine,
        docSymbol: entry.docSymbol,
        section: entry.section,
      }));
  }

  /**
   * Parse all JSDoc `@doc` checkpoint references in a file, including file-level
   * `@packageDocumentation` headers, without matching string literals or code fences.
   *
   * @param filePath - Code file path
   * @returns All AST-verified `@doc` checkpoint references in the file
   * @public
   */
  parseFileDocReferences(filePath: string): readonly SourceDocCheckpointReference[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    return this.parseSourceDocReferences(filePath, fs.readFileSync(filePath, 'utf-8'));
  }

  /**
   * Parse all JSDoc `@doc` checkpoint references from in-memory TypeScript source text.
   *
   * @param filePath - Logical source file path
   * @param sourceCode - TypeScript source text
   * @returns All AST-verified `@doc` checkpoint references
   * @public
   */
  parseSourceDocReferences(
    filePath: string,
    sourceCode: string
  ): readonly SourceDocCheckpointReference[] {
    return extractDocCheckpointsFromSource(filePath, sourceCode, {
      requireDeclaration: false,
      parser: this.tsdocParser,
    });
  }

  /**
   * Parse multiple code files for declaration-attached `@doc` connections.
   *
   * @param filePaths - Code file paths
   * @returns All declaration-bound code connections
   * @public
   */
  parseMultiple(filePaths: string[]): CodeConnection[] {
    const allConnections: CodeConnection[] = [];

    for (const filePath of filePaths) {
      const connections = this.parseCodeFile(filePath);
      allConnections.push(...connections);
    }

    return allConnections;
  }
}
