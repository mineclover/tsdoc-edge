/**
 * `@ttsc/lint` contributor descriptor for tsdoc-edge's native TSDoc rules.
 *
 * Loaded by `lint.config.mjs`. The Go source in `./rules` is linked into the
 * `@ttsc/lint` binary at build time (or ahead of time via `ttsc prepare`);
 * rule registration happens in package `init()`.
 */
const path = require('node:path');

/** @type {import('@ttsc/lint').ITtscLintPlugin} */
module.exports = {
  meta: { name: 'tsdoc-edge-ttsc-tsdoc', version: '0.3.0', namespace: 'tsdoc-edge' },
  rules: [
    'tsdoc-config',
    'check-tag-names',
    'tsdoc-escapes',
    'param-signatures',
    'spec-index',
    'doc-link-syntax',
    'doc-link-target',
  ],
  source: path.resolve(__dirname, 'rules'),
};
