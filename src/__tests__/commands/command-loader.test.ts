/**
 * command-loader tests
 * @testScenario Register every command without loading command modules
 * @testScenario Declared names and aliases match the real commands
 * @testScenario Lazy commands load on first use
 */

import { CommandRegistry } from '../../commands/CommandRegistry';
import { COMMAND_SPECS, registerAllCommands } from '../../commands/command-loader';

describe('command-loader', () => {
  describe('registerAllCommands', () => {
    it('should register help eagerly and every declared command lazily', () => {
      const registry = new CommandRegistry();

      registerAllCommands(registry);

      expect(registry.has('help')).toBe(true);
      for (const spec of COMMAND_SPECS) {
        expect(registry.has(spec.name)).toBe(true);
        for (const alias of spec.aliases) {
          expect(registry.has(alias)).toBe(true);
        }
      }
    });

    it('should not load a command module until the command is requested', () => {
      let moduleLoads = 0;

      jest.isolateModules(() => {
        jest.doMock('../../commands/BuildCommand', () => {
          moduleLoads++;
          return {
            BuildCommand: class {
              getName() {
                return 'build';
              }
              getAlias() {
                return ['b'];
              }
            },
          };
        });

        const { CommandRegistry: IsolatedRegistry } = require('../../commands/CommandRegistry');
        const { registerAllCommands: isolatedRegister } = require('../../commands/command-loader');
        const registry = new IsolatedRegistry();
        isolatedRegister(registry);

        expect(registry.getNames()).toContain('build');
        expect(moduleLoads).toBe(0);

        expect(registry.get('b')).toBe(registry.get('build'));
        expect(moduleLoads).toBe(1);
      });
    });
  });

  describe('COMMAND_SPECS', () => {
    it('should not declare the same primary name twice', () => {
      const names = COMMAND_SPECS.map((spec) => spec.name);

      expect(new Set(names).size).toBe(names.length);
    });

    it.each(COMMAND_SPECS.map((spec) => [spec.name, spec] as const))(
      'declares the real name and aliases of %s',
      (_name, spec) => {
        const command = spec.create();

        expect(command.getName()).toBe(spec.name);
        expect([...command.getAlias()]).toEqual([...spec.aliases]);
      }
    );

    it('should keep http-endpoints in front of endpoints as published', () => {
      const registry = new CommandRegistry();
      registerAllCommands(registry);

      expect(registry.get('endpoints')?.getName()).toBe('http-endpoints');
      expect(registry.get('ep')?.getName()).toBe('endpoints');
      expect(registry.get('routes')?.getName()).toBe('routes');
    });
  });
});
