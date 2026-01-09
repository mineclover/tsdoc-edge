# CLI 명령어 XML 출력 통일 작업

## 목적

### 왜 XML 출력으로 통일하는가?

1. **기계 판독성**: 스크립트, CI/CD 파이프라인에서 명령어 결과를 쉽게 파싱하고 처리
2. **구조화된 데이터**: 일관된 구조로 데이터 추출 및 분석 자동화
3. **도구 통합**: 외부 도구(Jenkins, GitHub Actions 등)와의 연동 용이
4. **하위 호환성**: `--human` 플래그로 기존 색상 터미널 출력 유지

### 구현 방식

- **기본 출력**: XML (기계 판독용)
- **--human 플래그**: 색상 있는 터미널 출력 (사람 읽기용)
- **통합 인터페이스**: BaseCommand.printOutput() 메서드 사용

```typescript
// XML 출력 (기본)
this.printOutput('command-name', {
  section1: { data },
  section2: [{ items }],
}, args);

// 색상 출력 (--human)
if (this.hasFlag(args, '--human')) {
  this.printHeader('Title');
  console.log(`${colors.green}${data}${colors.reset}`);
}
```

## 진행 현황

### ✅ Phase 1: 인프라 준비 (완료)
- [x] BaseCommand에 printOutput() 메서드 추가
- [x] 동적 XML 생성 (배열, 그룹화된 배열, 중첩 객체 지원)
- [x] XML 이스케이프 처리

### ✅ Phase 2: 핵심 명령어 변환 (완료)
- [x] StatsCommand - 통계 데이터
- [x] HealthCommand - 건강도 체크
- [x] IdCommand - ID 관리 (4개 서브커맨드)
- [x] RelationshipQueryCommand - 관계 쿼리

### 🔄 Phase 3: 나머지 명령어 변환 (진행 중)

## 변환 대상 명령어 리스트

### 품질 체크 명령어 (우선순위: 높음)
- [ ] UndocumentedCommand - 문서화되지 않은 심볼 검색
- [ ] UntestedCommand - 테스트되지 않은 심볼 검색
- [ ] OrphansCommand - 고립된 심볼 검색
- [ ] ValidateCommand - 문서 검증
- [ ] LintCommand - 문서 린트
- [ ] CoverageReportCommand - 커버리지 리포트

### 빌드/파싱 명령어 (우선순위: 높음)
- [ ] BuildCommand - 심볼 데이터베이스 빌드
- [ ] ParseCommand - TSDoc 파싱
- [ ] IndexDocsCommand - 문서 인덱싱
- [ ] RebuildIndexCommand - 인덱스 재빌드

### 관계 분석 명령어 (우선순위: 중간)
- [ ] RelationshipImpactCommand - 변경 영향 분석
- [ ] RelationshipPathCommand - 심볼 간 경로 찾기
- [ ] RelationshipClustersCommand - 아키텍처 모듈 발견
- [ ] RelationshipMetricsCommand - 중요도 메트릭 계산
- [ ] RelationshipValidateCommand - 데이터 무결성 검증
- [ ] RelationshipExportCommand - 외부 포맷 내보내기
- [ ] RelationshipStatsCommand - 관계 통계
- [ ] RelationshipCheckCommand - 관계 검사
- [ ] RelationshipVisualizeCommand - 관계 시각화
- [ ] AnalyzeRelationshipsCommand - 관계 분석 실행

### 심볼 쿼리/분석 명령어 (우선순위: 중간)
- [ ] SymbolQueryCommand - 심볼 쿼리
- [ ] SymbolFixCommand - 심볼 수정
- [ ] SymbolRenameCommand - 심볼 이름 변경
- [ ] SymbolUnifiedCommand - 통합 심볼 명령어
- [ ] DepsCommand - 의존성 분석
- [ ] WhoUsesCommand - 심볼 사용처 검색
- [ ] WorkContextCommand - 작업 컨텍스트 (이미 XML 지원 - 확인 필요)

### 검증 명령어 (우선순위: 중간)
- [ ] ValidateDocsCommand - 문서 검증
- [ ] ValidateGeneratedDocsCommand - 생성된 문서 검증
- [ ] ValidateSpecCommand - 명세 검증
- [ ] ValidateSymbolRefsCommand - 심볼 참조 검증
- [ ] ValidateUnifiedCommand - 통합 검증

### 문서 관리 명령어 (우선순위: 중간)
- [ ] DocsCommand - 문서 관리
- [ ] DocSymbolsCommand - 문서 심볼 관리
- [ ] GenerateDocsCommand - 문서 생성
- [ ] UpdateBacklinksCommand - 백링크 업데이트
- [ ] UpdateSymbolRefsCommand - 심볼 참조 업데이트
- [ ] CheckLinksCommand - 링크 검사
- [ ] FindUnusedDocsCommand - 미사용 문서 찾기

### 명세(Spec) 관리 명령어 (우선순위: 낮음)
- [ ] SpecCommand - 명세 관리
- [ ] SpecBumpCommand - 명세 버전 증가
- [ ] SpecDiffCommand - 명세 차이 비교
- [ ] SpecHistoryCommand - 명세 히스토리
- [ ] SpecStatusCommand - 명세 상태

### 분석/탐색 명령어 (우선순위: 낮음)
- [ ] AnalyzeCommand - 코드 분석
- [ ] ExploreEntrypointCommand - 진입점 탐색
- [ ] FindMethodCommand - 메서드 찾기
- [ ] DetectDeadCodeCommand - 데드 코드 검출
- [ ] CheckDuplicatesCommand - 중복 검사
- [ ] TreeCommand - 심볼 트리
- [ ] HubsCommand - 허브 심볼 찾기
- [ ] LayersCommand - 레이어 분석

### 엔드포인트/라우트 명령어 (우선순위: 낮음)
- [ ] EndpointsCommand - 엔드포인트 분석
- [ ] HttpEndpointsCommand - HTTP 엔드포인트
- [ ] RoutesCommand - 라우트 분석
- [ ] CoreApiCommand - 코어 API 분석

### 온톨로지 명령어 (우선순위: 낮음)
- [ ] OntologyCommand - 온톨로지 관리
- [ ] OntologyListCommand - 온톨로지 목록
- [ ] OntologyStatsCommand - 온톨로지 통계

### 타입 체인 명령어 (우선순위: 낮음)
- [ ] TypeChainCommand - 타입 체인 분석 (RelationshipCommand의 서브커맨드)

### 테스트 관련 명령어 (우선순위: 낮음)
- [ ] TestRelationshipsCommand - 관계 테스트
- [ ] TestExamplesCommand - 예제 테스트

### 유틸리티 명령어 (우선순위: 낮음)
- [ ] VisualizeDepsCommand - 의존성 시각화
- [ ] SyncCoverageCommand - 커버리지 동기화
- [ ] PromoteSymbolCommand - 심볼 승격
- [ ] QueryInferredCommand - 추론된 정보 쿼리
- [ ] DesignContextCommand - 설계 컨텍스트
- [ ] BlocksCommand - 블록 관리
- [ ] CommonCommand - 공통 명령어
- [ ] TodosCommand - TODO 관리
- [ ] PlansCommand - 계획 관리
- [ ] TaskCommand - 태스크 관리
- [ ] TaskCommands - 태스크 명령어들
- [ ] ParallelWorkCommand - 병렬 작업
- [ ] UsageCommand - 사용 통계
- [ ] SystemStatusCommand - 시스템 상태

### 개선/제안 명령어 (우선순위: 낮음)
- [ ] SuggestCommand - 개선 제안
- [ ] ImproveCommand - 개선 실행
- [ ] FixCommand - 자동 수정

### 이동/변환 명령어 (우선순위: 낮음)
- [ ] MoveCommand - 심볼 이동
- [ ] ParseMermaidCommand - Mermaid 파싱

### 설정/초기화 명령어 (변환 제외 가능)
- [ ] InitCommand - 프로젝트 초기화 (대화형)
- [ ] HelpCommand - 도움말 (이미 색상 출력)
- [ ] InstallHookCommand - 훅 설치 (대화형)
- [ ] UninstallHookCommand - 훅 제거 (대화형)
- [ ] PreCommitRunCommand - Pre-commit 실행

### 인프라/유틸 (변환 제외)
- [ ] BaseCommand - 기본 명령어 클래스 (이미 완료)
- [ ] CommandRegistry - 명령어 레지스트리
- [ ] RelationshipCommand - 관계 명령어 라우터
- [ ] RelationshipHelpCommand - 관계 도움말
- [ ] SymbolUnifiedCommand - 심볼 통합 라우터

## 변환 체크리스트

각 명령어 변환 시 확인 사항:

- [ ] `this.hasFlag(args, '--human')` 분기 추가
- [ ] XML 출력 시 `this.printOutput()` 사용
- [ ] 색상 출력 로직을 `if (--human)` 블록으로 이동
- [ ] 빈 결과/에러 케이스 모두 처리
- [ ] positional args 파싱 시 플래그 필터링 (`args.filter(arg => !arg.startsWith('--'))`)
- [ ] 빌드 성공 확인
- [ ] 테스트 통과 확인 (2742개 유지)
- [ ] 실제 실행 테스트 (XML과 --human 모두)

## 통계

- **총 명령어**: 95개 파일
- **변환 완료**: 5개 (BaseCommand 포함)
- **변환 대상**: ~85개 (설정/인프라 제외)
- **진행률**: 5.9%

## 다음 단계

1. 품질 체크 명령어 6개 우선 변환
2. 빌드/파싱 명령어 4개 변환
3. 관계 분석 명령어 10개 변환
4. 나머지 명령어 순차 변환
5. 전체 통합 테스트 및 문서화
