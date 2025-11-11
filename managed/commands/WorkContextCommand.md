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

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:48
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:96
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:232
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:271
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:214
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:270
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:19
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:38
- [[ParallelWorkDetector]] → /home/user/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:24
- [[ParallelWorkDetector]] → /home/user/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:37
- [[ReliabilityChecker]] → /home/user/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:21
- [[ReliabilityChecker]] → /home/user/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:32
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:23
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:39
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:228
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:263
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:175
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:176
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:5
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:128
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:158
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:190
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:191
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:192
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:46
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:156
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:245
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:246
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:115
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:116
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:101
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:152
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:174
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:175
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:78
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:177
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:178
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:179
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:48
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:84
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:164
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:216
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:122
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:123
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:124
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:125
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:6
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:259

### Implemented By

- WorkContextCommand → /home/user/tsdoc-edge/src/commands/WorkContextCommand.ts:97

