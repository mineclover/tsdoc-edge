# Domain Structure Analysis

## Overview

Total Domains: 4
Total Interfaces: 59

| Domain | Interfaces | Cohesion | Coupling | Quality |
|--------|------------|----------|----------|----------|
| core | 3 | 67% | 0% | ✅ Excellent |
| tags | 8 | 21% | 0% | 👍 Good |
| state | 9 | 8% | 0% | ⚠️ Fair |
| types | 39 | 4% | 0% | ⚠️ Fair |

## Domain: core

**Cohesion Score:** 66.7% (Medium - Moderately connected)

**Coupling Score:** 0.0% (Low - Well isolated)

### Interfaces by Role

**Entity** (1):
- `ValidationResult` - /Users/junwoobang/project/tsdoc-edge/src/types/core/parse.ts:43

**ValueObject** (2):
- `ParsedDocComment` - /Users/junwoobang/project/tsdoc-edge/src/types/core/parse.ts:12
- `ParseResult` - /Users/junwoobang/project/tsdoc-edge/src/types/core/parse.ts:72

### Internal Dependencies

2 dependencies within domain:

**composition** (2):
- ParsedDocComment → ValidationResult (via validationResults)
- ParseResult → ParsedDocComment (via comments)

---

## Domain: tags

**Cohesion Score:** 21.4% (Low - Loosely connected)

**Coupling Score:** 0.0% (Low - Well isolated)

### Interfaces by Role

**Entity** (5):
- `ErrorExperience` - /Users/junwoobang/project/tsdoc-edge/src/types/tags/enhanced.ts:70
- `DecisionRecord` - /Users/junwoobang/project/tsdoc-edge/src/types/tags/enhanced.ts:111
- `FuturePlan` - /Users/junwoobang/project/tsdoc-edge/src/types/tags/enhanced.ts:201
- `EnhancedSymbolDoc` - /Users/junwoobang/project/tsdoc-edge/src/types/tags/enhanced.ts:286
- `StrictModeValidation` - /Users/junwoobang/project/tsdoc-edge/src/types/tags/enhanced.ts:342

**ValueObject** (3):
- `ProblemSolving` - /Users/junwoobang/project/tsdoc-edge/src/types/tags/enhanced.ts:11
- `Functionality` - /Users/junwoobang/project/tsdoc-edge/src/types/tags/enhanced.ts:37
- `DependencySpec` - /Users/junwoobang/project/tsdoc-edge/src/types/tags/enhanced.ts:165

### Internal Dependencies

12 dependencies within domain:

**composition** (12):
- EnhancedSymbolDoc → ProblemSolving (via problemSolving)
- EnhancedSymbolDoc → Functionality (via functionality)
- EnhancedSymbolDoc → ErrorExperience (via errorExperiences)
- EnhancedSymbolDoc → DecisionRecord (via decisions)
- EnhancedSymbolDoc → DependencySpec (via dependencies)
- EnhancedSymbolDoc → FuturePlan (via futurePlans)
- EnhancedSymbolDoc → ProblemSolving (via problemSolving)
- EnhancedSymbolDoc → Functionality (via functionality)
- EnhancedSymbolDoc → ErrorExperience (via errorExperiences)
- EnhancedSymbolDoc → DecisionRecord (via decisions)
- ... and 2 more

---

## Domain: state

**Cohesion Score:** 8.3% (Low - Loosely connected)

**Coupling Score:** 0.0% (Low - Well isolated)

### Interfaces by Role

**Entity** (1):
- `CommentState` - /Users/junwoobang/project/tsdoc-edge/src/types/state/comment.ts:45

**ValueObject** (8):
- `CommentLocation` - /Users/junwoobang/project/tsdoc-edge/src/types/state/comment.ts:18
- `FileCommentState` - /Users/junwoobang/project/tsdoc-edge/src/types/state/comment.ts:93
- `StateStorage` - /Users/junwoobang/project/tsdoc-edge/src/types/state/comment.ts:115
- `CollapseOptions` - /Users/junwoobang/project/tsdoc-edge/src/types/state/comment.ts:139
- `ExpandOptions` - /Users/junwoobang/project/tsdoc-edge/src/types/state/comment.ts:166
- `ExportResult` - /Users/junwoobang/project/tsdoc-edge/src/types/state/comment.ts:183
- `ImportResult` - /Users/junwoobang/project/tsdoc-edge/src/types/state/comment.ts:210
- `FileStatusSummary` - /Users/junwoobang/project/tsdoc-edge/src/types/state/comment.ts:237

### Internal Dependencies

6 dependencies within domain:

**composition** (6):
- CommentState → CommentLocation (via location)
- FileCommentState → CommentState (via comments)
- StateStorage → FileCommentState (via files)
- CommentState → CommentLocation (via location)
- FileCommentState → CommentState (via comments)
- StateStorage → FileCommentState (via files)

---

## Domain: types

**Cohesion Score:** 4.5% (Low - Loosely connected)

**Coupling Score:** 0.0% (Low - Well isolated)

### Interfaces by Role

**Entity** (9):
- `DocQualityScore` - /Users/junwoobang/project/tsdoc-edge/src/types/analysis.ts:9
- `FeatureDocument` - /Users/junwoobang/project/tsdoc-edge/src/types/feature.ts:11
- `SymbolReference` - /Users/junwoobang/project/tsdoc-edge/src/types/feature.ts:68
- `Symbol` - /Users/junwoobang/project/tsdoc-edge/src/types/graph.ts:15
- `DetailedValidationIssue` - /Users/junwoobang/project/tsdoc-edge/src/types/graph.ts:245
- `DependencyRelation` - /Users/junwoobang/project/tsdoc-edge/src/types/registry.ts:75
- `SymbolRegistryEntry` - /Users/junwoobang/project/tsdoc-edge/src/types/registry.ts:97
- `SymbolRegistry` - /Users/junwoobang/project/tsdoc-edge/src/types/registry.ts:143
- `DesignDecision` - /Users/junwoobang/project/tsdoc-edge/src/types/tags.ts:190

**Repository** (2):
- `AnalysisReport` - /Users/junwoobang/project/tsdoc-edge/src/types/analysis.ts:107
- `DetailedValidationReport` - /Users/junwoobang/project/tsdoc-edge/src/types/graph.ts:311

**ValueObject** (28):
- `TestCoverageInfo` - /Users/junwoobang/project/tsdoc-edge/src/types/analysis.ts:47
- `CodeHealthMetrics` - /Users/junwoobang/project/tsdoc-edge/src/types/analysis.ts:63
- `ImprovementSuggestion` - /Users/junwoobang/project/tsdoc-edge/src/types/analysis.ts:87
- `AnalysisOptions` - /Users/junwoobang/project/tsdoc-edge/src/types/analysis.ts:129
- `TsdocEdgeConfig` - /Users/junwoobang/project/tsdoc-edge/src/types/config.ts:15
- `ProjectConfig` - /Users/junwoobang/project/tsdoc-edge/src/types/config.ts:47
- `PathsConfig` - /Users/junwoobang/project/tsdoc-edge/src/types/config.ts:83
- `FoldConfig` - /Users/junwoobang/project/tsdoc-edge/src/types/config.ts:114
- `ValidationConfig` - /Users/junwoobang/project/tsdoc-edge/src/types/config.ts:139
- `GeneratorConfig` - /Users/junwoobang/project/tsdoc-edge/src/types/config.ts:165
- `InterfaceInfo` - /Users/junwoobang/project/tsdoc-edge/src/types/interface-analysis.ts:12
- `InterfaceProperty` - /Users/junwoobang/project/tsdoc-edge/src/types/interface-analysis.ts:53
- `InterfaceMethod` - /Users/junwoobang/project/tsdoc-edge/src/types/interface-analysis.ts:84
- `MethodParameter` - /Users/junwoobang/project/tsdoc-edge/src/types/interface-analysis.ts:110
- `InterfaceDependency` - /Users/junwoobang/project/tsdoc-edge/src/types/interface-analysis.ts:146
- `DomainStructure` - /Users/junwoobang/project/tsdoc-edge/src/types/interface-analysis.ts:194
- `InterfaceDependencyGraph` - /Users/junwoobang/project/tsdoc-edge/src/types/interface-analysis.ts:232
- `InterfaceAnalysisOptions` - /Users/junwoobang/project/tsdoc-edge/src/types/interface-analysis.ts:253
- `FeatureIndex` - /Users/junwoobang/project/tsdoc-edge/src/types/feature.ts:89
- `SymbolGraph` - /Users/junwoobang/project/tsdoc-edge/src/types/graph.ts:86
- `ConnectivityAnalysis` - /Users/junwoobang/project/tsdoc-edge/src/types/graph.ts:122
- `SymbolQuery` - /Users/junwoobang/project/tsdoc-edge/src/types/graph.ts:173
- `SymbolQueryResult` - /Users/junwoobang/project/tsdoc-edge/src/types/graph.ts:224
- `SourceRef` - /Users/junwoobang/project/tsdoc-edge/src/types/registry.ts:11
- `SymbolRelationship` - /Users/junwoobang/project/tsdoc-edge/src/types/tags.ts:47
- `ContractSpec` - /Users/junwoobang/project/tsdoc-edge/src/types/tags.ts:83
- `TestMapping` - /Users/junwoobang/project/tsdoc-edge/src/types/tags.ts:119
- `ResponsibilitySpec` - /Users/junwoobang/project/tsdoc-edge/src/types/tags.ts:154

### Internal Dependencies

84 dependencies within domain:

**composition** (84):
- DocQualityScore → DocQualityScore (via children)
- AnalysisReport → CodeHealthMetrics (via metrics)
- AnalysisReport → DocQualityScore (via docScores)
- AnalysisReport → TestCoverageInfo (via testCoverage)
- AnalysisReport → ImprovementSuggestion (via suggestions)
- AnalysisReport → DocQualityScore (via topIssues)
- DocQualityScore → DocQualityScore (via children)
- AnalysisReport → CodeHealthMetrics (via metrics)
- AnalysisReport → DocQualityScore (via docScores)
- AnalysisReport → TestCoverageInfo (via testCoverage)
- ... and 74 more

---

## Recommendations

### tags

- ⚠️ Low cohesion (21%) - Consider splitting or better organizing interfaces

### state

- ⚠️ Low cohesion (8%) - Consider splitting or better organizing interfaces

### types

- ⚠️ Low cohesion (4%) - Consider splitting or better organizing interfaces
- ⚠️ Large domain (39 interfaces) - Consider splitting into sub-domains

