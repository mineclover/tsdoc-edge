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
- [[SpecStatusManager]]: Manages spec lifecycle
- [[DocumentSymbolParser]]: Parses spec structure

---

## Backlinks

### Referenced By

- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:137
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:150
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:181
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:228
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:229
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:230
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:231
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:232
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:233
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:234
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:235
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:236
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:219
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:288
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:289
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:159
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:160
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:161
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:165
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:342
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:343
- [[SpecTypes]] → /home/user/tsdoc-edge/managed/types/SpecTypes.md:123
- [[SpecTypes]] → /home/user/tsdoc-edge/managed/types/SpecTypes.md:134
- [[SpecTypes]] → /home/user/tsdoc-edge/managed/types/SpecTypes.md:135
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:65
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:78
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:79
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:80
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:81
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:82

