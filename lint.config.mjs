/**
 * `@ttsc/lint` configuration.
 *
 * Scope: only what Biome cannot check. Biome owns syntax/style lint and formatting
 * (`npm run lint`, `npm run format`); this config adds type-aware rules that need
 * the TypeScript checker, plus native TSDoc checks. No `format` block, so
 * `ttsc format` stays inert and does not fight Biome.
 *
 * Plain ESM (not .ts) because @ttsc/lint type-checks .ts configs in an isolated
 * project without @types/node.
 *
 * Phase 0 (measurement): every rule is `warn`; `npm run lint:ttsc` reports
 * without failing. Rules graduate to `error` per family once clean.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { StandardTags } from '@microsoft/tsdoc';

const require = createRequire(import.meta.url);
const tsdocJson = JSON.parse(readFileSync(new URL('./tsdoc.json', import.meta.url), 'utf8'));
const tsdocEdgeRules = require('./tools/ttsc-tsdoc/index.cjs');

/** Allowed TSDoc tags: @microsoft/tsdoc standard tags + tsdoc.json definitions (SSOT). */
const tsdocTags = [
  ...StandardTags.allDefinitions.map((definition) => definition.tagName),
  ...tsdocJson.tagDefinitions.map((definition) => definition.tagName),
];

/** @type {import('@ttsc/lint').ITtscLintConfig} */
export default {
  ignores: ['src/__tests__/fixtures/**'],
  plugins: { 'tsdoc-edge': tsdocEdgeRules },
  rules: {
    // Native TSDoc tag check driven by tsdoc.json. Replaces jsdoc/check-tag-names,
    // whose fixed JSDoc vocabulary rejects TSDoc standard and project tags.
    'tsdoc-edge/check-tag-names': ['warn', { tags: tsdocTags }],

    // Promise safety (type-aware)
    'typescript/no-floating-promises': 'warn',
    'typescript/no-misused-promises': 'warn',
    'typescript/await-thenable': 'warn',
    'typescript/require-await': 'warn',

    // Checker-backed correctness (type-aware)
    'typescript/no-unnecessary-type-assertion': 'warn',
    'typescript/no-unnecessary-condition': 'warn',
    'typescript/switch-exhaustiveness-check': 'warn',
    'typescript/no-deprecated': 'warn',
    'typescript/no-base-to-string': 'warn',
    'typescript/restrict-plus-operands': 'warn',
    'typescript/no-unsafe-argument': 'warn',
    'typescript/no-unsafe-assignment': 'warn',
    'typescript/no-unsafe-return': 'warn',

    // JSDoc structure (native subset; full grammar stays in `validate-tsdoc`)
    'jsdoc/tsdoc-syntax': 'warn',
    'jsdoc/require-param-name': 'warn',
    'jsdoc/require-param-description': 'warn',
    'jsdoc/require-returns-description': 'warn',
    'jsdoc/empty-tags': 'warn',
  },
};
