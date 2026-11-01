/**
 * Output Builder Types
 *
 * @packageDocumentation
 * @doc [[Code Generation]]
 * @context Core schema DSL types and builder contracts shared by `JsonBuilder`, `XmlBuilder`, and `XmlParser`
 * @functionality Defines primitive field descriptors, object/array/grouped-array schema ASTs, `arrayOf` / `groupedArrayOf` constructors, and `OutputBuilder`
 */

/**
 * Primitive field types for schema definition
 *
 * @doc [[Code Generation]]
 * @public
 */
export type FieldType = 'string' | 'number' | 'boolean';

/**
 * Field definition in a schema
 *
 * @doc [[Code Generation]]
 * @public
 */
export interface FieldDef {
  type: FieldType;
  optional?: boolean;
}

/**
 * Object schema definition
 *
 * @doc [[Code Generation]]
 * @public
 */
export interface ObjectSchema {
  [key: string]: FieldType | FieldDef | ArraySchema | ObjectSchema;
}

/**
 * Array schema definition
 *
 * @doc [[Code Generation]]
 * @public
 */
export interface ArraySchema {
  _array: true;
  _itemName: string;
  _items: ObjectSchema;
}

/**
 * Grouped array schema definition
 * For structures like: `<wrapper><group name="X"><item/></group></wrapper>`
 *
 * @doc [[Code Generation]]
 * @public
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
 *
 * @doc [[Code Generation]]
 * @public
 */
export interface OutputSchema {
  root: string;
  sections: {
    [sectionName: string]: ObjectSchema | ArraySchema | GroupedArraySchema;
  };
}

/**
 * Helper to create array schema
 *
 * @doc [[Code Generation]]
 * @public
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
 * ```ts
 * // For structure: <dependents><relation-type name="X"><dependent/></relation-type></dependents>
 * groupedArrayOf('relation-type', 'name', 'dependent', { name: 'string', type: 'string' })
 * ```
 *
 * @doc [[Code Generation]]
 * @public
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
 *
 * @doc [[Code Generation]]
 * @public
 */
export type SectionData = Record<string, unknown> | Array<Record<string, unknown>>;

/**
 * Data for grouped array section
 * Keys are group names, values are arrays of items
 *
 * @doc [[Code Generation]]
 * @public
 */
export type GroupedSectionData = Record<string, Array<Record<string, unknown>>>;

/**
 * Complete output data matching a schema
 *
 * @doc [[Code Generation]]
 * @public
 */
export type OutputData = {
  [sectionName: string]: SectionData;
};

/**
 * Output format type
 *
 * @doc [[Code Generation]]
 * @public
 */
export type OutputFormat = 'xml' | 'json';

/**
 * Builder interface for output generation
 *
 * @doc [[Code Generation]]
 * @public
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
