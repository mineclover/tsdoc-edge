/**
 * Canonical cross-specification bridge mapping `@microsoft/tsdoc` standard tags
 * and `ttsc` (`@ttsc/graph` + TypeScript AST) facts onto `tsdoc-edge` relationships
 * and 7-aspect module specifications.
 *
 * Where responsibilities overlap, each domain retains its single canonical SSOT
 * and `tsdoc-edge` manages only the relationship mapping rather than duplicating tags.
 *
 * @doc [[CrossSpecIntegrationContract]]
 * @doc [[TsdocEdgePlatformSpecification]]
 * @packageDocumentation
 */

import {
  GraphAnalysisService,
  graphEdgeSemantic,
  type RelationshipProjectionOptions,
} from '../../graph-analysis';
import type { CanonicalProjectGraph } from '../../indexer/contracts';
import type { RelationshipType, UnifiedRelationship } from '../relationships/unified';

/**
 * Module specification aspect name in the 7-aspect framework.
 *
 * @public
 */
export type CanonicalModuleSpecAspect =
  | 'purpose'
  | 'input'
  | 'output'
  | 'context'
  | 'logic'
  | 'effect'
  | 'scope';

/**
 * Canonical edge kinds emitted by `@ttsc/graph` into `canonical_graph_edges`.
 *
 * @public
 */
export type TtscCanonicalEdgeKind =
  | 'accesses'
  | 'type_ref'
  | 'calls'
  | 'instantiates'
  | 'extends'
  | 'implements';

/**
 * Canonical SSOT owner for a retired custom tag.
 *
 * @public
 */
export type CanonicalTagOwner =
  | 'tsdoc-standard'
  | 'ttsc-graph-ast'
  | 'tsdoc-edge-spec'
  | 'tsdoc-edge-consolidated';

/**
 * Mapping descriptor from one `ttsc` canonical graph edge or AST fact to `tsdoc-edge`.
 *
 * @public
 */
export interface TtscRelationshipBridgeEntry {
  /** Source fact kind owned by `ttsc` (`@ttsc/graph` or TypeScript AST) */
  readonly ttscFact: TtscCanonicalEdgeKind | 'canonical-node-id' | 'ast-import' | 'ast-visibility';
  /** Target `tsdoc-edge` unified relationship type when projected into the relationship plane */
  readonly relationshipType?: RelationshipType;
  /** Target 7-aspect module specification dimension */
  readonly moduleSpecAspects: readonly CanonicalModuleSpecAspect[];
  /** Redundant custom TSDoc tags retired by this `ttsc` canonical fact */
  readonly retiredTags: readonly string[];
}

/**
 * Mapping descriptor from `@microsoft/tsdoc` v0 standard tags to `tsdoc-edge`.
 *
 * @public
 */
export interface TsdocStandardBridgeEntry {
  /** Standard `@microsoft/tsdoc` tag or syntax construct (e.g. `summary`, `@param`) */
  readonly standardConstruct: string;
  /** Target 7-aspect module specification dimensions, if applicable */
  readonly moduleSpecAspects: readonly CanonicalModuleSpecAspect[];
  /** Redundant JSDoc or custom tags retired by this standard construct */
  readonly retiredTags: readonly string[];
}

/**
 * Migration record explaining why a tag was removed from `tsdoc.json` and what replaces it.
 *
 * @public
 */
export interface RetiredTagMigration {
  /** Retired tag name including `@` prefix */
  readonly tagName: string;
  /** Canonical SSOT system that owns this responsibility */
  readonly owner: CanonicalTagOwner;
  /** Canonical replacement construct, tag, or AST/graph fact */
  readonly replacement: string;
  /** Concise architectural rationale */
  readonly rationale: string;
}

/**
 * Authoritative mapping from `ttsc` (`@ttsc/graph` + TypeScript AST) facts to
 * `tsdoc-edge` relationship types and module specification aspects.
 *
 * @doc [[TtscPlatformSpecification]]
 * @doc [[CrossSpecIntegrationContract]]
 * @public
 */
export const CANONICAL_TTSC_RELATIONSHIP_BRIDGE: readonly TtscRelationshipBridgeEntry[] = [
  {
    ttscFact: 'implements',
    relationshipType: 'implementation',
    moduleSpecAspects: ['scope'],
    retiredTags: ['@implements'],
  },
  {
    ttscFact: 'extends',
    relationshipType: 'inheritance',
    moduleSpecAspects: ['scope'],
    retiredTags: ['@extends'],
  },
  {
    ttscFact: 'calls',
    relationshipType: 'calls',
    moduleSpecAspects: ['context'],
    retiredTags: ['@uses', '@usedBy'],
  },
  {
    ttscFact: 'accesses',
    relationshipType: 'code-dependency',
    moduleSpecAspects: ['context'],
    retiredTags: ['@depends', '@dependsOn', '@uses', '@usedBy'],
  },
  {
    ttscFact: 'instantiates',
    relationshipType: 'code-dependency',
    moduleSpecAspects: ['context'],
    retiredTags: ['@depends', '@dependsOn', '@uses'],
  },
  {
    ttscFact: 'type_ref',
    relationshipType: 'type-dependency',
    moduleSpecAspects: ['input', 'output', 'context'],
    retiredTags: ['@depends', '@input', '@output'],
  },
  {
    ttscFact: 'ast-import',
    relationshipType: 'code-dependency',
    moduleSpecAspects: ['context'],
    retiredTags: ['@depends', '@dependsOn', '@depType', '@depReason'],
  },
  {
    ttscFact: 'ast-visibility',
    moduleSpecAspects: ['scope'],
    retiredTags: ['@private', '@scope'],
  },
  {
    ttscFact: 'canonical-node-id',
    moduleSpecAspects: ['scope'],
    retiredTags: ['@id'],
  },
] as const;

/**
 * Authoritative mapping from `@microsoft/tsdoc` v0 standard constructs to
 * `tsdoc-edge` 7-aspect module specifications and retired legacy/JSDoc tags.
 *
 * @doc [[TSDocStandardSpecification]]
 * @doc [[CrossSpecIntegrationContract]]
 * @public
 */
export const CANONICAL_TSDOC_STANDARD_BRIDGE: readonly TsdocStandardBridgeEntry[] = [
  {
    standardConstruct: 'summary',
    moduleSpecAspects: ['purpose'],
    retiredTags: ['@description'],
  },
  {
    standardConstruct: '@param',
    moduleSpecAspects: ['input'],
    retiredTags: ['@input'],
  },
  {
    standardConstruct: '@returns',
    moduleSpecAspects: ['output'],
    retiredTags: ['@output'],
  },
  {
    standardConstruct: '@throws',
    moduleSpecAspects: ['output'],
    retiredTags: [],
  },
  {
    standardConstruct: '@typeParam',
    moduleSpecAspects: ['input'],
    retiredTags: ['@template'],
  },
  {
    standardConstruct: '@packageDocumentation',
    moduleSpecAspects: ['scope'],
    retiredTags: ['@module'],
  },
  {
    standardConstruct: '@defaultValue',
    moduleSpecAspects: ['input'],
    retiredTags: ['@default'],
  },
  {
    standardConstruct: '@public/@internal/@beta/@alpha',
    moduleSpecAspects: ['scope'],
    retiredTags: ['@private', '@scope'],
  },
  {
    standardConstruct: '@remarks',
    moduleSpecAspects: ['logic'],
    retiredTags: ['@logic'],
  },
  {
    standardConstruct: '@privateRemarks',
    moduleSpecAspects: [],
    retiredTags: ['@todo', '@plan', '@priority'],
  },
  {
    standardConstruct: '@deprecated+{@link}',
    moduleSpecAspects: ['scope'],
    retiredTags: ['@deprecatedInFavorOf', '@symbol'],
  },
  {
    standardConstruct: '@see+{@link}',
    moduleSpecAspects: ['context'],
    retiredTags: ['@issue'],
  },
] as const;

/**
 * Complete registry of all 41 tags retired from `tsdoc.json` and `TSDOC_EDGE_CUSTOM_TAGS`
 * in favor of their single canonical SSOT owner.
 *
 * @doc [[CrossSpecIntegrationContract]]
 * @public
 */
export const RETIRED_CUSTOM_TAG_MIGRATIONS: readonly RetiredTagMigration[] = [
  // 1. Legacy JSDoc compatibility shims (7)
  {
    tagName: '@private',
    owner: 'ttsc-graph-ast',
    replacement: 'TypeScript `private` modifier or standard `@internal`',
    rationale: 'Class member privacy is owned by TS AST; internal API stage uses `@internal`.',
  },
  {
    tagName: '@description',
    owner: 'tsdoc-standard',
    replacement: 'TSDoc summary paragraph',
    rationale: 'TSDoc defines the leading paragraph before block tags as the canonical summary.',
  },
  {
    tagName: '@template',
    owner: 'tsdoc-standard',
    replacement: '`@typeParam T - description`',
    rationale: '`@microsoft/tsdoc` standardizes generic parameter documentation on `@typeParam`.',
  },
  {
    tagName: '@module',
    owner: 'tsdoc-standard',
    replacement: '`@packageDocumentation`',
    rationale: 'File/module-level documentation uses standard `@packageDocumentation`.',
  },
  {
    tagName: '@todo',
    owner: 'tsdoc-standard',
    replacement: '`@privateRemarks TODO: ...`',
    rationale: 'Internal backlog notes belong in `@privateRemarks` so public API docs stay clean.',
  },
  {
    tagName: '@default',
    owner: 'tsdoc-standard',
    replacement: '`@defaultValue`',
    rationale: '`@microsoft/tsdoc` standardizes default values on `@defaultValue`.',
  },
  {
    tagName: '@version',
    owner: 'tsdoc-edge-spec',
    replacement: 'Git history / `package.json` / spec YAML frontmatter `version`',
    rationale: 'Per-comment `@version` tags drift from source control and package metadata.',
  },

  // 2. Code-space dependency & identity tags owned by `ttsc` (9)
  {
    tagName: '@implements',
    owner: 'ttsc-graph-ast',
    replacement: '`@ttsc/graph` `implements` edge -> `implementation`',
    rationale: 'Interface implementation is deterministically extracted from TypeScript AST.',
  },
  {
    tagName: '@extends',
    owner: 'ttsc-graph-ast',
    replacement: '`@ttsc/graph` `extends` edge -> `inheritance`',
    rationale: 'Class/interface inheritance is deterministically extracted from TypeScript AST.',
  },
  {
    tagName: '@uses',
    owner: 'ttsc-graph-ast',
    replacement: '`@ttsc/graph` `calls` / `accesses` / `instantiates` / `type_ref` edges',
    rationale: 'Symbol usage edges are computed directly by `ttsc` semantic graph analysis.',
  },
  {
    tagName: '@usedBy',
    owner: 'ttsc-graph-ast',
    replacement: 'Incoming `canonical_graph_edges` projection (`to_node_id`)',
    rationale: 'Reverse usage is an exact graph query over `ttsc` edges, never hand-maintained.',
  },
  {
    tagName: '@dependsOn',
    owner: 'ttsc-graph-ast',
    replacement: '`@ttsc/graph` outgoing edges + TypeScript `import` AST',
    rationale: 'Code dependencies are owned by AST imports and `ttsc` canonical edges.',
  },
  {
    tagName: '@depends',
    owner: 'ttsc-graph-ast',
    replacement:
      'TypeScript `import` AST + `@ttsc/graph` edges (or `@relatedTo` for non-AST links)',
    rationale: 'Manual `@depends` lists duplicate `import` declarations and rot as code evolves.',
  },
  {
    tagName: '@depType',
    owner: 'ttsc-graph-ast',
    replacement: 'AST module specifier classification (`external` vs `module` vs `symbol`)',
    rationale: 'Import target kind is derived directly from the module specifier and AST bindings.',
  },
  {
    tagName: '@depReason',
    owner: 'ttsc-graph-ast',
    replacement: '`@context` for runtime environment assumptions',
    rationale: 'Retired alongside `@depends`; domain environment rationale belongs in `@context`.',
  },
  {
    tagName: '@id',
    owner: 'ttsc-graph-ast',
    replacement: '`CanonicalNodeId` (`ttsc:<workspace>:<path>#<QualifiedName>:<kind>`)',
    rationale: 'Canonical symbol identity is deterministically allocated from workspace AST paths.',
  },

  // 3. Overlaps with `@microsoft/tsdoc` standard tags (9)
  {
    tagName: '@deprecatedInFavorOf',
    owner: 'tsdoc-standard',
    replacement: '`@deprecated Use {@link Target} instead.`',
    rationale: 'Standard `@deprecated` combined with inline `{@link}` already expresses migration.',
  },
  {
    tagName: '@symbol',
    owner: 'tsdoc-standard',
    replacement: '`{@link Symbol}`',
    rationale: 'Standard TSDoc `{@link}` already provides structured inline symbol references.',
  },
  {
    tagName: '@scope',
    owner: 'tsdoc-standard',
    replacement: '`@public` / `@internal` / `@beta` / `@alpha` + TS AST modifiers',
    rationale: 'Release and access scope are owned by standard TSDoc modifiers and TS AST.',
  },
  {
    tagName: '@input',
    owner: 'tsdoc-standard',
    replacement: '`@param` + `@precondition` + TS parameter types',
    rationale: 'Duplicates `@param` and `@precondition` in the Input aspect.',
  },
  {
    tagName: '@output',
    owner: 'tsdoc-standard',
    replacement: '`@returns` + `@throws` + `@postcondition` + TS return types',
    rationale: 'Duplicates `@returns` and `@postcondition` in the Output aspect.',
  },
  {
    tagName: '@plan',
    owner: 'tsdoc-standard',
    replacement: '`@privateRemarks PLAN: ...` or `managed/specs/` roadmap docs',
    rationale:
      'Inline engineering backlog items use `@privateRemarks`; product plans live in specs.',
  },
  {
    tagName: '@priority',
    owner: 'tsdoc-standard',
    replacement: '`@privateRemarks PLAN [high|medium|low]: ...`',
    rationale: 'Retired alongside `@plan` and `@todo`.',
  },
  {
    tagName: '@updated',
    owner: 'tsdoc-edge-spec',
    replacement: 'Git commit timestamps / spec YAML frontmatter',
    rationale: 'Manual timestamps in source comments inevitably diverge from Git history.',
  },
  {
    tagName: '@changelog',
    owner: 'tsdoc-edge-spec',
    replacement: 'Git history / release notes',
    rationale: 'Source comments are not a version-control changelog.',
  },

  // 4. Consolidated `tsdoc-edge` synonyms & authored-spec/runtime-owned tags (16)
  {
    tagName: '@purpose',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@responsibility`, `@problem`, `@solves`',
    rationale:
      'Consolidated into the canonical Purpose triad (`@responsibility`/`@problem`/`@solves`).',
  },
  {
    tagName: '@useCase',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@context` or `@example`',
    rationale:
      'Target execution context belongs in `@context`; concrete usage belongs in `@example`.',
  },
  {
    tagName: '@logic',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@algorithm` or `@remarks`',
    rationale: 'Duplicates `@algorithm` in the 7-aspect Logic dimension.',
  },
  {
    tagName: '@performance',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@complexity`',
    rationale: 'Asymptotic and runtime cost characteristics are consolidated under `@complexity`.',
  },
  {
    tagName: '@mutates',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@sideEffect state: <target> - <description>`',
    rationale: 'State mutations are unified under `@sideEffect` with `type: "state"`.',
  },
  {
    tagName: '@io',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@sideEffect filesystem|network|database: <description>`',
    rationale: 'External I/O effects are unified under `@sideEffect`.',
  },
  {
    tagName: '@reads',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@sideEffect <kind>: <description> (read)`',
    rationale: 'Read operations are expressed via `@sideEffect` operation qualifiers.',
  },
  {
    tagName: '@writes',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@sideEffect <kind>: <description> (write)`',
    rationale: 'Write operations are expressed via `@sideEffect` operation qualifiers.',
  },
  {
    tagName: '@designDecision',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@decision`',
    rationale: 'Duplicate synonym of `@decision` in the ADR triad.',
  },
  {
    tagName: '@architecture',
    owner: 'tsdoc-edge-spec',
    replacement: '`@context` or `managed/conventions/` layer policies',
    rationale:
      'Architectural layer membership is enforced by convention packs and directory layout.',
  },
  {
    tagName: '@pattern',
    owner: 'tsdoc-edge-consolidated',
    replacement: '`@decision` or `@remarks`',
    rationale: 'Design pattern selection is recorded as an ADR `@decision` or `@remarks`.',
  },
  {
    tagName: '@requirement',
    owner: 'tsdoc-edge-spec',
    replacement: '`managed/specs/*.md` `tsdoc-spec` block (`kind: "requirement"`, `bindings`)',
    rationale: 'Requirements are authored in `managed/specs/` and bound to `CanonicalNodeId`s.',
  },
  {
    tagName: '@issue',
    owner: 'tsdoc-standard',
    replacement: '`@see` issue URL/identifier',
    rationale: 'External issue tracker references use standard `@see`.',
  },
  {
    tagName: '@testedBy',
    owner: 'ttsc-graph-ast',
    replacement: '`TestRelationshipExtractor` + `ttsc` test-to-source call/import graph',
    rationale: 'Test file links are discovered automatically from test AST imports and calls.',
  },
  {
    tagName: '@coverage',
    owner: 'tsdoc-edge-spec',
    replacement: '`CoverageParser` (LCOV / Istanbul runtime report)',
    rationale: 'Test coverage percentages are runtime measurements, never static source comments.',
  },
  {
    tagName: '@fixture',
    owner: 'ttsc-graph-ast',
    replacement: 'Test fixture module conventions + `@internal`',
    rationale: 'Zero comment usages; test fixtures are identified by path and test AST.',
  },
] as const;

const RETIRED_BY_NAME: ReadonlyMap<string, RetiredTagMigration> = new Map(
  RETIRED_CUSTOM_TAG_MIGRATIONS.map((entry) => [entry.tagName, entry])
);

/**
 * Map a canonical `@ttsc/graph` edge kind onto its corresponding `tsdoc-edge`
 * unified relationship type by delegating directly to the canonical
 * `graphEdgeSemantic` registry (`src/graph-analysis/edge-semantics.ts`).
 *
 * @param kind - Canonical edge kind emitted by `@ttsc/graph`
 * @returns Corresponding `tsdoc-edge` `RelationshipType`
 * @public
 */
export function mapTtscEdgeKindToRelationshipType(kind: TtscCanonicalEdgeKind): RelationshipType {
  const relationshipType = graphEdgeSemantic(kind).relationshipType;
  if (!relationshipType) {
    throw new Error(`Unprojectable @ttsc/graph canonical edge kind: ${kind}`);
  }
  return relationshipType;
}

/**
 * Project canonical `@ttsc/graph` compiler edges directly into `tsdoc-edge`
 * `UnifiedRelationship` records via `GraphAnalysisService.projectUnifiedRelationships`.
 *
 * @param graph - Canonical project graph produced from `@ttsc/graph`
 * @param options - Optional edge-kind or semantic-category filters
 * @returns Immutable array of projected `UnifiedRelationship` records
 * @public
 */
export function projectCanonicalTtscRelationships(
  graph: CanonicalProjectGraph,
  options: RelationshipProjectionOptions = {}
): readonly UnifiedRelationship[] {
  return new GraphAnalysisService(graph).projectUnifiedRelationships(options);
}

/**
 * Look up the canonical SSOT owner and replacement for a retired custom TSDoc tag.
 *
 * @param tagName - Tag name with or without `@` prefix
 * @returns Migration descriptor if the tag was retired, otherwise `undefined`
 * @public
 */
export function lookupRetiredTagMigration(tagName: string): RetiredTagMigration | undefined {
  const normalized = tagName.startsWith('@') ? tagName : `@${tagName}`;
  return RETIRED_BY_NAME.get(normalized);
}
