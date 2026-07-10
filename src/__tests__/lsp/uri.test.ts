import * as path from 'node:path';
import {
  filePathFromUri,
  fileUriFromPath,
  isTypeScriptSourcePath,
  resolveWorkspaceRoot,
} from '../../lsp/uri';

describe('LSP file URI boundary', () => {
  it('round-trips escaped native paths and line fragments', () => {
    const filePath = path.resolve('/tmp/space dir/한글#symbol.ts');
    const uri = fileUriFromPath(filePath, 12);

    expect(uri).toContain('space%20dir');
    expect(uri).toContain('%23symbol.ts');
    expect(uri).toContain('#L12');
    expect(filePathFromUri(uri)).toBe(filePath);
  });

  it('uses rootUri when workspace folders are not supplied', () => {
    const root = path.resolve('/tmp/root uri');
    expect(resolveWorkspaceRoot(undefined, fileUriFromPath(root), '/fallback')).toBe(root);
    expect(resolveWorkspaceRoot(['untitled:workspace'], null, '/fallback')).toBe('/fallback');
  });

  it('recognizes modern TypeScript source extensions', () => {
    expect(isTypeScriptSourcePath('/src/a.ts')).toBe(true);
    expect(isTypeScriptSourcePath('/src/a.tsx')).toBe(true);
    expect(isTypeScriptSourcePath('/src/a.mts')).toBe(true);
    expect(isTypeScriptSourcePath('/src/a.cts')).toBe(true);
    expect(isTypeScriptSourcePath('/src/a.js')).toBe(false);
  });
});
