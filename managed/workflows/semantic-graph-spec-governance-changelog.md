---
title: Semantic Graph Spec Governance Changelog
type: changelog
category: workflows
status: active
canonical: true
---

# [[Semantic Graph Spec Governance Changelog]]

[[Semantic Graph Spec Governance Roadmap]]의 날짜별 결정과 변경 기록이다. 완료 checkpoint의
proof와 남은 gate는 [[Semantic Graph Spec Governance Completed Work]]에서 관리한다.

## 2026-07-12

- roadmap을 architecture spec과 세부 구현 목록에서 실행 SSOT 중심으로 축약했다.
- 선형 Phase를 Comparison, Product, Provider, Release 병렬 lane과 join gate로 바꿨다.
- 상태를 `planned → kernel → wired → proven`으로 통일했다.
- JSON bootstrap source와 managed-document spec SSOT를 분리했다.
- P4.1 evidence loop, P4.2 naming, P4.3 TSDoc, P4.4 managed spec, P4.5 retained history의
  source-checkout checkpoint를 확정했다.
- Node 24를 package/CI baseline으로 선택하고 clean-install matrix 전 stable release NO-GO를
  명시했다.
- legacy production path는 C2 owner 판정과 external pilot 뒤 제거 또는 canonical enrichment로
  이관하도록 결정했다.
- checkpoint 계획 리뷰, proof 기준 커밋 단위와 closeout staged-set 검토 규칙을 추가했다.
- current saved LSP diagnostics와 historical Explain/Open gate를 분리했다.
- convention distribution registry는 external install canary 이후로 미뤘다.

## 2026-07-13

- packed external saved CLI/CI pilot과 packed `dist/index` public API parity를 추가했다.
- self-repository CLI/library parity와 persisted state 불변 검증을 추가했다.
- Node 24 engine, `better-sqlite3` native query, packed file-set runtime preflight를 CI/release에
  연결했다.
- LSP navigation proof와 추가 LSP surface는 ttsc provider stable gate 전까지 보류했다.
- versioned `work-context` differential fixture로 C1 legacy baseline을 닫았다.
- release workflow에 Ubuntu/macOS typecheck/test matrix와 OS별 clean build/packed-consumer
  qualification을 연결했다. 실제 runner matrix 통과 전 stable release NO-GO를 유지한다.

## 2026-07-14

- LSP 보류 범위를 재검토했다. `GraphDelta`/`EffectiveCodeGraphView`의 multi-file effective
  overlay와 dirty/save generation guard, overlay-aware navigation/impact/diagnostics는 이미
  source-checkout proof가 있으므로 `proven (read-only)`로 올렸다. saved convention/graph-lint
  diagnostic과 Explain/Open CodeAction도 retained exact revision 경로로 동작한다. ttsc
  graph-lint/spec를 미저장 overlay에 재평가하는 parity와 mutating CodeAction은 계속 deferred다.
- C2 owner promotion을 재검토했다. candidate matrix의 4 capabilities, 2 fixtures, 9 failure
  canaries와 packed provider contract `1.6` 연결은 통과했지만 `ownerPromotionEligible: false`다.
  최신 원격 CI도 이전 SHA의 실패 run뿐이므로, 성공한 Ubuntu/macOS × in-band/worker-2 × 2회
  matrix와 candidate SHA가 전달되기 전에는 owner 승격이나 legacy production 제거를 하지 않는다.
- 최신 local release preflight는 ttsc/provider/canonical-safety/differential/C2와 in-band를
  통과한 뒤 worker-2의 `EnhancedDocExtractor.test.js`에서 간헐 SIGSEGV로 중단됐다. 실패
  envelope는 `.test-results/release-preflight-82408.json`에 보존했고, 동일 worker-2 단독
  재실행은 240 suites/3,093 tests를 통과했으므로 기능 회귀와 runtime qualification blocker를
  분리해 기록한다.

- packed ttsc provider canary에 upstream graph-lint rule 평가와 convention gate를 추가했다.
  CLI와 public library가 동일 graph-lint report를 사용하고, fresh packed consumer에서
  zero-violation 결과를 확인하도록 contract를 `1.6`으로 올렸다.
- semantic graph architecture와 convention-pack 문서의 stale한 `P4.1 미연결` 및
  `managed spec 미연결` 표현을 현재 구현과 일치시켰다. ttsc saved CLI/CI 경로는 구현 완료로
  기록하고, LSP effective-overlay/CodeAction만 명시적 보류 범위로 남겼다.
- 외부 CI 실패 로그를 재감사해 macOS ARM64 `npm ci` 뒤 Biome optional native package가 없어
  lint가 시작되지 않는 운영 결함을 확인했다. `verify:platform-toolchain`의 실제 누락 복구를
  재현 검증하고, release qualification verifier가 CI/Release에서 해당 복구 단계가 lint보다
  먼저 실행되는지 순서까지 검사하도록 보강했다.
- durable convention history retention을 닫았다. `convention retention list|pin|unpin|gc`를
  추가하고, 명시적 cutoff·dry-run·pin 보호·payload digest tombstone·fail-closed replay를
  연결했다. pre-retention DB는 읽을 수 있지만 timestamp가 없는 legacy row는 자동 GC 대상이
  아니다.
- coverage metric policy에 명시적 비율 threshold를 연결했다. `metric.id=fraction` 선언은
  canonical report와 함께 retained replay에 보존되고, direct evidence의 미달은 `violated`,
  inferred evidence는 계속 `indeterminate`로 처리된다.
- C2 capability owner envelope를 versioned fixture와 read-only validator로 추가했다. structural
  topology/symbol identity는 `superseded`, documentation/test enrichment는 `retained`,
  work-context output은 `composed` candidate로 기록했으며, release matrix 전 production
  removal은 승격하지 않는다.
- naming policy migration을 닫았다. source symbol rules를 error로 승격하고, UPPER_SNAKE_CASE
  constant와 PascalCase schema value 예외를 설정 가능한 정책으로 모델링했다. 현재 canonical
  graph 1,014 subjects에서 naming finding 0건을 확인했다.
- retention/threshold 변경 후 full in-band Jest 재실행은 summary 전에 exit `1`로 종료되어
  reproducibility blocker로 기록했다. 변경된 3개 suite/28개 테스트, typecheck와 packed
  ttsc/library proof는 통과했으며, 기존 parallel native crash와 함께 release matrix에서
  재검증한다.
- 최신 source-checkout 재검증에서는 in-band와 `maxWorkers=2`가 각각 한 차례 232 suites/3,056
  tests를 통과했으나, 반복 실행에서 in-band와 `EnhancedDocExtractor.test.js` worker가 각각
  `SIGSEGV`로 종료됐다. `test:run`이 Node/V8/ABI와 exact command를 `.test-results` envelope로
  남기고 CI가 artifact로 업로드하도록 진단 경로를 추가했다.
- P4.4 managed spec runtime promotion을 닫았다. `spec extract`가 만든 active SpecGraph revision을
  policy-only convention pack의 `--spec-db` 입력으로 선택하고, managed mode의 JSON spec 중복
  authoring과 workspace mismatch를 거부한다.
- `validate docs`의 missing symbol feedback을 정리했다. `docs/` 문서의 primary symbol을
  명시하고, validator가 `managed/` canonical primary definition을 reference-only로 preload해
  cross-tree 참조를 해석하도록 했다.
- `TSDoc Symbol Parser`와 `SymbolGraph` legacy alias를 각각 `DocumentSymbolParser`와
  `SymbolGraphBuilder` canonical 이름으로 교정했다.
- missing error 13건을 0건으로 줄였고, cross-tree resolution 회귀 테스트를 추가했다. 안내문
  primary 3건의 `no_code_impl`은 error가 아닌 warning으로 남긴다.
- coverage metric report/baseline 운영 경로를 닫았다. `coverage-baseline` 명시적 저장·비교와
  `convention check --coverage-report-id --coverage-gate` direct-evidence gate를 연결하고,
  inferred evidence는 `indeterminate`로 retained replay에 보존한다.
- coverage baseline 운영 조회를 완성했다. `coverage-baseline list|read`를 추가해 active pointer
  없이 retained pin과 exact baseline payload를 read-only로 확인하며, fresh packed consumer canary
  contract `1.4`에서 save/compare/list/read와 기존 state 불변을 재검증했다.
- coverage report 운영 조회를 완성했다. `coverage-report list|read`를 추가해 immutable report
  pin과 exact source/metric payload를 read-only로 확인하고, packed canary contract `1.5`에서
  report inspection부터 baseline save/compare/list/read까지의 전체 흐름을 재검증했다.
- 최신 로컬 release preflight를 재검증했다. 14개 단계, in-band/worker 각각 235 suites/3,070
  tests, packed ttsc canary contract `1.5`가 모두 통과했다. 외부 Ubuntu/macOS × 두 실행 방식 ×
  두 반복 matrix와 C2 owner 승격은 여전히 release gate로 남긴다.
- LSP extension과 GraphDelta topology smoke는 ttsc 중심 제품 범위에서 보류 backlog로 이동했다.
  현재 active roadmap은 Node/OS release qualification과 C2 capability owner matrix만 유지한다.
- 현재 macOS Node 24 재검증에서 두 lane은 각각 232 suites/3,056 tests를 통과한 실행이 있었지만,
  반복 실행에서 in-band와 `EnhancedDocExtractor.test.js` worker의 간헐적 native `SIGSEGV`로
  실패했다.
  기존 release workflow와 native-crash NO-GO를 유지하고, 이를 stable release blocker로 기록한다.
- P4.3의 모호한 `general enrichment framework` 잔여 문구를 정리했다. 현재 TSDoc provider와
  immutable enrichment revision/store wiring은 완료이며, 추가 provider가 실제 요구로 승인될
  때만 별도 typed checkpoint를 연다. generic adapter/DSL과 provider registry는 계속 no-go다.
- packed ttsc provider canary를 contract `1.1`로 확장했다. fresh consumer에서 convention
  history retention lifecycle과 coverage report/baseline save·compare를 CLI로 실행하고, 동일한
  graph revision/fingerprint와 legacy state 불변을 확인한다.
- C2 capability owner validator를 CI의 publish-check와 release의 packed-consumer qualification에
  연결했다. matrix는 read-only candidate evidence와 8개 failure canary를 반복 검증하지만,
  실제 owner 승격과 legacy removal은 broader fixture 및 Node/OS matrix 뒤로 유지한다.
- release의 최종 중복 test 단계에도 native runtime diagnostics artifact 업로드를 연결해,
  qualification matrix 이후 publish job에서 재현되는 crash도 Node/V8/ABI envelope로 보존한다.
- C2 broader fixture gate를 닫았다. 6-symbol interface/class/function fixture를 추가하고
  differential verifier의 fixture 선택·primary symbol metadata를 확장했으며, 기존 4-symbol
  fixture와 함께 parity 4/0·6/0 및 production state 불변을 확인한다. CI/release publish gate도
  두 differential fixture와 2-fixture C2 matrix를 실행한다.
- C2 failure-canary coverage도 4개에서 8개로 확장했다. 기존 required evidence 누락과 새
  `fixtureSet` 최소 2개 invariant를 각각 의도적으로 깨뜨려 validator가 모두 거부하는지 확인한다.
- C2 evidence envelope가 각 capability에서 packed ttsc provider canary contract
  `tsdoc-edge/ttsc-provider-packed-canary@1.5`를 참조하도록 고정했다. validator는 canary source의
  동일 ID/version과 required proof key를 정적으로 확인하고, evidence contract ref 누락 canary를
  추가했다. 이는 외부 Ubuntu/macOS runner 결과나 owner 승격을 대체하지 않는다.
- `verify:release-qualification`을 추가해 CI/release workflow의 Ubuntu/macOS × 실행 방식 ×
  반복 횟수 matrix, 필수 ttsc/package/canonical-safety/differential/C2 command, diagnostics artifact와 publish
  dependency wiring을 정적으로 검증한다. 이 검증은 실제 GitHub runner matrix 결과를 대체하지 않는다.
- macOS arm64 runner에서 `npm ci` 후 Biome optional native CLI가 누락되는 운영 실패를 확인하고,
  `verify:platform-toolchain`이 현재 플랫폼의 Biome CLI를 감지·필요 시 재설치하도록 CI lint 전에
  연결했다. 이 preflight는 lint/toolchain 설치 문제를 test 결과와 분리한다.
- parser/types 경로에서 실행되는 `TSDoc Spec Test` workflow도 Node 24/actions v4, ttsc typecheck,
  in-band test와 runtime diagnostics artifact를 사용하도록 정렬했다. 오래된 Node 18 경로가
  release baseline과 다른 실행 결과를 만들지 않도록 qualification contract에 포함했다.
- 원격 CI run `29231229473`과 TSDoc Spec Test run `29231229477`의 실패를 재분석했다. 상대
  canonical ID를 기대하던 stale LSP assertion, macOS arm64 Biome optional CLI 누락, worker
  `SIGSEGV`를 분리 기록했고, 현재 worktree의 namespace assertion/platform preflight/spec
  workflow 수정 후 외부 matrix 재실행을 다음 gate로 남겼다.
- 문서 warning cleanup slice를 적용했다. 활성 기능·명령 문서의 의도적인 교차 참조 5개를
  추가해 `unused_definition`을 43건에서 38건으로 줄였고, `many_references` 33건과 설계
  문서의 `no_code_impl` 122건은 warning policy에 따라 허용 baseline으로 유지했다. 현재
  `validate-docs managed`는 오류 0건, warning 193건이다.
- ttsc 운영 surface의 discoverability를 보강했다. 기본 `help --tree`가 canonical graph,
  coverage report/baseline와 convention input/retention, managed SpecGraph extract/graph
  subcommand를 노출하도록 정렬했고, `spec`/`ontology`의 도움말 alias(`sp`/`ont`)를 실제
  command registry에도 등록했다. HelpCommand 회귀 테스트 8개와 build 후 alias 실행을
  확인했다.
- legacy lint migration slice를 진행했다. cache/queue 조회와 relationship command의
  non-null assertion, unused variable/parameter, accumulating Set spread를 명시적 narrowing과
  in-place 교집합으로 교정해 `noNonNullAssertion` budget을 27건에서 0건으로 낮췄다. 현재
  중간 결과는 `UnifiedRelationship.properties`의 legacy `any` warning 1건과 info 25건이었다.
- 최종 source-checkout 회귀 확인을 완료했다. `build`, `typecheck`, lint warning budget,
  `help --tree` operator surface와 전체 in-band Jest가 통과했으며, 현재 전체 수치는 235 suites /
  3,074 tests passed이다. 이는 로컬 proof이며, 외부 Ubuntu/macOS × Node 24 반복 matrix와
  C2 owner 승격을 대체하지 않는다.
- `UnifiedRelationship.properties`를 `RelationshipProperties`와 JSON-compatible value contract로
  교체해 마지막 lint warning을 제거했다. 현재 전체 lint는 warning 0건/info 25건이며, opaque
  provider metadata는 `unknown` extension boundary로 보존한다.
- tag release의 최종 publish job이 Jest 기본 worker 모드와 lint 누락을 가지고 있던 것을
  보완했다. release job도 platform toolchain/lint를 실행하고, 최종 smoke test를
  `npm test -- --runInBand`로 고정해 qualification matrix와 같은 안정 모드를 사용한다.
- `verify:release-preflight`를 추가해 build/runtime 순서, platform toolchain, lint, packed
  consumer, ttsc provider, C1/C2 fixture와 in-band/worker Jest를 병렬 없이 한 번에 재실행할
  수 있도록 했다. 결과는 external matrix를 대체하지 않는 versioned preflight envelope로
  출력한다.
- 2026-07-14 preflight는 모든 ttsc/provider/differential/C2 사전 단계를 통과한 뒤 in-band
  native `SIGSEGV`로 중단됐다. 직후 두 단독 test lane은 각각 232 suites/3,057 tests를
  통과했으며, 간헐적인 Node/V8 native crash를 정상 통과로 완화하지 않고 외부 matrix
  blocker로 유지했다.
- ttsc test orchestration에 공통 process-group/bounded escalation을 추가해 compiler와 Jest
  nested child가 SIGINT/SIGTERM 뒤 고아로 남지 않도록 했다. C0 canonical safety proof도
  `verify:canonical-safety` 계약으로 고정해 schema-v1, alias/revision guard와 rollback/
  non-mutation 검증을 release preflight에 포함했다.
- 새 canonical-safety 단계까지 포함한 14-step `verify:release-preflight`가 통과했고, in-band와
  worker full suite가 각각 233 suites/3,059 tests를 통과했다. 외부 GitHub matrix는 여전히
  별도 release gate로 남긴다.
- `convention check --input-revisions-db`를 연결해 check가 생성한 evidence/enrichment/policy
  revision을 pointer-free 저장소에 exact pin으로 보존하도록 했다. 기존 history/replay authority와
  분리하고, 저장소·SQLite sidecar를 JSON output overwrite 보호 대상에 포함했으며, 저장/재조회와
  실패 시 history 미기록 순서를 명령 테스트로 검증했다.
- input-revision caller 회귀 테스트 2개를 포함한 현재 source-checkout in-band 전체 lane이
  233 suites/3,061 tests passed로 통과했다. 이 결과도 실제 GitHub Ubuntu/macOS 반복 matrix를
  대체하지 않는다.
- pointer-free input store에 `convention inputs list|read` read-only operator 경로를 추가했다.
  list는 plane/workspace별 metadata만 조회하고, read는 완전한 exact pin으로 payload를 조회한다.
  SpecGraphRepository의 기존 `spec extract`/`--spec-db` caller도 확인해 roadmap의 stale `kernel`
  상태를 source-checkout `proven`으로 정렬했다.
- read-only input inspection 회귀 테스트를 포함한 현재 in-band 전체 lane은 233 suites/3,062
  tests passed로 통과했다. 외부 Ubuntu/macOS 반복 matrix는 여전히 별도 gate다.
- 같은 source-checkout release preflight를 재실행한 결과 ttsc/provider/canonical-safety/
  differential/C2 사전 단계는 통과했지만 in-band Jest가 macOS arm64 Node 24.18.0에서
  `SIGSEGV`(exit 139)로 종료됐다. `.test-results/test-runtime-failure-12310.json`의
  `tsdoc-edge/test-runtime-failure` envelope를 남기고 native-crash blocker를 유지한다.
- canonical graph 저장소에 retained revision summary와 read-only operator CLI를 추가했다.
  `canonical-graph status|list|read`는 active marker, provenance/count, exact graph envelope를
  조회하며 SQLite schema나 active pointer를 변경하지 않는다.
- canonical graph inspection 추가 후 emitted test surface는 234 suites/3,066 tests가 됐다.
  targeted 2 suites/21 tests와 typecheck/build/lint, 실제 dist CLI status/list/read smoke는
  통과했지만 독립 full in-band는 Node 24 macOS arm64 `SIGSEGV`로 종료되어
  `.test-results/test-runtime-failure-48224.json`에 기록했다.
- packed ttsc provider canary를 contract `1.4`로 갱신해 설치된 dist CLI에서도
  `canonical-graph status|list|read`가 active marker, retained summary와 exact payload를
  재현하는지 검증했다. 두 packed consumer 모두 통과했으며, SpecGraph extraction 직후
  `spec graph status|list|read`의 active marker, retained summary와 exact payload도 같은
  packed canary에서 검증했다.
- SpecGraph inspection suite 추가 후 emitted surface는 235 suites/3,069 tests가 됐다.
  spec graph targeted 3 suites/31 tests, build, lint와 contract `1.4` packed canary는 통과했으며,
  full native-crash qualification은 기존 Node 24 macOS arm64 blocker로 남아 있다.
- coverage baseline CLI에 `list|read`를 추가해 immutable baseline pin과 exact payload를
  read-only로 조회할 수 있게 했다. targeted coverage command/storage 2 suites/5 tests와
  packed canary contract `1.4`의 baseline inspection proof를 통과했다.
- coverage report inspection이 legacy symbol DB를 생성하지 않는 lazy read-only 경로를 사용하고,
  unknown option/extra positional argument를 fail-closed로 거부하도록 정렬했다. coverage
  baseline save도 source report 확인 전 writable baseline DB를 만들지 않도록 순서를 고정했다.
- 위 운영 경계 변경을 포함한 최신 `verify:release-preflight`가 14개 단계를 통과했다. in-band와
  worker lane은 각각 235 suites/3,072 tests를 통과했으며, 외부 Ubuntu/macOS 반복 matrix와
  C2 owner 승격은 여전히 별도 gate다.
- ttsc provider 경계를 외부 qualification에서도 검증하도록 CI publish-check와 release
  packed-consumer job에 `mineclover/ttsc-ex` checkout, graph-router build, packed provider canary를
  연결했다. `verify:release-qualification` 정적 계약에도 checkout/build/canary 검사를 추가했다.
- provider checkout을 moving `master`에서 `00af8c163bd9fbe8b726a8b3a6252450f50d6274` immutable
  ref로 고정했다. CI/release qualification validator도 동일 ref를 요구해 provider graph-router
  build와 packed canary의 재현 가능한 입력을 보장한다.
- 최신 `verify:release-preflight`는 ttsc/provider/canonical-safety/differential/C2 단계와 in-band
  235 suites/3,072 tests를 통과했지만, worker lane은 234 suites/3,069 tests 뒤 macOS arm64
  Node 24.18.0 native `SIGSEGV`로 종료됐다. `.test-results/test-runtime-failure-15461.json`에
  exact runtime envelope를 남겼고, native-crash blocker와 external matrix/C2 승격 gate는
  그대로 유지한다.
- `verify:release-preflight`가 성공과 실패 모두 `.test-results/release-preflight-<pid>.json`에
  contract `1.1` 단계별 evidence envelope를 저장하도록 보강됐다. 실패 시 failed step, 완료된
  단계, runtime과 재진입 가능한 output 경로를 보존하며, 외부 matrix 요구는 그대로 유지한다.
- 실제 최신 preflight에서 contract `1.1` envelope 저장을 확인했다. 14개 단계 중 13개와 in-band
  235 suites/3,072 tests는 통과했으며, worker lane은 `ConventionCheckHistoryRepository.test.js`와
  `PreCommitRunCommand.test.js`의 native `SIGSEGV`로 233 suites/3,062 tests에서 실패했다.
  `.test-results/release-preflight-41285.json`과 `.test-results/test-runtime-failure-49791.json`을
  재진입 evidence로 보존한다.
- 저장된 preflight envelope를 재실행 없이 검증하는 read-only
  `verify:release-preflight-envelope` inspector를 추가했다. exact 14-step 순서, status/failedStep,
  runtime과 external-matrix requirement를 검증하며 production state를 변경하지 않는다.
- preflight를 repository root 기준으로 실행하도록 고정하고, 성공 결과를 evidence 파일에
  저장하지 못하면 성공으로 보고하지 않도록 fail-closed 경계를 보강했다.
- 변경 후 preflight는 13개 단계와 in-band 235 suites/3,072 tests를 통과했으며, worker lane은
  `ParseCommand.test.js` native `SIGSEGV`로 234 suites/3,069 tests에서 종료됐다. 실패 스위트가
  이전 실행과 달라 native-crash blocker를 유지하고 최신 envelope를
  `.test-results/release-preflight-current.json`에 보존했다.
- Jest 운영 lane에 command-test stdout 억제(`silent`)와 `workerIdleMemoryLimit: 256MB`를
  적용해 장시간 worker의 native compiler/database 상태를 재활용하도록 했다. 수정 후 최신
  `verify:release-preflight`는 14/14 단계와 in-band/worker-2 각각 235 suites/3,074 tests를
  통과했고 `.test-results/release-preflight-46443.json`에 contract `1.1` evidence를 저장했다.
  `ConfigLoader.test.ts`의 deprecated `fs.rmdirSync` cleanup도 `fs.rmSync`로 교체해 targeted
  39/39를 확인했다. 외부 Ubuntu/macOS 반복 matrix와 C2 owner 승격은 여전히 별도 gate다.
- 문서 warning policy의 첫 cleanup slice를 완료했다. 인덱스와 운영 문서에 실제 canonical
  참조 경로를 보강해 `unused_definition`을 38건에서 0건으로 줄였고, 전체 warning baseline을
  193건에서 155건으로 갱신했다. 남은 `many_references` 33건과 `no_code_impl` 122건은
  warning policy가 허용하는 허브·설계 문서 범위로 유지한다.
- 문서 source connection 계약을 보강했다. 관리 문서 frontmatter의 `source`를 본문
  `**Source**:`와 동일한 code connection 입력으로 처리하고, parser 회귀 테스트를 추가했다.
  재인덱싱 후 단일 owner가 명확한 `ProjectIndexer`, `EnhancedSymbolDoc`, `ConventionCheck`
  문서의 연결을 추가해 `no_code_impl`을 31건에서 28건으로 줄였다. 현재 baseline은
  `unused_definition` 0건, `many_references` 33건, `no_code_impl` 28건, 전체 warning 61건이다.
- 위 parser/document metadata 변경 이후 최신 release preflight를 다시 실행했다. contract
  `1.1`의 14개 단계, in-band/worker-2 각각 235 suites/3,075 tests, packed ttsc provider
  canary `1.5`, canonical safety, differential와 C2 candidate matrix가 통과했다.
  evidence는 `.test-results/release-preflight-91946.json`이며, 외부 Ubuntu/macOS 반복 matrix와
  C2 owner 승격은 여전히 별도 gate다.
- `no_code_impl`의 문서별 disposition 계약을 추가했다. 실제 owner가 있는 문서는 source
  connection을 유지하고, 인덱스·가이드·설계·보류 문서는 frontmatter의
  `codeImplementation: not-applicable`을 통해 의도를 보존한다. parser/registry 회귀 테스트와
  managed 재인덱싱 후 현재 document validation은 오류 0, warning 33건(`many_references`만
  잔존)으로 정렬됐다.
- document disposition 회귀와 clean-checkout document validation gate를 포함한 최신 release
  preflight를 재실행했다. contract `1.2`의 15개 단계, in-band/worker-2 각각 236 suites/3,080
  tests, packed ttsc provider canary 1.5,
  canonical safety, differential와 C2 candidate matrix가 통과했다. evidence는
  `.test-results/release-preflight-35241.json`이며, 외부 Ubuntu/macOS 반복 matrix와 C2 owner
  승격은 여전히 별도 gate다.
- 로컬 release preflight를 동일 runner에서 두 번 반복하고 각 envelope를 read-only inspector로
  검증하는 `verify:release-preflight-repeat`와 CI `workflow_dispatch` qualification 진입점을
  추가했다. 반복 시도는 `HealthCommand.test.js`와 `DocReferenceAnalyzer.test.js` worker에서
  macOS arm64 Node 24 `SIGSEGV`로 실패했으며, 최신 repeat summary
  `.test-results/release-preflight-repeat-1783990820708-59401.json`과 runtime diagnostics를
  보존했다. 실패 envelope가
  완료된 단계까지만 갖는 경우도 inspector가 읽도록 contract 검증을 정렬했다.
- 기본 `npm run verify:release-preflight-repeat`를 재실행해 두 attempt 모두 contract `1.2`의
  15개 단계와 in-band/worker-2 각각 236 suites/3,080 tests를 통과시켰다. repeat summary는
  `.test-results/release-preflight-repeat-1783991103596-69830.json`이며, local repeat gate는
  완료로 이동하고 외부 Ubuntu/macOS matrix만 release blocker로 남겼다.
- 외부 qualification 결과를 read-only로 판정하는 `verify:external-release-matrix`를 추가했다.
  이 검사는 8개 OS/execution/attempt job, `publish-check`, workflow와 candidate SHA를 확인하며,
  현재 원격의 과거 실패 run `29231229473`을 의도대로 release evidence로 거부했다.
- C2 validator에 외부 matrix evidence 입력을 연결했다. 기본 검증은 계속 `candidate`로
  유지하고, 통과한 matrix run ID/SHA를 함께 전달한 경우에만 read-only
  `ownerPromotionEligible: true`를 산출한다.
- 외부 release matrix verifier를 guarded module로 분리하고, 완전한 8-job matrix·publish-check,
  누락 job·실패 job·candidate SHA 불일치에 대한 네트워크 없는 회귀 테스트 4건을 추가했다.
- legacy relationship roadmap과 문서 index/README의 현재성 표기를 정렬했다. 관계 타입 수치와
  미완료 목록은 historical reference로 명시하고, 현재 ttsc canonical graph·convention·release
  상태의 소유자를 semantic graph governance roadmap으로 단일화했다.
- `Analyzer Status`의 legacy relationship analyzer 수치와 inactive 목록도 current backlog가
  아닌 C2 compatibility inventory로 명시해, 구현 재개와 owner 판정을 혼동하지 않도록 했다.
- `coverage-report list|read`와 `coverage-baseline list|read|save|compare`가 없는 persisted DB를
  열어 SQLite 원문 오류를 내보내지 않고, 명시적 경로 오류와 exit 2를 반환하도록 정렬했다.
- C2 owner verifier에 synthetic external release-run 입력을 주입하는 CLI 회귀 테스트를 추가해,
  완전한 matrix에서만 `ownerPromotionEligible: true`가 되고 candidate SHA 불일치는 거부되는
  handoff를 네트워크 없이 고정했다.
- canonical/spec graph, convention input/retention과 coverage read-only 명령의 missing DB 오류를
  공통 `operatorFailure` 경계로 보내 exit 2와 stderr 메시지를 함께 보장했다.
- `convention inputs`의 exact evidence/enrichment/policy pin 조회와 `convention retention`의
  list/pin/dry-run/unpin/GC command lifecycle에 command-level 회귀 테스트를 추가했다.
