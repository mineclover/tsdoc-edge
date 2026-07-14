import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
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

const context = {
  file: 'managed/conventions/core.json',
  contentDigest: `sha256:${'0'.repeat(64)}`,
} as const;

describe('ConventionCheckHistoryRepository', () => {
  it('retains canonical inputs with an exact check envelope and rejects read-time tampering', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'convention-history-'));
    const historyPath = path.join(root, 'history.db');
    const graphRepository = new GraphRepository(':memory:');
    const history = new ConventionCheckHistoryRepository(historyPath);
    let historyId = '';
    try {
      const pack = compileConventionPackSource(fixturePackSource(), context);
      graphRepository.replaceActiveRevision(fixtureGraph());
      const check = new ConventionCheckService().run({
        pack,
        codeRevision: graphRepository.readActiveRevision()!,
        workspaceRoot: '/fixture',
      });
      const evidence = createCanonicalEmptyEvidenceRevision('fixture-workspace');
      const enrichment = createCanonicalEmptyEnrichmentRevision('fixture-workspace');
      const replay = {
        pack,
        evaluationConfig: check.retainedEvaluationConfig,
        gate: evaluateConventionGate(check, 'error'),
      };
      const stored = history.append({
        check,
        inputs: { evidence, enrichment, policy: pack.policy, ruleSet: pack.ruleSet },
        ...replay,
      });
      historyId = stored.historyId;

      expect(history.read(stored.historyId)).toEqual(stored);
      const retained = history.read(stored.historyId)!;
      const replayed = new ConventionCheckService().run({
        pack: retained.pack,
        codeRevision: graphRepository.readRevision(retained.check.codeRevisionId)!,
        workspaceRoot: '/fixture',
        evidence: retained.inputs.evidence,
        enrichment: retained.inputs.enrichment,
        naming: retained.evaluationConfig.naming,
        tsdoc: retained.evaluationConfig.tsdoc,
      });
      expect(replayed.checkId).toBe(check.checkId);
      expect(
        history.append({
          check,
          inputs: { evidence, enrichment, policy: pack.policy, ruleSet: pack.ruleSet },
          ...replay,
        })
      ).toEqual(stored);
      expect(() =>
        history.append({
          check,
          inputs: {
            evidence: { ...evidence, revisionId: 'forged' },
            enrichment,
            policy: pack.policy,
            ruleSet: pack.ruleSet,
          },
          ...replay,
        })
      ).toThrow('must be canonical');
      expect(() =>
        history.append({
          check,
          inputs: { evidence, enrichment, policy: pack.policy, ruleSet: pack.ruleSet },
          ...replay,
          gate: { ...replay.gate, gateId: 'forged' },
        })
      ).toThrow('inputs do not match');
    } finally {
      history.close();
      graphRepository.close();
    }

    const database = new Database(historyPath);
    database
      .prepare('UPDATE convention_check_history SET payload_json = ?')
      .run(JSON.stringify({ contractVersion: '1.0', historyId: 'forged' }));
    database.close();
    const readonly = new ConventionCheckHistoryRepository(historyPath, { readOnly: true });
    try {
      expect(() => readonly.read(historyId)).toThrow('envelope mismatch');
    } finally {
      readonly.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('protects pinned history and tombstones unpinned payloads during retention GC', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'convention-history-retention-'));
    const historyPath = path.join(root, 'history.db');
    const graphRepository = new GraphRepository(':memory:');
    const history = new ConventionCheckHistoryRepository(historyPath, {
      clock: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    try {
      const pack = compileConventionPackSource(fixturePackSource(), context);
      graphRepository.replaceActiveRevision(fixtureGraph());
      const check = new ConventionCheckService().run({
        pack,
        codeRevision: graphRepository.readActiveRevision()!,
        workspaceRoot: '/fixture',
      });
      const evidence = createCanonicalEmptyEvidenceRevision('fixture-workspace');
      const enrichment = createCanonicalEmptyEnrichmentRevision('fixture-workspace');
      const stored = history.append({
        check,
        inputs: { evidence, enrichment, policy: pack.policy, ruleSet: pack.ruleSet },
        pack,
        evaluationConfig: check.retainedEvaluationConfig,
        gate: evaluateConventionGate(check, 'error'),
      });
      const pin = history.pin(stored.historyId, 'release proof');
      expect(pin.reason).toBe('release proof');
      expect(history.listSummaries({ before: '2026-02-01T00:00:00.000Z' })).toMatchObject([
        { historyId: stored.historyId, pinned: true },
      ]);

      const protectedRun = history.collectGarbage({
        before: '2026-02-01T00:00:00.000Z',
        reason: 'first pass',
      });
      expect(protectedRun.tombstoned).toEqual([]);
      expect(protectedRun.skippedPinned).toHaveLength(1);
      expect(history.read(stored.historyId)).toEqual(stored);

      expect(history.unpin(stored.historyId)).toBe(true);
      expect(history.listSummaries({ before: '2026-02-01T00:00:00.000Z' })).toMatchObject([
        { historyId: stored.historyId, pinned: false },
      ]);
      const collected = history.collectGarbage({
        before: '2026-02-01T00:00:00.000Z',
        reason: 'release retention window',
      });
      expect(collected.tombstoned).toMatchObject([
        { historyId: stored.historyId, reason: 'release retention window' },
      ]);
      expect(() => history.read(stored.historyId)).toThrow('is tombstoned');
      expect(history.readTombstone(stored.historyId)).toMatchObject({
        historyId: stored.historyId,
        payloadDigest: expect.stringMatching(/^sha256:/),
      });
      expect(history.listSummaries()).toEqual([]);
    } finally {
      history.close();
      graphRepository.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps read-only access compatible with pre-retention history databases', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'convention-history-legacy-'));
    const historyPath = path.join(root, 'history.db');
    const database = new Database(historyPath);
    database.exec(`
      CREATE TABLE convention_check_history (
        history_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        check_id TEXT NOT NULL,
        contract_version TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      )
    `);
    database.close();

    const readonly = new ConventionCheckHistoryRepository(historyPath, { readOnly: true });
    try {
      expect(readonly.read('missing')).toBeNull();
      expect(readonly.listSummaries()).toEqual([]);
      expect(readonly.readTombstone('missing')).toBeNull();
    } finally {
      readonly.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
