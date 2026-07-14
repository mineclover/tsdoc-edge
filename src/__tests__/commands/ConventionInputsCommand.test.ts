import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConventionInputsCommand } from '../../commands/ConventionInputsCommand';
import {
  createCanonicalEmptyEnrichmentRevision,
  createCanonicalEmptyEvidenceRevision,
} from '../../semantic-graph/analysis-input-revisions';
import { createPolicyRevision } from '../../spec-graph/identity';
import { AnalysisInputRevisionRepository } from '../../storage/AnalysisInputRevisionRepository';

describe('ConventionInputsCommand', () => {
  const originalCwd = process.cwd();
  let workspace: string;
  let databasePath: string;
  let evidenceRevisionId: string;
  let log: jest.SpyInstance;

  beforeEach(() => {
    workspace = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-convention-inputs-command-'))
    );
    process.chdir(workspace);
    databasePath = path.join(workspace, 'analysis-inputs.db');
    const repository = new AnalysisInputRevisionRepository(databasePath, {
      clock: () => new Date('2026-07-14T00:00:00.000Z'),
    });
    const evidence = createCanonicalEmptyEvidenceRevision('workspace');
    const enrichment = createCanonicalEmptyEnrichmentRevision('workspace');
    const policy = policyRevision();
    evidenceRevisionId = evidence.revisionId;
    repository.storeRevision(
      { plane: 'evidence', workspaceId: 'workspace', revisionId: evidence.revisionId },
      evidence
    );
    repository.storeRevision(
      { plane: 'enrichment', workspaceId: 'workspace', revisionId: enrichment.revisionId },
      enrichment
    );
    repository.storeRevision(
      { plane: 'policy', workspaceId: 'workspace', revisionId: policy.revisionId },
      policy
    );
    repository.close();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('lists and reads exact revision pins without mutating the database', async () => {
    const modifiedBefore = fs.statSync(databasePath).mtimeMs;
    const listed = await new ConventionInputsCommand().execute([
      'list',
      '--input-revisions-db',
      databasePath,
      '--workspace',
      'workspace',
      '--json',
    ]);
    const listedOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      summaries: Array<{ plane: string; workspaceId: string }>;
    };
    expect(listed).toEqual({ exitCode: 0, message: 'Analysis input revisions listed: 3' });
    expect(listedOutput.summaries).toHaveLength(3);
    expect(listedOutput.summaries.map((summary) => summary.plane)).toEqual([
      'evidence',
      'enrichment',
      'policy',
    ]);
    expect(fs.statSync(databasePath).mtimeMs).toBe(modifiedBefore);

    log.mockClear();
    const read = await new ConventionInputsCommand().execute([
      'read',
      '--input-revisions-db',
      databasePath,
      '--workspace',
      'workspace',
      '--plane',
      'evidence',
      '--revision-id',
      evidenceRevisionId,
      '--json',
    ]);
    const readOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      pin: { plane: string; workspaceId: string; revisionId: string };
    };
    expect(read).toEqual({
      exitCode: 0,
      message: `Analysis input revision read: evidence/workspace/${evidenceRevisionId}`,
    });
    expect(readOutput.pin).toEqual({
      plane: 'evidence',
      workspaceId: 'workspace',
      revisionId: evidenceRevisionId,
    });
    expect(fs.statSync(databasePath).mtimeMs).toBe(modifiedBefore);
  });

  it('fails closed when an exact read pin is incomplete', async () => {
    const result = await new ConventionInputsCommand().execute([
      'read',
      '--input-revisions-db',
      databasePath,
      '--workspace',
      'workspace',
      '--json',
    ]);

    expect(result).toMatchObject({
      exitCode: 2,
      message: '--plane is required for read',
    });
  });
});

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
