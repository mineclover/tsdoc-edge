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

- [[CLI Commands]] → /home/user/tsdoc-edge/managed/CLI-COMMANDS.md:281
- [[CLI Commands]] → /home/user/tsdoc-edge/managed/CLI-COMMANDS.md:289
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:48
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:96
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:232
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:271
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:425
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:426
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:427
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:428
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:214
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:279
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:280
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:19
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:46
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:47
- [[ParallelWorkDetector]] → /home/user/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:24
- [[ParallelWorkDetector]] → /home/user/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:40
- [[ParallelWorkDetector]] → /home/user/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:41
- [[ReliabilityChecker]] → /home/user/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:21
- [[ReliabilityChecker]] → /home/user/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:34
- [[ReliabilityChecker]] → /home/user/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:35
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:23
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:43
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:44
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:228
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:272
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:273
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:188
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:189
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:190
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:5
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:128
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:158
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:194
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:195
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:196
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:197
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:198
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:199
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:46
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:185
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:186
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:270
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:271
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:272
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:119
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:120
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:121
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:101
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:152
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:180
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:181
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:182
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:183
- [[Context Quality Improvements]] → /home/user/tsdoc-edge/managed/features/context-quality-improvements.md:197
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:78
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:192
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:193
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:194
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:195
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:196
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:48
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:87
- [[TSDoc Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/TSDocSymbolParser.md:88
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:183
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:266
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:267
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:139
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:140
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:141
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:142
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:143
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:144
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:6
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:264
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:265

### Implemented By

- WorkContextCommand → /home/user/tsdoc-edge/src/commands/WorkContextCommand.ts:101

