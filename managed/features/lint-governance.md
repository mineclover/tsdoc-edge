---
title: Lint Governance
type: feature
category: governance
status: active
canonical: true
source: src/commands/LintCommand.ts
---

# [[Lint Governance]]

Biome owns formatting and local syntax/style hygiene; `ttsc@0.34.3` + `@ttsc/lint@0.34.3` (backed
by `typescript-native@7.0.2`) owns semantic type correctness, checker-backed lint gates, and native
TSDoc/checkpoint check-stage enforcement via `tools/ttsc-tsdoc`. Detailed platform boundaries live
in [[TtscPlatformSpecification]], [[TSDocStandardSpecification]], and
[[CrossSpecIntegrationContract]].

## Severity policy

| Surface | Policy | Reason |
| --- | --- | --- |
| All files (Biome) | Biome recommended errors, parsing, formatting (`0` warnings, `0` infos budget) | Deterministic repository baseline; CI blocks violations; `@ttsc/lint` omits `format` so Biome stays sole formatter. |
| All TypeScript builds & tests (`lint.config.mjs`) | 20 enforced `@ttsc/lint` `error` rules (`tsdoc-edge/*` 7, `typescript/*` 8, `jsdoc/*` 5) | Auto-discovered on `npm run build`, `npm test`, and `ttscserver`; `0` findings across `src/` and `src/__tests__/`. |
| Production strict type-safety gate (`lint.ratchet.config.mjs`) | 5 additional `typescript/*` `error` rules (`25` total `error` rules, `0` `warn` rules) | Enforced via `tsconfig.lint.json` (`npm run lint:ttsc`) after graduating all 930 historical warnings down to `0` findings. |
| Canonical governance kernel | Biome `noExplicitAny`, `noNonNullAssertion` are errors (`lint:governance`) | Revision-pinned analysis code must not inherit legacy trust shortcuts. |
| Tests, demos, examples | `src/__tests__/fixtures/**` ignored only where intentional malformed fixtures are required | Fixtures may model loose input, while production and test suites share the 20-rule global `error` gate (`25` on production `src/`). |

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
npm run ttsc:prepare     # ahead-of-time Go compilation for @ttsc/lint + tools/ttsc-tsdoc
npm run lint             # Biome check + lint:budget (0/0) + lint:governance + lint:ttsc (25 error rules)
npm run lint:budget      # Biome warning/info budget gate
npm run lint:governance  # canonical kernel: Biome warnings are failures
npm run lint:ttsc        # @ttsc/lint 25 error rules (0 findings, 0 warn rules)
npm run typecheck        # ttsc + 20 global enforced error rules on tsconfig.ttsc.json
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

---

## Backlinks

### Referenced By

- [[CrossSpecIntegrationContract]] → managed/specs/domains/cross-spec-integration-contract.md:230
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:164
- [[TtscPlatformSpecification]] → managed/specs/domains/ttsc-platform-spec.md:100
- [[Document Validation Warning Policy]] → managed/workflows/document-validation-warning-policy.md:13

### Implemented By

- Lint Governance → src/commands/LintCommand.ts:1

