/**
 * YAML frontmatter parser for markdown documents
 * @packageDocumentation
 * @responsibility Parse and validate YAML frontmatter from markdown files
 */

/**
 * Frontmatter metadata interface
 *
 * @doc [[FrontmatterParser]]
 * @public
 */
export interface FrontmatterMetadata {
  /**
   * TSDoc management status
   * - "managed": TSDoc Edge managed document
   * - "example": Example/template document (excluded from management)
   * - undefined: Not specified
   */
  tsdoc?: 'managed' | 'example';

  /**
   * Document version
   */
  version?: string;

  /**
   * Document status
   */
  status?: 'active' | 'draft' | 'deprecated' | 'archived';

  /**
   * Primary symbol name (for validation)
   */
  primary?: string;

  /**
   * Document category
   */
  category?: 'feature' | 'guide' | 'design' | 'reference';

  /**
   * Whether the document requires a code implementation connection.
   * `not-applicable` is an explicit disposition for indexes, guides, and
   * design documents that intentionally have no single implementation owner.
   */
  codeImplementation?: 'required' | 'not-applicable';

  /**
   * Classification tags
   */
  tags?: string[];

  /**
   * Last updated timestamp
   */
  lastUpdated?: string;

  /**
   * Additional custom fields
   */
  [key: string]: unknown;
}

/**
 * Parsed frontmatter result
 *
 * @public
 */
export interface ParsedFrontmatter {
  /**
   * Parsed metadata
   */
  metadata: FrontmatterMetadata;

  /**
   * Document body (content after frontmatter)
   */
  body: string;

  /**
   * Whether frontmatter exists
   */
  hasFrontmatter: boolean;
}

/**
 * Parse YAML frontmatter from markdown content
 *
 * @public
 * @responsibility Extract and parse YAML frontmatter from markdown documents
 */
export class FrontmatterParser {
  private static readonly FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

  /**
   * Parse frontmatter from markdown content
   *
   * @param content - Markdown content
   * @returns Parsed frontmatter and body
   *
   * @example
   * ```typescript
   * const parser = new FrontmatterParser();
   * const result = parser.parse(content);
   * if (result.metadata.tsdoc === 'managed') {
   *   // Process managed document
   * }
   * ```
   */
  parse(content: string): ParsedFrontmatter {
    const match = content.match(FrontmatterParser.FRONTMATTER_REGEX);

    if (!match) {
      return {
        metadata: {},
        body: content,
        hasFrontmatter: false,
      };
    }

    const [, yamlContent, body] = match;
    const metadata = this.parseYaml(yamlContent);

    return {
      metadata,
      body,
      hasFrontmatter: true,
    };
  }

  /**
   * Parse simple YAML content
   *
   * @param yamlContent - YAML string
   * @returns Parsed metadata object
   *
   * @remarks
   * Supports basic YAML features:
   * - Key-value pairs (key: value)
   * - Arrays (- item or [item1, item2])
   * - Nested objects (key.subkey: value)
   *
   * Does NOT support:
   * - Complex YAML features (anchors, aliases, multiline strings)
   * - Use external library (gray-matter) for advanced cases
   */
  private parseYaml(yamlContent: string): FrontmatterMetadata {
    const metadata: FrontmatterMetadata = {};
    const lines = yamlContent.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      // Array items
      if (line.trim().startsWith('-')) {
        continue; // Handle arrays separately below
      }

      // Key-value pairs
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Parse value
      if (value === 'true') {
        metadata[key] = true;
      } else if (value === 'false') {
        metadata[key] = false;
      } else if (value === 'null' || value === '') {
        metadata[key] = null;
      } else if (/^\d+$/.test(value)) {
        metadata[key] = Number.parseInt(value, 10);
      } else if (/^\d+\.\d+$/.test(value)) {
        metadata[key] = Number.parseFloat(value);
      } else {
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '');
        metadata[key] = value;
      }
    }

    // Handle arrays (tags, etc.)
    const arrayMatches = yamlContent.match(/(\w+):\s*\n((?:\s+-\s+.+\n?)+)/g);
    if (arrayMatches) {
      for (const arrayMatch of arrayMatches) {
        const [keyPart, ...itemsPart] = arrayMatch.split('\n');
        const key = keyPart.replace(':', '').trim();
        const items = itemsPart
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.trim().slice(1).trim());
        metadata[key] = items;
      }
    }

    return metadata;
  }

  /**
   * Validate managed document frontmatter
   *
   * @param metadata - Frontmatter metadata
   * @returns Validation result with errors
   *
   * @remarks
   * Checks:
   * - tsdoc field is "managed"
   * - Required fields present (if strictMode)
   * @param strictMode - strictMode parameter
   */
  validate(
    metadata: FrontmatterMetadata,
    strictMode = false
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (strictMode) {
      if (!metadata.tsdoc) {
        errors.push('Missing required field: tsdoc');
      }
      if (metadata.tsdoc && !['managed', 'example'].includes(metadata.tsdoc)) {
        errors.push(`Invalid tsdoc value: ${metadata.tsdoc} (expected "managed" or "example")`);
      }
    }

    const codeImplementation = (metadata as Record<string, unknown>).codeImplementation;
    if (
      codeImplementation !== undefined &&
      codeImplementation !== 'required' &&
      codeImplementation !== 'not-applicable'
    ) {
      errors.push(
        `Invalid codeImplementation value: ${String(codeImplementation)} ` +
          '(expected "required" or "not-applicable")'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate frontmatter string from metadata
   *
   * @param metadata - Metadata object
   * @returns YAML frontmatter string
   *
   * @example
   * ```typescript
   * const parser = new FrontmatterParser();
   * const yaml = parser.stringify({
   *   tsdoc: 'managed',
   *   version: '1.0.0',
   *   status: 'active'
   * });
   * // Returns:
   * // ---
   * // tsdoc: managed
   * // version: 1.0.0
   * // status: active
   * // ---
   * ```
   */
  stringify(metadata: FrontmatterMetadata): string {
    const lines = ['---'];

    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      } else if (typeof value === 'string') {
        lines.push(`${key}: ${value}`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }

    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Add or update frontmatter in markdown content
   *
   * @param content - Original markdown content
   * @param metadata - Metadata to add/update
   * @returns Updated markdown content
   */
  addOrUpdate(content: string, metadata: FrontmatterMetadata): string {
    const parsed = this.parse(content);
    const mergedMetadata = { ...parsed.metadata, ...metadata };
    const frontmatter = this.stringify(mergedMetadata);
    return `${frontmatter}\n\n${parsed.body}`;
  }
}
