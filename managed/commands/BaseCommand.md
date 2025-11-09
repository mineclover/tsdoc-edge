# [[BaseCommand]]

**Source**: `src/commands/BaseCommand.ts`

## Purpose

모든 CLI 명령어의 기반 클래스. 40+ 명령어의 일관된 UX와 에러 처리 제공.

## Design Pattern

**Template Method Pattern**:
```typescript
abstract class BaseCommand {
  // Template method
  abstract execute(args: string[]): Promise<CommandResult>;

  // Hook methods
  abstract getName(): string;
  abstract getDescription(): string;

  // Shared utilities
  protected printHeader(title: string): void;
  protected printSuccess(message: string): void;
  protected printError(message: string): void;
}
```

## Provided Utilities

### 1. Output Formatting
- `printHeader()`: 섹션 헤더
- `printSection()`: 하위 섹션
- `printSuccess()`: 성공 메시지 (녹색)
- `printError()`: 에러 메시지 (빨간색)
- `printWarning()`: 경고 메시지 (노란색)
- `printInfo()`: 정보 메시지 (파란색)

### 2. Error Handling
- `executeWithErrorHandling()`: Wrapper for safe execution
- `success()`: Return success result
- `failure()`: Return error result

### 3. Color Constants
```typescript
export const colors = {
  reset, bold, dim,
  green, yellow, blue, cyan, red
};
```

## Contract

**Input**: `args: string[]` - Command line arguments
**Output**: `CommandResult` - Structured result with exit code

```typescript
interface CommandResult {
  exitCode: number;  // 0 = success, non-zero = error
  message?: string;  // Optional output
  error?: Error;     // Error object if failed
}
```

## Usage Example

```typescript
export class MyCommand extends BaseCommand {
  getName(): string {
    return 'my-command';
  }

  getDescription(): string {
    return 'Does something useful';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      this.printHeader('My Command');

      // ... implementation

      this.printSuccess('Done!');
      return this.success();
    });
  }
}
```

## Related

- [[CommandRegistry]]: 명령어 등록 시스템
- All Command implementations extend this class
