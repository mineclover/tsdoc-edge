---
title: Complete Mermaid Entrypoint Workflow
type: architecture-diagram
category: workflow
status: active
created-at: 2025-11-08
---

# Complete Mermaid Entrypoint Workflow

> **Visual representation of the entire .mmd → explore → promote → validate cycle**

> **Historical examples**: Coverage percentages and relationship counts in this document are
> workflow examples, not current baselines. Use [[Coverage Metrics Contract]] for current metric
> definitions and evidence rules.

```mermaid
graph TB
    subgraph "Phase 1: Design & Planning"
        A1[📝 Create .mmd Diagram<br/>Mermaid Syntax]
        A2[Define Nodes<br/>CD, IO, PIPE, etc.]
        A3[Define Relationships<br/>-->, -.->]
        A4[Add Metadata<br/>Status, Metrics]
    end

    subgraph "Phase 2: Document Generation"
        B1[🔧 parse-mermaid<br/>Extract Symbols]
        B2[Generate H2 References<br/>canonical: false]
        B3[Auto-generate Sections<br/>Purpose, Implementation, etc.]
        B4[Check Existing Docs<br/>Prevent Overwrites]
    end

    subgraph "Phase 3: Exploration"
        C1[🔍 explore-entrypoint<br/>BFS Traversal]
        C2[Extract [[Symbol]] Refs<br/>From .mmd and .md]
        C3[Follow Code Refs<br/>src/analyzer/Foo.ts:123]
        C4[Calculate Coverage<br/>Symbols & Files]
    end

    subgraph "Phase 4: Orphan Detection"
        D1[🚨 --detect-orphans<br/>Compare DB vs Discovered]
        D2[List Orphaned Files<br/>Not Reachable]
        D3[List Orphaned Symbols<br/>1,295 symbols]
        D4{Decision}
        D5[Add to Entrypoint<br/>Update .mmd]
        D6[Archive<br/>managed/archive/]
        D7[Delete<br/>rm src/legacy/]
    end

    subgraph "Phase 5: Promotion"
        E1[✨ promote-symbol<br/>H2 → H1]
        E2[Extract H2 Section<br/>## [[Symbol]]]
        E3[Create Canonical File<br/>symbol.md]
        E4[Update Frontmatter<br/>canonical: true]
        E5[Replace with Reference<br/>See [[Symbol]] for...]
    end

    subgraph "Phase 6: Validation"
        F1[✅ validate-symbol-refs<br/>Check Consistency]
        F2[Find Duplicates<br/>Multiple H1s?]
        F3[Check References<br/>All [[]] Resolved?]
        F4[Generate Report<br/>127 refs, 0 errors]
    end

    subgraph "Phase 7: Work Context"
        G1[💼 work-context<br/>Before Editing]
        G2[Show Dependencies<br/>What this uses]
        G3[Show Usages<br/>What uses this]
        G4[Show Tests<br/>Test coverage]
        G5[Show Docs<br/>Related [[Symbol]]]
    end

    %% Flow connections
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> B1

    B1 --> B2
    B2 --> B3
    B3 --> B4
    B4 --> C1

    C1 --> C2
    C2 --> C3
    C3 --> C4
    C4 --> D1

    D1 --> D2
    D2 --> D3
    D3 --> D4
    D4 -->|Keep| D5
    D4 -->|Legacy| D6
    D4 -->|Unused| D7
    D5 --> C1
    D6 --> C1
    D7 --> C1

    C4 -->|High Coverage| E1
    E1 --> E2
    E2 --> E3
    E3 --> E4
    E4 --> E5
    E5 --> F1

    F1 --> F2
    F2 --> F3
    F3 --> F4
    F4 --> G1

    G1 --> G2
    G2 --> G3
    G3 --> G4
    G4 --> G5

    %% Styling
    classDef design fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef generate fill:#fff9c4,stroke:#f57c00,stroke-width:2px
    classDef explore fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    classDef orphan fill:#ffccbc,stroke:#d84315,stroke-width:2px
    classDef promote fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef validate fill:#b2dfdb,stroke:#00796b,stroke-width:2px
    classDef work fill:#bbdefb,stroke:#0277bd,stroke-width:2px

    class A1,A2,A3,A4 design
    class B1,B2,B3,B4 generate
    class C1,C2,C3,C4 explore
    class D1,D2,D3,D4,D5,D6,D7 orphan
    class E1,E2,E3,E4,E5 promote
    class F1,F2,F3,F4 validate
    class G1,G2,G3,G4,G5 work
```

## Command Mapping

| Phase | Command | Input | Output |
|-------|---------|-------|--------|
| 1 | Manual | Editor | `.mmd` file |
| 2 | `parse-mermaid <file.mmd> --generate-docs` | `.mmd` | H2 reference docs |
| 3 | `explore-entrypoint <file.mmd>` | `.mmd` or `.md` | Coverage stats |
| 4 | `explore-entrypoint <file> --detect-orphans` | Entrypoint | Orphan list |
| 5 | `promote-symbol <file.md> "Symbol"` | H2 section | H1 canonical file |
| 6 | `validate-symbol-refs <dir>` | Directory | Validation report |
| 7 | `work-context <file-path>` | Source file | Integrated context |

## Metrics Example

**Before** (Initial State):
```
Parse Mermaid:
  Symbols Extracted: 96
  Documents Generated: 86

Explore Entrypoint:
  Symbol Coverage: 14.3% (216 / 1,511)
  File Coverage: 34.9% (44 / 126)

Orphan Detection:
  Orphaned Files: 89
  Orphaned Symbols: 1,295
```

**After** (Optimized):
```
Expanded Entrypoint:
  Nodes Added: +45
  Relationships Added: +12

Explore Entrypoint:
  Symbol Coverage: 95.1% (1,437 / 1,511) ⬆️
  File Coverage: 92.3% (116 / 126) ⬆️

Orphan Detection:
  Orphaned Files: 7 ⬇️
  Orphaned Symbols: 74 ⬇️

Promoted Symbols:
  H1 Canonical: 17
  H2 References: 79
```

## Related Documentation

- [[Mermaid Entrypoint Workflow]]: Complete guide
- [[Example - Mermaid Workflow]]: Real-world usage
- [[Commands Index]]: All CLI commands
- [[Work Context Workflow]]: Primary use case

---

**Created**: 2025-11-08
**Purpose**: Visual representation of complete .mmd-based workflow
**Improvement**: 14.3% → 95.1% symbol coverage (6.6x improvement)
