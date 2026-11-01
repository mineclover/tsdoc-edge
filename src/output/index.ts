/**
 * Output Builder Module
 *
 * @packageDocumentation
 * @doc [[Code Generation]]
 * @context Schema-driven structured CLI output layer supporting XML and JSON formats
 * @functionality Barrel re-exports for `JsonBuilder`, `XmlBuilder`, `XmlParser`, schemas, types, and format-selection factory helpers
 */

export { JsonBuilder } from './JsonBuilder';
export * from './schemas';
export * from './types';
export { XmlBuilder } from './XmlBuilder';
export { SchemaValidationError, XmlParseError, XmlParser } from './XmlParser';

import { JsonBuilder } from './JsonBuilder';
import type { OutputBuilder, OutputFormat, OutputSchema } from './types';
import { XmlBuilder } from './XmlBuilder';

/**
 * Create an output builder for the given format
 *
 * @example
 * ```typescript
 * const builder = createBuilder(DepsSchema, 'xml');
 * builder.section('source', { name: 'Foo' }).print();
 * ```
 *
 * @doc [[Code Generation]]
 * @public
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
 *
 * @doc [[Code Generation]]
 * @public
 */
export function getOutputFormat(args: string[]): OutputFormat {
  if (args.includes('--json')) {
    return 'json';
  }
  return 'xml';
}

/**
 * Check if human-readable format is requested
 *
 * @doc [[Code Generation]]
 * @public
 */
export function isHumanFormat(args: string[]): boolean {
  return args.includes('--human');
}
