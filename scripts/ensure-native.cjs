#!/usr/bin/env node
'use strict';

// Native modules such as better-sqlite3 are compiled against a specific
// Node.js ABI (NODE_MODULE_VERSION). When node_modules was installed with one
// Node.js version but the app is launched with another, loading the binding
// fails with ERR_DLOPEN_FAILED ("was compiled against a different Node.js
// version"). This preflight check verifies the binding against the Node.js
// runtime actually in use and rebuilds it when it does not match.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const MODULE = 'better-sqlite3';

function moduleRoot() {
  return path.dirname(require.resolve(`${MODULE}/package.json`, { paths: [__dirname] }));
}

function forget() {
  try {
    const root = moduleRoot();
    for (const key of Object.keys(require.cache)) {
      if (key.startsWith(`${root}${path.sep}`)) {
        delete require.cache[key];
      }
    }
  } catch {
    /* not installed yet */
  }
}

function loadBinding() {
  forget();
  let Database;
  try {
    Database = require(require.resolve(MODULE, { paths: [__dirname] }));
  } catch (error) {
    return error;
  }
  // better-sqlite3 resolves its native binding lazily inside the constructor,
  // so requiring the module alone is not enough to validate the ABI.
  try {
    const probe = new Database(':memory:');
    probe.close();
    return null;
  } catch (error) {
    return error;
  }
}

const problem = loadBinding();
if (!problem) {
  process.exit(0);
}

if (problem.code !== 'ERR_DLOPEN_FAILED' && !/NODE_MODULE_VERSION/.test(problem.message)) {
  console.error(`[ensure-native] ${MODULE} could not be loaded:`);
  console.error(problem.message);
  process.exit(1);
}

console.log('');
console.log(`[ensure-native] ${MODULE} was compiled for a different Node.js version.`);
console.log(`[ensure-native] Runtime: Node ${process.version} (ABI ${process.versions.modules})`);
console.log('[ensure-native] Rebuilding the native binding for this runtime...');
console.log('');

// `npm rebuild` silently no-ops when a previous electron-rebuild left its own
// build directory behind (marked by build/Release/.forge-meta), which leaves a
// corrupt binding in place. Wipe it so node-gyp actually recompiles.
try {
  fs.rmSync(path.join(moduleRoot(), 'build'), { recursive: true, force: true });
} catch (error) {
  console.error(`[ensure-native] Could not clear stale build output: ${error.message}`);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rebuild = spawnSync(npm, ['rebuild', MODULE], { stdio: 'inherit', shell: process.platform === 'win32' });

if (rebuild.status !== 0) {
  console.error('');
  console.error(`[ensure-native] Rebuild failed. Run "npm install" and make sure build tools are available.`);
  process.exit(rebuild.status === null ? 1 : rebuild.status);
}

const stillBroken = loadBinding();
if (stillBroken) {
  console.error('');
  console.error(`[ensure-native] ${MODULE} still fails to load after rebuild:`);
  console.error(stillBroken.message);
  process.exit(1);
}

console.log('');
console.log(`[ensure-native] ${MODULE} is ready for Node ${process.version}.`);
process.exit(0);