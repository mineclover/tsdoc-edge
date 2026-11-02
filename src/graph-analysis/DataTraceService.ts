/**
 * Unified 3-Tier Data Trace Engine (`DataTraceService`).
 *
 * Combines:
 * - Tier 1: TypeScript Type & Field Flow (`DTO.field`, Producer / Transformer / Writer / Reader / Consumer roles, Polymorphic Dispatch, and Shared-State Junctions),
 * - Tier 2: Cross-Boundary Domain Data Lineage (`[[Checkpoint]]`, `SpecGraph`, `@samchon/typespec-evidence` constants & tags, `oa-sdk` `@oa-*` / `.oa-trace.json` / telemetry symbols, and Persistence/Repository read-write bridges without cross-authority identity collapse),
 * - Tier 3: On-Demand TypeScript AST Variable & Parameter Dataflow Slicing (`PARAM_IN`, `DESTRUCTURE`, `LOCAL_ALIAS`, `READ`, `WRITE`, `PASS_AS_ARG`, `RETURN`, and Fail-Closed Trust-Loss Boundaries).
 *
 * @packageDocumentation
 * @doc [[Data Lineage and Slicing]]
 * @doc [[GraphAndPersistencePlaneSpecification]]
 * @context Core semantic and AST data-tracing service over `CanonicalProjectGraph`, optional `SpecGraphRevision`, and on-demand TypeScript source files.
 * @functionality Resolves type, field, function, and checkpoint targets; classifies dataflow roles; extracts directional cross-boundary provenance; discovers shared-state and repository junctions; and slices intra/inter-procedural AST variable/parameter flows with trust-boundary detection.
 * @sideEffect filesystem: Reads TypeScript source files, managed Markdown documents, and optional `.oa-trace.json` / `.oa-manifest.json` sidecars on demand (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type {
  CanonicalGraphEdge,
  CanonicalGraphNode,
  CanonicalProjectGraph,
} from '../indexer/contracts';
import type { SpecGraphRevision } from '../spec-graph/contracts';
import { CanonicalGraphIndex } from './CanonicalGraphIndex';
import type {
  CodeDataflowSliceReport,
  CrossBoundaryLineageReport,
  DataflowSliceStep,
  DataflowTrustBoundary,
  DataTraceAuthorityRole,
  DataTraceCheckpointBinding,
  DataTraceEvidenceArtifact,
  DataTraceFieldMember,
  DataTraceLineageState,
  DataTraceOrigin,
  DataTraceOutgoingTypeRef,
  DataTracePersistenceBridge,
  DataTracePolymorphicBinding,
  DataTraceProvenanceLink,
  DataTraceReport,
  DataTraceRequest,
  DataTraceRole,
  DataTraceRoleUsage,
  DataTraceSharedJunction,
  DataTraceTargetNodeSummary,
  DataTraceTelemetrySymbol,
  DataTraceTier,
  DirectionalLineageRelation,
  FunctionDataflowSlice,
  TypeFieldFlowReport,
} from './data-trace-contracts';

/**
 * Optional configuration for constructing a `DataTraceService`.
 *
 * @doc [[Data Lineage and Slicing]]
 * @public
 */
export interface DataTraceServiceOptions {
  /** Compiled normative `SpecGraphRevision` for Tier 2 obligation and binding lookup. */
  readonly specGraph?: SpecGraphRevision | null;
  /** Workspace root directory used to resolve relative file paths. */
  readonly workspaceRoot?: string;
  /** Optional custom file reader for in-memory or virtual fixture testing. */
  readonly readFile?: (absoluteOrRelativePath: string) => string | undefined;
}

interface ParsedTargetQuery {
  readonly rawQuery: string;
  readonly symbolQuery: string;
  readonly requestedParameter?: string;
  readonly explicitMemberName?: string;
}

interface RawNodeMetadata {
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
  readonly docTags: readonly { readonly name: string; readonly text?: string }[];
  readonly parent?: string;
}

const TEST_FILE_PATTERN =
  /(?:^|[\\/])(?:__tests__|__mocks__|test|tests)[\\/]|(?:\.test|\.spec)\.[cm]?[jt]sx?$/i;
const EXTERNAL_FILE_PATTERN = /(?:bundled:|(?:^|[\\/])libs[\\/]|(?:^|[\\/])node_modules[\\/])/;
const TRACK_SYMBOL_REGEX =
  /\b(UI|FSM|TX|SYS):([A-Z0-9_]+):([A-Z0-9_]+):([A-Z0-9_]+)(?::([A-Z0-9_]+))?\b/g;
const WRITE_METHOD_REGEX =
  /^(?:replace|save|insert|update|upsert|write|put|create|delete|remove|prune|record|store|persist|commit|add|set|clear)/i;
const READ_METHOD_REGEX =
  /^(?:read|get|find|list|load|query|fetch|resolve|select|search|check|verify|has|count)/i;
const MAPPER_NAME_REGEX =
  /^(?:map|to[A-Z]|from[A-Z]|project|adapt|convert|transform|serialize|deserialize|parse|compile|extract|build)/;
const VALIDATOR_CALL_REGEX =
  /(?:\bvalidate\w*|\bsafeParse\b|\bparseAsync\b|\bassert\w*|\bguard\w*|\bverify\w*|\bis[A-Z]\w*\s*\(|\bensure\w*|(?:Schema|Validator|Type)\.parse\b)/;

const TYPESPEC_EVIDENCE_SUFFIXES = [
  { suffix: 'EntityRoot', kind: 'EntityRoot' as const, relation: 'governs' as const },
  { suffix: 'AspectOf', kind: 'AspectOf' as const, relation: 'aspect-of' as const },
  { suffix: 'Storage', kind: 'Storage' as const, relation: 'stored-in' as const },
  { suffix: 'Strategy', kind: 'Strategy' as const, relation: 'governs' as const },
  { suffix: 'Promotable', kind: 'Promotable' as const, relation: 'promotes-to' as const },
  { suffix: 'Representation', kind: 'Representation' as const, relation: 'represents-id' as const },
  { suffix: 'LookupKey', kind: 'LookupKey' as const, relation: 'lookup-key-for' as const },
] as const;

/**
 * Unified 3-Tier Data Trace service over `CanonicalProjectGraph`, `SpecGraphRevision`, and TypeScript AST.
 *
 * @doc [[Data Lineage and Slicing]]
 * @doc [[GraphAndPersistencePlaneSpecification]]
 * @public
 */
export class DataTraceService {
  readonly index: CanonicalGraphIndex;
  private readonly specGraph?: SpecGraphRevision | null;
  private readonly workspaceRoot: string;
  private readonly customReadFile?: (filePath: string) => string | undefined;
  private readonly sourceFileCache = new Map<string, ts.SourceFile | null>();
  private readonly rawTextCache = new Map<string, string | null>();
  private readonly childrenByParentId = new Map<string, CanonicalGraphNode[]>();

  /**
   * Construct a `DataTraceService` bound to a canonical project graph revision.
   *
   * @param graph - Active `CanonicalProjectGraph` snapshot
   * @param options - Optional `SpecGraphRevision`, workspace root, and virtual file reader
   */
  constructor(
    readonly graph: CanonicalProjectGraph,
    options: DataTraceServiceOptions = {}
  ) {
    this.index = new CanonicalGraphIndex(graph);
    this.specGraph = options.specGraph ?? null;
    this.workspaceRoot = options.workspaceRoot ?? graph.rootDir ?? process.cwd();
    this.customReadFile = options.readFile;

    for (const node of graph.nodes) {
      const parentId = typeof node.parent === 'string' ? node.parent : undefined;
      if (parentId) {
        const list = this.childrenByParentId.get(parentId) ?? [];
        list.push(node);
        this.childrenByParentId.set(parentId, list);
      }
    }
  }

  /**
   * Execute a 3-Tier Data Trace query (`type-flow`, `boundary-lineage`, `code-slice`, or `all`).
   *
   * @param request - Target symbol/field/function query and traversal options
   * @returns Complete deterministic `DataTraceReport`
   * @public
   */
  trace(request: DataTraceRequest): DataTraceReport {
    const tier: DataTraceTier = request.tier ?? 'all';
    const maxDepth = clampDepth(request.maxDepth, 3);
    const includeTests = request.includeTests === true;
    const includeExternal = request.includeExternal === true;
    const parsedQuery = parseTargetQuery(request.target);

    const resolution = this.resolveTargetNodes(parsedQuery, includeTests, includeExternal);
    const toResolution = request.toTarget
      ? this.resolveTargetNodes(parseTargetQuery(request.toTarget), includeTests, includeExternal)
      : { status: 'missing' as const, nodes: [] as readonly CanonicalGraphNode[] };

    if (resolution.status === 'missing') {
      return {
        query: {
          target: request.target,
          toTarget: request.toTarget,
          requestedParameter: parsedQuery.requestedParameter,
          tier,
          maxDepth,
          includeTests,
          includeExternal,
        },
        status: 'missing',
        resolvedTargets: [],
        resolvedToTargets: [],
      };
    }

    const resolvedSummaries = resolution.nodes.map((node) =>
      this.summarizeTargetNode(node, parsedQuery.explicitMemberName)
    );
    const resolvedToSummaries = toResolution.nodes.map((node) => this.summarizeTargetNode(node));

    const typeFlow = this.buildTypeFieldFlow(
      resolution.nodes,
      toResolution.nodes,
      parsedQuery,
      maxDepth,
      includeTests,
      includeExternal
    );

    const boundaryLineage =
      tier === 'all' || tier === 'boundary-lineage'
        ? this.buildCrossBoundaryLineage(
            resolution.nodes,
            toResolution.nodes,
            typeFlow,
            includeTests
          )
        : undefined;

    const codeSlice =
      tier === 'all' || tier === 'code-slice'
        ? this.buildCodeDataflowSlice(
            resolution.nodes,
            parsedQuery,
            typeFlow,
            maxDepth,
            includeTests
          )
        : undefined;

    return {
      query: {
        target: request.target,
        toTarget: request.toTarget,
        requestedParameter: parsedQuery.requestedParameter,
        tier,
        maxDepth,
        includeTests,
        includeExternal,
      },
      status: resolution.status,
      resolvedTargets: resolvedSummaries,
      resolvedToTargets: resolvedToSummaries,
      candidateIds:
        resolution.status === 'ambiguous' ? resolution.nodes.map((n) => n.id) : undefined,
      typeFlow: tier === 'all' || tier === 'type-flow' ? typeFlow : undefined,
      boundaryLineage,
      codeSlice,
    };
  }

  private resolveTargetNodes(
    parsed: ParsedTargetQuery,
    includeTests: boolean,
    includeExternal: boolean
  ): {
    readonly status: 'found' | 'ambiguous' | 'missing';
    readonly nodes: readonly CanonicalGraphNode[];
  } {
    const query = parsed.symbolQuery;
    const exact = this.index.getNode(query);

    const filterCandidates = (nodes: readonly CanonicalGraphNode[]): CanonicalGraphNode[] => {
      return nodes.filter((node) => {
        if (!includeExternal && isExternalNode(node)) return false;
        if (!includeTests && isTestNode(node)) return false;
        return true;
      });
    };

    if (exact) {
      const filteredExact = filterCandidates([exact]);
      return filteredExact.length > 0
        ? { status: 'found', nodes: filteredExact }
        : { status: 'missing', nodes: [] };
    }

    const byQualified = filterCandidates(this.index.getNodesByQualifiedName(query));
    if (byQualified.length > 0) {
      return classifyCandidateSet(byQualified);
    }

    const byName = filterCandidates(this.index.getNodesByName(query));
    if (byName.length > 0) {
      return classifyCandidateSet(byName);
    }

    // Check suffix match on qualifiedName (e.g., `Class.method` or `Interface.prop`)
    const suffixMatches = filterCandidates(
      this.graph.nodes.filter(
        (node) =>
          node.qualifiedName === query ||
          node.qualifiedName?.endsWith(`.${query}`) === true ||
          node.id.includes(`#${query}:`)
      )
    );
    if (suffixMatches.length > 0) {
      return classifyCandidateSet(suffixMatches);
    }

    // Check `Owner.member` where `Owner` is an object-literal constant with `objectMembers`
    const dotIndex = query.lastIndexOf('.');
    if (dotIndex > 0) {
      const ownerQuery = query.slice(0, dotIndex);
      const memberName = query.slice(dotIndex + 1);
      const ownerCandidates = filterCandidates([
        ...this.index.getNodesByQualifiedName(ownerQuery),
        ...this.index.getNodesByName(ownerQuery),
      ]);
      if (ownerCandidates.length > 0) {
        const matchingChildren = uniqueNodes(
          ownerCandidates.flatMap((owner) =>
            this.getChildMemberNodes(owner).filter((child) => child.name === memberName)
          )
        );
        if (matchingChildren.length > 0) return classifyCandidateSet(matchingChildren);

        const matchingOwners = ownerCandidates.filter((owner) =>
          extractRawNodeMetadata(owner).objectMembers.some((member) => member.name === memberName)
        );
        if (matchingOwners.length > 0) return classifyCandidateSet(matchingOwners);
      }
    }

    return { status: 'missing', nodes: [] };
  }

  private summarizeTargetNode(
    node: CanonicalGraphNode,
    explicitMemberName?: string
  ): DataTraceTargetNodeSummary {
    const meta = extractRawNodeMetadata(node);
    const sourceText = this.readNodeSourceText(node);
    const origin = detectOrigin(node, meta, sourceText);
    const authorityRole = detectAuthorityRole(node, meta, origin);
    const constraints = extractPropertyConstraints(meta.docTags, meta.modifiers);

    if (explicitMemberName) {
      const objMember = meta.objectMembers.find((m) => m.name === explicitMemberName);
      if (objMember) {
        return {
          id: `${node.id}.${explicitMemberName}`,
          name: explicitMemberName,
          qualifiedName: `${node.qualifiedName ?? node.name ?? node.id}.${explicitMemberName}`,
          kind: objMember.kind ?? 'property',
          file: node.file ?? node.evidence?.file,
          startLine: objMember.line ?? node.evidence?.startLine,
          endLine: objMember.line ?? node.evidence?.endLine,
          signature: objMember.signature,
          modifiers: meta.modifiers,
          literals: [],
          enumMembers: [],
          objectMembers: [],
          origin,
          authorityRole,
          constraints,
        };
      }
    }

    return {
      id: node.id,
      name: node.name ?? node.id,
      qualifiedName: node.qualifiedName ?? node.name ?? node.id,
      kind: node.kind,
      file: node.file ?? node.evidence?.file,
      startLine: node.evidence?.startLine,
      endLine: node.evidence?.endLine,
      signature: meta.signature,
      modifiers: meta.modifiers,
      literals: meta.literals,
      enumMembers: meta.enumMembers,
      objectMembers: meta.objectMembers,
      origin,
      authorityRole,
      constraints,
    };
  }

  /**
   * Build Tier 1 (`TypeFieldFlowReport`): fields, outgoing `type_ref`s, role-classified usages
   * (`producer`, `transformer`, `writer`, `reader`, `consumer`), polymorphic dispatches, and
   * shared-state junctions (`junctionsBetween`).
   */
  private buildTypeFieldFlow(
    targetNodes: readonly CanonicalGraphNode[],
    toNodes: readonly CanonicalGraphNode[],
    parsedQuery: ParsedTargetQuery,
    maxDepth: number,
    includeTests: boolean,
    includeExternal: boolean
  ): TypeFieldFlowReport {
    const targetFields: DataTraceFieldMember[] = [];
    const outgoingTypeRefs: DataTraceOutgoingTypeRef[] = [];
    const roleUsages = new Map<string, DataTraceRoleUsage>();
    const polymorphicDispatches: DataTracePolymorphicBinding[] = [];

    for (const target of targetNodes) {
      const meta = extractRawNodeMetadata(target);
      const isFieldTarget =
        target.kind !== 'function' &&
        target.kind !== 'class' &&
        target.kind !== 'interface' &&
        target.kind !== 'type' &&
        target.kind !== 'enum' &&
        (Boolean(meta.parent) ||
          Boolean(parsedQuery.explicitMemberName) ||
          (target.qualifiedName?.includes('.') === true && target.kind === 'variable'));

      // 1. Collect targetFields
      if (isFieldTarget) {
        const fieldTypeRefs = this.index
          .getOutgoingEdges(target.id)
          .filter((e) => e.kind === 'type_ref')
          .map((e) => this.index.getNode(e.to)?.qualifiedName ?? e.to);
        targetFields.push({
          id: target.id,
          name: parsedQuery.explicitMemberName ?? target.name ?? target.id,
          qualifiedName: target.qualifiedName ?? target.name ?? target.id,
          kind: target.kind,
          file: target.file ?? target.evidence?.file,
          line: target.evidence?.startLine,
          signature: meta.signature,
          readonly: meta.modifiers.includes('readonly'),
          literals: meta.literals,
          referencedTypes: fieldTypeRefs,
          constraints: extractPropertyConstraints(meta.docTags, meta.modifiers),
        });
      } else {
        const childNodes = this.getChildMemberNodes(target);
        for (const child of childNodes) {
          const childMeta = extractRawNodeMetadata(child);
          const childTypeRefs = this.index
            .getOutgoingEdges(child.id)
            .filter((e) => e.kind === 'type_ref')
            .map((e) => this.index.getNode(e.to)?.qualifiedName ?? e.to);
          targetFields.push({
            id: child.id,
            name: child.name ?? child.id,
            qualifiedName: child.qualifiedName ?? child.name ?? child.id,
            kind: child.kind,
            file: child.file ?? child.evidence?.file,
            line: child.evidence?.startLine,
            signature: childMeta.signature,
            readonly: childMeta.modifiers.includes('readonly'),
            literals: childMeta.literals,
            referencedTypes: childTypeRefs,
            constraints: extractPropertyConstraints(childMeta.docTags, childMeta.modifiers),
          });
        }
        for (const objMember of meta.objectMembers) {
          if (targetFields.some((f) => f.name === objMember.name)) continue;
          targetFields.push({
            id: `${target.id}.${objMember.name}`,
            name: objMember.name,
            qualifiedName: `${target.qualifiedName ?? target.name}.${objMember.name}`,
            kind: objMember.kind ?? 'property',
            file: target.file ?? target.evidence?.file,
            line: objMember.line ?? target.evidence?.startLine,
            signature: objMember.signature,
            readonly: meta.modifiers.includes('readonly'),
            literals: [],
            referencedTypes: [],
            constraints: {},
          });
        }
      }

      // 2. Outgoing type_refs
      const nodesForOutgoing = isFieldTarget
        ? [target]
        : [target, ...this.getChildMemberNodes(target)];
      for (const sourceNode of nodesForOutgoing) {
        for (const edge of this.index.getOutgoingEdges(sourceNode.id)) {
          if (edge.kind !== 'type_ref' && edge.kind !== 'extends' && edge.kind !== 'implements') {
            continue;
          }
          const refNode = this.index.getNode(edge.to);
          if (!refNode) continue;
          if (!includeExternal && isExternalNode(refNode)) continue;
          outgoingTypeRefs.push({
            fieldOrOwner: sourceNode.qualifiedName ?? sourceNode.name ?? sourceNode.id,
            targetId: refNode.id,
            targetName: refNode.qualifiedName ?? refNode.name ?? refNode.id,
            targetKind: refNode.kind,
            file: edge.evidence?.file ?? sourceNode.file,
            line: edge.evidence?.startLine ?? sourceNode.evidence?.startLine,
          });
        }
      }

      // 3. Incoming edges & Role Classification
      const relevantTargetIds = new Set<string>([target.id]);
      if (!isFieldTarget) {
        for (const child of this.getChildMemberNodes(target)) {
          relevantTargetIds.add(child.id);
        }
      }

      const incomingEdges: CanonicalGraphEdge[] = [];
      for (const targetId of relevantTargetIds) {
        incomingEdges.push(...this.index.getIncomingEdges(targetId));
      }

      // If tracing a specific field `Owner.field`, also inspect functions that reference `Owner` via `type_ref` or `accesses`
      const fieldNameForAst = isFieldTarget
        ? (parsedQuery.explicitMemberName ?? extractFieldShortName(target))
        : undefined;
      if (isFieldTarget && meta.parent) {
        const parentIncoming = this.index.getIncomingEdges(meta.parent);
        for (const edge of parentIncoming) {
          if (
            edge.kind === 'type_ref' ||
            edge.kind === 'accesses' ||
            edge.kind === 'instantiates'
          ) {
            incomingEdges.push(edge);
          }
        }
      }

      for (const edge of incomingEdges) {
        if (edge.kind === 'contains' || edge.kind === 'exports') continue;
        const caller = this.index.getNode(edge.from);
        if (!caller) continue;
        if (relevantTargetIds.has(caller.id)) continue;
        if (!includeExternal && isExternalNode(caller)) continue;
        if (!includeTests && isTestNode(caller)) continue;

        // Polymorphic dispatch edges
        if (edge.kind === 'implements' || edge.kind === 'overrides' || edge.kind === 'dispatches') {
          const interfaceNode =
            edge.kind === 'dispatches' ? caller : (this.index.getNode(edge.to) ?? target);
          const concreteNode = edge.kind === 'dispatches' ? target : caller;
          polymorphicDispatches.push({
            interfaceMemberId: interfaceNode.id,
            interfaceMemberName:
              interfaceNode.qualifiedName ?? interfaceNode.name ?? interfaceNode.id,
            concreteMemberId: concreteNode.id,
            concreteMemberName: concreteNode.qualifiedName ?? concreteNode.name ?? concreteNode.id,
            relation: edge.kind,
            file: edge.evidence?.file ?? caller.file,
            line: edge.evidence?.startLine ?? caller.evidence?.startLine,
          });
          continue;
        }

        // Container Double-Attribution Filtering:
        // If `caller` is a class/interface container and one of its methods also has an edge to the target, skip the container duplicate.
        const callerChildren = this.childrenByParentId.get(caller.id) ?? [];
        if (
          (caller.kind === 'class' || caller.kind === 'interface') &&
          callerChildren.some((c) => incomingEdges.some((e) => e.from === c.id))
        ) {
          continue;
        }

        const classified = this.classifyTouchingSymbolRole(caller, target, edge, fieldNameForAst);
        if (!classified) continue;

        const existing = roleUsages.get(caller.id);
        if (!existing || rolePriority(classified.role) > rolePriority(existing.role)) {
          roleUsages.set(caller.id, classified);
        }
      }

      // Outgoing polymorphic edges (when target is concrete class/method implementing an interface)
      for (const edge of this.index.getOutgoingEdges(target.id)) {
        if (edge.kind === 'implements' || edge.kind === 'overrides' || edge.kind === 'dispatches') {
          const interfaceNode = edge.kind === 'dispatches' ? target : this.index.getNode(edge.to);
          const concreteNode = edge.kind === 'dispatches' ? this.index.getNode(edge.to) : target;
          if (!interfaceNode || !concreteNode) continue;
          polymorphicDispatches.push({
            interfaceMemberId: interfaceNode.id,
            interfaceMemberName:
              interfaceNode.qualifiedName ?? interfaceNode.name ?? interfaceNode.id,
            concreteMemberId: concreteNode.id,
            concreteMemberName: concreteNode.qualifiedName ?? concreteNode.name ?? concreteNode.id,
            relation: edge.kind,
            file: edge.evidence?.file ?? target.file,
            line: edge.evidence?.startLine ?? target.evidence?.startLine,
          });
        }
      }
    }

    // 4. Shared-State Junctions (`junctionsBetween`)
    const sharedStateJunctions = this.discoverSharedStateJunctions(
      targetNodes,
      toNodes,
      [...roleUsages.values()],
      maxDepth,
      includeTests,
      includeExternal
    );

    const sortedUsages = [...roleUsages.values()].sort(
      (a, b) =>
        rolePriority(b.role) - rolePriority(a.role) || compareStrings(a.symbolName, b.symbolName)
    );

    return {
      targetFields,
      outgoingTypeRefs: dedupeByKey(outgoingTypeRefs, (r) => `${r.fieldOrOwner}->${r.targetId}`),
      roleClassifiedUsages: sortedUsages,
      polymorphicDispatches: dedupeByKey(
        polymorphicDispatches,
        (p) => `${p.interfaceMemberId}:${p.concreteMemberId}:${p.relation}`
      ),
      sharedStateJunctions,
    };
  }

  private classifyTouchingSymbolRole(
    caller: CanonicalGraphNode,
    target: CanonicalGraphNode,
    edge: CanonicalGraphEdge,
    fieldNameForAst?: string
  ): DataTraceRoleUsage | undefined {
    const callerMeta = extractRawNodeMetadata(caller);
    const targetName = target.name ?? '';
    const file = edge.evidence?.file ?? caller.file ?? caller.evidence?.file;
    const line = edge.evidence?.startLine ?? caller.evidence?.startLine;

    // If tracing a specific field `Owner.field`, inspect the AST of `caller` for `.field` or `{ field }`
    if (fieldNameForAst) {
      const astFieldAccess = this.inspectAstFieldAccess(caller, fieldNameForAst);
      if (astFieldAccess) {
        return {
          symbolId: caller.id,
          symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
          symbolKind: caller.kind,
          role: astFieldAccess.isWrite ? 'writer' : 'reader',
          edgeKind: edge.kind,
          file,
          line: astFieldAccess.line ?? line,
          signature: callerMeta.signature,
          evidenceSnippet: astFieldAccess.snippet,
        };
      }
      // If `edge` was only to the parent container and `caller` never touches `fieldNameForAst`, skip it!
      if (edge.to !== target.id) {
        return undefined;
      }
    }

    // Check AST L-value/R-value for direct `accesses` edges
    if (edge.kind === 'accesses') {
      const accessedNode = this.index.getNode(edge.to) ?? target;
      const memberName = extractFieldShortName(accessedNode);
      const astAccess = this.inspectAstFieldAccess(caller, memberName);
      if (astAccess) {
        return {
          symbolId: caller.id,
          symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
          symbolKind: caller.kind,
          role: astAccess.isWrite ? 'writer' : 'reader',
          edgeKind: edge.kind,
          file,
          line: astAccess.line ?? line,
          signature: callerMeta.signature,
          evidenceSnippet: astAccess.snippet,
        };
      }
      return {
        symbolId: caller.id,
        symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
        symbolKind: caller.kind,
        role: 'reader',
        edgeKind: edge.kind,
        file,
        line,
        signature: callerMeta.signature,
      };
    }

    if (edge.kind === 'instantiates') {
      return {
        symbolId: caller.id,
        symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
        symbolKind: caller.kind,
        role: 'producer',
        edgeKind: edge.kind,
        file,
        line,
        signature: callerMeta.signature,
      };
    }

    // Classify `type_ref` / `calls` by signature analysis (`producer` vs `transformer` vs `consumer`)
    const sig = callerMeta.signature ?? '';
    const parsedSig = parseFunctionSignatureTypes(sig);
    if (parsedSig && targetName) {
      const inParams = parsedSig.paramTypes.some((p) => containsTypeIdentifier(p, targetName));
      const inReturn = containsTypeIdentifier(parsedSig.returnType, targetName);
      const otherDomainParams = parsedSig.paramTypes.filter(
        (p) => !containsTypeIdentifier(p, targetName) && !isPrimitiveTypeString(p)
      );
      const hasNonTrivialReturn =
        Boolean(parsedSig.returnType) &&
        !isPrimitiveOrVoidReturn(parsedSig.returnType) &&
        !containsTypeIdentifier(parsedSig.returnType, targetName);

      if (inReturn && (otherDomainParams.length > 0 || MAPPER_NAME_REGEX.test(caller.name ?? ''))) {
        return {
          symbolId: caller.id,
          symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
          symbolKind: caller.kind,
          role: 'transformer',
          edgeKind: edge.kind,
          file,
          line,
          signature: callerMeta.signature,
          transformedFromType: otherDomainParams[0] ?? 'input',
          transformedToType: parsedSig.returnType,
        };
      }
      if (inReturn) {
        return {
          symbolId: caller.id,
          symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
          symbolKind: caller.kind,
          role: 'producer',
          edgeKind: edge.kind,
          file,
          line,
          signature: callerMeta.signature,
        };
      }
      if (inParams && hasNonTrivialReturn && MAPPER_NAME_REGEX.test(caller.name ?? '')) {
        return {
          symbolId: caller.id,
          symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
          symbolKind: caller.kind,
          role: 'transformer',
          edgeKind: edge.kind,
          file,
          line,
          signature: callerMeta.signature,
          transformedFromType: targetName,
          transformedToType: parsedSig.returnType,
        };
      }
      if (inParams) {
        return {
          symbolId: caller.id,
          symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
          symbolKind: caller.kind,
          role: 'consumer',
          edgeKind: edge.kind,
          file,
          line,
          signature: callerMeta.signature,
        };
      }
    }

    return {
      symbolId: caller.id,
      symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
      symbolKind: caller.kind,
      role: edge.kind === 'calls' ? 'consumer' : 'accessor',
      edgeKind: edge.kind,
      file,
      line,
      signature: callerMeta.signature,
    };
  }

  /**
   * Discover shared-state, property, and repository junctions (`junctionsBetween`) connecting
   * `targetNodes` and `toNodes` (or connecting decoupled producers/writers and consumers/readers).
   */
  private discoverSharedStateJunctions(
    fromNodes: readonly CanonicalGraphNode[],
    toNodes: readonly CanonicalGraphNode[],
    usages: readonly DataTraceRoleUsage[],
    maxDepth: number,
    includeTests: boolean,
    includeExternal: boolean
  ): readonly DataTraceSharedJunction[] {
    const junctions: DataTraceSharedJunction[] = [];
    const pairs: Array<{ from: CanonicalGraphNode; to: CanonicalGraphNode }> = [];

    if (toNodes.length > 0) {
      for (const from of fromNodes.slice(0, 3)) {
        for (const to of toNodes.slice(0, 3)) {
          if (from.id !== to.id) pairs.push({ from, to });
        }
      }
    } else {
      const producers = usages
        .filter((u) => u.role === 'producer' || u.role === 'writer')
        .slice(0, 3);
      const consumers = usages
        .filter((u) => u.role === 'consumer' || u.role === 'reader' || u.role === 'transformer')
        .slice(0, 3);
      for (const p of producers) {
        const fromNode = this.index.getNode(p.symbolId);
        if (!fromNode) continue;
        for (const c of consumers) {
          if (p.symbolId === c.symbolId) continue;
          const toNode = this.index.getNode(c.symbolId);
          if (toNode) pairs.push({ from: fromNode, to: toNode });
        }
      }
    }

    for (const { from, to } of pairs) {
      const fromReach = this.collectForwardReach(from.id, maxDepth, includeTests, includeExternal);
      const toReach = this.collectForwardReach(to.id, maxDepth, includeTests, includeExternal);

      for (const [candidateId, fromEdge] of fromReach.entries()) {
        const toEdge = toReach.get(candidateId);
        const candidateNode = this.index.getNode(candidateId);
        if (!candidateNode) continue;

        if (toEdge && isSharedStateOrStoreCandidate(candidateNode)) {
          junctions.push({
            junctionId: candidateNode.id,
            junctionName: candidateNode.qualifiedName ?? candidateNode.name ?? candidateNode.id,
            junctionKind: candidateNode.kind,
            fromSymbolId: from.id,
            toSymbolId: to.id,
            fromAccessKind: fromEdge.kind,
            toAccessKind: toEdge.kind,
            explanation: `${from.qualifiedName ?? from.name} (${fromEdge.kind}) and ${to.qualifiedName ?? to.name} (${toEdge.kind}) converge on shared ${candidateNode.kind} ${candidateNode.qualifiedName ?? candidateNode.name}`,
          });
        }
      }

      // Also check if `from` and `to` call different methods on the same parent class/repository!
      for (const [fromTargetId, fromEdge] of fromReach.entries()) {
        const fromTarget = this.index.getNode(fromTargetId);
        const parentId = typeof fromTarget?.parent === 'string' ? fromTarget.parent : undefined;
        if (!fromTarget || !parentId) continue;
        const parentNode = this.index.getNode(parentId);
        if (!parentNode || !isSharedStateOrStoreCandidate(parentNode)) continue;

        for (const [toTargetId, toEdge] of toReach.entries()) {
          if (fromTargetId === toTargetId) continue;
          const toTarget = this.index.getNode(toTargetId);
          if (toTarget?.parent !== parentId) continue;
          junctions.push({
            junctionId: parentNode.id,
            junctionName: parentNode.qualifiedName ?? parentNode.name ?? parentNode.id,
            junctionKind: parentNode.kind,
            fromSymbolId: from.id,
            toSymbolId: to.id,
            fromAccessKind: `${fromEdge.kind} ${fromTarget.name ?? fromTarget.id}`,
            toAccessKind: `${toEdge.kind} ${toTarget.name ?? toTarget.id}`,
            explanation: `${from.qualifiedName ?? from.name} invokes ${fromTarget.qualifiedName ?? fromTarget.name} while ${to.qualifiedName ?? to.name} invokes ${toTarget.qualifiedName ?? toTarget.name} on shared container ${parentNode.qualifiedName ?? parentNode.name}`,
          });
        }
      }
    }

    return dedupeByKey(junctions, (j) => `${j.fromSymbolId}->${j.junctionId}<-${j.toSymbolId}`);
  }

  private collectForwardReach(
    seedId: string,
    maxDepth: number,
    includeTests: boolean,
    includeExternal: boolean
  ): Map<string, CanonicalGraphEdge> {
    const reached = new Map<string, CanonicalGraphEdge>();
    const queue: Array<{ id: string; depth: number }> = [{ id: seedId, depth: 0 }];
    const visited = new Set<string>([seedId]);

    // Also include child methods if `seedId` is a class
    for (const child of this.childrenByParentId.get(seedId) ?? []) {
      visited.add(child.id);
      queue.push({ id: child.id, depth: 0 });
    }

    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      if (current.depth >= maxDepth) continue;
      for (const edge of this.index.getOutgoingEdges(current.id)) {
        if (
          edge.kind !== 'calls' &&
          edge.kind !== 'accesses' &&
          edge.kind !== 'instantiates' &&
          edge.kind !== 'dispatches'
        ) {
          continue;
        }
        const nextNode = this.index.getNode(edge.to);
        if (!nextNode) continue;
        if (!includeExternal && isExternalNode(nextNode)) continue;
        if (!includeTests && isTestNode(nextNode)) continue;
        if (!reached.has(nextNode.id)) {
          reached.set(nextNode.id, edge);
        }
        if (!visited.has(nextNode.id)) {
          visited.add(nextNode.id);
          queue.push({ id: nextNode.id, depth: current.depth + 1 });
        }
      }
    }
    return reached;
  }

  /**
   * Build Tier 2 (`CrossBoundaryLineageReport`):
   * - `[[Checkpoint]]` & `SpecGraph` bindings (`@contract`, `@invariant`, `@sideEffect`),
   * - `@samchon/typespec-evidence` constants (`*EntityRoot`, `*AspectOf`, `*Storage`, `*Strategy`, `*Promotable`, `*Representation`, `*LookupKey`) and `@evidence` / `TypeSpec source:` JSDoc,
   * - `oa-sdk` `@oa-*`, `@derivedFrom`, `@storageRef`, `@intent`, `.oa-trace.json` sidecar, and `UI:|FSM:|TX:|SYS:` telemetry symbols,
   * - Persistence / Repository read-write bridges.
   */
  private buildCrossBoundaryLineage(
    targetNodes: readonly CanonicalGraphNode[],
    toNodes: readonly CanonicalGraphNode[],
    typeFlow: TypeFieldFlowReport | undefined,
    includeTests: boolean
  ): CrossBoundaryLineageReport {
    const checkpoints: DataTraceCheckpointBinding[] = [];
    const provenanceLinks: DataTraceProvenanceLink[] = [];
    const evidenceArtifacts: DataTraceEvidenceArtifact[] = [];
    const telemetrySymbols: DataTraceTelemetrySymbol[] = [];
    let needsReview = false;

    const inspectNodes = [...targetNodes, ...toNodes];
    for (const node of inspectNodes) {
      const parentNode =
        typeof node.parent === 'string' ? this.index.getNode(node.parent) : undefined;
      const meta = extractRawNodeMetadata(node);
      const parentMeta = parentNode ? extractRawNodeMetadata(parentNode) : undefined;
      const allTags = [...meta.docTags, ...(parentMeta?.docTags ?? [])];
      const fileText = this.readNodeSourceText(node) ?? '';
      const nodeLeadingComment = this.extractLeadingJsDocText(node, fileText);
      const fileHeaderComment = extractFileHeaderJsDoc(fileText);
      const combinedCommentText = `${fileHeaderComment}\n${nodeLeadingComment}`;

      // 1. Extract TSDoc checkpoints (`@doc [[...]]`), `@contract`, `@invariant`, `@sideEffect`
      const contracts = extractTagValues(allTags, combinedCommentText, 'contract');
      const invariants = extractTagValues(allTags, combinedCommentText, 'invariant');
      const sideEffects = extractTagValues(allTags, combinedCommentText, 'sideEffect');
      const docCheckpoints = extractDocCheckpoints(allTags, combinedCommentText);

      for (const cp of docCheckpoints) {
        checkpoints.push({
          checkpoint: cp,
          bindingRole: '@doc',
          contracts,
          invariants,
          sideEffects,
        });
      }

      // 2. Match normative `SpecGraphRevision` bindings if available
      if (this.specGraph) {
        for (const binding of this.specGraph.bindings) {
          if (matchesSpecBinding(binding, node, parentNode)) {
            const specNode = this.specGraph.nodes.find((n) => n.id === binding.specNodeId);
            const checkpointName = specNode?.source.symbol ?? binding.specNodeId;
            checkpoints.push({
              checkpoint: checkpointName,
              docPath: binding.source.file,
              bindingRole: 'spec-binding',
              specBindingId: binding.id,
              contracts,
              invariants,
              sideEffects,
            });
            provenanceLinks.push({
              relation: 'governs',
              fromAuthority: `${binding.source.file}#${binding.specNodeId}`,
              toTarget: node.qualifiedName ?? node.name ?? node.id,
              sourceKind: 'spec-graph',
              evidence: `${binding.id} (${binding.kind})`,
              file: binding.source.file,
              line: binding.source.range?.startLine,
            });
          }
        }
      }

      // 3. Extract `TypeSpec source:`, `@evidence`, `## @evidence`, `@evidenceReview`, and `oa-sdk` `@oa-*` tags
      const parsedProvenance = parseCommentsForProvenance(
        combinedCommentText,
        allTags,
        node.qualifiedName ?? node.name ?? node.id,
        node.file ?? node.evidence?.file,
        node.evidence?.startLine
      );
      provenanceLinks.push(...parsedProvenance.links);
      if (parsedProvenance.needsReview) {
        needsReview = true;
      }

      // 4. Discover `@samchon/typespec-evidence` sibling/file constants (`*EntityRoot`, `*AspectOf`, `*Storage`, etc.)
      const discoveredArtifacts = this.discoverTypespecEvidenceConstants(node, parentNode);
      for (const art of discoveredArtifacts) {
        evidenceArtifacts.push(art.artifact);
        provenanceLinks.push(...art.links);
      }

      // 5. Discover optional `.oa-trace.json` sidecar entries if present in workspace
      const sidecarResult = this.lookupOaTraceSidecar(node, parentNode);
      for (const art of sidecarResult.artifacts) {
        evidenceArtifacts.push(art);
      }
      provenanceLinks.push(...sidecarResult.links);

      // 6. Scan for Telemetry / FSM tracking symbols (`UI:|FSM:|TX:|SYS:`)
      const nodeSnippet = this.extractNodeSourceSlice(node, fileText);
      const telemetryMatches = extractTelemetrySymbols(
        `${nodeLeadingComment}\n${nodeSnippet}`,
        node.file ?? node.evidence?.file,
        node.evidence?.startLine
      );
      for (const tm of telemetryMatches) {
        telemetrySymbols.push(tm);
        provenanceLinks.push({
          relation: 'emits-telemetry',
          fromAuthority: node.qualifiedName ?? node.name ?? node.id,
          toTarget: tm.symbol,
          sourceKind: 'telemetry',
          evidence: `@oa-sdk/telemetry ${tm.plane} symbol`,
          file: tm.file,
          line: tm.line,
        });
      }
    }

    // 7. Build Persistence / Repository Read-Write Bridges
    const persistenceBridges = this.discoverPersistenceBridges(
      targetNodes,
      toNodes,
      typeFlow,
      includeTests
    );
    for (const bridge of persistenceBridges) {
      for (const writer of bridge.writers) {
        provenanceLinks.push({
          relation: 'persists-to',
          fromAuthority: writer.symbolName,
          toTarget: `${bridge.storeOrRepoName}.${writer.method}`,
          sourceKind: 'repository-bridge',
          evidence: `Write call to ${bridge.storeOrRepoName}.${writer.method}`,
          file: writer.file,
          line: writer.line,
        });
      }
      for (const reader of bridge.readers) {
        provenanceLinks.push({
          relation: 'reads-from',
          fromAuthority: reader.symbolName,
          toTarget: `${bridge.storeOrRepoName}.${reader.method}`,
          sourceKind: 'repository-bridge',
          evidence: `Read call to ${bridge.storeOrRepoName}.${reader.method}`,
          file: reader.file,
          line: reader.line,
        });
      }
    }

    const dedupedCheckpoints = dedupeByKey(
      checkpoints,
      (c) => `${c.checkpoint}:${c.bindingRole}:${c.specBindingId ?? ''}`
    );
    const dedupedLinks = dedupeByKey(
      provenanceLinks,
      (l) => `${l.relation}:${l.fromAuthority}->${l.toTarget}:${l.sourceKind}`
    );
    const dedupedArtifacts = dedupeByKey(
      evidenceArtifacts,
      (a) => `${a.symbolId}:${a.artifactKind}`
    );
    const dedupedTelemetry = dedupeByKey(telemetrySymbols, (t) => t.symbol);

    const lineageState: DataTraceLineageState = needsReview
      ? 'needs_review'
      : dedupedCheckpoints.length > 0 || dedupedLinks.length > 0 || dedupedArtifacts.length > 0
        ? 'verified'
        : 'unresolved';

    return {
      lineageState,
      checkpoints: dedupedCheckpoints,
      provenanceLinks: dedupedLinks,
      evidenceArtifacts: dedupedArtifacts,
      persistenceBridges,
      telemetrySymbols: dedupedTelemetry,
    };
  }

  private discoverTypespecEvidenceConstants(
    node: CanonicalGraphNode,
    parentNode?: CanonicalGraphNode
  ): Array<{
    readonly artifact: DataTraceEvidenceArtifact;
    readonly links: readonly DataTraceProvenanceLink[];
  }> {
    const results: Array<{
      readonly artifact: DataTraceEvidenceArtifact;
      readonly links: readonly DataTraceProvenanceLink[];
    }> = [];

    const baseNames = new Set<string>();
    for (const candidate of [node, parentNode]) {
      if (!candidate?.name) continue;
      baseNames.add(candidate.name);
      for (const { suffix } of TYPESPEC_EVIDENCE_SUFFIXES) {
        if (candidate.name.endsWith(suffix) && candidate.name.length > suffix.length) {
          baseNames.add(candidate.name.slice(0, -suffix.length));
        }
      }
      const stripped = candidate.name.replace(
        /(?:Dto|Entity|Model|Record|Row|Schema|Input|Output|Request|Response)$/,
        ''
      );
      if (stripped.length >= 3) baseNames.add(stripped);
    }

    const candidateNodes = new Map<string, CanonicalGraphNode>();
    const file = node.file ?? node.evidence?.file;
    if (file) {
      for (const fileNode of this.index.getNodesByFile(file)) {
        const fileName = fileNode.name ?? '';
        const suffix = TYPESPEC_EVIDENCE_SUFFIXES.find((item) => fileName.endsWith(item.suffix));
        if (!suffix) continue;
        const prefix = fileName.slice(0, -suffix.suffix.length);
        const stripDomainSuffix = (val: string): string =>
          val.replace(
            /(?:Dto|Entity|Model|Record|Row|Schema|Input|Output|Request|Response|PublicId|Id)$/,
            ''
          );
        const props = this.extractObjectLiteralProperties(fileNode);
        const propertyMatches = [
          props.targetName,
          props.entityName,
          props.canonicalEntityName,
          props.aspectModelName,
          props.canonicalTargetName,
          props.idName,
          props.representationName,
        ].some(
          (value) =>
            value !== undefined && (baseNames.has(value) || baseNames.has(stripDomainSuffix(value)))
        );
        if (baseNames.has(prefix) || baseNames.has(stripDomainSuffix(prefix)) || propertyMatches) {
          candidateNodes.set(fileNode.id, fileNode);
        }
      }
    }
    for (const base of baseNames) {
      for (const { suffix } of TYPESPEC_EVIDENCE_SUFFIXES) {
        for (const matched of this.index.getNodesByName(`${base}${suffix}`)) {
          candidateNodes.set(matched.id, matched);
        }
      }
    }

    for (const cand of candidateNodes.values()) {
      const name = cand.name ?? '';
      const matchedSuffix = TYPESPEC_EVIDENCE_SUFFIXES.find((s) => name.endsWith(s.suffix));
      if (!matchedSuffix) continue;

      const props = this.extractObjectLiteralProperties(cand);
      const links: DataTraceProvenanceLink[] = [];
      const fromTarget =
        props.targetName ||
        props.aspectModelName ||
        props.idName ||
        props.representationName ||
        props.entityName ||
        name.slice(0, -matchedSuffix.suffix.length) ||
        name;

      let toAuthority = name;
      if (matchedSuffix.kind === 'AspectOf' && props.canonicalEntityName) {
        toAuthority = `${props.canonicalEntityName}${props.aspectName ? `#${props.aspectName}` : ''}`;
      } else if (matchedSuffix.kind === 'Storage' && (props.table || props.store)) {
        toAuthority = `${props.domain ? `${props.domain}.` : ''}${props.store ?? 'store'}:${props.table ?? 'table'}${props.partitionKey ? `#${props.partitionKey}` : ''}`;
      } else if (matchedSuffix.kind === 'Promotable' && props.canonicalTargetName) {
        toAuthority = `${props.canonicalTargetName} (${props.initialScope ?? 'local'} -> ${props.targetScope ?? 'canonical'})`;
      } else if (matchedSuffix.kind === 'Representation' && props.canonicalTargetName) {
        toAuthority = `${props.canonicalTargetName} [${props.format ?? props.encoding ?? 'repr'}]`;
      } else if (matchedSuffix.kind === 'LookupKey' && props.entityName) {
        toAuthority = `${props.entityName}.${props.propertyName ?? 'key'} (${props.lookupMethod ?? 'lookup'})`;
      }

      links.push({
        relation: matchedSuffix.relation,
        fromAuthority: fromTarget,
        toTarget: toAuthority,
        sourceKind: 'typespec-evidence',
        evidence: `@samchon/typespec-evidence ${matchedSuffix.kind} constant ${name}`,
        file: cand.file ?? cand.evidence?.file,
        line: cand.evidence?.startLine,
        metadata: props,
      });

      results.push({
        artifact: {
          symbolId: cand.id,
          symbolName: name,
          artifactKind: matchedSuffix.kind,
          file: cand.file ?? cand.evidence?.file,
          line: cand.evidence?.startLine,
          properties: props,
        },
        links,
      });
    }

    return results;
  }

  private extractObjectLiteralProperties(
    node: CanonicalGraphNode
  ): Readonly<Record<string, string>> {
    const props: Record<string, string> = {};
    const meta = extractRawNodeMetadata(node);
    for (const member of meta.objectMembers) {
      if (member.signature) {
        props[member.name] = member.signature.replace(/^['"`]|['"`]$/g, '');
      }
    }

    const sf = this.getSourceFile(node.file ?? node.evidence?.file);
    if (!sf) return props;

    const visit = (astNode: ts.Node): void => {
      if (
        ts.isVariableDeclaration(astNode) &&
        ts.isIdentifier(astNode.name) &&
        astNode.name.text === node.name &&
        astNode.initializer
      ) {
        const unwrapped = unwrapAsConst(astNode.initializer);
        if (ts.isObjectLiteralExpression(unwrapped)) {
          for (const prop of unwrapped.properties) {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              const val = unwrapAsConst(prop.initializer);
              if (ts.isStringLiteralLike(val) || ts.isNumericLiteral(val)) {
                props[prop.name.text] = val.text;
              } else if (
                val.kind === ts.SyntaxKind.TrueKeyword ||
                val.kind === ts.SyntaxKind.FalseKeyword
              ) {
                props[prop.name.text] = val.kind === ts.SyntaxKind.TrueKeyword ? 'true' : 'false';
              }
            }
          }
        }
      }
      ts.forEachChild(astNode, visit);
    };
    visit(sf);
    return props;
  }

  private lookupOaTraceSidecar(
    node: CanonicalGraphNode,
    parentNode?: CanonicalGraphNode
  ): {
    readonly artifacts: readonly DataTraceEvidenceArtifact[];
    readonly links: readonly DataTraceProvenanceLink[];
  } {
    const artifacts: DataTraceEvidenceArtifact[] = [];
    const links: DataTraceProvenanceLink[] = [];
    const candidatePaths = [
      path.join(this.workspaceRoot, '.oa-trace.json'),
      ...(node.file
        ? [path.join(path.dirname(path.resolve(this.workspaceRoot, node.file)), '.oa-trace.json')]
        : []),
    ];

    for (const sidecarPath of candidatePaths) {
      const raw = this.readTextFile(sidecarPath);
      if (!raw) continue;
      try {
        const parsedRaw: unknown = JSON.parse(raw);
        const parsed = parsedRaw as {
          schema?: string;
          nodes?: Record<string, Record<string, unknown>>;
        };
        if (!parsed.nodes || typeof parsed.nodes !== 'object') continue;
        const targetNames = new Set(
          [node.name, node.qualifiedName, parentNode?.name].filter(
            (n): n is string => typeof n === 'string' && n.length > 0
          )
        );

        for (const [pointer, entry] of Object.entries(parsed.nodes)) {
          const symbolName = typeof entry.symbolName === 'string' ? entry.symbolName : undefined;
          const trackingId = typeof entry.trackingId === 'string' ? entry.trackingId : undefined;
          const declarationId =
            typeof entry.declarationId === 'string' ? entry.declarationId : undefined;
          if (!symbolName || !targetNames.has(symbolName)) continue;

          const sourceObj = entry.source as
            | { file?: string; line?: number; symbol?: string }
            | undefined;
          const govObj = entry.governance as
            | { storageRef?: string; dpmProjection?: string; behaviorRef?: string }
            | undefined;

          const props: Record<string, string> = { pointer };
          if (trackingId) props.trackingId = trackingId;
          if (declarationId) props.declarationId = declarationId;
          if (sourceObj?.file)
            props.tspSource = `${sourceObj.file}#${sourceObj.symbol ?? symbolName}`;
          if (govObj?.storageRef) props.storageRef = govObj.storageRef;
          if (govObj?.dpmProjection) props.dpmProjection = govObj.dpmProjection;

          artifacts.push({
            symbolId: node.id,
            symbolName,
            artifactKind: 'OaTraceNode',
            file: sidecarPath,
            properties: props,
          });

          if (sourceObj?.file) {
            links.push({
              relation: 'derives-from',
              fromAuthority: `${sourceObj.file}#${sourceObj.symbol ?? symbolName}`,
              toTarget: symbolName,
              sourceKind: 'oa-trace-sidecar',
              evidence: `.oa-trace.json pointer ${pointer}`,
              file: sourceObj.file,
              line: sourceObj.line,
            });
          }
          if (govObj?.storageRef) {
            links.push({
              relation: 'stored-in',
              fromAuthority: symbolName,
              toTarget: govObj.storageRef,
              sourceKind: 'oa-trace-sidecar',
              evidence: `.oa-trace.json governance.storageRef`,
            });
          }
        }
      } catch {
        // Ignore malformed sidecar JSON
      }
    }

    return { artifacts, links };
  }

  /**
   * Discover Persistence / Repository read-write bridges connecting writers and readers
   * across shared `*Repository` / `*Store` / `DatabaseManager` classes.
   */
  private discoverPersistenceBridges(
    targetNodes: readonly CanonicalGraphNode[],
    toNodes: readonly CanonicalGraphNode[],
    typeFlow: TypeFieldFlowReport | undefined,
    includeTests: boolean
  ): readonly DataTracePersistenceBridge[] {
    const bridges: DataTracePersistenceBridge[] = [];
    const candidateRepoClasses = new Map<string, CanonicalGraphNode>();

    for (const node of [...targetNodes, ...toNodes]) {
      if (isRepositoryOrStoreClass(node)) {
        candidateRepoClasses.set(node.id, node);
      }
      const parentNode =
        typeof node.parent === 'string' ? this.index.getNode(node.parent) : undefined;
      if (parentNode && isRepositoryOrStoreClass(parentNode)) {
        candidateRepoClasses.set(parentNode.id, parentNode);
      }
    }

    for (const usage of typeFlow?.roleClassifiedUsages ?? []) {
      const usageNode = this.index.getNode(usage.symbolId);
      if (!usageNode) continue;
      if (isRepositoryOrStoreClass(usageNode)) {
        candidateRepoClasses.set(usageNode.id, usageNode);
      }
      const parentNode =
        typeof usageNode.parent === 'string' ? this.index.getNode(usageNode.parent) : undefined;
      if (parentNode && isRepositoryOrStoreClass(parentNode)) {
        candidateRepoClasses.set(parentNode.id, parentNode);
      }
    }

    for (const junction of typeFlow?.sharedStateJunctions ?? []) {
      const jNode = this.index.getNode(junction.junctionId);
      if (jNode && isRepositoryOrStoreClass(jNode)) {
        candidateRepoClasses.set(jNode.id, jNode);
      }
    }

    for (const repoNode of candidateRepoClasses.values()) {
      const methods = this.getChildMemberNodes(repoNode).filter((m) => m.kind === 'function');
      const writers: Array<{
        readonly symbolId: string;
        readonly symbolName: string;
        readonly method: string;
        readonly file?: string;
        readonly line?: number;
      }> = [];
      const readers: Array<{
        readonly symbolId: string;
        readonly symbolName: string;
        readonly method: string;
        readonly file?: string;
        readonly line?: number;
      }> = [];

      for (const methodNode of methods) {
        const methodName = methodNode.name ?? '';
        const isWrite = WRITE_METHOD_REGEX.test(methodName);
        const isRead = !isWrite && READ_METHOD_REGEX.test(methodName);
        if (!isWrite && !isRead) continue;

        for (const incoming of this.index.getIncomingEdges(methodNode.id)) {
          if (incoming.kind !== 'calls' && incoming.kind !== 'accesses') continue;
          const caller = this.index.getNode(incoming.from);
          if (!caller || caller.parent === repoNode.id || caller.id === repoNode.id) continue;
          if (!includeTests && isTestNode(caller)) continue;

          const entry = {
            symbolId: caller.id,
            symbolName: caller.qualifiedName ?? caller.name ?? caller.id,
            method: methodName,
            file: incoming.evidence?.file ?? caller.file,
            line: incoming.evidence?.startLine ?? caller.evidence?.startLine,
          };
          if (isWrite) writers.push(entry);
          else readers.push(entry);
        }
      }

      if (writers.length > 0 || readers.length > 0) {
        bridges.push({
          storeOrRepoSymbolId: repoNode.id,
          storeOrRepoName: repoNode.qualifiedName ?? repoNode.name ?? repoNode.id,
          persistedType: targetNodes[0]?.name,
          writers: dedupeByKey(writers, (w) => `${w.symbolId}:${w.method}`),
          readers: dedupeByKey(readers, (r) => `${r.symbolId}:${r.method}`),
        });
      }
    }

    return bridges;
  }

  /**
   * Build Tier 3 (`CodeDataflowSliceReport`): On-demand TypeScript AST Def-Use & Call-Binding Slicer
   * with Fail-Closed Trust-Loss Boundary detection (`boundary:any`, `boundary:double-assertion`,
   * `boundary:unvalidated-deserialize`, `boundary:dynamic-index`).
   */
  private buildCodeDataflowSlice(
    targetNodes: readonly CanonicalGraphNode[],
    parsedQuery: ParsedTargetQuery,
    typeFlow: TypeFieldFlowReport | undefined,
    maxDepth: number,
    includeTests: boolean
  ): CodeDataflowSliceReport {
    const candidateFunctions: Array<{
      readonly node: CanonicalGraphNode;
      readonly seedParam?: string;
      readonly seedField?: string;
      readonly seedType?: string;
    }> = [];
    const seenFuncIds = new Set<string>();

    for (const target of targetNodes) {
      if (target.kind === 'function') {
        seenFuncIds.add(target.id);
        candidateFunctions.push({
          node: target,
          seedParam: parsedQuery.requestedParameter,
        });
      } else {
        const meta = extractRawNodeMetadata(target);
        const isField =
          target.kind !== 'function' &&
          target.kind !== 'class' &&
          target.kind !== 'interface' &&
          target.kind !== 'type' &&
          target.kind !== 'enum' &&
          (Boolean(meta.parent) ||
            Boolean(parsedQuery.explicitMemberName) ||
            (target.qualifiedName?.includes('.') === true && target.kind === 'variable'));
        const seedField = isField
          ? (parsedQuery.explicitMemberName ?? extractFieldShortName(target))
          : undefined;
        const seedType =
          isField && meta.parent ? this.index.getNode(meta.parent)?.name : target.name;

        for (const usage of (typeFlow?.roleClassifiedUsages ?? []).slice(0, 8)) {
          if (seenFuncIds.has(usage.symbolId)) continue;
          const funcNode = this.index.getNode(usage.symbolId);
          if (!funcNode || funcNode.kind !== 'function') continue;
          if (!includeTests && isTestNode(funcNode)) continue;
          seenFuncIds.add(funcNode.id);
          candidateFunctions.push({
            node: funcNode,
            seedField,
            seedType,
          });
        }
      }
    }

    const slices: FunctionDataflowSlice[] = [];
    const queue = [...candidateFunctions.map((c) => ({ ...c, depth: 1 }))];

    for (let i = 0; i < queue.length && slices.length < 10; i++) {
      const item = queue[i];
      const slice = this.sliceFunctionNode(
        item.node,
        item.seedParam,
        item.seedField,
        item.seedType
      );
      if (!slice) continue;
      slices.push(slice);

      // Inter-procedural 1..maxDepth hop call-binding follow (`arg[i] -> callee.param[i]`)
      if (item.depth < maxDepth) {
        const outgoingCalls = this.index
          .getOutgoingEdges(item.node.id)
          .filter((e) => e.kind === 'calls' || e.kind === 'dispatches');
        for (const step of slice.steps) {
          if (step.operation !== 'PASS_AS_ARG' || !step.calleeName) continue;
          const shortCallee = step.calleeName.split('.').pop() ?? step.calleeName;
          const matchedEdge = outgoingCalls.find((e) => {
            const calleeNode = this.index.getNode(e.to);
            return (
              calleeNode?.name === shortCallee || calleeNode?.qualifiedName === step.calleeName
            );
          });
          const calleeNode = matchedEdge ? this.index.getNode(matchedEdge.to) : undefined;
          if (
            calleeNode &&
            calleeNode.kind === 'function' &&
            !isExternalNode(calleeNode) &&
            !seenFuncIds.has(calleeNode.id)
          ) {
            seenFuncIds.add(calleeNode.id);
            queue.push({
              node: calleeNode,
              seedParam: step.boundParamName,
              seedField: item.seedField,
              seedType: item.seedType,
              depth: item.depth + 1,
            });
          }
        }
      }
    }

    const totalSteps = slices.reduce((sum, s) => sum + s.steps.length, 0);
    const totalTrustBoundaries = slices.reduce((sum, s) => sum + s.trustBoundaries.length, 0);

    return {
      slices,
      totalSteps,
      totalTrustBoundaries,
    };
  }

  private sliceFunctionNode(
    funcNode: CanonicalGraphNode,
    seedParam?: string,
    seedField?: string,
    seedType?: string
  ): FunctionDataflowSlice | undefined {
    const file = funcNode.file ?? funcNode.evidence?.file;
    const sf = this.getSourceFile(file);
    if (!sf || !file) return undefined;

    const astFunc = findAstFunctionDeclaration(
      sf,
      funcNode.qualifiedName ?? funcNode.name ?? '',
      funcNode.evidence?.startLine,
      this.index.getNode(typeof funcNode.parent === 'string' ? funcNode.parent : '')?.name
    );
    if (!astFunc) return undefined;

    const trackedVars = new Set<string>();
    const trackedFields = new Set<string>();
    if (seedField) trackedFields.add(seedField);

    const steps: DataflowSliceStep[] = [];
    const trustBoundaries: DataflowTrustBoundary[] = [];
    let stepIndex = 1;

    // 1. Seed parameters
    for (const param of astFunc.parameters) {
      const paramText = param.name.getText(sf);
      const typeText = param.type ? param.type.getText(sf) : '';
      const paramLine = getLineNumber(sf, param.getStart(sf));

      const shouldSeed =
        (seedParam && paramText === seedParam) ||
        (!seedParam && seedType && containsTypeIdentifier(typeText, seedType)) ||
        (!seedParam && !seedType);

      if (shouldSeed) {
        if (ts.isIdentifier(param.name)) {
          trackedVars.add(param.name.text);
        } else if (ts.isObjectBindingPattern(param.name)) {
          for (const el of param.name.elements) {
            if (ts.isIdentifier(el.name)) trackedVars.add(el.name.text);
          }
        }
        steps.push({
          stepIndex: stepIndex++,
          operation: 'PARAM_IN',
          variableOrField: paramText,
          expression: param.getText(sf),
          line: paramLine,
        });
      }

      if (param.type && containsAnyKeyword(param.type)) {
        trustBoundaries.push({
          kind: 'boundary:any',
          line: paramLine,
          expression: param.getText(sf),
          reason: `Parameter '${paramText}' uses explicit 'any', erasing static type guarantees`,
          failClosedStatus: 'type-erased',
        });
      }
    }

    // If no parameter matched a type-seeded function (e.g. function constructs or reads `this.repo`), still track `this` and local variables touching `seedField` / `seedType`
    const referencesTracked = (expr: ts.Node): boolean => {
      let found = false;
      const check = (n: ts.Node, shadowed: ReadonlySet<string> = new Set()): void => {
        if (found) return;
        if (n !== expr && ts.isArrowFunction(n)) {
          const shadowedNames = new Set<string>();
          for (const parameter of n.parameters) {
            if (ts.isIdentifier(parameter.name)) shadowedNames.add(parameter.name.text);
          }
          check(n.body, new Set([...shadowed, ...shadowedNames]));
          return;
        }
        if (ts.isIdentifier(n) && trackedVars.has(n.text) && !shadowed.has(n.text)) {
          found = true;
          return;
        }
        if (ts.isPropertyAccessExpression(n) && trackedFields.has(n.name.text)) {
          found = true;
          return;
        }
        if (seedType && ts.isNewExpression(n) && n.expression.getText(sf) === seedType) {
          found = true;
          return;
        }
        ts.forEachChild(n, (child) => check(child, shadowed));
      };
      check(expr);
      return found;
    };

    const recordedReadLines = new Set<string>();

    const walkBody = (node: ts.Node): void => {
      if (
        node !== astFunc.body &&
        (ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isArrowFunction(node))
      ) {
        return;
      }
      const line = getLineNumber(sf, node.getStart(sf));

      // Check Trust-Loss Boundaries inside function body
      if (ts.isAsExpression(node)) {
        if (node.type.kind === ts.SyntaxKind.AnyKeyword) {
          trustBoundaries.push({
            kind: 'boundary:any',
            line,
            expression: truncateOneLine(node.getText(sf)),
            reason: `Type assertion 'as any' erases static type provenance`,
            failClosedStatus: 'type-erased',
          });
        } else if (
          ts.isAsExpression(unwrapParentheses(node.expression)) &&
          ((unwrapParentheses(node.expression) as ts.AsExpression).type.kind ===
            ts.SyntaxKind.UnknownKeyword ||
            (unwrapParentheses(node.expression) as ts.AsExpression).type.kind ===
              ts.SyntaxKind.AnyKeyword)
        ) {
          trustBoundaries.push({
            kind: 'boundary:double-assertion',
            line,
            expression: truncateOneLine(node.getText(sf)),
            reason: `Double assertion 'as unknown as ${node.type.getText(sf)}' bypasses structural type compatibility`,
            failClosedStatus: 'type-erased',
          });
        }
      }

      if (ts.isElementAccessExpression(node) && referencesTracked(node.expression)) {
        const arg = node.argumentExpression;
        if (!ts.isStringLiteralLike(arg) && !ts.isNumericLiteral(arg)) {
          trustBoundaries.push({
            kind: 'boundary:dynamic-index',
            line,
            expression: truncateOneLine(node.getText(sf)),
            reason: `Dynamic element access '[${arg.getText(sf)}]' cannot be statically resolved to a fixed field`,
            failClosedStatus: 'indeterminate',
          });
        }
      }

      if (ts.isCallExpression(node)) {
        const calleeText = node.expression.getText(sf);
        if (
          (calleeText === 'JSON.parse' || calleeText.endsWith('.json')) &&
          !isDeserializeCallValidated(node, astFunc.body)
        ) {
          trustBoundaries.push({
            kind: 'boundary:unvalidated-deserialize',
            line,
            expression: truncateOneLine(node.getText(sf)),
            reason: `Unvalidated deserialization '${calleeText}(...)' without an adjacent schema/type-guard check`,
            failClosedStatus: 'unvalidated',
          });
        }
      }

      // 2. Variable declaration (`const x = ...` or `const { field } = ...`)
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const initTouchesTracked =
          referencesTracked(node.initializer) ||
          (seedType !== undefined &&
            node.type !== undefined &&
            containsTypeIdentifier(node.type.getText(sf), seedType));

        if (node.type && containsAnyKeyword(node.type) && initTouchesTracked) {
          trustBoundaries.push({
            kind: 'boundary:any',
            line,
            expression: truncateOneLine(node.getText(sf)),
            reason: `Variable '${node.name.getText(sf)}' is annotated as 'any'`,
            failClosedStatus: 'type-erased',
          });
        }

        if (initTouchesTracked) {
          if (ts.isObjectBindingPattern(node.name)) {
            for (const element of node.name.elements) {
              const propName = (element.propertyName ?? element.name).getText(sf);
              const boundName = element.name.getText(sf);
              if (trackedFields.size === 0 || trackedFields.has(propName)) {
                if (ts.isIdentifier(element.name)) {
                  trackedVars.add(element.name.text);
                }
                steps.push({
                  stepIndex: stepIndex++,
                  operation: 'DESTRUCTURE',
                  variableOrField: boundName,
                  expression: truncateOneLine(node.getText(sf)),
                  line,
                });
              }
            }
          } else if (ts.isIdentifier(node.name)) {
            trackedVars.add(node.name.text);
            const isAwait = ts.isAwaitExpression(node.initializer);
            steps.push({
              stepIndex: stepIndex++,
              operation: isAwait ? 'AWAIT_CALL' : 'LOCAL_ALIAS',
              variableOrField: node.name.text,
              expression: truncateOneLine(node.getText(sf)),
              line,
            });
          }
        }
      }

      // 3. Binary assignments (`a.field = ...`, `a.field += ...`)
      if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
        const isCompound = node.operatorToken.kind !== ts.SyntaxKind.EqualsToken;
        if (referencesTracked(node.left)) {
          steps.push({
            stepIndex: stepIndex++,
            operation: isCompound ? 'READ_WRITE' : 'WRITE',
            variableOrField: truncateOneLine(node.left.getText(sf)),
            expression: truncateOneLine(node.getText(sf)),
            line,
          });
        } else if (ts.isIdentifier(node.left) && referencesTracked(node.right)) {
          trackedVars.add(node.left.text);
          steps.push({
            stepIndex: stepIndex++,
            operation: 'LOCAL_ALIAS',
            variableOrField: node.left.text,
            expression: truncateOneLine(node.getText(sf)),
            line,
          });
        }
      }

      // 4. Property access reads (`obj.field`)
      if (ts.isPropertyAccessExpression(node)) {
        const propName = node.name.text;
        const matchesField = trackedFields.has(propName);
        const matchesVar =
          trackedFields.size === 0 &&
          ts.isIdentifier(node.expression) &&
          trackedVars.has(node.expression.text);

        if (matchesField || matchesVar) {
          const parent = node.parent;
          const isCallCallee = ts.isCallExpression(parent) && parent.expression === node;
          const isLhsWrite =
            ts.isBinaryExpression(parent) &&
            parent.left === node &&
            isAssignmentOperator(parent.operatorToken.kind);

          if (!isCallCallee && !isLhsWrite) {
            const exprText = truncateOneLine(node.getText(sf));
            const readKey = `${line}:${exprText}`;
            if (!recordedReadLines.has(readKey)) {
              recordedReadLines.add(readKey);
              steps.push({
                stepIndex: stepIndex++,
                operation: 'READ',
                variableOrField: exprText,
                expression: truncateOneLine(findEnclosingStatementOrExprText(node, sf)),
                line,
              });
            }
          }
        }
      }

      // 5. Call expressions passing tracked data as an argument (`PASS_AS_ARG`)
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const args = node.arguments ?? [];
        const calleeName = truncateOneLine(node.expression.getText(sf));
        args.forEach((arg, argIdx) => {
          if (referencesTracked(arg)) {
            const boundParamName = this.resolveCalleeParameterName(funcNode.id, calleeName, argIdx);
            steps.push({
              stepIndex: stepIndex++,
              operation: 'PASS_AS_ARG',
              variableOrField: truncateOneLine(arg.getText(sf)),
              expression: truncateOneLine(node.getText(sf)),
              line,
              calleeName,
              argIndex: argIdx,
              boundParamName,
            });
          }
        });
      }

      // 6. Return statement
      if (ts.isReturnStatement(node) && node.expression) {
        const touchesTracked =
          referencesTracked(node.expression) ||
          (seedType !== undefined &&
            extractRawNodeMetadata(funcNode).signature?.includes(seedType) === true);
        if (touchesTracked) {
          steps.push({
            stepIndex: stepIndex++,
            operation: 'RETURN',
            variableOrField: truncateOneLine(node.expression.getText(sf)),
            expression: truncateOneLine(node.getText(sf)),
            line,
          });
        }
      }

      ts.forEachChild(node, walkBody);
    };

    if (astFunc.body) {
      walkBody(astFunc.body);
    }

    const startLine = funcNode.evidence?.startLine ?? getLineNumber(sf, astFunc.getStart(sf));
    const endLine = funcNode.evidence?.endLine ?? getLineNumber(sf, astFunc.getEnd());

    return {
      functionId: funcNode.id,
      functionName: funcNode.qualifiedName ?? funcNode.name ?? funcNode.id,
      file,
      startLine,
      endLine,
      seedExpression:
        seedParam ??
        (seedField ? `.${seedField}` : undefined) ??
        seedType ??
        [...trackedVars][0] ??
        funcNode.name ??
        'function',
      steps,
      trustBoundaries: dedupeByKey(trustBoundaries, (b) => `${b.kind}:${b.line}:${b.expression}`),
    };
  }

  private resolveCalleeParameterName(
    callerId: string,
    calleeExprText: string,
    argIndex: number
  ): string | undefined {
    const shortName = calleeExprText.split('.').pop() ?? calleeExprText;
    for (const edge of this.index.getOutgoingEdges(callerId)) {
      if (edge.kind !== 'calls' && edge.kind !== 'instantiates' && edge.kind !== 'dispatches') {
        continue;
      }
      const callee = this.index.getNode(edge.to);
      if (!callee) continue;
      if (callee.name === shortName || callee.qualifiedName === calleeExprText) {
        const sig = extractRawNodeMetadata(callee).signature;
        const parsed = sig ? parseFunctionSignatureTypes(sig) : undefined;
        return parsed?.paramNames[argIndex];
      }
    }
    return undefined;
  }

  private inspectAstFieldAccess(
    caller: CanonicalGraphNode,
    fieldName: string
  ): { readonly isWrite: boolean; readonly line?: number; readonly snippet?: string } | undefined {
    const file = caller.file ?? caller.evidence?.file;
    const sf = this.getSourceFile(file);
    if (!sf) return undefined;

    const scopeNode =
      caller.kind === 'function'
        ? findAstFunctionDeclaration(
            sf,
            caller.qualifiedName ?? caller.name ?? '',
            caller.evidence?.startLine,
            this.index.getNode(typeof caller.parent === 'string' ? caller.parent : '')?.name
          )
        : sf;
    if (!scopeNode) return undefined;
    const rangeStart = caller.evidence?.startLine;
    const rangeEnd = caller.evidence?.endLine ?? rangeStart;

    let foundWrite: { line: number; snippet: string } | undefined;
    let foundRead: { line: number; snippet: string } | undefined;

    const visit = (node: ts.Node): void => {
      if (caller.kind !== 'function' && rangeStart !== undefined && ts.isStatement(node)) {
        const nodeStart = getLineNumber(sf, node.getStart(sf));
        const nodeEnd = getLineNumber(sf, node.getEnd() - 1);
        if (nodeEnd < rangeStart || (rangeEnd !== undefined && nodeStart > rangeEnd)) return;
      }
      if (ts.isPropertyAccessExpression(node) && node.name.text === fieldName) {
        const line = getLineNumber(sf, node.getStart(sf));
        const parent = node.parent;
        const isWrite =
          (ts.isBinaryExpression(parent) &&
            parent.left === node &&
            isAssignmentOperator(parent.operatorToken.kind)) ||
          ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) &&
            (parent.operator === ts.SyntaxKind.PlusPlusToken ||
              parent.operator === ts.SyntaxKind.MinusMinusToken)) ||
          ts.isDeleteExpression(parent);

        const snippet = truncateOneLine(findEnclosingStatementOrExprText(node, sf));
        if (isWrite && !foundWrite) {
          foundWrite = { line, snippet };
        } else if (!isWrite && !foundRead) {
          foundRead = { line, snippet };
        }
      } else if (ts.isObjectBindingPattern(node)) {
        for (const el of node.elements) {
          const propName = (el.propertyName ?? el.name).getText(sf);
          if (propName === fieldName && !foundRead) {
            foundRead = {
              line: getLineNumber(sf, el.getStart(sf)),
              snippet: truncateOneLine(findEnclosingStatementOrExprText(node, sf)),
            };
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(scopeNode);
    if (foundWrite) return { isWrite: true, ...foundWrite };
    if (foundRead) return { isWrite: false, ...foundRead };
    return undefined;
  }

  private getChildMemberNodes(parent: CanonicalGraphNode): readonly CanonicalGraphNode[] {
    const byParent = this.childrenByParentId.get(parent.id) ?? [];
    const byContains = this.index
      .getOutgoingEdges(parent.id)
      .filter((e) => e.kind === 'contains')
      .map((e) => this.index.getNode(e.to))
      .filter((n): n is CanonicalGraphNode => Boolean(n));
    const prefix = `${parent.qualifiedName ?? parent.name}.`;
    const byPrefix = parent.file
      ? this.index
          .getNodesByFile(parent.file)
          .filter((n) => n.id !== parent.id && n.qualifiedName?.startsWith(prefix) === true)
      : [];
    return uniqueNodes([...byParent, ...byContains, ...byPrefix]);
  }

  private getSourceFile(relativeOrAbsPath: string | undefined): ts.SourceFile | null {
    if (!relativeOrAbsPath || EXTERNAL_FILE_PATTERN.test(relativeOrAbsPath)) return null;
    const cached = this.sourceFileCache.get(relativeOrAbsPath);
    if (cached !== undefined) return cached;

    const text = this.readTextFile(relativeOrAbsPath);
    if (text === undefined) {
      this.sourceFileCache.set(relativeOrAbsPath, null);
      return null;
    }
    const sf = ts.createSourceFile(
      relativeOrAbsPath,
      text,
      ts.ScriptTarget.Latest,
      true,
      relativeOrAbsPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    this.sourceFileCache.set(relativeOrAbsPath, sf);
    return sf;
  }

  private readNodeSourceText(node: CanonicalGraphNode): string | undefined {
    const file = node.file ?? node.evidence?.file;
    return file ? this.readTextFile(file) : undefined;
  }

  private readTextFile(relativeOrAbsPath: string): string | undefined {
    const cached = this.rawTextCache.get(relativeOrAbsPath);
    if (cached !== undefined) return cached ?? undefined;

    if (this.customReadFile) {
      const custom = this.customReadFile(relativeOrAbsPath);
      if (custom !== undefined) {
        this.rawTextCache.set(relativeOrAbsPath, custom);
        return custom;
      }
    }

    const fullPath = path.isAbsolute(relativeOrAbsPath)
      ? relativeOrAbsPath
      : path.resolve(this.workspaceRoot, relativeOrAbsPath);
    try {
      if (!fs.existsSync(fullPath)) {
        this.rawTextCache.set(relativeOrAbsPath, null);
        return undefined;
      }
      const content = fs.readFileSync(fullPath, 'utf-8');
      this.rawTextCache.set(relativeOrAbsPath, content);
      return content;
    } catch {
      this.rawTextCache.set(relativeOrAbsPath, null);
      return undefined;
    }
  }

  private extractLeadingJsDocText(node: CanonicalGraphNode, fileText: string): string {
    const startLine = node.evidence?.startLine;
    if (!startLine || !fileText) return '';
    const lines = fileText.split(/\r?\n/);
    const fromLine = Math.max(0, startLine - 35);
    return lines.slice(fromLine, startLine).join('\n');
  }

  private extractNodeSourceSlice(node: CanonicalGraphNode, fileText: string): string {
    const startLine = node.evidence?.startLine;
    if (!startLine || !fileText) return '';
    const endLine = node.evidence?.endLine ?? startLine + 40;
    const lines = fileText.split(/\r?\n/);
    return lines.slice(Math.max(0, startLine - 1), Math.min(lines.length, endLine)).join('\n');
  }
}

function parseTargetQuery(rawTarget: string): ParsedTargetQuery {
  const trimmed = rawTarget.trim().replace(/^\[\[|\]\]$/g, '');
  const parenMatch = trimmed.match(/^([^(]+)\(([^)]*)\)$/);
  if (parenMatch) {
    return {
      rawQuery: rawTarget,
      symbolQuery: parenMatch[1].trim(),
      requestedParameter: parenMatch[2].trim() || undefined,
    };
  }
  const dotIndex = trimmed.lastIndexOf('.');
  return {
    rawQuery: rawTarget,
    symbolQuery: trimmed,
    explicitMemberName: dotIndex > 0 ? trimmed.slice(dotIndex + 1) : undefined,
  };
}

function unwrapParentheses(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function isDeserializeCallValidated(
  node: ts.CallExpression,
  body: ts.Block | ts.Expression | undefined
): boolean {
  const parent = node.parent;
  if (ts.isCallExpression(parent) && parent.arguments.some((argument) => argument === node)) {
    if (VALIDATOR_CALL_REGEX.test(parent.expression.getText())) return true;
  }

  let initializer: ts.VariableDeclaration | undefined;
  let current: ts.Node = node;
  while (
    !ts.isSourceFile(current) &&
    (ts.isAwaitExpression(current.parent) || ts.isParenthesizedExpression(current.parent))
  ) {
    current = current.parent;
  }
  if (
    !ts.isSourceFile(current) &&
    ts.isVariableDeclaration(current.parent) &&
    ts.isIdentifier(current.parent.name)
  ) {
    initializer = current.parent;
  }
  if (!initializer || !body) return false;
  const initializerName = initializer.name.getText();

  let validated = false;
  const visit = (candidate: ts.Node): void => {
    if (validated) return;
    if (
      ts.isCallExpression(candidate) &&
      VALIDATOR_CALL_REGEX.test(candidate.expression.getText())
    ) {
      if (
        candidate.arguments.some(
          (argument) => ts.isIdentifier(argument) && argument.text === initializerName
        )
      ) {
        validated = true;
        return;
      }
    }
    ts.forEachChild(candidate, visit);
  };
  visit(body);
  return validated;
}

function classifyCandidateSet(nodes: readonly CanonicalGraphNode[]): {
  readonly status: 'found' | 'ambiguous';
  readonly nodes: readonly CanonicalGraphNode[];
} {
  const unique = uniqueNodes(nodes);
  if (unique.length === 1) {
    return { status: 'found', nodes: unique };
  }
  // If all nodes are in the same file and share the same qualifiedName (e.g. type + const pair), treat as found
  const files = new Set(unique.map((n) => n.file ?? n.evidence?.file));
  const qNames = new Set(unique.map((n) => n.qualifiedName ?? n.name));
  if (files.size === 1 && qNames.size === 1) {
    return { status: 'found', nodes: unique };
  }
  return { status: 'ambiguous', nodes: unique };
}

function extractRawNodeMetadata(node: CanonicalGraphNode): RawNodeMetadata {
  const raw = node as Record<string, unknown>;
  const signature = typeof raw.signature === 'string' ? raw.signature : undefined;
  const modifiers = Array.isArray(raw.modifiers)
    ? raw.modifiers.filter((m): m is string => typeof m === 'string')
    : [];
  const literals = Array.isArray(raw.literals)
    ? raw.literals.filter((l): l is string => typeof l === 'string')
    : [];
  const enumMembers = Array.isArray(raw.enumMembers)
    ? raw.enumMembers.filter((e): e is string => typeof e === 'string')
    : [];
  const objectMembers = Array.isArray(raw.objectMembers)
    ? (raw.objectMembers as readonly unknown[])
        .filter((m): m is Record<string, unknown> => m !== null && typeof m === 'object')
        .map((m) => ({
          name: typeof m.name === 'string' ? m.name : '',
          kind: typeof m.kind === 'string' ? m.kind : undefined,
          line: typeof m.line === 'number' ? m.line : undefined,
          signature: typeof m.signature === 'string' ? m.signature : undefined,
        }))
        .filter((m) => m.name.length > 0)
    : [];
  const docTags = Array.isArray(raw.docTags)
    ? (raw.docTags as readonly unknown[])
        .filter((t): t is Record<string, unknown> => t !== null && typeof t === 'object')
        .map((t) => ({
          name: typeof t.name === 'string' ? t.name : '',
          text: typeof t.text === 'string' ? t.text : undefined,
        }))
        .filter((t) => t.name.length > 0)
    : [];
  const parent = typeof raw.parent === 'string' ? raw.parent : undefined;

  return {
    signature,
    modifiers,
    literals,
    enumMembers,
    objectMembers,
    docTags,
    parent,
  };
}

function detectOrigin(
  node: CanonicalGraphNode,
  meta: RawNodeMetadata,
  sourceText?: string
): DataTraceOrigin {
  const file = node.file ?? node.evidence?.file ?? '';
  if (
    /(?:generated|\.gen\.|__generated__)/i.test(file) ||
    meta.docTags.some((t) => t.name === 'generated' || t.name.startsWith('oa-')) ||
    (sourceText && /@generated\b|DO NOT EDIT|TypeSpec source:/i.test(sourceText.slice(0, 600)))
  ) {
    return 'generated';
  }
  return 'handwritten';
}

function detectAuthorityRole(
  node: CanonicalGraphNode,
  meta: RawNodeMetadata,
  origin: DataTraceOrigin
): DataTraceAuthorityRole {
  if (
    node.kind === 'markdown_document' ||
    node.kind === 'markdown_section' ||
    node.kind === 'prisma_model' ||
    node.kind === 'prisma_column' ||
    node.kind === 'swagger_operation'
  ) {
    return 'authority';
  }
  if (
    origin === 'generated' ||
    meta.docTags.some((t) => t.name === 'derivedFrom' || t.name === 'evidence')
  ) {
    return 'derived';
  }
  if (isTestNode(node)) {
    return 'observation';
  }
  return 'authority';
}

function extractPropertyConstraints(
  docTags: readonly { readonly name: string; readonly text?: string }[],
  modifiers: readonly string[]
): Readonly<Record<string, string>> {
  const constraints: Record<string, string> = {};
  if (modifiers.includes('readonly')) {
    constraints.readonly = 'true';
  }
  const constraintTagNames = new Set([
    'format',
    'minimum',
    'maximum',
    'minLength',
    'maxLength',
    'pattern',
    'default',
    'contract',
    'invariant',
  ]);
  for (const tag of docTags) {
    const cleanName = tag.name.replace(/^@/, '');
    if (constraintTagNames.has(cleanName) && tag.text) {
      constraints[cleanName] = tag.text.trim();
    }
  }
  return constraints;
}

function parseFunctionSignatureTypes(signature: string): {
  readonly paramNames: readonly string[];
  readonly paramTypes: readonly string[];
  readonly returnType: string;
} | null {
  const openParen = signature.indexOf('(');
  if (openParen < 0) return null;
  let depth = 0;
  let closeParen = -1;
  for (let i = openParen; i < signature.length; i++) {
    const ch = signature[i];
    if (ch === '(' || ch === '[' || ch === '{' || (ch === '<' && isGenericAngleOpen(signature, i)))
      depth++;
    else if (ch === ')' || ch === '>' || ch === ']' || ch === '}') {
      if (ch === '>' && signature[i - 1] === '=') continue;
      if (ch === '>' && !hasOpenAngle(signature, i)) continue;
      depth--;
      if (depth === 0 && ch === ')') {
        closeParen = i;
        break;
      }
    }
  }
  if (closeParen < 0) return null;
  const paramsRaw = signature.slice(openParen + 1, closeParen).trim();
  const afterClose = signature.slice(closeParen + 1).trim();
  const returnType = afterClose.replace(/^(?:=>|:)\s*/, '').trim();

  if (!paramsRaw) {
    return { paramNames: [], paramTypes: [], returnType };
  }

  const paramSegments = splitTopLevelComma(paramsRaw);
  const paramNames: string[] = [];
  const paramTypes: string[] = [];
  for (const seg of paramSegments) {
    const colonIdx = findTopLevelColon(seg);
    if (colonIdx >= 0) {
      paramNames.push(seg.slice(0, colonIdx).replace(/[?.]/g, '').trim());
      paramTypes.push(seg.slice(colonIdx + 1).trim());
    } else {
      paramNames.push(seg.replace(/[?.]/g, '').trim());
      paramTypes.push('');
    }
  }

  return { paramNames, paramTypes, returnType };
}

function isGenericAngleOpen(input: string, index: number): boolean {
  const previous = input[index - 1] ?? '';
  const next = input[index + 1] ?? '';
  return (
    previous !== '<' && next !== '=' && previous !== '=' && !/[\s,.(?:+\-*/%&|!]/.test(previous)
  );
}

function hasOpenAngle(input: string, index: number): boolean {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    if (input[i] === '<' && isGenericAngleOpen(input, i)) depth++;
    else if (input[i] === '>' && input[i - 1] !== '=' && depth > 0) depth--;
  }
  return depth > 0;
}

function findTopLevelColon(segment: string): number {
  let depth = 0;
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === '(' || ch === '[' || ch === '{' || (ch === '<' && isGenericAngleOpen(segment, i))) {
      depth++;
    } else if (
      ch === ')' ||
      ch === ']' ||
      ch === '}' ||
      (ch === '>' && segment[i - 1] !== '=' && depth > 0)
    ) {
      depth--;
    } else if (ch === ':' && depth === 0) {
      return i;
    }
  }
  return -1;
}

function splitTopLevelComma(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(' || ch === '[' || ch === '{' || (ch === '<' && isGenericAngleOpen(input, i)))
      depth++;
    else if (
      ch === ')' ||
      ch === ']' ||
      ch === '}' ||
      (ch === '>' && input[i - 1] !== '=' && depth > 0)
    )
      depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = input.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function containsTypeIdentifier(typeText: string, identifier: string): boolean {
  if (!typeText || !identifier) return false;
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(typeText);
}

function isPrimitiveTypeString(typeText: string): boolean {
  const clean = typeText.replace(/\breadonly\b|\[\]/g, '').trim();
  return /^(?:string|number|boolean|void|undefined|null|unknown|any|never|symbol|bigint)$/i.test(
    clean
  );
}

function isPrimitiveOrVoidReturn(returnType: string): boolean {
  const unwrapped = returnType.replace(/^Promise<(.+)>$/, '$1').trim();
  return isPrimitiveTypeString(unwrapped);
}

function isSharedStateOrStoreCandidate(node: CanonicalGraphNode): boolean {
  if (node.kind === 'variable') return true;
  if (node.kind === 'class' || node.kind === 'interface') {
    return /(?:Repository|Store|Database|Manager|Cache|Registry|Context|Index|Coordinator|Service|State|Queue|Buffer|Pool)$/i.test(
      node.name ?? ''
    );
  }
  return false;
}

function isRepositoryOrStoreClass(node: CanonicalGraphNode): boolean {
  return (
    node.kind === 'class' &&
    /(?:Repository|Store|DatabaseManager|Storage|Cache)$/i.test(node.name ?? '')
  );
}

function extractFileHeaderJsDoc(fileText: string): string {
  const match = fileText.match(/^\s*\/\*\*[\s\S]*?\*\//);
  return match ? match[0] : '';
}

function extractDocCheckpoints(
  docTags: readonly { readonly name: string; readonly text?: string }[],
  commentText: string
): string[] {
  const checkpoints = new Set<string>();
  const combined = `${docTags.map((t) => `@${t.name} ${t.text ?? ''}`).join('\n')}\n${commentText}`;
  const regex = /@doc\s+\[\[([^\]]+)\]\]/g;
  for (const match of combined.matchAll(regex)) {
    const cp = match[1]?.trim();
    if (cp) checkpoints.add(cp);
  }
  return [...checkpoints];
}

function extractTagValues(
  docTags: readonly { readonly name: string; readonly text?: string }[],
  commentText: string,
  tagName: string
): string[] {
  const values = new Set<string>();
  for (const tag of docTags) {
    if (tag.name.replace(/^@/, '') === tagName && tag.text?.trim()) {
      values.add(tag.text.trim());
    }
  }
  const regex = new RegExp(`@${tagName}\\s+([^\\n*]+)`, 'g');
  for (const match of commentText.matchAll(regex)) {
    const val = match[1]?.trim();
    if (val) values.add(val);
  }
  return [...values];
}

function matchesSpecBinding(
  binding: SpecGraphRevision['bindings'][number],
  node: CanonicalGraphNode,
  parentNode?: CanonicalGraphNode
): boolean {
  const checkSelector = (sel: unknown): boolean => {
    if (!sel || typeof sel !== 'object') return false;
    const s = sel as Record<string, unknown>;
    if (s.type === 'code-node') {
      if (
        typeof s.canonicalNodeId === 'string' &&
        (s.canonicalNodeId === node.id || s.canonicalNodeId === parentNode?.id)
      ) {
        return true;
      }
      if (
        typeof s.symbolId === 'string' &&
        (s.symbolId === node.id || s.symbolId === parentNode?.id)
      ) {
        return true;
      }
      if (
        typeof s.qualifiedName === 'string' &&
        (s.qualifiedName === node.qualifiedName ||
          s.qualifiedName === node.name ||
          s.qualifiedName === parentNode?.qualifiedName ||
          s.qualifiedName === parentNode?.name)
      ) {
        const selectorFile =
          typeof s.file === 'string' ? s.file : typeof s.path === 'string' ? s.path : undefined;
        return (
          selectorFile === undefined ||
          selectorFile === (node.file ?? node.evidence?.file) ||
          selectorFile === (parentNode?.file ?? parentNode?.evidence?.file)
        );
      }
      const selectorPath =
        typeof s.file === 'string' ? s.file : typeof s.path === 'string' ? s.path : undefined;
      if (
        selectorPath !== undefined &&
        selectorPath === (node.file ?? node.evidence?.file) &&
        !s.qualifiedName &&
        !s.symbolId
      ) {
        return true;
      }
    }
    if (s.type === 'api-surface') {
      if (
        typeof s.exportName === 'string' &&
        (s.exportName === node.name || s.exportName === parentNode?.name)
      ) {
        return true;
      }
    }
    return false;
  };

  if ('target' in binding && checkSelector(binding.target)) return true;
  if ('subject' in binding && checkSelector(binding.subject)) return true;
  return false;
}

function parseCommentsForProvenance(
  commentText: string,
  docTags: readonly { readonly name: string; readonly text?: string }[],
  targetName: string,
  file?: string,
  line?: number
): {
  readonly links: readonly DataTraceProvenanceLink[];
  readonly needsReview: boolean;
} {
  const links: DataTraceProvenanceLink[] = [];
  let needsReview = false;
  const fullText = `${docTags.map((t) => `@${t.name} ${t.text ?? ''}`).join('\n')}\n${commentText}`;

  // 1. `@samchon/typespec-evidence` TypeSpec source header: `TypeSpec source: <path.tsp>#<Symbol>`
  for (const m of fullText.matchAll(/TypeSpec source:\s*([^\s*]+#[^\s*]+)/g)) {
    links.push({
      relation: 'derives-from',
      fromAuthority: m[1].trim(),
      toTarget: targetName,
      sourceKind: 'typespec-evidence',
      evidence: `TypeSpec source: ${m[1].trim()}`,
      file,
      line,
    });
  }

  // 2. `@evidence <target>` / `## @evidence <target>` / `@evidenceReview <target> #<hash>`
  for (const m of fullText.matchAll(/(?:##\s*)?@evidence\s+([^\s*\n]+)(?:[ \t]+([^\n*]*))?/g)) {
    links.push({
      relation: 'derives-from',
      fromAuthority: m[1].trim(),
      toTarget: targetName,
      sourceKind: 'typespec-evidence',
      evidence: `@evidence ${m[1].trim()}${m[2] ? ` ${m[2].trim()}` : ''}`,
      file,
      line,
    });
  }
  for (const m of fullText.matchAll(/@evidenceReview\s+([^\s*\n]+)(?:[ \t]+#([a-fA-F0-9]+))?/g)) {
    const hash = m[2]?.trim();
    if (!hash) needsReview = true;
    links.push({
      relation: 'governs',
      fromAuthority: m[1].trim(),
      toTarget: targetName,
      sourceKind: 'typespec-evidence',
      evidence: `@evidenceReview ${m[1].trim()}${hash ? ` #${hash}` : ' (missing review hash)'}`,
      file,
      line,
    });
  }

  // 3. `oa-sdk` provenance tags (`@oa-pointer`, `@oa-source`, `@oa-id`, `@oa-trace-id`, `@oa-replaces`, `@oa-requirement`, `@derivedFrom`, `@storageRef`, `@intent`, `@parentIntent`)
  const tagRules: Array<{
    readonly regex: RegExp;
    readonly relation: DirectionalLineageRelation;
    readonly sourceKind: 'oa-sdk-jsdoc' | 'tsdoc-tag';
    readonly reverseDirection?: boolean;
  }> = [
    { regex: /@oa-pointer\s+([^\s*\n]+)/g, relation: 'derives-from', sourceKind: 'oa-sdk-jsdoc' },
    { regex: /@oa-source\s+([^\s*\n]+)/g, relation: 'derives-from', sourceKind: 'oa-sdk-jsdoc' },
    { regex: /@oa-id\s+([^\s*\n]+)/g, relation: 'derives-from', sourceKind: 'oa-sdk-jsdoc' },
    { regex: /@oa-trace-id\s+([^\s*\n]+)/g, relation: 'derives-from', sourceKind: 'oa-sdk-jsdoc' },
    {
      regex: /@oa-replaces\s+([^\s*\n]+)/g,
      relation: 'replaces',
      sourceKind: 'oa-sdk-jsdoc',
      reverseDirection: true,
    },
    { regex: /@oa-requirement\s+([^\s*\n]+)/g, relation: 'governs', sourceKind: 'oa-sdk-jsdoc' },
    { regex: /@derivedFrom\s+([^\s*\n]+)/g, relation: 'derives-from', sourceKind: 'oa-sdk-jsdoc' },
    {
      regex: /@storageRef\s+([^\s*\n]+)/g,
      relation: 'stored-in',
      sourceKind: 'oa-sdk-jsdoc',
      reverseDirection: true,
    },
    { regex: /@intent\s+([^\n*]+)/g, relation: 'governs', sourceKind: 'oa-sdk-jsdoc' },
    { regex: /@parentIntent\s+([^\n*]+)/g, relation: 'governs', sourceKind: 'oa-sdk-jsdoc' },
    { regex: /@relatedTo\s+([^\s*\n]+)/g, relation: 'adapts-to', sourceKind: 'tsdoc-tag' },
    { regex: /@enhances\s+([^\s*\n]+)/g, relation: 'projects-to', sourceKind: 'tsdoc-tag' },
  ];

  for (const rule of tagRules) {
    for (const m of fullText.matchAll(rule.regex)) {
      const ref = m[1]?.trim();
      if (!ref) continue;
      links.push({
        relation: rule.relation,
        fromAuthority: rule.reverseDirection ? targetName : ref,
        toTarget: rule.reverseDirection ? ref : targetName,
        sourceKind: rule.sourceKind,
        evidence: m[0].trim(),
        file,
        line,
      });
    }
  }

  return { links, needsReview };
}

function extractTelemetrySymbols(
  text: string,
  file?: string,
  line?: number
): DataTraceTelemetrySymbol[] {
  const results: DataTraceTelemetrySymbol[] = [];
  for (const match of text.matchAll(TRACK_SYMBOL_REGEX)) {
    results.push({
      symbol: match[0],
      plane: match[1] as 'UI' | 'FSM' | 'TX' | 'SYS',
      domain: match[2],
      entity: match[3],
      action: match[4],
      qualifier: match[5],
      file,
      line,
    });
  }
  return results;
}

function findAstFunctionDeclaration(
  sf: ts.SourceFile,
  name: string,
  approxStartLine?: number,
  ownerName?: string
): ts.FunctionLikeDeclarationBase | undefined {
  const candidates: Array<{ node: ts.FunctionLikeDeclarationBase; lineDiff: number }> = [];
  const shortName = name.split('.').pop() ?? name;
  const requestedOwner =
    ownerName ?? (name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : undefined);

  const enclosingOwner = (node: ts.Node): string | undefined => {
    let current = node.parent;
    while (!ts.isSourceFile(current)) {
      if (ts.isClassDeclaration(current) || ts.isInterfaceDeclaration(current)) {
        return current.name?.getText(sf);
      }
      current = current.parent;
    }
    return undefined;
  };

  const visit = (node: ts.Node): void => {
    let matchedName: string | undefined;
    let funcNode: ts.FunctionLikeDeclarationBase | undefined;

    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node)) &&
      node.name
    ) {
      matchedName = node.name.getText(sf);
      funcNode = node;
    } else if (ts.isConstructorDeclaration(node) && shortName === 'constructor') {
      matchedName = 'constructor';
      funcNode = node;
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      matchedName = node.name.text;
      funcNode = node.initializer;
    }

    if (
      funcNode &&
      (matchedName === shortName || matchedName === name) &&
      (requestedOwner === undefined ||
        enclosingOwner(funcNode) === requestedOwner ||
        requestedOwner.endsWith(`.${enclosingOwner(funcNode) ?? ''}`))
    ) {
      const line = getLineNumber(sf, node.getStart(sf));
      const lineDiff = approxStartLine ? Math.abs(line - approxStartLine) : 0;
      candidates.push({ node: funcNode, lineDiff });
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  candidates.sort((a, b) => a.lineDiff - b.lineDiff);
  return candidates[0]?.node;
}

function unwrapAsConst(expr: ts.Expression): ts.Expression {
  let current = expr;
  while (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function containsAnyKeyword(typeNode: ts.TypeNode): boolean {
  if (typeNode.kind === ts.SyntaxKind.AnyKeyword) return true;
  let found = false;
  const visit = (n: ts.Node): void => {
    if (n.kind === ts.SyntaxKind.AnyKeyword) found = true;
    else ts.forEachChild(n, visit);
  };
  visit(typeNode);
  return found;
}

function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

function findEnclosingStatementOrExprText(node: ts.Node, sf: ts.SourceFile): string {
  let current: ts.Node = node;
  while (
    !ts.isSourceFile(current) &&
    !ts.isStatement(current) &&
    !ts.isVariableDeclaration(current)
  ) {
    current = current.parent;
  }
  return current.getText(sf);
}

function truncateOneLine(text: string, maxLen = 110): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length <= maxLen ? oneLine : `${oneLine.slice(0, maxLen - 3)}...`;
}

function getLineNumber(sf: ts.SourceFile, pos: number): number {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

function extractFieldShortName(node: CanonicalGraphNode): string {
  const qName = node.qualifiedName ?? node.name ?? node.id;
  const dot = qName.lastIndexOf('.');
  return dot >= 0 ? qName.slice(dot + 1) : (node.name ?? node.id);
}

function isExternalNode(node: CanonicalGraphNode): boolean {
  if (node.external === true) return true;
  const file = node.file ?? node.evidence?.file ?? '';
  return EXTERNAL_FILE_PATTERN.test(file);
}

function isTestNode(node: CanonicalGraphNode): boolean {
  const file = node.file ?? node.evidence?.file ?? '';
  return TEST_FILE_PATTERN.test(file);
}

function rolePriority(role: DataTraceRole): number {
  switch (role) {
    case 'writer':
      return 6;
    case 'producer':
      return 5;
    case 'transformer':
      return 4;
    case 'reader':
      return 3;
    case 'consumer':
      return 2;
    case 'accessor':
      return 1;
  }
}

function clampDepth(depth: number | undefined, fallback: number): number {
  if (depth === undefined || !Number.isFinite(depth)) return fallback;
  return Math.max(1, Math.min(6, Math.trunc(depth)));
}

function uniqueNodes(nodes: readonly CanonicalGraphNode[]): readonly CanonicalGraphNode[] {
  const seen = new Map<string, CanonicalGraphNode>();
  for (const node of nodes) {
    if (!seen.has(node.id)) seen.set(node.id, node);
  }
  return [...seen.values()].sort((a, b) => compareStrings(a.id, b.id));
}

function dedupeByKey<T>(items: readonly T[], keyOf: (item: T) => string): readonly T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    const key = keyOf(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Format a `DataTraceReport` into compact LLM-friendly Markdown.
 *
 * @doc [[Data Lineage and Slicing]]
 * @param report - Computed `DataTraceReport`
 * @returns Compact Markdown string
 * @public
 */
export function formatDataTraceLlmMarkdown(report: DataTraceReport): string {
  const lines: string[] = [];
  const toSuffix = report.query.toTarget ? ` -> ${report.query.toTarget}` : '';
  lines.push(`# Data Trace: ${report.query.target}${toSuffix}`);
  lines.push(
    `Status: ${report.status} | Tier: ${report.query.tier} | MaxDepth: ${report.query.maxDepth}`
  );
  if (report.candidateIds && report.candidateIds.length > 0) {
    lines.push(`CandidateIds: ${report.candidateIds.join(', ')}`);
  }
  lines.push('');

  lines.push('## Resolved Targets');
  for (const t of report.resolvedTargets) {
    lines.push(
      `- **${t.qualifiedName}** (\`${t.kind}\`, ${t.file ?? 'unknown'}:${t.startLine ?? 0}, origin=${t.origin}, role=${t.authorityRole})${t.signature ? ` — \`${t.signature}\`` : ''}`
    );
  }

  if (report.typeFlow) {
    lines.push('');
    lines.push('## Tier 1: Type & Field Flow');
    if (report.typeFlow.targetFields.length > 0) {
      lines.push('### Fields');
      for (const f of report.typeFlow.targetFields.slice(0, 20)) {
        lines.push(
          `- \`${f.readonly ? 'readonly ' : ''}${f.name}${f.signature ? `: ${f.signature}` : ''}\``
        );
      }
    }
    if (report.typeFlow.roleClassifiedUsages.length > 0) {
      lines.push('### Role-Classified Usages');
      for (const u of report.typeFlow.roleClassifiedUsages.slice(0, 25)) {
        lines.push(
          `- **[${u.role.toUpperCase()}]** \`${u.symbolName}\` (${u.file ?? ''}:${u.line ?? 0}, edge=\`${u.edgeKind}\`)${u.evidenceSnippet ? ` — \`${u.evidenceSnippet}\`` : ''}`
        );
      }
    }
    if (report.typeFlow.sharedStateJunctions.length > 0) {
      lines.push('### Shared-State Junctions');
      for (const j of report.typeFlow.sharedStateJunctions.slice(0, 15)) {
        lines.push(`- **${j.junctionName}** (\`${j.junctionKind}\`): ${j.explanation}`);
      }
    }
  }

  if (report.boundaryLineage) {
    lines.push('');
    lines.push(`## Tier 2: Cross-Boundary Domain Lineage (${report.boundaryLineage.lineageState})`);
    for (const cp of report.boundaryLineage.checkpoints) {
      lines.push(
        `- Checkpoint **[[${cp.checkpoint}]]** (${cp.bindingRole}${cp.specBindingId ? `, ${cp.specBindingId}` : ''})`
      );
    }
    for (const link of report.boundaryLineage.provenanceLinks.slice(0, 20)) {
      lines.push(
        `- \`${link.fromAuthority}\` --[${link.relation}]--> \`${link.toTarget}\` (${link.sourceKind}: ${link.evidence})`
      );
    }
    for (const b of report.boundaryLineage.persistenceBridges) {
      lines.push(
        `- Bridge **${b.storeOrRepoName}**: writers=[${b.writers.map((w) => `${w.symbolName}->${w.method}`).join(', ')}], readers=[${b.readers.map((r) => `${r.symbolName}->${r.method}`).join(', ')}]`
      );
    }
  }

  if (report.codeSlice) {
    lines.push('');
    lines.push('## Tier 3: AST Dataflow Slice');
    for (const s of report.codeSlice.slices) {
      lines.push(
        `### ${s.functionName} (${s.file}:${s.startLine}-${s.endLine}, seed=\`${s.seedExpression}\`)`
      );
      for (const step of s.steps) {
        const callInfo =
          step.calleeName !== undefined
            ? ` -> ${step.calleeName}(arg#${step.argIndex}${step.boundParamName ? `:${step.boundParamName}` : ''})`
            : '';
        lines.push(`- L${step.line} \`${step.operation}\`: \`${step.expression}\`${callInfo}`);
      }
      for (const tb of s.trustBoundaries) {
        lines.push(`- **WARNING [${tb.kind}]** L${tb.line} (${tb.failClosedStatus}): ${tb.reason}`);
      }
    }
  }

  return lines.join('\n');
}
