import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConventionRetentionCommand } from '../../commands/ConventionRetentionCommand';
import {
  ConventionCheckService,
  compileConventionPackSource,
  evaluateConventionGate,
} from '../../convention';
import {
  createCanonicalEmptyEnrichmentRevision,
  createCanonicalEmptyEvidenceRevision,
} from '../../semantic-graph/analysis-input-revisions';
import { ConventionCheckHistoryRepository } from '../../storage/ConventionCheckHistoryRepository';
import { GraphRepository } from '../../storage/GraphRepository';
import { fixtureGraph, fixturePackSource } from '../convention/fixtures';

describe('ConventionRetentionCommand', () => {
  const originalCwd = process.cwd();
  let workspace: string;
  let databasePath: string;
  let historyId: string;
  let log: jest.SpyInstance;

  beforeEach(() => {
    workspace = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-convention-retention-command-'))
    );
    process.chdir(workspace);
    databasePath = path.join(workspace, 'history.db');
    historyId = createHistory(databasePath);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('pins, previews, unpins, and collects exact history records', async () => {
    const listed = await new ConventionRetentionCommand().execute([
      'list',
      '--history-db',
      databasePath,
      '--before',
      '2026-02-01T00:00:00Z',
      '--json',
    ]);
    expect(listed).toEqual({ exitCode: 0, message: 'Convention history listed: 1' });

    log.mockClear();
    const pinned = await new ConventionRetentionCommand().execute([
      'pin',
      '--history-db',
      databasePath,
      '--history-id',
      historyId,
      '--reason',
      'release proof',
      '--json',
    ]);
    expect(pinned).toEqual({ exitCode: 0, message: `Convention history pinned: ${historyId}` });

    log.mockClear();
    const preview = await new ConventionRetentionCommand().execute([
      'gc',
      '--history-db',
      databasePath,
      '--before',
      '2026-02-01T00:00:00Z',
      '--dry-run',
      '--json',
    ]);
    const previewOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      dryRun: boolean;
      summaries: Array<{ historyId: string; pinned: boolean }>;
    };
    expect(preview).toEqual({ exitCode: 0, message: 'Convention history GC preview: 1' });
    expect(previewOutput.dryRun).toBe(true);
    expect(previewOutput.summaries).toEqual([expect.objectContaining({ historyId, pinned: true })]);

    log.mockClear();
    const unpinned = await new ConventionRetentionCommand().execute([
      'unpin',
      '--history-db',
      databasePath,
      '--history-id',
      historyId,
      '--json',
    ]);
    expect(unpinned).toEqual({ exitCode: 0, message: `Convention history unpinned: ${historyId}` });

    log.mockClear();
    const collected = await new ConventionRetentionCommand().execute([
      'gc',
      '--history-db',
      databasePath,
      '--before',
      '2026-02-01T00:00:00Z',
      '--reason',
      'release retention window',
      '--json',
    ]);
    const collectedOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      tombstoned: Array<{ historyId: string; reason: string }>;
    };
    expect(collected).toEqual({ exitCode: 0, message: 'Convention history GC complete: 1' });
    expect(collectedOutput.tombstoned).toEqual([
      expect.objectContaining({ historyId, reason: 'release retention window' }),
    ]);
  });

  it('requires an explicit cutoff for list and GC', async () => {
    const result = await new ConventionRetentionCommand().execute([
      'list',
      '--history-db',
      databasePath,
      '--json',
    ]);

    expect(result).toMatchObject({
      exitCode: 2,
      message: '--before is required for list',
    });
  });
});

function createHistory(databasePath: string): string {
  const graph = new GraphRepository(':memory:');
  const history = new ConventionCheckHistoryRepository(databasePath, {
    clock: () => new Date('2026-01-01T00:00:00.000Z'),
  });
  try {
    const pack = compileConventionPackSource(fixturePackSource(), {
      file: 'managed/conventions/core.json',
      contentDigest: `sha256:${'0'.repeat(64)}`,
    });
    graph.replaceActiveRevision(fixtureGraph());
    const check = new ConventionCheckService().run({
      pack,
      codeRevision: graph.readActiveRevision()!,
      workspaceRoot: '/fixture',
    });
    const stored = history.append({
      check,
      inputs: {
        evidence: createCanonicalEmptyEvidenceRevision('fixture-workspace'),
        enrichment: createCanonicalEmptyEnrichmentRevision('fixture-workspace'),
        policy: pack.policy,
        ruleSet: pack.ruleSet,
      },
      pack,
      evaluationConfig: check.retainedEvaluationConfig,
      gate: evaluateConventionGate(check, 'error'),
    });
    return stored.historyId;
  } finally {
    history.close();
    graph.close();
  }
}
