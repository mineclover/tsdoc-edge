import { ConventionCheckService, compileConventionPackSource } from '../../convention';
import { createEvidenceRevision } from '../../semantic-graph/analysis-input-revisions';
import { GraphRepository } from '../../storage/GraphRepository';
import { fixtureGraph, fixturePackSource } from './fixtures';

const context = {
  file: 'managed/conventions/core.json',
  contentDigest: `sha256:${'0'.repeat(64)}`,
} as const;

function activeRevision(graph = fixtureGraph()) {
  const repository = new GraphRepository(':memory:');
  try {
    repository.replaceActiveRevision(graph);
    return repository.readActiveRevision()!;
  } finally {
    repository.close();
  }
}

describe('ConventionCheckService', () => {
  it('closes the authored pack -> exact binding -> conformance report loop', () => {
    const pack = compileConventionPackSource(fixturePackSource(), context);
    const result = new ConventionCheckService().run({
      pack,
      codeRevision: activeRevision(),
      workspaceRoot: '/fixture',
    });

    expect(result.conformance.summary).toEqual({
      total: 1,
      satisfied: 1,
      violated: 0,
      indeterminate: 0,
      suppressed: 0,
      disabled: 0,
    });
    expect(result.bindingDiagnostics).toEqual([]);
    expect(result.inputStamp.specRevisionId).toBe(pack.spec.revisionId);
    expect(result.inputStamp.policyRevisionId).toBe(pack.policy.revisionId);
    expect(result.inputStamp.ruleSetRevisionId).toBe(pack.ruleSet.revisionId);
    expect(result.checkId).toMatch(/^convention-check:/);
  });

  it('reports an exact missing implementation as a violated error', () => {
    const pack = compileConventionPackSource(fixturePackSource(), context);
    const result = new ConventionCheckService().run({
      pack,
      codeRevision: activeRevision(fixtureGraph({ includeTarget: false })),
      workspaceRoot: '/fixture',
    });

    expect(result.conformance.findings[0]).toMatchObject({
      declarationId: 'BIND-SERVICE',
      severity: 'error',
      outcome: 'violated',
      diagnosticCodes: ['binding.implementation.implementer.missing'],
    });
    expect(result.bindingDiagnostics).toEqual([
      expect.objectContaining({
        declarationId: 'BIND-SERVICE',
        role: 'implementer',
        status: 'missing',
      }),
    ]);
  });

  it('includes location-aware naming findings in the deterministic check identity', () => {
    const pack = compileConventionPackSource(fixturePackSource(), context);
    const result = new ConventionCheckService().run({
      pack,
      codeRevision: activeRevision(),
      workspaceRoot: '/fixture',
      naming: {
        contractVersion: '1.0',
        rules: [
          {
            id: 'fixture-class-snake',
            path: 'src/**/*.ts',
            target: 'symbol',
            kinds: ['class'],
            style: 'snake',
            severity: 'error',
          },
        ],
      },
    });

    expect(result.naming.findings).toMatchObject([
      {
        ruleId: 'fixture-class-snake',
        subject: 'Service',
        severity: 'error',
        outcome: 'violated',
      },
    ]);
    expect(result.checkId).toMatch(/^convention-check:/);
  });

  it.each([
    ['passed', 'satisfied'],
    ['failed', 'violated'],
    ['skipped', 'indeterminate'],
    ['unknown', 'indeterminate'],
  ] as const)('applies exact verifier execution status %s as %s', (status, outcome) => {
    const source = fixturePackSource();
    const pack = compileConventionPackSource(
      {
        ...source,
        spec: {
          ...source.spec,
          bindings: [
            {
              id: 'BIND-TEST',
              kind: 'verification',
              specNodeId: 'REQ-SERVICE',
              verifier: {
                type: 'test-evidence',
                workspaceId: 'fixture-workspace',
                evidenceId: 'TEST-SERVICE',
              },
              subject: {
                type: 'code-node',
                workspaceId: 'fixture-workspace',
                graphNamespace: 'fixture/provider',
                canonicalNodeId: 'src/service.ts#Service:class',
              },
            },
          ],
        },
        policy: {
          ...source.policy,
          rules: [
            { id: 'binding.verification', version: '2.0.0', enabled: true, severity: 'error' },
          ],
        },
      },
      context
    );
    const evidence = createEvidenceRevision({
      workspaceId: 'fixture-workspace',
      items: [
        {
          kind: 'test-evidence',
          id: 'TEST-SERVICE',
          runner: 'jest',
          testName: 'service test',
          status,
          source: { file: 'src/service.test.ts', contentDigest: `sha256:${'1'.repeat(64)}` },
          subjectFiles: [],
          provenance: { source: 'test-runner', producerId: 'jest', producerVersion: 'unreported' },
        },
      ],
      provenance: {
        source: 'collected',
        producerId: 'fixture-loader',
        producerVersion: '1.0.0',
        sourceFingerprint: `sha256:${'2'.repeat(64)}`,
      },
    });
    const result = new ConventionCheckService().run({
      pack,
      codeRevision: activeRevision(),
      workspaceRoot: '/fixture',
      evidence,
    });
    expect(result.conformance.findings[0]?.outcome).toBe(outcome);
  });

  it('applies an exact, time-pinned suppression to the obligation', () => {
    const pack = compileConventionPackSource(
      fixturePackSource({
        suppression: true,
        expiresAt: '2030-01-01T00:00:00.000Z',
      }),
      context
    );
    const service = new ConventionCheckService();
    expect(() =>
      service.run({
        pack,
        codeRevision: activeRevision(fixtureGraph({ includeTarget: false })),
        workspaceRoot: '/fixture',
      })
    ).toThrow('--suppression-as-of');

    const result = service.run({
      pack,
      codeRevision: activeRevision(fixtureGraph({ includeTarget: false })),
      workspaceRoot: '/fixture',
      suppressionAsOf: '2029-01-01T00:00:00.000Z',
    });
    expect(result.conformance.findings[0]).toMatchObject({
      outcome: 'suppressed',
      suppressionId: 'SUPPRESS-SERVICE',
    });
  });

  it('fails closed when a required provider capability is unavailable', () => {
    const pack = compileConventionPackSource(
      fixturePackSource({
        capabilities: { nodes: { minimumStatus: 'complete', version: '1' } },
      }),
      context
    );
    expect(() =>
      new ConventionCheckService().run({
        pack,
        workspaceRoot: '/fixture',
        codeRevision: activeRevision(
          fixtureGraph({ capabilities: { nodes: { status: 'partial', version: '1' } } })
        ),
      })
    ).toThrow('requires complete');
  });

  it('normalizes raw graph-router scalar capabilities for exact requirements', () => {
    const pack = compileConventionPackSource(
      fixturePackSource({
        capabilities: { factPlane: { minimumStatus: 'complete', version: 'raw' } },
      }),
      context
    );
    const result = new ConventionCheckService().run({
      pack,
      workspaceRoot: '/fixture',
      codeRevision: activeRevision(fixtureGraph({ capabilities: { factPlane: 'raw' } })),
    });
    expect(result.capabilityChecks).toEqual([
      {
        id: 'factPlane',
        required: { minimumStatus: 'complete', version: 'raw' },
        observedStatus: 'complete',
        observedVersion: 'raw',
      },
    ]);
  });

  it('rejects a canonical graph from another workspace root', () => {
    const pack = compileConventionPackSource(fixturePackSource(), context);
    expect(() =>
      new ConventionCheckService().run({
        pack,
        workspaceRoot: '/other-workspace',
        codeRevision: activeRevision(),
      })
    ).toThrow('graph root mismatch');
  });

  it('accepts only repository-materialized graph revisions and honors a manifest lock', () => {
    const pack = compileConventionPackSource(fixturePackSource(), context);
    const revision = activeRevision();
    const service = new ConventionCheckService();
    expect(() =>
      service.run({
        pack: { ...pack },
        workspaceRoot: '/fixture',
        codeRevision: revision,
      })
    ).toThrow('not materialized by ConventionPackCompiler');
    expect(() =>
      service.run({
        pack,
        workspaceRoot: '/fixture',
        codeRevision: { ...revision },
      })
    ).toThrow('not materialized by GraphRepository');
    expect(() =>
      service.run({
        pack,
        workspaceRoot: '/fixture',
        codeRevision: revision,
        expectedManifestId: `convention-pack:${'0'.repeat(64)}`,
      })
    ).toThrow('manifest pin mismatch');
    expect(() =>
      service.run({
        pack,
        workspaceRoot: '/fixture',
        codeRevision: revision,
        expectedManifestId: '',
      })
    ).toThrow('expectedManifestId must be a canonical');
    expect(
      service.run({
        pack,
        workspaceRoot: '/fixture',
        codeRevision: revision,
        expectedManifestId: pack.manifest.manifestId,
      }).conformance.summary.satisfied
    ).toBe(1);
  });
});
