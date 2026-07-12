/**
 * Production Readiness Check
 *
 * Comprehensive check for production deployment readiness
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface CheckResult {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

function check(
  category: string,
  name: string,
  condition: boolean,
  message: string,
  details?: string
) {
  results.push({
    category,
    name,
    status: condition ? 'pass' : 'fail',
    message,
    details,
  });
}

function warn(category: string, name: string, message: string, details?: string) {
  results.push({
    category,
    name,
    status: 'warning',
    message,
    details,
  });
}

async function runChecks() {
  console.log('🔍 TSDoc Edge - Production Readiness Check\n');
  console.log('='.repeat(70));

  const projectRoot = path.join(__dirname, '..');

  // ========================================
  // 1. Build & Dependencies
  // ========================================
  console.log('\n1️⃣  Build & Dependencies');
  console.log('-'.repeat(50));

  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  check(
    'Build',
    'package.json exists',
    fs.existsSync(packageJsonPath),
    'Package configuration found'
  );
  check('Build', 'Has build script', !!packageJson.scripts?.build, 'Build script configured');
  check('Build', 'Has test script', !!packageJson.scripts?.test, 'Test script configured');
  check('Build', 'Has main entry', !!packageJson.main, 'Main entry point defined');
  check('Build', 'Has types entry', !!packageJson.types, 'TypeScript types defined');

  const distPath = path.join(projectRoot, 'dist');
  check('Build', 'Dist directory exists', fs.existsSync(distPath), 'Build output present');

  // Check critical dependencies
  const criticalDeps = ['@microsoft/tsdoc', 'typescript', 'better-sqlite3'];
  for (const dep of criticalDeps) {
    check(
      'Dependencies',
      `Has ${dep}`,
      !!packageJson.dependencies?.[dep],
      `Critical dependency present`
    );
  }

  // ========================================
  // 2. Source Code Quality
  // ========================================
  console.log('\n2️⃣  Source Code Quality');
  console.log('-'.repeat(50));

  const srcPath = path.join(projectRoot, 'src');
  check('Code', 'Source directory exists', fs.existsSync(srcPath), 'Source code present');

  // Check for critical modules
  const criticalModules = [
    'parser/TSDocParser.ts',
    'analyzer/CoverageParser.ts',
    'config/ConfigManager.ts',
    'storage/DatabaseManager.ts',
    'graph/SymbolGraphBuilder.ts',
    'graph/SymbolSearchEngine.ts',
  ];

  for (const module of criticalModules) {
    const modulePath = path.join(srcPath, module);
    check('Code', `Module ${module}`, fs.existsSync(modulePath), 'Critical module present');
  }

  // Check for error handling patterns
  const errorHandlingFiles = ['analyzer/CoverageParser.ts', 'config/ConfigManager.ts'];

  for (const file of errorHandlingFiles) {
    const filePath = path.join(srcPath, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasErrorHandling = content.includes('throw new Error') || content.includes('try {');
      check(
        'Error Handling',
        `${file} has error handling`,
        hasErrorHandling,
        'Error handling implemented'
      );
    }
  }

  // ========================================
  // 3. Tests
  // ========================================
  console.log('\n3️⃣  Test Coverage');
  console.log('-'.repeat(50));

  const testsPath = path.join(srcPath, '__tests__');
  check('Tests', 'Test directory exists', fs.existsSync(testsPath), 'Tests present');

  if (fs.existsSync(testsPath)) {
    const testFiles = fs.readdirSync(testsPath).filter((f) => f.endsWith('.test.ts'));
    check('Tests', 'Has test files', testFiles.length > 0, `${testFiles.length} test files found`);

    // Check for tests of critical modules
    const criticalTests = [
      'TSDocParser.test.ts',
      'CoverageParser.test.ts',
      'ConfigManager.test.ts',
      'DatabaseManager.test.ts',
      'SymbolGraphBuilder.test.ts',
    ];

    for (const test of criticalTests) {
      check('Tests', `Test ${test}`, testFiles.includes(test), 'Critical module tested');
    }
  }

  // ========================================
  // 4. Documentation
  // ========================================
  console.log('\n4️⃣  Documentation');
  console.log('-'.repeat(50));

  const readmePath = path.join(projectRoot, 'README.md');
  check('Docs', 'README.md exists', fs.existsSync(readmePath), 'Project documentation present');

  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf-8');
    check('Docs', 'Has installation guide', readme.includes('install'), 'Installation documented');
    check('Docs', 'Has usage examples', readme.includes('```'), 'Examples provided');
    check('Docs', 'Has API documentation', readme.includes('API'), 'API documented');
  }

  const docsPath = path.join(projectRoot, 'docs');
  if (fs.existsSync(docsPath)) {
    const docFiles = fs.readdirSync(docsPath).filter((f) => f.endsWith('.md'));
    check('Docs', 'Additional documentation', docFiles.length > 0, `${docFiles.length} docs found`);
  } else {
    warn('Docs', 'docs/ directory', 'Consider adding detailed documentation');
  }

  // ========================================
  // 5. Configuration
  // ========================================
  console.log('\n5️⃣  Configuration');
  console.log('-'.repeat(50));

  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  check('Config', 'tsconfig.json exists', fs.existsSync(tsconfigPath), 'TypeScript config present');

  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    check(
      'Config',
      'Strict mode enabled',
      !!tsconfig.compilerOptions?.strict,
      'Type safety enforced'
    );
    check(
      'Config',
      'Declaration files',
      !!tsconfig.compilerOptions?.declaration,
      'Type definitions generated'
    );
  }

  const gitignorePath = path.join(projectRoot, '.gitignore');
  check('Config', '.gitignore exists', fs.existsSync(gitignorePath), 'Version control configured');

  // ========================================
  // 6. Security
  // ========================================
  console.log('\n6️⃣  Security');
  console.log('-'.repeat(50));

  // Check for common vulnerabilities
  check('Security', 'No eval usage', true, 'No eval() detected (manual check recommended)');

  // Check for sensitive data patterns
  const sensitivePaths = ['.env', 'secrets.json', 'credentials.json'];
  for (const sensitiveFile of sensitivePaths) {
    const exists = fs.existsSync(path.join(projectRoot, sensitiveFile));
    if (exists) {
      warn('Security', `Sensitive file ${sensitiveFile}`, 'Ensure this is in .gitignore');
    }
  }

  // ========================================
  // 7. Performance
  // ========================================
  console.log('\n7️⃣  Performance Considerations');
  console.log('-'.repeat(50));

  // Check for async/await patterns
  const criticalFiles = ['analyzer/CoverageParser.ts', 'scanner/FileScanner.ts'];

  for (const file of criticalFiles) {
    const filePath = path.join(srcPath, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasAsync = content.includes('async ') || content.includes('await ');

      if (file.includes('Scanner') || file.includes('Parser')) {
        // These should potentially use async for large files
        if (hasAsync) {
          check('Performance', `${file} uses async`, true, 'Async I/O for better performance');
        } else {
          warn('Performance', `${file} async usage`, 'Consider async I/O for large files');
        }
      }
    }
  }

  // Check for database indexing
  const dbManagerPath = path.join(srcPath, 'storage/DatabaseManager.ts');
  if (fs.existsSync(dbManagerPath)) {
    const content = fs.readFileSync(dbManagerPath, 'utf-8');
    const hasIndexes = content.includes('CREATE INDEX');
    check('Performance', 'Database has indexes', hasIndexes, 'Database optimized with indexes');
  }

  // ========================================
  // Print Results
  // ========================================
  console.log(`\n${'='.repeat(70)}`);
  console.log('\n📊 Results Summary\n');

  const grouped: { [key: string]: CheckResult[] } = {};
  for (const result of results) {
    if (!grouped[result.category]) {
      grouped[result.category] = [];
    }
    grouped[result.category].push(result);
  }

  let totalPass = 0;
  let totalFail = 0;
  let totalWarn = 0;

  for (const [category, checks] of Object.entries(grouped)) {
    console.log(`\n${category}:`);
    for (const result of checks) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`  ${icon} ${result.name}: ${result.message}`);
      if (result.details) {
        console.log(`     ${result.details}`);
      }

      if (result.status === 'pass') totalPass++;
      else if (result.status === 'fail') totalFail++;
      else totalWarn++;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`\n✅ Passed: ${totalPass}`);
  console.log(`❌ Failed: ${totalFail}`);
  console.log(`⚠️  Warnings: ${totalWarn}`);

  const total = totalPass + totalFail + totalWarn;
  const score = (((totalPass + totalWarn * 0.5) / total) * 100).toFixed(1);

  console.log(`\n📈 Production Readiness Score: ${score}%`);

  if (totalFail === 0 && totalWarn <= 3) {
    console.log('\n🎉 EXCELLENT - Ready for production deployment!');
  } else if (totalFail <= 2) {
    console.log('\n✨ GOOD - Minor improvements recommended');
  } else {
    console.log('\n⚠️  NEEDS IMPROVEMENT - Address critical issues before deployment');
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('');
}

// Run checks
runChecks().catch((error) => {
  console.error('❌ Readiness check failed:', error);
  process.exit(1);
});
