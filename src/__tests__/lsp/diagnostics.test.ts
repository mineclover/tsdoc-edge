import { DiagnosticSeverity } from 'vscode-languageserver/node';
import type { CanonicalDiagnostic } from '../../indexer';
import { mapCanonicalDiagnostic, toLanguageServerDiagnostic } from '../../lsp/diagnostics';

describe('LSP diagnostic boundary', () => {
  it('preserves a numeric code and one-based canonical range through LSP conversion', () => {
    const canonical: CanonicalDiagnostic = {
      id: 'diagnostic:2322',
      code: 2322,
      category: 'compiler',
      severity: 'error',
      message: 'Type mismatch',
      file: 'src/a.ts',
      startLine: 7,
      startCol: 4,
      endLine: 8,
      endCol: 9,
    };

    const info = mapCanonicalDiagnostic(canonical);
    expect(info).toEqual({
      line: 7,
      startCol: 4,
      endLine: 8,
      endCol: 9,
      code: 2322,
      message: 'Type mismatch',
      severity: DiagnosticSeverity.Error,
    });

    expect(toLanguageServerDiagnostic(info)).toEqual({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 6, character: 3 },
        end: { line: 7, character: 8 },
      },
      code: 2322,
      message: 'Type mismatch',
      source: 'tsdoc-edge',
    });
  });

  it('retains the legacy full-line fallback when columns are absent', () => {
    const diagnostic = toLanguageServerDiagnostic({
      line: 3,
      message: 'Architecture violation',
      severity: DiagnosticSeverity.Warning,
    });

    expect(diagnostic.range).toEqual({
      start: { line: 2, character: 0 },
      end: { line: 2, character: Number.MAX_SAFE_INTEGER },
    });
    expect(diagnostic).not.toHaveProperty('code');
  });

  it('passes immutable saved-finding metadata through to the LSP client', () => {
    const data = {
      kind: 'saved-convention-finding',
      historyId: 'convention-history:fixture',
      checkId: 'convention-check:fixture',
      findingId: 'conformance-finding:fixture',
      sourceFile: 'managed/specs/fixture.md',
      sourceLine: 12,
    };

    expect(
      toLanguageServerDiagnostic({
        line: 12,
        message: 'Convention violated',
        severity: DiagnosticSeverity.Error,
        data,
      }).data
    ).toEqual(data);
  });
});
