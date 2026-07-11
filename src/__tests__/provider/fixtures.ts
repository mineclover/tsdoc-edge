import type { ProviderSnapshot } from '../../provider/contracts';
import {
  SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID,
  SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION,
} from '../../provider/contracts';

export function snapshotFixture(): ProviderSnapshot {
  return {
    contractId: SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID,
    contractVersion: SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION,
    snapshotId: 'snapshot:base',
    workspaceId: 'workspace-a',
    graphNamespace: 'ts7',
    identity: {
      providerId: 'ttsc',
      providerVersion: '0.16.8',
      providerInstanceId: 'instance-a',
      contractId: SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID,
      contractVersion: SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION,
    },
    capabilities: {
      'fact-occurrences': { status: 'complete', version: '1' },
      'owned-outgoing-relationships': { status: 'complete', version: '1' },
    },
    nodes: [
      {
        providerNodeId: 'n1',
        kind: 'function',
        name: 'A',
        qualifiedName: 'A',
        file: 'src/a.ts',
        evidence: { file: 'src/a.ts', startLine: 1 },
        producerFields: { flags: ['exported'] },
      },
      {
        providerNodeId: 'n2',
        kind: 'function',
        name: 'B',
        qualifiedName: 'B',
        file: 'src/b.ts',
        evidence: { file: 'src/b.ts', startLine: 1 },
      },
    ],
    facts: [
      {
        providerFactId: 'f1',
        kind: 'calls',
        fromProviderNodeId: 'n1',
        toProviderNodeId: 'n2',
        evidence: { file: 'src/a.ts', startLine: 3, startCol: 2 },
        confidence: 1,
      },
      {
        providerFactId: 'f2',
        kind: 'calls',
        fromProviderNodeId: 'n1',
        toProviderNodeId: 'n2',
        evidence: { file: 'src/a.ts', startLine: 7, startCol: 2 },
        confidence: 0.9,
      },
    ],
    diagnostics: [
      {
        providerDiagnosticId: 'd1',
        severity: 'warning',
        message: 'fixture warning',
        evidence: { file: 'src/a.ts', startLine: 2 },
        relatedProviderNodeIds: ['n1', 'missing-node'],
      },
    ],
    provenance: {
      producer: '@ttsc/graph',
      producerVersion: '0.16.8',
      compilerVersion: null,
      compilerVersionReported: false,
      typescriptCompatibilityTarget: '7.0',
      artifactContractId: '@ttsc-ex/ttsc-graph-router/raw-graph-artifact',
      artifactContractVersion: '1.0.0',
      providerConfigDigest: 'config-digest',
    },
  };
}
