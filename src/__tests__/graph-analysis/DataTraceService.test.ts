import { DataTraceService } from '../../graph-analysis';
import type { CanonicalGraphEdge, CanonicalGraphNode, CanonicalProjectGraph } from '../../indexer';
import type { SpecGraphRevision } from '../../spec-graph';

describe('DataTraceService (Unified 3-Tier Data Trace)', () => {
  const virtualFiles: Record<string, string> = {
    'src/domain/order.ts': `/**
 * TypeSpec source: specs/commerce.tsp#OrderDto
 * @packageDocumentation
 * @doc [[Order Lifecycle]]
 * @oa-pointer #/components/schemas/OrderDto
 * @oa-source specs/commerce.tsp
 * @oa-replaces LegacyOrderV1
 * @storageRef commerce_db.orders
 * @intent Represent validated customer order state across checkout and fulfillment
 */

export const OrderEntityRoot = {
  entityName: 'OrderEntity',
  kind: 'entity-root',
} as const;

export const OrderDtoAspectOf = {
  aspectModelName: 'OrderDto',
  canonicalEntityName: 'OrderEntity',
  aspectName: 'checkout-summary',
} as const;

export const OrderStorage = {
  targetName: 'OrderEntity',
  domain: 'commerce',
  store: 'postgres',
  table: 'orders',
  partitionKey: 'tenant_id',
} as const;

export const OrderIdPromotable = {
  idName: 'OrderId',
  initialScope: 'local-optimistic',
  targetScope: 'canonical',
  canonicalTargetName: 'OrderEntity',
  promotionPolicy: 'server-issued',
} as const;

export const OrderPublicIdRepresentation = {
  representationName: 'OrderPublicId',
  canonicalTargetName: 'OrderEntity',
  format: 'prefixed-ulid',
  encoding: 'base32',
} as const;

export const OrderLookupKey = {
  entityName: 'OrderEntity',
  propertyName: 'orderNumber',
  lookupMethod: 'unique-index',
  uniqueness: 'tenant-scoped',
} as const;

/**
 * Customer order data transfer object.
 * @doc [[Order Lifecycle]]
 * @contract Total cents must be non-negative
 * @invariant Status transitions follow checkout state machine
 * @evidence specs/commerce.tsp#OrderDto Verified against TypeSpec model
 */
export interface OrderDto {
  readonly id: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED';
  totalCents: number;
}

export class OrderRepository {
  saveOrder(order: OrderDto): void {
    console.log('FSM:CHECKOUT:ORDER:SAVE:COMMITTED', order.id);
  }

  findOrder(id: string): OrderDto {
    return { id, status: 'PENDING', totalCents: 1000 };
  }
}

export function mapEntityToOrderDto(entity: { id: string; rawTotal: number }): OrderDto {
  return {
    id: entity.id,
    status: 'PENDING',
    totalCents: entity.rawTotal,
  };
}

export function mutateAndForwardOrder(
  order: OrderDto,
  dynamicKey: string,
  untypedMeta: any
): OrderDto {
  const { status } = order;
  const currentTotal = order.totalCents;
  order.status = 'PAID';
  order.totalCents += 500;
  const dynamicVal = (order as Record<string, unknown>)[dynamicKey];
  const parsedExtra = JSON.parse('{"discount": 10}');
  const coerced = parsedExtra as unknown as { discount: number };
  const repo = new OrderRepository();
  repo.saveOrder(order);
  console.log('TX:BILLING:ORDER:SETTLE', status, currentTotal, dynamicVal, coerced, untypedMeta);
  return order;
}

export function readOrderConsumer(repo: OrderRepository, orderId: string): string {
  const loaded = repo.findOrder(orderId);
  return loaded.status;
}
`,
    '.oa-trace.json': JSON.stringify({
      schema: 'oa-sdk.spec-traceability.v1',
      nodes: {
        '#/components/schemas/OrderDto': {
          symbolName: 'OrderDto',
          trackingId: 'trk_order_dto_01',
          declarationId: 'tsd_order_dto_01',
          source: {
            file: 'specs/commerce.tsp',
            line: 42,
            symbol: 'OrderDto',
          },
          governance: {
            storageRef: 'postgres.orders',
            dpmProjection: 'OrderCheckoutProjection',
          },
        },
      },
    }),
  };

  function buildFixtureGraph(): CanonicalProjectGraph {
    const file = 'src/domain/order.ts';
    const nodes: CanonicalGraphNode[] = [
      {
        id: `${file}#OrderDto:interface`,
        sourceId: `${file}#OrderDto:interface`,
        kind: 'interface',
        name: 'OrderDto',
        qualifiedName: 'OrderDto',
        file,
        evidence: { file, startLine: 63, endLine: 67 },
        docTags: [
          { name: 'doc', text: '[[Order Lifecycle]]' },
          { name: 'contract', text: 'Total cents must be non-negative' },
          { name: 'invariant', text: 'Status transitions follow checkout state machine' },
        ],
      },
      {
        id: `${file}#OrderDto.id:variable`,
        sourceId: `${file}#OrderDto.id:variable`,
        kind: 'variable',
        name: 'id',
        qualifiedName: 'OrderDto.id',
        file,
        parent: `${file}#OrderDto:interface`,
        modifiers: ['readonly'],
        signature: 'string',
        evidence: { file, startLine: 64, endLine: 64 },
      },
      {
        id: `${file}#OrderDto.status:variable`,
        sourceId: `${file}#OrderDto.status:variable`,
        kind: 'variable',
        name: 'status',
        qualifiedName: 'OrderDto.status',
        file,
        parent: `${file}#OrderDto:interface`,
        signature: "'PENDING' | 'PAID' | 'SHIPPED'",
        literals: ['PENDING', 'PAID', 'SHIPPED'],
        docTags: [{ name: 'pattern', text: '^(PENDING|PAID|SHIPPED)$' }],
        evidence: { file, startLine: 65, endLine: 65 },
      },
      {
        id: `${file}#OrderDto.totalCents:variable`,
        sourceId: `${file}#OrderDto.totalCents:variable`,
        kind: 'variable',
        name: 'totalCents',
        qualifiedName: 'OrderDto.totalCents',
        file,
        parent: `${file}#OrderDto:interface`,
        signature: 'number',
        docTags: [{ name: 'minimum', text: '0' }],
        evidence: { file, startLine: 66, endLine: 66 },
      },
      {
        id: `${file}#OrderEntityRoot:variable`,
        sourceId: `${file}#OrderEntityRoot:variable`,
        kind: 'variable',
        name: 'OrderEntityRoot',
        qualifiedName: 'OrderEntityRoot',
        file,
        evidence: { file, startLine: 11, endLine: 14 },
      },
      {
        id: `${file}#OrderDtoAspectOf:variable`,
        sourceId: `${file}#OrderDtoAspectOf:variable`,
        kind: 'variable',
        name: 'OrderDtoAspectOf',
        qualifiedName: 'OrderDtoAspectOf',
        file,
        evidence: { file, startLine: 16, endLine: 20 },
      },
      {
        id: `${file}#OrderStorage:variable`,
        sourceId: `${file}#OrderStorage:variable`,
        kind: 'variable',
        name: 'OrderStorage',
        qualifiedName: 'OrderStorage',
        file,
        evidence: { file, startLine: 22, endLine: 28 },
      },
      {
        id: `${file}#OrderIdPromotable:variable`,
        sourceId: `${file}#OrderIdPromotable:variable`,
        kind: 'variable',
        name: 'OrderIdPromotable',
        qualifiedName: 'OrderIdPromotable',
        file,
        evidence: { file, startLine: 30, endLine: 36 },
      },
      {
        id: `${file}#OrderPublicIdRepresentation:variable`,
        sourceId: `${file}#OrderPublicIdRepresentation:variable`,
        kind: 'variable',
        name: 'OrderPublicIdRepresentation',
        qualifiedName: 'OrderPublicIdRepresentation',
        file,
        evidence: { file, startLine: 38, endLine: 43 },
      },
      {
        id: `${file}#OrderLookupKey:variable`,
        sourceId: `${file}#OrderLookupKey:variable`,
        kind: 'variable',
        name: 'OrderLookupKey',
        qualifiedName: 'OrderLookupKey',
        file,
        evidence: { file, startLine: 45, endLine: 50 },
      },
      {
        id: `${file}#OrderRepository:class`,
        sourceId: `${file}#OrderRepository:class`,
        kind: 'class',
        name: 'OrderRepository',
        qualifiedName: 'OrderRepository',
        file,
        evidence: { file, startLine: 69, endLine: 77 },
      },
      {
        id: `${file}#OrderRepository.saveOrder:function`,
        sourceId: `${file}#OrderRepository.saveOrder:function`,
        kind: 'function',
        name: 'saveOrder',
        qualifiedName: 'OrderRepository.saveOrder',
        file,
        parent: `${file}#OrderRepository:class`,
        signature: '(order: OrderDto) => void',
        evidence: { file, startLine: 70, endLine: 72 },
      },
      {
        id: `${file}#OrderRepository.findOrder:function`,
        sourceId: `${file}#OrderRepository.findOrder:function`,
        kind: 'function',
        name: 'findOrder',
        qualifiedName: 'OrderRepository.findOrder',
        file,
        parent: `${file}#OrderRepository:class`,
        signature: '(id: string) => OrderDto',
        evidence: { file, startLine: 74, endLine: 76 },
      },
      {
        id: `${file}#mapEntityToOrderDto:function`,
        sourceId: `${file}#mapEntityToOrderDto:function`,
        kind: 'function',
        name: 'mapEntityToOrderDto',
        qualifiedName: 'mapEntityToOrderDto',
        file,
        signature: '(entity: { id: string; rawTotal: number }) => OrderDto',
        evidence: { file, startLine: 79, endLine: 85 },
      },
      {
        id: `${file}#mutateAndForwardOrder:function`,
        sourceId: `${file}#mutateAndForwardOrder:function`,
        kind: 'function',
        name: 'mutateAndForwardOrder',
        qualifiedName: 'mutateAndForwardOrder',
        file,
        signature: '(order: OrderDto, dynamicKey: string, untypedMeta: any) => OrderDto',
        evidence: { file, startLine: 87, endLine: 103 },
      },
      {
        id: `${file}#readOrderConsumer:function`,
        sourceId: `${file}#readOrderConsumer:function`,
        kind: 'function',
        name: 'readOrderConsumer',
        qualifiedName: 'readOrderConsumer',
        file,
        signature: '(repo: OrderRepository, orderId: string) => string',
        evidence: { file, startLine: 105, endLine: 108 },
      },
    ];

    const edges: CanonicalGraphEdge[] = [
      {
        kind: 'type_ref',
        from: `${file}#OrderRepository.saveOrder:function`,
        to: `${file}#OrderDto:interface`,
        evidence: { file, startLine: 70 },
      },
      {
        kind: 'accesses',
        from: `${file}#OrderRepository.saveOrder:function`,
        to: `${file}#OrderDto.id:variable`,
        evidence: { file, startLine: 71 },
      },
      {
        kind: 'type_ref',
        from: `${file}#OrderRepository.findOrder:function`,
        to: `${file}#OrderDto:interface`,
        evidence: { file, startLine: 74 },
      },
      {
        kind: 'type_ref',
        from: `${file}#mapEntityToOrderDto:function`,
        to: `${file}#OrderDto:interface`,
        evidence: { file, startLine: 79 },
      },
      {
        kind: 'type_ref',
        from: `${file}#mutateAndForwardOrder:function`,
        to: `${file}#OrderDto:interface`,
        evidence: { file, startLine: 88 },
      },
      {
        kind: 'accesses',
        from: `${file}#mutateAndForwardOrder:function`,
        to: `${file}#OrderDto.status:variable`,
        evidence: { file, startLine: 94 },
      },
      {
        kind: 'accesses',
        from: `${file}#mutateAndForwardOrder:function`,
        to: `${file}#OrderDto.totalCents:variable`,
        evidence: { file, startLine: 95 },
      },
      {
        kind: 'instantiates',
        from: `${file}#mutateAndForwardOrder:function`,
        to: `${file}#OrderRepository:class`,
        evidence: { file, startLine: 99 },
      },
      {
        kind: 'calls',
        from: `${file}#mutateAndForwardOrder:function`,
        to: `${file}#OrderRepository.saveOrder:function`,
        evidence: { file, startLine: 100 },
      },
      {
        kind: 'type_ref',
        from: `${file}#readOrderConsumer:function`,
        to: `${file}#OrderRepository:class`,
        evidence: { file, startLine: 105 },
      },
      {
        kind: 'calls',
        from: `${file}#readOrderConsumer:function`,
        to: `${file}#OrderRepository.findOrder:function`,
        evidence: { file, startLine: 106 },
      },
      {
        kind: 'accesses',
        from: `${file}#readOrderConsumer:function`,
        to: `${file}#OrderDto.status:variable`,
        evidence: { file, startLine: 107 },
      },
    ];

    return {
      contractVersion: '1.0',
      rootDir: '/virtual',
      tsconfigPath: '/virtual/tsconfig.json',
      fingerprint: 'fp-order-fixture',
      provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
      nodes,
      edges,
    };
  }

  function buildFixtureSpecGraph(): SpecGraphRevision {
    return {
      contractVersion: '1.0',
      revisionId: 'spec-rev-01',
      contentFingerprint: 'digest-01',
      workspaceId: 'tsdoc-edge',
      provenance: {
        source: 'managed-document',
        extractorId: 'tsdoc-spec',
        extractorVersion: '1.0.0',
        authoredSourceFingerprint: 'digest-01',
      },
      nodes: [
        {
          id: 'REQ-ORDER-DTO',
          kind: 'requirement',
          title: 'OrderDto must preserve checkout state invariants',
          lifecycle: { mode: 'independent', status: 'active' },
          source: {
            documentId: 'doc:order-spec',
            file: 'managed/specs/order-spec.md',
            symbol: 'OrderLifecycleSpecification',
            contentDigest: 'd1',
          },
          tags: ['commerce'],
        },
      ],
      edges: [],
      bindings: [
        {
          id: 'BIND-ORDER-DTO',
          kind: 'implementation',
          specNodeId: 'REQ-ORDER-DTO',
          source: {
            documentId: 'doc:order-spec',
            file: 'managed/specs/order-spec.md',
            symbol: 'OrderLifecycleSpecification',
            contentDigest: 'd1',
          },
          provenance: {
            extractor: 'tsdoc-spec',
            extractorVersion: '1.0.0',
            syntax: 'fenced-json',
          },
          target: {
            type: 'code-node',
            workspaceId: 'tsdoc-edge',
            graphNamespace: 'ttsc:tsdoc-edge',
            canonicalNodeId: 'src/domain/order.ts#OrderDto:interface',
          },
        } as unknown as SpecGraphRevision['bindings'][number],
      ],
    };
  }

  const readFile = (p: string): string | undefined => {
    const clean = p.replace(/^\/virtual\//, '');
    return virtualFiles[clean];
  };

  it('Tier 1: classifies Producer, Transformer, Writer, Reader, Consumer roles and Shared-State Junctions', () => {
    const service = new DataTraceService(buildFixtureGraph(), {
      specGraph: buildFixtureSpecGraph(),
      workspaceRoot: '/virtual',
      readFile,
    });

    const dtoReport = service.trace({
      target: 'OrderDto',
      tier: 'type-flow',
    });

    expect(dtoReport.status).toBe('found');
    expect(dtoReport.resolvedTargets[0]).toMatchObject({
      qualifiedName: 'OrderDto',
      origin: 'generated',
      authorityRole: 'derived',
    });

    const fields = dtoReport.typeFlow?.targetFields ?? [];
    expect(fields.map((f) => f.name)).toEqual(['id', 'status', 'totalCents']);
    expect(fields.find((f) => f.name === 'id')?.readonly).toBe(true);
    expect(fields.find((f) => f.name === 'status')?.literals).toEqual([
      'PENDING',
      'PAID',
      'SHIPPED',
    ]);
    expect(fields.find((f) => f.name === 'totalCents')?.constraints).toMatchObject({
      minimum: '0',
    });

    const usages = dtoReport.typeFlow?.roleClassifiedUsages ?? [];
    expect(usages.find((u) => u.symbolName === 'mapEntityToOrderDto')?.role).toBe('transformer');
    expect(usages.find((u) => u.symbolName === 'OrderRepository.findOrder')?.role).toBe('producer');
    expect(usages.find((u) => u.symbolName === 'mutateAndForwardOrder')?.role).toBe('writer');
    expect(usages.find((u) => u.symbolName === 'readOrderConsumer')?.role).toBe('reader');

    // Field-specific trace on `OrderDto.status`
    const statusReport = service.trace({
      target: 'OrderDto.status',
      tier: 'type-flow',
    });
    const statusUsages = statusReport.typeFlow?.roleClassifiedUsages ?? [];
    expect(statusUsages.find((u) => u.symbolName === 'mutateAndForwardOrder')?.role).toBe('writer');
    expect(statusUsages.find((u) => u.symbolName === 'readOrderConsumer')?.role).toBe('reader');

    // Shared-state junction between decoupled writer (`mutateAndForwardOrder`) and reader (`readOrderConsumer`)
    const bridgeReport = service.trace({
      target: 'mutateAndForwardOrder',
      toTarget: 'readOrderConsumer',
      tier: 'type-flow',
    });
    const junctions = bridgeReport.typeFlow?.sharedStateJunctions ?? [];
    expect(junctions.some((j) => j.junctionName === 'OrderRepository')).toBe(true);
  });

  it('Tier 2: extracts non-collapsing lineage across SpecGraph, @samchon/typespec-evidence, oa-sdk, Telemetry, and Repository Bridges', () => {
    const service = new DataTraceService(buildFixtureGraph(), {
      specGraph: buildFixtureSpecGraph(),
      workspaceRoot: '/virtual',
      readFile,
    });

    const report = service.trace({
      target: 'OrderDto',
      tier: 'boundary-lineage',
    });

    const lineage = report.boundaryLineage;
    expect(lineage).toBeDefined();
    expect(lineage?.lineageState).toBe('verified');

    // Checkpoints & SpecGraph bindings
    expect(lineage?.checkpoints.map((c) => c.checkpoint)).toEqual(
      expect.arrayContaining(['Order Lifecycle', 'OrderLifecycleSpecification'])
    );
    expect(lineage?.checkpoints.some((c) => c.specBindingId === 'BIND-ORDER-DTO')).toBe(true);

    // Ecosystem Evidence Artifacts (@samchon/typespec-evidence + .oa-trace.json)
    const artifactKinds = lineage?.evidenceArtifacts.map((a) => a.artifactKind) ?? [];
    expect(artifactKinds).toEqual(
      expect.arrayContaining([
        'EntityRoot',
        'AspectOf',
        'Storage',
        'Promotable',
        'Representation',
        'LookupKey',
        'OaTraceNode',
      ])
    );

    // Directional Provenance Links (never collapses into 'same-as')
    const relations = lineage?.provenanceLinks.map((l) => l.relation) ?? [];
    expect(relations).toEqual(
      expect.arrayContaining([
        'derives-from',
        'aspect-of',
        'stored-in',
        'promotes-to',
        'represents-id',
        'lookup-key-for',
        'replaces',
        'governs',
        'persists-to',
        'reads-from',
      ])
    );
    expect((relations as string[]).includes('same-as')).toBe(false);

    // Repository Read-Write Bridge
    const bridge = lineage?.persistenceBridges.find((b) => b.storeOrRepoName === 'OrderRepository');
    expect(bridge).toBeDefined();
    expect(bridge?.writers.map((w) => w.symbolName)).toContain('mutateAndForwardOrder');
    expect(bridge?.readers.map((r) => r.symbolName)).toContain('readOrderConsumer');

    // Telemetry symbols on function
    const fnLineage = service.trace({
      target: 'mutateAndForwardOrder',
      tier: 'boundary-lineage',
    }).boundaryLineage;
    expect(fnLineage?.telemetrySymbols.map((t) => t.symbol)).toContain('TX:BILLING:ORDER:SETTLE');
  });

  it('Tier 3: performs AST variable/parameter def-use slicing, inter-procedural call-binding, and flags all 4 trust-loss boundaries', () => {
    const service = new DataTraceService(buildFixtureGraph(), {
      workspaceRoot: '/virtual',
      readFile,
    });

    const report = service.trace({
      target: 'mutateAndForwardOrder(order)',
      tier: 'code-slice',
      maxDepth: 2,
    });

    const slices = report.codeSlice?.slices ?? [];
    expect(slices.length).toBeGreaterThanOrEqual(2);

    const primary = slices[0];
    expect(primary.functionName).toBe('mutateAndForwardOrder');
    const ops = primary.steps.map((s) => s.operation);
    expect(ops).toEqual(
      expect.arrayContaining([
        'PARAM_IN',
        'DESTRUCTURE',
        'LOCAL_ALIAS',
        'WRITE',
        'READ_WRITE',
        'PASS_AS_ARG',
        'RETURN',
      ])
    );

    const passStep = primary.steps.find(
      (s) => s.operation === 'PASS_AS_ARG' && s.calleeName === 'repo.saveOrder'
    );
    expect(passStep).toMatchObject({
      argIndex: 0,
      boundParamName: 'order',
    });

    // Inter-procedural 2nd hop into `OrderRepository.saveOrder`
    expect(slices.some((s) => s.functionName === 'OrderRepository.saveOrder')).toBe(true);

    // All 4 fail-closed trust-loss boundaries detected
    const boundaryKinds = primary.trustBoundaries.map((b) => b.kind);
    expect(boundaryKinds).toEqual(
      expect.arrayContaining([
        'boundary:any',
        'boundary:double-assertion',
        'boundary:unvalidated-deserialize',
        'boundary:dynamic-index',
      ])
    );
  });
});
