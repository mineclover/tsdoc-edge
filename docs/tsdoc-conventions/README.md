# TSDoc Conventions

tsdoc-edge 프로젝트에서 준수해야 할 TSDoc 문서화 규칙 모음입니다.

## 개요

이 디렉토리는 TSDoc 작성 시 반드시 지켜야 할 컨벤션을 문서화합니다.
각 규칙은 별도의 문서로 관리되며, 명확한 예시와 함께 제공됩니다.

## 규칙 목록

### 필수 규칙 (MUST)

| 규칙 ID | 규칙 이름 | 파일 |
|---------|-----------|------|
| CONV-01 | Summary Section과 태그 사이 빈 줄 필수 | [01-blank-line-before-tags.md](./01-blank-line-before-tags.md) |
| CONV-02 | Summary Section 필수 | [02-summary-required.md](./02-summary-required.md) |
| CONV-03 | Public API는 @public 태그 필수 | [03-public-tag-required.md](./03-public-tag-required.md) |
| CONV-04 | 함수는 @returns 태그 필수 | [04-returns-tag-required.md](./04-returns-tag-required.md) |
| CONV-05 | 파라미터 문서화 필수 | [05-parameter-documentation.md](./05-parameter-documentation.md) |

### 권장 규칙 (SHOULD)

| 규칙 ID | 규칙 이름 | 파일 |
|---------|-----------|------|
| CONV-06 | @precondition, @postcondition 사용 권장 | [06-precondition-postcondition.md](./06-precondition-postcondition.md) |
| CONV-07 | @contract 사용 권장 | [07-contract-documentation.md](./07-contract-documentation.md) |

## 규칙 우선순위

1. **MUST (필수)**: 모든 코드에서 반드시 준수
2. **SHOULD (권장)**: Public API와 핵심 컴포넌트에서 준수
3. **MAY (선택)**: 필요에 따라 선택적으로 사용

## 검증 방법

```bash
# 전체 프로젝트 TSDoc 검증
npm run build
npx ts-node demo/self-validation.ts
```

## 새로운 규칙 추가

1. `XX-rule-name.md` 파일 생성 (번호는 순차적으로)
2. 규칙 템플릿 사용:
   ```markdown
   # CONV-XX: 규칙 이름

   ## 규칙 설명
   간단하고 명확한 설명

   ## ✅ 올바른 예시
   코드 예시

   ## ❌ 잘못된 예시
   코드 예시

   ## 이유
   왜 이 규칙이 필요한가

   ## 참고
   관련 문서 링크
   ```
3. README.md 규칙 목록에 추가

## 참고 자료

- [TSDoc 공식 문서](https://tsdoc.org/)
- [Microsoft TSDoc 플레이그라운드](https://microsoft.github.io/tsdoc/)
- [tsdoc-edge STRICT_MODE_GUIDE.md](../../STRICT_MODE_GUIDE.md)
