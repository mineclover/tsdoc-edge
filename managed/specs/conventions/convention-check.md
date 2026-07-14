---
title: Convention Check
type: project-spec
status: active
source: src/convention/ConventionCheckService.ts
tags:
  - convention
  - governance
---

# [[ConventionCheck]]

The convention check is the managed-spec P4.4 vertical slice. Its executable projection is derived
only from this document's explicit declaration block; prose never creates a requirement or binding.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-MANAGED-CONVENTION-CHECK",
      "title": "Managed convention specifications compile deterministically",
      "tags": ["p4", "managed-spec"]
    },
    {
      "id": "REQ-CANONICAL-PROJECT-INDEXER",
      "title": "ProjectIndexer must remain in the canonical graph",
      "tags": ["implementation", "canonical-graph"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-MANAGED-CONVENTION-CHECK"
    },
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-CANONICAL-PROJECT-INDEXER"
    }
  ],
  "bindings": [
    {
      "id": "BIND-MANAGED-CONVENTION-CHECK",
      "kind": "implementation",
      "specNodeId": "REQ-MANAGED-CONVENTION-CHECK",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "canonicalNodeId": "src/spec-graph/ManagedSpecExtractor.ts#extractManagedSpecGraph:function"
      }
    },
    {
      "id": "BIND-CANONICAL-PROJECT-INDEXER",
      "kind": "implementation",
      "specNodeId": "REQ-CANONICAL-PROJECT-INDEXER",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/indexer/ProjectIndexer.ts#ProjectIndexer:class"
      }
    }
  ]
}
```

## Related

- [[Convention Pack Check]]
- [[Semantic Graph Spec Governance Roadmap]]
