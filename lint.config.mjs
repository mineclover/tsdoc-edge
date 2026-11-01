/**
 * `@ttsc/lint` enforced build & LSP configuration (`0.34.3`).
 *
 * Auto-discovered by `ttsc` during `npm run build`, `npm run typecheck`,
 * `npm test`, and `ttscserver` editor sessions. Only clean, zero-backlog
 * rules live here at `error` severity so ordinary builds and test runs fail
 * immediately on regressions without printing backlog warning noise.
 *
 * Scope boundary: Biome owns formatting and syntax/style lint (`npm run lint`,
 * `npm run format`); no `format` block is declared here so `ttsc format` stays
 * inert. `tsdoc.json` is loaded natively by `tsdoc-edge/tsdoc-config` via
 * `@ttsc/lint` 0.34's `ProjectInputReader` (with automatic `ttscserver` file
 * watch invalidation and JSDoc `@tag` autocomplete hints).
 *
 * Backlog `warn` rules are layered in `lint.ratchet.config.mjs` (used by
 * `tsconfig.lint.json` / `npm run lint:ttsc`) and graduate here once they
 * reach zero findings.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsdocEdgeRules = require('./tools/ttsc-tsdoc/index.cjs');

/** @type {import('@ttsc/lint').ITtscLintConfig} */
export default {
  ignores: ['src/__tests__/fixtures/**'],
  plugins: { 'tsdoc-edge': tsdocEdgeRules },
  rules: {
    // Native TSDoc SSOT & Spec Graph (`tools/ttsc-tsdoc` Go contributor):
    // - `tsdoc-config`: ProjectRule + ProjectInputRule + HintRule reading tsdoc.json
    // - `check-tag-names`: parser-aware @tag / {@inlineTag} validation
    // - `tsdoc-escapes`: @microsoft/tsdoc prose escape validation with `ttsc fix` autofixes
    // - `param-signatures`: @param `name - desc` hyphen syntax + AST parameter signature matching
    // - `spec-index`: ProjectRule + ProjectInputGlob (`managed/**/*.md`) + HintRule + GraphRule
    // - `doc-link-syntax`: enforces `@doc [[Checkpoint]]` block-tag syntax
    'tsdoc-edge/tsdoc-config': 'error',
    'tsdoc-edge/check-tag-names': 'error',
    'tsdoc-edge/tsdoc-escapes': 'error',
    'tsdoc-edge/param-signatures': 'error',
    'tsdoc-edge/spec-index': 'error',
    'tsdoc-edge/doc-link-syntax': 'error',

    // Promise safety (type-aware; 0 findings across src/ and src/__tests__/)
    'typescript/no-floating-promises': 'error',
    'typescript/no-misused-promises': 'error',
    'typescript/await-thenable': 'error',

    // Checker-backed type correctness (0 findings across src/ and src/__tests__/)
    'typescript/no-unsafe-return': 'error',
    'typescript/restrict-plus-operands': 'error',
    'typescript/switch-exhaustiveness-check': 'error',
    'typescript/no-base-to-string': 'error',

    // TSDoc / JSDoc structural invariants (0 findings across src/ and src/__tests__/)
    'jsdoc/tsdoc-syntax': 'error',
    'jsdoc/require-param-name': 'error',
    'jsdoc/require-param-description': 'error',
    'jsdoc/require-returns-description': 'error',
    'jsdoc/empty-tags': 'error',
  },
};
