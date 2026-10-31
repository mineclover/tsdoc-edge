/**
 * `@ttsc/lint` contributor descriptor for tsdoc-edge's native TSDoc rules.
 *
 * Loaded by lint.config.ts. The Go source in ./rules is linked into the
 * `@ttsc/lint` binary at build time; rule registration happens in its `init()`.
 */
const path = require('node:path');

/** @type {import('@ttsc/lint').ITtscLintPlugin} */
module.exports = {
  meta: { name: 'tsdoc-edge-ttsc-tsdoc', version: '0.1.0', namespace: 'tsdoc-edge' },
  rules: ['check-tag-names'],
  source: path.resolve(__dirname, 'rules'),
};
