import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CanonicalGraphCommand } from '../../commands/CanonicalGraphCommand';
import { GraphRepository } from '../../storage/GraphRepository';
import { fixtureGraph } from '../convention/fixtures';

describe('CanonicalGraphCommand', () => {
  const originalCwd = process.cwd();
  let workspace: string;
  let databasePath: string;
  let log: jest.SpyInstance;
  let firstRevisionId: string;
  let activeRevisionId: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-canonical-graph-command-'));
    process.chdir(workspace);
    databasePath = path.join(workspace, '.tsdoc', 'canonical-graph.db');
    const repository = new GraphRepository(databasePath, {
      clock: () => new Date('2026-07-14T00:00:00.000Z'),
    });
    try {
      firstRevisionId = repository.replaceActiveRevision(
        fixtureGraph({ rootDir: workspace })
      ).revisionId;
      activeRevisionId = repository.replaceActiveRevision(
        fixtureGraph({ rootDir: workspace, includeTarget: false })
      ).revisionId;
    } finally {
      repository.close();
    }
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('reports active and retained ttsc revisions without mutating the database', async () => {
    const modifiedBefore = fs.statSync(databasePath).mtimeMs;
    const result = await new CanonicalGraphCommand().execute([
      'status',
      '--graph-db',
      databasePath,
      '--json',
    ]);
    const output = JSON.parse(log.mock.calls.flat().join('\n')) as {
      active: { revisionId: string; active: boolean };
      retainedRevisionCount: number;
    };

    expect(result).toEqual({ exitCode: 0, message: 'Canonical graph status read' });
    expect(output.active).toMatchObject({ revisionId: activeRevisionId, active: true });
    expect(output.retainedRevisionCount).toBe(2);
    expect(fs.statSync(databasePath).mtimeMs).toBe(modifiedBefore);
  });

  it('lists and reads an exact retained revision', async () => {
    const listed = await new CanonicalGraphCommand().execute([
      'list',
      '--graph-db',
      databasePath,
      '--json',
    ]);
    const listedOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      summaries: { revisionId: string; active: boolean }[];
    };
    expect(listed).toEqual({ exitCode: 0, message: 'Canonical graph revisions listed: 2' });
    expect(listedOutput.summaries.map((summary) => summary.revisionId)).toEqual([
      activeRevisionId,
      firstRevisionId,
    ]);
    expect(listedOutput.summaries.map((summary) => summary.active)).toEqual([true, false]);

    log.mockClear();
    const read = await new CanonicalGraphCommand().execute([
      'read',
      '--graph-db',
      databasePath,
      '--revision-id',
      firstRevisionId,
      '--json',
    ]);
    const readOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      revision: { metadata: { revisionId: string }; graph: { nodes: unknown[] } };
    };
    expect(read).toEqual({
      exitCode: 0,
      message: `Canonical graph revision read: ${firstRevisionId}`,
    });
    expect(readOutput.revision.metadata.revisionId).toBe(firstRevisionId);
    expect(readOutput.revision.graph.nodes).toHaveLength(1);
  });

  it('fails closed on an unknown operation or incomplete read pin', async () => {
    expect(
      (await new CanonicalGraphCommand().execute(['inspect', '--graph-db', databasePath])).exitCode
    ).toBe(2);
    expect(
      await new CanonicalGraphCommand().execute(['read', '--graph-db', databasePath, '--json'])
    ).toMatchObject({ exitCode: 2, message: '--revision-id is required for read' });
  });
});
