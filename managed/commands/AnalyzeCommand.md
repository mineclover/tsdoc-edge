---
title: Analyze Command
type: command
category: commands
status: active
canonical: true
---

# [[AnalyzeCommand]]

**Source**: `src/commands/AnalyzeCommand.ts`

## Purpose

코드 품질 및 건강도 분석.

## Analysis Types

1. **Code Health**: Complexity, maintainability
2. **Documentation Coverage**: TSDoc presence
3. **Relationship Density**: Connection strength
4. **Orphan Detection**: Isolated symbols

## Related

- [[CodeHealthChecker]]: 코드 건강도 체커
- [[DocumentationAnalyzer]]: 문서 분석

---

## Backlinks

### Referenced By

- [[CLI Commands]] → managed/CLI-COMMANDS.md:17
- [[TSDoc Edge Documentation]] → managed/README.md:265
- [[CodeHealthChecker]] → managed/analyzers/CodeHealthChecker.md:301
- [[DocumentationAnalyzer]] → managed/analyzers/DocumentationAnalyzer.md:149
- [[Analyzers & Extractors]] → managed/analyzers/index.md:81
- [[Phase Commands]] → managed/commands/PhaseCommands.md:102
- [[SuggestCommand]] → managed/commands/SuggestCommand.md:484
- [[AnalysisFeatures]] → managed/features/analysis-features.md:246
- [[CoreWorkflow]] → managed/features/core-workflow.md:121
- [[Guides & Tutorials]] → managed/guides/index.md:279
- [[AnalysisReport]] → managed/primary-types/AnalysisReport.md:95
- [[TrackableStatistics]] → managed/primary-types/TrackableStatistics.md:116
- [[CodeHealthMetrics]] → managed/types/CodeHealthMetrics.md:143
- [[InterfaceTypes]] → managed/types/InterfaceTypes.md:145

### Implemented By

- AnalyzeCommand → src/commands/AnalyzeCommand.ts:33

