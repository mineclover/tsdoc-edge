#!/usr/bin/env node
'use strict';

/**
 * Empirical Backlink Idempotency, Path Sanitization, Self-Reference Prevention,
 * Deduplication, and Section Safety Test Suite.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const projectRoot = path.resolve(__dirname, '..');
const { UpdateBacklinksCommand } = require(
  path.join(projectRoot, 'dist', 'commands', 'UpdateBacklinksCommand')
);
const { BacklinkGenerator } = require(
  path.join(projectRoot, 'dist', 'doc-symbol', 'BacklinkGenerator')
);
const { DocumentSymbolParser } = require(
  path.join(projectRoot, 'dist', 'doc-symbol', 'DocumentSymbolParser')
);
const { DocumentSymbolRegistry } = require(
  path.join(projectRoot, 'dist', 'doc-symbol', 'DocumentSymbolRegistry')
);

async function main() {
  console.log('================================================================================');
  console.log('Milestone 2 Empirical Backlink Adversarial Verification');
  console.log('================================================================================\n');

  const report = {
    test1_multiPassIdempotency: null,
    test2_pathSanitization: null,
    test3_selfReferenceAndDedup: null,
    test4_boundaryPreservation: null,
    verdict: 'PENDING',
  };

  try {
    // --------------------------------------------------------------------------
    // Test 1: 100% Idempotency Across Consecutive Runs on a Temporary Replica
    // --------------------------------------------------------------------------
    console.log('[Test 1] Multi-Pass Idempotency on Replica of managed/ ...');
    const tempDir = path.join(projectRoot, '.test-temp', `managed-replica-${Date.now()}`);
    const originalManagedDir = path.join(projectRoot, 'managed');
    const replicaManagedDir = path.join(tempDir, 'managed');

    // Recursively copy managed/ to replica
    copyDirRecursive(originalManagedDir, replicaManagedDir);
    const replicaFiles = getAllMarkdownFiles(replicaManagedDir);
    console.log(`  Copied ${replicaFiles.length} files to temporary replica: ${replicaManagedDir}`);

    // Verify 220 symbol definitions exist among the replica files
    const p = new DocumentSymbolParser();
    let defCount = 0;
    for (const f of replicaFiles) {
      const parsed = p.parse(f);
      if (parsed?.primary) defCount++;
    }
    console.log(
      `  Identified ${defCount} primary document symbol definitions across ${replicaFiles.length} files.`
    );
    if (defCount !== 220) {
      throw new Error(`Expected exactly 220 primary definitions, found ${defCount}`);
    }

    // Pass 1: Run update backlinks on replica
    console.log('  Executing Pass 1...');
    const cmd1 = new UpdateBacklinksCommand();
    const res1 = await cmd1.execute([replicaManagedDir]);
    if (res1.exitCode !== 0) {
      throw new Error(`Pass 1 failed with exit code ${res1.exitCode}`);
    }

    // Capture Pass 1 state: SHA256 hash and mtime of every file
    const pass1Hashes = new Map();
    const pass1Mtimes = new Map();
    for (const f of replicaFiles) {
      const content = fs.readFileSync(f, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      pass1Hashes.set(f, hash);
      pass1Mtimes.set(f, fs.statSync(f).mtimeMs);
    }

    // Short sleep to ensure filesystem mtime would tick if written
    await sleep(200);

    // Pass 2: Execute again on exact state
    console.log('  Executing Pass 2...');
    const cmd2 = new UpdateBacklinksCommand();
    const res2 = await cmd2.execute([replicaManagedDir]);
    if (res2.exitCode !== 0) {
      throw new Error(`Pass 2 failed with exit code ${res2.exitCode}`);
    }

    let pass2ChangedContent = 0;
    let pass2ChangedMtime = 0;
    for (const f of replicaFiles) {
      const content = fs.readFileSync(f, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const mtime = fs.statSync(f).mtimeMs;
      if (hash !== pass1Hashes.get(f)) {
        pass2ChangedContent++;
      }
      if (mtime !== pass1Mtimes.get(f)) {
        pass2ChangedMtime++;
      }
    }

    console.log(
      `  Pass 2 Results: ${pass2ChangedContent} content changes, ${pass2ChangedMtime} mtime changes.`
    );
    if (pass2ChangedContent !== 0) {
      throw new Error(`Pass 2 violated idempotency: ${pass2ChangedContent} files changed content!`);
    }
    if (pass2ChangedMtime !== 0) {
      throw new Error(
        `Pass 2 violated write-skipping: ${pass2ChangedMtime} files were touched on disk!`
      );
    }

    // Short sleep again
    await sleep(200);

    // Pass 3: Execute a third time
    console.log('  Executing Pass 3...');
    const cmd3 = new UpdateBacklinksCommand();
    const res3 = await cmd3.execute([replicaManagedDir]);
    if (res3.exitCode !== 0) {
      throw new Error(`Pass 3 failed with exit code ${res3.exitCode}`);
    }

    let pass3ChangedContent = 0;
    let pass3ChangedMtime = 0;
    for (const f of replicaFiles) {
      const content = fs.readFileSync(f, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const mtime = fs.statSync(f).mtimeMs;
      if (hash !== pass1Hashes.get(f)) {
        pass3ChangedContent++;
      }
      if (mtime !== pass1Mtimes.get(f)) {
        pass3ChangedMtime++;
      }
    }

    console.log(
      `  Pass 3 Results: ${pass3ChangedContent} content changes, ${pass3ChangedMtime} mtime changes.`
    );
    if (pass3ChangedContent !== 0 || pass3ChangedMtime !== 0) {
      throw new Error(`Pass 3 violated idempotency!`);
    }

    report.test1_multiPassIdempotency = {
      status: 'PASSED',
      totalFiles: replicaFiles.length,
      primaryDefinitions: defCount,
      pass1Executed: true,
      pass2ContentChanges: pass2ChangedContent,
      pass2MtimeChanges: pass2ChangedMtime,
      pass3ContentChanges: pass3ChangedContent,
      pass3MtimeChanges: pass3ChangedMtime,
    };

    // Clean up replica directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('  ✓ Test 1: 100% Idempotency across 3 consecutive passes PASSED\n');

    // --------------------------------------------------------------------------
    // Test 2: Path Sanitization & Leak Prevention
    // --------------------------------------------------------------------------
    console.log('[Test 2] Path Sanitization & Host Leak Prevention on managed/ ...');
    const managedFiles = getAllMarkdownFiles(originalManagedDir);
    let totalBacklinkLines = 0;
    const leakedLines = [];

    for (const f of managedFiles) {
      const content = fs.readFileSync(f, 'utf8');
      const lines = content.split('\n');
      let inBacklinks = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^## Backlinks\b/.test(line)) {
          inBacklinks = true;
          continue;
        }
        if (inBacklinks && /^#{1,2}\s+/.test(line)) {
          inBacklinks = false;
        }
        if (inBacklinks && line.trim().startsWith('- ')) {
          totalBacklinkLines++;

          // Assert NO absolute host paths
          if (line.includes('/Users/') || line.includes('/home/') || /[a-zA-Z]:\\/.test(line)) {
            leakedLines.push({ file: f, line: i + 1, content: line });
          }

          // Assert path format: must contain relative path separator arrow " → "
          if (line.includes(' → ')) {
            const rightPart = line.split(' → ')[1].trim();
            // Path before :lineNumber
            const relFilePath = rightPart.split(':')[0];
            if (path.isAbsolute(relFilePath)) {
              leakedLines.push({
                file: f,
                line: i + 1,
                content: line,
                reason: 'Absolute path found',
              });
            }
            if (relFilePath.includes('\\')) {
              leakedLines.push({ file: f, line: i + 1, content: line, reason: 'Backslash found' });
            }
          }
        }
      }
    }

    console.log(
      `  Scanned ${totalBacklinkLines} backlink lines across ${managedFiles.length} files.`
    );
    if (leakedLines.length > 0) {
      console.error(
        `  FAIL: Found ${leakedLines.length} leaked absolute paths:`,
        leakedLines.slice(0, 5)
      );
      throw new Error(`Path sanitization failure: ${leakedLines.length} absolute paths leaked!`);
    }

    report.test2_pathSanitization = {
      status: 'PASSED',
      totalBacklinkLinesScanned: totalBacklinkLines,
      leakedPathCount: 0,
    };
    console.log('  ✓ Test 2: Path Sanitization PASSED (0 leaks)\n');

    // --------------------------------------------------------------------------
    // Test 3: Self-Reference & Deduplication
    // --------------------------------------------------------------------------
    console.log('[Test 3] Self-Reference & Deduplication Verification...');
    const selfReferences = [];
    const duplicateRows = [];

    for (const f of managedFiles) {
      const content = fs.readFileSync(f, 'utf8');
      // Extract primary symbol
      const h1Match = content.match(/^#\s+\[\[([^\]]+)\]\]/m);
      if (!h1Match) continue;
      const primarySymbol = h1Match[1];

      const backlinksSectionMatch = content.match(
        /^---\n\n## Backlinks\n([\s\S]*?)(?=(?:---|#{1,2}\s+|$))/m
      );
      if (!backlinksSectionMatch) continue;

      const sectionText = backlinksSectionMatch[1];
      const lines = sectionText.split('\n');

      let currentSub = '';
      const seenSourcesInFile = new Set();
      const seenCodeInFile = new Set();

      for (const line of lines) {
        if (line.startsWith('### ')) {
          currentSub = line.trim();
          continue;
        }
        if (!line.trim().startsWith('- ')) continue;

        if (currentSub === '### Referenced By') {
          // Check for self reference
          const selfRefMatch = line.match(/^- \[\[([^\]]+)\]\]/);
          if (selfRefMatch && selfRefMatch[1] === primarySymbol) {
            selfReferences.push({ file: f, symbol: primarySymbol, line });
          }

          // Check for duplicate source in document backlinks
          if (selfRefMatch) {
            const sourceDoc = selfRefMatch[1];
            if (seenSourcesInFile.has(sourceDoc)) {
              duplicateRows.push({ file: f, duplicateSource: sourceDoc, line });
            }
            seenSourcesInFile.add(sourceDoc);
          }
        } else if (currentSub === '### Implemented By') {
          // Check for duplicate code connection
          const key = line.trim();
          if (seenCodeInFile.has(key)) {
            duplicateRows.push({ file: f, duplicateCode: key });
          }
          seenCodeInFile.add(key);
        }
      }
    }

    console.log(`  Self-references found: ${selfReferences.length}`);
    console.log(`  Duplicate rows found: ${duplicateRows.length}`);
    if (selfReferences.length > 0) {
      throw new Error(`Self-references detected in ${selfReferences.length} files!`);
    }
    if (duplicateRows.length > 0) {
      throw new Error(`Duplicate rows detected in ${duplicateRows.length} files!`);
    }

    report.test3_selfReferenceAndDedup = {
      status: 'PASSED',
      selfReferenceCount: 0,
      duplicateRowCount: 0,
    };
    console.log('  ✓ Test 3: Self-Reference & Deduplication PASSED\n');

    // --------------------------------------------------------------------------
    // Test 4: Non-Destructive Boundary Preservation
    // --------------------------------------------------------------------------
    console.log('[Test 4] Boundary Preservation Adversarial Testing...');
    const testDir = path.join(projectRoot, '.test-temp', `boundary-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Harness cases
    const testCases = [
      {
        name: 'Trailing ## References',
        content: `# [[Boundary1]]\n\nIntro.\n\n---\n\n## Backlinks\n\n### Referenced By\n\n- [[Old]] → old.md:1\n\n## References\n\n- [TSDoc](https://tsdoc.org)\n- [Jest](https://jestjs.io)\n`,
        expectedTrailing:
          '## References\n\n- [TSDoc](https://tsdoc.org)\n- [Jest](https://jestjs.io)',
      },
      {
        name: 'Trailing ## Footnotes',
        content: `# [[Boundary2]]\n\nIntro.\n\n---\n\n## Backlinks\n\n### Referenced By\n\n- [[Old]] → old.md:1\n\n## Footnotes\n\n[^1]: Critical technical footnote.\n`,
        expectedTrailing: '## Footnotes\n\n[^1]: Critical technical footnote.',
      },
      {
        name: 'Trailing ## Appendix with subheadings',
        content: `# [[Boundary3]]\n\nIntro.\n\n---\n\n## Backlinks\n\n### Referenced By\n\n- [[Old]] → old.md:1\n\n## Appendix\n\n### Subsection A.1\n\nDeep content.\n`,
        expectedTrailing: '## Appendix\n\n### Subsection A.1\n\nDeep content.',
      },
      {
        name: 'Trailing --- separator followed by ## Custom',
        content: `# [[Boundary4]]\n\nIntro.\n\n---\n\n## Backlinks\n\n### Referenced By\n\n- [[Old]] → old.md:1\n\n---\n\n## Custom Section\n\nCustom content with code block:\n\n\`\`\`ts\nconst x = 1;\n\`\`\`\n`,
        expectedTrailing:
          '## Custom Section\n\nCustom content with code block:\n\n```ts\nconst x = 1;\n```',
      },
    ];

    let boundaryFailures = 0;
    for (const tc of testCases) {
      const filePath = path.join(testDir, `${tc.name.replace(/[^a-zA-Z0-9]/g, '_')}.md`);
      fs.writeFileSync(filePath, tc.content, 'utf8');

      // Create isolated registry and generator
      const reg = new DocumentSymbolRegistry();
      const docParser = new DocumentSymbolParser();
      const parsed = docParser.parse(filePath);
      reg.registerDocument(parsed);
      // Register a code connection so backlinks are generated
      reg.registerCodeConnection({
        codeSymbol: parsed.primary.name,
        filePath: 'src/mock.ts',
        line: 10,
        docSymbol: parsed.primary.name,
      });

      const gen = new BacklinkGenerator(reg);
      gen.updateBacklinksSection(filePath, parsed.primary.name);

      const updated = fs.readFileSync(filePath, 'utf8');
      if (!updated.includes(tc.expectedTrailing)) {
        console.error(`  FAIL: Boundary preservation failed for case: ${tc.name}`);
        boundaryFailures++;
      }
    }

    // Clean up testDir
    fs.rmSync(testDir, { recursive: true, force: true });

    if (boundaryFailures > 0) {
      throw new Error(`Boundary preservation failed in ${boundaryFailures} cases!`);
    }

    report.test4_boundaryPreservation = {
      status: 'PASSED',
      casesTested: testCases.length,
      failures: 0,
    };
    console.log(
      `  ✓ Test 4: Boundary Preservation PASSED (${testCases.length}/${testCases.length} cases preserved)\n`
    );

    report.verdict = 'APPROVE';
    console.log('================================================================================');
    console.log('VERDICT: APPROVE');
    console.log('All empirical verification criteria satisfied 100%.');
    console.log('================================================================================');
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('\n❌ EMPIRICAL VERIFICATION FAILED:', err);
    report.verdict = 'REQUEST_CHANGES';
    report.error = err.message;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getAllMarkdownFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMarkdownFiles(full));
    } else if (entry.isFile() && full.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
