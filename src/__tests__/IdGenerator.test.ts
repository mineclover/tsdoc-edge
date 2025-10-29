/**
 * IdGenerator tests
 * @testScenario Sequential ID generation
 * @testScenario Random ID generation
 * @testScenario Collision prevention
 * @testScenario ID reuse prevention
 * @testScenario Custom charset support
 */

import { IdGenerator } from '../utils/IdGenerator';

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
  });
});
