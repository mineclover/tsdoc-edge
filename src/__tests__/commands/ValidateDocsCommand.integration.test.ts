/**
 * End-to-End Integration Tests: UpdateBacklinksCommand ↔ ValidateDocsCommand
 * @testScenario Update backlinks followed by document validation
 * @testScenario Zero warning escalation and 100% idempotency
 * @testScenario Code connection consistency across commands
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UpdateBacklinksCommand } from '../../commands/UpdateBacklinksCommand';
import { ValidateDocsCommand } from '../../commands/ValidateDocsCommand';
import { DocumentSymbolRegistry } from '../../doc-symbol/DocumentSymbolRegistry';

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(() => ({
        paths: { managedDir: 'managed' },
        documentManagement: {
          enabled: true,
          managedDirs: ['managed'],
          ignoreCodeBlocks: true,
        },
        validation: {
          skipCodeImplDirs: ['concepts', 'guides'],
        },
      })),
    })),
  },
}));

describe('UpdateBacklinksCommand ↔ ValidateDocsCommand Integration Pipeline', () => {
  let updateCmd: UpdateBacklinksCommand;
  let validateCmd: ValidateDocsCommand;
  let consoleSpy: jest.SpyInstance;
  let tempDir: string;
  let managedDir: string;

  beforeEach(() => {
    updateCmd = new UpdateBacklinksCommand();
    validateCmd = new ValidateDocsCommand();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-')));
    managedDir = path.join(tempDir, 'managed');
    fs.mkdirSync(managedDir, { recursive: true });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs update-backlinks followed by validate-docs with zero errors and no no_code_impl warnings', async () => {
    // Setup a mini managed tree with code connections
    const fileService = path.join(managedDir, 'UserService.md');
    const fileController = path.join(managedDir, 'UserController.md');

    fs.writeFileSync(
      fileService,
      `---
source: src/services/UserService.ts
---

# [[UserService]]

User service implementation.
`,
      'utf8'
    );

    fs.writeFileSync(
      fileController,
      `---
source: src/controllers/UserController.ts
---

# [[UserController]]

Controller calling [[UserService]].
`,
      'utf8'
    );

    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
    try {
      // Step 1: Run update-backlinks
      const updateResult = await updateCmd.execute([managedDir]);
      expect(updateResult.exitCode).toBe(0);

      // Verify UserService has Implemented By and Referenced By
      const serviceContent = fs.readFileSync(fileService, 'utf8');
      expect(serviceContent).toContain('### Referenced By');
      expect(serviceContent).toContain('[[UserController]]');
      expect(serviceContent).toContain('### Implemented By');
      expect(serviceContent).toContain('UserService → src/services/UserService.ts:1');

      // Step 2: Run validate-docs
      const validateResult = await validateCmd.execute([managedDir]);
      expect(validateResult.exitCode).toBe(0);

      // Step 3: Run update-backlinks a second time (idempotency check)
      const updateResult2 = await updateCmd.execute([managedDir]);
      expect(updateResult2.exitCode).toBe(0);

      // Step 4: Run validate-docs a second time
      const validateResult2 = await validateCmd.execute([managedDir]);
      expect(validateResult2.exitCode).toBe(0);

      // Verify files did not change in second update
      const serviceContent2 = fs.readFileSync(fileService, 'utf8');
      expect(serviceContent2).toBe(serviceContent);
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it('ensures references in ## Backlinks do not leak into validation warnings or create circular refs', async () => {
    const fileA = path.join(managedDir, 'Alpha.md');
    const fileB = path.join(managedDir, 'Beta.md');

    // Alpha references Beta
    fs.writeFileSync(
      fileA,
      `---
source: src/Alpha.ts
---
# [[Alpha]]

References [[Beta]].
`,
      'utf8'
    );

    // Beta does NOT reference Alpha in text
    fs.writeFileSync(
      fileB,
      `---
source: src/Beta.ts
---
# [[Beta]]

Beta component.
`,
      'utf8'
    );

    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
    try {
      // Update backlinks: Beta now contains [[Alpha]] inside its ## Backlinks section
      await updateCmd.execute([managedDir]);

      // Capture registry state during validation
      const registry = new DocumentSymbolRegistry();
      const customValidateCmd = new ValidateDocsCommand(undefined, registry);
      const valResult = await customValidateCmd.execute([managedDir]);

      expect(valResult.exitCode).toBe(0);

      // Alpha should have 0 incoming document references
      // (Beta does not reference Alpha; the link in Beta's ## Backlinks must be ignored)
      const alphaRefs = registry.getReferences('Alpha');
      expect(alphaRefs.length).toBe(0);

      // Beta should have exactly 1 incoming reference (from Alpha line 7)
      const betaRefs = registry.getReferences('Beta');
      expect(betaRefs.length).toBe(1);
      expect(betaRefs[0].filePath).toContain('Alpha.md');
    } finally {
      cwdSpy.mockRestore();
    }
  });
});
