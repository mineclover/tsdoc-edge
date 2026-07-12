/**
 * XML Parser for Output Schema
 * @packageDocumentation
 */

import type {
  ArraySchema,
  GroupedArraySchema,
  GroupedSectionData,
  ObjectSchema,
  OutputSchema,
  SectionData,
} from './types';

/**
 * Error thrown when XML parsing fails
 */
export class XmlParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public context?: string
  ) {
    super(message);
    this.name = 'XmlParseError';
  }
}

/**
 * Error thrown when schema validation fails
 */
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public path: string,
    public expected: string,
    public actual: string
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Parsed data structure
 */
export interface ParsedData {
  [sectionName: string]: SectionData | GroupedSectionData;
}

/**
 * Unescape XML entities
 */
function unescapeXml(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/**
 * Simple XML element representation
 */
interface XmlElement {
  tag: string;
  attributes: Record<string, string>;
  children: XmlElement[];
  text?: string;
}

/**
 * Parse XML string to element tree (simple recursive descent parser)
 */
function parseXmlToTree(xml: string): XmlElement | null {
  const trimmed = xml.trim();
  if (!trimmed) return null;

  // Simple regex-based parser for our structured XML
  const tagRegex = /<([a-zA-Z_][\w-]*)((?:\s+[\w-]+="[^"]*")*)\s*(\/?)>/;
  const match = trimmed.match(tagRegex);

  if (!match) return null;

  const tag = match[1];
  const attrString = match[2];
  const selfClosing = match[3] === '/';

  // Parse attributes
  const attributes: Record<string, string> = {};
  const attrRegex = /([\w-]+)="([^"]*)"/g;
  for (const attrMatch of attrString.matchAll(attrRegex)) {
    attributes[attrMatch[1]] = unescapeXml(attrMatch[2]);
  }

  if (selfClosing) {
    return { tag, attributes, children: [], text: undefined };
  }

  // Find closing tag
  const closeTag = `</${tag}>`;
  const closeIndex = trimmed.lastIndexOf(closeTag);
  if (closeIndex === -1) {
    throw new XmlParseError(`Missing closing tag for <${tag}>`);
  }

  // Get inner content
  const matchIndex = match.index;
  if (matchIndex === undefined)
    throw new XmlParseError(`Missing opening tag position for <${tag}>`);
  const openTagEnd = trimmed.indexOf('>', matchIndex) + 1;
  const innerContent = trimmed.substring(openTagEnd, closeIndex).trim();

  // Check if it's text content or child elements
  if (!innerContent.startsWith('<')) {
    return { tag, attributes, children: [], text: unescapeXml(innerContent) };
  }

  // Parse children
  const children: XmlElement[] = [];
  let remaining = innerContent;

  while (remaining.trim()) {
    remaining = remaining.trim();
    if (!remaining.startsWith('<')) break;

    // Find the tag name
    const childMatch = remaining.match(/^<([a-zA-Z_][\w-]*)/);
    if (!childMatch) break;

    const childTag = childMatch[1];

    // Find where this element ends (handle self-closing and nested)
    let depth = 0;
    let i = 0;
    let elementEnd = -1;

    while (i < remaining.length) {
      if (remaining.startsWith(`<${childTag}`, i)) {
        if (
          remaining[i + childTag.length + 1] === '/' ||
          remaining.substring(i).match(new RegExp(`^<${childTag}[^>]*/>`))
        ) {
          // Self-closing, find end
          const selfCloseEnd = remaining.indexOf('/>', i);
          if (depth === 0) {
            elementEnd = selfCloseEnd + 2;
            break;
          }
          i = selfCloseEnd + 2;
        } else {
          depth++;
          i = remaining.indexOf('>', i) + 1;
        }
      } else if (remaining.startsWith(`</${childTag}>`, i)) {
        depth--;
        if (depth === 0) {
          elementEnd = i + childTag.length + 3;
          break;
        }
        i += childTag.length + 3;
      } else {
        i++;
      }
    }

    if (elementEnd === -1) break;

    const childXml = remaining.substring(0, elementEnd);
    const childElement = parseXmlToTree(childXml);
    if (childElement) {
      children.push(childElement);
    }

    remaining = remaining.substring(elementEnd);
  }

  return { tag, attributes, children, text: undefined };
}

/**
 * XML Parser for schema-based parsing
 *
 * @example
 * ```typescript
 * const parser = new XmlParser(DepsSchema);
 * const data = parser.parse(xmlString);
 * const json = parser.toJson(xmlString, { pretty: true });
 * ```
 */
export class XmlParser {
  private schema: OutputSchema;

  constructor(schema: OutputSchema) {
    this.schema = schema;
  }

  /**
   * Parse XML string to structured data
   */
  parse(xml: string): ParsedData {
    const root = parseXmlToTree(xml);

    if (!root) {
      throw new XmlParseError('Failed to parse XML');
    }

    if (root.tag !== this.schema.root) {
      throw new XmlParseError(`Expected root element <${this.schema.root}>, got <${root.tag}>`);
    }

    const result: ParsedData = {};

    for (const child of root.children) {
      const sectionName = child.tag;
      const sectionSchema = this.schema.sections[sectionName];

      if (!sectionSchema) {
        // Skip unknown sections
        continue;
      }

      if (this.isGroupedArraySchema(sectionSchema)) {
        result[sectionName] = this.parseGroupedArray(child, sectionSchema);
      } else if (this.isArraySchema(sectionSchema)) {
        result[sectionName] = this.parseArray(child, sectionSchema);
      } else {
        result[sectionName] = this.parseObject(child, sectionSchema);
      }
    }

    return result;
  }

  /**
   * Convert XML to JSON string
   */
  toJson(xml: string, options?: { pretty?: boolean }): string {
    const data = this.parse(xml);
    if (options?.pretty) {
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data);
  }

  /**
   * Validate XML against schema
   */
  validate(xml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const data = this.parse(xml);

      // Check required sections
      for (const sectionName of Object.keys(this.schema.sections)) {
        if (data[sectionName] === undefined) {
          errors.push(`Missing section: ${sectionName}`);
        }
      }
    } catch (e) {
      errors.push(String(e));
    }

    return { valid: errors.length === 0, errors };
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

  private parseObject(element: XmlElement, schema: ObjectSchema): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const child of element.children) {
      const fieldName = child.tag;
      const fieldSchema = schema[fieldName];

      if (!fieldSchema) continue;

      if (typeof fieldSchema === 'string') {
        result[fieldName] = this.coerceValue(child.text || '', fieldSchema);
      } else if ('type' in fieldSchema && typeof fieldSchema.type === 'string') {
        result[fieldName] = this.coerceValue(child.text || '', fieldSchema.type);
      } else if (this.isArraySchema(fieldSchema as ObjectSchema | ArraySchema)) {
        result[fieldName] = this.parseArray(child, fieldSchema as ArraySchema);
      } else {
        result[fieldName] = this.parseObject(child, fieldSchema as ObjectSchema);
      }
    }

    return result;
  }

  private parseArray(element: XmlElement, schema: ArraySchema): Array<Record<string, unknown>> {
    const result: Array<Record<string, unknown>> = [];

    for (const child of element.children) {
      if (child.tag === schema._itemName) {
        const item: Record<string, unknown> = {};

        for (const itemChild of child.children) {
          const fieldName = itemChild.tag;
          const fieldSchema = schema._items[fieldName];

          if (!fieldSchema) continue;

          if (typeof fieldSchema === 'string') {
            item[fieldName] = this.coerceValue(itemChild.text || '', fieldSchema);
          } else if ('type' in fieldSchema && typeof fieldSchema.type === 'string') {
            item[fieldName] = this.coerceValue(itemChild.text || '', fieldSchema.type);
          }
        }

        result.push(item);
      }
    }

    return result;
  }

  private parseGroupedArray(element: XmlElement, schema: GroupedArraySchema): GroupedSectionData {
    const result: GroupedSectionData = {};

    for (const groupElement of element.children) {
      if (groupElement.tag === schema._groupTag) {
        const groupKey = groupElement.attributes[schema._groupKeyField] || '';
        const items: Array<Record<string, unknown>> = [];

        for (const itemElement of groupElement.children) {
          if (itemElement.tag === schema._itemTag) {
            const item: Record<string, unknown> = {};

            for (const fieldElement of itemElement.children) {
              const fieldName = fieldElement.tag;
              const fieldSchema = schema._items[fieldName];

              if (!fieldSchema) continue;

              if (typeof fieldSchema === 'string') {
                item[fieldName] = this.coerceValue(fieldElement.text || '', fieldSchema);
              } else if ('type' in fieldSchema && typeof fieldSchema.type === 'string') {
                item[fieldName] = this.coerceValue(fieldElement.text || '', fieldSchema.type);
              }
            }

            items.push(item);
          }
        }

        result[groupKey] = items;
      }
    }

    return result;
  }

  private coerceValue(value: string, type: string): unknown {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === '1';
      default:
        return value;
    }
  }
}
