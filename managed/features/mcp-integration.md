---
title: MCP Integration
type: feature
category: features
status: active
canonical: true
source: mcp-server/src/index.ts
tags:
  - mcp
  - llm-context
  - canonical-graph
  - spec-graph
---

# [[MCP Integration]]

**Source**: `mcp-server/src/index.ts` · `mcp-server/src/services/tsdocService.ts`

Read-only Model Context Protocol (MCP) server exposing TSDoc Edge's 3-plane SSOT (`@ttsc/graph` canonical code graph, `managed/` `[[Checkpoint]]` documents & TSDoc domain enrichments, and `.tsdoc/spec-graph.db` normative `SpecGraph` bindings) to AI coding agents over `stdio`.

## 개요 (Purpose)

Provide AI coding assistants (Claude Code, Codex, Antigravity, Cursor) with deterministic, zero-mutation access to pre-edit work context, design contracts/ADRs, multi-hop canonical impact analysis, and normative `SpecGraph` conformance bindings without scraping raw CLI stdout.

## 7관점 모듈 명세 (7-Aspect Specification)

- **Input**: Zod-validated JSON-RPC tool arguments over MCP `stdio` transport (`mcp-server/src/schemas/`), plus `TSDOC_WORKSPACE` workspace root path.
- **Output**: Structured JSON payloads wrapped in MCP `CallToolResult` content blocks with `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`.
- **Context**: Reads `.tsdoc/canonical-graph.db` (`GraphRepository` active revision), `.tsdoc/spec-graph.db` (`SpecGraphRepository` active revision), `.tsdoc.db` (`DatabaseManager` enrichment/doc database), and `managed/` checkpoints.
- **Logic**: `TsDocService` (`mcp-server/src/services/tsdocService.ts`) opens read-only SQLite handles, resolves canonical `@ttsc/graph` nodes/edges and `SpecGraph` bindings first with enrichment fallback, and caches invariant relationship projections in memory for sub-millisecond repeated queries.
- **Effect**: Strictly read-only (`readonly: true` SQLite connections; never mutates workspace files or databases).
- **Scope**: 9 registered MCP tools across symbol discovery, pre-edit context, impact traversal, and normative specification governance.

## 9대 MCP 도구 카탈로그 (Exposed Tools)

| Tool Name | Primary Data Plane | Purpose |
| --- | --- | --- |
| `tsdoc_search_symbols` | `@ttsc/graph` + Enrichment DB | Search classes, functions, interfaces, methods, and types with kind/file filters |
| `tsdoc_get_symbol_details` | `@ttsc/graph` + Enrichment DB | Inspect full TSDoc signature, `@contract`, `@decision`, and `@doc [[Checkpoint]]` links for one symbol |
| `tsdoc_get_work_context` | Composed 3-Plane | Pre-edit file context: module overview, related `managed/` docs, dependencies, tests, and downstream dependents |
| `tsdoc_get_design_context` | Enrichment + `SpecGraph` | Normative spec bindings, `@contract`/`@invariant`, inline ADR triad (`@decision`/`@rationale`/`@consequences`), and error patterns |
| `tsdoc_get_impact` | `@ttsc/graph` Canonical Graph | Multi-hop upstream/downstream change impact analysis across canonical compiler edges |
| `tsdoc_get_spec_bindings` | `.tsdoc/spec-graph.db` | Query authored `tsdoc-spec` requirement nodes and exact `CanonicalNodeId` implementation bindings |
| `tsdoc_query_relationships` | `@ttsc/graph` + Unified Ontology | Depth-bounded incoming/outgoing relationship traversal for a target symbol |
| `tsdoc_list_relationships` | `@ttsc/graph` + Unified Ontology | Paginated relationship listing filtered by relationship kind or file scope |
| `tsdoc_get_ontology_stats` | `@ttsc/graph` + Unified Ontology | Aggregate node, canonical edge, and relationship-category distribution metrics |

## 실행 및 검증 (Execution & Verification)

```bash
# 1. 워크스페이스 3계층 SSOT 동기화
tsdoc-edge sync

# 2. MCP 서버 빌드 및 실행
cd mcp-server && npm run build
node dist/index.js

# 3. 서비스 계층(9/9) 및 상세 시나리오(13/13) 검증
cd mcp-server && node basic-test.js && node detailed-test.js
```

## 관련 문서 (Related Concepts)

- [[MCP Testing Strategy]]
- [[TsdocEdgePlatformSpecification]]
- [[LspAndCoverageSurfaceSpecification]]
- [[WorkContextCommand]]
- [[DesignContextCommand]]
- [[RelationshipImpactCommand]]
- [[AuthoredProjectSpecifications]]

---

## Backlinks

### Referenced By

- [[DesignContextCommand]] → managed/commands/DesignContextCommand.md:29
- [[MCP Testing Strategy]] → managed/features/mcp-testing-strategy.md:22
- [[LspAndCoverageSurfaceSpecification]] → managed/specs/domains/lsp-and-coverage-surface-spec.md:270
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:206
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:42

### Implemented By

- MCP Integration → mcp-server/src/index.ts:1

