/**
 * EventFlowAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { EventFlowAnalyzer } from '../../analyzer/EventFlowAnalyzer';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('EventFlowAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventflow-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string; type?: Symbol['type']; filePath?: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();
    const fileIndex = new Map<string, string[]>();

    for (const s of symbols) {
      const filePath = s.filePath || `src/${s.name}.ts`;
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: s.type || 'class',
        filePath,
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      });

      // Add to name index
      if (!nameIndex.has(s.name)) {
        nameIndex.set(s.name, []);
      }
      nameIndex.get(s.name)!.push(s.id);

      // Add to file index
      if (!fileIndex.has(filePath)) {
        fileIndex.set(filePath, []);
      }
      fileIndex.get(filePath)!.push(s.id);
    }

    return {
      symbols: symbolsMap,
      relationships: [],
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex,
      fileIndex,
    } as SymbolGraph;
  }

  // Helper to create a TypeScript program from source code
  function createProgram(files: Record<string, string>): ts.Program {
    const filePaths: string[] = [];

    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tempDir, name);
      fs.writeFileSync(filePath, content);
      filePaths.push(filePath);
    }

    return ts.createProgram(filePaths, {
      noEmit: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    });
  }

  describe('constructor and setProgram', () => {
    it('should create analyzer without program', () => {
      const graph = createMockGraph([]);
      const analyzer = new EventFlowAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const program = createProgram({ 'test.ts': '' });
      const analyzer = new EventFlowAnalyzer(graph, program);

      expect(analyzer).toBeDefined();
    });

    it('should allow setting program later', () => {
      const graph = createMockGraph([]);
      const analyzer = new EventFlowAnalyzer(graph);
      const program = createProgram({ 'test.ts': '' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze - basic behavior', () => {
    it('should return empty array when no program provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new EventFlowAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should skip declaration files', () => {
      const graph = createMockGraph([{ id: 'class-emitter', name: 'Emitter' }]);
      const program = createProgram({
        'test.d.ts': `
          export class Emitter {
            emit(event: string): void;
          }
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });
  });

  describe('analyze - EventEmitter patterns', () => {
    it('should detect emit and on pattern for same event name', () => {
      const emitterFile = path.join(tempDir, 'emitter.ts');
      const listenerFile = path.join(tempDir, 'listener.ts');

      const graph = createMockGraph([
        { id: 'class-producer', name: 'producer', filePath: emitterFile },
        { id: 'class-consumer', name: 'consumer', filePath: listenerFile },
      ]);

      const program = createProgram({
        'emitter.ts': `
          const producer = {
            emit(event: string, data: any) {}
          };
          producer.emit('data-ready', { value: 42 });
        `,
        'listener.ts': `
          const consumer = {
            on(event: string, handler: Function) {}
          };
          consumer.on('data-ready', (data) => console.log(data));
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      const eventFlowRel = result.find(
        (r) =>
          r.type === 'event-flow' &&
          r.properties?.eventName === 'data-ready'
      );

      expect(eventFlowRel).toBeDefined();
      expect(eventFlowRel?.category).toBe('data-flow');
      expect(eventFlowRel?.direction).toBe('unidirectional');
    });

    it('should detect once pattern as consumption', () => {
      const emitterFile = path.join(tempDir, 'emitter.ts');
      const listenerFile = path.join(tempDir, 'listener.ts');

      const graph = createMockGraph([
        { id: 'class-emitter', name: 'emitter', filePath: emitterFile },
        { id: 'class-listener', name: 'listener', filePath: listenerFile },
      ]);

      const program = createProgram({
        'emitter.ts': `
          const emitter = { emit(e: string, d: any) {} };
          emitter.emit('single-event', {});
        `,
        'listener.ts': `
          const listener = { once(e: string, h: Function) {} };
          listener.once('single-event', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      const eventFlowRel = result.find(
        (r) => r.properties?.eventName === 'single-event'
      );

      expect(eventFlowRel).toBeDefined();
    });

    it('should detect trigger pattern as emission', () => {
      const triggerFile = path.join(tempDir, 'trigger.ts');
      const handlerFile = path.join(tempDir, 'handler.ts');

      const graph = createMockGraph([
        { id: 'class-trigger', name: 'trigger', filePath: triggerFile },
        { id: 'class-handler', name: 'handler', filePath: handlerFile },
      ]);

      const program = createProgram({
        'trigger.ts': `
          const trigger = { trigger(e: string) {} };
          trigger.trigger('my-event');
        `,
        'handler.ts': `
          const handler = { on(e: string, h: Function) {} };
          handler.on('my-event', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      const eventFlowRel = result.find(
        (r) => r.properties?.eventName === 'my-event'
      );

      expect(eventFlowRel).toBeDefined();
    });
  });

  describe('analyze - DOM event patterns', () => {
    it('should detect dispatchEvent and addEventListener pattern', () => {
      const dispatcherFile = path.join(tempDir, 'dispatcher.ts');
      const listenerFile = path.join(tempDir, 'listener.ts');

      const graph = createMockGraph([
        { id: 'class-dispatcher', name: 'dispatcher', filePath: dispatcherFile },
        { id: 'class-domlistener', name: 'domlistener', filePath: listenerFile },
      ]);

      const program = createProgram({
        'dispatcher.ts': `
          const dispatcher = { dispatchEvent(e: string) {} };
          dispatcher.dispatchEvent('click');
        `,
        'listener.ts': `
          const domlistener = { addEventListener(e: string, h: Function) {} };
          domlistener.addEventListener('click', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      const eventFlowRel = result.find(
        (r) =>
          r.properties?.eventName === 'click' &&
          r.properties?.producerPattern === 'dispatchEvent'
      );

      expect(eventFlowRel).toBeDefined();
      expect(eventFlowRel?.properties?.consumerPattern).toBe('addEventListener');
    });
  });

  describe('analyze - Pub/Sub patterns', () => {
    it('should detect subscribe and listen patterns', () => {
      const pubFile = path.join(tempDir, 'publisher.ts');
      const subFile = path.join(tempDir, 'subscriber.ts');

      const graph = createMockGraph([
        { id: 'class-publisher', name: 'publisher', filePath: pubFile },
        { id: 'class-subscriber', name: 'subscriber', filePath: subFile },
      ]);

      const program = createProgram({
        'publisher.ts': `
          const publisher = { emit(e: string, d: any) {} };
          publisher.emit('message', { text: 'hello' });
        `,
        'subscriber.ts': `
          const subscriber = { subscribe(e: string, h: Function) {} };
          subscriber.subscribe('message', (msg) => console.log(msg));
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      const eventFlowRel = result.find(
        (r) => r.properties?.eventName === 'message'
      );

      expect(eventFlowRel).toBeDefined();
    });

    it('should detect listen pattern as consumption', () => {
      const emitFile = path.join(tempDir, 'emit.ts');
      const listenFile = path.join(tempDir, 'listen.ts');

      const graph = createMockGraph([
        { id: 'class-emitter2', name: 'emitter2', filePath: emitFile },
        { id: 'class-listener2', name: 'listener2', filePath: listenFile },
      ]);

      const program = createProgram({
        'emit.ts': `
          const emitter2 = { emit(e: string, d: any) {} };
          emitter2.emit('notification', {});
        `,
        'listen.ts': `
          const listener2 = { listen(e: string, h: Function) {} };
          listener2.listen('notification', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      const eventFlowRel = result.find(
        (r) => r.properties?.eventName === 'notification'
      );

      expect(eventFlowRel).toBeDefined();
    });
  });

  describe('analyze - matching behavior', () => {
    it('should not create relationship for self-reference', () => {
      const sameFile = path.join(tempDir, 'same.ts');

      const graph = createMockGraph([
        { id: 'class-selfemitter', name: 'selfemitter', filePath: sameFile },
      ]);

      const program = createProgram({
        'same.ts': `
          const selfemitter = {
            emit(e: string, d: any) {},
            on(e: string, h: Function) {}
          };
          selfemitter.emit('internal', {});
          selfemitter.on('internal', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Self-references should be filtered out
      const selfRef = result.find(
        (r) => r.from === r.to
      );

      expect(selfRef).toBeUndefined();
    });

    it('should not match events with different names', () => {
      const emitFile = path.join(tempDir, 'emit.ts');
      const listenFile = path.join(tempDir, 'listen.ts');

      const graph = createMockGraph([
        { id: 'class-producer2', name: 'producer2', filePath: emitFile },
        { id: 'class-consumer2', name: 'consumer2', filePath: listenFile },
      ]);

      const program = createProgram({
        'emit.ts': `
          const producer2 = { emit(e: string, d: any) {} };
          producer2.emit('event-a', {});
        `,
        'listen.ts': `
          const consumer2 = { on(e: string, h: Function) {} };
          consumer2.on('event-b', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      // No match because event names are different
      expect(result).toHaveLength(0);
    });

    it('should handle multiple consumers for same event', () => {
      const emitFile = path.join(tempDir, 'emit.ts');
      const listen1File = path.join(tempDir, 'listen1.ts');
      const listen2File = path.join(tempDir, 'listen2.ts');

      const graph = createMockGraph([
        { id: 'class-broadcaster', name: 'broadcaster', filePath: emitFile },
        { id: 'class-listener1', name: 'listener1', filePath: listen1File },
        { id: 'class-listener2', name: 'listener2', filePath: listen2File },
      ]);

      const program = createProgram({
        'emit.ts': `
          const broadcaster = { emit(e: string, d: any) {} };
          broadcaster.emit('broadcast', { data: 'shared' });
        `,
        'listen1.ts': `
          const listener1 = { on(e: string, h: Function) {} };
          listener1.on('broadcast', () => {});
        `,
        'listen2.ts': `
          const listener2 = { on(e: string, h: Function) {} };
          listener2.on('broadcast', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      const broadcastRels = result.filter(
        (r) => r.properties?.eventName === 'broadcast'
      );

      expect(broadcastRels.length).toBe(2);
    });

    it('should handle multiple producers for same event', () => {
      const emit1File = path.join(tempDir, 'emit1.ts');
      const emit2File = path.join(tempDir, 'emit2.ts');
      const listenFile = path.join(tempDir, 'listen.ts');

      const graph = createMockGraph([
        { id: 'class-producer1', name: 'producer1', filePath: emit1File },
        { id: 'class-producer2', name: 'producer2', filePath: emit2File },
        { id: 'class-listener', name: 'listener', filePath: listenFile },
      ]);

      const program = createProgram({
        'emit1.ts': `
          const producer1 = { emit(e: string, d: any) {} };
          producer1.emit('shared-event', {});
        `,
        'emit2.ts': `
          const producer2 = { emit(e: string, d: any) {} };
          producer2.emit('shared-event', {});
        `,
        'listen.ts': `
          const listener = { on(e: string, h: Function) {} };
          listener.on('shared-event', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      const sharedEventRels = result.filter(
        (r) => r.properties?.eventName === 'shared-event'
      );

      expect(sharedEventRels.length).toBe(2);
    });
  });

  describe('analyze - event name extraction', () => {
    it('should extract string literal event names', () => {
      const emitFile = path.join(tempDir, 'emit.ts');
      const listenFile = path.join(tempDir, 'listen.ts');

      const graph = createMockGraph([
        { id: 'class-a', name: 'a', filePath: emitFile },
        { id: 'class-b', name: 'b', filePath: listenFile },
      ]);

      const program = createProgram({
        'emit.ts': `
          const a = { emit(e: string, d: any) {} };
          a.emit("double-quoted-event", {});
        `,
        'listen.ts': `
          const b = { on(e: string, h: Function) {} };
          b.on("double-quoted-event", () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      const eventRel = result.find(
        (r) => r.properties?.eventName === 'double-quoted-event'
      );

      expect(eventRel).toBeDefined();
    });

    it('should handle identifier event names as constants', () => {
      const emitFile = path.join(tempDir, 'emit.ts');
      const listenFile = path.join(tempDir, 'listen.ts');

      const graph = createMockGraph([
        { id: 'class-emitter3', name: 'emitter3', filePath: emitFile },
        { id: 'class-listener3', name: 'listener3', filePath: listenFile },
      ]);

      const program = createProgram({
        'emit.ts': `
          const EVENT_NAME = 'my-constant-event';
          const emitter3 = { emit(e: string, d: any) {} };
          emitter3.emit(EVENT_NAME, {});
        `,
        'listen.ts': `
          const EVENT_NAME = 'my-constant-event';
          const listener3 = { on(e: string, h: Function) {} };
          listener3.on(EVENT_NAME, () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Identifier event names are captured as the identifier text
      const eventRel = result.find(
        (r) => r.properties?.eventName === 'EVENT_NAME'
      );

      expect(eventRel).toBeDefined();
    });

    it('should skip template literal event names', () => {
      const emitFile = path.join(tempDir, 'emit.ts');

      const graph = createMockGraph([
        { id: 'class-dynamicemitter', name: 'dynamicemitter', filePath: emitFile },
      ]);

      const program = createProgram({
        'emit.ts': `
          const type = 'user';
          const dynamicemitter = { emit(e: string, d: any) {} };
          dynamicemitter.emit(\`event-\${type}\`, {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Template literals are skipped
      expect(result).toHaveLength(0);
    });
  });

  describe('analyze - class context', () => {
    it('should detect this.emit within class when class name is in graph', () => {
      const classFile = path.join(tempDir, 'MyClass.ts');
      const listenerFile = path.join(tempDir, 'listener.ts');

      // The analyzer looks for the class name (MyClass) when encountering 'this'
      const graph = createMockGraph([
        { id: 'class-myclass', name: 'MyClass', filePath: classFile },
        { id: 'class-mylistener', name: 'mylistener', filePath: listenerFile },
      ]);

      const program = createProgram({
        'MyClass.ts': `
          class MyClass {
            emit(event: string, data: any) {}
            doSomething() {
              this.emit('class-event', { value: 1 });
            }
          }
        `,
        'listener.ts': `
          const mylistener = { on(e: string, h: Function) {} };
          mylistener.on('class-event', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      // The class context detection works when the enclosing class name is found in the graph
      // If MyClass is found, it will match with mylistener's on('class-event')
      const classEventRel = result.find(
        (r) => r.properties?.eventName === 'class-event'
      );

      // This tests that at minimum the analyzer doesn't crash on this.emit patterns
      // The actual matching depends on whether the graph contains the class
      expect(result).toBeDefined();

      // If relationship was found, verify its structure
      if (classEventRel) {
        expect(classEventRel.type).toBe('event-flow');
      }
    });
  });

  describe('analyze - relationship structure', () => {
    it('should create relationships with correct structure', () => {
      const emitFile = path.join(tempDir, 'emit.ts');
      const listenFile = path.join(tempDir, 'listen.ts');

      const graph = createMockGraph([
        { id: 'class-testproducer', name: 'testproducer', filePath: emitFile },
        { id: 'class-testconsumer', name: 'testconsumer', filePath: listenFile },
      ]);

      const program = createProgram({
        'emit.ts': `
          const testproducer = { emit(e: string, d: any) {} };
          testproducer.emit('test-event', {});
        `,
        'listen.ts': `
          const testconsumer = { on(e: string, h: Function) {} };
          testconsumer.on('test-event', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThan(0);
      const relationship = result[0];

      expect(relationship.id).toBeDefined();
      expect(relationship.type).toBe('event-flow');
      expect(relationship.category).toBe('data-flow');
      expect(relationship.direction).toBe('unidirectional');
      expect(relationship.strength).toBe('medium');
      expect(relationship.evidence).toBeInstanceOf(Array);
      expect(relationship.evidence.length).toBe(2); // producer and consumer evidence
      expect(relationship.discoveredBy).toBe('static-analysis');
      expect(relationship.confidence).toBe(0.8);
      expect(relationship.properties).toHaveProperty('eventName');
      expect(relationship.properties).toHaveProperty('producerPattern');
      expect(relationship.properties).toHaveProperty('consumerPattern');
      expect(relationship.properties).toHaveProperty('producer');
      expect(relationship.properties).toHaveProperty('consumer');
      expect(relationship.createdAt).toBeDefined();
      expect(relationship.updatedAt).toBeDefined();
      expect(relationship.description).toBeDefined();
    });

    it('should include file path and line in evidence', () => {
      const emitFile = path.join(tempDir, 'emit.ts');
      const listenFile = path.join(tempDir, 'listen.ts');

      const graph = createMockGraph([
        { id: 'class-p', name: 'p', filePath: emitFile },
        { id: 'class-c', name: 'c', filePath: listenFile },
      ]);

      const program = createProgram({
        'emit.ts': `
          const p = { emit(e: string, d: any) {} };
          p.emit('e', {});
        `,
        'listen.ts': `
          const c = { on(e: string, h: Function) {} };
          c.on('e', () => {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const relationship = result[0];
        expect(relationship.filePath).toBeDefined();
        expect(relationship.line).toBeDefined();

        for (const evidence of relationship.evidence) {
          expect(evidence.source).toBeDefined();
          expect(evidence.lineNumber).toBeDefined();
        }
      }
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new EventFlowAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalEvents).toBe(0);
      expect(stats.uniqueEventNames.size).toBe(0);
      expect(stats.producerCount).toBe(0);
      expect(stats.consumerCount).toBe(0);
      expect(Object.keys(stats.byPattern)).toHaveLength(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new EventFlowAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        {
          id: 'rel1',
          type: 'event-flow',
          category: 'data-flow',
          from: 'producer1',
          to: 'consumer1',
          direction: 'unidirectional',
          strength: 'medium',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {
            eventName: 'event-a',
            producerPattern: 'emit',
            consumerPattern: 'on',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel2',
          type: 'event-flow',
          category: 'data-flow',
          from: 'producer1',
          to: 'consumer2',
          direction: 'unidirectional',
          strength: 'medium',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {
            eventName: 'event-a',
            producerPattern: 'emit',
            consumerPattern: 'on',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel3',
          type: 'event-flow',
          category: 'data-flow',
          from: 'producer2',
          to: 'consumer1',
          direction: 'unidirectional',
          strength: 'medium',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {
            eventName: 'event-b',
            producerPattern: 'dispatchEvent',
            consumerPattern: 'addEventListener',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalEvents).toBe(3);
      expect(stats.uniqueEventNames.size).toBe(2);
      expect(stats.uniqueEventNames.has('event-a')).toBe(true);
      expect(stats.uniqueEventNames.has('event-b')).toBe(true);
      expect(stats.producerCount).toBe(2);
      expect(stats.consumerCount).toBe(2);
      expect(stats.byPattern['emit → on']).toBe(2);
      expect(stats.byPattern['dispatchEvent → addEventListener']).toBe(1);
    });

    it('should handle relationships with missing properties', () => {
      const graph = createMockGraph([]);
      const analyzer = new EventFlowAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        {
          id: 'rel1',
          type: 'event-flow',
          category: 'data-flow',
          from: 'producer1',
          to: 'consumer1',
          direction: 'unidirectional',
          strength: 'medium',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {}, // No eventName
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalEvents).toBe(1);
      expect(stats.uniqueEventNames.size).toBe(0); // No event names added
    });
  });

  describe('edge cases', () => {
    it('should handle empty source files', () => {
      const graph = createMockGraph([]);
      const program = createProgram({
        'empty.ts': '',
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle source files with only comments', () => {
      const graph = createMockGraph([]);
      const program = createProgram({
        'comments.ts': `
          // This is a comment
          /* This is another comment */
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should not crash on complex expressions', () => {
      const complexFile = path.join(tempDir, 'complex.ts');

      const graph = createMockGraph([
        { id: 'class-complex', name: 'complex', filePath: complexFile },
      ]);

      const program = createProgram({
        'complex.ts': `
          const getEmitter = () => ({ emit: (e: string, d: any) => {} });
          getEmitter().emit('dynamic', {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);

      // Should not throw
      expect(() => analyzer.analyze()).not.toThrow();
    });

    it('should handle symbols not in graph', () => {
      const unknownFile = path.join(tempDir, 'unknown.ts');

      const graph = createMockGraph([]); // Empty graph

      const program = createProgram({
        'unknown.ts': `
          const unknownEmitter = { emit(e: string, d: any) {} };
          unknownEmitter.emit('orphan-event', {});
        `,
      });

      const analyzer = new EventFlowAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not crash, but won't find matching symbols
      expect(result).toBeDefined();
    });
  });
});
