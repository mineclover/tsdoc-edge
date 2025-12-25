# [[SpecCompletenessValidator]]

**Source**: `src/spec/SpecCompletenessValidator.ts`

## Purpose

Validate specification document completeness and quality.

## Validation Criteria

### Required Sections
- 개요 (Overview/Purpose)
- 핵심 개념 (Core Concepts)
- 핵심 산출물 (Deliverables)
- 사용 시나리오 (Usage Scenarios)

### Recommended Sections
- CLI 명령어 (CLI Commands)
- 관련 기능 (Related Features)
- 가이드 (Guidelines)

### Content Metrics
- Minimum scenarios: 3
- Minimum code references: 5
- Minimum examples: 2

## Multi-language Support

Section name mapping for Korean/English:
- 개요 → Overview, Purpose, 목적
- 핵심 개념 → Core Concepts, Structure, 구조
- 핵심 산출물 → Deliverables, Output, Results
- 사용 시나리오 → Usage Scenarios, Use Cases, Examples

## Completeness Result

Returns:
- Overall completeness score (0-100%)
- Missing required sections
- Missing recommended sections
- Content metric scores
- Improvement suggestions

## Usage

```typescript
const validator = new SpecCompletenessValidator();
const result = validator.validate('managed/features/work-context.md');

console.log(`Completeness: ${result.score}%`);
console.log(`Missing: ${result.missingSections.join(', ')}`);
```

## Scoring Algorithm

- Required sections: 60% weight
- Recommended sections: 20% weight
- Content metrics: 20% weight
- Bonus for examples and code refs

## Symbol Count

1 class, 2 interfaces

## Related

- [[ValidateSpecCommand]]: CLI validation command
- SpecStatusManager: Manages spec lifecycle
- [[DocumentSymbolParser]]: Parses spec structure

---

## Backlinks

### Referenced By

- [[ValidateSpecCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ValidateSpecCommand.md:137
- [[ValidateSpecCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ValidateSpecCommand.md:150
- [[ValidateSpecCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ValidateSpecCommand.md:181
- [[Module Specification Framework]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/module-specification-framework.md:221
- [[ValidationFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/validation-features.md:165
- SpecTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/SpecTypes.md:189
- SpecStatusManager → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/SpecStatusManager.md:65

