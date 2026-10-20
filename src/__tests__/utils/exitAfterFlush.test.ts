/**
 * exitAfterFlush tests
 * @testScenario Exit waits for queued output
 * @testScenario A broken stream never blocks the exit
 */

import { exitAfterFlush, flushStandardStreams } from '../../utils/exitAfterFlush';

/** A stream whose write callback fires only when `drain()` is called. */
function slowStream() {
  const pending: Array<() => void> = [];
  return {
    write(_chunk: string, callback: () => void) {
      pending.push(callback);
      return true;
    },
    drain() {
      for (const callback of pending.splice(0)) callback();
    },
  };
}

describe('exitAfterFlush', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves only after every stream has drained', async () => {
    const out = slowStream();
    const err = slowStream();
    let resolved = false;

    const flushed = flushStandardStreams([out, err]).then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    out.drain();
    await Promise.resolve();
    expect(resolved).toBe(false);

    err.drain();
    await flushed;
    expect(resolved).toBe(true);
  });

  it('does not wait on a stream that throws', async () => {
    const broken = {
      write(): never {
        throw new Error('EPIPE');
      },
    };

    await expect(flushStandardStreams([broken])).resolves.toBeUndefined();
  });

  it('exits with the code once output has drained', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const out = slowStream();

    exitAfterFlush(3, [out]);
    await Promise.resolve();
    expect(exit).not.toHaveBeenCalled();

    out.drain();
    await new Promise((resolve) => setImmediate(resolve));
    expect(exit).toHaveBeenCalledWith(3);
  });
});
