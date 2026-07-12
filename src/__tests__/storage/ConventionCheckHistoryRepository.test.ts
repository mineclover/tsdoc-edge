import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { ConventionCheckService, compileConventionPackSource } from '../../convention';
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
      const stored = history.append({
        check,
        inputs: { evidence, enrichment, policy: pack.policy, ruleSet: pack.ruleSet },
      });
      historyId = stored.historyId;

      expect(history.read(stored.historyId)).toEqual(stored);
      expect(
        history.append({
          check,
          inputs: { evidence, enrichment, policy: pack.policy, ruleSet: pack.ruleSet },
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
        })
      ).toThrow('must be canonical');
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
});
