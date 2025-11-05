# CLI Modularization Refactoring Plan

## 현재 문제점

### 1. 모놀리식 구조
- **5,728줄** 단일 파일 (src/cli.ts)
- **53개** print* 함수가 모두 한 파일에
- 모든 의존성을 한 곳에서 import (44개 import)

### 2. 낮은 재사용성
```typescript
// 현재: 함수 기반
function printBuild(): void {
  // 200줄 로직...
}

// 문제:
// - 로직 재사용 불가
// - 테스트 어려움
// - 파라미터 전달 복잡
```

### 3. 테스트 불가능
- CLI 진입점과 비즈니스 로직 결합
- process.exit() 직접 호출
- stdout 직접 출력

## 목표 아키텍처

### 1. Command 패턴 적용

```typescript
// src/commands/BaseCommand.ts
export abstract class BaseCommand {
  abstract execute(args: string[]): Promise<number>;

  protected printHeader(title: string): void { ... }
  protected printSuccess(msg: string): void { ... }
  protected printError(msg: string): void { ... }
}

// src/commands/BuildCommand.ts
export class BuildCommand extends BaseCommand {
  constructor(
    private scanner: FileScanner,
    private dbManager: DatabaseManager
  ) {
    super();
  }

  async execute(args: string[]): Promise<number> {
    const srcDir = args[0] || 'src';

    try {
      const files = this.scanner.scanDirectory(srcDir);
      this.dbManager.insertSymbols(files);
      this.printSuccess(`Built database with ${files.length} files`);
      return 0;
    } catch (error) {
      this.printError(error.message);
      return 1;
    }
  }
}

// src/cli.ts (100줄 이하)
const commands = {
  build: new BuildCommand(scanner, dbManager),
  analyze: new AnalyzeCommand(analyzer),
  // ...
};

const exitCode = await commands[command]?.execute(args.slice(1)) ?? 1;
process.exit(exitCode);
```

### 2. 디렉토리 구조

```
src/
├── commands/
│   ├── BaseCommand.ts           # 추상 클래스
│   ├── init/
│   │   └── InitCommand.ts
│   ├── build/
│   │   └── BuildCommand.ts
│   ├── analyze/
│   │   └── AnalyzeCommand.ts
│   ├── validation/
│   │   ├── ValidateCommand.ts
│   │   ├── HealthCommand.ts
│   │   └── CheckLinksCommand.ts
│   ├── doc-symbol/
│   │   ├── IndexDocsCommand.ts
│   │   ├── ValidateDocsCommand.ts
│   │   └── UpdateBacklinksCommand.ts
│   ├── spec/
│   │   ├── ValidateSpecCommand.ts
│   │   ├── SpecStatusCommand.ts
│   │   └── GenerateSpecCommand.ts
│   └── analytics/
│       └── UsageCommand.ts
├── cli/
│   ├── CommandRegistry.ts       # 명령어 등록
│   ├── ArgumentParser.ts        # 인자 파싱
│   └── OutputFormatter.ts       # 출력 포맷
└── cli.ts                        # 진입점 (100줄)
```

### 3. 테스트 가능 구조

```typescript
// __tests__/commands/BuildCommand.test.ts
describe('BuildCommand', () => {
  let command: BuildCommand;
  let mockScanner: jest.Mocked<FileScanner>;
  let mockDB: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockScanner = createMockScanner();
    mockDB = createMockDB();
    command = new BuildCommand(mockScanner, mockDB);
  });

  it('should build database successfully', async () => {
    mockScanner.scanDirectory.mockReturnValue([...files]);

    const exitCode = await command.execute(['src']);

    expect(exitCode).toBe(0);
    expect(mockDB.insertSymbols).toHaveBeenCalledWith(files);
  });

  it('should handle errors gracefully', async () => {
    mockScanner.scanDirectory.mockImplementation(() => {
      throw new Error('Directory not found');
    });

    const exitCode = await command.execute(['invalid']);

    expect(exitCode).toBe(1);
  });
});
```

## 마이그레이션 전략

### Phase 1: 기반 구조 (1-2일)
1. BaseCommand 추상 클래스 생성
2. CommandRegistry 구현
3. OutputFormatter 유틸리티 분리

### Phase 2: 핵심 명령어 마이그레이션 (3-4일)
1. BuildCommand (가장 중요)
2. AnalyzeCommand
3. ValidateCommand
4. HealthCommand

### Phase 3: 중급 명령어 (3-4일)
5. IndexDocsCommand
6. ValidateDocsCommand
7. UpdateBacklinksCommand
8. ValidateSpecCommand

### Phase 4: 나머지 명령어 (5-7일)
9. 40개 명령어 순차 마이그레이션
10. 각 명령어별 테스트 작성

### Phase 5: 정리 및 검증 (2-3일)
11. 기존 cli.ts 제거
12. 통합 테스트
13. 문서 업데이트

**총 소요 예상**: 14-20일

## 이점

### 1. 테스트 가능
```typescript
// Before: 불가능
function printBuild() {
  console.log(...);
  process.exit(0);
}

// After: 완전히 테스트 가능
const exitCode = await command.execute(args);
expect(exitCode).toBe(0);
```

### 2. 재사용성
```typescript
// 다른 곳에서 재사용 가능
const buildCmd = new BuildCommand(scanner, db);
await buildCmd.execute(['src']);
```

### 3. 의존성 주입
```typescript
// 쉬운 모킹
const mockScanner = new MockFileScanner();
const command = new BuildCommand(mockScanner, db);
```

### 4. 유지보수성
```typescript
// 명령어당 100-200줄
// 각 파일이 독립적
// 수정 시 영향 범위 최소화
```

## 우선순위 제안

### Immediate (지금 당장)
- ❌ 너무 큰 작업 (14-20일)
- ❌ 기존 기능 동작 중
- ✅ 새 명령어만 Command 패턴 적용

### Short-term (1-2개월 내)
- ✅ Phase 1-2 진행 (핵심 4개 명령어만)
- ✅ 점진적 마이그레이션
- ✅ 레거시 cli.ts와 공존

### Long-term (3-6개월)
- ✅ 전체 마이그레이션
- ✅ 레거시 제거
- ✅ 100% 테스트 커버리지

## 67% Completeness 개선 방안

### 현재 상태
```typescript
@problem ...
@functionality ...
@decision ...
@depends ...
// = 67% (4/6 카테고리)
```

### 83%로 향상 (선택 1개 추가)
```typescript
// Option 1: futurePlans 추가
@plan Add interactive mode for build command
@planPriority medium
@planStatus planned

// Option 2: errorExperiences 추가 (실제 에러 발생 시)
@errorExp "ENOENT: no such file or directory"
@errorContext When srcDir doesn't exist
@errorSolution Added directory existence check
```

### 100%로 향상 (선택 2개 추가)
- 양쪽 다 추가
- 단, **실제 필요할 때만**

## 결론

**CLI 모듈화**:
- ❌ 현재는 모놀리식 (5,728줄)
- ✅ Command 패턴으로 리팩토링 필요
- ⏳ 점진적 마이그레이션 권장

**67% Completeness**:
- ✅ 필수 4개 카테고리 완료 (의도된 설계)
- 📝 선택 카테고리는 필요시 추가
- 🎯 67% = 최소 품질 기준 달성

**다음 단계 제안**:
1. 새 명령어는 Command 패턴 적용
2. 핵심 4개 명령어 우선 리팩토링
3. 67% → 83% 향상은 선택적
