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

  it('keeps file-scoped legacy architecture diagnostics as canonical enrichment', async () => {
    const repositoryPath = path.join(tempDir, '.tsdoc/canonical-graph.db');
    const repository = new GraphRepository(repositoryPath);
    repository.replaceActiveRevision(await canonicalGraph('A'));
    repository.close();

    const legacy = new Database(path.join(tempDir, '.tsdoc/symbols.db'));
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
    return new ProjectIndexer({ id: 'fixture', load: async () => graphInput(name) }).index({
      rootDir: tempDir,
      tsconfigPath: 'tsconfig.ttsc.json',
    });
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
});
