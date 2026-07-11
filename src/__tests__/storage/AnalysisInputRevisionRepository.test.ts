import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  createCanonicalEmptyEnrichmentRevision,
  createCanonicalEmptyEvidenceRevision,
  createEvidenceRevision,
  type EvidenceRevision,
} from '../../semantic-graph/analysis-input-revisions';
import { createPolicyRevision } from '../../spec-graph/identity';
import {
  ANALYSIS_INPUT_REVISION_REPOSITORY_SCHEMA_VERSION,
  AnalysisInputRevisionRepository,
} from '../../storage/AnalysisInputRevisionRepository';

describe('AnalysisInputRevisionRepository', () => {
  let tempDir: string;
  let databasePath: string;
  let repository: AnalysisInputRevisionRepository;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-analysis-input-revisions-'))
    );
    databasePath = path.join(tempDir, 'analysis-inputs.db');
    repository = new AnalysisInputRevisionRepository(databasePath, {
      clock: () => new Date('2026-07-11T00:00:00.000Z'),
    });
  });

  afterEach(() => {
    repository.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('stores isolated evidence, enrichment, and policy pins without an active pointer', () => {
    const evidence = createCanonicalEmptyEvidenceRevision('workspace');
    const enrichment = createCanonicalEmptyEnrichmentRevision('workspace');
    const policy = policyRevision();

    repository.storeRevision(pin('evidence', 'workspace', evidence.revisionId), evidence);
    repository.storeRevision(pin('enrichment', 'workspace', enrichment.revisionId), enrichment);
    repository.storeRevision(pin('policy', 'workspace', policy.revisionId), policy);

    expect(repository.readRevision(pin('evidence', 'workspace', evidence.revisionId))).toEqual(
      evidence
    );
    expect(repository.readRevision(pin('enrichment', 'workspace', enrichment.revisionId))).toEqual(
      enrichment
    );
    expect(repository.readRevision(pin('policy', 'workspace', policy.revisionId))).toEqual(policy);
    expect(repository.readRevision(pin('enrichment', 'workspace', evidence.revisionId))).toBeNull();

    const database = new Database(databasePath, { readonly: true });
    const tables = database
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name LIKE 'analysis_input_%' ORDER BY name`
      )
      .all() as Array<{ name: string }>;
    const rows = database
      .prepare(
        `SELECT plane, workspace_id, revision_id, repository_schema_version
         FROM analysis_input_revisions ORDER BY plane`
      )
      .all() as Array<{ repository_schema_version: number }>;
    database.close();

    expect(tables.map((row) => row.name)).toEqual(['analysis_input_revisions']);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.repository_schema_version === 1)).toBe(true);
    expect(ANALYSIS_INPUT_REVISION_REPOSITORY_SCHEMA_VERSION).toBe(1);
  });

  it('retains immutable history and scopes an identical policy revision by workspace', () => {
    const first = createCanonicalEmptyEvidenceRevision('workspace');
    const second = evidenceRevision('workspace', 'passed');
    const policy = policyRevision();

    repository.storeRevision(pin('evidence', 'workspace', first.revisionId), first);
    repository.storeRevision(pin('evidence', 'workspace', second.revisionId), second);
    repository.storeRevision(pin('policy', 'workspace-a', policy.revisionId), policy);
    repository.storeRevision(pin('policy', 'workspace-b', policy.revisionId), policy);
    repository.storeRevision(pin('policy', 'workspace-b', policy.revisionId), policy);

    expect(repository.readRevision(pin('evidence', 'workspace', first.revisionId))).toEqual(first);
    expect(repository.readRevision(pin('evidence', 'workspace', second.revisionId))).toEqual(
      second
    );
    expect(repository.readRevision(pin('policy', 'workspace-a', policy.revisionId))).toEqual(
      policy
    );
    expect(repository.readRevision(pin('policy', 'workspace-b', policy.revisionId))).toEqual(
      policy
    );

    const database = new Database(databasePath, { readonly: true });
    const policyRows = database
      .prepare(
        `SELECT workspace_id, stored_at FROM analysis_input_revisions
         WHERE plane = 'policy' ORDER BY workspace_id`
      )
      .all() as Array<{ workspace_id: string; stored_at: string }>;
    database.close();
    expect(policyRows).toEqual([
      { workspace_id: 'workspace-a', stored_at: '2026-07-11T00:00:00.000Z' },
      { workspace_id: 'workspace-b', stored_at: '2026-07-11T00:00:00.000Z' },
    ]);
  });

  it('rejects forged pins and revalidates payload identity on every read', () => {
    const evidence = evidenceRevision('workspace', 'passed');
    const forged = { ...evidence, contentFingerprint: 'forged' } as EvidenceRevision;

    expect(() =>
      repository.storeRevision(pin('evidence', 'workspace', forged.revisionId), forged)
    ).toThrow('payload is not canonical');
    expect(() =>
      repository.storeRevision(pin('evidence', 'another', evidence.revisionId), evidence)
    ).toThrow('workspace does not match pin');

    repository.storeRevision(pin('evidence', 'workspace', evidence.revisionId), evidence);
    repository.close();

    const database = new Database(databasePath);
    database
      .prepare(
        `UPDATE analysis_input_revisions SET payload_json = ?
         WHERE plane = 'evidence' AND workspace_id = ? AND revision_id = ?`
      )
      .run(
        JSON.stringify({ ...evidence, revisionId: 'evidence-revision:forged' }),
        'workspace',
        evidence.revisionId
      );
    database.close();

    repository = new AnalysisInputRevisionRepository(databasePath, { readOnly: true });
    expect(() =>
      repository.readRevision(pin('evidence', 'workspace', evidence.revisionId))
    ).toThrow('identity mismatch');
  });

  it('supports pinned reads but no writes in read-only mode', () => {
    const enrichment = createCanonicalEmptyEnrichmentRevision('workspace');
    repository.storeRevision(pin('enrichment', 'workspace', enrichment.revisionId), enrichment);
    repository.close();

    repository = new AnalysisInputRevisionRepository(databasePath, { readOnly: true });
    expect(repository.readRevision(pin('enrichment', 'workspace', enrichment.revisionId))).toEqual(
      enrichment
    );
    expect(() =>
      repository.storeRevision(pin('enrichment', 'workspace', enrichment.revisionId), enrichment)
    ).toThrow('read-only repository');

    const missingPath = path.join(tempDir, 'missing', 'analysis-inputs.db');
    expect(() => new AnalysisInputRevisionRepository(missingPath, { readOnly: true })).toThrow();
    expect(fs.existsSync(path.dirname(missingPath))).toBe(false);
  });
});

function evidenceRevision(workspaceId: string, status: 'passed' | 'failed'): EvidenceRevision {
  return createEvidenceRevision({
    workspaceId,
    items: [
      {
        kind: 'test-evidence',
        id: 'test:fixture',
        runner: 'jest',
        testName: 'fixture',
        status,
        source: { file: 'src/fixture.test.ts', contentDigest: 'fixture-source' },
        subjectFiles: ['src/fixture.ts'],
        provenance: {
          source: 'test-runner',
          producerId: 'fixture/jest',
          producerVersion: '1.0.0',
        },
      },
    ],
    provenance: {
      source: 'collected',
      producerId: 'fixture/evidence',
      producerVersion: '1.0.0',
      sourceFingerprint: `fixture:${status}`,
    },
  });
}

function policyRevision() {
  return createPolicyRevision({
    relationSemanticRegistryVersion: '1.0.0',
    lifecycleGateVersion: '1.0.0',
    rules: [{ id: 'require-verification', version: '1.0.0', enabled: true }],
    provenance: {
      source: 'workspace-config',
      compilerId: 'fixture/policy-compiler',
      compilerVersion: '1.0.0',
      sourceFingerprint: 'fixture-policy',
    },
  });
}

function pin<Plane extends 'evidence' | 'enrichment' | 'policy'>(
  plane: Plane,
  workspaceId: string,
  revisionId: string
) {
  return { plane, workspaceId, revisionId } as const;
}
