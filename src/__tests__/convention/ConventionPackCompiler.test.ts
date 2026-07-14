import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CONVENTION_PACK_COMPILER_ID,
  type ConventionPackSource,
  compileConventionPackFile,
  compileConventionPackSource,
  validateConventionPackManifest,
} from '../../convention';
import { createSpecGraphRevision } from '../../spec-graph';
import { fixturePackSource } from './fixtures';

const context = {
  file: 'managed/conventions/core.json',
  contentDigest: `sha256:${'0'.repeat(64)}`,
} as const;

describe('ConventionPackCompiler', () => {
  it('compiles deterministic exact spec, policy, and rule-set pins', () => {
    const source = fixturePackSource();
    const reversed: ConventionPackSource = {
      ...source,
      spec: { ...source.spec, nodes: [...source.spec.nodes].reverse() },
    };

    const left = compileConventionPackSource(source, context);
    const right = compileConventionPackSource(reversed, context);

    expect(left.manifest).toEqual(right.manifest);
    expect(left.manifest.manifestId).toBe(`convention-pack:${left.manifest.contentDigest}`);
    expect(left.manifest.spec).toEqual({
      revisionId: left.spec.revisionId,
      contentFingerprint: left.spec.contentFingerprint,
    });
    expect(left.manifest.policy.revisionId).toBe(left.policy.revisionId);
    expect(left.manifest.ruleSet.revisionId).toBe(left.ruleSet.revisionId);
    expect(left.spec.provenance.extractorId).toBe(CONVENTION_PACK_COMPILER_ID);
    expect(Object.isFrozen(left.manifest)).toBe(true);
  });

  it('uses an exact managed spec revision and rejects duplicate JSON authoring', () => {
    const bootstrap = compileConventionPackSource(fixturePackSource(), context);
    const managedSpec = createSpecGraphRevision({
      workspaceId: bootstrap.spec.workspaceId,
      nodes: bootstrap.spec.nodes,
      edges: bootstrap.spec.edges,
      bindings: bootstrap.spec.bindings,
      provenance: {
        source: 'managed-document',
        extractorId: 'tsdoc-edge/managed-spec-extractor',
        extractorVersion: '1.0.0',
        authoredSourceFingerprint: `sha256:${'1'.repeat(64)}`,
      },
    });
    const policyOnly: ConventionPackSource = {
      ...fixturePackSource(),
      spec: { nodes: [], edges: [], bindings: [] },
    };

    const compiled = compileConventionPackSource(policyOnly, { ...context, managedSpec });
    expect(compiled.spec).toEqual(managedSpec);
    expect(compiled.spec.provenance.extractorId).toBe('tsdoc-edge/managed-spec-extractor');
    expect(() =>
      compileConventionPackSource(fixturePackSource(), { ...context, managedSpec })
    ).toThrow('duplicate JSON authoring');
  });

  it('rejects unknown source fields and noncanonical versions', () => {
    expect(() =>
      compileConventionPackSource({ ...fixturePackSource(), typo: true }, context)
    ).toThrow('unknown field');
    expect(() =>
      compileConventionPackSource({ ...fixturePackSource(), packVersion: '01.0.0' }, context)
    ).toThrow('canonical SemVer');
  });

  it('requires explicit executable rules for every used binding kind', () => {
    const source = fixturePackSource();
    expect(() =>
      compileConventionPackSource({ ...source, policy: { ...source.policy, rules: [] } }, context)
    ).toThrow('explicitly define policy rule binding.implementation');
  });

  it('rejects policy parameters that the v1 engine cannot execute', () => {
    const source = fixturePackSource();
    expect(() =>
      compileConventionPackSource(
        {
          ...source,
          policy: {
            ...source.policy,
            rules: [{ ...source.policy.rules[0], parameters: { ignored: true } }],
          },
        },
        context
      )
    ).toThrow('parameters are not executable');
  });

  it('requires explicit severity and a canonical authored source digest', () => {
    const source = fixturePackSource();
    const rule = source.policy.rules[0];
    expect(rule).toBeDefined();
    expect(() =>
      compileConventionPackSource(
        {
          ...source,
          policy: {
            ...source.policy,
            rules: [{ id: rule!.id, version: rule!.version, enabled: rule!.enabled }],
          },
        },
        context
      )
    ).toThrow('severity must be explicit');
    expect(() =>
      compileConventionPackSource(source, { ...context, contentDigest: 'sha256:not-a-digest' })
    ).toThrow('canonical SHA-256');
  });

  it('rejects vacuous packs with no bindings or no enabled rules', () => {
    const source = fixturePackSource();
    expect(() =>
      compileConventionPackSource({ ...source, spec: { ...source.spec, bindings: [] } }, context)
    ).toThrow('at least one spec binding');
    expect(() =>
      compileConventionPackSource(fixturePackSource({ enabled: false }), context)
    ).toThrow('enable at least one rule used by a binding');
  });

  it('does not count an enabled but unused rule as a non-vacuous gate', () => {
    const source = fixturePackSource({ enabled: false });
    expect(() =>
      compileConventionPackSource(
        {
          ...source,
          policy: {
            ...source.policy,
            rules: [
              source.policy.rules[0],
              {
                id: 'binding.verification',
                version: '2.0.0',
                enabled: true,
                severity: 'error',
              },
            ],
          },
        },
        context
      )
    ).toThrow('enable at least one rule used by a binding');
  });

  it('rejects a forged compiled manifest even when its revision pins are unchanged', () => {
    const compiled = compileConventionPackSource(fixturePackSource(), context);
    expect(() =>
      validateConventionPackManifest({ ...compiled.manifest, packId: '@forged/conventions' })
    ).toThrow('identity does not match');
  });

  it('rejects prototype keys instead of letting them bypass strict field validation', () => {
    const wrapper = JSON.parse(JSON.stringify({ ['__proto__']: fixturePackSource() })) as unknown;
    expect(() => compileConventionPackSource(wrapper, context)).toThrow('forbidden object key');
  });

  it('rejects a workspace-local symlink that resolves to an external pack', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-pack-workspace-'));
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-pack-external-'));
    try {
      const externalPack = path.join(external, 'pack.json');
      const linkedPack = path.join(workspace, 'pack.json');
      fs.writeFileSync(externalPack, JSON.stringify(fixturePackSource()));
      fs.symlinkSync(externalPack, linkedPack);
      expect(() => compileConventionPackFile(linkedPack, { workspaceRoot: workspace })).toThrow(
        'must resolve to a file inside the workspace root'
      );
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
      fs.rmSync(external, { recursive: true, force: true });
    }
  });
});
