import type { ConventionPackSource } from '../../convention';
import type { CanonicalProjectGraph } from '../../indexer';
import { canonicalProjectGraphFingerprint } from '../../indexer';
import { GraphRepository } from '../../storage/GraphRepository';

/**
 * FIXTURE_WORKSPACE_ID
 */
export const FIXTURE_WORKSPACE_ID = 'fixture-workspace';
/**
 * FIXTURE_GRAPH_NAMESPACE
 */
export const FIXTURE_GRAPH_NAMESPACE = 'fixture/provider';
/**
 * FIXTURE_NODE_ID
 */
export const FIXTURE_NODE_ID = 'src/service.ts#Service:class';
/**
 * FIXTURE_REQUIREMENT_ID
 */
export const FIXTURE_REQUIREMENT_ID = 'REQ-SERVICE';

/**
 * fixtureGraph function
 * @param options - options parameter
 * @returns Returns CanonicalProjectGraph
 */
export function fixtureGraph(
  options: {
    readonly includeTarget?: boolean;
    readonly capabilities?: Readonly<Record<string, unknown>>;
    readonly rootDir?: string;
  } = {}
): CanonicalProjectGraph {
  const rootDir = options.rootDir ?? '/fixture';
  const nodes =
    options.includeTarget === false
      ? [
          {
            id: 'src/other.ts#Other:class',
            sourceId: 'src/other.ts#Other:class',
            kind: 'class',
            file: 'src/other.ts',
          },
        ]
      : [{ id: FIXTURE_NODE_ID, sourceId: FIXTURE_NODE_ID, kind: 'class', file: 'src/service.ts' }];
  nodes.sort((left, right) => left.id.localeCompare(right.id));
  const edges: CanonicalProjectGraph['edges'] = [];
  return {
    contractVersion: '1.0',
    rootDir,
    tsconfigPath: `${rootDir}/tsconfig.json`,
    nodes,
    edges,
    provenance: {
      adapter: 'fixture-adapter',
      producer: 'fixture/provider',
      producerVersion: '1.0.0',
      workspaceId: FIXTURE_WORKSPACE_ID,
      graphNamespace: FIXTURE_GRAPH_NAMESPACE,
      artifactCapabilities: options.capabilities ?? {},
    },
    fingerprint: canonicalProjectGraphFingerprint(nodes, edges),
  };
}

/**
 * fixturePackSource function
 * @param options - options parameter
 * @returns Returns ConventionPackSource
 */
export function fixturePackSource(
  options: {
    readonly targetId?: string;
    readonly suppression?: boolean;
    readonly expiresAt?: string;
    readonly capabilities?: ConventionPackSource['capabilities'];
    readonly enabled?: boolean;
  } = {}
): ConventionPackSource {
  const suppressions = options.suppression
    ? [
        {
          id: 'SUPPRESS-SERVICE',
          ruleId: 'binding.implementation',
          target: {
            type: 'spec-node' as const,
            workspaceId: FIXTURE_WORKSPACE_ID,
            specNodeId: FIXTURE_REQUIREMENT_ID,
          },
          reason: 'Fixture migration window',
          ...(options.expiresAt ? { expiresAt: options.expiresAt } : {}),
        },
      ]
    : [];
  return {
    contractId: 'tsdoc-edge/convention-pack-source',
    contractVersion: '1.0',
    packId: '@fixture/conventions/core',
    packVersion: '1.0.0',
    scope: { kind: 'workspace', workspaceId: FIXTURE_WORKSPACE_ID },
    graphNamespace: FIXTURE_GRAPH_NAMESPACE,
    capabilities: options.capabilities ?? {},
    spec: {
      nodes: [
        {
          id: 'SPEC-CONVENTIONS',
          kind: 'spec',
          title: 'Fixture conventions',
          lifecycle: { mode: 'independent', status: 'active' },
          tags: ['convention-pack'],
        },
        {
          id: FIXTURE_REQUIREMENT_ID,
          kind: 'requirement',
          title: 'Service implementation must exist',
          lifecycle: { mode: 'inherited', aggregateSpecId: 'SPEC-CONVENTIONS' },
          tags: ['implementation'],
        },
      ],
      bindings: [
        {
          id: 'BIND-SERVICE',
          kind: 'implementation',
          specNodeId: FIXTURE_REQUIREMENT_ID,
          target: {
            type: 'code-node',
            workspaceId: FIXTURE_WORKSPACE_ID,
            graphNamespace: FIXTURE_GRAPH_NAMESPACE,
            canonicalNodeId: options.targetId ?? FIXTURE_NODE_ID,
          },
        },
      ],
    },
    policy: {
      lifecycleGateVersion: '1.0.0',
      rules: [
        {
          id: 'binding.implementation',
          version: '1.0.0',
          enabled: options.enabled ?? true,
          severity: 'error',
        },
      ],
      suppressions,
    },
  };
}

/**
 * writeActiveGraph function
 * @param databasePath - databasePath parameter
 * @param graph - graph parameter
 * @returns void - No return value
 */
export function writeActiveGraph(databasePath: string, graph: CanonicalProjectGraph): void {
  const repository = new GraphRepository(databasePath);
  try {
    repository.replaceActiveRevision(graph);
  } finally {
    repository.close();
  }
}
