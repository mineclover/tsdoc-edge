---
title: Health Command
type: command
category: commands
status: active
canonical: true
---

# [[HealthCommand]]

**Source**: `src/commands/HealthCommand.ts`

## Purpose

시스템 전체 건강도 체크.

## Checks

- Database integrity
- File system consistency
- Symbol completeness
- Relationship validity

## Related

- [[CodeHealthChecker]]: 코드 건강도

---

## Backlinks

### Referenced By

- [[CLI Commands]] → managed/CLI-COMMANDS.md:37
- [[TSDoc Edge Documentation]] → managed/README.md:105
- [[CodeHealthChecker]] → managed/analyzers/CodeHealthChecker.md:169
- [[DocumentationAnalyzer]] → managed/analyzers/DocumentationAnalyzer.md:148
- [[Analyzers & Extractors]] → managed/analyzers/index.md:81
- [[InitCommand]] → managed/commands/InitCommand.md:345
- [[Phase Commands]] → managed/commands/PhaseCommands.md:102
- [[StatsCommand]] → managed/commands/StatsCommand.md:224
- [[SuggestCommand]] → managed/commands/SuggestCommand.md:483
- [[UndocumentedCommand]] → managed/commands/UndocumentedCommand.md:178
- [[UntestedCommand]] → managed/commands/UntestedCommand.md:197
- [[ValidateSpecCommand]] → managed/commands/ValidateSpecCommand.md:320
- [[AnalysisFeatures]] → managed/features/analysis-features.md:238
- [[CoreWorkflow]] → managed/features/core-workflow.md:121
- [[CLI Command Development Guide]] → managed/guides/command-development-guide.md:735
- [[Guides & Tutorials]] → managed/guides/index.md:278
- [[AnalysisReport]] → managed/primary-types/AnalysisReport.md:94
- [[TrackableStatistics]] → managed/primary-types/TrackableStatistics.md:116
- [[CodeHealthMetrics]] → managed/types/CodeHealthMetrics.md:142
- [[InterfaceTypes]] → managed/types/InterfaceTypes.md:145

### Implemented By

- HealthCommand → src/commands/HealthCommand.ts:33

