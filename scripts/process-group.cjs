'use strict';

const isWindows = process.platform === 'win32';
const processGroupOwnerEnvironment = 'TSDOC_EDGE_PROCESS_GROUP_OWNER';

/** Start one managed process group at the orchestration boundary. */
function spawnManaged(spawn, command, args, options = {}) {
  const environment = options.env ?? process.env;
  const ownsGroup = environment[processGroupOwnerEnvironment] !== '1';
  return spawn(command, args, {
    ...options,
    env: { ...environment, [processGroupOwnerEnvironment]: '1' },
    detached: !isWindows && ownsGroup,
  });
}

/** Forward a signal to the process group and escalate after a bounded grace period. */
function terminateManaged(child, signal, graceMs = 5000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return () => {};
  sendToManagedProcess(child, signal);
  const timer = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null)
      sendToManagedProcess(child, 'SIGKILL');
  }, graceMs);
  timer.unref?.();
  return () => clearTimeout(timer);
}

function sendToManagedProcess(child, signal) {
  if (child.pid && !isWindows) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  }
  child.kill(signal);
}

module.exports = { spawnManaged, terminateManaged };
