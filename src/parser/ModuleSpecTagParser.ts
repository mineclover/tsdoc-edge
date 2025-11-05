/**
 * Module Specification Tag Parser
 *
 * Parses 7-part module specification custom tags from TSDoc comments
 *
 * @packageDocumentation
 * @responsibility Parse module spec tags from TSDoc
 */

import type { ParserContext } from '@microsoft/tsdoc';
import type {
  ModuleSpecTags,
  AlgorithmDoc,
  ComplexityDoc,
  SideEffectDoc,
  MutationDoc,
  IODoc,
  ScopeDoc,
} from '../types/tags/module-spec-tags';

/**
 * Module specification tag parser
 *
 * @public
 * @responsibility Extract 7-part module spec tags from TSDoc
 */
export class ModuleSpecTagParser {
  /**
   * Parse module spec tags from TSDoc context
   *
   * @param tsdocContext - TSDoc parser context
   * @param jsDocText - Raw JSDoc comment text for custom tag parsing
   * @returns Parsed module spec tags
   * @public
   */
  parseModuleSpecTags(tsdocContext: ParserContext | null, jsDocText: string): ModuleSpecTags {
    const tags: ModuleSpecTags = {};

    if (!jsDocText) {
      return tags;
    }

    // Parse custom tags from raw JSDoc text
    const lines = jsDocText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // @algorithm
      const algorithmMatch = trimmed.match(/^\*\s*@algorithm\s+(.+)$/);
      if (algorithmMatch) {
        if (!tags.algorithm) {
          tags.algorithm = { description: algorithmMatch[1] };
        } else {
          // Multi-line algorithm
          tags.algorithm.description += ' ' + algorithmMatch[1];
        }
      }

      // @complexity
      const complexityMatch = trimmed.match(/^\*\s*@complexity\s+(.+)$/);
      if (complexityMatch) {
        const text = complexityMatch[1];
        // Parse "O(n) - explanation" or just "High"
        const parts = text.split(/\s+-\s+/);
        tags.complexity = {
          notation: parts[0].trim(),
          explanation: parts[1]?.trim(),
        };
      }

      // @sideEffect
      const sideEffectMatch = trimmed.match(/^\*\s*@sideEffect\s+(.+)$/);
      if (sideEffectMatch) {
        const effect = this.parseSideEffect(sideEffectMatch[1]);
        if (!tags.sideEffects) {
          tags.sideEffects = [];
        }
        tags.sideEffects.push(effect);
      }

      // @mutates
      const mutatesMatch = trimmed.match(/^\*\s*@mutates\s+(.+)$/);
      if (mutatesMatch) {
        const mutation = this.parseMutation(mutatesMatch[1]);
        if (!tags.mutations) {
          tags.mutations = [];
        }
        tags.mutations.push(mutation);
      }

      // @io
      const ioMatch = trimmed.match(/^\*\s*@io\s+(.+)$/);
      if (ioMatch) {
        const io = this.parseIO(ioMatch[1]);
        if (!tags.io) {
          tags.io = [];
        }
        tags.io.push(io);
      }

      // @scope
      const scopeMatch = trimmed.match(/^\*\s*@scope\s+(.+)$/);
      if (scopeMatch) {
        tags.scope = this.parseScope(scopeMatch[1]);
      }
    }

    return tags;
  }

  /**
   * Parse side effect tag value
   *
   * Format: "type: description" or "type: description (operation)"
   * Example: "filesystem: Writes config file (write)"
   */
  private parseSideEffect(value: string): SideEffectDoc {
    const colonIndex = value.indexOf(':');
    if (colonIndex === -1) {
      return {
        type: 'other',
        description: value.trim(),
      };
    }

    const typeStr = value.substring(0, colonIndex).trim().toLowerCase();
    const rest = value.substring(colonIndex + 1).trim();

    // Extract operation from parentheses
    const operationMatch = rest.match(/\(([^)]+)\)$/);
    const operation = operationMatch ? operationMatch[1] : undefined;
    const description = operation ? rest.replace(/\s*\([^)]+\)$/, '').trim() : rest;

    // Map type string to SideEffectDoc type
    const typeMap: Record<string, SideEffectDoc['type']> = {
      filesystem: 'filesystem',
      fs: 'filesystem',
      file: 'filesystem',
      database: 'database',
      db: 'database',
      network: 'network',
      net: 'network',
      state: 'state',
      process: 'process',
      other: 'other',
    };

    return {
      type: typeMap[typeStr] || 'other',
      description,
      operation,
    };
  }

  /**
   * Parse mutation tag value
   *
   * Format: "target - description"
   * Example: "this.cache - Updates internal cache"
   */
  private parseMutation(value: string): MutationDoc {
    const parts = value.split(/\s+-\s+/);
    return {
      target: parts[0].trim(),
      description: parts[1]?.trim() || '',
    };
  }

  /**
   * Parse I/O tag value
   *
   * Format: "type: description"
   * Example: "file: Reads config.json"
   */
  private parseIO(value: string): IODoc {
    const colonIndex = value.indexOf(':');
    if (colonIndex === -1) {
      return {
        type: 'other',
        description: value.trim(),
      };
    }

    const typeStr = value.substring(0, colonIndex).trim().toLowerCase();
    const description = value.substring(colonIndex + 1).trim();

    const typeMap: Record<string, IODoc['type']> = {
      file: 'file',
      filesystem: 'file',
      fs: 'file',
      network: 'network',
      net: 'network',
      database: 'database',
      db: 'database',
      console: 'console',
      log: 'console',
      other: 'other',
    };

    return {
      type: typeMap[typeStr] || 'other',
      description,
    };
  }

  /**
   * Parse scope tag value
   *
   * Format: "description" or "access: description"
   * Example: "public: Exported from main module"
   */
  private parseScope(value: string): ScopeDoc {
    const accessMatch = value.match(/^(public|private|protected|internal):\s*(.+)$/i);
    if (accessMatch) {
      return {
        accessLevel: accessMatch[1].toLowerCase() as ScopeDoc['accessLevel'],
        description: accessMatch[2].trim(),
      };
    }

    return {
      description: value.trim(),
    };
  }
}
