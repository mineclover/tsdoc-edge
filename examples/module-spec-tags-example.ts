/**
 * Example function demonstrating module spec tags
 *
 * @public
 * @responsibility Process user data and generate reports
 * @problem Manual data processing is error-prone and slow
 * @solves Automates data processing with validation and error handling
 *
 * @param userData - User data object
 * @param options - Processing options
 * @returns Processed report object
 *
 * @precondition userData must be validated
 * @postcondition Returns valid report or throws error
 *
 * @depends DataValidator, ReportGenerator
 * @context Requires database connection
 *
 * @functionality Data validation, Report generation, Error logging
 * @algorithm Parse input, validate data, transform to report format, generate output
 * @complexity O(n) - Linear time complexity where n is number of records
 *
 * @sideEffect filesystem: Writes report to ./reports directory (write)
 * @sideEffect database: Updates processing_log table (write)
 * @mutates this.cache - Updates internal cache with processed data
 * @io file: Writes JSON report file
 * @io database: Inserts log entry
 *
 * @scope public: Exported from main module as primary API
 *
 * @example
 * \`\`\`typescript
 * const report = processUserData(user, { format: 'json' });
 * console.log(report.summary);
 * \`\`\`
 */
export function processUserData(
  userData: UserData,
  options: ProcessingOptions
): ProcessedReport {
  // Implementation...
  return {} as ProcessedReport;
}

interface UserData {
  id: string;
  name: string;
}

interface ProcessingOptions {
  format: 'json' | 'xml';
}

interface ProcessedReport {
  summary: string;
}
