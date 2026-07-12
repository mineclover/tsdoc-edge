/**
 * XML Output Builder
 * @packageDocumentation
 */

import type {
  ArraySchema,
  GroupedArraySchema,
  GroupedSectionData,
  ObjectSchema,
  OutputBuilder,
  OutputSchema,
  SectionData,
} from './types';

/**
 * Escape special XML characters
 */
function escapeXml(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * XML Builder for structured output
 *
 * @example
 * ```typescript
 * const schema: OutputSchema = {
 *   root: 'dependencies',
 *   sections: {
 *     source: { name: 'string', type: 'string', file: 'string', line: 'number' },
 *     targets: arrayOf('target', { name: 'string', type: 'string', relation: 'string' }),
 *   },
 * };
 *
 * new XmlBuilder(schema)
 *   .section('source', { name: 'Foo', type: 'class', file: 'foo.ts', line: 10 })
 *   .section('targets', [
 *     { name: 'Bar', type: 'interface', relation: 'code-dependency' },
 *   ])
 *   .print();
 * ```
 */
export class XmlBuilder implements OutputBuilder {
  private schema: OutputSchema;
  private data: Map<string, SectionData | GroupedSectionData> = new Map();
  private indentSize = 2;

  constructor(schema: OutputSchema) {
    this.schema = schema;
  }

  /**
   * Set data for a section
   */
  section(name: string, data: SectionData | GroupedSectionData): this {
    if (!this.schema.sections[name]) {
      throw new Error(
        `Unknown section: ${name}. Available: ${Object.keys(this.schema.sections).join(', ')}`
      );
    }
    this.data.set(name, data);
    return this;
  }

  /**
   * Build the XML string
   */
  build(): string {
    const lines: string[] = [];
    lines.push(`<${this.schema.root}>`);

    for (const [sectionName, sectionSchema] of Object.entries(this.schema.sections)) {
      const sectionData = this.data.get(sectionName);
      if (sectionData === undefined) continue;

      if (this.isGroupedArraySchema(sectionSchema)) {
        this.buildGroupedArraySection(
          lines,
          sectionName,
          sectionSchema,
          sectionData as GroupedSectionData,
          1
        );
      } else if (this.isArraySchema(sectionSchema)) {
        this.buildArraySection(
          lines,
          sectionName,
          sectionSchema,
          sectionData as Array<Record<string, unknown>>,
          1
        );
      } else {
        this.buildObjectSection(
          lines,
          sectionName,
          sectionSchema as ObjectSchema,
          sectionData as Record<string, unknown>,
          1
        );
      }
    }

    lines.push(`</${this.schema.root}>`);
    return lines.join('\n');
  }

  /**
   * Build and print to console
   */
  print(): void {
    console.log(this.build());
  }

  private isArraySchema(
    schema: ObjectSchema | ArraySchema | GroupedArraySchema
  ): schema is ArraySchema {
    return '_array' in schema && schema._array === true;
  }

  private isGroupedArraySchema(
    schema: ObjectSchema | ArraySchema | GroupedArraySchema
  ): schema is GroupedArraySchema {
    return '_groupedArray' in schema && schema._groupedArray === true;
  }

  private indent(level: number): string {
    return ' '.repeat(level * this.indentSize);
  }

  private buildObjectSection(
    lines: string[],
    tagName: string,
    schema: ObjectSchema,
    data: Record<string, unknown>,
    level: number
  ): void {
    const ind = this.indent(level);
    lines.push(`${ind}<${tagName}>`);

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const value = data[fieldName];
      if (value === undefined) continue;

      if (typeof fieldSchema === 'string') {
        // Simple field
        lines.push(`${this.indent(level + 1)}<${fieldName}>${escapeXml(value)}</${fieldName}>`);
      } else if (this.isArraySchema(fieldSchema as ObjectSchema | ArraySchema)) {
        // Nested array
        this.buildArraySection(
          lines,
          fieldName,
          fieldSchema as ArraySchema,
          value as Array<Record<string, unknown>>,
          level + 1
        );
      } else if (typeof fieldSchema === 'object' && 'type' in fieldSchema) {
        // FieldDef
        lines.push(`${this.indent(level + 1)}<${fieldName}>${escapeXml(value)}</${fieldName}>`);
      } else {
        // Nested object
        this.buildObjectSection(
          lines,
          fieldName,
          fieldSchema as ObjectSchema,
          value as Record<string, unknown>,
          level + 1
        );
      }
    }

    lines.push(`${ind}</${tagName}>`);
  }

  private buildArraySection(
    lines: string[],
    tagName: string,
    schema: ArraySchema,
    data: Array<Record<string, unknown>>,
    level: number
  ): void {
    const ind = this.indent(level);

    if (data.length === 0) {
      lines.push(`${ind}<${tagName}/>`);
      return;
    }

    lines.push(`${ind}<${tagName} count="${data.length}">`);

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const itemInd = this.indent(level + 1);
      lines.push(`${itemInd}<${schema._itemName} index="${i + 1}">`);

      for (const [fieldName, fieldSchema] of Object.entries(schema._items)) {
        const value = item[fieldName];
        if (value === undefined) continue;

        if (typeof fieldSchema === 'string') {
          lines.push(`${this.indent(level + 2)}<${fieldName}>${escapeXml(value)}</${fieldName}>`);
        } else if (this.isArraySchema(fieldSchema as ObjectSchema | ArraySchema)) {
          this.buildArraySection(
            lines,
            fieldName,
            fieldSchema as ArraySchema,
            value as Array<Record<string, unknown>>,
            level + 2
          );
        } else if (typeof fieldSchema === 'object' && 'type' in fieldSchema) {
          lines.push(`${this.indent(level + 2)}<${fieldName}>${escapeXml(value)}</${fieldName}>`);
        } else {
          this.buildObjectSection(
            lines,
            fieldName,
            fieldSchema as ObjectSchema,
            value as Record<string, unknown>,
            level + 2
          );
        }
      }

      lines.push(`${itemInd}</${schema._itemName}>`);
    }

    lines.push(`${ind}</${tagName}>`);
  }

  private buildGroupedArraySection(
    lines: string[],
    tagName: string,
    schema: GroupedArraySchema,
    data: GroupedSectionData,
    level: number
  ): void {
    const ind = this.indent(level);
    const groups = Object.entries(data);

    // Calculate total count across all groups
    const totalCount = groups.reduce((sum, [, items]) => sum + items.length, 0);

    if (totalCount === 0) {
      lines.push(`${ind}<${tagName}/>`);
      return;
    }

    lines.push(`${ind}<${tagName} count="${totalCount}">`);

    for (const [groupKey, items] of groups) {
      if (items.length === 0) continue;

      const groupInd = this.indent(level + 1);
      lines.push(
        `${groupInd}<${schema._groupTag} ${schema._groupKeyField}="${escapeXml(groupKey)}" count="${items.length}">`
      );

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemInd = this.indent(level + 2);
        lines.push(`${itemInd}<${schema._itemTag} index="${i + 1}">`);

        for (const [fieldName, fieldSchema] of Object.entries(schema._items)) {
          const value = item[fieldName];
          if (value === undefined) continue;

          if (typeof fieldSchema === 'string') {
            lines.push(`${this.indent(level + 3)}<${fieldName}>${escapeXml(value)}</${fieldName}>`);
          } else if (typeof fieldSchema === 'object' && 'type' in fieldSchema) {
            lines.push(`${this.indent(level + 3)}<${fieldName}>${escapeXml(value)}</${fieldName}>`);
          }
        }

        lines.push(`${itemInd}</${schema._itemTag}>`);
      }

      lines.push(`${groupInd}</${schema._groupTag}>`);
    }

    lines.push(`${ind}</${tagName}>`);
  }
}
