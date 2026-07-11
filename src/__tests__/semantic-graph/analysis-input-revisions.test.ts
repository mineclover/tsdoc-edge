import {
  createCanonicalEmptyEnrichmentRevision,
  createCanonicalEmptyEvidenceRevision,
  createCanonicalEmptyRevision,
  createEnrichmentRevision,
  createEvidenceRevision,
  type EvidenceItem,
  type RawTestEvidenceItem,
} from '../../semantic-graph/analysis-input-revisions';
import type { RevisionInput } from '../../semantic-graph/contracts';

describe('analysis input revisions', () => {
  it('creates deterministic evidence revisions from typed test and API observations', () => {
    const items = evidenceItems();
    const testItem = items[0] as RawTestEvidenceItem;
    const left = createEvidenceRevision({
      workspaceId: 'workspace',
      items,
      provenance: revisionProvenance('evidence-source'),
    });
    const right = createEvidenceRevision({
      workspaceId: 'workspace',
      items: [items[1], { ...testItem, subjectFiles: ['src/b.ts', 'src/a.ts'] }],
      provenance: revisionProvenance('evidence-source'),
    });
    const changed = createEvidenceRevision({
      workspaceId: 'workspace',
      items: [{ ...testItem, status: 'failed' }, items[1]],
      provenance: revisionProvenance('evidence-source'),
    });

    expect(left).toEqual(right);
    expect(left.revisionId).toBe(`evidence-revision:${left.contentFingerprint}`);
    expect(changed.revisionId).not.toBe(left.revisionId);
    expect(left.items.map((item) => item.id)).toEqual(['api:main', 'test:build']);
    expect((left.items[1] as { subjectFiles: readonly string[] }).subjectFiles).toEqual([
      'src/a.ts',
      'src/b.ts',
    ]);

    const compatibleRevisionInput: RevisionInput = left;
    expect(compatibleRevisionInput.contentFingerprint).toBe(left.contentFingerprint);
  });

  it('creates normalized TSDoc enrichment and deeply freezes every JSON layer', () => {
    const revision = createEnrichmentRevision({
      workspaceId: 'workspace',
      items: [
        {
          kind: 'tsdoc',
          id: 'tsdoc:build',
          symbolId: 'src/build.ts#build:function',
          source: {
            file: 'src/build.ts',
            startLine: 3,
            contentDigest: 'source:build',
          },
          summary: 'Build the canonical graph.',
          tags: [{ name: 'returns' }, { name: 'public' }],
          provenance: itemProvenance('tsdoc-parser'),
        },
      ],
      provenance: revisionProvenance('tsdoc-source'),
    });

    expect(revision.revisionId).toBe(`enrichment-revision:${revision.contentFingerprint}`);
    expect(revision.items[0].tags).toEqual([{ name: 'public' }, { name: 'returns' }]);
    expect(Object.isFrozen(revision)).toBe(true);
    expect(Object.isFrozen(revision.items)).toBe(true);
    expect(Object.isFrozen(revision.items[0])).toBe(true);
    expect(Object.isFrozen(revision.items[0].provenance)).toBe(true);
    expect(Object.isFrozen(revision.items[0].tags)).toBe(true);
  });

  it('provides stable plane-specific canonical empty revisions', () => {
    const evidence = createCanonicalEmptyEvidenceRevision('workspace');
    const enrichment = createCanonicalEmptyEnrichmentRevision('workspace');

    expect(createCanonicalEmptyRevision('evidence', 'workspace')).toEqual(evidence);
    expect(createCanonicalEmptyRevision('enrichment', 'workspace')).toEqual(enrichment);
    expect(createCanonicalEmptyEvidenceRevision('workspace')).toEqual(evidence);
    expect(evidence.items).toEqual([]);
    expect(enrichment.items).toEqual([]);
    expect(evidence.revisionId).not.toBe(enrichment.revisionId);
    expect(createCanonicalEmptyEvidenceRevision('another').revisionId).not.toBe(
      evidence.revisionId
    );
  });

  it('rejects duplicate identities and non-JSON numeric evidence', () => {
    const item = evidenceItems()[0] as RawTestEvidenceItem;
    expect(() =>
      createEvidenceRevision({
        workspaceId: 'workspace',
        items: [item, item],
        provenance: revisionProvenance('duplicate'),
      })
    ).toThrow('Duplicate evidence item identity');

    expect(() =>
      createEvidenceRevision({
        workspaceId: 'workspace',
        items: [{ ...item, durationMs: Number.NaN }],
        provenance: revisionProvenance('nan'),
      })
    ).toThrow('durationMs must be a non-negative finite number');

    expect(() =>
      createEvidenceRevision({
        workspaceId: 'workspace',
        items: [
          {
            ...item,
            source: { ...item.source, startLine: 0 },
          },
        ],
        provenance: revisionProvenance('zero-line'),
      })
    ).toThrow('startLine must be a positive integer');
  });
});

function evidenceItems(): readonly EvidenceItem[] {
  return [
    {
      kind: 'test-evidence',
      id: 'test:build',
      runner: 'jest',
      testName: 'builds a canonical graph',
      status: 'passed',
      source: {
        file: 'src/__tests__/build.test.ts',
        startLine: 10,
        contentDigest: 'test-source',
      },
      subjectFiles: ['src/b.ts', 'src/a.ts'],
      durationMs: 12,
      provenance: itemProvenance('test-runner'),
    },
    {
      kind: 'api-surface',
      id: 'api:main',
      packageName: 'fixture',
      exportName: 'build',
      surfaceKind: 'function',
      signatureDigest: 'signature:build',
      source: { file: 'src/build.ts', contentDigest: 'api-source' },
      provenance: itemProvenance('api-extractor'),
    },
  ];
}

function itemProvenance(
  source: 'test-runner' | 'api-extractor' | 'tsdoc-parser' | 'workspace-scan'
) {
  return {
    source,
    producerId: `fixture/${source}`,
    producerVersion: '1.0.0',
    sourceFingerprint: `${source}:input`,
  } as const;
}

function revisionProvenance(sourceFingerprint: string) {
  return {
    source: 'collected',
    producerId: 'fixture/collector',
    producerVersion: '1.0.0',
    sourceFingerprint,
  } as const;
}
