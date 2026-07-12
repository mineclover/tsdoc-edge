/**
 * IdGenerator tests
 * @testScenario Sequential ID generation
 * @testScenario Random ID generation
 * @testScenario Collision prevention
 * @testScenario ID reuse prevention
 * @testScenario Custom charset support
 */

import { IdGenerator } from '../../utils/IdGenerator';

describe('IdGenerator', () => {
  describe('Sequential Mode', () => {
    test('should generate sequential IDs starting from 000', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      const id1 = generator.generate();
      const id2 = generator.generate();
      const id3 = generator.generate();

      expect(id1).toBe('000');
      expect(id2).toBe('001');
      expect(id3).toBe('002');
    });

    test('should continue sequence after 009', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      // Generate 10 IDs
      for (let i = 0; i < 10; i++) {
        generator.generate();
      }

      const id11 = generator.generate();
      expect(id11).toBe('00a'); // Base-36: 0-9, a-z
    });

    test('should handle different lengths', () => {
      const generator2 = new IdGenerator({ mode: 'sequential', length: 2 });
      const generator4 = new IdGenerator({ mode: 'sequential', length: 4 });

      expect(generator2.generate()).toBe('00');
      expect(generator4.generate()).toBe('0000');
    });

    test('should register existing IDs and continue', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.registerExisting(['000', '001', '002']);

      const nextId = generator.generate();
      expect(nextId).toBe('003');
    });

    test('should not reuse IDs', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      const id1 = generator.generate();
      const id2 = generator.generate();

      expect(id1).not.toBe(id2);

      // Register and try to generate - should skip
      const id3 = generator.generate();
      expect(id3).not.toBe(id1);
      expect(id3).not.toBe(id2);
    });
  });

  describe('Random Mode', () => {
    test('should generate random IDs', () => {
      const generator = new IdGenerator({ mode: 'random', length: 3 });

      const id1 = generator.generate();
      const id2 = generator.generate();

      expect(id1).toHaveLength(3);
      expect(id2).toHaveLength(3);
      expect(id1).not.toBe(id2);
    });

    test('should prevent collisions', () => {
      const generator = new IdGenerator({ mode: 'random', length: 3 });

      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const id = generator.generate();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
    });

    test('should not generate already used IDs', () => {
      const generator = new IdGenerator({ mode: 'random', length: 3 });

      const id1 = generator.generate();
      generator.registerExisting([id1]);

      const id2 = generator.generate();
      expect(id2).not.toBe(id1);
    });

    test('should use only charset characters', () => {
      const generator = new IdGenerator({ mode: 'random', length: 5 });

      const id = generator.generate();
      const charset = '0123456789abcdefghijklmnopqrstuvwxyz';

      for (const char of id) {
        expect(charset).toContain(char);
      }
    });
  });

  describe('Custom Charset', () => {
    test('should support custom charset', () => {
      const generator = new IdGenerator({
        mode: 'random',
        length: 4,
        charset: 'ABCDEF',
      });

      const id = generator.generate();
      expect(id).toHaveLength(4);

      for (const char of id) {
        expect('ABCDEF').toContain(char);
      }
    });

    test('should generate sequential with custom charset', () => {
      const generator = new IdGenerator({
        mode: 'sequential',
        length: 2,
        charset: 'AB',
      });

      const id1 = generator.generate();
      const id2 = generator.generate();
      const id3 = generator.generate();
      const id4 = generator.generate();

      // Sequential with padding uses '0' from charset
      // 0 (base-2) = '00' with padding
      // 1 (base-2) = '01' with padding
      // 2 (base-2) = '10' with padding
      // 3 (base-2) = '11' with padding
      expect(id1).toBe('00');
      expect(id2).toBe('01');
      expect(id3).toBe('10');
      expect(id4).toBe('11');
    });
  });

  describe('Capacity Calculation', () => {
    test('should calculate capacity correctly for length 3', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      const capacity = generator.getCapacity();
      expect(capacity).toBe(36 * 36 * 36); // 46656
    });

    test('should calculate capacity for different lengths', () => {
      const gen2 = new IdGenerator({ mode: 'sequential', length: 2 });
      const gen4 = new IdGenerator({ mode: 'sequential', length: 4 });

      expect(gen2.getCapacity()).toBe(36 * 36); // 1296
      expect(gen4.getCapacity()).toBe(36 * 36 * 36 * 36); // 1679616
    });

    test('should track used IDs', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.generate();
      generator.generate();
      generator.generate();

      expect(generator.getUsedCount()).toBe(3);
    });

    test('should calculate utilization', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 2 });

      generator.generate(); // 1 ID used
      const capacity = generator.getCapacity(); // 1296

      const utilization = generator.getUsedCount() / capacity;
      expect(utilization).toBeCloseTo(1 / 1296);
    });
  });

  describe('Register Existing', () => {
    test('should register multiple existing IDs', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.registerExisting(['000', '001', '005', '010']);

      const nextId = generator.generate();
      expect(nextId).not.toBe('000');
      expect(nextId).not.toBe('001');
      expect(nextId).not.toBe('005');
      expect(nextId).not.toBe('010');
    });

    test('should handle empty array', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.registerExisting([]);

      const id = generator.generate();
      expect(id).toBe('000');
    });

    test('should update used count after registration', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.registerExisting(['000', '001', '002']);

      expect(generator.getUsedCount()).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle maximum ID in range by increasing length', () => {
      const generator = new IdGenerator({
        mode: 'sequential',
        length: 1,
        charset: '01',
      });

      const id1 = generator.generate(); // 0
      const id2 = generator.generate(); // 1

      expect(id1).toBe('0');
      expect(id2).toBe('1');

      // Should increase length when capacity exceeded
      const id3 = generator.generate();
      expect(id3.length).toBeGreaterThan(1);
    });

    test('should increase length when random mode exceeds capacity', () => {
      const generator = new IdGenerator({
        mode: 'random',
        length: 1,
        charset: 'A',
      });

      const id1 = generator.generate(); // Uses only 'A'
      expect(id1).toBe('A');

      // Should increase length on second attempt as capacity is 1
      const id2 = generator.generate();
      expect(id2.length).toBeGreaterThan(1);
    });

    test('should handle length 1', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 1 });

      const id = generator.generate();
      expect(id).toHaveLength(1);
    });

    test('should handle very long IDs', () => {
      const generator = new IdGenerator({ mode: 'random', length: 20 });

      const id = generator.generate();
      expect(id).toHaveLength(20);
    });
  });

  describe('Statistics', () => {
    test('should provide statistics object', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.generate();
      generator.generate();

      const stats = {
        mode: 'sequential',
        length: 3,
        used: generator.getUsedCount(),
        capacity: generator.getCapacity(),
        utilization: (generator.getUsedCount() / generator.getCapacity()) * 100,
      };

      expect(stats.mode).toBe('sequential');
      expect(stats.length).toBe(3);
      expect(stats.used).toBe(2);
      expect(stats.capacity).toBe(46656);
      expect(stats.utilization).toBeCloseTo(0.00428, 2);
    });

    test('should provide statistics via getStats method', () => {
      const generator = new IdGenerator({ mode: 'random', length: 4 });

      generator.generate();
      generator.generate();
      generator.generate();

      const stats = generator.getStats();

      expect(stats.mode).toBe('random');
      expect(stats.length).toBe(4);
      expect(stats.used).toBe(3);
      expect(stats.capacity).toBeGreaterThan(0);
      expect(stats.utilization).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    test('should validate ID with correct length', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      const id1 = generator.generate();
      expect(generator.isValid(id1)).toBe(true);

      expect(generator.isValid('000')).toBe(true);
      expect(generator.isValid('abcd')).toBe(true);
      expect(generator.isValid('12345')).toBe(true);
    });

    test('should reject ID that is too short', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      expect(generator.isValid('00')).toBe(false);
      expect(generator.isValid('a')).toBe(false);
      expect(generator.isValid('')).toBe(false);
    });

    test('should reject ID that is too long', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      expect(generator.isValid('000000')).toBe(false);
      expect(generator.isValid('abcdefgh')).toBe(false);
    });

    test('should reject ID with invalid characters', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      expect(generator.isValid('00!')).toBe(false);
      expect(generator.isValid('a@c')).toBe(false);
      expect(generator.isValid('xy-')).toBe(false);
    });

    test('should validate with custom charset', () => {
      const generator = new IdGenerator({
        mode: 'sequential',
        length: 3,
        charset: 'ABC',
      });

      expect(generator.isValid('AAA')).toBe(true);
      expect(generator.isValid('ABC')).toBe(true);
      expect(generator.isValid('AAD')).toBe(false); // D not in charset
    });
  });

  describe('Reset', () => {
    test('should reset generator state', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.generate();
      generator.generate();
      generator.generate();

      expect(generator.getUsedCount()).toBe(3);

      generator.reset();

      expect(generator.getUsedCount()).toBe(0);
      const nextId = generator.generate();
      expect(nextId).toBe('000'); // Should start from beginning
    });

    test('should reset sequential counter', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.generate(); // 000
      generator.generate(); // 001
      generator.generate(); // 002

      generator.reset();

      const id = generator.generate();
      expect(id).toBe('000');
    });

    test('should reset used IDs set', () => {
      const generator = new IdGenerator({ mode: 'random', length: 3 });

      const id1 = generator.generate();
      generator.registerExisting([id1]);

      expect(generator.getUsedCount()).toBeGreaterThan(0);

      generator.reset();

      expect(generator.getUsedCount()).toBe(0);
    });

    test('should reset length to default', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      // Force length increase by filling capacity
      generator.registerExisting(['000', '001']);
      generator.generate();

      // Internal length might have changed during collision handling
      generator.reset();

      const stats = generator.getStats();
      expect(stats.length).toBe(3);
    });
  });

  describe('Default options', () => {
    test('should use sequential mode by default', () => {
      const generator = new IdGenerator();

      const id1 = generator.generate();
      const id2 = generator.generate();

      expect(id1).toBe('000');
      expect(id2).toBe('001');
    });

    test('should use length 3 by default', () => {
      const generator = new IdGenerator();

      const id = generator.generate();
      expect(id).toHaveLength(3);
    });

    test('should use base-36 charset by default', () => {
      const generator = new IdGenerator();
      const charset = '0123456789abcdefghijklmnopqrstuvwxyz';

      const id = generator.generate();

      for (const char of id) {
        expect(charset).toContain(char);
      }
    });
  });

  describe('Register existing edge cases', () => {
    test('should handle duplicate IDs in registration', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.registerExisting(['000', '000', '001', '001', '002']);

      expect(generator.getUsedCount()).toBe(3); // Should deduplicate
    });

    test('should handle non-sequential IDs in sequential mode', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.registerExisting(['005', '010', '003']);

      const nextId = generator.generate();
      // Should start from highest + 1 (010 in base-36 = 16, so next is 17 = 011 in base-36)
      expect(nextId).toBe('011'); // 17 in base-36
    });

    test('should handle invalid IDs gracefully', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      // Register IDs with invalid characters
      generator.registerExisting(['xyz', 'abc', 'invalid']);

      // Should still track these as used
      expect(generator.getUsedCount()).toBe(3);
    });

    test('should update sequential counter correctly with base-36', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.registerExisting(['00z']); // 35 in base-36

      const nextId = generator.generate();
      expect(nextId).toBe('010'); // 36 in base-36
    });
  });

  describe('Collision handling', () => {
    test('should handle collision by increasing length after max attempts', () => {
      const generator = new IdGenerator({
        mode: 'random',
        length: 1,
        charset: 'A',
      });

      const id1 = generator.generate(); // 'A'
      const id2 = generator.generate(); // Should increase length

      expect(id1).toBe('A');
      expect(id2.length).toBeGreaterThan(1);
    });

    test('should continue generating after length increase', () => {
      const generator = new IdGenerator({
        mode: 'random',
        length: 1,
        charset: 'AB',
      });

      const _id1 = generator.generate();
      const _id2 = generator.generate();
      const id3 = generator.generate(); // Triggers length increase

      expect(id3.length).toBeGreaterThan(1);

      const id4 = generator.generate();
      expect(id4.length).toBe(id3.length);
    });
  });

  describe('Large scale generation', () => {
    test('should generate many unique IDs in sequential mode', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const id = generator.generate();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }

      expect(ids.size).toBe(1000);
    });

    test('should generate many unique IDs in random mode', () => {
      const generator = new IdGenerator({ mode: 'random', length: 4 });

      const ids = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const id = generator.generate();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }

      expect(ids.size).toBe(500);
    });
  });

  describe('Capacity and utilization', () => {
    test('should calculate correct capacity for different charsets', () => {
      const gen1 = new IdGenerator({ length: 2, charset: '01' });
      expect(gen1.getCapacity()).toBe(4); // 2^2

      const gen2 = new IdGenerator({ length: 2, charset: '0123456789' });
      expect(gen2.getCapacity()).toBe(100); // 10^2

      const gen3 = new IdGenerator({ length: 3, charset: 'ABC' });
      expect(gen3.getCapacity()).toBe(27); // 3^3
    });

    test('should track utilization correctly', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 2 });

      const capacity = generator.getCapacity();

      for (let i = 0; i < 10; i++) {
        generator.generate();
      }

      const stats = generator.getStats();
      expect(stats.utilization).toBeCloseTo((10 / capacity) * 100, 2);
    });

    test('should handle 100% utilization', () => {
      const generator = new IdGenerator({
        mode: 'sequential',
        length: 1,
        charset: '01',
      });

      generator.generate(); // 0
      generator.generate(); // 1

      const stats = generator.getStats();
      expect(stats.utilization).toBe(100);
    });
  });

  describe('String formatting', () => {
    test('should pad sequential IDs correctly', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 5 });

      const id1 = generator.generate();
      const id2 = generator.generate();

      expect(id1).toBe('00000');
      expect(id2).toBe('00001');
    });

    test('should handle leading zeros in sequential mode', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 4 });

      generator.registerExisting(['0001', '0010', '0100']);

      const nextId = generator.generate();
      expect(nextId).toBe('0101'); // 257 in base-36 with padding
    });
  });

  describe('Base conversion', () => {
    test('should convert sequential IDs to correct base', () => {
      const generator = new IdGenerator({
        mode: 'sequential',
        length: 2,
        charset: '0123456789',
      });

      const id1 = generator.generate(); // 0
      const _id10 = generator.generate(); // 1

      for (let i = 2; i < 10; i++) {
        generator.generate();
      }

      const id11 = generator.generate(); // Should be '10' in base-10

      expect(id1).toBe('00');
      expect(id11).toBe('10');
    });

    test('should handle base-2 charset', () => {
      const generator = new IdGenerator({
        mode: 'sequential',
        length: 4,
        charset: '01',
      });

      const id1 = generator.generate();
      const id2 = generator.generate();
      const id3 = generator.generate();
      const id4 = generator.generate();

      expect(id1).toBe('0000'); // 0
      expect(id2).toBe('0001'); // 1
      expect(id3).toBe('0010'); // 2
      expect(id4).toBe('0011'); // 3
    });
  });

  describe('Statistics consistency', () => {
    test('should maintain consistent statistics after operations', () => {
      const generator = new IdGenerator({ mode: 'sequential', length: 3 });

      generator.generate();
      generator.generate();
      generator.registerExisting(['010', '011', '012']);

      const stats = generator.getStats();

      expect(stats.used).toBe(5);
      expect(stats.capacity).toBe(generator.getCapacity());
      expect(stats.length).toBe(3);
      expect(stats.mode).toBe('sequential');
    });

    test('should update statistics after reset', () => {
      const generator = new IdGenerator({ mode: 'random', length: 3 });

      generator.generate();
      generator.generate();
      generator.generate();

      generator.reset();

      const stats = generator.getStats();

      expect(stats.used).toBe(0);
      expect(stats.utilization).toBe(0);
    });
  });
});
