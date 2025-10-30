# 자동 인사이트 스캔 기능 - 실현 가능성 검토

## 목표

진입점 기준 특정 depth까지의 심볼들을 탐색하여:
- TSDoc 자동 읽기
- 참조 위치와 요약 자동 생성
- 통합적인 인사이트 문서 생성

예: `tsdoc-edge scan --entry=TSDocEdge --depth=2 --output=docs/INSIGHTS.md`

---

## 현재 인프라 분석

### ✅ 이미 구현된 것들

1. **심볼 그래프 구축** (`SymbolGraphBuilder`)
   - 의존성 추적: `getDependencies(symbolId)` → 직접 의존하는 심볼들
   - 역방향 추적: `getDependents(symbolId)` → 이 심볼을 사용하는 심볼들
   - 관계 타입: depends-on, used-by, implements, extends

2. **데이터 영속화** (`DatabaseManager`)
   - 심볼 정보 저장 (id, name, type, filePath, line, summary)
   - TSDoc 메타데이터 저장 (contract, responsibility, tests)
   - 빠른 쿼리 지원

3. **TSDoc 파싱** (`TSDocParser`)
   - 표준 TSDoc + 커스텀 태그 파싱
   - @responsibility, @contract, @testScenario 등 추출

4. **마크다운 생성** (`EnhancedMarkdownGenerator`)
   - 구조화된 문서 생성
   - 계약, 책임, 테스트 정보 포함

5. **진입점 탐색 기초** (`core-api` 명령어)
   - exported 심볼 필터링
   - 1 depth 의존성 수집
   - 타입별 그룹화 및 출력

### 🔨 추가 구현 필요

1. **Configurable Depth 탐색**
   ```typescript
   function collectSymbolsByDepth(
     entryPoints: string[],  // 진입점 심볼 ID 배열
     maxDepth: number,        // 최대 탐색 깊이
     direction: 'dependencies' | 'dependents' | 'both'
   ): Map<number, Symbol[]>
   ```
   - BFS 기반 레벨별 탐색
   - 방문 기록으로 순환 방지
   - depth별로 심볼 그룹화

2. **진입점 지정 인터페이스**
   ```typescript
   interface ScanOptions {
     entry?: string | string[];  // 심볼 ID, 이름, 또는 'exported' (기본값)
     depth?: number;              // 1-5 (기본값: 2)
     direction?: 'deps' | 'users' | 'both';  // 기본값: 'deps'
     output?: string;             // 출력 파일 경로
     format?: 'markdown' | 'json'; // 기본값: 'markdown'
   }
   ```

3. **계층적 문서 생성기** (`InsightDocGenerator`)
   ```typescript
   class InsightDocGenerator {
     generateHierarchical(
       symbolsByDepth: Map<number, Symbol[]>,
       options: ScanOptions
     ): string
   }
   ```
   - Depth별 섹션 구성
   - 각 심볼의 요약, 위치, 관계 포함
   - 링크로 연결된 내비게이션

---

## 구현 계획

### Phase 1: Depth 탐색 엔진 (30분)
- `DepthTraverser` 클래스 구현
- BFS 기반 레벨별 수집
- 단위 테스트 작성

### Phase 2: CLI 명령어 추가 (20분)
- `tsdoc-edge scan` 명령어
- 옵션 파싱: --entry, --depth, --direction, --output
- 기존 `printCoreApi` 로직 활용

### Phase 3: 문서 생성기 (30분)
- `InsightDocGenerator` 구현
- 템플릿 기반 마크다운 생성
- 계층적 구조 표현

### Phase 4: 통합 및 테스트 (20분)
- End-to-end 테스트
- 실제 프로젝트에서 검증
- 문서 품질 개선

**총 예상 시간: 1.5-2시간**

---

## 예상 출력 예시

```markdown
# TSDoc Edge Insights

> Entry Point: TSDocEdge (src/index.ts:78)
> Depth: 2
> Generated: 2025-10-30

## Level 0: Entry Points

### TSDocEdge (class)
**Location:** `src/index.ts:78`
**Summary:** Main entry point for TSDoc Edge

**Dependencies (3):**
- TSDocParser
- ConventionValidator
- MarkdownGenerator

---

## Level 1: Direct Dependencies

### TSDocParser (class)
**Location:** `src/parser/TSDocParser.ts:15`
**Summary:** TypeScript 소스 코드에서 TSDoc 주석을 파싱합니다.

**Responsibility:** Parse TSDoc comments from TypeScript source code
**Contract:** Extract all TSDoc tags including custom tags

**Dependencies (2):**
- TSDocConfiguration
- CommentParser

### ConventionValidator (class)
**Location:** `src/validator/ConventionValidator.ts:20`
**Summary:** 파싱된 주석이 프로젝트 컨벤션을 준수하는지 검증합니다.

**Dependencies (1):**
- ValidationRule

---

## Level 2: Indirect Dependencies

### TSDocConfiguration (interface)
**Location:** `src/types/config/config.ts:10`
**Summary:** Configuration for TSDoc parsing

### CommentParser (class)
**Location:** `src/parser/CommentParser.ts:25`
**Summary:** Low-level comment parsing utilities
```

---

## 기술적 고려사항

### 1. 성능
- **대규모 프로젝트**: 1000+ 심볼, depth 3
- **예상 성능**: 심볼 그래프는 이미 메모리에 있으므로 빠름 (< 1초)
- **최적화**: 방문 기록으로 중복 방지

### 2. 순환 의존성
- 이미 탐지 가능 (`ConnectivityValidator`)
- Depth 탐색에서도 방문 기록으로 처리

### 3. 진입점 해석
- ID로 지정: `001`, `002`
- 이름으로 지정: `TSDocEdge`, `SymbolGraphBuilder`
- 특수 키워드: `exported` (모든 exported 심볼)

### 4. 방향성
- `dependencies`: 이 심볼이 의존하는 것들 (기본값)
- `dependents`: 이 심볼을 사용하는 것들
- `both`: 양방향 (더 넓은 컨텍스트)

---

## 결론

✅ **실현 가능: 높음 (90%)**

**이유:**
1. 핵심 인프라 이미 구축됨 (그래프, DB, 파싱, 생성)
2. `core-api`로 프로토타입 검증됨
3. 필요한 추가 구현이 명확하고 단순함
4. 예상 개발 시간: 1.5-2시간

**리스크:**
1. 대규모 프로젝트에서의 성능 (완화 가능)
2. 문서 품질 및 가독성 (반복 개선)

**권장사항:**
Phase 1부터 순차적으로 구현하며 각 단계마다 검증
