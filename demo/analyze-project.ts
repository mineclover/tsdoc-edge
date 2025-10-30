/**
 * Analyze current tsdoc-edge project interfaces
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DomainStructureAnalyzer,
  InterfaceAnalyzer,
  InterfaceDependencyMapper,
} from '../src/index';

/**
 * Find all TypeScript files in a directory
 */
function findTypeScriptFiles(dir: string, pattern: RegExp = /\.ts$/): string[] {
  const results: string[] = [];

  const walk = (currentDir: string): void => {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules, dist, and test directories
        if (
          !file.startsWith('.') &&
          file !== 'node_modules' &&
          file !== 'dist' &&
          file !== '__tests__'
        ) {
          walk(filePath);
        }
      } else if (pattern.test(file) && !file.endsWith('.test.ts')) {
        results.push(filePath);
      }
    }
  };

  walk(dir);
  return results;
}

/**
 * Main analysis function
 */
async function analyzeProject(): Promise<void> {
  console.log('='.repeat(80));
  console.log('TSDoc-Edge Project Interface Analysis');
  console.log('='.repeat(80));
  console.log();

  // Find all TypeScript files with interfaces
  const projectRoot = path.join(__dirname, '..');
  const typesDir = path.join(projectRoot, 'src', 'types');

  console.log('Scanning for TypeScript files with interfaces...');
  console.log(`Types directory: ${typesDir}`);
  console.log();

  const typeFiles = findTypeScriptFiles(typesDir);
  console.log(`Found ${typeFiles.length} type files`);
  console.log();

  // Analyze each file
  const analyzer = new InterfaceAnalyzer({
    includePrivate: false,
    inferDomainFromPath: true,
    inferDomainRole: true,
  });

  const allInterfaces = [];

  for (const filePath of typeFiles) {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const interfaces = analyzer.analyzeFile(filePath, sourceCode);

    if (interfaces.length > 0) {
      console.log(`${path.basename(filePath)}: ${interfaces.length} interfaces`);
      for (const iface of interfaces) {
        console.log(`  - ${iface.symbol.name} (${iface.domainRole})`);
      }
      allInterfaces.push(...interfaces);
    }
  }

  console.log();
  console.log(`Total interfaces found: ${allInterfaces.length}`);
  console.log();

  if (allInterfaces.length === 0) {
    console.log('No interfaces found to analyze.');
    return;
  }

  // Build dependency graph
  console.log('Building dependency graph...');
  console.log('-'.repeat(80));

  const dependencyMapper = new InterfaceDependencyMapper();
  let graph = dependencyMapper.buildDependencyGraph(allInterfaces);

  console.log(`Total dependencies: ${graph.dependencies.length}`);
  console.log();

  // Show top dependencies
  const depCounts = new Map<string, number>();
  for (const dep of graph.dependencies) {
    depCounts.set(dep.from, (depCounts.get(dep.from) || 0) + 1);
  }

  const topDeps = Array.from(depCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('Top 10 interfaces by outgoing dependencies:');
  for (const [iface, count] of topDeps) {
    console.log(`  ${iface}: ${count} dependencies`);
  }
  console.log();

  // Check for circular dependencies
  console.log('Checking for circular dependencies...');
  const cycles = dependencyMapper.findCircularDependencies(graph);

  if (cycles.length > 0) {
    console.log(`⚠️  Found ${cycles.length} circular dependencies:`);
    for (const cycle of cycles) {
      console.log(`  ${cycle.join(' → ')}`);
    }
  } else {
    console.log('✅ No circular dependencies found');
  }
  console.log();

  // Analyze domain structure
  console.log('Analyzing domain structure...');
  console.log('-'.repeat(80));

  const domainAnalyzer = new DomainStructureAnalyzer();
  graph = domainAnalyzer.analyzeDomains(graph);

  console.log(`Found ${graph.domains.size} domains`);
  console.log();

  // Display domain summary
  const domains = Array.from(graph.domains.values()).sort(
    (a, b) => b.interfaces.length - a.interfaces.length
  );

  console.log('Domain Summary:');
  console.log();

  for (const domain of domains) {
    const quality = domain.cohesionScore - domain.couplingScore;
    const qualityLabel =
      quality > 0.5
        ? '✅ Excellent'
        : quality > 0.2
          ? '👍 Good'
          : quality > -0.2
            ? '⚠️ Fair'
            : '❌ Poor';

    console.log(`${domain.domainName}:`);
    console.log(`  Interfaces: ${domain.interfaces.length}`);
    console.log(`  Cohesion: ${(domain.cohesionScore * 100).toFixed(1)}%`);
    console.log(`  Coupling: ${(domain.couplingScore * 100).toFixed(1)}%`);
    console.log(`  Quality: ${qualityLabel}`);

    // Show roles
    const roleCount = new Map<string, number>();
    for (const iface of domain.interfaces) {
      const role = iface.domainRole || 'Unknown';
      roleCount.set(role, (roleCount.get(role) || 0) + 1);
    }

    const roles = Array.from(roleCount.entries());
    if (roles.length > 0) {
      console.log(`  Roles: ${roles.map(([role, count]) => `${role}(${count})`).join(', ')}`);
    }

    console.log();
  }

  // Generate full report
  console.log('='.repeat(80));
  console.log('Full Domain Report');
  console.log('='.repeat(80));
  console.log();

  const report = domainAnalyzer.generateDomainReport(graph);
  console.log(report);

  // Recommendations
  console.log('='.repeat(80));
  console.log('Improvement Recommendations');
  console.log('='.repeat(80));
  console.log();

  const recommendations: string[] = [];

  // Check for problematic patterns
  for (const domain of domains) {
    if (domain.cohesionScore < 0.3) {
      recommendations.push(
        `⚠️  Domain "${domain.domainName}" has low cohesion (${(domain.cohesionScore * 100).toFixed(0)}%). Consider reorganizing interfaces.`
      );
    }

    if (domain.couplingScore > 0.7) {
      recommendations.push(
        `⚠️  Domain "${domain.domainName}" has high coupling (${(domain.couplingScore * 100).toFixed(0)}%). Too many external dependencies.`
      );
    }

    if (domain.interfaces.length > 15) {
      recommendations.push(
        `💡 Domain "${domain.domainName}" is large (${domain.interfaces.length} interfaces). Consider splitting into sub-domains.`
      );
    }
  }

  // Check for unstable interfaces
  for (const iface of allInterfaces) {
    const metrics = dependencyMapper.calculateMetrics(iface.symbol.name, graph);
    if (metrics.instability > 0.8 && metrics.efferentCoupling > 5) {
      recommendations.push(
        `⚠️  Interface "${iface.symbol.name}" is highly unstable (${(metrics.instability * 100).toFixed(0)}%) with ${metrics.efferentCoupling} dependencies.`
      );
    }
  }

  if (recommendations.length === 0) {
    console.log('✅ No major issues found! Project structure looks good.');
  } else {
    console.log(`Found ${recommendations.length} recommendations:\n`);
    for (const rec of recommendations) {
      console.log(rec);
    }
  }

  console.log();

  // Save report to file
  const reportPath = path.join(projectRoot, 'INTERFACE_ANALYSIS_REPORT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Full report saved to: ${reportPath}`);
  console.log();
}

// Run analysis
analyzeProject().catch((error) => {
  console.error('Error analyzing project:', error);
  process.exit(1);
});
