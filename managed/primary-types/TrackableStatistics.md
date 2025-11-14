# [[TrackableStatistics]]

**Primary Type**: Statistics Tracking System Root

## 1. Purpose (목적)

시간 경과에 따른 코드베이스 통계를 추적하고 비교 가능한 형태로 제공하는 중앙 타입입니다. 전반적 통계, 중요도별 통계, 변경 비교를 통합 관리합니다.

### Problem (해결하는 문제)
- 코드 품질 변화 추적 불가
- 문서화율 퇴보 감지 어려움
- Critical 심볼 관리 부재

### Solution (해결 방법)
- 시계열 통계 스냅샷 저장
- 중요도 3단계 분류 (Critical/Important/Normal)
- 이전 대비 변화량 자동 계산

## 2. Structure (구조)

### Type Definition

```typescript
interface TrackableStatistics {
  overall: DetectableStats;                      // 전체 통계
  byImportance: ImportanceStats;                 // 중요도별 통계
  symbolImportance: Map<string, ImportanceCriteria>; // 심볼별 중요도
  comparison?: StatsComparison;                  // 이전 대비 변경
  newSymbols?: Symbol[];                         // 새로 추가된 심볼
  deletedSymbols?: string[];                     // 삭제된 심볼
  changedSymbols?: SymbolChange[];               // 변경된 심볼
  timestamp: string;                             // 통계 수집 시각
}
```

### Composed Types

이 타입은 8개의 통계 관련 타입을 명시적으로 조합합니다:

1. **DetectableStats** - 문서화율, 테스트율, 이슈 카운트
2. **ImportanceStats** - critical/important/normal 각각의 DetectableStats
3. **ImportanceCriteria** - 심볼의 중요도 판정 기준
4. **StatsComparison** - before/after/delta 비교 구조
5. **[[Symbol]]** - 새로 추가된 심볼 정보
6. **SymbolChange** - 심볼 변경 내역 추적
7. **StatsDelta** - 통계 변화량 (증감)

## 3. Usage Scenarios (사용 시나리오)

### 1. 현재 통계 수집
```bash
tsdoc-edge stats src
# TrackableStatistics 생성 및 출력
```

### 2. 시간 경과 비교
```typescript
const collector = new TrackableStatsCollector(db);
const stats = collector.collectStats('src');

if (stats.comparison) {
  console.log(`Documentation: ${stats.comparison.delta.documentationDelta}%`);
  console.log(`New symbols: ${stats.newSymbols?.length}`);
}
```

### 3. 중요도별 분석
```typescript
const criticalStats = stats.byImportance.critical;
console.log(`Critical symbols documented: ${criticalStats.documented}/${criticalStats.total}`);
```

## 4. Design Decisions (설계 결정)

### Decision 1: 3-tier Importance Classification

**Rationale:**
- **Critical**: Public API, 다른 모듈이 직접 사용
- **Important**: 내부 핵심 로직, 테스트 필수
- **Normal**: 일반 유틸리티, 헬퍼 함수

**Consequences:**
- ✅ 우선순위 기반 문서화 전략
- ✅ Critical 심볼 보호
- ⚠️ 분류 기준 주관적 가능성

### Decision 2: Time-series Tracking

**Rationale:**
- 품질 변화 추이 파악 필요
- Git hook 통합으로 자동 추적
- 시계열 데이터로 트렌드 분석

**Alternatives Considered:**
- 스냅샷만 저장: 변화 추적 불가
- 실시간 업데이트: 성능 부담

### Decision 3: before/after/delta Structure

**Rationale:**
- 변경사항 명확한 표현
- 절댓값 + 백분율 모두 제공
- CI/CD 품질 게이트 활용

## 5. Related Concepts (관련 개념)

- [[TrackableStatsCollector]] - 통계 수집 구현체
- [[StatsHistoryManager]] - 통계 이력 관리
- [[StatsCommand]] - CLI 인터페이스
- [[AnalysisFeatures]] - 분석 기능 전반

## 6. Commands Using This Type

**[[StatsCommand]]** (`src/commands/Phase7Commands.ts:540`)
- `TrackableStatistics` 수집 및 출력
- `--save`: 스냅샷 저장
- `--compare`: 이전 대비 비교

**[[AnalyzeCommand]]** (`src/commands/AnalyzeCommand.ts`)
- 중요도별 통계 분석
- `byImportance` 필드 활용

## 7. Code References (코드 참조)

**Type Definition**: `src/types/TrackableStatistics.ts`
**Primary Producer**: [[TrackableStatsCollector]] (`src/analyzer/TrackableStatsCollector.ts`)
**History Manager**: [[StatsHistoryManager]] (`src/analyzer/StatsHistoryManager.ts`)

[^TrackableStatistics]
[^TrackableStatsCollector]
[^DetectableStats]
[^ImportanceStats]
[^StatsComparison]
[^SymbolChange]

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:222
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:461
- [[StatsComparator]] → /home/user/tsdoc-edge/managed/analyzers/StatsComparator.md:22
- [[StatsComparator]] → /home/user/tsdoc-edge/managed/analyzers/StatsComparator.md:39
- [[StatsComparator]] → /home/user/tsdoc-edge/managed/analyzers/StatsComparator.md:40
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:21
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:41
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:42
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:43
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:44
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:45
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:46
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:22
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:40
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:41
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:42
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:43
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:44
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:45
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:53
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:54
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:194
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:195
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:196
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:197
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:22
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:32
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:33
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:376
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:377
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:115
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:116

### Implemented By

- TrackableStatistics → /home/user/tsdoc-edge/src/types/analysis/statistics.ts:171

