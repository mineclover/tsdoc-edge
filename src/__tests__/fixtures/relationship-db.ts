/**
 * Seeds a throwaway symbol database for relationship command tests
 */

import * as path from 'node:path';
import { DatabaseManager } from '../../storage/DatabaseManager';
import type { Symbol as GraphSymbol } from '../../types/graph/graph';

/** Symbol IDs written by {@link seedRelationshipDatabase} */
export const SEEDED_SYMBOL_IDS = { source: 'class-source', target: 'class-target' } as const;

function seedSymbol(id: string, name: string): GraphSymbol {
  return {
    id,
    name,
    type: 'class',
    filePath: `src/${name}.ts`,
    line: 1,
    column: 0,
    isExported: true,
    isPublic: true,
    summary: `${name} class`,
    tests: [],
    designDecisions: [],
  };
}

/**
 * Create `<projectDir>/.tsdoc.db` with two symbols and three relationships:
 * one healthy structural dependency, one low-confidence call, and one orphan whose
 * target symbol does not exist.
 */
export function seedRelationshipDatabase(projectDir: string): void {
  const db = new DatabaseManager(
    path.join(projectDir, '.tsdoc.db'),
    path.join(projectDir, '.tsdoc')
  );
  try {
    db.insertSymbol(seedSymbol(SEEDED_SYMBOL_IDS.source, 'Source'), 0);
    db.insertSymbol(seedSymbol(SEEDED_SYMBOL_IDS.target, 'Target'), 1);

    const base = {
      direction: 'unidirectional',
      strength: 'strong',
      evidence: [],
      discoveredBy: 'test',
    };
    db.insertUnifiedRelationship({
      ...base,
      id: 'rel-dependency',
      type: 'code-dependency',
      category: 'structural',
      fromSymbols: [SEEDED_SYMBOL_IDS.source],
      toSymbols: [SEEDED_SYMBOL_IDS.target],
      confidence: 0.9,
    });
    db.insertUnifiedRelationship({
      ...base,
      id: 'rel-low-confidence',
      type: 'calls',
      category: 'behavioral',
      fromSymbols: [SEEDED_SYMBOL_IDS.target],
      toSymbols: [SEEDED_SYMBOL_IDS.source],
      confidence: 0.2,
    });
    db.insertUnifiedRelationship({
      ...base,
      id: 'rel-orphan',
      type: 'code-dependency',
      category: 'structural',
      fromSymbols: [SEEDED_SYMBOL_IDS.source],
      toSymbols: ['class-missing'],
      confidence: 0.9,
    });
  } finally {
    db.close();
  }
}
