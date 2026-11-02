/**
 * Smoke tests for Phase 3-10 Commands
 *
 * Basic tests to ensure commands instantiate and respond correctly.
 * Full integration tests can be added later.
 */

import {
  CheckDuplicatesCommand,
  CheckLinksCommand,
  CoreApiCommand,
  DepsCommand,
  FindMethodCommand,
  FindUnusedDocsCommand,
  FixCommand,
  HelpCommand,
  InitCommand,
  OrphansCommand,
  ParseCommand,
  PlansCommand,
  SpecBumpCommand,
  SpecDiffCommand,
  SpecHistoryCommand,
  SpecStatusCommand,
  StatsCommand,
  SuggestCommand,
  TodosCommand,
  TreeCommand,
  UndocumentedCommand,
  UntestedCommand,
  UpdateBacklinksCommand,
  UpdateSymbolRefsCommand,
  WhoUsesCommand,
} from '../../commands';

describe('Phase 3 Commands', () => {
  describe('ParseCommand', () => {
    it('should have correct name and description', () => {
      const command = new ParseCommand();
      expect(command.getName()).toBe('parse');
      expect(command.getDescription()).toContain('Parse');
    });
  });

  describe('UpdateBacklinksCommand', () => {
    it('should have correct name and description', () => {
      const command = new UpdateBacklinksCommand();
      expect(command.getName()).toBe('update-backlinks');
      expect(command.getDescription()).toContain('backlinks');
    });
  });

  describe('UpdateSymbolRefsCommand', () => {
    it('should have correct name and description', () => {
      const command = new UpdateSymbolRefsCommand();
      expect(command.getName()).toBe('update-symbol-refs');
      expect(command.getDescription()).toContain('symbol');
    });
  });

  describe('CheckLinksCommand', () => {
    it('should have correct name and description', () => {
      const command = new CheckLinksCommand();
      expect(command.getName()).toBe('check-links');
      expect(command.getDescription()).toContain('links');
    });
  });
});

describe('Phase 4 Commands', () => {
  describe('SuggestCommand', () => {
    it('should have correct name and description', () => {
      const command = new SuggestCommand();
      expect(command.getName()).toBe('suggest');
      expect(command.getDescription()).toContain('suggest');
    });
  });

  describe('InitCommand', () => {
    it('should have correct name and description', () => {
      const command = new InitCommand();
      expect(command.getName()).toBe('init');
      expect(command.getDescription()).toContain('Initialize');
    });
  });
});

describe('Phase 5 Commands', () => {
  describe('DepsCommand', () => {
    it('should have correct name and description', () => {
      const command = new DepsCommand();
      expect(command.getName()).toBe('deps');
      expect(command.getDescription()).toContain('depends on');
    });
  });

  describe('WhoUsesCommand', () => {
    it('should have correct name and description', () => {
      const command = new WhoUsesCommand();
      expect(command.getName()).toBe('who-uses');
      expect(command.getDescription()).toContain('depends on');
    });
  });

  describe('OrphansCommand', () => {
    it('should have correct name and description', () => {
      const command = new OrphansCommand();
      expect(command.getName()).toBe('orphans');
      expect(command.getDescription()).toContain('orphaned');
    });
  });

  describe('UndocumentedCommand', () => {
    it('should have correct name and description', () => {
      const command = new UndocumentedCommand();
      expect(command.getName()).toBe('undocumented');
      expect(command.getDescription()).toContain('undocumented');
    });
  });

  describe('TreeCommand', () => {
    it('should have correct name and description', () => {
      const command = new TreeCommand();
      expect(command.getName()).toBe('tree');
      expect(command.getDescription()).toContain('tree');
    });
  });
});

describe('Phase 6 Commands', () => {
  describe('CheckDuplicatesCommand', () => {
    it('should have correct name and description', () => {
      const command = new CheckDuplicatesCommand();
      expect(command.getName()).toBe('check-duplicates');
      expect(command.getDescription()).toContain('duplicate');
    });
  });

  describe('SpecStatusCommand', () => {
    it('should have correct name and description', () => {
      const command = new SpecStatusCommand();
      expect(command.getName()).toBe('spec-status');
      expect(command.getDescription()).toContain('status');
    });
  });

  describe('FindUnusedDocsCommand', () => {
    it('should have correct name and description', () => {
      const command = new FindUnusedDocsCommand();
      expect(command.getName()).toBe('find-unused-docs');
      expect(command.getDescription()).toContain('unused');
    });
  });

  describe('SpecHistoryCommand', () => {
    it('should have correct name and description', () => {
      const command = new SpecHistoryCommand();
      expect(command.getName()).toBe('spec-history');
      expect(command.getDescription()).toContain('history');
    });
  });

  describe('SpecDiffCommand', () => {
    it('should have correct name and description', () => {
      const command = new SpecDiffCommand();
      expect(command.getName()).toBe('spec-diff');
      expect(command.getDescription()).toContain('Compare');
    });
  });

  describe('SpecBumpCommand', () => {
    it('should have correct name and description', () => {
      const command = new SpecBumpCommand();
      expect(command.getName()).toBe('spec-bump');
      expect(command.getDescription()).toContain('version');
    });
  });
});

describe('Phase 7 Commands', () => {
  describe('PlansCommand', () => {
    it('should have correct name and description', () => {
      const command = new PlansCommand();
      expect(command.getName()).toBe('plans');
      expect(command.getDescription()).toContain('plans');
    });
  });

  describe('FindMethodCommand', () => {
    it('should have correct name and description', () => {
      const command = new FindMethodCommand();
      expect(command.getName()).toBe('find-method');
      expect(command.getDescription()).toContain('method');
    });
  });

  describe('TodosCommand', () => {
    it('should have correct name and description', () => {
      const command = new TodosCommand();
      expect(command.getName()).toBe('todos');
      expect(command.getDescription()).toContain('TODO');
    });
  });

  describe('StatsCommand', () => {
    it('should have correct name and description', () => {
      const command = new StatsCommand();
      expect(command.getName()).toBe('stats');
      expect(command.getDescription()).toContain('statistics');
    });
  });

  describe('CoreApiCommand', () => {
    it('should have correct name and description', () => {
      const command = new CoreApiCommand();
      expect(command.getName()).toBe('core-api');
      expect(command.getDescription()).toContain('API');
    });
  });
});

describe('Phase 8 Commands', () => {
  describe('UntestedCommand', () => {
    it('should have correct name and description', () => {
      const command = new UntestedCommand();
      expect(command.getName()).toBe('untested');
      expect(command.getDescription()).toContain('test');
    });
  });

  describe('FixCommand', () => {
    it('should have correct name and description', () => {
      const command = new FixCommand();
      expect(command.getName()).toBe('fix');
      expect(command.getDescription()).toContain('fix');
    });
  });
});

describe('Phase 9 Commands', () => {
  describe('HelpCommand', () => {
    it('should have correct name and description', () => {
      const command = new HelpCommand();
      expect(command.getName()).toBe('help');
      expect(command.getDescription()).toContain('help');
    });
  });
});
