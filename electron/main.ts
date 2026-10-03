import { app, BrowserWindow, shell, dialog, ipcMain, session } from 'electron';
import type { Event as ElectronEvent, DownloadItem } from 'electron';
import { join, dirname } from 'path';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import type { Server as HttpServer } from 'http';

// In development the frontend is served by Vite (started by `npm run
// electron:dev`); the main process just loads that URL. In production the
// backend (Express) is started by this process and serves both the API and the
// built React frontend from a single local origin.
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || '';
const PORT = Number(process.env.PRINTPRESS_PORT) || 3001;

// Canonical product name. Controls the user-data directory the database lives
// in (e.g. `%APPDATA%/PrintPress ERP` on Windows, `~/.config/PrintPress ERP`
// on Linux). Must be set before the first getPath('userData') call below.
app.setName('PrintPress ERP');

let mainWindow: BrowserWindow | null = null;
let httpServer: HttpServer | null = null;
let shuttingDown = false;

// Starts the Express backend in-process. The database path is pointed at the
// per-user application-data directory so the packaged app never writes to its
// install folder (which may be read-only, e.g. Program Files).
async function startLocalBackend(): Promise<void> {
  if (!app.isPackaged) {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  } else {
    process.env.NODE_ENV = 'production';
  }

  const dataDir = join(app.getPath('userData'), 'data');
  const dbPath = join(dataDir, 'printing.db');
  process.env.PRINTPRESS_DB_PATH = dbPath;

  // Pre-1.0 builds stored the database under the package-name directory
  // (`printing-press-erp`). Carry that data forward once, never overwriting an
  // existing database. The directory has to exist first: copyFileSync throws
  // ENOENT when the destination folder is missing, which on a fresh install
  // silently skipped the migration and left the user with an empty database.
  if (!existsSync(dbPath)) {
    const legacyDb = join(
      app.getPath('appData'),
      'printing-press-erp',
      'data',
      'printing.db',
    );
    try {
      if (existsSync(legacyDb)) {
        mkdirSync(dataDir, { recursive: true });
        copyFileSync(legacyDb, dbPath);
        // Carry the write-ahead log across too, otherwise transactions that were
        // committed but not yet checkpointed would be lost.
        for (const suffix of ['-wal', '-shm']) {
          const sidecar = legacyDb + suffix;
          if (existsSync(sidecar)) copyFileSync(sidecar, dbPath + suffix);
        }
        console.log(`[db-migration] migrated legacy database from ${legacyDb}`);
      }
    } catch (err) {
      console.error('[db-migration] could not migrate the legacy database:', err);
    }
  }

  // Required after the environment above is set, because importing the module
  // initialises the database connection immediately.
  const backend = require('../backend/dist/server.js') as {
    startServer: (port: number) => Promise<HttpServer>;
    stopServer: (server: HttpServer) => Promise<void>;
  };

  httpServer = await backend.startServer(PORT);
}

async function waitForBackend(attempts = 30): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ── Direct bill printing ─────────────────────────────────────────────────────
// The renderer can list the system's printers and print the current invoice
// straight to a printer (e.g. an 80mm thermal bill printer) without the print
// dialog. The print stylesheet already limits output to the invoice area, so
// a silent print of the focused window renders exactly the invoice preview.
function registerPrintIpc(): void {
  ipcMain.handle('print:list-printers', async (event) => {
    try {
      const printers = await event.sender.getPrintersAsync();
      // `isDefault` and `status` are reported by the platform backends but are
      // absent from Electron's PrinterInfo typings, so read them defensively.
      return printers.map((p) => {
        const extra = p as unknown as { isDefault?: boolean; status?: number };
        return {
          name: p.name,
          displayName: p.displayName || p.name,
          isDefault: extra.isDefault === true,
          status: typeof extra.status === 'number' ? extra.status : 0,
        };
      });
    } catch (err) {
      console.error('[print] could not enumerate printers:', err);
      throw new Error('Could not read the printer list from the operating system.');
    }
  });

  ipcMain.handle('print:direct', (event, deviceName: unknown, copies: unknown) => {
    return new Promise<{ ok: boolean; device: string | null }>((resolve, reject) => {
      const device = typeof deviceName === 'string' && deviceName ? deviceName : undefined;
      event.sender.print(
        {
          silent: true,
          printBackground: true,
          copies: typeof copies === 'number' && copies > 0 ? copies : 1,
          deviceName: device,
        },
        (ok, failureReason) => {
          if (ok) resolve({ ok: true, device: device ?? null });
          // Surface the driver's own reason (no default printer, spooler down,
          // wrong paper size, ...) instead of a generic failure.
          else reject(new Error(failureReason || 'The printer did not accept the job.'));
        },
      );
    });
  });

  // Prints through the operating system's own print dialog. This is the
  // reliable path when no printer is configured as a default, and it lets the
  // user pick destination, copies and paper size.
  ipcMain.handle('print:dialog', async (event) => {
    return new Promise<{ ok: boolean }>((resolve) => {
      event.sender.print({ silent: false, printBackground: true }, (ok, failureReason) => {
        if (ok) resolve({ ok: true });
        else console.error('[print] dialog print failed:', failureReason);
        resolve({ ok: false });
      });
    });
  });

  // Renders the current invoice straight to a PDF file. Unlike printing this
  // needs no printer driver at all, so it still works on a machine where no
  // printer has been configured.
  ipcMain.handle('print:to-pdf', async (event, suggestedName: unknown) => {
    const suggested = typeof suggestedName === 'string' && suggestedName.trim()
      ? `${suggestedName.trim()}.pdf`
      : 'invoice.pdf';

    const saveOptions: Electron.SaveDialogSyncOptions = {
      title: 'Save Invoice as PDF',
      defaultPath: suggested,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    };
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const target = parent
      ? dialog.showSaveDialogSync(parent, saveOptions)
      : dialog.showSaveDialogSync(saveOptions);
    if (!target) return { ok: false, cancelled: true };

    const data = await event.sender.printToPDF({ printBackground: true });
    writeFileSync(target, data);
    console.log('[print] wrote PDF to', target);
    return { ok: true, cancelled: false, path: target };
  });
}

// ── File downloads (PDF export) ──────────────────────────────────────────────
// "Download PDF" in the renderer works by navigating to a blob: URL, which
// Chromium reports as a download. Without a `will-download` handler the request
// is abandoned: no file is written and only a `.org.chromium.Chromium.*`
// temporary artefact is left in the downloads directory, so the user clicks the
// button and nothing appears to happen. Handling the event gives each download
// a real destination and surfaces failures.
function registerDownloadHandler(): void {
  const ses = session.defaultSession;

  ses.on('will-download', (_event: ElectronEvent, item: DownloadItem) => {
    const suggested = item.getFilename();
    const filters = item.getMimeType() === 'application/pdf'
      ? [{ name: 'PDF Document', extensions: ['pdf'] }]
      : [{ name: 'All Files', extensions: ['*'] }];

    // Ask where to save it. `defaultPath` is seeded with the suggested name so
    // the common case is a single Enter.
    const saveOptions: Electron.SaveDialogSyncOptions = {
      title: 'Save Invoice',
      defaultPath: suggested,
      filters,
    };
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const target = parent
      ? dialog.showSaveDialogSync(parent, saveOptions)
      : dialog.showSaveDialogSync(saveOptions);

    if (!target) {
      item.cancel();
      return;
    }

    try {
      // Ensure the chosen directory exists (users often pick a new folder).
      mkdirSync(dirname(target), { recursive: true });
    } catch (err) {
      console.error('[download] could not create directory:', err);
    }

    item.setSavePath(target);
    console.log('[download] saving', target);

    // Report terminal failures (disk full, permission denied) back to the
    // renderer instead of leaving the user believing the PDF was created.
    item.once('done', (_itemEvent, state) => {
      if (state === 'completed') return;
      const reason = state === 'cancelled'
        ? 'cancelled'
        : 'could not be written (check disk space and folder permissions)';
      if (mainWindow && !mainWindow.isDestroyed()) {
        void mainWindow.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('printpress:download-failed', { detail: ${JSON.stringify(reason)} }))`,
          true,
        );
      }
    });
  });
}

async function createWindow(): Promise<void> {
  const isDev = DEV_SERVER_URL.length > 0;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    icon: join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // External links (http/https) open in the user's default browser; the main
  // window stays inside PrintPress ERP. data: URLs (expense receipts) may open
  // in a child window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    if (/^data:/i.test(url)) {
      return { action: 'allow' };
    }
    return { action: 'deny' };
  });

  // Prevent the main window from navigating away from the application.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const expected = isDev ? DEV_SERVER_URL : `http://127.0.0.1:${PORT}`;
    if (!url.startsWith(expected)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) void shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  if (isDev) {
    await mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await waitForBackend();
    await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  }
}

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    // Only this process opens the database when it also started the embedded
    // backend (packaged builds). In development the backend runs as a separate
    // `tsx watch` process, so requiring the database here would load
    // better-sqlite3 — compiled for Node's ABI — into Electron's ABI and always
    // fail with ERR_DLOPEN_FAILED.
    if (httpServer) {
      const backend = require('../backend/dist/server.js') as {
        stopServer: (server: HttpServer) => Promise<void>;
      };
      await backend.stopServer(httpServer);
      httpServer = null;

      const { closeDatabase } = require('../backend/dist/db.js') as {
        closeDatabase: () => void;
      };
      closeDatabase();
    }
  } catch (err) {
    console.error('[shutdown]', err);
  }
}

app.on('before-quit', (event) => {
  if (shuttingDown) return;
  event.preventDefault();
  void shutdown().finally(() => app.exit(0));
});

app.whenReady().then(async () => {
  app.setAppUserModelId('com.printpress.erp');

  registerPrintIpc();
  registerDownloadHandler();

  try {
    if (!DEV_SERVER_URL) {
      await startLocalBackend();
    }
    await createWindow();
  } catch (err) {
    console.error('[startup]', err);
    dialog.showErrorBox(
      'PrintPress ERP',
      'PrintPress ERP could not start its local service.\n\nPlease restart the application.\n\nIf the problem continues, check the application logs.',
    );
    app.exit(1);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});