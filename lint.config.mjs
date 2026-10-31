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
    // Native TSDoc SSOT: ProjectRule + ProjectInputRule + HintRule reading tsdoc.json,
    // paired with parser-aware file tag validation.
    'tsdoc-edge/tsdoc-config': 'error',
    'tsdoc-edge/check-tag-names': 'error',

    // Promise safety (type-aware; 0 findings across src/ and src/__tests__/)
    'typescript/no-floating-promises': 'error',
    'typescript/no-misused-promises': 'error',

    // Checker-backed return safety (0 findings across src/ and src/__tests__/)
    'typescript/no-unsafe-return': 'error',

    // TSDoc / JSDoc structural invariants (0 findings across src/ and src/__tests__/)
    'jsdoc/tsdoc-syntax': 'error',
    'jsdoc/require-param-name': 'error',
    'jsdoc/require-param-description': 'error',
    'jsdoc/require-returns-description': 'error',
    'jsdoc/empty-tags': 'error',
  },
};
