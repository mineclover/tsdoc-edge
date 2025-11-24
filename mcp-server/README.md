# TSDoc Edge MCP Server

**Model Context Protocol** 서버로 TSDoc Edge의 코드베이스 지식 그래프를 LLM에 제공합니다.

## 🚀 Quick Start

### 1. 데이터베이스 준비

```bash
# 프로젝트에서 TSDoc Edge 데이터베이스 생성
cd /path/to/your/project
tsdoc-edge init
tsdoc-edge build src
```

### 2. MCP 서버 빌드

```bash
cd mcp-server
npm install
npm run build
```

### 3. Claude Desktop에 연결

`claude_desktop_config.json` 파일에 추가:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

Claude Desktop을 재시작하면 7개의 tsdoc 도구를 사용할 수 있습니다! 🎉

## 🛠️ Available Tools

### 1. **tsdoc_search_symbols** - 심볼 검색
클래스, 함수, 인터페이스 등 코드 심볼을 검색합니다.

**Claude에서 이렇게 사용:**
> "DatabaseManager 클래스를 찾아줘"
>
> "test로 끝나는 모든 함수 찾아줘"

**Parameters:**
- `query` (string, required): Search query for symbol names
- `type` (optional): Filter by symbol type (class, function, method, etc.)
- `limit` (number, default: 50): Maximum results to return
- `offset` (number, default: 0): Pagination offset
- `format` (markdown|json, default: markdown): Response format

**Example:**
```json
{
  "query": "AnalyzeAllCommand",
  "type": "class",
  "limit": 5
}
```

---

### 2. **tsdoc_get_ontology_stats** - 그래프 통계
코드베이스 지식 그래프의 전체 통계를 조회합니다.

**Claude에서 이렇게 사용:**
> "이 코드베이스의 복잡도를 분석해줘"
>
> "어떤 타입의 심볼이 가장 많아?"

**Parameters:**
- `detailed` (boolean, default: false): Include detailed breakdown
- `format` (markdown|json, default: markdown): Response format

**Example Output (TSDoc Edge itself):**
```
Total Nodes: 5,074
Total Relationships: 20,169
Graph Density: 3.97 relationships/node
Average Degree: 7.11

Top Node Types:
  test-case:    1,946
  method:       1,619
  test-suite:     581
  interface:      287
  class:          211
```

---

### 3. **tsdoc_list_relationships** - 관계 목록
특정 타입이나 카테고리의 관계들을 나열합니다.

**Claude에서 이렇게 사용:**
> "테스트 커버리지 관계를 10개 보여줘"
>
> "structural 카테고리의 strong 관계 찾아줘"

**Parameters:**
- `type` (optional): Filter by relationship type
- `category` (optional): Filter by category (structural, data-flow, etc.)
- `strength` (optional): Filter by strength (strong, medium, weak)
- `from` (optional): Filter by source symbol ID
- `to` (optional): Filter by target symbol ID
- `limit` (number, default: 50): Maximum results
- `offset` (number, default: 0): Pagination offset
- `format` (markdown|json, default: markdown): Response format

**Common Relationship Types:**
1. `test-coverage` (5,293) - Tests covering code
2. `test-as-example` (3,538) - Tests as usage examples
3. `code-dependency` (3,140) - Code dependencies
4. `naming-pattern-relation` (2,032) - Naming patterns
5. `doc-reference` (655) - Documentation references

**Example:**
```json
{
  "type": "test-coverage",
  "category": "testing",
  "limit": 10
}
```

---

### 4. **tsdoc_get_work_context** - 작업 컨텍스트
파일 수정 전 필요한 모든 컨텍스트를 제공합니다.

**Claude에서 이렇게 사용:**
> "src/commands/AnalyzeAllCommand.ts 수정하려고 하는데 영향 범위 알려줘"
>
> "DatabaseManager.ts의 의존성 보여줘"

**Parameters:**
- `filePath` (string, required): Relative or absolute path to the file
- `depth` (number, 1-5, default: 2): Context aggregation depth
- `format` (markdown|json, default: markdown): Response format

**Returns:**
- All symbols in the file
- Relationships (dependencies, tests, documentation)
- Files that depend on this file
- Files this file depends on
- Related tests
- Related documentation

**Example:**
```json
{
  "filePath": "src/commands/AnalyzeAllCommand.ts",
  "depth": 2
}
```

---

### 5. **tsdoc_get_design_context** - 설계 컨텍스트
설계 의사결정, 계약, 에러 패턴을 조회합니다.

**Claude에서 이렇게 사용:**
> "CommandRegistry는 왜 이렇게 설계됐어?"
>
> "BaseCommand의 계약(contract) 알려줘"

**Parameters:**
- `filePath` (string, required): Relative or absolute path to the file
- `format` (markdown|json, default: markdown): Response format

**Returns:**
- `@decision` tags: Design decisions and rationale
- `@contract` tags: Class/method contracts
- `@errorPattern` tags: Error handling patterns
- `@alternative` tags: Alternatives considered

---

### 6. **tsdoc_query_relationships** - 관계 쿼리
특정 심볼의 관계를 깊이 우선으로 탐색합니다.

**Claude에서 이렇게 사용:**
> "DatabaseManager가 무엇에 의존해?"
>
> "어떤 클래스들이 BaseCommand를 사용해?"

**Parameters:**
- `symbolId` (string, required): Symbol ID to query
- `direction` (incoming|outgoing|both, default: both): Direction of relationships
- `maxDepth` (number, 1-3, default: 1): Maximum traversal depth
- `format` (markdown|json, default: markdown): Response format

**Top 10 Most Connected Symbols:**
1. DatabaseManager (391 relationships)
2. SymbolRegistryManager (334 relationships)
3. UsageTracker (289 relationships)
4. SymbolGraphBuilder (239 relationships)
5. ConfigManager (236 relationships)

**Example:**
```json
{
  "symbolId": "class-analyzeallcommand",
  "direction": "both",
  "maxDepth": 2
}
```

---

### 7. **tsdoc_get_symbol_details** - 심볼 상세
심볼의 모든 정보를 조회합니다.

**Claude에서 이렇게 사용:**
> "class-analyzeallcommand 심볼의 상세 정보"
>
> "DatabaseManager의 메서드와 관계 보여줘"

**Parameters:**
- `symbolId` (string, required): Symbol ID to retrieve
- `includeRelationships` (boolean, default: true): Include relationship info
- `format` (markdown|json, default: markdown): Response format

**Returns:**
- Basic information (name, type, file, location)
- TSDoc comments
- All tags (@param, @returns, @throws, etc.)
- Incoming/outgoing relationships
- Related documentation links

**Example:**
```json
{
  "symbolId": "class-analyzeallcommand",
  "includeRelationships": true
}
```

---

## 💡 사용 시나리오

### Scenario 1: 파일 수정 전 영향도 파악

```
User: "src/storage/DatabaseManager.ts를 수정하려고 합니다"

Claude:
1. tsdoc_get_work_context 호출
2. 의존성 체인 분석
3. 영향받을 테스트 파일 확인
4. 수정 시 주의사항 제공
```

### Scenario 2: 설계 이해

```
User: "명령어 시스템이 어떻게 설계되어 있나요?"

Claude:
1. tsdoc_search_symbols (query: "Command", type: "class")
2. tsdoc_get_symbol_details (BaseCommand)
3. tsdoc_get_design_context (CommandRegistry)
4. tsdoc_query_relationships (inheritance 추적)
→ 전체 아키텍처 설명
```

### Scenario 3: 리팩토링 계획

```
User: "UsageTracker를 리팩토링하려고 합니다"

Claude:
1. tsdoc_get_ontology_stats (현재 복잡도 파악)
2. tsdoc_query_relationships (UsageTracker, incoming, depth: 2)
3. tsdoc_list_relationships (type: "code-dependency")
→ 안전한 리팩토링 계획 제시
```

---

## 🧪 테스트

### 통합 테스트 실행

```bash
npm run build
node test-client.js
```

7개 도구 모두 자동으로 테스트합니다.

### 데이터베이스 탐색

```bash
node query-examples.js
```

실제 데이터베이스 내용과 예제 쿼리를 출력합니다.

### MCP Inspector로 수동 테스트

```bash
npm install -g @modelcontextprotocol/inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## 📊 성능 특징

### Direct Database Access (v1.0.0+)
- ✅ **빠른 쿼리**: subprocess 오버헤드 없음
- ✅ **낮은 메모리**: 단일 연결 재사용
- ✅ **안전성**: readonly 모드
- ✅ **신뢰성**: 직접 SQL 쿼리

### 실제 수치 (TSDoc Edge 자체)
- 5,074개 심볼 인덱싱
- 20,169개 관계 추적
- 평균 쿼리 응답 시간: <10ms
- 메모리 사용: ~50MB

---

## 🔧 Troubleshooting

### "Database not found" 에러

```bash
cd /your/project
tsdoc-edge init
tsdoc-edge build src
# .tsdoc/symbols.db 생성 확인
```

### Claude Desktop에서 도구가 안 보임

1. `claude_desktop_config.json` 경로가 **절대 경로**인지 확인
2. Claude Desktop 재시작
3. 로그 확인:
   - macOS: `~/Library/Logs/Claude/mcp*.log`
   - Windows: `%APPDATA%\Claude\Logs\mcp*.log`

### 빈 결과가 나옴

1. 심볼 ID는 **kebab-case** 사용 (`class-databasemanager`)
2. 파일 경로는 프로젝트 루트 기준 상대 경로
3. `node query-examples.js`로 실제 데이터 확인

---

## 🏗️ Architecture

```
Claude Desktop
    ↓ stdio (JSON-RPC)
MCP Server (Node.js)
    ↓ better-sqlite3
SQLite Database
    ↑ TSDoc Edge CLI
TypeScript Codebase
```

**Key Components:**
- `index.ts`: MCP server entry point, registers 7 tools
- `services/tsdocService.ts`: Direct database queries
- `tools/`: Tool implementations and formatting
- `schemas/`: Zod-based input validation

```
mcp-server/
├── src/
│   ├── index.ts           # MCP server initialization
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # Shared constants
│   ├── schemas/           # Zod validation schemas
│   │   └── index.ts
│   ├── services/          # Database access
│   │   └── tsdocService.ts
│   └── tools/             # MCP tool implementations
│       └── index.ts
├── dist/                  # Compiled JavaScript
├── test-client.js         # Integration test runner
├── query-examples.js      # Database exploration
├── TESTING.md             # Detailed testing guide
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎯 Best Practices

### For LLMs Using This Server

1. **Start Broad, Then Narrow**
   - `get_ontology_stats` → overview
   - `search_symbols` → find specific symbols
   - `get_symbol_details` → deep dive

2. **Use Work Context for File Changes**
   - Always call `get_work_context` before suggesting modifications
   - Check both incoming and outgoing relationships
   - Identify affected tests

3. **Understand Design Decisions**
   - Call `get_design_context` to understand "why"
   - Respect documented contracts
   - Follow established error patterns

### For Developers

1. **Keep Database Updated**
   - Run `tsdoc-edge build src` after major changes
   - Consider git hooks for automatic updates

2. **Document with TSDoc**
   - Use custom tags: @decision, @contract, @errorPattern
   - Link related concepts with `[[Symbol]]`
   - MCP server makes this accessible

---

## 📚 관련 문서

- **상세 가이드**: [TESTING.md](./TESTING.md) - 모든 도구의 상세 사용법
- **메인 README**: [../README.md](../README.md) - TSDoc Edge 전체 개요
- **워크플로우**: [../managed/workflows/](../managed/workflows/) - 작업 흐름 가이드
- **MCP 프로토콜**: https://modelcontextprotocol.io

---

## 🚀 Version History

### v1.0.0 (2025-11-23) - Production Ready
- ✅ Direct database access (replaced exec-based CLI calls)
- ✅ 7 production-ready tools
- ✅ Comprehensive error handling
- ✅ Full test coverage
- ✅ Performance optimized (<10ms avg query time)

---

## 📝 License

MIT License - TSDoc Edge Project

---

**Ready to explore your codebase? 🎉**

Claude Desktop에 연결하고 "이 프로젝트의 구조를 설명해줘" 라고 물어보세요!
