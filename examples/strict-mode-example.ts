/**
 * Strict Mode Example - Complete 6-Category Documentation
 * @packageDocumentation
 */

import {
  SymbolGraphBuilder,
  DatabaseManager,
  StrictModeValidator,
  EnhancedMarkdownGenerator,
} from '../src';
import { EnhancedSymbolDoc, Symbol } from '../src/types';

/**
 * Example: Creating a fully documented data processor
 */

// Create symbol
const dataProcessorSymbol: Symbol = {
  id: 'data-processor-001',
  name: 'DataProcessor',
  type: 'class',
  filePath: '/src/processors/DataProcessor.ts',
  line: 15,
  column: 0,
  isExported: true,
  isPublic: true,
  summary: 'Process and transform large CSV datasets with memory-efficient streaming',
  tests: [
    {
      symbolName: 'DataProcessor',
      testFilePath: '/tests/DataProcessor.test.ts',
      testName: 'DataProcessor test suite',
      scenarios: [
        'Process small CSV',
        'Process large CSV with chunks',
        'Handle malformed data',
        'Edge case: empty file',
      ],
    },
  ],
  designDecisions: ['ADR-001', 'ADR-003'],
};

// Create enhanced documentation (Strict Mode - All 6 categories)
const enhancedDoc: EnhancedSymbolDoc = {
  symbolId: 'data-processor-001',

  // 1. Problem Solving
  problemSolving: {
    description:
      'This code solves the problem of processing large CSV files that exceed available memory',
    context:
      'Our application needs to handle customer data files ranging from 100MB to 5GB. ' +
      'Loading entire files into memory causes out-of-memory errors and crashes.',
    targetUseCase: 'ETL pipeline for customer data ingestion from external vendors',
    relatedProblem: 'data-ingestion-architecture',
  },

  // 2. Functionality
  functionality: {
    mainFeatures: [
      'Stream-based CSV reading with configurable chunk size',
      'NaN value handling with multiple strategies (drop, fill, interpolate)',
      'Special character filtering using regex patterns',
      'Progress tracking with callback support',
      'Memory-efficient processing with generator patterns',
    ],
    components: [
      {
        name: 'loadData',
        description: 'Load CSV file as a stream with automatic chunking',
        signature: '(filePath: string, options?: LoadOptions) => AsyncGenerator<DataFrame>',
      },
      {
        name: 'cleanText',
        description: 'Remove special characters and normalize whitespace',
        signature: '(text: string, options?: CleanOptions) => string',
      },
      {
        name: 'handleNaN',
        description: 'Apply NaN handling strategy to numeric columns',
        signature: '(df: DataFrame, strategy: NaNStrategy) => DataFrame',
      },
    ],
    io: {
      inputs: [
        {
          name: 'filePath',
          type: 'string',
          description: 'Absolute or relative path to CSV file',
        },
        {
          name: 'options',
          type: 'ProcessOptions',
          description: 'Configuration object for processing behavior',
        },
      ],
      outputs: [
        {
          name: 'result',
          type: 'AsyncGenerator<ProcessedData>',
          description: 'Stream of processed data chunks',
        },
      ],
    },
    examples: [
      `
// Basic usage
const processor = new DataProcessor();
for await (const chunk of processor.loadData('data.csv')) {
  console.log(\`Processed \${chunk.rowCount} rows\`);
}
`,
      `
// With custom options
const processor = new DataProcessor({
  chunkSize: 10000,
  nanStrategy: 'interpolate',
  encoding: 'utf-8'
});

const cleaned = await processor.process('large-file.csv', {
  filters: ['trim', 'lowercase'],
  onProgress: (percent) => console.log(\`\${percent}% done\`)
});
`,
    ],
  },

  // 3. Error Experiences
  errorExperiences: [
    {
      id: 'ERR-001',
      errorType: 'ValueError',
      message: 'Input array is too large',
      context:
        'Occurred when loading a 3GB CSV file using pandas.read_csv() without chunking. ' +
        'System ran out of memory (8GB RAM) and threw ValueError.',
      solution:
        'Implemented chunked reading using chunksize parameter:\n' +
        '```python\n' +
        'for chunk in pd.read_csv(file, chunksize=50000):\n' +
        '    process(chunk)\n' +
        '```',
      occurredAt: '2024-01-15',
      prevention:
        'Always use chunked reading for files > 500MB. ' +
        'Add memory profiling in tests to catch memory issues early.',
    },
    {
      id: 'ERR-002',
      errorType: 'UnicodeDecodeError',
      message: "codec can't decode byte 0xff in position 1234",
      context: 'CSV files from legacy system used ISO-8859-1 encoding, not UTF-8',
      solution: 'Added encoding detection with chardet library and fallback chain',
      prevention: 'Document expected encoding in data contract with vendors',
    },
    {
      id: 'ERR-003',
      errorType: 'PerformanceWarning',
      message: 'This pattern is inefficient',
      context: 'Using iterrows() for processing was taking 45 minutes for 1M rows',
      solution:
        'Switched to vectorized operations and apply() with numba compilation. ' +
        'Processing time reduced to 3 minutes.',
      prevention: 'Benchmark all data operations with realistic data sizes',
    },
  ],

  // 4. Design Decisions
  decisions: [
    {
      id: 'ADR-001',
      title: 'Use concurrent.futures instead of multiprocessing',
      decision:
        'Implement parallel processing using concurrent.futures.ThreadPoolExecutor ' +
        'with thread-based concurrency',
      rationale:
        'Our workload is primarily I/O bound (reading files, network calls to DB). ' +
        'Thread-based concurrency is more lightweight and efficient for I/O operations. ' +
        'GIL impact is minimal since threads spend most time waiting on I/O.',
      alternatives: [
        {
          option: 'multiprocessing.Pool',
          reason:
            'Process-based parallelism has high overhead for I/O bound tasks. ' +
            'Serialization costs and memory duplication outweigh benefits.',
        },
        {
          option: 'joblib',
          reason:
            'Adds unnecessary dependency. concurrent.futures is stdlib and ' +
            'provides sufficient functionality for our needs.',
        },
        {
          option: 'asyncio',
          reason:
            'Would require rewriting entire codebase to async/await style. ' +
            'Benefit not worth migration cost at this stage.',
        },
      ],
      consequences: [
        'Positive: 3x performance improvement on I/O heavy workloads',
        'Positive: No additional dependencies',
        'Negative: Not optimal for CPU-intensive preprocessing steps',
        'Mitigation: Can add multiprocessing later for CPU tasks if needed',
      ],
      date: '2024-01-10',
      status: 'accepted',
    },
    {
      id: 'ADR-003',
      title: 'Store processed data in Parquet format',
      decision: 'Output processed data as Apache Parquet files instead of CSV',
      rationale:
        'Parquet provides columnar storage with compression, reducing storage by 80%. ' +
        'Query performance improved 10x for downstream analytics.',
      alternatives: [
        {
          option: 'Keep CSV format',
          reason: 'CSV files are 5x larger and slower to query',
        },
      ],
      consequences: [
        'Storage costs reduced by 80%',
        'Query performance improved 10x',
        'Requires parquet-compatible tools downstream',
      ],
      date: '2024-02-01',
      status: 'accepted',
    },
  ],

  // 5. Dependencies
  dependencies: [
    {
      target: 'config_loader',
      type: 'module',
      reason: 'Load application configuration (DB credentials, file paths, chunk size)',
      importPath: '../config/config_loader',
    },
    {
      target: 'logger',
      type: 'module',
      reason: 'Centralized logging for debugging and monitoring',
      importPath: '../utils/logger',
    },
    {
      target: 'pandas',
      type: 'external',
      reason: 'DataFrame operations and CSV parsing',
      version: '>=2.0.0',
      isOptional: false,
    },
    {
      target: 'numpy',
      type: 'external',
      reason: 'Numerical operations and NaN handling',
      version: '>=1.24.0',
      isOptional: false,
    },
    {
      target: 'pyarrow',
      type: 'external',
      reason: 'Parquet file format support',
      version: '>=12.0.0',
      isOptional: true,
    },
  ],

  // 6. Future Plans
  futurePlans: [
    {
      id: 'PLAN-001',
      title: 'Add support for streaming from S3',
      description:
        'Enable direct streaming from S3 buckets without downloading entire file. ' +
        'Use boto3 streaming API to read chunks directly from S3.',
      priority: 'high',
      status: 'in-progress',
      targetMilestone: 'v2.0',
      estimatedEffort: '2 weeks',
      blockedBy: [],
      relatedIssues: ['ISSUE-234'],
      createdAt: '2024-02-15',
    },
    {
      id: 'PLAN-002',
      title: 'Implement data quality checks',
      description:
        'Add Great Expectations integration for automated data quality validation. ' +
        'Check for: null percentages, outliers, schema compliance, duplicates.',
      priority: 'medium',
      status: 'planned',
      targetMilestone: 'v2.1',
      estimatedEffort: '3 weeks',
      createdAt: '2024-02-20',
    },
    {
      id: 'PLAN-003',
      title: 'Support additional file formats (JSON, XML)',
      description: 'Extend processor to handle JSON lines and XML files with same API',
      priority: 'low',
      status: 'planned',
      targetMilestone: 'v3.0',
      estimatedEffort: '1 week per format',
      createdAt: '2024-02-25',
    },
    {
      id: 'PLAN-004',
      title: 'Add real-time progress dashboard',
      description: 'Web UI for monitoring processing progress across multiple files',
      priority: 'medium',
      status: 'completed',
      targetMilestone: 'v1.5',
      createdAt: '2024-01-01',
      completedAt: '2024-02-10',
    },
  ],

  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-02-25T00:00:00Z',
  version: '1.0.0',
};

// Example usage
function demonstrateStrictMode() {
  console.log('=== TSDoc Edge Strict Mode Demo ===\n');

  // 1. Validate documentation
  const validator = new StrictModeValidator();
  const validation = validator.validate(enhancedDoc, true);

  console.log('1. VALIDATION RESULTS');
  console.log(`   Compliant: ${validation.isCompliant ? '✅ YES' : '❌ NO'}`);
  console.log(`   Score: ${validation.complianceScore}/100`);
  console.log(`   Missing Categories: ${validation.missingCategories.length}`);
  console.log(`   Errors: ${validation.errors.length}\n`);

  if (!validation.isCompliant) {
    const report = validator.generateReport(validation);
    console.log(report);
  }

  // 2. Generate markdown documentation
  const mdGenerator = new EnhancedMarkdownGenerator();
  const markdown = mdGenerator.generateDocument(dataProcessorSymbol, enhancedDoc);

  console.log('2. GENERATED MARKDOWN');
  console.log(`   Length: ${markdown.length} characters`);
  console.log(`   Preview:\n${markdown.substring(0, 500)}...\n`);

  // 3. Store in database and export to JSONL
  const dbManager = new DatabaseManager('.tsdoc-edge.db', './docs/data');

  console.log('3. DATABASE OPERATIONS');
  dbManager.insertSymbol(dataProcessorSymbol, 0);
  dbManager.insertEnhancedDoc(enhancedDoc, 0);

  const exportPath = dbManager.exportToJSONL();
  console.log(`   Exported to: ${exportPath}`);

  const stats = dbManager.getStatistics();
  console.log(`   Total Symbols: ${stats.totalSymbols}`);
  console.log(`   Total Docs: ${stats.totalEnhancedDocs}`);
  console.log(`   DB Size: ${(stats.dbSize / 1024).toFixed(2)} KB\n`);

  dbManager.close();

  console.log('=== Demo Complete ===');
}

// Run demo (uncomment to execute)
// demonstrateStrictMode();

export { demonstrateStrictMode };
