import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { type ProjectGraphInput, type ProjectGraphSource, ProjectIndexer } from '../../indexer';
import { TsdocEdgeService } from '../../lsp/service';
import { GraphRepository } from '../../storage/GraphRepository';

describe('LSP canonical graph refresh boundary', () => {
  let tempDir: string;
  let service: TsdocEdgeService | null;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-lsp-canonical-'))
    );
    fs.mkdirSync(path.join(tempDir, 'src'));
    fs.writeFileSync(path.join(tempDir, 'src/a.ts'), 'export class A {}\n');
    service = null;
  });

  afterEach(() => {
    service?.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('keeps unsaved TS5 extraction in memory and replaces it after canonical save', async () => {
    const source: ProjectGraphSource = {
      id: 'fixture',
      load: async () => graphInput(),
    };
    service = new TsdocEdgeService(tempDir, {
      canonicalGraph: { rootDir: tempDir },
      canonicalGraphDependencies: { source },
    });
    expect(service.enableIncrementalMode()).toBe(true);
    expect(service.isCanonicalGraphEnabled()).toBe(true);

    const filePath = path.join(tempDir, 'src/a.ts');
    const overlay = service.processFileChange(
      filePath,
      'export class DirtyBuffer {\n  method(): void {}\n}\n'
    );
    expect(overlay?.symbols.some((symbol) => symbol.name === 'DirtyBuffer')).toBe(true);
    expect(service.getUnsavedOverlay(filePath)).not.toBeNull();
    expect(service.getHoverInfo(filePath, 1, 0)).toContain('DirtyBuffer');
    expect(service.getSymbolAtPosition(filePath, 2, 2)?.name).toBe('method');
    expect(service.searchSymbols('Dirty')).toEqual([
      expect.objectContaining({ name: 'DirtyBuffer', filePath }),
    ]);
    expect(service.searchSymbols('A')).toEqual([]);
    expect(service.getCodeLenses(filePath)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ line: 1, title: '↓0 ↑0' }),
        expect.objectContaining({ line: 2, title: '↓0 ↑0' }),
      ])
    );
    expect(service.processFileChange(filePath)).toBeNull();

    const refreshed = await service.refreshCanonicalGraph(filePath);
    expect(refreshed?.status).toBe('committed');
    expect(service.getUnsavedOverlay(filePath)).toBeNull();
    expect(service.searchSymbols('A')).toEqual([
      expect.objectContaining({ name: 'A', filePath, line: 1 }),
    ]);

    service.close();
    service = null;
    const repository = new GraphRepository(path.join(tempDir, '.tsdoc/canonical-graph.db'));
    expect(repository.readActiveRevision()?.graph.fingerprint).toBe(
      refreshed?.status === 'committed' ? refreshed.graph.fingerprint : undefined
    );
    repository.close();
  });

  it('reloads a Build-created canonical database without enabling legacy saved writes', async () => {
    const repositoryPath = path.join(tempDir, '.tsdoc/canonical-graph.db');
    const firstRepository = new GraphRepository(repositoryPath);
    firstRepository.replaceActiveRevision(await canonicalGraph('A'));
    firstRepository.close();

    service = new TsdocEdgeService(tempDir);
    expect(service.isCanonicalGraphEnabled()).toBe(true);
    expect(service.enableIncrementalMode()).toBe(true);
    expect(service.processFileChange(path.join(tempDir, 'src/a.ts'))).toBeNull();
    expect(service.searchSymbols('A')).toEqual([expect.objectContaining({ name: 'A' })]);

    const updatedRepository = new GraphRepository(repositoryPath);
    updatedRepository.replaceActiveRevision(await canonicalGraph('B'));
    updatedRepository.close();

    const refreshed = await service.refreshCanonicalGraph();
    expect(refreshed?.status).toBe('committed');
    expect(service.searchSymbols('A')).toEqual([]);
    expect(service.searchSymbols('B')).toEqual([expect.objectContaining({ name: 'B' })]);
  });

  it('uses the configured legacy database path instead of a hard-coded LSP path', () => {
    fs.writeFileSync(
      path.join(tempDir, '.tsdoc.config.json'),
      JSON.stringify({ paths: { databasePath: 'state/legacy.db' } })
    );
    fs.mkdirSync(path.join(tempDir, 'state'));
    const legacy = new Database(path.join(tempDir, 'state/legacy.db'));
    legacy.exec(`
      CREATE TABLE symbols (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line INTEGER
      );
      INSERT INTO symbols (id, name, type, file_path, line)
      VALUES ('configured-class', 'ConfiguredClass', 'class', 'src/a.ts', 1);
    `);
    legacy.close();

    service = new TsdocEdgeService(tempDir, { canonicalGraph: false });

    expect(service.searchSymbols('Configured')).toEqual([
      expect.objectContaining({ name: 'ConfiguredClass', filePath: 'src/a.ts' }),
    ]);
  });

  it('keeps unchanged dirty-file ids, topology, and id/name queries overlay-aware', async () => {
    fs.writeFileSync(path.join(tempDir, 'src/b.ts'), 'export class B {}\n');
    const source: ProjectGraphSource = {
      id: 'fixture',
      load: async () => graphInputWithTopology(),
    };
    service = new TsdocEdgeService(tempDir, {
      canonicalGraph: { rootDir: tempDir },
      canonicalGraphDependencies: { source },
    });
    await service.refreshCanonicalGraph();
    expect(service.enableIncrementalMode()).toBe(true);

    const savedRunId = service.findSymbolByName('A.run')?.id;
    const savedBId = service.findSymbolByName('B')?.id;
    expect(savedRunId).toBeTruthy();
    expect(savedBId).toBeTruthy();
    const workspaceId = path.basename(tempDir);
    expect(savedRunId).toBe(
      `@workspace/${encodeURIComponent(workspaceId)}/graph/ttsc%3A${encodeURIComponent(workspaceId)}/src/a.ts#A.run:method`
    );

    const filePath = path.join(tempDir, 'src/a.ts');
    service.processFileChange(filePath, 'export class A {\n  run(): B { return new B(); }\n}\n');

    expect(service.getSymbolAtPosition(filePath, 2, 3)?.id).toBe(savedRunId);
    expect(service.getImpactAnalysis(savedBId!, 2)).toEqual({
      downstream: 1,
      upstream: 0,
      symbols: [savedRunId],
    });
    expect(service.getRelatedSymbols(savedRunId!)).toEqual([
      expect.objectContaining({ id: savedBId, relationshipType: 'calls' }),
    ]);
    expect(service.findSymbolByName('A.run')).toEqual(
      expect.objectContaining({ id: savedRunId, line: 2 })
    );
  });

  it('uses the composed workspace overlay for queries when multiple files are dirty', async () => {
    fs.writeFileSync(path.join(tempDir, 'src/b.ts'), 'export class B {}\n');
    const source: ProjectGraphSource = {
      id: 'fixture',
      load: async () => graphInputWithTopology(),
    };
    service = new TsdocEdgeService(tempDir, {
      canonicalGraph: { rootDir: tempDir },
      canonicalGraphDependencies: { source },
    });
    await service.refreshCanonicalGraph();
    expect(service.enableIncrementalMode()).toBe(true);

    const savedRunId = service.findSymbolByName('A.run')?.id;
    expect(savedRunId).toBeTruthy();

    const aPath = path.join(tempDir, 'src/a.ts');
    const bPath = path.join(tempDir, 'src/b.ts');
    service.processFileChange(aPath, 'export class A {\n  run(): B { return new B(); }\n}\n');
    service.processFileChange(bPath, 'export class RenamedB {}\n');

    expect(service.getHoverInfo(aPath, 2, 3)).toContain('**Dependencies:** 0');
    expect(service.getCodeLenses(aPath)).toEqual(
      expect.arrayContaining([expect.objectContaining({ symbolId: savedRunId, title: '↓0 ↑0' })])
    );
    expect(service.getRelatedSymbols(savedRunId!)).toEqual([]);
  });

  it('does not clear a newer edit that arrives while a save refresh is running', async () => {
    let blockNextLoad = false;
    let notifyStarted!: () => void;
    let releaseLoad!: () => void;
    const loadStarted = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    const loadGate = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });
    const source: ProjectGraphSource = {
      id: 'fixture',
      load: async () => {
        if (blockNextLoad) {
          blockNextLoad = false;
          notifyStarted();
          await loadGate;
        }
        return graphInput();
      },
    };
    service = new TsdocEdgeService(tempDir, {
      canonicalGraph: { rootDir: tempDir },
      canonicalGraphDependencies: { source },
    });
    await service.refreshCanonicalGraph();
    expect(service.enableIncrementalMode()).toBe(true);

    const filePath = path.join(tempDir, 'src/a.ts');
    service.processFileChange(filePath, 'export class SavedBuffer {}\n');
    blockNextLoad = true;
    const refreshing = service.refreshCanonicalGraph(filePath);
    await loadStarted;
    service.processFileChange(filePath, 'export class NewerDirtyBuffer {}\n');
    releaseLoad();
    await refreshing;

    expect(service.getUnsavedOverlay(filePath)?.symbols).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'NewerDirtyBuffer' })])
    );
    expect(service.getHoverInfo(filePath, 1, 0)).toContain('NewerDirtyBuffer');
  });

  it('clears every saved overlay covered by the later commit when a refresh is superseded', async () => {
    fs.writeFileSync(path.join(tempDir, 'src/b.ts'), 'export class B {}\n');
    let blockNextLoad = false;
    let notifyStarted!: () => void;
    let releaseLoad!: () => void;
    const loadStarted = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    const loadGate = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });
    const source: ProjectGraphSource = {
      id: 'fixture',
      load: async () => {
        if (blockNextLoad) {
          blockNextLoad = false;
          notifyStarted();
          await loadGate;
        }
        return graphInputWithTopology();
      },
    };
    service = new TsdocEdgeService(tempDir, {
      canonicalGraph: { rootDir: tempDir },
      canonicalGraphDependencies: { source },
    });
    await service.refreshCanonicalGraph();
    expect(service.enableIncrementalMode()).toBe(true);

    const aPath = path.join(tempDir, 'src/a.ts');
    const bPath = path.join(tempDir, 'src/b.ts');
    service.processFileChange(aPath, 'export class A { run(): B { return new B(); } }\n');
    blockNextLoad = true;
    const firstRefresh = service.refreshCanonicalGraph(aPath);
    await loadStarted;
    service.processFileChange(bPath, 'export class B {}\n');
    const secondRefresh = service.refreshCanonicalGraph(bPath);
    releaseLoad();

    await expect(firstRefresh).resolves.toEqual(expect.objectContaining({ status: 'superseded' }));
    await expect(secondRefresh).resolves.toEqual(expect.objectContaining({ status: 'committed' }));
    expect(service.getUnsavedOverlay(aPath)).toBeNull();
    expect(service.getUnsavedOverlay(bPath)).toBeNull();
  });

  it('keeps the save-time overlay when canonical refresh fails', async () => {
    let failNextLoad = false;
    const source: ProjectGraphSource = {
      id: 'fixture',
      load: async () => {
        if (failNextLoad) throw new Error('router unavailable');
        return graphInput();
      },
    };
    service = new TsdocEdgeService(tempDir, {
      canonicalGraph: { rootDir: tempDir },
      canonicalGraphDependencies: { source },
    });
    await service.refreshCanonicalGraph();
    expect(service.enableIncrementalMode()).toBe(true);

    const filePath = path.join(tempDir, 'src/a.ts');
    service.processFileChange(filePath, 'export class SaveTimeBuffer {}\n');
    failNextLoad = true;

    await expect(service.refreshCanonicalGraph(filePath)).rejects.toThrow('router unavailable');
    expect(service.getUnsavedOverlay(filePath)?.symbols).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'SaveTimeBuffer' })])
    );
  });

  it('refreshes diagnostics through the real revision envelope when the graph is unchanged', async () => {
    const repositoryPath = path.join(tempDir, '.tsdoc/canonical-graph.db');
    const graph = await canonicalGraph('A');
    const firstDiagnostics = [
      {
        id: 'diagnostic:first',
        category: 'graph-integrity' as const,
        severity: 'warning' as const,
        message: 'first diagnostic',
        file: 'src/a.ts',
        startLine: 1,
      },
    ];
    const firstRepository = new GraphRepository(repositoryPath);
    const firstRevision = firstRepository.replaceActiveRevision(graph, {
      diagnostics: firstDiagnostics,
    });
    firstRepository.close();

    service = new TsdocEdgeService(tempDir);
    expect(service.getDiagnostics(path.join(tempDir, 'src/a.ts'))).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'first diagnostic' })])
    );

    const updatedRepository = new GraphRepository(repositoryPath);
    const updatedRevision = updatedRepository.replaceActiveRevision(graph, {
      diagnostics: [
        {
          id: 'diagnostic:updated',
          category: 'graph-integrity',
          severity: 'warning',
          message: 'updated diagnostic',
          file: 'src/a.ts',
          startLine: 1,
        },
      ],
    });
    updatedRepository.close();
    expect(updatedRevision.contentFingerprint).toBe(firstRevision.contentFingerprint);
    expect(updatedRevision.revisionId).not.toBe(firstRevision.revisionId);

    await service.refreshCanonicalGraph();

    expect(service.getDiagnostics(path.join(tempDir, 'src/a.ts'))).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'updated diagnostic' })])
    );
    expect(service.getDiagnostics(path.join(tempDir, 'src/a.ts'))).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'first diagnostic' })])
    );
  });

  it('merges persisted and parse diagnostics for a dirty document', async () => {
    const repositoryPath = path.join(tempDir, '.tsdoc/canonical-graph.db');
    const repository = new GraphRepository(repositoryPath);
    repository.replaceActiveRevision(await canonicalGraph('A'), {
      diagnostics: [
        {
          id: 'diagnostic:canonical',
          category: 'graph-integrity',
          severity: 'warning',
          message: 'canonical diagnostic',
          file: 'src/a.ts',
          startLine: 1,
        },
      ],
    });
    repository.close();

    const legacy = new Database(path.join(tempDir, '.tsdoc.db'));
    legacy.exec(`
      CREATE TABLE unified_relationships (
        type TEXT NOT NULL,
        properties TEXT,
        file_path TEXT,
        line INTEGER
      );
      INSERT INTO unified_relationships (type, properties, file_path, line)
      VALUES (
        'layer-dependency',
        '{"isViolation":true,"fromLayer":"ui","toLayer":"data"}',
        'src/a.ts',
        1
      );
    `);
    legacy.close();

    service = new TsdocEdgeService(tempDir);
    expect(service.enableIncrementalMode()).toBe(true);
    const filePath = path.join(tempDir, 'src/a.ts');
    service.processFileChange(filePath, 'export class A {');

    const diagnostics = service.getDiagnostics(filePath);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'canonical diagnostic' }),
        expect.objectContaining({ message: 'Architecture violation: ui → data' }),
        expect.objectContaining({ message: expect.stringContaining('Parse error') }),
      ])
    );
  });

  it('keeps file-scoped legacy architecture diagnostics as canonical enrichment', async () => {
    const repositoryPath = path.join(tempDir, '.tsdoc/canonical-graph.db');
    const repository = new GraphRepository(repositoryPath);
    repository.replaceActiveRevision(await canonicalGraph('A'));
    repository.close();

    const legacy = new Database(path.join(tempDir, '.tsdoc.db'));
    legacy.exec(`
      CREATE TABLE unified_relationships (
        type TEXT NOT NULL,
        properties TEXT,
        file_path TEXT,
        line INTEGER
      );
    `);
    legacy
      .prepare(
        `INSERT INTO unified_relationships (type, properties, file_path, line)
         VALUES (?, ?, ?, ?)`
      )
      .run(
        'layer-dependency',
        JSON.stringify({ isViolation: true, fromLayer: 'ui', toLayer: 'data' }),
        'src/a.ts',
        1
      );
    legacy.close();

    service = new TsdocEdgeService(tempDir);
    expect(service.getDiagnostics(path.join(tempDir, 'src/a.ts'))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Architecture violation: ui → data' }),
      ])
    );
  });

  async function canonicalGraph(name: string) {
    return (
      await new ProjectIndexer({ id: 'fixture', load: async () => graphInput(name) }).index({
        rootDir: tempDir,
        tsconfigPath: 'tsconfig.ttsc.json',
      })
    ).graph;
  }

  function graphInput(name = 'A'): ProjectGraphInput {
    return {
      rootDir: tempDir,
      tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
      nodes: [
        {
          id: `src/a.ts#${name}:class`,
          kind: 'class',
          name,
          file: 'src/a.ts',
          evidence: { file: 'src/a.ts', startLine: 1, endLine: 1 },
        },
      ],
      edges: [],
      provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    };
  }

  function graphInputWithTopology(): ProjectGraphInput {
    return {
      rootDir: tempDir,
      tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
      nodes: [
        {
          id: 'src/a.ts#A:class',
          kind: 'class',
          name: 'A',
          qualifiedName: 'A',
          file: 'src/a.ts',
          evidence: { file: 'src/a.ts', startLine: 1, endLine: 3, startCol: 1, endCol: 2 },
        },
        {
          id: 'src/a.ts#A.run:method',
          kind: 'method',
          name: 'run',
          qualifiedName: 'A.run',
          file: 'src/a.ts',
          evidence: { file: 'src/a.ts', startLine: 2, endLine: 2, startCol: 3, endCol: 32 },
        },
        {
          id: 'src/b.ts#B:class',
          kind: 'class',
          name: 'B',
          qualifiedName: 'B',
          file: 'src/b.ts',
          evidence: { file: 'src/b.ts', startLine: 1, endLine: 1 },
        },
      ],
      edges: [{ kind: 'calls', from: 'src/a.ts#A.run:method', to: 'src/b.ts#B:class' }],
      provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    };
  }
});
