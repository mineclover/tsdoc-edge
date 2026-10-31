/**
 * `@ttsc/lint` ratchet configuration (`npm run lint:ttsc` via `tsconfig.lint.json`).
 *
 * Extends `./lint.config.mjs` (all enforced `error` rules) and layers the
 * remaining type-aware `warn` backlog rules. `scripts/verify-ttsc-lint-baseline.cjs`
 * enforces monotonic downward counts against `scripts/ttsc-lint-baseline.json`.
 * When a rule's count reaches 0, promote it to `error` in `lint.config.mjs`.
 */

/** @type {import('@ttsc/lint').ITtscLintConfig} */
export default {
  extends: './lint.config.mjs',
  rules: {
    // Promise / async hygiene backlog
    'typescript/await-thenable': 'warn',
    'typescript/require-await': 'warn',

    // Checker-backed correctness & migration backlog
    'typescript/no-unnecessary-type-assertion': 'warn',
    'typescript/no-unnecessary-condition': 'warn',
    'typescript/switch-exhaustiveness-check': 'warn',
    'typescript/no-deprecated': 'warn',
    'typescript/no-base-to-string': 'warn',
    'typescript/restrict-plus-operands': 'warn',
    'typescript/no-unsafe-argument': 'warn',
    'typescript/no-unsafe-assignment': 'warn',
  },
};
