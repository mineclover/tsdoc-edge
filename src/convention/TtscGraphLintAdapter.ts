/** Invoke the upstream ttsc graph-lint evaluator and project its result into the convention plane. */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CanonicalProjectGraph } from '../indexer/contracts';

export const TTSC_GRAPH_LINT_ADAPTER_ID = 'tsdoc-edge/ttsc-graph-lint-adapter' as const;
export const TTSC_GRAPH_LINT_ADAPTER_VERSION = '1.0.0' as const;

export interface TtscGraphLintModule {
  buildGraphLintRules(dump: unknown, options: { rules: unknown }): unknown;
}

export interface GraphLintFinding {
  readonly resultKind: 'derived-graph-lint-finding';
  readonly findingId: string;
  readonly ruleId: string;
  readonly severity: 'error' | 'warning';
  readonly outcome: 'violated';
  readonly message: string;
  readonly seed?: Readonly<Record<string, unknown>>;
  readonly required: Readonly<Record<string, unknown>>;
  readonly depth: number;
  readonly direction: string;
  readonly reached: number;
}

export interface GraphLintRuleResult {
  readonly id: string;
  readonly description?: string;
  readonly severity: 'error' | 'warning';
  readonly ok: boolean;
  readonly seeds: number;
  readonly passed: number;
  readonly failed: number;
  readonly requireWithin: Readonly<Record<string, unknown>>;
  readonly traversal: Readonly<Record<string, unknown>>;
  readonly violations: readonly Readonly<Record<string, unknown>>[];
}

export interface GraphLintReport {
  readonly contractVersion: '1.0';
  readonly resultKind: 'derived-graph-lint-report';
  readonly reportId: string;
  readonly evaluator: {
    readonly id: typeof TTSC_GRAPH_LINT_ADAPTER_ID;
    readonly version: typeof TTSC_GRAPH_LINT_ADAPTER_VERSION;
  };
  readonly graphFingerprint: string;
  readonly summary: Readonly<Record<string, number>>;
  readonly rules: readonly GraphLintRuleResult[];
  readonly findings: readonly GraphLintFinding[];
}

export interface EvaluateTtscGraphLintFileOptions {
  readonly workspaceRoot: string;
  readonly graph: CanonicalProjectGraph;
  readonly filePath: string;
  readonly moduleSpecifier?: string;
  readonly moduleLoader?: () => Promise<TtscGraphLintModule>;
}

/** Evaluate one canonical graph with the upstream graph-router graph-lint function. */
export function evaluateTtscGraphLint(
  graph: CanonicalProjectGraph,
  rules: unknown,
  module: TtscGraphLintModule
): GraphLintReport {
  if (!Array.isArray(rules) || rules.length === 0) {
    return emptyGraphLintReport(graph.fingerprint);
  }

  const raw = module.buildGraphLintRules(toGraphDump(graph), { rules });
  const normalized = normalizeGraphLintResult(raw);
  const findings = normalized.rules.flatMap((rule) =>
    rule.violations.map((violation) => createFinding(rule, violation))
  );
  findings.sort((left, right) => left.findingId.localeCompare(right.findingId));
  const identity = {
    evaluator: {
      id: TTSC_GRAPH_LINT_ADAPTER_ID,
      version: TTSC_GRAPH_LINT_ADAPTER_VERSION,
    },
    graphFingerprint: graph.fingerprint,
    summary: normalized.summary,
    rules: normalized.rules,
    findings,
  };
  return freeze({
    contractVersion: '1.0',
    resultKind: 'derived-graph-lint-report',
    reportId: `graph-lint-report:${digest(identity)}`,
    evaluator: Object.freeze({
      id: TTSC_GRAPH_LINT_ADAPTER_ID,
      version: TTSC_GRAPH_LINT_ADAPTER_VERSION,
    }),
    graphFingerprint: graph.fingerprint,
    summary: normalized.summary,
    rules: normalized.rules,
    findings,
  });
}

/** Load a workspace-local graph-lint rule file and its upstream evaluator module. */
export async function evaluateTtscGraphLintFile(
  options: EvaluateTtscGraphLintFileOptions
): Promise<GraphLintReport> {
  const workspaceRoot = realDirectory(options.workspaceRoot);
  const requestedPath = path.resolve(workspaceRoot, options.filePath);
  if (!fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isFile()) {
    throw new Error(`Graph-lint rules file not found: ${requestedPath}`);
  }
  const absolutePath = fs.realpathSync(requestedPath);
  if (!inside(workspaceRoot, absolutePath)) {
    throw new Error('Graph-lint rules must resolve inside the workspace root');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid graph-lint rules JSON: ${detail}`);
  }
  const source = asRecord(parsed, 'graph-lint rules');
  const rules = source.rules;
  if (!Array.isArray(rules)) throw new Error('Graph-lint rules source must contain a rules array');

  const moduleSpecifier =
    options.moduleSpecifier ??
    process.env.TSDOC_EDGE_GRAPH_LINT_MODULE ??
    process.env.TSDOC_EDGE_GRAPH_ROUTER_MODULE;
  if (!options.moduleLoader && !moduleSpecifier) {
    throw new Error(
      'Graph-lint rules require TSDOC_EDGE_GRAPH_LINT_MODULE or TSDOC_EDGE_GRAPH_ROUTER_MODULE'
    );
  }
  const module = options.moduleLoader
    ? await options.moduleLoader()
    : await loadModule(moduleSpecifier as string);
  if (typeof module.buildGraphLintRules !== 'function') {
    throw new Error(
      'The configured ttsc graph module does not export buildGraphLintRules; use the graph-router package root, not artifact-source'
    );
  }
  return evaluateTtscGraphLint(options.graph, rules, module);
}

/** Create an explicit no-rules report so every convention result has one graph-lint plane. */
export function emptyGraphLintReport(graphFingerprint: string): GraphLintReport {
  const summary = Object.freeze({
    rules: 0,
    passed: 0,
    failed: 0,
    errors: 0,
    warnings: 0,
    seeds: 0,
    violations: 0,
  });
  return freeze({
    contractVersion: '1.0',
    resultKind: 'derived-graph-lint-report',
    reportId: `graph-lint-report:${digest({
      evaluator: { id: TTSC_GRAPH_LINT_ADAPTER_ID, version: TTSC_GRAPH_LINT_ADAPTER_VERSION },
      graphFingerprint,
      summary,
      rules: [],
      findings: [],
    })}`,
    evaluator: Object.freeze({
      id: TTSC_GRAPH_LINT_ADAPTER_ID,
      version: TTSC_GRAPH_LINT_ADAPTER_VERSION,
    }),
    graphFingerprint,
    summary,
    rules: Object.freeze([]),
    findings: Object.freeze([]),
  });
}

function normalizeGraphLintResult(value: unknown): {
  summary: Readonly<Record<string, number>>;
  rules: readonly GraphLintRuleResult[];
} {
  const result = asRecord(value, 'ttsc graph-lint result');
  const summaryRecord = asRecord(result.summary, 'ttsc graph-lint summary');
  const summary: Record<string, number> = {};
  for (const key of ['rules', 'passed', 'failed', 'errors', 'warnings', 'seeds', 'violations']) {
    summary[key] = positiveOrZero(summaryRecord[key], `summary.${key}`);
  }
  const rules = arrayValue(result.rules, 'ttsc graph-lint rules').map((entry, index) => {
    const rule = asRecord(entry, `rules[${index}]`);
    const violations = arrayValue(rule.violations, `rules[${index}].violations`).map(
      (violation, violationIndex) => {
        const record = asRecord(violation, `rules[${index}].violations[${violationIndex}]`);
        return freeze({
          ...cloneRecord(record),
          ruleId: textValue(record.ruleId, `rules[${index}].violations.ruleId`),
          severity: severityValue(record.severity, `rules[${index}].violations.severity`),
          message: textValue(record.message, `rules[${index}].violations.message`),
          required: asRecord(record.required, `rules[${index}].violations.required`),
          depth: positiveOrZero(record.depth, `rules[${index}].violations.depth`),
          direction: textValue(record.direction, `rules[${index}].violations.direction`),
          reached: positiveOrZero(record.reached, `rules[${index}].violations.reached`),
        });
      }
    );
    return freeze({
      id: textValue(rule.id, `rules[${index}].id`),
      ...(rule.description === undefined
        ? {}
        : { description: textValue(rule.description, `rules[${index}].description`) }),
      severity: severityValue(rule.severity, `rules[${index}].severity`),
      ok: booleanValue(rule.ok, `rules[${index}].ok`),
      seeds: positiveOrZero(rule.seeds, `rules[${index}].seeds`),
      passed: positiveOrZero(rule.passed, `rules[${index}].passed`),
      failed: positiveOrZero(rule.failed, `rules[${index}].failed`),
      requireWithin: asRecord(rule.requireWithin, `rules[${index}].requireWithin`),
      traversal: asRecord(rule.traversal, `rules[${index}].traversal`),
      violations,
    });
  });
  return { summary: Object.freeze(summary), rules: Object.freeze(rules) };
}

function createFinding(
  rule: GraphLintRuleResult,
  violation: Readonly<Record<string, unknown>>
): GraphLintFinding {
  const seed =
    violation.seed === undefined
      ? undefined
      : asRecord(violation.seed, `graph-lint ${rule.id} seed`);
  const payload = {
    ruleId: rule.id,
    severity: severityValue(violation.severity, `graph-lint ${rule.id} severity`),
    message: textValue(violation.message, `graph-lint ${rule.id} message`),
    ...(seed ? { seed } : {}),
    required: asRecord(violation.required, `graph-lint ${rule.id} required`),
    depth: positiveOrZero(violation.depth, `graph-lint ${rule.id} depth`),
    direction: textValue(violation.direction, `graph-lint ${rule.id} direction`),
    reached: positiveOrZero(violation.reached, `graph-lint ${rule.id} reached`),
  };
  return freeze({
    resultKind: 'derived-graph-lint-finding',
    findingId: `graph-lint-finding:${digest(payload)}`,
    outcome: 'violated',
    ...payload,
  });
}

function toGraphDump(graph: CanonicalProjectGraph): Readonly<Record<string, unknown>> {
  return {
    project: graph.provenance.graphNamespace ?? graph.rootDir,
    tsconfig: graph.tsconfigPath,
    nodes: graph.nodes,
    edges: graph.edges,
  };
}

async function loadModule(specifier: string): Promise<TtscGraphLintModule> {
  const resolved = path.resolve(specifier);
  const moduleValue =
    path.isAbsolute(specifier) || fs.existsSync(resolved)
      ? await import(pathToFileURL(resolved).href)
      : await import(specifier);
  return moduleValue as TtscGraphLintModule;
}

function realDirectory(value: string): string {
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Graph-lint workspace root not found: ${resolved}`);
  }
  return fs.realpathSync(resolved);
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function asRecord(value: unknown, field: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function arrayValue(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value;
}

function textValue(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${field} must be non-empty text`);
  return value;
}

function severityValue(value: unknown, field: string): 'error' | 'warning' {
  if (value === 'error' || value === 'warning') return value;
  throw new Error(`${field} must be error or warning`);
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${field} must be boolean`);
  return value;
}

function positiveOrZero(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value;
}

function cloneRecord(record: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
}

function digest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)])
  );
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
