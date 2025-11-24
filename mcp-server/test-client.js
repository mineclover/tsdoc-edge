#!/usr/bin/env node
/**
 * Simple test client for TSDoc Edge MCP Server
 *
 * Tests all 7 tools with realistic queries
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

let messageId = 0;

function createMessage(method, params = {}) {
  return {
    jsonrpc: '2.0',
    id: ++messageId,
    method,
    params,
  };
}

function log(category, message, color = colors.reset) {
  console.log(`${color}[${category}]${colors.reset} ${message}`);
}

async function sendRequest(server, request) {
  return new Promise((resolve, reject) => {
    const requestStr = JSON.stringify(request) + '\n';
    let responseBuffer = '';
    let timeout;

    const onData = (data) => {
      responseBuffer += data.toString();

      // Try to parse complete JSON-RPC responses
      const lines = responseBuffer.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) {
          try {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              server.stdout.removeListener('data', onData);
              resolve(response);
              return;
            }
          } catch (e) {
            // Incomplete JSON, keep buffering
          }
        }
      }
      responseBuffer = lines[lines.length - 1];
    };

    server.stdout.on('data', onData);

    timeout = setTimeout(() => {
      server.stdout.removeListener('data', onData);
      reject(new Error('Request timeout'));
    }, 10000);

    server.stdin.write(requestStr);
  });
}

async function runTests() {
  log('SETUP', 'Starting MCP Server...', colors.cyan);

  // Start the MCP server
  const serverPath = join(__dirname, 'dist', 'index.js');
  const workspacePath = join(__dirname, '..');

  const server = spawn('node', [serverPath], {
    env: {
      ...process.env,
      TSDOC_WORKSPACE: workspacePath,
    },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  log('SETUP', 'Server started, running tests...', colors.cyan);

  const tests = [
    {
      name: 'Initialize Connection',
      request: createMessage('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      }),
      validate: (response) => {
        return response.result && response.result.protocolVersion;
      },
    },

    {
      name: 'List Available Tools',
      request: createMessage('tools/list'),
      validate: (response) => {
        const tools = response.result?.tools || [];
        log('INFO', `Found ${tools.length} tools`, colors.blue);
        tools.forEach(tool => {
          log('TOOL', `  - ${tool.name}: ${tool.description}`, colors.yellow);
        });
        return tools.length === 7;
      },
    },

    {
      name: 'Test 1: Search Symbols (DatabaseManager)',
      request: createMessage('tools/call', {
        name: 'tsdoc_search_symbols',
        arguments: {
          query: 'DatabaseManager',
          limit: 5,
        },
      }),
      validate: (response) => {
        if (response.error) {
          log('ERROR', response.error.message, colors.red);
          return false;
        }
        const content = response.result?.content?.[0]?.text || '';
        log('RESULT', content.substring(0, 200) + '...', colors.green);
        return content.length > 0;
      },
    },

    {
      name: 'Test 2: Get Ontology Stats',
      request: createMessage('tools/call', {
        name: 'tsdoc_get_ontology_stats',
        arguments: {
          detailed: false,
        },
      }),
      validate: (response) => {
        if (response.error) {
          log('ERROR', response.error.message, colors.red);
          return false;
        }
        const content = response.result?.content?.[0]?.text || '';
        log('RESULT', content.substring(0, 300) + '...', colors.green);
        return content.includes('Graph Overview');
      },
    },

    {
      name: 'Test 3: List Relationships (imports)',
      request: createMessage('tools/call', {
        name: 'tsdoc_list_relationships',
        arguments: {
          type: 'imports',
          limit: 5,
        },
      }),
      validate: (response) => {
        if (response.error) {
          log('ERROR', response.error.message, colors.red);
          return false;
        }
        const content = response.result?.content?.[0]?.text || '';
        log('RESULT', `Found relationships:\n${content.substring(0, 200)}...`, colors.green);
        return content.length > 0;
      },
    },

    {
      name: 'Test 4: Get Work Context',
      request: createMessage('tools/call', {
        name: 'tsdoc_get_work_context',
        arguments: {
          filePath: 'src/storage/DatabaseManager.ts',
          depth: 1,
        },
      }),
      validate: (response) => {
        if (response.error) {
          log('ERROR', response.error.message, colors.red);
          return false;
        }
        const content = response.result?.content?.[0]?.text || '';
        log('RESULT', `Context length: ${content.length} chars`, colors.green);
        return content.length > 0;
      },
    },

    {
      name: 'Test 5: Get Design Context',
      request: createMessage('tools/call', {
        name: 'tsdoc_get_design_context',
        arguments: {
          filePath: 'src/commands/CommandRegistry.ts',
        },
      }),
      validate: (response) => {
        if (response.error) {
          log('ERROR', response.error.message, colors.red);
          return false;
        }
        const content = response.result?.content?.[0]?.text || '';
        log('RESULT', `Design context length: ${content.length} chars`, colors.green);
        return content.length > 0;
      },
    },

    {
      name: 'Test 6: Query Relationships',
      request: createMessage('tools/call', {
        name: 'tsdoc_query_relationships',
        arguments: {
          symbolId: 'database-manager',
          direction: 'both',
          maxDepth: 1,
        },
      }),
      validate: (response) => {
        if (response.error) {
          log('ERROR', response.error.message, colors.red);
          return false;
        }
        const content = response.result?.content?.[0]?.text || '';
        log('RESULT', `Relationships:\n${content.substring(0, 200)}...`, colors.green);
        return content.length > 0;
      },
    },

    {
      name: 'Test 7: Get Symbol Details',
      request: createMessage('tools/call', {
        name: 'tsdoc_get_symbol_details',
        arguments: {
          symbolId: 'database-manager',
          includeRelationships: true,
        },
      }),
      validate: (response) => {
        if (response.error) {
          log('ERROR', response.error.message, colors.red);
          return false;
        }
        const content = response.result?.content?.[0]?.text || '';
        log('RESULT', `Symbol details:\n${content.substring(0, 300)}...`, colors.green);
        return content.length > 0;
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    log('TEST', test.name, colors.bright);

    try {
      const response = await sendRequest(server, test.request);

      if (test.validate(response)) {
        log('PASS', '✓ Test passed', colors.green);
        passed++;
      } else {
        log('FAIL', '✗ Validation failed', colors.red);
        log('RESPONSE', JSON.stringify(response, null, 2), colors.yellow);
        failed++;
      }
    } catch (error) {
      log('FAIL', `✗ ${error.message}`, colors.red);
      failed++;
    }

    console.log(''); // Blank line between tests
  }

  // Summary
  console.log('='.repeat(60));
  log('SUMMARY', `Total: ${tests.length} | Passed: ${passed} | Failed: ${failed}`, colors.bright);

  if (failed === 0) {
    log('SUCCESS', 'All tests passed! 🎉', colors.green);
  } else {
    log('FAILURE', `${failed} test(s) failed`, colors.red);
  }

  // Cleanup
  server.kill();
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
