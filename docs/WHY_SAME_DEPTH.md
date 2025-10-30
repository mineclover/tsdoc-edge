# 왜 depth=0과 depth=1이 동일한가?

## 문제 상황

```bash
tsdoc-edge scan --depth=0  # 131개 심볼
tsdoc-edge scan --depth=1  # 131개 심볼 (동일!)
tsdoc-edge scan --depth=2  # 131개 심볼 (동일!)
```

모든 depth에서 같은 결과가 나온다.

---

## 원인 분석

### 데이터베이스 상태 확인

```sql
SELECT COUNT(*) FROM symbols;        -- 1192개
SELECT COUNT(*) FROM symbols WHERE is_exported = 1;  -- 131개
SELECT COUNT(*) FROM relationships;  -- 0개 ← 문제!
```

**relationships 테이블이 비어있음!**

### Depth 탐색 로직

```typescript
// DepthTraverser.traverse()
while (queue.length > 0) {
  const { symbolId, depth } = queue.shift();

  // 현재 depth의 심볼 추가
  symbolsByDepth.get(depth).push(symbol);

  // 다음 depth를 위해 의존성 가져오기
  const nextSymbols = this.getNextSymbols(symbolId, direction);
  // ↑ graphBuilder.getDependencies(symbolId) 호출
  //    relationships가 없으면 [] 반환

  for (const nextId of nextSymbols) {
    queue.push({ symbolId: nextId, depth: depth + 1 });
  }
}
```

**relationships가 비어있으면 `getDependencies()` → `[]` 반환**

### 예상 vs 실제

**예상 (relationships가 있다면)**:
```
depth=0: TSDocEdge (exported)
         ↓ depends-on
depth=1: TSDocParser, ConventionValidator, MarkdownGenerator
         ↓ depends-on
depth=2: DocComment, ValidationResult, etc.
```

**실제 (relationships가 없음)**:
```
depth=0: TSDocEdge (exported)
         ↓ depends-on = []  ← 빈 배열!
depth=1: (추가 심볼 없음)
         ↓ depends-on = []
depth=2: (추가 심볼 없음)
```

결과: 모든 depth에서 131개 exported 심볼만 반환

---

## 왜 relationships가 비어있나?

### analyze-self.ts 분석

```typescript
// demo/analyze-self.ts

for (const comment of parseResult.comments) {
  const symbol: Symbol = {
    id: `sym-${symbolIdCounter++}`,
    name: symbolName,
    // ... 기타 속성
  };

  dbManager.insertSymbol(symbol, 0);  // ✅ 심볼 추가
  // ❌ relationships 추가 안 함!
}
```

**relationships를 추출하지 않음!**

### 필요한 작업

relationships를 추출하려면:

1. **TypeScript AST 파싱**
   ```typescript
   import * as ts from 'typescript';

   // import 문 분석
   if (ts.isImportDeclaration(node)) {
     // TSDocEdge가 TSDocParser를 import
     // → relationship 추가
   }

   // 타입 참조 분석
   if (ts.isTypeReferenceNode(node)) {
     // Symbol 타입이 ContractSpec을 참조
     // → relationship 추가
   }
   ```

2. **클래스 멤버 변수 분석**
   ```typescript
   class TSDocEdge {
     private parser: TSDocParser;  // depends-on TSDocParser
     private validator: ConventionValidator;  // depends-on ConventionValidator
   }
   ```

3. **함수 파라미터/반환 타입 분석**
   ```typescript
   function process(symbol: Symbol): ValidationResult {
     // depends-on Symbol, ValidationResult
   }
   ```

---

## 해결 방법

### 옵션 1: 간단한 import 분석 (빠름)

```typescript
// 소스 코드에서 import 문만 추출
const importRegex = /import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
const matches = sourceCode.matchAll(importRegex);

for (const match of matches) {
  const importPath = match[1];
  // './parser/TSDocParser' → TSDocParser
  // → relationship 추가
}
```

**장점**: 구현 쉬움, 빠름
**단점**: 타입 참조, 상속 관계 누락

### 옵션 2: TypeScript Compiler API (정확)

```typescript
import * as ts from 'typescript';

const program = ts.createProgram([filePath], {});
const sourceFile = program.getSourceFile(filePath);
const checker = program.getTypeChecker();

function visit(node: ts.Node) {
  // Import 분석
  if (ts.isImportDeclaration(node)) {
    extractImportRelationship(node, checker);
  }

  // 타입 참조 분석
  if (ts.isTypeReferenceNode(node)) {
    extractTypeRelationship(node, checker);
  }

  // 클래스 상속/구현 분석
  if (ts.isClassDeclaration(node)) {
    extractClassRelationships(node, checker);
  }

  ts.forEachChild(node, visit);
}

visit(sourceFile);
```

**장점**: 완전한 관계 추출
**단점**: 복잡, 느림

### 옵션 3: 기존 demo 스크립트 활용

```bash
# 이미 relationships를 추출하는 스크립트가 있음
demo/parse-core-classes.ts
demo/dependency-demo.ts
```

이것들을 확장해서 전체 프로젝트 스캔

---

## 실증 예시 (relationships가 있다면)

### 시나리오: TSDocEdge 진입점

```bash
tsdoc-edge scan --entry=TSDocEdge --depth=2
```

**예상 결과**:
```
Level 0: Entry Points (1개)
├─ TSDocEdge

Level 1: Direct Dependencies (3개)
├─ TSDocParser
├─ ConventionValidator
└─ MarkdownGenerator

Level 2: Indirect Dependencies (5개)
├─ DocComment (@microsoft/tsdoc)
├─ TSDocConfiguration
├─ ValidationResult
├─ DocNode
└─ ParseResult

Total: 9 symbols across 3 levels
```

**현재 결과**:
```
Level 0: Entry Points (1개)
└─ TSDocEdge

Total: 1 symbol across 1 level
```

---

## 결론

### 현재 상황
- ✅ 심볼 추출: 성공 (1192개)
- ✅ exported 판별: 성공 (131개)
- ❌ 관계 추출: 실패 (0개)
- ❌ depth 탐색: 동작 안 함

### 해결하려면
1. analyze-self.ts에 relationship 추출 로직 추가
2. 또는 기존 demo/dependency-demo.ts 확장
3. TypeScript AST 파싱으로 정확한 의존성 추출

### 우선순위
depth 기능이 핵심이라면 **relationships 추출이 필수**
단순히 exported 심볼 문서화면 **현재 상태로도 충분**

---

## 다음 단계 제안

```bash
# 1. relationships 추출 스크립트 작성
demo/extract-relationships.ts

# 2. 재분석
npx ts-node demo/extract-relationships.ts

# 3. 재실행
tsdoc-edge scan --depth=1 --output=docs/DEPTH1_WITH_RELATIONSHIPS.md

# 4. 비교
diff docs/GENERATED_DEPTH0.md docs/DEPTH1_WITH_RELATIONSHIPS.md
```

relationships 추출을 구현하시겠습니까?
