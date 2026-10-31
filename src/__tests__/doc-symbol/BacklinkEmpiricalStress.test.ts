/**
 * Empirical Adversarial Stress Testing for Backlink Idempotency, Path Sanitization,
 * Self-Reference Prevention, Deduplication, and Section Boundary Safety.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BacklinkGenerator } from '../../doc-symbol/BacklinkGenerator';
import { DocumentSymbolParser } from '../../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../../doc-symbol/DocumentSymbolRegistry';

describe('BacklinkEmpiricalStress', () => {
  let tempRoot: string;
  let registry: DocumentSymbolRegistry;
  let generator: BacklinkGenerator;

  beforeEach(() => {
    tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'backlink-stress-')));
    registry = new DocumentSymbolRegistry();
    generator = new BacklinkGenerator(registry);
  });

  afterEach(() => {
    if (fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  describe('Objective 1: 100% Idempotency Across Consecutive Multi-Pass Executions', () => {
    it('executes Pass 1 -> Pass 2 -> Pass 3 with zero modifications on passes 2 and 3', () => {
      const docsDir = path.join(tempRoot, 'managed');
      fs.mkdirSync(docsDir, { recursive: true });

      // Create a network of 4 mutually referencing documents
      const fileA = path.join(docsDir, 'ModuleA.md');
      const fileB = path.join(docsDir, 'ModuleB.md');
      const fileC = path.join(docsDir, 'ModuleC.md');
      const fileD = path.join(docsDir, 'ModuleD.md');

      fs.writeFileSync(
        fileA,
        `---
source: src/modules/ModuleA.ts
---

# [[ModuleA]]

Module A references [[ModuleB]] and [[ModuleC]].
`,
        'utf8'
      );

      fs.writeFileSync(
        fileB,
        `---
source: src/modules/ModuleB.ts
---

# [[ModuleB]]

Module B references [[ModuleA]], [[ModuleC]], and [[ModuleD]].
`,
        'utf8'
      );

      fs.writeFileSync(
        fileC,
        `---
source: src/modules/ModuleC.ts
---

# [[ModuleC]]

Module C references [[ModuleD]] and [[ModuleA]].
`,
        'utf8'
      );

      fs.writeFileSync(
        fileD,
        `---
source: src/modules/ModuleD.ts
---

# [[ModuleD]]

Module D references [[ModuleA]].
`,
        'utf8'
      );

      const files = [fileA, fileB, fileC, fileD];

      // Helper function to build registry from files
      const buildRegistry = () => {
        const reg = new DocumentSymbolRegistry();
        const p = new DocumentSymbolParser();
        for (const f of files) {
          const parsed = p.parse(f);
          if (parsed) {
            reg.registerDocument(parsed);
            if (parsed.primary && parsed.sourceFilePath) {
              reg.registerCodeConnection({
                codeSymbol: parsed.primary.name,
                filePath: parsed.sourceFilePath,
                line: 1,
                docSymbol: parsed.primary.name,
              });
            }
          }
        }
        return reg;
      };

      // PASS 1: Generate initial backlinks
      const reg1 = buildRegistry();
      const gen1 = new BacklinkGenerator(reg1);
      const pass1Writes = files.map((f) => {
        const name = path.basename(f, '.md');
        return gen1.updateBacklinksSection(f, name);
      });

      // Pass 1 must have written changes
      expect(pass1Writes.every((w) => w === true)).toBe(true);

      // Snapshot Pass 1 content and stats
      const pass1Content = new Map<string, string>();
      const pass1Mtimes = new Map<string, number>();
      for (const f of files) {
        pass1Content.set(f, fs.readFileSync(f, 'utf8'));
        pass1Mtimes.set(f, fs.statSync(f).mtimeMs);
      }

      // PASS 2: Execute again on exact state
      const reg2 = buildRegistry();
      const gen2 = new BacklinkGenerator(reg2);
      const pass2Writes = files.map((f) => {
        const name = path.basename(f, '.md');
        return gen2.updateBacklinksSection(f, name);
      });

      // Pass 2 must produce 0 disk writes (all returned false)
      expect(pass2Writes.every((w) => w === false)).toBe(true);

      // Verify bit-for-bit file equality and mtime invariance
      for (const f of files) {
        const content2 = fs.readFileSync(f, 'utf8');
        expect(content2).toBe(pass1Content.get(f));
        expect(fs.statSync(f).mtimeMs).toBe(pass1Mtimes.get(f));
      }

      // PASS 3: Third pass must also be completely idempotent
      const reg3 = buildRegistry();
      const gen3 = new BacklinkGenerator(reg3);
      const pass3Writes = files.map((f) => {
        const name = path.basename(f, '.md');
        return gen3.updateBacklinksSection(f, name);
      });

      expect(pass3Writes.every((w) => w === false)).toBe(true);
      for (const f of files) {
        expect(fs.readFileSync(f, 'utf8')).toBe(pass1Content.get(f));
        expect(fs.statSync(f).mtimeMs).toBe(pass1Mtimes.get(f));
      }
    });
  });

  describe('Objective 2: Path Sanitization & Leak Prevention', () => {
    it('never leaks absolute paths (/Users/, /home/, C:) in formatted backlinks', () => {
      const docFile = path.join(tempRoot, 'ServiceDoc.md');
      const referencingDoc = path.join(tempRoot, 'sub', 'ClientDoc.md');
      fs.mkdirSync(path.dirname(referencingDoc), { recursive: true });

      registry.registerDocument({
        filePath: docFile,
        primary: {
          name: 'ServiceDoc',
          type: 'primary',
          filePath: docFile,
          line: 1,
          level: 1,
        },
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerDocument({
        filePath: referencingDoc,
        primary: {
          name: 'ClientDoc',
          type: 'primary',
          filePath: referencingDoc,
          line: 1,
          level: 1,
        },
        auxiliaries: [],
        references: [
          {
            name: 'ServiceDoc',
            type: 'reference',
            filePath: referencingDoc,
            line: 15,
            level: 0,
          },
        ],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      // Register code connection with an absolute path
      const absCodePath = path.resolve(process.cwd(), 'src/services/Service.ts');
      registry.registerCodeConnection({
        codeSymbol: 'ServiceClass',
        filePath: absCodePath,
        line: 42,
        docSymbol: 'ServiceDoc',
      });

      const backlinks = generator.generateBacklinks('ServiceDoc');

      // Assertions: relative formatting, no absolute machine leaks
      expect(backlinks).not.toContain(process.cwd());
      expect(backlinks).not.toMatch(/\/Users\/[a-zA-Z0-9_-]+/);
      expect(backlinks).not.toMatch(/[a-zA-Z]:\\/);
      expect(backlinks).toContain('ServiceClass → src/services/Service.ts:42');
      const expectedDocRel = path.relative(process.cwd(), referencingDoc).replace(/\\/g, '/');
      expect(backlinks).toContain(`[[ClientDoc]] → ${expectedDocRel}:15`);
    });
  });

  describe('Objective 3: Self-Reference & Deduplication', () => {
    it('filters out self-referencing backlinks', () => {
      const file = path.join(tempRoot, 'SelfTarget.md');

      registry.registerDocument({
        filePath: file,
        primary: {
          name: 'SelfTarget',
          type: 'primary',
          filePath: file,
          line: 1,
          level: 1,
        },
        auxiliaries: [],
        references: [
          // Document references its own primary symbol on lines 10, 20, 30
          { name: 'SelfTarget', type: 'reference', filePath: file, line: 10, level: 0 },
          { name: 'SelfTarget', type: 'reference', filePath: file, line: 20, level: 0 },
          { name: 'SelfTarget', type: 'reference', filePath: file, line: 30, level: 0 },
        ],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const markdown = generator.generateBacklinks('SelfTarget');
      expect(markdown).toBe('');
    });

    it('deduplicates multiple references originating from the same file into a single backlink entry', () => {
      const targetFile = path.join(tempRoot, 'Target.md');
      const callerFile = path.join(tempRoot, 'HeavyCaller.md');

      registry.registerDocument({
        filePath: targetFile,
        primary: {
          name: 'Target',
          type: 'primary',
          filePath: targetFile,
          line: 1,
          level: 1,
        },
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerDocument({
        filePath: callerFile,
        primary: {
          name: 'HeavyCaller',
          type: 'primary',
          filePath: callerFile,
          line: 1,
          level: 1,
        },
        auxiliaries: [],
        references: [
          { name: 'Target', type: 'reference', filePath: callerFile, line: 5, level: 0 },
          { name: 'Target', type: 'reference', filePath: callerFile, line: 12, level: 0 },
          { name: 'Target', type: 'reference', filePath: callerFile, line: 29, level: 0 },
          { name: 'Target', type: 'reference', filePath: callerFile, line: 45, level: 0 },
          { name: 'Target', type: 'reference', filePath: callerFile, line: 88, level: 0 },
        ],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const markdown = generator.generateBacklinks('Target');
      const callerMatches = markdown.match(/\[\[HeavyCaller\]\]/g) || [];
      expect(callerMatches.length).toBe(1);
      expect(markdown).toContain(':5');
    });

    it('deduplicates code connections with the same codeSymbol and normalized file path', () => {
      const targetFile = path.join(tempRoot, 'TargetCode.md');

      registry.registerDocument({
        filePath: targetFile,
        primary: {
          name: 'TargetCode',
          type: 'primary',
          filePath: targetFile,
          line: 1,
          level: 1,
        },
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      // Register duplicate code connections (one at line 1 from doc frontmatter, one at line 45 from AST parse)
      registry.registerCodeConnection({
        codeSymbol: 'TargetClass',
        filePath: 'src/services/Target.ts',
        line: 1,
        docSymbol: 'TargetCode',
      });
      registry.registerCodeConnection({
        codeSymbol: 'TargetClass',
        filePath: 'src/services/Target.ts',
        line: 45,
        docSymbol: 'TargetCode',
      });

      const markdown = generator.generateBacklinks('TargetCode');
      const matches = markdown.match(/TargetClass/g) || [];
      expect(matches.length).toBe(1);
      // The AST line (line 45) supersedes the line 1 fallback
      expect(markdown).toContain('TargetClass → src/services/Target.ts:45');
    });
  });

  describe('Objective 4: Non-Destructive Boundary Preservation', () => {
    it('preserves ## References placed after ## Backlinks during update', () => {
      const docPath = path.join(tempRoot, 'PreserveRef.md');
      const content = `# [[PreserveRef]]

Body content here.

---

## Backlinks

### Referenced By

- [[OldLink]] → old/path.md:1

## References

- [TSDoc Specification](https://tsdoc.org)
- [TypeScript Handbook](https://typescriptlang.org)
`;
      fs.writeFileSync(docPath, content, 'utf8');

      registry.registerDocument({
        filePath: docPath,
        primary: { name: 'PreserveRef', type: 'primary', filePath: docPath, line: 1, level: 1 },
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerCodeConnection({
        codeSymbol: 'PreserveRefService',
        filePath: 'src/services/PreserveRefService.ts',
        line: 10,
        docSymbol: 'PreserveRef',
      });

      const updated = generator.updateBacklinksSection(docPath, 'PreserveRef');
      expect(updated).toBe(true);

      const result = fs.readFileSync(docPath, 'utf8');
      expect(result).toContain('### Implemented By');
      expect(result).toContain('PreserveRefService → src/services/PreserveRefService.ts:10');
      expect(result).not.toContain('OldLink');
      expect(result).toContain(
        '## References\n\n- [TSDoc Specification](https://tsdoc.org)\n- [TypeScript Handbook](https://typescriptlang.org)'
      );
    });

    it('preserves ## Footnotes placed after ## Backlinks during section removal', () => {
      const docPath = path.join(tempRoot, 'PreserveFootnotes.md');
      const content = `# [[PreserveFootnotes]]

Body with footnote citation[^1].

---

## Backlinks

### Referenced By

- [[StaleLink]] → stale/path.md:1

## Footnotes

[^1]: Verified critical footnote that must not be deleted.
`;
      fs.writeFileSync(docPath, content, 'utf8');

      // No references exist in registry -> backlinks section should be cleanly removed
      registry.registerDocument({
        filePath: docPath,
        primary: {
          name: 'PreserveFootnotes',
          type: 'primary',
          filePath: docPath,
          line: 1,
          level: 1,
        },
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      const updated = generator.updateBacklinksSection(docPath, 'PreserveFootnotes');
      expect(updated).toBe(true);

      const result = fs.readFileSync(docPath, 'utf8');
      expect(result).not.toContain('## Backlinks');
      expect(result).not.toContain('StaleLink');
      expect(result).toContain(
        '## Footnotes\n\n[^1]: Verified critical footnote that must not be deleted.'
      );
    });

    it('preserves trailing sections prefixed by horizontal rules (---) after ## Backlinks', () => {
      const docPath = path.join(tempRoot, 'PreserveRule.md');
      const content = `# [[PreserveRule]]

Content here.

---

## Backlinks

### Old Section

---

## Appendix A

Deep technical appendix with code example:

\`\`\`typescript
const a = 1;
\`\`\`
`;
      fs.writeFileSync(docPath, content, 'utf8');

      registry.registerDocument({
        filePath: docPath,
        primary: { name: 'PreserveRule', type: 'primary', filePath: docPath, line: 1, level: 1 },
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      registry.registerCodeConnection({
        codeSymbol: 'PreserveRuleImpl',
        filePath: 'src/PreserveRule.ts',
        line: 1,
        docSymbol: 'PreserveRule',
      });

      generator.updateBacklinksSection(docPath, 'PreserveRule');
      const result = fs.readFileSync(docPath, 'utf8');

      expect(result).toContain('### Implemented By');
      expect(result).toContain('## Appendix A');
      expect(result).toContain('const a = 1;');
    });

    it('preserves trailing H1 sections if placed after ## Backlinks', () => {
      const docPath = path.join(tempRoot, 'TrailingH1.md');
      const content = `# [[TrailingH1]]

Main section.

---

## Backlinks

### Referenced By

- [[Old]] → old.md:1

# Separate Document Section

Secondary section title.
`;
      fs.writeFileSync(docPath, content, 'utf8');

      registry.registerDocument({
        filePath: docPath,
        primary: { name: 'TrailingH1', type: 'primary', filePath: docPath, line: 1, level: 1 },
        auxiliaries: [],
        references: [],
        codeReferences: [],
        symbolFootnoteRefs: [],
      });

      generator.updateBacklinksSection(docPath, 'TrailingH1');
      const result = fs.readFileSync(docPath, 'utf8');

      expect(result).not.toContain('## Backlinks');
      expect(result).toContain('# Separate Document Section\n\nSecondary section title.');
    });
  });
});
