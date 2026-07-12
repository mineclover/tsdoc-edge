/** Load one complete Jest JSON artifact into an in-memory evidence revision. */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createEvidenceRevision,
  type EvidenceItem,
  type EvidenceRevision,
} from '../semantic-graph/analysis-input-revisions';

export const JEST_JSON_EVIDENCE_LOADER_ID = 'tsdoc-edge/jest-json-evidence-loader' as const;
export const JEST_JSON_EVIDENCE_LOADER_VERSION = '1.0.0' as const;

export interface LoadJestJsonEvidenceOptions {
  readonly artifactPath: string;
  readonly workspaceRoot: string;
  readonly workspaceId: string;
}

interface SourceMapMapping {
  readonly emittedFile: string;
  readonly authoredFile: string;
  readonly authoredDigest: string;
}

/**
 * Validate a complete Jest JSON report and derive deterministic runner evidence.
 * The loader intentionally understands only the JSON handoff, never Jest APIs.
 */
export function loadJestJsonEvidence(options: LoadJestJsonEvidenceOptions): EvidenceRevision {
  const workspaceRoot = realDirectory(options.workspaceRoot, 'Jest evidence workspace root');
  const artifactPath = realFileWithin(
    workspaceRoot,
    options.artifactPath,
    'Jest evidence artifact'
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid Jest JSON evidence artifact: ${detail}`);
  }
  const report = record(parsed, 'Jest JSON evidence artifact');
  if (report.runExecError !== undefined && report.runExecError !== null) {
    throw new Error('Jest JSON evidence artifact reports runExecError');
  }
  if (report.wasInterrupted === true) {
    throw new Error('Jest JSON evidence artifact reports an interrupted run');
  }
  boolean(report.success, 'Jest JSON evidence artifact success');
  const suites = array(report.testResults, 'Jest JSON evidence artifact testResults');
  const mappings = new Map<string, SourceMapMapping>();
  const items: EvidenceItem[] = [];
  let passed = 0;
  let failed = 0;
  let pending = 0;
  let todo = 0;
  for (const [suiteIndex, value] of suites.entries()) {
    const suite = record(value, `Jest test result[${suiteIndex}]`);
    if (suite.testExecError !== undefined && suite.testExecError !== null) {
      throw new Error(`Jest test result[${suiteIndex}] reports testExecError`);
    }
    const emittedPath = realFileWithin(
      workspaceRoot,
      text(suite.name, `Jest test result[${suiteIndex}] name`),
      `Jest test result[${suiteIndex}] emitted file`
    );
    const mapping = mappings.get(emittedPath) ?? loadSourceMapMapping(workspaceRoot, emittedPath);
    mappings.set(emittedPath, mapping);
    const observedAt =
      suite.endTime === undefined
        ? undefined
        : epochIso(suite.endTime, `Jest test result[${suiteIndex}] endTime`);
    const assertions = array(
      suite.assertionResults,
      `Jest test result[${suiteIndex}] assertionResults`
    );
    for (const [assertionIndex, value] of assertions.entries()) {
      const assertion = record(value, `Jest assertion[${suiteIndex}:${assertionIndex}]`);
      const status = normalizeStatus(
        text(assertion.status, `Jest assertion[${suiteIndex}:${assertionIndex}] status`)
      );
      if (status === 'passed') passed += 1;
      else if (status === 'failed') failed += 1;
      else if (assertion.status === 'todo') todo += 1;
      else pending += 1;
      const testName = text(
        assertion.fullName,
        `Jest assertion[${suiteIndex}:${assertionIndex}] fullName`
      );
      const messageDigest = failureDigest(assertion);
      const item = {
        kind: 'test-evidence' as const,
        id: `jest-test:${digest({ file: mapping.authoredFile, testName })}`,
        runner: 'jest',
        testName,
        status,
        source: { file: mapping.authoredFile, contentDigest: mapping.authoredDigest },
        subjectFiles: [],
        ...(finiteNonNegative(assertion.duration) ? { durationMs: assertion.duration } : {}),
        ...(messageDigest ? { messageDigest } : {}),
        provenance: {
          source: 'test-runner' as const,
          producerId: 'jest',
          producerVersion: reportedRunnerVersion(report),
          sourceFingerprint: digest({
            emittedFile: mapping.emittedFile,
            authoredFile: mapping.authoredFile,
            authoredDigest: mapping.authoredDigest,
          }),
          ...(observedAt ? { observedAt } : {}),
        },
      };
      items.push(item);
    }
  }
  assertAggregate(report, 'numPassedTests', passed);
  assertAggregate(report, 'numFailedTests', failed);
  assertAggregate(report, 'numPendingTests', pending);
  assertAggregate(report, 'numTodoTests', todo);
  assertAggregate(report, 'numTotalTests', passed + failed + pending + todo);
  const normalizedItems = [...items].sort((left, right) => left.id.localeCompare(right.id));
  const sourceFingerprint = digest({
    loader: { id: JEST_JSON_EVIDENCE_LOADER_ID, version: JEST_JSON_EVIDENCE_LOADER_VERSION },
    items: normalizedItems,
    mappings: [...mappings.values()].sort((left, right) =>
      left.emittedFile.localeCompare(right.emittedFile)
    ),
  });
  return createEvidenceRevision({
    workspaceId: text(options.workspaceId, 'Jest evidence workspaceId'),
    items,
    provenance: {
      source: 'collected',
      producerId: JEST_JSON_EVIDENCE_LOADER_ID,
      producerVersion: JEST_JSON_EVIDENCE_LOADER_VERSION,
      sourceFingerprint,
    },
  });
}

function loadSourceMapMapping(workspaceRoot: string, emittedPath: string): SourceMapMapping {
  const testDistRoot = path.join(workspaceRoot, '.test-dist');
  if (!inside(testDistRoot, emittedPath) || !emittedPath.endsWith('.js')) {
    throw new Error(
      `Jest evidence emitted test must be a .test-dist JavaScript file: ${emittedPath}`
    );
  }
  const mapPath = `${emittedPath}.map`;
  if (!fs.existsSync(mapPath)) throw new Error(`Jest evidence source map not found: ${mapPath}`);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid Jest evidence source map ${mapPath}: ${String(error)}`);
  }
  const map = record(raw, `Jest evidence source map ${mapPath}`);
  const sources = array(map.sources, `Jest evidence source map ${mapPath} sources`);
  const contents = array(map.sourcesContent, `Jest evidence source map ${mapPath} sourcesContent`);
  if (sources.length !== 1 || contents.length !== 1 || typeof contents[0] !== 'string') {
    throw new Error(
      `Jest evidence source map must contain one source and matching sourcesContent: ${mapPath}`
    );
  }
  const sourceRoot =
    map.sourceRoot === undefined
      ? ''
      : typeof map.sourceRoot === 'string'
        ? map.sourceRoot
        : invalidSourceRoot(mapPath);
  const source = text(sources[0], `Jest evidence source map ${mapPath} source`);
  if (path.isAbsolute(sourceRoot) || path.isAbsolute(source)) {
    throw new Error(`Jest evidence source map may not use absolute source paths: ${mapPath}`);
  }
  const authoredPath = path.resolve(path.dirname(mapPath), sourceRoot, source);
  if (
    !inside(workspaceRoot, authoredPath) ||
    !inside(path.join(workspaceRoot, 'src'), authoredPath)
  ) {
    throw new Error(`Jest evidence source map escapes authored src: ${mapPath}`);
  }
  if (
    !/\.tsx?$/.test(authoredPath) ||
    !fs.existsSync(authoredPath) ||
    !fs.statSync(authoredPath).isFile()
  ) {
    throw new Error(
      `Jest evidence source map does not resolve an authored TypeScript file: ${mapPath}`
    );
  }
  const sourceBytes = fs.readFileSync(authoredPath);
  if (sourceBytes.toString('utf8') !== contents[0]) {
    throw new Error(
      `Jest evidence source map sourcesContent does not match authored source: ${mapPath}`
    );
  }
  return Object.freeze({
    emittedFile: relativePath(workspaceRoot, emittedPath),
    authoredFile: relativePath(workspaceRoot, authoredPath),
    authoredDigest: `sha256:${createHash('sha256').update(sourceBytes).digest('hex')}`,
  });
}

function normalizeStatus(value: string): 'passed' | 'failed' | 'skipped' | 'unknown' {
  if (value === 'passed' || value === 'failed') return value;
  if (value === 'pending' || value === 'todo' || value === 'disabled' || value === 'skipped')
    return 'skipped';
  if (value === 'focused') return 'unknown';
  throw new Error(`Unsupported Jest assertion status: ${value}`);
}

function assertAggregate(report: Record<string, unknown>, key: string, observed: number): void {
  if (number(report[key], `Jest JSON evidence artifact ${key}`) !== observed) {
    throw new Error(`Jest JSON evidence artifact aggregate mismatch for ${key}`);
  }
}

function failureDigest(assertion: Record<string, unknown>): string | undefined {
  const messages = assertion.failureMessages;
  if (messages === undefined) return undefined;
  const values = array(messages, 'Jest assertion failureMessages').map((value) =>
    text(value, 'Jest assertion failure message')
  );
  return values.length === 0 ? undefined : `sha256:${digest(values)}`;
}

function reportedRunnerVersion(report: Record<string, unknown>): string {
  const candidate = report.jestVersion ?? report.version;
  return typeof candidate === 'string' && candidate.trim() ? candidate : 'unreported';
}

function realDirectory(value: string, label: string): string {
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory())
    throw new Error(`${label} not found: ${resolved}`);
  return fs.realpathSync(resolved);
}
function invalidSourceRoot(mapPath: string): never {
  throw new Error(`Jest evidence source map ${mapPath} sourceRoot must be a string`);
}

function realFileWithin(root: string, value: string, label: string): string {
  const resolved = path.resolve(root, value);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile())
    throw new Error(`${label} not found: ${resolved}`);
  const real = fs.realpathSync(resolved);
  if (!inside(root, real)) throw new Error(`${label} must resolve inside the workspace root`);
  return real;
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function relativePath(root: string, value: string): string {
  const relative = path.relative(root, value);
  if (!inside(root, value)) throw new Error(`Path escapes workspace: ${value}`);
  return relative.split(path.sep).join('/');
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label} must be a non-empty string`);
  return value;
}
function number(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(`${label} must be a non-negative finite number`);
  return value;
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
  return value;
}
function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function epochIso(value: unknown, label: string): string {
  const epoch = number(value, label);
  const date = new Date(epoch);
  if (Number.isNaN(date.getTime()))
    throw new Error(`${label} must be a valid epoch millisecond value`);
  return date.toISOString();
}
function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
