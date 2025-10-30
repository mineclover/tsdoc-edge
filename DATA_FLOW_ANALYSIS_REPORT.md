# Data Flow Analysis Report

**Analysis Date:** 2025. 10. 30. 오후 7:54:39

**Total Interfaces Analyzed:** 65

---

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total DTOs | 46 |
| Total Transformation Chains | 52 |
| Valid Chains | 52 |
| Invalid Chains | 0 |
| Average Chain Length | 1.69 |
| DTO → Entity Chains | 6 |
| Entity → DTO Chains | 0 |

---

## 🎯 Detected DTOs

### Transfer DTOs

- **DocQualityScore** (unknown, confidence: 50%)
- **TestCoverageInfo** (unknown, confidence: 50%)
- **CodeHealthMetrics** (unknown, confidence: 50%)
- **ImprovementSuggestion** (unknown, confidence: 50%)
- **AnalysisReport** (unknown, confidence: 50%)
- **CommentLocation** (unknown, confidence: 50%)
- **CommentState** (unknown, confidence: 50%)
- **ExportResult** (unknown, confidence: 50%)
- **ImportResult** (unknown, confidence: 50%)
- **FileStatusSummary** (unknown, confidence: 50%)
- **ParsedDocComment** (unknown, confidence: 50%)
- **ValidationResult** (unknown, confidence: 50%)
- **DTOClassification** (unknown, confidence: 50%)
- **TransformationStep** (unknown, confidence: 50%)
- **DataTransformationChain** (unknown, confidence: 50%)
- **TransformationPath** (unknown, confidence: 50%)
- **DataFlowAnalysisResult** (unknown, confidence: 50%)
- **DataFlowConventionValidation** (unknown, confidence: 50%)
- **InterfaceInfo** (unknown, confidence: 50%)
- **InterfaceProperty** (unknown, confidence: 50%)
- **InterfaceMethod** (unknown, confidence: 50%)
- **InterfaceDependency** (unknown, confidence: 50%)
- **DomainStructure** (unknown, confidence: 50%)
- **ProblemSolving** (unknown, confidence: 50%)
- **Functionality** (unknown, confidence: 50%)
- **ErrorExperience** (unknown, confidence: 50%)
- **DecisionRecord** (unknown, confidence: 50%)
- **DependencySpec** (unknown, confidence: 50%)
- **FuturePlan** (unknown, confidence: 50%)
- **EnhancedSymbolDoc** (unknown, confidence: 50%)
- **StrictModeValidation** (unknown, confidence: 50%)
- **FeatureDocument** (unknown, confidence: 50%)
- **Symbol** (unknown, confidence: 50%)
- **SymbolGraph** (unknown, confidence: 50%)
- **ConnectivityAnalysis** (unknown, confidence: 50%)
- **SymbolQuery** (unknown, confidence: 50%)
- **DetailedValidationIssue** (unknown, confidence: 50%)
- **DetailedValidationReport** (unknown, confidence: 50%)
- **SourceRef** (unknown, confidence: 50%)
- **SymbolRegistryEntry** (unknown, confidence: 50%)
- **SymbolRegistry** (unknown, confidence: 50%)
- **SymbolRelationship** (unknown, confidence: 50%)
- **ContractSpec** (unknown, confidence: 50%)
- **TestMapping** (unknown, confidence: 50%)
- **ResponsibilitySpec** (unknown, confidence: 50%)
- **DesignDecision** (unknown, confidence: 50%)

---

## 🔄 Transformation Chains

### Valid Chains

#### AnalysisReport → CodeHealthMetrics

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `AnalysisReport` → `CodeHealthMetrics` (via metrics)

#### AnalysisReport → TestCoverageInfo

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `AnalysisReport` → `TestCoverageInfo` (via testCoverage)

#### AnalysisReport → ImprovementSuggestion

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `AnalysisReport` → `ImprovementSuggestion` (via suggestions)

#### CommentState → CommentLocation

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `CommentState` → `CommentLocation` (via location)

#### ParsedDocComment → DocComment

- **Type:** dto-to-entity
- **Length:** 1 steps
- **Path:**
  1. `ParsedDocComment` → `DocComment` (via docComment)

#### ParsedDocComment → ValidationResult

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `ParsedDocComment` → `ValidationResult` (via validationResults)

#### TransformationStep → InterfaceDependency

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `TransformationStep` → `InterfaceDependency` (via dependency)

#### DataTransformationChain → InterfaceDependency

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `DataTransformationChain` → `TransformationStep` (via steps)
  2. `TransformationStep` → `InterfaceDependency` (via dependency)

#### TransformationPath → InterfaceDependency

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `TransformationPath` → `InterfaceDependency` (via dependencies)

#### DataFlowAnalysisResult → DTOClassification

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `DataFlowAnalysisResult` → `DTOClassification` (via dtos)

#### DataFlowAnalysisResult → InterfaceDependency

- **Type:** dto-to-dto
- **Length:** 3 steps
- **Path:**
  1. `DataFlowAnalysisResult` → `DataTransformationChain` (via transformationChains)
  2. `DataTransformationChain` → `TransformationStep` (via steps)
  3. `TransformationStep` → `InterfaceDependency` (via dependency)

#### InterfaceInfo → ContractSpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `InterfaceInfo` → `Symbol` (via symbol)
  2. `Symbol` → `ContractSpec` (via contract)

#### InterfaceInfo → ResponsibilitySpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `InterfaceInfo` → `Symbol` (via symbol)
  2. `Symbol` → `ResponsibilitySpec` (via responsibility)

#### InterfaceInfo → TestMapping

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `InterfaceInfo` → `Symbol` (via symbol)
  2. `Symbol` → `TestMapping` (via tests)

#### InterfaceInfo → InterfaceProperty

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `InterfaceInfo` → `InterfaceProperty` (via properties)

#### InterfaceInfo → MethodParameter

- **Type:** dto-to-entity
- **Length:** 2 steps
- **Path:**
  1. `InterfaceInfo` → `InterfaceMethod` (via methods)
  2. `InterfaceMethod` → `MethodParameter` (via parameters)

#### InterfaceMethod → MethodParameter

- **Type:** dto-to-entity
- **Length:** 1 steps
- **Path:**
  1. `InterfaceMethod` → `MethodParameter` (via parameters)

#### DomainStructure → ContractSpec

- **Type:** dto-to-dto
- **Length:** 3 steps
- **Path:**
  1. `DomainStructure` → `InterfaceInfo` (via interfaces)
  2. `InterfaceInfo` → `Symbol` (via symbol)
  3. `Symbol` → `ContractSpec` (via contract)

#### DomainStructure → ResponsibilitySpec

- **Type:** dto-to-dto
- **Length:** 3 steps
- **Path:**
  1. `DomainStructure` → `InterfaceInfo` (via interfaces)
  2. `InterfaceInfo` → `Symbol` (via symbol)
  3. `Symbol` → `ResponsibilitySpec` (via responsibility)

#### DomainStructure → TestMapping

- **Type:** dto-to-dto
- **Length:** 3 steps
- **Path:**
  1. `DomainStructure` → `InterfaceInfo` (via interfaces)
  2. `InterfaceInfo` → `Symbol` (via symbol)
  3. `Symbol` → `TestMapping` (via tests)

#### DomainStructure → InterfaceProperty

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `DomainStructure` → `InterfaceInfo` (via interfaces)
  2. `InterfaceInfo` → `InterfaceProperty` (via properties)

#### DomainStructure → MethodParameter

- **Type:** dto-to-entity
- **Length:** 3 steps
- **Path:**
  1. `DomainStructure` → `InterfaceInfo` (via interfaces)
  2. `InterfaceInfo` → `InterfaceMethod` (via methods)
  3. `InterfaceMethod` → `MethodParameter` (via parameters)

#### DomainStructure → InterfaceDependency

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `DomainStructure` → `InterfaceDependency` (via internalDependencies)

#### EnhancedSymbolDoc → ProblemSolving

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `EnhancedSymbolDoc` → `ProblemSolving` (via problemSolving)

#### EnhancedSymbolDoc → Functionality

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `EnhancedSymbolDoc` → `Functionality` (via functionality)

#### EnhancedSymbolDoc → ErrorExperience

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `EnhancedSymbolDoc` → `ErrorExperience` (via errorExperiences)

#### EnhancedSymbolDoc → DecisionRecord

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `EnhancedSymbolDoc` → `DecisionRecord` (via decisions)

#### EnhancedSymbolDoc → DependencySpec

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `EnhancedSymbolDoc` → `DependencySpec` (via dependencies)

#### EnhancedSymbolDoc → FuturePlan

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `EnhancedSymbolDoc` → `FuturePlan` (via futurePlans)

#### Symbol → ContractSpec

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `Symbol` → `ContractSpec` (via contract)

#### Symbol → ResponsibilitySpec

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `Symbol` → `ResponsibilitySpec` (via responsibility)

#### Symbol → TestMapping

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `Symbol` → `TestMapping` (via tests)

#### SymbolGraph → ContractSpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `SymbolGraph` → `Symbol` (via symbols)
  2. `Symbol` → `ContractSpec` (via contract)

#### SymbolGraph → ResponsibilitySpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `SymbolGraph` → `Symbol` (via symbols)
  2. `Symbol` → `ResponsibilitySpec` (via responsibility)

#### SymbolGraph → TestMapping

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `SymbolGraph` → `Symbol` (via symbols)
  2. `Symbol` → `TestMapping` (via tests)

#### SymbolGraph → SymbolRelationship

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `SymbolGraph` → `SymbolRelationship` (via relationships)

#### ConnectivityAnalysis → ContractSpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `ConnectivityAnalysis` → `Symbol` (via undocumented)
  2. `Symbol` → `ContractSpec` (via contract)

#### ConnectivityAnalysis → ResponsibilitySpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `ConnectivityAnalysis` → `Symbol` (via undocumented)
  2. `Symbol` → `ResponsibilitySpec` (via responsibility)

#### ConnectivityAnalysis → TestMapping

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `ConnectivityAnalysis` → `Symbol` (via undocumented)
  2. `Symbol` → `TestMapping` (via tests)

#### SymbolQuery → ContractSpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `SymbolQuery` → `Symbol` (via type)
  2. `Symbol` → `ContractSpec` (via contract)

#### SymbolQuery → ResponsibilitySpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `SymbolQuery` → `Symbol` (via type)
  2. `Symbol` → `ResponsibilitySpec` (via responsibility)

#### SymbolQuery → TestMapping

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `SymbolQuery` → `Symbol` (via type)
  2. `Symbol` → `TestMapping` (via tests)

#### DetailedValidationIssue → ContractSpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `DetailedValidationIssue` → `Symbol` (via symbolType)
  2. `Symbol` → `ContractSpec` (via contract)

#### DetailedValidationIssue → ResponsibilitySpec

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `DetailedValidationIssue` → `Symbol` (via symbolType)
  2. `Symbol` → `ResponsibilitySpec` (via responsibility)

#### DetailedValidationIssue → TestMapping

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `DetailedValidationIssue` → `Symbol` (via symbolType)
  2. `Symbol` → `TestMapping` (via tests)

#### DetailedValidationReport → ContractSpec

- **Type:** dto-to-dto
- **Length:** 3 steps
- **Path:**
  1. `DetailedValidationReport` → `DetailedValidationIssue` (via issuesByFile)
  2. `DetailedValidationIssue` → `Symbol` (via symbolType)
  3. `Symbol` → `ContractSpec` (via contract)

#### DetailedValidationReport → ResponsibilitySpec

- **Type:** dto-to-dto
- **Length:** 3 steps
- **Path:**
  1. `DetailedValidationReport` → `DetailedValidationIssue` (via issuesByFile)
  2. `DetailedValidationIssue` → `Symbol` (via symbolType)
  3. `Symbol` → `ResponsibilitySpec` (via responsibility)

#### DetailedValidationReport → TestMapping

- **Type:** dto-to-dto
- **Length:** 3 steps
- **Path:**
  1. `DetailedValidationReport` → `DetailedValidationIssue` (via issuesByFile)
  2. `DetailedValidationIssue` → `Symbol` (via symbolType)
  3. `Symbol` → `TestMapping` (via tests)

#### SymbolRegistryEntry → SourceRef

- **Type:** dto-to-dto
- **Length:** 1 steps
- **Path:**
  1. `SymbolRegistryEntry` → `SourceRef` (via sourceRef)

#### SymbolRegistryEntry → DependencyRelation

- **Type:** dto-to-entity
- **Length:** 1 steps
- **Path:**
  1. `SymbolRegistryEntry` → `DependencyRelation` (via uses)

#### SymbolRegistry → SourceRef

- **Type:** dto-to-dto
- **Length:** 2 steps
- **Path:**
  1. `SymbolRegistry` → `SymbolRegistryEntry` (via entries)
  2. `SymbolRegistryEntry` → `SourceRef` (via sourceRef)

#### SymbolRegistry → DependencyRelation

- **Type:** dto-to-entity
- **Length:** 2 steps
- **Path:**
  1. `SymbolRegistry` → `SymbolRegistryEntry` (via entries)
  2. `SymbolRegistryEntry` → `DependencyRelation` (via uses)

---

## 🔴 Orphaned DTOs

*DTOs that are not part of any transformation chain:*

- `DocQualityScore`
- `ExportResult`
- `ImportResult`
- `FileStatusSummary`
- `DataFlowConventionValidation`
- `StrictModeValidation`
- `FeatureDocument`
- `DesignDecision`

---

## ⚠️ Bidirectional Transformations

*Potential issues with circular dependencies:*

- **DocQualityScore ↔ DocQualityScore**
  - Issue: Bidirectional dependency: DocQualityScore ↔ DocQualityScore

---

## 💡 Recommendations

### Resolve Bidirectional Dependencies

Bidirectional dependencies can indicate architectural issues.
Consider:
- Introducing an intermediate layer
- Separating read and write models (CQRS)
- Creating separate DTOs for each direction

### Address Orphaned DTOs

DTOs should be part of clear transformation chains.
Consider:
- Documenting usage patterns
- Creating transformation methods
- Removing unused DTOs

