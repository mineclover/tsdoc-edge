/**
 * Fail-closed contract and validator for mutating LSP CodeActions backed by
 * retained convention findings.
 *
 * @packageDocumentation
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TextEdit, WorkspaceEdit } from 'vscode-languageserver/node';
import type { ConventionCheckResult } from '../convention/ConventionCheckService';
import {
  findSavedConventionFindingAnchor,
  type SavedConventionDiagnosticData,
} from './convention-diagnostics';
import { fileUriFromPath } from './uri';

/**
 * Supported contract version for retained convention fix plans.
 *
 * @public
 */
export const CONVENTION_FIX_PLAN_CONTRACT_VERSION = '1.0' as const;

/**
 * Supported contract version for retained fix-plan bundle files.
 *
 * @public
 */
export const CONVENTION_FIX_PLAN_BUNDLE_CONTRACT_VERSION = '1.0' as const;

const SHA256_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const VERSION_LIKE_PATTERN = /^\d+\.\d+(?:\.\d+)?$/;
const URI_SCHEME_PREFIX_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Zero-based UTF-16 position within a text document.
 *
 * @public
 */
export interface ConventionFixPosition {
  readonly line: number;
  readonly character: number;
}

/**
 * Zero-based half-open text range within a document.
 *
 * @public
 */
export interface ConventionFixRange {
  readonly start: ConventionFixPosition;
  readonly end: ConventionFixPosition;
}

/**
 * One deterministic text edit inside a fix-plan file target.
 *
 * @public
 */
export interface ConventionFixTextEdit {
  readonly range: ConventionFixRange;
  readonly newText: string;
}

/**
 * File-level edit target pinned to an exact source content digest and optional open version.
 *
 * @public
 */
export interface ConventionFixFileTarget {
  readonly file?: string;
  readonly uri?: string;
  readonly sourceContentDigest: string;
  readonly expectedVersion?: number;
  readonly edits: readonly ConventionFixTextEdit[];
}

/**
 * Retained fix plan bound to one exact convention finding and canonical code revision.
 *
 * @public
 */
export interface RetainedConventionFixPlan {
  readonly contractVersion: typeof CONVENTION_FIX_PLAN_CONTRACT_VERSION;
  readonly planId: string;
  readonly title: string;
  readonly historyId?: string;
  readonly checkId: string;
  readonly findingId: string;
  readonly codeRevisionId: string;
  readonly targets: readonly ConventionFixFileTarget[];
}

/**
 * On-disk JSON envelope holding retained convention fix plans.
 *
 * @public
 */
export interface ConventionFixPlanBundle {
  readonly contractVersion: typeof CONVENTION_FIX_PLAN_BUNDLE_CONTRACT_VERSION;
  readonly plans: readonly unknown[];
}

/**
 * Snapshot of an open LSP text document at CodeAction evaluation time.
 *
 * @public
 */
export interface OpenLspDocumentSnapshot {
  readonly uri: string;
  readonly version: number;
  readonly text: string;
}

/**
 * Deterministic rejection categories defined by the mutating CodeAction contract.
 *
 * @public
 */
export type MutatingCodeActionRejectionReason =
  | 'malformed-plan'
  | 'identity-mismatch'
  | 'stale-revision'
  | 'stale-digest'
  | 'version-mismatch'
  | 'outside-workspace'
  | 'symlink-escape'
  | 'conflict';

/**
 * Immutable metadata attached to an accepted mutating CodeAction.
 *
 * @public
 */
export interface MutatingCodeActionData {
  readonly kind: 'saved-convention-mutating-fix';
  readonly contractVersion: typeof CONVENTION_FIX_PLAN_CONTRACT_VERSION;
  readonly actionId: string;
  readonly planId: string;
  readonly historyId?: string;
  readonly checkId: string;
  readonly findingId: string;
  readonly codeRevisionId: string;
}

/**
 * Validated atomic mutating CodeAction ready to return over LSP.
 *
 * @public
 */
export interface ValidatedMutatingCodeAction {
  readonly actionId: string;
  readonly planId: string;
  readonly title: string;
  readonly edit: WorkspaceEdit;
  readonly data: MutatingCodeActionData;
  readonly targetFiles: readonly string[];
}

/**
 * Structured rejection details for a candidate fix plan.
 *
 * @public
 */
export interface MutatingFixPlanRejection {
  readonly planId?: string;
  readonly reason: MutatingCodeActionRejectionReason;
  readonly detail: string;
}

/**
 * Result of validating a single retained convention fix plan.
 *
 * @public
 */
export type MutatingFixPlanValidationResult =
  | { readonly ok: true; readonly action: ValidatedMutatingCodeAction }
  | {
      readonly ok: false;
      readonly planId?: string;
      readonly reason: MutatingCodeActionRejectionReason;
      readonly detail: string;
    };

/**
 * Result of parsing or loading a fix-plan bundle envelope.
 *
 * @public
 */
export type ConventionFixPlanBundleParseResult =
  | { readonly ok: true; readonly rawPlans: readonly unknown[] }
  | {
      readonly ok: false;
      readonly reason: MutatingCodeActionRejectionReason;
      readonly detail: string;
    };

/**
 * Inputs required to validate one retained convention fix plan.
 *
 * @public
 */
export interface ValidateRetainedConventionFixPlanOptions {
  readonly workspaceRoot: string;
  readonly requestUri: string;
  readonly activeCodeRevisionId: string | null;
  readonly savedCheck: ConventionCheckResult | null;
  readonly savedHistoryId?: string;
  readonly diagnosticData: SavedConventionDiagnosticData;
  readonly rawPlan: unknown;
  readonly openDocuments: readonly OpenLspDocumentSnapshot[];
}

/**
 * Inputs required to resolve all mutating CodeActions for one saved convention diagnostic.
 *
 * @public
 */
export interface ResolveSavedConventionMutatingActionsOptions {
  readonly workspaceRoot: string;
  readonly requestUri: string;
  readonly activeCodeRevisionId: string | null;
  readonly savedCheck: ConventionCheckResult | null;
  readonly savedHistoryId?: string;
  readonly diagnosticData: SavedConventionDiagnosticData;
  readonly rawPlans: readonly unknown[];
  readonly openDocuments: readonly OpenLspDocumentSnapshot[];
}

/**
 * Accepted mutating CodeActions and deterministic rejections for one CodeAction query.
 *
 * @public
 */
export interface ResolvedSavedConventionMutatingActions {
  readonly actions: readonly ValidatedMutatingCodeAction[];
  readonly rejections: readonly MutatingFixPlanRejection[];
}

interface WorkspaceRoots {
  readonly lexicalRoot: string;
  readonly realRoot: string;
}

interface ResolvedWorkspacePath {
  readonly ok: true;
  readonly relativePath: string;
  readonly lexicalPath: string;
  readonly canonicalUri: string;
}

interface RejectedWorkspacePath {
  readonly ok: false;
  readonly reason: 'malformed-plan' | 'outside-workspace' | 'symlink-escape';
  readonly detail: string;
}

/**
 * Compute the canonical `sha256:<hex>` content digest of UTF-8 text or raw bytes.
 *
 * @param content - UTF-8 string or raw file buffer
 * @returns Canonical `sha256:<64-hex>` digest
 * @public
 */
export function computeSourceContentDigest(content: string | Buffer): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/**
 * Validate the outer envelope of a convention fix-plan bundle without trusting individual plans.
 *
 * @param raw - Parsed JSON value
 * @returns Raw candidate plans or a fail-closed rejection
 * @public
 */
export function parseConventionFixPlanBundle(raw: unknown): ConventionFixPlanBundleParseResult {
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      reason: 'malformed-plan',
      detail: 'Fix-plan bundle must be a JSON object',
    };
  }
  const { contractVersion, plans } = raw;
  if (typeof contractVersion !== 'string' || !contractVersion.trim()) {
    return {
      ok: false,
      reason: 'malformed-plan',
      detail: 'Fix-plan bundle contractVersion must be a non-empty string',
    };
  }
  if (contractVersion !== CONVENTION_FIX_PLAN_BUNDLE_CONTRACT_VERSION) {
    return {
      ok: false,
      reason: VERSION_LIKE_PATTERN.test(contractVersion) ? 'stale-revision' : 'malformed-plan',
      detail: `Unsupported fix-plan bundle contractVersion: ${contractVersion}`,
    };
  }
  if (!Array.isArray(plans)) {
    return {
      ok: false,
      reason: 'malformed-plan',
      detail: 'Fix-plan bundle plans must be an array',
    };
  }
  return { ok: true, rawPlans: Object.freeze([...plans]) };
}

/**
 * Load a workspace-confined convention fix-plan bundle file fail-closed.
 *
 * @param workspaceRoot - Workspace root directory
 * @param configuredPath - Workspace-relative path to the fix-plan bundle JSON
 * @returns Parsed raw plans or a fail-closed rejection
 * @public
 */
export function loadConventionFixPlanBundleFile(
  workspaceRoot: string,
  configuredPath: string
): ConventionFixPlanBundleParseResult {
  const roots = resolveWorkspaceRoots(workspaceRoot);
  if (!roots) {
    return {
      ok: false,
      reason: 'outside-workspace',
      detail: `Workspace root is unavailable: ${workspaceRoot}`,
    };
  }
  if (typeof configuredPath !== 'string' || !configuredPath.trim()) {
    return {
      ok: false,
      reason: 'malformed-plan',
      detail: 'fixPlansPath must be a non-empty string',
    };
  }
  const resolved = resolveCanonicalWorkspaceFile(roots, { file: configuredPath }, true);
  if (!resolved.ok) {
    return resolved;
  }
  let rawText: string;
  try {
    rawText = fs.readFileSync(resolved.lexicalPath, 'utf8');
  } catch (error) {
    return {
      ok: false,
      reason: 'malformed-plan',
      detail: `Failed to read fixPlansPath: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    return {
      ok: false,
      reason: 'malformed-plan',
      detail: `Invalid JSON in fixPlansPath: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  return parseConventionFixPlanBundle(parsed);
}

/**
 * Validate one retained convention fix plan against active canonical revision, workspace scope,
 * open document versions, on-disk digests, and deterministic conflict rules.
 *
 * @param options - Validation context and candidate raw fix plan
 * @returns Accepted atomic `ValidatedMutatingCodeAction` or deterministic rejection
 * @public
 */
export function validateRetainedConventionFixPlan(
  options: ValidateRetainedConventionFixPlanOptions
): MutatingFixPlanValidationResult {
  const candidatePlanId = extractCandidatePlanId(options.rawPlan);
  const roots = resolveWorkspaceRoots(options.workspaceRoot);
  if (!roots) {
    return reject(candidatePlanId, 'outside-workspace', 'Workspace root does not exist');
  }

  // Validate structural shape of the plan first so malformed payloads are deterministically classified.
  const parsedPlan = parseRetainedFixPlan(options.rawPlan);
  if (!parsedPlan.ok) {
    return parsedPlan;
  }
  const plan = parsedPlan.plan;

  // Validate requesting document URI scope and symlink safety.
  const requestResolved = resolveCanonicalWorkspaceFile(roots, { uri: options.requestUri }, false);
  if (!requestResolved.ok) {
    return reject(plan.planId, requestResolved.reason, requestResolved.detail);
  }

  // Validate active canonical code revision and server-retained check state.
  if (!options.savedCheck || !options.activeCodeRevisionId) {
    return reject(
      plan.planId,
      'stale-revision',
      'Active canonical revision or retained convention check is unavailable'
    );
  }
  if (options.savedCheck.codeRevisionId !== options.activeCodeRevisionId) {
    return reject(
      plan.planId,
      'stale-revision',
      `Retained convention check revision ${options.savedCheck.codeRevisionId} does not match active revision ${options.activeCodeRevisionId}`
    );
  }

  // Never trust client diagnostic data alone: verify against server-owned retained state.
  if (
    options.diagnosticData.kind !== 'saved-convention-finding' ||
    options.diagnosticData.checkId !== options.savedCheck.checkId ||
    (options.diagnosticData.historyId ?? undefined) !== (options.savedHistoryId ?? undefined)
  ) {
    return reject(
      plan.planId,
      'identity-mismatch',
      'Client diagnostic identity does not match server-retained convention check'
    );
  }
  const authoritativeAnchor = findSavedConventionFindingAnchor(
    options.savedCheck,
    options.diagnosticData.findingId
  );
  if (
    !authoritativeAnchor ||
    authoritativeAnchor.sourceFile !== options.diagnosticData.sourceFile ||
    authoritativeAnchor.sourceLine !== options.diagnosticData.sourceLine
  ) {
    return reject(
      plan.planId,
      'identity-mismatch',
      `Finding ${options.diagnosticData.findingId} does not match authoritative source anchor`
    );
  }
  if (requestResolved.relativePath !== authoritativeAnchor.sourceFile) {
    return reject(
      plan.planId,
      'outside-workspace',
      `Requested document ${requestResolved.relativePath} does not match finding source ${authoritativeAnchor.sourceFile}`
    );
  }

  // Rule 1 & Rule 4: Exact identity and codeRevisionId pin on the fix plan.
  if (
    plan.checkId !== options.savedCheck.checkId ||
    plan.findingId !== authoritativeAnchor.findingId ||
    (plan.historyId ?? undefined) !== (options.savedHistoryId ?? undefined)
  ) {
    return reject(
      plan.planId,
      'identity-mismatch',
      'Fix plan identity pin does not match retained convention finding'
    );
  }
  if (plan.codeRevisionId !== options.activeCodeRevisionId) {
    return reject(
      plan.planId,
      'stale-revision',
      `Fix plan codeRevisionId ${plan.codeRevisionId} does not match active revision ${options.activeCodeRevisionId}`
    );
  }

  // Index currently open documents by canonical workspace-relative path.
  const openDocumentsByPath = indexOpenDocuments(roots, options.openDocuments);

  // Validate all targets atomically before producing any WorkspaceEdit.
  const validatedTargets: Array<{
    readonly relativePath: string;
    readonly canonicalUri: string;
    readonly sourceContentDigest: string;
    readonly expectedVersion?: number;
    readonly edits: readonly TextEdit[];
  }> = [];
  const seenCanonicalFiles = new Set<string>();

  for (const target of plan.targets) {
    const resolvedTarget = resolveCanonicalWorkspaceFile(
      roots,
      {
        ...(target.file !== undefined ? { file: target.file } : {}),
        ...(target.uri !== undefined ? { uri: target.uri } : {}),
      },
      false
    );
    if (!resolvedTarget.ok) {
      return reject(plan.planId, resolvedTarget.reason, resolvedTarget.detail);
    }

    if (seenCanonicalFiles.has(resolvedTarget.relativePath)) {
      return reject(
        plan.planId,
        'conflict',
        `Duplicate target file identity in fix plan: ${resolvedTarget.relativePath}`
      );
    }
    seenCanonicalFiles.add(resolvedTarget.relativePath);

    const openDocument = openDocumentsByPath.get(resolvedTarget.relativePath);
    let verifiedText: string;
    if (openDocument) {
      if (target.expectedVersion === undefined || openDocument.version !== target.expectedVersion) {
        return reject(
          plan.planId,
          'version-mismatch',
          `Open document ${resolvedTarget.relativePath} is at version ${String(openDocument.version)}, expected ${String(target.expectedVersion)}`
        );
      }
      const openDigest = computeSourceContentDigest(openDocument.text);
      if (openDigest !== target.sourceContentDigest) {
        return reject(
          plan.planId,
          'stale-digest',
          `Open document ${resolvedTarget.relativePath} content digest ${openDigest} does not match ${target.sourceContentDigest}`
        );
      }
      verifiedText = openDocument.text;
    } else {
      let diskBytes: Buffer;
      try {
        diskBytes = fs.readFileSync(resolvedTarget.lexicalPath);
      } catch (error) {
        return reject(
          plan.planId,
          'stale-digest',
          `Unable to read closed target ${resolvedTarget.relativePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      const diskDigest = computeSourceContentDigest(diskBytes);
      if (diskDigest !== target.sourceContentDigest) {
        return reject(
          plan.planId,
          'stale-digest',
          `On-disk ${resolvedTarget.relativePath} content digest ${diskDigest} does not match ${target.sourceContentDigest}`
        );
      }
      verifiedText = diskBytes.toString('utf8');
    }

    const editsValidation = validateAndOrderEdits(
      target.edits,
      verifiedText,
      resolvedTarget.relativePath
    );
    if (!editsValidation.ok) {
      return reject(plan.planId, editsValidation.reason, editsValidation.detail);
    }

    validatedTargets.push({
      relativePath: resolvedTarget.relativePath,
      canonicalUri: resolvedTarget.canonicalUri,
      sourceContentDigest: target.sourceContentDigest,
      ...(target.expectedVersion !== undefined ? { expectedVersion: target.expectedVersion } : {}),
      edits: editsValidation.edits,
    });
  }

  // Rule 5: Requesting document itself must be included in the plan targets.
  if (!seenCanonicalFiles.has(requestResolved.relativePath)) {
    return reject(
      plan.planId,
      'outside-workspace',
      `Requested document ${requestResolved.relativePath} is not declared in fix plan targets`
    );
  }

  validatedTargets.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const changes: Record<string, TextEdit[]> = {};
  for (const target of validatedTargets) {
    changes[target.canonicalUri] = target.edits.map((edit) => ({
      range: {
        start: { line: edit.range.start.line, character: edit.range.start.character },
        end: { line: edit.range.end.line, character: edit.range.end.character },
      },
      newText: edit.newText,
    }));
  }

  const actionId = computeActionId(plan, validatedTargets);
  const data: MutatingCodeActionData = Object.freeze({
    kind: 'saved-convention-mutating-fix',
    contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
    actionId,
    planId: plan.planId,
    ...(plan.historyId ? { historyId: plan.historyId } : {}),
    checkId: plan.checkId,
    findingId: plan.findingId,
    codeRevisionId: plan.codeRevisionId,
  });

  return {
    ok: true,
    action: Object.freeze({
      actionId,
      planId: plan.planId,
      title: plan.title,
      edit: { changes },
      data,
      targetFiles: Object.freeze(validatedTargets.map((target) => target.relativePath)),
    }),
  };
}

/**
 * Resolve all valid, non-conflicting mutating CodeActions for one saved convention diagnostic.
 *
 * @param options - Server-owned retained state, open document snapshots, and candidate plans
 * @returns Deterministically ordered actions and recorded rejections
 * @public
 */
export function resolveSavedConventionMutatingActions(
  options: ResolveSavedConventionMutatingActionsOptions
): ResolvedSavedConventionMutatingActions {
  const relevantRawPlans = options.rawPlans.filter((entry) =>
    isCandidateForFinding(entry, options.diagnosticData.findingId)
  );
  if (relevantRawPlans.length === 0) {
    return { actions: Object.freeze([]), rejections: Object.freeze([]) };
  }

  const rejections: MutatingFixPlanRejection[] = [];
  const provisionalActions: ValidatedMutatingCodeAction[] = [];
  const planIdCounts = new Map<string, number>();

  for (const rawPlan of relevantRawPlans) {
    const planId = extractCandidatePlanId(rawPlan);
    if (planId) {
      planIdCounts.set(planId, (planIdCounts.get(planId) ?? 0) + 1);
    }
  }

  for (const rawPlan of relevantRawPlans) {
    const planId = extractCandidatePlanId(rawPlan);
    if (planId && (planIdCounts.get(planId) ?? 0) > 1) {
      rejections.push(
        Object.freeze({
          planId,
          reason: 'conflict',
          detail: `Duplicate fix planId ${planId} for finding ${options.diagnosticData.findingId}`,
        })
      );
      continue;
    }

    const result = validateRetainedConventionFixPlan({
      workspaceRoot: options.workspaceRoot,
      requestUri: options.requestUri,
      activeCodeRevisionId: options.activeCodeRevisionId,
      savedCheck: options.savedCheck,
      ...(options.savedHistoryId ? { savedHistoryId: options.savedHistoryId } : {}),
      diagnosticData: options.diagnosticData,
      rawPlan,
      openDocuments: options.openDocuments,
    });

    if (!result.ok) {
      rejections.push(
        Object.freeze({
          ...(result.planId ? { planId: result.planId } : {}),
          reason: result.reason,
          detail: result.detail,
        })
      );
      continue;
    }
    provisionalActions.push(result.action);
  }

  // Reject duplicate edit payloads across distinct plan IDs deterministically.
  const editSignatureCounts = new Map<string, number>();
  for (const action of provisionalActions) {
    const signature = stableJson(action.edit);
    editSignatureCounts.set(signature, (editSignatureCounts.get(signature) ?? 0) + 1);
  }

  const accepted: ValidatedMutatingCodeAction[] = [];
  for (const action of provisionalActions) {
    const signature = stableJson(action.edit);
    if ((editSignatureCounts.get(signature) ?? 0) > 1) {
      rejections.push(
        Object.freeze({
          planId: action.planId,
          reason: 'conflict',
          detail: `Duplicate WorkspaceEdit across fix plans for finding ${options.diagnosticData.findingId}`,
        })
      );
      continue;
    }
    accepted.push(action);
  }

  accepted.sort((left, right) => left.actionId.localeCompare(right.actionId));
  return {
    actions: Object.freeze(accepted),
    rejections: Object.freeze(rejections),
  };
}

function isCandidateForFinding(rawPlan: unknown, findingId: string): boolean {
  if (!isPlainObject(rawPlan)) return true;
  if (typeof rawPlan.findingId !== 'string' || !rawPlan.findingId.trim()) return true;
  return rawPlan.findingId === findingId;
}

function extractCandidatePlanId(rawPlan: unknown): string | undefined {
  if (!isPlainObject(rawPlan)) return undefined;
  return typeof rawPlan.planId === 'string' && rawPlan.planId.trim().length > 0
    ? rawPlan.planId
    : undefined;
}

function parseRetainedFixPlan(rawPlan: unknown):
  | { readonly ok: true; readonly plan: RetainedConventionFixPlan }
  | {
      readonly ok: false;
      readonly planId?: string;
      readonly reason: MutatingCodeActionRejectionReason;
      readonly detail: string;
    } {
  if (!isPlainObject(rawPlan)) {
    return reject(undefined, 'malformed-plan', 'Fix plan must be a JSON object');
  }
  const planId = extractCandidatePlanId(rawPlan);
  const { contractVersion } = rawPlan;
  if (typeof contractVersion !== 'string' || !contractVersion.trim()) {
    return reject(planId, 'malformed-plan', 'Fix plan contractVersion must be a non-empty string');
  }
  if (contractVersion !== CONVENTION_FIX_PLAN_CONTRACT_VERSION) {
    return reject(
      planId,
      VERSION_LIKE_PATTERN.test(contractVersion) ? 'stale-revision' : 'malformed-plan',
      `Unsupported fix plan contractVersion: ${contractVersion}`
    );
  }
  if (!nonEmptyString(rawPlan.planId)) {
    return reject(undefined, 'malformed-plan', 'Fix plan planId must be a non-empty string');
  }
  if (!nonEmptyString(rawPlan.title)) {
    return reject(rawPlan.planId, 'malformed-plan', 'Fix plan title must be a non-empty string');
  }
  if (rawPlan.historyId !== undefined && !nonEmptyString(rawPlan.historyId)) {
    return reject(
      rawPlan.planId,
      'malformed-plan',
      'Fix plan historyId must be a non-empty string when provided'
    );
  }
  if (!nonEmptyString(rawPlan.checkId)) {
    return reject(rawPlan.planId, 'malformed-plan', 'Fix plan checkId must be a non-empty string');
  }
  if (!nonEmptyString(rawPlan.findingId)) {
    return reject(
      rawPlan.planId,
      'malformed-plan',
      'Fix plan findingId must be a non-empty string'
    );
  }
  if (!nonEmptyString(rawPlan.codeRevisionId)) {
    return reject(
      rawPlan.planId,
      'malformed-plan',
      'Fix plan codeRevisionId must be a non-empty string'
    );
  }
  if (!Array.isArray(rawPlan.targets) || rawPlan.targets.length === 0) {
    return reject(rawPlan.planId, 'malformed-plan', 'Fix plan targets must be a non-empty array');
  }

  const targets: ConventionFixFileTarget[] = [];
  for (const rawTarget of rawPlan.targets) {
    const parsedTarget = parseFixFileTarget(rawPlan.planId, rawTarget);
    if (!parsedTarget.ok) return parsedTarget;
    targets.push(parsedTarget.target);
  }

  return {
    ok: true,
    plan: Object.freeze({
      contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
      planId: rawPlan.planId,
      title: rawPlan.title,
      ...(typeof rawPlan.historyId === 'string' ? { historyId: rawPlan.historyId } : {}),
      checkId: rawPlan.checkId,
      findingId: rawPlan.findingId,
      codeRevisionId: rawPlan.codeRevisionId,
      targets: Object.freeze(targets),
    }),
  };
}

function parseFixFileTarget(
  planId: string,
  rawTarget: unknown
):
  | { readonly ok: true; readonly target: ConventionFixFileTarget }
  | {
      readonly ok: false;
      readonly planId: string;
      readonly reason: MutatingCodeActionRejectionReason;
      readonly detail: string;
    } {
  if (!isPlainObject(rawTarget)) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan target must be an object',
    };
  }
  const { file, uri, sourceContentDigest, expectedVersion, edits } = rawTarget;
  if (file === undefined && uri === undefined) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan target requires file or uri',
    };
  }
  if (file !== undefined && !nonEmptyString(file)) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan target file must be a non-empty string',
    };
  }
  if (uri !== undefined && !nonEmptyString(uri)) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan target uri must be a non-empty string',
    };
  }
  if (typeof sourceContentDigest !== 'string' || !SHA256_DIGEST_PATTERN.test(sourceContentDigest)) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan target sourceContentDigest must be a canonical sha256:<64-hex> string',
    };
  }
  if (
    expectedVersion !== undefined &&
    (typeof expectedVersion !== 'number' ||
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion < 0)
  ) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan target expectedVersion must be a non-negative integer',
    };
  }
  if (!Array.isArray(edits) || edits.length === 0) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan target edits must be a non-empty array',
    };
  }

  const parsedEdits: ConventionFixTextEdit[] = [];
  for (const rawEdit of edits) {
    const parsedEdit = parseFixTextEdit(planId, rawEdit);
    if (!parsedEdit.ok) return parsedEdit;
    parsedEdits.push(parsedEdit.edit);
  }

  return {
    ok: true,
    target: Object.freeze({
      ...(typeof file === 'string' ? { file } : {}),
      ...(typeof uri === 'string' ? { uri } : {}),
      sourceContentDigest,
      ...(typeof expectedVersion === 'number' ? { expectedVersion } : {}),
      edits: Object.freeze(parsedEdits),
    }),
  };
}

function parseFixTextEdit(
  planId: string,
  rawEdit: unknown
):
  | { readonly ok: true; readonly edit: ConventionFixTextEdit }
  | {
      readonly ok: false;
      readonly planId: string;
      readonly reason: MutatingCodeActionRejectionReason;
      readonly detail: string;
    } {
  if (
    !isPlainObject(rawEdit) ||
    typeof rawEdit.newText !== 'string' ||
    !isPlainObject(rawEdit.range)
  ) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan edit must provide range and string newText',
    };
  }
  const start = parseFixPosition(rawEdit.range.start);
  const end = parseFixPosition(rawEdit.range.end);
  if (!start || !end) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan edit range positions must use non-negative integer line and character',
    };
  }
  if (comparePositions(start, end) > 0) {
    return {
      ok: false,
      planId,
      reason: 'malformed-plan',
      detail: 'Fix plan edit range start must not exceed range end',
    };
  }
  return {
    ok: true,
    edit: Object.freeze({
      range: Object.freeze({ start, end }),
      newText: rawEdit.newText,
    }),
  };
}

function parseFixPosition(rawPosition: unknown): ConventionFixPosition | undefined {
  if (!isPlainObject(rawPosition)) return undefined;
  const { line, character } = rawPosition;
  if (
    typeof line !== 'number' ||
    !Number.isSafeInteger(line) ||
    line < 0 ||
    typeof character !== 'number' ||
    !Number.isSafeInteger(character) ||
    character < 0
  ) {
    return undefined;
  }
  return Object.freeze({ line, character });
}

function resolveWorkspaceRoots(workspaceRoot: string): WorkspaceRoots | undefined {
  try {
    const lexicalRoot = path.resolve(workspaceRoot);
    if (!fs.existsSync(lexicalRoot) || !fs.statSync(lexicalRoot).isDirectory()) {
      return undefined;
    }
    const realRoot = fs.realpathSync(lexicalRoot);
    return { lexicalRoot, realRoot };
  } catch {
    return undefined;
  }
}

function resolveCanonicalWorkspaceFile(
  roots: WorkspaceRoots,
  locator: { readonly file?: string; readonly uri?: string },
  requireExistingFile: boolean
): ResolvedWorkspacePath | RejectedWorkspacePath {
  let fileRelative: string | undefined;
  let uriRelative: string | undefined;

  if (locator.file !== undefined) {
    if (locator.file.includes('\0') || locator.file.includes('\\')) {
      return {
        ok: false,
        reason: 'malformed-plan',
        detail: `Target file contains invalid characters: ${locator.file}`,
      };
    }
    if (URI_SCHEME_PREFIX_PATTERN.test(locator.file)) {
      return {
        ok: false,
        reason: 'malformed-plan',
        detail: `Target file must be a relative path, not a URI: ${locator.file}`,
      };
    }
    if (path.isAbsolute(locator.file)) {
      return {
        ok: false,
        reason: 'outside-workspace',
        detail: `Absolute target path is forbidden: ${locator.file}`,
      };
    }
    const lexicalCandidate = path.resolve(roots.lexicalRoot, locator.file);
    const relativeCandidate = toPosixPath(path.relative(roots.lexicalRoot, lexicalCandidate));
    if (
      !relativeCandidate ||
      relativeCandidate.startsWith('..') ||
      path.isAbsolute(relativeCandidate)
    ) {
      return {
        ok: false,
        reason: 'outside-workspace',
        detail: `Target path escapes workspace root: ${locator.file}`,
      };
    }
    if (locator.file !== relativeCandidate) {
      return {
        ok: false,
        reason: 'outside-workspace',
        detail: `Target path must be canonical within workspace root: ${locator.file}`,
      };
    }
    fileRelative = relativeCandidate;
  }

  if (locator.uri !== undefined) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(locator.uri);
    } catch {
      return {
        ok: false,
        reason: 'malformed-plan',
        detail: `Malformed target URI: ${locator.uri}`,
      };
    }
    if (parsedUrl.search || parsedUrl.hash) {
      return {
        ok: false,
        reason: 'malformed-plan',
        detail: `Target URI must not contain query or fragment: ${locator.uri}`,
      };
    }
    if (parsedUrl.protocol !== 'file:') {
      return {
        ok: false,
        reason: 'outside-workspace',
        detail: `Unsupported non-file URI scheme: ${locator.uri}`,
      };
    }
    if (parsedUrl.hostname && parsedUrl.hostname !== 'localhost') {
      return {
        ok: false,
        reason: 'outside-workspace',
        detail: `Remote file URI host is outside workspace: ${locator.uri}`,
      };
    }
    let uriFilePath: string;
    try {
      uriFilePath = fileURLToPath(parsedUrl);
    } catch {
      return {
        ok: false,
        reason: 'malformed-plan',
        detail: `Malformed file URI path: ${locator.uri}`,
      };
    }
    const resolvedUriPath = path.resolve(uriFilePath);
    // Allow matching either lexicalRoot or realRoot (for macOS /var -> /private/var).
    const lexicalRel = toPosixPath(path.relative(roots.lexicalRoot, resolvedUriPath));
    const realRel = toPosixPath(path.relative(roots.realRoot, resolvedUriPath));
    const chosenRel =
      lexicalRel && !lexicalRel.startsWith('..') && !path.isAbsolute(lexicalRel)
        ? lexicalRel
        : realRel && !realRel.startsWith('..') && !path.isAbsolute(realRel)
          ? realRel
          : undefined;
    if (!chosenRel) {
      return {
        ok: false,
        reason: 'outside-workspace',
        detail: `Target URI resolves outside workspace root: ${locator.uri}`,
      };
    }
    const expectedCanonicalUriLexical = fileUriFromPath(path.join(roots.lexicalRoot, chosenRel));
    const expectedCanonicalUriReal = fileUriFromPath(path.join(roots.realRoot, chosenRel));
    if (locator.uri !== expectedCanonicalUriLexical && locator.uri !== expectedCanonicalUriReal) {
      return {
        ok: false,
        reason: 'outside-workspace',
        detail: `Target URI is not canonical within workspace root: ${locator.uri}`,
      };
    }
    uriRelative = chosenRel;
  }

  if (fileRelative !== undefined && uriRelative !== undefined && fileRelative !== uriRelative) {
    return {
      ok: false,
      reason: 'malformed-plan',
      detail: `Target file (${fileRelative}) and uri (${uriRelative}) disagree`,
    };
  }

  const relativePath = fileRelative ?? uriRelative;
  if (!relativePath) {
    return {
      ok: false,
      reason: 'malformed-plan',
      detail: 'Target file path could not be resolved',
    };
  }

  const segments = relativePath.split('/');
  let currentPath = roots.lexicalRoot;
  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(currentPath);
    } catch {
      if (requireExistingFile) {
        return {
          ok: false,
          reason: 'outside-workspace',
          detail: `Target file does not exist in workspace: ${relativePath}`,
        };
      }
      return {
        ok: true,
        relativePath,
        lexicalPath: path.join(roots.lexicalRoot, relativePath),
        canonicalUri: fileUriFromPath(path.join(roots.lexicalRoot, relativePath)),
      };
    }
    if (stat.isSymbolicLink()) {
      return {
        ok: false,
        reason: 'symlink-escape',
        detail: `Symlink path segment is forbidden in workspace scope: ${relativePath}`,
      };
    }
  }

  const lexicalPath = path.join(roots.lexicalRoot, relativePath);
  try {
    const realTarget = fs.realpathSync(lexicalPath);
    const canonicalRelative = toPosixPath(path.relative(roots.realRoot, realTarget));
    if (
      !canonicalRelative ||
      canonicalRelative.startsWith('..') ||
      path.isAbsolute(canonicalRelative) ||
      canonicalRelative !== relativePath
    ) {
      return {
        ok: false,
        reason: 'symlink-escape',
        detail: `Target resolves outside canonical workspace path: ${relativePath}`,
      };
    }
    if (requireExistingFile && !fs.statSync(realTarget).isFile()) {
      return {
        ok: false,
        reason: 'outside-workspace',
        detail: `Target path is not a regular file: ${relativePath}`,
      };
    }
  } catch {
    if (requireExistingFile) {
      return {
        ok: false,
        reason: 'outside-workspace',
        detail: `Target file cannot be resolved in workspace: ${relativePath}`,
      };
    }
  }

  return {
    ok: true,
    relativePath,
    lexicalPath,
    canonicalUri: fileUriFromPath(lexicalPath),
  };
}

function indexOpenDocuments(
  roots: WorkspaceRoots,
  openDocuments: readonly OpenLspDocumentSnapshot[]
): Map<string, OpenLspDocumentSnapshot> {
  const byRelativePath = new Map<string, OpenLspDocumentSnapshot>();
  for (const snapshot of openDocuments) {
    const resolved = resolveCanonicalWorkspaceFile(roots, { uri: snapshot.uri }, false);
    if (resolved.ok) {
      byRelativePath.set(resolved.relativePath, snapshot);
    }
  }
  return byRelativePath;
}

function validateAndOrderEdits(
  edits: readonly ConventionFixTextEdit[],
  content: string,
  relativePath: string
):
  | { readonly ok: true; readonly edits: readonly TextEdit[] }
  | {
      readonly ok: false;
      readonly reason: 'malformed-plan' | 'conflict';
      readonly detail: string;
    } {
  const lines = content.split(/\r\n|\r|\n/);
  for (const edit of edits) {
    if (
      !isPositionWithinLines(edit.range.start, lines) ||
      !isPositionWithinLines(edit.range.end, lines)
    ) {
      return {
        ok: false,
        reason: 'malformed-plan',
        detail: `Edit range exceeds document bounds in ${relativePath}`,
      };
    }
  }

  const ordered = [...edits].sort(compareEdits);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (!previous || !current) continue;
    if (
      comparePositions(previous.range.start, current.range.start) === 0 &&
      comparePositions(previous.range.end, current.range.end) === 0 &&
      previous.newText === current.newText
    ) {
      return {
        ok: false,
        reason: 'conflict',
        detail: `Duplicate edit in ${relativePath}`,
      };
    }
    if (
      comparePositions(previous.range.start, current.range.start) === 0 ||
      comparePositions(current.range.start, previous.range.end) < 0
    ) {
      return {
        ok: false,
        reason: 'conflict',
        detail: `Overlapping edits in ${relativePath}`,
      };
    }
  }

  return {
    ok: true,
    edits: Object.freeze(
      ordered.map((edit) =>
        Object.freeze({
          range: Object.freeze({
            start: Object.freeze({
              line: edit.range.start.line,
              character: edit.range.start.character,
            }),
            end: Object.freeze({
              line: edit.range.end.line,
              character: edit.range.end.character,
            }),
          }),
          newText: edit.newText,
        })
      )
    ),
  };
}

function isPositionWithinLines(position: ConventionFixPosition, lines: readonly string[]): boolean {
  if (position.line < 0 || position.line >= lines.length) return false;
  const lineText = lines[position.line];
  if (lineText === undefined) return false;
  return position.character >= 0 && position.character <= lineText.length;
}

function comparePositions(left: ConventionFixPosition, right: ConventionFixPosition): number {
  return left.line - right.line || left.character - right.character;
}

function compareEdits(left: ConventionFixTextEdit, right: ConventionFixTextEdit): number {
  return (
    comparePositions(left.range.start, right.range.start) ||
    comparePositions(left.range.end, right.range.end) ||
    left.newText.localeCompare(right.newText)
  );
}

function computeActionId(
  plan: RetainedConventionFixPlan,
  validatedTargets: ReadonlyArray<{
    readonly relativePath: string;
    readonly sourceContentDigest: string;
    readonly expectedVersion?: number;
    readonly edits: readonly TextEdit[];
  }>
): string {
  const payload = {
    contractVersion: plan.contractVersion,
    planId: plan.planId,
    ...(plan.historyId ? { historyId: plan.historyId } : {}),
    checkId: plan.checkId,
    findingId: plan.findingId,
    codeRevisionId: plan.codeRevisionId,
    targets: validatedTargets.map((target) => ({
      file: target.relativePath,
      sourceContentDigest: target.sourceContentDigest,
      ...(target.expectedVersion !== undefined ? { expectedVersion: target.expectedVersion } : {}),
      edits: target.edits,
    })),
  };
  return `convention-fix-action:${createHash('sha256').update(stableJson(payload)).digest('hex')}`;
}

function reject(
  planId: string | undefined,
  reason: MutatingCodeActionRejectionReason,
  detail: string
): {
  readonly ok: false;
  readonly planId?: string;
  readonly reason: MutatingCodeActionRejectionReason;
  readonly detail: string;
} {
  return {
    ok: false,
    ...(planId ? { planId } : {}),
    reason,
    detail,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}
