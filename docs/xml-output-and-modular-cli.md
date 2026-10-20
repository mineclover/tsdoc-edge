# XML output and modular CLI

Summary of what the `feat/xml-output-and-modular-cli` branch changes and how it behaves. Open follow-ups live in
[TODO.md](../TODO.md); release notes are in [CHANGELOG.md](../CHANGELOG.md).

## Output contract

- **XML by default**: 79 commands print exactly one XML document. The previous colored terminal report is
  available with `--human` and is byte-identical to the former default for every converted command, except
  `relationship-check` section 3, the removed "Reverse graph built" line of `relationship-path`, and the extra
  `--human` line in `--help`.
- **Failure paths stay plain text** with the old exit codes (not found, bad arguments, missing database).
- **`--human` may come first** for commands whose argument parsing was adjusted (`parse`, `analyze`,
  `check-duplicates`, ...).
- **Scripts that parse the old text output must pass `--human`.**
- **Left on the old output**: `help`, `relationship-help`, `init`, `install-hook`, `uninstall-hook`, `convention`,
  `convention check`, `spec extract`. `build` was already XML-only. `install-hook` now writes
  `pre-commit-run --human` into the git hook.
- **Robust output**: `printOutput` renders nested objects and arrays and no longer overflows the stack on large
  reports (checked up to an 11.7 MB document); stdout and stderr are drained before exit, so piped XML is not
  truncated, and a closed pipe does not crash the CLI. `resolveSymbol({ quiet })` keeps the "Selected: ..." note
  out of XML.

## Command loading

- `cli.ts` no longer imports and instantiates every command. `src/commands/command-loader.ts` declares each command
  by name and aliases; the command module is loaded on first use through `CommandRegistry.registerLazy`.
- A drift-guard test instantiates every declaration and compares names and aliases with the real command.
- `help` lists every command description, so it still loads all of them.
- `tsdoc-edge --version` no longer creates `.tsdoc.db` and `docs/` in the current directory.

| Command (median of 15, ms) | before | after |
|----------------------------|--------|-------|
| `--version`                | 234-247 | 30 |
| `stats`                    | 273-316 | 98-107 |
| unknown command            | 235-249 | 32 |
| `help`                     | 244-251 | 234-275 |

## Services

- `GraphService` (`src/graph/GraphService.ts`) holds the impact, path, cluster and centrality analysis shared by
  the four `relationship-*` commands.
- `BuildService` (`src/service/BuildService.ts`) holds the database construction workflow;
  `BuildCommand` shrinks from about 1,580 to 370 lines.
- Both services are the current upstream logic moved, not a rewrite: `relationship-*` `--human` output is identical
  to `master`, and a build of a 544-file tree gives identical statistics and rows in every table except
  uuid/timestamp columns (which also differ between two runs of `master`).

## Fixes shipped with it

- `orphans`, `parallel-work` and `test-relationships` no longer crash with `ENOENT: mkdir ''`:
  `new DatabaseManager(dbPath, '')` now means "no JSONL directory", and `exportToJSONL()` fails with an explicit
  message for such a manager.

## Verification

- `typecheck`, test typecheck, build: clean. `npm run lint`: 22 warnings (budget 31).
- Tests per directory: 234 suites, 3,527 tests; the only failures are the two pre-existing
  `lsp/LspCanonicalGraphRefresh` tests listed in the TODO.
- XML well-formedness checked for every success path.
