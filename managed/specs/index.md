---
title: Authored Project Specifications
type: spec-index
category: specifications
status: active
canonical: true
---

# [[AuthoredProjectSpecifications]]

`managed/specs/` is the reserved authored SSOT root for project specifications. The roadmap records
execution order and proof; it never owns a project requirement, binding, or policy definition.

## Authority transition

`type: project-spec` documents in this root are the authored source for managed project-spec nodes,
edges, and bindings. `tsdoc-edge spec extract` compiles them into a `SpecGraphRevision` and
atomically promotes that derived projection. The document must have one `# [[PascalCheckpoint]]` H1
and exactly one explicit `tsdoc-spec` JSON fence; prose is never inferred as a binding.

`managed/conventions/tsdoc-edge-core.json` remains a separate bootstrap source for its legacy
canary's spec/policy/rules. It must not duplicate a managed-spec identity. The next authority
transition is to let the convention check select the extracted revision while retaining JSON only
for the policy/rule composition that has not yet moved into managed authoring.

`SpecGraphRepository`, result history, report JSON, and database rows are derived projections. They
must not be edited as alternate spec sources.

## Authoring convention

- File paths are workspace-relative and use kebab-case: `managed/specs/<area>/<spec-name>.md`.
- A canonical spec document defines one H1 checkpoint in PascalCase: `# [[SpecName]]`.
- The document supplies Purpose, Input, Output, Context, Logic, Effect, and Scope sections.
- Machine artifacts below `managed/specs/**/artifacts/` use snake_case filenames.
- The ordered, location-aware rule configuration is `.tsdoc.config.json#specGovernance.naming`.
  It supports Pascal, camel, snake, and kebab styles; source-path matching explicitly declares whether
  casing is sensitive, and each symbol rule can constrain kind, export status, acronym behavior, and
  leading underscores.

The P4.2 `NamingConventionEvaluator` evaluates this typed policy deterministically against canonical
graph nodes and configured workspace files. Convention check/report/gate wiring consumes the same
report, so authors change the config rather than duplicating naming rules in individual specs.

New `managed/specs/` filename rules are error-severity from their first use. Existing source-symbol
rules begin as warnings so the current corpus can be migrated with observed findings; promote a rule
to error only after its location has an explicit migration proof.

The P4.4 extraction syntax is versioned by `ManagedSpecExtractor@1.0.0`. Its explicit declaration
can contain `requirements`, `edges`, and `bindings`; duplicate IDs, malformed selectors, and source
provenance errors fail the compiled projection rather than selecting an alternate source.

## Initial layout

```text
managed/specs/
  index.md
  <area>/
    <spec-name>.md
    artifacts/
      <machine_readable_artifact>.json
```

## Related

- [[Semantic Graph Spec Governance Roadmap]]
- [[Semantic Graph Analysis and Relationship Model]]
- [[Spec Management System]]
- [[Convention Pack Check]]
