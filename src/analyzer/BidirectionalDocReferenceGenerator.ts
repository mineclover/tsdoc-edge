/**
 * Bidirectional Doc Reference Generator
 * @packageDocumentation
 * @responsibility Generate reverse (Doc → Code) relationships from existing Code → Doc references
 */

import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Generates bidirectional doc-reference relationships
 *
 * @doc [[BidirectionalDocReferenceGenerator]]
 * @public
 * @responsibility Create Doc → Code relationships from Code → Doc references
 *
 * Pattern: For each Code → Doc relationship, create a reverse Doc → Code relationship
 * - Input: Code symbol → [[DocSymbol]]
 * - Output: [[DocSymbol]] → Code symbol
 *
 * Properties:
 * - Marks reverse relationships with `inferred: true` in properties
 * - Maintains all evidence from forward relationship
 * - Updates description to show reverse direction
 * - Sets discoveredBy to 'bidirectional-inference'
 *
 * @example
 * ```typescript
 * // Forward relationship:
 * // interface-extractionresult → [[doc:ExtractionResult]]
 *
 * // Generated reverse relationship:
 * // [[doc:ExtractionResult]] → interface-extractionresult
 * // properties.inferred = true
 * // discoveredBy = 'bidirectional-inference'
 * ```
 */
export class BidirectionalDocReferenceGenerator {
  /**
   * Generate reverse relationships from forward doc-references
   *
   * @param forwardRelationships - Array of Code → Doc relationships
   * @returns Array of Doc → Code relationships
   */
  generateReverseRelationships(forwardRelationships: UnifiedRelationship[]): UnifiedRelationship[] {
    const reverseRelationships: UnifiedRelationship[] = [];

    for (const forward of forwardRelationships) {
      // Only process doc-reference relationships
      if (forward.type !== 'doc-reference') {
        continue;
      }

      const reverse = this.createReverseRelationship(forward);
      if (reverse) {
        reverseRelationships.push(reverse);
      }
    }

    return reverseRelationships;
  }

  /**
   * Create a reverse relationship from a forward doc-reference
   *
   * @param forward - Forward Code → Doc relationship
   * @returns Reverse Doc → Code relationship
   * @private
   */
  private createReverseRelationship(forward: UnifiedRelationship): UnifiedRelationship | null {
    // Swap from and to
    const from = Array.isArray(forward.to) ? forward.to : [forward.to];
    const to = Array.isArray(forward.from) ? forward.from : [forward.from];

    const timestamp = new Date().toISOString();

    // Get forward relationship details for description
    const forwardFrom = Array.isArray(forward.from) ? forward.from[0] : forward.from;
    const forwardTo = Array.isArray(forward.to) ? forward.to[0] : forward.to;
    const section = forward.properties?.section ? `#${forward.properties.section}` : '';

    // Create reverse relationship
    return {
      id: `doc-reference-reverse-${forward.id}`,
      type: 'doc-reference',
      from,
      to,
      direction: 'unidirectional',
      strength: forward.strength,
      category: 'semantic',
      evidence: [
        ...forward.evidence,
        {
          type: 'documentation',
          source: 'bidirectional-doc-reference',
          confidence: 1.0,
          context: `Reverse of: ${forwardFrom} → [[${forwardTo}${section}]]`
        }
      ],
      discoveredBy: 'documentation',
      confidence: forward.confidence,
      filePath: forward.filePath,
      line: forward.line,
      properties: {
        ...forward.properties,
        inferred: true,
        reverseOf: forward.id,
        direction: 'doc-to-code'
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `[[${forwardTo}${section}]] ← ${forwardFrom} (reverse of ${forward.id})`
    };
  }

  /**
   * Get statistics for bidirectional relationships
   *
   * @param relationships - All doc-reference relationships (forward + reverse)
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    forward: number;
    reverse: number;
    uniqueCodeSymbols: number;
    uniqueDocSymbols: number;
  } {
    const codeSymbols = new Set<string>();
    const docSymbols = new Set<string>();
    let forwardCount = 0;
    let reverseCount = 0;

    for (const rel of relationships) {
      if (rel.type !== 'doc-reference') {
        continue;
      }

      // Check if it's a reverse relationship
      if (rel.properties?.inferred && rel.properties?.direction === 'doc-to-code') {
        reverseCount++;
      } else {
        forwardCount++;
      }

      // Track symbols
      const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
      const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];

      fromSymbols.forEach(s => {
        if (this.isCodeSymbol(s)) {
          codeSymbols.add(s);
        } else {
          docSymbols.add(s);
        }
      });

      toSymbols.forEach(s => {
        if (this.isCodeSymbol(s)) {
          codeSymbols.add(s);
        } else {
          docSymbols.add(s);
        }
      });
    }

    return {
      total: forwardCount + reverseCount,
      forward: forwardCount,
      reverse: reverseCount,
      uniqueCodeSymbols: codeSymbols.size,
      uniqueDocSymbols: docSymbols.size,
    };
  }

  /**
   * Check if a symbol ID represents a code symbol
   *
   * @param symbolId - Symbol ID to check
   * @returns True if it's a code symbol
   * @private
   */
  private isCodeSymbol(symbolId: string): boolean {
    // Code symbols typically have format: "type-name" or contain specific prefixes
    return symbolId.includes('-') ||
           symbolId.includes('test') ||
           symbolId.includes('class') ||
           symbolId.includes('interface') ||
           symbolId.includes('function') ||
           symbolId.includes('constant') ||
           symbolId.includes('variable');
  }
}
