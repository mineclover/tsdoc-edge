const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const distDir = path.join(repositoryRoot, 'dist');

fs.rmSync(distDir, { recursive: true, force: true });
