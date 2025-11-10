# [[ParallelWorkDetector]]

**Source**: `src/analyzer/ParallelWorkDetector.ts`

## Purpose

병렬 작업 가능 여부를 자동 탐지하여 작업 분할 제안.

## Detection Logic

**Checks**:
1. **No shared state**: 공유 변수 없음
2. **Independent I/O**: 서로 다른 파일 접근
3. **No call dependency**: 직접 호출 관계 없음
4. **Type independence**: 타입 의존성 분리

## Output

```typescript
interface ParallelWorkGroup {
  tasks: string[];           // 병렬 가능한 작업 목록
  reason: string;            // 병렬 가능 이유
  caution?: string;          // 주의사항
}
```

## Related

- [[Parallel Work Theory]]: 이론적 배경
- [[WorkContextCommand]]: 작업 컨텍스트 분석

---

## Backlinks

### Referenced By

- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:179
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:91

