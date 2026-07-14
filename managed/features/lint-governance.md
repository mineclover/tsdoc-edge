---
title: Lint Governance
type: feature
category: governance
status: active
canonical: true
source: src/commands/LintCommand.ts
---

# [[Lint Governance]]

Biome owns formatting and local static hygiene; TypeScript 7 owns semantic type correctness. The
two gates are complementary: a green formatter does not replace `npm run typecheck`, and a green
typecheck does not permit new lint debt.

## Severity policy

| Surface | Policy | Reason |
| --- | --- | --- |
| All files | Biome recommended errors, parsing, formatting | Deterministic repository baseline; CI blocks violations. |
| All TypeScript code | `noAssignInExpressions`, `noImplicitAnyLet` are errors | Regex/extraction loops use `matchAll()` or an explicit typed step. |
| Canonical governance kernel | `noExplicitAny`, `noNonNullAssertion` are errors | New revision-pinned analysis code must not inherit legacy trust shortcuts. |
| Legacy application, scripts, MCP server | `noExplicitAny`, `noNonNullAssertion` remain warnings during migration | Existing behavior is preserved while each touched subsystem removes debt deliberately. |
| Tests, demos, examples | Test-specific exceptions only where the fixture requires them | Fixtures may model loose input, but production policy is not weakened. |

The strict surface currently includes `src/convention`, `src/semantic-graph`, `src/spec-graph`,
`src/lsp`, `src/indexer`, `mcp-server/src`, and the four immutable revision repositories. Adding a
new canonical or integration directory requires adding it to `biome.json` and `lint:governance` in
the same change.

## Migration budget

Legacy diagnostics are not silently ignored. `lint:budget` reads Biome's machine-readable report
and rejects a new warning category or any count above this baseline:

| Rule | Maximum |
| --- | ---: |
| `noNonNullAssertion` | 0 |
| `noExplicitAny` | 0 |
| other current info categories | 1–23, enforced by script |

Reducing the budget is encouraged and does not require a migration exception. Increasing it needs a
reviewed rule/contract decision and this document must be updated in the same commit.

`UnifiedRelationship.properties` now uses the explicit `RelationshipProperties` contract from
`src/types/relationships/unified.ts`. Known analyzer fields are typed, values are restricted to
JSON-compatible primitives/arrays/objects, and opaque provider metadata remains `unknown` at the
extension boundary. This removes the legacy `any` without changing the persisted relationship
payload format; future relation-kind-specific maps can narrow the contract further when a concrete
semantic relationship requires it.

## Commands and CI contract

```bash
npm run lint             # baseline errors + warning budget + strict canonical kernel
npm run lint:budget      # no new legacy warning debt
npm run lint:governance  # canonical kernel: warnings are failures
npm run typecheck        # TypeScript 7 semantic gate
```

`npm run lint` is the CI entry point. `--write --unsafe` is a maintenance action, never a required
CI fix: it can change test harness access forms or type narrowing, so it must be followed by
typecheck and the affected test lane.

## Review checklist

1. Keep generated reports parseable or exclude them only when they are truly non-source artifacts.
2. Do not lower a production rule globally to accommodate one legacy file; use a migration warning
   and a bounded budget instead.
3. For new canonical code, use explicit narrowing instead of non-null assertions and split
   assignment-in-condition loops into observable steps.
4. When a warning is removed, leave the budget unchanged or lower it; never compensate with an
   unrelated new warning.
