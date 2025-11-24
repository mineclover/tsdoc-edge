# TSDoc Edge MCP Server - Testing & Usage Guide

## Overview

TSDoc Edge MCP Server는 7개의 도구를 제공하여 코드베이스의 지식 그래프에 LLM이 접근할 수 있도록 합니다.

## Quick Start

### 1. Prerequisites

```bash
# 부모 프로젝트에서 데이터베이스 빌드
cd /path/to/your/project
tsdoc-edge init
tsdoc-edge build src
```

### 2. Server Setup

```bash
# MCP 서버 디렉토리에서
cd mcp-server
npm install
npm run build
```

### 3. Claude Desktop Integration

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) 또는
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)에 추가:

```json
{
  "mcpServers": {
    "tsdoc-edge": {
      "command": "node",
      "args": ["/absolute/path/to/tsdoc-edge/mcp-server/dist/index.js"],
      "env": {
        "TSDOC_WORKSPACE": "/absolute/path/to/your/project"
      }
    }
  }
}
```

## Available Tools

### 1. tsdoc_search_symbols

코드베이스에서 심볼(클래스, 함수, 메서드 등)을 검색합니다.

**Parameters:**
- `query` (string, required): 검색할 심볼 이름
- `type` (string, optional): 심볼 타입으로 필터링 (function, class, interface, etc.)
- `limit` (number, default: 50): 최대 결과 개수
- `offset` (number, default: 0): 페이지네이션 오프셋
- `format` (string, default: "markdown"): 출력 형식 (markdown | json)

**Example Query:**
```
"Search for symbols named 'DatabaseManager'"

Tool: tsdoc_search_symbols
Input: {
  "query": "DatabaseManager",
  "type": "class",
  "limit": 10
}
```

**Use Cases:**
- 특정 클래스나 함수 찾기
- 비슷한 이름의 심볼들 탐색
- 코드베이스 구조 파악

---

### 2. tsdoc_get_ontology_stats

코드베이스 지식 그래프의 전체 통계를 조회합니다.

**Parameters:**
- `detailed` (boolean, default: false): 상세한 분류 정보 포함
- `format` (string, default: "markdown"): 출력 형식

**Example Query:**
```
"Show me the overall statistics of the codebase knowledge graph"

Tool: tsdoc_get_ontology_stats
Input: {
  "detailed": true
}
```

**What You Get:**
- 총 노드 수와 관계 수
- 그래프 밀도와 평균 차수
- 노드 타입별 분포
- 관계 타입별 분포
- 카테고리, 강도, 방향성 통계

**Use Cases:**
- 코드베이스 건강도 파악
- 의존성 복잡도 이해
- 리팩토링 우선순위 결정

---

### 3. tsdoc_list_relationships

심볼 간 관계를 필터링하고 나열합니다.

**Parameters:**
- `type` (string, optional): 관계 타입으로 필터 (imports, extends, implements, etc.)
- `category` (string, optional): 카테고리로 필터 (structural, data-flow, behavioral, etc.)
- `strength` (string, optional): 강도로 필터 (strong, medium, weak)
- `from` (string, optional): 출발 심볼 ID로 필터
- `to` (string, optional): 도착 심볼 ID로 필터
- `limit` (number, default: 50): 최대 결과 개수
- `offset` (number, default: 0): 페이지네이션 오프셋
- `format` (string, default: "markdown"): 출력 형식

**Example Queries:**

1. "Show me all import relationships"
```json
{
  "type": "imports",
  "limit": 20
}
```

2. "List strong structural relationships"
```json
{
  "category": "structural",
  "strength": "strong",
  "limit": 30
}
```

3. "What does DatabaseManager depend on?"
```json
{
  "from": "database-manager",
  "limit": 50
}
```

**Use Cases:**
- 의존성 분석
- 영향도 평가
- 순환 참조 탐지

---

### 4. tsdoc_get_work_context

파일 작업 전 필요한 전체 컨텍스트를 제공합니다.

**Parameters:**
- `filePath` (string, required): 파일 경로 (절대 또는 상대)
- `depth` (number, default: 2): 컨텍스트 수집 깊이 (1-5)
- `format` (string, default: "markdown"): 출력 형식

**Example Query:**
```
"I'm about to edit src/storage/DatabaseManager.ts, give me the work context"

Tool: tsdoc_get_work_context
Input: {
  "filePath": "src/storage/DatabaseManager.ts",
  "depth": 2
}
```

**What You Get:**
- 파일의 모든 심볼 목록
- 각 심볼의 관계 (imports, exports, extends, implements)
- 의존하는 파일들
- 이 파일에 의존하는 파일들
- 관련 테스트 파일
- 관련 문서

**Use Cases:**
- 파일 수정 전 컨텍스트 파악
- 영향 범위 분석
- 리팩토링 계획

---

### 5. tsdoc_get_design_context

설계 의사결정, 계약, 에러 패턴을 조회합니다.

**Parameters:**
- `filePath` (string, required): 파일 경로
- `format` (string, default: "markdown"): 출력 형식

**Example Query:**
```
"What design decisions were made in the CommandRegistry?"

Tool: tsdoc_get_design_context
Input: {
  "filePath": "src/commands/CommandRegistry.ts"
}
```

**What You Get:**
- @decision 태그로 표시된 설계 결정
- @contract 태그로 정의된 계약
- @errorPattern 태그로 문서화된 에러 처리
- @alternative 태그로 기록된 대안
- 각 심볼의 설계 문서

**Use Cases:**
- 설계 의도 파악
- 아키텍처 결정 이해
- 에러 처리 패턴 학습

---

### 6. tsdoc_query_relationships

특정 심볼의 관계를 깊이 우선으로 탐색합니다.

**Parameters:**
- `symbolId` (string, required): 심볼 ID
- `direction` (string, default: "both"): 관계 방향 (incoming | outgoing | both)
- `maxDepth` (number, default: 1): 최대 탐색 깊이 (1-3)
- `format` (string, default: "markdown"): 출력 형식

**Example Queries:**

1. "Show all relationships for DatabaseManager"
```json
{
  "symbolId": "database-manager",
  "direction": "both",
  "maxDepth": 2
}
```

2. "What depends on SymbolGraph? (incoming only)"
```json
{
  "symbolId": "symbol-graph",
  "direction": "incoming",
  "maxDepth": 1
}
```

**Use Cases:**
- 심볼 영향도 분석
- 의존성 체인 추적
- 순환 참조 탐지

---

### 7. tsdoc_get_symbol_details

심볼의 상세 정보를 조회합니다.

**Parameters:**
- `symbolId` (string, required): 심볼 ID
- `includeRelationships` (boolean, default: true): 관계 정보 포함 여부
- `format` (string, default: "markdown"): 출력 형식

**Example Query:**
```
"Give me detailed information about the DatabaseManager class"

Tool: tsdoc_get_symbol_details
Input: {
  "symbolId": "database-manager",
  "includeRelationships": true
}
```

**What You Get:**
- 심볼의 기본 정보 (이름, 타입, 파일 경로, 위치)
- TSDoc 주석
- 모든 태그 (@param, @returns, @throws, etc.)
- 들어오는/나가는 관계
- 관련 문서 링크

**Use Cases:**
- API 문서 조회
- 사용 예제 찾기
- 계약 확인

---

## Testing Workflow

### Manual Testing with MCP Inspector

```bash
# MCP Inspector 설치
npm install -g @modelcontextprotocol/inspector

# 서버 실행
cd mcp-server
npx @modelcontextprotocol/inspector node dist/index.js
```

### Integration Testing

실제 프로젝트에서 테스트:

```bash
# 1. TSDoc Edge 데이터베이스 빌드
cd /path/to/tsdoc-edge
npm run build
npx ts-node src/cli.ts build src

# 2. MCP 서버 빌드
cd mcp-server
npm run build

# 3. 서버 시작 (Claude Desktop에서 자동으로 시작됨)
# 또는 수동 테스트:
TSDOC_WORKSPACE=/path/to/tsdoc-edge node dist/index.js
```

### Common Test Scenarios

#### Scenario 1: 파일 수정 전 컨텍스트 파악

```
User: "I need to modify src/commands/WorkContextCommand.ts"
Assistant uses: tsdoc_get_work_context
→ Shows all dependencies, relationships, and related files
```

#### Scenario 2: 아키텍처 이해

```
User: "Explain the ontology modeling system"
Assistant uses:
1. tsdoc_search_symbols (query: "ontology")
2. tsdoc_get_symbol_details (for key classes)
3. tsdoc_query_relationships (to see connections)
→ Builds comprehensive understanding
```

#### Scenario 3: 영향도 분석

```
User: "What would break if I change DatabaseManager?"
Assistant uses:
1. tsdoc_get_symbol_details (for DatabaseManager)
2. tsdoc_query_relationships (direction: "incoming", maxDepth: 3)
→ Shows complete dependency chain
```

#### Scenario 4: 코드베이스 건강도

```
User: "How complex is this codebase?"
Assistant uses: tsdoc_get_ontology_stats (detailed: true)
→ Shows graph density, relationship distribution, potential issues
```

---

## Troubleshooting

### Error: "TSDoc Edge database not found"

**Solution:**
1. 프로젝트 루트에서 `tsdoc-edge init` 실행
2. `tsdoc-edge build src` 실행
3. `.tsdoc/symbols.db` 파일 생성 확인

### Error: "Cannot find module '@modelcontextprotocol/sdk'"

**Solution:**
```bash
cd mcp-server
npm install
```

### Server doesn't start in Claude Desktop

**Solution:**
1. `claude_desktop_config.json`에서 절대 경로 사용 확인
2. 로그 확인: `~/Library/Logs/Claude/mcp*.log` (macOS)
3. 수동으로 서버 실행해서 에러 확인:
   ```bash
   TSDOC_WORKSPACE=/path/to/project node /path/to/mcp-server/dist/index.js
   ```

### Results are empty or incomplete

**Solution:**
1. 데이터베이스 재빌드: `tsdoc-edge build src --force`
2. 심볼 ID가 정확한지 확인 (kebab-case)
3. 파일 경로가 정확한지 확인 (프로젝트 루트 기준 상대 경로)

---

## Performance Considerations

- **Direct DB Access**: 모든 쿼리는 SQLite에 직접 접근하여 빠른 응답 제공
- **Readonly Mode**: 데이터베이스는 readonly 모드로 열려 안전성 보장
- **Connection Pooling**: 단일 연결 재사용으로 오버헤드 최소화
- **Lazy Loading**: 데이터베이스는 첫 쿼리 시점에 로드

---

## Best Practices

### For LLMs Using This Server

1. **Start Broad, Then Narrow**
   - `tsdoc_get_ontology_stats` → overview
   - `tsdoc_search_symbols` → find specific symbols
   - `tsdoc_get_symbol_details` → deep dive

2. **Use Work Context for File Changes**
   - Always call `tsdoc_get_work_context` before suggesting file modifications
   - Check both incoming and outgoing relationships
   - Identify affected tests

3. **Understand Design Decisions**
   - Call `tsdoc_get_design_context` to understand "why"
   - Respect documented contracts
   - Follow established error patterns

4. **Trace Dependencies**
   - Use `tsdoc_query_relationships` for impact analysis
   - Set appropriate `maxDepth` (1 for direct, 2-3 for chains)
   - Check both directions when relevant

### For Developers

1. **Keep Database Updated**
   - Run `tsdoc-edge build src` after major changes
   - Consider git hooks for automatic updates

2. **Document with TSDoc**
   - Use custom tags: @decision, @contract, @errorPattern
   - Link related concepts with `[[Symbol]]`
   - MCP server makes this documentation accessible

3. **Monitor Graph Health**
   - Regularly check ontology stats
   - High density (>10) may indicate tight coupling
   - Balanced relationship distribution is healthy

---

## Advanced Usage

### Custom Tool Combinations

**Example: Full Impact Analysis**
```javascript
async function analyzeImpact(symbolId) {
  // 1. Get symbol details
  const details = await tsdoc_get_symbol_details({ symbolId });

  // 2. Get incoming dependencies (what uses it)
  const incoming = await tsdoc_query_relationships({
    symbolId,
    direction: 'incoming',
    maxDepth: 2
  });

  // 3. Get design context
  const design = await tsdoc_get_design_context({
    filePath: details.filePath
  });

  return { details, incoming, design };
}
```

### Filtering Strategies

**Find All Test Dependencies:**
```json
{
  "tool": "tsdoc_list_relationships",
  "params": {
    "category": "testing",
    "limit": 100
  }
}
```

**Find Circular Dependencies:**
```json
{
  "tool": "tsdoc_query_relationships",
  "params": {
    "symbolId": "suspect-module",
    "direction": "both",
    "maxDepth": 3
  }
}
// Analyze results for cycles
```

---

## Architecture Overview

```
MCP Client (Claude Desktop)
    ↓ stdio (JSON-RPC)
MCP Server (tsdoc-edge-mcp)
    ↓ direct SQL queries
SQLite Database (.tsdoc/symbols.db)
    ↑ built by
TSDoc Edge CLI (tsdoc-edge build)
    ↑ analyzes
TypeScript Codebase
```

**Key Benefits:**
- No subprocess overhead
- Fast query responses
- Type-safe validation (Zod)
- Comprehensive error handling
- Read-only safety

---

## Related Documentation

- Main README: `../README.md`
- Work Context Workflow: `../managed/workflows/work-context-workflow.md`
- Command Reference: `../managed/features/`
- MCP Protocol: https://modelcontextprotocol.io

---

## Version History

- **v1.0.0** (2025-11-23): Direct database access refactoring
  - Replaced exec-based CLI calls with SQLite queries
  - Improved performance and reliability
  - 7 production-ready tools
