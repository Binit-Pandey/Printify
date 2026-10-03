#!/usr/bin/env node
'use strict';

// Launches Electron in development mode on Linux.
//
// Chromium aborts at startup (SIGTRAP) when its SUID sandbox helper exists but
// is not owned by root with mode 4755, which is the normal state for a
// user-local `npm install`. Because the dev script runs everything under
// `concurrently -k`, that abort takes the backend and Vite down with it, so the
// launcher window appears to close on its own.
//
// Rather than forcing every developer to run `sudo chown root:root
// chrome-sandbox && sudo chmod 4755 chrome-sandbox`, fall back to
// `--no-sandbox` when (and only when) the helper is not correctly configured.
// Set ELECTRON_DEV_SANDBOX=1 to keep the sandbox and fix the helper instead.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const electronBinary = require('electron');
const distDir = path.dirname(electronBinary);
const sandboxHelper = path.join(distDir, 'chrome-sandbox');

function isSandboxConfigured() {
  try {
    const stats = fs.statSync(sandboxHelper);
    if ((stats.mode & 0o7777) !== 0o4755) return false;
    return stats.uid === 0;
  } catch {
    return false;
  }
}

const args = ['.'];

if (process.platform === 'linux' && !isSandboxConfigured()) {
  if (process.env.ELECTRON_DEV_SANDBOX === '1') {
    console.error('[electron:dev] ELECTRON_DEV_SANDBOX=1 but the SUID helper is not usable:');
    console.error(`[electron:dev]   ${sandboxHelper}`);
    console.error('[electron:dev] Fix it with:');
    console.error(`[electron:dev]   sudo chown root:root "${sandboxHelper}" && sudo chmod 4755 "${sandboxHelper}"`);
    process.exit(1);
  }
  args.push('--no-sandbox');
  console.warn('[electron:dev] SUID sandbox helper is not owned by root with mode 4755.');
  console.warn('[electron:dev] Launching Chromium with --no-sandbox (development only).');
}

const child = spawn(electronBinary, [...args, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}