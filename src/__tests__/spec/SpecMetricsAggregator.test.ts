/**
 * SpecMetricsAggregator tests
 *
 * Fixture-based: every assertion pins a measurement rule rather than a live-repo number.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { SpecMetricsAggregator } from '../../spec/SpecMetricsAggregator';

describe('SpecMetricsAggregator', () => {
  let root: string;
  let cwd: string;

  beforeEach(() => {
    cwd = process.cwd();
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-metrics-'));
    process.chdir(root);

    fs.mkdirSync('specs', { recursive: true });
    fs.writeFileSync(
      'specs/alpha.md',
      `---\nstatus: active\n---\n# [[Alpha]]\n\nUses Widget[^Widget], Ghost[^Ghost] and old[^sym-999].\n\n[^Widget]: widget\n[^Ghost]: ghost\n[^sym-999]: legacy\n`
    );
    fs.writeFileSync('specs/beta.md', `---\nstatus: draft\n---\n# [[Beta]]\n`);

    fs.mkdirSync('src', { recursive: true });
    fs.writeFileSync(
      'src/widget.ts',
      `/**\n * Widget\n * @doc [[Alpha]]\n * @doc [[Missing]]\n * @responsibility Render\n * @public\n */\nexport class Widget {}\n`
    );
    fs.writeFileSync('src/plain.ts', `export const x = 1;\n`);

    const db = new Database('symbols.db');
    db.exec(`CREATE TABLE symbols (id TEXT, name TEXT, is_exported INTEGER);
             CREATE TABLE unified_relationships (type TEXT, from_symbols TEXT);`);
    const sym = db.prepare('INSERT INTO symbols VALUES (?, ?, ?)');
    sym.run('widget-class-widget', 'Widget', 1);
    sym.run('plain-variable-x', 'x', 1);
    sym.run('helper-function-h', 'h', 0);
    const rel = db.prepare('INSERT INTO unified_relationships VALUES (?, ?)');
    rel.run('doc-reference', '["widget-class-widget"]');
    // Naming-pattern relations are not spec references and must not count toward coverage.
    rel.run('naming-pattern-relation', '["plain-variable-x"]');
    db.close();
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  const run = () =>
    new SpecMetricsAggregator().aggregate({
      managedDir: 'specs',
      dbPath: 'symbols.db',
      specDbPath: 'no-spec-graph.db',
      srcDir: 'src',
    });

  it('resolves name footnotes by symbol name and ID footnotes by symbol ID', () => {
    const { codeConnectivity } = run();
    expect(codeConnectivity.validCodeLinksCount).toBe(1); // [^Widget]
    expect(codeConnectivity.brokenCodeLinks.map((b) => b.identifier).sort()).toEqual([
      'Ghost',
      'sym-999',
    ]);
    expect(codeConnectivity.linkIntegrityRate).toBe(33);
  });

  it('counts only doc-reference relationships from exported symbols as spec coverage', () => {
    const { codeConnectivity } = run();
    expect(codeConnectivity.exportedSymbols).toBe(2);
    expect(codeConnectivity.exportedSymbolsWithDocReference).toBe(1);
    expect(codeConnectivity.specCoverageRate).toBe(50);
  });

  it('never reports SpecGraph conformance it did not evaluate', () => {
    const { specGraph, recommendations } = run();
    expect(specGraph.hasSpecGraph).toBe(false);
    expect(specGraph.conformanceEvaluated).toBe(false);
    expect(recommendations.some((r) => r.message.includes('spec extract'))).toBe(true);
  });

  it('reads lifecycle from frontmatter and counts only promotable documents', () => {
    const { lifecycle } = run();
    expect(lifecycle.distribution.active).toBe(1);
    expect(lifecycle.distribution.draft).toBe(1);
    expect(lifecycle.activeRatio).toBe(50);
    // beta.md is a draft but scores below the review threshold.
    expect(lifecycle.readyForPromotionCount).toBe(0);
  });

  it('measures module-spec aspects from real JSDoc tags per source file', () => {
    const { module7Aspects } = run();
    expect(module7Aspects.analyzedFiles).toBe(2);
    expect(module7Aspects.aspectCoverage.purpose).toBe(50); // only widget.ts has @responsibility
    expect(module7Aspects.aspectCoverage.scope).toBe(50); // only widget.ts has @public
    expect(module7Aspects.aspectCoverage.effect).toBe(0);
  });

  it('returns zeroed, finite metrics for an empty scope', () => {
    const metrics = new SpecMetricsAggregator().aggregate({
      managedDir: 'does-not-exist',
      dbPath: 'missing.db',
      specDbPath: 'missing-spec.db',
      srcDir: 'does-not-exist',
    });
    expect(metrics.documentQuality.totalDocuments).toBe(0);
    expect(Number.isFinite(metrics.healthScore)).toBe(true);
  });

  describe('getSpecMetricsForFile', () => {
    it('resolves @doc links to managed documents and reports unresolved ones', () => {
      const ctx = new SpecMetricsAggregator().getSpecMetricsForFile('src/widget.ts', {
        managedDir: 'specs',
      });
      expect(ctx.isSpecFile).toBe(false);
      const alpha = ctx.boundSpecs?.find((b) => b.symbolRef === 'Alpha');
      expect(alpha?.filePath).toBe(path.join('specs', 'alpha.md'));
      expect(alpha?.status).toBe('active');
      expect(ctx.boundSpecs?.find((b) => b.symbolRef === 'Missing')?.filePath).toBeUndefined();
      expect(ctx.recommendations.some((r) => r.includes('[[Missing]]'))).toBe(true);
      expect(ctx.aspectsCoverage?.purpose).toBe(true);
      expect(ctx.aspectsCoverage?.effect).toBe(false);
    });

    it('reports status and completeness for a spec document', () => {
      const ctx = new SpecMetricsAggregator().getSpecMetricsForFile('specs/beta.md');
      expect(ctx.isSpecFile).toBe(true);
      expect(ctx.status).toBe('draft');
      expect(typeof ctx.score).toBe('number');
    });

    it('handles missing files without throwing', () => {
      const agg = new SpecMetricsAggregator();
      expect(agg.getSpecMetricsForFile('specs/none.md').recommendations[0]).toContain('not found');
      expect(agg.getSpecMetricsForFile('src/none.ts').recommendations[0]).toContain('not found');
    });
  });

  describe('pure-module neutral effect scoring', () => {
    it('does not penalize pure modules or recommend @sideEffect while keeping aspectCoverage.effect raw', () => {
      fs.mkdirSync('pure-src', { recursive: true });
      fs.writeFileSync(
        'pure-src/pureParser.ts',
        [
          "import type { Stats } from 'node:fs';",
          '/**',
          ' * Parse input tokens purely.',
          ' * @doc [[Alpha]]',
          ' * @responsibility Parse tokens into an AST',
          ' * @param input - Raw token text',
          ' * @returns Token count',
          ' * @see Alpha',
          ' * @remarks Deterministic pure string scan.',
          ' * @public',
          ' */',
          'export function parsePure(input: string, _unused?: Stats): number {',
          '  return input.trim().length;',
          '}',
          '',
        ].join('\n')
      );

      const agg = new SpecMetricsAggregator();
      const metrics = agg.aggregate({
        managedDir: 'specs',
        dbPath: 'symbols.db',
        specDbPath: 'no-spec-graph.db',
        srcDir: 'pure-src',
      });

      expect(metrics.module7Aspects.analyzedFiles).toBe(1);
      expect(metrics.module7Aspects.aspectCoverage.effect).toBe(0);
      expect(metrics.module7Aspects.effectfulFiles).toBe(0);
      expect(metrics.module7Aspects.effectCoverageOfEffectfulFiles).toBe(100);
      expect(metrics.module7Aspects.averageAspectScore).toBe(100);
      expect(
        metrics.recommendations.some((r) => r.message.includes('Weakest module-spec aspect'))
      ).toBe(false);

      const fileCtx = agg.getSpecMetricsForFile('pure-src/pureParser.ts', {
        managedDir: 'specs',
      });
      expect(fileCtx.aspectsCoverage?.effect).toBe(false);
      expect(fileCtx.recommendations.some((r) => r.includes('No effect aspect tag'))).toBe(false);
    });

    it('detects impure modules, recommends @sideEffect, and recovers score once documented', () => {
      fs.mkdirSync('mixed-src', { recursive: true });
      fs.writeFileSync(
        'mixed-src/pureModel.ts',
        [
          '/**',
          ' * Pure value formatter.',
          ' * @doc [[Alpha]]',
          ' * @responsibility Format label',
          ' * @param label - Raw label',
          ' * @returns Trimmed label',
          ' * @see Alpha',
          ' * @remarks No runtime I/O.',
          ' * @public',
          ' */',
          'export function formatLabel(label: string): string {',
          '  return label.trim();',
          '}',
          '',
        ].join('\n')
      );
      const impureHeaderWithoutEffect = [
        "import * as fs from 'node:fs';",
        '/**',
        ' * Persist formatted label to disk.',
        ' * @doc [[Alpha]]',
        ' * @responsibility Write label file',
        ' * @param target - File path',
        ' * @returns Written byte count',
        ' * @see Alpha',
        ' * @remarks Performs synchronous disk write.',
        ' * @public',
        ' */',
        'export function writeLabel(target: string): number {',
        "  fs.writeFileSync(target, 'ok');",
        '  return 2;',
        '}',
        '',
      ].join('\n');
      fs.writeFileSync('mixed-src/ioWriter.ts', impureHeaderWithoutEffect);

      const agg = new SpecMetricsAggregator();
      const before = agg.aggregate({
        managedDir: 'specs',
        dbPath: 'symbols.db',
        specDbPath: 'no-spec-graph.db',
        srcDir: 'mixed-src',
      });

      expect(before.module7Aspects.analyzedFiles).toBe(2);
      expect(before.module7Aspects.effectfulFiles).toBe(1);
      expect(before.module7Aspects.aspectCoverage.effect).toBe(0);
      expect(before.module7Aspects.effectCoverageOfEffectfulFiles).toBe(0);
      expect(before.module7Aspects.averageAspectScore).toBe(86);
      expect(
        before.recommendations.some((r) =>
          r.message.includes('Weakest module-spec aspect: effect (0% of effectful files')
        )
      ).toBe(true);

      const impureCtx = agg.getSpecMetricsForFile('mixed-src/ioWriter.ts', {
        managedDir: 'specs',
      });
      expect(impureCtx.aspectsCoverage?.effect).toBe(false);
      expect(
        impureCtx.recommendations.some((r) => r.includes('No effect aspect tag (@sideEffect).'))
      ).toBe(true);

      // Document @sideEffect on the impure file; pureModel.ts remains without @sideEffect.
      fs.writeFileSync(
        'mixed-src/ioWriter.ts',
        impureHeaderWithoutEffect.replace(
          ' * @public',
          ' * @sideEffect Writes target file on disk\n * @public'
        )
      );

      const after = agg.aggregate({
        managedDir: 'specs',
        dbPath: 'symbols.db',
        specDbPath: 'no-spec-graph.db',
        srcDir: 'mixed-src',
      });

      expect(after.module7Aspects.effectfulFiles).toBe(1);
      expect(after.module7Aspects.aspectCoverage.effect).toBe(50);
      expect(after.module7Aspects.effectCoverageOfEffectfulFiles).toBe(100);
      expect(after.module7Aspects.averageAspectScore).toBe(100);
      expect(
        after.recommendations.some((r) => r.message.includes('Weakest module-spec aspect: effect'))
      ).toBe(false);

      const documentedCtx = agg.getSpecMetricsForFile('mixed-src/ioWriter.ts', {
        managedDir: 'specs',
      });
      expect(documentedCtx.aspectsCoverage?.effect).toBe(true);
      expect(documentedCtx.recommendations.some((r) => r.includes('No effect aspect tag'))).toBe(
        false
      );
    });

    it('treats process and console globals or CommonJS require of stateful modules as effectful', () => {
      fs.mkdirSync('globals-src', { recursive: true });
      fs.writeFileSync(
        'globals-src/envReader.ts',
        `export const readMode = (): string => process.env.NODE_ENV ?? 'test';\n`
      );
      fs.writeFileSync(
        'globals-src/cjsRunner.ts',
        `const cp = require('child_process');\nexport const hasExec = (): boolean => Boolean(cp);\n`
      );

      const agg = new SpecMetricsAggregator();
      const metrics = agg.aggregate({
        managedDir: 'specs',
        dbPath: 'symbols.db',
        specDbPath: 'no-spec-graph.db',
        srcDir: 'globals-src',
      });

      expect(metrics.module7Aspects.analyzedFiles).toBe(2);
      expect(metrics.module7Aspects.effectfulFiles).toBe(2);
      expect(metrics.module7Aspects.effectCoverageOfEffectfulFiles).toBe(0);
      expect(
        agg
          .getSpecMetricsForFile('globals-src/envReader.ts', { managedDir: 'specs' })
          .recommendations.some((r) => r.includes('No effect aspect tag (@sideEffect).'))
      ).toBe(true);
    });
  });
});
