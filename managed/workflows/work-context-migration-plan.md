# [[Work Context Migration Plan]]

**Document Type**: Migration Plan
**Status**: Planning
**Created**: 2025-11-23
**Target**: v0.13.0

## 목적

두 work-context 명령어의 목적을 명확히 분리하고, 사용자에게 직관적인 명칭 제공:
- 설계 의사결정 추적 → `design-context`
- 일반 작업 컨텍스트 → `work-context`

---

## 문제 인식

### 현재 상황

```bash
# 두 명령어의 차별화가 불명확
work-context <file>              # 메타데이터 중심
enhanced-work-context <file>     # 관계 그래프 중심
```

**문제점**:
1. "enhanced"는 업그레이드 버전처럼 들림 (실제론 다른 목적)
2. 두 명령어의 차이를 이름만으로 파악 어려움
3. 일반 사용자는 어떤 명령어를 써야 할지 혼란

### 개선된 상황 (목표)

```bash
design-context <file>    # 설계 의사결정 추적 (contracts, decisions, errors)
work-context <file>      # 일반 작업 컨텍스트 (relationships, stats, LLM)
```

**개선점**:
1. 명확한 목적 분리 ("설계" vs "작업")
2. 직관적인 명칭
3. 사용 시나리오에 따른 선택 용이

---

## Migration Strategy

### Phase 1: Enhanced work-context (완료)

**목표**: 기존 work-context의 관계 활용 강화

✅ **완료사항** (v0.12.1):
- 관계 통계 추가 (밀도, 명시적/추론, 카테고리, 강도)
- 실행 가능한 권장사항 추가
- getCategoryIcon() 헬퍼 메서드 추가

**결과**:
- 두 명령어 모두 관계 정보 제공
- work-context: 상세 메타데이터 + 관계 통계
- enhanced-work-context: 간결 통계 + LLM

### Phase 2: Alias 추가 (v0.13.0)

**구현**:

```typescript
// work-context → design-context (alias 추가)
export class WorkContextCommand extends BaseCommand {
  getName(): string {
    return 'work-context';
  }

  getAlias(): string[] {
    return ['design-context', 'dc'];  // 새 alias 추가
  }
}

// enhanced-work-context → (변경 없음, 나중에 work-context로)
export class EnhancedWorkContextCommand extends BaseCommand {
  getName(): string {
    return 'enhanced-work-context';
  }

  getAlias(): string[] {
    return ['ewc'];
  }
}
```

**효과**:
- `design-context`로도 동작
- 기존 `work-context` 사용자 영향 없음
- 문서에서 `design-context` 권장 시작

### Phase 3: Deprecation Warning (v0.14.0, 3개월 후)

**구현**:

```typescript
export class WorkContextCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    // Deprecation warning if called as 'work-context'
    const calledAs = process.argv[2];
    if (calledAs === 'work-context') {
      console.log(`${colors.yellow}⚠️  'work-context' is deprecated.${colors.reset}`);
      console.log(`   Please use 'design-context' instead.`);
      console.log(`   Alias: tsdoc-edge dc <file>`);
      console.log();
    }

    // ... rest of execution
  }
}

export class EnhancedWorkContextCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    // Deprecation warning if called as 'enhanced-work-context'
    const calledAs = process.argv[2];
    if (calledAs === 'enhanced-work-context') {
      console.log(`${colors.yellow}⚠️  'enhanced-work-context' is deprecated.${colors.reset}`);
      console.log(`   Please use 'work-context' instead.`);
      console.log(`   Alias: tsdoc-edge wc <file>`);
      console.log();
    }

    // ... rest of execution
  }
}
```

**문서 업데이트**:
- `design-context` 기본 문서화
- `enhanced-work-context` deprecated 표시

### Phase 4: Name Swap (v0.15.0, 6개월 후)

**구현**:

```typescript
// DesignContextCommand.ts (rename from WorkContextCommand.ts)
export class DesignContextCommand extends BaseCommand {
  getName(): string {
    return 'design-context';
  }

  getAlias(): string[] {
    return ['dc', 'work-context'];  // work-context를 alias로
  }
}

// WorkContextCommand.ts (rename from EnhancedWorkContextCommand.ts)
export class WorkContextCommand extends BaseCommand {
  getName(): string {
    return 'work-context';
  }

  getAlias(): string[] {
    return ['wc', 'enhanced-work-context'];  // ewc는 제거, enhanced-work-context는 alias로
  }
}
```

**Breaking Changes**:
- 파일명 변경
- 기본 명령어 변경
- 문서 전면 업데이트

### Phase 5: Cleanup (v1.0.0, 1년 후)

**구현**:

```typescript
// DesignContextCommand.ts
export class DesignContextCommand extends BaseCommand {
  getName(): string {
    return 'design-context';
  }

  getAlias(): string[] {
    return ['dc'];  // work-context alias 제거
  }
}

// WorkContextCommand.ts
export class WorkContextCommand extends BaseCommand {
  getName(): string {
    return 'work-context';
  }

  getAlias(): string[] {
    return ['wc'];  // enhanced-work-context alias 제거
  }
}
```

**완전 Migration 완료**:
- 구형 명령어 완전 제거
- 문서 정리
- v1.0.0 안정화

---

## Timeline

| Phase | Version | Target Date | Status |
|-------|---------|-------------|--------|
| Phase 1 | v0.12.1 | 2025-11-23 | ✅ Completed |
| Phase 2 | v0.13.0 | 2025-12 | 📋 Planned |
| Phase 3 | v0.14.0 | 2026-02 | 📋 Planned |
| Phase 4 | v0.15.0 | 2026-05 | 📋 Planned |
| Phase 5 | v1.0.0 | 2026-11 | 📋 Planned |

---

## User Communication Plan

### Phase 2 (Alias 추가)

**Release Notes**:
```markdown
## New Aliases (v0.13.0)

We're introducing clearer command names:
- `design-context` (alias for `work-context`) - for design decisions, contracts, errors
- `work-context` will eventually replace `enhanced-work-context`

The old names still work, but we recommend:
- Use `design-context` for design tracking
- Use `enhanced-work-context` (soon `work-context`) for daily development

No breaking changes in this release.
```

### Phase 3 (Deprecation)

**Release Notes**:
```markdown
## Deprecation Warnings (v0.14.0)

⚠️ **Breaking Change in v0.15.0**

The following commands will change names in v0.15.0:
- `work-context` → `design-context` (use `design-context` now)
- `enhanced-work-context` → `work-context` (use for general work)

Please update your scripts and aliases.
```

### Phase 4 (Name Swap)

**Release Notes**:
```markdown
## Breaking Changes (v0.15.0)

✨ **Command Renaming Complete**

- `design-context` (formerly `work-context`) - design decisions & contracts
- `work-context` (formerly `enhanced-work-context`) - general development

Old names still work as aliases but will be removed in v1.0.0.
```

---

## Risk Assessment

### Low Risk
- ✅ Alias 추가 (Phase 2): 기존 동작 유지
- ✅ Deprecation 경고 (Phase 3): 기존 동작 유지, 경고만

### Medium Risk
- ⚠️ Name Swap (Phase 4): Breaking change, 하지만 alias 유지
- Documentation 전면 업데이트 필요

### High Risk
- ⚠️ Alias 제거 (Phase 5): 완전한 Breaking change
- 사용자 스크립트 깨질 수 있음
- v1.0.0에서만 진행 (충분한 유예기간)

---

## Rollback Plan

각 Phase별 rollback 방법:

### Phase 2-3 (Alias/Warning)
- Alias 제거만 하면 복구
- 위험도: 낮음

### Phase 4 (Name Swap)
- 파일명 되돌리기
- getName() 변경 취소
- 위험도: 중간

### Phase 5 (Cleanup)
- Alias 재추가
- 위험도: 높음 (v1.0.0 이후론 rollback 불가)

---

## Success Metrics

### Phase 2 목표 (v0.13.0)
- [ ] `design-context` alias 작동
- [ ] 기존 사용자 영향 0건
- [ ] 문서에서 새 명칭 권장

### Phase 3 목표 (v0.14.0)
- [ ] Deprecation 경고 출력 확인
- [ ] GitHub Issues에서 사용자 피드백 수집
- [ ] 새 명칭 사용률 50% 이상

### Phase 4 목표 (v0.15.0)
- [ ] Breaking change 공지 완료
- [ ] 문서 전면 업데이트
- [ ] 새 명칭 사용률 80% 이상

### Phase 5 목표 (v1.0.0)
- [ ] 구형 alias 제거 완료
- [ ] 문서 정리 완료
- [ ] v1.0.0 안정화

---

## Alternatives Considered

### Alternative 1: 명칭 변경 없음
**장점**: 기존 사용자 영향 없음
**단점**: 혼란 지속, 직관성 부족

**결정**: ❌ 기각 (장기적 혼란)

### Alternative 2: 한 번에 변경 (Big Bang)
**장점**: 빠른 정리
**단점**: Breaking change 너무 급격

**결정**: ❌ 기각 (사용자 친화적이지 않음)

### Alternative 3: 단계적 Migration (선택됨)
**장점**: 점진적 전환, 사용자 적응 시간 확보
**단점**: 긴 시간 소요 (1년)

**결정**: ✅ 선택 (최적의 균형)

---

## Next Actions

### Immediate (이번 Sprint)
1. [x] work-context 관계 통계 추가
2. [ ] 이 문서 리뷰 및 승인

### Phase 2 Preparation (다음 Sprint)
1. [ ] `design-context` alias 구현
2. [ ] 문서 업데이트 (새 명칭 권장)
3. [ ] Release notes 작성

---

## References

- [[Work Context Workflow]] - 현재 워크플로우 문서
- [[WorkContextCommand]] - 기존 구현
- [[EnhancedWorkContextCommand]] - 새 구현

---

**Document Owner**: CLI Team
**Last Updated**: 2025-11-23
**Status**: ✅ Approved for Phase 1, Planning Phase 2
