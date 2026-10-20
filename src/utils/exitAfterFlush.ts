/**
 * Process exit that does not lose buffered output
 * @packageDocumentation
 */

/** The part of a writable stream needed to wait for its queue to drain. */
export interface FlushableStream {
  write(chunk: string, callback: () => void): unknown;
}

/**
 * Resolve once everything already written to the streams has been handed to the OS.
 *
 * Writing an empty chunk queues behind pending writes, so its callback fires only after they
 * are flushed. A stream that cannot be flushed (closed pipe) never blocks the exit.
 *
 * @param streams - Streams to drain; defaults to stdout and stderr
 */
export function flushStandardStreams(
  streams: readonly FlushableStream[] = [process.stdout, process.stderr]
): Promise<void> {
  return Promise.all(
    streams.map(
      (stream) =>
        new Promise<void>((resolve) => {
          try {
            stream.write('', () => resolve());
          } catch {
            resolve();
          }
        })
    )
  ).then(() => undefined);
}

/**
 * Exit with a code after stdout and stderr have drained.
 *
 * `process.exit()` discards output still queued on pipes, so a large report piped into another
 * tool (an XML document of a few hundred kilobytes) arrives truncated. Draining first keeps
 * the exit code and the full output.
 *
 * @param code - Process exit code
 * @param streams - Streams to drain before exiting
 */
export function exitAfterFlush(code: number, streams?: readonly FlushableStream[]): void {
  void flushStandardStreams(streams).then(() => process.exit(code));
}
