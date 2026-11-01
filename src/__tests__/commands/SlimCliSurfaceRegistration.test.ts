/**
 * Regression tests for the streamlined 20-command CLI surface
 *
 * @testScenario Enforce `<= 20` top-level commands with zero alias collisions
 * @testScenario Verify removed SSOT-violating and duplicate flat commands stay unregistered
 * @testScenario Verify group subcommands and package.json scripts align with unified command groups
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { registerCliCommands } from '../../commands';

describe('Streamlined 20-Command CLI Surface', () => {
  const registry = registerCliCommands();

  it('registers at most 20 top-level commands with exact expected primary names', () => {
    const names = registry.getAll().map((cmd) => cmd.getName());
    expect(names.length).toBeLessThanOrEqual(20);
    expect(names).toEqual([
      'init',
      'sync',
      'build',
      'work-context',
      'design-context',
      'system-status',
      'stats',
      'health',
      'lint',
      'symbol',
      'relationship',
      'docs',
      'validate',
      'spec',
      'convention',
      'ontology',
      'canonical-graph',
      'coverage-report',
      'coverage-baseline',
      'help',
    ]);
  });

  it('keeps removed SSOT-violating, colliding, and duplicate flat commands unregistered at top level', () => {
    const removedNames = [
      'tag-dead-code',
      'detect-dead-code',
      'id',
      'query-inferred',
      'endpoints',
      'http-endpoints',
      'routes',
      'hubs',
      'layers',
      'common',
      'analyze',
      'visualize',
      'rebuild-index',
      'task',
      'parallel-work',
      'improve',
      'parse-mermaid',
      'usage',
      'explore-entrypoint',
      'blocks',
      'test-relationships',
      'test-examples',
      'sync-coverage',
      'install-hook',
      'uninstall-hook',
      'pre-commit-run',
      'relationship-impact',
      'relationship-metrics',
      'relationship-clusters',
      'validate-tsdoc',
      'deps',
      'who-uses',
      'find-method',
      'spec-metrics',
    ];
    for (const removed of removedNames) {
      expect(registry.has(removed)).toBe(false);
    }
  });

  it('routes absorbed auxiliary subcommands through symbol, docs, and spec groups', async () => {
    const symbolCmd = registry.get('symbol')!;
    for (const sub of [
      'query',
      'deps',
      'who-uses',
      'orphans',
      'find-method',
      'tree',
      'core-api',
      'undocumented',
      'untested',
      'parse',
      'promote',
      'fix',
      'rename',
    ]) {
      const res = await symbolCmd.execute([sub, '--help']);
      expect(res.exitCode).toBe(0);
    }

    const docsCmd = registry.get('docs')!;
    for (const sub of [
      'index',
      'backlinks',
      'check-links',
      'update-refs',
      'generate',
      'validate',
      'find-unused',
      'move',
      'symbols',
      'fix',
      'suggest',
      'todos',
      'plans',
    ]) {
      const res = await docsCmd.execute([sub, '--help']);
      expect(res.exitCode).toBe(0);
    }

    const specCmd = registry.get('spec')!;
    for (const sub of [
      'extract',
      'graph',
      'metrics',
      'validate',
      'duplicates',
      'status',
      'history',
      'diff',
      'bump',
    ]) {
      const res = await specCmd.execute([sub, '--help']);
      expect(res.exitCode).toBe(0);
    }
  });

  it('aligns package.json rel:* scripts with unified `relationship <subcommand>` invocations', () => {
    const packageJsonPath = path.resolve(__dirname, '../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts['rel:check']).toContain('relationship check');
    expect(packageJson.scripts['rel:impact']).toContain('relationship impact');
    expect(packageJson.scripts['rel:metrics']).toContain('relationship metrics');
    expect(packageJson.scripts['rel:validate']).toContain('relationship validate');
    expect(packageJson.scripts['rel:clusters']).toContain('relationship clusters');
    expect(packageJson.scripts['rel:help']).toContain('relationship help');
  });

  it('produces zero filesystem or SQLite side-effects during command registration', () => {
    const originalCwd = process.cwd();
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slim-cli-no-side-effects-'));
    try {
      process.chdir(emptyDir);
      const freshRegistry = registerCliCommands();
      expect(freshRegistry.getAll()).toHaveLength(20);
      expect(fs.readdirSync(emptyDir)).toEqual([]);
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
