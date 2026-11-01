/**
 * Module Specification Tag Parser
 *
 * Parses 7-part module specification custom and standard tags from `@microsoft/tsdoc` `DocComment` AST
 *
 * @packageDocumentation
 * @responsibility Parse module spec tags from `@microsoft/tsdoc` AST
 */

import type { ParserContext } from '@microsoft/tsdoc';
import type {
  ModuleSpecTags,
  MutationDoc,
  ScopeDoc,
  SideEffectDoc,
} from '../types/tags/module-spec-tags';
import { readTsdocComment, TSDocParser } from './TSDocParser';

/**
 * Module specification tag parser backed by `@microsoft/tsdoc` `DocComment` AST.
 *
 * @doc [[ModuleSpecTagParser]]
 * @doc [[TSDocStandardSpecification]]
 * @public
 * @responsibility Extract 7-part module spec tags from `@microsoft/tsdoc` `DocComment` AST
 */
export class ModuleSpecTagParser {
  private readonly tsdocParser = new TSDocParser();

  /**
   * Parse module spec tags from `@microsoft/tsdoc` parser context or JSDoc text.
   *
   * @param tsdocContext - Parsed `@microsoft/tsdoc` context, if already available
   * @param jsDocText - Fallback raw JSDoc comment text when `tsdocContext` is omitted
   * @returns Parsed module spec tags
   * @public
   */
  parseModuleSpecTags(tsdocContext: ParserContext | null, jsDocText: string): ModuleSpecTags {
    const tags: ModuleSpecTags = {};

    if (!tsdocContext && !jsDocText.trim()) {
      return tags;
    }

    const docComment =
      tsdocContext?.docComment ?? this.tsdocParser.parseString(jsDocText).docComment;
    const structured = readTsdocComment(docComment);

    const algorithmBlocks = structured
      .getTagValues('@algorithm')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (algorithmBlocks.length > 0) {
      tags.algorithm = {
        description: algorithmBlocks.join(' '),
      };
    }

    const complexityText = structured.getFirstTagValue('@complexity');
    if (complexityText) {
      const parts = complexityText.split(/\s+-\s+/);
      tags.complexity = {
        notation: parts[0].trim(),
        explanation: parts[1]?.trim(),
      };
    }

    const sideEffectBlocks = structured
      .getTagValues('@sideEffect')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    for (const rawEffect of sideEffectBlocks) {
      const effect = this.parseSideEffect(rawEffect);
      if (!tags.sideEffects) {
        tags.sideEffects = [];
      }
      tags.sideEffects.push(effect);

      if (effect.type === 'state') {
        if (!tags.mutations) {
          tags.mutations = [];
        }
        tags.mutations.push(this.parseMutation(effect.description));
      } else if (
        effect.type === 'filesystem' ||
        effect.type === 'network' ||
        effect.type === 'database'
      ) {
        if (!tags.io) {
          tags.io = [];
        }
        tags.io.push({
          type: effect.type === 'filesystem' ? 'file' : effect.type,
          description: effect.description,
        });
      }
    }

    if (structured.releaseVisibility) {
      const accessLevel: ScopeDoc['accessLevel'] =
        structured.releaseVisibility === 'internal' ? 'internal' : 'public';
      tags.scope = {
        accessLevel,
        description: `@${structured.releaseVisibility}`,
      };
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

    const operationMatch = rest.match(/\(([^)]+)\)$/);
    const operation = operationMatch ? operationMatch[1] : undefined;
    const description = operation ? rest.replace(/\s*\([^)]+\)$/, '').trim() : rest;

    const typeMap: Record<string, SideEffectDoc['type'] | undefined> = {
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
      type: typeMap[typeStr] ?? 'other',
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
}
