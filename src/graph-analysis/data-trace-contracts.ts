/**
 * Unified 3-Tier Data Trace contracts for TypeScript type/field flow, cross-boundary
 * domain data lineage (`tsdoc-edge` + `@samchon/typespec-evidence` + `oa-sdk`),
 * and on-demand AST variable/parameter dataflow slicing.
 *
 * @packageDocumentation
 * @doc [[Data Lineage and Slicing]]
 * @doc [[GraphAndPersistencePlaneSpecification]]
 * @context Compiler-neutral and AST-enriched data-tracing contracts uniting `@ttsc/graph` structural/behavioral edges, `SpecGraph` bindings, ecosystem provenance metadata, and fail-closed AST def-use slicing.
 * @functionality Defines request/response schemas for Tier 1 (Type & Field Flow), Tier 2 (Cross-Boundary Domain Data Lineage), and Tier 3 (Code-Level Variable & Parameter Dataflow Slicing).
 */

/**
 * Selectable data-tracing tier.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export type DataTraceTier = 'all' | 'type-flow' | 'boundary-lineage' | 'code-slice';

/**
 * Authorship origin of a traced symbol.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export type DataTraceOrigin = 'handwritten' | 'generated';

/**
 * Authority role of a traced symbol across specification and code boundaries.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export type DataTraceAuthorityRole = 'authority' | 'derived' | 'observation';

/**
 * Fail-closed lineage verification state aligned with `@ttsc/contract-provenance` and `oa-sdk`.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export type DataTraceLineageState =
  | 'verified'
  | 'unresolved'
  | 'partial'
  | 'stale'
  | 'conflict'
  | 'needs_review';

/**
 * Role played by a symbol touching a traced type or field in Tier 1.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export type DataTraceRole =
  | 'producer'
  | 'transformer'
  | 'writer'
  | 'reader'
  | 'consumer'
  | 'accessor';

/**
 * Directional, non-collapsing cross-boundary lineage relation kinds.
 * Never collapses distinct authority scopes into `same-as`.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export type DirectionalLineageRelation =
  | 'derives-from'
  | 'projects-to'
  | 'adapts-to'
  | 'aspect-of'
  | 'stored-in'
  | 'promotes-to'
  | 'represents-id'
  | 'lookup-key-for'
  | 'replaces'
  | 'persists-to'
  | 'reads-from'
  | 'governs'
  | 'emits-telemetry';

/**
 * Static dataflow trust-loss or fail-closed boundary kind in Tier 3.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export type TrustLossBoundaryKind =
  | 'boundary:any'
  | 'boundary:double-assertion'
  | 'boundary:unvalidated-deserialize'
  | 'boundary:dynamic-index';

/**
 * Input options for executing a 3-Tier Data Trace query.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceRequest {
  /** Target query: symbol ID, `Type.field`, `Class.method`, `[[Checkpoint]]`, or `func(param)`. */
  readonly target: string;
  /** Optional destination symbol for producer-to-consumer path and shared-state junction discovery. */
  readonly toTarget?: string;
  /** Which tier(s) to compute. Defaults to `'all'`. */
  readonly tier?: DataTraceTier;
  /** Maximum traversal/call-binding depth (1..6). Defaults to `3`. */
  readonly maxDepth?: number;
  /** Include test symbols (`__tests__`, `.test.ts`, `.spec.ts`). Defaults to `false`. */
  readonly includeTests?: boolean;
  /** Include external/stdlib symbols. Defaults to `false`. */
  readonly includeExternal?: boolean;
  /** Workspace root directory. Defaults to `process.cwd()`. */
  readonly workspaceRoot?: string;
}

/**
 * Normalized summary of a resolved target symbol or member node.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceTargetNodeSummary {
  readonly id: string;
  readonly name: string;
  readonly qualifiedName: string;
  readonly kind: string;
  readonly file?: string;
  readonly startLine?: number;
  readonly endLine?: number;
  readonly signature?: string;
  readonly modifiers: readonly string[];
  readonly literals: readonly string[];
  readonly enumMembers: readonly string[];
  readonly objectMembers: readonly {
    readonly name: string;
    readonly kind?: string;
    readonly line?: number;
    readonly signature?: string;
  }[];
  readonly origin: DataTraceOrigin;
  readonly authorityRole: DataTraceAuthorityRole;
  readonly constraints: Readonly<Record<string, string>>;
}

/**
 * Field or member descriptor inside a traced type, class, interface, or object literal.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceFieldMember {
  readonly id: string;
  readonly name: string;
  readonly qualifiedName: string;
  readonly kind: string;
  readonly file?: string;
  readonly line?: number;
  readonly signature?: string;
  readonly readonly: boolean;
  readonly literals: readonly string[];
  readonly referencedTypes: readonly string[];
  readonly constraints: Readonly<Record<string, string>>;
}

/**
 * Outgoing type reference from a traced type or field.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceOutgoingTypeRef {
  readonly fieldOrOwner: string;
  readonly targetId: string;
  readonly targetName: string;
  readonly targetKind: string;
  readonly file?: string;
  readonly line?: number;
}

/**
 * Symbol touching a traced type or field, classified by its dataflow role.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceRoleUsage {
  readonly symbolId: string;
  readonly symbolName: string;
  readonly symbolKind: string;
  readonly role: DataTraceRole;
  readonly edgeKind: string;
  readonly file?: string;
  readonly line?: number;
  readonly signature?: string;
  readonly evidenceSnippet?: string;
  readonly transformedFromType?: string;
  readonly transformedToType?: string;
}

/**
 * Polymorphic interface-to-implementation dispatch binding.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTracePolymorphicBinding {
  readonly interfaceMemberId: string;
  readonly interfaceMemberName: string;
  readonly concreteMemberId: string;
  readonly concreteMemberName: string;
  readonly relation: 'implements' | 'overrides' | 'dispatches';
  readonly file?: string;
  readonly line?: number;
}

/**
 * Shared state, property, or repository junction bridging two symbols (`junctionsBetween`).
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceSharedJunction {
  readonly junctionId: string;
  readonly junctionName: string;
  readonly junctionKind: string;
  readonly fromSymbolId: string;
  readonly toSymbolId: string;
  readonly fromAccessKind: string;
  readonly toAccessKind: string;
  readonly explanation: string;
}

/**
 * Tier 1 report: TypeScript Type & Field Flow (`DTO.field`, producers, transformers, writers, readers, consumers, junctions).
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface TypeFieldFlowReport {
  readonly targetFields: readonly DataTraceFieldMember[];
  readonly outgoingTypeRefs: readonly DataTraceOutgoingTypeRef[];
  readonly roleClassifiedUsages: readonly DataTraceRoleUsage[];
  readonly polymorphicDispatches: readonly DataTracePolymorphicBinding[];
  readonly sharedStateJunctions: readonly DataTraceSharedJunction[];
}

/**
 * Checkpoint and `SpecGraph` binding governing a traced symbol.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceCheckpointBinding {
  readonly checkpoint: string;
  readonly docPath?: string;
  readonly bindingRole: '@doc' | 'source' | 'spec-binding';
  readonly specBindingId?: string;
  readonly contracts: readonly string[];
  readonly invariants: readonly string[];
  readonly sideEffects: readonly string[];
}

/**
 * Directional cross-boundary provenance link (Tier 2).
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceProvenanceLink {
  readonly relation: DirectionalLineageRelation;
  readonly fromAuthority: string;
  readonly toTarget: string;
  readonly sourceKind:
    | 'tsdoc-tag'
    | 'typespec-evidence'
    | 'oa-sdk-jsdoc'
    | 'oa-trace-sidecar'
    | 'repository-bridge'
    | 'spec-graph'
    | 'telemetry';
  readonly evidence: string;
  readonly file?: string;
  readonly line?: number;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Recognized `@samchon/typespec-evidence` or `oa-sdk` metadata artifact descriptor.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceEvidenceArtifact {
  readonly symbolId: string;
  readonly symbolName: string;
  readonly artifactKind:
    | 'EntityRoot'
    | 'AspectOf'
    | 'Storage'
    | 'Strategy'
    | 'Promotable'
    | 'Representation'
    | 'LookupKey'
    | 'OaTraceNode';
  readonly file?: string;
  readonly line?: number;
  readonly properties: Readonly<Record<string, string>>;
}

/**
 * Persistence or repository read/write bridge connecting decoupled producers and consumers.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTracePersistenceBridge {
  readonly storeOrRepoSymbolId: string;
  readonly storeOrRepoName: string;
  readonly persistedType?: string;
  readonly writers: readonly {
    readonly symbolId: string;
    readonly symbolName: string;
    readonly method: string;
    readonly file?: string;
    readonly line?: number;
  }[];
  readonly readers: readonly {
    readonly symbolId: string;
    readonly symbolName: string;
    readonly method: string;
    readonly file?: string;
    readonly line?: number;
  }[];
}

/**
 * Telemetry / FSM tracking symbol reference (`UI:|FSM:|TX:|SYS:`).
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceTelemetrySymbol {
  readonly symbol: string;
  readonly plane: 'UI' | 'FSM' | 'TX' | 'SYS';
  readonly domain: string;
  readonly entity: string;
  readonly action: string;
  readonly qualifier?: string;
  readonly file?: string;
  readonly line?: number;
}

/**
 * Tier 2 report: Cross-Boundary Domain Data Lineage (`tsdoc-edge` + `samchon` + `oa-sdk` + Persistence Bridges).
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface CrossBoundaryLineageReport {
  readonly lineageState: DataTraceLineageState;
  readonly checkpoints: readonly DataTraceCheckpointBinding[];
  readonly provenanceLinks: readonly DataTraceProvenanceLink[];
  readonly evidenceArtifacts: readonly DataTraceEvidenceArtifact[];
  readonly persistenceBridges: readonly DataTracePersistenceBridge[];
  readonly telemetrySymbols: readonly DataTraceTelemetrySymbol[];
}

/**
 * Single step in an on-demand AST variable/parameter dataflow slice.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataflowSliceStep {
  readonly stepIndex: number;
  readonly operation:
    | 'PARAM_IN'
    | 'LOCAL_ALIAS'
    | 'DESTRUCTURE'
    | 'READ'
    | 'WRITE'
    | 'READ_WRITE'
    | 'PASS_AS_ARG'
    | 'AWAIT_CALL'
    | 'RETURN';
  readonly variableOrField: string;
  readonly expression: string;
  readonly line: number;
  readonly calleeName?: string;
  readonly argIndex?: number;
  readonly boundParamName?: string;
}

/**
 * Trust-loss or fail-closed boundary encountered during AST dataflow slicing.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataflowTrustBoundary {
  readonly kind: TrustLossBoundaryKind;
  readonly line: number;
  readonly expression: string;
  readonly reason: string;
  readonly failClosedStatus: 'indeterminate' | 'unvalidated' | 'type-erased';
}

/**
 * AST dataflow slice for one candidate function or method.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface FunctionDataflowSlice {
  readonly functionId: string;
  readonly functionName: string;
  readonly file: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly seedExpression: string;
  readonly steps: readonly DataflowSliceStep[];
  readonly trustBoundaries: readonly DataflowTrustBoundary[];
}

/**
 * Tier 3 report: On-demand TypeScript AST variable & parameter def-use slicing + trust-loss boundaries.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface CodeDataflowSliceReport {
  readonly slices: readonly FunctionDataflowSlice[];
  readonly totalSteps: number;
  readonly totalTrustBoundaries: number;
}

/**
 * Complete Unified 3-Tier Data Trace result.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceReport {
  readonly query: {
    readonly target: string;
    readonly toTarget?: string;
    readonly requestedParameter?: string;
    readonly tier: DataTraceTier;
    readonly maxDepth: number;
    readonly includeTests: boolean;
    readonly includeExternal: boolean;
  };
  readonly status: 'found' | 'ambiguous' | 'missing';
  readonly resolvedTargets: readonly DataTraceTargetNodeSummary[];
  readonly resolvedToTargets: readonly DataTraceTargetNodeSummary[];
  readonly candidateIds?: readonly string[];
  readonly typeFlow?: TypeFieldFlowReport;
  readonly boundaryLineage?: CrossBoundaryLineageReport;
  readonly codeSlice?: CodeDataflowSliceReport;
}
