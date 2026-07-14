---
title: Document Validation Warning Policy
type: workflow
category: governance
status: active
canonical: true
---

# [[Document Validation Warning Policy]]

`validate-docs managed`의 warning은 오류와 같은 의미가 아니다. 이 문서는 문서 구조를
개선해야 하는 경고와 설계 문서 특성상 허용되는 경고를 구분하고, baseline을 재현 가능하게
관리한다. 정적 품질 규칙의 실행 계약은 [[Lint Governance]]가 소유하고, 이 문서는 문서
검증 warning의 disposition과 baseline을 소유한다.

## Current baseline

2026-07-14 기준 검증 결과:

| Warning type | Count | Default disposition |
| --- | ---: | --- |
| `unused_definition` | 0 | 현재 기능·인덱스 문서의 canonical 탐색 경로 정리 완료 |
| `many_references` | 33 | 허브 문서에는 허용; 실제 과대 책임일 때만 분리 |
| `no_code_impl` | 0 | 구현 문서는 source/code link 확인; 비적용 문서는 명시적 disposition 필요 |
| **Total** | **33** | 오류 0건이어야 통과 |

이 숫자는 현재 작업 트리에서 `node dist/cli.js validate docs managed`를 실행한 snapshot이다.
문서 추가·삭제나 canonical registry 갱신으로 변할 수 있으며, 제품 coverage baseline으로
해석하지 않는다.

## Handling rules

### `unused_definition`

- `historical`, `planned`, 보조 index 문서의 고립된 정의는 허용한다.
- 현재 기능 문서가 고립되면 index 또는 관련 구현 문서에서 최소 한 개의 의도적인 참조를
  추가한다.
- 단순히 자기 자신을 참조해 경고를 숨기지 않는다.

### `many_references`

- `Coverage Metrics Contract`, README, index, guide처럼 라우팅 허브인 문서는 허용한다.
- 구현 책임이 섞인 문서에서만 section 또는 하위 문서 분리를 검토한다.
- 이 경고를 0으로 만드는 것은 목표가 아니다. 링크 허브의 실제 역할을 보존해야 한다.

### `no_code_impl`

- 개념·가이드·워크플로·관계 문서는 코드 구현을 요구하지 않는다.
- 단일 구현 owner가 없는 문서는 frontmatter에 `codeImplementation: not-applicable`을 명시한다.
- 현재 구현을 설명하는 analyzer/command/type 문서는 `@doc` 또는 관리 문서의 source 연결을
  확인한다.
- `codeImplementation: not-applicable`은 warning을 숨기는 전역 예외가 아니라 문서별
  disposition이며, 실제 구현을 설명하는 문서에는 사용하지 않는다.
- 역사 문서는 `status: historical`과 현재 owner를 함께 기록하고, 없는 구현을 복원하지
  않는다.

## Gate policy

문서 검증의 gate는 `Errors == 0`이다. warning budget은 다음 단계에서 유형별로 별도 관리한다.

1. 새 `missing_primary`, `orphaned_auxiliary` 오류는 즉시 실패한다.
2. 기존 warning을 줄이는 변경은 warning 유형과 대상 파일을 함께 기록한다.
3. 허용 warning은 숨기지 않고 baseline과 disposition을 유지한다.
4. coverage metric이나 graph policy의 pass/fail을 document validation warning 수와 합산하지
   않는다.

## Next cleanup slice

현재 기능·인덱스 문서의 `unused_definition`과 `no_code_impl`은 0건으로 닫혔다. 관리 문서의
frontmatter `source`와 본문 `**Source**:`를 모두 code connection 입력으로 사용하고,
단일 구현 owner가 없는 문서는 `codeImplementation: not-applicable`을 명시한다. 현재 남은
warning은 링크 허브의 `many_references` 33건이며, 새 warning 증가만 다음 cleanup에서
선별한다.
