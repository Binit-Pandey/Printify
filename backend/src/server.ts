import 'dotenv/config';
import type { Server as HttpServer } from 'http';
import { createApp } from './app';

// Starts the Express backend. Can be called:
//  - from the CLI entrypoint (index.ts) for development
//  - from the Electron main process in production
export async function startServer(port?: number): Promise<HttpServer> {
  const selectedPort = port ?? Number(process.env.PRINTPRESS_PORT || process.env.PORT || 3001);
  const app = createApp();

  return new Promise<HttpServer>((resolve, reject) => {
    const server = app.listen(selectedPort, '127.0.0.1', () => {
      console.log(`🚀 Backend running on http://127.0.0.1:${selectedPort}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

// Gracefully stops the HTTP server and waits for existing connections to close.
export async function stopServer(server: HttpServer): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 3000);
    server.close(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}