/**
 * Jest global setup file
 * Resets singletons and cleans up resources after each test file
 */

import { ConfigManager } from '../config/ConfigManager';

// Reset ConfigManager singleton after each test to prevent memory leaks
afterEach(() => {
  ConfigManager.reset();
});

// Force garbage collection hint (if --expose-gc is enabled)
afterAll(() => {
  ConfigManager.reset();
  if (global.gc) {
    global.gc();
  }
});
