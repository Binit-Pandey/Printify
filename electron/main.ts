import { app, BrowserWindow, shell, dialog, ipcMain } from 'electron';
import { join } from 'path';
import { copyFileSync, existsSync } from 'fs';
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
  // existing database.
  if (!existsSync(dbPath)) {
    const legacyDb = join(
      app.getPath('appData'),
      'printing-press-erp',
      'data',
      'printing.db',
    );
    try {
      if (existsSync(legacyDb)) {
        copyFileSync(legacyDb, dbPath);
      }
    } catch (err) {
      console.error('[db-migration]', err);
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
  ipcMain.handle('print:list-printers', (event) => {
    return event.sender.getPrintersAsync();
  });

  ipcMain.handle('print:direct', (event, deviceName: unknown) => {
    return new Promise<{ ok: boolean }>((resolve, reject) => {
      event.sender.print(
        {
          silent: true,
          printBackground: true,
          deviceName: typeof deviceName === 'string' && deviceName ? deviceName : undefined,
        },
        (ok, failureReason) => {
          if (ok) resolve({ ok: true });
          else reject(new Error(failureReason || 'Print failed'));
        },
      );
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
    if (httpServer) {
      const backend = require('../backend/dist/server.js') as {
        stopServer: (server: HttpServer) => Promise<void>;
      };
      await backend.stopServer(httpServer);
      httpServer = null;
    }
    const { closeDatabase } = require('../backend/dist/db.js') as {
      closeDatabase: () => void;
    };
    closeDatabase();
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