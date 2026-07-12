/** Deterministic first consuming rule for canonical-node-addressed TSDoc. */

import { createHash } from 'node:crypto';
import type { CanonicalGraphNode, CanonicalProjectGraph } from '../indexer';
import { parseCanonicalId } from '../indexer/canonical-id';
import type { EnrichmentRevision } from '../semantic-graph/analysis-input-revisions';
import type { TsdocConventionConfig, TsdocConventionRule } from '../types/config';

export const TSDOC_CONVENTION_EVALUATOR_ID = 'tsdoc-edge/tsdoc-convention-evaluator' as const;
export const TSDOC_CONVENTION_EVALUATOR_VERSION = '1.0.0' as const;

export interface TsdocConventionFinding {
  readonly resultKind: 'derived-tsdoc-finding';
  readonly findingId: string;
  readonly ruleId: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly outcome: 'violated';
  readonly nodeId: string;
  readonly file: string;
  readonly missingTags: readonly string[];
}

export interface TsdocConventionReport {
  readonly contractVersion: '1.0';
  readonly resultKind: 'derived-tsdoc-report';
  readonly reportId: string;
  readonly evaluator: {
    readonly id: typeof TSDOC_CONVENTION_EVALUATOR_ID;
    readonly version: typeof TSDOC_CONVENTION_EVALUATOR_VERSION;
  };
  readonly enrichmentRevisionId: string;
  readonly configFingerprint: string;
  readonly evaluatedSubjectCount: number;
  readonly findings: readonly TsdocConventionFinding[];
}

/** Evaluate first-matching tag requirements against exactly one enrichment revision. */
export class TsdocConventionEvaluator {
  evaluate(
    graph: CanonicalProjectGraph,
    enrichment: EnrichmentRevision,
    config: TsdocConventionConfig
  ): TsdocConventionReport {
    validateConfig(config);
    const tagsBySymbol = new Map<string, ReadonlySet<string>>();
    for (const item of enrichment.items) {
      if (item.kind !== 'tsdoc') continue;
      tagsBySymbol.set(item.symbolId, new Set(item.tags.map((tag) => tag.name)));
    }
    const evaluated: Array<{ nodeId: string; ruleId: string; missingTags: readonly string[] }> = [];
    const findings: TsdocConventionFinding[] = [];
    for (const node of graph.nodes) {
      const file = nodeFile(node);
      if (!file) continue;
      const rule = firstRule(config.rules, file, node);
      if (!rule) continue;
      const observed = tagsBySymbol.get(node.id) ?? new Set<string>();
      const missingTags = rule.requiredTags.filter((tag) => !observed.has(tag));
      evaluated.push({ nodeId: node.id, ruleId: rule.id, missingTags });
      if (missingTags.length) findings.push(createFinding(rule, node.id, file, missingTags));
    }
    evaluated.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
    findings.sort((left, right) => left.findingId.localeCompare(right.findingId));
    const configFingerprint = digest(config);
    return Object.freeze({
      contractVersion: '1.0',
      resultKind: 'derived-tsdoc-report',
      reportId: `tsdoc-report:${digest({
        evaluator: {
          id: TSDOC_CONVENTION_EVALUATOR_ID,
          version: TSDOC_CONVENTION_EVALUATOR_VERSION,
        },
        enrichmentRevisionId: enrichment.revisionId,
        configFingerprint,
        graphFingerprint: graph.fingerprint,
        evaluated,
      })}`,
      evaluator: Object.freeze({
        id: TSDOC_CONVENTION_EVALUATOR_ID,
        version: TSDOC_CONVENTION_EVALUATOR_VERSION,
      }),
      enrichmentRevisionId: enrichment.revisionId,
      configFingerprint,
      evaluatedSubjectCount: evaluated.length,
      findings: Object.freeze(findings),
    });
  }
}

function createFinding(
  rule: TsdocConventionRule,
  nodeId: string,
  file: string,
  missingTags: readonly string[]
): TsdocConventionFinding {
  const severity = rule.severity ?? 'warning';
  const payload = { ruleId: rule.id, nodeId, file, missingTags, severity };
  return Object.freeze({
    resultKind: 'derived-tsdoc-finding',
    findingId: `tsdoc-finding:${digest(payload)}`,
    ruleId: rule.id,
    severity,
    outcome: 'violated',
    nodeId,
    file,
    missingTags: Object.freeze([...missingTags]),
  });
}

function validateConfig(config: TsdocConventionConfig): void {
  if (config.contractVersion !== '1.0') {
    throw new Error(`Unsupported TSDoc convention contract: ${String(config.contractVersion)}`);
  }
  const ids = new Set<string>();
  for (const rule of config.rules) {
    if (!rule.id.trim() || ids.has(rule.id))
      throw new Error(`Duplicate or empty TSDoc rule id: ${rule.id}`);
    ids.add(rule.id);
    if (!rule.path.trim() || rule.path.startsWith('/') || rule.path.includes('..')) {
      throw new Error(`TSDoc rule ${rule.id} path must be a workspace-relative glob`);
    }
    if (
      !rule.requiredTags.length ||
      rule.requiredTags.some((tag) => !tag.trim() || tag.startsWith('@'))
    ) {
      throw new Error(`TSDoc rule ${rule.id} requiredTags must contain non-empty names without @`);
    }
    if (new Set(rule.requiredTags).size !== rule.requiredTags.length) {
      throw new Error(`TSDoc rule ${rule.id} requiredTags must be unique`);
    }
    if (rule.severity && !['error', 'warning', 'info'].includes(rule.severity)) {
      throw new Error(`TSDoc rule ${rule.id} has an invalid severity`);
    }
    if (rule.pathCase && rule.pathCase !== 'sensitive' && rule.pathCase !== 'insensitive') {
      throw new Error(`TSDoc rule ${rule.id} has an invalid pathCase`);
    }
  }
}

function firstRule(
  rules: readonly TsdocConventionRule[],
  file: string,
  node: CanonicalGraphNode
): TsdocConventionRule | undefined {
  return rules.find(
    (rule) =>
      globMatches(rule.path, file, rule.pathCase ?? 'sensitive') &&
      (!rule.kinds?.length || rule.kinds.includes(node.kind)) &&
      (rule.exported === undefined || rule.exported === node.exported)
  );
}

function nodeFile(node: CanonicalGraphNode): string | undefined {
  const value = typeof node.file === 'string' ? node.file : parseCanonicalId(node.id)?.filePath;
  if (!value || value.startsWith('/') || value.includes('\\')) return undefined;
  return value.replace(/^\.\//, '');
}

function globMatches(
  pattern: string,
  value: string,
  pathCase: 'sensitive' | 'insensitive'
): boolean {
  let expression = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    const next = pattern[index + 1];
    if (character === '*' && next === '*') {
      if (pattern[index + 2] === '/') {
        expression += '(?:.*/)?';
        index += 2;
      } else {
        expression += '.*';
        index += 1;
      }
    } else if (character === '*') expression += '[^/]*';
    else if (character === '?') expression += '[^/]';
    else expression += escapeRegex(character);
  }
  expression += '$';
  return new RegExp(expression, pathCase === 'insensitive' ? 'i' : '').test(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}
