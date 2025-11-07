# Mermaid Diagram Syntax Rules

**목적**: GitHub와 mermaid-cli에서 안정적으로 렌더링되는 다이어그램 작성 규칙

**검증 도구**: `bash scripts/validate-mermaid.sh`

---

## ❌ 금지된 문법

### 1. 괄호 (Parentheses)
```mermaid
# ❌ 잘못된 예시
Node[Function call: foo()]
Node[Visit B (from A)]
Node[Time: O(n)]

# ✅ 올바른 예시
Node[Function call: foo-call]
Node[Visit B from A]
Node[Time: O-n]
```

**이유**: 노드 레이블 내부의 괄호는 파서 에러 발생

---

### 2. 중괄호 (Curly Braces)
```mermaid
# ❌ 잘못된 예시
Node[visited: {A, B, C}]
Node[Object.entries()]
Node[interface {name, type}]

# ✅ 올바른 예시
Node[visited: SET-A-B-C]
Node[Object-entries method]
Node[interface with name and type]
```

**이유**: 중괄호는 Mermaid 문법과 충돌

---

### 3. 대괄호 (Square Brackets)
```mermaid
# ❌ 잘못된 예시
Node[Array: [A, B, C]]
Node[List: [item1, item2]]

# ✅ 올바른 예시
Node[Array: A-B-C]
Node[List: item1-item2]
```

**이유**: 대괄호는 노드 정의 구문과 충돌

---

### 4. @ 기호
```mermaid
# ❌ 잘못된 예시
Node[@doc tag]
Node[@core/user module]
Node[@problem, @solution]

# ✅ 올바른 예시
Node[doc tag annotation]
Node[core-user module]
Node[problem and solution tags]
```

**이유**: @ 기호는 특수 문법 예약어

---

### 5. 이중 대괄호 (Double Brackets)
```mermaid
# ❌ 잘못된 예시
Node[[[Symbol]] reference]
Node[Doc: [[AuthSystem]]]

# ✅ 올바른 예시
Node[Symbol reference]
Node[Doc: AuthSystem]
```

**이유**: 위키 스타일 링크 문법과 충돌

---

### 6. Big-O 표기법
```mermaid
# ❌ 잘못된 예시
Node[Complexity: O(n)]
Node[Time: O(n²)]
Node[Space: O(V+E)]

# ✅ 올바른 예시
Node[Complexity: O-n]
Node[Time: O-n²]
Node[Space: O-V+E]
```

**규칙**: 괄호를 `-`로 대체

---

### 7. 퍼센트 표기
```mermaid
# ❌ 잘못된 예시
Node[Coverage: (80%)]
Node[Improved: (-44%)]

# ✅ 올바른 예시
Node[Coverage: 80pct]
Node[Improved: -44pct]
```

**규칙**: `(%)`를 `pct`로 대체

---

### 8. 메서드 호출 구문
```mermaid
# ❌ 잘못된 예시
Node[obj.method()]
Node[foo.bar.baz()]
Node[console.log()]

# ✅ 올바른 예시
Node[obj-method-call]
Node[foo-bar-baz-call]
Node[console-log]
```

**규칙**: 점(`.`)과 괄호 제거, `-`로 연결

---

### 9. 박스 그리기 문자
```mermaid
# ❌ 잘못된 예시
Node[┌─────┐<br/>│ Item │<br/>└─────┘]

# ✅ 올바른 예시
Node[Item Box<br/>Content here]
```

**이유**: 특수 유니코드 문자는 렌더링 문제 발생 가능

---

### 10. 화살표 기호
```mermaid
# ❌ 잘못된 예시
Node[A → B → C]
Node[Result → Success]

# ✅ 올바른 예시
Node[A to B to C]
Node[Result leads to Success]
```

**규칙**: `→`를 `to` 또는 화살표 연결로 대체

---

## ✅ 권장 문법

### 1. 노드 레이블
```mermaid
# 단순 텍스트
Node[Simple text label]

# 줄바꿈 (허용)
Node[Line 1<br/>Line 2<br/>Line 3]

# 따옴표로 감싸기 (특수문자 회피)
Node["Text with special chars"]
```

---

### 2. Subgraph 제목
```mermaid
# ✅ 올바른 예시
subgraph "📊 Title Here"
    ...
end

subgraph "Category 1: Overview"
    ...
end

# ❌ 괄호 사용 금지
subgraph "Function (Recursive)"  # 에러
```

**규칙**: 이모지 사용 가능, 괄호는 `-`로 대체

---

### 3. 연결 레이블
```mermaid
# ✅ 올바른 예시
A -->|Yes| B
A -->|No - First time| C
A -->|Check complete| D

# ❌ 괄호 사용 금지
A -->|Yes (confirmed)| B  # 에러
```

---

### 4. 스타일링
```mermaid
# ✅ 클래스 스타일 정의
classDef critical fill:#ff6b6b,stroke:#c92a2a
class Node1,Node2 critical

# ✅ 직접 스타일
style Overview fill:#8b5cf6,stroke:#6d28d9
```

---

## 🔄 변환 규칙 요약

| 원본 | 변환 | 예시 |
|------|------|------|
| `()` | 제거 또는 `-` | `foo()` → `foo-call` |
| `{}` | 제거 또는 `SET-` | `{A,B}` → `SET-A-B` |
| `[]` | 제거 또는 `-` | `[A,B]` → `A-B` |
| `@` | 제거 | `@doc` → `doc` |
| `[[]]` | 제거 | `[[Symbol]]` → `Symbol` |
| `O(n)` | `O-n` | `O(n²)` → `O-n²` |
| `(%)` | `pct` | `(80%)` → `80pct` |
| `obj.method()` | `obj-method-call` | `foo.bar()` → `foo-bar-call` |
| `→` | `to` | `A → B` → `A to B` |

---

## 🛠️ 개발 워크플로우

### 1. 다이어그램 작성
```bash
# 새 다이어그램 생성
vim .tsdoc/diagrams/my-diagram.mmd
```

### 2. 문법 검증
```bash
# 단일 파일 검증
npx mmdc -i .tsdoc/diagrams/my-diagram.mmd -o /tmp/test.svg

# 전체 검증
bash scripts/validate-mermaid.sh
```

### 3. 에러 발생 시
```bash
# 상세 에러 확인
bash scripts/check-errors.sh

# 에러 라인 확인
npx mmdc -i .tsdoc/diagrams/my-diagram.mmd -o /tmp/test.svg 2>&1 | grep "Parse error"
```

### 4. 일괄 수정 (필요시)
```bash
cd .tsdoc/diagrams

# O(n) 표기법 수정
sed -i.bak 's/O(n)/O-n/g' *.mmd

# 괄호 있는 퍼센트 수정
sed -i.bak 's/(\\([0-9-]*%\\))/\\1pct/g' *.mmd

# 백업 파일 정리
rm -f *.bak
```

---

## 📋 체크리스트

다이어그램 커밋 전 확인사항:

- [ ] `bash scripts/validate-mermaid.sh` 실행하여 24/24 통과 확인
- [ ] 괄호 `()`, `{}`, `[]` 사용하지 않음
- [ ] @ 기호 사용하지 않음
- [ ] Big-O 표기법은 `O-n` 형식 사용
- [ ] 메서드 호출은 `method-call` 형식 사용
- [ ] 퍼센트는 `pct` 형식 사용

---

## 🔍 디버깅 팁

### 에러 메시지별 해결법

**"Expecting 'SQE', got 'PS'"**
→ 노드 레이블에 괄호 `()` 사용됨. 제거 필요.

**"Expecting 'TAGEND', got 'DIAMOND_START'"**
→ 중괄호 `{}` 사용됨. 제거 필요.

**"Parse error on line X"**
→ 해당 라인과 주변 확인:
```bash
sed -n 'X-2,X+2p' .tsdoc/diagrams/file.mmd
```

---

## 📚 참고 자료

- **Mermaid 공식 문서**: https://mermaid.js.org/
- **GitHub Mermaid 지원**: https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/
- **프로젝트 검증 스크립트**: `scripts/validate-mermaid.sh`
- **에러 확인 스크립트**: `scripts/check-errors.sh`

---

**마지막 업데이트**: 2025-11-07
**검증 상태**: 24/24 diagrams passing ✅
