import { normalizeRouterDiagnostics } from '../../indexer/diagnostics-contract';

describe('canonical diagnostics contract', () => {
  it('accepts the graph-router diagnostic shape without stringifying numeric codes', () => {
    const diagnostics = normalizeRouterDiagnostics([
      {
        file: 'src/a.ts',
        line: 7,
        column: 4,
        code: 2322,
        message: 'Type mismatch',
        origin: 'tsc',
        node: 'src/a.ts#A:class',
      },
    ]);

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 2322,
        severity: 'error',
        startLine: 7,
        startCol: 4,
        relatedNodeIds: ['src/a.ts#A:class'],
        producerFields: { origin: 'tsc' },
      }),
    ]);
    expect(typeof diagnostics[0].code).toBe('number');
  });

  it('merges and deduplicates explicit related nodes with the producer node', () => {
    const diagnostics = normalizeRouterDiagnostics([
      {
        file: 'src/a.ts',
        line: 7,
        code: 'lint-1',
        message: 'Graph lint warning',
        severity: 'warning',
        node: 'node-b',
        relatedNodeIds: ['node-c', 'node-b', 'node-a'],
      },
    ]);

    expect(diagnostics[0].relatedNodeIds).toEqual(['node-a', 'node-b', 'node-c']);
  });
});
