**# Strict Mode Guide - 6-Category Documentation System

## 개요

Strict Mode는 TSDoc Edge의 고급 문서화 시스템으로, 코드의 완전한 이해와 추적을 위해 **6가지 필수 카테고리**를 강제합니다.

## 왜 Strict Mode인가?

일반 문서화는 "무엇을 하는가"만 설명합니다. Strict Mode는:
- **왜** 이 코드가 존재하는가?
- **어떻게** 동작하는가?
- **무엇이** 잘못될 수 있는가?
- **왜** 이런 결정을 내렸는가?
- **무엇에** 의존하는가?
- **어디로** 발전할 것인가?

이 모든 질문에 답합니다.

## 6가지 필수 카테고리

### 1. 문제 해결 (Problem Solving)

**목적**: 이 코드가 해결하는 문제를 명확히 정의

```typescript
problemSolving: {
  description: "대규모 CSV 파일을 메모리 효율적으로 처리",
  context: "100MB~5GB 크기의 고객 데이터 파일 처리 시 메모리 부족 문제 발생",
  targetUseCase: "외부 벤더로부터 받은 고객 데이터 ETL 파이프라인",
  relatedProblem: "data-ingestion-architecture" // 선택사항
}
```

**필수 항목**:
- `description`: 핵심 문제 설명
- `context`: 문제가 발생한 배경

**작성 팁**:
- 구체적인 수치와 상황 포함
- 사용자 관점에서 작성
- "왜 이게 필요한가?"에 답하기

---

### 2. 기능 수행 (Functionality)

**목적**: 구체적인 기능과 구성요소를 명시

```typescript
functionality: {
  mainFeatures: [
    "CSV 데이터 스트림 읽기 (청크 단위)",
    "NaN 값 처리 (drop/fill/interpolate)",
    "특수 문자 필터링"
  ],
  components: [
    {
      name: "loadData",
      description: "파일 경로를 입력받아 DataFrame 생성",
      signature: "(filePath: string) => AsyncGenerator<DataFrame>"
    },
    {
      name: "cleanText",
      description: "텍스트에서 특수문자 제거",
      signature: "(text: string) => string"
    }
  ],
  io: {
    inputs: [
      { name: "filePath", type: "string", description: "CSV 파일 경로" }
    ],
    outputs: [
      { name: "result", type: "AsyncGenerator<Data>", description: "처리된 데이터" }
    ]
  },
  examples: [
    `const processor = new DataProcessor();
for await (const chunk of processor.loadData('data.csv')) {
  console.log(\`Processed \${chunk.rowCount} rows\`);
}`
  ]
}
```

**필수 항목**:
- `mainFeatures`: 주요 기능 목록
- `components`: 구성 요소 (함수, 메서드 등)

**작성 팁**:
- 사용자가 실제 사용할 함수/메서드 나열
- 시그니처 포함 권장
- 예제 코드 추가 강력 권장

---

### 3. 에러 경험 (Error Experiences)

**목적**: 실제로 겪은 에러와 해결책을 기록

```typescript
errorExperiences: [
  {
    id: "ERR-001",
    errorType: "ValueError",
    message: "Input array is too large",
    context: "3GB CSV 파일 로드 시 메모리 부족 (8GB RAM)",
    solution: "chunksize 파라미터 사용하여 청크 단위 처리",
    occurredAt: "2024-01-15",
    prevention: "파일 크기 > 500MB일 때 자동으로 청크 모드 사용"
  }
]
```

**필수 항목**:
- `id`: 에러 고유 식별자
- `errorType`: 에러 타입
- `message`: 에러 메시지
- `context`: 발생 상황
- `solution`: 해결 방법

**작성 팁**:
- 실제 겪은 에러만 기록
- 재현 가능한 상황 설명
- 해결책은 구체적으로 (코드 포함)
- 예방 조치 포함

---

### 4. 의사 결정 (Design Decisions)

**목적**: 왜 이렇게 구현했는지 명확히 기록

```typescript
decisions: [
  {
    id: "ADR-001",
    title: "concurrent.futures 사용 결정",
    decision: "병렬 처리를 위해 concurrent.futures 사용",
    rationale: "I/O bound 작업 특성상 쓰레드 기반이 효율적. GIL 영향 최소",
    alternatives: [
      {
        option: "multiprocessing.Pool",
        reason: "프로세스 오버헤드가 I/O 작업에는 비효율적"
      },
      {
        option: "joblib",
        reason: "불필요한 의존성 추가"
      }
    ],
    consequences: [
      "긍정: I/O 워크로드 3배 성능 향상",
      "부정: CPU 집약적 작업에는 비효율적"
    ],
    date: "2024-01-10",
    status: "accepted"
  }
]
```

**필수 항목**:
- `id`: 결정 고유 식별자 (ADR 형식 권장)
- `title`: 결정 제목
- `decision`: 내린 결정
- `rationale`: 이유
- `date`: 결정 날짜
- `status`: 상태 (proposed/accepted/deprecated/superseded)

**작성 팁**:
- 검토한 대안 모두 나열
- 각 대안을 왜 선택하지 않았는지 명시
- 결과와 트레이드오프 기록
- Architecture Decision Records (ADR) 형식 따르기

---

### 5. 의존성 (Dependencies)

**목적**: 외부 모듈/라이브러리 의존성과 이유 명시

```typescript
dependencies: [
  {
    target: "config_loader",
    type: "module",
    reason: "설정 파일 불러오기 (DB 크리덴셜, 파일 경로)",
    importPath: "../config/config_loader"
  },
  {
    target: "pandas",
    type: "external",
    reason: "DataFrame 연산 및 CSV 파싱",
    version: ">=2.0.0",
    isOptional: false
  },
  {
    target: "pyarrow",
    type: "external",
    reason: "Parquet 파일 포맷 지원",
    version: ">=12.0.0",
    isOptional: true
  }
]
```

**필수 항목**:
- `target`: 의존성 대상
- `type`: 타입 (module/file/symbol/external)
- `reason`: 왜 필요한가?

**작성 팁**:
- 각 의존성이 왜 필요한지 명확히
- 버전 제약 명시 (외부 라이브러리)
- 선택적 의존성 표시
- 순환 의존성 주의

---

### 6. 미래 계획 (Future Plans)

**목적**: 향후 개선 사항과 로드맵

```typescript
futurePlans: [
  {
    id: "PLAN-001",
    title: "S3 스트리밍 지원",
    description: "boto3로 S3 버킷에서 직접 스트리밍",
    priority: "high",
    status: "in-progress",
    targetMilestone: "v2.0",
    estimatedEffort: "2주",
    blockedBy: [],
    relatedIssues: ["ISSUE-234"],
    createdAt: "2024-02-15"
  },
  {
    id: "PLAN-002",
    title: "데이터 품질 검증 추가",
    description: "Great Expectations 통합",
    priority: "medium",
    status: "planned",
    targetMilestone: "v2.1",
    estimatedEffort: "3주",
    createdAt: "2024-02-20"
  }
]
```

**필수 항목**:
- `id`: 계획 고유 식별자
- `title`: 계획 제목
- `description`: 상세 설명
- `priority`: 우선순위 (high/medium/low)
- `status`: 상태 (planned/in-progress/completed/cancelled)
- `createdAt`: 생성 날짜

**작성 팁**:
- 기술 부채 포함
- 우선순위 명확히
- 의존성/블로커 명시
- 완료된 항목도 보관 (히스토리)

---

## 실전 예제

전체 예제는 [examples/strict-mode-example.ts](./examples/strict-mode-example.ts)를 참고하세요.

### 1. Enhanced Documentation 작성

```typescript
import { EnhancedSymbolDoc } from 'tsdoc-edge';

const doc: EnhancedSymbolDoc = {
  symbolId: 'my-function',

  // 6가지 카테고리 모두 작성
  problemSolving: { /* ... */ },
  functionality: { /* ... */ },
  errorExperiences: [ /* ... */ ],
  decisions: [ /* ... */ ],
  dependencies: [ /* ... */ ],
  futurePlans: [ /* ... */ ],

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: '1.0.0'
};
```

### 2. Strict Mode 검증

```typescript
import { StrictModeValidator } from 'tsdoc-edge';

const validator = new StrictModeValidator();
const result = validator.validate(doc, true); // true = Public API

console.log(`Compliant: ${result.isCompliant}`);
console.log(`Score: ${result.complianceScore}/100`);

if (!result.isCompliant) {
  const report = validator.generateReport(result);
  console.log(report);
}
```

### 3. Markdown 문서 생성

```typescript
import { EnhancedMarkdownGenerator } from 'tsdoc-edge';

const generator = new EnhancedMarkdownGenerator();
const markdown = generator.generateDocument(symbol, enhancedDoc);

// markdown에는 6가지 카테고리가 모두 포함된 완전한 문서
```

### 4. 데이터베이스 저장 및 JSONL Export

```typescript
import { DatabaseManager } from 'tsdoc-edge';

const db = new DatabaseManager('.tsdoc-edge.db', './docs/data');

// 저장
db.insertSymbol(symbol, 0);
db.insertEnhancedDoc(enhancedDoc, 0);

// JSONL로 Export (Git 버전 관리)
const exportPath = db.exportToJSONL();
console.log(`Exported to: ${exportPath}`);

// Import
db.importFromJSONL('./docs/data/export-2024-01-01.jsonl');
```

---

## SQLite + JSONL 하이브리드 구조

### 왜 SQLite + JSONL?

1. **SQLite**: 빠른 검색과 쿼리를 위한 인덱싱
2. **JSONL**: Git 버전 관리, 텍스트 기반 diff/merge

### 데이터 흐름

```
작성 → SQLite 저장 → JSONL Export → Git 커밋
         ↓
    빠른 검색/쿼리
```

### JSONL 포맷

```jsonl
{"type":"symbol","data":{"id":"sym-001","name":"MyClass",...}}
{"type":"enhanced_doc","data":{"symbolId":"sym-001","problemSolving":{...},...}}
```

한 줄에 하나의 JSON 객체 → Git diff가 깔끔함

---

## 검증 규칙

### Public API (엄격)

- 모든 6가지 카테고리 필수
- 에러 경험 1개 이상 권장
- 결정 기록 1개 이상 권장

### Private Symbol (완화)

- Problem Solving, Functionality, Dependencies, Future Plans 필수
- Error Experiences, Decisions 선택사항

### 점수 계산

- 카테고리 누락: -16.67점/개 (100/6)
- 불완전한 카테고리: -8.33점/개 (절반 패널티)
- 추가 에러: -2점/개 (최대 -20점)

100점 = 완벽한 Strict Mode 준수

---

## Best Practices

### ✅ DO

1. **구체적으로 작성**
   ```typescript
   // ❌ 나쁜 예
   description: "데이터 처리"

   // ✅ 좋은 예
   description: "100MB~5GB 크기의 CSV 파일을 메모리 효율적으로 처리하여 OOM 에러 방지"
   ```

2. **실제 경험 기록**
   ```typescript
   // ✅ 실제 겪은 에러만
   errorExperiences: [{
     message: "ValueError: Input array is too large",
     context: "2024-01-15 프로덕션에서 3GB 파일 처리 시 발생",
     solution: "chunksize=50000 적용하여 해결"
   }]
   ```

3. **대안과 이유 명시**
   ```typescript
   // ✅ 검토한 모든 대안
   alternatives: [
     { option: "multiprocessing", reason: "프로세스 오버헤드" },
     { option: "joblib", reason: "불필요한 의존성" },
     { option: "asyncio", reason: "대규모 리팩토링 필요" }
   ]
   ```

### ❌ DON'T

1. **추상적인 설명**
   ```typescript
   // ❌
   description: "최적화를 위한 코드"
   ```

2. **가상의 에러**
   ```typescript
   // ❌ 실제로 겪지 않은 에러
   errorExperiences: [{
     message: "NullPointerException might occur"
   }]
   ```

3. **이유 없는 결정**
   ```typescript
   // ❌
   decision: "concurrent.futures 사용",
   rationale: "더 좋아서"
   ```

---

## CI/CD 통합

### GitHub Actions 예제

```yaml
name: Doc Validation

on: [push, pull_request]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate Strict Mode
        run: |
          npm install
          npm run validate-strict-mode
      - name: Fail if score < 80
        run: |
          # Check compliance score
          # Exit 1 if score < 80
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Validating Strict Mode documentation..."
npm run validate-strict-mode

if [ $? -ne 0 ]; then
  echo "❌ Strict Mode validation failed"
  exit 1
fi

echo "✅ Strict Mode validation passed"
```

---

## FAQ

### Q: 모든 함수에 Strict Mode를 적용해야 하나요?

**A**: 아니오. Public API와 핵심 기능에 적용하세요. Private 헬퍼 함수는 간소화된 문서로 충분합니다.

### Q: 에러 경험이 없으면 어떻게 하나요?

**A**: Private 심볼의 경우 빈 배열(`[]`)로 두어도 됩니다. Public API는 최소 1개 권장.

### Q: 미래 계획이 확정되지 않았다면?

**A**: `status: 'planned'`로 두고 우선순위만 설정하세요. 나중에 업데이트 가능합니다.

### Q: JSONL과 DB가 불일치하면?

**A**: JSONL이 SSOT입니다. `importFromJSONL()`로 DB를 재구축하세요.

---

## 다음 단계

1. ✅ [examples/strict-mode-example.ts](./examples/strict-mode-example.ts) 실행
2. ✅ 기존 코드에 Strict Mode 적용
3. ✅ CI/CD 파이프라인에 검증 추가
4. ✅ 팀 컨벤션으로 채택

---

## 참고 자료

- [Architecture Decision Records](https://adr.github.io/)
- [Design by Contract](https://en.wikipedia.org/wiki/Design_by_contract)
- [JSONL Format](http://jsonlines.org/)
