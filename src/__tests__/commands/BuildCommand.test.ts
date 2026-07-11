/**
 * Tests for BuildCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BuildCommand } from '../../commands/BuildCommand';
import { ConfigManager } from '../../config/ConfigManager';
import {
  CanonicalGraphCoordinator,
  type ProjectGraphInput,
  type ProjectGraphSource,
} from '../../indexer';
import { DatabaseManager } from '../../storage/DatabaseManager';
import { GraphRepository } from '../../storage/GraphRepository';

describe('BuildCommand', () => {
  let command: BuildCommand;
  let tempDir: string;
  let configManager: ConfigManager;
  const originalCanonicalGraphFlag = process.env.TSDOC_EDGE_CANONICAL_GRAPH;
  const originalRouterModule = process.env.TSDOC_EDGE_GRAPH_ROUTER_MODULE;
  const originalCanonicalGraphDatabase = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

  beforeEach(() => {
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH;
    delete process.env.TSDOC_EDGE_GRAPH_ROUTER_MODULE;
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-test-'));

    // Create mock TypeScript file
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(
      path.join(srcDir, 'test.ts'),
      `
      /**
       * Test function
       * @public
       */
      export function testFunc(): void {}
      `,
      'utf-8'
    );

    // Mock config
    const configPath = path.join(tempDir, '.tsdoc.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        project: {
          name: 'test',
          version: '1.0.0',
          srcDirs: ['src'],
        },
        paths: {
          commentsDir: 'docs/comments',
          databasePath: path.join(tempDir, 'test.db'),
          jsonlDir: path.join(tempDir, 'data'),
        },
      }),
      'utf-8'
    );

    configManager = ConfigManager.getInstance(tempDir, configPath);
    command = new BuildCommand(configManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restoreEnvironment('TSDOC_EDGE_CANONICAL_GRAPH', originalCanonicalGraphFlag);
    restoreEnvironment('TSDOC_EDGE_GRAPH_ROUTER_MODULE', originalRouterModule);
    restoreEnvironment('TSDOC_EDGE_CANONICAL_GRAPH_DB', originalCanonicalGraphDatabase);
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getName', () => {
    it('should return "build"', () => {
      expect(command.getName()).toBe('build');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      expect(command.getDescription()).toContain('database');
    });
  });

  describe('execute', () => {
    it('should build database from valid path', async () => {
      const srcPath = path.join(tempDir, 'src');
      const result = await command.execute([srcPath]);

      expect(result.error).toBeUndefined();
      expect(result).toMatchObject({ exitCode: 0 });
      expect(result.message).toContain('symbols');
    });

    it('should use default path "src" if not specified', async () => {
      // Change to tempDir so default 'src' resolves to our test directory
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const result = await command.execute([]);
        expect(result).toBeDefined();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should return error for non-existent path', async () => {
      const result = await command.execute(['/non/existent/path']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should handle scan errors gracefully', async () => {
      // Create invalid TypeScript file
      const srcDir = path.join(tempDir, 'src2');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'invalid.ts'), 'invalid typescript {{{', 'utf-8');

      const result = await command.execute([srcDir]);

      // Should complete but may have errors in result
      expect(result.exitCode).toBe(0); // Build completes even with errors
    });

    it('persists the canonical graph through ProjectIndexer before legacy enrichment', async () => {
      const routerConfig = path.join(tempDir, 'ttsc-graph-router.config.json');
      const canonicalDatabase = path.join(tempDir, '.tsdoc/canonical-graph.db');
      fs.writeFileSync(routerConfig, '{}');
      fs.writeFileSync(path.join(tempDir, 'tsconfig.ttsc.json'), '{}');
      const source: ProjectGraphSource = {
        id: 'fixture',
        load: async () => canonicalGraphInput(tempDir),
      };
      const canonicalCoordinatorFactory = jest.fn(
        (options) => new CanonicalGraphCoordinator(options, { source })
      );
      command = new BuildCommand(ConfigManager.getInstance(), {
        canonicalCoordinatorFactory,
      });

      const result = await command.execute([
        path.join(tempDir, 'src'),
        '--canonical-graph',
        '--router-module=fixture-module',
        `--router-config=${routerConfig}`,
        '--router-repo=test',
        '--graph-workspace=test-workspace',
        '--graph-namespace=test/graph',
        `--canonical-graph-db=${canonicalDatabase}`,
      ]);

      expect(result.error).toBeUndefined();
      expect(result).toMatchObject({ exitCode: 0 });
      expect(canonicalCoordinatorFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'test-workspace',
          graphNamespace: 'test/graph',
        })
      );
      const repository = new GraphRepository(canonicalDatabase);
      expect(repository.readActiveRevision()).toMatchObject({
        graph: {
          nodes: [expect.objectContaining({ id: 'src/test.ts#testFunc:function' })],
          edges: [],
        },
        metadata: {
          artifactContract: { contractVersion: '1.0' },
          nodeCount: 1,
          edgeCount: 0,
        },
      });
      repository.close();
    });

    it('does not activate canonical refresh from a router module parameter alone', async () => {
      const canonicalCoordinatorFactory = jest.fn();
      command = new BuildCommand(configManager, {
        canonicalCoordinatorFactory,
      });

      const result = await command.execute([
        path.join(tempDir, 'src'),
        '--router-module=fixture-module',
      ]);

      expect(result.exitCode).toBe(0);
      expect(canonicalCoordinatorFactory).not.toHaveBeenCalled();
    });

    it('allows an explicit environment switch to activate canonical refresh', async () => {
      const canonicalDatabase = path.join(tempDir, '.tsdoc/environment-canonical-graph.db');
      process.env.TSDOC_EDGE_CANONICAL_GRAPH = '1';
      process.env.TSDOC_EDGE_GRAPH_ROUTER_MODULE = 'fixture-module';
      process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB = canonicalDatabase;
      const source: ProjectGraphSource = {
        id: 'fixture',
        load: async () => canonicalGraphInput(tempDir),
      };
      const canonicalCoordinatorFactory = jest.fn(
        (options) => new CanonicalGraphCoordinator(options, { source })
      );
      command = new BuildCommand(configManager, { canonicalCoordinatorFactory });

      const result = await command.execute([path.join(tempDir, 'src')]);

      expect(result.error).toBeUndefined();
      expect(result.exitCode).toBe(0);
      expect(canonicalCoordinatorFactory).toHaveBeenCalledTimes(1);
      const repository = new GraphRepository(canonicalDatabase);
      expect(repository.readActiveRevision()?.metadata.nodeCount).toBe(1);
      repository.close();
    });

    it('requires a router module when canonical refresh is explicitly enabled', async () => {
      delete process.env.TSDOC_EDGE_GRAPH_ROUTER_MODULE;

      const result = await command.execute([path.join(tempDir, 'src'), '--canonical-graph']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('requires --router-module');
    });

    it('closes the legacy database when scanning fails after initialization', async () => {
      const close = jest.spyOn(DatabaseManager.prototype, 'close');
      const privateCommand = command as unknown as {
        findTypeScriptFiles(targetPath: string): string[];
      };
      jest.spyOn(privateCommand, 'findTypeScriptFiles').mockImplementation(() => {
        throw new Error('fixture scan failure');
      });

      const result = await command.execute([path.join(tempDir, 'src')]);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('fixture scan failure');
      expect(close).toHaveBeenCalledTimes(1);
      close.mockRestore();
    });
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function canonicalGraphInput(rootDir: string): ProjectGraphInput {
  const canonicalRoot = fs.realpathSync.native(rootDir);
  return {
    rootDir: canonicalRoot,
    tsconfigPath: path.join(canonicalRoot, 'tsconfig.ttsc.json'),
    nodes: [
      {
        id: 'src/test.ts#testFunc:function',
        kind: 'function',
        name: 'testFunc',
        file: 'src/test.ts',
        external: false,
        evidence: { file: 'src/test.ts', startLine: 6 },
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
