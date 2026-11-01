#!/usr/bin/env node
'use strict';

/**
 * Milestone 3 Adversarial CLI Option Fuzzing & Error Path Test Suite
 *
 * Stress-tests:
 * 1. Option Fuzzing and Ordering on `wc` and `dc`
 * 2. Nonexistent Targets and Path Traversal on `wc` and `dc`
 * 3. Empty Arguments on `wc` and `dc`
 * 4. Relationship Command Error Paths (missing args, invalid types, invalid options, nonexistent symbols)
 * 5. Document Command Error Paths (nonexistent directories, empty directories, umbrella vs flat)
 * 6. Unknown Commands and Typos
 * 7. Invariant Checks: Exit codes, clean stderr/stdout, zero stack traces leaked.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'dist', 'cli.js');

const STACK_TRACE_PATTERNS = [
  /TypeError:/,
  /ReferenceError:/,
  /RangeError:/,
  /UnhandledPromiseRejection/,
  /Unhandled error in/,
  /node:internal/,
  /at (?:async )?[a-zA-Z0-9_$.]+\s+\(/,
  /Fatal error:/,
];

function runCli(args) {
  const start = performance.now();
  const res = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, NODE_ENV: 'test' },
  });
  const duration = performance.now() - start;

  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  const exitCode = res.status ?? (res.error ? -1 : 0);

  // Check for leaked stack traces
  const leakedStackTraces = [];
  for (const pattern of STACK_TRACE_PATTERNS) {
    if (pattern.test(stderr)) {
      leakedStackTraces.push(`stderr matched ${pattern}`);
    }
    // Also check stdout for fatal unhandled exceptions
    if (/UnhandledPromiseRejection/.test(stdout) || /Fatal error:/.test(stdout)) {
      leakedStackTraces.push(`stdout matched unhandled error pattern`);
    }
  }

  return {
    exitCode,
    stdout,
    stderr,
    duration,
    leakedStackTraces,
    error: res.error,
  };
}

const testCases = [
  // ===========================================================================
  // Category 1: Option Fuzzing & Ordering on `wc` (WorkContextCommand)
  // ===========================================================================
  {
    id: 'WC-01',
    category: 'wc-fuzzing',
    args: ['wc', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['<work-context ', '</work-context>'],
    description: 'Basic wc positional target (XML default)',
  },
  {
    id: 'WC-02',
    category: 'wc-fuzzing',
    args: ['wc', 'src/commands/BuildCommand.ts', '--llm'],
    expectedExitCodes: [0],
    stdoutIncludes: ['# Context:', '## Summary', '## Dependencies'],
    description: 'wc target with trailing --llm flag',
  },
  {
    id: 'WC-03',
    category: 'wc-fuzzing',
    args: ['wc', '--llm', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['# Context:', '## Summary'],
    description: 'wc target with leading --llm flag',
  },
  {
    id: 'WC-04',
    category: 'wc-fuzzing',
    args: ['wc', '--depth=2', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['<work-context ', '</work-context>'],
    description: 'wc with leading --depth=2 (equals syntax)',
  },
  {
    id: 'WC-05',
    category: 'wc-fuzzing',
    args: ['wc', '--depth', '2', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['<work-context ', '</work-context>'],
    description: 'wc with leading --depth 2 (space separated)',
  },
  {
    id: 'WC-06',
    category: 'wc-fuzzing',
    args: ['wc', 'src/commands/BuildCommand.ts', '--depth', '3'],
    expectedExitCodes: [0],
    stdoutIncludes: ['<work-context ', '</work-context>'],
    description: 'wc with trailing --depth 3',
  },
  {
    id: 'WC-07',
    category: 'wc-fuzzing',
    args: ['wc', '--category', 'structural', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['<work-context ', '</work-context>'],
    description: 'wc with leading --category structural',
  },
  {
    id: 'WC-08',
    category: 'wc-fuzzing',
    args: ['wc', '--category=structural,verification', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['<work-context ', '</work-context>'],
    description: 'wc with leading --category=structural,verification (equals + comma)',
  },
  {
    id: 'WC-09',
    category: 'wc-fuzzing',
    args: ['wc', '--llm', '--depth=1', '--category=structural', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['# Context:'],
    description: 'wc with multiple mixed leading flags (--llm, --depth=1, --category=structural)',
  },
  {
    id: 'WC-10',
    category: 'wc-fuzzing',
    args: ['wc', '--human', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['Work Context: BuildCommand.ts'],
    description: 'wc with --human flag',
  },
  {
    id: 'WC-11',
    category: 'wc-fuzzing',
    args: ['work-context', '--llm', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['# Context:'],
    description: 'Full command name work-context with leading --llm',
  },
  {
    id: 'WC-12',
    category: 'wc-fuzzing',
    args: ['wc', '--output', 'dist/test-wc-out1.xml', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    description: 'wc with leading --output file',
  },
  {
    id: 'WC-13',
    category: 'wc-fuzzing',
    args: ['wc', '--output=dist/test-wc-out2.xml', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    description: 'wc with leading --output=file (equals syntax)',
  },
  {
    id: 'WC-14',
    category: 'wc-fuzzing',
    args: ['wc', 'src/commands/BuildCommand.ts', '--output', 'dist/test-wc-out3.xml'],
    expectedExitCodes: [0],
    description: 'wc with trailing --output file',
  },
  {
    id: 'WC-15',
    category: 'wc-fuzzing',
    args: ['wc', '--llm', '--output=dist/test-wc-out4.txt', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    description: 'wc with --llm --output=file',
  },

  // ===========================================================================
  // Category 2: Option Fuzzing & Ordering on `dc` (DesignContextCommand)
  // ===========================================================================
  {
    id: 'DC-01',
    category: 'dc-fuzzing',
    args: ['dc', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['Design Context: BuildCommand.ts'],
    description: 'dc standard positional target (human readable)',
  },
  {
    id: 'DC-02',
    category: 'dc-fuzzing',
    args: ['dc', '--llm', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['# Design Context:', '## Summary'],
    description: 'dc with leading --llm flag',
  },
  {
    id: 'DC-03',
    category: 'dc-fuzzing',
    args: ['dc', 'src/commands/BuildCommand.ts', '--llm'],
    expectedExitCodes: [0],
    stdoutIncludes: ['# Design Context:'],
    description: 'dc with trailing --llm flag',
  },
  {
    id: 'DC-04',
    category: 'dc-fuzzing',
    args: ['design-context', '--llm', 'src/commands/BuildCommand.ts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['# Design Context:'],
    description: 'Full command name design-context with leading --llm',
  },

  // ===========================================================================
  // Category 3: Nonexistent Targets & Path Traversal on `wc` & `dc`
  // ===========================================================================
  {
    id: 'WC-NONEXIST-01',
    category: 'wc-nonexistent',
    args: ['wc', 'src/nonexistent/FakeTargetFile_XYZ.ts'],
    expectedExitCodes: [1],
    stdoutIncludes: ['File not found'],
    description: 'wc on nonexistent file exits 1 with clean error message',
  },
  {
    id: 'WC-NONEXIST-02',
    category: 'wc-nonexistent',
    args: ['wc', '--llm', 'src/nonexistent/FakeTargetFile_XYZ.ts'],
    expectedExitCodes: [1],
    stdoutIncludes: ['File not found'],
    description: 'wc --llm on nonexistent file exits 1 with clean error message',
  },
  {
    id: 'DC-NONEXIST-01',
    category: 'dc-nonexistent',
    args: ['dc', 'src/nonexistent/FakeTargetFile_XYZ.ts'],
    expectedExitCodes: [1],
    stdoutIncludes: ['File not found'],
    description: 'dc on nonexistent file exits 1 with clean error message',
  },
  {
    id: 'DC-NONEXIST-02',
    category: 'dc-nonexistent',
    args: ['dc', '--llm', 'src/nonexistent/FakeTargetFile_XYZ.ts'],
    expectedExitCodes: [1],
    stdoutIncludes: ['File not found'],
    description: 'dc --llm on nonexistent file exits 1 with clean error message',
  },
  {
    id: 'WC-TRAVERSAL-01',
    category: 'wc-nonexistent',
    args: ['wc', '../../nonexistent/outside.ts'],
    expectedExitCodes: [1],
    stdoutIncludes: ['File not found'],
    description: 'wc with path traversal nonexistent target exits 1 cleanly',
  },
  {
    id: 'DC-TRAVERSAL-01',
    category: 'dc-nonexistent',
    args: ['dc', '../../nonexistent/outside.ts'],
    expectedExitCodes: [1],
    stdoutIncludes: ['File not found'],
    description: 'dc with path traversal nonexistent target exits 1 cleanly',
  },

  // ===========================================================================
  // Category 4: Empty Arguments on `wc` & `dc`
  // ===========================================================================
  {
    id: 'WC-EMPTY-01',
    category: 'wc-empty',
    args: ['wc'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Usage:', 'work-context <file-path>'],
    description: 'wc with zero arguments prints usage and exits 1',
  },
  {
    id: 'WC-EMPTY-02',
    category: 'wc-empty',
    args: ['work-context'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Usage:', 'work-context <file-path>'],
    description: 'work-context with zero arguments prints usage and exits 1',
  },
  {
    id: 'WC-EMPTY-03',
    category: 'wc-empty',
    args: ['wc', '--llm'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Usage:', 'work-context <file-path>'],
    description: 'wc with --llm but missing positional file argument exits 1',
  },
  {
    id: 'WC-EMPTY-04',
    category: 'wc-empty',
    args: ['wc', '--depth', '2'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Usage:', 'work-context <file-path>'],
    description: 'wc with --depth 2 but missing positional file argument exits 1',
  },
  {
    id: 'DC-EMPTY-01',
    category: 'dc-empty',
    args: ['dc'],
    expectedExitCodes: [1],
    stdoutIncludes: ['File path required'],
    description: 'dc with zero arguments prints usage and exits 1',
  },
  {
    id: 'DC-EMPTY-02',
    category: 'dc-empty',
    args: ['design-context'],
    expectedExitCodes: [1],
    stdoutIncludes: ['File path required'],
    description: 'design-context with zero arguments prints usage and exits 1',
  },
  {
    id: 'DC-EMPTY-03',
    category: 'dc-empty',
    args: ['dc', '--llm'],
    expectedExitCodes: [1],
    stdoutIncludes: ['File path required'],
    description: 'dc with --llm but missing positional file argument exits 1',
  },

  // ===========================================================================
  // Category 5: Relationship Command Error Paths
  // ===========================================================================
  {
    id: 'REL-IMPACT-UMBRELLA-NONEXIST',
    category: 'relationship-error',
    args: ['relationship', 'impact', 'completely_fake_symbol_id_999999'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Symbol not found: completely_fake_symbol_id_999999'],
    description: 'relationship impact with nonexistent symbol ID exits 1',
  },
  {
    id: 'REL-IMPACT-ALIAS-NONEXIST',
    category: 'relationship-error',
    args: ['rel', 'impact', 'completely_fake_symbol_id_999999'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Symbol not found: completely_fake_symbol_id_999999'],
    description: 'rel impact (alias) with nonexistent symbol ID exits 1',
  },
  {
    id: 'REL-IMPACT-UMBRELLA-EMPTY',
    category: 'relationship-error',
    args: ['relationship', 'impact'],
    expectedExitCodes: [0, 1],
    stdoutIncludes: ['Symbol ID required'],
    description: 'relationship impact with missing args prints Symbol ID required',
  },
  {
    id: 'REL-QUERY-INVALID-TYPE',
    category: 'relationship-error',
    args: [
      'relationship',
      'query',
      'buildcommand-class-buildcommand',
      '--type',
      'NONEXISTENT_TYPE_XYZ',
    ],
    expectedExitCodes: [0],
    stdoutIncludes: ['No relationships found'],
    description: 'relationship query with invalid/nonexistent type returns 0 matches cleanly',
  },
  {
    id: 'REL-QUERY-INVALID-TYPE-EQUALS',
    category: 'relationship-error',
    args: [
      'relationship',
      'query',
      'buildcommand-class-buildcommand',
      '--type=NONEXISTENT_TYPE_XYZ',
    ],
    expectedExitCodes: [0],
    stdoutIncludes: ['No relationships found'],
    description: 'relationship query with --type=... equals syntax returns 0 matches cleanly',
  },
  {
    id: 'REL-QUERY-UMBRELLA-EMPTY',
    category: 'relationship-error',
    args: ['relationship', 'query'],
    expectedExitCodes: [0, 1],
    stdoutIncludes: ['Symbol ID required'],
    description: 'relationship query with missing args displays Symbol ID required',
  },
  {
    id: 'REL-QUERY-NONEXISTENT-SYMBOL',
    category: 'relationship-error',
    args: ['relationship', 'query', 'totally_fake_symbol_id_999'],
    expectedExitCodes: [0, 1],
    stdoutIncludes: ['No relationships found'],
    description: 'relationship query on nonexistent symbol handles 0 relationships cleanly',
  },
  {
    id: 'REL-CLUSTERS-INVALID-MINSIZE',
    category: 'relationship-error',
    args: ['relationship', 'clusters', '--min-size', 'invalid'],
    expectedExitCodes: [0],
    stdoutIncludes: ['Architectural Cluster Analysis'],
    description: 'relationship clusters with non-numeric --min-size falls back safely',
  },
  {
    id: 'REL-CLUSTERS-INVALID-MAXCLUSTERS',
    category: 'relationship-error',
    args: ['relationship', 'clusters', '--max-clusters=-1'],
    expectedExitCodes: [0],
    stdoutIncludes: ['Architectural Cluster Analysis'],
    description:
      'relationship clusters with negative --max-clusters=-1 executes safely without crashing',
  },
  {
    id: 'REL-CLUSTERS-NONEXISTENT-CATEGORY',
    category: 'relationship-error',
    args: ['relationship', 'clusters', '--category', 'nonexistent_category_xyz'],
    expectedExitCodes: [0],
    stdoutIncludes: ['No clusters found meeting the criteria'],
    description: 'relationship clusters with nonexistent category handles empty graph safely',
  },
  {
    id: 'REL-CHECK-NONEXISTENT',
    category: 'relationship-error',
    args: ['relationship', 'check', 'completely_fake_symbol_999'],
    expectedExitCodes: [0],
    stdoutIncludes: ['Symbol not found: completely_fake_symbol_999'],
    description:
      'relationship check with nonexistent symbol reports missing symbol and finishes check report',
  },
  {
    id: 'REL-CHECK-EMPTY',
    category: 'relationship-error',
    args: ['relationship', 'check'],
    expectedExitCodes: [0, 1],
    stdoutIncludes: ['Symbol ID required'],
    description: 'relationship check with missing args prints Symbol ID required',
  },
  {
    id: 'REL-PATH-EMPTY',
    category: 'relationship-error',
    args: ['relationship', 'path'],
    expectedExitCodes: [0, 1],
    stdoutIncludes: ['Two symbol IDs required'],
    description: 'relationship path with missing args reports required symbols cleanly',
  },
  {
    id: 'REL-PATH-NONEXISTENT',
    category: 'relationship-error',
    args: ['relationship', 'path', 'fake_symbol_from_999', 'fake_symbol_to_999'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Source symbol not found: fake_symbol_from_999'],
    description: 'relationship path with nonexistent symbols reports Source symbol not found',
  },

  // ===========================================================================
  // Category 6: Document Command Error Paths
  // ===========================================================================
  {
    id: 'DOCS-BACKLINKS-UMBRELLA-NONEXISTENT-DIR',
    category: 'document-error',
    args: ['docs', 'backlinks', 'nonexistent_docs_directory_xyz'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Path not found'],
    description: 'docs backlinks with nonexistent directory exits 1 cleanly',
  },
  {
    id: 'DOCS-VALIDATE-UMBRELLA-NONEXISTENT-DIR',
    category: 'document-error',
    args: ['validate', 'docs', 'nonexistent_docs_directory_xyz'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Directory not found'],
    description: 'validate docs with nonexistent directory exits 1 cleanly',
  },
  {
    id: 'DOCS-VALIDATE-EMPTY-DIR',
    category: 'document-error',
    args: ['validate', 'docs', 'scripts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['Validating Document Symbols'],
    description:
      'validate docs on directory without markdown files executes cleanly (0 definitions)',
  },
  {
    id: 'DOCS-BACKLINKS-EMPTY-DIR',
    category: 'document-error',
    args: ['docs', 'backlinks', 'scripts'],
    expectedExitCodes: [0],
    stdoutIncludes: ['Updating Backlinks'],
    description: 'docs backlinks on directory without markdown files executes cleanly (0 files)',
  },

  // ===========================================================================
  // Category 7: Unknown Commands, Pruned Flat Commands & Typos
  // ===========================================================================
  {
    id: 'CLI-UNKNOWN-01',
    category: 'unknown-command',
    args: ['totally_fake_command_12345'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Unknown command: totally_fake_command_12345'],
    description: 'Unknown command prints clean error message and exits 1',
  },
  {
    id: 'CLI-PRUNED-FLAT-COMMAND',
    category: 'unknown-command',
    args: ['relationship-impact'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Unknown command: relationship-impact'],
    description: 'Pruned flat duplicate command exits 1 cleanly',
  },
  {
    id: 'CLI-TYPO-SUGGESTION',
    category: 'unknown-command',
    args: ['relatnship'],
    expectedExitCodes: [1],
    stdoutIncludes: ['Unknown command: relatnship', 'Did you mean?'],
    description: 'Typo in command triggers Levenshtein suggestion cleanly and exits 1',
  },
];

async function main() {
  console.log('================================================================================');
  console.log('Milestone 3 Adversarial CLI Option Fuzzing & Error Path Test Suite');
  console.log('================================================================================\n');

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    const outcome = runCli(tc.args);

    let pass = true;
    const failures = [];

    // Check exit code
    if (!tc.expectedExitCodes.includes(outcome.exitCode)) {
      pass = false;
      failures.push(
        `Exit code ${outcome.exitCode} not in expected [${tc.expectedExitCodes.join(', ')}]`
      );
    }

    // Check leaked stack traces (CRITICAL INVARIANT)
    if (outcome.leakedStackTraces.length > 0) {
      pass = false;
      failures.push(`Leaked stack traces: ${outcome.leakedStackTraces.join('; ')}`);
    }

    // Check expected stdout substrings
    if (tc.stdoutIncludes) {
      for (const expected of tc.stdoutIncludes) {
        if (!outcome.stdout.includes(expected) && !outcome.stderr.includes(expected)) {
          pass = false;
          failures.push(`Expected output to include "${expected}"`);
        }
      }
    }

    // Check expected stderr substrings
    if (tc.stderrIncludes) {
      for (const expected of tc.stderrIncludes) {
        if (!outcome.stderr.includes(expected)) {
          pass = false;
          failures.push(`Expected stderr to include "${expected}"`);
        }
      }
    }

    if (pass) {
      // If test created an output file, verify it exists and is non-empty
      const outputArgIndex = tc.args.findIndex(
        (a) => a === '--output' || a.startsWith('--output=')
      );
      if (outputArgIndex !== -1) {
        let filePath = null;
        if (tc.args[outputArgIndex].startsWith('--output=')) {
          filePath = path.resolve(repoRoot, tc.args[outputArgIndex].slice(9));
        } else if (outputArgIndex + 1 < tc.args.length) {
          filePath = path.resolve(repoRoot, tc.args[outputArgIndex + 1]);
        }
        if (filePath) {
          if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
            pass = false;
            failures.push(`Expected output file ${filePath} to exist and be non-empty`);
          } else {
            // Clean up temporary test file
            fs.unlinkSync(filePath);
          }
        }
      }
    }

    if (pass) {
      passedCount++;
      console.log(
        `  ✓ [${tc.id}] ${tc.description} (${outcome.duration.toFixed(0)}ms, exit ${outcome.exitCode})`
      );
    } else {
      failedCount++;
      console.log(
        `  ✗ [${tc.id}] ${tc.description} (${outcome.duration.toFixed(0)}ms, exit ${outcome.exitCode})`
      );
      for (const f of failures) {
        console.log(`      -> ${f}`);
      }
      if (outcome.stderr) {
        console.log(`      stderr: ${outcome.stderr.slice(0, 300)}`);
      }
    }

    results.push({
      id: tc.id,
      category: tc.category,
      args: tc.args,
      passed: pass,
      exitCode: outcome.exitCode,
      durationMs: Math.round(outcome.duration),
      failures,
      leakedStackTraces: outcome.leakedStackTraces,
    });
  }

  console.log('\n================================================================================');
  console.log(`Summary: ${passedCount} passed, ${failedCount} failed of ${testCases.length} tests`);
  console.log('================================================================================\n');

  const summary = {
    total: testCases.length,
    passed: passedCount,
    failed: failedCount,
    verdict: failedCount === 0 ? 'APPROVE' : 'REQUEST_CHANGES',
    results,
  };

  console.log(
    JSON.stringify(
      {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        verdict: summary.verdict,
      },
      null,
      2
    )
  );

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal harness error:', err);
  process.exit(1);
});
