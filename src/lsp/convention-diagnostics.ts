/** Project one exact saved convention check into file-scoped LSP diagnostics. */

import * as path from 'node:path';
import { DiagnosticSeverity } from 'vscode-languageserver/node';
import type { ConventionCheckResult } from '../convention/ConventionCheckService';
import type { DiagnosticInfo } from './diagnostics';

/** Only non-satisfied convention outcomes become saved editor diagnostics. */
export function conventionDiagnosticsForFile(
  result: ConventionCheckResult,
  workspaceRoot: string,
  filePath: string
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
    diagnostics.push({
      line: binding.source.range?.startLine ?? 1,
      ...(binding.source.range?.startColumn ? { startCol: binding.source.range.startColumn } : {}),
      code: `convention/${finding.ruleId}`,
      message: `Convention ${finding.outcome}: ${finding.ruleId} (${finding.declarationId})`,
      severity: severity(finding.severity),
    });
  }
  for (const finding of result.naming.findings) {
    if (finding.file !== normalized) continue;
    diagnostics.push({
      line: 1,
      code: `convention/${finding.ruleId}`,
      message: `Naming convention: ${finding.subject} must use ${finding.expected}`,
      severity: severity(finding.severity),
    });
  }
  for (const finding of result.tsdoc.findings) {
    if (finding.file !== normalized) continue;
    diagnostics.push({
      line: 1,
      code: `convention/${finding.ruleId}`,
      message: `TSDoc convention: ${finding.nodeId} is missing ${finding.missingTags.map((tag) => `@${tag}`).join(', ')}`,
      severity: severity(finding.severity),
    });
  }
  return Object.freeze(diagnostics.sort(compareDiagnostics));
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
