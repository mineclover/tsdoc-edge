/**
 * Spec Metrics Aggregator - read-only projection of existing specification signals.
 *
 * Every number reported here is computed from an existing source of truth
 * (managed documents, `.tsdoc.db`, `.tsdoc/spec-graph.db`, or source JSDoc).
 * Signals that are not evaluated by this aggregator are reported as such rather
 * than estimated.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import * as ts from 'typescript';
import { ConfigManager } from '../config/ConfigManager';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { SpecGraphRepository } from '../storage/SpecGraphRepository';
import type { SpecStatus } from '../types/spec';
import { SpecCompletenessValidator } from './SpecCompletenessValidator';
import { SpecStatusManager } from './SpecStatusManager';

/**
 * Options for spec metrics aggregation
 * @public
 */
export interface SpecMetricsOptions {
  /** Directory containing managed specifications (default: specGovernance.authoredSpecDirs[0]) */
  managedDir?: string;
  /** Path to symbol SQLite database */
  dbPath?: string;
  /** Path to spec graph SQLite database */
  specDbPath?: string;
  /** Source code directory */
  srcDir?: string;
}

/**
 * The 7 aspects of the module specification framework, keyed to the canonical
 * `@microsoft/tsdoc` standard tags and irreducible `tsdoc-edge` domain tags that evidence them.
 */
export const MODULE_SPEC_ASPECT_TAGS = {
  purpose: ['@problem', '@responsibility', '@solves'],
  input: ['@param', '@precondition', '@contract'],
  output: ['@returns', '@throws', '@postcondition'],
  context: ['@context', '@relatedTo', '@requires', '@enhances'],
  logic: ['@algorithm', '@complexity', '@functionality', '@invariant', '@remarks'],
  effect: ['@sideEffect'],
  scope: ['@public', '@internal', '@beta', '@alpha'],
} as const;

/** Module specification aspect name. */
export type ModuleSpecAspect = keyof typeof MODULE_SPEC_ASPECT_TAGS;

/**
 * Unified specification metrics
 * @public
 */
export interface UnifiedSpecMetrics {
  timestamp: string;
  /** Weighted score over the evaluated dimensions only (0-100). */
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Directory whose markdown files were evaluated. */
  scope: string;

  /** 1. Document completeness, measured by SpecCompletenessValidator's feature-spec template. */
  documentQuality: {
    totalDocuments: number;
    completeCount: number;
    incompleteCount: number;
    completenessRate: number;
    averageDesignScore: number;
    averageImplementationScore: number;
    averageOverallScore: number;
    totalScenarios: number;
    totalExamples: number;
    totalConceptLinks: number;
    totalCodeLinks: number;
    totalIssues: number;
  };

  /** 2. Lifecycle status read from document frontmatter. */
  lifecycle: {
    distribution: Record<SpecStatus, number>;
    distributionPercentages: Record<SpecStatus, number>;
    activeRatio: number;
    readyForPromotionCount: number;
  };

  /** 3. Compiled SpecGraph structure. Conformance is evaluated only by `convention check`. */
  specGraph: {
    hasSpecGraph: boolean;
    revisionId?: string;
    nodeCount: number;
    edgeCount: number;
    bindingCount: number;
    obligationCount: number;
    conformanceEvaluated: false;
  };

  /** 4. Share of source files whose JSDoc carries at least one tag evidencing each aspect. */
  module7Aspects: {
    analyzedFiles: number;
    aspectCoverage: Record<ModuleSpecAspect, number>;
    averageAspectScore: number;
  };

  /** 5. Code-to-spec links. */
  codeConnectivity: {
    totalSymbols: number;
    exportedSymbols: number;
    /** Exported symbols that are the source of at least one `doc-reference` relationship. */
    exportedSymbolsWithDocReference: number;
    specCoverageRate: number;
    /** Footnote anchors (`[^sym-XXX]` by ID, `[^Name]` by symbol name) that resolve in `.tsdoc.db`. */
    validCodeLinksCount: number;
    brokenCodeLinks: Array<{ file: string; identifier: string }>;
    linkIntegrityRate: number;
  };

  recommendations: Array<{
    category: 'quality' | 'lifecycle' | 'conformance' | 'connectivity';
    severity: 'error' | 'warning' | 'info';
    message: string;
  }>;
}

/**
 * File-scoped spec context for a spec document or a source file
 * @public
 */
export interface FileSpecContext {
  filePath: string;
  isSpecFile: boolean;
  score?: number;
  status?: SpecStatus;
  boundSpecs?: Array<{
    symbolRef: string;
    filePath?: string;
    status?: SpecStatus;
    score?: number;
  }>;
  aspectsCoverage?: Record<ModuleSpecAspect, boolean>;
  recommendations: string[];
}

const STATUSES: readonly SpecStatus[] = [
  'draft',
  'review',
  'approved',
  'active',
  'deprecated',
  'archived',
];

/**
 * Read-only aggregator for specification metrics
 *
 * @doc [[SpecMetricsAggregator]]
 * @public
 * @responsibility Project existing spec, symbol, and JSDoc signals into one report without estimating
 * @contract Never reports a value it did not measure; unevaluated signals are marked explicitly
 */
export class SpecMetricsAggregator {
  private readonly completenessValidator = new SpecCompletenessValidator();
  private readonly statusManager = new SpecStatusManager();
  private readonly docSymbolParser = new DocumentSymbolParser();

  /**
   * Aggregate specification metrics for a scope
   *
   * @param options - Aggregation options
   * @returns Unified spec metrics
   * @public
   */
  aggregate(options: SpecMetricsOptions = {}): UnifiedSpecMetrics {
    const config = ConfigManager.getInstance().get();
    const cwd = process.cwd();
    const scope = options.managedDir ?? config.specGovernance?.authoredSpecDirs?.[0] ?? 'managed';
    const specFiles = collectFiles(path.resolve(cwd, scope), isMarkdown);
    const dbPath = path.resolve(cwd, options.dbPath ?? config.paths?.databasePath ?? '.tsdoc.db');
    const specDbPath = path.resolve(cwd, options.specDbPath ?? '.tsdoc/spec-graph.db');
    const srcDir = path.resolve(cwd, options.srcDir ?? config.project?.srcDirs?.[0] ?? 'src');

    const documentQuality = this.measureDocuments(specFiles);
    const lifecycle = this.measureLifecycle(specFiles);
    const specGraph = readSpecGraph(specDbPath);
    const module7Aspects = measureAspects(collectFiles(srcDir, isSource));
    const codeConnectivity = this.measureConnectivity(specFiles, dbPath);

    // Weighted only over dimensions this aggregator evaluates; SpecGraph conformance is excluded.
    const linkScore =
      codeConnectivity.specCoverageRate * 0.5 + codeConnectivity.linkIntegrityRate * 0.5;
    const raw =
      documentQuality.averageOverallScore * 0.3 +
      lifecycle.activeRatio * 0.2 +
      module7Aspects.averageAspectScore * 0.2 +
      linkScore * 0.3;
    const healthScore = clampScore(raw);

    return {
      timestamp: new Date().toISOString(),
      healthScore,
      grade: gradeOf(healthScore),
      scope,
      documentQuality,
      lifecycle,
      specGraph,
      module7Aspects,
      codeConnectivity,
      recommendations: buildRecommendations(
        documentQuality,
        lifecycle,
        specGraph,
        codeConnectivity,
        module7Aspects
      ),
    };
  }

  /**
   * Spec context for one file: completeness/status for a spec, bound specs and aspects for source
   *
   * @param filePath - Spec markdown path or TypeScript source path
   * @param options - Aggregation options (managedDir is used to resolve `@doc [[Symbol]]` targets)
   * @returns File-specific context
   * @public
   */
  getSpecMetricsForFile(filePath: string, options: SpecMetricsOptions = {}): FileSpecContext {
    const resolved = path.resolve(process.cwd(), filePath);
    if (isMarkdown(resolved)) {
      if (!fs.existsSync(resolved)) {
        return {
          filePath,
          isSpecFile: true,
          recommendations: [`Specification file not found: ${filePath}`],
        };
      }
      const completeness = this.completenessValidator.validate(resolved);
      const transitions = this.statusManager.getAllowedTransitions(resolved);
      const recommendations = completeness.issues.map((issue) => issue.message);
      if (transitions.length)
        recommendations.push(`Allowed transitions: ${transitions.join(', ')}`);
      return {
        filePath,
        isSpecFile: true,
        score: completeness.score,
        status: this.statusManager.getCurrentStatus(resolved),
        recommendations,
      };
    }

    if (!fs.existsSync(resolved)) {
      return {
        filePath,
        isSpecFile: false,
        recommendations: [`Source file not found: ${filePath}`],
      };
    }
    const source = fs.readFileSync(resolved, 'utf8');
    const tags = jsDocTagNames(resolved, source);
    const aspectsCoverage = Object.fromEntries(
      (Object.keys(MODULE_SPEC_ASPECT_TAGS) as ModuleSpecAspect[]).map((aspect) => [
        aspect,
        MODULE_SPEC_ASPECT_TAGS[aspect].some((tag) => tags.has(tag)),
      ])
    ) as Record<ModuleSpecAspect, boolean>;

    const index = this.indexSpecDocuments(options.managedDir ?? 'managed');
    const refs = [...new Set([...source.matchAll(/@doc\s+\[\[([^\]]+)\]\]/g)].map((m) => m[1]))];
    const boundSpecs = refs.map((symbolRef) => {
      const doc = index.get(symbolRef.split('#')[0]);
      if (!doc) return { symbolRef };
      return {
        symbolRef,
        filePath: path.relative(process.cwd(), doc),
        status: this.statusManager.getCurrentStatus(doc),
        score: this.completenessValidator.validate(doc).score,
      };
    });

    const recommendations: string[] = [];
    if (!refs.length) recommendations.push('No @doc [[Spec]] link in this file.');
    for (const unresolved of boundSpecs.filter((b) => !b.filePath)) {
      recommendations.push(
        `@doc [[${unresolved.symbolRef}]] does not resolve to a managed document.`
      );
    }
    for (const [aspect, covered] of Object.entries(aspectsCoverage)) {
      if (!covered)
        recommendations.push(
          `No ${aspect} aspect tag (${MODULE_SPEC_ASPECT_TAGS[aspect as ModuleSpecAspect].join(', ')}).`
        );
    }
    return { filePath, isSpecFile: false, boundSpecs, aspectsCoverage, recommendations };
  }

  private measureDocuments(files: string[]): UnifiedSpecMetrics['documentQuality'] {
    const results = files.map((file) => this.completenessValidator.validate(file));
    const n = results.length;
    const sum = (pick: (r: (typeof results)[number]) => number) =>
      results.reduce((total, r) => total + pick(r), 0);
    const complete = results.filter((r) => r.isComplete).length;
    return {
      totalDocuments: n,
      completeCount: complete,
      incompleteCount: n - complete,
      completenessRate: percent(complete, n),
      averageDesignScore: n ? Math.round(sum((r) => r.designScore) / n) : 0,
      averageImplementationScore: n ? Math.round(sum((r) => r.implementationScore) / n) : 0,
      averageOverallScore: n ? Math.round(sum((r) => r.score) / n) : 0,
      totalScenarios: sum((r) => r.breakdown.design.scenarios.count),
      totalExamples: sum((r) => r.breakdown.implementation.examples.count),
      totalConceptLinks: sum((r) => r.breakdown.design.conceptReferences.count),
      totalCodeLinks: sum((r) => r.breakdown.implementation.codeReferences.count),
      totalIssues: sum((r) => r.issues.length),
    };
  }

  private measureLifecycle(files: string[]): UnifiedSpecMetrics['lifecycle'] {
    const distribution = this.statusManager.getStatusDistribution(files);
    const n = files.length;
    const distributionPercentages = Object.fromEntries(
      STATUSES.map((status) => [status, percent(distribution[status] ?? 0, n)])
    ) as Record<SpecStatus, number>;
    return {
      distribution,
      distributionPercentages,
      activeRatio: percent((distribution.active ?? 0) + (distribution.approved ?? 0), n),
      readyForPromotionCount: this.statusManager
        .getPromotableDocs(files)
        .filter((doc) => doc.canPromote).length,
    };
  }

  private measureConnectivity(
    specFiles: string[],
    dbPath: string
  ): UnifiedSpecMetrics['codeConnectivity'] {
    const empty: UnifiedSpecMetrics['codeConnectivity'] = {
      totalSymbols: 0,
      exportedSymbols: 0,
      exportedSymbolsWithDocReference: 0,
      specCoverageRate: 0,
      validCodeLinksCount: 0,
      brokenCodeLinks: [],
      linkIntegrityRate: 100,
    };
    if (!fs.existsSync(dbPath)) return empty;

    const db = new Database(dbPath, { readonly: true });
    try {
      const rows = db.prepare('SELECT id, name, is_exported FROM symbols').all() as Array<{
        id: string;
        name: string;
        is_exported: number;
      }>;
      const ids = new Set(rows.map((r) => r.id));
      const names = new Set(rows.map((r) => r.name));
      const exported = new Set(rows.filter((r) => r.is_exported === 1).map((r) => r.id));

      const referenced = new Set<string>();
      const docRefs = db
        .prepare("SELECT from_symbols FROM unified_relationships WHERE type = 'doc-reference'")
        .all() as Array<{ from_symbols: string }>;
      for (const row of docRefs) {
        for (const id of parseIdList(row.from_symbols)) if (exported.has(id)) referenced.add(id);
      }

      let valid = 0;
      const broken: Array<{ file: string; identifier: string }> = [];
      for (const file of specFiles) {
        const parsed = this.docSymbolParser.parse(file);
        for (const ref of parsed?.symbolFootnoteRefs ?? []) {
          const resolves = ref.isIdRef ? ids.has(ref.identifier) : names.has(ref.identifier);
          if (resolves) valid += 1;
          else
            broken.push({ file: path.relative(process.cwd(), file), identifier: ref.identifier });
        }
      }

      return {
        totalSymbols: rows.length,
        exportedSymbols: exported.size,
        exportedSymbolsWithDocReference: referenced.size,
        specCoverageRate: percent(referenced.size, exported.size),
        validCodeLinksCount: valid,
        brokenCodeLinks: broken,
        linkIntegrityRate: valid + broken.length ? percent(valid, valid + broken.length) : 100,
      };
    } finally {
      db.close();
    }
  }

  /** Map `[[Symbol]]` primary definitions (H1) to their managed document path. */
  private indexSpecDocuments(dir: string): Map<string, string> {
    const index = new Map<string, string>();
    for (const file of collectFiles(path.resolve(process.cwd(), dir), isMarkdown)) {
      const primary = this.docSymbolParser.parse(file)?.primary?.name;
      if (primary && !index.has(primary)) index.set(primary, file);
    }
    return index;
  }
}

function readSpecGraph(specDbPath: string): UnifiedSpecMetrics['specGraph'] {
  const none: UnifiedSpecMetrics['specGraph'] = {
    hasSpecGraph: false,
    nodeCount: 0,
    edgeCount: 0,
    bindingCount: 0,
    obligationCount: 0,
    conformanceEvaluated: false,
  };
  if (!fs.existsSync(specDbPath)) return none;
  const repository = new SpecGraphRepository(specDbPath, { readOnly: true });
  try {
    const revision = repository.readActiveRevision();
    if (!revision) return none;
    return {
      hasSpecGraph: true,
      revisionId: revision.revisionId,
      nodeCount: revision.nodes.length,
      edgeCount: revision.edges.length,
      bindingCount: revision.bindings.length,
      obligationCount: revision.nodes.filter(
        (n) => n.kind === 'requirement' || n.kind === 'invariant' || n.kind === 'api-contract'
      ).length,
      conformanceEvaluated: false,
    };
  } finally {
    repository.close();
  }
}

function measureAspects(files: string[]): UnifiedSpecMetrics['module7Aspects'] {
  const aspects = Object.keys(MODULE_SPEC_ASPECT_TAGS) as ModuleSpecAspect[];
  const hits = Object.fromEntries(aspects.map((a) => [a, 0])) as Record<ModuleSpecAspect, number>;
  for (const file of files) {
    const tags = jsDocTagNames(file, fs.readFileSync(file, 'utf8'));
    for (const aspect of aspects) {
      if (MODULE_SPEC_ASPECT_TAGS[aspect].some((tag) => tags.has(tag))) hits[aspect] += 1;
    }
  }
  const aspectCoverage = Object.fromEntries(
    aspects.map((a) => [a, percent(hits[a], files.length)])
  ) as Record<ModuleSpecAspect, number>;
  const average = aspects.reduce((total, a) => total + aspectCoverage[a], 0) / aspects.length;
  return { analyzedFiles: files.length, aspectCoverage, averageAspectScore: Math.round(average) };
}

/** Tag names that appear in real JSDoc blocks (not in strings or code), e.g. `@param`. */
function jsDocTagNames(fileName: string, source: string): Set<string> {
  const names = new Set<string>();
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    for (const doc of (node as ts.Node & { jsDoc?: ts.JSDoc[] }).jsDoc ?? []) {
      for (const tag of doc.tags ?? []) names.add(`@${tag.tagName.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
}

function buildRecommendations(
  docs: UnifiedSpecMetrics['documentQuality'],
  lifecycle: UnifiedSpecMetrics['lifecycle'],
  graph: UnifiedSpecMetrics['specGraph'],
  links: UnifiedSpecMetrics['codeConnectivity'],
  aspects: UnifiedSpecMetrics['module7Aspects']
): UnifiedSpecMetrics['recommendations'] {
  const out: UnifiedSpecMetrics['recommendations'] = [];
  for (const broken of links.brokenCodeLinks) {
    out.push({
      category: 'connectivity',
      severity: 'error',
      message: `Unresolved footnote [^${broken.identifier}] in ${broken.file}`,
    });
  }
  if (!graph.hasSpecGraph) {
    out.push({
      category: 'conformance',
      severity: 'warning',
      message: "No active SpecGraph revision. Run 'tsdoc-edge spec extract'.",
    });
  } else if (graph.bindingCount > 0) {
    out.push({
      category: 'conformance',
      severity: 'info',
      message: `${graph.bindingCount} bindings compiled; evaluate them with 'tsdoc-edge convention check'.`,
    });
  }
  if (docs.incompleteCount > 0) {
    out.push({
      category: 'quality',
      severity: 'info',
      message: `${docs.incompleteCount}/${docs.totalDocuments} documents miss the feature-spec template (sections, scenarios, code refs).`,
    });
  }
  if (lifecycle.readyForPromotionCount > 0) {
    out.push({
      category: 'lifecycle',
      severity: 'info',
      message: `${lifecycle.readyForPromotionCount} documents meet the score for their next status ('tsdoc-edge spec status list-ready').`,
    });
  }
  const weakest = (
    Object.entries(aspects.aspectCoverage) as Array<[ModuleSpecAspect, number]>
  ).sort((a, b) => a[1] - b[1])[0];
  if (weakest && weakest[1] < 50) {
    out.push({
      category: 'quality',
      severity: 'info',
      message: `Weakest module-spec aspect: ${weakest[0]} (${weakest[1]}% of files; tags ${MODULE_SPEC_ASPECT_TAGS[weakest[0]].join(', ')}).`,
    });
  }
  return out;
}

function parseIdList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return value ? [value] : [];
  }
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function clampScore(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

function gradeOf(score: number): UnifiedSpecMetrics['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function isMarkdown(file: string): boolean {
  return file.endsWith('.md');
}

function isSource(file: string): boolean {
  return (file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.d.ts');
}

function collectFiles(target: string, accept: (file: string) => boolean): string[] {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return accept(target) ? [target] : [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    if (entry.name === '__tests__' || entry.name === 'dist') continue;
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, accept));
    else if (entry.isFile() && accept(full)) out.push(full);
  }
  return out.sort();
}
