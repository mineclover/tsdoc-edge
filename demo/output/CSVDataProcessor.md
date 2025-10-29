# CSVDataProcessor

**Type**: `class`  
**Location**: `/src/processors/CSVDataProcessor.ts:15`  
**Visibility**: Public API  
**Exported**: Yes  

> Process large CSV files with memory-efficient streaming and parallel processing

---

## 1. 🎯 Problem Solving

### What Problem Does This Solve?

대규모 CSV 파일(100MB~5GB)을 처리할 때 발생하는 메모리 부족 문제를 해결합니다.

### Context

외부 벤더로부터 매일 수신하는 고객 데이터 파일의 크기가 증가하면서, 기존의 pandas.read_csv()로는 전체 파일을 메모리에 로드할 수 없게 되었습니다. 서버 RAM은 8GB이지만, 3GB 이상 파일 처리 시 OutOfMemory 에러가 발생했습니다.

### Target Use Case

ETL 파이프라인에서 고객 데이터를 데이터 웨어하우스로 적재

### Related Problem

memory-optimization-project

## 2. ⚙️ Functionality

### Main Features

- CSV 파일 스트림 읽기 (청크 단위)
- NaN 값 처리 (drop/fill/interpolate 전략)
- 특수 문자 필터링 (정규식 기반)
- 진행률 추적 (콜백 지원)
- 병렬 처리 (concurrent.futures)

### Components

#### `loadData`

CSV 파일을 비동기 스트림으로 읽어옵니다

**Signature**: `(filePath: string, options?: LoadOptions) => AsyncGenerator<DataFrame>`

#### `cleanText`

텍스트에서 특수문자를 제거하고 공백을 정규화합니다

**Signature**: `(text: string, options?: CleanOptions) => string`

#### `handleNaN`

NaN 값 처리 전략을 적용합니다

**Signature**: `(df: DataFrame, strategy: NaNStrategy) => DataFrame`

#### `processParallel`

여러 청크를 병렬로 처리합니다

**Signature**: `(chunks: DataFrame[], workers: number) => Promise<DataFrame[]>`

### Input/Output

**Inputs**:

- **filePath** (`string`): CSV 파일의 절대 경로 또는 상대 경로
- **options** (`ProcessOptions`): 처리 옵션 (chunkSize, nanStrategy, encoding, onProgress 등)

**Outputs**:

- **result** (`AsyncGenerator<ProcessedData>`): 처리된 데이터 청크의 스트림

### Usage Examples

#### Example 1

```typescript
// 기본 사용법
const processor = new CSVDataProcessor();
for await (const chunk of processor.loadData('data.csv')) {
  console.log(`Processed ${chunk.rowCount} rows`);
}
```

#### Example 2

```typescript
// 고급 옵션 사용
const processor = new CSVDataProcessor({
  chunkSize: 10000,
  nanStrategy: 'interpolate',
  encoding: 'utf-8',
  parallel: true,
  workers: 4
});

const result = await processor.process('large-file.csv', {
  filters: ['trim', 'lowercase', 'remove-special-chars'],
  onProgress: (percent) => console.log(`Progress: ${percent}%`)
});
```

## 3. 🐛 Error Experiences

### ValueError: Input array is too large

**Context**: 2024년 1월 15일 프로덕션 환경에서 3GB CSV 파일 처리 중 발생. 기존 pandas.read_csv()를 사용했을 때 전체 파일을 메모리에 로드하려다 실패.

**Solution**:

> chunksize 파라미터 사용:
```python
for chunk in pd.read_csv(file, chunksize=50000):
    process(chunk)
    del chunk  # 명시적 메모리 해제
```

**Prevention**:

파일 크기 500MB 초과 시 자동으로 청크 모드 활성화. 단위 테스트에 메모리 프로파일링 추가.

*Occurred: 2024-01-15T14:30:00Z*

### UnicodeDecodeError: codec can't decode byte 0xff in position 1234

**Context**: 레거시 시스템에서 받은 CSV 파일이 ISO-8859-1 인코딩을 사용. 기본 UTF-8로 디코딩 시도 시 에러 발생.

**Solution**:

> chardet 라이브러리로 인코딩 자동 감지 및 fallback 체인 구현:
1. UTF-8 시도
2. ISO-8859-1 시도
3. CP1252 시도

**Prevention**:

벤더와 데이터 계약서에 인코딩 명시. 수신 시 검증 로직 추가.

### PerformanceWarning: This DataFrame is highly fragmented

**Context**: 1M 행 데이터를 iterrows()로 순회하니 45분 소요

**Solution**:

> 벡터화 연산 및 apply() + numba 컴파일 사용으로 3분으로 단축:
```python
@numba.jit
def process_row(row):
    return row * 2

df["new_col"] = df["old_col"].apply(process_row)
```

**Prevention**:

모든 데이터 처리에 대해 실제 크기 데이터로 벤치마크 필수

## 4. 🔍 Design Decisions

### ADR-001: concurrent.futures를 사용한 병렬 처리

**Status**: 🟢 Accepted

**Date**: 2024-01-10

#### Decision

multiprocessing 대신 concurrent.futures.ThreadPoolExecutor를 사용하여 병렬 처리 구현

#### Rationale

작업이 I/O bound(파일 읽기, DB 쓰기)이므로 쓰레드 기반 병렬화가 더 효율적. GIL(Global Interpreter Lock)의 영향이 적고, 메모리 오버헤드가 적음. 쓰레드는 I/O 대기 중에 다른 쓰레드가 실행되므로 CPU 사용률 향상.

#### Alternatives Considered

- **multiprocessing.Pool**: 프로세스 기반 병렬화는 CPU bound 작업에 적합. I/O bound 작업에서는 프로세스 생성/소멸 오버헤드와 IPC(Inter-Process Communication) 비용이 이득보다 큼. 메모리 복제로 인한 추가 메모리 사용.
- **joblib**: 불필요한 외부 의존성. concurrent.futures는 표준 라이브러리로 충분한 기능 제공. 팀 내 라이브러리 사용 정책상 표준 라이브러리 우선 사용.
- **asyncio**: 전체 코드베이스를 async/await 스타일로 재작성해야 함. 마이그레이션 비용 대비 성능 개선이 크지 않음. 향후 고려 대상이지만 현재는 투자 대비 효과 낮음.

#### Consequences

- 긍정: I/O heavy 워크로드에서 3배 성능 향상 (45분 → 15분)
- 긍정: 표준 라이브러리 사용으로 의존성 최소화
- 긍정: 메모리 사용량 증가 없음
- 부정: CPU 집약적 전처리 단계에서는 최적이 아님
- 완화: CPU intensive 작업이 추가되면 multiprocessing 하이브리드 고려

### ADR-003: Parquet 포맷으로 출력

**Status**: 🟢 Accepted

**Date**: 2024-02-01

#### Decision

처리된 데이터를 CSV 대신 Apache Parquet 포맷으로 저장

#### Rationale

1. 저장 공간 80% 절감 (5GB CSV → 1GB Parquet)
2. 쿼리 성능 10배 향상 (컬럼 기반 저장)
3. 스키마 포함으로 데이터 타입 보존
4. 압축 지원 (snappy, gzip)

#### Alternatives Considered

- **CSV 유지**: CSV는 범용적이지만 파일 크기가 크고 쿼리 성능이 낮음. 데이터 타입 정보 손실.
- **JSON**: CSV보다 더 큰 파일 크기. 파싱 오버헤드.

#### Consequences

- 저장 비용 80% 절감
- 다운스트림 분석 쿼리 성능 10배 향상
- Parquet 호환 도구 필요 (pandas, spark, duckdb 등)
- 기존 CSV 의존 시스템과의 호환성 고려 필요

## 5. 🔗 Dependencies

### Module Dependencies

#### `config_loader`

애플리케이션 설정 로드 (DB 크리덴셜, 파일 경로, 청크 크기, 워커 수 등)

**Import**: `../config/config_loader`

#### `logger`

구조화된 로깅 (디버깅, 모니터링, 알림)

**Import**: `../utils/logger`

### External Dependencies

#### `pandas`

DataFrame 연산, CSV 파싱, 데이터 변환

**Version**: >=2.0.0

#### `numpy`

수치 연산, NaN 처리, 배열 조작

**Version**: >=1.24.0

#### `pyarrow`

Parquet 파일 포맷 읽기/쓰기

**Version**: >=12.0.0

*Optional dependency*

#### `chardet`

CSV 파일 인코딩 자동 감지

**Version**: >=5.0.0

*Optional dependency*

## 6. 🚀 Future Plans

### 🏗️ In-progress

#### PLAN-001: S3 직접 스트리밍 지원

**Priority**: 🔴 High

AWS S3 버킷에서 파일을 다운로드하지 않고 직접 스트리밍하여 처리. boto3의 streaming API를 사용하여 네트워크 대역폭 최적화.

**Target**: v2.0

**Effort**: 2 weeks

**Related**: ISSUE-234, ISSUE-245

### 📋 Planned

#### PLAN-002: 데이터 품질 검증 통합

**Priority**: 🟡 Medium

Great Expectations 프레임워크 통합으로 자동 데이터 품질 검증. 체크 항목: null 비율, outlier 탐지, 스키마 준수, 중복 검사.

**Target**: v2.1

**Effort**: 3 weeks

#### PLAN-003: 다양한 파일 포맷 지원 (JSON, XML)

**Priority**: 🟢 Low

CSV뿐만 아니라 JSON Lines, XML 파일도 동일한 API로 처리 가능하도록 확장.

**Target**: v3.0

**Effort**: 1 week per format

### ✅ Completed

#### PLAN-004: 실시간 진행률 대시보드

**Priority**: 🟡 Medium

웹 UI로 여러 파일의 처리 진행률을 실시간 모니터링

**Target**: v1.5

*Completed: 2024-02-10T00:00:00Z*

---

## 📊 Metadata

- **Created**: 2024-01-01T00:00:00Z
- **Updated**: 2025-10-29T15:48:42.038Z
- **Version**: 1.0.0
