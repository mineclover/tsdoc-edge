/**
 * Tests for CanonicalTagBridge and strict zero-overlap tag boundaries
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { StandardTags } from '@microsoft/tsdoc';
import { generateTsdocJson, TSDOC_EDGE_CUSTOM_TAGS } from '../../parser/TSDocParser';
import { MODULE_SPEC_ASPECT_TAGS } from '../../spec/SpecMetricsAggregator';
import {
  CANONICAL_TSDOC_STANDARD_BRIDGE,
  CANONICAL_TTSC_RELATIONSHIP_BRIDGE,
  CUSTOM_TAGS,
  lookupRetiredTagMigration,
  mapTtscEdgeKindToRelationshipType,
  RETIRED_CUSTOM_TAG_MIGRATIONS,
} from '../../types/tags';

describe('CanonicalTagBridge & Zero-Overlap Tag Governance', () => {
  const customTagSet = new Set(TSDOC_EDGE_CUSTOM_TAGS.map((t) => t.tagName));
  const standardTagSet = new Set(StandardTags.allDefinitions.map((t) => t.tagName));
  const retiredTagSet = new Set(RETIRED_CUSTOM_TAG_MIGRATIONS.map((t) => t.tagName));

  it('keeps tsdoc.json, TSDOC_EDGE_CUSTOM_TAGS, and CUSTOM_TAGS strictly synchronized at 22 irreducible tags', () => {
    const repoTsdocJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'tsdoc.json'), 'utf-8')
    );
    const generated = generateTsdocJson();

    expect(TSDOC_EDGE_CUSTOM_TAGS).toHaveLength(22);
    expect(repoTsdocJson).toEqual(generated);
    expect(new Set(Object.values(CUSTOM_TAGS))).toEqual(customTagSet);
  });

  it('enforces zero overlap with @microsoft/tsdoc standard tags and retired tags', () => {
    for (const tag of customTagSet) {
      expect(standardTagSet.has(tag)).toBe(false);
      expect(retiredTagSet.has(tag)).toBe(false);
    }
    expect(RETIRED_CUSTOM_TAG_MIGRATIONS).toHaveLength(41);
  });

  it('ensures every tag retired by ttsc and tsdoc bridges is documented in RETIRED_CUSTOM_TAG_MIGRATIONS and absent from tsdoc.json', () => {
    for (const entry of CANONICAL_TTSC_RELATIONSHIP_BRIDGE) {
      for (const retired of entry.retiredTags) {
        expect(customTagSet.has(retired)).toBe(false);
        expect(lookupRetiredTagMigration(retired)).toBeDefined();
      }
    }
    for (const entry of CANONICAL_TSDOC_STANDARD_BRIDGE) {
      for (const retired of entry.retiredTags) {
        expect(customTagSet.has(retired)).toBe(false);
        expect(lookupRetiredTagMigration(retired)).toBeDefined();
      }
    }
  });

  it('ensures MODULE_SPEC_ASPECT_TAGS references only standard @microsoft/tsdoc tags or irreducible tsdoc-edge tags', () => {
    for (const tags of Object.values(MODULE_SPEC_ASPECT_TAGS)) {
      for (const tag of tags) {
        const isAllowed = standardTagSet.has(tag) || customTagSet.has(tag);
        expect(isAllowed).toBe(true);
        expect(retiredTagSet.has(tag)).toBe(false);
      }
    }
  });

  it('maps all 6 canonical @ttsc/graph edge kinds deterministically onto tsdoc-edge RelationshipType', () => {
    expect(mapTtscEdgeKindToRelationshipType('implements')).toBe('implementation');
    expect(mapTtscEdgeKindToRelationshipType('extends')).toBe('inheritance');
    expect(mapTtscEdgeKindToRelationshipType('calls')).toBe('calls');
    expect(mapTtscEdgeKindToRelationshipType('accesses')).toBe('code-dependency');
    expect(mapTtscEdgeKindToRelationshipType('instantiates')).toBe('code-dependency');
    expect(mapTtscEdgeKindToRelationshipType('type_ref')).toBe('type-dependency');
  });

  it('resolves retired tag migrations with or without leading @', () => {
    expect(lookupRetiredTagMigration('@private')?.owner).toBe('ttsc-graph-ast');
    expect(lookupRetiredTagMigration('template')?.replacement).toContain('@typeParam');
    expect(lookupRetiredTagMigration('@depends')?.owner).toBe('ttsc-graph-ast');
    expect(lookupRetiredTagMigration('@doc')).toBeUndefined();
  });
});
