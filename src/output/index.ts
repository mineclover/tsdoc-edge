/**
 * Output Builder Module
 * @packageDocumentation
 */

export * from './types';
export { XmlBuilder } from './XmlBuilder';
export { JsonBuilder } from './JsonBuilder';
export { XmlParser, XmlParseError, SchemaValidationError } from './XmlParser';
export * from './schemas';

import type { OutputSchema, OutputBuilder, OutputFormat } from './types';
import { XmlBuilder } from './XmlBuilder';
import { JsonBuilder } from './JsonBuilder';

/**
 * Create an output builder for the given format
 *
 * @example
 * ```typescript
 * const builder = createBuilder(DepsSchema, 'xml');
 * builder.section('source', { name: 'Foo' }).print();
 * ```
 */
export function createBuilder(schema: OutputSchema, format: OutputFormat): OutputBuilder {
  switch (format) {
    case 'xml':
      return new XmlBuilder(schema);
    case 'json':
      return new JsonBuilder(schema);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * Get output format from command args
 */
export function getOutputFormat(args: string[]): OutputFormat {
  if (args.includes('--json')) {
    return 'json';
  }
  return 'xml';
}

/**
 * Check if human-readable format is requested
 */
export function isHumanFormat(args: string[]): boolean {
  return args.includes('--human');
}
