/**
 * Output Builder Types
 * @packageDocumentation
 */

/**
 * Primitive field types for schema definition
 */
export type FieldType = 'string' | 'number' | 'boolean';

/**
 * Field definition in a schema
 */
export interface FieldDef {
  type: FieldType;
  optional?: boolean;
}

/**
 * Object schema definition
 */
export interface ObjectSchema {
  [key: string]: FieldType | FieldDef | ArraySchema | ObjectSchema;
}

/**
 * Array schema definition
 */
export interface ArraySchema {
  _array: true;
  _itemName: string;
  _items: ObjectSchema;
}

/**
 * Grouped array schema definition
 * For structures like: <wrapper><group name="X"><item/></group></wrapper>
 */
export interface GroupedArraySchema {
  _groupedArray: true;
  _groupTag: string;
  _groupKeyField: string;
  _itemTag: string;
  _items: ObjectSchema;
}

/**
 * Complete output schema
 */
export interface OutputSchema {
  root: string;
  sections: {
    [sectionName: string]: ObjectSchema | ArraySchema | GroupedArraySchema;
  };
}

/**
 * Helper to create array schema
 */
export function arrayOf(itemName: string, items: ObjectSchema): ArraySchema {
  return {
    _array: true,
    _itemName: itemName,
    _items: items,
  };
}

/**
 * Helper to create grouped array schema
 *
 * @example
 * // For structure: <dependents><relation-type name="X"><dependent/></relation-type></dependents>
 * groupedArrayOf('relation-type', 'name', 'dependent', { name: 'string', type: 'string' })
 */
export function groupedArrayOf(
  groupTag: string,
  groupKeyField: string,
  itemTag: string,
  items: ObjectSchema
): GroupedArraySchema {
  return {
    _groupedArray: true,
    _groupTag: groupTag,
    _groupKeyField: groupKeyField,
    _itemTag: itemTag,
    _items: items,
  };
}

/**
 * Data for a single section
 */
export type SectionData = Record<string, unknown> | Array<Record<string, unknown>>;

/**
 * Data for grouped array section
 * Keys are group names, values are arrays of items
 */
export type GroupedSectionData = Record<string, Array<Record<string, unknown>>>;

/**
 * Complete output data matching a schema
 */
export type OutputData = {
  [sectionName: string]: SectionData;
};

/**
 * Output format type
 */
export type OutputFormat = 'xml' | 'json';

/**
 * Builder interface for output generation
 */
export interface OutputBuilder {
  /**
   * Set data for a section
   */
  section(name: string, data: SectionData): this;

  /**
   * Build the output string
   */
  build(): string;

  /**
   * Build and print to console
   */
  print(): void;
}
