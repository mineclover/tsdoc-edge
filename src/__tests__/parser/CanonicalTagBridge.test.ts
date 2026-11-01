/**
 * Tests for CanonicalTagBridge and strict zero-overlap tag boundaries
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { StandardTags } from '@microsoft/tsdoc';
import { graphEdgeSemantic, PROJECTABLE_GRAPH_EDGE_KINDS } from '../../graph-analysis';
import {
  type CanonicalProjectGraph,
  PROJECT_GRAPH_CONTRACT_VERSION,
} from '../../indexer/contracts';
import { generateTsdocJson, TSDOC_EDGE_CUSTOM_TAGS } from '../../parser/TSDocParser';
import { MODULE_SPEC_ASPECT_TAGS } from '../../spec/SpecMetricsAggregator';
import {
  CANONICAL_TSDOC_STANDARD_BRIDGE,
  CANONICAL_TTSC_RELATIONSHIP_BRIDGE,
  CUSTOM_TAGS,
  lookupRetiredTagMigration,
  mapTtscEdgeKindToRelationshipType,
  projectCanonicalTtscRelationships,
  RETIRED_CUSTOM_TAG_MIGRATIONS,
  type TtscCanonicalEdgeKind,
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

  it('maps all 6 canonical @ttsc/graph edge kinds deterministically via graphEdgeSemantic and projects UnifiedRelationships', () => {
    for (const kind of PROJECTABLE_GRAPH_EDGE_KINDS) {
      const typedKind = kind as TtscCanonicalEdgeKind;
      expect(mapTtscEdgeKindToRelationshipType(typedKind)).toBe(
        graphEdgeSemantic(kind).relationshipType
      );
    }

    const graph: CanonicalProjectGraph = {
      contractVersion: PROJECT_GRAPH_CONTRACT_VERSION,
      rootDir: '/workspace',
      tsconfigPath: '/workspace/tsconfig.json',
      fingerprint: 'fp-canonical-test',
      provenance: {
        adapter: 'ttsc-graph-router',
        producer: '@ttsc/graph',
        workspaceId: 'tsdoc-edge',
      },
      nodes: [
        {
          id: 'src/A.ts#ServiceA:class',
          sourceId: 'src/A.ts#ServiceA:class',
          kind: 'class',
          name: 'ServiceA',
          file: 'src/A.ts',
        },
        {
          id: 'src/B.ts#IService:interface',
          sourceId: 'src/B.ts#IService:interface',
          kind: 'interface',
          name: 'IService',
          file: 'src/B.ts',
        },
      ],
      edges: [
        {
          kind: 'implements',
          from: 'src/A.ts#ServiceA:class',
          to: 'src/B.ts#IService:interface',
          evidence: { file: 'src/A.ts', startLine: 10 },
        },
      ],
    };

    const projected = projectCanonicalTtscRelationships(graph);
    expect(projected).toHaveLength(1);
    expect(projected[0]?.type).toBe('implementation');
    expect(projected[0]?.category).toBe('structural');
    expect(projected[0]?.properties?.rawEdgeKind).toBe('implements');
  });

  it('resolves retired tag migrations with or without leading @', () => {
    expect(lookupRetiredTagMigration('@private')?.owner).toBe('ttsc-graph-ast');
    expect(lookupRetiredTagMigration('template')?.replacement).toContain('@typeParam');
    expect(lookupRetiredTagMigration('@depends')?.owner).toBe('ttsc-graph-ast');
    expect(lookupRetiredTagMigration('@doc')).toBeUndefined();
  });
});
