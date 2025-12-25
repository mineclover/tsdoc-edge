# [[WorkContextCommand]]

**Source**: `src/commands/WorkContextCommand.ts`

## Purpose

작업자가 파일을 수정하기 전에 필요한 모든 컨텍스트를 통합 제공하는 핵심 명령어.

## Problem & Solution

**Problem**: 코드 수정 시 필요한 정보가 분산됨
- 관련 문서 어디 있는지 모름
- 의존성 파악 어려움
- 영향 범위 불명확
- 테스트 커버리지 확인 불가

**Solution**: 한 번의 명령어로 모든 컨텍스트 제공
```bash
tsdoc-edge work-context src/analyzer/CallGraphAnalyzer.ts
```

## Output Structure

### 1. Related Documentation
- 관련 기획서/명세서 자동 탐지
- `[[Symbol]]` 기반 연결
- Source location 표시

### 2. Dependencies
- 이 파일이 사용하는 타입들
- Import 분석 기반
- Type flow chain 추적

### 3. Test Coverage
- Unit tests
- Integration tests
- Coverage percentage

### 4. Impact Analysis (Used By)
- 이 파일을 사용하는 모든 곳
- 수정 시 영향 범위 파악

## Implementation

**Key Components**:
- `WorkContext` interface: 통합 컨텍스트 구조
- Document symbol parsing: 관련 문서 탐지
- Dependency analysis: Type flow 분석
- Test mapping: Coverage 연결

**Dependencies**:
- [[DatabaseManager]]: Symbol 데이터 조회
- [[SymbolGraphBuilder]]: 관계 그래프 구축
- [[DocumentSymbolParser]]: 문서 심볼 파싱

## Related

- [[CoreWorkflow]]: 전체 워크플로우
- [[SSOT]]: 문서-코드 일치성
- [[SymbolGraphBuilder]]: 심볼 관계 분석

---

## Backlinks

### Referenced By

- [[CLI Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:283
- [[CLI Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:291
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:51
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:119
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:286
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:325
- [[CallGraphAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:214
- [[IODependencyAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:19
- [[ParallelWorkDetector]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:24
- ReliabilityChecker → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:21
- [[TestRelationshipAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:23
- [[Module Specification Framework]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/module-specification-framework.md:230
- [[CLI Runner]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/CLIRunner.md:46
- [[Impact Analysis]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/ImpactAnalysis.md:101
- [[Impact Analysis]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/ImpactAnalysis.md:152
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:78
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:185
- [[Work Context Workflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/work-context-workflow.md:6

