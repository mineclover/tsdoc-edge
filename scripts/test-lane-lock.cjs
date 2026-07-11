'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const lockPath = path.join(projectRoot, '.test-dist.lock');
const lockEnvironmentName = 'TSDOC_EDGE_TEST_LANE_LOCK';

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return undefined;
    }
    throw new Error(`Cannot read test lane lock ${lockPath}: ${error.message}`);
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function describeExistingLock(record) {
  if (!record || !Number.isInteger(record.pid) || record.pid <= 0) {
    throw new Error(
      `Invalid test lane lock at ${lockPath}; remove it after verifying no test lane is active`
    );
  }
  if (isProcessAlive(record.pid)) {
    throw new Error(
      `Test lane already active (pid ${record.pid}, ${record.label ?? 'unknown operation'})`
    );
  }
  fs.rmSync(lockPath, { force: true });
}

function acquireTestLaneLock(label) {
  const inheritedToken = process.env[lockEnvironmentName];
  if (inheritedToken) {
    const record = readLock();
    if (!record || record.token !== inheritedToken) {
      throw new Error('Inherited test lane lock does not match the active repository lock');
    }
    return {
      environment: process.env,
      release() {},
    };
  }

  const token = crypto.randomUUID();
  const record = {
    pid: process.pid,
    token,
    label,
    createdAt: new Date().toISOString(),
  };

  let descriptor;
  try {
    descriptor = fs.openSync(lockPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(record)}\n`, 'utf8');
    fs.closeSync(descriptor);
    descriptor = undefined;
  } catch (error) {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }
    if (error && error.code === 'EEXIST') {
      describeExistingLock(readLock());
      return acquireTestLaneLock(label);
    }
    throw error;
  }

  let released = false;
  return {
    environment: { ...process.env, [lockEnvironmentName]: token },
    release() {
      if (released) {
        return;
      }
      released = true;
      const current = readLock();
      if (current?.token === token) {
        fs.rmSync(lockPath, { force: true });
      }
    },
  };
}

function withoutTestLaneLock(environment = process.env) {
  const childEnvironment = { ...environment };
  delete childEnvironment[lockEnvironmentName];
  return childEnvironment;
}

module.exports = { acquireTestLaneLock, withoutTestLaneLock };
