/**
 * End-to-end parity and behavioral tests for the native Go TSDoc contributor
 * (`tools/ttsc-tsdoc`) running inside `@ttsc/lint` 0.34.3 against `@microsoft/tsdoc`.
 *
 * @packageDocumentation
 */

import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ValidateTsdocCommand } from '../../commands/ValidateTsdocCommand';
import { TSDocParser } from '../../parser/TSDocParser';

const projectRoot = process.cwd();
const runTtscScript = path.join(projectRoot, 'scripts', 'run-ttsc.cjs');
const repoNodeModulesPath = path.join(projectRoot, 'node_modules');
const pluginDescriptorPath = path.join(projectRoot, 'tools', 'ttsc-tsdoc', 'index.cjs');
const repoTsdocJsonPath = path.join(projectRoot, 'tsdoc.json');

const { parseTtscLintOutput } = require('../../../scripts/verify-ttsc-lint-baseline.cjs') as {
  parseTtscLintOutput(output: string): {
    rules: Record<string, number>;
    typeErrors: string[];
    lintErrors: string[];
  };
};

function runTtscInFixture(
  fixtureDir: string,
  subcommand: 'check' | 'fix',
  extraArgs: string[] = []
): { status: number | null; output: string } {
  const result = childProcess.spawnSync(
    process.execPath,
    [runTtscScript, subcommand, '-p', path.join(fixtureDir, 'tsconfig.json'), ...extraArgs],
    {
      cwd: fixtureDir,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }
  );
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

function createTempFixtureProject(rulesConfig: Record<string, unknown>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttsc-tsdoc-parity-'));
  fs.symlinkSync(repoNodeModulesPath, path.join(dir, 'node_modules'), 'junction');
  fs.copyFileSync(repoTsdocJsonPath, path.join(dir, 'tsdoc.json'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'managed', 'features'), { recursive: true });

  fs.writeFileSync(
    path.join(dir, 'managed', 'features', 'auth-flow.md'),
    [
      '---',
      'status: active',
      '---',
      '# [[AuthFlow]]',
      '',
      'Overview of authentication flow.',
      '',
      '## [[TokenRefresh]]',
      '',
      'Details on token refresh.',
      '',
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'Node16',
          moduleResolution: 'Node16',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          plugins: [{ transform: '@ttsc/lint', configFile: './lint.config.mjs' }],
        },
        include: ['src/**/*.ts'],
      },
      null,
      2
    ),
    'utf8'
  );

  const normalizedDescriptor = pluginDescriptorPath.split(path.sep).join('/');
  fs.writeFileSync(
    path.join(dir, 'lint.config.mjs'),
    [
      "import { createRequire } from 'node:module';",
      'const require = createRequire(import.meta.url);',
      `const tsdocPlugin = require(${JSON.stringify(normalizedDescriptor)});`,
      'export default {',
      "  plugins: { 'tsdoc-edge': tsdocPlugin },",
      `  rules: ${JSON.stringify(rulesConfig, null, 2)},`,
      '};',
      '',
    ].join('\n'),
    'utf8'
  );

  return dir;
}

describe('tools/ttsc-tsdoc native plugin parity & behavioral suite', () => {
  jest.setTimeout(60000);

  it('maintains 0 @microsoft/tsdoc issues across the entire repository src/ corpus', async () => {
    const command = new ValidateTsdocCommand();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    try {
      const result = await command.execute(['--json', '--strict', 'src']);
      const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0] ?? '{}')) as {
        passed: boolean;
        commentsScanned: number;
        issues: Array<{ filePath: string; line: number; messageId: string; message: string }>;
      };
      expect(payload.commentsScanned).toBeGreaterThan(4000);
      expect(payload.issues).toEqual([]);
      expect(payload.passed).toBe(true);
      expect(result.exitCode).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('validates tsdoc.json tags natively and ignores doc-like strings inside template literals', () => {
    const dir = createTempFixtureProject({
      'tsdoc-edge/tsdoc-config': 'warn',
      'tsdoc-edge/check-tag-names': 'warn',
    });
    try {
      fs.writeFileSync(
        path.join(dir, 'src', 'sample.ts'),
        [
          '/**',
          ' * Valid summary.',
          ' * @packageDocumentation',
          ' * @doc [[AuthFlow]]',
          ' * @responsibility Demo module',
          ' * @bogusBlockTag invalid',
          ' * See {@bogusInlineTag target} and {@link ValidTarget}.',
          ' */',
          'export const templateLiteral = `',
          '/** @fakeTagInsideTemplateLiteral */',
          '`;',
          '',
        ].join('\n'),
        'utf8'
      );

      const { output } = runTtscInFixture(dir, 'check');
      const parsed = parseTtscLintOutput(output);
      expect(parsed.typeErrors).toEqual([]);
      expect(parsed.rules['tsdoc-edge/check-tag-names']).toBe(2);
      expect(output).toContain('@bogusBlockTag');
      expect(output).toContain('@bogusInlineTag');
      expect(output).not.toContain('@fakeTagInsideTemplateLiteral');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects lexical TSDoc escape violations and autofixes them via ttsc fix to @microsoft/tsdoc compliance', () => {
    const dir = createTempFixtureProject({
      'tsdoc-edge/tsdoc-config': 'warn',
      'tsdoc-edge/tsdoc-escapes': 'warn',
    });
    try {
      const samplePath = path.join(dir, 'src', 'escapes.ts');
      fs.writeFileSync(
        samplePath,
        [
          '/**',
          ' * Maps {id} across A -> B with Map<string, number>.',
          ' * Contact user@domain or @microsoft/tsdoc or {@doc}.',
          ' * Valid inline {@link AuthFlow} and `raw {code} -> @foo` stay untouched.',
          ' */',
          'export const value = 1;',
          '',
        ].join('\n'),
        'utf8'
      );

      const beforeCheck = runTtscInFixture(dir, 'check');
      const beforeParsed = parseTtscLintOutput(beforeCheck.output);
      expect(beforeParsed.rules['tsdoc-edge/tsdoc-escapes']).toBeGreaterThanOrEqual(6);

      const fixRun = runTtscInFixture(dir, 'fix');
      expect(fixRun.status).toBe(0);

      const afterCheck = runTtscInFixture(dir, 'check');
      const afterParsed = parseTtscLintOutput(afterCheck.output);
      expect(afterParsed.rules['tsdoc-edge/tsdoc-escapes'] ?? 0).toBe(0);

      const fixedSource = fs.readFileSync(samplePath, 'utf8');
      expect(fixedSource).toContain('{@link AuthFlow}');
      expect(fixedSource).toContain('`raw {code} -> @foo`');

      const tsdocParser = new TSDocParser(path.join(dir, 'tsdoc.json'));
      const tsdocResult = tsdocParser.parseFile('escapes.ts', fixedSource);
      expect(tsdocResult.errors).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('checks @param hyphen syntax, signature parameter names, and managed @doc [[Checkpoint]] targets', () => {
    const dir = createTempFixtureProject({
      'tsdoc-edge/tsdoc-config': 'warn',
      'tsdoc-edge/param-signatures': 'warn',
      'tsdoc-edge/spec-index': 'warn',
      'tsdoc-edge/doc-link-syntax': 'warn',
      'tsdoc-edge/doc-link-target': 'warn',
    });
    try {
      fs.writeFileSync(
        path.join(dir, 'src', 'contracts.ts'),
        [
          '/**',
          ' * Valid references.',
          ' * @doc [[AuthFlow]]',
          ' * @doc [[AuthFlow#TokenRefresh]]',
          ' * @doc [[auth-flow]]',
          ' * @param _token - Refresh token value',
          ' */',
          'export function refresh(_token: string): string {',
          '  return _token;',
          '}',
          '',
          '/**',
          ' * Broken references and mismatched @param.',
          ' * @doc plain prose without checkpoint brackets',
          ' * @doc [[MissingCheckpointDoc]]',
          ' * @param token Missing hyphen and wrong parameter name',
          ' */',
          'export function broken(_token: string): string {',
          '  return _token;',
          '}',
          '',
        ].join('\n'),
        'utf8'
      );

      const { output } = runTtscInFixture(dir, 'check');
      const parsed = parseTtscLintOutput(output);
      expect(parsed.typeErrors).toEqual([]);
      expect(parsed.rules['tsdoc-edge/doc-link-syntax']).toBe(1);
      expect(parsed.rules['tsdoc-edge/doc-link-target']).toBe(1);
      expect(parsed.rules['tsdoc-edge/param-signatures']).toBeGreaterThanOrEqual(1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
