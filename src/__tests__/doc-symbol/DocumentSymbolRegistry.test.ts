import * as path from 'node:path';
import { DocumentSymbolRegistry } from '../../doc-symbol/DocumentSymbolRegistry';
import type { ParsedDocSymbols } from '../../types/feature';

const documentSymbols = (
  name: string,
  codeImplementation?: 'required' | 'not-applicable'
): ParsedDocSymbols => ({
  filePath: path.join(process.cwd(), 'managed', 'features', `${name}.md`),
  primary: {
    name,
    type: 'primary',
    filePath: path.join(process.cwd(), 'managed', 'features', `${name}.md`),
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

  it('resolves unique H2/H3 hub section checkpoints without orphaned_auxiliary or missing_primary errors', () => {
    const registry = new DocumentSymbolRegistry();
    const hubPath = path.join(process.cwd(), 'managed', 'features', 'HubSystem.md');
    const consumerPath = path.join(process.cwd(), 'managed', 'features', 'ConsumerDoc.md');

    registry.registerDocument({
      filePath: hubPath,
      primary: {
        name: 'HubSystem',
        type: 'primary',
        filePath: hubPath,
        line: 1,
        level: 1,
        codeImplementation: 'not-applicable',
      },
      auxiliaries: [
        {
          name: 'SubComponent',
          type: 'auxiliary',
          filePath: hubPath,
          line: 12,
          level: 2,
        },
      ],
      references: [],
      codeReferences: [],
      symbolFootnoteRefs: [],
    });

    registry.registerDocument({
      filePath: consumerPath,
      primary: {
        name: 'ConsumerDoc',
        type: 'primary',
        filePath: consumerPath,
        line: 1,
        level: 1,
        codeImplementation: 'not-applicable',
      },
      auxiliaries: [],
      references: [
        {
          name: 'SubComponent',
          type: 'reference',
          filePath: consumerPath,
          line: 8,
          level: 0,
        },
      ],
      codeReferences: [],
      symbolFootnoteRefs: [],
    });

    const result = registry.validate();

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(registry.getPrimaryDefinition('SubComponent')).toBeUndefined();
    expect(registry.getDefinition('SubComponent')).toEqual(
      expect.objectContaining({
        name: 'SubComponent',
        type: 'auxiliary',
        filePath: hubPath,
        line: 12,
      })
    );
    expect(registry.resolveDefinition('SubComponent')).toEqual(
      registry.getDefinition('SubComponent')
    );
    expect(registry.getAllSymbolNames()).toEqual(['HubSystem', 'ConsumerDoc']);
    expect(registry.getAllResolvableSymbolNames()).toEqual([
      'HubSystem',
      'ConsumerDoc',
      'SubComponent',
    ]);
  });

  it('rejects ambiguous auxiliary section headings across multiple files when no canonical H1 primary exists', () => {
    const registry = new DocumentSymbolRegistry();
    const firstHubPath = path.join(process.cwd(), 'managed', 'features', 'FirstHub.md');
    const secondHubPath = path.join(process.cwd(), 'managed', 'features', 'SecondHub.md');
    const consumerPath = path.join(process.cwd(), 'managed', 'features', 'Consumer.md');

    registry.registerDocument({
      filePath: firstHubPath,
      primary: {
        name: 'FirstHub',
        type: 'primary',
        filePath: firstHubPath,
        line: 1,
        level: 1,
        codeImplementation: 'not-applicable',
      },
      auxiliaries: [
        {
          name: 'SubComponent',
          type: 'auxiliary',
          filePath: firstHubPath,
          line: 10,
          level: 2,
        },
      ],
      references: [],
      codeReferences: [],
      symbolFootnoteRefs: [],
    });

    registry.registerDocument({
      filePath: secondHubPath,
      primary: {
        name: 'SecondHub',
        type: 'primary',
        filePath: secondHubPath,
        line: 1,
        level: 1,
        codeImplementation: 'not-applicable',
      },
      auxiliaries: [
        {
          name: 'SubComponent',
          type: 'auxiliary',
          filePath: secondHubPath,
          line: 15,
          level: 3,
        },
      ],
      references: [],
      codeReferences: [],
      symbolFootnoteRefs: [],
    });

    registry.registerDocument({
      filePath: consumerPath,
      primary: {
        name: 'Consumer',
        type: 'primary',
        filePath: consumerPath,
        line: 1,
        level: 1,
        codeImplementation: 'not-applicable',
      },
      auxiliaries: [],
      references: [
        {
          name: 'SubComponent',
          type: 'reference',
          filePath: consumerPath,
          line: 6,
          level: 0,
        },
      ],
      codeReferences: [],
      symbolFootnoteRefs: [],
    });

    const result = registry.validate();

    expect(result.valid).toBe(false);
    expect(registry.getDefinition('SubComponent')).toBeUndefined();
    const orphanedErrors = result.errors.filter((error) => error.type === 'orphaned_auxiliary');
    expect(orphanedErrors).toHaveLength(2);
    expect(orphanedErrors[0].message).toContain(
      'Auxiliary definition [[SubComponent]] appears in 2 locations without a canonical primary (H1) definition'
    );
    expect(result.errors.some((error) => error.type === 'missing_primary')).toBe(true);
  });

  it('prefers canonical H1 primary definitions over auxiliary headings and still rejects duplicate H1 primaries', () => {
    const registry = new DocumentSymbolRegistry();
    const primaryPath = path.join(process.cwd(), 'managed', 'features', 'PrimaryComp.md');
    const hubPath = path.join(process.cwd(), 'managed', 'features', 'HubOverview.md');

    registry.registerDocument({
      filePath: primaryPath,
      primary: {
        name: 'PrimaryComp',
        type: 'primary',
        filePath: primaryPath,
        line: 1,
        level: 1,
        codeImplementation: 'not-applicable',
      },
      auxiliaries: [],
      references: [],
      codeReferences: [],
      symbolFootnoteRefs: [],
    });

    registry.registerDocument({
      filePath: hubPath,
      primary: {
        name: 'HubOverview',
        type: 'primary',
        filePath: hubPath,
        line: 1,
        level: 1,
        codeImplementation: 'not-applicable',
      },
      auxiliaries: [
        {
          name: 'PrimaryComp',
          type: 'auxiliary',
          filePath: hubPath,
          line: 20,
          level: 2,
        },
        {
          name: 'PrimaryComp',
          type: 'auxiliary',
          filePath: hubPath,
          line: 40,
          level: 3,
        },
      ],
      references: [],
      codeReferences: [],
      symbolFootnoteRefs: [],
    });

    expect(registry.validate().valid).toBe(true);
    expect(registry.getDefinition('PrimaryComp')?.type).toBe('primary');
    expect(registry.getDefinition('PrimaryComp')?.filePath).toBe(primaryPath);

    expect(() =>
      registry.registerDocument(documentSymbols('PrimaryComp', 'not-applicable'))
    ).toThrow('Duplicate primary definition for [[PrimaryComp]]');
  });
});
