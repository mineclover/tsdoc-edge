# 문서화 추적 및 안전 장치 설계

## 목적
작업 전후 비교를 통해 중요한 문서가 실수로 삭제되는 것을 방지

## 핵심 개념

### 1. 감지 대상 vs 현재 상태
```
감지 대상 (Detectable): 코드에 존재하는 모든 심볼
현재 상태 (Current): 실제로 문서화되어 있는 심볼

비율 = (현재 상태 / 감지 대상) × 100
```

### 2. 중요도 분류

**Critical (중요)** - 절대 사라지면 안됨:
- `isPublic: true` (Public API)
- `isExported: true` (Export된 심볼)
- `@public` 태그 명시
- Contract/Responsibility 정의됨

**Important (중요함)** - 가급적 유지:
- Class, Interface, Type (구조 정의)
- 테스트 매핑 있음
- 관계가 많음 (의존성 5개 이상)

**Normal (일반)** - 선택적:
- Private 함수/변수
- Helper 함수
- 내부 유틸리티

## 타입 정의

```typescript
/**
 * 중요도 레벨
 */
export type ImportanceLevel = 'critical' | 'important' | 'normal';

/**
 * 중요도 기준
 */
export interface ImportanceCriteria {
  level: ImportanceLevel;
  reasons: string[]; // ['public API', 'has contract', 'exported']
}

/**
 * 감지 대상 통계
 */
export interface DetectableStats {
  /** 코드에서 감지된 전체 심볼 수 */
  total: number;

  /** 실제 문서화되어 있는 심볼 수 */
  documented: number;

  /** 문서화 안된 심볼 수 */
  undocumented: number;

  /** 문서화율 (%) */
  rate: number;
}

/**
 * 중요도별 통계
 */
export interface ImportanceStats {
  /** Critical 심볼 통계 */
  critical: DetectableStats;

  /** Important 심볼 통계 */
  important: DetectableStats;

  /** Normal 심볼 통계 */
  normal: DetectableStats;
}

/**
 * 변화량 (Delta)
 */
export interface StatsDelta {
  total: number;
  documented: number;
  undocumented: number;
  rate: number; // percentage point change
}

/**
 * 비교 결과
 */
export interface StatsComparison {
  /** 이전 통계 */
  before: DetectableStats;

  /** 현재 통계 */
  after: DetectableStats;

  /** 변화량 */
  delta: StatsDelta;

  /** 경고 여부 */
  hasWarning: boolean;

  /** 경고 메시지 */
  warnings: string[];
}

/**
 * 추적 가능한 통계
 */
export interface TrackableStatistics {
  /** 분석 시각 */
  timestamp: string;

  /** 프로젝트 경로 */
  projectPath: string;

  /** 전체 통계 */
  overall: DetectableStats;

  /** 중요도별 통계 */
  byImportance: ImportanceStats;

  /** 심볼별 중요도 맵 */
  symbolImportance: Map<string, ImportanceCriteria>;

  /** 이전 실행과 비교 (있을 경우) */
  comparison?: {
    overall: StatsComparison;
    critical: StatsComparison;
    important: StatsComparison;
    normal: StatsComparison;
  };
}
```

## 출력 형식

### 기본 출력
```
📊 Documentation Tracking
═══════════════════════════════════════════════════

전체 감지 대상     156 symbols
  문서화됨         120 symbols (76.9%)
  미문서화         36 symbols (23.1%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Critical (절대 보호)
  감지 대상        89 symbols (Public API, Exported)
  문서화됨         85 symbols (95.5%) ✅
  미문서화         4 symbols (4.5%)

🟡 Important (권장 보호)
  감지 대상        34 symbols (Structures, High connectivity)
  문서화됨         23 symbols (67.6%)
  미문서화         11 symbols (32.4%)

⚪ Normal (선택적)
  감지 대상        33 symbols (Private, Helpers)
  문서화됨         12 symbols (36.4%)
  미문서화         21 symbols (63.6%)
```

### 비교 모드 출력 (이전 실행과 비교)
```
📊 Documentation Tracking (vs. 2024-01-15 14:30)
═══════════════════════════════════════════════════

전체 감지 대상     156 symbols (→ 0)
  문서화됨         120 symbols (76.9%) ↓ -5 (-3.2%)
  미문서화         36 symbols (23.1%) ↑ +5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Critical
  감지 대상        89 symbols (→ 0)
  문서화됨         85 symbols (95.5%) ↓ -3 ⚠️ WARNING
  미문서화         4 symbols (4.5%) ↑ +3

⚠️  Critical 심볼 문서 감소 감지!
  - SymbolGraphBuilder.addSymbol() 문서 삭제됨
  - TSDocParser.parseFile() 문서 삭제됨
  - ConfigManager.validate() 문서 삭제됨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 Important
  감지 대상        34 symbols (→ 0)
  문서화됨         23 symbols (67.6%) ↓ -2
  미문서화         11 symbols (32.4%) ↑ +2

⚪ Normal
  감지 대상        33 symbols (→ 0)
  문서화됨         12 symbols (36.4%) → 0
  미문서화         21 symbols (63.6%) → 0
```

### 경고 기준

```typescript
/**
 * 경고 조건 체크
 */
interface WarningConditions {
  // Critical 심볼 문서화 감소
  criticalDocDecrease: boolean;

  // Critical 심볼 자체가 사라짐
  criticalSymbolLoss: boolean;

  // 전체 문서화율 5% 이상 하락
  significantRateDropOverall: boolean;

  // Critical 문서화율 1% 이상 하락
  significantRateDropCritical: boolean;
}
```

## CLI 명령어

```bash
# 현재 상태 확인
tsdoc-edge stats --track

# 이전 실행과 비교
tsdoc-edge stats --track --compare

# 히스토리 저장 (.tsdoc-stats-history.json)
tsdoc-edge stats --track --save

# 특정 시점과 비교
tsdoc-edge stats --track --compare-with=.tsdoc-stats-2024-01-15.json

# 경고만 출력
tsdoc-edge stats --track --warnings-only
```

## 저장 형식

`.tsdoc-stats-history.json`:
```json
{
  "version": "1.0.0",
  "history": [
    {
      "timestamp": "2024-01-15T14:30:00Z",
      "overall": {
        "total": 156,
        "documented": 125,
        "undocumented": 31,
        "rate": 80.1
      },
      "critical": {
        "total": 89,
        "documented": 88,
        "undocumented": 1,
        "rate": 98.9
      }
    }
  ]
}
```

## 구현 우선순위

1. **ImportanceClassifier** - 심볼 중요도 분류
2. **TrackableStatsCollector** - 추적 가능한 통계 수집
3. **StatsComparator** - 이전 실행과 비교
4. **WarningDetector** - 경고 조건 감지
5. **StatsHistoryManager** - 히스토리 저장/로드
