# Packaging & Distribution — PrintPress ERP

This document describes how to build, sign and distribute the PrintPress ERP
desktop application. It is a packaging reference only — it contains **no
certificates or signing keys**.

## Quick reference

```bash
# Development (backend + Vite + Electron window in one command)
npm run electron:dev

# Distributable installers / packages (Linux: AppImage + .deb; Windows: NSIS setup .exe)
npm run electron:build

# Unpacked app directory only (faster iteration, same packaging logic)
npm run electron:pack
```

`electron:build` runs, in order:

1. `build:all` — frontend bundle + backend TS compile + Electron main/preload compile
2. `electron:rebuild` — recompiles `better-sqlite3` against Electron's Node ABI
   (electron-builder's automatic rebuild is disabled; `npmRebuild: false`) so the
   packaged ABI is always correct
3. `electron-builder` — produces the installers/packages (ASAR on, sourcemaps off)
4. `electron:restore` — rebuilds `better-sqlite3` for system Node again so
   development (`tsx` backend) keeps working

## Outputs

| Platform | Artifact | Notes |
| --- | --- | --- |
| Windows | `PrintPress-ERP-Setup-<version>.exe` (NSIS) | Installer with Start Menu + Desktop shortcuts, uninstaller, icon, per-user or all-users install |
| Linux   | `PrintPress-ERP-<version>.AppImage` | Portable, executable after `chmod +x` |
| Linux   | `PrintPress-ERP-<version>.deb` | Installable Debian/Ubuntu package |

### Building the Windows installer on a machine that is *not* Windows

NSIS packaging requires either Windows or Wine. On a Linux/CI machine with Wine
installed, `npm run electron:build` also emits the `.exe`. Otherwise run
`npm run electron:build` on a Windows machine (or in a Windows CI runner) — the
project is platform-agnostic.

## Code signing

**No certificates are committed to this repository.**

Electron Builder signs automatically when signing credentials are present.
Configure them **when you have them** — never commit the private key or password:

* Windows Authenticode certificate (`.pfx`/`.p12`) — provide via environment
  variables so the key never touches the repo:

  ```bash
  export CSC_LINK="/secure/path/PrintPress-CodeSigning.pfx"  # or a base64 data: URI
  export CSC_KEY_PASSWORD="<pfx password>"
  ```

  or set `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` to sign only the Windows build.

* Azure Trusted Signing / OV code-signing that lives outside the build machine
  can be wired through `win.azureSignOptions` or the
  `electron-builder` service — see https://www.electron.build/code-signing.

* macOS (notarized DMG) — a Developer ID Application certificate is required to
  sign and Gatekeeper-notarize (`mac.notarize` with an App Store Connect API
  key). Signed on macOS only.

Verification:

```bash
# Windows
osslsigncode verify -in release/Windows/PrintPress-ERP-Setup-*.exe   # or signtool verify
# Linux .deb (signed packages ship their own GPG metadata at the repo level)
dpkg-deb --info release/Linux/PrintPress-ERP-*.deb
```

## Where user data lives

The SQLite database and all runtime data are stored **outside the install
directory**, so they survive updates and uninstalls (the NSIS uninstaller does
not delete app data by default):

| Platform | Location |
| --- | --- |
| Windows | `%APPDATA%\PrintPress ERP\data\printing.db` |
| Linux   | `~/.config/PrintPress ERP/data/printing.db` |
| macOS   | `~/Library/Application Support/PrintPress ERP/data/printing.db` |

On first launch after an upgrade from a pre-1.0 build, data stored under the
legacy `printing-press-erp` directory is copied forward once. An existing
database is never overwritten.

## Security posture

* `contextIsolation: true`, `nodeIntegration: false`, renderer sandbox enabled
* Renderer gets a minimal `preload.js` bridge (`printpressDesktop`) — no Node/fs/process access
* Backend binds `127.0.0.1` only; never exposed to the network
* Vite production build: minified (terser), `sourcemap: false`
* Backend ships compiled JavaScript only (TypeScript sources excluded)
* Application packaged as ASAR (`asar: true`). ASAR is packaging, not

encryption — treat the client as readable; put anything sensitive behind your
future licensing/backend service.

## Production inspection checklist

Before shipping a release, verify the produced package:

* contains **no** `*.map` files (source maps)
* contains **no** `.env`, keys, certificates, Tokens, or dev credentials
* contains **no** `src/`, **no** tests, **no** TypeScript sources
* contains `backend/dist` (compiled Express) and `dist` (compiled React)
* has `backend/package.json` inside the ASAR (marks backend output as CommonJS)

```
# list ASAR contents from node_modules/.bin/asar  (or npx @electron/asar)
asar list <app.asar> | grep -E "\.map$|\.env|src/"
```