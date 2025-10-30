/**
 * Analyze data flow and transformation chains in tsdoc-edge project
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataFlowAnalyzer } from '../src/analyzer/DataFlowAnalyzer';
import { InterfaceAnalyzer } from '../src/analyzer/InterfaceAnalyzer';
import { InterfaceDependencyMapper } from '../src/analyzer/InterfaceDependencyMapper';
import type { DataFlowAnalysisResult } from '../src/types/domain/data-flow';

/**
 * Find all TypeScript files recursively
 */
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and build directories
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
        files.push(...findTypeScriptFiles(fullPath));
      }
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Main analysis function
 */
async function analyzeDataFlow(): Promise<void> {
  console.log('🔍 Analyzing data flow in tsdoc-edge project...\n');

  const projectRoot = path.join(__dirname, '..');
  const typesDir = path.join(projectRoot, 'src', 'types');

  // Find all TypeScript files with interfaces
  const typeFiles = findTypeScriptFiles(typesDir);
  console.log(`Found ${typeFiles.length} type files\n`);

  // Analyze interfaces
  const analyzer = new InterfaceAnalyzer({
    includePrivate: false,
    inferDomainFromPath: true,
    inferDomainRole: true,
  });

  const allInterfaces = [];

  for (const file of typeFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const interfaces = analyzer.analyzeFile(file, content);
    allInterfaces.push(...interfaces);
  }

  console.log(`Analyzed ${allInterfaces.length} interfaces\n`);

  // Build dependency graph
  const dependencyMapper = new InterfaceDependencyMapper();
  const importMap = new Map();

  // Extract import information from analyzer
  for (const file of typeFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    analyzer.analyzeFile(file, content);

    // Get import info from analyzer
    const fileImports = Array.from(
      content.matchAll(/import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g)
    );

    for (const match of fileImports) {
      const types = match[1].split(',').map((t) => t.trim());
      const source = match[2];

      for (const type of types) {
        importMap.set(type, { source, isTypeOnly: match[0].includes('type ') });
      }
    }
  }

  const graph = dependencyMapper.buildDependencyGraph(allInterfaces, importMap);

  console.log(`Built dependency graph with ${graph.dependencies.length} dependencies\n`);

  // Analyze data flows
  const dataFlowAnalyzer = new DataFlowAnalyzer();
  const result = dataFlowAnalyzer.analyzeDataFlows(graph);

  // Generate report
  generateReport(result, projectRoot);

  console.log('\n✅ Analysis complete!');
  console.log(`Report saved to: ${path.join(projectRoot, 'DATA_FLOW_ANALYSIS_REPORT.md')}`);
}

/**
 * Generate markdown report
 */
function generateReport(result: DataFlowAnalysisResult, projectRoot: string): void {
  const reportPath = path.join(projectRoot, 'DATA_FLOW_ANALYSIS_REPORT.md');

  let report = '# Data Flow Analysis Report\n\n';
  report += `**Analysis Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
  report += `**Total Interfaces Analyzed:** ${result.totalInterfaces}\n\n`;
  report += '---\n\n';

  // Summary
  report += '## 📊 Summary\n\n';
  report += '| Metric | Value |\n';
  report += '|--------|-------|\n';
  report += `| Total DTOs | ${result.summary.totalDTOs} |\n`;
  report += `| Total Transformation Chains | ${result.summary.totalChains} |\n`;
  report += `| Valid Chains | ${result.summary.validChains} |\n`;
  report += `| Invalid Chains | ${result.summary.invalidChains} |\n`;
  report += `| Average Chain Length | ${result.summary.averageChainLength.toFixed(2)} |\n`;
  report += `| DTO → Entity Chains | ${result.summary.dtoToEntityChains} |\n`;
  report += `| Entity → DTO Chains | ${result.summary.entityToDTOChains} |\n`;
  report += '\n---\n\n';

  // Detected DTOs
  report += '## 🎯 Detected DTOs\n\n';

  if (result.dtos.length === 0) {
    report += '*No DTOs detected using standard naming conventions.*\n\n';
  } else {
    const inputDTOs = result.dtos.filter((d) => d.role === 'input');
    const outputDTOs = result.dtos.filter((d) => d.role === 'output');
    const transferDTOs = result.dtos.filter((d) => d.role === 'transfer');

    if (inputDTOs.length > 0) {
      report += '### Input DTOs\n\n';
      for (const dto of inputDTOs) {
        report += `- **${dto.interfaceName}** (${dto.pattern}, confidence: ${(dto.confidence * 100).toFixed(0)}%)\n`;
      }
      report += '\n';
    }

    if (outputDTOs.length > 0) {
      report += '### Output DTOs\n\n';
      for (const dto of outputDTOs) {
        report += `- **${dto.interfaceName}** (${dto.pattern}, confidence: ${(dto.confidence * 100).toFixed(0)}%)\n`;
      }
      report += '\n';
    }

    if (transferDTOs.length > 0) {
      report += '### Transfer DTOs\n\n';
      for (const dto of transferDTOs) {
        report += `- **${dto.interfaceName}** (${dto.pattern}, confidence: ${(dto.confidence * 100).toFixed(0)}%)\n`;
      }
      report += '\n';
    }
  }

  report += '---\n\n';

  // Transformation Chains
  report += '## 🔄 Transformation Chains\n\n';

  if (result.transformationChains.length === 0) {
    report += '*No transformation chains detected.*\n\n';
  } else {
    const validChains = result.transformationChains.filter((c) => c.isValid);
    const invalidChains = result.transformationChains.filter((c) => !c.isValid);

    if (validChains.length > 0) {
      report += '### Valid Chains\n\n';
      for (const chain of validChains) {
        report += `#### ${chain.source} → ${chain.destination}\n\n`;
        report += `- **Type:** ${chain.chainType}\n`;
        report += `- **Length:** ${chain.length} steps\n`;
        report += '- **Path:**\n';

        for (const step of chain.steps) {
          report += `  ${step.stepNumber}. \`${step.from}\` → \`${step.to}\``;
          if (step.transformer) {
            report += ` (via ${step.transformer})`;
          }
          report += `\n`;
        }
        report += '\n';
      }
    }

    if (invalidChains.length > 0) {
      report += '### ⚠️ Invalid Chains\n\n';
      for (const chain of invalidChains) {
        report += `#### ${chain.source} → ${chain.destination}\n\n`;
        report += `- **Type:** ${chain.chainType}\n`;
        report += `- **Length:** ${chain.length} steps\n`;
        report += '- **Issues:**\n';
        for (const issue of chain.issues) {
          report += `  - ${issue}\n`;
        }
        report += '\n';
      }
    }
  }

  report += '---\n\n';

  // Orphaned DTOs
  if (result.orphanedDTOs.length > 0) {
    report += '## 🔴 Orphaned DTOs\n\n';
    report += '*DTOs that are not part of any transformation chain:*\n\n';
    for (const dto of result.orphanedDTOs) {
      report += `- \`${dto}\`\n`;
    }
    report += '\n---\n\n';
  }

  // Bidirectional Transformations
  if (result.bidirectionalTransformations.length > 0) {
    report += '## ⚠️ Bidirectional Transformations\n\n';
    report += '*Potential issues with circular dependencies:*\n\n';
    for (const bi of result.bidirectionalTransformations) {
      report += `- **${bi.typeA} ↔ ${bi.typeB}**\n`;
      report += `  - Issue: ${bi.issue}\n`;
    }
    report += '\n---\n\n';
  }

  // Recommendations
  report += '## 💡 Recommendations\n\n';

  if (result.summary.totalDTOs === 0) {
    report += '### Adopt DTO Naming Conventions\n\n';
    report += 'Consider using standard DTO naming patterns:\n';
    report += '- `*DTO` for data transfer objects\n';
    report += '- `*Request` for input DTOs\n';
    report += '- `*Response` for output DTOs\n';
    report += '- `*Input` / `*Output` for explicit direction\n\n';
  }

  if (result.bidirectionalTransformations.length > 0) {
    report += '### Resolve Bidirectional Dependencies\n\n';
    report += 'Bidirectional dependencies can indicate architectural issues.\n';
    report += 'Consider:\n';
    report += '- Introducing an intermediate layer\n';
    report += '- Separating read and write models (CQRS)\n';
    report += '- Creating separate DTOs for each direction\n\n';
  }

  if (result.orphanedDTOs.length > 0) {
    report += '### Address Orphaned DTOs\n\n';
    report += 'DTOs should be part of clear transformation chains.\n';
    report += 'Consider:\n';
    report += '- Documenting usage patterns\n';
    report += '- Creating transformation methods\n';
    report += '- Removing unused DTOs\n\n';
  }

  if (result.summary.invalidChains > 0) {
    report += '### Fix Invalid Transformation Chains\n\n';
    report += 'Invalid chains indicate potential design issues.\n';
    report += 'Review the issues listed above and:\n';
    report += '- Simplify complex chains\n';
    report += '- Remove circular dependencies\n';
    report += '- Ensure unidirectional data flow\n\n';
  }

  fs.writeFileSync(reportPath, report);
}

// Run analysis
analyzeDataFlow().catch((error) => {
  console.error('Error during analysis:', error);
  process.exit(1);
});
