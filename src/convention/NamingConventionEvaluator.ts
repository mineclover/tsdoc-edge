/** Deterministic location-aware naming evaluation over canonical graph nodes. */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CanonicalGraphNode, CanonicalProjectGraph } from '../indexer';
import { parseCanonicalId } from '../indexer/canonical-id';
import type { NamingConventionConfig, NamingConventionRule } from '../types/config';

export const NAMING_CONVENTION_EVALUATOR_ID = 'tsdoc-edge/naming-convention-evaluator' as const;
export const NAMING_CONVENTION_EVALUATOR_VERSION = '1.0.0' as const;

export interface NamingConventionFinding {
  readonly resultKind: 'derived-naming-finding';
  readonly findingId: string;
  readonly ruleId: string;
  readonly target: 'file' | 'symbol';
  readonly style: NamingConventionRule['style'];
  readonly severity: 'error' | 'warning' | 'info';
  readonly outcome: 'violated';
  readonly file: string;
  readonly subject: string;
  readonly nodeId?: string;
  readonly expected: string;
}

export interface NamingConventionReport {
  readonly contractVersion: '1.0';
  readonly resultKind: 'derived-naming-report';
  readonly reportId: string;
  readonly evaluator: {
    readonly id: typeof NAMING_CONVENTION_EVALUATOR_ID;
    readonly version: typeof NAMING_CONVENTION_EVALUATOR_VERSION;
  };
  readonly configFingerprint: string;
  readonly evaluatedSubjectCount: number;
  readonly findings: readonly NamingConventionFinding[];
}

interface EvaluatedSubject {
  readonly ruleId: string;
  readonly target: 'file' | 'symbol';
  readonly file: string;
  readonly subject: string;
  readonly nodeId?: string;
  readonly passed: boolean;
}

export interface NamingConventionEvaluationOptions {
  /** Optional workspace root used to evaluate document/artifact filename rules. */
  readonly workspaceRoot?: string;
}

/**
 * Evaluate the first matching naming rule for each file or graph node.
 * Paths are normalized to workspace-relative POSIX form before glob matching.
 */
export class NamingConventionEvaluator {
  evaluate(
    graph: CanonicalProjectGraph,
    config: NamingConventionConfig,
    options: NamingConventionEvaluationOptions = {}
  ): NamingConventionReport {
    validateConfig(config);
    const rules = [...config.rules];
    const evaluated: EvaluatedSubject[] = [];
    const findings: NamingConventionFinding[] = [];
    const files = uniqueFiles(graph.nodes, rules, options.workspaceRoot);

    for (const file of files) {
      const rule = firstRule(rules, 'file', file);
      if (!rule) continue;
      const subject = basenameWithoutExtension(file);
      const passed = matchesStyle(subject, rule);
      evaluated.push({ ruleId: rule.id, target: 'file', file, subject, passed });
      if (!passed) findings.push(createFinding(rule, 'file', file, subject));
    }

    for (const node of graph.nodes) {
      const file = nodeFile(node);
      if (!file) continue;
      const rule = firstRule(rules, 'symbol', file, node);
      if (!rule) continue;
      const subject = nodeName(node);
      if (!subject) continue;
      const passed = matchesStyle(subject, rule);
      evaluated.push({ ruleId: rule.id, target: 'symbol', file, subject, nodeId: node.id, passed });
      if (!passed) findings.push(createFinding(rule, 'symbol', file, subject, node.id));
    }

    evaluated.sort(compareEvaluated);
    findings.sort((left, right) => compareText(left.findingId, right.findingId));
    const configFingerprint = digest(config);
    return Object.freeze({
      contractVersion: '1.0',
      resultKind: 'derived-naming-report',
      reportId: `naming-report:${digest({
        evaluator: {
          id: NAMING_CONVENTION_EVALUATOR_ID,
          version: NAMING_CONVENTION_EVALUATOR_VERSION,
        },
        configFingerprint,
        graphFingerprint: graph.fingerprint,
        evaluated,
      })}`,
      evaluator: Object.freeze({
        id: NAMING_CONVENTION_EVALUATOR_ID,
        version: NAMING_CONVENTION_EVALUATOR_VERSION,
      }),
      configFingerprint,
      evaluatedSubjectCount: evaluated.length,
      findings: Object.freeze(findings),
    });
  }
}

function createFinding(
  rule: NamingConventionRule,
  target: 'file' | 'symbol',
  file: string,
  subject: string,
  nodeId?: string
): NamingConventionFinding {
  const expected = describeStyle(rule);
  const severity = rule.severity ?? 'warning';
  const payload = {
    ruleId: rule.id,
    target,
    style: rule.style,
    severity,
    file,
    subject,
    nodeId,
    expected,
  };
  return Object.freeze({
    resultKind: 'derived-naming-finding',
    findingId: `naming-finding:${digest(payload)}`,
    outcome: 'violated',
    ...payload,
  });
}

function validateConfig(config: NamingConventionConfig): void {
  if (config.contractVersion !== '1.0') {
    throw new Error(`Unsupported naming convention contract: ${String(config.contractVersion)}`);
  }
  const ids = new Set<string>();
  for (const rule of config.rules) {
    if (!rule.id.trim() || ids.has(rule.id))
      throw new Error(`Duplicate or empty naming rule id: ${rule.id}`);
    ids.add(rule.id);
    if (!rule.path.trim() || rule.path.startsWith('/') || rule.path.includes('..')) {
      throw new Error(`Naming rule ${rule.id} path must be a workspace-relative glob`);
    }
    if (!['file', 'symbol'].includes(rule.target))
      throw new Error(`Naming rule ${rule.id} has an invalid target`);
    if (!['pascal', 'camel', 'snake', 'kebab'].includes(rule.style)) {
      throw new Error(`Naming rule ${rule.id} has an invalid style`);
    }
    if (rule.severity && !['error', 'warning', 'info'].includes(rule.severity)) {
      throw new Error(`Naming rule ${rule.id} has an invalid severity`);
    }
    if (rule.pathCase && rule.pathCase !== 'sensitive' && rule.pathCase !== 'insensitive') {
      throw new Error(`Naming rule ${rule.id} has an invalid pathCase`);
    }
    if (rule.acronym && rule.acronym !== 'preserve' && rule.acronym !== 'normalize') {
      throw new Error(`Naming rule ${rule.id} has an invalid acronym policy`);
    }
  }
}

function uniqueFiles(
  nodes: readonly CanonicalGraphNode[],
  rules: readonly NamingConventionRule[],
  workspaceRoot?: string
): readonly string[] {
  const workspaceFiles =
    workspaceRoot && rules.some((rule) => rule.target === 'file')
      ? filesMatchingFileRules(workspaceRoot, rules)
      : [];
  return Object.freeze(
    [
      ...new Set([
        ...nodes.map(nodeFile).filter((file): file is string => file !== undefined),
        ...workspaceFiles,
      ]),
    ].sort(compareText)
  );
}

function filesMatchingFileRules(
  workspaceRoot: string,
  rules: readonly NamingConventionRule[]
): readonly string[] {
  const root = path.resolve(workspaceRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Naming convention workspace root not found: ${root}`);
  }
  const files = new Set<string>();
  for (const rule of rules.filter((candidate) => candidate.target === 'file')) {
    const scanRoot = path.join(root, literalGlobDirectory(rule.path));
    if (!inside(root, scanRoot) || !fs.existsSync(scanRoot)) continue;
    for (const file of walkFiles(scanRoot)) {
      const relative = path.relative(root, file).split(path.sep).join('/');
      if (globMatches(rule.path, relative, rule.pathCase ?? 'sensitive')) files.add(relative);
    }
  }
  return Object.freeze([...files].sort(compareText));
}

function literalGlobDirectory(pattern: string): string {
  const segments = pattern.split('/');
  const literal: string[] = [];
  for (const segment of segments) {
    if (segment.includes('*') || segment.includes('?')) break;
    literal.push(segment);
  }
  if (literal.length === segments.length) literal.pop();
  return literal.join('/') || '.';
}

function walkFiles(directory: string): readonly string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.test-dist')
      continue;
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(candidate));
    else if (entry.isFile()) result.push(candidate);
  }
  return result;
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function nodeFile(node: CanonicalGraphNode): string | undefined {
  const candidate = typeof node.file === 'string' ? node.file : parseCanonicalId(node.id)?.filePath;
  if (!candidate || candidate.startsWith('/') || candidate.includes('\\')) return undefined;
  return candidate.replace(/^\.\//, '');
}

function nodeName(node: CanonicalGraphNode): string | undefined {
  if (typeof node.name === 'string' && node.name) return node.name;
  const qualifiedName =
    typeof node.qualifiedName === 'string'
      ? node.qualifiedName
      : parseCanonicalId(node.id)?.qualifiedName;
  return qualifiedName?.split('.').at(-1);
}

function firstRule(
  rules: readonly NamingConventionRule[],
  target: 'file' | 'symbol',
  file: string,
  node?: CanonicalGraphNode
): NamingConventionRule | undefined {
  return rules.find((rule) => {
    if (rule.target !== target || !globMatches(rule.path, file, rule.pathCase ?? 'sensitive'))
      return false;
    if (target === 'file') return true;
    if (!node) return false;
    if (rule.kinds && !rule.kinds.includes(node.kind)) return false;
    return rule.exported === undefined || rule.exported === node.exported;
  });
}

function globMatches(
  pattern: string,
  file: string,
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
  return new RegExp(expression, pathCase === 'insensitive' ? 'i' : '').test(file);
}

function matchesStyle(subject: string, rule: NamingConventionRule): boolean {
  const bare = rule.allowLeadingUnderscore && subject.startsWith('_') ? subject.slice(1) : subject;
  if (!bare || (!rule.allowLeadingUnderscore && subject.startsWith('_'))) return false;
  const base =
    rule.style === 'pascal'
      ? /^[A-Z][A-Za-z0-9]*$/
      : rule.style === 'camel'
        ? /^[a-z][A-Za-z0-9]*$/
        : rule.style === 'snake'
          ? /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/
          : /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
  if (!base.test(bare)) return false;
  return rule.acronym !== 'normalize' || !/[A-Z]{2,}/.test(bare);
}

function basenameWithoutExtension(file: string): string {
  const name = file.split('/').at(-1) ?? file;
  return name.replace(/\.[^.]+$/, '');
}

function describeStyle(rule: NamingConventionRule): string {
  return `${rule.style}${rule.acronym ? ` (${rule.acronym} acronyms)` : ''}`;
}

function compareEvaluated(left: EvaluatedSubject, right: EvaluatedSubject): number {
  return (
    compareText(left.ruleId, right.ruleId) ||
    compareText(left.target, right.target) ||
    compareText(left.file, right.file) ||
    compareText(left.nodeId ?? '', right.nodeId ?? '')
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
