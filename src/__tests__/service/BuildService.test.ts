/**
 * BuildService tests
 * @testScenario Build a database from a source tree
 * @testScenario Skip unchanged files on incremental builds
 * @testScenario Exclude test files
 * @testScenario Report progress and always release the database
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { type BuildOptions, BuildService } from '../../service/BuildService';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('BuildService', () => {
  let tempDir: string;
  let srcDir: string;
  let options: BuildOptions;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-service-'));
    process.chdir(tempDir);
    srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(
      path.join(srcDir, 'greeter.ts'),
      `/**
 * Greets people
 * @public
 */
export class Greeter {
  /** Greet by name */
  greet(name: string): string {
    return helper(name);
  }
}

/** Builds the greeting */
export function helper(name: string): string {
  return 'hello ' + name;
}
`,
      'utf-8'
    );
    fs.writeFileSync(
      path.join(srcDir, 'greeter.test.ts'),
      `describe('Greeter', () => {
  it('greets', () => {
    expect(1).toBe(1);
  });
});
`,
      'utf-8'
    );

    options = {
      targetPath: srcDir,
      databasePath: path.join(tempDir, 'test.db'),
      jsonlPath: path.join(tempDir, 'data'),
      registryDir: path.join(tempDir, '.tsdoc'),
    };
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function countSymbols(): number {
    const db = new DatabaseManager(options.databasePath, options.jsonlPath);
    try {
      return db.getAllSymbols().length;
    } finally {
      db.close();
    }
  }

  it('populates the database and writes the registry', async () => {
    const result = await new BuildService().build(options);

    expect(result.status).toBe('built');
    if (result.status !== 'built') return;
    expect(result.filesScanned).toBe(2);
    expect(result.symbolsInserted).toBeGreaterThan(0);
    expect(result.symbolsFound).toBeGreaterThanOrEqual(result.symbolsInserted);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(countSymbols()).toBe(result.symbolsInserted);

    expect(result.registryPath).toBe(path.join(tempDir, '.tsdoc', 'registry.jsonl'));
    const lines = fs.readFileSync(result.registryPath, 'utf-8').split('\n');
    expect(JSON.parse(lines[0])).toEqual({ version: '1.0.0', idGeneratorMode: 'sequential' });
    expect(lines).toHaveLength(result.symbolsInserted + 1);
    expect(lines.slice(1).map((line) => JSON.parse(line).sourceRef.symbolName)).toContain(
      'Greeter'
    );
  });

  it('creates the JSONL directory when it is missing', async () => {
    expect(fs.existsSync(options.jsonlPath)).toBe(false);

    await new BuildService().build(options);

    expect(fs.existsSync(options.jsonlPath)).toBe(true);
  });

  it('skips unchanged files on the next incremental build', async () => {
    await new BuildService().build(options);

    const second = await new BuildService().build(options);

    expect(second).toEqual({ status: 'up-to-date' });
  });

  it('reprocesses only the files that changed', async () => {
    await new BuildService().build(options);
    fs.appendFileSync(path.join(srcDir, 'greeter.ts'), '\nexport const extra = 1;\n', 'utf-8');

    const second = await new BuildService().build(options);

    expect(second.status).toBe('built');
    if (second.status !== 'built') return;
    expect(second.filesScanned).toBe(1);
  });

  it('reprocesses everything with forceRebuild', async () => {
    await new BuildService().build(options);

    const forced = await new BuildService().build({ ...options, forceRebuild: true });

    expect(forced.status).toBe('built');
    if (forced.status !== 'built') return;
    expect(forced.filesScanned).toBe(2);
  });

  it('leaves test files out with excludeTests', async () => {
    const result = await new BuildService().build({ ...options, excludeTests: true });

    expect(result.status).toBe('built');
    if (result.status !== 'built') return;
    expect(result.filesScanned).toBe(1);
  });

  it('reports progress through the callback', async () => {
    const messages: Array<[string, string]> = [];

    await new BuildService().build({
      ...options,
      onProgress: (message, level) => messages.push([level, message]),
    });

    expect(messages).toContainEqual(['info', 'Scanning TypeScript files...']);
    expect(messages).toContainEqual(['info', 'Processing 2 file(s)...']);
    expect(messages).toContainEqual(['info', 'Inserting relationships...']);
  });

  it('records per-file failures instead of aborting the build', async () => {
    fs.writeFileSync(path.join(srcDir, 'broken.ts'), 'export const = {{{', 'utf-8');

    const result = await new BuildService().build(options);

    expect(result.status).toBe('built');
    if (result.status !== 'built') return;
    expect(result.symbolsInserted).toBeGreaterThan(0);
  });

  it('releases the database when scanning fails', async () => {
    const closeSpy = jest.spyOn(DatabaseManager.prototype, 'close');

    await expect(
      new BuildService().build({ ...options, targetPath: path.join(tempDir, 'missing') })
    ).rejects.toThrow();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
