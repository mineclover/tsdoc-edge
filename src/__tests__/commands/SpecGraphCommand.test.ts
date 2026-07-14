import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SpecGraphCommand } from '../../commands/SpecGraphCommand';
import { createSpecGraphRevision, type SpecGraphRevision } from '../../spec-graph';
import { SpecGraphRepository } from '../../storage/SpecGraphRepository';

describe('SpecGraphCommand', () => {
  const originalCwd = process.cwd();
  let workspace: string;
  let databasePath: string;
  let revision: SpecGraphRevision;
  let log: jest.SpyInstance;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-spec-graph-command-'));
    process.chdir(workspace);
    databasePath = path.join(workspace, '.tsdoc', 'spec-graph.db');
    revision = createFixtureRevision();
    const repository = new SpecGraphRepository(databasePath);
    repository.replaceActiveRevision(revision);
    repository.close();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('reports and reads the saved managed SpecGraph revision read-only', async () => {
    const modifiedBefore = fs.statSync(databasePath).mtimeMs;
    const status = await new SpecGraphCommand().execute(['status', '--json']);
    const statusOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      active: { revisionId: string; active: boolean };
      retainedRevisionCount: number;
    };
    expect(status).toEqual({ exitCode: 0, message: 'Spec graph status read' });
    expect(statusOutput.active).toMatchObject({ revisionId: revision.revisionId, active: true });
    expect(statusOutput.retainedRevisionCount).toBe(1);
    expect(fs.statSync(databasePath).mtimeMs).toBe(modifiedBefore);

    log.mockClear();
    const listed = await new SpecGraphCommand().execute(['list', '--json']);
    const listedOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      summaries: { revisionId: string; bindingCount: number }[];
    };
    expect(listed).toEqual({ exitCode: 0, message: 'Spec graph revisions listed: 1' });
    expect(listedOutput.summaries).toEqual([
      expect.objectContaining({ revisionId: revision.revisionId, bindingCount: 0 }),
    ]);

    log.mockClear();
    const read = await new SpecGraphCommand().execute([
      'read',
      '--revision-id',
      revision.revisionId,
      '--json',
    ]);
    const readOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      revision: { revisionId: string; nodes: unknown[] };
    };
    expect(read).toEqual({
      exitCode: 0,
      message: `Spec graph revision read: ${revision.revisionId}`,
    });
    expect(readOutput.revision.revisionId).toBe(revision.revisionId);
    expect(readOutput.revision.nodes).toHaveLength(1);
  });

  it('fails closed on an unknown operation or incomplete read pin', async () => {
    expect((await new SpecGraphCommand().execute(['inspect'])).exitCode).toBe(2);
    expect(await new SpecGraphCommand().execute(['read', '--json'])).toMatchObject({
      exitCode: 2,
      message: '--revision-id is required for read',
    });
  });
});

function createFixtureRevision(): SpecGraphRevision {
  const provenance = {
    source: 'managed-document' as const,
    extractorId: 'fixture/spec-extractor',
    extractorVersion: '1.0.0',
    authoredSourceFingerprint: 'fixture:spec-graph',
  };
  const source = {
    documentId: 'fixture-doc',
    file: 'managed/fixture.md',
    contentDigest: 'fixture:document',
  };
  return createSpecGraphRevision({
    workspaceId: 'fixture-workspace',
    nodes: [
      {
        id: 'SPEC-001',
        kind: 'spec',
        title: 'Fixture specification',
        lifecycle: { mode: 'independent', status: 'active' },
        source,
        tags: [],
      },
    ],
    edges: [],
    bindings: [],
    provenance,
  });
}
