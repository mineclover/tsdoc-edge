# TODO

Open items found while re-applying the XML output and modular CLI work on top of upstream `master`.
The project's own TSDoc/managed-doc bookkeeping is intentionally not updated for these; this file is the only record.

## Failing tests (pre-existing, also fail on `master`)

- [ ] `src/__tests__/lsp/LspCanonicalGraphRefresh.test.ts`, 2 tests:
  - `keeps unchanged dirty-file ids, topology, and id/name queries overlay-aware`
  - `uses the composed workspace overlay for queries when multiple files are dirty`

  They expect plain symbol ids such as `src/a.ts#A.run:method`, but the canonical graph view now returns
  `@workspace/<package>/graph/ttsc:<package>/src/a.ts#A.run:method`. Decide whether the tests or the id
  surface of `service.getSymbolAtPosition` / `getCodeLenses` should change.

## Known defects (not fixed)

- [ ] `move` ignores the documented `--dry-run` / `--yes` options and can half-apply a move when the destination
      directory does not exist.
- [ ] `package.json` `rel:*` scripts and `scripts/relationship/*.sh` call flat names such as `relationship-impact`
      that are not registered commands.
- [ ] `relationship metrics --metric pagerank` is accepted but never sorts (the result key is `pageRank`).
- [ ] `help` instantiates every command, and some constructors create `.tsdoc.db` / `docs/` in the current directory.
      Give commands static descriptions so `help` can stay lazy.
- [ ] `npm test` (one jest run) aborts part-way on `master` as well. Run per directory instead:
      `npm run test:compile`, then `node scripts/run-test-js.cjs --silent __tests__/<dir>/`.
      Editing anything under `src/` makes `test:run` refuse ("stale"), so recompile first.

## Left on the old output on purpose

- [ ] `help`, `relationship-help`, `init`, `install-hook`, `uninstall-hook` (human / interactive output).
- [ ] `convention`, `convention check`, `spec extract` (own `--json` mode, used by the `prove-convention-poc` script).
- `build` was already XML-only upstream.

## Characteristics of this branch

See [docs/xml-output-and-modular-cli.md](docs/xml-output-and-modular-cli.md).
