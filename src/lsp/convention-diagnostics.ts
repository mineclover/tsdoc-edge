/** Project one exact saved convention check into file-scoped LSP diagnostics. */

import * as path from 'node:path';
import { DiagnosticSeverity } from 'vscode-languageserver/node';
import type { ConventionCheckResult } from '../convention/ConventionCheckService';
import type { DiagnosticInfo } from './diagnostics';

export interface SavedConventionDiagnosticData {
  readonly kind: 'saved-convention-finding';
  readonly historyId?: string;
  readonly checkId: string;
  readonly findingId: string;
  readonly sourceFile: string;
  readonly sourceLine: number;
}

/** Only non-satisfied convention outcomes become saved editor diagnostics. */
export function conventionDiagnosticsForFile(
  result: ConventionCheckResult,
  workspaceRoot: string,
  filePath: string,
  historyId?: string
): readonly DiagnosticInfo[] {
  const normalized = relative(workspaceRoot, filePath);
  const bindings = new Map(
    result.retainedPack.spec.bindings.map((binding) => [binding.id, binding])
  );
  const diagnostics: DiagnosticInfo[] = [];
  for (const finding of result.conformance.findings) {
    if (finding.outcome === 'satisfied' || finding.outcome === 'disabled') continue;
    const binding = bindings.get(finding.declarationId);
    if (!binding || binding.source.file !== normalized) continue;
    const line = binding.source.range?.startLine ?? 1;
    diagnostics.push({
      line,
      ...(binding.source.range?.startColumn ? { startCol: binding.source.range.startColumn } : {}),
      code: `convention/${finding.ruleId}`,
      message: `Convention ${finding.outcome}: ${finding.ruleId} (${finding.declarationId})`,
      severity: severity(finding.severity),
      data: findingData(result.checkId, finding.findingId, binding.source.file, line, historyId),
    });
  }
  for (const finding of result.naming.findings) {
    if (finding.file !== normalized) continue;
    diagnostics.push({
      line: 1,
      code: `convention/${finding.ruleId}`,
      message: `Naming convention: ${finding.subject} must use ${finding.expected}`,
      severity: severity(finding.severity),
      data: findingData(result.checkId, finding.findingId, finding.file, 1, historyId),
    });
  }
  for (const finding of result.tsdoc.findings) {
    if (finding.file !== normalized) continue;
    diagnostics.push({
      line: 1,
      code: `convention/${finding.ruleId}`,
      message: `TSDoc convention: ${finding.nodeId} is missing ${finding.missingTags.map((tag) => `@${tag}`).join(', ')}`,
      severity: severity(finding.severity),
      data: findingData(result.checkId, finding.findingId, finding.file, 1, historyId),
    });
  }
  for (const finding of result.graphLint.findings) {
    const source = graphLintSource(finding.seed);
    if (!source || source.file !== normalized) continue;
    diagnostics.push({
      line: source.line,
      ...(source.startCol ? { startCol: source.startCol } : {}),
      code: `convention/${finding.ruleId}`,
      message: `Graph-lint convention: ${finding.message}`,
      severity: severity(finding.severity),
      data: findingData(result.checkId, finding.findingId, source.file, source.line, historyId),
    });
  }
  return Object.freeze(diagnostics.sort(compareDiagnostics));
}

function graphLintSource(
  seed: Readonly<Record<string, unknown>> | undefined
): { file: string; line: number; startCol?: number } | undefined {
  if (!seed || typeof seed.file !== 'string' || !seed.file) return undefined;
  const line = typeof seed.startLine === 'number' && seed.startLine > 0 ? seed.startLine : 1;
  const startCol =
    typeof seed.startCol === 'number' && seed.startCol > 0 ? seed.startCol : undefined;
  return { file: seed.file, line, ...(startCol ? { startCol } : {}) };
}

function findingData(
  checkId: string,
  findingId: string,
  sourceFile: string,
  sourceLine: number,
  historyId?: string
): SavedConventionDiagnosticData {
  return Object.freeze({
    kind: 'saved-convention-finding',
    ...(historyId ? { historyId } : {}),
    checkId,
    findingId,
    sourceFile,
    sourceLine,
  });
}

function relative(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function severity(value: 'error' | 'warning' | 'info'): DiagnosticSeverity {
  return value === 'error'
    ? DiagnosticSeverity.Error
    : value === 'warning'
      ? DiagnosticSeverity.Warning
      : DiagnosticSeverity.Information;
}

function compareDiagnostics(left: DiagnosticInfo, right: DiagnosticInfo): number {
  return left.line - right.line || left.message.localeCompare(right.message);
}
