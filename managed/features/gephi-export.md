# [[Gephi Export]]

Export TSDoc Edge relationship graph to Gephi Lite compatible format for visual graph exploration.

## Purpose

TSDoc Edge 관계 그래프를 **Gephi Lite** 웹 애플리케이션에서 시각화하기 위한 표준 형식 내보내기 기능.

관계형 데이터를 시각적 그래프로 변환하여 코드베이스의 구조와 의존성을 직관적으로 탐색할 수 있게 함.

## Context

- **입력**: SQLite 데이터베이스의 unified_relationships 테이블
- **출력**: @gephi/gephi-lite-sdk 호환 GraphDataset JSON
- **의존성**: [[DatabaseManager]]
- **구현**: Source: src/commands/RelationshipExportCommand.ts
- **사용처**: Gephi Lite (https://gephi.org/gephi-lite/)

## Features

### 1. GraphDataset 구조

```typescript
{
  nodeData: Record<string, ItemData>        // 심볼 속성 (label, type, filePath...)
  edgeData: Record<string, ItemData>        // 관계 속성 (type, category, confidence...)
  layout: Record<string, {x, y}>            // 노드 좌표
  metadata: { title, description }          // 그래프 메타데이터
  nodeFields: FieldModel[]                  // 노드 스키마 정의
  edgeFields: FieldModel[]                  // 엣지 스키마 정의
  fullGraph: SerializedGraph                // Graphology 직렬화 그래프
}
```

### 2. 레이아웃 알고리즘

| Layout | Description | Use Case |
|--------|-------------|----------|
| `circle` | 원형 배치 (기본) | 전체 구조 개요 |
| `grid` | 격자 배치 | 계층적 탐색 |
| `random` | 무작위 배치 | 초기 배치 |

### 3. 필터링 옵션

- **--category**: 관계 카테고리 (structural, behavioral, data-flow, semantic, verification, alternative)
- **--type**: 관계 타입 (composition, calls, type-dependency, etc.)
- **--min-confidence**: 최소 신뢰도 (0.0 ~ 1.0)

## Usage

### 기본 사용

```bash
# 모든 관계 export
tsdoc-edge relationship-export --format gephi --output graph.json

# Gephi Lite에서 열기
open https://gephi.org/gephi-lite/
# → "Open" → "Import from file" → graph.json 선택
```

### 필터링 예제

```bash
# Structural 관계만
tsdoc-edge relationship-export \
  --format gephi \
  --category structural \
  --output structural.json

# Composition 관계 + Grid 레이아웃
tsdoc-edge relationship-export \
  --format gephi \
  --type composition \
  --layout grid \
  --output composition.json

# 고신뢰도 관계만
tsdoc-edge relationship-export \
  --format gephi \
  --min-confidence 0.8 \
  --output high-confidence.json
```

## Implementation

### 핵심 로직

**파일**: src/commands/RelationshipExportCommand.ts:404-517

1. **노드 데이터 생성**: 각 심볼의 속성 추출
2. **엣지 데이터 생성**: 관계의 속성 추출
3. **레이아웃 계산**: 선택된 알고리즘으로 좌표 생성
4. **스키마 정의**: Field models 생성
5. **GraphDataset 조립**: 모든 데이터를 하나의 구조로 결합

### 노드 속성 (5개)

- `label` (text): 심볼 이름
- `type` (category): 심볼 타입 (class, interface, function...)
- `filePath` (text): 파일 경로
- `isPublic` (number): 공개 여부 (0/1)
- `hasTests` (number): 테스트 존재 여부 (0/1)

### 엣지 속성 (6개)

- `type` (category): 관계 타입
- `category` (category): 관계 카테고리
- `confidence` (number): 신뢰도 (0-1)
- `direction` (category): 방향성
- `strength` (category): 강도
- `weight` (number): 가중치

## Testing

### 타입 검증

```bash
# GraphDataset 타입 호환성 검증
npx ts-node src/scripts/verify-gephi-sdk-types.ts
```

**검증 항목**:
- ✅ @gephi/gephi-lite-sdk SerializedGraphDataset 타입 호환
- ✅ 모든 필수 필드 존재
- ✅ Field models 스키마 유효성
- ✅ 노드/엣지 구조 정합성

### 포맷 검증

```bash
# 런타임 포맷 검증
npx ts-node src/scripts/verify-gephi-format.ts
```

**검증 항목**:
- ✅ 좌표계 유효성 (x, y 값 존재)
- ✅ 메타데이터 완전성
- ✅ 노드/엣지 배열 구조
- ✅ 그래프 옵션 (directed, multi, allowSelfLoops)

## Performance

**대규모 그래프 처리**:
- 2,368 노드, 181 엣지: ~1.5MB JSON
- 2,368 노드, 2,799 엣지: ~3.0MB JSON
- Export 시간: ~1초 미만

**메모리 효율**:
- 스트리밍 없이 한 번에 생성
- 중간 데이터 구조 최소화
- JSON 직렬화 최적화

## Related Features

- **Export Command**: Source: src/commands/RelationshipExportCommand.ts
- **Visualization**: Source: src/commands/RelationshipVisualizeCommand.ts (Mermaid/DOT)
- **Path Finding**: Source: src/commands/RelationshipPathCommand.ts
- [[DatabaseManager]]: 데이터베이스 관리
- [[UnifiedRelationship]]: 관계 데이터 모델

## Decisions

### Why Gephi Lite SDK?

1. **표준 형식**: Graph visualization 커뮤니티 표준
2. **타입 안전**: TypeScript 타입 정의 제공
3. **웹 기반**: 별도 설치 없이 브라우저에서 사용
4. **풍부한 기능**: 필터링, 레이아웃, 통계 분석

### Why SerializedGraphDataset?

- JSON export이므로 직렬화 형식 사용
- Graphology MultiGraph 대신 SerializedGraph 사용
- 파일 기반 전송에 최적화

## Traps

### ⚠️ 대규모 그래프 성능

**문제**: 수만 개 이상의 노드/엣지는 브라우저 메모리 부족

**해결**:
```bash
# 필터링으로 크기 제한
tsdoc-edge relationship-export --format gephi \
  --category structural \
  --min-confidence 0.8 \
  --output filtered.json
```

### ⚠️ 레이아웃 알고리즘 한계

**현재**: 단순 인덱스 기반 배치
**TODO**: 의미있는 좌표 매핑 (카테고리/타입 기반)

```typescript
// 향후 개선: Semantic layout
// X축: 관계 카테고리 (6개 구역)
// Y축: 심볼 타입 (9개 레이어)
// 클러스터: 파일 경로 기반 그룹화
```

### ⚠️ 순환 참조 처리

Gephi는 순환 그래프를 지원하지만 시각화 시 주의 필요

**대응**: `allowSelfLoops: false`로 자기 참조 방지

## Future Enhancements

1. **Semantic Layout**: 카테고리/타입 기반 좌표 매핑
2. **Dynamic Fields**: 시간 기반 동적 속성 지원
3. **Subgraph Export**: 특정 모듈/패키지만 추출
4. **Custom Styling**: 노드/엣지 색상/크기 커스터마이징
5. **Force-directed Layout**: 물리 기반 자동 배치

## Links

- [Gephi Lite](https://gephi.org/gephi-lite/)
- [@gephi/gephi-lite-sdk](https://www.npmjs.com/package/@gephi/gephi-lite-sdk)
- [Graphology](https://graphology.github.io/)

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:191
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:319
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:320
- [[Relationship Path]] → /home/user/tsdoc-edge/managed/features/relationship-path.md:193

