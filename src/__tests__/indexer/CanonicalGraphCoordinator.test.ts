import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ProjectGraphInput, ProjectGraphSource } from '../../indexer';
import { CanonicalGraphCoordinator } from '../../indexer';

describe('CanonicalGraphCoordinator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-graph-coordinator-'))
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('persists ProjectIndexer output through the shared canonical repository', async () => {
    const source = sourceFor([graphInput('A')]);
    const coordinator = new CanonicalGraphCoordinator({ rootDir: tempDir }, { source });

    const result = await coordinator.refresh();
    expect(result.status).toBe('committed');
    const active = coordinator.readActiveRevision();
    expect(active?.metadata.contentFingerprint).toBe(
      result.status === 'committed' ? result.graph.fingerprint : undefined
    );
    expect(active?.graph.nodes.map((node) => node.name)).toEqual(['A']);
    coordinator.close();
  });

  it('does not let an older in-process refresh overwrite a newer request', async () => {
    const first = deferred<ProjectGraphInput>();
    const second = deferred<ProjectGraphInput>();
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    let call = 0;
    let inFlight = 0;
    let maxInFlight = 0;
    const source: ProjectGraphSource = {
      id: 'deferred',
      load: async () => {
        const current = ++call;
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        (current === 1 ? firstStarted : secondStarted).resolve(undefined);
        try {
          return await (current === 1 ? first.promise : second.promise);
        } finally {
          inFlight--;
        }
      },
    };
    const coordinator = new CanonicalGraphCoordinator({ rootDir: tempDir }, { source });

    const older = coordinator.refresh();
    await firstStarted.promise;
    const newer = coordinator.refresh();
    first.resolve(graphInput('Older'));
    const olderResult = await older;
    await secondStarted.promise;
    second.resolve(graphInput('Newer'));
    const newerResult = await newer;

    expect(newerResult.status).toBe('committed');
    expect(olderResult.status).toBe('superseded');
    expect(maxInFlight).toBe(1);
    expect(coordinator.readActiveRevision()?.graph.nodes.map((node) => node.name)).toEqual([
      'Newer',
    ]);
    coordinator.close();
  });

  it('coalesces queued refreshes before invoking the whole-project producer', async () => {
    const first = deferred<ProjectGraphInput>();
    const firstStarted = deferred<void>();
    let calls = 0;
    const source: ProjectGraphSource = {
      id: 'coalesced',
      load: async () => {
        calls++;
        if (calls === 1) {
          firstStarted.resolve(undefined);
          return first.promise;
        }
        return graphInput('Latest');
      },
    };
    const coordinator = new CanonicalGraphCoordinator({ rootDir: tempDir }, { source });

    const running = coordinator.refresh();
    await firstStarted.promise;
    const coalesced = coordinator.refresh();
    const latest = coordinator.refresh();
    first.resolve(graphInput('Running'));

    await expect(running).resolves.toMatchObject({ status: 'superseded' });
    await expect(coalesced).resolves.toEqual({
      status: 'superseded',
      requestedFingerprint: null,
    });
    await expect(latest).resolves.toMatchObject({ status: 'committed' });
    expect(calls).toBe(2);
    expect(coordinator.readActiveRevision()?.graph.nodes.map((node) => node.name)).toEqual([
      'Latest',
    ]);
    coordinator.close();
  });

  function graphInput(name: string): ProjectGraphInput {
    return {
      rootDir: tempDir,
      tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
      nodes: [
        {
          id: `src/${name.toLowerCase()}.ts#${name}:class`,
          kind: 'class',
          name,
          file: `src/${name.toLowerCase()}.ts`,
        },
      ],
      edges: [],
      provenance: {
        adapter: 'fixture',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
      },
    };
  }
});

function sourceFor(inputs: ProjectGraphInput[]): ProjectGraphSource {
  let index = 0;
  return {
    id: 'fixture',
    load: async () => inputs[Math.min(index++, inputs.length - 1)],
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
