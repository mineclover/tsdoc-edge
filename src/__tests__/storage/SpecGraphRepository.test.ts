import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  createSpecEdge,
  createSpecGraphRevision,
  type SpecGraphProvenance,
  type SpecGraphRevision,
  type SpecNode,
} from '../../spec-graph';
import {
  SPEC_GRAPH_REPOSITORY_SCHEMA_VERSION,
  SpecGraphRepository,
  SpecGraphRepositoryConflictError,
} from '../../storage/SpecGraphRepository';

describe('SpecGraphRepository', () => {
  let tempDir: string;
  let databasePath: string;
  let repository: SpecGraphRepository;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-spec-graph-repository-'))
    );
    databasePath = path.join(tempDir, 'spec-graph.db');
    repository = new SpecGraphRepository(databasePath, {
      clock: () => new Date('2026-07-11T00:00:00.000Z'),
    });
  });

  afterEach(() => {
    repository.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('starts empty with an isolated schema-v1 storage plane', () => {
    expect(repository.readActiveRevision()).toBeNull();
    expect(repository.readRevision('spec-revision:missing')).toBeNull();

    const database = new Database(databasePath, { readonly: true });
    const rows = database
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND (name LIKE 'spec_graph_%' OR name LIKE 'canonical_graph_%')
         ORDER BY name`
      )
      .all() as Array<{ name: string }>;
    database.close();

    expect(rows.map((row) => row.name)).toEqual(['spec_graph_revisions', 'spec_graph_state']);
  });

  it('retains historical compiled projections after active replacement', () => {
    const firstRevision = fixtureRevision('first');
    const secondRevision = fixtureRevision('second');
    repository.replaceActiveRevision(firstRevision, { expectedActiveRevisionId: null });
    repository.replaceActiveRevision(secondRevision, {
      expectedActiveRevisionId: firstRevision.revisionId,
    });

    expect(repository.readActiveRevision()).toEqual(secondRevision);
    expect(repository.readRevision(firstRevision.revisionId)).toEqual(firstRevision);
    expect(repository.readRevision(secondRevision.revisionId)).toEqual(secondRevision);
    expect(Object.isFrozen(repository.readRevision(firstRevision.revisionId)?.nodes[0])).toBe(true);

    const database = new Database(databasePath, { readonly: true });
    const rows = database
      .prepare(
        `SELECT revision_id, repository_schema_version
         FROM spec_graph_revisions ORDER BY revision_id`
      )
      .all() as Array<{ revision_id: string; repository_schema_version: number }>;
    database.close();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.repository_schema_version === 1)).toBe(true);
    expect(SPEC_GRAPH_REPOSITORY_SCHEMA_VERSION).toBe(1);
  });

  it('lists retained revision metadata with an explicit active marker', () => {
    const firstRevision = fixtureRevision('first');
    const secondRevision = fixtureRevision('second');
    repository.replaceActiveRevision(firstRevision);
    repository.replaceActiveRevision(secondRevision);

    const summaries = repository.listRevisionSummaries();

    expect(summaries.map((summary) => summary.revisionId)).toEqual([
      secondRevision.revisionId,
      firstRevision.revisionId,
    ]);
    expect(summaries.map((summary) => summary.active)).toEqual([true, false]);
    expect(summaries[0]).toMatchObject({
      workspaceId: 'fixture-workspace',
      nodeCount: 2,
      edgeCount: 1,
      bindingCount: 0,
      repositorySchemaVersion: 1,
    });
    expect(Object.isFrozen(summaries)).toBe(true);
    expect(Object.isFrozen(summaries[0])).toBe(true);
  });

  it('reactivates an existing deterministic revision without rewriting it', () => {
    const firstRevision = fixtureRevision('first');
    const secondRevision = fixtureRevision('second');
    repository.replaceActiveRevision(firstRevision);
    repository.replaceActiveRevision(secondRevision);

    repository.close();
    repository = new SpecGraphRepository(databasePath, {
      clock: () => new Date('2026-07-11T02:00:00.000Z'),
    });
    repository.replaceActiveRevision(firstRevision, {
      expectedActiveRevisionId: secondRevision.revisionId,
    });
    repository.replaceActiveRevision(firstRevision, {
      expectedActiveRevisionId: firstRevision.revisionId,
    });

    expect(repository.readActiveRevision()).toEqual(firstRevision);
    expect(repository.readRevision(secondRevision.revisionId)).toEqual(secondRevision);

    const database = new Database(databasePath, { readonly: true });
    const rows = database
      .prepare('SELECT revision_id, stored_at FROM spec_graph_revisions ORDER BY revision_id')
      .all() as Array<{ revision_id: string; stored_at: string }>;
    database.close();
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.revision_id === firstRevision.revisionId)?.stored_at).toBe(
      '2026-07-11T00:00:00.000Z'
    );
  });

  it('rejects a stale compare-and-swap without changing the active revision', () => {
    const firstRevision = fixtureRevision('first');
    const secondRevision = fixtureRevision('second');
    const staleRevision = fixtureRevision('stale');
    repository.replaceActiveRevision(firstRevision);

    const concurrent = new SpecGraphRepository(databasePath);
    concurrent.replaceActiveRevision(secondRevision, {
      expectedActiveRevisionId: firstRevision.revisionId,
    });
    concurrent.close();

    expect(() =>
      repository.replaceActiveRevision(staleRevision, {
        expectedActiveRevisionId: firstRevision.revisionId,
      })
    ).toThrow(SpecGraphRepositoryConflictError);
    expect(repository.readActiveRevision()).toEqual(secondRevision);
    expect(repository.readRevision(staleRevision.revisionId)).toBeNull();
  });

  it('rejects forged revision identity before writing', () => {
    const revision = fixtureRevision('valid');
    const forged = {
      ...revision,
      contentFingerprint: 'forged-content-fingerprint',
    } as SpecGraphRevision;

    expect(() => repository.replaceActiveRevision(forged)).toThrow(
      'Specification graph revision identity mismatch'
    );
    expect(repository.readActiveRevision()).toBeNull();
  });

  it('validates stored revision identity on every read', () => {
    const revision = fixtureRevision('valid');
    repository.replaceActiveRevision(revision);
    repository.close();

    const database = new Database(databasePath);
    database
      .prepare('UPDATE spec_graph_revisions SET payload_json = ? WHERE revision_id = ?')
      .run(
        JSON.stringify({ ...revision, revisionId: 'spec-revision:forged' }),
        revision.revisionId
      );
    database.close();

    repository = new SpecGraphRepository(databasePath, { readOnly: true });
    expect(() => repository.readRevision(revision.revisionId)).toThrow(
      'Specification graph revision identity mismatch'
    );
    expect(() => repository.readActiveRevision()).toThrow(
      'Specification graph revision identity mismatch'
    );
  });

  it('reads retained revisions without allowing writes in read-only mode', () => {
    const revision = fixtureRevision('read-only');
    repository.replaceActiveRevision(revision);
    repository.close();

    repository = new SpecGraphRepository(databasePath, { readOnly: true });
    expect(repository.readActiveRevision()).toEqual(revision);
    expect(repository.readRevision(revision.revisionId)).toEqual(revision);
    expect(() => repository.replaceActiveRevision(revision)).toThrow('read-only repository');

    const missingPath = path.join(tempDir, 'missing', 'spec-graph.db');
    expect(() => new SpecGraphRepository(missingPath, { readOnly: true })).toThrow();
    expect(fs.existsSync(path.dirname(missingPath))).toBe(false);
  });
});

function fixtureRevision(label: string): SpecGraphRevision {
  const provenance: SpecGraphProvenance = {
    source: 'managed-document',
    extractorId: 'tsdoc-edge/spec-extractor',
    extractorVersion: '1.0.0',
    authoredSourceFingerprint: `managed:${label}`,
  };
  const nodes: SpecNode[] = [
    {
      id: 'SPEC-001',
      kind: 'spec',
      title: `Fixture ${label}`,
      lifecycle: { mode: 'independent', status: 'active', version: '1.0.0' },
      source: sourceAnchor('SPEC-001', label),
      tags: [],
    },
    {
      id: 'REQ-001',
      kind: 'requirement',
      title: `Requirement ${label}`,
      lifecycle: { mode: 'inherited', aggregateSpecId: 'SPEC-001' },
      source: sourceAnchor('REQ-001', label),
      tags: [],
    },
  ];
  const edge = createSpecEdge({
    kind: 'contains',
    from: 'SPEC-001',
    to: 'REQ-001',
    provenance,
  });
  return createSpecGraphRevision({
    workspaceId: 'fixture-workspace',
    nodes,
    edges: [edge],
    bindings: [],
    provenance,
  });
}

function sourceAnchor(symbol: string, label: string) {
  return {
    documentId: 'fixture-spec',
    file: 'managed/fixture.md',
    symbol,
    contentDigest: `digest:${label}:${symbol}`,
  };
}
