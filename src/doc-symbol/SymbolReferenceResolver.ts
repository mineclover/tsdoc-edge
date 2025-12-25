/**
 * Symbol Reference Resolver
 * @packageDocumentation
 * @responsibility Resolve symbol footnote references to actual file paths
 */

import * as path from 'node:path';
import type { SymbolFootnoteRef } from '../types/feature';
import type { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import type { SymbolRegistryEntry } from '../types/registry';

/**
 * Resolved symbol reference
 * @doc [[SymbolReferenceResolver]]
 * @public
 */
export interface ResolvedSymbolRef {
  /** Original footnote identifier */
  identifier: string;

  /** Resolved symbol name */
  symbolName: string;

  /** Resolved file path (relative to document) */
  relativePath: string;

  /** Symbol anchor (for #Symbol in markdown link) */
  anchor?: string;

  /** Registry entry */
  entry: SymbolRegistryEntry;
}

/**
 * Symbol Reference Resolver
 *
 * Resolves [^sym-XXX] or [^SymbolName] to actual code file paths
 *
 * @public
 * @responsibility Resolve symbol footnote references to file paths
 */
export class SymbolReferenceResolver {
  private registryManager: SymbolRegistryManager;

  constructor(registryManager: SymbolRegistryManager) {
    this.registryManager = registryManager;
  }

  /**
   * Resolve a single symbol footnote reference
   *
   * @param ref - Symbol footnote reference
   * @param docPath - Path to document containing the reference
   * @returns Resolved reference or null if not found
   */
  resolve(ref: SymbolFootnoteRef, docPath: string): ResolvedSymbolRef | null {
    let entry: SymbolRegistryEntry | undefined;

    if (ref.isIdRef) {
      // Extract ID from "sym-XXX" format
      const id = ref.identifier.replace(/^sym-/, '');
      entry = this.registryManager.findById(id);
    } else {
      // Search by symbol name
      const matches = this.registryManager.search(ref.identifier);

      if (matches.length === 0) {
        return null;
      }

      // If multiple matches, prefer exact match
      entry = matches.find(
        (e) => e.sourceRef.symbolName === ref.identifier
      ) || matches[0];
    }

    if (!entry) {
      return null;
    }

    // Calculate relative path from document to code file
    const docDir = path.dirname(docPath);
    const codeFilePath = entry.sourceRef.filePath;
    const relativePath = this.calculateRelativePath(docDir, codeFilePath);

    return {
      identifier: ref.identifier,
      symbolName: entry.sourceRef.symbolName,
      relativePath,
      anchor: entry.sourceRef.symbolName,
      entry,
    };
  }

  /**
   * Resolve multiple symbol footnote references
   *
   * @param refs - Symbol footnote references
   * @param docPath - Path to document containing the references
   * @returns Map of identifier to resolved reference
   */
  resolveMultiple(
    refs: SymbolFootnoteRef[],
    docPath: string
  ): Map<string, ResolvedSymbolRef> {
    const resolved = new Map<string, ResolvedSymbolRef>();

    // Deduplicate by identifier
    const uniqueRefs = new Map<string, SymbolFootnoteRef>();
    for (const ref of refs) {
      if (!uniqueRefs.has(ref.identifier)) {
        uniqueRefs.set(ref.identifier, ref);
      }
    }

    // Resolve each unique reference
    for (const ref of uniqueRefs.values()) {
      const result = this.resolve(ref, docPath);
      if (result) {
        resolved.set(ref.identifier, result);
      }
    }

    return resolved;
  }

  /**
   * Calculate relative path from source directory to target file
   *
   * @param fromDir - Source directory (absolute)
   * @param toFile - Target file (absolute)
   * @returns Relative path
   *
   * @example
   * ```typescript
   * calculateRelativePath('/path/to/docs/features', '/path/to/src/validator/ConventionValidator.ts')
   * // => '../../src/validator/ConventionValidator.ts'
   * ```
   */
  private calculateRelativePath(fromDir: string, toFile: string): string {
    const relativePath = path.relative(fromDir, toFile);

    // Ensure forward slashes for markdown links
    return relativePath.replace(/\\/g, '/');
  }

  /**
   * Get unresolved references
   *
   * @param refs - Symbol footnote references
   * @param docPath - Path to document
   * @returns Array of unresolved identifiers
   */
  getUnresolved(refs: SymbolFootnoteRef[], docPath: string): string[] {
    const unresolved: string[] = [];

    for (const ref of refs) {
      const result = this.resolve(ref, docPath);
      if (!result) {
        unresolved.push(ref.identifier);
      }
    }

    return unresolved;
  }
}
