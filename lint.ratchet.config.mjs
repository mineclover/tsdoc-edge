/**
 * `@ttsc/lint` production-strict & ratchet configuration (`npm run lint:ttsc` via `tsconfig.lint.json`).
 *
 * Extends `./lint.config.mjs` (20 global `error` rules across `src/` and `src/__tests__/`)
 * and enforces the 5 additional production type-safety rules at `error` severity across `src/`
 * (graduated from 930 backlog warnings down to 0 findings).
 */

/** @type {import('@ttsc/lint').ITtscLintConfig} */
export default {
  extends: './lint.config.mjs',
  rules: {
    'typescript/require-await': 'error',
    'typescript/no-unnecessary-type-assertion': 'error',
    'typescript/no-unnecessary-condition': 'error',
    'typescript/no-unsafe-argument': 'error',
    'typescript/no-unsafe-assignment': 'error',
  },
};
