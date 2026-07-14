import * as path from 'node:path';
import { DocumentSymbolRegistry } from '../../doc-symbol/DocumentSymbolRegistry';
import type { ParsedDocSymbols } from '../../types/feature';

const documentSymbols = (
  name: string,
  codeImplementation?: 'required' | 'not-applicable'
): ParsedDocSymbols => ({
  filePath: path.join(process.cwd(), 'managed', `${name}.md`),
  primary: {
    name,
    type: 'primary',
    filePath: path.join(process.cwd(), 'managed', `${name}.md`),
    line: 1,
    level: 1,
    ...(codeImplementation ? { codeImplementation } : {}),
  },
  auxiliaries: [],
  references: [],
  codeReferences: [],
  symbolFootnoteRefs: [],
});

describe('DocumentSymbolRegistry', () => {
  it('does not require a code connection for an explicit non-applicable document', () => {
    const registry = new DocumentSymbolRegistry();
    registry.registerDocument(documentSymbols('Concept', 'not-applicable'));

    const result = registry.validate();

    expect(result.warnings.filter((warning) => warning.type === 'no_code_impl')).toEqual([]);
  });

  it('keeps the code connection warning for an implementation document', () => {
    const registry = new DocumentSymbolRegistry();
    registry.registerDocument(documentSymbols('Implementation'));

    const result = registry.validate();

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'no_code_impl',
          symbolName: 'Implementation',
        }),
      ])
    );
  });
});
