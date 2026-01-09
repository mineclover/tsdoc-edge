/**
 * JSON Output Builder
 * @packageDocumentation
 */

import type { OutputSchema, OutputBuilder, SectionData } from './types';

/**
 * JSON Builder for structured output
 *
 * @example
 * ```typescript
 * const schema: OutputSchema = {
 *   root: 'dependencies',
 *   sections: {
 *     source: { name: 'string', type: 'string' },
 *     targets: arrayOf('target', { name: 'string', type: 'string' }),
 *   },
 * };
 *
 * new JsonBuilder(schema)
 *   .section('source', { name: 'Foo', type: 'class' })
 *   .section('targets', [{ name: 'Bar', type: 'interface' }])
 *   .print();
 * ```
 */
export class JsonBuilder implements OutputBuilder {
  private schema: OutputSchema;
  private data: Map<string, SectionData> = new Map();
  private prettyPrint = true;

  constructor(schema: OutputSchema, options?: { prettyPrint?: boolean }) {
    this.schema = schema;
    if (options?.prettyPrint !== undefined) {
      this.prettyPrint = options.prettyPrint;
    }
  }

  /**
   * Set data for a section
   */
  section(name: string, data: SectionData): this {
    if (!this.schema.sections[name]) {
      throw new Error(`Unknown section: ${name}. Available: ${Object.keys(this.schema.sections).join(', ')}`);
    }
    this.data.set(name, data);
    return this;
  }

  /**
   * Build the JSON string
   */
  build(): string {
    const output: Record<string, unknown> = {};

    for (const sectionName of Object.keys(this.schema.sections)) {
      const sectionData = this.data.get(sectionName);
      if (sectionData !== undefined) {
        output[sectionName] = sectionData;
      }
    }

    if (this.prettyPrint) {
      return JSON.stringify(output, null, 2);
    }
    return JSON.stringify(output);
  }

  /**
   * Build and print to console
   */
  print(): void {
    console.log(this.build());
  }
}
