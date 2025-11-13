# [[Phase Commands Refactoring Guide]]

## Purpose

Phase 명령어 파일을 개별 명령어 파일로 분리하는 리팩토링 가이드.

**Status**: 🚧 In Progress (Phase6 ✅ Complete)
**Priority**: 🔴 High (from [[Codebase Health Report]])
**Started**: 2025-11-13
**Phase6 Completed**: 2025-11-13

## Problem

Phase 명령어 파일들이 여러 명령어를 포함한 모놀리식 파일로 구성되어 있어:

### Issues

1. **탐색 어려움**: 1,000+ 줄 파일에서 특정 명령어 찾기 어려움
2. **테스트 어려움**: 개별 명령어 단위 테스트 불가능
3. **Merge Conflict**: 여러 개발자가 동시에 수정 시 충돌 발생
4. **IDE 성능**: 대형 파일로 인한 IDE 느려짐

### Statistics

```
Phase4Commands.ts:   707 lines (5 commands)
Phase5Commands.ts:   865 lines (6 commands)
Phase6Commands.ts: 1,178 lines (7 commands)
Phase7Commands.ts: 1,065 lines (6 commands)
───────────────────────────────────────────
Total:           3,815 lines (24 commands)
```

## Solution

각 명령어를 개별 파일로 추출하여 모듈화.

### Before

```
src/commands/
├── Phase6Commands.ts (1,178 lines)
│   ├── CheckDuplicatesCommand
│   ├── SpecStatusCommand
│   ├── FindUnusedDocsCommand
│   ├── SpecHistoryCommand
│   ├── SpecDiffCommand
│   ├── SpecBumpCommand
│   └── FindDocCommand
```

### After

```
src/commands/
├── CheckDuplicatesCommand.ts (233 lines)
├── SpecStatusCommand.ts (~200 lines)
├── FindUnusedDocsCommand.ts (~200 lines)
├── SpecHistoryCommand.ts (~150 lines)
├── SpecDiffCommand.ts (~150 lines)
├── SpecBumpCommand.ts (~150 lines)
└── FindDocCommand.ts (~150 lines)
```

## Refactoring Strategy

### Step 1: Identify Commands

Use grep to find all command classes:

```bash
grep -n "^export class.*Command extends BaseCommand" src/commands/Phase6Commands.ts
```

**Phase6Commands.ts Output**:
```
73:export class CheckDuplicatesCommand extends BaseCommand
251:export class SpecStatusCommand extends BaseCommand
526:export class FindUnusedDocsCommand extends BaseCommand
689:export class SpecHistoryCommand extends BaseCommand
804:export class SpecDiffCommand extends BaseCommand
939:export class SpecBumpCommand extends BaseCommand
1057:export class FindDocCommand extends BaseCommand
```

### Step 2: Extract Command

For each command:

1. **Copy command class** (from line N to next class - 1)
2. **Copy required imports** (from top of Phase file)
3. **Copy helper functions** (if needed by this command)
4. **Add file header** (JSDoc with @packageDocumentation)
5. **Save to new file** (`src/commands/{CommandName}.ts`)

**Template**:

```typescript
/**
 * {Command Name} - {Brief description}
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
// ... other imports as needed

// Helper functions (if needed)

/**
 * Command for {purpose}
 *
 * @public
 * @responsibility {What it does}
 * @contract {Input/output contract}
 * @doc [[{CommandName}]]
 *
 * ... rest of JSDoc
 */
export class {CommandName} extends BaseCommand {
  // Command implementation
}
```

### Step 3: Update index.ts

Update `src/commands/index.ts` to import from new file:

**Before**:
```typescript
export {
  CheckDuplicatesCommand,
  SpecStatusCommand,
  // ...
} from './Phase6Commands';
```

**After**:
```typescript
export { CheckDuplicatesCommand } from './CheckDuplicatesCommand';
export { SpecStatusCommand } from './SpecStatusCommand';
// ...
```

### Step 4: Test

1. **Build**: `npm run build`
2. **Test command**: `node dist/cli.js {command-name} --help`
3. **Run command**: `node dist/cli.js {command-name}` (if safe)

### Step 5: Commit

```bash
git add src/commands/{CommandName}.ts src/commands/index.ts
git commit -m "refactor: Extract {CommandName} from Phase{N}Commands"
```

### Step 6: Delete Phase File

After all commands extracted:

```bash
git rm src/commands/Phase6Commands.ts
git commit -m "refactor: Remove Phase6Commands after extracting all commands"
```

## Progress

### Phase6Commands.ts (7 commands) ✅ COMPLETE

| Command | Lines | Status | Commit |
|---------|-------|--------|--------|
| CheckDuplicatesCommand | 233 | ✅ Done | efeda98 |
| SpecStatusCommand | 323 | ✅ Done | 1a12619 |
| FindUnusedDocsCommand | 188 | ✅ Done | f4614c5 |
| SpecHistoryCommand | 130 | ✅ Done | 99441eb |
| SpecDiffCommand | 152 | ✅ Done | c6c9fd0 |
| SpecBumpCommand | 131 | ✅ Done | 87c5b37 |
| FindDocCommand | 197 | ✅ Done | 8ec0aee |

**Progress**: 7/7 (100%) ✅
**Legacy File Deleted**: 27c5ea1

### Phase7Commands.ts (6 commands)

| Command | Lines | Status |
|---------|-------|--------|
| PlansCommand | ~200 | ⏳ Pending |
| FindMethodCommand | ~200 | ⏳ Pending |
| TodosCommand | ~200 | ⏳ Pending |
| StatsCommand | ~200 | ⏳ Pending |
| CoreApiCommand | ~150 | ⏳ Pending |
| SyncCoverageCommand | ~150 | ⏳ Pending |

**Progress**: 0/6 (0%)

### Phase5Commands.ts (6 commands)

| Command | Lines | Status |
|---------|-------|--------|
| DepsCommand | ~150 | ⏳ Pending |
| UsedByCommand | ~150 | ⏳ Pending |
| WhoUsesCommand | ~150 | ⏳ Pending |
| OrphansCommand | ~150 | ⏳ Pending |
| UndocumentedCommand | ~150 | ⏳ Pending |
| TreeCommand | ~150 | ⏳ Pending |

**Progress**: 0/6 (0%)

### Phase4Commands.ts (5 commands)

| Command | Lines | Status |
|---------|-------|--------|
| SuggestCommand | ~150 | ⏳ Pending |
| InitCommand | ~150 | ⏳ Pending |
| IdNewCommand | ~150 | ⏳ Pending |
| ValidateSpecCommand | ~150 | ⏳ Pending |
| GenerateDocsCommand | ~150 | ⏳ Pending |

**Progress**: 0/5 (0%)

### Overall Progress

```
Total: 24 commands
Completed: 7 commands (29%)
Remaining: 17 commands (71%)

Phase6Commands.ts: 7/7 ✅ COMPLETE
Phase7Commands.ts: 0/6 (pending)
Phase5Commands.ts: 0/6 (pending)
Phase4Commands.ts: 0/5 (pending)

Estimated effort remaining: 17 commands × 15 min = ~4.3 hours
```

## Common Issues & Solutions

### Issue 1: Helper Functions

**Problem**: Multiple commands share helper functions

**Solution**:
- Option A: Copy helper to each command (simple, some duplication)
- Option B: Create `src/commands/utils/` directory (DRY, more setup)

**Recommendation**: Option A for now (simpler), refactor to Option B later if needed

**Example**: `findMarkdownFiles()` in Phase6Commands used by 4+ commands

### Issue 2: Imports

**Problem**: Figuring out which imports each command needs

**Solution**:
1. Copy all imports from Phase file
2. Run `npm run build`
3. Remove unused imports (IDE will mark them)

### Issue 3: Line Numbers

**Problem**: Line numbers change as you extract commands

**Solution**:
- Extract in order (top to bottom)
- Or use git blame to find current line numbers

### Issue 4: Tests

**Problem**: No existing tests for Phase commands

**Solution**:
- Manual testing for now
- Add unit tests later (Priority 3 from [[Codebase Health Report]])

## Automation Opportunity

For future, consider creating extraction script:

```bash
./scripts/extract-command.sh Phase6Commands.ts CheckDuplicatesCommand
```

Script would:
1. Parse TypeScript AST
2. Find command class definition
3. Extract command + dependencies
4. Update index.ts
5. Run tests

**Effort**: 2-3 hours
**Benefit**: Save 4-5 hours on remaining 23 commands

## Benefits After Completion

### Developer Experience

- ✅ Faster file navigation
- ✅ Clearer git blame history
- ✅ Easier to find specific command
- ✅ Better IDE performance

### Code Quality

- ✅ Easier to test individual commands
- ✅ Clearer dependencies per command
- ✅ Reduced merge conflicts
- ✅ Easier to add new commands

### Maintainability

- ✅ Single Responsibility Principle
- ✅ Easier to deprecate old commands
- ✅ Clearer ownership per file
- ✅ Better for code review

## Next Steps

1. ~~**Phase6Commands.ts**~~ ✅ **COMPLETE** (7/7 commands extracted)

2. **Phase7Commands.ts** (6 commands, 1,065 lines) - NEXT
   - PlansCommand
   - FindMethodCommand
   - TodosCommand
   - StatsCommand
   - CoreApiCommand
   - SyncCoverageCommand

3. **Phase5Commands.ts** (6 commands, 865 lines)
   - DepsCommand
   - UsedByCommand
   - WhoUsesCommand
   - OrphansCommand
   - UndocumentedCommand
   - TreeCommand

4. **Phase4Commands.ts** (5 commands, 707 lines)
   - SuggestCommand
   - InitCommand
   - IdNewCommand
   - ValidateSpecCommand
   - GenerateDocsCommand

## Related

- [[Codebase Health Report]]: Original analysis identifying this issue
- Source: src/commands/Phase6Commands.ts (current state)
- Source: src/commands/CheckDuplicatesCommand.ts (example extraction)

## Timeline

- **Start**: 2025-11-13
- **First extraction**: 2025-11-13 (CheckDuplicatesCommand)
- **Phase6 completion**: 2025-11-13 (7 commands in one day)
- **Target completion**: 2025-11-15 (2 days)
- **Actual completion**: TBD

## Phase6 Summary

Completed all 7 commands from Phase6Commands.ts in a single session:

**Commits**:
1. efeda98 - CheckDuplicatesCommand (233 lines)
2. 1a12619 - SpecStatusCommand (323 lines)
3. f4614c5 - FindUnusedDocsCommand (188 lines)
4. 99441eb - SpecHistoryCommand (130 lines)
5. c6c9fd0 - SpecDiffCommand (152 lines)
6. 87c5b37 - SpecBumpCommand (131 lines)
7. 8ec0aee - FindDocCommand (197 lines)
8. 27c5ea1 - Deleted Phase6Commands.ts (1,178 lines removed)

**Results**:
- ✅ Reduced from 1 file (1,178 lines) to 7 files (avg 193 lines each)
- ✅ All commands tested and working
- ✅ Build successful
- ✅ Zero regressions

---

**Last Updated**: 2025-11-13
**Progress**: 7/24 commands (29%)
**Status**: 🚧 In Progress (Phase6 ✅ Complete, Phase7 Next)
